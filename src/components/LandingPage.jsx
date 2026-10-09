import React, { useState, useEffect } from 'react';
import { SEARCH_ENGINE_URL } from '../apiConfig';
import './LandingPage.css';

const LandingPage = ({ onStartChat, onOpenOffice, onOpenUniverse, onOpenDrive, onOpenLogin, onNavigate, isAuthenticated, isGuest, user }) => {
  const [activeFaq, setActiveFaq] = useState(null);

  // Pastikan scrolling halaman vertikal aktif dan mulus di semua perangkat & browser
  useEffect(() => {
    document.documentElement.classList.add('view-landing');
    document.body.classList.add('view-landing');
    document.body.setAttribute('data-view', 'landing');

    const prevHtmlOverflowY = document.documentElement.style.overflowY;
    const prevBodyOverflowY = document.body.style.overflowY;

    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'visible';

    return () => {
      document.documentElement.style.overflowY = prevHtmlOverflowY;
      document.body.style.overflowY = prevBodyOverflowY;
    };
  }, []);

  const features = [
    {
      icon: '💬',
      title: 'Multi-Model Chat',
      desc: 'Penalaran mendalam, coding, dan obrolan multi-bahasa.'
    },
    {
      icon: '⚡',
      title: 'Coding Agent & IDE',
      desc: 'Cloud Sandbox Monaco dengan live web preview otomatis.'
    },
    {
      icon: '📄',
      title: 'Typernova Studio',
      desc: 'Buat file Word (.docx), Excel (.xlsx), & PPT (.pptx) instan.'
    },
    {
      icon: '🎨',
      title: 'Vision & Gambar',
      desc: 'Analisis foto, OCR teks, dan generate gambar resolusi tinggi.'
    },
    {
      icon: '⏰',
      title: 'Alarm Mandiri',
      desc: 'Pasang pengingat dan alarm otomatis langsung di aplikasi.'
    },
    {
      icon: '🧠',
      title: 'Memory Bank',
      desc: 'Ingat preferensi dan konteks penting Anda di tiap percakapan.'
    },
    {
      icon: '🔒',
      title: 'Cloud Vault 3GB',
      desc: 'Penyimpanan dokumen terenkripsi SHA-256 yang aman.'
    },
  ];

  const faqs = [
    {
      q: 'Apakah Deepernova AI gratis?',
      a: 'Ya, seluruh fitur utama dapat digunakan 100% gratis tanpa biaya langganan.'
    },
    {
      q: 'Apakah wajib mendaftar akun?',
      a: 'Tidak. Anda bisa langsung menggunakan Mode Tamu tanpa perlu login.'
    },
    {
      q: 'Format dokumen apa saja yang didukung?',
      a: 'Microsoft Word (.docx), Microsoft Excel (.xlsx), dan PowerPoint (.pptx).'
    },
    {
      q: 'Bagaimana keamanan data saya?',
      a: 'Pada mode lokal, data tersimpan di perangkat Anda. Sesi akun dilindungi enkripsi penuh.'
    },
  ];

  return (
    <div className="lp">
      {/* Background subtle luminous glow */}
      <div className="lp-ambient-light"></div>

      {/* Navbar — Bersih & Minimalis: HANYA ADA Login dan Masuk Chat */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand" onClick={onStartChat}>
            <img src="/logo.png" alt="Deepernova AI" className="lp-brand-icon" />
            <div className="lp-brand-text">
              <span className="lp-brand-name">Deepernova AI</span>
              <span className="lp-brand-sub">indonesian technology research</span>
            </div>
          </div>

          <div className="lp-nav-actions">
            {isAuthenticated && !isGuest ? (
              <button onClick={onStartChat} className="lp-btn-primary">
                Masuk Chat ➔
              </button>
            ) : (
              <>
                <button onClick={onOpenLogin} className="lp-btn-ghost">
                  Masuk
                </button>
                <button onClick={onStartChat} className="lp-btn-primary">
                  Masuk Chat ➔
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-hero-tag-wrap">
          <span className="lp-hero-tag">
            <span className="lp-hero-tag-dot"></span>
            DEEPERNOVA AI 2.0 • INDONESIAN RESEARCH
          </span>
        </div>
        <h1 className="lp-hero-h1">
          Kecerdasan Buatan <br />
          <span className="lp-accent">Cerdas, Cepat &amp; Mandiri.</span>
        </h1>
        <p className="lp-hero-sub">
          Platform AI multi-model Indonesia dengan generator dokumen otomatis dan mesin pencari mandiri. 100% gratis tanpa langganan.
        </p>

        <div className="lp-hero-btns">
          <button onClick={onStartChat} className="lp-btn-hero">
            <i className="fa-solid fa-comments" style={{ marginRight: '8px' }}></i>
            Masuk Chat Sekarang ➔
          </button>
          <button onClick={onOpenOffice} className="lp-btn-hero-outline">
            <i className="fa-solid fa-file-lines" style={{ marginRight: '8px' }}></i>
            Document Studio
          </button>
          <button onClick={() => onNavigate?.('help')} className="lp-btn-hero-outline lp-btn-help-link">
            <i className="fa-solid fa-circle-question" style={{ marginRight: '8px', color: '#ea580c' }}></i>
            Pusat Bantuan
          </button>
        </div>

        {/* Harmonious Ecosystem Section: Search Engine & Developer API Selaras Berdampingan */}
        <div className="lp-ecosystem-section">
          <div className="lp-ecosystem-grid">
            {/* Kiri: Search Engine Mandiri */}
            <div className="lp-eco-card lp-eco-card-search">
              <div className="lp-eco-header">
                <div className="lp-eco-title-group">
                  <div className="lp-eco-icon search-icon">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </div>
                  <div>
                    <h3 className="lp-eco-title">DeeperNova Search Engine</h3>
                    <p className="lp-eco-tagline">Mesin Pencari Web Mandiri &amp; Real-Time</p>
                  </div>
                </div>
                <span className="lp-eco-badge green">Live • Mandiri</span>
              </div>

              <p className="lp-eco-desc">
                Pencarian web independen berkecepatan tinggi dengan data real-time, ringkasan AI, dan indeks mandiri.
              </p>

              <form 
                className="lp-eco-search-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem('q');
                  const query = input?.value?.trim();
                  if (query) {
                    window.open(`${SEARCH_ENGINE_URL}?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
                  } else {
                    window.open(SEARCH_ENGINE_URL, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <div className="lp-eco-input-wrapper">
                  <i className="fa-solid fa-search lp-eco-search-icon"></i>
                  <input 
                    type="text" 
                    name="q"
                    placeholder="Cari web atau berita terkini..." 
                    className="lp-eco-search-input"
                    autoComplete="off"
                  />
                  <button type="submit" className="lp-eco-submit-btn">
                    <span>Cari</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </form>

              <div className="lp-eco-footer">
                <div className="lp-eco-chips">
                  <span className="lp-eco-chips-label">Cepat:</span>
                  <button type="button" onClick={() => window.open(`${SEARCH_ENGINE_URL}?q=AI%20Indonesia`, '_blank', 'noopener,noreferrer')}>AI Indonesia</button>
                  <button type="button" onClick={() => window.open(`${SEARCH_ENGINE_URL}?q=Berita%20Terkini`, '_blank', 'noopener,noreferrer')}>Berita Terkini</button>
                </div>
                <a 
                  href={SEARCH_ENGINE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-eco-link-btn green"
                  onClick={(e) => {
                    window.open(SEARCH_ENGINE_URL, '_blank', 'noopener,noreferrer');
                    e.preventDefault();
                  }}
                >
                  Buka Mesin Pencari ➔
                </a>
              </div>
            </div>

            {/* Kanan: Developer API Console */}
            <div className="lp-eco-card lp-eco-card-api" onClick={() => onNavigate?.('api')}>
              <div className="lp-eco-header">
                <div className="lp-eco-title-group">
                  <div className="lp-eco-icon api-icon">
                    <i className="fa-solid fa-bolt"></i>
                  </div>
                  <div>
                    <h3 className="lp-eco-title">Developer API Platforms</h3>
                    <p className="lp-eco-tagline">Inference LLM 1M Token &amp; Search API</p>
                  </div>
                </div>
                <span className="lp-eco-badge orange">1.000.000 Token Gratis</span>
              </div>

              <p className="lp-eco-desc">
                Integrasikan model DeeperNova Gold 1.5, Silicon 1.4, dan SERP Search API langsung ke aplikasi Anda.
              </p>

              <div className="lp-eco-api-endpoints">
                <div className="lp-eco-endpoint-pill">
                  <span className="method post">POST</span>
                  <span className="endpoint-path">/api/chat</span>
                  <span className="endpoint-desc">Model Gold 1.5 &amp; Silicon 1.4</span>
                </div>
                <div className="lp-eco-endpoint-pill">
                  <span className="method get">GET</span>
                  <span className="endpoint-path">/api/v1/search</span>
                  <span className="endpoint-desc">Real-time Web Search SERP</span>
                </div>
              </div>

              <div className="lp-eco-footer">
                <span className="lp-eco-api-spec">REST API • OpenAI Compatible • Instant Key</span>
                <button type="button" className="lp-eco-link-btn orange" onClick={(e) => { e.stopPropagation(); onNavigate?.('api'); }}>
                  Konsol API &amp; Kunci ➔
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liquid Glass Chat Preview Card (Clean, Punchy, Visual) */}
        <div className="lp-preview">
          <div className="lp-preview-bar">
            <div className="lp-preview-dots"><span></span><span></span><span></span></div>
            <div className="lp-preview-brand-center">
              <img src="/logo.png" alt="" className="lp-preview-logo-micro" />
              <span className="lp-preview-title">Deepernova Workspace</span>
            </div>
            <span className="lp-preview-status">● Online</span>
          </div>
          <div className="lp-preview-body">
            <div className="lp-msg lp-msg-user">
              <div className="lp-bubble lp-bubble-user">
                Rangkum analisa adopsi AI di Indonesia dan siapkan dokumen resminya.
              </div>
            </div>
            <div className="lp-msg lp-msg-ai">
              <img src="/logo.png" alt="Deepernova AI" className="lp-ai-avatar" />
              <div className="lp-bubble lp-bubble-ai">
                <p className="lp-bubble-intro">
                  Analisis selesai: Adopsi AI nasional tumbuh 38% dengan akselerasi otomatisasi dokumen. Berkas siap diunduh:
                </p>
                <div className="lp-preview-doc-chips">
                  <div className="lp-pchip word" onClick={onOpenOffice}>
                    <i className="fa-solid fa-file-word"></i>
                    <span>Analisa_AI_Indonesia.docx</span>
                  </div>
                  <div className="lp-pchip excel" onClick={onOpenOffice}>
                    <i className="fa-solid fa-file-excel"></i>
                    <span>Data_Proyeksi_2026.xlsx</span>
                  </div>
                  <div className="lp-pchip web" onClick={() => window.open(SEARCH_ENGINE_URL, '_blank', 'noopener,noreferrer')}>
                    <i className="fa-solid fa-globe"></i>
                    <span>6 Sumber Terverifikasi</span>
                  </div>
                </div>
                <div className="lp-preview-footer-chip">
                  <span>100% Gratis • Memori 1 Juta Token • Unduh Seketika</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="fitur" className="lp-features">
        <h2 className="lp-section-h2">Fitur Unggulan</h2>
        <p className="lp-section-sub">Kemampuan AI komprehensif dalam satu platform terpadu.</p>
        <div className="lp-features-grid">
          {features.map((f, i) => (
            <div key={i} className="lp-feat-card">
              <span className="lp-feat-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Studio Showcase */}
      <section id="studio" className="lp-studio">
        <div className="lp-studio-card">
          <div className="lp-studio-text">
            <span className="lp-overline">TYPERNOVA STUDIO</span>
            <h2>Buat Dokumen Word, Excel &amp; PPT Otomatis.</h2>
            <p className="lp-studio-desc">
              AI menyusun naskah akademis, rumus spreadsheet, dan slide presentasi yang siap Anda unduh langsung.
            </p>
            <div className="lp-studio-btns">
              <button onClick={onOpenOffice} className="lp-btn-primary">Buka Document Studio ➔</button>
              <button onClick={onStartChat} className="lp-btn-ghost">Coba di Chat</button>
            </div>
          </div>
          <div className="lp-studio-visual">
            <div className="lp-doc-pill"><div className="lp-doc-tag" style={{background:'#2563eb'}}>W</div>Word (.docx)</div>
            <div className="lp-doc-pill"><div className="lp-doc-tag" style={{background:'#16a34a'}}>X</div>Excel (.xlsx)</div>
            <div className="lp-doc-pill"><div className="lp-doc-tag" style={{background:'#ea580c'}}>P</div>PowerPoint (.pptx)</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="lp-faq">
        <h2 className="lp-section-h2">Pertanyaan Umum (FAQ)</h2>
        <p className="lp-section-sub">Informasi penting mengenai penggunaan Deepernova AI.</p>
        <div className="lp-faq-list">
          {faqs.map((f, i) => (
            <div key={i} className={`lp-faq-item ${activeFaq === i ? 'open' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
              <div className="lp-faq-q">
                <span>{f.q}</span>
                <span className="lp-faq-chevron">{activeFaq === i ? '−' : '+'}</span>
              </div>
              {activeFaq === i && <p className="lp-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final Conversion CTA */}
      <section className="lp-cta">
        <h2>Mulai Gunakan Deepernova AI.</h2>
        <p>Gratis, cepat, dan siap digunakan langsung dari browser Anda.</p>
        <button onClick={onStartChat} className="lp-btn-hero">Masuk Chat Sekarang ➔</button>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-brand">
              <img src="/logo.png" alt="" className="lp-brand-icon" />
              <div className="lp-brand-text">
                <span className="lp-brand-name">Deepernova AI</span>
                <span className="lp-brand-sub">indonesian technology research</span>
              </div>
            </div>
            <p>Platform AI untuk Indonesia.</p>
          </div>
          <div className="lp-footer-links">
            <button onClick={onStartChat}>Masuk Chat</button>
            <button onClick={onOpenOffice}>Document Studio</button>
            <button onClick={onOpenUniverse}>Universe</button>
            <a 
              href={SEARCH_ENGINE_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#10b981', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
            >
              🔍 Search Engine
            </a>
            <button onClick={() => onNavigate?.('api')} style={{ color: '#ea580c', fontWeight: '600' }}>
              ⚡ Developer API
            </button>
            <button onClick={() => onNavigate?.('help')} style={{ color: '#ea580c', fontWeight: 'bold' }}>
              Pusat Bantuan
            </button>
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} Deepernova.com • PT Deepernova AI Indonesia
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
