import fetch from 'node-fetch';

async function testSecurityAndAi() {
  console.log('=== TEST 1: Testing Server /api/chat with new TokenMix key ===');
  try {
    const chatResp = await fetch('http://127.0.0.1:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5174'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Halo! Jawab singkat: 2 + 2 berapa?' }],
        stream: false
      })
    });

    console.log('Chat Status:', chatResp.status);
    const chatData = await chatResp.json();
    console.log('Chat Response:', JSON.stringify(chatData.choices?.[0]?.message?.content || chatData));
  } catch (err) {
    console.error('Chat Test Error:', err.message);
  }

  console.log('\n=== TEST 2: Testing Server /api/tts endpoint ===');
  try {
    const ttsResp = await fetch('http://127.0.0.1:3001/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5174'
      },
      body: JSON.stringify({
        input: 'Selamat datang di DeeperNova AI.',
        voice: 'nova'
      })
    });

    console.log('TTS Status:', ttsResp.status);
    console.log('TTS Content-Type:', ttsResp.headers.get('content-type'));
    const ttsBuffer = await ttsResp.arrayBuffer();
    console.log('TTS Audio Buffer Size:', ttsBuffer.byteLength, 'bytes');
  } catch (err) {
    console.error('TTS Test Error:', err.message);
  }

  console.log('\n=== TEST 3: Testing Strict CORS Shield ===');
  // 3A: Valid Origin (Allowed)
  try {
    const validOriginResp = await fetch('http://127.0.0.1:3001/health', {
      headers: { 'Origin': 'https://deepernova.vercel.app' }
    });
    console.log('Allowed Origin (deepernova.vercel.app) CORS header:', validOriginResp.headers.get('access-control-allow-origin') || '(Allowed)');
  } catch (err) {
    console.error('Allowed Origin Error:', err.message);
  }

  // 3B: Unauthorized Malicious Origin (Must be rejected)
  try {
    const evilResp = await fetch('http://127.0.0.1:3001/health', {
      headers: { 'Origin': 'https://malicious-site.com' }
    });
    const corsHeader = evilResp.headers.get('access-control-allow-origin');
    console.log('Unauthorized Origin (malicious-site.com) Status:', evilResp.status);
    console.log('Unauthorized Origin CORS Header:', corsHeader ? `LEAKED: ${corsHeader}` : 'BLOCKED (null, correct!)');
  } catch (err) {
    console.log('Unauthorized Origin BLOCKED by CORS correctly:', err.message);
  }
}

testSecurityAndAi();
