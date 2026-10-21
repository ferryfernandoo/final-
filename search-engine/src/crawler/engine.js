import { URLFrontier } from './frontier.js';
import { RobotsManager } from './robots.js';
import { HTTPFetcher } from './fetcher.js';
import { HTMLParser } from './parser.js';
import { TrustGatekeeper } from './trustGatekeeper.js';
import { PageRankCalculator } from '../indexer/pagerank.js';
import { getDomain, fnv1a64 } from './urlUtils.js';
import { getAllGlobalSeeds } from './seeds.js';
import { priorityGovernor } from '../indexer/governor.js';

export const CrawlerState = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED'
};

export class CrawlerEngine {
  constructor(dbInstance, options = {}) {
    this.db = dbInstance;
    this.state = CrawlerState.IDLE;

    this.concurrency = Math.min(options.concurrency ?? 64, 128); // 64 parallel workers for optimal throughput without DNS/libuv threadpool choking
    this.maxDepth = options.maxDepth ?? 15;
    this.maxPages = options.maxPages ?? Infinity;
    this.perDomainDelayMs = options.perDomainDelayMs ?? 10; // Snappy 10ms delay for fast SSD throughput
    this.allowedDomains = options.allowedDomains || null;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    this.autonomousMode = options.autonomousMode ?? true;

    // Network resilience sentinel
    this.isOffline = false;
    this.consecutiveNetErrors = 0;
    this._offlineProbeTimer = null;

    this.frontier = new URLFrontier({
      maxDepth: this.maxDepth,
      perDomainDelayMs: this.perDomainDelayMs,
      maxConcurrentPerDomain: options.maxConcurrentPerDomain ?? 12, // 12 concurrent connections per host
      allowedDomains: this.allowedDomains
    });

    // Populate seen hashes asynchronously in background (limited to recent 5000 for instant boot)
    setImmediate(() => {
      try {
        const existing = this.db.getAllIndexedUrls(5000);
        for (const row of existing) {
          if (row.url) {
            this.frontier.seenHashes.add(fnv1a64(row.url));
          }
        }
      } catch (e) {
        console.error('Error pre-seeding frontier cache:', e);
      }
    });

    this.robots = new RobotsManager(this.userAgent);
    this.fetcher = new HTTPFetcher({ userAgent: this.userAgent, timeoutMs: 5000 });
    this.pagerankCalc = new PageRankCalculator(this.db);

    // Telemetry and statistics
    this.activeWorkers = 0;
    this.activeWorkerLoops = new Set();
    this.crawledCount = 0;
    this.errorCount = 0;
    this.totalBytes = 0;
    this.startTime = null;
    this.pageRankInterval = 50000; // Re-run PageRank asynchronously every 50000 pages
    this.lastPageRankCount = 0;

    // Rate & latency calculations
    this.recentCrawlTimestamps = [];
    this.recentLatencies = [];
    this.telemetryHistory = [];

    // Periodic history sampler (stores last 120 data points = 2 mins, lightweight)
    const historyTimer = setInterval(() => {
      if (this.state === CrawlerState.RUNNING || this.telemetryHistory.length > 0) {
        const snap = this.getSnapshot();
        this.telemetryHistory.push(snap);
        if (this.telemetryHistory.length > 120) {
          this.telemetryHistory.shift();
        }
      }
    }, 1000);
    if (historyTimer.unref) historyTimer.unref();

    // Event listeners
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(fn);
  }

  emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    for (const fn of handlers) {
      try {
        fn(data);
      } catch (err) {
        console.error(`Error in event listener ${event}:`, err);
      }
    }
  }

  /**
   * Starts crawling from seed URLs
   */
  start(seeds = [], options = {}) {
    if (this.state === CrawlerState.RUNNING) return;

    if (options.autonomousMode !== undefined) {
      this.autonomousMode = Boolean(options.autonomousMode);
    }

    this.state = CrawlerState.RUNNING;
    this.startTime = Date.now();
    this.crawledCount = 0;
    this.errorCount = 0;

    // Clear pending queues only on clean manual starts, never on autonomous resume or live inject
    if (!options.preserveQueue) {
      this.frontier.clearQueue();
    }

    const seedsToUse = (seeds && seeds.length > 0)
      ? (this.autonomousMode ? [...new Set([...seeds, ...getAllGlobalSeeds()])] : seeds)
      : (this.autonomousMode ? getAllGlobalSeeds() : ['https://id.wikipedia.org/wiki/Halaman_Utama']);

    this.frontier.pushBulk(seedsToUse, 0, null, true);
    console.log(`[CRAWLER] Active with ${seedsToUse.length} seeds, ${this.concurrency} workers, autonomousMode=${this.autonomousMode}`);

    this.emit('status', this.getStatus());

    // Spawn continuous parallel worker loops in cooperative chunks to keep event loop free
    const spawnChunk = (startIdx, chunkSize = 500) => {
      if (this.state !== CrawlerState.RUNNING) return;
      const endIdx = Math.min(this.concurrency, startIdx + chunkSize);
      for (let i = startIdx; i < endIdx; i++) {
        if (!this.activeWorkerLoops.has(i)) {
          this.runWorker(i).catch(err => {
            console.error(`Worker ${i} initial error:`, err);
          });
        }
      }
      if (endIdx < this.concurrency) {
        setImmediate(() => spawnChunk(endIdx, chunkSize));
      }
    };
    spawnChunk(0);

    // Autonomous refill timer & Watchdog Supervisor
    if (this.autonomousMode) {
      this.startAutonomousRefiller();
      this.startFreshnessCrawler();
      this.startWatchdogSupervisor();
    }
  }

  /**
   * Continuous multi-tier refiller ensures the frontier queue NEVER starves
   */
  startAutonomousRefiller() {
    if (this._refillTimer) clearInterval(this._refillTimer);
    let rotationIndex = 0;
    const allSeeds = getAllGlobalSeeds();

    this._refillTimer = setInterval(() => {
      if (this.state !== CrawlerState.RUNNING || !this.autonomousMode) return;
      if (priorityGovernor.isPriorityActive()) return;

      const stats = this.frontier.getStats();

      // Maintain at least 3,000 queued URLs and 15 active domains
      if (stats.activeDomainsCount < 15 || stats.totalQueued < 3000) {
        // Rotate through 50 seeds per tick
        const batch = [];
        for (let i = 0; i < 50; i++) {
          batch.push(allSeeds[(rotationIndex + i) % allSeeds.length]);
        }
        rotationIndex = (rotationIndex + 50) % allSeeds.length;

        // Force push seeds and evict their seen hash so they branch out into fresh links
        for (const s of batch) {
          const hash = fnv1a64(s);
          this.frontier.seenHashes.delete(hash);
          this.frontier.push(s, 0, null, 25, true);
        }

        // Fast lightweight sampling from database without full-table scan
        try {
          if (this.db && this.db.db) {
            const maxRow = this.db.db.prepare('SELECT MAX(id) as maxId FROM pages').get();
            const maxId = maxRow?.maxId || 1;
            const randomOffset = Math.floor(Math.random() * Math.max(1, maxId - 50));
            const rows = this.db.db.prepare('SELECT domain FROM pages WHERE id >= ? LIMIT 15').all(randomOffset);
            for (const r of rows) {
              if (r.domain) {
                const homeUrl = `https://${r.domain}/`;
                this.frontier.seenHashes.delete(fnv1a64(homeUrl));
                this.frontier.push(homeUrl, 0, null, 15, true);
              }
            }
          }
        } catch {}
      }
    }, 10000);
  }

  /**
   * Autonomous Watchdog Supervisor: automatically revives pipeline if ever stalled
   */
  startWatchdogSupervisor() {
    if (this._watchdogTimer) clearInterval(this._watchdogTimer);
    let lastCrawled = this.crawledCount;
    let stagnationCycles = 0;

    this._watchdogTimer = setInterval(() => {
      if (this.state !== CrawlerState.RUNNING) return;

      // When search queries or user traffic is active, crawler crawl pause is expected and intentional
      if (priorityGovernor.isPriorityActive()) {
        lastCrawled = this.crawledCount;
        stagnationCycles = 0;
        return;
      }

      // If crawled count hasn't moved in 8 seconds while in running state and no search priority
      if (this.crawledCount === lastCrawled) {
        stagnationCycles++;
        if (stagnationCycles >= 2) {
          stagnationCycles = 0;
          console.log(`[WATCHDOG AUTO-HEALER] Checking crawler pipeline... (Queued: ${this.frontier.totalQueuedCount}, Active Domains: ${this.frontier.activeDomainKeys.length}, Active Loops: ${this.activeWorkerLoops.size})`);
          
          // Clear any stuck domain locks/throttling
          this.frontier.domainActiveCounts.clear();
          this.frontier.domainBackoffUntil.clear();

          // Resynchronize any orphaned domain queues into active round-robin keys
          const restored = this.frontier.resyncActiveDomains();
          if (restored > 0) {
            console.log(`[WATCHDOG AUTO-HEALER] Restored ${restored} orphaned domain queues into active scheduling`);
          }

          // Reseed fresh batches if active keys or total queue is low
          if (this.frontier.activeDomainKeys.length < 10 || this.frontier.totalQueuedCount < 50) {
            const allSeeds = getAllGlobalSeeds();
            const freshBatch = allSeeds.sort(() => 0.5 - Math.random()).slice(0, 100);
            for (const s of freshBatch) {
              this.frontier.seenHashes.delete(fnv1a64(s));
              this.frontier.push(s, 0, null, 30, true);
            }
          }

          // Ensure workers are alive - ONLY spawn workers whose loop has truly exited
          for (let i = 0; i < this.concurrency; i++) {
            if (!this.activeWorkerLoops.has(i)) {
              this.runWorker(i).catch(() => {});
            }
          }
        }
      } else {
        lastCrawled = this.crawledCount;
        stagnationCycles = 0;
      }
    }, 4000);
  }

  /**
   * Periodically re-crawls top seed URLs for content freshness & breaking news.
   */
  startFreshnessCrawler() {
    if (this._freshnessTimer) clearInterval(this._freshnessTimer);
    this._freshnessTimer = setInterval(() => {
      if (this.state !== CrawlerState.RUNNING || !this.autonomousMode) return;
      if (priorityGovernor.isPriorityActive()) return;

      // Re-inject seeds with force=true to bypass dedup and re-crawl for fresh content
      const globalSeeds = getAllGlobalSeeds();
      const toRefresh = globalSeeds.sort(() => 0.5 - Math.random()).slice(0, 60);
      let refreshed = 0;
      for (const seed of toRefresh) {
        const hash = fnv1a64(seed);
        this.frontier.seenHashes.delete(hash);
        if (this.frontier.push(seed, 0, null, 40, true)) {
          refreshed++;
        }
      }
      if (refreshed > 0) {
        console.log(`[FRESHNESS] Re-queued ${refreshed} seed URLs for real-time content refresh`);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Continuous dedicated worker loop for each concurrency slot
   */
  async runWorker(workerId) {
    if (this.activeWorkerLoops.has(workerId)) {
      return; // Already actively running, avoid duplicate worker loop
    }
    this.activeWorkerLoops.add(workerId);

    try {
      while (this.state === CrawlerState.RUNNING) {
        if (!this.autonomousMode && this.crawledCount >= this.maxPages) {
          await this.stop();
          break;
        }

        // 1. Adaptive QoS Search Priority Governor:
        // When a user or API client searches, crawler workers immediately yield and throttle
        if (priorityGovernor.isPriorityActive()) {
          if (workerId > 0) {
            // Secondary workers sleep to free 100% of CPU for instant search responses
            await new Promise(r => setTimeout(r, 400));
            continue;
          } else {
            // Worker 0 trickles at low speed
            await new Promise(r => setTimeout(r, 1200));
          }
        }

        // If internet connection dropped, pause pops and wait for sentinel to reconnect
        if (this.isOffline) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        const item = this.frontier.popNextEligible();
        if (!item) {
          // Frontier queue empty or domains throttled -> jittered yield to prevent event loop storms
          const waitMs = 80 + Math.floor(Math.random() * 120);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        this.activeWorkers++;
        try {
          await this.crawlItem(item);
        } catch (e) {
          // Safe catch
        } finally {
          this.activeWorkers = Math.max(0, this.activeWorkers - 1);
          // Cooperative yield: snappy 5ms for max throughput while keeping event loop responsive
          await new Promise(r => setTimeout(r, 5));
        }
      }
    } finally {
      this.activeWorkerLoops.delete(workerId);
    }
  }

  /**
   * Network Sentinel: Handles internet dropouts & auto-reconnects seamlessly
   */
  async triggerNetworkOfflinePause() {
    if (this.isOffline) return;

    // Quick verification: verify if local internet is genuinely down before pausing
    try {
      const probe = await fetch('https://1.1.1.1', {
        signal: AbortSignal.timeout(1500),
        headers: { 'User-Agent': 'Mozilla/5.0 DeeperNova-Sentinel/1.0' }
      }).catch(() => null);

      if (probe && (probe.ok || probe.status > 0)) {
        this.consecutiveNetErrors = 0;
        return; // Connection is active, skip pausing
      }
    } catch {}

    this.isOffline = true;
    console.log('\n[NETWORK SENTINEL] ⚠️ Internet connection interrupted or offline. Pausing worker queue pops...');

    if (this._offlineProbeTimer) clearInterval(this._offlineProbeTimer);
    this._offlineProbeTimer = setInterval(async () => {
      try {
        const probe = await fetch('https://1.1.1.1', {
          signal: AbortSignal.timeout(2000),
          headers: { 'User-Agent': 'Mozilla/5.0 DeeperNova-Sentinel/1.0' }
        }).catch(() => null);

        if (probe && (probe.ok || probe.status > 0)) {
          clearInterval(this._offlineProbeTimer);
          this._offlineProbeTimer = null;
          this.isOffline = false;
          this.consecutiveNetErrors = 0;
          console.log('[NETWORK SENTINEL] 🌐 Internet connection restored! Resuming hyper-speed crawling across all workers.\n');
          
          // Clear any backoffs and reset domain limits
          this.frontier.domainActiveCounts.clear();
          this.frontier.domainBackoffUntil.clear();
        }
      } catch {}
    }, 2000);
  }

  /**
   * Dynamically injects seeds into active crawler without resetting or stopping background queue
   */
  injectSeeds(seeds = [], priority = 30) {
    let added = 0;
    for (const s of seeds) {
      const hash = fnv1a64(s);
      this.frontier.seenHashes.delete(hash);
      if (this.frontier.push(s, 0, null, priority, true)) {
        added++;
      }
    }
    if (this.state !== CrawlerState.RUNNING && added > 0) {
      this.start(seeds, { autonomousMode: true, preserveQueue: true });
    } else if (this.state === CrawlerState.RUNNING) {
      // Ensure workers are alive and actively polling
      for (let i = 0; i < this.concurrency; i++) {
        if (!this.activeWorkerLoops.has(i)) {
          this.runWorker(i).catch(() => {});
        }
      }
    }
    return added;
  }

  /**
   * Pauses the crawling loop
   */
  pause() {
    if (this.state === CrawlerState.RUNNING) {
      this.state = CrawlerState.PAUSED;
      this.emit('status', this.getStatus());
    }
  }

  /**
   * Resumes crawling from paused state
   */
  resume() {
    if (this.state === CrawlerState.PAUSED) {
      this.state = CrawlerState.RUNNING;
      this.emit('status', this.getStatus());
      for (let i = 0; i < this.concurrency; i++) {
        if (!this.activeWorkerLoops.has(i)) {
          this.runWorker(i).catch(err => {
            console.error(`Worker ${i} resume error:`, err);
          });
        }
      }
      if (this.autonomousMode) {
        this.startAutonomousRefiller();
        this.startFreshnessCrawler();
        this.startWatchdogSupervisor();
      }
    }
  }

  /**
   * Stops crawler and runs final PageRank computation
   */
  async stop() {
    this.state = CrawlerState.STOPPED;
    if (this._refillTimer) clearInterval(this._refillTimer);
    if (this._freshnessTimer) clearInterval(this._freshnessTimer);
    if (this._watchdogTimer) clearInterval(this._watchdogTimer);
    if (this._offlineProbeTimer) clearInterval(this._offlineProbeTimer);
    this.frontier.clear();
    this.emit('status', this.getStatus());

    setTimeout(() => {
      this.pagerankCalc.calculateAsync().catch(e => {
        console.error('PageRank error on stop:', e);
      });
    }, 10);
  }

  /**
   * Processes a single URL item through the entire pipeline
   */
  async crawlItem(item) {
    const { url, depth, domain } = item;
    let isSuccess = false;
    let isHostReachable = true;

    try {
      // 1. Robots.txt Compliance Check
      const allowed = await this.robots.isAllowed(url);
      if (!allowed) {
        this.recordRate(0);
        this.db.logCrawl(url, domain, 403, 'Blocked by robots.txt', 0, 0);
        this.emit('log', {
          url,
          domain,
          status: 403,
          statusText: 'Disallowed (robots.txt)',
          latencyMs: 0,
          type: 'skip',
          timestamp: Date.now(),
          created_at: Date.now()
        });
        return;
      }

      // 2. Fetch page over HTTP
      const fetchRes = await this.fetcher.fetchPage(url);
      this.recordRate(fetchRes.latencyMs || 0);

      if (!fetchRes.success) {
        const statusText = fetchRes.statusText || '';
        const isNetOutage = fetchRes.status === 0 && (
          statusText.includes('fetch failed') ||
          statusText.includes('ENOTFOUND') ||
          statusText.includes('EAI_AGAIN') ||
          statusText.includes('ECONNREFUSED') ||
          statusText.includes('UND_ERR')
        );

        if (isNetOutage) {
          isHostReachable = false;
          this.consecutiveNetErrors++;
          // Re-queue the item so it is not lost when connection drops
          this.frontier.push(url, depth, null, item.priority || 20, true);

          if (this.consecutiveNetErrors >= 50) {
            this.triggerNetworkOfflinePause();
          }
        } else {
          // Non-zero HTTP status (404, 403, etc): Host is online and reachable!
          this.consecutiveNetErrors = 0;
          this.errorCount++;
          this.db.logCrawl(url, domain, fetchRes.status, fetchRes.statusText, fetchRes.latencyMs, 0);
          this.emit('log', {
            url,
            domain,
            status: fetchRes.status || 0,
            statusText: fetchRes.statusText,
            latencyMs: fetchRes.latencyMs,
            type: 'error',
            timestamp: Date.now(),
            created_at: Date.now()
          });
        }
        return;
      }

      // Successful fetch -> reset network error counter
      this.consecutiveNetErrors = 0;

      // 3. Parse HTML and extract metadata & links
      const parsedDoc = HTMLParser.parse(fetchRes.html, fetchRes.finalUrl || url);

      if (!parsedDoc) {
        this.errorCount++;
        this.db.logCrawl(url, domain, fetchRes.status, 'HTML Parsing Failed', fetchRes.latencyMs, fetchRes.bytes);
        return;
      }

      // 3b. Anti-Spam & Anti-Judol Gatekeeper Inspection
      const quality = TrustGatekeeper.evaluateContentQuality(parsedDoc, domain);
      if (quality.isSpam) {
        this.db.logCrawl(url, domain, 422, `Spam Filtered (${quality.reason})`, fetchRes.latencyMs, fetchRes.bytes);
        return; // Silently drop judol/spam to prevent database poisoning
      }

      // 4. Save to Database & FTS5 index asynchronously (non-blocking for crawler throughput)
      this.db.savePage({
        url: fetchRes.finalUrl || url,
        domain,
        title: parsedDoc.title,
        description: parsedDoc.description,
        headings: parsedDoc.headings,
        content: parsedDoc.content,
        lang: parsedDoc.lang,
        logoUrl: parsedDoc.logoUrl,
        leadImageUrl: parsedDoc.leadImageUrl,
        images: (parsedDoc.images || []).slice(0, 2), // Cap to max 2 for 5x faster SQLite text indexing
        wordCount: parsedDoc.wordCount,
        contentHash: parsedDoc.contentHash,
        statusCode: fetchRes.status,
        latencyMs: fetchRes.latencyMs,
        category: TrustGatekeeper.classifyCategory(fetchRes.finalUrl || url, domain, parsedDoc.title, parsedDoc.content),
        trustScore: quality.score,
        isVerifiedTrust: quality.isVerifiedTrust,
        publishedAt: parsedDoc.publishedAt,
        outgoingLinks: parsedDoc.outgoingLinks
      }).catch(() => {});

      // 4b. Auto-index geo entities discovered by crawler
      if (parsedDoc.geoData && parsedDoc.title && typeof this.db.saveGeoEntity === 'function') {
        this.db.saveGeoEntity({
          keyword_key: parsedDoc.title.toLowerCase().trim(),
          name: parsedDoc.title,
          subtitle: parsedDoc.description ? parsedDoc.description.slice(0, 100) : null,
          lat: parsedDoc.geoData.lat,
          lng: parsedDoc.geoData.lng,
          description: parsedDoc.description || null,
          photos: parsedDoc.leadImageUrl ? [{ title: parsedDoc.title, url: parsedDoc.leadImageUrl }] : [],
          source: 'crawler'
        });
      }

      // 5. Update counts
      this.crawledCount++;
      this.totalBytes += fetchRes.bytes || 0;
      isSuccess = true;

      this.db.logCrawl(url, domain, fetchRes.status, 'OK', fetchRes.latencyMs, fetchRes.bytes);

      // 6. Discover and push new outgoing URLs to Frontier
      let newUrlsCount = 0;
      if (this.state !== CrawlerState.STOPPED && depth < this.maxDepth && parsedDoc.outgoingLinks.length > 0) {
        const internalLinks = [];
        const externalLinks = [];

        for (const link of parsedDoc.outgoingLinks) {
          const linkDomain = getDomain(link.url);
          if (!linkDomain || linkDomain === domain) {
            if (internalLinks.length < 350) internalLinks.push(link);
          } else {
            if (externalLinks.length < 350) externalLinks.push(link);
          }
          if (internalLinks.length >= 350 && externalLinks.length >= 350) break;
        }

        // Auto-probe sitemap on root domain visits at depth 0 or 1
        if (depth <= 1) {
          try {
            const parsedBase = new URL(url);
            const sitemapUrl = `${parsedBase.protocol}//${parsedBase.host}/sitemap.xml`;
            this.frontier.push(sitemapUrl, depth + 1, url, 25);
          } catch {}
        }

        // Prioritize external links for breadth — discover thousands of new domains
        for (const link of externalLinks) {
          if (this.state === CrawlerState.STOPPED) break;
          if (this.frontier.push(link.url, depth + 1, url, 15)) {
            newUrlsCount++;
          }
        }

        // Internal links for depth — go deep into each site's articles and categories
        for (const link of internalLinks) {
          if (this.state === CrawlerState.STOPPED) break;
          if (this.frontier.push(link.url, depth + 1, url, 10)) {
            newUrlsCount++;
          }
        }
      }

      // 7. Periodic PageRank calculation (non-blocking)
      if (this.crawledCount - this.lastPageRankCount >= this.pageRankInterval) {
        this.lastPageRankCount = this.crawledCount;
        this.pagerankCalc.calculateAsync().catch(e => {
          console.error('Periodic PageRank error:', e.message);
        });
      }

      // 8. Emit telemetry
      this.emit('log', {
        url,
        domain,
        title: parsedDoc.title,
        status: fetchRes.status,
        statusText: 'OK',
        latencyMs: fetchRes.latencyMs,
        bytes: fetchRes.bytes,
        discoveredLinks: parsedDoc.outgoingLinks.length,
        newQueued: newUrlsCount,
        totalPages: this.db.totalPagesCount,
        crawledCount: this.crawledCount,
        type: 'success',
        timestamp: Date.now(),
        created_at: Date.now()
      });

    } catch (err) {
      isHostReachable = false;
      this.errorCount++;
      this.recordRate(0);
      this.db.logCrawl(url, domain, 0, err.message, 0, 0);
      this.emit('log', {
        url,
        domain,
        status: 0,
        statusText: err.message,
        latencyMs: 0,
        type: 'error',
        timestamp: Date.now(),
        created_at: Date.now()
      });
    } finally {
      this.frontier.releaseDomain(domain, isSuccess || isHostReachable);
    }
  }

  recordRate(latencyMs = 0) {
    const sec = Math.floor(Date.now() / 1000);
    if (!this._secBuckets) this._secBuckets = new Map();
    this._secBuckets.set(sec, (this._secBuckets.get(sec) || 0) + 1);

    // Keep only last 6 seconds
    if (this._secBuckets.size > 8) {
      for (const [s] of this._secBuckets) {
        if (s < sec - 5) {
          this._secBuckets.delete(s);
        }
      }
    }

    if (latencyMs > 0) {
      this.recentLatencies.push(latencyMs);
      if (this.recentLatencies.length > 50) this.recentLatencies.shift();
    }
  }

  getAverageLatency() {
    if (this.recentLatencies.length === 0) return 0;
    const sum = this.recentLatencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.recentLatencies.length);
  }

  /**
   * Calculates instantaneous Requests Per Second (RPS)
   */
  getCurrentRPS() {
    if (!this._secBuckets || this._secBuckets.size === 0) return 0;
    const currentSec = Math.floor(Date.now() / 1000);
    let total = 0;
    let count = 0;
    for (let s = currentSec - 4; s <= currentSec; s++) {
      total += (this._secBuckets.get(s) || 0);
      count++;
    }
    return Math.round((total / Math.max(1, count)) * 10) / 10;
  }

  getSnapshot() {
    const frontierStats = this.frontier.getStats();
    const totalReqs = this.crawledCount + this.errorCount;
    const successRate = totalReqs > 0 ? Math.round((this.crawledCount / totalReqs) * 100) : 100;
    const rps = this.getCurrentRPS();

    return {
      timestamp: Date.now(),
      rps,
      crawledCount: this.crawledCount,
      errorCount: this.errorCount,
      totalPages: this.db.totalPagesCount || 0,
      totalLinks: this.db.totalLinksCount || 0,
      queueSize: frontierStats.totalQueued,
      uniqueUrlsSeen: frontierStats.uniqueUrlsSeen,
      activeDomains: frontierStats.activeDomainsCount,
      activeWorkers: this.activeWorkers,
      avgLatencyMs: this.getAverageLatency(),
      bandwidthKbps: Math.round(rps * 28),
      totalBytesMb: Math.round((this.totalBytes / (1024 * 1024)) * 100) / 100,
      successRate,
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }

  getHistory() {
    return this.telemetryHistory.slice(-120);
  }

  getStatus() {
    const frontierStats = this.frontier.getStats();
    const uptimeSec = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
    const totalReqs = this.crawledCount + this.errorCount;
    const successRate = totalReqs > 0 ? Math.round((this.crawledCount / totalReqs) * 100) : 100;

    return {
      state: this.state,
      crawledCount: this.crawledCount,
      errorCount: this.errorCount,
      totalBytes: this.totalBytes,
      activeWorkers: this.activeWorkers,
      queueSize: frontierStats.totalQueued,
      uniqueUrlsSeen: frontierStats.uniqueUrlsSeen,
      activeDomains: frontierStats.activeDomainsCount,
      avgLatencyMs: this.getAverageLatency(),
      successRate,
      rps: this.getCurrentRPS(),
      uptimeSec
    };
  }
}
