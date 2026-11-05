export const config = {
  runtime: 'edge',
};

const TOKENMIX_API_KEYS = [
  'sk-tm-dchQ1crRbE6qPxNKCPjzHUEdgFCntueI2iE0nd1xnmDpYQGx',
  'sk-tm-U4ztHnSkcAQPYA4P1JLjaD9gSfRSynMzgEPMoy8yQ0QbtISf',
  'sk-tm-pxz99Fb7kULMv7YBAiJw3VsJaEbba93O2ZYdlK4EwGDjDVTK',
  'sk-tm-DLARtQO8J2MrB8irZM0vuEV01ohUru7iZj9XyG6jueRGhzyk'
];

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
    '2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana atau sapaan ("halo", "hai"), jawab secara padat, manis, dan langsung to-the-point (1-3 kalimat). Jangan bertele-tele.';

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

  // Build sanitized final messages
  const finalMessages = [];
  const clientSys = messages.find(m => m.role === 'system');
  if (clientSys && clientSys.content) {
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

