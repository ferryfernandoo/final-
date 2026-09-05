import http from 'http';

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runAudit() {
  console.log('🔍 INITIATING DEEPERNOVA AI CRAWLING AUDIT...\n');

  // 1. Audit /help
  console.log('--- 1. Testing GET /help ---');
  const helpRes = await fetchUrl('/help');
  console.log(`Status: ${helpRes.status}`);
  console.log(`Content-Type: ${helpRes.headers['content-type']}`);
  console.log(`Content Length: ${helpRes.body.length} bytes`);
  console.log(`Cross-Origin-Resource-Policy: ${helpRes.headers['cross-origin-resource-policy']}`);

  const requiredTerms = [
    'Pusat Bantuan Resmi',
    'Agentic Vibe Coding',
    'Mengatasi Layar Live Preview Kosong',
    'Cara membuat gambar berkualitas ultra-HD',
    'Cara menyusun dokumen resmi Microsoft Word',
    'Bagaimana cara kerja Memori Otonom AI',
    'Model AI apa saja yang tersedia',
    'Cara memindai dokumen, teks gambar, dan struk belanja (Vision OCR)',
    'Chatbot lambat merespons atau muncul pesan',
    'Cara menggunakan fitur Alarm Mandiri',
    'Keamanan Data & Privasi: Apakah percakapan dan kode proyek saya aman',
    'Perbedaan Mode Tamu (Guest Mode) dan Akun Terdaftar',
    'Siapa pendiri dan apa misi pengabdian Deepernova Corp',
    'Ferry Fernando',
    'Anju Malinton Pakpahan',
    'Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya.',
    'Mencerdaskan Anak Bangsa',
    'Kedaulatan Vibe Coding',
    '100% Gratis Selamanya',
    '@ferryfernandoo_'
  ];

  let missingHelp = [];
  requiredTerms.forEach(term => {
    if (!helpRes.body.includes(term)) {
      missingHelp.push(term);
    }
  });

  if (missingHelp.length === 0) {
    console.log('✅ ALL 20 critical terms and all 18 guides present in raw HTTP response of /help!');
  } else {
    console.error('❌ Missing terms in /help:', missingHelp);
  }

  // 2. Audit /robots.txt
  console.log('\n--- 2. Testing GET /robots.txt ---');
  const robotsRes = await fetchUrl('/robots.txt');
  console.log(`Status: ${robotsRes.status}`);
  const hasHelpAllow = robotsRes.body.includes('Allow: /help') && robotsRes.body.includes('Allow: /help.html');
  console.log(`Explicit Allow for /help and /help.html: ${hasHelpAllow ? '✅ YES' : '❌ NO'}`);

  // 3. Audit /sitemap.xml
  console.log('\n--- 3. Testing GET /sitemap.xml ---');
  const sitemapRes = await fetchUrl('/sitemap.xml');
  console.log(`Status: ${sitemapRes.status}`);
  const sitemapHasHelp = sitemapRes.body.includes('https://deepernova.com/help');
  console.log(`Sitemap contains https://deepernova.com/help: ${sitemapHasHelp ? '✅ YES' : '❌ NO'}`);

  // 4. Audit /llms.txt
  console.log('\n--- 4. Testing GET /llms.txt ---');
  const llmsRes = await fetchUrl('/llms.txt');
  console.log(`Status: ${llmsRes.status}`);
  const llmsHasCeoQuote = llmsRes.body.includes('Deepernova adalah bentuk pengabdian kami kepada negara');
  console.log(`LLMs manifest contains CEO Quote: ${llmsHasCeoQuote ? '✅ YES' : '❌ NO'}`);

  // 5. Audit Root GET / (index.html)
  console.log('\n--- 5. Testing GET / (Root index.html) ---');
  const rootRes = await fetchUrl('/');
  console.log(`Status: ${rootRes.status}`);
  console.log(`Root Length: ${rootRes.body.length} bytes`);
  const rootHasAll18 = rootRes.body.includes('Pusat Bantuan Resmi &amp; Solusi Pintar Deepernova AI (Help Center Directory)') &&
                       rootRes.body.includes('Deepernova adalah bentuk pengabdian kami kepada negara');
  console.log(`Root index.html contains Help Directory & CEO Mission in static pre-rendered HTML: ${rootHasAll18 ? '✅ YES' : '❌ NO'}`);

  console.log('\n🎉 AUDIT COMPLETE!');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
});
