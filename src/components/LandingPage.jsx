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

const LandingPage = ({
  onStartChat,
  onOpenOffice,
  onOpenUniverse,
  onOpenLogin,
  onNavigate,
  isAuthenticated,
  isGuest,
  user,
  onLanguageChange
}) => {
  const [activeFaq, setActiveFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => detectLanguageSync());
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

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

    const handleStorage = (e) => {
      if (e.key === 'deepernova_language' && e.newValue && SUPPORTED_LANGUAGES.includes(e.newValue)) {
        setCurrentLang(e.newValue);
      }
    };

    const handleOutsideClick = (e) => {
      if (!e.target.closest('.lp-lang-picker')) {
        setLangDropdownOpen(false);
      }
    };

    window.addEventListener('deepernova_language_changed', handleLanguageChanged);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('click', handleOutsideClick);

    return () => {
      isMounted = false;
      window.removeEventListener('deepernova_language_changed', handleLanguageChanged);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('view-landing');
    document.body.classList.add('view-landing');
    document.body.setAttribute('data-view', 'landing');

    const prevHtmlOverflowY = document.documentElement.style.overflowY;
    const prevBodyOverflowY = document.body.style.overflowY;

    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'visible';

    const onScroll = () => setScrolled(window.scrollY > 6);
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
    onLanguageChange?.(code);
    setLangDropdownOpen(false);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const t = landingTranslations[currentLang] || landingTranslations.id;
  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === currentLang) || LANGUAGE_OPTIONS[0];

  const hasStoredAuth = () => {
    try {
      const raw = localStorage.getItem('authUser') || sessionStorage.getItem('authUser');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && !parsed.guest && (parsed.id || parsed.email || parsed.name || parsed.username));
    } catch {
      return false;
    }
  };

  const loggedIn = Boolean((isAuthenticated && !isGuest) || (user && !isGuest && !user.guest) || hasStoredAuth());

  return (
    <div className="lp">
      {/* ===== MINIMAL STICKY NAVBAR ===== */}
      <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <button
            type="button"
            className="lp-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src="/logo.png" alt="Deepernova AI" className="lp-brand-icon" />
            <span className="lp-brand-name">Deepernova</span>
          </button>

          <nav className="lp-nav-links" aria-label="Navigasi utama">
            <button type="button" onClick={() => scrollTo('produk')}>{t.nav.products}</button>
            <button type="button" onClick={() => scrollTo('fitur')}>{t.nav.features}</button>
            <button type="button" onClick={() => scrollTo('unduh-apk')}>{t.nav.download}</button>
            <button type="button" onClick={() => onNavigate?.('api')}>{t.nav.api}</button>
            <button type="button" onClick={() => scrollTo('faq')}>{t.nav.faq}</button>
            <button type="button" onClick={() => onNavigate?.('help')}>{t.nav.help}</button>
          </nav>

          <div className="lp-nav-actions">
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
                <span className="lp-lang-flag">{currentOption.flag}</span>
                <span className="lp-lang-label">{currentOption.shortLabel}</span>
                <i className={`fa-solid fa-chevron-down lp-lang-arrow ${langDropdownOpen ? 'open' : ''}`} />
              </button>

              {langDropdownOpen && (
                <div className="lp-lang-menu" role="menu">
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

            {!loggedIn && (
              <button type="button" onClick={onOpenLogin} className="lp-btn lp-btn-ghost">
                {t.nav.login}
              </button>
            )}
            <button type="button" onClick={onStartChat} className="lp-btn lp-btn-dark">
              {t.nav.startChat}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ===== CLEAN PROFESSIONAL HERO ===== */}
        <section className="lp-hero">
          <div className="lp-container lp-hero-inner">
            <div className="lp-badge">
              <span className="lp-badge-dot" />
              <span>{t.hero.badge}</span>
            </div>

            <h1 className="lp-hero-title">
              {t.hero.titleLead}{' '}
              <span className="lp-text-accent">{t.hero.titleAccent}</span>{' '}
              {t.hero.titleTrail}
            </h1>

            <p className="lp-hero-sub">{t.hero.sub}</p>

            <div className="lp-hero-actions">
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-dark lp-btn-lg">
                <span>{t.hero.primaryCta}</span>
                <i className="fa-solid fa-arrow-right" />
              </button>
              <button type="button" onClick={() => onNavigate?.('agent')} className="lp-btn lp-btn-outline lp-btn-lg">
                <i className="fa-solid fa-terminal" />
                <span>{t.hero.secondaryCta}</span>
              </button>
            </div>

            <div className="lp-metrics-strip">
              {t.hero.metrics.map((m, idx) => (
                <div key={idx} className="lp-metric-item">
                  <span className="lp-metric-label">{m.label}</span>
                  <strong className="lp-metric-value">{m.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CORE PRODUCTS (4 CONCISE CARDS) ===== */}
        <section id="produk" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">{t.products.eyebrow}</span>
              <h2>{t.products.heading}</h2>
              <p>{t.products.sub}</p>
            </div>

            <div className="lp-product-grid">
              {/* 1. AI Chat & Browser Agent */}
              <article className="lp-card" onClick={onStartChat}>
                <div className="lp-card-top">
                  <div className="lp-icon-box">
                    <i className="fa-solid fa-comments" />
                  </div>
                  <span className="lp-card-tag">{t.products.chat.tag}</span>
                </div>
                <h3>{t.products.chat.title}</h3>
                <p>{t.products.chat.desc}</p>
                <span className="lp-card-link">
                  {t.products.chat.link} <i className="fa-solid fa-arrow-right" />
                </span>
              </article>

              {/* 2. Autonomous Coding Agent */}
              <article className="lp-card" onClick={() => onNavigate?.('agent')}>
                <div className="lp-card-top">
                  <div className="lp-icon-box">
                    <i className="fa-solid fa-code" />
                  </div>
                  <span className="lp-card-tag">{t.products.agent.tag}</span>
                </div>
                <h3>{t.products.agent.title}</h3>
                <p>{t.products.agent.desc}</p>
                <span className="lp-card-link">
                  {t.products.agent.link} <i className="fa-solid fa-arrow-right" />
                </span>
              </article>

              {/* 3. Document Studio */}
              <article className="lp-card" onClick={onOpenOffice}>
                <div className="lp-card-top">
                  <div className="lp-icon-box">
                    <i className="fa-solid fa-file-lines" />
                  </div>
                  <span className="lp-card-tag">{t.products.docs.tag}</span>
                </div>
                <h3>{t.products.docs.title}</h3>
                <p>{t.products.docs.desc}</p>
                <span className="lp-card-link">
                  {t.products.docs.link} <i className="fa-solid fa-arrow-right" />
                </span>
              </article>

              {/* 4. Search & Developer API */}
              <article className="lp-card" onClick={() => onNavigate?.('api')}>
                <div className="lp-card-top">
                  <div className="lp-icon-box">
                    <i className="fa-solid fa-magnifying-glass" />
                  </div>
                  <span className="lp-card-tag">{t.products.api.tag}</span>
                </div>
                <h3>{t.products.api.title}</h3>
                <p>{t.products.api.desc}</p>
                <form
                  className="lp-mini-search"
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
                    placeholder={t.products.api.placeholder}
                    autoComplete="off"
                    aria-label="Search"
                  />
                  <button type="submit" aria-label="Search">
                    <i className="fa-solid fa-arrow-right" />
                  </button>
                </form>
                <span className="lp-card-link">
                  {t.products.api.link} <i className="fa-solid fa-arrow-right" />
                </span>
              </article>
            </div>
          </div>
        </section>

        {/* ===== ARCHITECTURE & CYBER SECURITY ===== */}
        <section id="fitur" className="lp-section lp-section-subtle">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">{t.features.eyebrow}</span>
              <h2>{t.features.heading}</h2>
            </div>

            <div className="lp-feature-grid">
              {t.features.items.map((item) => (
                <div key={item.title} className="lp-feature-item">
                  <div className="lp-feature-icon">
                    <i className={`fa-solid ${item.icon}`} />
                  </div>
                  <div className="lp-feature-body">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== COMPACT ANDROID APK DOWNLOAD (ONLY DEEPERNOVA APPS) ===== */}
        <section id="unduh-apk" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <span className="lp-eyebrow">{t.download.eyebrow}</span>
              <h2>{t.download.heading}</h2>
              <p>{t.download.sub}</p>
            </div>

            <div className="lp-apk-grid">
              <div className="lp-apk-card">
                <div className="lp-apk-info">
                  <div className="lp-apk-head">
                    <img src="/logo192.png" alt="DeeperNova AI" className="lp-apk-logo" />
                    <div>
                      <h3>{t.download.aiApp.title}</h3>
                      <span className="lp-apk-meta">{t.download.aiApp.meta}</span>
                    </div>
                  </div>
                  <p>{t.download.aiApp.desc}</p>
                </div>
                <a
                  href="/deepernova-ai.apk"
                  download="deepernova-ai.apk"
                  className="lp-btn lp-btn-dark lp-apk-btn"
                >
                  <i className="fa-brands fa-android" />
                  <span>{t.download.aiApp.btn}</span>
                </a>
              </div>

              <div className="lp-apk-card">
                <div className="lp-apk-info">
                  <div className="lp-apk-head">
                    <img
                      src="/search/icons/icon-192.png"
                      alt="DeeperNova Search"
                      className="lp-apk-logo"
                      onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                    />
                    <div>
                      <h3>{t.download.searchApp.title}</h3>
                      <span className="lp-apk-meta">{t.download.searchApp.meta}</span>
                    </div>
                  </div>
                  <p>{t.download.searchApp.desc}</p>
                </div>
                <a
                  href="/DPN-Search.apk"
                  download="DPN-Search.apk"
                  className="lp-btn lp-btn-outline lp-apk-btn"
                >
                  <i className="fa-brands fa-android" />
                  <span>{t.download.searchApp.btn}</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== MINIMAL FAQ ===== */}
        <section id="faq" className="lp-section lp-section-subtle">
          <div className="lp-container lp-container-narrow">
            <div className="lp-section-head">
              <span className="lp-eyebrow">{t.faq.eyebrow}</span>
              <h2>{t.faq.heading}</h2>
            </div>

            <div className="lp-faq-list">
              {t.faq.items.map((item, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={item.q} className={`lp-faq-row ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="lp-faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                    >
                      <span>{item.q}</span>
                      <i className="fa-solid fa-chevron-down" />
                    </button>
                    {isOpen && (
                      <div className="lp-faq-content">
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CLEAN CTA BANNER ===== */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-cta-box">
              <div>
                <h2>{t.cta.heading}</h2>
                <p>{t.cta.sub}</p>
              </div>
              <button type="button" onClick={onStartChat} className="lp-btn lp-btn-primary lp-btn-lg">
                <span>{t.cta.button}</span>
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
        </section>

        {/* ===== POWERED BY & SECURED WITH — INFINITE LOGO MARQUEE ===== */}
        <section className="lp-tech-marquee-section" aria-label="Powered by AI, Cloud & Security Ecosystem">
          <div className="lp-container">
            <div className="lp-marquee-header">
              <span className="lp-eyebrow">
                {currentLang === 'en'
                  ? 'POWERED BY & SECURED WITH'
                  : currentLang === 'zh'
                    ? '核心驱动与安全生态'
                    : 'DIDUKUNG & DIAMANKAN OLEH EKOSISTEM TEKNOLOGI'}
              </span>
              <p className="lp-marquee-sub">
                {currentLang === 'en'
                  ? 'Multi-model AI inference, autonomous search & sandbox infrastructure, and enterprise edge security.'
                  : currentLang === 'zh'
                    ? '多模型 AI 推理、自主搜索与沙盒引擎、企业级边缘网络与安全防护。'
                    : 'Inferensi AI multi-model, mesin riset & sandbox otonom, serta keamanan jaringan edge berlapis.'}
              </p>
            </div>
          </div>

          {(() => {
            const AI_ECOSYSTEM_LOGOS = [
              { id: 'deepernova', name: 'DeeperNova AI', tag: 'Core Platform', color: '#ea580c', img: '/logo192.png' },
              { id: 'codex', name: 'DeeperNova Codex', tag: 'Async Agent', color: '#0f172a', icon: 'fa-solid fa-terminal' },
              { id: 'dpnsearch', name: 'DPN Search', tag: 'Live Crawler', color: '#2563eb', img: '/search/icons/icon-192.png' },
              { id: 'nvidia', name: 'NVIDIA', tag: 'AI Compute', color: '#76b900', svg: 'nvidia' },
              { id: 'nemotron', name: 'Nemotron 3.5', tag: 'Reasoning LLM', color: '#65a30d', svg: 'chip' },
              { id: 'qwen', name: 'Qwen 2.5 VL', tag: 'Multimodal AI', color: '#6366f1', svg: 'qwen' },
              { id: 'cohere', name: 'Cohere North', tag: 'Code Specialist', color: '#0d9488', svg: 'spark' },
              { id: 'openrouter', name: 'OpenRouter', tag: 'Model Mesh', color: '#4f46e5', icon: 'fa-solid fa-diagram-project' },
              { id: 'freellm', name: 'FreeLLM Engine', tag: 'Auto Failover', color: '#d97706', icon: 'fa-solid fa-bolt' },
              { id: 'python', name: 'Python 3.13', tag: 'Sandbox Runtime', color: '#3776ab', icon: 'fa-brands fa-python' },
              { id: 'nodejs', name: 'Node.js', tag: 'Async Backend', color: '#16a34a', icon: 'fa-brands fa-node-js' },
              { id: 'react', name: 'React + Vite', tag: 'Edge UI', color: '#0284c7', icon: 'fa-brands fa-react' }
            ];
            const INFRA_SECURITY_LOGOS = [
              { id: 'cloudflare', name: 'Cloudflare', tag: 'Edge Tunnel & CDN', color: '#f38020', svg: 'cloudflare' },
              { id: 'vercel', name: 'Vercel Edge', tag: 'Global Network', color: '#0f172a', svg: 'vercel' },
              { id: 'tls13', name: 'Secured with TLS 1.3', tag: 'HSTS Preload', color: '#16a34a', icon: 'fa-solid fa-lock' },
              { id: 'shield', name: 'Cyber Security Shield', tag: 'Anti-SSRF & CSP', color: '#dc2626', icon: 'fa-solid fa-shield-halved' },
              { id: 'promptguard', name: 'Prompt-Injection Guard', tag: 'Immutable Policy', color: '#7c3aed', icon: 'fa-solid fa-user-shield' },
              { id: 'sqlite', name: 'SQLite WAL', tag: 'Persistent Memory', color: '#0369a1', icon: 'fa-solid fa-database' },
              { id: 'sandbox', name: 'Isolated Sandbox', tag: 'Jailed Execution', color: '#0f172a', icon: 'fa-solid fa-cube' },
              { id: 'chromium', name: 'Headless Chromium', tag: 'Browser Agent', color: '#2563eb', icon: 'fa-brands fa-chrome' },
              { id: 'officepro', name: 'Office Suite Pro', tag: 'Word · Excel · PPT', color: '#ea580c', icon: 'fa-solid fa-file-excel' },
              { id: 'matplotlib', name: 'Matplotlib 240-DPI', tag: 'Data Visuals', color: '#059669', icon: 'fa-solid fa-chart-column' }
            ];

            const renderBadgeIcon = (item) => {
              if (item.img) {
                return (
                  <img
                    src={item.img}
                    alt={item.name}
                    className="lp-marquee-img"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                  />
                );
              }
              if (item.svg === 'nvidia') {
                return (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                    <path d="M3 12.2C5.4 8.2 9.4 6.5 14 7.2c3.2.5 5.6 2.3 7 4.8-1.8 3.2-5 5.2-9 5.2-3.7 0-6.8-1.8-9-5Z" stroke="#76b900" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="12.5" cy="12" r="2.7" fill="#76b900" />
                  </svg>
                );
              }
              if (item.svg === 'cloudflare') {
                return (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                    <path d="M6.5 17.5h11a3.5 3.5 0 0 0 .7-6.93A5.2 5.2 0 0 0 8.1 9.1 4.1 4.1 0 0 0 6.5 17.5Z" fill="#f38020" />
                  </svg>
                );
              }
              if (item.svg === 'vercel') {
                return (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                    <path d="M12 4L21 19.5H3L12 4Z" fill="#0f172a" />
                  </svg>
                );
              }
              if (item.svg === 'qwen') {
                return (
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
                    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" stroke="#6366f1" strokeWidth="2" fill="rgba(99,102,241,0.12)" />
                    <circle cx="12" cy="12" r="2.8" fill="#6366f1" />
                  </svg>
                );
              }
              if (item.svg === 'chip') {
                return (
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2.5" stroke="#65a30d" strokeWidth="2" fill="rgba(101,163,13,0.12)" />
                    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="#65a30d" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                );
              }
              if (item.svg === 'spark') {
                return (
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
                    <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" fill="#0d9488" />
                  </svg>
                );
              }
              return <i className={item.icon} style={{ color: item.color, fontSize: 16 }} aria-hidden="true" />;
            };

            return (
              <div className="lp-marquee-stack">
                <div className="lp-marquee-viewport">
                  <div className="lp-marquee-track lp-marquee-left">
                    {[...AI_ECOSYSTEM_LOGOS, ...AI_ECOSYSTEM_LOGOS].map((item, idx) => (
                      <div key={`ai_${item.id}_${idx}`} className="lp-marquee-pill">
                        <span className="lp-marquee-icon-wrap">{renderBadgeIcon(item)}</span>
                        <span className="lp-marquee-text">
                          <strong>{item.name}</strong>
                          <small>{item.tag}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lp-marquee-viewport">
                  <div className="lp-marquee-track lp-marquee-right">
                    {[...INFRA_SECURITY_LOGOS, ...INFRA_SECURITY_LOGOS].map((item, idx) => (
                      <div key={`sec_${item.id}_${idx}`} className="lp-marquee-pill is-security">
                        <span className="lp-marquee-icon-wrap">{renderBadgeIcon(item)}</span>
                        <span className="lp-marquee-text">
                          <strong>{item.name}</strong>
                          <small>{item.tag}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      </main>

      {/* ===== CLEAN PROFESSIONAL FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-top">
          <div className="lp-footer-brand">
            <img src="/logo.png" alt="Deepernova" className="lp-brand-icon" />
            <span className="lp-brand-name">Deepernova</span>
          </div>

          <div className="lp-footer-nav">
            <button type="button" onClick={onStartChat}>{t.footer.chat}</button>
            <button type="button" onClick={() => onNavigate?.('agent')}>{t.footer.agent}</button>
            <button type="button" onClick={onOpenOffice}>{t.footer.docs}</button>
            {onOpenUniverse && (
              <button type="button" onClick={onOpenUniverse}>Universe</button>
            )}
            <button type="button" onClick={() => openSearch()}>{t.footer.search}</button>
            <button type="button" onClick={() => onNavigate?.('api')}>{t.footer.api}</button>
            <button type="button" onClick={() => onNavigate?.('help')}>{t.footer.help}</button>
          </div>
        </div>

        <div className="lp-container lp-footer-bottom">
          <span>© {new Date().getFullYear()} Deepernova · {t.footer.copyright}</span>
          <div className="lp-footer-langs">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                className={`lp-footer-lang-item ${opt.code === currentLang ? 'active' : ''}`}
                onClick={() => handleSelectLanguage(opt.code)}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
