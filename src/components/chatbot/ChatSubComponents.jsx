// ============================================================
// Deepernova AI ChatBot — Memoized Sub-Components
// ============================================================
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import katex from 'katex';
import { highlightCode } from '../../utils/codeHighlight';
import { formatBubbleDomainLabel } from './chatConstants';
import { parseCodeStructure } from './chatTextUtils';

export const AutoRedirectCountdownCard = React.memo(({
  target = 'documents',
  fileType = 'docx',
  topic = '',
  onNavigate,
  userLanguage
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const targetConfig = useMemo(() => {
    if (target === 'codedance') {
      return {
        title: 'CodeDance Autonomous IDE',
        badge: '⚡ VIBE CODING AGENT',
        desc: userLanguage === 'id'
          ? 'Buka proyek ini di CodeDance Autonomous IDE untuk preview langsung:'
          : 'Open this project in CodeDance Autonomous IDE for live preview:',
        icon: '⚡',
        gradient: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.06) 100%)',
        border: '1.2px solid #06b6d4',
        accentColor: '#0891b2',
        badgeBg: '#0f172a',
        badgeColor: '#38bdf8'
      };
    }
    if (target === 'universe') {
      return {
        title: 'Deepernova Universe',
        badge: '🌌 CREATIVE SUITE',
        desc: userLanguage === 'id'
          ? 'Buka platform kreatif Deepernova Universe untuk mengedit berkas:'
          : 'Open Deepernova Universe to edit file:',
        icon: '🌌',
        gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(255,107,0,0.06) 100%)',
        border: '1.2px solid #a855f7',
        accentColor: '#9333ea',
        badgeBg: '#581c87',
        badgeColor: '#e9d5ff'
      };
    }
    const docName = fileType === 'excel' ? 'Spreadsheet (Excel)' : fileType === 'pptx' ? 'Presentasi (PowerPoint)' : 'Word (.docx)';
    return {
      title: `Typernova ${docName} Studio`,
      badge: '📄 STUDIO DOKUMEN',
      desc: userLanguage === 'id'
        ? 'Buka di Typernova Document Studio jika ingin mengedit atau mengunduh berkas:'
        : 'Open in Typernova Document Studio to edit or download file:',
      icon: fileType === 'excel' ? '📊' : fileType === 'pptx' ? '📽️' : '📝',
      gradient: fileType === 'excel'
        ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)'
        : 'linear-gradient(135deg, rgba(255,107,0,0.12) 0%, rgba(234,88,12,0.06) 100%)',
      border: fileType === 'excel' ? '1.2px solid #10b981' : '1.2px solid #ff6b00',
      accentColor: fileType === 'excel' ? '#059669' : '#ea580c',
      badgeBg: fileType === 'excel' ? '#064e3b' : '#431407',
      badgeColor: fileType === 'excel' ? '#6ee7b7' : '#fdba74'
    };
  }, [target, fileType, userLanguage]);

  const executeRedirect = useCallback(() => {
    if (target === 'documents') {
      if (topic) {
        sessionStorage.setItem('typernova_auto_draft_prompt', topic);
        localStorage.setItem('typernova_auto_draft_prompt', topic);
      }
      onNavigate?.('documents', fileType || 'docx');
    } else if (target === 'codedance') {
      if (topic) {
        sessionStorage.setItem('codedance_auto_task_prompt', topic);
        localStorage.setItem('codedance_auto_task_prompt', topic);
      }
      onNavigate?.('codedance');
    } else {
      onNavigate?.('universe');
    }
  }, [target, fileType, topic, onNavigate]);

  if (isDismissed) return null;

  return (
    <div style={{
      margin: '16px 0',
      padding: '16px 18px',
      background: targetConfig.gradient,
      border: targetConfig.border,
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '440px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '9.5px',
          fontWeight: 800,
          background: targetConfig.badgeBg,
          color: targetConfig.badgeColor,
          padding: '3px 8px',
          borderRadius: '20px',
          letterSpacing: '0.06em'
        }}>
          {targetConfig.badge}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: targetConfig.accentColor }}>
          {userLanguage === 'id' ? 'Tersedia di Studio' : 'Available in Studio'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0
        }}>
          {targetConfig.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
            {targetConfig.title}
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
            {targetConfig.desc}
          </div>
          {topic && (
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#1e293b',
              background: 'rgba(255,255,255,0.7)',
              padding: '4px 8px',
              borderRadius: '6px',
              marginTop: '6px',
              border: '1px solid rgba(0,0,0,0.05)',
              wordBreak: 'break-word',
              fontStyle: 'italic'
            }}>
              "{topic}"
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <button
          type="button"
          onClick={() => executeRedirect()}
          style={{
            flex: 1,
            padding: '8px 14px',
            background: targetConfig.accentColor,
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          <span>{userLanguage === 'id' ? 'Buka Sekarang' : 'Open Now'}</span>
          <i className="fas fa-arrow-right" style={{ fontSize: '10px' }}></i>
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          style={{
            padding: '8px 12px',
            background: '#ffffff',
            color: '#64748b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {userLanguage === 'id' ? 'Tutup' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
});

export const SourceBubbleCarousel = React.memo(({ sources = [], language, onShowAll }) => {
  const safeSources = useMemo(() => {
    if (!Array.isArray(sources)) return [];
    const seen = new Set();
    return sources.filter(s => {
      if (!s) return false;
      const key = (s.link || s.url || s.title || s.domain || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sources]);

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, safeSources.length]);

  const handleScroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -200 : 200;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (safeSources.length === 0) return null;

  return (
    <div className="source-bubbles-section">
      <div className="search-sources-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-circle-nodes" style={{ color: '#4f46e5', fontSize: '13px' }}></i>
          <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary, #4b5563)' }}>
            {language === 'id' ? 'Sumber Terverifikasi:' : 'Verified Sources:'}
          </span>
          <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', padding: '1px 7px', borderRadius: '10px' }}>
            {safeSources.length}
          </span>
        </div>
        {safeSources.length > 0 && onShowAll && (
          <button
            type="button"
            className="show-all-sources-btn"
            onClick={onShowAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#4f46e5',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
          >
            {language === 'id' ? 'Lihat Rincian' : 'See Details'} ➜
          </button>
        )}
      </div>

      <div className="source-bubbles-carousel-container" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="carousel-nav-btn prev-btn"
            aria-label="Scroll left"
            style={{
              position: 'absolute',
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
              backdropFilter: 'blur(4px)'
            }}
          >
            ◀
          </button>
        )}

        <div
          ref={scrollRef}
          className="source-bubbles-viewport fluid-scroll"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            maxWidth: '100%',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 2px 6px 2px'
          }}
        >
          <div
            className="source-bubbles-track fluid-track"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: '12px',
              width: 'max-content'
            }}
          >
            {safeSources.map((source, i) => {
              const rawDomain = source.domain || (source.link ? (() => { try { return new URL(source.link).hostname; } catch (_e) { return ''; } })() : '');
              const cleanDomain = rawDomain.replace(/^www\./, '');
              const shortLabel = formatBubbleDomainLabel(cleanDomain);
              const faviconUrl = cleanDomain ? `https://www.google.com/s2/favicons?sz=64&domain=${cleanDomain}` : 'https://img.icons8.com/ios-glyphs/30/4f46e5/globe.png';

              return (
                <a
                  key={`bubble_${i}_${source.link || source.url || i}`}
                  href={source.link || source.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${source.title || cleanDomain}\n${source.snippet || ''}`}
                  className="source-bubble"
                >
                  <img
                    src={faviconUrl}
                    onError={(e) => {
                      if (!e.target.dataset.triedDuck && cleanDomain) {
                        e.target.dataset.triedDuck = 'true';
                        e.target.src = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;
                      } else {
                        e.target.src = 'https://img.icons8.com/ios-glyphs/30/4f46e5/globe.png';
                      }
                    }}
                    className="source-bubble-favicon"
                    alt={cleanDomain || 'source'}
                    loading="lazy"
                  />
                  <span className="source-bubble-label">
                    {shortLabel}
                  </span>
                </a>
              );
            })}

            {safeSources.length > 3 && onShowAll && (
              <div
                className="source-bubble show-all-bubble"
                onClick={onShowAll}
                title={language === 'id' ? 'Lihat Semua Sumber' : 'See All Sources'}
                style={{ cursor: 'pointer' }}
              >
                <div className="source-bubble-more-circle">
                  +{safeSources.length}
                </div>
                <span className="source-bubble-label" style={{ color: '#4f46e5', fontWeight: '700' }}>
                  {language === 'id' ? 'Semua' : 'All'}
                </span>
              </div>
            )}
          </div>
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="carousel-nav-btn next-btn"
            aria-label="Scroll right"
            style={{
              position: 'absolute',
              right: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
              backdropFilter: 'blur(4px)'
            }}
          >
            ▶
          </button>
        )}
      </div>
    </div>
  );
});

export const CodeStructureViewer = React.memo(({ code, language }) => {
  const [showStructure, setShowStructure] = useState(false);
  const structure = useMemo(() => parseCodeStructure(code, language), [code, language]);

  if (!structure) return null;

  const getIcon = (type) => {
    const icons = {
      'class': '📦',
      'function': '⚙️',
      'method': '🔧',
      'object': '{}',
      'property': '•'
    };
    return icons[type] || '•';
  };

  return (
    <div className="code-structure-viewer">
      <button
        className="structure-toggle"
        onClick={() => setShowStructure(!showStructure)}
        title="Toggle code structure"
      >
        {showStructure ? '🗂️ Hide Structure' : '🗂️ Show Structure'}
      </button>

      {showStructure && (
        <div className="structure-tree">
          {structure.map((item, idx) => (
            <div
              key={idx}
              className={`structure-item structure-${item.type}`}
              style={{ paddingLeft: `${item.depth * 16}px` }}
            >
              <span className="structure-icon">{getIcon(item.type)}</span>
              <span className="structure-label">{item.label}</span>
              {item.line && <span className="structure-line">:{item.line}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const ReasoningSection = React.memo(({
  reasoningText,
  isReasoning = false,
  reasoningDuration = '0.5',
  userLanguage = 'id',
  modelName = 'AI'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  const isOpen = isReasoning ? !isManuallyCollapsed : isExpanded;

  useEffect(() => {
    if (isOpen && boxRef.current) {
      const el = boxRef.current;
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    }
  }, [reasoningText, isReasoning, isOpen]);

  if (!reasoningText) return null;

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(reasoningText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReasoning) {
      setIsManuallyCollapsed(prev => !prev);
    } else {
      setIsExpanded(prev => !prev);
    }
  };

  const displayModel = (modelName || 'AI').replace(/^DeeperNova\s*/i, '');
  const buttonLabel = isReasoning
    ? (userLanguage === 'id' ? `Proses Penalaran ${displayModel} (Menalar...)` : `${displayModel} Reasoning (Thinking...)`)
    : (userLanguage === 'id'
        ? `Proses Penalaran ${displayModel} (${reasoningDuration || '0.5'}s)`
        : `${displayModel} Reasoning Process (${reasoningDuration || '0.5'}s)`);

  return (
    <div className="reasoning-completed-container">
      <div className="reasoning-completed-header-row">
        <button
          type="button"
          className={`reasoning-pill-btn ${isOpen ? 'active' : ''}`}
          onClick={handleToggle}
        >
          <span className={`reasoning-pill-icon ${isReasoning ? 'reasoning-brain-pulse' : ''}`}>🧠</span>
          <span className="reasoning-pill-label">
            {buttonLabel}
          </span>
          <span className="reasoning-pill-chevron">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <button
            type="button"
            className="reasoning-copy-btn"
            onClick={handleCopy}
            title={userLanguage === 'id' ? 'Salin pemikiran' : 'Copy thoughts'}
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="reasoning-box-holder" ref={boxRef}>
          <div className="reasoning-box-content">
            {reasoningText}
            {isReasoning && <span className="reasoning-blinking-caret">▍</span>}
          </div>
        </div>
      )}
    </div>
  );
});

export const CodeBlockHolder = React.memo(({
  code = '',
  language = 'plaintext',
}) => {
  const [copied, setCopied] = useState(false);
  const lineCount = useMemo(() => (code ? code.split('\n').length : 1), [code]);
  const [isCollapsed, setIsCollapsed] = useState(() => lineCount > 12);

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy fallback failed:', e);
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => fallbackCopy(code));
      } else {
        fallbackCopy(code);
      }
    } catch (_err) {
      fallbackCopy(code);
    }
  };

  const getLanguageLabel = (lang) => {
    const l = (lang || '').trim().toLowerCase();
    switch (l) {
      case 'javascript':
      case 'js':
      case 'jsx':
      case 'mjs':
        return 'JavaScript';
      case 'typescript':
      case 'ts':
      case 'tsx':
        return 'TypeScript';
      case 'python':
      case 'py':
      case 'python3':
        return 'Python';
      case 'html':
      case 'htm':
        return 'HTML';
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return 'CSS';
      case 'json':
        return 'JSON';
      case 'sql':
      case 'mysql':
      case 'postgres':
      case 'postgresql':
        return 'SQL';
      case 'bash':
      case 'sh':
      case 'shell':
      case 'zsh':
        return 'Bash';
      case 'php':
        return 'PHP';
      case 'java':
        return 'Java';
      case 'cpp':
      case 'c++':
        return 'C++';
      case 'c':
        return 'C';
      case 'rust':
      case 'rs':
        return 'Rust';
      case 'go':
      case 'golang':
        return 'Go';
      case 'markdown':
      case 'md':
        return 'Markdown';
      default:
        return lang && lang !== 'plaintext' ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Code';
    }
  };

  const getFileExtension = (lang) => {
    const l = (lang || '').toLowerCase();
    if (['javascript', 'js', 'jsx', 'mjs'].includes(l)) return 'js';
    if (['typescript', 'ts', 'tsx'].includes(l)) return 'ts';
    if (['python', 'py'].includes(l)) return 'py';
    if (['html', 'htm'].includes(l)) return 'html';
    if (['css', 'scss', 'sass'].includes(l)) return 'css';
    if (['json'].includes(l)) return 'json';
    if (['sql'].includes(l)) return 'sql';
    if (['bash', 'sh', 'shell'].includes(l)) return 'sh';
    if (['php'].includes(l)) return 'php';
    if (['java'].includes(l)) return 'java';
    if (['cpp', 'c++'].includes(l)) return 'cpp';
    if (['c'].includes(l)) return 'c';
    if (['rust'].includes(l)) return 'rs';
    if (['go'].includes(l)) return 'go';
    return 'txt';
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const ext = getFileExtension(language);
    const filename = `code_${Date.now()}.${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const langLabel = getLanguageLabel(language);
  const highlightedHtml = useMemo(() => highlightCode(code, language), [code, language]);
  const hiddenLinesCount = Math.max(0, lineCount - 10);

  return (
    <div className="modern-code-holder" style={{ background: '#ffffff', backgroundColor: '#ffffff', color: '#1e293b' }}>
      <div className="code-holder-header" style={{ background: '#ffffff', backgroundColor: '#ffffff' }}>
        <span className="code-holder-lang-label" style={{ color: '#64748b' }}>{langLabel}</span>
        <div className="code-holder-actions">
          <button
            type="button"
            className="code-icon-btn"
            onClick={handleCopy}
            title={copied ? "Tersalin!" : "Salin kode"}
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="code-icon-btn"
            onClick={handleDownload}
            title="Unduh kode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`code-holder-body ${isCollapsed ? 'collapsed' : 'expanded'}`} style={{ background: '#ffffff', backgroundColor: '#ffffff' }}>
        <pre className={`modern-code-pre language-${language}`} style={{ background: '#ffffff', backgroundColor: '#ffffff', color: '#1e293b' }}>
          <code style={{ background: 'transparent', backgroundColor: 'transparent', color: '#1e293b' }} dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>

        {isCollapsed && hiddenLinesCount > 0 && (
          <div className="code-fade-overlay" onClick={() => setIsCollapsed(false)}>
            <button type="button" className="code-expand-text-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>{hiddenLinesCount} baris disembunyikan</span>
            </button>
          </div>
        )}

        {isCollapsed && lineCount > 10 && (
          <button
            type="button"
            className="code-floating-expand-btn"
            onClick={() => setIsCollapsed(false)}
            title="Tampilkan semua baris"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {!isCollapsed && lineCount > 10 && (
        <div className="code-collapse-footer">
          <button type="button" className="code-collapse-btn" onClick={() => setIsCollapsed(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>Sembunyikan baris</span>
          </button>
        </div>
      )}
    </div>
  );
});

export const FormulaRenderer = React.memo(({ formula, isBlock }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && formula) {
      try {
        ref.current.innerHTML = '';
        katex.render(formula, ref.current, {
          displayMode: isBlock,
          throwOnError: false,
          output: 'html'
        });
      } catch (e) {
        console.error('KaTeX rendering error:', e);
        if (ref.current) ref.current.textContent = formula;
      }
    }
  }, [formula, isBlock]);

  return isBlock
    ? <div ref={ref} className="formula-block" />
    : <span ref={ref} className="formula-inline" />;
});

