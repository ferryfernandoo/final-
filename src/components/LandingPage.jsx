import React, { useState, useEffect } from 'react';
import { SEARCH_ENGINE_URL } from '../apiConfig';
import './LandingPage.css';

const openSearch = (q) => {
  const base = (SEARCH_ENGINE_URL || 'https://playstation-clearance-eight-away.trycloudflare.com').replace(/\/+$/, '');
  const searchBase = base.endsWith('/search') ? base : `${base}/search`;
  const url = q ? `${searchBase}?q=${encodeURIComponent(q)}` : base;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const LandingPage = ({ onStartChat, onOpenOffice, onOpenUniverse, onOpenDrive, onOpenLogin, onNavigate, isAuthenticated, isGuest, user }) => {
  const [activeFaq, setActiveFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Pastikan scrolling halaman vertikal aktif dan mulus di semua perangkat & browser
  useEffect(() => {
    document.documentElement.classList.add('view-landing');
    document.body.classList.add('view-landing');
    document.body.setAttribute('data-view', 'landing');

    const prevHtmlOverflowY = document.documentElement.style.overflowY;
    const prevBodyOverflowY = document.body.style.overflowY;

    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'visible';

    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.documentElement.style.overflowY = prevHtmlOverflowY;
      document.body.style.overflowY = prevBodyOverflowY;
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const features = [
    { icon: 'fa-comments', title: 'Multi-Model Chat', desc: 'Penalaran mendalam, coding, dan obrolan multi-bahasa.' },
    { icon: 'fa-code', title: 'Coding Agent & IDE', desc: 'Cloud sandbox dengan live web preview otomatis.' },
    { icon: 'fa-file-lines', title: 'Typernova Studio', desc: 'Buat Word, Excel, dan PowerPoint secara instan.' },
    { icon: 'fa-image', title: 'Vision & Gambar', desc: 'Analisis foto, OCR teks, dan generate gambar.' },
    { icon: 'fa-brain', title: 'Memory Bank', desc: 'Mengingat preferensi dan konteks penting Anda.' },
    { icon: 'fa-shield-halved', title: 'Cloud Vault 3GB', desc: 'Penyimpanan dokumen terenkripsi dan aman.' },
  ];

  const faqs = [
    { q: 'Apakah Deepernova AI gratis?', a: 'Ya, seluruh fitur utama dapat digunakan 100% gratis tanpa biaya langganan.' },
    { q: 'Apakah wajib mendaftar akun?', a: 'Tidak. Anda bisa langsung menggunakan Mode Tamu tanpa perlu login.' },
    { q: 'Format dokumen apa saja yang didukung?', a: 'Microsoft Word (.docx), Microsoft Excel (.xlsx), dan PowerPoint (.pptx).' },
    { q: 'Bagaimana keamanan data saya?', a: 'Pada mode lokal, data tersimpan di perangkat Anda. Sesi akun dilindungi enkripsi penuh.' },
  ];

  const hasStoredAuth = () => {
    try {
      const raw = localStorage.getItem('authUser') || sessionStorage.getItem('authUser');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && !parsed.guest && (parsed.id || parsed.email || parsed.name || parsed.username));
    } catch (_) {
      return false;
    }
  };

  const loggedIn = Boolean((isAuthenticated && !isGuest) || (user && !isGuest && !user.guest) || hasStoredAuth());

  return (
    <div className="lp">
      {/* ===== NAVBAR ===== */}
      <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <button type="button" className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.png" alt="Deepernova AI" className="lp-brand-icon" />
            <span className="lp-brand-name">Deepernova</span>
          </button>

          <nav className="lp-nav-links" aria-label="Navigasi utama">
            <button type="button" onClick={() => onNavigate?.('agent')} className="lp-nav-agent-btn">
              <span className="lp-agent-dot"></span> AI Agent
            </button>
            <button type="button" onClick={() => scrollTo('produk')}>Produk</button>
            <button type="button" onClick={() => scrollTo('fitur')}>Fitur</button>
            <button type="button" onClick={() => onNavigate?.('api')}>API</button>
            <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
            <button type="button" onClick={() => onNavigate?.('help')}>Bantuan</button>
          </nav>

          <div className="lp-nav-actions">
            {loggedIn ? (
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-dark">
                Mulai Chat
              </button>
            ) : (
              <button type="button" onClick={onOpenLogin} className="lp-btn lp-btn-dark">
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ===== HERO ===== */}
        <section className="lp-hero">
          <div className="lp-container lp-hero-inner">
            <h1 className="lp-hero-title">
              Asisten AI yang <span className="lp-gradient">cerdas, cepat</span>,<br className="lp-br-lg" /> dan sepenuhnya gratis.
            </h1>

            <p className="lp-hero-sub">
              Chat multi-model, AI Agent mandiri dengan sandbox eksekusi kode, naskah Word/Excel/PPT otomatis — semua dalam satu ekosistem.
            </p>

            <div className="lp-hero-actions">
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-primary lp-btn-lg">
                Mulai Chat Gratis
                <i className="fa-solid fa-arrow-right" />
              </button>
              <button type="button" onClick={() => onNavigate?.('agent')} className="lp-btn lp-btn-agent lp-btn-lg">
                <i className="fa-solid fa-microchip" />
                AI Agent
                <span className="lp-badge-pulse">Sandbox</span>
              </button>
              <button type="button" onClick={onOpenOffice} className="lp-btn lp-btn-outline lp-btn-lg">
                <i className="fa-solid fa-file-lines" />
                Document Studio
              </button>
            </div>

            <ul className="lp-trust">
              <li><i className="fa-solid fa-check" /> Tanpa langganan</li>
              <li><i className="fa-solid fa-check" /> Sandbox Eksekusi Aman</li>
              <li><i className="fa-solid fa-check" /> Bahasa Indonesia</li>
            </ul>
          </div>
        </section>

        {/* ===== PRODUK ===== */}
        <section id="produk" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">Ekosistem</span>
              <h2>Satu platform, produk terintegrasi</h2>
            </div>

            <div className="lp-products">
              {/* AI Agent Sandbox */}
              <article className="lp-card lp-product is-clickable" onClick={() => onNavigate?.('agent')}>
                <div className="lp-product-icon purple"><i className="fa-solid fa-microchip" /></div>
                <h3>AI Agent</h3>
                <p>Agentic AI otonom canggih: manipulasi file sandbox, eksekusi kode terisolasi, live preview &amp; chain of work transparan.</p>
                <span className="lp-link">Buka AI Agent <i className="fa-solid fa-arrow-right" /></span>
              </article>

              {/* Search Engine */}
              <article 
                className="lp-card lp-product is-clickable"
                onClick={() => openSearch()}
              >
                <div className="lp-product-icon green"><i className="fa-solid fa-magnifying-glass" /></div>
                <h3>Search Engine</h3>
                <p>Mesin pencari web mandiri dengan data real-time dan ringkasan AI.</p>
                <form
                  className="lp-search"
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const q = e.currentTarget.elements.namedItem('q')?.value?.trim();
                    openSearch(q);
                  }}
                >
                  <input type="text" name="q" placeholder="Cari sesuatu..." autoComplete="off" aria-label="Kata kunci pencarian" />
                  <button type="submit" aria-label="Cari"><i className="fa-solid fa-arrow-right" /></button>
                </form>
                <span className="lp-link" style={{ marginTop: '12px' }}>
                  Buka Search Engine <i className="fa-solid fa-arrow-right" />
                </span>
              </article>

              {/* Developer API */}
              <article className="lp-card lp-product is-clickable" onClick={() => onNavigate?.('api')}>
                <div className="lp-product-icon orange"><i className="fa-solid fa-bolt" /></div>
                <h3>Developer API</h3>
                <p>Integrasikan model Gold 1.5 &amp; Search API ke aplikasi Anda. 1 juta token gratis.</p>
                <span className="lp-link">Buka Konsol API <i className="fa-solid fa-arrow-right" /></span>
              </article>

              {/* Document Studio */}
              <article className="lp-card lp-product is-clickable" onClick={onOpenOffice}>
                <div className="lp-product-icon blue"><i className="fa-solid fa-file-word" /></div>
                <h3>Document Studio</h3>
                <p>AI menyusun naskah, rumus spreadsheet, dan slide yang siap diunduh.</p>
                <span className="lp-link">Buka Studio <i className="fa-solid fa-arrow-right" /></span>
              </article>
            </div>
          </div>
        </section>

        {/* ===== FITUR ===== */}
        <section id="fitur" className="lp-section lp-section-muted">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">Fitur</span>
              <h2>Semua yang Anda butuhkan</h2>
              <p>Kemampuan AI lengkap dalam satu antarmuka yang sederhana.</p>
            </div>

            <div className="lp-features">
              {features.map((f) => (
                <div key={f.title} className="lp-feature">
                  <div className="lp-feature-icon"><i className={`fa-solid ${f.icon}`} /></div>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="lp-section">
          <div className="lp-container lp-container-sm">
            <div className="lp-section-head">
              <span className="lp-eyebrow">FAQ</span>
              <h2>Pertanyaan umum</h2>
            </div>

            <div className="lp-faq">
              {faqs.map((f, i) => {
                const open = activeFaq === i;
                return (
                  <div key={f.q} className={`lp-faq-item ${open ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="lp-faq-q"
                      aria-expanded={open}
                      onClick={() => setActiveFaq(open ? null : i)}
                    >
                      <span>{f.q}</span>
                      <i className="fa-solid fa-chevron-down" />
                    </button>
                    <div className="lp-faq-a"><p>{f.a}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="lp-section lp-section-tight">
          <div className="lp-container">
            <div className="lp-cta">
              <h2>Siap mencoba Deepernova?</h2>
              <p>Gratis dan langsung bisa dipakai dari browser Anda.</p>
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-light lp-btn-lg">
                Mulai Chat Sekarang
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/logo.png" alt="" className="lp-brand-icon" />
            <span className="lp-brand-name">Deepernova</span>
          </div>
          <div className="lp-footer-links">
            <button type="button" onClick={onStartChat}>Chat</button>
            <button type="button" onClick={onOpenOffice}>Document Studio</button>
            <button type="button" onClick={onOpenUniverse}>Universe</button>
            <button type="button" onClick={() => openSearch()}>Search Engine</button>
            <button type="button" onClick={() => onNavigate?.('api')}>Developer API</button>
            <button type="button" onClick={() => onNavigate?.('help')}>Pusat Bantuan</button>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          © {new Date().getFullYear()} Deepernova.com · PT Deepernova AI Indonesia
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
