import React, { useState } from 'react';
import './LandingPage.css';

const LandingPage = ({ onStartChat, onOpenOffice, onOpenUniverse, onOpenDrive, onOpenLogin, onNavigate, isAuthenticated, isGuest, user }) => {
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    {
      icon: '💬',
      title: 'Multi-Model Chat',
      desc: 'Penalaran tajam, coding, dan obrolan multi-bahasa (Indonesia, Daerah, & Asing).'
    },
    {
      icon: '⚡',
      title: 'Coding Agent & IDE',
      desc: 'Cloud Sandbox Monaco ala VS Code dengan AI Agent otonom, live web preview, dan patch multi-berkas.'
    },
    {
      icon: '📄',
      title: 'Typernova Studio',
      desc: 'Buat file Word (.docx), Excel (.xlsx), dan PowerPoint (.pptx) otomatis siap unduh.'
    },
    {
      icon: '🎨',
      title: 'Vision & Gambar',
      desc: 'Analisis isi foto, ekstraksi OCR teks, serta generate dan edit gambar referensi.'
    },
    {
      icon: '⏰',
      title: 'Alarm Mandiri',
      desc: 'Pasang pengingat dan alarm otomatis yang langsung dieksekusi di dalam aplikasi.'
    },
    {
      icon: '🧠',
      title: 'Memory Bank',
      desc: 'Mengingat preferensi dan konteks penting Anda di setiap sesi obrolan.'
    },
    {
      icon: '🌐',
      title: 'Web Search',
      desc: 'Akses data, fakta, dan berita internet terkini secara real-time.'
    },
  ];

  const faqs = [
    {
      q: 'Apakah Deepernova AI gratis?',
      a: 'Ya, seluruh fitur dapat digunakan 100% gratis tanpa biaya langganan.'
    },
    {
      q: 'Apakah wajib mendaftar akun?',
      a: 'Tidak. Anda bisa langsung menggunakan Mode Guest seketika tanpa perlu login.'
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

      {/* Navbar */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand" onClick={onStartChat}>
            <img src="/logo.png" alt="Deepernova AI" className="lp-brand-icon" />
            <div className="lp-brand-text">
              <span className="lp-brand-name">Deepernova AI</span>
              <span className="lp-brand-sub">indonesian technology research</span>
            </div>
          </div>

          <nav className="lp-links">
            <a href="#fitur">Fitur</a>
            <a href="#studio">Studio</a>
            <a href="#faq">FAQ</a>
            <button 
              onClick={() => onNavigate?.('help')} 
              style={{ background: 'none', border: 'none', color: '#fb923c', fontWeight: '700', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
            >
              Pusat Bantuan
            </button>
          </nav>

          <div className="lp-nav-actions">
            {isAuthenticated && !isGuest ? (
              <button onClick={onStartChat} className="lp-btn-primary">Buka Chat ➔</button>
            ) : (
              <>
                <button onClick={onOpenLogin} className="lp-btn-ghost">Masuk</button>
                <button onClick={onStartChat} className="lp-btn-primary">Mulai Gratis ➔</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Top-Right Subheader Drive Access Pill */}
      <div className="lp-drive-subnav-container">
        <button 
          onClick={onOpenDrive || (() => onNavigate?.('office'))}
          className="lp-drive-pill-btn"
          title="Buka Deepernova Cloud Drive Vault (3 GB Aman Terenkripsi SHA-256)"
          aria-label="Akses Cloud Drive"
        >
          <div className="lp-drive-pill-icon-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
              <path d="M12 12v9"></path>
              <path d="m8 17 4 4 4-4"></path>
            </svg>
            <span className="lp-drive-live-pulse" title="Zero-Trust Shield Active"></span>
          </div>
          <span className="lp-drive-pill-label">Drive</span>
          <span className="lp-drive-pill-badge">3 GB</span>
          <svg className="lp-drive-pill-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Hero Section */}
      <section className="lp-hero">
        <span className="lp-hero-tag">DEEPERNOVA AI</span>
        <h1 className="lp-hero-h1">
          Kecerdasan Buatan <br />
          <span className="lp-accent">Tanpa Batas.</span>
        </h1>
        <p className="lp-hero-sub">
          Obrolan multi-model, pembuat file Word/Excel/PPT otomatis, analisis gambar, dan alarm mandiri. Cepat, akurat, dan 100% gratis.
        </p>

        <div className="lp-hero-btns">
          <button onClick={onStartChat} className="lp-btn-hero">
            Mulai Chat Sekarang ➔
          </button>
          <button onClick={onOpenOffice} className="lp-btn-hero-outline">
            Document Studio
          </button>
        </div>

        {/* Search Engine Announcement Card */}
        <div className="lp-search-banner">
          <div className="lp-search-banner-glow"></div>
          <div className="lp-search-banner-inner">
            <div className="lp-search-banner-left">
              <div className="lp-search-banner-badge">
                <span className="lp-search-banner-pulse"></span>
                <span>PROYEK BARU</span>
              </div>
              <h3 className="lp-search-banner-title">
                Kami Telah Mengembangkan Proyek Search Engine Kami! 🔍
              </h3>
              <p className="lp-search-banner-desc">
                Coba mesin pencari mandiri DeeperNova — pencarian berkecepatan tinggi sub-20ms, relevansi informasi presisi, indeks real-time, dan anti-typo cerdas.
              </p>
            </div>
            <div className="lp-search-banner-right">
              <a
                href="https://little-omaha-falls-bronze.trycloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-search-banner-btn"
              >
                <span>Coba Sekarang</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>


        {/* Apple Squircle Liquid Glass Chat Preview Card */}
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
                Apa saja yang bisa saya buat di Deepernova AI?
              </div>
            </div>
            <div className="lp-msg lp-msg-ai">
              <img src="/logo.png" alt="Deepernova AI" className="lp-ai-avatar" />
              <div className="lp-bubble lp-bubble-ai">
                <p className="lp-bubble-intro">
                  Berikut kapabilitas utama yang siap Anda gunakan:
                </p>
                <div className="lp-preview-features-list">
                  <div className="lp-pf-item">
                    <span className="lp-pf-bullet">💬</span>
                    <div className="lp-pf-content">
                      <strong>Multi-Model Chat</strong>
                      <p>Diskusi analitis, coding, dan obrolan multi-bahasa.</p>
                    </div>
                  </div>
                  <div className="lp-pf-item">
                    <span className="lp-pf-bullet">📄</span>
                    <div className="lp-pf-content">
                      <strong>Typernova Studio</strong>
                      <p>Buat file Word (.docx), Excel (.xlsx), & PPT (.pptx) instan.</p>
                    </div>
                  </div>
                  <div className="lp-pf-item">
                    <span className="lp-pf-bullet">🎨</span>
                    <div className="lp-pf-content">
                      <strong>Vision & Gambar</strong>
                      <p>Analisis foto, baca teks OCR, dan edit gambar referensi.</p>
                    </div>
                  </div>
                  <div className="lp-pf-item">
                    <span className="lp-pf-bullet">⏰</span>
                    <div className="lp-pf-content">
                      <strong>Alarm Mandiri</strong>
                      <p>Pasang pengingat dan alarm otomatis langsung di aplikasi.</p>
                    </div>
                  </div>
                </div>
                <div className="lp-preview-footer-chip">
                  <span>100% Gratis • Mode Lokal Aman • Unduh Dokumen Langsung</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="fitur" className="lp-features">
        <h2 className="lp-section-h2">Fitur Unggulan</h2>
        <p className="lp-section-sub">Semua kemampuan AI yang Anda butuhkan dalam satu platform.</p>
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
            <h2>Buat Dokumen Word, Excel & PPT Otomatis.</h2>
            <p className="lp-studio-desc">
              Cukup berikan instruksi, AI menyusun format dan isi dokumen secara terstruktur dan siap Anda unduh seketika.
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
        <h2 className="lp-section-h2">FAQ</h2>
        <p className="lp-section-sub">Pertanyaan umum tentang Deepernova AI.</p>
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
        <button onClick={onStartChat} className="lp-btn-hero">Buka Chat Sekarang ➔</button>
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
            <button onClick={onStartChat}>Chat</button>
            <button onClick={onOpenOffice}>Document Studio</button>
            <button onClick={onOpenUniverse}>Universe</button>
            <button onClick={() => onNavigate?.('help')} style={{ color: '#ea580c', fontWeight: 'bold' }}>Pusat Bantuan</button>
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} Deepernova.com
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
