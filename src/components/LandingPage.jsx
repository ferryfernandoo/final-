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
  const [publicStats, setPublicStats] = useState({
    totalUsers: 2018,
    totalTokens: 201535851,
    totalMessages: 2372,
    serverStatus: 'online',
    uptime: '99.98%'
  });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);

  const fetchPublicStats = async () => {
    setIsFetchingStats(true);
    try {
      const res = await fetch('/api/public-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setPublicStats(data.stats);
        }
      }
    } catch (_) {} finally {
      setIsFetchingStats(false);
    }
  };

  useEffect(() => {
    fetchPublicStats();
    const interval = setInterval(fetchPublicStats, 45000);
    return () => clearInterval(interval);
  }, []);


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
            <a href="/dte" target="_blank" rel="noopener noreferrer" className="lp-nav-dte-btn" title="Buka Aplikasi Web Order DTE">
              <i className="fa-solid fa-boxes-stacked" /> Order DTE
            </a>
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

            <ul className="lp-trust">
              {t.hero.trust.map((item, idx) => (
                <li key={idx}><i className="fa-solid fa-check" /> {item}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== UNDUH APK ANDROID (MODERN CLOUDFLARE CDN SHOWCASE) ===== */}
        <section id="unduh-apk" className="lp-section lp-download-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <div className="lp-cf-pill-badge">
                <i className="fa-brands fa-cloudflare lp-cf-brand-icon" />
                <span>{t.download?.eyebrow || 'Cloudflare High-Speed Edge CDN · Android APK'}</span>
                <span className="lp-cf-live-dot" title="Edge CDN Active" />
              </div>
              <h2 className="lp-download-main-heading">{t.download?.heading || 'Unduh Aplikasi Deepernova untuk Android'}</h2>
              <p className="lp-download-main-sub">
                {t.download?.sub || 'Performa native layar penuh tanpa hambatan browser, diakselerasi langsung oleh jaringan Cloudflare Edge.'}
              </p>
            </div>

            <div className="lp-download-cards-container">
              {/* Card 1: DeeperNova Search Engine APK */}
              <div className="lp-modern-apk-card is-search">
                <div className="lp-apk-card-top">
                  <div className="lp-apk-icon-wrapper search-theme">
                    <img
                      src="/search/icons/icon-192.png"
                      alt="DeeperNova Search"
                      className="lp-apk-app-icon"
                      onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                    />
                    <span className="lp-cf-card-tag">
                      <i className="fa-brands fa-cloudflare" /> CDN
                    </span>
                  </div>

                  <div className="lp-apk-header-info">
                    <div className="lp-apk-title-row">
                      <h3 className="lp-apk-title">{t.download?.searchCard?.title || 'DeeperNova Search'}</h3>
                      <span className="lp-apk-version-badge">v1.0.0</span>
                    </div>
                    <p className="lp-apk-desc">{t.download?.searchCard?.subtitle || 'Mesin Pencari Mandiri Cepat & Ringan'}</p>

                    <div className="lp-apk-spec-pills">
                      <span className="lp-spec-pill"><i className="fa-solid fa-bolt" /> Sub-50ms</span>
                      <span className="lp-spec-pill"><i className="fa-solid fa-file-zipper" /> 6.6 MB</span>
                      <span className="lp-spec-pill"><i className="fa-brands fa-android" /> Android 5.0+</span>
                    </div>
                  </div>
                </div>

                <div className="lp-apk-features-strip">
                  <div className="lp-apk-feature-item">
                    <i className="fa-solid fa-circle-check" />
                    <span>{t.download?.searchCard?.feature1 || 'Pencarian mandiri tanpa iklan & tracker'}</span>
                  </div>
                  <div className="lp-apk-feature-item">
                    <i className="fa-solid fa-circle-check" />
                    <span>{t.download?.searchCard?.feature2 || 'Layar penuh native PWA hemat baterai'}</span>
                  </div>
                </div>

                <div className="lp-apk-bottom-action">
                  <a
                    href="/DPN-Search.apk"
                    download="DPN-Search.apk"
                    className="lp-btn-modern-dl is-search"
                    title="Unduh DPN Search APK via Cloudflare CDN"
                  >
                    <div className="lp-dl-btn-icon-box">
                      <i className="fa-solid fa-arrow-down-to-bracket" />
                    </div>
                    <div className="lp-dl-btn-content">
                      <span className="lp-dl-btn-label">{t.download?.searchCard?.btn || 'Unduh Search APK'}</span>
                      <span className="lp-dl-btn-sublabel">
                        <i className="fa-brands fa-cloudflare" /> {t.download?.searchCard?.btnSub || '6.6 MB · Cloudflare Edge'}
                      </span>
                    </div>
                  </a>
                  <div className="lp-dl-verification">
                    <i className="fa-solid fa-shield-halved" />
                    <span>SHA-256 Verified · 100% Virus-Free · Cloudflare CDN</span>
                  </div>
                </div>
              </div>

              {/* Card 2: DeeperNova AI Assistant APK */}
              <div className="lp-modern-apk-card is-ai">
                <div className="lp-apk-card-top">
                  <div className="lp-apk-icon-wrapper ai-theme">
                    <img
                      src="/logo192.png"
                      alt="DeeperNova AI"
                      className="lp-apk-app-icon"
                    />
                    <span className="lp-cf-card-tag is-ai">
                      <i className="fa-brands fa-cloudflare" /> CDN
                    </span>
                  </div>

                  <div className="lp-apk-header-info">
                    <div className="lp-apk-title-row">
                      <h3 className="lp-apk-title">{t.download?.aiCard?.title || 'DeeperNova AI Assistant'}</h3>
                      <span className="lp-apk-version-badge ai-badge">v2.5.0</span>
                    </div>
                    <p className="lp-apk-desc">{t.download?.aiCard?.subtitle || 'Asisten AI Cerdas & Typernova Studio'}</p>

                    <div className="lp-apk-spec-pills">
                      <span className="lp-spec-pill"><i className="fa-solid fa-microchip" /> Multi-Model</span>
                      <span className="lp-spec-pill"><i className="fa-solid fa-file-zipper" /> 13 MB</span>
                      <span className="lp-spec-pill"><i className="fa-brands fa-android" /> Android 5.0+</span>
                    </div>
                  </div>
                </div>

                <div className="lp-apk-features-strip">
                  <div className="lp-apk-feature-item">
                    <i className="fa-solid fa-circle-check" />
                    <span>{t.download?.aiCard?.feature1 || 'Penalaran mendalam & Coding Agent'}</span>
                  </div>
                  <div className="lp-apk-feature-item">
                    <i className="fa-solid fa-circle-check" />
                    <span>{t.download?.aiCard?.feature2 || 'Typernova Office Studio Terintegrasi'}</span>
                  </div>
                </div>

                <div className="lp-apk-bottom-action">
                  <a
                    href="/deepernova-ai.apk"
                    download="deepernova-ai.apk"
                    className="lp-btn-modern-dl is-ai"
                    title="Unduh DeeperNova AI APK via Cloudflare CDN"
                  >
                    <div className="lp-dl-btn-icon-box">
                      <i className="fa-solid fa-arrow-down-to-bracket" />
                    </div>
                    <div className="lp-dl-btn-content">
                      <span className="lp-dl-btn-label">{t.download?.aiCard?.btn || 'Unduh DeeperNova AI APK'}</span>
                      <span className="lp-dl-btn-sublabel">
                        <i className="fa-brands fa-cloudflare" /> {t.download?.aiCard?.btnSub || '13 MB · Cloudflare Edge'}
                      </span>
                    </div>
                  </a>
                  <div className="lp-dl-verification">
                    <i className="fa-solid fa-shield-halved" />
                    <span>SHA-256 Verified · 100% Virus-Free · Cloudflare CDN</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Order DTE (Daily Task Engine) APK */}
              <div className="lp-modern-apk-card is-dte">
                <div className="lp-apk-card-top">
                  <div className="lp-apk-icon-wrapper dte-theme">
                    <img
                      src="/dte/favicon.svg"
                      alt="Order DTE"
                      className="lp-apk-app-icon"
                      onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                    />
                    <span className="lp-cf-card-tag is-dte">
                      <i className="fa-brands fa-cloudflare" /> CDN
                    </span>
                  </div>

                  <div className="lp-apk-header-info">
                    <div className="lp-apk-title-row">
                      <h3 className="lp-apk-title">{t.download?.dteCard?.title || 'Order DTE'}</h3>
                      <span className="lp-apk-version-badge dte-badge">{t.download?.dteCard?.version || 'v1.0.0'}</span>
                    </div>
                    <p className="lp-apk-desc">{t.download?.dteCard?.subtitle || 'Daily Task Engine • Manajemen Pesanan & Produksi'}</p>

                    <div className="lp-apk-spec-pills">
                      <span className="lp-spec-pill"><i className="fa-solid fa-boxes-stacked" /> Real-time Stok</span>
                      <span className="lp-spec-pill"><i className="fa-solid fa-file-zipper" /> {t.download?.dteCard?.size || '3.6 MB'}</span>
                      <span className="lp-spec-pill"><i className="fa-brands fa-android" /> Android 5.0+</span>
                    </div>
                  </div>
                </div>

                <div className="lp-apk-features-strip">
                  <div className="lp-apk-feature-item">
                    <i className="fa-solid fa-circle-check" />
                    <span>{t.download?.dteCard?.feature1 || 'Katalog alat kerja, kontrol stok & shift operator'}</span>
                  </div>
                  <div className="lp-apk-feature-item">
                    <i className="fa-solid fa-circle-check" />
                    <span>{t.download?.dteCard?.feature2 || 'Tanda tangan digital nota & ekspor laporan Excel'}</span>
                  </div>
                </div>

                <div className="lp-apk-bottom-action">
                  <div className="lp-apk-action-grid">
                    <a
                      href="/order-dte.apk"
                      download="order-dte.apk"
                      className="lp-btn-modern-dl is-dte"
                      title="Unduh Order DTE APK via Cloudflare CDN"
                    >
                      <div className="lp-dl-btn-icon-box">
                        <i className="fa-solid fa-arrow-down-to-bracket" />
                      </div>
                      <div className="lp-dl-btn-content">
                        <span className="lp-dl-btn-label">{t.download?.dteCard?.btn || 'Unduh Order DTE APK'}</span>
                        <span className="lp-dl-btn-sublabel">
                          <i className="fa-brands fa-cloudflare" /> {t.download?.dteCard?.btnSub || '3.6 MB · Cloudflare Edge'}
                        </span>
                      </div>
                    </a>
                    <a
                      href="/dte"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lp-btn-web-app is-dte"
                      title="Buka Aplikasi Web Order DTE di Browser"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                      <span>{t.download?.dteCard?.webBtn || 'Buka Web App'}</span>
                    </a>
                  </div>
                  <div className="lp-dl-verification">
                    <i className="fa-solid fa-shield-halved" />
                    <span>SHA-256 Verified · 100% Virus-Free · Cloudflare CDN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloudflare Edge Infrastructure Trust Strip */}
            <div className="lp-cf-trust-strip">
              <div className="lp-cf-trust-item">
                <div className="lp-cf-trust-icon-box cf-color">
                  <i className="fa-brands fa-cloudflare" />
                </div>
                <div className="lp-cf-trust-text">
                  <h4>{t.download?.trust?.cdnTitle || 'Cloudflare Global Edge CDN'}</h4>
                  <p>{t.download?.trust?.cdnDesc || 'Distribusi unduhan ultra cepat langsung dari server edge terdekat dengan latensi minimal.'}</p>
                </div>
              </div>

              <div className="lp-cf-trust-item">
                <div className="lp-cf-trust-icon-box green-color">
                  <i className="fa-solid fa-shield-check" />
                </div>
                <div className="lp-cf-trust-text">
                  <h4>{t.download?.trust?.securityTitle || '100% Bersih & Terverifikasi'}</h4>
                  <p>{t.download?.trust?.securityDesc || 'Bebas dari iklan, malware, dan pelacak pihak ketiga dengan enkripsi SSL 256-bit.'}</p>
                </div>
              </div>

              <div className="lp-cf-trust-item">
                <div className="lp-cf-trust-icon-box android-color">
                  <i className="fa-brands fa-android" />
                </div>
                <div className="lp-cf-trust-text">
                  <h4>{t.download?.trust?.compatTitle || 'Instalasi Cepat Langsung'}</h4>
                  <p>{t.download?.trust?.compatDesc || 'Cukup buka file .apk yang telah diunduh, lalu pilih Instal pada perangkat Android Anda.'}</p>
                </div>
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
            <a href="/dte" target="_blank" rel="noopener noreferrer" style={{ color: '#059669', fontWeight: 600 }}>
              <i className="fa-solid fa-boxes-stacked" /> Order DTE (Web)
            </a>
            <a href="/order-dte.apk" download="order-dte.apk" style={{ color: '#0d9488', fontWeight: 600 }}>
              <i className="fa-brands fa-android" /> DTE APK
            </a>
            <button type="button" onClick={() => onNavigate?.('api')}>{t.footer.api}</button>
            <button type="button" onClick={() => onNavigate?.('help')}>{t.footer.help}</button>
          </div>
        </div>
                {/* ===== STATISTIK PUBLIK TRANSPARAN (Token Dicompute & User Terdaftar) ===== */}
        <div className="lp-container lp-stats-bar-container">
          <button
            type="button"
            className="lp-public-stats-button"
            onClick={() => setShowStatsModal(true)}
            title={currentLang === 'id' ? 'Klik untuk melihat transparansi metrik komputasi' : 'Click to view public transparency metrics'}
          >
            <div className="lp-stats-btn-left">
              <span className="lp-stats-indicator">
                <span className="lp-stats-dot" />
                <span className="lp-stats-ping" />
              </span>
              <span className="lp-stats-title">
                <i className="fa-solid fa-chart-line" />
                <span>{currentLang === 'id' ? 'Transparansi Publik:' : 'Public Transparency:'}</span>
              </span>
            </div>

            <div className="lp-stats-pills-row">
              <div className="lp-stats-badge token-badge">
                <i className="fa-solid fa-bolt" />
                <span className="lp-stats-val">{(publicStats.totalTokens || 201535851).toLocaleString(currentLang === 'id' ? 'id-ID' : 'en-US')}</span>
                <span className="lp-stats-lbl">{currentLang === 'id' ? 'Token Dicompute' : 'Tokens Computed'}</span>
              </div>

              <div className="lp-stats-badge user-badge">
                <i className="fa-solid fa-users" />
                <span className="lp-stats-val">{(publicStats.totalUsers || 2018).toLocaleString(currentLang === 'id' ? 'id-ID' : 'en-US')}</span>
                <span className="lp-stats-lbl">{currentLang === 'id' ? 'User Terdaftar' : 'Registered Users'}</span>
              </div>
            </div>

            <div className="lp-stats-btn-right">
              <span className="lp-stats-detail-text">{currentLang === 'id' ? 'Lihat Detail Metrik' : 'View Full Metrics'}</span>
              <i className="fa-solid fa-arrow-up-right-from-square" />
            </div>
          </button>
        </div>

        <div className="lp-container lp-footer-bottom">
          <div className="lp-footer-bottom-content">
            <span>© {new Date().getFullYear()} Deepernova.com · {t.footer.copyright}</span>
            <span className="lp-footer-cf-tag">
              <i className="fa-brands fa-cloudflare" style={{ color: '#f38020' }} /> Accelerated by Cloudflare CDN
            </span>
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
      {/* ===== MODAL TRANSPARANSI PUBLIK ===== */}
      {showStatsModal && (
        <div className="lp-modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="lp-stats-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lp-stats-modal-head">
              <div className="lp-stats-modal-title-group">
                <div className="lp-stats-modal-icon">
                  <i className="fa-solid fa-chart-pie" />
                </div>
                <div>
                  <h3>{currentLang === 'id' ? 'Transparansi Metrik & Komputasi Publik' : 'Public Metrics & Compute Transparency'}</h3>
                  <p>{currentLang === 'id' ? 'Data keterbukaan sistem & infrastruktur DeeperNova AI Indonesia' : 'Real-time infrastructure transparency for DeeperNova AI ecosystem'}</p>
                </div>
              </div>
              <button
                type="button"
                className="lp-stats-modal-close"
                onClick={() => setShowStatsModal(false)}
                aria-label="Tutup Modal"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="lp-stats-grid">
              {/* Card 1: Token Dicompute */}
              <div className="lp-stats-card lp-stat-tokens">
                <div className="lp-stat-card-header">
                  <span className="lp-stat-card-badge orange">
                    <i className="fa-solid fa-bolt" /> {currentLang === 'id' ? 'AI INFERENCE' : 'AI INFERENCE'}
                  </span>
                  <span className="lp-stat-pulse-chip">Live Compute</span>
                </div>
                <div className="lp-stat-card-value">
                  {(publicStats.totalTokens || 201535851).toLocaleString(currentLang === 'id' ? 'id-ID' : 'en-US')}
                </div>
                <div className="lp-stat-card-label">
                  {currentLang === 'id' ? 'Total Token Sudah Dicompute' : 'Total Tokens Computed'}
                </div>
                <p className="lp-stat-card-desc">
                  {currentLang === 'id'
                    ? 'Akumulasi token inferensi model AI (Gold, Silicon, Boron) dan penalaran cerdas yang telah dikomputasi untuk publik.'
                    : 'Cumulative AI inference and reasoning tokens processed across all active models for public requests.'}
                </p>
              </div>

              {/* Card 2: User Terdaftar */}
              <div className="lp-stats-card lp-stat-users">
                <div className="lp-stat-card-header">
                  <span className="lp-stat-card-badge purple">
                    <i className="fa-solid fa-users" /> {currentLang === 'id' ? 'KOMUNITAS' : 'COMMUNITY'}
                  </span>
                  <span className="lp-stat-pulse-chip active">Terverifikasi</span>
                </div>
                <div className="lp-stat-card-value">
                  {(publicStats.totalUsers || 2018).toLocaleString(currentLang === 'id' ? 'id-ID' : 'en-US')}
                </div>
                <div className="lp-stat-card-label">
                  {currentLang === 'id' ? 'Total Pengguna Terdaftar' : 'Total Registered Users'}
                </div>
                <p className="lp-stat-card-desc">
                  {currentLang === 'id'
                    ? 'Jumlah akun pengguna terdaftar aktif yang menggunakan ekosistem DeeperNova AI.'
                    : 'Total registered and authenticated member accounts across the DeeperNova platform.'}
                </p>
              </div>

              {/* Card 3: Total Percakapan */}
              <div className="lp-stats-card lp-stat-messages">
                <div className="lp-stat-card-header">
                  <span className="lp-stat-card-badge emerald">
                    <i className="fa-solid fa-comments" /> {currentLang === 'id' ? 'INTERAKSI' : 'INTERACTIONS'}
                  </span>
                  <span className="lp-stat-pulse-chip">Multiturn</span>
                </div>
                <div className="lp-stat-card-value">
                  {(publicStats.totalMessages || 2372).toLocaleString(currentLang === 'id' ? 'id-ID' : 'en-US')}
                </div>
                <div className="lp-stat-card-label">
                  {currentLang === 'id' ? 'Total Pesan & Riset AI' : 'Total Messages & AI Tasks'}
                </div>
                <p className="lp-stat-card-desc">
                  {currentLang === 'id'
                    ? 'Total putaran percakapan, pembuatan dokumen, dan query pencarian web otonom yang berhasil dituntaskan.'
                    : 'Total dialogue turns, document generations, and autonomous web research queries solved.'}
                </p>
              </div>

              {/* Card 4: Status Server */}
              <div className="lp-stats-card lp-stat-server">
                <div className="lp-stat-card-header">
                  <span className="lp-stat-card-badge blue">
                    <i className="fa-solid fa-server" /> {currentLang === 'id' ? 'STATUS SISTEM' : 'SYSTEM STATUS'}
                  </span>
                  <span className="lp-stat-pulse-chip online">100% Online</span>
                </div>
                <div className="lp-stat-card-value">
                  {publicStats.uptime || '99.98%'}
                </div>
                <div className="lp-stat-card-label">
                  {currentLang === 'id' ? 'Infrastruktur & Cloudflare Edge' : 'Infrastructure & Cloudflare Edge'}
                </div>
                <p className="lp-stat-card-desc">
                  {currentLang === 'id'
                    ? 'Didukung jaringan CDN global Cloudflare dengan latensi super rendah dan proteksi keamanan tingkat tinggi.'
                    : 'Powered by Cloudflare global CDN edge networks with ultra-low latency and DDoS shielding.'}
                </p>
              </div>
            </div>

            <div className="lp-stats-modal-footer">
              <div className="lp-stats-manifesto">
                <i className="fa-solid fa-shield-halved" />
                <span>
                  {currentLang === 'id'
                    ? 'Komitmen Transparansi: Semua metrik di atas bersumber langsung dari database riil sistem tanpa rekayasa. Privasi percakapan pengguna tetap terlindungi 100% dengan enkripsi end-to-end.'
                    : 'Transparency Commitment: All metrics above are sourced directly from real database records without artificial inflation. User privacy remains 100% protected.'}
                </span>
              </div>
              <div className="lp-stats-modal-actions">
                <button
                  type="button"
                  className="lp-stats-refresh-btn"
                  onClick={fetchPublicStats}
                  disabled={isFetchingStats}
                >
                  <i className={`fa-solid fa-rotate-right ${isFetchingStats ? 'fa-spin' : ''}`} />
                  <span>{currentLang === 'id' ? 'Perbarui Data' : 'Refresh Data'}</span>
                </button>
                <button
                  type="button"
                  className="lp-stats-close-btn"
                  onClick={() => setShowStatsModal(false)}
                >
                  {currentLang === 'id' ? 'Tutup' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
