import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const helpDataPath = path.join(rootDir, 'scratch_help_data.json');
const helpData = JSON.parse(fs.readFileSync(helpDataPath, 'utf8'));

const CATEGORIES = [
  { id: 'vibecoding', label: 'CodeDance (Vibe Coding)', icon: 'fa-code', desc: 'Panduan membuat website otomatis dari bahasa alami dengan AI Coding Agent di cloud sandbox Monaco Editor.' },
  { id: 'image', label: 'AI Gambar & Art Studio', icon: 'fa-wand-magic-sparkles', desc: 'Cara membuat gambar ultra-HD (Text-to-Image) dan edit modifikasi foto referensi bebas sensor.' },
  { id: 'typernova', label: 'Typernova Document Studio', icon: 'fa-file-lines', desc: 'Otomasi pembuatan dokumen resmi Microsoft Word (.docx) ber-Daftar Isi otomatis, Excel, dan PPT.' },
  { id: 'memory', label: 'Memori Otonom AI', icon: 'fa-brain', desc: 'Sistem memori canggih yang mengingat, memperbarui, dan menghapus preferensi percakapan secara otonom (CRUD).' },
  { id: 'chatbot', label: 'Chatbot & Vision OCR', icon: 'fa-comments', desc: 'Pilihan model AI penalaran cepat, riset web langsung, dan pemindaian teks gambar/struk (OCR).' },
  { id: 'troubleshooting', label: 'Solusi Kendala Teknis', icon: 'fa-circle-question', desc: 'Langkah pemulihan cepat saat layar preview kosong, koneksi macet, sinkronisasi alarm, dan privasi.' },
  { id: 'account', label: 'Akun, Keamanan & Profil CEO', icon: 'fa-shield-halved', desc: 'Mode tamu vs akun login, profil Founder & CEO Ferry Fernando, serta ikrar pengabdian Deepernova Corp.' }
];

// Build FAQ schema entities for all 18 articles
const faqEntities = helpData.map(item => {
  const stepsText = item.solution.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  const tipText = item.tips ? `\n\nTips Juara & Rekomendasi Prompt: ${item.tips}` : '';
  return {
    '@type': 'Question',
    'name': item.title,
    'acceptedAnswer': {
      '@type': 'Answer',
      'text': `${item.summary}\n\nLangkah-langkah Penyelesaian:\n${stepsText}${tipText}`
    }
  };
});

const schemaGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://deepernova.com/help#webpage',
      'url': 'https://deepernova.com/help',
      'name': 'Pusat Bantuan Resmi & Panduan Solusi Deepernova AI (Help Center)',
      'description': 'Kumpulan panduan pemakaian lengkap dan solusi pemecahan masalah teknis resmi Deepernova AI: CodeDance IDE, AI Gambar Ultra-HD, Typernova Word .docx, Memori Otonom, dan Profil CEO Ferry Fernando.',
      'inLanguage': ['id', 'en'],
      'isPartOf': {
        '@type': 'WebSite',
        '@id': 'https://deepernova.com/#website',
        'name': 'Deepernova AI',
        'url': 'https://deepernova.com/'
      },
      'breadcrumb': {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Beranda Deepernova',
            'item': 'https://deepernova.com/'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Pusat Bantuan & Solusi',
            'item': 'https://deepernova.com/help'
          }
        ]
      }
    },
    {
      '@type': 'Person',
      '@id': 'https://deepernova.com/#ferry-fernando',
      'name': 'Ferry Fernando',
      'alternateName': ['FF', 'Ferry Fernando CEO', 'Founder Deepernova'],
      'jobTitle': 'Founder & Chief Executive Officer of Deepernova Corp',
      'image': 'https://deepernova.com/ceo.jpg',
      'birthPlace': 'Kebumen, Jawa Tengah, Indonesia',
      'sameAs': [
        'https://instagram.com/ferryfernandoo_',
        'https://deepernova.com'
      ],
      'description': 'Ferry Fernando adalah Founder dan CEO Deepernova Corp yang memimpin perancangan platform Deepernova AI, CodeDance IDE untuk Vibe Coding, dan Typernova Document Studio di Indonesia.'
    },
    {
      '@type': 'Organization',
      '@id': 'https://deepernova.com/#organization',
      'name': 'Deepernova Corp',
      'url': 'https://deepernova.com',
      'logo': 'https://deepernova.com/logo192.png',
      'image': 'https://deepernova.com/ceo.jpg',
      'founder': [
        { '@id': 'https://deepernova.com/#ferry-fernando' },
        { '@type': 'Person', 'name': 'Anju Malinton Pakpahan', 'jobTitle': 'Co-Founder & Vice CEO' }
      ]
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://deepernova.com/help#faq',
      'mainEntity': faqEntities
    }
  ]
};

let articlesHtml = '';

CATEGORIES.forEach(cat => {
  const items = helpData.filter(d => d.category === cat.id);
  if (items.length === 0) return;

  articlesHtml += `
    <section id="${cat.id}" class="help-category-section">
      <div class="category-header">
        <div class="category-icon-bubble">
          <i class="fa-solid ${cat.icon}"></i>
        </div>
        <div>
          <h2 class="category-title">${cat.label}</h2>
          <p class="category-desc">${cat.desc}</p>
        </div>
      </div>
      <div class="articles-grid">
  `;

  items.forEach(item => {
    const steps = item.solution.map((s, idx) => `
      <li class="step-item">
        <span class="step-num">${idx + 1}</span>
        <div class="step-body">${s}</div>
      </li>
    `).join('');

    const tipsHtml = item.tips ? `
      <div class="tips-callout">
        <div class="tips-header">
          <i class="fa-solid fa-lightbulb"></i>
          <span>Tips Juara &amp; Rekomendasi Prompt:</span>
        </div>
        <p class="tips-text">${item.tips}</p>
      </div>
    ` : '';

    const keywords = item.keywords.split(',').map(k => `<span class="keyword-pill">${k.trim()}</span>`).join(' ');

    articlesHtml += `
      <article id="${item.id}" class="help-article-card" itemscope itemtype="https://schema.org/Question">
        <div class="article-badge-row">
          <span class="category-badge">${cat.label}</span>
          <span class="article-id-tag">ID: #${item.id}</span>
        </div>
        <h3 class="article-title" itemprop="name">${item.title}</h3>
        <p class="article-summary">${item.summary}</p>
        
        <div class="solution-wrapper" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
          <div class="solution-heading">
            <i class="fa-solid fa-list-check"></i> Langkah Penyelesaian &amp; Panduan:
          </div>
          <ol class="steps-list" itemprop="text">
            ${steps}
          </ol>
          ${tipsHtml}
        </div>

        <div class="article-footer">
          <span class="keywords-label"><i class="fa-solid fa-tags"></i> Kata Kunci Terkait:</span>
          <div class="keywords-list">${keywords}</div>
        </div>
      </article>
    `;
  });

  articlesHtml += `
      </div>
    </section>
  `;
});

const fullHtml = `<!DOCTYPE html>
<html lang="id" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  
  <title>Pusat Bantuan Resmi &amp; Panduan Solusi Deepernova AI (Help Center) | CodeDance IDE, Gambar AI, Typernova</title>
  <meta name="title" content="Pusat Bantuan Resmi &amp; Panduan Solusi Deepernova AI (Help Center) | CodeDance IDE, Gambar AI, Typernova" />
  <meta name="description" content="Pusat Bantuan resmi Deepernova AI 100% Gratis: Panduan lengkap CodeDance IDE (Agentic Vibe Coding), AI Bikin Gambar Ultra-HD, Typernova Studio (Word .docx resmi, Excel, PPTX), Memori Otonom, Vision OCR, serta Profil &amp; Ikrar Misi CEO Ferry Fernando." />
  <meta name="keywords" content="Pusat Bantuan Deepernova, Solusi Error Deepernova, Panduan CodeDance IDE, Vibe Coding AI, Cara Bikin Gambar AI, Typernova Word docx otomatis, Memori Otonom AI, CEO Ferry Fernando, Deepernova Corp, AI Gratis Indonesia" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://deepernova.com/help" />
  
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/logo192.png" />
  <link rel="preload" href="/ceo.jpg" as="image" type="image/jpeg" />

  <!-- OpenGraph Meta Tags -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Deepernova AI" />
  <meta property="og:url" content="https://deepernova.com/help" />
  <meta property="og:title" content="Pusat Bantuan Resmi &amp; Solusi Pintar Deepernova AI (Help Center)" />
  <meta property="og:description" content="Panduan teknis resmi pemakaian fitur dan solusi kendala Deepernova AI: CodeDance IDE, AI Bikin Gambar, Typernova Word .docx, Memori Otonom, dan Profil CEO Ferry Fernando." />
  <meta property="og:image" content="https://deepernova.com/ceo.jpg" />
  <meta property="og:locale" content="id_ID" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://deepernova.com/help" />
  <meta name="twitter:title" content="Pusat Bantuan Resmi Deepernova AI — Panduan &amp; Solusi Pintar" />
  <meta name="twitter:description" content="Panduan teknis resmi pemakaian fitur dan solusi kendala Deepernova AI karya CEO Ferry Fernando. 100% Gratis Selamanya." />
  <meta name="twitter:image" content="https://deepernova.com/ceo.jpg" />

  <!-- FontAwesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

  <!-- Schema.org Structured Data -->
  <script type="application/ld+json">
${JSON.stringify(schemaGraph, null, 2)}
  </script>

  <style>
    :root {
      --bg: #ffffff;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --border-orange: #fed7aa;
      --primary: #ea580c;
      --primary-hover: #c2410c;
      --primary-light: #fff7ed;
      --text: #0f172a;
      --text-muted: #475569;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      background-image: 
        radial-gradient(ellipse 70% 35% at 50% -4%, rgba(234, 88, 12, 0.08) 0%, transparent 70%),
        linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .help-page-container {
      max-width: 1060px;
      margin: 0 auto;
      padding: 40px 20px 80px 20px;
    }

    /* Top Breadcrumb & Badge */
    .top-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .breadcrumb {
      font-size: 0.88rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .breadcrumb a { color: var(--text-muted); }
    .breadcrumb a:hover { color: var(--primary); }
    .breadcrumb-sep { color: #cbd5e1; }

    .official-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--primary-light);
      border: 1px solid var(--border-orange);
      color: var(--primary);
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 0 rgba(234, 88, 12, 0.4);
      animation: pulseGlow 2s infinite;
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.6); }
      70% { box-shadow: 0 0 0 8px rgba(234, 88, 12, 0); }
      100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
    }

    /* Header */
    header.help-hero-header {
      text-align: center;
      margin-bottom: 40px;
    }
    .hero-h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
      letter-spacing: -0.02em;
    }
    .gradient-orange {
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-lead {
      font-size: 1.12rem;
      color: var(--text-muted);
      max-width: 720px;
      margin: 0 auto 28px auto;
      line-height: 1.6;
    }

    /* Quick Action Nav Buttons */
    .quick-actions-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 0.92rem;
      font-weight: 600;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .action-btn-primary {
      background: var(--primary);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(234, 88, 12, 0.25);
    }
    .action-btn-primary:hover {
      background: var(--primary-hover);
      color: #ffffff;
      text-decoration: none;
      transform: translateY(-1px);
    }
    .action-btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #e2e8f0;
      box-shadow: var(--shadow-sm);
    }
    .action-btn-secondary:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
      text-decoration: none;
    }
    .action-btn-highlight {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--border-orange);
    }
    .action-btn-highlight:hover {
      background: #fed7aa;
      color: #9a3412;
      text-decoration: none;
    }

    /* Live Search Input Bar */
    .search-filter-box {
      background: #ffffff;
      border: 2px solid #fed7aa;
      border-radius: 14px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 680px;
      margin: 0 auto 36px auto;
      box-shadow: 0 6px 20px rgba(234, 88, 12, 0.07);
    }
    .search-filter-box i { color: var(--primary); font-size: 1.1rem; }
    .search-filter-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.98rem;
      color: var(--text);
      padding: 10px 0;
      font-family: inherit;
    }

    /* Category Navigation Jump Links */
    .category-jump-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-bottom: 48px;
    }
    .jump-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s;
    }
    .jump-pill:hover {
      background: var(--primary-light);
      border-color: var(--border-orange);
      color: var(--primary);
      text-decoration: none;
    }

    /* Category Section */
    .help-category-section {
      margin-bottom: 56px;
      scroll-margin-top: 40px;
    }
    .category-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f1f5f9;
    }
    .category-icon-bubble {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--primary-light);
      border: 1px solid var(--border-orange);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .category-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .category-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* Articles Grid & Cards */
    .articles-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .help-article-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px;
      box-shadow: var(--shadow-sm);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .help-article-card:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-md);
    }
    .article-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .category-badge {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--border-orange);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .article-id-tag {
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: monospace;
    }
    .article-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
      line-height: 1.4;
    }
    .article-summary {
      font-size: 1rem;
      color: #334155;
      margin: 0 0 18px 0;
      line-height: 1.6;
    }

    .solution-wrapper {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 18px;
    }
    .solution-heading {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .steps-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .step-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--primary);
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .step-body {
      font-size: 0.95rem;
      color: #334155;
      line-height: 1.6;
      flex: 1;
    }

    .tips-callout {
      margin-top: 16px;
      padding: 14px 18px;
      border-radius: 10px;
      background: var(--primary-light);
      border-left: 4px solid var(--primary);
    }
    .tips-header {
      font-size: 0.88rem;
      font-weight: 700;
      color: #9a3412;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .tips-text {
      font-size: 0.92rem;
      color: #7c2d12;
      margin: 0;
      line-height: 1.55;
    }

    .article-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
      font-size: 0.82rem;
    }
    .keywords-label {
      color: #64748b;
      font-weight: 600;
    }
    .keywords-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .keyword-pill {
      background: #f1f5f9;
      color: #475569;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.78rem;
    }

    /* Massive CEO Profile Hero Card */
    .ceo-master-card {
      background: #ffffff;
      border: 2px solid var(--border-orange);
      border-radius: 24px;
      padding: 40px;
      margin-top: 64px;
      box-shadow: 0 12px 36px rgba(234, 88, 12, 0.09);
      position: relative;
      overflow: hidden;
      scroll-margin-top: 40px;
    }
    .ceo-top-glow-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #ea580c, #f97316, #fdba74);
    }
    .ceo-nation-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #c2410c;
      font-size: 0.82rem;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ceo-profile-header {
      display: flex;
      gap: 28px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 28px;
    }
    .ceo-photo-box {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
    .ceo-img {
      width: 100%;
      height: 100%;
      border-radius: 20px;
      object-fit: cover;
      border: 3px solid var(--primary);
      box-shadow: 0 8px 20px rgba(234, 88, 12, 0.2);
    }
    .ceo-verified-badge {
      position: absolute;
      bottom: -6px;
      right: -6px;
      background: #16a34a;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      border: 2px solid #ffffff;
      box-shadow: var(--shadow-sm);
    }
    .ceo-info-box {
      flex: 1;
      min-width: 280px;
    }
    .ceo-role-badge {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 6px;
    }
    .ceo-name-h2 {
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .ceo-desc-sub {
      font-size: 1rem;
      color: var(--text-muted);
      margin: 0 0 12px 0;
      line-height: 1.5;
    }
    .ceo-meta-pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: #475569;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 4px 12px;
      border-radius: 8px;
    }
    .meta-pill-social {
      color: #c2410c;
      background: #fff7ed;
      border-color: #fed7aa;
      font-weight: 600;
    }
    .meta-pill-social:hover {
      background: #fed7aa;
      text-decoration: none;
    }

    /* Master Quote Callout */
    .ceo-quote-block {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
      border-left: 6px solid var(--primary);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 32px;
      position: relative;
    }
    .quote-mark {
      font-size: 2.4rem;
      line-height: 1;
      color: var(--primary);
      opacity: 0.4;
      margin-bottom: -10px;
    }
    .ceo-quote-content {
      font-size: 1.25rem;
      font-weight: 700;
      color: #9a3412;
      line-height: 1.6;
      margin: 8px 0;
    }
    .ceo-quote-sig {
      font-size: 0.95rem;
      color: #7c2d12;
      font-weight: 600;
      margin-top: 8px;
    }

    /* Pillars Grid */
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .pillar-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      transition: all 0.2s;
    }
    .pillar-card:hover {
      background: #ffffff;
      border-color: #fed7aa;
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .pillar-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      margin-bottom: 12px;
    }
    .pillar-card h4 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .pillar-card p {
      font-size: 0.9rem;
      color: #475569;
      margin: 0;
      line-height: 1.5;
    }

    /* CEO Footer Actions */
    .ceo-footer-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      padding-top: 24px;
      border-top: 1px solid #f1f5f9;
    }

    /* Page Footer */
    footer.help-footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 32px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.9rem;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .footer-links a { color: #475569; font-weight: 600; }
    .footer-links a:hover { color: var(--primary); }

    @media (max-width: 768px) {
      .hero-h1 { font-size: 1.9rem; }
      .ceo-profile-header { flex-direction: column; text-align: center; }
      .ceo-meta-pills { justify-content: center; }
      .ceo-name-h2 { font-size: 1.6rem; }
      .ceo-master-card { padding: 24px; }
      .help-article-card { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="help-page-container">
    
    <!-- Top Metadata & Official Badge -->
    <div class="top-meta-row">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/"><i class="fa-solid fa-house"></i> Beranda</a>
        <span class="breadcrumb-sep">/</span>
        <span style="color: var(--primary); font-weight: 600;">Pusat Bantuan &amp; Solusi</span>
      </nav>
      <div class="official-badge">
        <span class="badge-pulse"></span>
        <span>Dokumentasi Resmi • Deepernova Corp</span>
      </div>
    </div>

    <!-- Header Hero -->
    <header class="help-hero-header">
      <h1 class="hero-h1">Pusat Bantuan &amp; <span class="gradient-orange">Solusi Pintar</span></h1>
      <p class="hero-lead">
        Koleksi lengkap panduan pemakaian fitur, rekomendasi prompt juara, dan pemecahan kendala teknis resmi untuk CodeDance IDE, AI Image Studio, Typernova Document Studio, dan Chatbot Cerdas Deepernova.
      </p>
      
      <!-- Quick Navigation Buttons -->
      <div class="quick-actions-bar">
        <a href="/chat" class="action-btn action-btn-primary"><i class="fa-solid fa-comments"></i> Buka Chatbot AI</a>
        <a href="/codedance" class="action-btn action-btn-secondary"><i class="fa-solid fa-code"></i> CodeDance IDE</a>
        <a href="/documents" class="action-btn action-btn-secondary"><i class="fa-solid fa-file-word"></i> Typernova Word .docx</a>
        <a href="#profil-ceo" class="action-btn action-btn-highlight"><i class="fa-solid fa-user-tie"></i> Profil CEO &amp; Misi Kami</a>
      </div>

      <!-- Live Search Box (Client-side interactive filter) -->
      <div class="search-filter-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="helpSearchInput" placeholder="Cari panduan (contoh: blank preview, bikin word docx, rumus excel, memori ai, ocr)..." oninput="filterHelpArticles()" />
      </div>

      <!-- Category Jump Pills -->
      <nav class="category-jump-nav" aria-label="Kategori Panduan">
        <a href="#vibecoding" class="jump-pill"><i class="fa-solid fa-code"></i> CodeDance IDE</a>
        <a href="#image" class="jump-pill"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Gambar HD</a>
        <a href="#typernova" class="jump-pill"><i class="fa-solid fa-file-lines"></i> Typernova Word/Excel</a>
        <a href="#memory" class="jump-pill"><i class="fa-solid fa-brain"></i> Memori Otonom</a>
        <a href="#chatbot" class="jump-pill"><i class="fa-solid fa-comments"></i> Chatbot &amp; Vision OCR</a>
        <a href="#troubleshooting" class="jump-pill"><i class="fa-solid fa-circle-question"></i> Solusi Kendala</a>
        <a href="#account" class="jump-pill"><i class="fa-solid fa-shield-halved"></i> Akun &amp; Privasi</a>
        <a href="#profil-ceo" class="jump-pill" style="border-color: #fed7aa; color: #ea580c;"><i class="fa-solid fa-user-tie"></i> Profil CEO</a>
      </nav>
    </header>

    <!-- Main Articles Section (All 18 articles 100% pre-rendered in static HTML) -->
    <main id="helpArticlesContainer">
      ${articlesHtml}

      <!-- Large CEO Profile & Mission Card (Static HTML for 100% Crawlability) -->
      <section id="profil-ceo" class="ceo-master-card" itemscope itemtype="https://schema.org/Person">
        <div class="ceo-top-glow-bar"></div>
        
        <div class="ceo-nation-tag">
          <span>🇮🇩</span>
          <span>PENGABDIAN UNTUK BANGSA &amp; NEGARA INDONESIA</span>
        </div>

        <div class="ceo-profile-header">
          <div class="ceo-photo-box">
            <img src="/ceo.jpg" alt="Ferry Fernando — Founder &amp; CEO Deepernova Corp" class="ceo-img" itemprop="image" />
            <span class="ceo-verified-badge">✓ Verified</span>
          </div>

          <div class="ceo-info-box">
            <span class="ceo-role-badge" itemprop="jobTitle">FOUNDER &amp; CHIEF EXECUTIVE OFFICER</span>
            <h2 class="ceo-name-h2" itemprop="name">Ferry Fernando <span style="font-size: 1.2rem; color: var(--primary); font-weight: 700;">(FF)</span></h2>
            <p class="ceo-desc-sub" itemprop="description">
              Pemimpin Arsitektur &amp; Perancang Ekosistem <strong>Deepernova AI</strong>, <strong>CodeDance IDE</strong> (Agentic Vibe Coding), dan <strong>Typernova Studio</strong>.
            </p>
            <div class="ceo-meta-pills">
              <span class="meta-pill"><i class="fa-solid fa-location-dot"></i> <span itemprop="birthPlace">Kebumen, Jawa Tengah, Indonesia</span></span>
              <a href="https://instagram.com/ferryfernandoo_" target="_blank" rel="noopener" class="meta-pill meta-pill-social" itemprop="sameAs">
                <i class="fa-brands fa-instagram"></i> @ferryfernandoo_
              </a>
              <span class="meta-pill"><i class="fa-solid fa-building"></i> Deepernova Corp</span>
            </div>
          </div>
        </div>

        <!-- Master Mission Statement Quote Callout -->
        <div class="ceo-quote-block">
          <div class="quote-mark">❝</div>
          <blockquote class="ceo-quote-content">
            Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya.
          </blockquote>
          <div class="ceo-quote-sig">
            — <strong>Ferry Fernando</strong>, Founder &amp; CEO Deepernova Corp
          </div>
        </div>

        <!-- 4 Pillars Grid -->
        <div class="pillars-grid">
          <div class="pillar-card">
            <div class="pillar-icon" style="background: #fff7ed; color: #ea580c;">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <h4>Mencerdaskan Anak Bangsa</h4>
            <p>Membekali pelajar, mahasiswa, dan generasi muda dengan alat bantu belajar, riset ilmiah, dan pembuat dokumen otomatis tanpa biaya sepeser pun.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon" style="background: #eff6ff; color: #2563eb;">
              <i class="fa-solid fa-code"></i>
            </div>
            <h4>Kedaulatan Vibe Coding</h4>
            <p>Menghadirkan CodeDance IDE agar siapa saja di Indonesia bisa mewujudkan ide aplikasi software secara instan melalui bahasa percakapan sehari-hari.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon" style="background: #f0fdf4; color: #16a34a;">
              <i class="fa-solid fa-hand-holding-heart"></i>
            </div>
            <h4>100% Gratis Selamanya</h4>
            <p>Berkomitmen teguh menghadirkan kecerdasan buatan kelas dunia tanpa paywall tersembunyi, tanpa langganan mahal, dan ramah untuk semua kalangan.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon" style="background: #fdf4ff; color: #c026d3;">
              <i class="fa-solid fa-users"></i>
            </div>
            <h4>Kolaborasi &amp; Kepemimpinan</h4>
            <p>Dirancang oleh Ferry Fernando bersama Anju Malinton Pakpahan (Co-Founder &amp; Vice CEO) di bawah naungan Deepernova Corp (https://deepernova.com).</p>
          </div>
        </div>

        <div class="ceo-footer-actions">
          <a href="https://instagram.com/ferryfernandoo_" target="_blank" rel="noopener" class="action-btn action-btn-primary">
            <i class="fa-brands fa-instagram"></i> Ikuti Instagram CEO (@ferryfernandoo_)
          </a>
          <a href="/chat" class="action-btn action-btn-secondary">
            <i class="fa-solid fa-comments"></i> Mulai Pakai Deepernova AI Sekarang
          </a>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="help-footer">
      <div class="footer-links">
        <a href="/">Beranda</a>
        <a href="/codedance">CodeDance IDE</a>
        <a href="/documents">Typernova Document Studio</a>
        <a href="/chat">Chatbot &amp; Gambar AI</a>
        <a href="/universe">Deepernova Universe</a>
        <a href="/sitemap.xml">Sitemap XML</a>
        <a href="/llms.txt">LLMs Directory</a>
      </div>
      <p style="margin: 0;">
        &copy; 2026 <strong>Deepernova Corp</strong>. Seluruh hak cipta dilindungi undang-undang.<br />
        Didedikasikan untuk kemajuan teknologi dan kecerdasan anak bangsa Indonesia.
      </p>
    </footer>
  </div>

  <!-- Interactive Search Script for Humans (Crawlers already read the full static HTML) -->
  <script>
    function filterHelpArticles() {
      var query = (document.getElementById('helpSearchInput').value || '').toLowerCase().trim();
      var articles = document.querySelectorAll('.help-article-card');
      var sections = document.querySelectorAll('.help-category-section');

      articles.forEach(function(card) {
        var text = card.innerText.toLowerCase();
        if (!query || text.indexOf(query) !== -1) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });

      // Hide section headers if all child articles are hidden
      sections.forEach(function(sec) {
        var visibleCards = sec.querySelectorAll('.help-article-card:not([style*="display: none"])');
        if (query && visibleCards.length === 0) {
          sec.style.display = 'none';
        } else {
          sec.style.display = '';
        }
      });
    }
  </script>
</body>
</html>`;

// Write to public/help.html
const publicHelpPath = path.join(rootDir, 'public', 'help.html');
const serverPublicHelpPath = path.join(rootDir, 'server', 'public', 'help.html');
const distHelpPath = path.join(rootDir, 'dist', 'help.html');

fs.writeFileSync(publicHelpPath, fullHtml, 'utf8');
console.log(`✅ Written ${publicHelpPath} (${fullHtml.length} bytes)`);

fs.writeFileSync(serverPublicHelpPath, fullHtml, 'utf8');
console.log(`✅ Written ${serverPublicHelpPath} (${fullHtml.length} bytes)`);

if (fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.writeFileSync(distHelpPath, fullHtml, 'utf8');
  console.log(`✅ Written ${distHelpPath} (${fullHtml.length} bytes)`);
}

console.log(`🎉 Successfully generated complete pre-rendered Help Center with 18 articles and CEO mission!`);
