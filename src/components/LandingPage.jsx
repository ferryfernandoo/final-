import React, { useState, useEffect } from 'react';
import { SEARCH_ENGINE_URL } from '../apiConfig';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_OPTIONS,
  detectLanguageSync,
  detectLanguageAsync,
  saveLanguage
} from '../utils/languageDetector';
import { landingTranslations } from '../locales/landingTranslations';
import './LandingPage.css';

const openSearch = (q) => {
  const rawBase = (SEARCH_ENGINE_URL && !SEARCH_ENGINE_URL.includes('trycloudflare.com'))
    ? SEARCH_ENGINE_URL
    : '/search';
  const base = rawBase.replace(/\/+$/, '');
  const searchBase = base.endsWith('/search') ? base : `${base}/search`;
  const url = q ? `${searchBase}?q=${encodeURIComponent(q)}` : searchBase;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const LandingPage = ({ onStartChat, onOpenOffice, onOpenUniverse, onOpenDrive, onOpenLogin, onNavigate, isAuthenticated, isGuest, user }) => {
  const [activeFaq, setActiveFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => detectLanguageSync());
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Background country & locale detection
  useEffect(() => {
    let isMounted = true;
    detectLanguageAsync().then((detected) => {
      if (isMounted && detected && SUPPORTED_LANGUAGES.includes(detected)) {
        setCurrentLang(detected);
      }
    });

    const handleLanguageChanged = (e) => {
      const nextLang = e?.detail?.language;
      if (nextLang && SUPPORTED_LANGUAGES.includes(nextLang)) {
        setCurrentLang(nextLang);
      }
    };

    window.addEventListener('deepernova_language_changed', handleLanguageChanged);

    const handleOutsideClick = (e) => {
      if (!e.target.closest('.lp-lang-picker')) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);

    return () => {
      isMounted = false;
      window.removeEventListener('deepernova_language_changed', handleLanguageChanged);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

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

  const handleSelectLanguage = (code) => {
    saveLanguage(code);
    setCurrentLang(code);
    setLangDropdownOpen(false);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const t = landingTranslations[currentLang] || landingTranslations.en;
  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === currentLang) || LANGUAGE_OPTIONS[1];

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
              <span className="lp-agent-dot"></span> {t.nav.agent}
            </button>
            <button type="button" onClick={() => scrollTo('produk')}>{t.nav.products}</button>
            <button type="button" onClick={() => scrollTo('unduh-apk')} className="lp-nav-apk-btn">
              <i className="fa-brands fa-android" /> {t.nav?.download || 'Unduh APK'}
            </button>
            <button type="button" onClick={() => scrollTo('fitur')}>{t.nav.features}</button>
            <button type="button" onClick={() => onNavigate?.('api')}>{t.nav.api}</button>
            <button type="button" onClick={() => scrollTo('faq')}>{t.nav.faq}</button>
            <button type="button" onClick={() => onNavigate?.('help')}>{t.nav.help}</button>
          </nav>

          <div className="lp-nav-actions">
            {/* Language Selector Dropdown */}
            <div className="lp-lang-picker">
              <button
                type="button"
                className="lp-lang-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setLangDropdownOpen((prev) => !prev);
                }}
                aria-label={t.nav.language}
                aria-expanded={langDropdownOpen}
              >
                <i className="fa-solid fa-globe lp-lang-globe" />
                <span className="lp-lang-flag">{currentOption.flag}</span>
                <span className="lp-lang-label">{currentOption.shortLabel}</span>
                <i className={`fa-solid fa-chevron-down lp-lang-arrow ${langDropdownOpen ? 'open' : ''}`} />
              </button>

              {langDropdownOpen && (
                <div className="lp-lang-menu" role="menu">
                  <div className="lp-lang-menu-header">{t.nav.language}</div>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      className={`lp-lang-item ${opt.code === currentLang ? 'active' : ''}`}
                      onClick={() => handleSelectLanguage(opt.code)}
                      role="menuitem"
                    >
                      <span className="lp-lang-item-flag">{opt.flag}</span>
                      <span className="lp-lang-item-name">{opt.label}</span>
                      {opt.code === currentLang && (
                        <i className="fa-solid fa-check lp-lang-check" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loggedIn ? (
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-dark">
                {t.nav.startChat}
              </button>
            ) : (
              <button type="button" onClick={onOpenLogin} className="lp-btn lp-btn-dark">
                {t.nav.login}
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
              {t.hero.titleLead} <span className="lp-gradient">{t.hero.titleGradient}</span>{currentLang === 'zh' ? '、' : ','}<br className="lp-br-lg" /> {t.hero.titleTrail}
            </h1>

            <p className="lp-hero-sub">
              {t.hero.sub}
            </p>

            <div className="lp-hero-actions">
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-primary lp-btn-lg">
                {t.hero.startFreeChat}
                <i className="fa-solid fa-arrow-right" />
              </button>
              <button type="button" onClick={() => scrollTo('unduh-apk')} className="lp-btn lp-btn-apk lp-btn-lg">
                <i className="fa-brands fa-android" />
                {t.nav?.download || 'Unduh APK Android'}
              </button>
              <button type="button" onClick={() => onNavigate?.('agent')} className="lp-btn lp-btn-agent lp-btn-lg">
                <i className="fa-solid fa-microchip" />
                {t.hero.aiAgent}
                <span className="lp-badge-pulse">{t.hero.agentBadge}</span>
              </button>
              <button type="button" onClick={onOpenOffice} className="lp-btn lp-btn-outline lp-btn-lg">
                <i className="fa-solid fa-file-lines" />
                {t.hero.documentStudio}
              </button>
            </div>

            {/* Quick Hero APK Direct Download Bar */}
            <div className="lp-hero-apk-quickbar">
              <div className="lp-hero-apk-quickbar-label">
                <i className="fa-brands fa-android" />
                <span>{currentLang === 'id' ? 'Unduh Cepat APK Android Resmi:' : (currentLang === 'zh' ? '安卓客户端高速下载：' : 'Fast Android APK Downloads:')}</span>
              </div>
              <div className="lp-hero-apk-chips">
                <a
                  href="/DPN-Search.apk"
                  download="DPN-Search.apk"
                  className="lp-hero-apk-chip is-search"
                  title="Unduh DPN Search APK"
                >
                  <img src="/search/icons/icon-192.png" alt="Search" className="lp-chip-icon" onError={(e) => { e.currentTarget.src = '/logo192.png'; }} />
                  <div className="lp-chip-text">
                    <span className="lp-chip-title">DPN Search APK</span>
                    <span className="lp-chip-sub">6.6 MB · Mesin Pencari Cepat</span>
                  </div>
                  <span className="lp-chip-action"><i className="fa-solid fa-download" /> Unduh</span>
                </a>

                <a
                  href="/deepernova-ai.apk"
                  download="deepernova-ai.apk"
                  className="lp-hero-apk-chip is-ai"
                  title="Unduh DeeperNova AI Assistant APK"
                >
                  <img src="/logo192.png" alt="AI" className="lp-chip-icon" />
                  <div className="lp-chip-text">
                    <span className="lp-chip-title">DeeperNova AI APK</span>
                    <span className="lp-chip-sub">13 MB · Asisten AI & Studio</span>
                  </div>
                  <span className="lp-chip-action"><i className="fa-solid fa-download" /> Unduh</span>
                </a>
              </div>
            </div>

            <ul className="lp-trust">
              {t.hero.trust.map((item, idx) => (
                <li key={idx}><i className="fa-solid fa-check" /> {item}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== UNDUH APK ANDROID (Tepat di Bawah Hero agar Langsung Terlihat) ===== */}
        <section id="unduh-apk" className="lp-section lp-download-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow"><i className="fa-brands fa-android" /> {t.download?.eyebrow || 'Aplikasi Android Resmi'}</span>
              <h2>{t.download?.heading || 'Unduh Aplikasi Deepernova (.APK)'}</h2>
              <p>{t.download?.sub || 'Gunakan Deepernova langsung dari ponsel Android Anda dengan performa maksimal dan antarmuka mandiri tanpa hambatan browser.'}</p>
            </div>

            <div className="lp-download-grid">
              {/* Card 1: DeeperNova Search Engine APK */}
              <div className="lp-download-card is-search">
                <div className="lp-download-badge">
                  <i className="fa-solid fa-bolt" /> {t.download?.searchCard?.badge || 'Search Engine APK'}
                </div>
                <div className="lp-download-header">
                  <div className="lp-download-icon-wrap search-glow">
                    <img src="/search/icons/icon-192.png" alt="DeeperNova Search" className="lp-download-icon" onError={(e) => { e.currentTarget.src = '/logo192.png'; }} />
                  </div>
                  <div>
                    <h3 className="lp-download-title">{t.download?.searchCard?.title || 'DeeperNova Search'}</h3>
                    <p className="lp-download-subtitle">{t.download?.searchCard?.subtitle || 'Mesin Pencari Mandiri Cepat & Ringan'}</p>
                    <div className="lp-download-meta">
                      <span className="lp-download-pill"><i className="fa-solid fa-file-zipper" /> {t.download?.searchCard?.size || '6.6 MB'}</span>
                      <span className="lp-download-pill"><i className="fa-solid fa-tag" /> {t.download?.searchCard?.version || 'v1.0.0'}</span>
                      <span className="lp-download-pill pill-green"><i className="fa-brands fa-android" /> Android 5.0+</span>
                    </div>
                  </div>
                </div>

                <ul className="lp-download-points">
                  {(t.download?.searchCard?.points || [
                    '⚡ Ukuran ultra ringan (6.6 MB) & konsumsi memori minim',
                    '🔍 Pencarian web mandiri real-time tanpa iklan & tracker',
                    '📱 Mode layar penuh native tanpa address bar browser',
                    '🛡️ Privasi terjamin, aman tanpa tracking personal'
                  ]).map((point, idx) => (
                    <li key={idx}><i className="fa-solid fa-circle-check" /> <span>{point}</span></li>
                  ))}
                </ul>

                <div className="lp-download-action">
                  <a
                    href="/DPN-Search.apk"
                    download="DPN-Search.apk"
                    className="lp-btn lp-btn-dl lp-btn-dl-search"
                  >
                    <i className="fa-solid fa-download" />
                    <span>{t.download?.searchCard?.btn || 'Unduh Search APK (6.6 MB)'}</span>
                  </a>
                  <span className="lp-download-note">Web-Base PWA Container · Kecepatan Tinggi CDN</span>
                </div>
              </div>

              {/* Card 2: DeeperNova AI Assistant APK */}
              <div className="lp-download-card is-ai">
                <div className="lp-download-badge ai-badge">
                  <i className="fa-solid fa-bolt" /> {t.download?.aiCard?.badge || 'Web-Base AI Cloud APK'}
                </div>
                <div className="lp-download-header">
                  <div className="lp-download-icon-wrap ai-glow">
                    <img src="/logo192.png" alt="DeeperNova AI" className="lp-download-icon" />
                  </div>
                  <div>
                    <h3 className="lp-download-title">{t.download?.aiCard?.title || 'DeeperNova AI Assistant'}</h3>
                    <p className="lp-download-subtitle">{t.download?.aiCard?.subtitle || 'Asisten AI & Typernova Document Studio'}</p>
                    <div className="lp-download-meta">
                      <span className="lp-download-pill"><i className="fa-solid fa-file-zipper" /> {t.download?.aiCard?.size || '13 MB'}</span>
                      <span className="lp-download-pill"><i className="fa-solid fa-tag" /> {t.download?.aiCard?.version || 'v2.5.0'}</span>
                      <span className="lp-download-pill pill-purple"><i className="fa-brands fa-android" /> Web-Base Pure</span>
                    </div>
                  </div>
                </div>

                <ul className="lp-download-points">
                  {(t.download?.aiCard?.points || [
                    '🧠 Multi-model AI cerdas untuk penalaran & percakapan mendalam',
                    '✍️ Typernova Studio (Otomatisasi Word, Excel, PowerPoint)',
                    '💻 Coding Agent Sandbox dengan eksekusi kode mandiri',
                    '☁️ Cloud Vault terenkripsi & sinkronisasi otomatis'
                  ]).map((point, idx) => (
                    <li key={idx}><i className="fa-solid fa-circle-check" /> <span>{point}</span></li>
                  ))}
                </ul>

                <div className="lp-download-action">
                  <a
                    href="/deepernova-ai.apk"
                    download="deepernova-ai.apk"
                    className="lp-btn lp-btn-dl lp-btn-dl-ai"
                  >
                    <i className="fa-solid fa-download" />
                    <span>{t.download?.aiCard?.btn || 'Unduh DeeperNova AI APK (13 MB)'}</span>
                  </a>
                  <span className="lp-download-note">Web-Base Ringan & Cepat (13 MB) · Koneksi Langsung deepernova.com</span>
                </div>
              </div>
            </div>

            {/* Guide Step-by-Step */}
            <div className="lp-download-guide">
              <div className="lp-guide-head">
                <i className="fa-solid fa-circle-info" />
                <h4>{t.download?.guideTitle || 'Panduan Instalasi APK Android:'}</h4>
              </div>
              <div className="lp-guide-steps">
                {(t.download?.guideSteps || [
                  'Klik tombol unduh untuk file APK yang Anda inginkan di atas.',
                  'Setelah selesai diunduh, buka file .apk dari notifikasi atau Pengelola File.',
                  'Jika muncul peringatan keamanan, pilih Setelan (Settings) lalu aktifkan "Izinkan penginstalan dari sumber ini".',
                  'Pilih Instal (Install) dan aplikasi Deepernova siap digunakan!'
                ]).map((step, idx) => (
                  <div key={idx} className="lp-guide-step">
                    <span className="lp-step-num">{idx + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRODUK ===== */}
        <section id="produk" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">{t.products.eyebrow}</span>
              <h2>{t.products.heading}</h2>
            </div>

            <div className="lp-products">
              {/* AI Agent Sandbox */}
              <article className="lp-card lp-product is-clickable" onClick={() => onNavigate?.('agent')}>
                <div className="lp-product-icon purple"><i className="fa-solid fa-microchip" /></div>
                <h3>{t.products.agent.title}</h3>
                <p>{t.products.agent.desc}</p>
                <span className="lp-link">{t.products.agent.link} <i className="fa-solid fa-arrow-right" /></span>
              </article>

              {/* Search Engine */}
              <article 
                className="lp-card lp-product is-clickable"
                onClick={() => openSearch()}
              >
                <div className="lp-product-icon green"><i className="fa-solid fa-magnifying-glass" /></div>
                <h3>{t.products.search.title}</h3>
                <p>{t.products.search.desc}</p>
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
                  <input
                    type="text"
                    name="q"
                    placeholder={t.products.search.placeholder}
                    autoComplete="off"
                    aria-label="Search"
                  />
                  <button type="submit" aria-label="Search"><i className="fa-solid fa-arrow-right" /></button>
                </form>
                <span className="lp-link" style={{ marginTop: '12px' }}>
                  {t.products.search.link} <i className="fa-solid fa-arrow-right" />
                </span>
              </article>

              {/* Developer API */}
              <article className="lp-card lp-product is-clickable" onClick={() => onNavigate?.('api')}>
                <div className="lp-product-icon orange"><i className="fa-solid fa-bolt" /></div>
                <h3>{t.products.api.title}</h3>
                <p>{t.products.api.desc}</p>
                <span className="lp-link">{t.products.api.link} <i className="fa-solid fa-arrow-right" /></span>
              </article>

              {/* Document Studio */}
              <article className="lp-card lp-product is-clickable" onClick={onOpenOffice}>
                <div className="lp-product-icon blue"><i className="fa-solid fa-file-word" /></div>
                <h3>{t.products.docs.title}</h3>
                <p>{t.products.docs.desc}</p>
                <span className="lp-link">{t.products.docs.link} <i className="fa-solid fa-arrow-right" /></span>
              </article>
            </div>
          </div>
        </section>

        {/* ===== FITUR ===== */}
        <section id="fitur" className="lp-section lp-section-muted">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">{t.features.eyebrow}</span>
              <h2>{t.features.heading}</h2>
              <p>{t.features.sub}</p>
            </div>

            <div className="lp-features">
              {t.features.items.map((f) => (
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
              <span className="lp-eyebrow">{t.faq.eyebrow}</span>
              <h2>{t.faq.heading}</h2>
            </div>

            <div className="lp-faq">
              {t.faq.items.map((f, i) => {
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
              <h2>{t.cta.heading}</h2>
              <p>{t.cta.sub}</p>
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-light lp-btn-lg">
                {t.cta.button}
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
            <button type="button" onClick={onStartChat}>{t.footer.chat}</button>
            <button type="button" onClick={() => scrollTo('unduh-apk')} style={{ color: '#ea580c', fontWeight: 600 }}>
              <i className="fa-brands fa-android" /> {t.nav?.download || 'Unduh APK'}
            </button>
            <button type="button" onClick={onOpenOffice}>{t.footer.documentStudio}</button>
            <button type="button" onClick={onOpenUniverse}>{t.footer.universe}</button>
            <button type="button" onClick={() => openSearch()}>{t.footer.searchEngine}</button>
            <button type="button" onClick={() => onNavigate?.('api')}>{t.footer.api}</button>
            <button type="button" onClick={() => onNavigate?.('help')}>{t.footer.help}</button>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <div className="lp-footer-bottom-content">
            <span>© {new Date().getFullYear()} Deepernova.com · {t.footer.copyright}</span>
            <div className="lp-footer-lang">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  className={`lp-footer-lang-btn ${opt.code === currentLang ? 'active' : ''}`}
                  onClick={() => handleSelectLanguage(opt.code)}
                >
                  <span>{opt.flag}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
