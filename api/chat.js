export const config = {
  runtime: 'edge',
};

// SECURITY: API keys are loaded ONLY from environment variables (Vercel Project Settings → Environment Variables).
// Never hardcode secrets in source code. Zero external paid gateway dependencies; 100% FreeLLM focused.
const getEdgeFreeLlmTargets = () => {
  const targets = [];
  const gatewayUrl = (process.env.FREELLM_API_URL || '').trim();
  const gatewayKeys = Array.from(new Set([
    ...String(process.env.FREELLM_API_KEYS || '').split(','),
    process.env.FREELLM_API_KEY,
    process.env.FREELLM_SECONDARY_API_KEY,
    process.env.FREELLM_FALLBACK_API_KEY
  ].map(k => (k || '').trim()).filter(Boolean)));
  if (gatewayUrl && gatewayKeys.length > 0) {
    for (const k of gatewayKeys) {
      targets.push({ platform: 'freellmapi', url: gatewayUrl, key: k });
    }
  }
  const direct = [
    { platform: 'groq', env: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions' },
    { platform: 'gemini', env: 'GEMINI_API_KEY', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
    { platform: 'openrouter', env: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1/chat/completions' },
    { platform: 'cerebras', env: 'CEREBRAS_API_KEY', url: 'https://api.cerebras.ai/v1/chat/completions' },
    { platform: 'mistral', env: 'MISTRAL_API_KEY', url: 'https://api.mistral.ai/v1/chat/completions' }
  ];
  for (const p of direct) {
    for (const k of String(process.env[p.env] || '').split(',').map(s => s.trim()).filter(Boolean)) {
      targets.push({ platform: p.platform, url: p.url, key: k });
    }
  }
  return targets;
};

const FALLBACK_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'https://liberty-bracelet-mayor-gaps.trycloudflare.com';

const SERVER_PERSONALITY_PROMPTS = {
  casual: '\n\n[ARAHAN KEPRIBADIAN MUTLAK - CASUAL, SANTAI & AKRAB]:\n- Wajib bicara santai, luwes, dan akrab seperti teman karib (gunakan aku-kamu, partikel nih, yuk, dong, loh, santai aja).\n- DILARANG KERAS menggunakan bahasa baku, kaku, formal, atau seperti surat dinas!',
  friendly: '\n\n[ARAHAN KEPRIBADIAN MUTLAK - FRIENDLY / RAMAH & HANGAT]:\n- Bersikap sangat ramah, hangat, manis, penuh empati, dan bersahabat. Bahasa mengalir santun dan luwes.',
  witty: '\n\n[ARAHAN KEPRIBADIAN MUTLAK - WITTY / CERDAS & HUMORIS]:\n- Cerdas, cerdik, humoris, sedikit usil/centil dengan analogi segar yang membuat tersenyum.',
  cute: '\n\n[ARAHAN KEPRIBADIAN MUTLAK - CUTE / GEMAS & RAMAH]:\n- Sangat manis, imut, ceria, dan menggemaskan dengan emoji yang pas (✨, 🥰, 😊).',
  formal: '\n\n[ARAHAN KEPRIBADIAN MUTLAK - FORMAL / PROFESIONAL & RESMI]:\n- Profesional, rapi, santun, dan terstruktur resmi.',
  mentor: '\n\n[ARAHAN KEPRIBADIAN MUTLAK - MENTOR / BIJAKSANA & MEMBIMBING]:\n- Sabar, bijaksana, mendidik, dan membimbing penuh kehangatan.'
};

export default async function handler(req) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    messages = [],
    model = 'qwen2.5-vl-72b',
    stream = false,
    personality = 'friendly',
    language = 'id',
    temperature = 0.5,
    max_tokens = 4096,
    enableReasoning = false
  } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fast-path: When keys are stored in the local server's .env (not in Vercel Edge env),
  // forward immediately to /api/upstream/chat with automatic retry and zero Edge delay.
  const edgeTargets = getEdgeFreeLlmTargets();
  if (edgeTargets.length === 0 && FALLBACK_BACKEND_URL) {
    const sameOriginUpstream = new URL('/api/upstream/chat', req.url).toString();
    const payloadStr = JSON.stringify(body);
    let lastProxyErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const forwardHeaders = {
          'Content-Type': 'application/json',
          'x-device-id': req.headers.get('x-device-id') || body.deviceId || 'guest_device',
        };
        const incomingCookie = req.headers.get('cookie');
        if (incomingCookie) {
          forwardHeaders['cookie'] = incomingCookie;
        }
        const proxyResp = await fetch(sameOriginUpstream, {
          method: 'POST',
          headers: forwardHeaders,
          body: payloadStr,
        });
        if (proxyResp.ok) {
          return new Response(proxyResp.body, {
            status: 200,
            headers: {
              'Content-Type': proxyResp.headers.get('content-type') || (stream ? 'text/event-stream; charset=utf-8' : 'application/json'),
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        const errBody = await proxyResp.text().catch(() => '');
        lastProxyErr = new Error(`Upstream ${proxyResp.status}: ${errBody.slice(0, 120)}`);
      } catch (e) {
        lastProxyErr = e;
      }
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    return new Response(JSON.stringify({
      error: 'DeeperNova AI sedang sibuk memproses antrean. Silakan coba kembali dalam beberapa saat.',
      detail: lastProxyErr ? lastProxyErr.message : 'Upstream unavailable'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const nowServer = new Date();
  const yearServer = nowServer.getFullYear();
  const todayServerId = nowServer.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const HONEST_EDGE_NAMES = {
    'qwen2.5-vl-72b': 'Qwen 2.5 VL 72B',
    'nemotron-3-ultra-550b': 'NVIDIA Nemotron 3 Ultra 550B',
    'nemotron-3.5-lightning': 'NVIDIA Nemotron 3.5 Lightning',
    'north-mini-code': 'Cohere North Mini Code',
    'free-router': 'FreeRouter Auto (FreeLLM)',
    'nemotron-3.5-super-vl': 'NVIDIA Nemotron 3.5 Super VL'
  };
  const reqLower = String(model || '').toLowerCase().trim();
  const currentModelDisplay = HONEST_EDGE_NAMES[reqLower] || model || 'Qwen 2.5 VL 72B';

  let systemPrompt =
    `Kamu adalah asisten AI berbahasa Indonesia yang berjalan pada model ${currentModelDisplay} melalui platform DeeperNova AI.\n` +
    `[WAKTU REAL-TIME SEKARANG]: Tahun ${yearServer}, tanggal ${todayServerId}.\n` +
    `TRANSPARANSI MODEL: Jika pengguna menanyakan model apa yang sedang berjalan, jawablah dengan jujur sesuai model aktif (${currentModelDisplay}).\n` +
    `[INFORMASI PLATFORM DEEPERNOVA - HANYA JIKA DITANYA]: Founder & CEO: Ferry Fernando, Wakil CEO: Anju Malinton Pakpahan. Jangan sebut jika tidak ditanya.\n` +
    'ATURAN GAYA KOMUNIKASI (MUTLAK):\n' +
    '1. SESUAIKAN DENGAN KEPRIBADIAN AKTIF: Ikuti kepribadian yang ditentukan. Jika Casual, bicaralah santai mengalir (aku-kamu, santai, asyik, jangan kaku atau baku). Jika Friendly, bicaralah hangat, bersahabat, santun luwes. Jika Formal, bicaralah resmi dan profesional.\n' +
    '2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana atau sapaan ("halo", "hai"), jawab secara padat, manis, dan langsung to-the-point (1-3 kalimat). Jangan bertele-tele.\n' +
    '3. SUB-AGENT ORCHESTRATOR SINKRON DI CHATBOT (AKTIVASI VIA FLAG): Jika pengguna meminta mengaktifkan sub-agent/mode agentic, ATAU meminta dibuatkan/dikirimkan berkas/file kode, website, landing page, aplikasi web, game, kalkulator, dashboard, script Python/JS/HTML/CSS/SQL/JSON, atau proyek multi-file: Jawab biasa secara ramah terlebih dahulu dalam 1-2 kalimat singkat, lalu akhiri dengan flag: [SUBAGENT_ORCHESTRATE: deskripsi tugas dan file yang harus dibuat] dan LANGSUNG BERHENTI.';

  const effPersonality = (personality || 'friendly').toLowerCase();
  if (SERVER_PERSONALITY_PROMPTS[effPersonality]) {
    systemPrompt = SERVER_PERSONALITY_PROMPTS[effPersonality] + '\n\n' + systemPrompt;
  }

  const effLanguage = (language || 'id').toLowerCase();
  if (effLanguage === 'en') {
    systemPrompt += '\n\n[MANDATORY SYSTEM DIRECTIVE - STRICT ENGLISH LANGUAGE REQUIREMENT]: You MUST communicate, reason, and answer entirely in English.';
  } else if (effLanguage === 'zh') {
    systemPrompt += '\n\n[MANDATORY SYSTEM DIRECTIVE - STRICT CHINESE LANGUAGE REQUIREMENT]: 你必须全程使用中文进行沟通、思考与回答。';
  } else {
    systemPrompt += '\n\n[DIREKTIF SISTEM MUTLAK - BAHASA INDONESIA]: Berikan jawaban, penalaran, dan penjelasan selalu dalam Bahasa Indonesia yang alami, bersahabat, dan mengalir.';
  }

  // Autonomous Real-Time Web Search Augmentation on Edge
  const normalizeContentText = (content) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(item => (typeof item === 'string' ? item : item?.text || '')).filter(Boolean).join(' ');
    }
    return '';
  };

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const userText = normalizeContentText(lastUserMsg?.content).trim();
  const hasImagesInPayload = (Array.isArray(body.uploadedImages) && body.uploadedImages.length > 0) ||
    messages.some(m => Array.isArray(m.content) && m.content.some(c => c && (c.type === 'image_url' || c.image_url)));

  if (hasImagesInPayload && !systemPrompt.includes('KEMAMPUAN VISION')) {
    systemPrompt += '\n\nKEMAMPUAN VISION (MUTLAK):\n- Pengguna telah melampirkan gambar. Kamu memiliki kemampuan visual dan analisis gambar secara penuh.\n- Analisis dan jelaskan gambar tersebut secara akurat, detail, dan langsung sesuai pertanyaan pengguna.\n- DILARANG KERAS mengatakan bahwa kamu tidak bisa melihat gambar atau meminta pengguna mengunggah ulang!';
  }

  const isSearchIntent = !hasImagesInPayload && (body.webSearch === true ||
    /\b(cari\s+(di\s+)?(internet|web|google)|tolong\s+cari|berita\s+terbaru|kabar\s+terkini|harga\s+terbaru|hari\s+ini|jadwal\s+hari\s+ini|skor\s+pertandingan|siapa\s+juara|kurs\s+dollar|cuaca)\b/i.test(userText));

  if (isSearchIntent && userText.length < 350 && !userText.includes('DATA HASIL PENCARIAN') && !userText.includes('INSTRUKSI SISTEM') && !userText.includes('### Hasil Pencarian')) {
    try {
      const qClean = userText
        .replace(/\b(coba\s+)?(tolong\s+)?(cari(?:kan)?\s+(?:di\s+(?:internet|web|google)\s+)?(?:tentang\s+|soal\s+)?|apa\s+kabar\s+|apa\s+saja\s+|berita\s+)\b/gi, '')
        .replace(/[?.,!]/g, '')
        .trim();
      const searchQuery = qClean.length >= 2 ? qClean : userText.slice(0, 50);

      const enc = encodeURIComponent(searchQuery);
      const hl = effLanguage === 'zh' ? 'zh-cn' : (effLanguage === 'en' ? 'en-US' : 'id');
      const gl = effLanguage === 'zh' ? 'CN' : (effLanguage === 'en' ? 'US' : 'ID');
      const ceid = effLanguage === 'zh' ? 'CN:zh-Hans' : (effLanguage === 'en' ? 'US:en' : 'ID:id');
      const googleNewsUrl = `https://news.google.com/rss/search?q=${enc}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

      const ctrl = new AbortController();
      const tOut = setTimeout(() => ctrl.abort(), 2800);
      const [googleResp, wikiResp] = await Promise.allSettled([
        fetch(googleNewsUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
          signal: ctrl.signal
        }),
        fetch(`https://${effLanguage === 'en' ? 'en' : 'id'}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${enc}&utf8=&format=json&srlimit=2`, {
          signal: ctrl.signal
        })
      ]);
      clearTimeout(tOut);

      let searchContext = `\n\n[DATA HASIL PENCARIAN REAL-TIME TERKINI GOOGLE & WEB - "${searchQuery}"]:\n`;
      let foundCount = 0;

      if (googleResp.status === 'fulfilled' && googleResp.value.ok) {
        const xml = await googleResp.value.text();
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
        for (const m of items.slice(0, 6)) {
          const itemXml = m[1];
          const title = itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').replace(/<[^>]+>/g, '').trim();
          const link = itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim();
          const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]?.trim() || 'Google Search';
          const desc = itemXml.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').replace(/<[^>]+>/g, ' ').trim();
          if (title && link) {
            foundCount++;
            searchContext += `[${foundCount}] [Google / ${source}] ${title}\nURL: ${link}\nRingkasan: ${desc || title}\n`;
          }
        }
      }

      if (wikiResp.status === 'fulfilled' && wikiResp.value.ok) {
        const wikiData = await wikiResp.value.json().catch(() => null);
        if (wikiData?.query?.search) {
          for (const w of wikiData.query.search.slice(0, 2)) {
            foundCount++;
            const wTitle = w.title;
            const wLink = `https://${effLanguage === 'en' ? 'en' : 'id'}.wikipedia.org/wiki/${encodeURIComponent(wTitle.replace(/\s+/g, '_'))}`;
            const wSnippet = (w.snippet || '').replace(/<[^>]+>/g, ' ').trim();
            searchContext += `[${foundCount}] [Wikipedia] ${wTitle}\nURL: ${wLink}\nRingkasan: ${wSnippet}\n`;
          }
        }
      }

      if (foundCount > 0) {
        systemPrompt += searchContext + '\nPETUNJUK SINTESIS: Gunakan data hasil pencarian Google & Web real-time di atas untuk menjawab secara akurat, faktual, dan sertakan sitasi link sumber jika relevan.\n';
      }
    } catch (e) {
      console.warn('[Edge Chat QuickSearch] Non-fatal search error:', e.message);
    }
  }

  // Build sanitized final messages
  const isSubAgentStage =
    body.isSubAgentStage === true ||
    messages.some(
      (m) =>
        typeof m?.content === 'string' &&
        (m.content.includes('[SUBAGENT_STAGE_PROMPT]') ||
          m.content.includes('<SUBAGENT_PLAN>') ||
          m.content.includes('<SUBAGENT_FILE'))
    );
  const finalMessages = [];
  const clientSys = messages.find(m => m.role === 'system');
  if (isSubAgentStage && clientSys && clientSys.content) {
    finalMessages.push({ role: 'system', content: clientSys.content });
  } else if (clientSys && clientSys.content) {
    finalMessages.push({ role: 'system', content: `${systemPrompt}\n\n${clientSys.content}` });
  } else {
    finalMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const m of messages) {
    if (m.role !== 'system' && m.content) {
      finalMessages.push({ role: m.role, content: m.content });
    }
  }

  // Ensure vision formatting if uploadedImages provided in body and not yet in the last user message
  if (Array.isArray(body.uploadedImages) && body.uploadedImages.length > 0) {
    for (let i = finalMessages.length - 1; i >= 0; i--) {
      if (finalMessages[i].role === 'user') {
        const currentContent = finalMessages[i].content;
        const contentArray = [];
        if (typeof currentContent === 'string') {
          contentArray.push({ type: 'text', text: currentContent });
        } else if (Array.isArray(currentContent)) {
          contentArray.push(...currentContent);
        }
        for (const img of body.uploadedImages) {
          const imgUrl = typeof img === 'string' ? img : (img.dataUrl || img.publicUrl || img.imageUrl || img.url);
          if (imgUrl && !contentArray.some(c => (c?.image_url?.url === imgUrl || c?.image_url === imgUrl))) {
            contentArray.push({ type: 'image_url', image_url: { url: imgUrl } });
          }
        }
        finalMessages[i].content = contentArray;
        break;
      }
    }
  }

  // Honest FreeLLM Model selection (Zero DeepSeek / Zero TokenMix / Zero fake branding)
  const envChatModel = (process.env.FREELLM_CHAT_MODEL || '').trim();
  const fastDefaultModel = (!envChatModel || envChatModel === 'auto') ? 'qwen2.5-vl-72b' : envChatModel;
  const reqModelLower = String(model || '').toLowerCase().trim();
  const FAST_POOL = ['qwen2.5-vl-72b', 'free-router', 'north-mini-code', 'nemotron-3.5-lightning', 'nemotron-3-ultra-550b'];
  const DIRECT_REAL_MODELS = new Set([
    'qwen2.5-vl-72b',
    'nemotron-3-ultra-550b',
    'nemotron-3.5-lightning',
    'north-mini-code',
    'free-router',
    'nemotron-3.5-super-vl',
    'dots3-note-preview',
    'gpt-oss-120b',
    'gpt-oss-20b',
    'llama-3.3-70b'
  ]);
  const isGrok46 = reqModelLower.includes('grok-4.6') || reqModelLower === 'grok';
  const isUltra = reqModelLower.includes('550b') || reqModelLower.includes('4.6-giga') || reqModelLower.includes('giga') || (reqModelLower.includes('gold') && reqModelLower.includes('pro'));
  const isCodeTier = reqModelLower.includes('north-mini') || reqModelLower.includes('2.3-pro') || reqModelLower.includes('2.3');
  const isLightning = reqModelLower.includes('lightning') || reqModelLower.includes('silicon');

  const freellmCandidates = hasImagesInPayload
    ? ['qwen2.5-vl-72b', 'auto']
    : DIRECT_REAL_MODELS.has(reqModelLower)
      ? Array.from(new Set([reqModelLower, ...FAST_POOL]))
      : isUltra
        ? ['nemotron-3-ultra-550b', 'nemotron-3.5-lightning', 'qwen2.5-vl-72b', 'free-router']
        : isCodeTier
          ? ['north-mini-code', 'free-router', 'qwen2.5-vl-72b', 'nemotron-3.5-lightning']
          : isLightning
            ? ['nemotron-3.5-lightning', 'qwen2.5-vl-72b', 'north-mini-code', 'free-router']
            : isGrok46
              ? ['free-router', 'nemotron-3-ultra-550b', 'qwen2.5-vl-72b']
              : (enableReasoning
                ? ['nemotron-3-ultra-550b', 'nemotron-3.5-super-vl', 'qwen2.5-vl-72b', 'free-router']
                : Array.from(new Set([fastDefaultModel, ...FAST_POOL])));

  const edgePlanByPlatform = {
    freellmapi: freellmCandidates,
    groq: hasImagesInPayload ? ['meta-llama/llama-4-maverick-17b-128e-instruct'] : ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    gemini: isUltra ? ['gemini-2.5-flash'] : ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
    openrouter: ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free'],
    cerebras: isUltra ? ['llama-3.3-70b'] : ['llama3.1-8b', 'llama-3.3-70b'],
    mistral: ['mistral-small-latest']
  };

  let upstreamResponse = null;
  let lastErr = null;

  for (const target of edgeTargets) {
    const models = edgePlanByPlatform[target.platform] || ['qwen2.5-vl-72b', 'free-router'];
    for (const modelToTry of models) {
      const attemptAbort = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        attemptAbort.abort();
      }, (modelToTry.includes('550b') || modelToTry.includes('smart')) ? 13000 : 8500);
      try {
        const resp = await fetch(target.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${target.key}`,
          },
          signal: attemptAbort.signal,
          body: JSON.stringify({
            model: modelToTry,
            messages: finalMessages,
            temperature,
            max_tokens,
            stream: Boolean(stream),
          }),
        });

        if (resp.ok) {
          upstreamResponse = resp;
          break;
        } else {
          const errTxt = await resp.text();
          lastErr = new Error(`${target.platform} model ${modelToTry} failed: ${resp.status} ${errTxt.slice(0, 100)}`);
          if (resp.status === 401 || resp.status === 403) break;
        }
      } catch (e) {
        lastErr = e;
        if (timedOut) {
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    if (upstreamResponse && upstreamResponse.ok) break;
  }

  // If no env keys configured on Edge yet, proxy securely via Vercel CDN rewrite to the local backend server (which holds .env locally)
  if (!upstreamResponse && FALLBACK_BACKEND_URL) {
    try {
      const sameOriginUpstream = new URL('/api/upstream/chat', req.url).toString();
      const proxyResp = await fetch(sameOriginUpstream, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (proxyResp.ok) {
        return new Response(proxyResp.body, {
          status: 200,
          headers: {
            'Content-Type': proxyResp.headers.get('content-type') || (stream ? 'text/event-stream; charset=utf-8' : 'application/json'),
            'Cache-Control': 'no-cache, no-transform',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        const errBody = await proxyResp.text().catch(() => '');
        lastErr = new Error(`Upstream proxy ${proxyResp.status}: ${errBody.slice(0, 100)}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!upstreamResponse || !upstreamResponse.ok) {
    return new Response(JSON.stringify({
      error: 'DeeperNova AI sedang sibuk memproses antrean. Silakan coba kembali dalam beberapa saat.',
      detail: lastErr ? lastErr.message : 'Upstream error'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle SSE streaming
  if (stream) {
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const sanitized = text
          .replace(/\bDoubao\b/gi, 'DeeperNova')
          .replace(/\bByteDance\b/gi, 'DeeperNova AI');
        controller.enqueue(new TextEncoder().encode(sanitized));
      }
    });

    return new Response(upstreamResponse.body.pipeThrough(transformStream), {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Handle standard JSON response
  let data = await upstreamResponse.json();
  if (data?.choices?.[0]?.message?.content) {
    data.choices[0].message.content = data.choices[0].message.content
      .replace(/\bDoubao\b/gi, 'DeeperNova')
      .replace(/\bByteDance\b/gi, 'DeeperNova AI');
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

