// ============================================================
// DeeperNova AI — Server-Side Background Chat Job Engine
// Runs AI inference + web search + verified image checking completely on the
// Node.js server detached from the HTTP client socket, so leaving/closing
// the APK/browser mid-answer NEVER kills generation or causes lost replies.
// ============================================================
import crypto from 'crypto';

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
    .replace(/<search(?:_request)?>[\s\S]*?<\/search(?:_request)?>\s*/gi, '')
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

async function runServerSearchPipeline(job, query, userPrompt, language) {
  const { webSearchService, batchPreloadImages } = deps;
  const cleanQ = sanitizeSearchQueryServer(query, userPrompt);
  job.status = 'searching';
  job.searchQuery = cleanQ;
  job.searchSteps = [{ query: cleanQ, label: 'Riset Web & Verifikasi Fakta', isSearching: true, sources: [], images: [] }];
  job.updatedAt = Date.now();
  broadcastJobEvent(job, 'status', { status: 'searching', searchQuery: cleanQ, searchSteps: job.searchSteps });
  flushJobToDb(job, true);

  let resultsList = [];
  let collectedImgCandidates = [];

  try {
    const searchRes = await webSearchService.searchGoogle(cleanQ, 16, language || 'id');
    if (searchRes?.success && Array.isArray(searchRes.results)) {
      resultsList = searchRes.results;
    }
    if (Array.isArray(searchRes?.inline_images)) {
      collectedImgCandidates = searchRes.inline_images;
    }
  } catch (err) {
    console.warn('[ChatJob] Search warning:', err.message);
  }

  // Filter valid article sources (never image thumbnails)
  const sources = [];
  const seenSrcLinks = new Set();
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
    sources.push({
      title: r.title || cleanQ,
      link,
      url: link,
      snippet: r.snippet || r.description || r.content || '',
      domain: domain.replace(/^www\./i, ''),
      thumbnail: r.thumbnail || null,
      position: sources.length + 1,
      accuracyScore: r.accuracyScore || r.score || 95,
      score: r.score || r.accuracyScore || 95,
      pagerank: r.pagerank ?? null,
      date: r.date || r.published_at || null,
      sourceEngine: r.sourceEngine || 'DeeperNova Hybrid'
    });
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
  for (const s of sources) {
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

  job.searchSources = sources;
  job.searchImages = verifiedImages.slice(0, 8);
  job.searchSteps = [{
    query: cleanQ,
    label: 'Riset Komprehensif (DeeperNova & Google)',
    isSearching: false,
    sources,
    images: verifiedImages.slice(0, 6)
  }];
  job.updatedAt = Date.now();

  broadcastJobEvent(job, 'search', {
    searchQuery: cleanQ,
    searchSources: job.searchSources,
    searchImages: job.searchImages,
    searchSteps: job.searchSteps
  });
  flushJobToDb(job, true);

  return { sources, verifiedImages };
}

function buildSearchConclusionMessages(job, sources, verifiedImages, browserContextBlock = null) {
  const nowTime = new Date();
  const currentYear = nowTime.getFullYear();
  const dateFormattedId = nowTime.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const sysPrompt =
    `Kamu adalah asisten AI yang berjalan pada model ${job.model || 'Qwen 2.5 VL 72B'} melalui platform DeeperNova AI.\n` +
    `[WAKTU REAL-TIME SEKARANG]: Tahun ${currentYear}, tanggal ${dateFormattedId}.\n` +
    `PERAN SINTESIS BERITA & HASIL PENELUSURAN WEB (MUTLAK):\n` +
    `1. STRICT ANTI-HALUSINASI: Hanya nyatakan fakta, angka, tanggal, nama tokoh, dan detail yang BENAR-BENAR ada pada data terverifikasi yang diberikan. DILARANG mengarang detail yang tidak tertulis di sumber.\n` +
    `2. LANGSUNG KE JAWABAN: Jangan berterima kasih atas hasil pencarian. Mulai paragraf pertama langsung menjawab pertanyaan.\n` +
    `3. ATURAN ANTI-URL PANJANG (ZERO-URL SPEED POLICY): DILARANG KERAS mengetik URL mentah (http://, https://, www.) di dalam teks atau link markdown — mengetik URL memakan banyak token dan memperlambat jawaban! Gunakan penanda sitasi angka singkat [1], [2], dst.\n` +
    `4. FORMAT RAPI: Awali ringkasan inti, gunakan subjudul \`###\` dan poin **tebal**. Jangan mengaitkan topik percakapan lama.\n` +
    `5. DILARANG memicu [SEARCH_REQUEST] atau [BROWSER_AGENT] lagi.`;

  let userMsg;
  if (browserContextBlock) {
    userMsg = `Pertanyaan Pengguna: "${job.userPrompt}"\n\n${browserContextBlock}\n\n`;
  } else {
    const searchContext = sources.slice(0, 6).map((s, idx) => {
      const snippet = sanitizeUntrustedWebContent(String(s.snippet || '').slice(0, 520).trim());
      return `[Sumber #${idx + 1} | Domain: ${s.domain || 'web'} | ${s.sourceEngine || 'Web'}${s.date ? ' | ' + s.date : ''}]\nJudul: ${s.title}\nKutipan:\n${snippet}`;
    }).join('\n\n---\n\n');

    userMsg = `Pertanyaan Pengguna: "${job.userPrompt}"\n\n--- DATA HASIL PENCARIAN WEB TERVERIFIKASI ---\n${searchContext || 'Tidak ada hasil teks tambahan.'}\n\n`;
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
      } catch {}
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

    // If initial turn emits [BROWSER_AGENT: ...] or [SEARCH_REQUEST: ...], stop forwarding immediately so we run server search/browser seamlessly
    if (options.detectSearchFlag) {
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
      // Hold back rendering if leading characters are a partial search/browser/subagent tag
      const trimmedLead = rawText.trimStart();
      if (/^\[(?:S|SE|SEA|SEAR|SEARC|SEARCH|E|EX|EXE|EXEC|EXECU|EXECUT|EXECUTE|W|WE|WEB|B|BR|BRO|BROW|BROWS|BROWSE|BROWSER|O|OP|OPE|OPEN)(?:_[A-Z]*)?(?::[^\]]*)?$/i.test(trimmedLead) ||
          /\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH|BROWSER_AGENT|OPEN_BROWSER|BROWSE_URL):[^\]]*$/i.test(rawText)) {
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
    // Expected when searchTagFound triggered localController.abort()
    if (!searchTagFound) {
      if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);
      if (streamErr?.name === 'AbortError' && externalSignal?.aborted) {
        throw streamErr;
      }
      console.warn('[ChatJob] Stream read interruption:', streamErr?.message);
    }
  }

  if (externalSignal) externalSignal.removeEventListener('abort', forwardAbort);

  // Flush remaining buffer
  if (thinkBuffer && !searchTagFound && !browserTagFound) {
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

async function executeJobInBackground(job, params) {
  const signal = job.abortController.signal;
  try {
    const promptUrls = extractUrlsFromText(job.userPrompt || '');
    const userWantsBrowser =
      job.browserAgentMode === 'on' ||
      promptUrls.length > 0 ||
      /\b(peramban\s+agent|browser\s+agent|buka\s+(?:web|link|url|situs|halaman)|baca\s+artikel|rangkum\s+(?:web|artikel|halaman|situs)|scrape|crawl)\b/i.test(job.userPrompt || '');

    let runBrowserQuery = (job.browserAgentMode === 'on' && params.searchQuery)
      ? sanitizeSearchQueryServer(params.searchQuery, job.userPrompt)
      : (userWantsBrowser && !params.hasImages && params.enableWebSearch !== false ? sanitizeSearchQueryServer(job.userPrompt, job.userPrompt) : null);

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

      if (firstPass.browserTagFound && !params.hasImages && params.enableWebSearch !== false) {
        runBrowserQuery = sanitizeSearchQueryServer(firstPass.browserTagFound, job.userPrompt);
      } else if (firstPass.searchTagFound && !params.hasImages && params.enableWebSearch !== false) {
        if (job.browserAgentMode === 'on') {
          runBrowserQuery = sanitizeSearchQueryServer(firstPass.searchTagFound, job.userPrompt);
        } else {
          runSearchWithQuery = sanitizeSearchQueryServer(firstPass.searchTagFound, job.userPrompt);
        }
      } else if (
        !firstPass.usedStandbyFallback &&
        params.enableWebSearch !== false &&
        shouldFallbackSearchForUncertainty(firstPass.rawText, job)
      ) {
        if (job.browserAgentMode === 'on') {
          runBrowserQuery = sanitizeSearchQueryServer(job.userPrompt, job.userPrompt);
        } else {
          runSearchWithQuery = sanitizeSearchQueryServer(job.userPrompt, job.userPrompt);
        }
      }
    }

    if (runBrowserQuery) {
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
        if (bSources.length > 0) {
          finalBrowserText = `Berdasarkan halaman yang dibaca oleh **Peramban Agent** mengenai **${job.userPrompt || job.searchQuery}**:\n\n` +
            bSources.slice(0, 4).filter(s => s.snippet).map((s, idx) => `- **${s.title}**: ${s.snippet} [${idx + 1}]`).join('\n\n');
        } else {
          finalBrowserText = 'Maaf, Peramban Agent tidak menemukan konten halaman yang dapat dibaca saat ini.';
        }
      }
      job.text = finalBrowserText;
    } else if (runSearchWithQuery) {
      // Wipe any pre-search speculation before running web search
      job.text = '';
      job.reasoningText = '';
      job.reasoningDuration = null;
      const { sources, verifiedImages } = await runServerSearchPipeline(job, runSearchWithQuery, job.userPrompt, job.language);

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      job.status = 'thinking';
      job.phaseDetail = job.language === 'id' ? 'Merangkum fakta terverifikasi...' : 'Synthesizing verified facts...';
      broadcastJobEvent(job, 'status', { status: 'thinking', phaseDetail: job.phaseDetail });
      flushJobToDb(job, true);

      const conclusionMessages = buildSearchConclusionMessages(job, sources, verifiedImages);
      const conclusionPass = await streamLlmToJob(
        job,
        conclusionMessages,
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

      let finalSearchText = replaceCitationsServer(cleanAssistantFinalText(conclusionPass.rawText || job.text), sources);
      if (!finalSearchText || !finalSearchText.trim()) {
        if (sources.length > 0) {
          finalSearchText = `Berdasarkan penelusuran web terkini mengenai **${job.userPrompt || job.searchQuery}**:\n\n` +
            sources.slice(0, 4).filter(s => s.snippet).map((s, idx) => `- **${s.title}**: ${s.snippet} [${idx + 1}]`).join('\n\n');
        } else {
          finalSearchText = 'Maaf, belum ditemukan hasil pencarian yang cukup jelas saat ini.';
        }
      }
      job.text = finalSearchText;
    } else {
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
        } catch {}
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
        try { deps.chatJobDb.upsert(dbJob); } catch {}
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
        try { deps.chatJobDb.upsert(dbJob); } catch {}
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
      } catch {}
      stopped++;
    }
  }
  return stopped;
}
