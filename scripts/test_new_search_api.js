import fetch from 'node-fetch';

async function test() {
  const apiKey = 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';
  const baseUrl = 'https://missions-called-fog-porter.trycloudflare.com/api/v1';

  console.log('--- Testing GET /search ---');
  try {
    const res = await fetch(`${baseUrl}/search?q=indonesia&limit=3`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2).slice(0, 1000));
  } catch (e) {
    console.error('Error GET /search:', e.message);
  }

  console.log('\n--- Testing POST /search ---');
  try {
    const res = await fetch(`${baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({ query: 'mobil listrik indonesia', limit: 3 })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2).slice(0, 1000));
  } catch (e) {
    console.error('Error POST /search:', e.message);
  }

  console.log('\n--- Testing GET /news ---');
  try {
    const res = await fetch(`${baseUrl}/news?q=gempa+bumi&limit=3`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2).slice(0, 1000));
  } catch (e) {
    console.error('Error GET /news:', e.message);
  }

  console.log('\n--- Testing GET /images ---');
  try {
    const res = await fetch(`${baseUrl}/images?q=teknologi+ai&limit=3`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2).slice(0, 1000));
  } catch (e) {
    console.error('Error GET /images:', e.message);
  }
}

test();
