/**
 * ============================================================================
 * 🌟 DEEPERNOVA HIGH-VELOCITY AUTONOMOUS TOKOH & CELEBRITY CRAWLER
 * ============================================================================
 * 100% Autonomous continuous discovery and indexing engine for public figures,
 * leaders, artists, athletes, scientists, innovators, and cultural icons.
 * Automatically harvests categories from Wikipedia / Wikidata / Open Knowledge
 * and crawls rich biographical cards + high-res portraits non-stop.
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { HTTPFetcher } from './fetcher.js';
import { priorityGovernor } from '../indexer/governor.js';

// Top-level seed categories for autonomous continuous discovery
export const TOKOH_CATEGORIES = [
  // Indonesian Categories
  { lang: 'id', title: 'Kategori:Pahlawan_Nasional_Indonesia' },
  { lang: 'id', title: 'Kategori:Presiden_Indonesia' },
  { lang: 'id', title: 'Kategori:Wakil_Presiden_Indonesia' },
  { lang: 'id', title: 'Kategori:Menteri_Indonesia' },
  { lang: 'id', title: 'Kategori:Gubernur_di_Indonesia' },
  { lang: 'id', title: 'Kategori:Wali_kota_di_Indonesia' },
  { lang: 'id', title: 'Kategori:Pemeran_pria_Indonesia' },
  { lang: 'id', title: 'Kategori:Pemeran_perempuan_Indonesia' },
  { lang: 'id', title: 'Kategori:Penyanyi_Indonesia' },
  { lang: 'id', title: 'Kategori:Musisi_Indonesia' },
  { lang: 'id', title: 'Kategori:Pengusaha_Indonesia' },
  { lang: 'id', title: 'Kategori:Sastrawan_Indonesia' },
  { lang: 'id', title: 'Kategori:Ilmuwan_Indonesia' },
  { lang: 'id', title: 'Kategori:Pemain_sepak_bola_Indonesia' },
  { lang: 'id', title: 'Kategori:Pebulu_tangkis_Indonesia' },
  { lang: 'id', title: 'Kategori:Sutradara_Indonesia' },
  { lang: 'id', title: 'Kategori:Pelawak_Indonesia' },
  { lang: 'id', title: 'Kategori:Purnawirawan_TNI_Angkatan_Darat' },
  { lang: 'id', title: 'Kategori:Ulama_Indonesia' },

  // Global Categories
  { lang: 'en', title: 'Category:Presidents_of_the_United_States' },
  { lang: 'en', title: 'Category:Nobel_laureates' },
  { lang: 'en', title: 'Category:Chief_executives' },
  { lang: 'en', title: 'Category:Computer_scientists' },
  { lang: 'en', title: 'Category:Artificial_intelligence_researchers' },
  { lang: 'en', title: 'Category:Internet_celebrities' },
  { lang: 'en', title: 'Category:Association_football_players' },
  { lang: 'en', title: 'Category:21st-century_actors' },
  { lang: 'en', title: 'Category:Formula_One_drivers' }
];

// High-precision known aliases & epithets (julukan / nama populer) dictionary
export const KNOWN_TOKOH_ALIASES = {
  'abdurrahman wahid': ['Gus Dur', 'Gusdur', 'Bapak Pluralisme Indonesia', 'KH Abdurrahman Wahid'],
  'soekarno': ['Bung Karno', 'Putra Sang Fajar', 'Proklamator', 'Pak Karno', 'Ir Soekarno'],
  'mohammad hatta': ['Bung Hatta', 'Bapak Koperasi Indonesia', 'Proklamator', 'Pak Hatta'],
  'b. j. habibie': ['Habibie', 'Eyang Habibie', 'Mr. Crack', 'Bapak Teknologi Indonesia', 'BJ Habibie', 'Bacharuddin Jusuf Habibie'],
  'soeharto': ['Pak Harto', 'Harto', 'The Smiling General', 'Bapak Pembangunan', 'Jenderal Soeharto'],
  'susilo bambang yudhoyono': ['SBY', 'Pak SBY', 'Jenderal SBY'],
  'joko widodo': ['Jokowi', 'Pak Jokowi', 'Mulyono'],
  'prabowo subianto': ['Prabowo', 'Pak Prabowo', '08', 'Jenderal Prabowo'],
  'gibran rakabuming raka': ['Gibran', 'Mas Gibran', 'Samsul', 'Wapres Gibran'],
  'megawati soekarnoputri': ['Megawati', 'Bu Mega', 'Ibu Mega', 'Mega', 'Mbak Mega'],
  'sri mulyani indrawati': ['Sri Mulyani', 'Bu Sri Mulyani', 'SMI', 'Menkeu Sri Mulyani'],
  'anies baswedan': ['Anies', 'Pak Anies', 'Anies Rasyid Baswedan'],
  'ganjar pranowo': ['Ganjar', 'Pak Ganjar'],
  'mahfud md': ['Mahfud', 'Prof Mahfud', 'Mohammad Mahfud'],
  'ridwan kamil': ['Kang Emil', 'Emil', 'RK', 'Gubernur Emil'],
  'basuki tjahaja purnama': ['Ahok', 'BTP', 'Pak Ahok', 'Basuki TP'],
  'luhut binsar pandjaitan': ['Luhut', 'Opung Luhut', 'LBP', 'Menko Luhut'],
  'erick thohir': ['Erick', 'Pak Erick', 'Ketum PSSI Erick'],
  'sandiaga uno': ['Sandiaga', 'Sandi Uno', 'Bang Sandi'],
  'agus harimurti yudhoyono': ['AHY', 'Agus Yudhoyono'],
  'puan maharani': ['Mbak Puan', 'Puan'],
  'kaesang pangarep': ['Kaesang', 'Ketum PSI Kaesang'],
  'ki hajar dewantara': ['Raden Mas Soewardi Soerjaningrat', 'Bapak Pendidikan Nasional', 'Ki Hadjar Dewantara'],
  'cristiano ronaldo': ['CR7', 'El Bicho', 'Siuuu', 'Ronny'],
  'lionel messi': ['La Pulga', 'Leo Messi', 'The GOAT', 'Messidona'],
  'michael jackson': ['King of Pop', 'MJ'],
  'muhammad ali': ['The Greatest', 'Cassius Clay'],
  'bill gates': ['William Henry Gates III'],
  'elon musk': ['Technoking of Tesla', 'The Dogefather', 'Elon'],
  'donald trump': ['Trump', 'DJT', 'The Donald', 'Donald J Trump'],
  'barack obama': ['Obama', 'Barry Obama'],
  'chairil anwar': ['Si Binatang Jalang'],
  'pramoedya ananta toer': ['Pram'],
  'buya hamka': ['Haji Abdul Malik Karim Amrullah', 'Hamka'],
  'ahmad dahlan': ['Muhammad Darwis', 'K.H. Ahmad Dahlan'],
  'hasyim asy\'ari': ['Hadratussyaikh', 'KH Hasyim Asyari'],
  'raden ajeng kartini': ['R.A. Kartini', 'Ibu Kartini', 'Kartini'],
  'cut nyak dhien': ['Tjut Njak Dien', 'Srikandi Aceh'],
  'pangeran diponegoro': ['Diponegoro', 'Bendara Pangeran Harya Dipanegara'],
  'jenderal soedirman': ['Panglima Besar Soedirman', 'Pak Dirman', 'Sudirman'],
  'tuanku imam bonjol': ['Muhammad Shahab', 'Peto Syarif'],
  'sam altman': ['Sama', 'CEO of OpenAI'],
  'mark zuckerberg': ['Zuck', 'Mark'],
  'jensen huang': ['Huang Jen-hsun', 'Jensen', 'Godfather of AI'],
  'steve jobs': ['Steven Paul Jobs', 'Jobs'],
  'albert einstein': ['Einstein', 'Bapak Relativitas'],
  'isaac newton': ['Sir Isaac Newton', 'Bapak Gravitasi'],
  'nikola tesla': ['Tesla', 'Master of Lightning'],
  'stephen hawking': ['Hawking', 'Master of the Universe']
};

export class TokohCrawler extends EventEmitter {
  constructor(db, options = {}) {
    super();
    this.db = db;
    this.fetcher = new HTTPFetcher({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 (DeeperNova-Tokoh-Crawler/2.0)',
      timeoutMs: 3500
    });

    this.concurrency = options.concurrency ?? 8;     // 8 parallel workers for crazy fast throughput
    this.batchDelayMs = options.batchDelayMs ?? 150; // 150ms polite micro-yield between batches
    this.running = false;
    this.stopped = false;
    this.loopPromise = null;

    this.pendingQueue = [];
    this.seenNames = new Set();
  }

  _markNameSeen(name) {
    if (this.seenNames.size >= 15000) {
      let count = 0;
      for (const n of this.seenNames) {
        this.seenNames.delete(n);
        if (++count >= 5000) break;
      }
    }
    this._markNameSeen(name);
    this.harvestedCategories = new Set();

    this.stats = {
      totalRuns: 0,
      totalTokohCrawled: 0,
      lastTokohFound: 0,
      lastRunAt: null,
      isRunning: false,
      rps: 0
    };
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    this.stats.isRunning = true;

    console.log(`[TOKOH-CRAWLER] 🌟 Autonomous Non-Stop Tokoh & Celebrity Crawler Started (workers: ${this.concurrency})`);

    // 1. Kick off concurrent category harvest in background
    this.harvestCategories();

    // 2. Start non-stop worker loop immediately
    this.loopPromise = this._runContinuousLoop();
  }

  stop() {
    this.running = false;
    this.stopped = true;
    this.stats.isRunning = false;
    console.log('[TOKOH-CRAWLER] ⏹ Stopped');
  }

  triggerManualCrawl() {
    if (!this.running) {
      this.start();
    }
    return this.harvestCategories(true);
  }

  getStats() {
    const dbCount = this.db?.getCelebrityCount ? this.db.getCelebrityCount() : this.stats.totalTokohCrawled;
    return {
      ...this.stats,
      totalTokohCrawled: Math.max(dbCount, this.stats.totalTokohCrawled),
      queueSize: this.pendingQueue.length,
      knownFigures: this.seenNames.size,
      harvestedCategories: this.harvestedCategories.size
    };
  }

  /**
   * Harvests real public figure names autonomously from Wikipedia Category APIs concurrently
   */
  async harvestCategories(force = false) {
    if (force) this.harvestedCategories.clear();

    const pendingCategories = TOKOH_CATEGORIES.filter(cat => {
      const catKey = `${cat.lang}:${cat.title}`;
      return !this.harvestedCategories.has(catKey);
    });

    await Promise.allSettled(
      pendingCategories.map(async (cat) => {
        const catKey = `${cat.lang}:${cat.title}`;
        this.harvestedCategories.add(catKey);

        try {
          if (priorityGovernor.isPriorityActive()) {
            await priorityGovernor.waitForSearchIdle(200, 3000);
            if (this.stopped) return;
          }

          const apiUrl = `https://${cat.lang}.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(cat.title)}&cmlimit=250&format=json`;
          const res = await fetch(apiUrl, {
            headers: { 'User-Agent': 'DeeperNova-Tokoh-CategoryHarvester/2.0' }
          });

          if (res.ok) {
            const json = await res.json();
            const members = json?.query?.categorymembers || [];
            let added = 0;

            for (const m of members) {
              const title = (m.title || '').trim();
              if (!title || title.includes(':') || title.toLowerCase().startsWith('daftar ')) continue;
              const lower = title.toLowerCase();
              if (!this.seenNames.has(lower)) {
                this._markNameSeen(lower);
                this.pendingQueue.push({ name: title, lang: cat.lang });
                added++;
              }
            }

            if (added > 0) {
              console.log(`[TOKOH-CRAWLER] 📂 Harvested category [${cat.title}] ➜ +${added} figures (Queue: ${this.pendingQueue.length})`);
            }
          }
        } catch (e) {}
      })
    );
  }

  /**
   * Continuous high-speed crawling execution loop
   */
  async _runContinuousLoop() {
    while (this.running && !this.stopped) {
      if (priorityGovernor.isPriorityActive()) {
        await priorityGovernor.waitForSearchIdle(250, 5000);
        if (!this.running || this.stopped) break;
      }

      // If queue is running low, re-harvest categories or search related
      if (this.pendingQueue.length < 50) {
        await this.harvestCategories();
      }

      if (this.pendingQueue.length === 0) {
        // Queue empty, wait 5 seconds and retry
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      const startTime = Date.now();
      const batchSize = Math.min(12, this.pendingQueue.length);
      const batch = this.pendingQueue.splice(0, batchSize);
      let batchSuccessCount = 0;

      // Ingest batch in parallel using worker chunks
      for (let i = 0; i < batch.length; i += this.concurrency) {
        if (this.stopped) break;
        const chunk = batch.slice(i, i + this.concurrency);

        await Promise.allSettled(
          chunk.map(async (item) => {
            try {
              const itemStartTime = performance.now();
              const profile = await this._fetchTokohProfile(item.name, item.lang);
              const latencyMs = Math.round(performance.now() - itemStartTime);

              if (profile && profile.name && profile.description) {
                batchSuccessCount++;
                this.stats.totalTokohCrawled++;

                // Save to database
                if (this.db && typeof this.db.saveCelebrityEntity === 'function') {
                  this.db.saveCelebrityEntity(profile);
                }

                // Terminal Live Log
                const shortDesc = (profile.profession || profile.subtitle || 'Figur Publik').slice(0, 38);
                const imgIcon = profile.photo ? '📷 [img]' : '📄 [bio]';
                const aliasTag = profile.aliasDisplay ? ` 🏷️ [${profile.aliasDisplay}]` : '';
                console.log(`[TOKOH-CRAWLER] 🌟 [200 OK • ${latencyMs}ms] ${profile.name.padEnd(24)} ➜ "${shortDesc}..."${aliasTag} ${imgIcon}`);

                // Emit real-time telemetry event for animated UI stream
                this.emit('tokoh_indexed', {
                  name: profile.name,
                  stageName: profile.stageName,
                  profession: profile.profession,
                  subtitle: profile.subtitle,
                  photo: profile.photo,
                  bornInfo: profile.bornInfo,
                  aliases: profile.aliases,
                  aliasDisplay: profile.aliasDisplay,
                  latencyMs,
                  sourceUrl: profile.sourceUrl,
                  source: profile.source,
                  timestamp: Date.now()
                });

                // Extract new figures from biography to expand queue perpetually
                this._extractRelatedFigures(profile.description);
              }
            } catch (e) {
              // Silently handle
            }
          })
        );
      }

      const durationMs = Date.now() - startTime;
      const durationSec = Math.max(0.1, durationMs / 1000);
      const crawlRate = Number((batchSuccessCount / durationSec).toFixed(1));

      this.stats.totalRuns++;
      this.stats.lastRunAt = Date.now();
      this.stats.lastTokohFound = batchSuccessCount;
      this.stats.rps = crawlRate;

      this.emit('cycle_end', {
        run: this.stats.totalRuns,
        tokohFound: batchSuccessCount,
        durationMs,
        crawlRate,
        totalTokohCrawled: this.stats.totalTokohCrawled,
        queueRemaining: this.pendingQueue.length
      });

      // Polite micro-delay between continuous batches
      await new Promise(r => setTimeout(r, this.batchDelayMs));
    }
  }

  /**
   * Fetches rich Wikipedia summary and portrait photo
   */
  async _fetchTokohProfile(rawName, preferredLang = 'id') {
    const cleanName = rawName.trim();
    if (!cleanName || cleanName.length < 2) return null;

    const encoded = encodeURIComponent(cleanName.replace(/\s+/g, '_'));

    // 1. Try preferred language first
    try {
      const primaryUrl = `https://${preferredLang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const res = await fetch(primaryUrl, {
        headers: { 'User-Agent': 'DeeperNova-Tokoh-Crawler/2.0 (admin@deepernova.com)' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.extract && data.type !== 'disambiguation') {
          return this._formatProfileData(cleanName, data, preferredLang);
        }
      }
    } catch {}

    // 2. Fallback to alternative language (en / id)
    const fallbackLang = preferredLang === 'id' ? 'en' : 'id';
    try {
      const fallbackUrl = `https://${fallbackLang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const res = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'DeeperNova-Tokoh-Crawler/2.0 (admin@deepernova.com)' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.extract && data.type !== 'disambiguation') {
          return this._formatProfileData(cleanName, data, fallbackLang);
        }
      }
    } catch {}

    return null;
  }

  /**
   * Formats raw REST payload into structured celebrity/tokoh card + extracts aliases/julukan
   */
  _formatProfileData(originalQuery, data, lang) {
    const photoUrl = data.originalimage?.source || data.thumbnail?.source || null;
    const title = data.title || originalQuery;
    const description = data.extract || '';
    const subtitle = data.description || (lang === 'id' ? 'Tokoh Terkenal & Figur Publik' : 'Notable Public Figure');

    // Extract birth date if mentioned in first sentence
    const birthMatch = description.match(/\((?:lahir|born)\s+([^)]+)\)/i);
    const bornInfo = birthMatch ? birthMatch[1].trim() : null;

    // Extract Nicknames & Aliases (Julukan / Nama Panggung / Nama Populer)
    const aliasesSet = new Set();
    const lowerTitle = title.toLowerCase();
    const lowerQuery = originalQuery.toLowerCase();

    // 1. Check known aliases dictionary
    if (KNOWN_TOKOH_ALIASES[lowerTitle]) {
      KNOWN_TOKOH_ALIASES[lowerTitle].forEach(a => aliasesSet.add(a));
    }
    if (KNOWN_TOKOH_ALIASES[lowerQuery]) {
      KNOWN_TOKOH_ALIASES[lowerQuery].forEach(a => aliasesSet.add(a));
    }

    // 2. Regular expression extraction from biographical text
    const regexPatterns = [
      /(?:dikenal (?:sebagai|dengan nama|luas sebagai)|lebih dikenal (?:sebagai|dengan|dengan julukan)|akrab (?:disapa|dipanggil)|julukan(?:nya)?|berjuluk|bergelar|nama panggilan|nama panggung|alias|dijuluki|a\.k\.a\.?)\s*["'“]?([A-Za-z0-9\s.,-]+?)["'”]?\s*(?:,|\.|\(|\)|adalah|merupakan|yakni|yaitu)/gi,
      /(?:better known as|also known as|commonly known as|popularly known as|widely known as|nicknamed|known by the stage name|known mononymously as)\s*["'“]?([A-Za-z0-9\s.,-]+?)["'”]?\s*(?:,|\.|\(|\)|is|was)/gi
    ];

    for (const rx of regexPatterns) {
      let match;
      while ((match = rx.exec(description)) !== null) {
        const found = (match[1] || '').trim();
        if (found.length >= 3 && found.length <= 40 && !found.toLowerCase().includes('indonesia') && !found.toLowerCase().includes('wikipedia')) {
          aliasesSet.add(found);
        }
      }
    }

    const aliases = Array.from(aliasesSet);
    const aliasDisplay = aliases.length > 0 ? aliases.join(', ') : null;

    const attributes = [
      { label: 'Profesi', value: data.description || 'Figur Publik' }
    ];
    if (aliasDisplay) attributes.push({ label: 'Julukan / Alias', value: aliasDisplay });
    if (bornInfo) attributes.push({ label: 'Lahir', value: bornInfo });
    if (lang === 'id') attributes.push({ label: 'Wilayah', value: 'Indonesia / Global' });

    return {
      keyword_key: originalQuery.toLowerCase(),
      name: title,
      stageName: title,
      profession: data.description || 'Tokoh Publik',
      subtitle,
      photo: photoUrl,
      description,
      bornInfo,
      aliases,
      aliasDisplay,
      attributes,
      sourceUrl: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      source: 'wikipedia'
    };
  }

  /**
   * Dynamically discovers other notable figures mentioned in the text to expand queue
   */
  _extractRelatedFigures(text) {
    if (!text || typeof text !== 'string') return;

    // Pattern for titles with names: Presiden X, Menteri Y, Jenderal Z, Dr. W, Prof. V
    const titleRegex = /(?:Presiden|Menteri|Gubernur|Jenderal|Pangeran|Kaisar|Sultan|Profesor|Dr\.|K\.H\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g;
    let m;
    while ((m = titleRegex.exec(text)) !== null) {
      const candidate = m[1].trim();
      const lower = candidate.toLowerCase();
      if (candidate.length >= 5 && !this.seenNames.has(lower) && !lower.includes('indonesia') && !lower.includes('jakarta')) {
        this._markNameSeen(lower);
        this.pendingQueue.push({ name: candidate, lang: 'id' });
      }
    }
  }
}
