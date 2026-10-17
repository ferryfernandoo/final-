import { canonicalizeUrl, getDomain, fnv1a64 } from './urlUtils.js';
import { TrustGatekeeper } from './trustGatekeeper.js';

/**
 * Classifies a domain/URL into one of 4 strict crawling tiers:
 * Tier 1: Berita Indonesia & Regional Media Portals (Highest Priority)
 * Tier 2: Berita Mancanegara / World Wire Services (Second Priority)
 * Tier 3: Web Indonesia (.go.id, .ac.id, E-Commerce, Indonesian Wikipedia) (Third Priority)
 * Tier 4: Web Mancanegara (Global encyclopedias, tech docs, research) (Fourth Priority)
 */
export function classifyDomainTier(domain, url = '') {
  const d = (domain || '').toLowerCase();
  const u = (url || '').toLowerCase();

  // TIER 1: INDONESIAN BREAKING NEWS & MEDIA PORTALS
  if (
    d === 'deepernova.com' || d.endsWith('.deepernova.com') ||
    d.includes('detik.com') || d.includes('kompas.com') ||
    d.includes('antaranews.com') || d.includes('cnnindonesia.com') ||
    d.includes('cnbcindonesia.com') || d.includes('tribunnews.com') ||
    d.includes('tempo.co') || d.includes('republika.co.id') ||
    d.includes('liputan6.com') || d.includes('merdeka.com') ||
    d.includes('suara.com') || d.includes('jawapos.com') ||
    d.includes('pikiran-rakyat.com') || d.includes('sindonews.com') ||
    d.includes('okezone.com') || d.includes('kumparan.com') ||
    d.includes('idntimes.com') || d.includes('inews.id') ||
    d.includes('katadata.co.id') || d.includes('kontan.co.id') ||
    d.includes('bisnis.com') || d.includes('viva.co.id') ||
    d.includes('beritasatu.com') || d.includes('rri.co.id') ||
    d.includes('disway.id') || d.includes('mediaindonesia.com') ||
    d.includes('tvrinews.com') || d.includes('elshinta.com') ||
    d.includes('radarbogor.id') || d.includes('tirto.id') ||
    d.includes('bola.net') || d.includes('bola.com') ||
    d.includes('pssi.org') || d.includes('ligaindonesiabaru.com') ||
    d.includes('pbsi.id') || d.includes('skor.id') ||
    ((d.endsWith('.id') || d.endsWith('.co.id')) && (
      u.includes('/berita') || u.includes('/news') || u.includes('/read/') ||
      u.includes('/nasional') || u.includes('/daerah') || u.includes('/politik') ||
      u.includes('/ekonomi') || u.includes('/internasional') || u.includes('/sport') ||
      u.includes('/bola') || u.includes('/tekno') || u.includes('/terkini') ||
      u.includes('/peristiwa') || u.includes('/hukum') || u.includes('/lifestyle')
    ))
  ) {
    return 1;
  }

  // TIER 2: GLOBAL / WORLD WIRE NEWS SERVICES
  if (
    d.includes('reuters.com') || d.includes('reutersagency.com') ||
    d.includes('apnews.com') || d.includes('bbc.com') || d.includes('bbci.co.uk') ||
    d.includes('dw.com') || d.includes('voanews.com') ||
    d.includes('voaindonesia.com') || d.includes('aljazeera.com') ||
    d.includes('bloomberg.com') || d.includes('cnn.com') ||
    d.includes('cnbc.com') || d.includes('nytimes.com') ||
    d.includes('theguardian.com') || d.includes('washingtonpost.com') ||
    d.includes('wsj.com') || d.includes('france24.com') ||
    d.includes('nhk.or.jp') || d.includes('scmp.com') ||
    d.includes('time.com') || d.includes('forbes.com') ||
    d.includes('ft.com') || d.includes('economist.com') ||
    u.includes('/world-news') || u.includes('/international-news')
  ) {
    return 2;
  }

  // TIER 3: INDONESIAN GENERAL WEB ECOSYSTEM (.GO.ID, .AC.ID, COMMERCE, WIKI ID)
  if (
    d.endsWith('.id') || d.endsWith('.co.id') ||
    d.endsWith('.go.id') || d.endsWith('.ac.id') ||
    d.endsWith('.mil.id') || d.endsWith('.sch.id') ||
    d.endsWith('.or.id') || d.endsWith('.net.id') ||
    d.endsWith('.desa.id') || d.includes('tokopedia.com') ||
    d.includes('bukalapak.com') || d.includes('traveloka.com') ||
    d.includes('tiket.com') || d.includes('blibli.com') ||
    d.includes('lazada.co.id') || d.includes('shopee.co.id') ||
    d === 'id.wikipedia.org' || u.includes('id.wikipedia.org') ||
    u.includes('bmkg.go.id') || u.includes('kemenkeu.go.id') ||
    u.includes('kemkes.go.id') || u.includes('bps.go.id') ||
    u.includes('bi.go.id') || u.includes('ojk.go.id') ||
    u.includes('polri.go.id')
  ) {
    return 3;
  }

  // TIER 4: GLOBAL GENERAL WEB UNIVERSE
  return 4;
}

/**
 * Multi-Tier Domain-aware Frontier Priority Queue with Politeness Governor
 * Enforces strict 4-Tier scheduling order:
 * Tier 1 (Indo News) -> Tier 2 (World News) -> Tier 3 (Web Indo) -> Tier 4 (Web Global)
 */
export class URLFrontier {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth ?? 15; // Deep crawl capacity
    this.perDomainDelayMs = options.perDomainDelayMs ?? 25; // Snappy 25ms delay for fast SSD throughput
    this.maxConcurrentPerDomain = options.maxConcurrentPerDomain ?? 4; // 4 concurrent connections per host
    this.allowedDomains = options.allowedDomains ? new Set(options.allowedDomains.map(d => d.toLowerCase())) : null;
    const defaultBlocked = [
      'doubleclick.net', 'googleads.g.doubleclick.net',
      'googletagmanager.com', 'google-analytics.com',
      'accounts.google.com', 'login.microsoftonline.com'
    ];
    this.blockedDomains = new Set([...defaultBlocked, ...(options.blockedDomains ? options.blockedDomains.map(d => d.toLowerCase()) : [])]);

    // Seen URL Hash Set (for lightning-fast O(1) deduplication)
    this.seenHashes = new Set();

    // Domain Queues: domain -> Array<{ url, depth, priority, addedAt }>
    this.domainQueues = new Map();
    // Active requests count per domain: domain -> number
    this.domainActiveCounts = new Map();
    // Last request timestamp per domain: domain -> number
    this.domainLastRequestTime = new Map();
    // Circuit breaker / backoff tracking
    this.domainFailCounts = new Map();
    this.domainBackoffUntil = new Map();

    // 4 Strict Priority Tiers
    this.tier1DomainKeys = [];
    this.tier1DomainSet = new Set();
    this.rrIndex1 = 0;

    this.tier2DomainKeys = [];
    this.tier2DomainSet = new Set();
    this.rrIndex2 = 0;

    this.tier3DomainKeys = [];
    this.tier3DomainSet = new Set();
    this.rrIndex3 = 0;

    this.tier4DomainKeys = [];
    this.tier4DomainSet = new Set();
    this.rrIndex4 = 0;

    // Fast domain to tier lookup
    this.domainTierMap = new Map();
    this.activeDomainSet = new Set();

    // Total URLs count in all queues
    this.totalQueuedCount = 0;
  }

  /**
   * Helper to retrieve the keys array and set for a specific tier
   */
  getTierCollection(tier) {
    if (tier === 1) return { keys: this.tier1DomainKeys, set: this.tier1DomainSet };
    if (tier === 2) return { keys: this.tier2DomainKeys, set: this.tier2DomainSet };
    if (tier === 3) return { keys: this.tier3DomainKeys, set: this.tier3DomainSet };
    return { keys: this.tier4DomainKeys, set: this.tier4DomainSet };
  }

  /**
   * Promotes a domain to a higher priority tier if a higher-tier URL is discovered
   */
  promoteDomainToTier(domain, newTier) {
    const currentTier = this.domainTierMap.get(domain) || 4;
    if (newTier >= currentTier) return; // Already at equal or higher priority

    // Remove from previous lower tier
    const oldColl = this.getTierCollection(currentTier);
    oldColl.set.delete(domain);
    const idx = oldColl.keys.indexOf(domain);
    if (idx !== -1) oldColl.keys.splice(idx, 1);

    // Register in new higher tier
    this.domainTierMap.set(domain, newTier);
    const newColl = this.getTierCollection(newTier);
    if (!newColl.set.has(domain)) {
      newColl.set.add(domain);
      newColl.keys.push(domain);
    }
  }

  /**
   * Computed activeDomainKeys combining all tiers for compatibility
   */
  get activeDomainKeys() {
    return [
      ...this.tier1DomainKeys,
      ...this.tier2DomainKeys,
      ...this.tier3DomainKeys,
      ...this.tier4DomainKeys
    ];
  }

  /**
   * Pushes a URL to the frontier
   */
  push(rawUrl, depth = 0, baseUrl = null, priority = 0, force = false) {
    const canonical = canonicalizeUrl(rawUrl, baseUrl);
    if (!canonical) return false;

    // Direct Anti-Judol & Anti-Spam Gatekeeper Shield (including compromised .go.id/.ac.id)
    if (TrustGatekeeper.isSpamUrl(canonical) || TrustGatekeeper.isCompromisedGovEduSpam(canonical)) {
      return false;
    }

    if (depth > this.maxDepth) return false;

    const lower = canonical.toLowerCase();
    // Skip static assets, media binaries, auth & tracking URLs (pure text crawling priority)
    if (
      lower.endsWith('.pdf') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
      lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.svg') ||
      lower.endsWith('.webp') || lower.endsWith('.mp4') || lower.endsWith('.mp3') ||
      lower.endsWith('.zip') || lower.endsWith('.tar') || lower.endsWith('.gz') ||
      lower.endsWith('.rar') || lower.endsWith('.7z') || lower.endsWith('.iso') ||
      lower.endsWith('.css') || lower.endsWith('.js') || lower.endsWith('.mjs') ||
      lower.endsWith('.woff') || lower.endsWith('.woff2') || lower.endsWith('.ttf') ||
      lower.endsWith('.eot') || lower.endsWith('.ico') || lower.endsWith('.exe') ||
      lower.endsWith('.apk') || lower.endsWith('.dmg') || lower.endsWith('.bin') ||
      lower.includes('/login') || lower.includes('/signin') || lower.includes('/signup') ||
      lower.includes('/checkout') || lower.includes('/cart')
    ) {
      return false;
    }

    const domain = getDomain(canonical);
    if (!domain) return false;

    // Check whitelist / blacklist
    if (this.blockedDomains.has(domain)) return false;
    if (this.allowedDomains && !this.allowedDomains.has(domain)) {
      let isAllowed = false;
      for (const allowed of this.allowedDomains) {
        if (domain === allowed || domain.endsWith('.' + allowed)) {
          isAllowed = true;
          break;
        }
      }
      if (!isAllowed) return false;
    }

    // Deduplication check (bypassed if force === true)
    const urlHash = fnv1a64(canonical);
    if (!force && this.seenHashes.has(urlHash)) {
      return false; // Already queued or visited
    }
    
    // High-efficiency deduplication buffer with zero-copy FIFO sliding eviction
    if (this.seenHashes.size >= 150000) {
      let pruned = 0;
      for (const h of this.seenHashes) {
        this.seenHashes.delete(h);
        if (++pruned >= 50000) break;
      }
    }
    this.seenHashes.add(urlHash);

    // Classify into strict 4-Tier architecture
    const tier = classifyDomainTier(domain, canonical);

    // Compute dynamic priority score based on tier if not provided
    let computedPriority = priority;
    if (computedPriority === 0) {
      if (tier === 1) computedPriority = 98;
      else if (tier === 2) computedPriority = 85;
      else if (tier === 3) computedPriority = 70;
      else computedPriority = Math.max(10, 30 - depth);
    }

    // Memory-Safe Global Queue Cap (45,000 URLs capacity prevents heap bloat)
    if (this.totalQueuedCount >= 45000 && !force && tier > 1) {
      return false;
    }

    // Per-Domain Depth Cap
    const MAX_QUEUE_PER_DOMAIN = (tier === 1) ? 2500 : ((tier <= 3) ? 1000 : 400);
    let queue = this.domainQueues.get(domain);
    if (queue && queue.length >= MAX_QUEUE_PER_DOMAIN && !force) {
      return false;
    }
    if (!queue) {
      queue = [];
      this.domainQueues.set(domain, queue);
    }

    // Track and assign domain to appropriate Tier collection
    if (!this.domainTierMap.has(domain)) {
      this.domainTierMap.set(domain, tier);
    } else {
      // If URL has higher priority, promote domain
      if (tier < (this.domainTierMap.get(domain) || 4)) {
        this.promoteDomainToTier(domain, tier);
      }
    }

    // CRITICAL: Ensure domain is ALWAYS present in round-robin keys of its assigned tier
    const assignedTier = this.domainTierMap.get(domain) || tier;
    const coll = this.getTierCollection(assignedTier);
    if (!coll.set.has(domain)) {
      coll.set.add(domain);
      coll.keys.push(domain);
      this.activeDomainSet.add(domain);
    }

    const queueItem = {
      url: canonical,
      depth,
      priority: computedPriority,
      domain,
      tier,
      addedAt: Date.now()
    };

    if (tier === 1 || computedPriority >= 80) {
      queue.unshift(queueItem);
    } else {
      queue.push(queueItem);
    }

    this.totalQueuedCount++;
    return true;
  }

  /**
   * Pushes multiple URLs in bulk
   */
  pushBulk(urls, depth = 0, baseUrl = null, force = false) {
    let count = 0;
    for (const u of urls) {
      if (this.push(u, depth, baseUrl, 0, force)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Selects the next eligible URL respecting strict 4-Tier scheduling:
   * Tier 1 (Berita Indo) -> Tier 2 (Berita Global) -> Tier 3 (Web Indo) -> Tier 4 (Web Global)
   */
  popNextEligible() {
    const tiers = [
      { tierNum: 1, keys: this.tier1DomainKeys, set: this.tier1DomainSet, rr: 'rrIndex1' },
      { tierNum: 2, keys: this.tier2DomainKeys, set: this.tier2DomainSet, rr: 'rrIndex2' },
      { tierNum: 3, keys: this.tier3DomainKeys, set: this.tier3DomainSet, rr: 'rrIndex3' },
      { tierNum: 4, keys: this.tier4DomainKeys, set: this.tier4DomainSet, rr: 'rrIndex4' }
    ];

    const now = Date.now();

    // Iterate through tiers strictly in priority order
    for (const tierObj of tiers) {
      const keys = tierObj.keys;
      const len = keys.length;
      if (len === 0) continue;

      let checked = 0;
      while (checked < len) {
        if (this[tierObj.rr] >= keys.length) {
          this[tierObj.rr] = 0;
        }
        if (keys.length === 0) break;

        const domain = keys[this[tierObj.rr]];
        const queue = this.domainQueues.get(domain);

        if (!queue || queue.length === 0) {
          // Domain queue exhausted, remove from active tier list
          keys.splice(this[tierObj.rr], 1);
          tierObj.set.delete(domain);
          this.domainQueues.delete(domain);
          this.activeDomainSet.delete(domain);
          continue;
        }

        // Check circuit breaker backoff
        const backoffUntil = this.domainBackoffUntil.get(domain) || 0;
        if (now < backoffUntil) {
          this[tierObj.rr] = (this[tierObj.rr] + 1) % Math.max(1, keys.length);
          checked++;
          continue;
        }

        const activeCount = this.domainActiveCounts.get(domain) || 0;
        const lastReq = this.domainLastRequestTime.get(domain) || 0;

        // Check politeness constraints
        if (activeCount < this.maxConcurrentPerDomain && (now - lastReq >= this.perDomainDelayMs)) {
          const item = queue.shift();
          this.totalQueuedCount--;

          this.domainActiveCounts.set(domain, activeCount + 1);
          this.domainLastRequestTime.set(domain, now);

          this[tierObj.rr] = (this[tierObj.rr] + 1) % Math.max(1, keys.length);
          return item;
        }

        this[tierObj.rr] = (this[tierObj.rr] + 1) % Math.max(1, keys.length);
        checked++;
      }
    }

    return null;
  }

  /**
   * Called when a request for a domain completes to release politeness concurrency slots
   */
  releaseDomain(domain, success = true) {
    if (!domain) return;
    const current = this.domainActiveCounts.get(domain) || 1;
    this.domainActiveCounts.set(domain, Math.max(0, current - 1));
    this.domainLastRequestTime.set(domain, Date.now());

    if (success) {
      this.domainFailCounts.delete(domain);
      this.domainBackoffUntil.delete(domain);
    } else {
      const fails = (this.domainFailCounts.get(domain) || 0) + 1;
      this.domainFailCounts.set(domain, fails);
      if (fails >= 5) {
        // Back off failing domain for 30s (not 5 mins!) so workers focus on healthy websites
        this.domainBackoffUntil.set(domain, Date.now() + 30000);
      }
    }
  }

  /**
   * Resynchronizes all non-empty domain queues into their tier collections
   * Guarantees zero orphaned domain queues
   */
  resyncActiveDomains() {
    let restored = 0;
    for (const [domain, queue] of this.domainQueues.entries()) {
      if (queue && queue.length > 0) {
        const assignedTier = this.domainTierMap.get(domain) || 4;
        const coll = this.getTierCollection(assignedTier);
        if (!coll.set.has(domain)) {
          coll.set.add(domain);
          coll.keys.push(domain);
          this.activeDomainSet.add(domain);
          restored++;
        }
      }
    }
    return restored;
  }

  /**
   * Returns current frontier statistics with tier breakdown
   */
  getStats() {
    return {
      totalQueued: this.totalQueuedCount,
      uniqueUrlsSeen: this.seenHashes.size,
      activeDomainsCount: this.tier1DomainKeys.length + this.tier2DomainKeys.length + this.tier3DomainKeys.length + this.tier4DomainKeys.length,
      tier1IndoNewsDomains: this.tier1DomainKeys.length,
      tier2WorldNewsDomains: this.tier2DomainKeys.length,
      tier3IndoWebDomains: this.tier3DomainKeys.length,
      tier4GlobalWebDomains: this.tier4DomainKeys.length
    };
  }

  /**
   * Clears pending domain queues without clearing seen URL history
   */
  clearQueue() {
    this.domainQueues.clear();
    this.domainActiveCounts.clear();
    this.domainLastRequestTime.clear();
    this.domainFailCounts.clear();
    this.domainBackoffUntil.clear();

    this.tier1DomainKeys = [];
    this.tier1DomainSet.clear();
    this.rrIndex1 = 0;

    this.tier2DomainKeys = [];
    this.tier2DomainSet.clear();
    this.rrIndex2 = 0;

    this.tier3DomainKeys = [];
    this.tier3DomainSet.clear();
    this.rrIndex3 = 0;

    this.tier4DomainKeys = [];
    this.tier4DomainSet.clear();
    this.rrIndex4 = 0;

    this.domainTierMap.clear();
    this.activeDomainSet.clear();
    this.totalQueuedCount = 0;
  }

  /**
   * Clears frontier queues and seen hashes for clean restart
   */
  clear() {
    this.seenHashes.clear();
    this.clearQueue();
  }
}
