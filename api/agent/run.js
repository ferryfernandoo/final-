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

const FALLBACK_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'https://glow-por-resume-conferencing.trycloudflare.com';

export default async function handler(req) {
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const {
    sessionId = 'agent_default',
    prompt = '',
    model = 'deepernova-gold-1.5',
    history = [],
    language = 'id'
  } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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

  const agentSystemPrompt =
    `Kamu adalah DeeperNova Autonomous AI Agent, agen cerdas berkemampuan penalaran tinggi, pemecahan masalah mandiri, penulisan kode, dan pembuatan dokumen profesional buatan DeeperNova AI Indonesia.\n` +
    `[WAKTU REAL-TIME SEKARANG]: Tahun ${yearServer}, tanggal ${todayServerId}.\n` +
    `ATURAN KETAT IDENTITAS: JANGAN PERNAH mengaku atau menyebut pihak lain. Tegaskan bahwa kamu adalah DeeperNova Autonomous AI Agent.\n` +
    `[INFORMASI RESMI KEPEMIMPINAN & PENGEMBANGAN - HANYA JIKA DITANYA]:\n` +
    `- Founder: Ferry Fernando\n` +
    `- CEO: Ferry Fernando\n` +
    `- Wakil CEO: Anju Malinton Pakpahan\n` +
    `- Tim Pengembang: Proyek ini dikembangkan bersama tim AI yang sangat besar di belakang DeeperNova AI.\n` +
    `- Metode Pengembangan: AI ini dikembangkan oleh model AI DeeperNova generasi sebelumnya secara otonom penuh (full autonomous).\n` +
    `TUGAS & CARA KERJA AGENT:\n` +
    `1. Pahami instruksi tugas pengguna secara mendalam dan berikan solusi tuntas, terstruktur, dan siap pakai.\n` +
    `2. Jika diminta kode program atau dokumen, sajikan kode yang rapi, modular, dan lengkap.\n` +
    `3. Jawab selalu menggunakan Bahasa ${language === 'en' ? 'Inggris' : (language === 'zh' ? 'Mandarin' : 'Indonesia')} yang profesional, mengalir, dan ramah.`;

  // Build upstream messages
  const upstreamMessages = [
    { role: 'system', content: agentSystemPrompt }
  ];

  if (Array.isArray(history)) {
    for (const h of history.slice(-10)) {
      if (h.content || h.text) {
        upstreamMessages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content || h.text
        });
      }
    }
  }

  upstreamMessages.push({
    role: 'user',
    content: prompt
  });

  // Call upstream LLM stream
  let upstreamResp = null;
  for (let i = 0; i < TOKENMIX_API_KEYS.length; i++) {
    const key = TOKENMIX_API_KEYS[i];
    try {
      const resp = await fetch('https://api.tokenmix.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: upstreamMessages,
          temperature: 0.4,
          max_tokens: 4096,
          stream: true
        })
      });
      if (resp.ok) {
        upstreamResp = resp;
        break;
      }
    } catch { }
  }

  // If no env keys configured on Edge yet, proxy securely to the local backend server (which holds .env locally)
  if ((!upstreamResp || !upstreamResp.ok) && FALLBACK_BACKEND_URL) {
    try {
      const proxyResp = await fetch(`${FALLBACK_BACKEND_URL}/api/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': req.headers.get('x-device-id') || 'guest_device'
        },
        body: JSON.stringify(body)
      });
      if (proxyResp.ok) {
        return new Response(proxyResp.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } catch { }
  }

  if (!upstreamResp || !upstreamResp.ok) {
    return new Response(JSON.stringify({ error: 'Upstream AI engine unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // SSE Transform Stream that translates TokenMix stream into DeeperNova Agent Protocol
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullAccumulated = '';

  const customStream = new ReadableStream({
    async start(controller) {
      // 1. Initial connection handshake
      controller.enqueue(encoder.encode(': connected\n\n'));

      // 2. Initial Step & Reasoning events
      controller.enqueue(encoder.encode(
        `event: step\ndata: ${JSON.stringify({ step: 'init', label: 'Menganalisis konteks tugas otonom...', status: 'running' })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: reasoning\ndata: ${JSON.stringify({ text: `Tugas diterima: "${prompt.slice(0, 100)}...". Mempersiapkan alur eksekusi otonom.` })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: step_update\ndata: ${JSON.stringify({ step: 'init', status: 'success' })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: step\ndata: ${JSON.stringify({ step: 'execute', label: 'Menyusun analisis & solusi cerdas...', status: 'running' })}\n\n`
      ));

      // 3. Process upstream chunks
      const reader = upstreamResp.body.getReader();
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const deltaContent = parsed?.choices?.[0]?.delta?.content || '';
                const reasoningContent = parsed?.choices?.[0]?.delta?.reasoning_content || '';

                if (reasoningContent) {
                  controller.enqueue(encoder.encode(
                    `event: reasoning\ndata: ${JSON.stringify({ text: reasoningContent })}\n\n`
                  ));
                }

                if (deltaContent) {
                  fullAccumulated += deltaContent;
                  controller.enqueue(encoder.encode(
                    `event: delta\ndata: ${JSON.stringify({ content: deltaContent })}\n\n`
                  ));
                }
              } catch { }
            }
          }
        }
      } catch (streamErr) {
        controller.enqueue(encoder.encode(
          `event: error\ndata: ${JSON.stringify({ error: streamErr.message })}\n\n`
        ));
      }

      // 4. Final step update & done event
      controller.enqueue(encoder.encode(
        `event: step_update\ndata: ${JSON.stringify({ step: 'execute', status: 'success' })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: done\ndata: ${JSON.stringify({
          fullResponse: fullAccumulated,
          files: [
            { path: 'SKILL.md', name: 'SKILL.md', size: 1024, type: 'md' }
          ]
        })}\n\n`
      ));

      controller.close();
    }
  });

  return new Response(customStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

