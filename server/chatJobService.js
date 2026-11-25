// ============================================================
// DeeperNova AI — Server-Side Background Chat Job Engine
// Runs AI inference + web search + verified image checking completely on the
// Node.js server detached from the HTTP client socket, so leaving/closing
// the APK/browser mid-answer NEVER kills generation or causes lost replies.
// ============================================================
import crypto from 'crypto';
import { runBrowserAgent, extractUrlsFromText } from './services/browserAgentService.js';
import { sanitizeUntrustedWebContent } from './aiCyberSecurityShield.js';

let deps = {};

// Live running & recently completed jobs (kept 20m in RAM)
const liveJobs = new Map();
const LIVE_JOB_RETENTION_MS = 20 * 60 * 1000;
const DB_FLUSH_INTERVAL_MS = 750;

export function initChatJobService(injected) {
  deps = { ...deps, ...injected };
}

function makeJobId() {
  return `job_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

function canCallerAccessJob(job, caller = {}) {
  if (!job) return false;
  const { userId = null, deviceId = null } = caller;
  if (job.userId) {
    return Boolean(userId && String(job.userId) === String(userId));
  }
  return Boolean(job.deviceId && deviceId && String(job.deviceId) === String(deviceId));
}

function sanitizeJobPayload(job) {
  if (!job) return null;
  return {
    id: job.id,
    sessionId: job.sessionId,
    userMessageId: job.userMessageId,
    assistantMessageId: job.assistantMessageId,
    status: job.status,
    model: job.model,
    personality: job.personality,
    language: job.language,
    isPrivate: Boolean(job.isPrivate),
    userPrompt: job.userPrompt || '',
    text: job.text || '',
    reasoningText: job.reasoningText || '',
    reasoningDuration: job.reasoningDuration || null,
    searchQuery: job.searchQuery || null,
    searchSources: Array.isArray(job.searchSources) ? job.searchSources : [],
    searchImages: Array.isArray(job.searchImages) ? job.searchImages : [],
    searchSteps: Array.isArray(job.searchSteps) ? job.searchSteps : [],
    browserPages: Array.isArray(job.browserPages) ? job.browserPages : [],
    subAgentData: job.subAgentData || null,
    browserAgentMode: job.browserAgentMode || 'auto',
    phaseDetail: job.phaseDetail || '',
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

function broadcastJobEvent(job, eventName, data) {
  if (!job || !job.subscribers || job.subscribers.size === 0) return;
  const frame = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of Array.from(job.subscribers)) {
    if (res.writableEnded || res.destroyed) {
      job.subscribers.delete(res);
      continue;
    }
    try {
      res.write(frame);
      if (typeof res.flush === 'function') res.flush();
    } catch {
      job.subscribers.delete(res);
    }
  }
}

function flushJobToDb(job, force = false) {
  if (!job || job.isPrivate || !deps.chatJobDb) return;
  const now = Date.now();
  if (!force && now - (job._lastDbFlushAt || 0) < DB_FLUSH_INTERVAL_MS) {
    return;
  }
  job._lastDbFlushAt = now;
  job.updatedAt = now;
  try {
    deps.chatJobDb.upsert(job);
  } catch (err) {
    console.warn('[ChatJob] DB flush warning:', err.message);
  }
}

function sanitizeSearchQueryServer(rawQuery = '', fallbackPrompt = '') {
  let q = String(rawQuery || '').replace(/^["'`]+|["'`]+$/g, '').trim();
  const isPlaceholder = !q ||
    q.length < 2 ||
    /^<[^>]+>$/.test(q) ||
    /^\[[^\]]+\]$/.test(q) ||
    /^(?:\.{2,}|topik|kueri|query|keywords?|search\s*keywords?|kata\s*kunci(?:\s*pencarian)?(?:\s*spesifik)?(?:\s*pilihanmu)?|tulis\s+\d|isi\s+dengan\s+topik)/i.test(q);
  if (isPlaceholder && fallbackPrompt) {
    q = String(fallbackPrompt)
      .replace(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[^\]]*\]/gi, '')
      .replace(/^(?:tolong|coba|bisa|mohon|dong|halo|hai)\s+/gi, '')
      .replace(/^(?:cari(?:kan)?(?:\s+(?:berita|info(?:rmasi)?))?|search|googling)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim()
      .slice(0, 120);
  }
  return q || String(fallbackPrompt || '').slice(0, 120);
}

function stripRawUrlsOutsideCode(text = '') {
  if (!text || typeof text !== 'string') return text;
  const codeMap = new Map();
  let idx = 0;
  let masked = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, (m) => {
    const key = `__CODE_URL_SAFE_${idx++}__`;
    codeMap.set(key, m);
    return key;
  });
  // Keep markdown image refs ![alt](url_or_foto) and relative /api links intact; strip bare external http(s):// URLs leaked as text
  masked = masked.replace(/(!?\[[^\]]*\]\([^)]+\))|((?:https?:\/\/|www\.)[^\s<>"')\]]+)/gi, (full, mdLink, rawUrl) => {
    if (mdLink) return mdLink;
    if (!rawUrl) return full;
    try {
      const parsed = new URL(rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl);
      return parsed.hostname.replace(/^www\./i, '');
    } catch {
      return '';
    }
  });
  for (const [k, v] of codeMap.entries()) {
    masked = masked.replace(k, v);
  }
  return masked;
}

function cleanAssistantStreamingText(raw = '') {
  return String(raw || '')
    .replace(/\bDoubao\b/gi, 'DeeperNova AI')
    .replace(/\bByteDance\b/gi, 'DeeperNova AI')
    .replace(/<\/?(?:think|reasoning|thought)>/gi, '')
    .replace(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[^\]]*\]\s*/gi, '')
    .replace(/\[(?:BROWSER_AGENT|OPEN_BROWSER|BROWSE_URL):[^\]]*\]\s*/gi, '')
    .replace(/\[(?:SEARCH_MEMORY|RECALL_MEMORY|MEMORY_SEARCH):[^\]]*\]\s*/gi, '')
    .replace(/\[(?:SUBAGENT_ORCHESTRATE|ACTIVATE_SUBAGENT|SUBAGENT_REQUEST|SUB_AGENT|AGENT_EXECUTE):[^\]]*\]\s*/gi, '')
    .replace(/<(?:search(?:_request)?|search_memory|subagent(?:_orchestrate)?)>[\s\S]*?<\/(?:search(?:_request)?|search_memory|subagent(?:_orchestrate)?)>\s*/gi, '')
    .trimStart();
}

function cleanAssistantFinalText(raw = '') {
  return stripRawUrlsOutsideCode(cleanAssistantStreamingText(raw)).trim();
}

function formatBubbleDomainServer(rawDomain = '') {
  const clean = String(rawDomain || '').replace(/^www\./i, '').trim();
  if (!clean) return 'Web';
  const parts = clean.split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

function replaceCitationsServer(text = '', sources = []) {
  if (!text || !Array.isArray(sources) || sources.length === 0) return text;
  // Convert verbose [Sumber #N] / [Source N] tags to ultra-clean [N] markers (frontend turns [N] into interactive source pill without typing raw URLs)
  return text.replace(/\[(?:Sumber|Source)\s*#?\s*(\d+)[^\]]*\](?!\()/gi, (match, numStr) => {
    const idx = parseInt(numStr, 10);
    if (idx >= 1 && idx <= sources.length) {
      return `[${idx}]`;
    }
    return match;
  });
}

function isValidExternalImageCandidate(u = '') {
  if (!u || typeof u !== 'string') return false;
  if (/favicons\?sz=|\.ico(?:[?#]|$)|data:image\/svg|\.php(?:[?#]|$)|\/ajax\/|\/rss\/articles\//i.test(u)) {
    return false;
  }
  if (/gstatic\.com\/images|encrypted-tbn/i.test(u)) return false;
  try {
    const parsed = new URL(u);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

const SEARCH_STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'atau', 'ini', 'itu', 'adalah', 'apa', 'siapa',
  'kapan', 'dimana', 'bagaimana', 'kenapa', 'mengapa', 'tolong', 'coba', 'bisa', 'carikan', 'cari', 'info',
  'informasi', 'berita', 'tentang', 'soal', 'hari', 'ini', 'terbaru', 'sekarang', 'saya', 'aku', 'kamu', 'kita',
  'the', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'what', 'who', 'when',
  'where', 'how', 'why', 'please', 'find', 'search', 'latest', 'news', 'today', 'tell', 'me', 'can', 'you'
]);

function extractMeaningfulTokens(text = '') {
  return Array.from(new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\s-]/gi, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 3 && !SEARCH_STOPWORDS.has(t))
  ));
}

const GENERIC_QUERY_WORDS = new Set([
  'harga', 'saham', 'berita', 'info', 'informasi', 'terbaru', 'hari', 'sekarang', 'berapa', 'perkembangan',
  'update', 'nilai', 'kurs', 'data', 'daftar', 'cara', 'profil', 'tentang', 'indonesia', 'nusantara', 'tbk',
  'price', 'stock', 'news', 'latest', 'today', 'current', 'value', 'rate', 'list', 'profile', 'about'
]);

function filterAndScoreRelevantSources(rawSources = [], query = '', userPrompt = '') {
  const qTokens = extractMeaningfulTokens(`${query} ${userPrompt}`);
  if (qTokens.length === 0) return rawSources.slice(0, 10);

  // Identify distinctive/entity tokens (alphanumeric codes, proper-noun-like terms not in generic words)
  const distinctiveTokens = qTokens.filter(t => !GENERIC_QUERY_WORDS.has(t));
  const codeLikeTokens = qTokens.filter(t => /[a-z]/i.test(t) && /\d/.test(t) && t.length >= 4);

  const minTokenHits = qTokens.length >= 4 ? 2 : 1;
  const scored = [];
  for (const s of rawSources) {
    const titleLower = String(s.title || '').toLowerCase();
    const snippetLower = String(s.snippet || '').toLowerCase();
    const domainLower = String(s.domain || '').toLowerCase();
    const combined = `${titleLower} ${snippetLower} ${domainLower}`;
    if (!combined.trim()) continue;

    // If query has a specific alphanumeric code/identifier (e.g., "zxqv99281", "rtx5090"), source MUST match it!
    if (codeLikeTokens.length > 0 && !codeLikeTokens.some(ct => combined.includes(ct))) {
      continue;
    }

    let hitCount = 0;
    let distinctiveHits = 0;
    let relevanceScore = 0;
    for (const tok of qTokens) {
      const isDist = !GENERIC_QUERY_WORDS.has(tok);
      const mult = isDist ? 1.5 : 0.75;
      if (titleLower.includes(tok)) {
        hitCount += 1;
        if (isDist) distinctiveHits += 1;
        relevanceScore += 3 * mult;
      } else if (snippetLower.includes(tok)) {
        hitCount += 1;
        if (isDist) distinctiveHits += 1;
        relevanceScore += 1.5 * mult;
      } else if (domainLower.includes(tok)) {
        hitCount += 1;
        if (isDist) distinctiveHits += 1;
        relevanceScore += 1 * mult;
      }
    }

    // Strict anti-trash filter: require at least 1 distinctive entity hit when distinctive tokens exist
    const passesDistinctive = distinctiveTokens.length === 0 || distinctiveHits >= 1;
    if (passesDistinctive && hitCount >= minTokenHits && relevanceScore >= 2.0) {
      scored.push({ ...s, _relevanceScore: relevanceScore, _hitCount: hitCount });
    }
  }

  scored.sort((a, b) => (b._relevanceScore - a._relevanceScore) || ((b.accuracyScore || 0) - (a.accuracyScore || 0)));
  return scored.slice(0, 10).map((s, idx) => ({ ...s, position: idx + 1 }));
}

function buildSecondRoundQuery(firstQuery = '', userPrompt = '') {
  const tokens = extractMeaningfulTokens(`${userPrompt} ${firstQuery}`);
  if (tokens.length === 0) return null;
  // Create an alternative sharper/broader query (distinct from firstQuery)
  const coreTokens = tokens.slice(0, 5).join(' ');
  const cleanFirst = String(firstQuery || '').toLowerCase().trim();
  if (coreTokens && coreTokens !== cleanFirst) {
    return coreTokens;
  }
  const year = new Date().getFullYear();
  if (!cleanFirst.includes(String(year))) {
    return `${firstQuery} ${year}`.trim().slice(0, 120);
  }
  return `${tokens.slice(0, 4).join(' ')} overview`.trim().slice(0, 120);
}

function searchCrossSessionMemory(job, rawQuery = '') {
  const db = deps.db;
  if (!db) return { memories: [], globalFacts: [], totalMatches: 0 };

  const tokens = extractMeaningfulTokens(rawQuery || job.userPrompt || '');
  const searchTerms = tokens.length > 0
    ? tokens.slice(0, 6)
    : [String(rawQuery || job.userPrompt || '').trim().toLowerCase().slice(0, 40)].filter(Boolean);

  const userId = job.userId ? String(job.userId) : null;
  const deviceId = job.deviceId ? String(job.deviceId) : null;
  const currentSessionId = job.sessionId ? String(job.sessionId) : '';
  const memories = [];
  const seenKeys = new Set();

  const scoreText = (txt = '') => {
    const low = String(txt || '').toLowerCase();
    let score = 0;
    for (const t of searchTerms) {
      if (t && low.includes(t)) score += 2;
    }
    return score;
  };

  try {
    // 1. Search past chat_messages across ALL sessions of this user
    if (userId) {
      const rows = db.prepare(`
        SELECT m.id, m.sessionId, m.role, m.content, m.createdAt, s.title AS sessionTitle
        FROM chat_messages m
        LEFT JOIN chat_sessions s ON s.id = m.sessionId
        WHERE m.userId = ?
        ORDER BY m.createdAt DESC
        LIMIT 250
      `).all(userId);

      for (const r of rows) {
        if (!r.content || r.content.length < 4) continue;
        const sc = scoreText(`${r.sessionTitle || ''} ${r.content}`);
        if (sc > 0) {
          const key = `msg_${r.id}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          memories.push({
            source: r.sessionId === currentSessionId ? 'Sesi Ini' : `Sesi Lain: "${r.sessionTitle || r.sessionId}"`,
            role: r.role,
            content: String(r.content).slice(0, 420),
            createdAt: r.createdAt,
            score: sc + (r.sessionId !== currentSessionId ? 0.5 : 0)
          });
        }
      }
    }

    // 2. Also search chat_jobs (covers both logged-in users and guest deviceId cross-session history!)
    if (userId || deviceId) {
      const jobRows = userId
        ? db.prepare(`
            SELECT id, sessionId, userPrompt, text, createdAt
            FROM chat_jobs
            WHERE userId = ? AND status = 'done'
            ORDER BY createdAt DESC
            LIMIT 120
          `).all(userId)
        : db.prepare(`
            SELECT id, sessionId, userPrompt, text, createdAt
            FROM chat_jobs
            WHERE deviceId = ? AND status = 'done'
            ORDER BY createdAt DESC
            LIMIT 120
          `).all(deviceId);

      for (const jr of jobRows) {
        if (jr.id === job.id) continue;
        const combined = `${jr.userPrompt || ''} ${jr.text || ''}`;
        const sc = scoreText(combined);
        if (sc > 0) {
          const key = `job_${jr.id}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          memories.push({
            source: jr.sessionId === currentSessionId ? 'Sesi Ini' : `Sesi Sebelumnya (${String(jr.sessionId || '').slice(-10)})`,
            role: 'exchange',
            content: `User: ${String(jr.userPrompt || '').slice(0, 200)}\nAI: ${String(jr.text || '').slice(0, 260)}`,
            createdAt: jr.createdAt ? new Date(jr.createdAt).toISOString() : '',
            score: sc
          });
        }
      }
    }
  } catch (err) {
    console.warn('[ChatJob] Cross-session chat search warning:', err.message);
  }

  const globalFacts = [];
  try {
    if (userId) {
      const ltRows = db.prepare(`
        SELECT fact, category, updatedAt
        FROM memory_long_term
        WHERE userId = ?
        ORDER BY importance DESC, updatedAt DESC
        LIMIT 60
      `).all(userId);
      for (const r of ltRows) {
        if (r.fact && (scoreText(r.fact) > 0 || globalFacts.length < 5)) {
          globalFacts.push(`[${r.category || 'Memori'}] ${r.fact}`);
        }
      }

      const gRow = db.prepare(`SELECT memoryText FROM user_global_memory WHERE userId = ?`).get(userId);
      if (gRow?.memoryText) {
        globalFacts.push(`[Profil Memori Global] ${String(gRow.memoryText).slice(0, 600)}`);
      }
    }
  } catch (err) {
    console.warn('[ChatJob] Long-term memory lookup warning:', err.message);
  }

  memories.sort((a, b) => b.score - a.score);
  const topMemories = memories.slice(0, 8);
  return {
    memories: topMemories,
    globalFacts: globalFacts.slice(0, 8),
    totalMatches: topMemories.length + globalFacts.length
  };
}

function normalizeRawSearchResults(resultsList = [], cleanQ = '', seenSrcLinks = new Set()) {
  const out = [];
  for (let i = 0; i < resultsList.length; i++) {
    const r = resultsList[i];
    const link = r?.link || r?.url || '';
    if (!link || seenSrcLinks.has(link)) continue;
    const lower = link.toLowerCase();
    if (/gstatic\.com|googleusercontent\.com|encrypted-tbn|\.(?:jpe?g|png|webp|gif|svg)(?:[?#]|$)/i.test(lower)) {
      continue;
    }
    seenSrcLinks.add(link);
    let domain = r.domain || '';
    if (!domain) {
      try { domain = new URL(link).hostname.replace(/^www\./i, ''); } catch { domain = 'web'; }
    }
    out.push({
      title: r.title || cleanQ,
      link,
      url: link,
      snippet: r.snippet || r.description || r.content || '',
      domain: domain.replace(/^www\./i, ''),
      thumbnail: r.thumbnail || null,
      position: out.length + 1,
      accuracyScore: r.accuracyScore || r.score || 95,
      score: r.score || r.accuracyScore || 95,
      pagerank: r.pagerank ?? null,
      date: r.date || r.published_at || null,
      sourceEngine: r.sourceEngine || 'DeeperNova Hybrid'
    });
  }
  return out;
}

async function runServerSearchPipeline(job, query, userPrompt, language, signal) {
  const { webSearchService, batchPreloadImages } = deps;
  const cleanQ = sanitizeSearchQueryServer(query, userPrompt);
  const steps = [{
    query: cleanQ,
    label: language === 'en' ? `Round 1 Search: ${cleanQ}` : `Pencarian Tahap 1: ${cleanQ}`,
    isSearching: true,
    sources: [],
    images: []
  }];
  job.status = 'searching';
  job.searchQuery = cleanQ;
  job.phaseDetail = language === 'en' ? `Searching web (Step 1): "${cleanQ}"...` : `Menelusuri web (Tahap 1): "${cleanQ}"...`;
  job.searchSteps = steps;
  job.updatedAt = Date.now();
  broadcastJobEvent(job, 'status', { status: 'searching', phaseDetail: job.phaseDetail, searchQuery: cleanQ, searchSteps: job.searchSteps });
  flushJobToDb(job, true);

  const seenSrcLinks = new Set();
  let allRawSources = [];
  let collectedImgCandidates = [];

  // --- ROUND 1 SEARCH ---
  try {
    const searchRes = await webSearchService.searchGoogle(cleanQ, 14, language || 'id');
    if (searchRes?.success && Array.isArray(searchRes.results)) {
      allRawSources.push(...normalizeRawSearchResults(searchRes.results, cleanQ, seenSrcLinks));
    }
    if (Array.isArray(searchRes?.inline_images)) {
      collectedImgCandidates.push(...searchRes.inline_images);
    }
  } catch (err) {
    console.warn('[ChatJob] Search Round 1 warning:', err.message);
  }

  let relevantSources = filterAndScoreRelevantSources(allRawSources, cleanQ, userPrompt);
  steps[0].isSearching = false;
  steps[0].sources = relevantSources.slice(0, 6);

  // --- ROUND 2 MULTI-STEP AUTO-RETRY (if Round 1 had < 3 relevant results) ---
  if (relevantSources.length < 3 && !(signal?.aborted || job.stopped)) {
    const retryQ = buildSecondRoundQuery(cleanQ, userPrompt);
    if (retryQ && retryQ.toLowerCase() !== cleanQ.toLowerCase()) {
      const round2Step = {
        query: retryQ,
        label: language === 'en' ? `Round 2 Deeper Search: ${retryQ}` : `Pencarian Tahap 2 (Diperluas): ${retryQ}`,
        isSearching: true,
        sources: [],
        images: []
      };
      steps.push(round2Step);
      job.phaseDetail = language === 'en'
        ? `Refining search (Step 2): "${retryQ}"...`
        : `Info belum lengkap — mencari ulang tahap 2: "${retryQ}"...`;
      job.searchSteps = [...steps];
      broadcastJobEvent(job, 'status', { status: 'searching', phaseDetail: job.phaseDetail, searchQuery: retryQ, searchSteps: job.searchSteps });
      flushJobToDb(job, false);

      try {
        const searchRes2 = await webSearchService.searchGoogle(retryQ, 14, language || 'id');
        if (searchRes2?.success && Array.isArray(searchRes2.results)) {
          allRawSources.push(...normalizeRawSearchResults(searchRes2.results, retryQ, seenSrcLinks));
        }
        if (Array.isArray(searchRes2?.inline_images)) {
          collectedImgCandidates.push(...searchRes2.inline_images);
        }
      } catch (err) {
        console.warn('[ChatJob] Search Round 2 warning:', err.message);
      }

      relevantSources = filterAndScoreRelevantSources(allRawSources, `${cleanQ} ${retryQ}`, userPrompt);
      round2Step.isSearching = false;
      round2Step.sources = relevantSources.slice(0, 6);
    }
  }

  // --- STRICT ANTI-TRASH CHECK: If ZERO relevant sources found after Round 1 & 2 ---
  if (relevantSources.length === 0) {
    job.searchSources = [];
    job.searchImages = [];
    job.browserPages = [];
    job.searchSteps = steps.map(s => ({ ...s, isSearching: false }));
    job.updatedAt = Date.now();
    broadcastJobEvent(job, 'search', {
      searchQuery: cleanQ,
      searchSources: [],
      searchImages: [],
      searchSteps: job.searchSteps,
      browserPages: []
    });
    flushJobToDb(job, true);
    return { sources: [], verifiedImages: [], deepContextBlock: null, browserPages: [], noRelevantSources: true };
  }

  // --- STEP 3: DEEP WEB PAGE FETCHING (Open & read top 2 relevant pages with 12s speed budget!) ---
  let deepContextBlock = null;
  let browserPages = [];
  const topUrlsToRead = relevantSources.slice(0, 2).map(s => s.link).filter(Boolean);
  if (topUrlsToRead.length > 0 && !(signal?.aborted || job.stopped)) {
    const fetchStep = {
      query: cleanQ,
      label: language === 'en'
        ? `Deep-reading ${topUrlsToRead.length} relevant web pages...`
        : `Membaca mendalam ${topUrlsToRead.length} halaman web relevan...`,
      isSearching: true,
      sources: [],
      images: []
    };
    steps.push(fetchStep);
    job.phaseDetail = fetchStep.label;
    job.searchSteps = [...steps];
    broadcastJobEvent(job, 'status', { status: 'searching', phaseDetail: job.phaseDetail, searchQuery: cleanQ, searchSteps: job.searchSteps });

    const deepFetchCtrl = new AbortController();
    const forwardParentAbort = () => deepFetchCtrl.abort();
    if (signal) signal.addEventListener('abort', forwardParentAbort, { once: true });
    const deepTimer = setTimeout(() => deepFetchCtrl.abort(), 12000);

    try {
      const browserRes = await runBrowserAgent({
        query: cleanQ,
        userPrompt,
        targetUrls: topUrlsToRead,
        language: language || 'id',
        webSearchService,
        maxPages: 2,
        signal: deepFetchCtrl.signal,
        onStep: (st) => {
          if (st?.title) job.phaseDetail = st.title;
          if (Array.isArray(st?.browserPages)) {
            browserPages = st.browserPages;
            job.browserPages = browserPages;
          }
          broadcastJobEvent(job, 'status', {
            status: 'searching',
            phaseDetail: job.phaseDetail,
            searchQuery: cleanQ,
            searchSteps: job.searchSteps,
            browserPages: job.browserPages
          });
        }
      });
      if (browserRes?.llmContextBlock) {
        deepContextBlock = browserRes.llmContextBlock;
      }
      if (Array.isArray(browserRes?.browserPages) && browserRes.browserPages.length > 0) {
        browserPages = browserRes.browserPages;
        job.browserPages = browserPages;
      }
      if (Array.isArray(browserRes?.images) && browserRes.images.length > 0) {
        collectedImgCandidates.unshift(...browserRes.images.map(im => ({ imageUrl: im.url, title: im.title, sourceDomain: im.sourceDomain })));
      }
      fetchStep.isSearching = false;
      fetchStep.label = language === 'en'
        ? `Deep-read ${browserPages.length || topUrlsToRead.length} pages`
        : `Selesai membaca ${browserPages.length || topUrlsToRead.length} halaman web`;
    } catch (err) {
      console.warn('[ChatJob] Deep web page fetch fallback to snippets:', err.message);
      fetchStep.isSearching = false;
    } finally {
      clearTimeout(deepTimer);
      if (signal) signal.removeEventListener('abort', forwardParentAbort);
    }
  }

  // Collect & verify downloadable real images on server
  const candidateImages = [];
  const seenImg = new Set();
  const pushImg = (rawUrl, title, sourceUrl, sourceDomain) => {
    const cleanUrl = String(rawUrl || '').replace(/&amp;/g, '&').trim();
    if (!isValidExternalImageCandidate(cleanUrl) || seenImg.has(cleanUrl)) return;
    seenImg.add(cleanUrl);
    candidateImages.push({
      url: cleanUrl,
      title: title || cleanQ,
      source: sourceUrl || '',
      sourceDomain: sourceDomain || ''
    });
  };
  for (const img of collectedImgCandidates) {
    pushImg(img.imageUrl || img.thumbnail, img.title, img.source || img.link, img.sourceDomain);
  }
  for (const s of relevantSources) {
    if (s.thumbnail) pushImg(s.thumbnail, s.title, s.link, s.domain);
  }

  let verifiedImages = [];
  if (candidateImages.length > 0 && typeof batchPreloadImages === 'function') {
    try {
      const { validUrls = [] } = await batchPreloadImages(candidateImages.slice(0, 8).map(c => c.url), { timeoutMs: 2800 });
      const validSet = new Set(validUrls);
      verifiedImages = candidateImages.filter(c => validSet.has(c.url));
    } catch {
      verifiedImages = [];
    }
  }

  job.searchSources = relevantSources;
  job.searchImages = verifiedImages.slice(0, 8);
  job.browserPages = browserPages;
  job.searchSteps = steps.map((st, idx) => ({
    ...st,
    isSearching: false,
    ...(idx === steps.length - 1 ? { sources: relevantSources, images: verifiedImages.slice(0, 6) } : {})
  }));
  job.updatedAt = Date.now();

  broadcastJobEvent(job, 'search', {
    searchQuery: cleanQ,
    searchSources: job.searchSources,
    searchImages: job.searchImages,
    searchSteps: job.searchSteps,
    browserPages: job.browserPages
  });
  flushJobToDb(job, true);

  return {
    sources: relevantSources,
    verifiedImages,
    deepContextBlock,
    browserPages,
    noRelevantSources: false
  };
}

function buildSearchConclusionMessages(job, sources, verifiedImages, browserContextBlock = null, opts = {}) {
  const nowTime = new Date();
  const currentYear = nowTime.getFullYear();
  const weekdayId = nowTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
  const dateFormattedId = nowTime.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeWib = nowTime.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\./g, ':');
  const realtimeStamp = `[WAKTU REAL-TIME SEKARANG]: Hari ${weekdayId}, tanggal ${dateFormattedId}, pukul ${timeWib} WIB (Tahun ${currentYear}).`;

  if (opts.noRelevantSources || (!browserContextBlock && (!Array.isArray(sources) || sources.length === 0))) {
    const honestSysPrompt =
      `Kamu adalah asisten AI yang berjalan pada model ${job.model || 'Qwen 2.5 VL 72B'} melalui platform DeeperNova AI.\n` +
      `${realtimeStamp}\n` +
      `ATURAN MUTLAK KEJUJURAN & ANTI-NYAMPAH:\n` +
      `1. Pencarian web TIDAK menemukan sumber yang relevan untuk pertanyaan pengguna.\n` +
      `2. DILARANG KERAS membacakan, menyebut, atau menyinggung hasil pencarian yang tidak nyambung.\n` +
      `3. Jawablah murni berdasarkan pengetahuan yang BENAR-BENAR kamu ketahui dengan pasti.\n` +
      `4. JANGAN MENGARANG / JANGAN HALUSINASI (jangan garang): Jika kamu memang tidak tahu atau data terbaru tidak tersedia, katakan dengan jujur, singkat, dan sopan bahwa kamu tidak mengetahui/belum memiliki data pastinya.\n` +
      `5. DILARANG mengetik URL mentah dan DILARANG memicu [SEARCH_REQUEST] lagi.`;
    return [
      { role: 'system', content: honestSysPrompt },
      { role: 'user', content: `Pertanyaan Pengguna: "${job.userPrompt}"\n\n(Catatan sistem: Tidak ada sumber web yang relevan. Jawab murni dari pengetahuan pasti kamu, atau akui jujur jika memang tidak tahu.)` }
    ];
  }

  const sysPrompt =
    `Kamu adalah asisten AI yang berjalan pada model ${job.model || 'Qwen 2.5 VL 72B'} melalui platform DeeperNova AI.\n` +
    `${realtimeStamp}\n` +
    `PERAN SINTESIS RISET MENDALAM & ANTI-NYAMPAH (MUTLAK):\n` +
    `1. STRICT RELEVANSI & ANTI-HALUSINASI: Hanya gunakan fakta, angka, tanggal, dan detail dari sumber yang BENAR-BENAR RELEVAN dengan pertanyaan pengguna. Abaikan sumber yang melenceng — JANGAN bacakan hasil pencarian yang tidak nyambung! Jika info spesifik tidak ada di sumber, katakan jujur tidak tahu dan JANGAN mengarang.\n` +
    `2. LANGSUNG KE JAWABAN: Jangan berterima kasih atas hasil pencarian. Mulai paragraf pertama langsung menjawab inti pertanyaan.\n` +
    `3. ZERO-URL SPEED POLICY: DILARANG KERAS mengetik URL mentah (http://, https://, www.) — gunakan sitasi angka singkat [1], [2], dst.\n` +
    `4. ESKALASI AGENT OTONOM (OPSIONAL): Jika setelah membaca hasil web kamu menyadari tugas pengguna membutuhkan scraping/fetching kompleks lanjutan, pengolahan data Python, pembuatan file/dokumen/aplikasi, keluarkan HANYA \`[SUBAGENT_ORCHESTRATE: deskripsi tugas lengkap]\` di baris pertama lalu berhenti.\n` +
    `5. FORMAT RAPI: Awali ringkasan inti, gunakan subjudul \`###\` dan poin **tebal**. DILARANG memicu [SEARCH_REQUEST] atau [BROWSER_AGENT] lagi.`;

  let userMsg;
  if (browserContextBlock) {
    userMsg = `Pertanyaan Pengguna: "${job.userPrompt}"\n\n${browserContextBlock}\n\n`;
  } else {
    const searchContext = sources.slice(0, 6).map((s, idx) => {
      const snippet = sanitizeUntrustedWebContent(String(s.snippet || '').slice(0, 520).trim());
      return `[Sumber #${idx + 1} | Domain: ${s.domain || 'web'} | ${s.sourceEngine || 'Web'}${s.date ? ' | ' + s.date : ''}]\nJudul: ${s.title}\nKutipan:\n${snippet}`;
    }).join('\n\n---\n\n');

    userMsg = `Pertanyaan Pengguna: "${job.userPrompt}"\n\n--- DATA HASIL PENCARIAN WEB RELEVAN ---\n${searchContext}\n\n`;
    if (verifiedImages.length > 0) {
      userMsg += `--- DAFTAR ID FOTO TERVERIFIKASI ---\n` +
        verifiedImages.slice(0, 4).map((img, i) => `- foto:${i + 1} -> "${String(img.title || '').replace(/[\[\]]/g, '').trim()}"`).join('\n') +
        `\n- Jika relevan, tampilkan foto memakai ID pendek \`![Keterangan singkat](foto:1)\`. DILARANG menulis URL gambar!\n\n`;
    } else {
      userMsg += `- Tidak ada foto terverifikasi. DILARANG menyisipkan tag gambar (![...](...)).\n\n`;
    }
  }

  if (/\b(?:bandingkan|perbedaan|bagusan\s+mana|pilih\s+mana|vs\.?|versus|compare)\b/i.test(job.userPrompt || '')) {
    userMsg += `Buat perbandingan mendalam, objektif, kelebihan/kekurangan dalam tabel atau poin, serta kesimpulan akhir.\n`;
  }

  return [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: userMsg }
  ];
}

async function consumeSseResponse(upstreamResp, signal, onToken) {
  return new Promise((resolve, reject) => {
    if (!upstreamResp || !upstreamResp.body) {
      return reject(new Error('Upstream response body unavailable'));
    }

    const body = upstreamResp.body;
    let sseBuffer = '';
    let settled = false;

    const finish = (err = null) => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener('abort', onAbort);
      if (err) reject(err);
      else resolve();
    };

    const onAbort = () => {
      try {
        if (typeof body.destroy === 'function') body.destroy();
      } catch { }
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      finish(abortErr);
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    body.on('data', (chunk) => {
      if (settled) return;
      sseBuffer += chunk.toString('utf8');
      let nlIdx;
      while ((nlIdx = sseBuffer.indexOf('\n')) !== -1) {
        const line = sseBuffer.slice(0, nlIdx).trim();
        sseBuffer = sseBuffer.slice(nlIdx + 1);
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          finish();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta;
          const reasoningDelta = delta?.reasoning_content || delta?.reasoning || '';
          const contentDelta = delta?.content || parsed?.choices?.[0]?.text || '';
          if (reasoningDelta || contentDelta) {
            onToken({ reasoningDelta, contentDelta });
          }
        } catch {
          // ignore partial JSON frames split across chunks
        }
      }
    });

    body.on('end', () => finish());
    body.on('error', (err) => finish(err));
  });
}

async function streamLlmToJob(job, messages, options = {}, externalSignal) {
  const { dispatchFreeLlmRequest, apiProxyService } = deps;
  const localController = new AbortController();
  const forwardAbort = () => localController.abort();
  if (externalSignal) {
    if (externalSignal.aborted) localController.abort();
    else externalSignal.addEventListener('abort', forwardAbort, { once: true });
  }

  let dispatchRes;
  try {
    dispatchRes = await dispatchFreeLlmRequest({
      requestedModel: options.model || job.model || 'qwen2.5-vl-72b',
      messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.maxTokens ?? 4096,
      presence_penalty: 0.15,
      frequency_penalty: 0.25,
      stream: true,
      hasImages: Boolean(options.hasImages),
      enableReasoning: Boolean(options.enableReasoning),
      signal: localController.signal
    });
  } catch (err) {
    if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);
    throw err;
  }

  if (!dispatchRes?.response || !dispatchRes.response.ok) {
    if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);
    const fallbackText = apiProxyService.generateStandbyCompletion(
      messages,
      options.model || job.model,
      dispatchRes?.lastError
    );
    return {
      rawText: fallbackText,
      reasoningText: '',
      usedStandbyFallback: true
    };
  }

  let rawText = '';
  let reasoningText = '';
  let thinkBuffer = '';
  let insideThinkTag = false;
  let searchTagFound = null;
  let browserTagFound = null;
  let subAgentTagFound = null;
  let memoryTagFound = null;
  let reasoningStartMs = null;

  const emitReasoning = (chunk) => {
    if (!chunk) return;
    if (!reasoningStartMs) reasoningStartMs = Date.now();
    const prevLen = reasoningText.length;
    reasoningText += chunk;
    if (options.enableReasoning) {
      job.reasoningText = reasoningText;
      if (job.status !== 'streaming' && job.status !== 'searching') {
        job.status = 'thinking';
      }
      broadcastJobEvent(job, 'reasoning_delta', {
        delta: chunk,
        offset: prevLen,
        reasoningLen: reasoningText.length
      });
      flushJobToDb(job, false);
    }
  };

  const emitContent = (chunk) => {
    if (!chunk) return;
    if (reasoningStartMs && !job.reasoningDuration && options.enableReasoning) {
      job.reasoningDuration = Math.max(0.1, (Date.now() - reasoningStartMs) / 1000).toFixed(1);
    }
    rawText += chunk;

    const allowFlagScan = Boolean(options.detectSearchFlag || options.detectSubAgentOnly);
    if (allowFlagScan) {
      const isGrok46Model = String(job.model || '').toLowerCase().includes('grok-4.6');
      if (!isGrok46Model) {
        const sm = rawText.match(/\[(?:SUBAGENT_ORCHESTRATE|ACTIVATE_SUBAGENT|SUBAGENT_REQUEST|SUB_AGENT|AGENT_EXECUTE):\s*([\s\S]+?)\]/i) ||
          rawText.match(/<subagent(?:_orchestrate)?>\s*([\s\S]+?)\s*<\/subagent(?:_orchestrate)?>/i);
        if (sm && sm[1]) {
          subAgentTagFound = sm[1].trim().replace(/^["']|["']$/g, '');
          localController.abort();
          return;
        }
      }
      if (options.detectSearchFlag) {
        const mm = rawText.match(/\[(?:SEARCH_MEMORY|RECALL_MEMORY|MEMORY_SEARCH):\s*([\s\S]+?)\]/i) ||
          rawText.match(/<search_memory>\s*([\s\S]+?)\s*<\/search_memory>/i);
        if (mm && mm[1]) {
          memoryTagFound = mm[1].trim().replace(/^["']|["']$/g, '');
          localController.abort();
          return;
        }
        const bm = rawText.match(/\[(?:BROWSER_AGENT|OPEN_BROWSER|BROWSE_URL):\s*(.+?)\]/i);
        if (bm && bm[1]) {
          browserTagFound = bm[1].trim();
          localController.abort();
          return;
        }
        const m = rawText.match(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):\s*(.+?)\]/i) ||
          rawText.match(/<search(?:_request)?>\s*([\s\S]+?)\s*<\/search(?:_request)?>/i);
        if (m && m[1]) {
          searchTagFound = m[1].trim();
          localController.abort();
          return;
        }
      }
      // Hold back rendering if leading characters are a partial flag tag
      const trimmedLead = rawText.trimStart();
      if (/^\[(?:S|SE|SEA|SEAR|SEARC|SEARCH|SU|SUB|SUBA|SUBAG|SUBAGE|SUBAGEN|SUBAGENT|SUB_|A|AC|ACT|ACTI|ACTIV|ACTIVA|ACTIVAT|ACTIVATE|AG|AGE|AGEN|AGENT|E|EX|EXE|EXEC|EXECU|EXECUT|EXECUTE|W|WE|WEB|B|BR|BRO|BROW|BROWS|BROWSE|BROWSER|O|OP|OPE|OPEN|R|RE|REC|RECA|RECAL|RECALL|M|ME|MEM|MEMO|MEMOR|MEMORY)(?:_[A-Z]*)?(?::[^\]]*)?$/i.test(trimmedLead) ||
        /^<(?:subagent|search_memory)(?:_orchestrate)?[^>]*$/i.test(trimmedLead) ||
        /\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH|BROWSER_AGENT|OPEN_BROWSER|BROWSE_URL|SUBAGENT_ORCHESTRATE|ACTIVATE_SUBAGENT|SUBAGENT_REQUEST|SUB_AGENT|AGENT_EXECUTE|SEARCH_MEMORY|RECALL_MEMORY|MEMORY_SEARCH):[^\]]*$/i.test(rawText)) {
        return;
      }
    }

    job.status = 'streaming';
    const prevText = job.text || '';
    const nextText = cleanAssistantStreamingText(rawText);
    job.text = nextText;
    if (nextText.startsWith(prevText)) {
      const effectiveDelta = nextText.slice(prevText.length);
      if (effectiveDelta) {
        broadcastJobEvent(job, 'content_delta', {
          delta: effectiveDelta,
          offset: prevText.length,
          textLen: nextText.length
        });
      }
    } else {
      broadcastJobEvent(job, 'content_delta', { text: nextText });
    }
    flushJobToDb(job, false);
  };

  const processThinkAwareText = (incoming) => {
    if (!incoming) return;
    thinkBuffer += incoming;
    while (thinkBuffer.length > 0) {
      if (!insideThinkTag) {
        const openMatch = thinkBuffer.match(/<(?:think|reasoning|thought)>/i);
        if (openMatch) {
          const before = thinkBuffer.slice(0, openMatch.index);
          emitContent(before);
          thinkBuffer = thinkBuffer.slice(openMatch.index + openMatch[0].length);
          insideThinkTag = true;
        } else {
          // Keep tiny suffix if it might start `<think`
          const tailKeep = thinkBuffer.lastIndexOf('<');
          if (tailKeep !== -1 && thinkBuffer.length - tailKeep < 16) {
            emitContent(thinkBuffer.slice(0, tailKeep));
            thinkBuffer = thinkBuffer.slice(tailKeep);
            break;
          }
          emitContent(thinkBuffer);
          thinkBuffer = '';
        }
      } else {
        const closeMatch = thinkBuffer.match(/<\/(?:think|reasoning|thought)>/i);
        if (closeMatch) {
          const inside = thinkBuffer.slice(0, closeMatch.index);
          emitReasoning(inside);
          thinkBuffer = thinkBuffer.slice(closeMatch.index + closeMatch[0].length);
          insideThinkTag = false;
        } else {
          const tailKeep = thinkBuffer.lastIndexOf('<');
          if (tailKeep !== -1 && thinkBuffer.length - tailKeep < 16) {
            emitReasoning(thinkBuffer.slice(0, tailKeep));
            thinkBuffer = thinkBuffer.slice(tailKeep);
            break;
          }
          emitReasoning(thinkBuffer);
          thinkBuffer = '';
        }
      }
    }
  };

  try {
    await consumeSseResponse(dispatchRes.response, localController.signal, ({ reasoningDelta, contentDelta }) => {
      if (reasoningDelta) emitReasoning(reasoningDelta);
      if (contentDelta) processThinkAwareText(contentDelta);
    });
  } catch (streamErr) {
    // Expected when an AI flag triggered localController.abort()
    if (!searchTagFound && !browserTagFound && !subAgentTagFound && !memoryTagFound) {
      if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);
      if (streamErr?.name === 'AbortError' && externalSignal?.aborted) {
        throw streamErr;
      }
      console.warn('[ChatJob] Stream read interruption:', streamErr?.message);
    }
  }

  if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);

  // Flush remaining buffer
  if (thinkBuffer && !searchTagFound && !browserTagFound && !subAgentTagFound && !memoryTagFound) {
    if (insideThinkTag) emitReasoning(thinkBuffer);
    else emitContent(thinkBuffer);
    thinkBuffer = '';
  }

  if (reasoningStartMs && !job.reasoningDuration && options.enableReasoning) {
    job.reasoningDuration = Math.max(0.1, (Date.now() - reasoningStartMs) / 1000).toFixed(1);
  }

  return {
    rawText,
    reasoningText,
    searchTagFound,
    browserTagFound,
    subAgentTagFound,
    memoryTagFound,
    usedStandbyFallback: false
  };
}

function shouldFallbackSearchForUncertainty(rawText = '', job) {
  if (!job.userPrompt || job.userPrompt.trim().length < 4 || job.hasImages) return false;
  if (/^(?:hai|halo|hallo|hi|hello|hey|pagi|siang|sore|malam|tes|test|ping|ok|oke|makasih|terima\s+kasih|thanks)[!?. ]*$/i.test(job.userPrompt.trim())) {
    return false;
  }
  return /(?:maaf[,\s]+(?:saya|aku)\s+(?:tidak|kurang|belum)\s+(?:tahu|mengetahui|yakin|memiliki\s+(?:informasi|data|akses))|(?:saya|aku)\s+(?:tidak|kurang|belum)\s+(?:yakin|tahu\s+pasti|bisa\s+memastikan|memiliki\s+(?:data|informasi|akses)\s+(?:terbaru|terkini|valid|real-?time|internet))|pengetahuan\s+(?:saya|aku)\s+(?:hanya\s+)?(?:sampai|terbatas)|keterbatasan\s+pengetahuan|tidak\s+(?:dapat|bisa)\s+(?:memverifikasi|mengakses\s+(?:informasi\s+terkini|internet|data\s+real-?time))|informasi\s+(?:terbaru|terkini)\s+belum\s+tersedia|data\s+real-?time\s+tidak\s+tersedia|cek\s+situs\s+resmi|periksa\s+sumber\s+resmi|i\s+(?:do\s+not|don't)\s+(?:know|have\s+access)|i(?:'m|\s+am)\s+not\s+(?:sure|certain)|beyond\s+my\s+knowledge(?:\s+cutoff)?|no\s+access\s+to\s+real-?time)/i.test(rawText);
}

function persistCompletionToChatTables(job) {
  if (job.isPrivate || !job.userId || !deps.db || !deps.sessionDb || !deps.messageDb) return;
  try {
    let sess = deps.sessionDb.findById(job.sessionId);
    if (!sess) {
      const cleanTitle = (job.userPrompt || 'Obrolan AI').slice(0, 45).trim() || 'Obrolan AI';
      deps.sessionDb.create(job.sessionId, job.userId, cleanTitle);
    }

    const userCreatedAtMs = Number(job.createdAt) || Date.now();
    if (job.userMessageId && job.userPrompt && !deps.messageDb.findById(job.userMessageId)) {
      deps.db.prepare(`
        INSERT OR REPLACE INTO chat_messages (id, sessionId, userId, role, content, personality, createdAt)
        VALUES (?, ?, ?, 'user', ?, ?, ?)
      `).run(
        String(job.userMessageId),
        String(job.sessionId),
        String(job.userId),
        job.userPrompt,
        job.personality || 'mentor',
        new Date(userCreatedAtMs).toISOString()
      );
    }

    if (job.text && job.text.trim()) {
      const botCreatedAtMs = Math.max(Date.now(), userCreatedAtMs + 10);
      deps.db.prepare(`
        INSERT OR REPLACE INTO chat_messages (id, sessionId, userId, role, content, personality, searchQuery, searchSources, searchImages, createdAt)
        VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?)
      `).run(
        String(job.assistantMessageId),
        String(job.sessionId),
        String(job.userId),
        job.text,
        job.personality || 'mentor',
        job.searchQuery || null,
        job.searchSources?.length > 0 ? JSON.stringify(job.searchSources) : null,
        job.searchImages?.length > 0 ? JSON.stringify(job.searchImages) : null,
        new Date(botCreatedAtMs).toISOString()
      );

      deps.db.prepare(`UPDATE chat_sessions SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(String(job.sessionId));
    }

    if (typeof deps.broadcastUserSync === 'function') {
      deps.broadcastUserSync(job.userId, 'stream_done', {
        sessionId: job.sessionId,
        assistantMsgId: job.assistantMessageId,
        text: job.text,
        isGenerating: false,
        updatedAt: new Date().toISOString()
      }, job.deviceId);
    }
  } catch (err) {
    console.warn('[ChatJob] Failed persisting final chat messages:', err.message);
  }
}

const SANDBOX_STEP_BADGE_MAP_SERVER = {
  plan: 'PLAN',
  skill: 'SKILL',
  write_file: 'WRITE',
  read_file: 'READ',
  edit_file: 'EDIT',
  command: 'BASH',
  run_python: 'PYTHON',
  test_file: 'VERIFY',
  search: 'SEARCH',
  screenshot: 'CAPTURE',
  zip_project: 'ZIP',
  finish: 'DONE'
};

function formatBytesServer(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function getSubAgentFileMetaServer(fileName = '') {
  const ext = String(fileName).split('.').pop().toLowerCase();
  const map = {
    py: { lang: 'python', badge: 'PY', icon: 'code', color: '#3776ab', bg: 'rgba(55,118,171,0.12)', mime: 'text/x-python' },
    js: { lang: 'javascript', badge: 'JS', icon: 'code', color: '#d97706', bg: 'rgba(217,119,6,0.12)', mime: 'application/javascript' },
    jsx: { lang: 'jsx', badge: 'JSX', icon: 'code', color: '#0284c7', bg: 'rgba(2,132,199,0.12)', mime: 'text/jsx' },
    ts: { lang: 'typescript', badge: 'TS', icon: 'code', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', mime: 'application/typescript' },
    tsx: { lang: 'tsx', badge: 'TSX', icon: 'code', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', mime: 'text/tsx' },
    html: { lang: 'html', badge: 'HTML', icon: 'globe', color: '#ea580c', bg: 'rgba(234,88,12,0.12)', mime: 'text/html' },
    css: { lang: 'css', badge: 'CSS', icon: 'code', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', mime: 'text/css' },
    json: { lang: 'json', badge: 'JSON', icon: 'code', color: '#059669', bg: 'rgba(5,150,105,0.12)', mime: 'application/json' },
    md: { lang: 'markdown', badge: 'MD', icon: 'doc', color: '#475569', bg: 'rgba(71,85,105,0.12)', mime: 'text/markdown' },
    docx: { lang: 'binary', badge: 'DOCX', icon: 'doc', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    xlsx: { lang: 'binary', badge: 'XLSX', icon: 'sheet', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    pptx: { lang: 'binary', badge: 'PPTX', icon: 'slide', color: '#ea580c', bg: 'rgba(234,88,12,0.12)', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    pdf: { lang: 'binary', badge: 'PDF', icon: 'doc', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', mime: 'application/pdf' },
    zip: { lang: 'binary', badge: 'ZIP', icon: 'archive', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', mime: 'application/zip' },
    csv: { lang: 'csv', badge: 'CSV', icon: 'sheet', color: '#0d9488', bg: 'rgba(13,148,136,0.12)', mime: 'text/csv' }
  };
  return map[ext] || { lang: 'text', badge: (ext || 'FILE').toUpperCase().slice(0, 6), icon: 'file', color: '#64748b', bg: 'rgba(100,116,139,0.12)', mime: 'text/plain' };
}

function mapSandboxStepServer(step = {}, index = 0) {
  const rawType = String(step.type || 'command').toLowerCase();
  const badge = SANDBOX_STEP_BADGE_MAP_SERVER[rawType] || rawType.toUpperCase().slice(0, 12);
  let agent = 'Engineer Sub-Agent';
  if (['plan', 'skill', 'search'].includes(rawType)) agent = 'Planner Sub-Agent';
  else if (['test_file', 'finish', 'screenshot', 'zip_project'].includes(rawType)) agent = 'Verifier Sub-Agent';
  return {
    id: step.id || `sb_step_${index}`,
    agent,
    badge,
    title: step.title || 'Eksekusi Langkah Otonom',
    detail: step.detail || '',
    status: step.status === 'completed' || step.status === 'done' ? 'done' : step.status === 'failed' ? 'error' : 'running'
  };
}

function mapSandboxFileServer(f = {}, index = 0) {
  const cleanPath = String(f.path || f.name || `deliverable_${index + 1}.txt`).replace(/^[/\\]+/, '');
  const cleanName = String(f.name || cleanPath.split('/').pop() || cleanPath);
  const contentStr = typeof f.content === 'string' ? f.content : '';
  const sizeBytes = Number.isFinite(f.size) ? f.size : (Number.isFinite(f.sizeBytes) ? f.sizeBytes : Buffer.byteLength(contentStr, 'utf8'));
  const lineCount = contentStr ? contentStr.split('\n').length : 0;
  const meta = getSubAgentFileMetaServer(cleanName);
  return {
    id: f.id || `sb_file_${cleanPath}_${index}`,
    name: cleanName,
    path: cleanPath,
    description: f.description || `Berkas ${meta.badge} dari Workspace Sandbox`,
    content: contentStr || null,
    isServerFile: Boolean(f.isServerFile || f.downloadUrl || f.url),
    url: f.url || null,
    downloadUrl: f.downloadUrl || null,
    sizeBytes,
    sizeFormatted: formatBytesServer(sizeBytes),
    lineCount,
    language: meta.lang,
    badge: meta.badge,
    icon: meta.icon,
    color: meta.color,
    bg: meta.bg,
    mime: meta.mime,
    status: 'verified'
  };
}

async function executeJobInBackground(job, params) {
  const signal = job.abortController.signal;
  try {
    const promptUrls = extractUrlsFromText(job.userPrompt || '');
    const isSubAgentModelAllowed = !String(job.model || '').toLowerCase().includes('grok-4.6');

    // 100% AI-FLAG DRIVEN: Never force keyword/regex search or browser mode.
    // Only auto-browse if user pasted a literal URL or explicitly locked browserAgentMode === 'on'.
    let runSubAgentTask = null;
    let runMemoryQuery = null;
    let runBrowserQuery = (promptUrls.length > 0 && !params.hasImages && params.enableWebSearch !== false)
      ? sanitizeSearchQueryServer(job.userPrompt, job.userPrompt)
      : ((job.browserAgentMode === 'on' && params.searchQuery)
        ? sanitizeSearchQueryServer(params.searchQuery, job.userPrompt)
        : null);

    let runSearchWithQuery = (!runBrowserQuery && params.searchQuery)
      ? sanitizeSearchQueryServer(params.searchQuery, job.userPrompt)
      : null;
    let firstPass = null;

    if (!runBrowserQuery && !runSearchWithQuery) {
      job.status = 'thinking';
      job.phaseDetail = job.language === 'en' ? 'Analyzing your prompt...' : 'Memahami pertanyaanmu...';
      broadcastJobEvent(job, 'status', { status: 'thinking', phaseDetail: job.phaseDetail });
      flushJobToDb(job, true);

      firstPass = await streamLlmToJob(
        job,
        params.preparedMessages,
        {
          model: job.model,
          enableReasoning: Boolean(params.enableReasoning),
          hasImages: Boolean(params.hasImages),
          temperature: params.temperature,
          maxTokens: params.max_tokens,
          detectSearchFlag: !params.hasImages && params.enableWebSearch !== false
        },
        signal
      );

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      if (firstPass.subAgentTagFound && isSubAgentModelAllowed && typeof deps.executeAutonomousAgentRun === 'function') {
        runSubAgentTask = firstPass.subAgentTagFound;
      } else if (firstPass.memoryTagFound) {
        runMemoryQuery = firstPass.memoryTagFound;
      } else if (firstPass.browserTagFound && !params.hasImages && params.enableWebSearch !== false) {
        runBrowserQuery = sanitizeSearchQueryServer(firstPass.browserTagFound, job.userPrompt);
      } else if (firstPass.searchTagFound && !params.hasImages && params.enableWebSearch !== false) {
        if (job.browserAgentMode === 'on') {
          runBrowserQuery = sanitizeSearchQueryServer(firstPass.searchTagFound, job.userPrompt);
        } else {
          runSearchWithQuery = sanitizeSearchQueryServer(firstPass.searchTagFound, job.userPrompt);
        }
      }
    }

    if (runMemoryQuery) {
      job.text = '';
      job.reasoningText = '';
      job.reasoningDuration = null;
      job.status = 'thinking';
      job.phaseDetail = job.language === 'en'
        ? `Searching cross-session memory for "${runMemoryQuery}"...`
        : `Menelusuri memori obrolan lintas sesi untuk "${runMemoryQuery}"...`;
      broadcastJobEvent(job, 'status', { status: 'thinking', phaseDetail: job.phaseDetail });
      flushJobToDb(job, true);

      let memRes = searchCrossSessionMemory(job, runMemoryQuery);
      if (memRes.totalMatches === 0 && job.userPrompt && job.userPrompt !== runMemoryQuery) {
        memRes = searchCrossSessionMemory(job, job.userPrompt);
      }

      const memoryBlock = memRes.totalMatches > 0
        ? [
          memRes.globalFacts.length > 0 ? `=== FAKTA MEMORI PENGGUNA ===\n${memRes.globalFacts.join('\n')}` : '',
          memRes.memories.length > 0
            ? `=== CUPLIKAN PERCAKAPAN LINTAS SESI TERKAIT ===\n` +
            memRes.memories.map((m, i) => `[Memori #${i + 1} | ${m.source}${m.createdAt ? ` | ${String(m.createdAt).slice(0, 10)}` : ''}]\n${m.content}`).join('\n\n')
            : ''
        ].filter(Boolean).join('\n\n')
        : 'Tidak ditemukan catatan percakapan atau memori lama yang cocok untuk topik ini. Jawablah dengan jujur bahwa kamu belum menemukan riwayat tersebut di memori tanpa mengarang.';

      const memoryMessages = [
        ...(params.preparedMessages || []),
        {
          role: 'system',
          content: `[HASIL PENCARIAN MEMORI LINTAS SESI (${memRes.totalMatches} temuan)]:\n${memoryBlock}\n\nINSTRUKSI: Gunakan catatan memori di atas untuk menjawab pertanyaan pengguna secara alami, hangat, dan akurat. DILARANG mengarang memori palsu jika tidak ada di catatan. DILARANG memicu [SEARCH_MEMORY] lagi.`
        }
      ];

      const memPass = await streamLlmToJob(
        job,
        memoryMessages,
        {
          model: job.model,
          enableReasoning: false,
          hasImages: false,
          temperature: 0.45,
          maxTokens: 4096,
          detectSubAgentOnly: isSubAgentModelAllowed && typeof deps.executeAutonomousAgentRun === 'function'
        },
        signal
      );

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      if (memPass.subAgentTagFound && isSubAgentModelAllowed && typeof deps.executeAutonomousAgentRun === 'function') {
        runSubAgentTask = memPass.subAgentTagFound;
      } else {
        job.text = cleanAssistantFinalText(memPass.rawText || job.text || '');
      }
    }

    if (runSubAgentTask) {
      const subAgentStartMs = Date.now();
      const sandboxSessionId = `subagent_${String(job.sessionId || 'chat').replace(/[^a-zA-Z0-9_-]/g, '').slice(-16)}_${Date.now().toString(36)}`;
      job.text = '';
      job.reasoningText = '';
      job.reasoningDuration = null;
      job.status = 'streaming';
      job.phaseDetail = job.language === 'en'
        ? 'Autonomous Sub-Agent executing task in server sandbox...'
        : 'Sub-Agent Otonom mengeksekusi tugas di sandbox server...';

      let thoughtSteps = [{
        id: 'sb_init',
        agent: 'Planner Sub-Agent',
        badge: 'INIT',
        title: job.language === 'en' ? 'Activating Autonomous Sandbox' : 'Mengaktifkan Sandbox Otonom',
        detail: runSubAgentTask.slice(0, 180),
        status: 'running'
      }];
      let currentFiles = [];
      let cotText = '';
      let finalAnswer = '';
      let activeSkill = null;
      let screenshotUrl = null;
      let previewUrl = null;
      let lastSubAgentEmit = 0;

      const buildSubAgentSnapshot = (statusOverride = 'running', stageOverride = null) => {
        const elapsedSec = ((Date.now() - subAgentStartMs) / 1000).toFixed(1);
        const stage = stageOverride || (currentFiles.length > 0 ? 2 : 1);
        return {
          status: statusOverride,
          taskDescription: runSubAgentTask,
          sandboxSessionId,
          currentStage: stage,
          elapsedSec,
          planText: '',
          plannedFiles: currentFiles.map(f => f.path || f.name),
          activeSkill,
          cotText: cotText.slice(-8000),
          thoughtSteps: thoughtSteps.slice(-40),
          files: currentFiles,
          activeWritingFile: null,
          zipDownloadUrl: currentFiles.length > 0 ? `/api/agent/download-zip?sessionId=${encodeURIComponent(sandboxSessionId)}` : null,
          screenshotUrl,
          previewUrl,
          finalAnswer
        };
      };

      const pushSubAgentState = (force = false, statusOverride = 'running', stageOverride = null) => {
        job.subAgentData = buildSubAgentSnapshot(statusOverride, stageOverride);
        const now = Date.now();
        if (force || now - lastSubAgentEmit >= 200) {
          lastSubAgentEmit = now;
          broadcastJobEvent(job, 'status', {
            status: 'streaming',
            phaseDetail: job.phaseDetail,
            subAgentData: job.subAgentData
          });
          flushJobToDb(job, force);
        }
      };

      pushSubAgentState(true, 'running', 1);

      const agentHistory = (params.preparedMessages || [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

      let sandboxFailedMsg = null;

      await deps.executeAutonomousAgentRun({
        sessionId: sandboxSessionId,
        prompt: `${job.userPrompt || runSubAgentTask}\n\n[AI_ORCHESTRATOR_INTENT]: ${runSubAgentTask}`,
        model: job.model || 'north-mini-code',
        history: agentHistory,
        effort: 'high',
        language: job.language || 'id',
        userId: job.userId || job.deviceId || 'chatbot_guest',
        deferDeltaUntilDone: true,
        onEvent: (eventType, data = {}) => {
          if (signal.aborted || job.stopped) return;
          if (eventType === 'step') {
            if (thoughtSteps.length === 1 && thoughtSteps[0].id === 'sb_init') {
              thoughtSteps[0] = { ...thoughtSteps[0], status: 'done' };
            }
            const mapped = mapSandboxStepServer(data, thoughtSteps.length);
            thoughtSteps.push(mapped);
            if (mapped.title) job.phaseDetail = mapped.title;
            pushSubAgentState(true, 'running');
          } else if (eventType === 'step_update') {
            if (thoughtSteps.length > 0) {
              const lastIdx = thoughtSteps.length - 1;
              thoughtSteps[lastIdx] = {
                ...thoughtSteps[lastIdx],
                status: data.status === 'completed' || data.status === 'done' ? 'done' : data.status === 'failed' ? 'error' : thoughtSteps[lastIdx].status,
                detail: data.detail || thoughtSteps[lastIdx].detail
              };
            }
            if (data.screenshotUrl) screenshotUrl = data.screenshotUrl;
            if (data.previewUrl) previewUrl = data.previewUrl;
            pushSubAgentState(true, 'running');
          } else if (eventType === 'skill_active') {
            activeSkill = data.skill || data.name || data.title || null;
            pushSubAgentState(true, 'running');
          } else if (eventType === 'reasoning') {
            const chunk = String(data.text || data.content || '');
            if (chunk) {
              cotText += chunk;
              pushSubAgentState(false, 'running');
            }
          } else if (eventType === 'delta') {
            const chunk = String(data.content || data.text || '');
            if (chunk) {
              finalAnswer += chunk;
              pushSubAgentState(false, 'running', 3);
            }
          } else if (eventType === 'files_update') {
            const rawFiles = Array.isArray(data.files) ? data.files : [];
            const enriched = typeof deps.buildEnrichedSandboxFiles === 'function'
              ? deps.buildEnrichedSandboxFiles(sandboxSessionId, rawFiles)
              : rawFiles;
            currentFiles = enriched.map((f, idx) => mapSandboxFileServer(f, idx));
            pushSubAgentState(true, 'running', 2);
          } else if (eventType === 'done') {
            const rawFiles = Array.isArray(data.files) ? data.files : [];
            if (rawFiles.length > 0) {
              const enriched = typeof deps.buildEnrichedSandboxFiles === 'function'
                ? deps.buildEnrichedSandboxFiles(sandboxSessionId, rawFiles)
                : rawFiles;
              currentFiles = enriched.map((f, idx) => mapSandboxFileServer(f, idx));
            }
            if (typeof data.content === 'string' && data.content.trim()) {
              finalAnswer = data.content.trim();
            }
            if (data.screenshotUrl) screenshotUrl = data.screenshotUrl;
            if (data.previewUrl) previewUrl = data.previewUrl;
            thoughtSteps = thoughtSteps.map(s => (s.status === 'running' ? { ...s, status: 'done' } : s));
            pushSubAgentState(true, 'completed', 3);
          } else if (eventType === 'error') {
            sandboxFailedMsg = data.error || 'Sub-Agent mengalami kendala saat mengeksekusi tugas.';
            thoughtSteps = thoughtSteps.map(s => (s.status === 'running' ? { ...s, status: 'error' } : s));
            pushSubAgentState(true, 'error', 3);
          }
        },
        onCloseRegister: (cb) => {
          if (signal.aborted) {
            try { cb(); } catch { }
          } else {
            signal.addEventListener('abort', () => { try { cb(); } catch { } }, { once: true });
          }
        },
        finishStream: () => { }
      });

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      if (sandboxFailedMsg && !finalAnswer && currentFiles.length === 0) {
        job.subAgentData = buildSubAgentSnapshot('error', 3);
        job.text = sandboxFailedMsg;
      } else {
        if (!finalAnswer) {
          finalAnswer = currentFiles.length > 0
            ? (job.language === 'en'
              ? `Task completed! Generated ${currentFiles.length} verified file(s) in the sandbox.`
              : `Tugas selesai! Berhasil membuat ${currentFiles.length} berkas terverifikasi di sandbox.`)
            : (job.language === 'en' ? 'Autonomous task execution completed.' : 'Eksekusi tugas otonom telah selesai.');
        }
        thoughtSteps = thoughtSteps.map(s => (s.status === 'running' ? { ...s, status: 'done' } : s));
        job.subAgentData = buildSubAgentSnapshot('completed', 3);
        job.text = '';
      }
    } else if (runBrowserQuery) {
      job.text = '';
      job.reasoningText = '';
      job.reasoningDuration = null;
      job.status = 'searching';
      job.searchQuery = runBrowserQuery;
      job.phaseDetail = job.language === 'en' ? 'Browser Agent opening & reading pages...' : 'Peramban Agent sedang membaca halaman web...';
      broadcastJobEvent(job, 'status', { status: 'searching', phaseDetail: job.phaseDetail, searchQuery: runBrowserQuery });
      flushJobToDb(job, true);

      const browserRes = await runBrowserAgent({
        query: runBrowserQuery,
        userPrompt: job.userPrompt,
        targetUrls: promptUrls,
        language: job.language || 'id',
        webSearchService: deps.webSearchService,
        maxPages: 3,
        signal,
        onStep: (step) => {
          if (step?.title) job.phaseDetail = step.title;
          if (Array.isArray(step?.browserPages)) job.browserPages = step.browserPages;
          job.searchSteps = [
            ...(Array.isArray(job.searchSteps) ? job.searchSteps.slice(-4) : []),
            {
              query: step?.query || runBrowserQuery,
              label: step?.title || 'Peramban Agent membaca halaman...',
              isSearching: step?.phase !== 'browsing_done',
              sources: [],
              images: []
            }
          ];
          broadcastJobEvent(job, 'status', {
            status: 'searching',
            phaseDetail: job.phaseDetail,
            searchQuery: job.searchQuery,
            searchSteps: job.searchSteps,
            browserPages: job.browserPages
          });
        }
      });

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      const bSources = Array.isArray(browserRes?.sources) ? browserRes.sources : [];
      const bImages = Array.isArray(browserRes?.images) ? browserRes.images : [];
      const bPages = Array.isArray(browserRes?.browserPages) ? browserRes.browserPages : [];

      job.searchSources = bSources;
      job.searchImages = bImages;
      job.browserPages = bPages;
      job.searchSteps = [{
        query: runBrowserQuery,
        label: job.language === 'id' ? `Peramban Agent membaca ${bPages.length} halaman` : `Browser Agent read ${bPages.length} pages`,
        isSearching: false,
        sources: bSources,
        images: bImages
      }];

      broadcastJobEvent(job, 'search', {
        searchQuery: job.searchQuery,
        searchSources: bSources,
        searchImages: bImages,
        searchSteps: job.searchSteps,
        browserPages: bPages
      });

      job.status = 'thinking';
      job.phaseDetail = job.language === 'id' ? 'Menyusun ringkasan akurat...' : 'Synthesizing accurate summary...';
      broadcastJobEvent(job, 'status', { status: 'thinking', phaseDetail: job.phaseDetail, browserPages: bPages });
      flushJobToDb(job, true);

      const browserConclusionMessages = buildSearchConclusionMessages(job, bSources, bImages, browserRes?.llmContextBlock || null);
      const conclusionPass = await streamLlmToJob(
        job,
        browserConclusionMessages,
        {
          model: job.model,
          enableReasoning: false,
          hasImages: false,
          temperature: 0.4,
          maxTokens: 4096,
          detectSearchFlag: false
        },
        signal
      );

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      let finalBrowserText = replaceCitationsServer(cleanAssistantFinalText(conclusionPass.rawText || job.text), bSources);
      if (!finalBrowserText || !finalBrowserText.trim()) {
        finalBrowserText = job.language === 'en'
          ? 'I could not find reliable information on this topic right now.'
          : 'Maaf, saya belum memiliki informasi yang pasti mengenai hal tersebut saat ini.';
      }
      job.text = finalBrowserText;
    } else if (runSearchWithQuery) {
      // Wipe any pre-search speculation before running multi-step web search + deep page fetch
      job.text = '';
      job.reasoningText = '';
      job.reasoningDuration = null;
      const { sources, verifiedImages, deepContextBlock, noRelevantSources } = await runServerSearchPipeline(
        job,
        runSearchWithQuery,
        job.userPrompt,
        job.language,
        signal
      );

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      job.status = 'thinking';
      job.phaseDetail = noRelevantSources
        ? (job.language === 'id' ? 'Menjawab dari pengetahuan terverifikasi...' : 'Answering from verified knowledge...')
        : (job.language === 'id' ? 'Merangkum fakta mendalam terverifikasi...' : 'Synthesizing verified deep research...');
      broadcastJobEvent(job, 'status', { status: 'thinking', phaseDetail: job.phaseDetail });
      flushJobToDb(job, true);

      const conclusionMessages = buildSearchConclusionMessages(
        job,
        sources,
        verifiedImages,
        deepContextBlock,
        { noRelevantSources }
      );
      const conclusionPass = await streamLlmToJob(
        job,
        conclusionMessages,
        {
          model: job.model,
          enableReasoning: false,
          hasImages: false,
          temperature: 0.35,
          maxTokens: 4096,
          detectSearchFlag: false,
          detectSubAgentOnly: isSubAgentModelAllowed && typeof deps.executeAutonomousAgentRun === 'function'
        },
        signal
      );

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      if (conclusionPass.subAgentTagFound && isSubAgentModelAllowed && typeof deps.executeAutonomousAgentRun === 'function') {
        // Escalate seamlessly to Autonomous Sandbox Agent when AI emits [SUBAGENT_ORCHESTRATE: ...] after research
        const escalatedTask = conclusionPass.subAgentTagFound;
        const sandboxSessionId = `subagent_${String(job.sessionId || 'chat').replace(/[^a-zA-Z0-9_-]/g, '').slice(-16)}_${Date.now().toString(36)}`;
        const escStartMs = Date.now();
        let escSteps = [{
          id: 'sb_esc_init',
          agent: 'Planner Sub-Agent',
          badge: 'AGENT',
          title: job.language === 'en' ? 'Escalating Research to Autonomous Sandbox' : 'Mengeksekusi Riset Lanjutan di Sandbox Otonom',
          detail: escalatedTask.slice(0, 180),
          status: 'running'
        }];
        let escFiles = [];
        let escFinal = '';
        job.text = '';
        job.status = 'streaming';
        job.subAgentData = {
          status: 'running',
          taskDescription: escalatedTask,
          sandboxSessionId,
          currentStage: 1,
          elapsedSec: '0.1',
          thoughtSteps: escSteps,
          files: [],
          finalAnswer: ''
        };
        broadcastJobEvent(job, 'status', { status: 'streaming', phaseDetail: escSteps[0].title, subAgentData: job.subAgentData });
        await deps.executeAutonomousAgentRun({
          sessionId: sandboxSessionId,
          prompt: `${job.userPrompt || escalatedTask}\n\n[AI_ORCHESTRATOR_INTENT]: ${escalatedTask}\n\n[PRELIMINARY_WEB_RESEARCH]:\n${String(deepContextBlock || '').slice(0, 3500)}`,
          model: job.model || 'north-mini-code',
          history: [],
          effort: 'high',
          language: job.language || 'id',
          userId: job.userId || job.deviceId || 'chatbot_guest',
          deferDeltaUntilDone: true,
          onEvent: (ev, d = {}) => {
            if (ev === 'step') {
              escSteps.push(mapSandboxStepServer(d, escSteps.length));
            } else if (ev === 'files_update' || ev === 'done') {
              const rf = Array.isArray(d.files) ? d.files : [];
              if (rf.length > 0) {
                const enriched = typeof deps.buildEnrichedSandboxFiles === 'function' ? deps.buildEnrichedSandboxFiles(sandboxSessionId, rf) : rf;
                escFiles = enriched.map((f, idx) => mapSandboxFileServer(f, idx));
              }
              if (typeof d.content === 'string' && d.content.trim()) escFinal = d.content.trim();
            }
            job.subAgentData = {
              status: ev === 'done' ? 'completed' : 'running',
              taskDescription: escalatedTask,
              sandboxSessionId,
              currentStage: ev === 'done' ? 3 : (escFiles.length > 0 ? 2 : 1),
              elapsedSec: ((Date.now() - escStartMs) / 1000).toFixed(1),
              thoughtSteps: escSteps.slice(-40),
              files: escFiles,
              zipDownloadUrl: escFiles.length > 0 ? `/api/agent/download-zip?sessionId=${encodeURIComponent(sandboxSessionId)}` : null,
              finalAnswer: escFinal
            };
            broadcastJobEvent(job, 'status', { status: 'streaming', phaseDetail: job.phaseDetail, subAgentData: job.subAgentData });
            flushJobToDb(job, ev === 'done');
          },
          onCloseRegister: (cb) => { signal.addEventListener('abort', () => { try { cb(); } catch { } }, { once: true }); },
          finishStream: () => { }
        });
        job.subAgentData = {
          ...job.subAgentData,
          status: 'completed',
          currentStage: 3,
          thoughtSteps: escSteps.map(s => ({ ...s, status: s.status === 'running' ? 'done' : s.status })),
          finalAnswer: escFinal || 'Eksekusi riset otonom di sandbox selesai.'
        };
        job.text = '';
      } else {
        let finalSearchText = replaceCitationsServer(cleanAssistantFinalText(conclusionPass.rawText || job.text), sources);
        if (!finalSearchText || !finalSearchText.trim()) {
          finalSearchText = job.language === 'en'
            ? 'I do not have verified information on this topic right now.'
            : 'Maaf, saya tidak memiliki informasi pasti mengenai hal tersebut saat ini.';
        }
        job.text = finalSearchText;
      }
    } else if (!runMemoryQuery) {
      job.text = cleanAssistantFinalText(firstPass?.rawText || job.text || '');
      if (!job.text && job.reasoningText) {
        job.text = cleanAssistantFinalText(job.reasoningText);
      }
    }

    job.status = 'done';
    job.updatedAt = Date.now();
    persistCompletionToChatTables(job);
    flushJobToDb(job, true);

    const payload = sanitizeJobPayload(job);
    broadcastJobEvent(job, 'done', payload);
  } catch (err) {
    if (err?.name === 'AbortError' || job.stopped) {
      job.status = 'stopped';
      job.updatedAt = Date.now();
      flushJobToDb(job, true);
      broadcastJobEvent(job, 'stopped', sanitizeJobPayload(job));
    } else {
      console.error('[ChatJob] Background job error:', err);
      job.status = 'error';
      job.error = typeof deps.humanizeError === 'function' ? deps.humanizeError(err.message) : (err.message || 'Terjadi kesalahan saat memproses jawaban.');
      job.updatedAt = Date.now();
      flushJobToDb(job, true);
      broadcastJobEvent(job, 'error', sanitizeJobPayload(job));
    }
  } finally {
    // Close all attached SSE subscribers
    for (const res of Array.from(job.subscribers)) {
      if (!res.writableEnded) {
        try {
          res.write('data: [DONE]\n\n');
          res.end();
        } catch { }
      }
    }
    job.subscribers.clear();

    setTimeout(() => {
      liveJobs.delete(job.id);
    }, LIVE_JOB_RETENTION_MS).unref?.();
  }
}

export function startChatJob(params) {
  const now = Date.now();
  const jobId = makeJobId();
  const sessionId = String(params.sessionId || `conv_${now}`);
  const userMessageId = String(params.userMessageId || `user_${now}`);
  const assistantMessageId = String(params.assistantMessageId || `bot_${now}_${Math.random().toString(36).slice(2, 6)}`);

  const job = {
    id: jobId,
    userId: params.userId || null,
    deviceId: params.deviceId || null,
    clientIp: params.clientIp || null,
    sessionId,
    userMessageId,
    assistantMessageId,
    status: params.searchQuery ? 'searching' : 'thinking',
    model: params.model || 'qwen2.5-vl-72b',
    personality: params.personality || 'mentor',
    language: params.language || 'id',
    isPrivate: Boolean(params.isPrivate),
    hasImages: Boolean(params.hasImages),
    userPrompt: params.userPrompt || '',
    text: '',
    reasoningText: '',
    reasoningDuration: null,
    searchQuery: params.searchQuery || null,
    searchSources: [],
    searchImages: [],
    searchSteps: [],
    browserPages: [],
    subAgentData: null,
    browserAgentMode: params.browserAgentMode || 'auto',
    phaseDetail: '',
    error: null,
    stopped: false,
    createdAt: now,
    updatedAt: now,
    abortController: new AbortController(),
    subscribers: new Set(),
    _lastDbFlushAt: 0
  };

  // Persist initial session + user message immediately before detaching background work
  if (!job.isPrivate && job.userId && deps.db && deps.sessionDb && deps.messageDb) {
    try {
      let sess = deps.sessionDb.findById(sessionId);
      if (!sess) {
        const cleanTitle = (job.userPrompt || 'Obrolan AI').slice(0, 45).trim() || 'Obrolan AI';
        deps.sessionDb.create(sessionId, job.userId, cleanTitle);
      }
      if (job.userPrompt && !deps.messageDb.findById(userMessageId)) {
        deps.db.prepare(`
          INSERT OR REPLACE INTO chat_messages (id, sessionId, userId, role, content, personality, createdAt)
          VALUES (?, ?, ?, 'user', ?, ?, ?)
        `).run(
          userMessageId,
          sessionId,
          job.userId,
          job.userPrompt,
          job.personality,
          new Date(now).toISOString()
        );
      }
    } catch (err) {
      console.warn('[ChatJob] Early session/user save warning:', err.message);
    }
  }

  liveJobs.set(jobId, job);
  flushJobToDb(job, true);

  setImmediate(() => {
    executeJobInBackground(job, params);
  });

  return sanitizeJobPayload(job);
}

export function getJobSnapshot(jobId, caller = {}) {
  const id = String(jobId || '').trim();
  if (!id) return null;

  const live = liveJobs.get(id);
  if (live) {
    return canCallerAccessJob(live, caller) ? sanitizeJobPayload(live) : null;
  }

  if (deps.chatJobDb) {
    const dbJob = deps.chatJobDb.findById(id);
    if (dbJob && canCallerAccessJob(dbJob, caller)) {
      if (['queued', 'searching', 'thinking', 'streaming'].includes(dbJob.status) && Date.now() - dbJob.updatedAt > 20000) {
        dbJob.status = dbJob.text && dbJob.text.trim() ? 'done' : 'error';
        if (dbJob.status === 'error' && !dbJob.error) {
          dbJob.error = 'Proses terhenti karena server dimulai ulang.';
        }
        try { deps.chatJobDb.upsert(dbJob); } catch { }
      }
      return sanitizeJobPayload(dbJob);
    }
  }
  return null;
}

export function listActiveOrRecentJobs(caller = {}, maxAgeMs = 15 * 60 * 1000) {
  const sinceMs = Date.now() - maxAgeMs;
  const byId = new Map();

  for (const job of liveJobs.values()) {
    if (job.updatedAt >= sinceMs && canCallerAccessJob(job, caller)) {
      byId.set(job.id, sanitizeJobPayload(job));
    }
  }

  if (deps.chatJobDb && (caller.userId || caller.deviceId)) {
    const rows = deps.chatJobDb.findRecentForCaller({
      userId: caller.userId || null,
      deviceId: caller.deviceId || null,
      sinceMs,
      limit: 15
    });
    for (const dbJob of rows) {
      if (byId.has(dbJob.id)) continue;
      if (['queued', 'searching', 'thinking', 'streaming'].includes(dbJob.status) && Date.now() - dbJob.updatedAt > 20000) {
        dbJob.status = dbJob.text && dbJob.text.trim() ? 'done' : 'error';
        if (dbJob.status === 'error' && !dbJob.error) {
          dbJob.error = 'Proses terhenti karena server dimulai ulang.';
        }
        try { deps.chatJobDb.upsert(dbJob); } catch { }
      }
      byId.set(dbJob.id, sanitizeJobPayload(dbJob));
    }
  }

  return Array.from(byId.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function subscribeToJobStream(jobId, caller, req, res) {
  const live = liveJobs.get(String(jobId || ''));
  const snapshot = getJobSnapshot(jobId, caller);
  if (!snapshot) {
    return res.status(404).json({ success: false, error: 'Chat job not found or unauthorized' });
  }

  req.socket?.setNoDelay?.(true);
  res.socket?.setNoDelay?.(true);

  if (!res.headersSent) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  }

  // Push initial 2KB SSE comment padding so Cloudflare/HTTP2 edge proxies flush immediately at t=0
  res.write(`: ${' '.repeat(2048)}\n\nretry: 2000\n\n: connected\n\n`);
  res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
  if (typeof res.flush === 'function') res.flush();

  // If already finished on server, immediately send terminal event and close
  if (!live || ['done', 'stopped', 'error'].includes(snapshot.status)) {
    const termEvent = ['done', 'stopped', 'error'].includes(snapshot.status) ? snapshot.status : 'done';
    res.write(`event: ${termEvent}\ndata: ${JSON.stringify(snapshot)}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  live.subscribers.add(res);

  const keepalive = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(keepalive);
      live.subscribers.delete(res);
      return;
    }
    try {
      res.write(': keepalive\n\n');
      if (typeof res.flush === 'function') res.flush();
    } catch {
      clearInterval(keepalive);
      live.subscribers.delete(res);
    }
  }, 12000);

  // Detach only when the SSE response socket actually closes (never on POST req body close)
  const detachSubscriber = () => {
    clearInterval(keepalive);
    live.subscribers.delete(res);
  };
  res.on('close', detachSubscriber);
  res.on('error', detachSubscriber);
}

export function stopChatJobs({ userId = null, deviceId = null, sessionId = null, jobId = null, clientIp = null } = {}) {
  let stopped = 0;
  for (const job of Array.from(liveJobs.values())) {
    if (['done', 'stopped', 'error'].includes(job.status)) continue;
    const matchJob = jobId && job.id === jobId;
    const matchSession = sessionId && job.sessionId === String(sessionId);
    const matchUser = userId && job.userId && String(job.userId) === String(userId);
    const matchDevice = deviceId && job.deviceId && String(job.deviceId) === String(deviceId);
    const matchIp = !userId && !deviceId && clientIp && job.clientIp === clientIp;

    if (matchJob || (matchSession && (matchUser || matchDevice || !job.userId)) || (!sessionId && !jobId && (matchUser || matchDevice || matchIp))) {
      job.stopped = true;
      job.status = 'stopped';
      try {
        job.abortController.abort();
      } catch { }
      stopped++;
    }
  }
  return stopped;
}
