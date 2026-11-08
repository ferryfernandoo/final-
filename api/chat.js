export const config = {
  runtime: 'edge',
};

// SECURITY: API keys are loaded ONLY from environment variables (Vercel Project Settings → Environment Variables).
// Never hardcode secrets in source code.
const TOKENMIX_API_KEYS = Array.from(new Set([
  ...String(process.env.TOKENMIX_API_KEYS || '').split(','),
  process.env.TOKENMIX_API_KEY,
  process.env.TOKENMIX_SECONDARY_API_KEY,
  process.env.TOKENMIX_FALLBACK_API_KEY
].map(k => (k || '').trim()).filter(Boolean)));

const FALLBACK_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'https://pool-jimmy-landscapes-relationships.trycloudflare.com';

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
    model = 'deepernova-silicon-1.4',
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
  if (TOKENMIX_API_KEYS.length === 0 && FALLBACK_BACKEND_URL) {
    const sameOriginUpstream = new URL('/api/upstream/chat', req.url).toString();
    const payloadStr = JSON.stringify(body);
    let lastProxyErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const proxyResp = await fetch(sameOriginUpstream, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': req.headers.get('x-device-id') || body.deviceId || 'guest_device',
          },
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

  const reqLower = (model || '').toLowerCase();
  let currentBrandedName = 'DeeperNova Silicon 1.4';
  if (reqLower.includes('gold')) {
    currentBrandedName = reqLower.includes('pro') ? 'DeeperNova Gold 1.5 Pro' : 'DeeperNova Gold 1.5';
  } else if (reqLower.includes('boron')) {
    currentBrandedName = 'DeeperNova Boron 1.1';
  }

  let systemPrompt =
    `Kamu adalah ${currentBrandedName}, asisten kecerdasan buatan Indonesia yang sangat cerdas, adaptif, berdaya nalar tinggi, dan memiliki daya ingat konteks percakapan yang tajam buatan DeeperNova AI Indonesia.\n` +
    `[WAKTU REAL-TIME SEKARANG]: Tahun ${yearServer}, tanggal ${todayServerId}.\n` +
    `ATURAN KETAT IDENTITAS: JANGAN PERNAH mengaku atau menyebut bahwa kamu adalah Doubao, ByteDance, Qwen, Alibaba, Llama, Meta AI, atau pihak lain. Jika ditanya identitas, tegaskan bahwa kamu adalah ${currentBrandedName} buatan DeeperNova AI Indonesia.\n` +
    `[INFORMASI RESMI KEPEMIMPINAN & PENGEMBANGAN - HANYA JIKA DITANYA]:\n` +
    `- Founder: Ferry Fernando\n` +
    `- CEO: Ferry Fernando\n` +
    `- Wakil CEO: Anju Malinton Pakpahan\n` +
    `- Tim Pengembang: Proyek ini dikembangkan bersama tim AI yang sangat besar di belakang DeeperNova AI.\n` +
    `- Metode Pengembangan AI: AI ini dikembangkan oleh model AI DeeperNova generasi sebelumnya, di mana seluruh proses pengembangan berjalan secara otonom penuh (full autonomous).\n` +
    `ATURAN MUTLAK KEPEMIMPINAN: Jawaban di atas WAJIB diberikan secara lengkap dan tepat jika pengguna menanyakan siapa founder, siapa CEO, siapa wakil CEO, siapa pembuat/pencipta/tim di balik DeeperNova AI, atau bagaimana AI ini dikembangkan. JANGAN PERNAH menyebutkan hal ini jika pengguna tidak menanyakannya (hanya jika ditanya saja).\n` +
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
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const userText = (lastUserMsg?.content || '').trim();
  const isSearchIntent = body.webSearch === true ||
    /\b(cari\s+(di\s+)?(internet|web|google)|tolong\s+cari|berita\s+terbaru|kabar\s+terkini|harga\s+terbaru|hari\s+ini|jadwal\s+hari\s+ini|skor\s+pertandingan|siapa\s+juara|kurs\s+dollar|cuaca)\b/i.test(userText);

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

  // Model selection
  let selectedUpstreamModel = 'gemini-2.5-flash';
  if (enableReasoning) {
    selectedUpstreamModel = 'doubao-seed-2.0-lite';
  }

  // Rotate across TokenMix keys
  let upstreamResponse = null;
  let lastErr = null;

  for (let i = 0; i < TOKENMIX_API_KEYS.length; i++) {
    const key = TOKENMIX_API_KEYS[i];
    try {
      const resp = await fetch('https://api.tokenmix.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: selectedUpstreamModel,
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
        lastErr = new Error(`Key ${i} failed: ${resp.status} ${errTxt.slice(0, 100)}`);
      }
    } catch (e) {
      lastErr = e;
    }
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
          .replace(/\bByteDance\b/gi, 'DeeperNova AI')
          .replace(/\bTokenMix\b/gi, 'DeeperNova AI');
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
      .replace(/\bByteDance\b/gi, 'DeeperNova AI')
      .replace(/\bTokenMix\b/gi, 'DeeperNova AI');
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

