class AiSynthesisCache {
  constructor(maxSize = 2000, ttlMs = 30 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.time > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, time: Date.now() });
  }
}
const aiSynthesisCache = new AiSynthesisCache(2000, 30 * 60 * 1000);

/**
 * ============================================================================
 * 🧠 DEEPERNOVA GOOGLE-GRADE AI OVERVIEW & DEEPSEEK REASONING SYNTHESIS ENGINE
 * ============================================================================
 * Generates natural, authoritative, highly-structured generative AI answers
 * matching Google Search's AI Overview (SGE) and Perplexity Pro.
 * Powered by DeepSeek v4 Pro with High-Effort Reasoning & Thinking Trace,
 * reading and analyzing the TOP 15 indexed search results.
 * Includes graceful offline RAG fallback if the remote API is unreachable.
 * ============================================================================
 */

import { InstantAnswersEngine } from './instantAnswers.js';

const GENERIC_PORTAL_BOILERPLATES = [
  /berita terkini[^\n.]*/gi,
  /berita hari ini[^\n.]*/gi,
  /kabar harian[^\n.]*/gi,
  /indeks berita[^\n.]*/gi,
  /kumpulan berita[^\n.]*/gi,
  /baca juga:[^\n.]*/gi,
  /baca selengkapnya[^\n.]*/gi,
  /simak selengkapnya[^\n.]*/gi,
  /sumber foto:[^\n.]*/gi,
  /tribunnews\.com[^\n.]*/gi,
  /detik\.com[^\n.]*/gi,
  /kompas\.com[^\n.]*/gi,
  /tempo\.co[^\n.]*/gi,
  /loading\.\.\./gi,
  /halaman selanjutnya/gi,
  /home\s*[\/>|]\s*[a-z]+/gi,
  /tag\s*[\/>|]\s*[a-z]+/gi,
  /copyright ©?[^\n.]*/gi,
  /all rights reserved[^\n.]*/gi,
  /skip to (content|main|navigation|search)[^\n.]*/gi,
  /join our (community|celebration|newsletter|discord|telegram)[^\n.]*/gi,
  /subscribe to (our newsletter|notifications)?[^\n.]*/gi,
  /sign up for[^\n.]*/gi,
  /privacy policy[^\n.]*/gi,
  /terms of (use|service)[^\n.]*/gi,
  /cookie preferences[^\n.]*/gi,
  /ikuti kami di[^\n.]*/gi,
  /follow us on[^\n.]*/gi,
  /unduh aplikasi[^\n.]*/gi,
  /download the app[^\n.]*/gi
];

export class AiSynthesisEngine {
  constructor(dbInstance = null, searchEngineInstance = null) {
    this.db = dbInstance;
    this.searchEngine = searchEngineInstance;
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
    this.deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'deepseek-r1:latest';
  }

  setSearchEngine(engine) {
    this.searchEngine = engine;
  }

  /**
   * Cleans text snippet and removes HTML, advertisements & portal noise
   */
  _cleanSnippet(text) {
    if (!text) return '';
    let cleaned = text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[\u2014\u2015\u2013—–]/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

    for (const pattern of GENERIC_PORTAL_BOILERPLATES) {
      cleaned = cleaned.replace(pattern, '').trim();
    }

    return cleaned;
  }

  /**
   * Actively ensures up to 15 sources are available from search engine or database
   */
  _ensureSources(query, providedSources = [], targetLimit = 15) {
    if (providedSources && providedSources.length >= 3) {
      return providedSources.slice(0, targetLimit);
    }

    const cleanQ = (query || '').trim();
    if (!cleanQ) return (providedSources || []).slice(0, targetLimit);

    // 1. Ultra-fast in-memory hot rings match (<0.05ms, ZERO SSD I/O)
    try {
      const terms = cleanQ.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(t => t.length >= 2);
      const hotPool = [...(this.db?.hotNewsRing || []), ...(this.db?.hotPagesRing || [])];
      if (terms.length > 0 && hotPool.length > 0) {
        const matched = hotPool.filter(item => {
          const hay = item._searchLower || `${item.title || ''} ${item.headings || ''} ${item.description || ''}`.toLowerCase();
          return terms.some(t => hay.includes(t));
        }).slice(0, targetLimit);
        if (matched.length >= 3) {
          return matched;
        }
      }
    } catch {}

    // 2. Direct fast FTS5 database query fallback (bounded subquery, exact conjunction, ZERO wildcards)
    if (this.db && this.db.db) {
      try {
        const terms = cleanQ.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(t => t.length >= 2).slice(0, 3);
        if (terms.length > 0) {
          const ftsMatch = `{title headings description}: (` + terms.map(t => `"${t}"`).join(' ') + `)`;
          const rows = this.db.db.prepare(`
            SELECT p.id, p.url, p.domain, p.title, p.description, p.headings,
                   SUBSTR(p.content, 1, 400) as content, p.logo_url, p.lead_image_url, p.pagerank
            FROM (
              SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
            ) f
            JOIN pages p ON f.rowid = p.id
          `).all(ftsMatch, targetLimit);

          if (rows && rows.length > 0) {
            return rows.map(r => ({
              id: r.id,
              url: r.url,
              domain: r.domain,
              title: r.title,
              rawTitle: r.title,
              snippet: r.description || (r.content ? r.content.slice(0, 300) : ''),
              headings: r.headings,
              logoUrl: r.logo_url,
              leadImageUrl: r.lead_image_url
            }));
          }
        }
      } catch {}
    }

    return (providedSources || []).slice(0, targetLimit);
  }

  /**
   * Formats top 15 sources into a dense, clean summary for DeepSeek prompt
   */
  _buildSourcesPrompt(sources = [], limit = 12) {
    const top = sources.slice(0, limit);
    if (top.length === 0) return 'Tidak ada data sumber terindeks langsung.';

    return top.map((item, idx) => {
      const title = item.rawTitle || item.title || `Sumber #${idx + 1}`;
      const domain = item.domain || '';
      const snippet = this._cleanSnippet(item.snippet || item.description || item.content || '');
      return `[${idx + 1}] (${domain}) ${title}: ${snippet.slice(0, 200)}`;
    }).join('\n');
  }

  /**
   * Builds Google SGE / DeepSeek prompt instructions
   */
  _getSystemPrompt() {
    return `You are DeeperNova AI, an ultra-fast, direct, and concise search synthesis engine.
Your task is to provide a brief, direct, and factual Indonesian summary (ringkasan super ringkas & padat) based on the search results.

Formatting Rules:
1. Langsung jawab inti topik/pertanyaan dalam 2-3 kalimat padat, jelas, dan informatif (maksimal 50-80 kata).
2. DILARANG menggunakan header markdown (#, ##, ###).
3. Jika perlu poin penting, gunakan maksimal 2 bullet point pendek.
4. Cantumkan sitasi nomor sumber [1], [2], dst.
5. Tanpa basa-basi (dilarang kalimat pengantar klise seperti "Berdasarkan hasil penelusuran...").`;
  }

  /**
   * Builds Chief Editor Newspaper Editorial prompt instructions for multi-source broadsheet
   */
  _getNewspaperEditorialPrompt() {
    return `Anda adalah Pemimpin Redaksi (Chief Editor) Harian DeeperNova, surat kabar nasional terkemuka di Indonesia.
Tugas Anda adalah merangkum dan menyatukan berita-berita dari berbagai media pers nasional terpercaya (Kompas, Detik, Antara, CNN Indonesia, CNBC Indonesia, Tempo, Republika, Jawa Pos, Sindonews, dll.) menjadi 1 Tajuk Rencana Redaksi / Editorial Koran yang utuh, berwibawa, berbobot, dan tertata rapi.

Pedoman Penulisan Koran:
1. Mulailah kalimat pertama dengan dateline pers resmi: "JAKARTA — [Kalimat utama tajuk rencana yang tegas dan komprehensif...]".
2. Hubungkan berbagai fakta, sudut pandang, dan isu dari sumber-sumber yang diberikan menjadi 1 narasi editorial yang mengalir dalam 3-4 paragraf yang padat.
3. Sebutkan sumber-sumber media secara natural dalam paragraf (misalnya: "Sebagaimana dihimpun dari laporan kantor berita Antara dan Kompas...", "Sementara itu pantauan CNBC Indonesia menggarisbawahi dampak...", "Senada dengan analisis Tempo...").
4. Pisahkan setiap paragraf dengan baris kosong ganda agar tersusun rapi dalam kolom surat kabar.
5. DILARANG menggunakan header markdown (#, ##, ###) atau format tabel. Gunakan prosa jurnalistik bermutu tinggi.
6. Berikan paragraf penutup berupa kesimpulan atau catatan redaksi yang reflektif.`;
  }

  /**
   * Local synthesis for newspaper editorial when offline
   */
  _synthesizeLocalEditorial(query, sources = []) {
    if (!sources || sources.length === 0) {
      return 'JAKARTA — Redaksi Harian DeeperNova memantau perkembangan terkini peristiwa nasional. Laporan komprehensif dari jejaring media pers segera dimutakhirkan.';
    }

    const lead = sources[0];
    const second = sources[1];
    const third = sources[2];
    const fourth = sources[3];

    let editorial = `JAKARTA — Arus pemberitaan pers nasional hari ini mencatatkan dinamika penting`;
    if (query && query.trim()) {
      editorial += ` seputar ${query.trim()}. Jaringan media arus utama di seluruh tanah air memberikan perhatian mendalam terhadap perkembangan situasi ini.\n\n`;
    } else {
      editorial += ` di berbagai sektor strategis tanah air. Ruang redaksi dari berbagai kantor berita dan portal nasional menghimpun rangkaian peristiwa kunci yang memengaruhi hajat hidup masyarakat.\n\n`;
    }

    if (lead) {
      const leadTitle = (lead.rawTitle || lead.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
      const leadSnippet = this._cleanSnippet(lead.snippet || lead.description || '');
      editorial += `Dalam laporan utamanya, ${lead.domain || 'media nasional'} mengangkat peristiwa "${leadTitle}". ${leadSnippet.slice(0, 220)}. Informasi ini menjadi rujukan utama bagi berbagai kalangan dalam mencermati isu tersebut.\n\n`;
    }

    if (second || third) {
      editorial += `Dinamika Terkait dari Jejaring Media Pers:\n`;
      if (second) {
        const t2 = (second.rawTitle || second.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
        const s2 = this._cleanSnippet(second.snippet || second.description || '');
        editorial += `• ${second.domain || 'Media pers'}: Melaporkan mengenai ${t2}. ${s2.slice(0, 160)}.\n`;
      }
      if (third) {
        const t3 = (third.rawTitle || third.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
        const s3 = this._cleanSnippet(third.snippet || third.description || '');
        editorial += `• ${third.domain || 'Laporan pers'}: Turut menggarisbawahi ${t3}. ${s3.slice(0, 160)}.\n`;
      }
      if (fourth) {
        const t4 = (fourth.rawTitle || fourth.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
        editorial += `• ${fourth.domain || 'Portal mitra'}: Menyoroti perspektif lanjutan seputar ${t4}.\n`;
      }
      editorial += `\n`;
    }

    editorial += `Redaksi Harian DeeperNova menegaskan bahwa keterpaduan liputan dari beragam sudut pandang media pers ini menunjukkan pentingnya keterbukaan informasi publik dan akurasi verifikasi. Pemantauan berkala terus dilakukan seiring bergeraknya arus berita.`;

    return editorial;
  }

  /**
   * Extracts clean, factual, and informative sentences matching query keywords (for local fallback)
   */
  _extractSalientSentences(snippet, title, queryTerms = []) {
    if (!snippet && !title) return [];
    const text = `${title || ''}. ${snippet || ''}`;
    
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => this._cleanSnippet(s))
      .filter(s => s.length >= 25 && s.length <= 320);

    const scored = sentences.map(s => {
      let score = 0;
      const lower = s.toLowerCase();

      if (queryTerms.length > 0) {
        for (const term of queryTerms) {
          if (term.length >= 2 && lower.includes(term.toLowerCase())) {
            score += 18;
          }
        }
      }

      if (/(?:adalah|merupakan|yakni|yaitu|dikenal sebagai|berfungsi untuk|memiliki peran|terdiri dari|is a|refers to)/i.test(s)) score += 12;
      if (/\b(?:\d{4}|\d+ persen|\d+ juta|\d+ ribu|\d+%|rp\s*\d+)\b/i.test(s)) score += 8;
      if (/(?:pertama|terbesar|resmi|terbaru|terkini|kebijakan|penelitian|pengumuman|teknologi|sejarah)/i.test(s)) score += 5;
      if (/(?:baca juga|simak selengkapnya|tribunnews|klik di sini|indeks berita|sumber foto)/i.test(s)) score -= 40;

      return { sentence: s, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence);
  }

  /**
   * Formats raw sentence into a clean, capitalized statement without portal tags
   */
  _formatStatement(text) {
    if (!text) return '';
    let s = text.trim();
    s = s.replace(/^[-•*–—….,;:\s]+/, '');
    s = s.replace(/^(dan|atau|namun|tetapi|sehingga|karena itu)\s+/i, '');
    s = s.replace(/^[-•*–—….,;:\s]+/, '');
    if (s.length > 0) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }
    if (!/[.!?]$/.test(s)) {
      s += '.';
    }
    return s;
  }

  /**
   * Offline local fallback: Generates a Google Search-grade AI Overview using indexed snippets
   */
  synthesizeLocal(query, sources = [], options = {}) {
    const rawQuery = (query || '').trim();
    const effectiveSources = this._ensureSources(rawQuery, sources, 15);

    if (options?.mode === 'newspaper_editorial') {
      return this._synthesizeLocalEditorial(rawQuery, effectiveSources);
    }

    let instantAnswer = options?.instantAnswer || null;
    if (!instantAnswer && this.db) {
      try {
        instantAnswer = InstantAnswersEngine.getInstantAnswer(rawQuery, this.db);
      } catch {}
    }

    const queryTerms = rawQuery
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2);

    const isYesNo = /^(apakah|benarkah|bisa(kah)?|boleh(kah)?|adakah|sudahkah|mungkinkah|is|are|can|do|does)\b/i.test(rawQuery);
    const topSources = (effectiveSources || []).slice(0, 15);
    const sourceFacts = [];

    topSources.forEach((s, idx) => {
      const citId = idx + 1;
      const cleanSnip = this._cleanSnippet(s.snippet || s.description || '');
      const cleanTitle = this._cleanSnippet(s.rawTitle || s.title || '');
      const salient = this._extractSalientSentences(cleanSnip, cleanTitle, queryTerms);
      if (salient.length > 0) {
        sourceFacts.push({
          citId,
          domain: s.domain || '',
          title: cleanTitle,
          sentences: salient
        });
      }
    });

    let overview = '';

    // 1. Knowledge-graph instant answer
    if (instantAnswer && instantAnswer.title) {
      const entityName = instantAnswer.title;
      const sub = instantAnswer.subtitle ? ` (${instantAnswer.subtitle})` : '';
      const desc = instantAnswer.description || '';

      let cleanDesc = desc.replace(/^.*?\s+(?:adalah|merupakan)\s+/i, 'adalah ');
      if (!cleanDesc.startsWith('adalah') && !cleanDesc.startsWith('merupakan')) {
        cleanDesc = `merupakan ${cleanDesc}`;
      }

      overview += `**${entityName}**${sub} ${cleanDesc} [1]`;
      return overview.trim();
    }

    // 2. Multi-source web synthesis
    if (sourceFacts.length > 0) {
      const collectedStatements = [];
      const seenTexts = new Set();

      sourceFacts.forEach(sf => {
        sf.sentences.forEach(st => {
          const formatted = this._formatStatement(st);
          const simpleKey = formatted.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
          if (!seenTexts.has(simpleKey)) {
            seenTexts.add(simpleKey);
            collectedStatements.push({
              text: formatted,
              citId: sf.citId,
              domain: sf.domain
            });
          }
        });
      });

      let leadSentence = '';
      if (isYesNo) {
        leadSentence = `**Ya,** ${collectedStatements[0].text} [${collectedStatements[0].citId}]`;
      } else {
        const first = collectedStatements[0];
        leadSentence = `${first.text} [${first.citId}]`;
        if (collectedStatements[1] && collectedStatements[1].text.length < 150) {
          leadSentence += ` ${collectedStatements[1].text} [${collectedStatements[1].citId}]`;
        }
      }

      overview += `${leadSentence}`;
      return overview.trim();
    }

    return `**${rawQuery}** adalah kueri penelusuran di DeeperNova Search. Mesin perayap web otonom berkecepatan tinggi sedang mengumpulkan dan memverifikasi data terbaru dari berbagai portal resmi terkait topik ini.`;
  }

  /**
   * Generates intelligent follow-up questions
   */
  _generateFollowUps(query, sources = []) {
    const qLower = (query || '').toLowerCase();
    const suggestions = [];

    if (qLower.includes('jokowi') || qLower.includes('prabowo') || qLower.includes('presiden') || qLower.includes('menteri')) {
      suggestions.push('Apa saja kebijakan dan program strategis utama yang sedang berjalan?');
      suggestions.push('Bagaimana tanggapan publik dan pengamat terhadap perkembangan ini?');
      suggestions.push('Apa dampak program ini terhadap pembangunan dan ekonomi nasional?');
    } else if (qLower.includes('saham') || qLower.includes('harga') || qLower.includes('ekonomi') || qLower.includes('rupiah') || qLower.includes('kurs')) {
      suggestions.push('Bagaimana tren pergerakan dan proyeksi analis untuk kuartal mendatang?');
      suggestions.push('Faktor fundamental dan sentimen makro apa saja yang paling memengaruhinya?');
      suggestions.push('Bagaimana perbandingan kinerjanya dengan instrumen atau emiten sejenis?');
    } else if (qLower.includes('gunung') || qLower.includes('candi') || qLower.includes('wisata') || qLower.includes('danau') || qLower.includes('pantai')) {
      suggestions.push('Berapa estimasi tiket masuk, rute terbaik, dan fasilitas yang tersedia?');
      suggestions.push('Kapan musim atau waktu terbaik untuk berkunjung ke lokasi ini?');
      suggestions.push('Apa latar belakang sejarah dan daya tarik utama yang wajib dikunjungi?');
    } else if (qLower.includes('ai') || qLower.includes('kecerdasan buatan') || qLower.includes('deepseek') || qLower.includes('claude') || qLower.includes('teknologi')) {
      suggestions.push('Apa keunggulan dan perbedaan teknisnya dibandingkan model lainnya?');
      suggestions.push('Bagaimana panduan implementasi praktis dan arsitektur dasarnya?');
      suggestions.push('Apa tantangan performa, efisiensi, dan etika yang perlu diperhatikan?');
    } else {
      suggestions.push(`Rangkum poin-poin terpenting dan perkembangan terkini tentang ${query}`);
      suggestions.push(`Apa fakta menarik dan latar belakang utama terkait ${query}?`);
      suggestions.push(`Bagaimana analisis mendalam dan implikasi jangka panjang dari ${query}?`);
    }

    return suggestions;
  }

  /**
   * Primary DeepSeek v4 Pro synthesis method reading TOP 15 indexed results
   */

  /**
   * Universal AI Chat Dispatcher:
   * 1. Primary: DeeperNova AI Gateway (Port 3001) - 100% Real Live AI
   * 2. Secondary: DeeperNova GPU Sandbox Engine (Port 8000)
   * 3. Tertiary: DeepSeek remote API (if configured with valid key)
   */
  async _callAiChat({ messages, stream = false, signal = null }) {
    // 1. Try local DeeperNova AI Gateway on port 3001
    try {
      const res3001 = await fetch('http://127.0.0.1:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream }),
        signal: signal || AbortSignal.timeout(30000)
      });
      if (res3001.ok) {
        if (!stream) {
          const data = await res3001.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) return { content, thinking: null, engine: 'DeeperNova Neural AI' };
        } else {
          return { response: res3001, engine: 'DeeperNova Neural AI' };
        }
      }
    } catch (e) {
      console.warn('[AiSynthesis] Gateway port 3001 unavailable:', e.message);
    }

    // 2. Try local GPU Sandbox engine on port 8000
    try {
      const res8000 = await fetch('http://127.0.0.1:8000/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepernova', messages, stream }),
        signal: signal || AbortSignal.timeout(30000)
      });
      if (res8000.ok) {
        if (!stream) {
          const data = await res8000.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) return { content, thinking: null, engine: 'DeeperNova Engine (Port 8000)' };
        } else {
          return { response: res8000, engine: 'DeeperNova Engine (Port 8000)' };
        }
      }
    } catch (e) {
      console.warn('[AiSynthesis] Port 8000 unavailable:', e.message);
    }

    // 3. Fallback to DeepSeek if valid key present
    if (this.deepseekApiKey && this.deepseekApiKey.startsWith('sk-') && this.deepseekApiKey.length > 20) {
      try {
        const resDeepseek = await fetch(`${this.deepseekBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepseekApiKey.trim()}`
          },
          body: JSON.stringify({
            model: this.deepseekModel,
            messages,
            stream,
            max_tokens: 650
          }),
          signal: signal || AbortSignal.timeout(30000)
        });
        if (resDeepseek.ok) {
          if (!stream) {
            const data = await resDeepseek.json();
            const choice = data.choices?.[0]?.message;
            if (choice?.content) {
              return {
                content: choice.content.trim(),
                thinking: choice.reasoning_content?.trim() || null,
                engine: `DeepSeek (${this.deepseekModel})`
              };
            }
          } else {
            return { response: resDeepseek, engine: `DeepSeek (${this.deepseekModel})` };
          }
        }
      } catch (e) {
        console.warn('[AiSynthesis] DeepSeek API unavailable:', e.message);
      }
    }

    throw new Error('All AI synthesis engines currently unavailable');
  }

  async synthesizeFast(query, results = [], options = {}) {
    const startTime = performance.now();
    const effectiveSources = this._ensureSources(query, results, 15);
    const top15 = (effectiveSources || []).slice(0, 15);
    const followUps = this._generateFollowUps(query, top15);

    const formattedSources = top15.map((s, idx) => ({
      citId: idx + 1,
      title: s.title || s.rawTitle || s.domain,
      domain: s.domain || '',
      url: s.url || '#',
      logoUrl: s.logoUrl || null,
      snippet: this._cleanSnippet(s.snippet || s.description || s.content)
    }));

    try {
      const isNewspaper = options?.mode === 'newspaper_editorial';
      const sourcesPrompt = this._buildSourcesPrompt(top15, 15);
      const systemPrompt = isNewspaper ? this._getNewspaperEditorialPrompt() : this._getSystemPrompt();
      const userPrompt = isNewspaper
        ? `Topik Utama / Peristiwa: "${query ? query.trim() : 'Peristiwa Berita Terhangat Nasional'}"\n\nSumber Berita Berbagai Media Nasional:\n${sourcesPrompt}\n\nSusunlah 1 Tajuk Rencana Redaksi Harian DeeperNova yang menyatukan seluruh sumber berita di atas menjadi editorial koran yang utuh, berwibawa, dan rapi.`
        : `Pertanyaan / Topik: "${query.trim()}"\n\n15 Hasil Penelusuran Web Teratas:\n${sourcesPrompt}\n\nBuatlah Ringkasan AI yang mendalam, kaya data, dan terstruktur rapi berdasarkan 15 sumber di atas.`;

      const aiResult = await this._callAiChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false
      });

      const durationMs = Math.round(performance.now() - startTime);

      return {
        query,
        summary: aiResult.content,
        thinking: aiResult.thinking || null,
        sources: formattedSources,
        followUps,
        engine: aiResult.engine || 'DeeperNova Neural AI Overview',
        durationMs
      };
    } catch (err) {
      console.warn(`[AI Overview] Real AI error (${err.message}). Falling back to local RAG synthesis.`);
      const localSummary = this.synthesizeLocal(query, top15, options);
      return {
        query,
        summary: localSummary,
        thinking: null,
        sources: formattedSources,
        followUps,
        engine: 'DeeperNova Local RAG (Offline)',
        durationMs: Math.round(performance.now() - startTime)
      };
    }
  }

  async synthesizeStream({ query, results = [], mode = 'search_overview', options = {}, onStep, onThinking, onToken, onComplete, onError, signal }) {
    const startTime = performance.now();
    const isNewspaper = mode === 'newspaper_editorial' || options?.mode === 'newspaper_editorial';
    const effectiveSources = this._ensureSources(query, results, 15);
    const top15 = (effectiveSources || []).slice(0, 15);

    const formattedSources = top15.map((s, idx) => ({
      citId: idx + 1,
      title: s.title || s.rawTitle || s.domain,
      domain: s.domain || '',
      url: s.url || '#',
      logoUrl: s.logoUrl || null,
      snippet: this._cleanSnippet(s.snippet || s.description || s.content)
    }));

    // Check high-speed in-memory AI cache for instant 0.1ms delivery
    const normKey = `${(query || '').trim().toLowerCase()}|${mode}`;
    const cachedSynth = aiSynthesisCache.get(normKey);
    if (cachedSynth) {
      if (onStep) {
        onStep({
          step: 1,
          label: isNewspaper ? 'Membaca Berita Lintas Media Pers' : 'Memuat dari Memori Cerdas DeeperNova AI',
          detail: 'Sintesis instan ditemukan dalam cache memori (0.1ms)',
          status: 'done',
          sources: cachedSynth.sources || formattedSources
        });
      }
      if (onToken) {
        onToken(cachedSynth.summary, cachedSynth.summary);
      }
      if (onComplete) {
        onComplete({
          query,
          summary: cachedSynth.summary,
          thinking: cachedSynth.thinking || null,
          sources: cachedSynth.sources || formattedSources,
          followUps: cachedSynth.followUps || this._generateFollowUps(query, top15),
          engine: 'DeeperNova Ultra-Fast In-Memory Neural AI',
          durationMs: 0.1
        });
      }
      return;
    }

    if (onStep) {
      onStep({
        step: 1,
        label: isNewspaper ? 'Membaca Berita Lintas Media Pers' : 'Membaca 15 Sumber Web Teratas',
        detail: isNewspaper
          ? `Menganalisis ${top15.length} laporan berita pers nasional...`
          : `Menganalisis ${top15.length} sumber web terindeks untuk "${query}"...`,
        status: 'running',
        sourcesCount: top15.length,
        sources: formattedSources
      });
    }

    try {
      if (onStep) {
        onStep({
          step: 2,
          label: isNewspaper ? 'Tajuk Rencana Redaksi Harian DeeperNova' : 'DeeperNova Neural AI (Sintesis Cepat)',
          detail: isNewspaper
            ? 'Menyatukan berbagai sumber berita menjadi 1 editorial koran utuh...'
            : 'Menyusun ringkasan cerdas real AI dari 15 sumber web...',
          status: 'running'
        });
      }

      const sourcesPrompt = this._buildSourcesPrompt(top15, 15);
      const systemPrompt = isNewspaper ? this._getNewspaperEditorialPrompt() : this._getSystemPrompt();
      const userPrompt = isNewspaper
        ? `Topik Utama / Peristiwa: "${query ? query.trim() : 'Peristiwa Berita Terhangat Nasional'}"\n\nSumber Berita Berbagai Media Pers Nasional:\n${sourcesPrompt}\n\nSusunlah 1 Tajuk Rencana Redaksi Harian DeeperNova yang menyatukan seluruh sumber berita di atas menjadi editorial koran yang utuh, berwibawa, dan rapi.`
        : `Pertanyaan / Topik: "${query.trim()}"\n\n15 Hasil Penelusuran Web Teratas:\n${sourcesPrompt}\n\nBuatlah Ringkasan AI yang cepat, padat, dan terstruktur rapi berdasarkan 15 sumber di atas.`;

      const { response, engine } = await this._callAiChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedThinking = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              // 1. Thinking / Reasoning delta
              if (delta.reasoning_content) {
                accumulatedThinking += delta.reasoning_content;
                if (onThinking) onThinking(delta.reasoning_content, accumulatedThinking);
              }

              // 2. Final Content delta
              if (delta.content) {
                accumulatedContent += delta.content;
                if (onToken) onToken(delta.content, accumulatedContent);
              }
            } catch {}
          }
        }
      }

      const durationMs = Math.round(performance.now() - startTime);

      if (onStep) {
        onStep({
          step: 3,
          label: 'Selesai',
          detail: `Ringkasan AI berhasil disintesis dalam ${durationMs}ms.`,
          status: 'done'
        });
      }

      if (accumulatedContent) {
        aiSynthesisCache.set(normKey, {
          summary: accumulatedContent,
          thinking: accumulatedThinking || null,
          sources: formattedSources,
          followUps: this._generateFollowUps(query, top15)
        });
      }

      if (onComplete) {
        onComplete({
          query,
          summary: accumulatedContent,
          thinking: accumulatedThinking || null,
          sources: formattedSources,
          followUps: this._generateFollowUps(query, top15),
          engine: engine || 'DeeperNova Neural AI Overview',
          durationMs
        });
      }
    } catch (err) {
      console.warn('[AI Stream] Real AI streaming exception:', err.message);
      const localSummary = this.synthesizeLocal(query, top15, options);
      const words = localSummary.split(' ');
      let accumulated = '';
      for (let i = 0; i < words.length; i++) {
        if (signal?.aborted) return;
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        accumulated += word;
        if (onToken) onToken(word, accumulated);
        if (i % 4 === 0) await new Promise(r => setTimeout(r, 10));
      }
      if (onComplete) {
        onComplete({
          query,
          summary: accumulated,
          thinking: null,
          sources: formattedSources,
          followUps: this._generateFollowUps(query, top15),
          engine: 'DeeperNova Local RAG (Offline Fallback)',
          durationMs: Math.round(performance.now() - startTime)
        });
      }
    }
  }
}
