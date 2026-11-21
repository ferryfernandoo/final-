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

function cleanAssistantFinalText(raw = '') {
  return String(raw || '')
    .replace(/\bDoubao\b/gi, 'DeeperNova AI')
    .replace(/\bByteDance\b/gi, 'DeeperNova AI')
    .replace(/<\/?(?:think|reasoning|thought)>/gi, '')
    .replace(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[^\]]*\]\s*/gi, '')
    .replace(/<search(?:_request)?>[\s\S]*?<\/search(?:_request)?>\s*/gi, '')
    .trim();
}

function formatBubbleDomainServer(rawDomain = '') {
  const clean = String(rawDomain || '').replace(/^www\./i, '').trim();
  if (!clean) return 'Web';
  const parts = clean.split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

function replaceCitationsServer(text = '', sources = []) {
  if (!text || !Array.isArray(sources) || sources.length === 0) return text;
  return text.replace(/\[Sumber\s*#?\s*(\d+)[^\]]*\](?!\()/gi, (match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    if (idx >= 0 && idx < sources.length) {
      const s = sources[idx];
      if (!s?.link) return '';
      return `[${formatBubbleDomainServer(s.domain)}](${s.link})`;
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

function buildSearchConclusionMessages(job, sources, verifiedImages) {
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
    `PERAN SINTESIS BERITA & HASIL PENCARIAN WEB (MUTLAK):\n` +
    `1. STRICT ANTI-HALUSINASI: Hanya nyatakan fakta, angka, tanggal, nama tokoh, dan detail yang BENAR-BENAR ada pada data hasil pencarian web yang diberikan. DILARANG mengarang detail yang tidak tertulis di sumber.\n` +
    `2. LANGSUNG KE JAWABAN: Jangan berterima kasih atas hasil pencarian. Mulai paragraf pertama langsung menjawab pertanyaan.\n` +
    `3. FORMAT RAPI & SITASI LINK: Awali ringkasan inti, gunakan subjudul \`###\` dan poin **tebal**, cantumkan sitasi ringkas \`[Nama Web](URL)\`. Jangan mengaitkan topik percakapan lama.\n` +
    `4. DILARANG memicu [SEARCH_REQUEST] atau [EXECUTE_SEARCH] lagi.`;

  const searchContext = sources.slice(0, 6).map((s, idx) => {
    const snippet = String(s.snippet || '').slice(0, 480).trim();
    return `[Sumber #${idx + 1} | ${s.sourceEngine || 'Web'}${s.date ? ' | ' + s.date : ''}]\nJudul: ${s.title}\nURL: ${s.link}\nKutipan:\n${snippet}`;
  }).join('\n\n---\n\n');

  let userMsg = `Pertanyaan Pengguna: "${job.userPrompt}"\n\n--- DATA HASIL PENCARIAN WEB TERVERIFIKASI ---\n${searchContext || 'Tidak ada hasil teks tambahan.'}\n\n`;
  if (verifiedImages.length > 0) {
    userMsg += `--- DAFTAR FOTO TERVERIFIKASI ---\n` +
      verifiedImages.slice(0, 4).map((img, i) => `[Foto #${i + 1}] "${String(img.title || '').replace(/[\[\]]/g, '').trim()}" | URL: ${img.url}`).join('\n') +
      `\n- Boleh sisipkan foto relevan di bawah subjudul memakai \`![Keterangan](URL_Foto)\`. DILARANG mengarang URL lain.\n\n`;
  } else {
    userMsg += `- Tidak ada foto terverifikasi yang dapat ditampilkan. DILARANG menyisipkan tag atau URL gambar (![...](...)).\n\n`;
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
  let reasoningStartMs = null;

  const emitReasoning = (chunk) => {
    if (!chunk) return;
    if (!reasoningStartMs) reasoningStartMs = Date.now();
    reasoningText += chunk;
    if (options.enableReasoning) {
      job.reasoningText = reasoningText;
      if (job.status !== 'streaming' && job.status !== 'searching') {
        job.status = 'thinking';
      }
      broadcastJobEvent(job, 'reasoning_delta', { delta: chunk, reasoningText });
      flushJobToDb(job, false);
    }
  };

  const emitContent = (chunk) => {
    if (!chunk) return;
    if (reasoningStartMs && !job.reasoningDuration && options.enableReasoning) {
      job.reasoningDuration = Math.max(0.1, (Date.now() - reasoningStartMs) / 1000).toFixed(1);
    }
    rawText += chunk;

    // If initial turn emits [SEARCH_REQUEST: ...], stop forwarding immediately so we run server search seamlessly
    if (options.detectSearchFlag) {
      const m = rawText.match(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):\s*(.+?)\]/i) ||
        rawText.match(/<search(?:_request)?>\s*([\s\S]+?)\s*<\/search(?:_request)?>/i);
      if (m && m[1]) {
        searchTagFound = m[1].trim();
        localController.abort();
        return;
      }
      // Hold back rendering if leading characters are a partial search/subagent tag
      const trimmedLead = rawText.trimStart();
      if (/^\[(?:S|SE|SEA|SEAR|SEARC|SEARCH|E|EX|EXE|EXEC|EXECU|EXECUT|EXECUTE|W|WE|WEB)(?:_[A-Z]*)?(?::[^\]]*)?$/i.test(trimmedLead) ||
          /\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[^\]]*$/i.test(rawText)) {
        return;
      }
    }

    job.status = 'streaming';
    const cleanDelta = chunk.replace(/\bDoubao\b/gi, 'DeeperNova AI').replace(/\bByteDance\b/gi, 'DeeperNova AI');
    job.text = cleanAssistantFinalText(rawText);
    broadcastJobEvent(job, 'content_delta', { delta: cleanDelta, text: job.text });
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
  if (thinkBuffer && !searchTagFound) {
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
    let runSearchWithQuery = params.searchQuery ? sanitizeSearchQueryServer(params.searchQuery, job.userPrompt) : null;
    let firstPass = null;

    if (!runSearchWithQuery) {
      job.status = 'thinking';
      broadcastJobEvent(job, 'status', { status: 'thinking' });
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

      if (firstPass.searchTagFound && !params.hasImages && params.enableWebSearch !== false) {
        runSearchWithQuery = sanitizeSearchQueryServer(firstPass.searchTagFound, job.userPrompt);
      } else if (
        !firstPass.usedStandbyFallback &&
        params.enableWebSearch !== false &&
        shouldFallbackSearchForUncertainty(firstPass.rawText, job)
      ) {
        runSearchWithQuery = sanitizeSearchQueryServer(job.userPrompt, job.userPrompt);
      }
    }

    if (runSearchWithQuery) {
      // Wipe any pre-search speculation before running web search
      job.text = '';
      job.reasoningText = '';
      job.reasoningDuration = null;
      const { sources, verifiedImages } = await runServerSearchPipeline(job, runSearchWithQuery, job.userPrompt, job.language);

      if (signal.aborted || job.stopped) {
        throw Object.assign(new Error('Stopped by user'), { name: 'AbortError' });
      }

      job.status = 'thinking';
      broadcastJobEvent(job, 'status', { status: 'thinking' });
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
            sources.slice(0, 4).filter(s => s.snippet).map(s => `- **${s.title}**: ${s.snippet} [${formatBubbleDomainServer(s.domain)}](${s.link})`).join('\n\n');
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

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 2000\n\n: connected\n\n');
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

  // Disconnecting HTTP socket ONLY detaches this subscriber — NEVER stops the server job!
  req.on('close', () => {
    clearInterval(keepalive);
    live.subscribers.delete(res);
  });
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
