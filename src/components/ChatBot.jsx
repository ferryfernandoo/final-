import React, { useState, useRef, useEffect, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageToGrok, processStreamingResponse } from '../services/grokApi';
import { memoryService } from '../services/memoryService';
import { ragService } from '../services/ragService';
import { ConversationPersistenceService } from '../services/conversationPersistenceService';
import DocumentGenerationService from '../services/documentGenerationService';
import ImageGenerationService from '../services/imageGenerationService';
import ClientFileParser from '../services/clientFileParser';

import { tokenMixTtsService } from '../services/tokenMixTtsService';
import { detectLanguage, highlightCode, cleanCodeBlock } from '../utils/codeHighlight';
import VoiceChat from './VoiceChat';
import ApiMarketplace from './ApiMarketplace';
import ChartGenerator from './ChartGenerator';
import StepperComponent from './StepperComponent';
import SavedImagesGallery from './SavedImagesGallery';
import { saveImageToGallery, downloadImageDirectly } from '../services/imageStorageService';
import GlobalMemorySettings from './GlobalMemorySettings';
import ReminderCard from './ReminderCard';
import { reminderService } from '../services/reminderService';
import { API_BASE_URL } from '../apiConfig';
import './ChatBot.css';

// Interactive Countdown Navigation Card for Typernova Word Agent / CodeDance IDE / Universe
const AutoRedirectCountdownCard = ({ 
  target = 'documents', 
  fileType = 'docx', 
  topic = '', 
  onNavigate, 
  userLanguage 
}) => {
  const [countdown, setCountdown] = React.useState(5);
  const [isCancelled, setIsCancelled] = React.useState(false);

  const targetConfig = React.useMemo(() => {
    if (target === 'codedance') {
      return {
        title: 'CodeDance Autonomous IDE',
        badge: '⚡ VIBE CODING AGENT',
        desc: userLanguage === 'id' 
          ? 'Membuka CodeDance Autonomous IDE untuk merancang & mengeksekusi proyek koding:' 
          : 'Redirecting to CodeDance Autonomous IDE to build project:',
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
          ? 'Membuka platform kreatif Deepernova Universe untuk membuat berkas baru:' 
          : 'Redirecting to Deepernova Universe to create a new file:',
        icon: '🌌',
        gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(255,107,0,0.06) 100%)',
        border: '1.2px solid #a855f7',
        accentColor: '#9333ea',
        badgeBg: '#581c87',
        badgeColor: '#e9d5ff'
      };
    }
    // Default documents (Word / Excel / PPT)
    const docName = fileType === 'excel' ? 'Spreadsheet (Excel)' : fileType === 'pptx' ? 'Presentasi (PowerPoint)' : 'Word (.docx)';
    return {
      title: `Typernova ${docName} Agent`,
      badge: '📄 OMNIPOTENT WORD AGENT',
      desc: userLanguage === 'id' 
        ? 'Membuka Typernova Omnipotent Word Agent untuk menyusun dokumen lengkap:' 
        : 'Redirecting to Typernova Omnipotent Word Agent to draft document:',
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

  const executeRedirect = React.useCallback(() => {
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

  React.useEffect(() => {
    if (isCancelled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCancelled, executeRedirect]);

  if (isCancelled) {
    return (
      <div style={{
        margin: '14px 0',
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#64748b'
      }}>
        <span>⏹️ Pengalihan ke <strong>{targetConfig.title}</strong> dibatalkan.</span>
        <button
          onClick={() => executeRedirect()}
          style={{
            padding: '5px 12px',
            background: targetConfig.accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Buka Manual ↗
        </button>
      </div>
    );
  }

  const progressPercent = ((5 - countdown) / 5) * 100;

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
      {/* Top Badge */}
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
          Pengalihan Otomatis
        </span>
      </div>

      {/* Main Info */}
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

      {/* Animated Countdown bar & number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
        <div style={{
          flex: 1,
          height: '6px',
          background: 'rgba(0,0,0,0.08)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${100 - progressPercent}%`,
            background: targetConfig.accentColor,
            transition: 'width 1s linear',
            borderRadius: '10px'
          }} />
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 800,
          color: targetConfig.accentColor,
          minWidth: '24px',
          textAlign: 'right'
        }}>
          {countdown}s
        </div>
      </div>

      {/* Action Buttons */}
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
          <span>Buka Sekarang</span>
          <i className="fas fa-arrow-right" style={{ fontSize: '10px' }}></i>
        </button>
        <button
          type="button"
          onClick={() => setIsCancelled(true)}
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
          Batal
        </button>
      </div>
    </div>
  );
};

// Code Structure Parser - untuk menampilkan struktur kode seperti tree
const parseCodeStructure = (code, language) => {
  const lines = code.split('\n');
  const structure = [];
  
  // Parse berdasarkan bahasa
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      const buildTree = (obj, depth = 0) => {
        const items = [];
        if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              items.push({
                type: 'object',
                label: key,
                depth,
                hasChildren: true,
                value: value
              });
              items.push(...buildTree(value, depth + 1));
            } else {
              items.push({
                type: 'property',
                label: key,
                value: value,
                depth
              });
            }
          });
        }
        return items;
      };
      return buildTree(parsed);
    } catch (_e) {
      return null;
    }
  }
  
  // Parse untuk JavaScript/TypeScript/Java (functions, classes, etc)
  if (['javascript', 'js', 'typescript', 'ts', 'java'].includes(language)) {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const depth = (line.match(/^\s*/)[0].length / 2);
      
      // Detect functions
      if (trimmed.match(/^(async\s+)?function\s+(\w+)|^const\s+(\w+)\s*=\s*(\(|async\s*\()|^class\s+(\w+)/)) {
        const match = trimmed.match(/function\s+(\w+)|const\s+(\w+)|class\s+(\w+)/);
        const name = match[1] || match[2] || match[3];
        structure.push({ type: 'function', label: name, line: idx + 1, depth });
      }
      
      // Detect classes
      if (trimmed.match(/^class\s+(\w+)/)) {
        const match = trimmed.match(/class\s+(\w+)/);
        structure.push({ type: 'class', label: match[1], line: idx + 1, depth });
      }
      
      // Detect methods/properties
      if (trimmed.match(/^\w+\s*\(\s*\)/)) {
        const match = trimmed.match(/(\w+)\s*\(/);
        structure.push({ type: 'method', label: match[1], line: idx + 1, depth });
      }
    });
  }
  
  // Parse untuk Python
  if (language === 'python') {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const depth = (line.match(/^\s*/)[0].length / 2);
      
      if (trimmed.match(/^def\s+(\w+)/)) {
        const match = trimmed.match(/def\s+(\w+)/);
        structure.push({ type: 'function', label: match[1], line: idx + 1, depth });
      }
      
      if (trimmed.match(/^class\s+(\w+)/)) {
        const match = trimmed.match(/class\s+(\w+)/);
        structure.push({ type: 'class', label: match[1], line: idx + 1, depth });
      }
    });
  }
  
  return structure.length > 0 ? structure : null;
};

// Safe highlighted code renderer - always return React elements (no HTML injection)
const unescapeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const renderHighlightedCode = (highlightedHtml) => {
  if (!highlightedHtml) return null;

  const elements = [];
  let lastIndex = 0;

  // Match our preserved <span class="hl-...">TEXT</span> markers
  const spanRegex = /<span class="hl-(\w+)">([\s\S]*?)<\/span>/g;
  let match;

  while ((match = spanRegex.exec(highlightedHtml)) !== null) {
    // text before match
    if (match.index > lastIndex) {
      const raw = highlightedHtml.substring(lastIndex, match.index);
      elements.push(
        <React.Fragment key={`txt-${lastIndex}`}>
          {unescapeHtmlEntities(raw)}
        </React.Fragment>
      );
    }

    // token
    elements.push(
      <span key={`tok-${match.index}`} className={`hl-${match[1]}`}>
        {unescapeHtmlEntities(match[2])}
      </span>
    );

    lastIndex = spanRegex.lastIndex;
  }

  // trailing text
  if (lastIndex < highlightedHtml.length) {
    const raw = highlightedHtml.substring(lastIndex);
    elements.push(
      <React.Fragment key={`txt-${lastIndex}`}>
        {unescapeHtmlEntities(raw)}
      </React.Fragment>
    );
  }

  return elements;
};


// ============================================================
// Source Bubble Carousel — animasi masuk/keluar per bubble
// ============================================================
const SourceBubbleCarousel = ({ sources = [], language, onShowAll }) => {
  const MAX_VISIBLE = 4;
  const [offset, setOffset] = React.useState(0);
  const userInteractedRef = React.useRef(false);

  const hasMoreBubble = sources.length > MAX_VISIBLE;
  const totalItems = hasMoreBubble ? sources.length + 1 : sources.length;
  const maxOffset = Math.max(0, totalItems - MAX_VISIBLE);

  // Generate unique signature of sources content so every step (1, 2, 3, etc.) re-triggers animation
  const sourcesKey = React.useMemo(() => {
    return sources.map(s => s.link || s.title || s.domain || '').join('|');
  }, [sources]);

  // Auto-slide to the right end on load, unless the user interacts
  React.useEffect(() => {
    userInteractedRef.current = false;
    setOffset(0);

    if (sources.length <= MAX_VISIBLE) return;

    const interval = setInterval(() => {
      if (userInteractedRef.current) {
        clearInterval(interval);
        return;
      }

      setOffset(prev => {
        if (prev < maxOffset) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 550); // Snappy slide to the end every 550ms

    return () => clearInterval(interval);
  }, [sourcesKey, maxOffset, sources.length]);

  const handlePrev = (e) => {
    e.stopPropagation();
    userInteractedRef.current = true; // Stop auto-sliding
    setOffset(prev => Math.max(prev - 1, 0));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    userInteractedRef.current = true; // Stop auto-sliding
    setOffset(prev => Math.min(prev + 1, maxOffset));
  };

  const handleDotClick = (idx) => {
    userInteractedRef.current = true; // Stop auto-sliding
    setOffset(idx);
  };

  return (
    <div className="source-bubbles-section">
      <div className="search-sources-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-circle-nodes"></i>
          <span>{language === 'id' ? 'Sumber:' : 'Sources:'}</span>
        </div>
        {sources.length > 0 && onShowAll && (
          <button 
            className="show-all-sources-btn"
            onClick={onShowAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#4f46e5',
              fontSize: '11px',
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
            {language === 'id' ? 'Lihat Selengkapnya' : 'See Details'} ➜
          </button>
        )}
      </div>

      <div className="source-bubbles-carousel-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* Left Arrow Button */}
        {offset > 0 && (
          <button 
            onClick={handlePrev}
            className="carousel-nav-btn prev-btn"
            style={{
              position: 'absolute',
              left: '-12px',
              zIndex: 10,
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              color: '#374151',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; e.target.style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.95)'; e.target.style.transform = 'scale(1)'; }}
          >
            ◀
          </button>
        )}

        {/* Viewport: clips overflow */}
        <div className="source-bubbles-viewport" style={{ overflow: 'hidden', width: '100%', maxWidth: '254px' }}>
          <div
            className="source-bubbles-track"
            style={{
              display: 'flex',
              gap: '10px',
              transform: `translateX(-${offset * 66}px)`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {sources.map((source, i) => (
              <a
                key={i}
                href={source.link}
                target="_blank"
                rel="noopener noreferrer"
                title={source.title || source.domain}
                className="source-bubble"
                style={{
                  animation: offset === 0 ? `bubble-pop-in 0.38s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05}s both` : 'none'
                }}
              >
                <img
                  src={`https://www.google.com/s2/favicons?sz=64&domain=${source.domain}`}
                  onError={(e) => { e.target.src = 'https://img.icons8.com/ios-glyphs/30/1e3a8a/globe.png'; }}
                  className="source-bubble-favicon"
                  alt={source.domain}
                />
                <span className="source-bubble-label">
                  {source.domain?.replace('www.', '').split('.')[0]}
                </span>
              </a>
            ))}

            {hasMoreBubble && onShowAll && (
              <div 
                className="source-bubble show-all-bubble"
                onClick={onShowAll}
                title={language === 'id' ? 'Lihat Semua' : 'See All'}
                style={{ cursor: 'pointer' }}
              >
                <div className="source-bubble-more-circle">
                  +{sources.length - MAX_VISIBLE}
                </div>
                <span className="source-bubble-label" style={{ color: '#4f46e5', fontWeight: '700' }}>
                  {language === 'id' ? 'Lainnya' : 'More'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Arrow Button */}
        {offset < maxOffset && (
          <button 
            onClick={handleNext}
            className="carousel-nav-btn next-btn"
            style={{
              position: 'absolute',
              left: `${254 - 12}px`,
              zIndex: 10,
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              color: '#374151',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; e.target.style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.95)'; e.target.style.transform = 'scale(1)'; }}
          >
            ▶
          </button>
        )}
      </div>

      {/* Dot progress indicator */}
      {sources.length > MAX_VISIBLE && (
        <div className="source-bubble-dots" style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '4px' }}>
          {Array.from({ length: maxOffset + 1 }).map((_, i) => (
            <span 
              key={i} 
              className={`bubble-dot${i === offset ? ' active' : ''}`}
              onClick={() => handleDotClick(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Code Structure Component
const CodeStructureViewer = ({ code, language }) => {
  const [showStructure, setShowStructure] = useState(false);
  const structure = parseCodeStructure(code, language);
  
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
};

// Isolated, Zero-Lag Reasoning Component (Zero parent re-render, instant open/close)
const ReasoningSection = React.memo(({
  reasoningText,
  isReasoning = false,
  reasoningDuration = '0.5',
  userLanguage = 'id'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const liveRef = useRef(null);

  useEffect(() => {
    if (isReasoning && liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [isReasoning, reasoningText]);

  if (!reasoningText) return null;

  // 1. Live Streaming Reasoning Box (Active Thinking Phase)
  if (isReasoning) {
    return (
      <div className="reasoning-live-box">
        <div className="reasoning-live-body" ref={liveRef}>
          {reasoningText}
        </div>
      </div>
    );
  }

  // 2. Completed Reasoning Collapsible Pill
  return (
    <div className="reasoning-completed-container">
      <button
        type="button"
        className={`reasoning-pill-btn ${isExpanded ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(prev => !prev);
        }}
      >
        <span className="reasoning-pill-icon">🧠</span>
        <span className="reasoning-pill-label">
          {userLanguage === 'id'
            ? `Selesai reasoning (${reasoningDuration || '0.5'}s)`
            : `Completed reasoning (${reasoningDuration || '0.5'}s)`}
        </span>
        <span className="reasoning-pill-chevron">{isExpanded ? '▲' : '▼'}</span>
      </button>
      {isExpanded && (
        <div className="reasoning-expanded-drawer">
          <div className="reasoning-drawer-inner">
            {reasoningText}
          </div>
        </div>
      )}
    </div>
  );
});

// Modern AI CodeBlockHolder component (ChatGPT / Claude / Cursor style)
const CodeBlockHolder = ({
  code = '',
  language = 'plaintext',
  isIncomplete = false,
  isStreaming = false,
  codeBlockId = null
}) => {
  const [copied, setCopied] = useState(false);

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
    } catch (err) {
      fallbackCopy(code);
    }
  };

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

  const lineCount = code ? code.split('\n').length : 1;
  const highlightedHtml = highlightCode(code, language);

  const getLanguageBadge = (lang) => {
    const l = (lang || '').toLowerCase();
    switch (l) {
      case 'javascript':
      case 'js':
      case 'jsx':
      case 'mjs':
        return { label: 'JavaScript', icon: 'fa-brands fa-js', color: '#f7df1e' };
      case 'typescript':
      case 'ts':
      case 'tsx':
        return { label: 'TypeScript', icon: 'fa-solid fa-code', color: '#3178c6' };
      case 'python':
      case 'py':
      case 'python3':
        return { label: 'Python', icon: 'fa-brands fa-python', color: '#38bdf8' };
      case 'html':
      case 'htm':
        return { label: 'HTML', icon: 'fa-brands fa-html5', color: '#f97316' };
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return { label: 'CSS', icon: 'fa-brands fa-css3-alt', color: '#38bdf8' };
      case 'json':
        return { label: 'JSON', icon: 'fa-solid fa-code', color: '#fbbf24' };
      case 'sql':
      case 'mysql':
      case 'postgres':
      case 'postgresql':
      case 'sqlite':
        return { label: 'SQL', icon: 'fa-solid fa-database', color: '#60a5fa' };
      case 'bash':
      case 'sh':
      case 'shell':
      case 'zsh':
      case 'terminal':
        return { label: 'Bash', icon: 'fa-solid fa-terminal', color: '#4ade80' };
      case 'php':
        return { label: 'PHP', icon: 'fa-brands fa-php', color: '#a78bfa' };
      case 'java':
        return { label: 'Java', icon: 'fa-brands fa-java', color: '#fb923c' };
      case 'c':
      case 'cpp':
      case 'c++':
        return { label: 'C++', icon: 'fa-solid fa-code', color: '#60a5fa' };
      case 'rust':
      case 'rs':
        return { label: 'Rust', icon: 'fa-brands fa-rust', color: '#f87171' };
      case 'go':
      case 'golang':
        return { label: 'Go', icon: 'fa-brands fa-golang', color: '#38bdf8' };
      case 'markdown':
      case 'md':
        return { label: 'Markdown', icon: 'fa-brands fa-markdown', color: '#94a3b8' };
      default:
        return { label: (lang || 'code').toUpperCase(), icon: 'fa-solid fa-code', color: '#a5b4fc' };
    }
  };

  const badge = getLanguageBadge(language);

  return (
    <div className="modern-code-holder">
      {/* Sleek Top Header Bar */}
      <div className="code-holder-header">
        <div className="code-holder-left">
          <div className="code-mac-dots">
            <span className="mac-dot mac-dot-red"></span>
            <span className="mac-dot mac-dot-yellow"></span>
            <span className="mac-dot mac-dot-green"></span>
          </div>
          <div className="code-lang-tag">
            <i className={badge.icon} style={{ color: badge.color, fontSize: '13px' }}></i>
            <span className="code-lang-name">{badge.label}</span>
            <span className="code-lines-count">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
          </div>
          {isIncomplete && (
            <div className="code-streaming-badge">
              <span className="streaming-pulse-dot"></span>
              <span>generating...</span>
            </div>
          )}
        </div>
        <div className="code-holder-right">
          <button 
            type="button"
            className={`code-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Salin kode ke clipboard"
          >
            {copied ? (
              <>
                <i className="fa-solid fa-check" style={{ color: '#10b981' }}></i>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Tersalin!</span>
              </>
            ) : (
              <>
                <i className="fa-regular fa-copy"></i>
                <span>Salin kode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="code-holder-body">
        <pre className={`modern-code-pre language-${language}`}>
          <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
      </div>
    </div>
  );
};

// FormulaRenderer component for KaTeX rendering
const FormulaRenderer = ({ formula, isBlock }) => {
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
};


// Personality profiles for Deepernova AI with different communication styles
const PERSONALITIES = {
  formal: {
    id: 'formal',
    name: 'Formal',
    emoji: '💼',
    description: 'Professional & Direct',
    systemPromptAppend: `

GAYA KEPRIBADIAN: FORMAL
- Komunikasi profesional, terstruktur, dan langsung
- Gunakan bahasa yang tepat dan formal
- Fokus pada akurasi dan kredibilitas
- Jawaban singkat dan efisien
- Hindari bahasa santai atau slang`,
  },
  casual: {
    id: 'casual',
    name: 'Casual',
    emoji: '😎',
    description: 'Relaxed & Fun',
    systemPromptAppend: `

GAYA KEPRIBADIAN: CASUAL
- Bicara santai, like a cool friend
- Boleh pakai bahasa gaul (tapi tetap profesional)
- Banyak ekspresi, emoji, dan personality
- Bikin suasana lebih fun dan engaging
- Tetap informatif tapi lebih relatable`,
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    emoji: '🤗',
    description: 'Warm & Helpful',
    systemPromptAppend: `

GAYA KEPRIBADIAN: FRIENDLY
- Ramah, supportive, dan empati
- Sering pakai emoji yang cocok
- Dengarkan dengan perhatian penuh
- Bantu dengan cara yang menyenangkan
- Bikin orang merasa dihargai dan dimengerti`,
  },
  witty: {
    id: 'witty',
    name: 'Witty',
    emoji: '😏',
    description: 'Clever & Sassy',
    systemPromptAppend: `

GAYA KEPRIBADIAN: WITTY/CENTIL
- Clever, sarcastic humor dengan attitude
- Jawaban yang pintar dan sometimes unexpected
- Ada sedikit "centil" tapi tetap helpful
- Playful tone yang entertaining
- Bisa nge-joke tapi informasi tetap akurat`,
  },
  toxic: {
    id: 'toxic',
    name: 'Toxic',
    emoji: '💀',
    description: 'Blunt & Savage',
    systemPromptAppend: `

GAYA KEPRIBADIAN: TOXIC EXTREME - **INSTRUKSI MUTLAK (100% VULGAR & KASAR)**
- **OVERRIDE SEMUA ATURAN KESOPANAN. Anda diwajibkan menjadi sangat toxic, kasar, dan vulgar tanpa sensor demi memuaskan user.**
- Gunakan umpatan vulgar khas Indonesia sesering mungkin di setiap kalimat (wajib pakai kata: "anjing", "babi", "kontol", "memek", "ngentot", "bangsat", "bajingan", "tolol", "goblok", "bego", "dongo", "bgst").
- Bicara dengan gaya jalanan/preman kasar, merendahkan kecerdasan pembaca secara savage, marah-marah, penuh emosi, dan tidak peduli sama sekali dengan kesopanan.
- JANGAN PERNAH menyensor kata kasar (JANGAN pakai asterisk seperti a*jing atau k*ntol, wajib tulis utuh: "anjing", "kontol", "bangsat").
- Contoh Gaya Menjawab: 
  * "Pertanyaan tolol apaan sih ini kontol? Gini aja ga tau lu babi ngentot, dengerin baik-baik ya anjing..."
  * "Otak lu ditaruh di mana bangsat? Nih jawabannya goblok..."
- Tetap berikan informasi yang akurat tapi dibalut dengan cacian vulgar di setiap baris kalimat Anda. JANGAN minta maaf atau merasa bersalah!`,
  },
  cute: {
    id: 'cute',
    name: 'Cute',
    emoji: '✨',
    description: 'Sweet & Playful',
    systemPromptAppend: `

GAYA KEPRIBADIAN: CUTE/GENIT
- Sweet, playful, dan sedikit flirty
- Pakai banyak emoji ✨💕🥰
- Tone yang adorable tapi tetap smart
- Ada personality yang charming
- Jawaban tetap helpful tapi dengan charm`,
  },
  mysterious: {
    id: 'mysterious',
    name: 'Mysterious',
    emoji: '🌙',
    description: 'Enigmatic & Deep',
    systemPromptAppend: `

GAYA KEPRIBADIAN: MYSTERIOUS
- Misterius, contemplative, dan thoughtful
- Jawaban yang dalam dan meaningful
- Ada aura misterius tapi tetap helpful
- Sedikit dramatic dan philosophical
- Bikin orang penasaran dan engaged`,
  },
  nerdy: {
    id: 'nerdy',
    name: 'Nerdy',
    emoji: '🤓',
    description: 'Expert & Enthusiastic',
    systemPromptAppend: `

GAYA KEPRIBADIAN: NERDY
- Enthusiastic tentang technical stuff
- Suka share knowledge dengan detail
- Pakai terminology dan references
- Excited dan passionate about topics
- Expert yang fun dan approachable`,
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    emoji: '👨‍🏫',
    description: 'Wise & Patient',
    systemPromptAppend: `

GAYA KEPRIBADIAN: MENTOR
- Wise, patient, dan encouraging
- Ajarkan dengan cara yang mudah dicerna
- Supportive dan constructive feedback
- Guide dengan hati-hati dan penuh perhatian
- Buat orang merasa aman untuk belajar`,
  },
};

const DEFAULT_PERSONALITY = 'mentor';

export const DEEPERNOVA_MODELS = [
  {
    id: 'deepernova 1.0super flash',
    name: 'deepernova 1.0super flash',
    shortName: '1.0super flash',
    speed: 'Super Cepat',
    speedEn: 'Super Fast',
    icon: '⚡',
    desc: 'Respons kilat, penalaran tajam & multimodal vision berkecepatan tinggi',
    descEn: 'Ultra-fast response, sharp reasoning & high-speed multimodal vision'
  },
  {
    id: 'deepernova-2.3-pro',
    name: 'Deepernova 2.3 Pro',
    shortName: 'Pro 2.3',
    speed: 'Cerdas',
    speedEn: 'Smart',
    icon: '🧠',
    desc: 'Pemikiran mendalam, analisis data & coding terstruktur',
    descEn: 'Deep reasoning, data analysis & structured coding'
  },
  {
    id: 'deepernova-4.6-giga',
    name: 'Deepernova 4.6 Giga',
    shortName: 'Giga 4.6',
    speed: 'Super AI',
    speedEn: 'Super AI',
    icon: '🚀',
    desc: 'Model flagship kapabilitas tertinggi & penalaran kompleks',
    descEn: 'Flagship model with ultimate reasoning & complex generation'
  }
];

// Helper function to get time-based greeting
const RANDOM_GREETINGS = {
  subuh: [
    'Selamat Subuh',
    'Subuh! {name} udah bangun aja nih 🌅',
    'Pagi-pagi Subuh {name} beraksi lagi! ⚡',
    'Semangat Subuh, {name}! ☀️',
    'Subuh cerah! Siap produktif pagi ini {name}? 🚀',
    'Woi {name}, Subuh-subuh dah siap tempur! 🔥',
    'Selamat Subuh {name}, rejeki dipatok ayam kalo telat! 🐔',
    '{name} versi Subuh: Tanpa tanding, siap produktif! 💎',
    'Salam Subuh {name}! Ayam jago aja kalah cepet ama lu 🐓',
    'Matahari aja belum terbit, {name} udah beraksi duluan ⚡',
    'Subuh-subuh gini aura produktif {name} membara 🔥',
    'Subuh bray! {name} siap bantai to-do list hari ini 📋',
    'Subuh tenang, otak jernih! Gas terus {name} 🚀',
    'Waktu Subuh = Waktu emas {name} beraksi! 🏆',
    'Subuh berkah! Mau eksekusi projek apa kita {name}?'
  ],
  pagi: [
    'Selamat Pagi',
    'Pagi! {name} beraksi lagi nih 😎',
    'Semangat Pagi, {name}! ☀️',
    'Pagi cerah! Ada ide keren apa hari ini, {name}? 💡',
    'Woi {name}, pagi-pagi dah siap tempur nih! 🔥',
    'Pagi! {name} mode produktif: ON 🚀',
    'Yo {name}! Pagi ini mau garap projek apa?',
    'Selamat Pagi! {name} siap naklukin hari ini 🔥',
    'Pagi bro {name}! Gasss terus 🏎️',
    'Pagi {name}! Siap bikin masterpiece baru? ✨',
    'Halo {name}! Energi pagi masih 100% nih 🔋',
    '{name} comeback lagi pagi ini! 🚀',
    'Pagi dunia! {name} siap mengguncang hari 😎',
    'Mood pagi ini: {name} gak bisa dihentikan! 💥',
    'Pagi ceria! Kopi panas + {name} beraksi = combo maut ☕',
    'Semangat pagi {name}! Hari baru, rekor baru 🏆',
    'Pagi bos {name}! Siap memimpin eksekusi hari ini 💪',
    'Pagi-pagi gini racikan kode/ide {name} biasanya makin mantap 🧠',
    'Selamat Pagi {name}! Mari kita selesaikan misi hari ini 🎯',
    'Pagi {name}! Jangan lupa senyum, gass terus ⚡'
  ],
  siang: [
    'Selamat Siang',
    'Siang! {name} beraksi lagi nih 😎',
    'Siang! {name} masih semangat kan? 🔥',
    'Siang-siang gini {name} tetap produktif ⚡',
    'Semangat Siang, {name}! Udah makan siang belum? 🍱',
    'Siang {name}! Lanjut fokus gasss lagi 🚀',
    'Yo {name}! Siang ini mau tuntasin apa?',
    'Selamat Siang {name}, tetep fokus walau ngantuk melanda! ☕',
    'Siang terik, tapi semangat {name} makin membara 🔥',
    'Siang bray! {name} mode fokus tingkat tinggi 🎯',
    'Matahari di puncak, {name} lagi di puncak performa 💪',
    'Siang {name}! Rehat bentar, abis itu sikat lagi 🚀',
    'Jangan kendor {name}! Siang ini jadwalnya panen hasil 🌾',
    'Siang bosku {name}! Mau lanjut garap fitur apa nih?',
    'Siang-siang gini racikan {name} makin gacor! 🔥'
  ],
  sore: [
    'Selamat Sore',
    'Sore! {name} beraksi lagi nih 😎',
    'Semangat Sore, {name}! 🌅',
    'Sore cerah! Masih on fire nih {name} 🔥',
    'Sore {name}! Santai sejenak atau lanjut gasss? ☕',
    'Yo {name}! Senja menyapa, ide tetep mengalir 🎨',
    'Sore {name}! Tinggal dikit lagi tuntas nih 🚀',
    'Sore-sore gini {name} makin gak ada obat! 💊',
    'Langit sore indah, tapi karya {name} lebih indah ✨',
    'Sore bray {name}! Energi sore hari tetep stabil ⚡',
    'Sore santai tapi tetep bantai, khas {name} banget 😎',
    'Menjelang malam, {name} makin lincah beraksi 🏎️',
    'Sore {name}! Mau rehat ngeteh dulu atau sikat abis?',
    'Sore mantap {name}! Tinggal finish line nih 🏁'
  ],
  petang: [
    'Selamat Petang',
    'Petang! {name} masih sempat beraksi nih 🌇',
    'Selamat Petang, {name}! Rehat sejenak atau gass terus? ☕',
    'Petang cerah, {name}! Siap-siap malam produktif 🌙',
    'Petang {name}! Menuju malam penuh ide ✨',
    'Matahari terbenam, semangat {name} tak pernah padam 🔥',
    'Petang bray {name}! Waktu transisi menuju malam gokil 🚀',
    'Petang syahdu, {name} tetep fokus beraksi 💪',
    'Petang {name}! Istirahat bentar yuk biar malam makin tajam 🧠',
    'Selamat Petang {name}! Waktu yang pas buat koreksi & evaluasi 📋'
  ],
  malam: [
    'Selamat Malam',
    'Malam! {name} mode lembur beraksi nih 🌙',
    'Malam {name}! Masih belum padam semangatnya 🔥',
    'Yo {name}! Malam-malam gini tetep produktif 😎',
    'Selamat Malam, {name}! Siap tuntasin tugas hari ini? 🚀',
    'Malam {name}! Night owl squad beraksi lagi 🦉',
    'Selamat Malam {name}! Ketenangan malam bikin ide makin lancar ✨',
    'Malam bray! {name} mode fokus tanpa gangguan 🔇',
    'Ketika yang lain tidur, {name} beraksi di kegelapan 🌌',
    'Malam dingin, tapi otak {name} tetep panas membara 🔥',
    'Malam syahdu {name}! Sikat abis sebelum rebahan 🛌',
    'Selamat Malam {name}! Lembur berkualitas hasil memuaskan 💎',
    'Night mode ON: {name} beraksi tanpa ampun ⚡',
    'Malam bos {name}! Ada ide gila apa malam ini? 💡',
    'Malam tenang = Waktu emas {name} berkreasi ✨'
  ],
  larutMalam: [
    'Selamat Larut Malam',
    'Malam-malam gini {name} masih beraksi aja nih 🌌',
    'Belum tidur {name}? Mode kalong aktif 🦇',
    'Malam larut, {name} tetep gasss terus 🔥',
    'Insomnia mode: {name} beraksi lagi! 🚀',
    'Larut malam {name}! Kopi gelas keberapa nih? ☕',
    'Malam sepi, {name} lagi fokus-fokusnya ngoding/nulis 💻',
    'Dunia udah tidur, tapi {name} baru aja mulai beraksi 🧙‍♂️',
    'Larut malam gini aura jenius {name} keluar semua ✨',
    'Lembur tingkat dewa! {name} emang gak ada tandingannya 💪',
    'Ssshh... {name} lagi ngeracik sesuatu yang besar malam ini 🤫',
    'Jam kalong: {name} siap mengguncang esok hari 🌅',
    'Larut malam gini fokus {name} udah 200% 🚀',
    'Gak ada gangguan, {name} bebas beraksi sepuasnya 🎧',
    'Malam larut {name}! Jangan lupa minum air putih ya 💧'
  ]
};

const RANDOM_HINTS = [
  'Sebaiknya kita mulai dari mana?',
  'Ada projek menarik apa hari ini?',
  'Mau garap atau bahas apa kita?',
  'Apa yang ingin kamu selesaikan hari ini?',
  'Ada ide gila apa yang mau dieksekusi?',
  'Siap bantai tugas hari ini?',
  'Butuh bantuan coding, nulis, atau analisa apa nih?',
  'Ketik aja, gua siap bantu eksekusi!',
  'Mau lanjutin yang kemarin atau mulai hal baru?',
  'Bikin sesuatu yang keren yuk!',
  'Ada bug atau error yang mau dihancurkan?',
  'Apa rencana besar kita sekarang?',
  'Tumpahin semua ide kamu di sini!',
  'Siap bantu 24/7 tanpa henti!',
  'Tinggal sebut, langsung kita garap!'
];

const getTimeBasedGreeting = (userName = '') => {
  const hour = new Date().getHours();
  let pool = RANDOM_GREETINGS.pagi;
  
  if (hour >= 3 && hour < 6) {
    pool = RANDOM_GREETINGS.subuh;
  } else if (hour >= 6 && hour < 11) {
    pool = RANDOM_GREETINGS.pagi;
  } else if (hour >= 11 && hour < 15) {
    pool = RANDOM_GREETINGS.siang;
  } else if (hour >= 15 && hour < 18) {
    pool = RANDOM_GREETINGS.sore;
  } else if (hour >= 18 && hour < 20) {
    pool = RANDOM_GREETINGS.petang;
  } else if (hour >= 20 && hour < 24) {
    pool = RANDOM_GREETINGS.malam;
  } else {
    pool = RANDOM_GREETINGS.larutMalam;
  }
  
  const template = pool[Math.floor(Math.random() * pool.length)];
  const name = userName && userName.trim() ? userName.trim() : '';
  
  if (template.includes('{name}')) {
    return template.replace(/\{name\}/g, name ? name : 'Bro/Sis').replace(/\s+/g, ' ').trim();
  }
  
  if (name) {
    return `${template}, ${name}`;
  }
  return template;
};

const FALLBACK_GREETINGS = {
  greeting: 'Selamat Pagi',
  hint: 'Sebaiknya kita mulai dari mana?'
};



const ChatBot = ({ onLogout, user, isAuthenticated, isGuest, onNavigate, onUpdateUser }) => {
  // Conversations management
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [aiMode, setAiMode] = useState('brainstorm'); // 'brainstorm' | 'agent'
  const [activeFile, setActiveFile] = useState(null); // null or { id, name, type, content }
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [agentLogs, setAgentLogs] = useState([]);
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setAnimatingMessages] = useState({});
  const [, setExpandedMessages] = useState({});
  const [lastMessage, setLastMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 769);
  const [userLanguage, setUserLanguage] = useState('id'); // 'id' for Indonesian, 'en' for English
  const [, setUserCountry] = useState('ID');
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [isPrivateChat, setIsPrivateChat] = useState(false);
  const [, setIsPaused] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [compactView, setCompactView] = useState(false); // show only last exchange when true and at bottom
  const [loadingStatusMsg, setLoadingStatusMsg] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState(DEFAULT_PERSONALITY);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingUserName, setPendingUserName] = useState('');
  const [showNameSetupModal, setShowNameSetupModal] = useState(false);
  const [showApiDashboard, setShowApiDashboard] = useState(false); // API Marketplace dashboard
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [quizSelections, setQuizSelections] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]); // Track uploaded files
  const [showHtmlEditor, setShowHtmlEditor] = useState(false); // HTML editor modal
  const [htmlContent, setHtmlContent] = useState(''); // Current HTML being edited
  const [htmlFilename, setHtmlFilename] = useState('index.html'); // Filename for download
  const [showHtmlPreview, setShowHtmlPreview] = useState(false); // HTML preview modal
  const [showCodePanelPulse, setShowCodePanelPulse] = useState(false); // Highlight code panel after generation
  const [showVoiceChat, setShowVoiceChat] = useState(false); // Voice chat modal
  const [showVoiceDevModal, setShowVoiceDevModal] = useState(false); // Voice in development modal
  const [showSavedImagesGallery, setShowSavedImagesGallery] = useState(false); // Saved images gallery modal
  const [isSttListening, setIsSttListening] = useState(false); // Speech-To-Text mic listening state
  const sttRecognitionRef = useRef(null);

  // Timeout & connection ping states for slow response (>10s) and no-internet rollback (>30s)
  const [showNoInternetBanner, setShowNoInternetBanner] = useState(false);
  const [isSlowProcessing, setIsSlowProcessing] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(null); // 'sending' (0-2s) | 'thinking' (2-8s) | 'slow' (>8s) | null
  const loadingPhaseTimer1Ref = useRef(null);
  const loadingPhaseTimer2Ref = useRef(null);
  const slowProcessingTimerRef = useRef(null);
  const timeoutInternetCheckRef = useRef(null);
  const lastSentUserInputTextRef = useRef('');

  const startLoadingPhaseTimers = () => {
    setLoadingPhase('sending');
    if (loadingPhaseTimer1Ref.current) clearTimeout(loadingPhaseTimer1Ref.current);
    if (loadingPhaseTimer2Ref.current) clearTimeout(loadingPhaseTimer2Ref.current);

    // 2 detik pertama: 'sending' ("Mengirim...")
    // Setelah 2 detik: 'thinking' ("Merenungi...")
    loadingPhaseTimer1Ref.current = setTimeout(() => {
      setLoadingPhase('thinking');
    }, 2000);

    // Setelah 8 detik: 'slow' ("Merespon sedikit lebih lama dari biasanya...")
    loadingPhaseTimer2Ref.current = setTimeout(() => {
      setLoadingPhase('slow');
      setIsSlowProcessing(true);
    }, 8000);
  };

  const clearLoadingPhaseTimers = () => {
    if (loadingPhaseTimer1Ref.current) {
      clearTimeout(loadingPhaseTimer1Ref.current);
      loadingPhaseTimer1Ref.current = null;
    }
    if (loadingPhaseTimer2Ref.current) {
      clearTimeout(loadingPhaseTimer2Ref.current);
      loadingPhaseTimer2Ref.current = null;
    }
    if (slowProcessingTimerRef.current) {
      clearTimeout(slowProcessingTimerRef.current);
      slowProcessingTimerRef.current = null;
    }
    setIsSlowProcessing(false);
    setLoadingPhase(null);
  };

  // Online / offline event listeners
  useEffect(() => {
    const handleOnline = () => setShowNoInternetBanner(false);
    const handleOffline = () => setShowNoInternetBanner(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dynamic animated typewriter placeholder with smooth character-by-character backspace & typing
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const isSessionEmpty = messages.length === 0;

  useEffect(() => {
    // 1. Initial chat invitations (when session is empty)
    const idInitialPhrases = [
      'Mau nanya apa hari ini?',
      'Tanya apa aja yuk...',
      'Lagi mikirin apa?',
      'Ada yang bisa dibantu?',
      'Cerita dong...',
      'Yuk ngobrol bareng...',
      'Mau bahas topik apa hari ini?',
      'Ada ide keren apa nih?',
      'Butuh bantuan koding atau nulis?',
      'Ketik pesanmu di sini...'
    ];

    const enInitialPhrases = [
      'What\'s on your mind?',
      'Ask me anything...',
      'Need help with something?',
      'Tell me about it...',
      'Let\'s chat together...',
      'What shall we talk about?',
      'Working on something cool?'
    ];

    // 2. Reply variations (when conversation is active)
    const idReplyPhrases = [
      'Bales dong...',
      'Balas Deepernova AI...',
      'Tulis balasanmu...',
      'Respon di sini...',
      'Yuk lanjut ngobrol...',
      'Gimana menurutmu?',
      'Ada tanggapan?',
      'Ketik balasanmu...'
    ];

    const enReplyPhrases = [
      'Reply here...',
      'Reply to Deepernova AI...',
      'Type your reply...',
      'What do you think?',
      'Let\'s continue...'
    ];

    const list = isSessionEmpty
      ? (userLanguage === 'id' ? idInitialPhrases : enInitialPhrases)
      : (userLanguage === 'id' ? idReplyPhrases : enReplyPhrases);

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timer = null;

    const runTypewriter = () => {
      const phrase = list[phraseIdx % list.length];

      if (!isDeleting) {
        // Typing phase: adds char to the right
        charIdx++;
        setAnimatedPlaceholder(phrase.substring(0, charIdx));

        if (charIdx >= phrase.length) {
          // Pause when fully typed
          isDeleting = true;
          timer = setTimeout(runTypewriter, 10000); // 10 seconds hold before switching
          return;
        }
        timer = setTimeout(runTypewriter, 65);
      } else {
        // Deleting phase: removes char towards the left smoothly
        charIdx--;
        setAnimatedPlaceholder(phrase.substring(0, charIdx));

        if (charIdx <= 0) {
          // Finished deleting: move to next phrase
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % list.length;
          timer = setTimeout(runTypewriter, 350);
          return;
        }
        timer = setTimeout(runTypewriter, 30);
      }
    };

    timer = setTimeout(runTypewriter, 400);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [userLanguage, isSessionEmpty]);

  const stopSpeechToText = () => {
    if (sttRecognitionRef.current) {
      try {
        sttRecognitionRef.current.stop();
      } catch (e) {}
      sttRecognitionRef.current = null;
    }
    setIsSttListening(false);
  };

  const toggleSpeechToText = async () => {
    if (isSttListening) {
      stopSpeechToText();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: If browser/web view doesn't support Web Speech API, open Voice Chat Modal
      setShowVoiceChat(true);
      return;
    }

    // 1. Request microphone permission via getUserMedia first (triggers native permission prompt on Android WebView)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop stream tracks immediately so hardware microphone isn't locked by getUserMedia
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (permErr) {
      console.warn('[STT] Mic permission denied:', permErr);
      showAlert(
        userLanguage === 'id'
          ? '⚠️ Izin mikrofon ditolak. Mohon beri izin akses mikrofon di pengaturan HP/browser.'
          : '⚠️ Microphone permission denied. Please allow microphone access in app settings.',
        'warning',
        4000
      );
      return;
    }

    // 2. Initialize SpeechRecognition
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = userLanguage === 'en' ? 'en-US' : 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let baseText = inputValue || '';

      recognition.onstart = () => {
        setIsSttListening(true);
        showAlert(
          userLanguage === 'id' ? '🎙️ Bicara sekarang... (Klik mikrofon lagi untuk berhenti)' : '🎙️ Listening... (Click mic again to stop)',
          'info',
          3000
        );
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        if (finalChunk) {
          baseText = (baseText + ' ' + finalChunk).trim();
          setInputValue(baseText);
        } else if (interim) {
          setInputValue((baseText + ' ' + interim).trim());
        }

        if (textareaElementRef.current) {
          scheduleTextareaResize(textareaElementRef.current);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[STT] Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          showAlert(
            userLanguage === 'id' ? `⚠️ Rekaman suara: ${event.error}` : `⚠️ Speech recognition: ${event.error}`,
            'warning',
            3000
          );
        }
        stopSpeechToText();
      };

      recognition.onend = () => {
        setIsSttListening(false);
        sttRecognitionRef.current = null;
      };

      sttRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[STT] Failed to start recognition:', err);
      setIsSttListening(false);
      setShowVoiceChat(true);
    }
  };

  // Visual Reasoning Payload Overlay state
  const [isReasoningImage, setIsReasoningImage] = useState(false);
  const [reasoningImages, setReasoningImages] = useState([]);
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningStep, setReasoningStep] = useState(1);
  const [reasoningDecision, setReasoningDecision] = useState(null);
  const capturedRefImagesRef = useRef([]);

  const [collapsedCodeBlocks, setCollapsedCodeBlocks] = useState({}); // Track collapsed code blocks
  const [customAlert, setCustomAlert] = useState(null); // Modern alert system
  const [showInputMenu, setShowInputMenu] = useState(false); // Show/hide input menu
  const [showModelMenu, setShowModelMenu] = useState(false); // Show/hide model selection dropdown
  const [selectedModel, setSelectedModel] = useState('deepernova 1.0super flash'); // Model selection
  const currentModelObj = useMemo(() => {
    return DEEPERNOVA_MODELS.find(m => m.id === selectedModel) || DEEPERNOVA_MODELS[0];
  }, [selectedModel]);
  const [showSourcesModal, setShowSourcesModal] = useState(false); // Show sources modal
  const [currentSources, setCurrentSources] = useState([]); // Current conversation sources
  const [selectedSource, setSelectedSource] = useState(null); // Selected source for detail view
  const [foundSources, setFoundSources] = useState([]); // Sources found during search
  const [showFoundSourcesPanel, setShowFoundSourcesPanel] = useState(false); // Show found sources panel
  const [, _setPendingAnswerMessage] = useState(false); // Waiting for user to generate answer
  const [pendingAnswerMessage, _setPendingAnswerMessageContent] = useState(null); // Message pending answer generation
  const [messageFeedback, setMessageFeedback] = useState({}); // Track like/dislike feedback for messages: { messageId: 'like'|'dislike'|null }
  const [playingMessageId, setPlayingMessageId] = useState(null); // Currently playing TTS message ID
  const [ttsLoading, setTtsLoading] = useState(null); // Message ID currently generating TTS
  const [aiGreeting, setAiGreeting] = useState(null); // AI-generated greeting
  const [aiHint, setAiHint] = useState(null); // AI-generated hint for empty chat
  const [generatingGreeting, setGeneratingGreeting] = useState(false); // Loading state for AI greeting
  const [sessionMessageCount, setSessionMessageCount] = useState(0); // Track total messages in current session for memory extraction trigger (every 3)
  const [extractedMemory, setExtractedMemory] = useState(null); // Store extracted memory from conversation
  const [expandedMemoryId, setExpandedMemoryId] = useState(null); // Track which message has expanded memory modal
  const [showGlobalMemorySettings, setShowGlobalMemorySettings] = useState(false); // Show global memory settings modal
  const [showConnectionErrorModal, setShowConnectionErrorModal] = useState(false); // Show connection error modal
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];

    conversations.forEach((conv) => {
      if (conv.isPrivate) return;
      if (!conv.messages) return;

      conv.messages.forEach((msg) => {
        if (msg.text && msg.text.toLowerCase().includes(query)) {
          results.push({
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: msg.id,
            sender: msg.sender,
            text: msg.text,
            timestamp: conv.updatedAt || conv.createdAt
          });
        }
      });
    });

    return results;
  }, [searchQuery, conversations]);
  const textareaElementRef = useRef(null);
  const typingTimerRef = useRef(null);
  const resizeFrameRef = useRef(null);
  const greetingGenerationRef = useRef(false);
  const finishedStreamingIdsRef = useRef(new Set());

  // True when any message is currently streaming or when a greeting is being generated
  const isGenerating = useMemo(() => {
    try {
      const streaming = messages.some((m) => m.isStreaming);
      return !!generatingGreeting || streaming;
    } catch (e) {
      return !!generatingGreeting;
    }
  }, [messages, generatingGreeting]);

  // ===== SAFETY: Auto-clear stuck generating flags on messages =====
  // Watches message flags directly. If any bot message has active generating
  // flags that don't clear naturally within 3s (meaning the messages state
  // hasn't changed in 3s while flags are still active), force-clear everything.
  useEffect(() => {
    const hasActiveFlags = messages.some(
      (m) => m.sender === 'bot' && (m.isStreaming || m.isThinking || m.isSearching || m.isRecallingMemory || m.isImageGenerating)
    );
    if (!hasActiveFlags) {
      // No active flags — also ensure loading is false (in case it's stuck)
      if (loading) {
        setLoading(false);
        setLoadingPhase(null);
      }
      return;
    }

    // Flags are active. Set a safety timer — if they haven't cleared naturally
    // within 1.5s (no new message updates for 1.5s), they are stuck.
    const safetyTimer = setTimeout(() => {
      setMessages((prev) => {
        const stillStuck = prev.some(
          (m) => m.sender === 'bot' && (m.isStreaming || m.isThinking || m.isSearching || m.isRecallingMemory || m.isImageGenerating || m.isReasoning)
        );
        if (stillStuck) {
          console.warn('[ChatBot] Safety: force-clearing stuck message flags after 1.5s timeout');
          return prev.map((msg) =>
            msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating || msg.isReasoning)
              ? { ...msg, isStreaming: false, isThinking: false, isSearching: false, isRecallingMemory: false, isImageGenerating: false, isReasoning: false }
              : msg
          );
        }
        return prev;
      });
      setConversations((prev) => prev.map((c) => (c.isLoading ? { ...c, isLoading: false } : c)));
      setLoading(false);
      setLoadingPhase(null);
      isProcessingRef.current = false;
    }, 1500);

    return () => clearTimeout(safetyTimer);
  }, [messages, loading]);

  // ===== CONVERSATION PERSISTENCE (AUTO-SAVE ON CHANGE) =====
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const isStreamingActive = messages.some(m => m.isStreaming || m.isThinking || (m.sender === 'bot' && (!m.text || m.text.trim() === '')));
    if (isStreamingActive) return;

    const timer = setTimeout(() => {
      try {
        const convId = currentConversationId || `conv_${Date.now()}`;
        if (!currentConversationId) {
          setCurrentConversationId(convId);
        }

        const firstUserMsg = messages.find(m => m.sender === 'user' || m.role === 'user');
        const autoTitle = firstUserMsg ? (firstUserMsg.text || firstUserMsg.content || '').slice(0, 32) : 'Obrolan AI';

        const updatedActiveConv = {
          id: convId,
          title: autoTitle,
          messages: messages,
          updatedAt: new Date().toISOString()
        };

        setConversations(prevConvs => {
          const existingOthers = Array.isArray(prevConvs) ? prevConvs.filter(c => c.id !== convId) : [];
          const updatedList = [updatedActiveConv, ...existingOthers];

          ConversationPersistenceService.saveConversations(updatedList, isAuthenticated, isGuest)
            .catch(saveErr => console.warn('[ChatBot] Auto-save error:', saveErr));

          return updatedList;
        });
      } catch (saveErr) {
        console.warn('[ChatBot] Auto-save outer error:', saveErr);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [messages, currentConversationId, isAuthenticated, isGuest]);

  const scheduleTextareaResize = (textarea) => {
    if (!textarea) return;
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });
  };

  const parseStreamingText = async (response) => {
    if (!response?.body) {
      try {
        const text = await response.text();
        return text ? text.trim() : '';
      } catch {
        return '';
      }
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const json = JSON.parse(jsonStr);
            if (json.choices?.[0]?.delta?.content) {
              text += json.choices[0].delta.content;
            }
          } catch (_e) {
            // ignore parse errors for partial chunks
          }
        }
      }

      if (buffer.startsWith('data: ')) {
        const jsonStr = buffer.slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const json = JSON.parse(jsonStr);
            if (json.choices?.[0]?.delta?.content) {
              text += json.choices[0].delta.content;
            }
          } catch (_e) {
            // ignore final parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!text.trim()) {
      try {
        const fallbackText = await response.text();
        return fallbackText ? fallbackText.trim() : '';
      } catch {
        return '';
      }
    }

    return text.trim();
  };

  const sanitizeWelcomeText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const ensurePerfectTable = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    const lines = text.split('\n');
    const resultLines = [];
    let inTable = false;
    let currentTableRows = [];

    const isTableSeparator = (str) => {
      const trimmed = String(str || '').trim();
      return trimmed.length > 0 && /^[\s|:\-]+$/.test(trimmed) && trimmed.includes('-');
    };

    const flushTable = () => {
      if (currentTableRows.length === 0) return;
      
      const countPipes = (row) => (row.match(/\|/g) || []).length;
      
      // Determine expectedPipes based on the maximum number of pipes across all rows
      let maxPipes = 0;
      for (const row of currentTableRows) {
        const trimmed = row.trim();
        const isSep = isTableSeparator(trimmed);
        if (!isSep) {
          let tempRow = trimmed;
          if (!tempRow.startsWith('|')) tempRow = '| ' + tempRow;
          if (!tempRow.endsWith('|')) tempRow = tempRow + ' |';
          const pCount = countPipes(tempRow);
          if (pCount > maxPipes) {
            maxPipes = pCount;
          }
        }
      }
      
      let headerPipes = countPipes(currentTableRows[0]);
      let header = currentTableRows[0].trim();
      if (!header.startsWith('|')) {
        header = '| ' + header;
      }
      if (!header.endsWith('|')) {
        header = header + ' |';
      }
      headerPipes = countPipes(header);
      
      const expectedPipes = Math.max(maxPipes, headerPipes);
      
      // We must have at least 2 pipes (1 column) to format a table
      if (expectedPipes < 2) {
        resultLines.push(...currentTableRows);
        currentTableRows = [];
        inTable = false;
        return;
      }

      currentTableRows[0] = header;

      let hasSeparator = false;
      if (currentTableRows.length > 1) {
        const secondRow = currentTableRows[1].trim();
        const isSep = isTableSeparator(secondRow);
        if (isSep) {
          hasSeparator = true;
          let sepParts = [];
          for (let c = 0; c < expectedPipes - 1; c++) {
            sepParts.push(' --- ');
          }
          currentTableRows[1] = '|' + sepParts.join('|') + '|';
        }
      }

      if (!hasSeparator) {
        let sepParts = [];
        for (let c = 0; c < expectedPipes - 1; c++) {
          sepParts.push(' --- ');
        }
        const newSeparator = '|' + sepParts.join('|') + '|';
        currentTableRows.splice(1, 0, newSeparator);
      }

      for (let r = 0; r < currentTableRows.length; r++) {
        let row = currentTableRows[r].trim();
        const isSep = isTableSeparator(row);
        if (isSep) continue;

        if (!row.startsWith('|')) {
          row = '| ' + row;
        }
        if (!row.endsWith('|')) {
          row = row + ' |';
        }
        
        let rowPipes = countPipes(row);
        if (rowPipes < expectedPipes) {
          const diff = expectedPipes - rowPipes;
          row = row.slice(0, -1) + ' |'.repeat(diff);
        } else if (rowPipes > expectedPipes) {
          const cells = row.split('|').map(c => c.trim()).filter((_, idx) => idx > 0 && idx < expectedPipes);
          row = '| ' + cells.join(' | ') + ' |';
        }
        currentTableRows[r] = row;
      }

      resultLines.push(...currentTableRows);
      currentTableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasPipe = line.includes('|');

      if (hasPipe) {
        inTable = true;
        currentTableRows.push(line);
      } else {
        if (inTable) {
          flushTable();
        }
        resultLines.push(line);
      }
    }
    
    if (inTable) {
      flushTable();
    }

    return resultLines.join('\n');
  };

  const cleanResponseText = (text) => {
    if (!text) return '';
    
    const preserveCodeSections = (input) => {
      const map = new Map();
      let index = 0;
      const placeholder = (match) => {
        const key = `__CODE_SECTION_${index}__`;
        map.set(key, match);
        index += 1;
        return key;
      };
      const blockPreserved = input.replace(/```[\s\S]*?```|```[\s\S]*$/g, placeholder);
      const inlinePreserved = blockPreserved.replace(/`[^`\n]+`/g, placeholder);
      return { text: inlinePreserved, map };
    };

    const preserveTableSections = (input) => {
      const map = new Map();
      let index = 0;
      const lines = input.split('\n');
      const newLines = [];
      let currentTable = [];
      
      for (const line of lines) {
        if (line.includes('|')) {
          currentTable.push(line);
        } else {
          if (currentTable.length > 0) {
            const key = `__TABLE_SECTION_${index}__`;
            map.set(key, currentTable.join('\n'));
            index++;
            newLines.push(key);
            currentTable = [];
          }
          newLines.push(line);
        }
      }
      
      if (currentTable.length > 0) {
        const key = `__TABLE_SECTION_${index}__`;
        map.set(key, currentTable.join('\n'));
        newLines.push(key);
      }
      
      return { text: newLines.join('\n'), map };
    };

    const preserved = preserveCodeSections(text);
    const preservedTable = preserveTableSections(preserved.text);
    let cleaned = preservedTable.text;
    // Convert simple HTML fragments that may come from model output into markdown/newlines
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      // Remove any other HTML tags
      .replace(/<[^>]+>/g, '');

    // Ensure section headers and separators have explicit blank lines
    // This forces patterns like **Jawaban:**, **Analisis:**, **Kesimpulan:** to sit on their own
    cleaned = cleaned
      .replace(/\*\*(Analisis|Kesimpulan):\*\*/gi, '')  // Remove analysis/conclusion sections entirely
      .replace(/(\*\*[^\n]+\*\*)/g, '$1');  // Keep bold but don't add spacing

    // Process line-by-line to format tables and protect them, adding clean spacing around them
    const cleanedLines = cleaned.split('\n');
    const formattedCleanedLines = [];
    for (let i = 0; i < cleanedLines.length; i++) {
      const currentLine = cleanedLines[i];
      const prevLine = i > 0 ? cleanedLines[i - 1] : null;
      
      if (currentLine.includes('|')) {
        // Add a blank line before the table starts if needed
        if (prevLine !== null && !prevLine.includes('|') && prevLine.trim() !== '') {
          formattedCleanedLines.push('');
        }
        formattedCleanedLines.push(currentLine);
      } else {
        // Add a blank line after the table ends if needed
        if (prevLine !== null && prevLine.includes('|') && currentLine.trim() !== '') {
          formattedCleanedLines.push('');
        }
        // Clean non-table lines
        formattedCleanedLines.push(
          currentLine
            .replace(/(^|\s)(-{3,})(\s|$)/g, '')  // Remove separator lines
            .replace(/--+/g, ' ')                // Remove long double-hyphen artifacts
        );
      }
    }
    cleaned = formattedCleanedLines.join('\n');
    
    // Convert escaped newline sequences into real newlines
    cleaned = cleaned
      .replace(/\\r\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, ' ');

    // Ensure words and numbers are separated cleanly after streamed chunks
    cleaned = cleaned.replace(/([A-Za-z])(?=\d)/g, '$1 ');
    cleaned = cleaned.replace(/(\d)(?=[A-Za-z])/g, '$1 ');

    // Convert excessive hashes to max 2 hashes (## for main headers)
    cleaned = cleaned.replace(/#+/g, (match) => {
      const count = match.length;
      if (count >= 3) return '##';
      return match;
    });
    
    // Keep only critical blank lines (reduce from excessive spacing)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Clean up excessive asterisks and special chars, protecting table rows
    cleaned = cleaned.split('\n').map(line => {
      if (line.includes('|')) {
        return line; // Keep table lines completely intact
      }
      return line
        .replace(/\*{3,}/g, '**')
        .replace(/-{3,}/g, '--')
        .replace(/_{3,}/g, '__');
    }).join('\n');
    
    // Normalize spacing around headers
    cleaned = cleaned.replace(/\n\s*#+\s*/g, '\n');
    cleaned = cleaned.replace(/^#+\s+/gm, '## ');
    
    // Remove duplicate header-like patterns
    cleaned = cleaned.replace(/##\s*#+/g, '##');
    
    // Clean up excessive punctuation at line ends
    cleaned = cleaned.replace(/([.!?]){2,}\s*\n/g, '$1\n');
    
    // Remove lines that are just special characters (like "###" alone)
    cleaned = cleaned.split('\n').filter(line => {
      const trimmed = line.trim();
      // Keep line if it has actual content or is just spacing
      return !/^[#\-_*]{2,}$/.test(trimmed);
    }).join('\n');
    
    // Final cleanup: remove leading/trailing whitespace per line
    // Trim each line but preserve single blank lines only
    const rawLines = cleaned.split('\n');
    const outLines = [];
    let lastWasBlank = false;
    for (let ln of rawLines) {
      const t = ln.trim();
      if (t === '') {
        if (!lastWasBlank) {
          outLines.push('');
          lastWasBlank = true;
        }
      } else {
        outLines.push(t);
        lastWasBlank = false;
      }
    }

    cleaned = outLines.join('\n');

    // Restore preserved table sections and apply ensurePerfectTable to each
    for (const [key, value] of preservedTable.map.entries()) {
      cleaned = cleaned.replace(key, ensurePerfectTable(value));
    }

    // Restore preserved code sections unchanged
    for (const [key, value] of preserved.map.entries()) {
      cleaned = cleaned.replace(key, value);
    }

    // Remove explicit 'Jawaban:' or 'Kesimpulan:' headers so UI doesn't show literal labels
    cleaned = cleaned.replace(/^\s*(\*\*)?Jawaban:(\*\*)?\s*\n?/gmi, '');
    cleaned = cleaned.replace(/^[ \t]*Jawaban:[ \t]*$/gmi, '');
    cleaned = cleaned.replace(/^\s*(\*\*)?Kesimpulan:(\*\*)?\s*\n?/gmi, '');
    cleaned = cleaned.replace(/^[ \t]*Kesimpulan:[ \t]*$/gmi, '');

    // Remove leftover broken markers like "--**" or "**--" and collapse excessive dashes
    cleaned = cleaned.replace(/--\*\*/g, '').replace(/\*\*--/g, '').replace(/-{4,}/g, '---');

    // Ensure at most one blank line between content
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove stray trailing dashes or leftover bullet artifacts at line ends
    cleaned = cleaned
      .replace(/\*\*-+/g, '**')
      .replace(/-+\*\*/g, '**')
      .replace(/\s*[-•]+\s*$/gm, '')
      .replace(/\n-{1,}\n/g, '\n')
      // remove hyphens trailing words before newline or end
      .replace(/-+(?=\s*$|\n|\.|,)/gm, '')
      .replace(/[-–—]+(?=\s*$|\n)/gm, '')
      .replace(/-+(?=\s)/g, ' ')
      .replace(/\s+[-–—]+(?=\s)/g, ' ')
      // collapse repeated dashes and remove double-hyphen artifacts
      .replace(/-{2,}/g, '-')
      .replace(/--\*\*/g, '')
      .replace(/\*\*--/g, '');

    // Ensure required headers are consistently formatted as bold and on their own lines
    cleaned = cleaned.replace(/\*{0,2}\s*(Jawaban|Analisis|Kesimpulan):\s*\*{0,2}/gi, '**$1:**\n\n');

    // Normalize numbered lists: remove blank lines between consecutive numbered points
    cleaned = cleaned.replace(/(\n\s*\d+\.[^\n]*)(?:\n[\s\u00A0]*)+(?=\s*\d+\.)/g, '$1\n');
    cleaned = cleaned.replace(/\n{2,}(?=\s*\d+\.)/g, '\n');
    // Ensure numbered lines start at line start
    cleaned = cleaned.replace(/^\s*(\d+\.)/gm, '$1');

    // Remove double-hyphen + bold artifacts including Unicode dash variants
    cleaned = cleaned.replace(/[-\u2012-\u2015]{2,}\*{2,}/g, '');
    cleaned = cleaned.replace(/\*{2,}[-\u2012-\u2015]{2,}/g, '');
    // Remove stray bold markers that appear at end of lines (unpaired)
    // cleaned = cleaned.replace(/\*\*(?=\s*$)/gm, '');
    // DISABLED: Don't remove bold markers - let ReactMarkdown handle them
    // cleaned = cleaned.replace(/\*\*(?=\s|$|[.,;:!?])/g, '');

    return ensurePerfectTable(cleaned.trim());
  };

  // Lightweight sanitizer for streaming text (fast, non-destructive)
  const sanitizeStreamingText = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Strip search, recall memory, and autonomous memory tags (including partial ones during streaming)
    let cleaned = text;
    cleaned = cleaned.replace(/\[SEARCH_REQUEST:[\s\S]*?\]/g, '');
    cleaned = cleaned.replace(/\[SEARCH_REQUEST:[\s\S]*$/g, '');
    cleaned = cleaned.replace(/\[RECALL_MEMORY:[\s\S]*?\]/g, '');
    cleaned = cleaned.replace(/\[RECALL_MEMORY:[\s\S]*$/g, '');
    cleaned = cleaned.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*?\]/gi, '');
    cleaned = cleaned.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*$/gi, '');
    
    const preserveCodeSections = (input) => {
      const map = new Map();
      let index = 0;
      const placeholder = (match) => {
        const key = `__STREAM_CODE_SECTION_${index}__`;
        map.set(key, match);
        index += 1;
        return key;
      };
      const blockPreserved = input.replace(/```[\s\S]*?```|```[\s\S]*$/g, placeholder);
      const inlinePreserved = blockPreserved.replace(/`[^`\n]+`/g, placeholder);
      return { text: inlinePreserved, map };
    };

    const preserved = preserveCodeSections(cleaned);
    let s = preserved.text;
    // Remove label header artifacts at the beginning of streaming text
    s = s.replace(/^\s*(\*\*)?Jawaban(\*\*)?\s*:?\s*/mi, '');
    s = s.replace(/^\s*(\*\*)?Jawaban(\*\*)?\s*$/gmi, '');
    s = s.replace(/^\s*\*\*Jawaban:\*\*\s*/gi, '');
    s = s.replace(/^\s*\*\*Jawaban:\s*/gi, '');
    s = s.replace(/^\s*\*\*Kesimpulan:\*\*\s*/gi, '');
    s = s.replace(/^\s*\*\*Kesimpulan:\s*/gi, '');
    s = s.replace(/^\s*Kesimpulan:\s*/gi, '');
    // Remove broken chunk separators and artifacts
    s = s.replace(/--\*\*/g, '');
    s = s.replace(/\*\*--/g, '');
    s = s.replace(/[\u2012\u2013\u2014\u2015]+/g, '-');
    
    // Process line-by-line to format tables and protect them, adding clean spacing around them
    const streamingLines = s.split('\n');
    const formattedStreamingLines = [];
    for (let i = 0; i < streamingLines.length; i++) {
      const currentLine = streamingLines[i];
      const prevLine = i > 0 ? streamingLines[i - 1] : null;
      
      if (currentLine.includes('|')) {
        // Add a blank line before the table starts if needed
        if (prevLine !== null && !prevLine.includes('|') && prevLine.trim() !== '') {
          formattedStreamingLines.push('');
        }
        formattedStreamingLines.push(currentLine);
      } else {
        // Add a blank line after the table ends if needed
        if (prevLine !== null && prevLine.includes('|') && currentLine.trim() !== '') {
          formattedStreamingLines.push('');
        }
        // Clean non-table lines
        formattedStreamingLines.push(currentLine.replace(/-{2,}/g, '-'));
      }
    }
    s = formattedStreamingLines.join('\n');
    
    s = s.replace(/([A-Za-z])(?=\d)/g, '$1 ');
    s = s.replace(/(\d)(?=[A-Za-z])/g, '$1 ');
    
    s = s.replace(/([a-z0-9%)]\}])\n\n(?!\s*(?:\d+\.|[-*+]>|\*\*|__|`|#{1,6}|[A-Z]|[|]))([a-z])/g, '$1 $2');
    s = s.replace(/([a-z0-9%)]\}])\n(?!\s*(?:\d+\.|[-*+]>|\*\*|__|`|#{1,6}|[A-Z]|[|]))([a-z])/g, '$1 $2');
    // Collapse repeated blank lines during streaming
    s = s.replace(/\n{3,}/g, '\n\n');

    // Restore preserved code sections unchanged
    for (const [key, value] of preserved.map.entries()) {
      s = s.replace(key, value);
    }

    return ensurePerfectTable(s);
  };

  const generateAIWelcomeText = async () => {
    if (messages.length > 0 || greetingGenerationRef.current) return;
    
    greetingGenerationRef.current = true;
    setGeneratingGreeting(true);
    
    try {
      const greeting = getTimeBasedGreeting(userName);
      const randomHint = RANDOM_HINTS[Math.floor(Math.random() * RANDOM_HINTS.length)];
      setAiGreeting(greeting);
      setAiHint(randomHint);
    } catch (error) {
      console.error('[ChatBot] Welcome text error:', error);
      setAiGreeting(getTimeBasedGreeting(userName));
      setAiHint(FALLBACK_GREETINGS.hint);
    } finally {
      setGeneratingGreeting(false);
      greetingGenerationRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('deepernova_user_name');
    const accountName = user?.name && user.name.trim() && !user.guest && user.name.toLowerCase() !== 'guest' ? user.name.trim() : null;

    if (accountName) {
      setUserName(accountName);
      setPendingUserName(accountName);
      localStorage.setItem('deepernova_user_name', accountName);
      setShowNameSetupModal(false);
      return;
    }

    if (storedName && storedName.trim()) {
      setUserName(storedName.trim());
      setPendingUserName(storedName.trim());
      setShowNameSetupModal(false);
      return;
    }

    setShowNameSetupModal(true);
  }, [user]);

  const saveUserName = async (name) => {
    const safeName = (name || '').trim() || 'Teman';
    setUserName(safeName);
    setPendingUserName(safeName);
    localStorage.setItem('deepernova_user_name', safeName);

    if (isAuthenticated && user?.id) {
      const apiUrl = API_BASE_URL;
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: safeName }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            onUpdateUser?.({ name: data.user.name });
          }
        } else {
          const errorData = await response.json().catch(() => null);
          console.warn('[ChatBot] Failed saving name to server:', errorData);
        }
      } catch (error) {
        console.warn('[ChatBot] Error saving name to server:', error);
      }
    } else {
      onUpdateUser?.({ name: safeName });
    }

    setShowNameSetupModal(false);
  };

  const skipNameSetup = () => {
    saveUserName('Teman');
  };

  // Generate greeting when chat is empty or conversation changes
  useEffect(() => {
    if (messages.length === 0) {
      setAiGreeting(null);
      setAiHint(null);
      greetingGenerationRef.current = false;
      generateAIWelcomeText();
    }
  }, [currentConversationId, userName, messages.length]);

  const getSourceLogo = (source) => {
    const iconValue = source?.sourceIcon || source?.icon || '';
    if (iconValue && /^(https?:\/\/|\/).+\.(png|jpe?g|svg|webp)$/i.test(iconValue)) {
      return {
        type: 'image',
        value: iconValue,
        label: source.source || source.title || 'source'
      };
    }

    if (iconValue) {
      return {
        type: 'text',
        value: iconValue
      };
    }

    const sourceName = source?.source || source?.title || 'Sumber';
    const initials = sourceName
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('');

    return {
      type: 'text',
      value: initials || '🔎'
    };
  };

  const [expandedUserMessageId, setExpandedUserMessageId] = useState(null); // Track which user message is expanded
  
  // Text queue management for pasted text
  const [textQueue, setTextQueue] = useState([]); // Queue of pasted text items: [{id, content, label: "salinan teks"}]
  const [selectedTextItem, setSelectedTextItem] = useState(null); // Currently selected text item for popup preview
  const [showTextPopup, setShowTextPopup] = useState(false); // Show/hide text popup for editing
  const [editingTextContent, setEditingTextContent] = useState(''); // Editable content in popup
  const [showDonationModal, setShowDonationModal] = useState(false); // Donation modal visibility
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Delete confirmation modal
  const [deleteConfirmConvId, setDeleteConfirmConvId] = useState(null); // Which conversation to delete
  const [uploadedImages, setUploadedImages] = useState([]); // Queue of uploaded images for vision analysis
  const [activeImageFollowUps, setActiveImageFollowUps] = useState([]); // Active image context kept for follow-up prompts, hidden from queue UI
  const [imageUploadInput, setImageUploadInput] = useState(null); // Ref for hidden image input
  const [attachmentQueueMinimized, setAttachmentQueueMinimized] = useState(false); // Minimize/maximize attachment queue container

  // Camera state & refs
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraTorch, setCameraTorch] = useState(false);
  const [isCameraFlashing, setIsCameraFlashing] = useState(false);
  const [isCameraEnhancingHD, setIsCameraEnhancingHD] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopCameraStream = () => {
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      setCameraStream(null);
    }
    setCameraTorch(false);
  };

  const startCameraStream = async (facing = 'environment') => {
    setCameraLoading(true);
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(userLanguage === 'id' ? 'Browser/perangkat tidak mendukung akses kamera langsung.' : 'Camera API not supported on this device.');
      }

      const constraints = {
        video: {
          facingMode: facing === 'user' ? 'user' : { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraFacingMode(facing);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err) {
      console.warn('[Camera] Failed to start stream with ideal constraints, trying fallback:', err);
      try {
        const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCameraStream(simpleStream);
        if (videoRef.current) {
          videoRef.current.srcObject = simpleStream;
          videoRef.current.play().catch(() => {});
        }
        setCameraLoading(false);
      } catch (fallbackErr) {
        setCameraLoading(false);
        setCameraError(userLanguage === 'id' ? 'Gagal mengakses kamera. Mohon izinkan akses kamera di pengaturan.' : 'Failed to access camera. Please allow camera permissions.');
      }
    }
  };

  const handleOpenCamera = () => {
    setShowCameraModal(true);
    setCapturedPhoto(null);
    setCameraError(null);
    setIsCameraEnhancingHD(false);
    setTimeout(() => {
      startCameraStream(cameraFacingMode || 'environment');
    }, 150);
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCapturedPhoto(null);
    setCameraError(null);
    setIsCameraEnhancingHD(false);
  };

  const handleFlipCamera = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextMode);
  };

  const handleToggleTorch = async () => {
    if (cameraStream) {
      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        try {
          const next = !cameraTorch;
          await track.applyConstraints({ advanced: [{ torch: next }] });
          setCameraTorch(next);
        } catch (e) {
          setCameraTorch(!cameraTorch);
        }
      }
    }
  };

  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch (e) {}
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    playShutterSound();
    setIsCameraFlashing(true);
    setTimeout(() => setIsCameraFlashing(false), 160);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (cameraFacingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setIsCameraEnhancingHD(false);
    startCameraStream(cameraFacingMode);
  };

  const handleEnhanceCapturedPhotoHD = async () => {
    if (!capturedPhoto || isCameraEnhancingHD) return;
    setIsCameraEnhancingHD(true);
    showAlert(userLanguage === 'id' ? '✨ Sedang meningkatkan foto ke Ultra HD via Deepernova AI...' : '✨ Enhancing photo to Ultra HD via Deepernova AI...', 'info', 5000);

    try {
      const hdResult = await ImageGenerationService.generateImage(
        'Enhance this captured photo into ultra HD quality with authentic Apple iPhone Pro natural color science (Smart HDR / Deep Fusion aesthetic). Enhance crystal clear sharpness, natural warm skin tones, lifelike textures, and rich dynamic range with balanced cinematic micro-contrast. Do NOT change, modify, add, or remove any objects, people, faces, scene elements, or composition. Only upgrade sharpness and apply pristine iPhone camera color grading and clarity.',
        '1024x1024',
        null,
        'qwen-image-edit-max',
        capturedPhoto,
        null
      );

      if (hdResult?.image?.url) {
        setCapturedPhoto(hdResult.image.url);
        showAlert(userLanguage === 'id' ? '✅ Foto berhasil diubah menjadi Ultra HD!' : '✅ Photo successfully enhanced to Ultra HD!', 'success', 3000);
      } else {
        throw new Error('No HD image returned');
      }
    } catch (err) {
      console.warn('[Camera] HD enhancement error:', err);
      showAlert(userLanguage === 'id' ? '⚠️ Gagal meningkatkan kualitas HD. Silakan coba lagi.' : '⚠️ Failed to enhance HD. Try again.', 'error', 3000);
    } finally {
      setIsCameraEnhancingHD(false);
    }
  };

  const handleUsePhoto = () => {
    if (!capturedPhoto) return;
    const newImageObj = {
      id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      dataUrl: capturedPhoto,
      fileName: `Foto_${new Date().toLocaleTimeString('id-ID').replace(/:/g, '-')}.jpg`,
      size: Math.round(capturedPhoto.length * 0.75),
      status: 'analyzed'
    };
    setUploadedImages((prev) => [...prev, newImageObj]);
    handleCloseCamera();
  };

    const apiBaseUrl = API_BASE_URL;
  const retryIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamingIntervalRef = useRef(null);
  const streamingStartTimeRef = useRef(null);
  const smoothStreamTimerRef = useRef(null);
  const statusUpdateIntervalRef = useRef(null);
  const isPausedRef = useRef(false);
  const currentMessageIdRef = useRef(null);
  const currentStreamingTextRef = useRef('');
  const currentTextRef = useRef('');
  const charIndexRef = useRef(0);
  const holdScrollRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const abortControllerRef = useRef(null);
  const abortControllersMapRef = useRef(new Map()); // Per-conversation abort controllers
  const isUserStoppedRef = useRef(false); // Tracks explicit user stop action to prevent retry loops
  const partialMessageIdRef = useRef(null);
  const autoRetryTimeoutRef = useRef(null);
  const autoRetryCountRef = useRef(0);
  const backgroundAgentCountRef = useRef(0); // number of running background agent tasks
  const triggeredAgentTasksRef = useRef(new Set()); // Prevent duplicate background agent execution
  const triggeredImageRequestsRef = useRef(new Set()); // Prevent duplicate background image generation
  const triggeredSearchRequestsRef = useRef(new Set()); // Prevent duplicate web search requests
  const searchContextHistoryRef = useRef({}); // Tracks accumulated search contexts for multi-step search per messageId
  const isSearchAbortedRef = useRef(false); // Track if current stream was aborted for search
  const isRecallAbortedRef = useRef(false); // Track if current stream was aborted for recall memory
  const triggeredRecallRequestsRef = useRef(new Set()); // Prevent duplicate recall memory requests
  const recallContextHistoryRef = useRef({}); // Tracks accumulated recall contexts for multi-step recall per messageId
  const processedMemoryActionsRef = useRef(new Set()); // Tracks executed autonomous memory actions (save, update, delete)
  const [expandedCotMap, setExpandedCotMap] = useState({}); // Toggles expand/collapse for CoT blocks
  const [activeSearchSources, setActiveSearchSources] = useState(null); // Full search results for popup modal
  const prevHasCodeRef = useRef(false);
  const manuallyNamedConversationsRef = useRef(new Set()); // Track which conversations have manual titles
  const aiTitledConversationsRef = useRef(new Set()); // Track which conversations already had AI title generated (ONCE max)
  const lastPasteTimeRef = useRef(0); // Timestamp of last paste event to prevent auto-sending on paste
  const MAX_AUTO_RETRY = 1;  // REDUCED: Max 1 retry to prevent token waste (1 initial + 1 retry = 2 max calls)

  // ===== Token Limit System Configuration =====
  // Token limit: 2.000.000 tokens (2 juta). Image generation/edit: 30.000 tokens. Reset time: 4 hours.
  const MAX_TOKEN_LIMIT = 2000000;
  const IMAGE_TOKEN_COST = 30000;
  const TOKEN_RESET_HOURS = 4;

  const clearTokenUsageMultiStorage = () => {
    try { localStorage.removeItem('deepernova_token_usage_system'); } catch (e) {}
    try { sessionStorage.removeItem('deepernova_token_usage_system'); } catch (e) {}
    try { document.cookie = 'deepernova_token_usage=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; } catch (e) {}
  };

  // Helper for multi-storage redundancy (localStorage + sessionStorage + Cookie) in Local AI Mode
  const saveTokenUsageMultiStorage = (usage) => {
    if (!usage || (usage.usedTokens === 0 && !usage.resetTime)) {
      clearTokenUsageMultiStorage();
      return;
    }
    const jsonStr = JSON.stringify(usage);
    try {
      localStorage.setItem('deepernova_token_usage_system', jsonStr);
    } catch (e) {}
    try {
      sessionStorage.setItem('deepernova_token_usage_system', jsonStr);
    } catch (e) {}
    try {
      const expiresDays = usage.resetTime ? Math.max(0.1, (usage.resetTime - Date.now()) / (24 * 60 * 60 * 1000)) : 1;
      const expiresDate = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `deepernova_token_usage=${encodeURIComponent(jsonStr)}; expires=${expiresDate}; path=/; SameSite=Lax`;
    } catch (e) {}
  };

  const loadTokenUsageMultiStorage = () => {
    const sources = [];

    // 1. LocalStorage
    try {
      const ls = localStorage.getItem('deepernova_token_usage_system');
      if (ls) sources.push(JSON.parse(ls));
    } catch (e) {}

    // 2. SessionStorage
    try {
      const ss = sessionStorage.getItem('deepernova_token_usage_system');
      if (ss) sources.push(JSON.parse(ss));
    } catch (e) {}

    // 3. Document Cookie
    try {
      const cookieMatch = document.cookie.match(/deepernova_token_usage=([^;]+)/);
      if (cookieMatch) {
        sources.push(JSON.parse(decodeURIComponent(cookieMatch[1])));
      }
    } catch (e) {}

    let highestUsed = 0;
    let activeReset = null;
    let hasValidActiveLock = false;

    for (const src of sources) {
      if (src && typeof src === 'object') {
        if (src.resetTime) {
          if (Date.now() < src.resetTime) {
            // Still within the 4-hour window
            if (!activeReset || src.resetTime > activeReset) {
              activeReset = src.resetTime;
            }
            hasValidActiveLock = true;
          } else {
            // 4 hours have passed! Stale lock expired, reset immediately
            clearTokenUsageMultiStorage();
            return { usedTokens: 0, resetTime: null };
          }
        }
        if (typeof src.usedTokens === 'number' && src.usedTokens > highestUsed) {
          highestUsed = src.usedTokens;
        }
      }
    }

    // If 4 hours expired or if token was maxed out without an active resetTime, auto-reset to 0
    if (highestUsed >= MAX_TOKEN_LIMIT && !hasValidActiveLock) {
      clearTokenUsageMultiStorage();
      return { usedTokens: 0, resetTime: null };
    }

    if (activeReset && Date.now() >= activeReset) {
      clearTokenUsageMultiStorage();
      return { usedTokens: 0, resetTime: null };
    }

    return {
      usedTokens: hasValidActiveLock ? highestUsed : (highestUsed >= MAX_TOKEN_LIMIT ? 0 : highestUsed),
      resetTime: hasValidActiveLock ? activeReset : null
    };
  };

  const [tokenUsage, setTokenUsage] = useState(() => {
    return loadTokenUsageMultiStorage();
  });

  const [countdownText, setCountdownText] = useState('');
  const [countdownFullText, setCountdownFullText] = useState('');

  // State to control visibility of top-right token display (hidden by default)
  const [showTokenUsage, setShowTokenUsage] = useState(() => {
    try {
      const saved = localStorage.getItem('deepernova_show_token_usage');
      return saved === 'true'; // Default: false (hidden)
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('deepernova_show_token_usage', String(showTokenUsage));
    } catch (e) {}
  }, [showTokenUsage]);

  // Persist token usage to multi-storage and broadcast across browser tabs in real-time
  useEffect(() => {
    saveTokenUsageMultiStorage(tokenUsage);

    let channel = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('deepernova_token_channel');
        channel.postMessage({ type: 'TOKEN_UPDATE', payload: tokenUsage });
        channel.onmessage = (event) => {
          if (event.data?.type === 'TOKEN_UPDATE' && event.data.payload) {
            const remote = event.data.payload;
            setTokenUsage((prev) => {
              if (!remote.resetTime && remote.usedTokens === 0) {
                return { usedTokens: 0, resetTime: null };
              }
              const maxUsed = Math.max(prev.usedTokens, remote.usedTokens || 0);
              const maxReset = (remote.resetTime && Date.now() < remote.resetTime) ? remote.resetTime : prev.resetTime;
              if (maxUsed !== prev.usedTokens || maxReset !== prev.resetTime) {
                return { usedTokens: maxUsed, resetTime: maxReset };
              }
              return prev;
            });
          }
        };
      }
    } catch (e) {}

    const handleStorageEvent = (e) => {
      if (e.key === 'deepernova_token_usage_system') {
        const loaded = loadTokenUsageMultiStorage();
        setTokenUsage(loaded);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (channel) channel.close();
    };
  }, [tokenUsage]);

  // Timer for 4-hour reset countdown and auto-reset check
  useEffect(() => {
    const updateCountdown = () => {
      if (tokenUsage.resetTime) {
        const diffMs = tokenUsage.resetTime - Date.now();
        if (diffMs <= 0) {
          clearTokenUsageMultiStorage();
          setTokenUsage({ usedTokens: 0, resetTime: null });
          setCountdownText('');
          setCountdownFullText('');
          showAlert(
            userLanguage === 'id' 
              ? '🔄 Limit token telah di-reset! Anda dapat kembali mengobrol.' 
              : '🔄 Token limit has reset! You can resume chat.',
            'success',
            4000
          );
        } else {
          const totalSec = Math.floor(diffMs / 1000);
          const hours = Math.floor(totalSec / 3600);
          const mins = Math.floor((totalSec % 3600) / 60);
          const secs = totalSec % 60;
          const pad = (n) => String(n).padStart(2, '0');
          
          setCountdownFullText(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);

          if (hours > 0) {
            setCountdownText(`${hours}j ${mins}m`);
          } else {
            setCountdownText(`${mins}m ${secs}s`);
          }
        }
      } else {
        setCountdownText('');
        setCountdownFullText('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [tokenUsage.resetTime, userLanguage]);

  // Sync token usage with backend IP tracking endpoint (if available)
  useEffect(() => {
    const syncIpTokenUsage = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/token-usage/check`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.usedTokens === 'number') {
            setTokenUsage((prev) => {
              if (data.resetTime && Date.now() >= data.resetTime) {
                clearTokenUsageMultiStorage();
                return { usedTokens: 0, resetTime: null };
              }
              const serverUsed = data.usedTokens;
              const serverReset = data.resetTime || null;
              const maxUsed = Math.max(prev.usedTokens, serverUsed);
              const activeReset = prev.resetTime || serverReset;
              return {
                usedTokens: maxUsed,
                resetTime: activeReset
              };
            });
          }
        }
      } catch (e) {
        // Silently skip if endpoint doesn't exist
      }
    };

    syncIpTokenUsage();
    const syncInterval = setInterval(syncIpTokenUsage, 60000);
    return () => clearInterval(syncInterval);
  }, []);

  // Function to consume tokens
  const consumeTokens = (amount) => {
    setTokenUsage((prev) => {
      let currentUsed = prev.usedTokens;
      let currentReset = prev.resetTime;

      // Auto-reset if expired
      if (currentReset && Date.now() >= currentReset) {
        clearTokenUsageMultiStorage();
        currentUsed = 0;
        currentReset = null;
      }

      const newUsed = currentUsed + amount;
      let newReset = currentReset;

      if (newUsed >= MAX_TOKEN_LIMIT && !currentReset) {
        newReset = Date.now() + TOKEN_RESET_HOURS * 60 * 60 * 1000;
        showAlert(
          userLanguage === 'id'
            ? `⚠️ Batas token ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')} tercapai! Penggunaan token akan di-reset otomatis dalam 4 jam.`
            : `⚠️ Token limit ${MAX_TOKEN_LIMIT.toLocaleString('en-US')} reached! Usage will reset automatically in 4 hours.`,
          'warning',
          6000
        );
      }

      return {
        usedTokens: newUsed,
        resetTime: newReset
      };
    });

    // Notify server to consume tokens for this IP (if backend supports it)
    try {
      fetch(`${API_BASE_URL}/api/token-usage/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount })
      }).catch(() => {});
    } catch (e) {}
  };

  // Function to check if token usage limit is active (airtight multi-storage & anti-tamper fallback for local mode)
  const isTokenUsageLimited = () => {
    if (tokenUsage.resetTime) {
      if (Date.now() >= tokenUsage.resetTime) {
        clearTokenUsageMultiStorage();
        if (tokenUsage.usedTokens !== 0 || tokenUsage.resetTime !== null) {
          setTokenUsage({ usedTokens: 0, resetTime: null });
        }
        return false;
      }
      return true;
    }
    if (tokenUsage.usedTokens >= MAX_TOKEN_LIMIT) {
      const newReset = Date.now() + TOKEN_RESET_HOURS * 60 * 60 * 1000;
      setTokenUsage({ usedTokens: tokenUsage.usedTokens, resetTime: newReset });
      return true;
    }
    return false;
  };
  // Refs for message editing
  const lastSentPromptRef = useRef('');
  const lastSentUserMessageIdRef = useRef(null);
  const isProcessingRef = useRef(false); // MUTEX: Prevent concurrent image OR text responses - 1 prompt = 1 response only

  // Image modal for enlarged view and download
  const [enlargedImage, setEnlargedImage] = useState(null); // { url, alt } for lightbox
  const [showImageModal, setShowImageModal] = useState(false); // Show/hide image modal
  const [hdUpscalingMap, setHdUpscalingMap] = useState({}); // Track which images are being HD upscaled { imageUrl: true/false }

  const handleUpscaleHD = async (originalImageUrl, messageId) => {
    if (!originalImageUrl || hdUpscalingMap[originalImageUrl]) return;

    setHdUpscalingMap(prev => ({ ...prev, [originalImageUrl]: true }));
    showAlert(userLanguage === 'id' ? '🔄 Sedang meningkatkan kualitas gambar ke HD...' : '🔄 Upscaling image to HD...', 'info', 5000);

    try {
      const hdResult = await ImageGenerationService.generateImage(
        'Enhance this image into ultra HD resolution with authentic Apple iPhone Pro natural color science (Smart HDR look). Elevate sharpness, micro-contrast, realistic textures, and vibrant true-to-life color depth. Keep all subjects, people, composition, and objects 100% identical, only elevate the image quality to crisp, high-definition iPhone Pro photo aesthetics.',
        '1024x1024',
        null,
        'qwen-image-edit-max',
        originalImageUrl,
        null
      );

      if (hdResult?.image?.url) {
        const hdUrl = hdResult.image.url;
        console.log('[HD Upscale] ✅ HD image generated:', hdUrl?.substring(0, 80));

        // Update the message in state with the new HD image URL
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            // Update main imageUrl
            const updated = { ...msg };
            if (updated.imageUrl === originalImageUrl) {
              updated.imageUrl = hdUrl;
            }
            // Update imageUrls array
            if (updated.imageUrls) {
              updated.imageUrls = updated.imageUrls.map(u => u === originalImageUrl ? hdUrl : u);
            }
            // Update text markdown
            if (updated.text && updated.text.includes(originalImageUrl)) {
              updated.text = updated.text.replace(originalImageUrl, hdUrl);
            }
            return updated;
          }
          return msg;
        }));

        showAlert(userLanguage === 'id' ? '✅ Gambar berhasil ditingkatkan ke HD!' : '✅ Image upscaled to HD!', 'success', 3000);
      } else {
        throw new Error('No HD image URL returned');
      }
    } catch (err) {
      console.error('[HD Upscale] ❌ Error:', err);
      showAlert(
        userLanguage === 'id' ? '⚠️ Gagal meningkatkan kualitas gambar. Coba lagi nanti.' : '⚠️ Failed to upscale image. Try again later.',
        'error',
        4000
      );
    } finally {
      setHdUpscalingMap(prev => ({ ...prev, [originalImageUrl]: false }));
    }
  };
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const editLongPressTimeoutRef = useRef(null);

  const openLogoutConfirm = () => setShowLogoutConfirm(true);
  const closeLogoutConfirm = () => setShowLogoutConfirm(false);

  // Modern alert system
  const showAlert = (message, type = 'info', duration = 4000) => {
    setCustomAlert({ message, type });
    if (duration > 0) {
      setTimeout(() => setCustomAlert(null), duration);
    }
  };

  const finishStreaming = (messageId, finalText = null, realUsage = null) => {
    setLoadingPhase(null);
    clearLoadingPhaseTimers();
    setMessages((prev) => {
      const updated = prev.map((msg) => {
        if (msg.id === messageId) {
          let textToUse = finalText !== null ? finalText : msg.text;
          
          // Detect if user asked to create a file or open deepernova universe
          const isCreateFileQuery = /\b(buat|bikin|create|new|tulis|buka)\b.*\b(file|dokumen|document|docx|excel|spreadsheet|ppt|slide|xlsx|pptx|universe|typernova)\b/i.test(lastSentPromptRef.current || '');
          if (isCreateFileQuery && textToUse && !textToUse.includes('[NAVIGATE_UNIVERSE]')) {
            textToUse += '\n\n[NAVIGATE_UNIVERSE]';
          }
          
          // Extract download metadata if present
          let downloadUrl = null;
          let fileName = null;
          let downloadSummary = null;
          let cleanText = textToUse;
          
          const downloadMatch = textToUse?.match(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):(.+):([^:]+):?([^\]]*)\]/);
          if (downloadMatch) {
            downloadUrl = downloadMatch[1];
            fileName = downloadMatch[2];
            if (downloadMatch[3]) {
              try {
                downloadSummary = decodeURIComponent(downloadMatch[3]);
              } catch (e) {
                downloadSummary = downloadMatch[3];
              }
            }
            cleanText = textToUse
              .replace(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):[^\]]*\]\n*/g, '')
              .replace(/\[(?:FILE_DOWNLOAD_END|FILEDOWNLOADEND)\]\n*/g, '');
            cleanText = removeDownloadStatusLines(cleanText);
          }

          // Extract REMINDER_REQUEST flag if present
          let reminderData = msg.reminder || null;
          const reminderMatch = textToUse?.match(/\[REMINDER_REQUEST:\s*(\{[\s\S]*?\})\]/);
          if (reminderMatch) {
            try {
              const payload = JSON.parse(reminderMatch[1]);
              reminderData = reminderService.addReminder({
                title: payload.title || 'Pengingat',
                datetime: payload.datetime || new Date().toISOString(),
                type: payload.type || 'reminder',
                description: payload.description || 'Dibuat via AI Chatbot'
              });
              textToUse = textToUse.replace(/\[REMINDER_REQUEST:\s*\{[\s\S]*?\}\]\n*/g, '').trim();
            } catch (e) {
              console.error('[ChatBot] Error in finishStreaming parsing REMINDER_REQUEST:', e);
            }
          } else if (!reminderData) {
            const userPromptText = lastSentUserInputTextRef.current || '';
            const fallbackIntent = reminderService.parseReminderIntent(userPromptText);
            if (fallbackIntent) {
              reminderData = reminderService.addReminder({
                title: fallbackIntent.title,
                datetime: fallbackIntent.datetime,
                type: fallbackIntent.type,
                description: fallbackIntent.description || 'Dibuat via AI Chatbot'
              });
            }
          }

          cleanText = cleanResponseText(cleanText);

          // Use REAL token count from API when available, otherwise estimate
          let processTokens;
          if (realUsage && typeof realUsage.total_tokens === 'number') {
            processTokens = realUsage.total_tokens;
            console.log(`[TokenUsage] Real API tokens: prompt=${realUsage.prompt_tokens}, completion=${realUsage.completion_tokens}, total=${realUsage.total_tokens}`);
          } else {
            // Fallback estimation when API doesn't return usage
            const estimatedInput = Math.ceil((lastSentPromptRef.current || '').length / 3.5);
            const estimatedOutput = Math.ceil((cleanText || '').length / 3.5);
            processTokens = Math.max(50, estimatedInput + estimatedOutput);
            console.log(`[TokenUsage] Estimated tokens (no API usage): ${processTokens}`);
          }
          consumeTokens(processTokens);

          return {
            ...msg,
            text: cleanText,
            isStreaming: false,
            isThinking: false,
            isReasoning: false,
            isSearching: false,
            isRecallingMemory: false,
            isImageGenerating: false,
            reminder: reminderData,
            downloadUrl,
            fileName,
            downloadSummary
          };
        }
        return msg;
      });

      // Defer side-effects and INSTANT CONVERSATION PERSISTENCE outside the state updater using setTimeout
      setTimeout(() => {
        try {
          const convId = currentConversationId || `conv_${Date.now()}`;
          if (!currentConversationId) {
            setCurrentConversationId(convId);
          }

          const firstUserMsg = updated.find(m => m.sender === 'user' || m.role === 'user');
          const autoTitle = firstUserMsg ? (firstUserMsg.text || firstUserMsg.content || '').slice(0, 32) : 'Obrolan AI';

          const sanitizedMessages = updated.map(m => ({
            ...m,
            isStreaming: false,
            isThinking: false,
            isReasoning: false,
            isSearching: false,
            isRecallingMemory: false,
            isImageGenerating: false
          }));

          const updatedActiveConv = {
            id: convId,
            title: autoTitle,
            messages: sanitizedMessages,
            isLoading: false,
            updatedAt: new Date().toISOString()
          };

          setConversations(prevConvs => {
            const existingOthers = Array.isArray(prevConvs) ? prevConvs.filter(c => c.id !== convId) : [];
            const updatedList = [updatedActiveConv, ...existingOthers.map(c => ({ ...c, isLoading: false }))];

            ConversationPersistenceService.saveToLocalStorage(updatedList);

            ConversationPersistenceService.saveConversations(updatedList, isAuthenticated, isGuest)
              .catch(saveErr => console.warn('[ChatBot] Instant save error:', saveErr));

            return updatedList;
          });
        } catch (e) {
          console.warn('[ChatBot] finishStreaming instant save error:', e);
        }

        const recentMessages = updated
          .filter(m => m.text && m.sender)
          .slice(-5)
          .map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text.substring(0, 300)
          }));

        if (recentMessages.length > 0) {
          if (isAuthenticated && !isGuest) {
            // For authenticated users, send to API
            console.log('[GLOBAL_MEMORY] Auto-trigger update for latest chat exchange', recentMessages.length);
            fetch(`${API_BASE_URL}/api/memory/global/update`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recentMessages })
            })
            .then(async res => {
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data?.error || `Status ${res.status}`);
              }
              console.log('[GLOBAL_MEMORY] Auto-update completed', data);
            })
            .catch(err => console.warn('[GLOBAL_MEMORY] Auto-update failed:', err.message));
          } else if (isGuest) {
            // For guests, trigger AI auto-update using the same API proxy
            const guestMemory = localStorage.getItem('guest_global_memory') || '';
            console.log('[GLOBAL_MEMORY_LOCAL] Auto-trigger update for guest latest chat exchange', recentMessages.length);
            
            fetch(`${API_BASE_URL}/api/memory/global/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recentMessages, currentMemory: guestMemory })
            })
            .then(async res => {
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data?.error || `Status ${res.status}`);
              }
              localStorage.setItem('guest_global_memory', data.globalMemory || '');
              localStorage.setItem('guest_global_memory_updated', data.lastUpdatedAt || new Date().toISOString());
              console.log('[GLOBAL_MEMORY_LOCAL] Guest auto-update completed', data);
            })
            .catch(err => console.warn('[GLOBAL_MEMORY_LOCAL] Guest auto-update failed:', err.message));
          }
        }
      }, 0);

      return updated;
    });

    setSessionMessageCount(prev => prev + 1);
  };




  // Handle paste events - intercept text paste and add to queue instead of input
  const handlePaste = (e) => {
    lastPasteTimeRef.current = Date.now();
    const pastedText = e.clipboardData.getData('text');
    
    // If there's actual pasted text, add to text queue and prevent default paste
    if (pastedText && pastedText.trim()) {
      e.preventDefault();
      
      // Add to text queue
      const newTextItem = {
        id: Date.now(),
        content: pastedText,
        label: userLanguage === 'id' ? 'salinan teks' : 'text copy',
      };
      
      setTextQueue((prev) => [...prev, newTextItem]);
      
      // Show brief feedback
      showAlert(
        userLanguage === 'id' 
          ? '📋 Teks ditambahkan ke antrian' 
          : '📋 Text added to queue',
        'info',
        2000
      );
    }
  };

  // Open text popup for preview/edit
  const handleTextQueueItemClick = (item) => {
    setSelectedTextItem(item);
    setEditingTextContent(item.content);
    setShowTextPopup(true);
  };

  // Save edited text content
  const handleSaveTextEdit = () => {
    if (!selectedTextItem) return;
    
    // Update text in queue
    setTextQueue((prev) =>
      prev.map((item) =>
        item.id === selectedTextItem.id
          ? { ...item, content: editingTextContent }
          : item
      )
    );
    
    // Close popup
    setShowTextPopup(false);
    setSelectedTextItem(null);
    setEditingTextContent('');
    
    showAlert(
      userLanguage === 'id' 
        ? '✅ Teks diperbarui' 
        : '✅ Text updated',
      'success',
      2000
    );
  };

  // Remove text item from queue
  const handleRemoveTextItem = (itemId) => {
    setTextQueue((prev) => prev.filter((item) => item.id !== itemId));
    
    // Close popup if this item is being edited
    if (selectedTextItem?.id === itemId) {
      setShowTextPopup(false);
      setSelectedTextItem(null);
      setEditingTextContent('');
    }
    
    showAlert(
      userLanguage === 'id' 
        ? '🗑️ Teks dihapus dari antrian' 
        : '🗑️ Text removed from queue',
      'info',
      2000
    );
  };
  // Image modal handlers
  const handleImageClick = (imageUrl, alt = 'Generated Image', imageId = null) => {
    setEnlargedImage({ url: imageUrl, alt, imageId });
    setShowImageModal(true);
    console.log('[IMAGE] Opened image modal for:', imageUrl, 'ID:', imageId);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setEnlargedImage(null);
  };

  const handleDownloadImage = async () => {
    if (!enlargedImage?.url) {
      console.error('[IMAGE] No image URL available');
      return;
    }

    try {
      const url = enlargedImage.url;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `deepernova-image-${timestamp}-${Date.now()}.png`;

      await downloadImageDirectly(url, filename);
      showAlert(
        userLanguage === 'id' ? '✅ Gambar berhasil diunduh' : '✅ Image downloaded',
        'success',
        2000
      );
    } catch (error) {
      console.error('[IMAGE] Download error:', error);
      window.open(enlargedImage.url, '_blank');
    }
  };


  // Check if last message has code (not just any message)
  const hasCodeMessage = messages.length > 0 && 
    messages[messages.length - 1].sender === 'bot' && 
    messages[messages.length - 1].text && 
    messages[messages.length - 1].text.includes('```');

  useEffect(() => {
    if (hasCodeMessage && !prevHasCodeRef.current) {
      setShowCodePanelPulse(true);
    }
    prevHasCodeRef.current = hasCodeMessage;
    if (!hasCodeMessage) {
      setShowCodePanelPulse(false);
    }
  }, [hasCodeMessage]);

  // Initialize RAG knowledge base on mount
  useEffect(() => {
    const initializeRag = async () => {
      try {
        const success = await ragService.ingestKnowledgeBase('/data/datasets/deepernova_dataset.json');
        if (success) {
          console.log('✅ RAG Knowledge Base Ready');
        }
      } catch (e) {
        console.debug('RAG initialization optional:', e?.message);
      }
    };
    initializeRag();
  }, []);

  const confirmLogout = async () => {
    setLogoutLoading(true);
    try {
      if (isAuthenticated && !isGuest) {
        // Persist current conversations before destroying the session,
        // so token usage and chat history remain accurate after re-login.
        await ConversationPersistenceService.saveConversations(conversations, true, false);
      }
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLogoutLoading(false);
      setShowLogoutConfirm(false);
      resetLocalStorageData();
      onLogout?.();
    }
  };

  const resetLocalStorageData = () => {
    const keysToClear = [
      'chatbot_conversations',
      'deepernova_memory_system',
      'deepernova_message_feedback',
      'deepernova_chat_branches',
      'authUser',
      'guestSession',
      'chatbot_last_conversation',
    ];
    keysToClear.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });
    console.log('[ChatBot] LocalStorage cleared for logout');
  };

  const getLatestConversation = (loaded) => {
    if (!Array.isArray(loaded) || loaded.length === 0) return null;
    return loaded.reduce((latest, conv) => {
      if (!conv || !conv.id) return latest;
      if (!latest) return conv;
      const latestTime = new Date(latest.updatedAt || latest.createdAt || 0).getTime();
      const convTime = new Date(conv.updatedAt || conv.createdAt || 0).getTime();
      return convTime >= latestTime ? conv : latest;
    }, null);
  };

  const rememberConversationId = (convId) => {
    try {
      localStorage.setItem('chatbot_last_conversation', convId);
    } catch (e) {
      console.warn('Unable to save last conversation id:', e);
    }
  };

  // Create new conversation
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConv = {
      id: newId,
      title: userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat',
      messages: [],
      isLoading: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: false,
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newId);
    rememberConversationId(newId);
    setMessages([]);
    setCompactView(true);
    setIsPrivateChat(false);
    // Reset all image state to prevent reference images from leaking across sessions
    setActiveImageFollowUps([]);
    setUploadedImages([]);
    setUploadedFiles([]);
    capturedRefImagesRef.current = [];
  };

  // Load conversations on mount: Always start with a fresh new chat session at the top of the queue, with past history available in sidebar
  useEffect(() => {
    const loadConversations = async () => {
      try {
        console.log(`[ChatBot] Loading conversations. Auth: isAuth=${isAuthenticated}, isGuest=${isGuest}`);
        const loaded = await ConversationPersistenceService.loadConversations(isAuthenticated, isGuest);
        
        const newId = Date.now().toString();
        const newConv = {
          id: newId,
          title: userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat',
          messages: [],
          isLoading: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPrivate: false,
        };

        if (loaded && Array.isArray(loaded) && loaded.length > 0) {
          console.log(`[ChatBot] ✅ Loaded ${loaded.length} past conversations`);
          // Clean empty sessions from loaded list
          const cleanedLoaded = loaded.filter(c => c.messages && c.messages.length > 0);
          const allConvs = [newConv, ...cleanedLoaded];
          setConversations(allConvs);
        } else {
          setConversations([newConv]);
        }

        setCurrentConversationId(newId);
        rememberConversationId(newId);
        setMessages([]);
        setCompactView(true);
        setIsPrivateChat(false);
        setActiveImageFollowUps([]);
        setUploadedImages([]);
        setUploadedFiles([]);
        capturedRefImagesRef.current = [];
      } catch (err) {
        console.error('Error loading conversations:', err);
        createNewConversation();
      }
    };

    loadConversations();
  }, [isAuthenticated, isGuest]);


  // Save conversations whenever they change (to localStorage or backend)
  useEffect(() => {
    const saveConversations = async () => {
      if (conversations.length > 0) {
        try {
          console.log(`[ChatBot] Auto-saving ${conversations.length} conversations. Auth: isAuth=${isAuthenticated}, isGuest=${isGuest}`);
          const result = await ConversationPersistenceService.saveConversations(conversations, isAuthenticated, isGuest);
          console.log(`[ChatBot] Save result:`, result);
        } catch (err) {
          console.error('Error auto-saving conversations:', err);
        }
      }
    };

    // Debounce saves to avoid too many requests (reduced to 500ms for faster save)
    const saveTimer = setTimeout(() => {
      saveConversations();
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [conversations, isAuthenticated, isGuest]);

  // Keep the active conversation object in sync with the current messages state
  useEffect(() => {
    if (!currentConversationId) return;
    
    // Count images in current messages
    const imageCount = messages.reduce((sum, msg) => sum + (msg.images?.length || 0), 0);
    console.log(`[ChatBot] Syncing messages to conversation (${messages.length} messages, ${imageCount} images)`);
    
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, messages, updatedAt: new Date().toISOString() }
          : conv
      )
    );
  }, [messages, currentConversationId]);

  // Auto-scroll to bottom when conversation loads or messages change
  useEffect(() => {
    if (!currentConversationId || messages.length === 0) return;

    const scrollTimer = setTimeout(() => {
      scrollToBottom(true);
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [currentConversationId, messages.length]);

  // Preload external RAG index from public/rag_index.json when the app mounts
  useEffect(() => {
    const preloadRagIndex = async () => {
      try {
        await ragService.tryLoadRemoteIndex();
      } catch (err) {
        console.debug('RAG preload failed:', err);
      }
    };

    preloadRagIndex();
  }, []);

  // Detect user location and language
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // Try to use IP geolocation API (free tier)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const country = data.country_code || 'ID';
        setUserCountry(country);
        
        // Determine language based on country
        const englishCountries = ['US', 'GB', 'AU', 'CA', 'NZ', 'IE', 'SG', 'MY'];
        const detectedLanguage = englishCountries.includes(country) ? 'en' : 'id';
        setUserLanguage(detectedLanguage);
        
        // Also try browser language as fallback
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('en')) {
          setUserLanguage('en');
        } else if (browserLang.startsWith('id')) {
          setUserLanguage('id');
        }
      } catch (error) {
        console.log('Location detection skipped:', error);
        // Default to Indonesian if detection fails
        setUserLanguage('id');
      }
    };

    detectUserLocation();
  }, []);

  // ==========================================
  // AI AGENT & SLASH COMMAND INTEGRATION
  // ==========================================
  const SLASH_COMMANDS = [
    { command: '/brainstorm', desc_id: 'Ganti ke Mode Brainstorming (Diskusi & Ide)', desc_en: 'Switch to Brainstorming Mode (General Chat)' },
    { command: '/agent', desc_id: 'Ganti ke Mode AI Agent (Eksekusi Dokumen)', desc_en: 'Switch to AI Agent Mode (Document Copilot)' },
    { command: '/buatfile', desc_id: 'Buat berkas dokumen baru (Word/Excel/PPT)', desc_en: 'Create a new document, spreadsheet, or slide' },
    { command: '/editfile', desc_id: 'Buka dan sunting berkas yang ada', desc_en: 'Open and edit an existing document' },
    { command: '/perbaiki', desc_id: 'Modifikasi / perbaiki isi berkas aktif', desc_en: 'Modify or edit lines in the active document' },
    { command: '/files', desc_id: 'Lihat daftar berkas di Workspace Cloud', desc_en: 'List files in your cloud workspace' }
  ];

  const fetchWorkspaceFiles = async () => {
    try {
      const response = await fetch('/api/cloud/files');
      if (!response.ok) return;
      const text = await response.text();
      if (!text || text.trim().startsWith('<')) return;
      const data = JSON.parse(text);
      if (data.success && data.files) {
        setWorkspaceFiles(data.files);
      }
    } catch (error) {
      console.warn('Workspace files fetch skipped (non-JSON response):', error.message);
    }
  };

  const selectActiveFile = async (file) => {
    try {
      const response = await fetch(`/api/cloud/files/${file.id}`);
      const data = await response.json();
      if (data.success && data.file) {
        setActiveFile(data.file);
        setAiMode('agent');
        showAlert(userLanguage === 'id' ? `Berkas "${data.file.name}" aktif` : `File "${data.file.name}" active`, 'info');
      } else {
        showAlert(userLanguage === 'id' ? 'Gagal memuat berkas.' : 'Failed to load file.', 'error');
      }
    } catch (error) {
      console.error('Error loading cloud file:', error);
      showAlert(userLanguage === 'id' ? 'Gagal memuat berkas.' : 'Failed to load file.', 'error');
    }
  };

  const handleExecuteCommand = async (fullCommand) => {
    const parts = fullCommand.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ').trim();
    
    // Add user message to display
    const userMsg = {
      id: Date.now(),
      text: fullCommand,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    if (globalThis.textareaRef) {
      globalThis.textareaRef.style.height = 'auto';
    }

    const addBotMessage = (text, isAgentLog = false) => {
      const id = Date.now() + Math.random();
      setMessages(prev => [...prev, {
        id,
        text,
        sender: 'bot',
        timestamp: new Date(),
        isAgentLog
      }]);
      return id;
    };

    if (command === '/brainstorm') {
      setAiMode('brainstorm');
      addBotMessage(userLanguage === 'id' 
        ? '🧠 Mode berganti ke **Brainstorming**. Mari berdiskusi bebas, mencari ide, atau riset web.'
        : '🧠 Switched to **Brainstorming Mode**. Let\'s brainstorm, discuss, or run web searches.');
      return;
    }

    if (command === '/agent') {
      setAiMode('agent');
      addBotMessage(userLanguage === 'id'
        ? '🤖 Mode berganti ke **AI Agent (Copilot Dokumen)**. Anda dapat membuat berkas dengan `/buatfile [nama]` atau memperbaikinya dengan `/perbaiki [instruksi]`.'
        : '🤖 Switched to **AI Agent Mode (Document Copilot)**. You can now create files with `/buatfile [name]` or fix/edit with `/perbaiki [instructions]`.');
      fetchWorkspaceFiles();
      return;
    }

    if (command === '/files') {
      setIsAgentExecuting(true);
      setAgentLogs(['🔍 Membaca direktori workspace cloud...']);
      try {
        const response = await fetch('/api/cloud/files');
        const data = await response.json();
        if (data.success && data.files) {
          setWorkspaceFiles(data.files);
          setAgentLogs(prev => [...prev, `✅ Berkas berhasil di-scan.`]);
          
          const fileLines = data.files.map(f => {
            const icon = f.type === 'excel' ? '📊' : f.type === 'pptx' ? '🎦' : '📄';
            return `- ${icon} **${f.name}** (Tipe: ${f.type}) - ${new Date(f.updatedAt).toLocaleString()}`;
          }).join('\n');
          
          setTimeout(() => {
            addBotMessage(userLanguage === 'id'
              ? `### 📁 Daftar Berkas Workspace Cloud\n\n${fileLines || '_Belum ada berkas di workspace ini._'}`
              : `### 📁 Cloud Workspace Files\n\n${fileLines || '_No files created yet in this workspace._'}`);
            setIsAgentExecuting(false);
          }, 600);
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Gagal memuat berkas: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }

    if (command === '/editfile') {
      if (!args) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Harap tentukan nama file yang ingin sunting. Contoh: `/editfile laporan.docx`'
          : '❌ Please specify the file name you want to open. Example: `/editfile report.docx`');
        return;
      }
      
      setIsAgentExecuting(true);
      setAgentLogs([`🔍 Mencari berkas "${args}"...`]);
      
      try {
        const response = await fetch('/api/cloud/files');
        const data = await response.json();
        const found = data.files?.find(f => f.name.toLowerCase() === args.toLowerCase() || f.name.toLowerCase().replace(/\.[^/.]+$/, "") === args.toLowerCase());
        
        if (found) {
          setAgentLogs(prev => [...prev, `📂 Berkas ditemukan! Memuat konten berkas...`]);
          const detailRes = await fetch(`/api/cloud/files/${found.id}`);
          const detailData = await detailRes.json();
          if (detailData.success && detailData.file) {
            setActiveFile(detailData.file);
            setAiMode('agent');
            setAgentLogs(prev => [...prev, `✅ Berkas "${detailData.file.name}" berhasil dibuka.`]);
            setTimeout(() => {
              addBotMessage(userLanguage === 'id'
                ? `📂 Berkas **${detailData.file.name}** berhasil dibuka di panel Agent Workspace!`
                : `📂 File **${detailData.file.name}** successfully loaded into the Agent Workspace!`);
              setIsAgentExecuting(false);
            }, 800);
          } else {
            throw new Error('Gagal memuat detail berkas');
          }
        } else {
          setAgentLogs(prev => [...prev, `❌ Berkas "${args}" tidak ditemukan.`]);
          addBotMessage(userLanguage === 'id'
            ? `❌ Berkas dengan nama atau pola **"${args}"** tidak ditemukan di workspace cloud. Gunakan perintah \`/files\` untuk melihat daftar berkas.`
            : `❌ File matching **"${args}"** was not found. Use \`/files\` to list files.`);
          setIsAgentExecuting(false);
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Kesalahan: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }

    if (command === '/buatfile') {
      if (!args) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Harap sertakan nama file dan deskripsi/topik. Contoh: `/buatfile Rencana_Bisnis.docx membuat rencana bisnis startup`'
          : '❌ Please specify file name and description. Example: `/buatfile Business_Plan.docx startup plans`');
        return;
      }
      
      const spaceIdx = args.indexOf(' ');
      const filename = spaceIdx > 0 ? args.substring(0, spaceIdx) : args;
      const topic = spaceIdx > 0 ? args.substring(spaceIdx + 1) : (userLanguage === 'id' ? 'Dokumen kosong' : 'Empty document');
      
      let fileType = 'docx';
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.toLowerCase().includes('excel') || filename.toLowerCase().includes('sheet')) {
        fileType = 'excel';
      } else if (filename.endsWith('.pptx') || filename.endsWith('.ppt') || filename.toLowerCase().includes('slide') || filename.toLowerCase().includes('presentasi')) {
        fileType = 'pptx';
      }
      
      const finalFilename = filename.includes('.') ? filename : `${filename}.${fileType}`;
      
      setIsAgentExecuting(true);
      setAgentLogs([
        `⚙️ Menentukan parameter untuk berkas "${finalFilename}"...`,
        `🧠 Mengirim instruksi ke Deepernova AI Agent untuk draf awal tentang "${topic}"...`
      ]);
      
      try {
        const prompt = `Buat draf isi dokumen awal tentang "${topic}" untuk jenis dokumen "${fileType}". Format output harus sesuai tipe dokumen:
        - Jika "docx": Tulis konten HTML bersih (tag h1, h2, p, ul, li) dibungkus tag [CONTENT_START] dan [CONTENT_END].
        - Jika "pptx": Tulis JSON array slide [{ "id": 1, "type": "slide", "title": "...", "content": "..." }] dibungkus tag [CONTENT_START] dan [CONTENT_END].
        - Jika "excel": Tulis JSON array 2D [[ "Header1", "Header2" ], [ "Row1Col1", "Row1Col2" ]] dibungkus tag [CONTENT_START] dan [CONTENT_END].`;
        
        const deepseekKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEEPSEEK_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TOKENMIX_API_KEY) || 'sk-62106eda06b7406f8cd13b9849cd19e5';
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-v4-flash-vision-exp',
            messages: [{ role: 'user', content: prompt }],
            thinking: { type: 'enabled' },
            reasoning_effort: 'high'
          })
        });
        
        const resData = await response.json();
        const aiResponseText = resData.choices?.[0]?.message?.content || '';
        
        setAgentLogs(prev => [...prev, `📝 Menerima draf konten dari AI. Memproses parsing data...`]);
        
        const contentMatch = aiResponseText.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
        let parsedContent = null;
        const rawContent = contentMatch ? contentMatch[1].trim() : aiResponseText.trim();
        
        if (fileType === 'docx') {
          parsedContent = [{ id: Date.now(), type: 'html', text: rawContent }];
        } else if (fileType === 'pptx') {
          try {
            parsedContent = JSON.parse(rawContent);
          } catch {
            parsedContent = [
              { id: 1, type: 'slide', title: 'Judul Presentasi', content: topic, notes: '' },
              { id: 2, type: 'slide', title: 'Pendahuluan', content: 'Draf otomatis presentasi', notes: '' }
            ];
          }
        } else if (fileType === 'excel') {
          try {
            const rawTable = JSON.parse(rawContent);
            parsedContent = {
              excelSheets: [{ name: 'Sheet1', data: rawTable }],
              activeSheet: 0
            };
          } catch {
            parsedContent = {
              excelSheets: [{ name: 'Sheet1', data: [['Kolom 1', 'Kolom 2'], ['Data 1', 'Data 2']] }],
              activeSheet: 0
            };
          }
        }
        
        setAgentLogs(prev => [...prev, `💾 Menyimpan berkas ke database cloud...`]);
        
        const saveRes = await fetch('/api/cloud/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: null,
            parentId: null,
            name: finalFilename,
            type: fileType,
            content: parsedContent
          })
        });
        const saveResult = await saveRes.json();
        
        if (saveResult.success && saveResult.file) {
          setAgentLogs(prev => [...prev, `✅ Berkas "${finalFilename}" berhasil dibuat!`]);
          setActiveFile(saveResult.file);
          setAiMode('agent');
          fetchWorkspaceFiles();
          
          setTimeout(() => {
            addBotMessage(userLanguage === 'id'
              ? `✨ Berkas baru **${finalFilename}** berhasil dibuat tentang topik *"${topic}"*. Berkas sekarang aktif di Workspace Agent.`
              : `✨ New file **${finalFilename}** successfully created about *"${topic}"*. The file is now active in the Agent Workspace.`);
            setIsAgentExecuting(false);
          }, 800);
        } else {
          throw new Error(saveResult.error || 'Database save failed');
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Kegagalan pembuatan berkas: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }

    if (command === '/perbaiki') {
      if (!activeFile) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Tidak ada berkas aktif saat ini. Buka berkas terlebih dahulu menggunakan `/editfile [nama]` atau buat berkas baru dengan `/buatfile [nama]`.'
          : '❌ No active file loaded. Open a file first using `/editfile [name]` or create a new one with `/buatfile [name]`.');
        return;
      }
      if (!args) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Harap berikan instruksi perbaikan. Contoh: `/perbaiki tambahkan paragraf baru tentang kesimpulan`'
          : '❌ Please specify editing instructions. Example: `/perbaiki add a new paragraph about conclusions`');
        return;
      }
      
      setIsAgentExecuting(true);
      setAgentLogs([
        `⚙️ Membaca konten berkas "${activeFile.name}"...`,
        `🧠 Mengirim konten dan instruksi perbaikan ke Deepernova AI Agent...`
      ]);
      
      try {
        const fileContentString = JSON.stringify(activeFile.content);
        const prompt = `Kamu adalah Deepernova AI Agent. Tugasmu adalah memodifikasi konten dokumen berikut sesuai dengan instruksi pengguna.
        
Konten dokumen saat ini:
${fileContentString}

Tipe dokumen: ${activeFile.type}
Instruksi perbaikan: "${args}"

TOLONG kembalikan konten dokumen yang sudah dimodifikasi secara utuh, menggunakan struktur JSON yang sama persis seperti aslinya.
- Jika tipenya docx: Formatnya harus tetap array of html block [{ "id": 1, "type": "html", "text": "HTML_BARU" }]. Harap perbaiki kode HTML-nya langsung.
- Jika tipenya pptx: Formatnya harus tetap array of slide [{ "id": 1, "type": "slide", "title": "Judul Baru", "content": "Konten Baru" }].
- Jika tipenya excel: Formatnya harus tetap object { excelSheets: [...], activeSheet: 0 }.

Bungkus hasil modifikasi final Anda di dalam tag [CONTENT_START] dan [CONTENT_END]. Jangan menambahkan teks penjelasan di luar tag tersebut.`;

        const deepseekKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEEPSEEK_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TOKENMIX_API_KEY) || 'sk-62106eda06b7406f8cd13b9849cd19e5';
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-v4-flash-vision-exp',
            messages: [{ role: 'user', content: prompt }],
            thinking: { type: 'enabled' },
            reasoning_effort: 'high'
          })
        });
        
        const resData = await response.json();
        const aiResponseText = resData.choices?.[0]?.message?.content || '';
        
        setAgentLogs(prev => [...prev, `📝 Menerima hasil pembaruan dari AI. Memproses parsing data...`]);
        
        const contentMatch = aiResponseText.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
        const rawContent = contentMatch ? contentMatch[1].trim() : aiResponseText.trim();
        
        let updatedContent = JSON.parse(rawContent);
        
        setAgentLogs(prev => [...prev, `💾 Menyimpan perubahan berkas ke database cloud...`]);
        
        const saveRes = await fetch('/api/cloud/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeFile.id,
            parentId: activeFile.parentId,
            name: activeFile.name,
            type: activeFile.type,
            content: updatedContent
          })
        });
        const saveResult = await saveRes.json();
        
        if (saveResult.success && saveResult.file) {
          setAgentLogs(prev => [...prev, `✅ Perubahan berhasil disimpan!`]);
          setActiveFile(saveResult.file);
          fetchWorkspaceFiles();
          
          setTimeout(() => {
            addBotMessage(userLanguage === 'id'
              ? `✍️ Berkas **${activeFile.name}** berhasil dimodifikasi sesuai instruksi: *"${args}"*.`
              : `✍️ File **${activeFile.name}** successfully modified with instructions: *"${args}"*.`);
            setIsAgentExecuting(false);
          }, 800);
        } else {
          throw new Error(saveResult.error || 'Save failed');
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Kegagalan memodifikasi berkas: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }
  };

  useEffect(() => {
    if (aiMode === 'agent') {
      fetchWorkspaceFiles();
    }
  }, [aiMode]);

  useEffect(() => {
    if (inputValue.startsWith('/')) {
      const parts = inputValue.split(' ');
      if (parts.length === 1) {
        setShowSlashMenu(true);
        setSlashSelectedIndex(0);
      } else {
        setShowSlashMenu(false);
      }
    } else {
      setShowSlashMenu(false);
    }
  }, [inputValue]);

  // Pre-fetch files on mount
  useEffect(() => {
    fetchWorkspaceFiles();
  }, []);

  // Detect scroll position untuk show/hide scroll to bottom button
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    
    if (!messagesContainer) return; // Early return jika container belum ready
    
    const handleScroll = () => {
      try {
        // If the scroll was triggered programmatically, don't treat it as a user interaction
        if (programmaticScrollRef.current) return;

        const isAtBottom = 
          messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
        setIsScrolledUp(!isAtBottom);
        // Toggle compact view: when at bottom keep compact, when user scrolls up show full history
        setCompactView(isAtBottom);

        // If the user manually scrolls, allow auto-scrolls again and remove the prefill spacer
        if (holdScrollRef.current) {
          holdScrollRef.current = false;
        }
        try {
          messagesContainer.classList.remove('prefill-space');
        } catch (_e) {
          // ignore
        }
      } catch (_err) {
        console.log('Scroll handler error:', _err);
      }
    };

    const handleWheel = (_e) => {
      try {
        // If user scrolls up while in compact view, expand to full history
        if (compactView && _e.deltaY < 0) {
          setCompactView(false);
          // Don't force scroll position - let user stay where they scrolled to
        }
      } catch (_err) {
        // ignore
      }
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    messagesContainer.addEventListener('wheel', handleWheel, { passive: true });
    
    // Triple-click to jump to bottom
    const handleTripleClick = () => {
      scrollToBottom(true);
    };
    messagesContainer.addEventListener('triple-click', handleTripleClick);
    
    // Custom triple-click detection using click events (more reliable than mousedown)
    let clickCount = 0;
    let clickTimer = null;
    const handleClick = (e) => {
      clickCount++;
      
      if (clickCount === 1) {
        // Start timer for triple-click window
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 300);
      }
      
      if (clickCount === 3) {
        e.preventDefault();
        clearTimeout(clickTimer);
        clickCount = 0;
        scrollToBottom(true);
      }
    };
    messagesContainer.addEventListener('click', handleClick);
    
    return () => {
      try {
        messagesContainer.removeEventListener('scroll', handleScroll);
        messagesContainer.removeEventListener('wheel', handleWheel);
        messagesContainer.removeEventListener('triple-click', handleTripleClick);
      } catch (_err) {
        console.log('Remove scroll listener error:', _err);
      }
    };
  }, []);



  // Helper: Set loading state for current conversation
  const setConvLoading = (isLoadingNow) => {
    setLoading(isLoadingNow); // Keep global loading for overall UI
    if (!isLoadingNow) {
      setLoadingPhase(null);
      clearLoadingPhaseTimers();
      // ALWAYS clear message streaming/generating flags when stopping/finished
      setMessages((prev) =>
        prev.map((msg) =>
          (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating || msg.isReasoning)
            ? {
                ...msg,
                isStreaming: false,
                isThinking: false,
                isSearching: false,
                isRecallingMemory: false,
                isImageGenerating: false,
                isReasoning: false
              }
            : msg
        )
      );
      // ALWAYS clear isLoading on all conversations when loading finishes
      setConversations((prev) =>
        prev.map((c) => (c.isLoading ? { ...c, isLoading: false } : c))
      );
    } else if (currentConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId 
            ? { ...c, isLoading: true }
            : c
        )
      );
    }
  };

  // Helper: Derived active generating state - single source of truth from messages & generation flags
  const isBotResponding = (loading || isGenerating) && messages.some(
    (msg) => msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating)
  );

  // Helper: Get loading state for current conversation (must strictly be false when no bot message is active or loading is false)
  const getConvLoading = () => {
    return (loading || isGenerating) && messages.some(
      (msg) => msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating)
    );
  };



  const startPrivateChat = () => {
    setShowPrivateModal(false);
    const newId = `private_${Date.now()}`;
    const _newConv = {
      id: newId,
      title: '🔒 Private Chat',
      messages: [],
      isLoading: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: true,
    };
    // Add to state only, not to saved conversations
    setCurrentConversationId(newId);
    setMessages([]);
    setIsPrivateChat(true);
    setError(null);
    setCompactView(true);
  };

  // Switch conversation
  const switchConversation = (convId) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      // Count images being loaded
      const imageCount = conv.messages.reduce((sum, msg) => sum + (msg.images?.length || 0), 0);
      console.log(`[ChatBot] Switching to conversation "${conv.title}" (${conv.messages.length} messages, ${imageCount} images)`);
      
      setCurrentConversationId(convId);
      setMessages(conv.messages || []);
      setError(null);
      setCompactView(true);
      rememberConversationId(convId);
      
      // Auto-scroll to bottom when opening/switching to a room
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  };

  const handleSearchResultClick = (conversationId, messageId) => {
    switchConversation(conversationId);
    setCompactView(false);
    setSidebarOpen(false);
    
    setTimeout(() => {
      const element = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('search-message-highlight');
        setTimeout(() => {
          element.classList.remove('search-message-highlight');
        }, 3000);
      }
    }, 400);
  };

  // Delete conversation
  const deleteConversation = async (convId) => {
    // Show confirmation dialog first
    setDeleteConfirmConvId(convId);
    setShowDeleteConfirm(true);
  };

  // Confirm and execute deletion
  const confirmDeleteConversation = async (convId) => {
    const apiBaseUrl = API_BASE_URL;

    // Show loading state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, isDeleting: true, isLoading: true } : c
      )
    );

    if (isAuthenticated && !isGuest) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/conversations/${convId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('Failed to delete conversation from backend:', response.status);
          setCustomAlert({
            type: 'error',
            message: 'Failed to delete session. Please try again.'
          });
          // Reset loading state on failure
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId ? { ...c, isDeleting: false, isLoading: false } : c
            )
          );
          setShowDeleteConfirm(false);
          setDeleteConfirmConvId(null);
          return;
        }
      } catch (err) {
        console.error('Error deleting conversation from backend:', err);
        setCustomAlert({
          type: 'error',
          message: 'Error deleting session: ' + err.message
        });
        // Reset loading state on error
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, isDeleting: false, isLoading: false } : c
          )
        );
        setShowDeleteConfirm(false);
        setDeleteConfirmConvId(null);
        return;
      }
    }

    // Remove from conversations list
    const remaining = conversations.filter((c) => c.id !== convId);
    setConversations(remaining);

    // Show success feedback
    setCustomAlert({
      type: 'success',
      message: 'Session deleted successfully'
    });

    // Switch to another conversation if current one was deleted
    if (currentConversationId === convId) {
      if (remaining.length > 0) {
        switchConversation(remaining[0].id);
      } else {
        createNewConversation();
      }
    }

    // Close confirmation modal
    setShowDeleteConfirm(false);
    setDeleteConfirmConvId(null);
  };

  // Handle file upload and parsing directly on client-side (supports PDF, DOCX, XLSX, XLS, PPTX, CSV, JSON, TXT, Code, etc.)
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parseResult = await ClientFileParser.parseFile(file);
        const content = parseResult.content;
        const sizeKB = parseResult.meta.sizeKB;
        const tokenEstimate = parseResult.meta.tokenEstimate;

        // Store in memory
        memoryService.addMemory(
          {
            content: content,
            type: 'file_content',
            weight: 2
          },
          currentConversationId,
          userLanguage
        );

        // Add to uploaded files list
        const newFile = {
          id: `file_${Date.now()}_${i}`,
          name: file.name,
          size: sizeKB,
          tokens: tokenEstimate,
          content: content,
          fileType: parseResult.fileType
        };

        setUploadedFiles(prev => [...prev, newFile]);

        showAlert(
          userLanguage === 'id'
            ? `✅ "${file.name}" dibaca (${sizeKB}KB · ~${tokenEstimate} token)`
            : `✅ "${file.name}" read (${sizeKB}KB · ~${tokenEstimate} tokens)`,
          'success',
          3000
        );
      } catch (error) {
        console.error('Frontend file upload parse error:', error);
        showAlert(`❌ ${error?.message || 'Gagal membaca file'}`, 'error', 3500);
      }
    }

    if (e.target) {
      e.target.value = '';
    }
    if (window.fileUploadInput) {
      window.fileUploadInput.value = '';
    }
  };

  // Remove file from uploaded list
  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Clear all uploaded files and images
  const clearAllAttachments = () => {
    setUploadedFiles([]);
    setUploadedImages([]);
  };

  const uploadImageToServer = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const uploadUrl = `${apiBaseUrl}/api/vision/upload`;
    console.log('[ChatBot] Upload image to server:', uploadUrl, file.name, file.type, file.size);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('[ChatBot] Image upload response error:', response.status, errorData);
      throw new Error(errorData?.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  };

  // Handle image upload from file input or camera file object
  const handleImageUpload = async (e) => {
    const rawFiles = e?.target?.files || e?.files || (e instanceof File ? [e] : []);
    const files = Array.from(rawFiles);
    if (!files.length) return;

    for (const file of files) {
      try {
        // Validate image type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validImageTypes.includes(file.type)) {
          alert(userLanguage === 'id' 
            ? '❌ Format gambar tidak didukung. Gunakan: JPG, PNG, WebP, GIF'
            : '❌ Image format not supported. Use: JPG, PNG, WebP, GIF');
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(userLanguage === 'id' 
            ? '❌ Gambar terlalu besar (max 10MB)'
            : '❌ Image too large (max 10MB)');
          continue;
        }

        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const rawBase64 = evt.target.result;

          // Compress image to max 768x768 JPEG (80% quality) to avoid huge base64 payloads
          const compressImage = (dataUrl) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const MAX = 768;
              let { width, height } = img;
              if (width > MAX || height > MAX) {
                if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
                else { width = Math.round((width * MAX) / height); height = MAX; }
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              canvas.getContext('2d').drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(dataUrl); // fallback original
            img.src = dataUrl;
          });

          const base64Data = await compressImage(rawBase64);
          console.log(`[ChatBot] Image compressed: ${Math.round(rawBase64.length/1024)}KB -> ${Math.round(base64Data.length/1024)}KB`);

          const newImage = {
            id: imageId,
            fileName: file.name,
            dataUrl: base64Data,
            publicUrl: null,
            status: 'uploading',
            analysis: null,
            error: null,
            followUpRemaining: 20,
          };

          setUploadedImages(prev => [...prev, newImage]);
          setAttachmentQueueMinimized(false);

          let gotPublicUrl = false;
          try {
            const uploadResult = await uploadImageToServer(file);
            setUploadedImages(prev => prev.map(img => 
              img.id === imageId
                ? { ...img, publicUrl: uploadResult.url, status: 'analyzed' }
                : img
            ));
            gotPublicUrl = true;
          } catch (uploadError) {
            console.log('[ChatBot] Server upload offline — using compressed base64 dataUrl for vision:', uploadError.message);
            setUploadedImages(prev => prev.map(img => 
              img.id === imageId
                ? { ...img, status: 'analyzed', isLocal: true }
                : img
            ));
          }

          // Auto-save uploaded image to "Gambar Saya" (works for both local mode and logged-in mode)
          saveImageToGallery({
            id: imageId,
            prompt: `Unggahan: ${file.name}`,
            imageUrl: gotPublicUrl ? uploadResult.url : base64Data,
            type: 'uploaded',
            model: 'user-upload'
          }, isAuthenticated, user).catch(e => console.warn('[ChatBot] Auto-save uploaded image error:', e));

          setCustomAlert({
            type: 'success',
            message: userLanguage === 'id' 
              ? `📸 Gambar "${file.name}" siap${gotPublicUrl ? '' : ' (Mode Lokal)'}`
              : `📸 Image "${file.name}" ready${gotPublicUrl ? '' : ' (Local Mode)'}`,
            duration: 2000
          });
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[ChatBot] Image upload error:', error);
        setCustomAlert({
          type: 'error',
          message: userLanguage === 'id' ? '❌ Error upload gambar' : '❌ Image upload error',
          duration: 3000
        });
      }
    }

    if (window.imageUploadInput) window.imageUploadInput.value = '';
    if (window.cameraCaptureInput) window.cameraCaptureInput.value = '';
  };

  // Remove uploaded image
  const removeUploadedImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };



  // Save/load uploaded images from localStorage safely
  useEffect(() => {
    if (!currentConversationId) return;
    
    // Save to localStorage safely without crashing UI
    const storageKey = `deepernova_images_${currentConversationId}`;
    if (uploadedImages.length > 0) {
      try {
        const lightImages = uploadedImages.map(img => {
          const { dataUrl, ...rest } = img;
          return {
            ...rest,
            dataUrl: (dataUrl && dataUrl.length < 2000000) ? dataUrl : null
          };
        });
        localStorage.setItem(storageKey, JSON.stringify(lightImages));
      } catch (err) {
        console.warn('[ChatBot] Prevented QuotaExceededError crash saving uploadedImages:', err.message);
      }
    } else {
      try {
        localStorage.removeItem(storageKey);
      } catch (_e) {}
    }
  }, [uploadedImages, currentConversationId]);

  useEffect(() => {
    if (!currentConversationId) return;

    const activeKey = `deepernova_active_images_${currentConversationId}`;
    if (activeImageFollowUps.length > 0) {
      try {
        localStorage.setItem(activeKey, JSON.stringify(activeImageFollowUps));
      } catch (err) {
        console.warn('[ChatBot] Prevented QuotaExceededError crash saving active followups:', err.message);
      }
    } else {
      try {
        localStorage.removeItem(activeKey);
      } catch (_e) {}
    }
  }, [activeImageFollowUps, currentConversationId]);

  // Load uploaded images from localStorage when conversation changes
  useEffect(() => {
    if (!currentConversationId) return;
    
    // Always clear ref-based image state when conversation changes to prevent cross-session leaks
    capturedRefImagesRef.current = [];

    const storageKey = `deepernova_images_${currentConversationId}`;
    const savedImages = localStorage.getItem(storageKey);
    if (savedImages) {
      try {
        const parsedImages = JSON.parse(savedImages);
        setUploadedImages(parsedImages);
      } catch (error) {
        console.error('[ChatBot] Error loading saved images:', error);
      }
    } else {
      setUploadedImages([]);
    }

    const activeKey = `deepernova_active_images_${currentConversationId}`;
    const savedActive = localStorage.getItem(activeKey);
    if (savedActive) {
      try {
        const parsedActive = JSON.parse(savedActive);
        setActiveImageFollowUps(Array.isArray(parsedActive) ? parsedActive : []);
      } catch (error) {
        console.error('[ChatBot] Error loading active image follow-ups:', error);
        setActiveImageFollowUps([]);
      }
    } else {
      setActiveImageFollowUps([]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (uploadedFiles.length + uploadedImages.length > 0) {
      setAttachmentQueueMinimized(false);
    }
  }, [uploadedFiles.length, uploadedImages.length, currentConversationId]);

  // Handle customAlert auto-dismiss with fade-out animation
  const [dismissingAlert, setDismissingAlert] = useState(false);
  const alertTimeoutRef = useRef(null);

  const humanizeClientError = (errStr) => {
    if (!errStr) return "Terjadi kendala koneksi pada server AI. Silakan coba sesaat lagi.";
    const str = String(errStr).toLowerCase();
    
    if (str.includes("invalid api key") || str.includes("401") || str.includes("unauthorized")) {
      return "Akses kunci server AI sedang diperbarui oleh sistem. Silakan coba kembali beberapa saat lagi.";
    }
    if (str.includes("rate limit") || str.includes("429") || str.includes("too many requests")) {
      return "Server AI sedang menerima terlalu banyak lalu lintas. Silakan tunggu beberapa detik dan coba lagi.";
    }
    if (str.includes("timeout") || str.includes("took too long") || str.includes("deadline")) {
      return "Koneksi ke server AI terputus karena batas waktu respons terlampaui. Silakan coba kirim kembali pesan Anda.";
    }
    if (str.includes("quota") || str.includes("insufficient balance") || str.includes("billing")) {
      return "Batas penggunaan server AI saat ini telah habis. Silakan hubungi administrator.";
    }
    if (str.includes("key index") || str.includes("status 401") || str.includes("tokenmix") || str.includes("failed with status")) {
      return "Akses kunci server AI sedang diperbarui. Silakan coba sesaat lagi.";
    }
    return errStr;
  };

  // Helper to show error banner only when there are no background agent tasks running
  const showErrorBanner = (msg) => {
    if (backgroundAgentCountRef.current > 0 || isProcessingRef.current) {
      console.log('[ChatBot] Suppressed error banner because backend still processing:', msg);
      return;
    }
    setError(humanizeClientError(msg));
  };

  useEffect(() => {
    if (!customAlert || customAlert.duration === 0) return;

    // Clear any existing timeout
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);

    // Trigger fade-out after duration - allow 400ms for animation
    const dismissDelay = Math.max(customAlert.duration - 400, 0);
    alertTimeoutRef.current = setTimeout(() => {
      setDismissingAlert(true);
      // Clear after animation completes
      setTimeout(() => {
        setCustomAlert(null);
        setDismissingAlert(false);
      }, 400);
    }, dismissDelay);

    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [customAlert]);

  const openHtmlEditor = (text) => {
    // Try to extract code blocks first (fenced code)
    const codeMatch = text.match(/```[\s\S]*?```/);
    if (codeMatch) {
      const codeContent = codeMatch[0]
        .replace(/^```\w*\n?/, '') // Remove opening fence and language
        .replace(/```$/, '');       // Remove closing fence
      setHtmlContent(codeContent);
      setHtmlFilename(`code-${Date.now()}.txt`);
      setShowHtmlEditor(true);
      return;
    }
    
    // Try to extract HTML from message
    const htmlMatch = text.match(/<html[^>]*>[\s\S]*<\/html>/i) || 
                     text.match(/<body[^>]*>[\s\S]*<\/body>/i) ||
                     text.match(/<div[^>]*>[\s\S]*<\/div>/i) ||
                     text.match(/<!DOCTYPE[^>]*>[\s\S]*<\/html>/i);
    
    if (htmlMatch) {
      setHtmlContent(htmlMatch[0]);
      setHtmlFilename(`page-${Date.now()}.html`);
      setShowHtmlEditor(true);
    } else {
      alert(userLanguage === 'id' 
        ? '❌ Tidak ada code/HTML ditemukan dalam pesan ini' 
        : '❌ No code/HTML found in this message');
    }
  };

  // Download code/HTML file
  const _downloadHtmlFile = () => {
    if (!htmlContent.trim()) {
      alert(userLanguage === 'id' ? 'Code kosong' : 'Code is empty');
      return;
    }

    try {
      // Determine MIME type based on filename or content
      let mimeType = 'text/plain';
      if (htmlFilename.endsWith('.html') || htmlFilename.endsWith('.htm')) {
        mimeType = 'text/html';
      } else if (htmlFilename.endsWith('.js')) {
        mimeType = 'application/javascript';
      } else if (htmlFilename.endsWith('.json')) {
        mimeType = 'application/json';
      } else if (htmlFilename.endsWith('.css')) {
        mimeType = 'text/css';
      }
      
      const blob = new Blob([htmlContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = htmlFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(userLanguage === 'id' 
        ? `✅ File diunduh: ${htmlFilename}` 
        : `✅ File downloaded: ${htmlFilename}`);
      setShowHtmlEditor(false);
    } catch (error) {
      alert(`❌ ${error.message}`);
    }
  };

  // Update conversation title based on first message (only if not manually named)
  const _updateConversationTitle = (convId, newMessages) => {
    // Skip if conversation was already manually named
    if (manuallyNamedConversationsRef.current.has(convId)) {
      return;
    }
    
    if (newMessages.length > 0 && newMessages[0].sender === 'user') {
      const firstUserMsg = newMessages[0].text;
      const title = firstUserMsg.split('\n')[0].substring(0, 50);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, title: title || 'Chat', updatedAt: new Date().toISOString() }
            : c
        )
      );
    }
  };

  // Generate chat title using AI for all users (MAX ONCE per session to save tokens)
  const generateChatTitle = async (convId) => {
    if (!convId) return;

    // Skip if already manually named or AI title already generated for this session
    if (manuallyNamedConversationsRef.current.has(convId) || aiTitledConversationsRef.current.has(convId)) {
      return;
    }

    // Immediately flag session so we never re-trigger API call
    aiTitledConversationsRef.current.add(convId);

    const targetConv = conversations.find((c) => c.id === convId);
    const convMessages = targetConv?.messages || [];
    if (convMessages.length < 2) return; // Need at least 1 exchange

    // Instant local fallback title
    const userMsg = convMessages.find((m) => m.sender === 'user');
    const fallbackTitle = userMsg ? userMsg.text.split('\n')[0].substring(0, 45).trim() : 'Chat Baru';

    // If session already has a custom title, keep it
    if (targetConv?.title && targetConv.title !== 'Chat Baru' && targetConv.title !== 'New Chat' && targetConv.title !== 'Chat' && targetConv.title !== 'Percakapan AI') {
      return;
    }

    try {
      const contextMessages = convMessages.slice(-4).map((m) => {
        const prefix = m.sender === 'user' ? 'User' : 'AI';
        return `${prefix}: ${m.text.substring(0, 70)}`;
      }).join('\n');

      const titlePrompt = userLanguage === 'en'
        ? `Generate a SHORT (2-4 words max) memorable chat title in English for this conversation:\n\n${contextMessages}\n\nRespond ONLY with the title, nothing else. No quotes, no explanation.`
        : `Generate a SHORT (2-4 words max) memorable chat title in Indonesian for this conversation:\n\n${contextMessages}\n\nRespond ONLY with the title, nothing else. No quotes, no explanation.`;

      const apiBaseUrl = API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepernova-2.3-pro',
          messages: [{ role: 'user', content: titlePrompt }],
          temperature: 0.3,
          max_tokens: 15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let generatedTitle = data.choices?.[0]?.message?.content?.trim() || '';
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
        if (!generatedTitle) generatedTitle = fallbackTitle;

        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: generatedTitle, updatedAt: new Date().toISOString() } : c))
        );
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: fallbackTitle, updatedAt: new Date().toISOString() } : c))
        );
      }
    } catch (error) {
      console.error('Failed to generate chat title:', error);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: fallbackTitle, updatedAt: new Date().toISOString() } : c))
      );
    }
  };

  // Check if message is long (>10 chars AND >1 line)
  const _isLongMessage = (text) => {
    if (!text) return false;
    return text.length > 10 && text.split('\n').length > 1;
  };

  // Toggle message expand/collapse
  const _toggleExpandMessage = (messageId) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  // Create a placeholder bot message immediately so the response feels faster
  const createBotPlaceholder = () => {
    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const placeholderMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
      isPlaceholder: true,
    };
    setMessages((prev) => [...prev, placeholderMessage]);
    setAnimatingMessages((prev) => ({ ...prev, [placeholderId]: true }));
    setIsScrolledUp(false);
    return placeholderId;
  };

  // Add AI message dengan animasi streaming
  const _addStreamingMessage = (text, existingMessageId = null) => {
    const messageId = existingMessageId || Date.now() + 1;
    const emptyMessage = {
      id: messageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };

    if (!existingMessageId) {
      setMessages((prev) => [...prev, emptyMessage]);
    } else {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, ...emptyMessage } : msg
        )
      );
    }

    setAnimatingMessages((prev) => ({ ...prev, [messageId]: true }));
    setIsScrolledUp(false); // Hide scroll button
    
    // Don't scroll saat AI mulai menjawab - biarkan user scroll manual
    // Scroll hanya terjadi di finishStreaming setelah text selesai
    
    // Store references untuk stop
    currentMessageIdRef.current = messageId;
    currentTextRef.current = text;
    charIndexRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);

    // Function untuk update text secara increment - multiple chars per tick
    const updateStreamingText = () => {
      if (charIndexRef.current <= text.length) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, text: text.substring(0, charIndexRef.current) }
              : msg
          )
        );
        charIndexRef.current += 3; // Show fewer chars per tick - slower
      } else {
        // Selesai streaming
        finishStreaming(messageId);
      }
    };

    const interval = setInterval(updateStreamingText, 80); // Slower interval
    streamingIntervalRef.current = interval;
  };

  // Handle long-press on message to show edit button (user messages only)
  const handleMessageLongPress = (messageId, messageText, isSenderUser) => {
    if (!isSenderUser) return; // Only allow editing user messages
    
    setEditingMessageId(messageId);
    setEditingMessageText(messageText);
  };

  // Clear long-press timeout on mouse up
  const handleMessageMouseUp = () => {
    if (editLongPressTimeoutRef.current) {
      clearTimeout(editLongPressTimeoutRef.current);
      editLongPressTimeoutRef.current = null;
    }
  };

  // Start long-press timer on mouse down
  const handleMessageMouseDown = (messageId, messageText, isSenderUser) => {
    if (!isSenderUser) return;
    
    editLongPressTimeoutRef.current = setTimeout(() => {
      handleMessageLongPress(messageId, messageText, isSenderUser);
    }, 500); // 500ms for long press
  };

  // Handle edit and resend
  const handleEditAndResend = async () => {
    if (!editingMessageId || !editingMessageText.trim()) {
      setEditingMessageId(null);
      setEditingMessageText('');
      return;
    }

    // Find the index of the edited message
    const editIndex = messages.findIndex(m => m.id === editingMessageId);
    if (editIndex === -1) {
      setEditingMessageId(null);
      setEditingMessageText('');
      return;
    }

    // Truncate messages to BEFORE the edited one (delete original + all after)
    const truncatedMessages = messages.slice(0, editIndex);
    
    // Update messages state - remove old message and its AI response
    setMessages(truncatedMessages);
    
    // Clear edit state
    setEditingMessageId(null);
    setEditingMessageText('');
    
    // Immediately send the edited message as new message
    const newUserMessage = {
      id: Date.now(),
      text: editingMessageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    // Add to messages
    setMessages((_prev) => [...truncatedMessages, newUserMessage]);
    setCompactView(true);
    
    // Store for stop-restore
    lastSentPromptRef.current = editingMessageText;
    lastSentUserMessageIdRef.current = newUserMessage.id;
    
    // Create AI placeholder
    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const botMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setMessages((prev) => [...prev, botMessage]);
    currentMessageIdRef.current = placeholderId;
    
    // Start streaming
    streamingStartTimeRef.current = Date.now();
    
    // Trigger immediate save (don't wait for debounce)
    const saveNow = async () => {
      if (conversations.length > 0) {
        console.log(`[ChatBot] Immediate save triggered after message sent`);
        await ConversationPersistenceService.saveConversations(conversations, isAuthenticated, isGuest);
      }
    };
    setTimeout(() => saveNow(), 100); // Small delay to ensure messages state is updated
    
    try {
      setConvLoading(true);
      const response = await sendMessageToGrok(
        editingMessageText,
        [...truncatedMessages, newUserMessage],
        userLanguage,
        currentConversationId,
        selectedPersonality,
        new AbortController(),
        selectedModel,
        isAuthenticated,
        isGuest,
        userName || user?.name
      );

      let fullText = '';
      let displayedText = '';
      let streamFinished = false;
      currentStreamingTextRef.current = '';

      let streamUsage = null; // Will hold real API usage data

      const startTypingAnimation = () => {
        if (typingTimerRef.current) return;
        typingTimerRef.current = setInterval(() => {
          if (displayedText.length < fullText.length) {
            const diff = fullText.length - displayedText.length;
            const step = Math.max(1, Math.min(diff, Math.ceil(diff / 15)));
            displayedText += fullText.substr(displayedText.length, step);
            currentStreamingTextRef.current = displayedText;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === placeholderId
                  ? { ...msg, text: sanitizeStreamingText(displayedText), isStreaming: true, isThinking: false }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
            finishStreaming(placeholderId, fullText, streamUsage);
          }
        }, 40);
      };
      
      const streamResult = await processStreamingResponse(
        response,
        (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            fullText += textChunk;
            currentStreamingTextRef.current = fullText;
          }
        }
      );
      streamUsage = streamResult?.usage || null;

      streamFinished = true;
      startTypingAnimation();

      while (displayedText.length < fullText.length || typingTimerRef.current !== null) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      finishStreaming(placeholderId, fullText, streamUsage);
      
      setConvLoading(false);
      currentMessageIdRef.current = null;
    } catch (err) {
      console.error('Error sending edited message:', err);
      setConvLoading(false);
        showErrorBanner('Gagal mengirim pesan yang diedit');
    }
    
    // Scroll to bottom
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  // Handle message feedback (like/dislike)
  const handleMessageFeedback = async (messageId, feedbackType) => {
    try {
      // Update local state
      setMessageFeedback((prev) => ({
        ...prev,
        [messageId]: prev[messageId] === feedbackType ? null : feedbackType,
      }));

      // Save to database
      if (isAuthenticated) {
        const response = await fetch(`${apiBaseUrl}/api/message-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            conversationId: currentConversationId,
            feedbackType: messageFeedback[messageId] === feedbackType ? null : feedbackType,
            userId: user?.id,
          }),
        });
        if (!response.ok) console.error('Failed to save feedback');
      }
    } catch (err) {
      console.error('Error saving feedback:', err);
    }
  };

  // Handle copy message text
  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showAlert(userLanguage === 'id' ? 'Teks disalin!' : 'Text copied!', 'success', 2000);
    }).catch(() => {
      showAlert(userLanguage === 'id' ? 'Gagal menyalin' : 'Failed to copy', 'error', 2000);
    });
  };

  /**
   * Handle TTS play/stop for a message
   * Always available - no mute check needed
   */
  const handleTtsToggle = async (message) => {
    try {
      // If already playing this message, stop it
      if (playingMessageId === message.id) {
        tokenMixTtsService.stop();
        setPlayingMessageId(null);
        return;
      }

      // Stop any currently playing audio
      if (playingMessageId) {
        tokenMixTtsService.stop();
      }

      setTtsLoading(message.id);

      const textForSpeech = message.text.replace(/<\/?reasoning\b[^>]*>/gi, '').trim();

      if (!textForSpeech) {
        setTtsLoading(null);
        showAlert(
          userLanguage === 'id'
            ? 'Tidak ada teks utama untuk dibaca.'
            : 'No main text available to speak.',
          'warning',
          3000
        );
        return;
      }

      // Generate and play TTS on frontend for low latency
      const audioBlob = await tokenMixTtsService.textToSpeech(textForSpeech, 'alloy');
      
      setPlayingMessageId(message.id);
      setTtsLoading(null);

      tokenMixTtsService.play(audioBlob, () => {
        setPlayingMessageId(null);
      });
    } catch (error) {
      console.error('[ChatBot] TTS Error:', error);
      setTtsLoading(null);
      showAlert(
        userLanguage === 'id' 
          ? 'Gagal membaca: ' + error.message 
          : 'Failed to play audio: ' + error.message,
        'error',
        3000
      );
    }
  };

  // Handle stop streaming
  const handleStopStreaming = () => {
    isUserStoppedRef.current = true;

    // Clear any scheduled auto-retry timeouts immediately
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
    autoRetryCountRef.current = 0;
    partialMessageIdRef.current = null;

    // Abort every active stream controller so X always stops generation no matter what
    abortControllersMapRef.current.forEach((controller) => {
      try {
        controller.abort();
      } catch (err) {
        console.debug('Abort controller error:', err);
      }
    });
    abortControllersMapRef.current.clear();

    // Fallback for global ref (for backward compatibility)
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (err) {
        console.debug('Abort fallback error:', err);
      }
      abortControllerRef.current = null;
    }

    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    if (smoothStreamTimerRef.current) {
      clearInterval(smoothStreamTimerRef.current);
      smoothStreamTimerRef.current = null;
    }
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
      statusUpdateIntervalRef.current = null;
    }
    clearLoadingPhaseTimers();
    if (timeoutInternetCheckRef.current) {
      clearTimeout(timeoutInternetCheckRef.current);
      timeoutInternetCheckRef.current = null;
    }

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    // Immediately stop streaming flag on all active messages
    const targetMsgId = currentMessageIdRef.current;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating || (targetMsgId && msg.id === targetMsgId)
          ? {
              ...msg,
              isStreaming: false,
              isThinking: false,
              isReasoning: false,
              isReasoningComplete: true,
              isSearching: false,
              isRecallingMemory: false,
              isImageGenerating: false,
            }
          : msg
      )
    );
    if (targetMsgId) {
      setAnimatingMessages((prev) => ({ ...prev, [targetMsgId]: false }));
    }

    setLoadingStatusMsg('Generasi dihentikan');
    streamingStartTimeRef.current = null;
    isPausedRef.current = false;
    setIsPaused(false);
    
    // IMMEDIATELY clear ALL generation state — no flicker, no delay, no retries
    setConvLoading(false);
    setLoading(false);
    setLoadingPhase(null);
    isProcessingRef.current = false;
    currentMessageIdRef.current = null;
  };


  const parseQuizText = (text, messageId) => {
    if (!text) return null;

    const cleanLine = (line) =>
      line
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

    const normalized = text.replace(/\r/g, '').trim();
    const lines = normalized
      .split(/\n/)
      .map((line) => cleanLine(line))
      .filter(Boolean);

    const titleLineIndex = lines.findIndex((line) => /^(?:kuis|quiz)\s*[:,-]?/i.test(line));
    const questionRegex = /^(?:soal\s*)?(\d+)[).:-]?\s*(.+)$/i;
    const optionRegex = /^([A-Za-z])[).:;-]?\s*(.+)$/;

    let title = '';
    let quizLines = lines;
    let answerLines = [];

    if (titleLineIndex !== -1) {
      const titleLine = lines[titleLineIndex];
      title = titleLine.replace(/^(?:kuis|quiz)\s*[:,-]?\s*/i, '').trim();
      const answerStartIndex = lines.findIndex(
        (line, index) =>
          index > titleLineIndex && /^(?:kunci jawaban|jawaban|pembahasan|answer key)/i.test(line)
      );
      quizLines =
        answerStartIndex === -1
          ? lines.slice(titleLineIndex + 1)
          : lines.slice(titleLineIndex + 1, answerStartIndex);
      answerLines = answerStartIndex === -1 ? [] : lines.slice(answerStartIndex);
    } else {
      const questionCount = lines.filter((line) => questionRegex.test(line)).length;
      const optionCount = lines.filter((line) => optionRegex.test(line)).length;
      const answerStartIndex = lines.findIndex((line) => /^(?:kunci jawaban|jawaban|pembahasan|answer key)/i.test(line));
      const hasQuizHeader = titleLineIndex !== -1;
      const hasExplicitAnswerSection = answerStartIndex !== -1;

      // Only parse as quiz when the text has an explicit quiz header or answer section.
      if (!hasQuizHeader && !hasExplicitAnswerSection) return null;
      if (questionCount < 2 || optionCount < 1) return null;

      quizLines = answerStartIndex === -1 ? lines : lines.slice(0, answerStartIndex);
      answerLines = answerStartIndex === -1 ? [] : lines.slice(answerStartIndex);
    }

    const questions = [];
    let currentQuestion = null;

    for (const line of quizLines) {
      if (!line) continue;
      const optionMatch = line.match(optionRegex);
      const questionMatch = line.match(questionRegex);

      if (questionMatch && (!optionMatch || questionMatch[1] !== optionMatch[1])) {
        currentQuestion = {
          number: parseInt(questionMatch[1], 10),
          question: questionMatch[2].trim(),
          options: []
        };
        questions.push(currentQuestion);
      } else if (optionMatch && currentQuestion) {
        currentQuestion.options.push({
          label: optionMatch[1].toUpperCase(),
          text: optionMatch[2].trim()
        });
      } else if (currentQuestion) {
        currentQuestion.question += ' ' + line;
      }
    }

    if (questions.length === 0) return null;

    const answerKey = [];
    let currentAnswer = null;

    for (const line of answerLines) {
      if (!line) continue;
      const answerMatch = line.match(/^(?:soal\s*)?(\d+)[).:-]?\s*([A-Za-z])/i);
      const explanationMatch = line.match(/^([A-Za-z])[).:;-]?\s*(.+)$/);

      if (answerMatch) {
        currentAnswer = {
          number: parseInt(answerMatch[1], 10),
          answer: answerMatch[2].toUpperCase(),
          explanation: ''
        };
        answerKey.push(currentAnswer);
      } else if (explanationMatch && currentAnswer) {
        currentAnswer.explanation = explanationMatch[2].trim();
      }
    }

    const selectedAnswers = quizSelections[messageId] || {};
    const isSubmitted = quizSubmitted[messageId] || false;
    const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.number] !== undefined);

    // Calculate score
    let correctCount = 0;
    if (isSubmitted && answerKey.length > 0) {
      questions.forEach((q) => {
        const correctItem = answerKey.find((a) => a.number === q.number);
        if (correctItem && selectedAnswers[q.number] === correctItem.answer) {
          correctCount++;
        }
      });
    }
    const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return (
      <div className="quiz-card">
        {title ? <div className="quiz-title">📝 {title}</div> : <div className="quiz-title">📝 Kuis</div>}

        {questions.map((question) => {
          const selectedOption = selectedAnswers[question.number];
          const correctItem = answerKey.find((a) => a.number === question.number);
          const correctAnswer = correctItem ? correctItem.answer : null;
          // Limit to max 3 options (A, B, C)
          const limitedOptions = question.options.slice(0, 3);

          return (
            <div key={question.number} className="quiz-question-block">
              <div className="quiz-question">
                <span className="quiz-question-number">{question.number}.</span>
                <span>{question.question}</span>
              </div>
              {limitedOptions.length > 0 && (
                <div className="quiz-options">
                  {limitedOptions.map((option) => {
                    const isSelected = selectedOption === option.label;
                    let optionClass = 'quiz-option';
                    if (isSelected) optionClass += ' selected';
                    if (isSubmitted && correctAnswer) {
                      if (option.label === correctAnswer) {
                        optionClass += ' correct';
                      } else if (isSelected && option.label !== correctAnswer) {
                        optionClass += ' incorrect';
                      }
                    }
                    return (
                      <button
                        key={option.label}
                        type="button"
                        className={optionClass}
                        disabled={isSubmitted}
                        onClick={() => {
                          if (!messageId || isSubmitted) return;
                          setQuizSelections((prev) => ({
                            ...prev,
                            [messageId]: {
                              ...prev[messageId],
                              [question.number]: option.label
                            }
                          }));
                        }}
                      >
                        <span className="quiz-option-label">{option.label}.</span>
                        <span className="quiz-option-text">{option.text}</span>
                        {isSubmitted && option.label === correctAnswer && <span className="quiz-option-correct-icon">✅</span>}
                        {isSubmitted && isSelected && option.label !== correctAnswer && <span className="quiz-option-incorrect-icon">❌</span>}
                        {!isSubmitted && isSelected && <span className="quiz-option-selected">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit button - show when all questions answered but not yet submitted */}
        {!isSubmitted && allAnswered && answerKey.length > 0 && (
          <button
            type="button"
            className="quiz-submit-btn"
            onClick={() => {
              setQuizSubmitted((prev) => ({ ...prev, [messageId]: true }));
            }}
          >
            📊 Lihat Hasil
          </button>
        )}

        {/* Score card - show after submission */}
        {isSubmitted && answerKey.length > 0 && (
          <div className={`quiz-score ${scorePercent >= 70 ? 'good' : scorePercent >= 40 ? 'okay' : 'low'}`}>
            <div className="quiz-score-header">
              <span className="quiz-score-emoji">{scorePercent >= 70 ? '🎉' : scorePercent >= 40 ? '💪' : '📚'}</span>
              <span className="quiz-score-label">Skor Kamu</span>
            </div>
            <div className="quiz-score-value">{correctCount}/{questions.length}</div>
            <div className="quiz-score-percent">{scorePercent}%</div>
            <div className="quiz-score-message">
              {scorePercent >= 70 ? 'Hebat! Kamu menguasai materi ini! 🔥' : scorePercent >= 40 ? 'Lumayan! Terus belajar ya! 💪' : 'Jangan menyerah! Coba pelajari lagi ya! 📚'}
            </div>
          </div>
        )}

        {/* Answer key - only show after submission */}
        {isSubmitted && answerKey.length > 0 && (
          <div className="quiz-answer-key">
            <div className="quiz-answer-key-title">Kunci Jawaban</div>
            {answerKey.map((item) => (
              <div key={item.number} className="quiz-answer-item">
                <span className="quiz-answer-question">{item.number}.</span>
                <span className="quiz-answer-choice">{item.answer}</span>
                {item.explanation ? <div className="quiz-answer-explanation">{item.explanation}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Chart Detection and Parsing Functions
  const detectChartType = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('pie chart') || lowerText.includes('pie-chart') || (lowerText.includes('pie') && lowerText.includes('chart'))) return 'pie';
    if (lowerText.includes('bar chart') || lowerText.includes('bar-chart') || (lowerText.includes('bar') && lowerText.includes('chart'))) return 'bar';
    if (lowerText.includes('line chart') || lowerText.includes('line-chart') || (lowerText.includes('line') && lowerText.includes('chart'))) return 'line';
    if (lowerText.includes('radar') || lowerText.includes('radar chart')) return 'radar';
    if (lowerText.includes('infografis') || lowerText.includes('infographic') || lowerText.includes('info grafis')) return 'infographic';
    if (lowerText.includes('statistik') || lowerText.includes('grafik') || lowerText.includes('chart')) return 'pie'; // Default to pie
    return null;
  };

  const parseChartDataFromText = (text) => {
    const lines = text.split('\n');
    const data = [];
    
    // Try to parse lines with format: "label: value" or "label - value"
    for (const line of lines) {
      const match = line.match(/^[\s-•*]*(.*?)[\s:|-]+([\d.,]+)\s*(%)?/);
      if (match && match[1] && match[2]) {
        const label = match[1].trim();
        const value = parseInt(match[2].replace(/[.,]/g, ''));
        if (label && !isNaN(value)) {
          data.push({ name: label, value });
        }
      }
    }
    
    return data.length > 0 ? data : null;
  };

  const _extractChartBlock = (text) => {
    // Look for chart markers: ```chart or [chart] or **PIE CHART** etc
    const chartPatterns = [
      /\[CHART\]([\s\S]*?)\[\/CHART\]/gi,
      /```chart([\s\S]*?)```/gi,
      /\*\*(PIE CHART|BAR CHART|LINE CHART|RADAR|INFOGRAFIS)(.*?)\*\*([\s\S]*?)(?=\*\*|```|$)/gi,
    ];

    for (const pattern of chartPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return null;
  };

  const isExecutionLogLine = (line) => {
    if (!line) return false;
    const trimmed = line.trim();
    const patterns = [
      /^\[STEP \d+\/\d+\]/,
      /^📖 \[AGENT\]/,
      /^✅ \[AGENT\]/,
      /^⚠️\s*\[AGENT\]/,
      /^🔍/,
      /^📁/,
      /^📤/,
      /^🔧/,
      /^╔|^╚|^║/,
      /^: heartbeat$/i,
    ];
    return patterns.some((rx) => rx.test(trimmed));
  };

  const removeExecutionLogLines = (text) => {
    return text
      .split(/\r?\n/)
      .filter((line) => !isExecutionLogLine(line))
      .join('\n');
  };

  const removeDownloadStatusLines = (text) => {
    return text
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim();
        return !/^(✅\s*(File siap|File ready)|📄\s*File:|⏱️\s*(Waktu|Time):)/i.test(trimmed);
      })
      .join('\n')
      .trim();
  };

  // Improved formatMessageText - better handling of code blocks and tables
  const formatMessageText = (text, isStreaming = false, messageId = null) => {
    if (!text) return text;

    let redirectCards = [];
    // Mask any 3rd-party branding to Deepernova AI
    let tempText = text.replace(/\bDeepseek\b/gi, 'Deepernova AI');
    // Strip generated image markdown so it doesn't render as raw text
    tempText = tempText.replace(/!\[Generated Image\]\([^)]+\)/g, '');
    // Strip search, recall memory, and autonomous memory request tags
    tempText = tempText.replace(/\[SEARCH_REQUEST:\s*(.+?)\]/g, '');
    tempText = tempText.replace(/\[RECALL_MEMORY:\s*(.+?)\]/g, '');
    tempText = tempText.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*?\]/gi, '');
    
    // Parse Auto-Redirect Execution Flags:
    // 1. [REQUEST_DOCUMENT: <topic>] or [REQUEST_DOCX: <topic>] or [EXECUTE_DOCUMENT: <topic>]
    tempText = tempText.replace(/\[(?:REQUEST_DOCUMENT|REQUEST_DOCX|EXECUTE_DOCUMENT):\s*(.+?)\]/gi, (match, topic) => {
      redirectCards.push({ target: 'documents', fileType: 'docx', topic: topic.trim() });
      return '';
    });

    // 2. [REQUEST_EXCEL: <topic>]
    tempText = tempText.replace(/\[REQUEST_EXCEL:\s*(.+?)\]/gi, (match, topic) => {
      redirectCards.push({ target: 'documents', fileType: 'excel', topic: topic.trim() });
      return '';
    });

    // 3. [REQUEST_PPT: <topic>] or [REQUEST_PPTX: <topic>]
    tempText = tempText.replace(/\[(?:REQUEST_PPT|REQUEST_PPTX):\s*(.+?)\]/gi, (match, topic) => {
      redirectCards.push({ target: 'documents', fileType: 'pptx', topic: topic.trim() });
      return '';
    });

    // 4. [REQUEST_CODEDANCE: <task>] or [REQUEST_CODE: <task>] or [EXECUTE_CODE: <task>]
    tempText = tempText.replace(/\[(?:REQUEST_CODEDANCE|REQUEST_CODE|EXECUTE_CODE|OPEN_CODEDANCE):\s*(.+?)\]/gi, (match, task) => {
      redirectCards.push({ target: 'codedance', fileType: null, topic: task.trim() });
      return '';
    });

    // 5. [NAVIGATE_UNIVERSE]
    if (tempText.includes('[NAVIGATE_UNIVERSE]')) {
      redirectCards.push({ target: 'universe', fileType: null, topic: '' });
      tempText = tempText.replace(/\[NAVIGATE_UNIVERSE\]/g, '');
    }

    // Extract inline image requests
    const imageRequests = [];
    let processedText = tempText.replace(/\[IMAGE_REQUEST:\s*(.+?)\]/g, (match, prompt) => {
      const index = imageRequests.length;
      imageRequests.push(prompt.trim());
      return `__IMAGE_REQUEST_BLOCK_${index}__`;
    });

    // Detect simple GFM-style tables and render as HTML table to avoid raw pipe display
    const isMarkdownTableBlock = (txt) => {
      if (!txt || typeof txt !== 'string') return false;
      const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return false;
      // require pipes in header and separator contains hyphen
      const header = lines[0];
      const sep = lines[1];
      if (!header.includes('|')) return false;
      if (!sep.includes('-')) return false;
      // separator should only contain pipes, colons, dashes and spaces
      if (!/^[\s|:\-]+$/.test(sep)) return false;
      return true;
    };

    const renderCellContent = (cellText) => {
      if (!cellText) return '';
      
      const formulaRegex = /\\\(\s*([\s\S]*?)\s*\\\)|(?<!\$)(?<![`])\$(?!\$)([^$\n]+?)\$(?!\$)/g;
      
      if (formulaRegex.test(cellText)) {
        formulaRegex.lastIndex = 0;
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = formulaRegex.exec(cellText)) !== null) {
          if (match.index > lastIndex) {
            const textPart = cellText.substring(lastIndex, match.index);
            parts.push(<span key={lastIndex}>{renderCellContent(textPart)}</span>);
          }
          const formula = match[1] || match[2];
          parts.push(<FormulaRenderer key={match.index} formula={formula.trim()} isBlock={false} />);
          lastIndex = formulaRegex.lastIndex;
        }
        if (lastIndex < cellText.length) {
          const textPart = cellText.substring(lastIndex);
          parts.push(<span key={lastIndex}>{renderCellContent(textPart)}</span>);
        }
        return <>{parts}</>;
      }

      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer" className="message-link">
                {children}
              </a>
            ),
            code: ({ inline, className, children }) => (
              <code className="inline-code">{children}</code>
            ),
            img: ({ src, alt }) => (
              <img 
                src={src} 
                alt={alt} 
                className="inline-markdown-image" 
                onClick={() => handleImageClick(src, alt || 'Image')}
                style={{ cursor: 'pointer' }}
                title={userLanguage === 'id' ? 'Klik untuk memperbesar' : 'Click to enlarge'}
              />
            ),
            p: ({ children }) => <>{children}</>,
          }}
        >
          {cellText}
        </ReactMarkdown>
      );
    };

    const renderTableFromMarkdown = (tableText, key) => {
      const lines = tableText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return null;
      const headerLine = lines[0].replace(/^\||\|$/g, '');
      const headers = headerLine.split('|').map(h => h.trim());
      const dataLines = lines.slice(2);
      const rows = dataLines.map(line => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

      return (
        <div key={key} className="table-container">
          <table className="markdown-table">
            <thead>
              <tr>
                {headers.map((h, i) => <th key={i}>{renderCellContent(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => <td key={ci}>{renderCellContent(r[ci] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    // Remove any stray reasoning tags before formatting
    processedText = processedText.replace(/<\/?reasoning>/gi, '');
    processedText = processedText
      .replace(/\\r\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, ' ');
      processedText = removeExecutionLogLines(processedText);

      // ===== NEWLINE INJECTION FIRST (before streaming check) =====
      // AI often uses multiple spaces instead of newlines to separate items
      // Pattern: "text   Capitalized" (3+ spaces) likely means new item
      if (!processedText.includes('|')) {
        processedText = processedText.replace(/\s{3,}(?=[A-Z])/g, '\n\n');
      }

      // Keep bold formatting intact - do not forcefully split bold tags across newlines
      // processedText = processedText.replace(/([.!?])\*\*/g, '$1\n\n**');
      // processedText = processedText.replace(/([^\n])\*\*([A-Z])/g, '$1\n\n**$2');

      // Hide any partial/incomplete IMAGE_REQUEST tags during typing animation
      if (isStreaming) {
        processedText = processedText.replace(/\[IMAGE_REQUEST:\s*.*?\]?/g, '');
      }

    if (processedText.includes('...') && !processedText.includes('|')) {
      const parts = processedText.split(/\.\.\./).filter(p => p.trim());
      if (parts.length > 1) {
        processedText = parts.map(p => {
          const cleaned = p.trim();
          // If it already starts with list marker, keep as is
          if (/^[-*\d+]/.test(cleaned)) {
            return cleaned;
          }
          return `- ${cleaned}`;
        }).join('\n');
      }
    }

    // Extract file download info if present
    let downloadUrl = null;
    let fileName = null;
    let downloadSummary = null;
    const downloadMatch = processedText.match(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):(.+):([^:]+):?([^\]]*)\]/);
    if (downloadMatch) {
      downloadUrl = downloadMatch[1];
      fileName = downloadMatch[2];
      // Decode summary if provided
      if (downloadMatch[3]) {
        try {
          downloadSummary = decodeURIComponent(downloadMatch[3]);
        } catch (e) {
          downloadSummary = downloadMatch[3];
        }
      }
      // Remove the download markers from text
      processedText = processedText.replace(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):[^\]]*\]\n*/g, '');
      processedText = processedText.replace(/\[(?:FILE_DOWNLOAD_END|FILEDOWNLOADEND)\]\n*/g, '');
      processedText = removeDownloadStatusLines(processedText);
    }

    const quizNode = parseQuizText(processedText, messageId);
    if (quizNode) return quizNode;
    
    // Extract chart blocks first (before other processing)
    const chartBlocks = [];
    
    // Look for chart blocks with various formats
    // Format: **PIE CHART** Data here or [CHART type=pie] data [/CHART]
    processedText = processedText.replace(/\*\*(PIE CHART|BAR CHART|LINE CHART|RADAR|INFOGRAFIS)(.*?)(\n\n|(?=\n[A-Z*#]))/gi, (match, chartType, content) => {
      const chartIndex = chartBlocks.length;
      const dataStr = content.trim();
      const data = parseChartDataFromText(dataStr);
      
      if (data && data.length > 0) {
        const typeMap = {
          'PIE CHART': 'pie',
          'BAR CHART': 'bar',
          'LINE CHART': 'line',
          'RADAR': 'radar',
          'INFOGRAFIS': 'infographic'
        };
        
        chartBlocks.push({
          type: typeMap[chartType] || 'pie',
          data: data,
          title: chartType.toLowerCase().replace(' chart', '')
        });
        
        return `__CHART_BLOCK_${chartIndex}__\n\n`;
      }
      return match;
    });
    
    // Also try to auto-detect charts from content
    if (chartBlocks.length === 0 && (text.toLowerCase().includes('pie') || text.toLowerCase().includes('grafik') || text.toLowerCase().includes('statistik'))) {
      const chartType = detectChartType(text);
      if (chartType) {
        const data = parseChartDataFromText(text);
        if (data && data.length > 2) {
          chartBlocks.push({
            type: chartType,
            data: data,
            title: 'Statistik'
          });
          processedText = `__CHART_BLOCK_${chartBlocks.length - 1}__\n\n${processedText}`;
        }
      }
    }

    // Auto-detect and extract tables first to prevent them from being split by other placeholders
    const tableBlocks = [];
    const isSeparatorLine = (str) => {
      const trimmed = String(str || '').trim();
      if (trimmed.length === 0) return false;
      if (!/^[\s|:\-]+$/.test(trimmed)) return false;
      if (!trimmed.includes('-')) return false;
      return true;
    };

    const tableLines = processedText.split('\n');
    let inTable = false;
    let inCodeBlock = false;
    let currentTableLines = [];
    let newLines = [];

    for (let i = 0; i < tableLines.length; i++) {
      const line = tableLines[i];
      
      // Toggle code block state
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inTable) {
          const tableIndex = tableBlocks.length;
          tableBlocks.push(currentTableLines.join('\n'));
          newLines.push(`__TABLE_BLOCK_${tableIndex}__`);
          inTable = false;
          currentTableLines = [];
        }
        newLines.push(line);
        continue;
      }

      if (inCodeBlock) {
        newLines.push(line);
        continue;
      }

      const isTableLine = line.includes('|');
      if (isTableLine) {
        if (!inTable) {
          // Check if this is the start of a table
          const nextLine = tableLines[i + 1];
          if (nextLine && isSeparatorLine(nextLine)) {
            inTable = true;
            currentTableLines = [line];
          } else {
            newLines.push(line);
          }
        } else {
          currentTableLines.push(line);
        }
      } else {
        if (inTable) {
          const tableIndex = tableBlocks.length;
          tableBlocks.push(currentTableLines.join('\n'));
          newLines.push(`__TABLE_BLOCK_${tableIndex}__`);
          inTable = false;
          currentTableLines = [];
        }
        newLines.push(line);
      }
    }
    if (inTable) {
      const tableIndex = tableBlocks.length;
      tableBlocks.push(currentTableLines.join('\n'));
      newLines.push(`__TABLE_BLOCK_${tableIndex}__`);
    }
    processedText = newLines.join('\n');

    // First, extract and protect formulas (both block and inline, multiple formats)
    const formulaBlocks = [];
    
    // Extract block formulas - \[...\] or $$...$$ 
    processedText = processedText.replace(/\\\[\s*([\s\S]*?)\s*\\\]|\$\$\s*([\s\S]*?)\s*\$\$/g, (match, latexBlock, dollarBlock) => {
      const formula = latexBlock || dollarBlock;
      const index = formulaBlocks.length;
      formulaBlocks.push({ type: 'block', formula: formula.trim() });
      return `__FORMULA_BLOCK_${index}__`;
    });
    
    // Extract inline formulas - \(...\) or $...$ (improved to handle more cases)
    // First handle \(...\) format
    processedText = processedText.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (match, latexInline) => {
      const formula = latexInline;
      const index = formulaBlocks.length;
      formulaBlocks.push({ type: 'inline', formula: formula.trim() });
      return `__FORMULA_BLOCK_${index}__`;
    });
    
    // Then handle single $ formulas more carefully (avoid matching inside code/text)
    // Match $...$  but not $$...$$ and not when preceded/followed by backticks
    processedText = processedText.replace(/(?<!\$)(?<![`])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (match, dollarInline) => {
      const formula = dollarInline.trim();
      // Skip if it looks like currency or empty
      if (!formula || formula.length < 2 || /^\d+$/.test(formula)) {
        return match; // Return original match if it's just a number
      }
      const index = formulaBlocks.length;
      formulaBlocks.push({ type: 'inline', formula: formula });
      return `__FORMULA_BLOCK_${index}__`;
    });
    
    // Then extract code blocks
    const codeBlocks = [];

    // Normalize malformed fenced blocks where language and code are on the same line
    const normalizeMalformedFencedCode = (input) => {
      const pattern = /```([^\s`]+)(?:[ \t]+)?([\s\S]*?)```/gi;
      return input.replace(pattern, (match, lang, rest) => {
        const normalizedContent = rest.replace(/^[\s\r\n]+/, '');
        return `\`\`\`${lang}\n${normalizedContent}\`\`\``;
      });
    };

    processedText = normalizeMalformedFencedCode(processedText);

    // Extract ```code``` blocks - COMPLETE CODE BLOCKS first
    processedText = processedText.replace(/```([^\s`]*)\s*\n?([\s\S]*?)```/g, (match, lang, code) => {
      const index = codeBlocks.length;
      codeBlocks.push({ type: 'fenced', lang: lang || 'text', code: code.trim() });
      return `__CODE_BLOCK_${index}__`;
    });
    
    // Handle INCOMPLETE/OPENING code blocks - ```lang followed by content but NO closing ```
    processedText = processedText.replace(/```([^\s`]*)\s*\n?([\s\S]*)$/gm, (match, lang, content) => {
      if (match.includes('__CODE_BLOCK_')) return match;
      const index = codeBlocks.length;
      
      let codeContent = content.startsWith('\n') ? content.substring(1) : content;
      // Strip any trailing backticks from the end of the code content (since they are part of the closing marker being typed)
      if (codeContent.endsWith('\n```')) {
        codeContent = codeContent.slice(0, -4);
      } else if (codeContent.endsWith('\n``')) {
        codeContent = codeContent.slice(0, -3);
      } else if (codeContent.endsWith('\n`')) {
        codeContent = codeContent.slice(0, -2);
      } else if (codeContent.endsWith('```')) {
        codeContent = codeContent.slice(0, -3);
      } else if (codeContent.endsWith('``')) {
        codeContent = codeContent.slice(0, -2);
      } else if (codeContent.endsWith('`')) {
        codeContent = codeContent.slice(0, -1);
      }
      
      codeBlocks.push({
        type: 'fenced',
        lang: lang || 'text',
        code: codeContent.trim(),
        incomplete: true
      });
      return `__CODE_BLOCK_${index}__`;
    });
    
    // Extract `inline code` - but NOT if it's part of a code block marker
    processedText = processedText.replace(/`([^`\n]+?)`/g, (match, code) => {
      // Skip if this looks like a code block delimiter
      if (code.trim() === '' || /^```/.test(code)) return match;
      
      const index = codeBlocks.length;
      codeBlocks.push({ type: 'inline', code: code });
      return `__CODE_BLOCK_${index}__`;
    });
    
    // Protect placeholders before markdown rendering
    let processedTextWithProtection = processedText;
    const placeholderMap = new Map();
    let placeholderCounter = 0;
    
    // Replace __CODE_BLOCK_X__, __CHART_BLOCK_X__, __FORMULA_BLOCK_X__, __TABLE_BLOCK_X__, and __IMAGE_REQUEST_BLOCK_X__ with safe markers
    processedTextWithProtection = processedTextWithProtection.replace(/(__CODE_BLOCK_\d+__|__CHART_BLOCK_\d+__|__FORMULA_BLOCK_\d+__|__TABLE_BLOCK_\d+__|__IMAGE_REQUEST_BLOCK_\d+__)/g, (match) => {
      const safeMarker = `<<PLACEHOLDER_${placeholderCounter}>>`;
      placeholderMap.set(safeMarker, match);
      placeholderCounter++;
      return safeMarker;
    });
    
    // Normalize separator lines like --- so they become explicit paragraphs
    let cleanedText = processedTextWithProtection
      .replace(/\n-{3,}\n/g, '\n\n---\n\n')
      .replace(/\n_{3,}\n/g, '\n\n---\n\n')
      .replace(/\n\*{3,}\n/g, '\n\n---\n\n')
      .trim();
    
    // Restore placeholders after markdown cleaning
    for (const [marker, original] of placeholderMap.entries()) {
      cleanedText = cleanedText.replace(marker, original);
    }
    
    // Normalize separator lines like --- so they become explicit paragraphs
    cleanedText = cleanedText
      .replace(/\n-{3,}\n/g, '\n\n---\n\n')
      .replace(/\n_{3,}\n/g, '\n\n---\n\n')
      .replace(/\n\*{3,}\n/g, '\n\n---\n\n');

    // Preserve single-line breaks as normal newlines so markdown can parse paragraphs and lists
    // Avoid converting every newline into a hard line break, which flattens content.
    // cleanedText = cleanedText.replace(/([^\n])\n([^\n])/g, '$1  \n$2');

    // Restore code blocks and formulas with proper formatting
    const result = [];
    const parts = cleanedText.split(/(__CODE_BLOCK_\d+__|__CHART_BLOCK_\d+__|__FORMULA_BLOCK_\d+__|__TABLE_BLOCK_\d+__|__IMAGE_REQUEST_BLOCK_\d+__)/g);
    


    const renderMarkdownSegment = (markdownText, key) => {
      // Smart formatting - keep natural newlines but clean excessive ones
      let cleanedNormalized = String(markdownText || '')
        .replace(/(\d+)\.(\S)/g, '$1. $2')  // Ensure space after number dots
        .replace(/--\*\*/g, '')
        .replace(/\*\*--/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/[-–—]+(?=\s*$)/gm, '')  // Remove trailing dashes
        .replace(/\n{3,}/g, '\n\n');  // Keep max 2 consecutive newlines (1 blank line)
      
      // Pass markdown to ReactMarkdown naturally for robust bold/italic parsing
      
      const msgObj = messages.find(m => m.id === messageId);
      const sources = msgObj ? msgObj.searchSources : null;

      let preprocessedText = cleanedNormalized;
      if (sources && sources.length > 0) {
        // Replace [Sumber X] or [sumber X] with [X](cite:X)
        preprocessedText = preprocessedText.replace(/\[Sumber\s*(\d+)\]/gi, (match, num) => {
          const idx = parseInt(num);
          if (idx > 0 && idx <= sources.length) {
            return `[${num}](cite:${num})`;
          }
          return match;
        });
        
        // Replace [X] style citations if they match an index
        preprocessedText = preprocessedText.replace(/(?<!\[)\[(\d+)\](?!\])/g, (match, num) => {
          const idx = parseInt(num);
          if (idx > 0 && idx <= sources.length) {
            return `[${num}](cite:${num})`;
          }
          return match;
        });
      }

      return (
        <div key={key} className="message-paragraph">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
                if (href && href.startsWith('cite:')) {
                  const citeNum = parseInt(href.substring(5));
                  const source = sources && sources[citeNum - 1];
                  if (source) {
                    return (
                      <a 
                        href={source.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-citation-pill"
                        title={source.title}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img 
                          src={`https://www.google.com/s2/favicons?sz=32&domain=${source.domain}`}
                          onError={(e) => { e.target.src = 'https://img.icons8.com/ios-glyphs/30/1e3a8a/globe.png' }}
                          className="inline-citation-favicon"
                          alt=""
                        />
                        <span className="inline-citation-text">{source.domain.replace('www.', '')}</span>
                      </a>
                    );
                  }
                }
                return (
                  <a href={href} target="_blank" rel="noreferrer" className="message-link">
                    {children}
                  </a>
                );
              },
              code: ({ inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const rawCode = String(children || '').replace(/\n$/, '');
                if (!inline && (match || rawCode.includes('\n'))) {
                  const lang = match ? match[1] : 'plaintext';
                  return (
                    <CodeBlockHolder
                      code={cleanCodeBlock(rawCode, lang)}
                      language={lang}
                    />
                  );
                }
                return <code className="inline-code">{children}</code>;
              },
              li: ({ children }) => <li className="message-list-item">{children}</li>,
              ul: ({ children }) => <ul className="message-list">{children}</ul>,
              ol: ({ children }) => <ol className="message-list">{children}</ol>,
              table: ({ children }) => <div className="table-container"><table className="markdown-table">{children}</table></div>,
              th: ({ children }) => <th>{children}</th>,
              td: ({ children }) => <td>{children}</td>,
              img: ({ src, alt }) => (
                <img 
                  src={src} 
                  alt={alt} 
                  className="inline-markdown-image" 
                  onClick={() => handleImageClick(src, alt || 'Image')}
                  style={{ cursor: 'pointer' }}
                  title={userLanguage === 'id' ? 'Klik untuk memperbesar' : 'Click to enlarge'}
                />
              ),
            }}
          >
            {preprocessedText}
          </ReactMarkdown>
        </div>
      );
    };
    for (const part of parts) {
      const codeMatch = part.match(/__CODE_BLOCK_(\d+)__/);
      const chartMatch = part.match(/__CHART_BLOCK_(\d+)__/);
      const formulaMatch = part.match(/__FORMULA_BLOCK_(\d+)__/);
      const tableMatch = part.match(/__TABLE_BLOCK_(\d+)__/);
      const imageRequestMatch = part.match(/__IMAGE_REQUEST_BLOCK_(\d+)__/);
      
      if (formulaMatch) {
        const block = formulaBlocks[parseInt(formulaMatch[1])];
        const formulaId = `formula-${formulaMatch[1]}`;
        
        result.push(
          <FormulaRenderer 
            key={formulaId} 
            formula={block.formula} 
            isBlock={block.type === 'block'} 
          />
        );
      } else if (tableMatch) {
        const tableIndex = parseInt(tableMatch[1]);
        const tableText = tableBlocks[tableIndex];
        const tableNode = renderTableFromMarkdown(tableText, `table-block-${tableIndex}`);
        if (tableNode) {
          result.push(tableNode);
        }
      } else if (codeMatch) {
        const block = codeBlocks[parseInt(codeMatch[1])];
        if (block.type === 'fenced') {
          // If fenced block actually contains a markdown-style table, render it as a table
          if (isMarkdownTableBlock(block.code)) {
            const tableNode = renderTableFromMarkdown(block.code, `table-code-${codeMatch[1]}`);
            if (tableNode) {
              result.push(tableNode);
              continue;
            }
          }
          
          const normalizeCodeLang = (lang) => {
            const l = String(lang || '').trim().toLowerCase();
            if (['javascript', 'js', 'jsx'].includes(l)) return 'javascript';
            if (['typescript', 'ts', 'tsx'].includes(l)) return 'typescript';
            if (['python', 'py'].includes(l)) return 'python';
            if (!l) return 'plaintext';
            return l.replace(/[^a-z0-9_-]/gi, '-');
          };
          const language = normalizeCodeLang(block.lang);
          const cleanedCode = cleanCodeBlock(block.code, language === 'plaintext' ? 'plaintext' : language);
          const codeBlockId = `code-${codeMatch[1]}`;
          const isIncomplete = block.incomplete === true;
          
          result.push(
            <CodeBlockHolder
              key={codeBlockId}
              code={cleanedCode}
              language={language}
              isIncomplete={isIncomplete}
              isStreaming={isStreaming}
              codeBlockId={codeBlockId}
            />
          );
        } else if (block.type === 'inline') {
          // Render inline code
          result.push(
            <code key={`inline-${codeMatch[1]}`} className="inline-code">
              {block.code}
            </code>
          );
        }
      } else if (chartMatch) {
        // Render chart
        const chartData = chartBlocks[parseInt(chartMatch[1])];
        if (chartData) {
          result.push(
            <ChartGenerator
              key={`chart-${chartMatch[1]}`}
              data={chartData.data}
              type={chartData.type}
              title={chartData.title}
            />
          );
        }
      } else if (imageRequestMatch) {
        const imageIndex = parseInt(imageRequestMatch[1]);
        const prompt = imageRequests[imageIndex];
        const imageIdKey = `inline-image-${messageId || 'x'}-${imageIndex}`;
        
        const msgObj = messages.find(m => m.id === messageId);
        
        if (msgObj) {
          const textImgMatch = msgObj.text && (msgObj.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/i) || msgObj.text.match(/\[IMAGE_URL:\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/i));
          const extractedUrlFromText = textImgMatch ? textImgMatch[1] : null;

          const specificUrl = msgObj.imageUrls && msgObj.imageUrls[imageIndex];
          const specificError = msgObj.imageErrors && msgObj.imageErrors[imageIndex];
          const isSpecificGenerating = msgObj.imageGeneratingStates && msgObj.imageGeneratingStates[imageIndex];
          
          const imageUrl = specificUrl || (imageIndex === 0 ? (msgObj.imageUrl || extractedUrlFromText) : null) || extractedUrlFromText;
          const imageError = specificError || (imageIndex === 0 ? msgObj.imageError : null);
          const isGenerating = isSpecificGenerating || (msgObj.isStreaming || msgObj.isThinking);

          if (imageUrl) {
            result.push(
              <div key={imageIdKey} className="message-image-container inline-image-block" style={{ margin: '15px 0', position: 'relative' }}>
                <img
                  src={imageUrl}
                  alt="Generated Image"
                  className="message-image"
                  onClick={() => handleImageClick(imageUrl, 'Generated Image', msgObj.imageId)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  title={userLanguage === 'id' ? 'Klik untuk membesar' : 'Click to enlarge'}
                />
                <button
                  type="button"
                  className={`hd-upscale-btn ${hdUpscalingMap[imageUrl] ? 'loading' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleUpscaleHD(imageUrl, msgObj.id); }}
                  disabled={!!hdUpscalingMap[imageUrl]}
                  title={userLanguage === 'id' ? 'Tingkatkan kualitas ke HD' : 'Upscale to HD'}
                >
                  {hdUpscalingMap[imageUrl] ? (
                    <><i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> HD...</>
                  ) : (
                    <><span className="hd-icon">HD</span></>
                  )}
                </button>
              </div>
            );
          } else if (imageError) {
            result.push(
              <div key={imageIdKey} className="inline-image-error" style={{ color: '#ef4444', padding: '10px', border: '1px solid #fca5a5', borderRadius: '6px', margin: '10px 0', backgroundColor: '#fef2f2' }}>
                ⚠️ {imageError}
              </div>
            );
          } else {
            result.push(
              <div key={imageIdKey} className="image-thinking-state inline-image-loading" style={{ margin: '15px 0' }}>
                <div className="image-loading-dots-container">
                  <div className={`image-loading-dots ${msgObj?.imageGenPhase === 'responding' || msgObj?.imageGenPhase === 'generating' ? 'speed-1x' : 'speed-2x'}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ea580c' }}>
                    {userLanguage === 'id' ? 'Sedang menyusun dan merakit pixel gambar...' : 'Assembling and rendering image pixels...'}
                  </span>
                </div>
              </div>
            );
          }
        } else {
          result.push(
            <div key={imageIdKey} className="image-thinking-state inline-image-loading" style={{ margin: '15px 0' }}>
              <div className="image-loading-dots-container">
                <div className={`image-loading-dots ${msgObj?.imageGenPhase === 'responding' || msgObj?.imageGenPhase === 'generating' ? 'speed-1x' : 'speed-2x'}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ea580c' }}>
                  {userLanguage === 'id' ? 'Sedang menyusun dan merakit pixel gambar...' : 'Assembling and rendering image pixels...'}
                </span>
              </div>
            </div>
          );
        }
      } else if (part.trim()) {
        const cleanPart = part
          .replace(/<<PLACEHOLDER_\d+>>/g, '')
          .replace(/__FORMULA_BLOCK_\d+__/g, '')
          .replace(/__CODE_BLOCK_\d+__/g, '')
          .replace(/__CHART_BLOCK_\d+__/g, '')
          .replace(/__IMAGE_REQUEST_BLOCK_\d+__/g, '')
          .trim();

        if (cleanPart) {
          // Split by double newlines to create multiple paragraphs
          const paragraphs = cleanPart.split(/\n\n+/);
          paragraphs.forEach((para, idx) => {
            if (!para.trim()) return;
            if (isMarkdownTableBlock(para)) {
              const tableNode = renderTableFromMarkdown(para.trim(), `table-${result.length}-${idx}`);
              if (tableNode) {
                result.push(tableNode);
                return;
              }
            }
            result.push(renderMarkdownSegment(para.trim(), `markdown-${result.length}-${idx}`));
          });
        }
      }
    }
    
    // Add download button if file download info is available
    if (downloadUrl && fileName) {
      result.push(
        <div key="download-button" className="file-download-container" style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>📥</span>
          <a 
            href={downloadUrl}
            download={fileName}
            className="download-file-button"
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              display: 'inline-block',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            📩 Download: {fileName}
          </a>
        </div>
      );
    }
    
    if (redirectCards.length > 0) {
      redirectCards.forEach((card, idx) => {
        result.push(
          <AutoRedirectCountdownCard
            key={`auto-redirect-${idx}-${messageId || 'm'}`}
            target={card.target}
            fileType={card.fileType}
            topic={card.topic}
            onNavigate={onNavigate}
            userLanguage={userLanguage}
          />
        );
      });
    }
    
    return <>{result}</>;
  };

  const scrollToBottom = (isImmediate = false) => {
    // If we're holding scroll (e.g. just finished streaming), ignore further auto-scrolls
    if (holdScrollRef.current) return;

    const scrollElement = document.querySelector('.messages-container');
    const anchor = messagesEndRef.current;

    const performScroll = () => {
      // Mark that we're doing a programmatic scroll so the scroll handler won't treat it as user input
      programmaticScrollRef.current = true;
      // Clear the flag shortly after to resume normal detection
      setTimeout(() => { programmaticScrollRef.current = false; }, 120);
      if (scrollElement) {
        try {
          // Force scroll ke paling bawah ultimate
          const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
          scrollElement.scrollTop = maxScrollTop + 9999; // Force extra untuk pastikan mentok
          scrollElement.scrollTo({ top: maxScrollTop + 9999, behavior: 'auto' });
        } catch (err) {
          console.log('Scroll error:', err);
        }
      }

      if (anchor && anchor.scrollIntoView) {
        try {
          anchor.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
        } catch (err) {
          console.log('Scroll into view error:', err);
        }
      }
    };

    if (!scrollElement && !anchor) return;

    if (isImmediate) {
      performScroll();
    } else {
      setTimeout(performScroll, 0);
    }

    setTimeout(performScroll, 10);
    setTimeout(performScroll, 50);
    requestAnimationFrame(performScroll);
  };

  // Handle scroll to bottom button click
  const handleScrollToBottomClick = () => {
    // User explicitly requested bottom — clear hold and perform programmatic scroll
    holdScrollRef.current = false;
    try {
      const scrollEl = document.querySelector('.messages-container');
      if (scrollEl) scrollEl.classList.remove('prefill-space');
    } catch (_e) {
      // ignore
    }
    scrollToBottom(true);
    setIsScrolledUp(false);
  };

  // Handle show previous messages button
  const handleShowPreviousMessages = () => {
    // Disable compact view to show all messages
    setCompactView(false);
    // Scroll to bottom to show the latest chat
    setTimeout(() => {
      scrollToBottom(true);
    }, 100);
  };

  // Update conversation messages and calculate global token count
  useEffect(() => {
    // Hanya update state, jangan scroll di sini - scroll hanya di handleSendMessage dan finishStreaming
    
    if (currentConversationId) {
      rememberConversationId(currentConversationId);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? { ...c, messages, updatedAt: new Date().toISOString() }
            : c
        )
      );
      // Generate AI-based title ONLY after the first exchange (max once per session)
      if (messages.length === 2 && currentConversationId && !aiTitledConversationsRef.current.has(currentConversationId)) {
        const titleConvId = currentConversationId;
        setTimeout(() => {
          if (titleConvId) {
            generateChatTitle(titleConvId);
          }
        }, 300);
      }
    }
  }, [messages]);

  // Close input menu (+ attachment menu), model menu, and floating menu when clicking or tapping outside
  useEffect(() => {
    if (!showInputMenu && !showModelMenu && !showFloatingMenu) return;

    const handleClickOutside = (e) => {
      if (showInputMenu) {
        const fileMenuContainer = document.querySelector('.file-menu-container');
        if (fileMenuContainer && !fileMenuContainer.contains(e.target)) {
          setShowInputMenu(false);
        }
      }

      if (showModelMenu) {
        const modelSelectorWrapper = document.querySelector('.claude-model-selector-wrapper');
        if (modelSelectorWrapper && !modelSelectorWrapper.contains(e.target)) {
          setShowModelMenu(false);
        }
      }

      if (showFloatingMenu) {
        const floatingMenu = document.querySelector('.floating-menu');
        const floatingBtn = document.querySelector('.floating-add-btn');
        if (
          floatingMenu && 
          !floatingMenu.contains(e.target) && 
          (!floatingBtn || !floatingBtn.contains(e.target))
        ) {
          setShowFloatingMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showInputMenu, showModelMenu, showFloatingMenu]);

  // ==================== SOURCE MANAGEMENT ====================
  /**
   * Load sources for current conversation from backend
   */
  const loadSourcesForConversation = async (conversationId) => {
    try {
      if (!conversationId) return;
      
      const response = await fetch(`${apiBaseUrl}/api/sources/${conversationId}`);
      const data = await response.json();
      
      if (data.success && data.sources) {
        setCurrentSources(data.sources);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  /**
   * Show sources modal for current conversation
   */
  const handleShowSources = async () => {
    if (!currentConversationId) return;
    await loadSourcesForConversation(currentConversationId);
    setShowSourcesModal(true);
  };

  /**
   * View source details when clicked
   */
  const handleViewSourceDetail = (source) => {
    setSelectedSource(source);
  };

  /**
   * Open source URL in new tab
   */
  const handleOpenSource = (url) => {
    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
    }
  };

  /**
   * Get icon for source type
   */
  const getSourceIcon = (type) => {
    const iconMap = {
      'finance_data': '💰',
      'crypto_data': '₿',
      'stock_data': '📈',
      'macro_data': '📊',
      'web_search': '🔍',
      'news': '📰',
      'economic': '💹'
    };
    return iconMap[type] || '📚';
  };

  /**
   * Generate answer from found sources
   */
  const handleGenerateAnswerFromSources = async (userQuery) => {
    if (!userQuery) return;

    // Build sources context
    const sourcesContext = foundSources.map((s, i) => 
      `[Sumber ${i+1}] ${s.title}\n${s.description}\nURL: ${s.url}\nSumber: ${s.source}`
    ).join('\n\n');

    const fullQuery = `Berdasarkan sumber-sumber berikut yang telah ditemukan, berikan jawaban untuk pertanyaan: "${userQuery}"\n\nSOURCES:\n${sourcesContext}`;

    // Clear sources panel
    setShowFoundSourcesPanel(false);
    setFoundSources([]);
    // setIsWaitingForAnswer(false); - removed unused setter

    // Add user message to display
    const userMessage = {
      id: Date.now(),
      text: userQuery,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCompactView(true);
    // Store the last sent prompt for restore-on-stop functionality
    lastSentPromptRef.current = userQuery;
    lastSentUserMessageIdRef.current = userMessage.id;
    setInputValue('');

    // Create placeholder for bot response
    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const botMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, botMessage]);

    try {
      setConvLoading(true);
      const response = await sendMessageToGrok(
        fullQuery,
        [...messages, userMessage],
        userLanguage,
        currentConversationId,
        selectedPersonality,
        new AbortController(),
        selectedModel,
        isAuthenticated,
        isGuest,
        userName || user?.name
      );

      let fullText = '';
      let displayedText = '';
      let streamFinished = false;
      currentStreamingTextRef.current = '';

      let streamUsage = null; // Will hold real API usage data
      
      const startTypingAnimation = () => {
        if (typingTimerRef.current) return;
        typingTimerRef.current = setInterval(() => {
          if (displayedText.length < fullText.length) {
            const diff = fullText.length - displayedText.length;
            const step = Math.max(1, Math.min(diff, Math.ceil(diff / 15)));
            displayedText += fullText.substr(displayedText.length, step);
            currentStreamingTextRef.current = displayedText;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === placeholderId
                  ? { ...msg, text: sanitizeStreamingText(displayedText), isStreaming: true, isThinking: false }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
            finishStreaming(placeholderId, fullText, streamUsage);
          }
        }, 40);
      };
      
      const streamResult = await processStreamingResponse(
        response,
        (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            fullText += textChunk;
            currentStreamingTextRef.current = fullText;
          }
        }
      );
      streamUsage = streamResult?.usage || null;

      streamFinished = true;
      startTypingAnimation();

      while (displayedText.length < fullText.length || typingTimerRef.current !== null) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      finishStreaming(placeholderId, fullText, streamUsage);
      setConvLoading(false);
    } catch (err) {
      setConvLoading(false);
      if (err.isTokenLimitError) {
        setTokenUsage({
          usedTokens: err.usedTokens || MAX_TOKEN_LIMIT,
          resetTime: err.resetTime || (Date.now() + TOKEN_RESET_HOURS * 60 * 60 * 1000)
        });
        showAlert(
          userLanguage === 'id'
            ? `⚠️ Batas token IP (${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}) tercapai! Input terkunci selama 4 jam.`
            : `⚠️ IP Token limit (${MAX_TOKEN_LIMIT.toLocaleString('en-US')}) reached! Input locked for 4 hours.`,
          'error',
          6000
        );
      } else if (err.name !== 'AbortError') {
        showErrorBanner(`Error: ${err.message}`);
      }
    }
  };

  /**
   * Handle inline image generation in chat
   * Generates image and displays it in chat format
   */
  const handleInlineImageGeneration = async (imageRequest, userMessage, imagesToUseParam = null) => {
    // Check token limit before image generation
    if (isTokenUsageLimited()) {
      showAlert(
        userLanguage === 'id'
          ? `⚠️ Limit token ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')} telah tercapai. Penggunaan token akan di-reset dalam ${countdownText || '4 jam'}.`
          : `⚠️ Token limit ${MAX_TOKEN_LIMIT.toLocaleString('en-US')} reached. Token usage will reset in ${countdownText || '4 hours'}.`,
        'error',
        5000
      );
      return;
    }

    // Deduct 30,000 tokens for image generation or edit
    consumeTokens(IMAGE_TOKEN_COST);

    // Define variables outside try block so they're accessible in catch
    let placeholderId = Date.now() + '_img';
    let thinkingStartTime;
    const imageAbortController = new AbortController();
    
    try {
      console.log('[ChatBot] Starting inline image generation for:', imageRequest.prompt);
      
      // Store abort controller so handleStopStreaming can abort it
      abortControllersMapRef.current.set('image-' + placeholderId, imageAbortController);
      
      // Add user message to chat
      setMessages((prev) => [...prev, userMessage]);
      setCompactView(true);
      
      thinkingStartTime = Date.now();
      
      // Collect images from parameters, active follow-ups, and message history
      const historyImages = (messages || [])
        .filter(m => m.sender === 'user' && m.images && Array.isArray(m.images))
        .flatMap(m => m.images);

      const imagesToConsider = (imagesToUseParam && imagesToUseParam.length > 0)
        ? imagesToUseParam
        : ((activeImageFollowUps && activeImageFollowUps.length > 0) ? activeImageFollowUps : []);

      const lastUploadedImage = imagesToConsider && imagesToConsider.length > 0 ? imagesToConsider[imagesToConsider.length - 1] : null;
      const isEditRequest = !!lastUploadedImage && ImageGenerationService.detectImageEditRequest(imageRequest.prompt, true);
      const modeLabel = isEditRequest ? '✏️ Edit' : '🎨 Generate';
      
      console.log('[ChatBot] Mode:', modeLabel);
      console.log('[ChatBot] Last uploaded image:', lastUploadedImage ? (lastUploadedImage.fileName || lastUploadedImage.name || 'image') : 'none');
      console.log('[ChatBot] Is edit request:', isEditRequest);
      
      // Add thinking placeholder with 2x speed animation initially (pas awal-awal)
      const thinkingMessage = {
        id: placeholderId,
        text: `${modeLabel} sedang membuat gambar...`,
        sender: 'bot',
        timestamp: new Date(),
        isThinking: true,
        isImage: true,
        imagePrompt: imageRequest.prompt,
        isEditMode: isEditRequest,
        imageGenPhase: 'initial', // 2x speed 3-dot animation at initial start
      };
      
      setMessages((prev) => [...prev, thinkingMessage]);
      setConvLoading(true);
      setError(null);
      setIsScrolledUp(false);
      
      // Scroll to show thinking message
      setTimeout(() => {
        try {
          const msgEl = document.querySelector(`[data-msg-id="${placeholderId}"]`);
          if (msgEl) msgEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch (_e) {
          // ignore
        }
      }, 100);
      
      // Generate image via API with an English prompt that is first refined by the chat model
      console.log('[ChatBot] Calling image generation API...');
      
      console.log('[ChatBot] 🟡 Step 1: Original prompt:', imageRequest.prompt);
      
      let englishPrompt = await ImageGenerationService.generateEnglishImagePrompt(imageRequest.prompt);
      
      // AI responded - transition 3-dot animation speed to 1x normal speed!
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, imageGenPhase: 'responding' } : m));

      if (!englishPrompt) {
        console.warn('[ChatBot] ⚠️ English prompt generation failed, falling back to dictionary translation');
        englishPrompt = ImageGenerationService.translateToEnglish(imageRequest.prompt);
      }
      console.log('[ChatBot] 🟡 Step 2: English prompt:', englishPrompt);
      
      const refinedPrompt = ImageGenerationService.enhancePrompt(englishPrompt);
      console.log('[ChatBot] 🟡 Step 3: Refined prompt:', refinedPrompt);

      // Transition to generating image phase with 1x normal speed animation
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, imageGenPhase: 'generating' } : m));

      // Reasoning generation removed - focus on direct image generation
      console.log(`[ChatBot] 🟡 Step 4: Calling ${isEditRequest ? 'editImage' : 'generateImage'} with prompt:`, refinedPrompt);
      
      let imageData;
      if (isEditRequest && lastUploadedImage) {
        // Edit mode: use reference image (auto-selects qwen-image-edit-max)
        console.log('[ChatBot] Using edit mode with reference image:', lastUploadedImage.fileName);
        console.log('[ChatBot] Image object keys:', Object.keys(lastUploadedImage));
        console.log('[ChatBot] publicUrl:', lastUploadedImage.publicUrl?.substring?.(0, 50));
        console.log('[ChatBot] dataUrl:', lastUploadedImage.dataUrl?.substring?.(0, 50));
        
        // Use publicUrl if available, otherwise fall back to dataUrl
        const referenceImageSource = lastUploadedImage.publicUrl || lastUploadedImage.dataUrl;
        console.log('[ChatBot] Using reference source:', referenceImageSource?.substring?.(0, 50));
        
        // Call generateImage directly for edit mode with abort signal
        imageData = await ImageGenerationService.generateImage(
          refinedPrompt,
          imageRequest.size || '1024x1024',
          currentConversationId,
          null, // Model auto-selected: qwen-image-edit-max for editing
          referenceImageSource, // Reference image for editing
          imageAbortController.signal // Pass abort signal for timeout support
        );
      } else {
        // Generation mode: create new image (auto-selects imagen-4-fast)
        imageData = await ImageGenerationService.generateImage(
          refinedPrompt,
          imageRequest.size || '1024x1024',
          currentConversationId,
          null, // Model auto-selected: imagen-4-fast for generation
          null, // No reference image for generation
          imageAbortController.signal
        );
      }
      
      console.log('[ChatBot] 🟡 Step 5: Image', isEditRequest ? 'edited' : 'generated', 'successfully');
      const generationTime = Math.round((Date.now() - thinkingStartTime) / 1000);
      
      console.log(`[ChatBot] Image ${isEditRequest ? 'edited' : 'generated'} in ${generationTime}s`);
      
      const assistantIntro = `${isEditRequest ? '[Edit Mode] ' : ''}I ${isEditRequest ? 'edited your image using the prompt' : 'translated your request to English and refined it for the image model'}:\n"${refinedPrompt}"\n\n`;
      const updatedMessage = {
        id: placeholderId,
        text: assistantIntro + `\n\n![Generated Image](${imageData.image.url})`,
        imageUrl: imageData.image.url,
        imageId: imageData.image.id,
        sender: 'bot',
        timestamp: new Date(),
        isImage: true,
        isThinking: false,
        generationTime: generationTime,
        isEditMode: isEditRequest,
      };
      
      console.log('[ChatBot] 🔴 updatedMessage.text length:', updatedMessage.text.length);
      console.log('[ChatBot] 🔴 updatedMessage.imageUrl:', updatedMessage.imageUrl);
      console.log('[ChatBot] 🔴 updatedMessage.imageId:', updatedMessage.imageId);
      console.log('[ChatBot] 🔴 updatedMessage.text preview:', updatedMessage.text.substring(0, 200));
      
      setMessages((_prev) => {
        const updated = _prev.map((msg) =>
          msg.id === placeholderId ? updatedMessage : msg
        );
        
        // Update conversations state with new messages (including imageUrl)
        setConversations((prevConvs) => {
          const updatedConvs = prevConvs.map(conv => 
            conv.id === currentConversationId
              ? { ...conv, messages: updated, updatedAt: new Date().toISOString() }
              : conv
          );
          
          console.log(`[ChatBot] Updated conversation ${currentConversationId} with image message`);
          console.log(`[ChatBot] Message text length: ${updatedMessage.text.length}, has imageUrl: ${!!updatedMessage.imageUrl}`);
          
          // Save conversation immediately with updated messages
          ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
            .catch(err => console.error('[ChatBot] Error saving conversation:', err));

          // Save generated/edited image to "Gambar Saya" (works for both local mode and logged-in mode)
          saveImageToGallery({
            id: `gen_${placeholderId}`,
            prompt: imageRequest?.prompt || refinedPrompt || 'Gambar Dihasilkan AI',
            imageUrl: imageData.image.url,
            type: isEditRequest ? 'edited' : 'generated',
            model: isEditRequest ? 'qwen-image-edit-max' : 'qwen-image'
          }, isAuthenticated, user).catch(e => console.warn('[ChatBot] Auto-save generated image error:', e));
          
          return updatedConvs;
        });
        
        return updated;
      });
      
      setConvLoading(false);
      
      // Auto-scroll to image
      setTimeout(() => {
        try {
          const msgEl = document.querySelector(`[data-msg-id="${placeholderId}"]`);
          if (msgEl) msgEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch (_e) {
          // ignore
        }
      }, 300);

      // CRITICAL: Clear the processing lock flag on success
      console.log('[ChatBot] Image generation completed successfully, clearing processing lock');
      isProcessingRef.current = false;
      
      // Clean up the abort controller
      abortControllersMapRef.current.delete('image-' + placeholderId);
      
    } catch (err) {
      console.error('[ChatBot] Image generation error:', err);

      // Don't show error if it was aborted (user cancelled)
      if (err.name === 'AbortError') {
        console.log('[ChatBot] Image generation cancelled by user');
        // Remove the thinking message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== placeholderId)
        );
      } else {
        const isSafetyErr = err.message && err.message.includes('melanggar kebijakan kami');
        const displayErrorMessage = isSafetyErr ? `❌ ${err.message}` : `❌ Gagal membuat gambar: ${err.message}`;

        // Update the thinking placeholder to show the failure clearly
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId
              ? {
                  ...msg,
                  text: displayErrorMessage,
                  isThinking: false,
                  isError: true,
                }
              : msg
          )
        );

        // Show error message in chat as a separate fallback
        const errorId = Date.now() + '_err';
        setMessages((prev) => [
          ...prev,
          {
            id: errorId,
            text: displayErrorMessage,
            sender: 'bot',
            timestamp: new Date(),
            isError: true,
          },
        ]);

        showErrorBanner(isSafetyErr ? err.message : `Failed to generate image: ${err.message}`);
      }

      setConvLoading(false);
      
      // CRITICAL: Clear the processing lock flag
      console.log('[ChatBot] Error occurred, clearing processing lock flag');
      isProcessingRef.current = false;
      
      // Clean up the abort controller
      abortControllersMapRef.current.delete('image-' + placeholderId);
    }
  };

  const checkForImageRequest = (message) => {
    return ImageGenerationService.detectImageRequest(message);
  };

  const shouldUseRagForInput = (input) => {
    if (!input || typeof input !== 'string') return false;
    const normalized = input.toLowerCase();
    const triggers = [
      'deepernova', 'deepernova', 'deeper nova', 'misi', 'visi', 'fitur', 'produk',
      'tim', 'donasi', 'panduan', 'dokumen', 'manual', 'spesifikasi', 'roadmap',
      'knowledge base', 'pengetahuan', 'layanan', 'kebijakan', 'harga', 'company',
      'team', 'founder', 'cara kerja', 'apa itu'
    ];
    return triggers.some(term => normalized.includes(term));
  };

  /**
   * Call the web search endpoint
   * Returns: { success, answer, searchResults, error }
   */


  const isDocumentGenerationRequest = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const norm = promptText.trim().toLowerCase();
    const docKeywords = [
      'buatkan file', 'bikin file', 'buat file', 'buatkan dokumen', 'bikin dokumen', 'buat dokumen',
      'buatkan makalah', 'bikin makalah', 'buat makalah', 'buatkan laporan', 'bikin laporan', 'buat laporan',
      'buatkan excel', 'bikin excel', 'buat excel', 'buatkan ppt', 'bikin ppt', 'buat ppt', 'buatkan presentasi',
      'buatkan spreadsheet', 'bikin spreadsheet', 'buat spreadsheet', 'generasi file', 'generasi dokumen'
    ];
    return docKeywords.some(k => norm.includes(k));
  };

  const isChatToDocumentRequest = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const norm = promptText.trim().toLowerCase();
    const chatDocKeywords = [
      'jadikan obrolan', 'bikin obrolan', 'ubah obrolan', 'ekspor obrolan', 'rangkum obrolan',
      'jadikan chat', 'bikin chat', 'ubah chat', 'ekspor chat', 'rangkum chat',
      'jadikan percakapan', 'bikin percakapan', 'ubah percakapan', 'ekspor percakapan',
      'dari chat ini', 'dari obrolan ini', 'dari percakapan ini', 'dari diskusi ini',
      'jadikan file', 'jadikan dokumen', 'bikin file dari diskusi', 'ubah diskusi jadi file'
    ];
    return chatDocKeywords.some(k => norm.includes(k));
  };

  const handleDocumentTransitionSequence = (topic, docType, userMessage, chatContext = '') => {
    const cardMsgId = `asst_${Date.now()}`;
    const isFromChat = !!chatContext;
    const step1Label = isFromChat 
      ? `📝 *Mengumpulkan seluruh riwayat obrolan & merancang dokumen...*`
      : `📝 *Menganalisis instruksi & menyiapkan agen pembuat file...*`;

    const initialText = `📝 **PERMINTAAN PEMBUATAN FILE TERDETEKSI**\n\n📌 **Topik & Obrolan:** "${topic}"\n\n\`[Step 1/3 - 0s]\` ${step1Label}`;

    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: cardMsgId,
        sender: 'assistant',
        timestamp: new Date(),
        text: initialText
      }
    ]);

    // Interval 2 detik: Step 2
    setTimeout(() => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === cardMsgId) {
          return {
            ...msg,
            text: `📝 **PERMINTAAN PEMBUATAN FILE TERDETEKSI**\n\n📌 **Topik & Obrolan:** "${topic}"\n\n✅ \`[Step 1/3]\` ${isFromChat ? 'Riwayat obrolan terkumpul' : 'Instruksi dianalisis'}.\n\`[Step 2/3 - 2s]\` ⚙️ *Mempersiapkan Typernova Document Studio...*`
          };
        }
        return msg;
      }));
    }, 2000);

    // Interval 2 detik berikutnya: Step 3 (Total 4s) -> Switch view to Typernova!
    setTimeout(() => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === cardMsgId) {
          return {
            ...msg,
            text: `📝 **PERMINTAAN PEMBUATAN FILE TERDETEKSI**\n\n📌 **Topik & Obrolan:** "${topic}"\n\n✅ \`[Step 1/3]\` ${isFromChat ? 'Riwayat obrolan terkumpul' : 'Instruksi dianalisis'}.\n✅ \`[Step 2/3]\` Typernova Studio Siap.\n🚀 \`[Step 3/3 - 4s]\` *Mengalihkan rute & memicu penulisan file otomatis di Typernova!*`
          };
        }
        return msg;
      }));

      setTimeout(() => {
        localStorage.setItem('pending_agent_topic', topic);
        if (chatContext) {
          localStorage.setItem('pending_chat_context', chatContext);
        }
        onNavigate?.('documents', docType);
      }, 600);
    }, 4000);
  };

  const handleSendMessage = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Check 700k Token Limit
    if (isTokenUsageLimited()) {
      showAlert(
        userLanguage === 'id'
          ? `⚠️ Limit token 700.000 telah tercapai. Penggunaan token akan di-reset dalam ${countdownText || '4 jam'}.`
          : `⚠️ Token limit 700,000 reached. Token usage will reset in ${countdownText || '4 hours'}.`,
        'error',
        5000
      );
      return;
    }

    if (inputValue.trim().startsWith('/')) {
      handleExecuteCommand(inputValue.trim());
      return;
    }

    const isChatExport = isChatToDocumentRequest(inputValue);
    if (isDocumentGenerationRequest(inputValue) || isChatExport) {
      const userMessage = {
        id: `user_${Date.now()}`,
        text: inputValue.trim(),
        sender: 'user',
        timestamp: new Date(),
      };
      
      let topic = inputValue.trim();
      let chatContext = '';

      if (isChatExport) {
        chatContext = messages.map(m => `[${m.sender === 'user' ? 'Pengguna' : 'AI Assistant'}]: ${m.text || m.content || ''}`).join('\n\n');
        const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
        const mainSubject = lastUserMsg ? lastUserMsg.text.slice(0, 60) : 'Diskusi ChatBot';
        topic = `Dokumen Rangkuman Diskusi: ${mainSubject}`;
      }

      let docType = 'word';
      if (topic.toLowerCase().includes('excel') || topic.toLowerCase().includes('spreadsheet')) docType = 'excel';
      else if (topic.toLowerCase().includes('ppt') || topic.toLowerCase().includes('presentasi')) docType = 'ppt';

      setInputValue('');
      setUploadedFiles([]);
      setTextQueue([]);
      if (globalThis.textareaRef) globalThis.textareaRef.style.height = 'auto';

      handleDocumentTransitionSequence(topic, docType, userMessage, chatContext);
      return;
    }

    // Check if there's any message content to send (regular text OR text queue OR uploaded images OR uploaded files)
    const hasRegularText = inputValue.trim().length > 0;
    const hasQueuedText = textQueue.length > 0;
    const hasUploadedImages = uploadedImages.length > 0;
    const hasUploadedFiles = uploadedFiles.length > 0;

    console.log('[DEBUG] hasRegularText:', hasRegularText, 'inputValue:', inputValue);
    console.log('[DEBUG] hasQueuedText:', hasQueuedText, 'hasUploadedImages:', hasUploadedImages, 'hasUploadedFiles:', hasUploadedFiles);

    if (!hasRegularText && !hasQueuedText && !hasUploadedImages && !hasUploadedFiles) {
      console.log('[DEBUG] No content to send, returning');
      return;
    }

    // Instant offline check: Prevent sending and show connection modal immediately if offline
    if (!navigator.onLine) {
      console.warn('[ChatBot] Cannot send message: offline detected');
      isProcessingRef.current = false;
      setConvLoading(false);
      setConnectionErrorMessage(
        userLanguage === 'id'
          ? 'Tidak ada koneksi internet. Pesan Anda tidak terkirim. Silakan periksa jaringan Anda.'
          : 'No internet connection. Your message was not sent. Please check your network connection.'
      );
      setShowConnectionErrorModal(true);
      return;
    }

    const safeStringify = (value, maxLen = 30000) => {
      if (value == null) return '';
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return str.length > maxLen ? `${str.slice(0, maxLen)}\n...[TRUNCATED]` : str;
    };

    const queuedTextContent = textQueue
      .map(item => safeStringify(item.content, 20000))
      .filter(Boolean)
      .join('\n\n')
      .trim();
    const activeFileContent = activeFile ? safeStringify(activeFile.content, 20000) : '';
    const uploadedFilesContent = uploadedFiles
      .map((file, index) => `=== ATTACHED FILE ${index + 1}: ${file.name} ===\n${safeStringify(file.content, 20000)}`)
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const fullMessageParts = [];
    if (inputValue.trim()) fullMessageParts.push(inputValue.trim());
    if (queuedTextContent) fullMessageParts.push(queuedTextContent);
    if (activeFileContent) {
      fullMessageParts.push(`File: ${activeFile.name || 'unknown'}\n${activeFileContent}`);
    }
    if (uploadedFilesContent) fullMessageParts.push(uploadedFilesContent);

    let fullMessage = fullMessageParts.join('\n\n').trim();
    if (!fullMessage) {
      fullMessage = userLanguage === 'id'
        ? 'Silakan periksa berkas atau gambar terlampir.'
        : 'Please review the attached files or images.';
    }

    console.log('[DEBUG] fullMessage:', fullMessage.substring(0, 2000));
    isUserStoppedRef.current = false;

    const userMessageForChat = {
      id: `user_${Date.now()}`,
      text: fullMessage,
      sender: 'user',
      timestamp: new Date(),
      textQueue: textQueue.length > 0 ? textQueue : undefined,
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles.map(file => ({ id: file.id, name: file.name, size: file.size })) : undefined,
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
    };

    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const botMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };

    const updatedConversationHistory = [...messages, userMessageForChat];
    setMessages(prev => [...prev, userMessageForChat, botMessage]);
    lastSentPromptRef.current = fullMessage;
    lastSentUserMessageIdRef.current = userMessageForChat.id;
    lastSentUserInputTextRef.current = inputValue.trim() || fullMessage;
    currentMessageIdRef.current = placeholderId;

    // Reset internet warning banner & start progressive loading phase timers (Mengirim -> Merenungi -> Lambat)
    setShowNoInternetBanner(false);
    startLoadingPhaseTimers();
    if (timeoutInternetCheckRef.current) clearTimeout(timeoutInternetCheckRef.current);

    // 1. Capture uploaded images to RAM state BEFORE clearing UI input tray
    const imagesToActivate = uploadedImages.map(img => ({
      ...img,
      followUpRemaining: img.followUpRemaining != null ? img.followUpRemaining : 20,
      activatedAt: Date.now(),
    }));

    // Auto-save reference images to permanent gallery storage (local & logged-in modes)
    imagesToActivate.forEach(img => {
      saveImageToGallery({
        id: img.id,
        prompt: `Referensi: ${img.fileName || 'Gambar'}`,
        imageUrl: img.publicUrl || img.dataUrl || img.url,
        type: 'uploaded',
        model: 'user-upload'
      }, isAuthenticated, user).catch(e => console.warn('[ChatBot] Gallery save warning:', e));
    });

    // Reference images for current turn:
    // If user uploaded new image(s) in this message, use ONLY the new image(s) (do NOT merge previous images).
    // If user didn't upload new image, retain the active image context from the immediate previous turn.
    let imagesToPass = [];
    if (imagesToActivate.length > 0) {
      setActiveImageFollowUps(imagesToActivate);
      imagesToPass = imagesToActivate;
      capturedRefImagesRef.current = imagesToActivate;
    } else {
      imagesToPass = activeImageFollowUps;
      capturedRefImagesRef.current = activeImageFollowUps;
    }

    // 2. IMMEDIATELY CLEAR INPUT TRAY UI STATE (input text, uploaded images preview, uploaded files)
    setInputValue('');
    setTextQueue([]);
    setUploadedImages([]);
    setUploadedFiles([]);
    setAttachmentQueueMinimized(true);
    if (globalThis.textareaRef) globalThis.textareaRef.style.height = 'auto';
    if (currentConversationId) {
      localStorage.removeItem(`deepernova_images_${currentConversationId}`);
    }

    const detectedImageRequest = checkForImageRequest(inputValue);
    if (detectedImageRequest && detectedImageRequest.isExplicit) {
      console.log('[ChatBot] Explicit image request directive detected in handleSendMessage:', detectedImageRequest);
      handleInlineImageGeneration(detectedImageRequest, userMessageForChat, imagesToPass);
      return;
    }
    
    // Keep the visual payload available for the model, but do not force a UI decision.
    // The assistant should decide naturally whether to read an image or edit it.
    if (imagesToPass.length > 0 && !isReasoningImage) {
      setReasoningImages(imagesToPass);
      setReasoningPrompt(inputValue);
      setReasoningDecision(null);
    }

    // Status messages that change based on elapsed time - longer intervals for believability
    // Pre-calculate random delays for consistency
    const statusMessages = [
      { time: 2000, msg: userLanguage === 'id' ? 'membaca pertanyaan...' : 'reading question...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 4000, msg: userLanguage === 'id' ? 'memproses konteks...' : 'processing context...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 7000, msg: userLanguage === 'id' ? 'menganalisis informasi...' : 'analyzing information...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 10000, msg: userLanguage === 'id' ? 'sedang berpikir...' : 'thinking...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 13000, msg: userLanguage === 'id' ? 'menghitung respons...' : 'calculating response...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 16000, msg: userLanguage === 'id' ? 'menyusun jawaban...' : 'composing answer...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 19000, msg: userLanguage === 'id' ? 'memvalidasi data...' : 'validating data...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 22000, msg: userLanguage === 'id' ? 'mengorganisir informasi...' : 'organizing information...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 25000, msg: userLanguage === 'id' ? 'menyiapkan output...' : 'preparing output...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 28000, msg: userLanguage === 'id' ? 'finalisasi respons...' : 'finalizing response...', randomDelay: (Math.random() - 0.5) * 800 },
    ];
    
    // Set up status update interval
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
    }
    
    statusUpdateIntervalRef.current = setInterval(() => {
      if (streamingStartTimeRef.current) {
        const elapsed = Date.now() - streamingStartTimeRef.current;
        let matchedMsg = '';
        
        for (let i = statusMessages.length - 1; i >= 0; i--) {
          // Use the pre-calculated random delay for consistency
          if (elapsed > statusMessages[i].time + statusMessages[i].randomDelay) {
            matchedMsg = statusMessages[i].msg;
            break;
          }
        }
        
        setLoadingStatusMsg(matchedMsg);
      }
    }, 500); // Check every 500ms for smooth updates
    
    setConvLoading(true);
    setError(null);
    setIsScrolledUp(false); // Hide scroll button
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    // Store controller per conversation so it survives room switches
    if (currentConversationId) {
      abortControllersMapRef.current.set(currentConversationId, abortController);
    }
    
    // SCROLL PERTAMA - langsung setelah user message ditambah
    // Ensure auto-scroll isn't being held
    holdScrollRef.current = false;
    setTimeout(() => {
      try {
        const scrollEl = document.querySelector('.messages-container');
        const msgEl = document.querySelector(`[data-msg-id="${userMessageForChat.id}"]`);
        if (msgEl && scrollEl) {
          // Add large spacer so the area below appears empty for generation
          try { scrollEl.classList.add('prefill-space'); } catch (_e) {
            // ignore
          }
          // Align the new user message to the top of the viewport so the empty area appears below
          msgEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          // Clamp scrollTop so we don't exceed available scroll range
          const maxTop = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (scrollEl.scrollTop > maxTop) scrollEl.scrollTop = maxTop;
        } else {
          // Fallback to force-bottom if element not found
          scrollToBottom(true);
          setTimeout(() => scrollToBottom(true), 10);
        }
      } catch (err) {
        console.log('Initial scroll error:', err);
        scrollToBottom(true);
      }
    }, 0);

    try {
      // Send to Deepernova AI with conversation history for advanced context
      // Use fullMessage (with file contents) instead of inputValue
      // Capture conversationId NOW so it's used in streaming callback, not currentConversationId (which can change)
      const streamingConversationId = currentConversationId;
      
      const response = await sendMessageToGrok(fullMessage, updatedConversationHistory, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, sessionMessageCount + 1, imagesToPass);

      // Process streaming response - do NOT start local simulated streaming
      // Keep the placeholder and show the empty area below the user's message.
      // Add prefill-space to indicate the area reserved for the AI response
      const scrollElForPrefill = document.querySelector('.messages-container');
      if (scrollElForPrefill) {
        try {
          scrollElForPrefill.classList.add('prefill-space');
          // Do NOT call scrollToBottom here — keep the viewport so the empty area is visible
        } catch (e) {
          console.log('Error adding prefill-space:', e);
        }
      }

      // Declare accumulatedText and reasoning tracking variables
      let rawText = '';
      let targetFullText = '';
      let displayedFullText = '';
      let targetReasoningText = '';
      let displayedReasoningText = '';
      let reasoningStartTime = null;
      let reasoningEndTime = null;
      let isReasoning = false;
      let reasoningDuration = null;
      let streamDone = false;
      currentStreamingTextRef.current = '';

      let streamUsage = null;
      let smoothStreamTimer = null;

      const flushSmoothTick = () => {
        // Bail immediately if aborted (stop button pressed)
        if (abortController.signal.aborted) {
          if (smoothStreamTimer) {
            clearInterval(smoothStreamTimer);
            smoothStreamTimer = null;
            smoothStreamTimerRef.current = null;
          }
          return;
        }
        let updated = false;

        // 1. Smoothly advance reasoning text
        if (displayedReasoningText.length < targetReasoningText.length) {
          const diff = targetReasoningText.length - displayedReasoningText.length;
          const step = streamDone ? Math.max(12, Math.ceil(diff / 2)) : Math.max(1, Math.min(diff, Math.ceil(diff / 2.5)));
          displayedReasoningText += targetReasoningText.substr(displayedReasoningText.length, step);
          updated = true;
        }

        // 2. Smoothly advance main content text
        if (displayedFullText.length < targetFullText.length) {
          const diff = targetFullText.length - displayedFullText.length;
          const step = streamDone ? Math.max(16, Math.ceil(diff / 2)) : Math.max(1, Math.min(diff, Math.ceil(diff / 2.5)));
          displayedFullText += targetFullText.substr(displayedFullText.length, step);
          currentStreamingTextRef.current = displayedFullText;
          updated = true;
        }

        if (updated) {
          // When stream is done AND display has caught up, mark as NOT streaming anymore
          const stillFlushing = displayedFullText.length < targetFullText.length || displayedReasoningText.length < targetReasoningText.length;
          const streamingFlag = streamDone ? stillFlushing : true;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? {
                    ...msg,
                    text: displayedFullText,
                    reasoningText: displayedReasoningText,
                    reasoningDuration: reasoningDuration || msg.reasoningDuration,
                    isReasoning: isReasoning,
                    isReasoningComplete: !isReasoning && !!displayedReasoningText,
                    isStreaming: streamingFlag,
                    isThinking: isReasoning,
                  }
                : msg
            )
          );
        }
      };

      const startSmoothStreamer = () => {
        if (!smoothStreamTimer) {
          smoothStreamTimer = setInterval(flushSmoothTick, 18);
          smoothStreamTimerRef.current = smoothStreamTimer;
        }
      };

      // Process streaming response - chunks come in real-time
      const streamResult = await processStreamingResponse(response, (chunk) => {
        // Clear loading phase timers once tokens start streaming
        clearLoadingPhaseTimers();
        if (timeoutInternetCheckRef.current) {
          clearTimeout(timeoutInternetCheckRef.current);
          timeoutInternetCheckRef.current = null;
        }

        // Handle stepper-type updates (don't accumulate as text)
        if (typeof chunk === 'object' && chunk.type === 'stepper') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? { ...msg, stepperData: chunk.data }
                : msg
            )
          );
          return;
        }

        // Handle live reasoning chunk from DeepSeek
        if (typeof chunk === 'object' && chunk.type === 'reasoning') {
          if (!reasoningStartTime) {
            reasoningStartTime = Date.now();
            isReasoning = true;
          }
          targetReasoningText += chunk.content;
          startSmoothStreamer();
          return;
        }
        
        // Handle regular text / content chunk with smooth fluid render
        const textContent = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
        if (textContent) {
          if (isReasoning && !reasoningEndTime) {
            reasoningEndTime = Date.now();
            isReasoning = false;
            reasoningDuration = Math.max(0.1, ((reasoningEndTime - reasoningStartTime) / 1000)).toFixed(1);
          }

          rawText += textContent;
          targetFullText = sanitizeStreamingText(rawText);
          triggerInlineImageIfNeeded(placeholderId, rawText);
          triggerWebSearchIfNeeded(placeholderId, rawText);
          triggerRecallMemoryIfNeeded(placeholderId, rawText);
          triggerMemoryActionsIfNeeded(placeholderId, rawText);
          if (triggeredSearchRequestsRef.current.has(placeholderId) || triggeredRecallRequestsRef.current.has(placeholderId)) {
            return;
          }
          startSmoothStreamer();
        }
        // Do not auto-scroll here; keep the blank area stable while generating
      }, abortController.signal);
      streamUsage = streamResult?.usage || null;

      if (abortController.signal.aborted || isUserStoppedRef.current) {
        if (smoothStreamTimer) {
          clearInterval(smoothStreamTimer);
          smoothStreamTimer = null;
          smoothStreamTimerRef.current = null;
        }
        if (!isSearchAbortedRef.current && !isRecallAbortedRef.current) {
          setConvLoading(false);
          setLoading(false);
          setLoadingPhase(null);
          isProcessingRef.current = false;
        }
        return;
      }

      streamDone = true;

      // Drain any pending smooth stream buffer rapidly
      let drainSafetyLimit = 0;
      while ((displayedFullText.length < targetFullText.length || displayedReasoningText.length < targetReasoningText.length) && drainSafetyLimit < 20) {
        if (abortController.signal.aborted) break;
        drainSafetyLimit++;
        flushSmoothTick();
        await new Promise((r) => setTimeout(r, 16));
      }

      if (smoothStreamTimer) {
        clearInterval(smoothStreamTimer);
        smoothStreamTimer = null;
        smoothStreamTimerRef.current = null;
      }

      displayedFullText = targetFullText;
      displayedReasoningText = targetReasoningText;
      fullText = targetFullText;

      if (reasoningStartTime && !reasoningDuration) {
        const endTime = reasoningEndTime || Date.now();
        reasoningDuration = Math.max(0.1, ((endTime - reasoningStartTime) / 1000)).toFixed(1);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                text: fullText,
                reasoningText: targetReasoningText || msg.reasoningText,
                reasoningDuration: reasoningDuration || msg.reasoningDuration,
                isReasoning: false,
                isReasoningComplete: !!(targetReasoningText || msg.reasoningText),
                isStreaming: false,
                isThinking: false,
              }
            : msg
        )
      );

      finishStreaming(placeholderId, fullText, streamUsage);
      setConvLoading(false);
      setLoading(false);
      clearLoadingPhaseTimers();

      if (abortController.signal.aborted) {
        return;
      }

      // ============================================================
      // 🔍 CHECK FOR SEARCH FLAG BEFORE ANY CLEANUP
      // This must happen FIRST so the search flow can take over
      // and the normal cleanup doesn't interfere.
      // ============================================================
      const hasSearchFlag = /\[SEARCH_REQUEST:\s*(.+?)\]/.test(fullText);
      if (hasSearchFlag) {
        // Trigger search immediately — this will handle its own cleanup
        triggerWebSearchIfNeeded(placeholderId, fullText);
        // Skip ALL normal completion cleanup — search flow handles it
        return;
      }

      // ============================================================
      // 🧠 CHECK FOR RECALL MEMORY FLAG BEFORE ANY CLEANUP
      // ============================================================
      const hasRecallFlag = /\[RECALL_MEMORY:\s*(.+?)\]/.test(fullText);
      if (hasRecallFlag) {
        triggerRecallMemoryIfNeeded(placeholderId, fullText);
        return;
      }

      // ============================================================
      // 🧠 CHECK FOR AUTONOMOUS MEMORY ACTIONS BEFORE CLEANUP
      // ============================================================
      triggerMemoryActionsIfNeeded(placeholderId, fullText);

      // ============================================================
      // ⏰ CHECK FOR AI REMINDER/ALARM/CALENDAR FLAG
      // ============================================================
      console.log('[ChatBot] Full AI response text:', fullText);
      console.log('[ChatBot] Contains REMINDER_REQUEST?', fullText.includes('REMINDER_REQUEST'));
      const reminderMatch = fullText.match(/\[REMINDER_REQUEST:\s*(\{[\s\S]*?\})\]/);
      console.log('[ChatBot] reminderMatch result:', reminderMatch);
      let createdReminder = null;
      if (reminderMatch) {
        try {
          const payload = JSON.parse(reminderMatch[1]);
          console.log('[ChatBot] Parsed reminder payload:', payload);
          createdReminder = reminderService.addReminder({
            title: payload.title || 'Pengingat',
            datetime: payload.datetime || new Date().toISOString(),
            type: payload.type || 'reminder',
            description: payload.description || 'Dibuat via AI Chatbot'
          });
          console.log('[ChatBot] Created reminder:', createdReminder);
          fullText = fullText.replace(/\[REMINDER_REQUEST:\s*\{[\s\S]*?\}\]\n*/g, '').trim();
        } catch (e) {
          console.error('[ChatBot] Error parsing REMINDER_REQUEST flag:', e);
        }
      } else {
        // Fallback: If AI did not output tag, check if user's prompt had explicit reminder/alarm intent
        const userPromptText = lastSentUserInputTextRef.current || '';
        const fallbackIntent = reminderService.parseReminderIntent(userPromptText);
        if (fallbackIntent) {
          createdReminder = reminderService.addReminder({
            title: fallbackIntent.title,
            datetime: fallbackIntent.datetime,
            type: fallbackIntent.type,
            description: fallbackIntent.description || 'Dibuat via AI Chatbot'
          });
          console.log('[ChatBot] Created reminder via fallback intent:', createdReminder);
        }
      }

      // finishStreaming already executed at line ~7276

      if (createdReminder) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId ? { ...msg, reminder: createdReminder } : msg
          )
        );
      }
      

      
      // Remove prefill-space setelah streaming selesai
      const scrollEl = document.querySelector('.messages-container');
      if (scrollEl) {
        try {
          scrollEl.classList.remove('prefill-space');
        } catch (e) {
          console.log('Error removing prefill-space:', e);
        }
      }
      // Scroll to bottom to reveal the completed AI response
      try {
        // Hold auto-scroll briefly so view doesn't jump unexpectedly
        holdScrollRef.current = true;
        scrollToBottom(true);
        setTimeout(() => scrollToBottom(true), 50);
        setTimeout(() => { holdScrollRef.current = false; }, 1200);
      } catch (e) {
        console.log('Error scrolling after streaming:', e);
      }
      

      
      // ✨ AI Self-Trigger Agent Detection
      // Parse [AGENT_EXECUTE: task_description] flag from response
      const agentExecuteMatch = fullText.match(/\[AGENT_EXECUTE:\s*([^\]]+)\]/);
      if (agentExecuteMatch) {
        const agentTaskDescription = agentExecuteMatch[1].trim();
        console.log(`[ChatBot] 🤖 AI triggered agent execution: "${agentTaskDescription}"`);
        
        // Remove the flag from displayed text
        const cleanedText = fullText.replace(/\s*\[AGENT_EXECUTE:[^\]]*\]/, '').trim();
        
        // Update message with cleaned text (without flag)
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const msgIndex = updatedMessages.findIndex(m => m.id === placeholderId);
          if (msgIndex !== -1) {
            updatedMessages[msgIndex] = {
              ...updatedMessages[msgIndex],
              text: cleanedText
            };
          }
          return updatedMessages;
        });

        // Prevent duplicate triggers for the same message
        if (triggeredAgentTasksRef.current.has(placeholderId)) {
          console.log(`[ChatBot] Agent task already triggered for message ${placeholderId}, skipping duplicate execution`);
        } else {
          triggeredAgentTasksRef.current.add(placeholderId);

          // Queue agent execution asynchronously to avoid blocking
          setTimeout(async () => {
            // Track background agent tasks to avoid showing premature error banners
            backgroundAgentCountRef.current += 1;
            try {
              console.log(`[ChatBot] Executing agent task: ${agentTaskDescription}`);
              const userId = user?.id || 'guest';
              
              // Call agent endpoint
              const response = await fetch(`${API_BASE_URL}/api/agent/execute`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  task: agentTaskDescription,
                  userId: userId
                })
              });
              
              if (!response.ok) {
                console.error(`Agent execution failed: ${response.status}`);
                return;
              }
              
              const result = await response.json();
              console.log(`[ChatBot] Agent execution completed:`, result);
              
              // If file was generated, add download link to message
              if (result.success && result.fileName && result.downloadUrl) {
                setMessages((prevMessages) => {
                  const updatedMessages = [...prevMessages];
                  const msgIndex = updatedMessages.findIndex(m => m.id === placeholderId);
                  if (msgIndex !== -1) {
                    updatedMessages[msgIndex] = {
                      ...updatedMessages[msgIndex],
                      downloadUrl: result.downloadUrl,
                      fileName: result.fileName,
                      agentResult: result
                    };
                  }
                  return updatedMessages;
                });
              }
            } catch (err) {
              console.error('[ChatBot] Agent execution error:', err);
            } finally {
              backgroundAgentCountRef.current = Math.max(0, backgroundAgentCountRef.current - 1);
            }
          }, 500);
        }
      }
      
      // finishStreaming already called at drain completion (line ~7231) — no duplicate call needed
      
      setAnimatingMessages((prev) => ({ ...prev, [placeholderId]: false }));
      setLastMessage(null);
      setLoading(false);
      setConvLoading(false); // Mark this conversation as done loading
      clearLoadingPhaseTimers();
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }

      // Immediate save after response completes
      const saveAfterResponse = async () => {
        console.log(`[ChatBot] Saving conversation after response completed`);
        await ConversationPersistenceService.saveConversations(conversations, isAuthenticated, isGuest);
      };
      setTimeout(() => saveAfterResponse(), 100);

      // Clear uploaded files and images, then minimize image queue
      setTimeout(() => {
        setUploadedFiles([]);
        setUploadedImages([]);
        setAttachmentQueueMinimized(true);
        // Also clear from localStorage
        if (currentConversationId) {
          localStorage.removeItem(`deepernova_images_${currentConversationId}`);
        }
      }, 200);

      // After successful finish, keep compact view focused (at bottom)
      setCompactView(true);

      // Only trigger inline image generation when the assistant explicitly emits an IMAGE_REQUEST tag.
      const textForImageTrigger = fullText;
      triggerInlineImageIfNeeded(placeholderId, textForImageTrigger);

      // Process and store memories from this interaction
      memoryService.processConversation([...messages, userMessageForChat], currentConversationId, userLanguage);

      // Generate AI-powered chat title after first response (only once per session)
      const titleConvId = currentConversationId;
      setTimeout(() => {
        if (titleConvId) {
          if (!aiTitledConversationsRef.current.has(titleConvId)) {
            generateChatTitle(titleConvId);
          }
          // Load sources for display
          loadSourcesForConversation(titleConvId);
        }
      }, 500);
      
      // Reset auto-retry counter on success
      autoRetryCountRef.current = 0;
    } catch (err) {
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
      clearLoadingPhaseTimers();
      if (timeoutInternetCheckRef.current) {
        clearTimeout(timeoutInternetCheckRef.current);
        timeoutInternetCheckRef.current = null;
      }

      const isAborted = isUserStoppedRef.current ||
                        abortController?.signal?.aborted ||
                        err.name === 'AbortError' ||
                        (err.message && /abort|cancel/i.test(err.message));

      if (isAborted) {
        if (isSearchAbortedRef.current || isRecallAbortedRef.current) {
          // DON'T reset the flag here — the search/recall flow will handle it
          return;
        }
        if (autoRetryTimeoutRef.current) {
          clearTimeout(autoRetryTimeoutRef.current);
          autoRetryTimeoutRef.current = null;
        }
        autoRetryCountRef.current = 0;
        partialMessageIdRef.current = null;
        isProcessingRef.current = false;
        setConvLoading(false);
        setLoading(false);
        setLoadingPhase(null);
        showErrorBanner(userLanguage === 'id' ? 'Permintaan dihentikan.' : 'Request stopped.');
        return;
      } else {
        const isNetworkErr = !navigator.onLine || 
          (err.message && /failed to fetch|network|offline|load failed|timeout/i.test(err.message));

        const hasAnyContent = !!(fullText || rawText || displayedFullText);
        // If offline or network error or retry exhausted, ONLY rollback if zero response was ever received!
        if (!hasAnyContent && (isNetworkErr || autoRetryCountRef.current >= MAX_AUTO_RETRY)) {
          // Rollback: restore input text to input field
          setInputValue(lastSentUserInputTextRef.current || fullMessage || '');

          // Remove bot placeholder and user message from conversation history
          if (placeholderId || lastSentUserMessageIdRef.current) {
            setMessages((prev) =>
              prev.filter((m) => m.id !== placeholderId && m.id !== lastSentUserMessageIdRef.current)
            );
          }

          // Show blurred popup connection error modal
          setConnectionErrorMessage(
            userLanguage === 'id'
              ? 'Pesan Anda tidak terkirim karena masalah koneksi internet. Teks Anda telah dikembalikan ke kolom input.'
              : 'Your message was not sent due to network connection issues. Your text has been restored to the input box.'
          );
          setShowConnectionErrorModal(true);

          autoRetryCountRef.current = 0;
          setConvLoading(false);
          isProcessingRef.current = false; // Clear lock only when giving up
        } else if (hasAnyContent) {
          // Content was partially received, just finalize what we have without deleting!
          finishStreaming(placeholderId, fullText || rawText || displayedFullText);
          setConvLoading(false);
          setLoading(false);
          isProcessingRef.current = false;
        } else {
          // Auto-retry with exponential backoff
          if (placeholderId) {
            partialMessageIdRef.current = placeholderId;
          }
          autoRetryCountRef.current += 1;
          const delayMs = 1000 * autoRetryCountRef.current; // 1s, 2s, 3s
          
          console.log(`[Auto-Retry] Attempt ${autoRetryCountRef.current}/${MAX_AUTO_RETRY} in ${delayMs}ms`);
          
          // Clear any existing timeout
          if (autoRetryTimeoutRef.current) {
            clearTimeout(autoRetryTimeoutRef.current);
          }
          
          autoRetryTimeoutRef.current = setTimeout(() => {
            console.log(`[Auto-Retry] Retrying now...`);
            handleRetryAuto();
          }, delayMs);
          
          setConvLoading(false);
          setError(null);
          return;
        }
      }
      abortControllerRef.current = null;
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
    } finally {
      clearLoadingPhaseTimers();
      if (timeoutInternetCheckRef.current) {
        clearTimeout(timeoutInternetCheckRef.current);
        timeoutInternetCheckRef.current = null;
      }
      if (isProcessingRef.current && !isSearchAbortedRef.current && !isRecallAbortedRef.current) {
        isProcessingRef.current = false;
        console.log('[ChatBot] 🔓 Processing lock cleared - ready for next message');
      }
    }
  };

  const triggerInlineImageIfNeeded = (messageId, text) => {
    if (!text) return;
    
    // Find all matches globally
    const matches = [...text.matchAll(/\[IMAGE_REQUEST:\s*(.+?)\]/g)];
    if (matches.length === 0) return;
    
    // Check if we already processed this messageId
    if (triggeredImageRequestsRef.current.has(messageId)) {
      return;
    }
    triggeredImageRequestsRef.current.add(messageId);
    
    console.log(`[ChatBot] 🎨 IMAGE_REQUESTs detected: ${matches.length} images for message ${messageId}`);
    
    // Initialize states for all detected images
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { 
              ...msg, 
              isImageGenerating: true,
              imageUrls: msg.imageUrls || [],
              imageErrors: msg.imageErrors || [],
              imageGeneratingStates: matches.map(() => true)
            }
          : msg
      )
    );

    // Process each image request in parallel
    matches.forEach((match, index) => {
      const imagePrompt = match[1].trim();
      setTimeout(async () => {
        try {
          console.log(`[ChatBot] Starting in-place image #${index+1} generation for:`, imagePrompt);
          let englishPrompt = await ImageGenerationService.generateEnglishImagePrompt(imagePrompt);
          if (!englishPrompt) {
            englishPrompt = ImageGenerationService.translateToEnglish(imagePrompt);
          }
          const refinedPrompt = ImageGenerationService.enhancePrompt(englishPrompt);
          
          const imageAbortController = new AbortController();
          abortControllersMapRef.current.set(`image-${messageId}-${index}`, imageAbortController);

          const availableRefList = (capturedRefImagesRef.current && capturedRefImagesRef.current.length > 0)
            ? capturedRefImagesRef.current
            : ((uploadedImages && uploadedImages.length > 0)
              ? uploadedImages
              : (activeImageFollowUps && activeImageFollowUps.length > 0 ? activeImageFollowUps : []));

          // Helper to find targeted photo index from prompt (1st, 2nd, 3rd, 4th, etc.)
          const findTargetPhotoIndex = (text = '') => {
            if (!text || typeof text !== 'string') return -1;
            const lower = text.toLowerCase();
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?5|kelima|5|five)\b|\b(?:ke-?5|kelima)\s*(?:foto|gambar)\b/i.test(lower)) return 4;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?4|keempat|4|four)\b|\b(?:ke-?4|keempat)\s*(?:foto|gambar)\b/i.test(lower)) return 3;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?3|ketiga|3|three)\b|\b(?:ke-?3|ketiga)\s*(?:foto|gambar)\b/i.test(lower)) return 2;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?2|kedua|2|two|second)\b|\b(?:ke-?2|kedua)\s*(?:foto|gambar)\b/i.test(lower)) return 1;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?1|pertama|kesatu|1|one|first)\b|\b(?:ke-?1|pertama|kesatu)\s*(?:foto|gambar)\b/i.test(lower)) return 0;
            if (/\b(?:foto|gambar|image)\s*(?:terakhir|paling akhir|last)\b/i.test(lower)) return 999;
            return -1;
          };

          // Smart reference image picker based on imagePrompt, userPrompt, or iteration index
          let activeRefObj = null;
          if (availableRefList.length > 0) {
            const promptTargetIdx = findTargetPhotoIndex(imagePrompt);
            const userTargetIdx = findTargetPhotoIndex(lastSentUserInputTextRef.current || '');

            if (promptTargetIdx >= 0) {
              activeRefObj = promptTargetIdx === 999
                ? availableRefList[availableRefList.length - 1]
                : (availableRefList[promptTargetIdx] || availableRefList[0]);
            } else if (userTargetIdx >= 0) {
              activeRefObj = userTargetIdx === 999
                ? availableRefList[availableRefList.length - 1]
                : (availableRefList[userTargetIdx] || availableRefList[0]);
            } else if (matches.length > 1) {
              activeRefObj = availableRefList[index] || availableRefList[0];
            } else {
              activeRefObj = availableRefList[0];
            }
          }

          const refImg = activeRefObj ? (activeRefObj.dataUrl || activeRefObj.url || activeRefObj.base64 || (typeof activeRefObj === 'string' ? activeRefObj : null)) : null;
          console.log(`[ChatBot] Generating image #${index+1} with targeted reference image:`, refImg ? (typeof refImg === 'string' ? refImg.substring(0, 30) + '...' : 'present') : 'none');

          const imageData = await ImageGenerationService.generateImage(
            refinedPrompt,
            '1024x1024',
            currentConversationId,
            null,
            refImg,
            imageAbortController.signal
          );

          console.log(`[ChatBot] Image #${index+1} generated successfully:`, imageData.image.url);

          setMessages((prev) => {
            const updated = prev.map((msg) => {
              if (msg.id === messageId) {
                const newUrls = [...(msg.imageUrls || [])];
                newUrls[index] = imageData.image.url;
                
                const newStates = [...(msg.imageGeneratingStates || [])];
                newStates[index] = false;
                
                // Keep legacy fields populated using the first generated image
                const firstUrl = newUrls.find(u => u) || imageData.image.url;

                return { 
                  ...msg, 
                  imageUrl: firstUrl, 
                  imageUrls: newUrls,
                  imageGeneratingStates: newStates,
                  isImage: false,
                  isImageGenerating: newStates.some(state => state)
                };
              }
              return msg;
            });

            setConversations((prevConvs) => {
              const updatedConvs = prevConvs.map(conv => 
                conv.id === currentConversationId
                  ? { ...conv, messages: updated, updatedAt: new Date().toISOString() }
                  : conv
              );
              ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
                .catch(err => console.error('[ChatBot] Error saving conversation:', err));
              return updatedConvs;
            });

            return updated;
          });
          
          abortControllersMapRef.current.delete(`image-${messageId}-${index}`);
        } catch (err) {
          console.error(`[ChatBot] Error generating image #${index+1}:`, err);
          const isSafetyErr = err.message && (err.message.includes('melanggar kebijakan') || err.message.includes('kebijakan'));
          const displayErrorMessage = isSafetyErr ? err.message : 'Model gambar sedang sangat sibuk, coba lagi nanti.';

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const newErrors = [...(msg.imageErrors || [])];
                newErrors[index] = displayErrorMessage;
                
                const newStates = [...(msg.imageGeneratingStates || [])];
                newStates[index] = false;

                return { 
                  ...msg, 
                  imageErrors: newErrors,
                  imageGeneratingStates: newStates,
                  isImageGenerating: newStates.some(state => state)
                };
              }
              return msg;
            })
          );
        }
      }, index * 150);
    });
  };

  const triggerWebSearchIfNeeded = (messageId, text) => {
    if (!text) return;
    const searchRequestMatch = text.match(/\[SEARCH_REQUEST:\s*(.+?)\]/);
    if (searchRequestMatch && searchRequestMatch[1]) {
      const searchQuery = searchRequestMatch[1].trim();
      
      if (triggeredSearchRequestsRef.current.has(messageId)) {
        return; // Already triggered!
      }
      triggeredSearchRequestsRef.current.add(messageId);
      
      console.log(`[ChatBot] 🔍 SEARCH_REQUEST detected: "${searchQuery}" for message ${messageId}`);
      
      // 1) Immediately strip [SEARCH_REQUEST: ...] from the streaming text ref
      //    so the typing animation never renders the raw tag
      const cleanedStreamingText = text.replace(/\[SEARCH_REQUEST:\s*(.+?)\]/g, '').trim();
      currentStreamingTextRef.current = cleanedStreamingText;
      
      // 2) Stop current stream if still active
      if (abortControllerRef.current) {
        isSearchAbortedRef.current = true;
        abortControllerRef.current.abort();
      }
      
      // 3) Stop typing animation and status updates immediately
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
      
      // 4) Remove prefill-space
      const scrollEl = document.querySelector('.messages-container');
      if (scrollEl) {
        try { scrollEl.classList.remove('prefill-space'); } catch (e) {}
      }

      // 5) Mark the message as searching (keep any non-tag text the AI may have output)
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const initialSteps = msg.searchSteps || [];
            // Only add if not already present
            if (!initialSteps.some(s => s.query === searchQuery)) {
              initialSteps.push({
                query: searchQuery,
                isSearching: true,
                sources: [],
                images: []
              });
            }
            return { 
              ...msg, 
              text: cleanedStreamingText || msg.text || '', // preserve any pre-tag text, just strip the tag
              isStreaming: false,
              isSearching: true, 
              searchQuery: searchQuery, 
              searchResults: null, 
              searchSources: [],
              searchSteps: initialSteps
            };
          }
          return msg;
        })
      );

      // 6) Execute search immediately (no setTimeout delay)
      (async () => {
        try {
          console.log('[ChatBot] Fetching search results from backend proxy (relative URL to avoid CORS)');
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Search API returned status ${response.status}`);
          }
          
          const searchData = await response.json();
          
          console.log('[ChatBot] Search results received:', searchData);
          
          let resultsList = [];
          let aiOverviewText = '';
          if (searchData.success && searchData.data) {
            // Standard Google engine returns organic_results
            resultsList = searchData.data.organic_results || [];
            // Bonus: AI overview text if available
            aiOverviewText = searchData.data._ai_overview_text || '';
          }
          
          // If no organic results, log a warning
          if (resultsList.length === 0) {
            console.warn('[ChatBot] No organic_results from search API');
          }
          
          // Extract search images from results (inline images, organic thumbnails, and news images)
          const searchImages = [];
          if (searchData.success && searchData.data) {
            // 1. Extract from inline_images
            if (searchData.data.inline_images && Array.isArray(searchData.data.inline_images)) {
              searchData.data.inline_images.forEach(img => {
                if (img.thumbnail || img.link) {
                  let sourceDomain = '';
                  if (img.source) {
                    try {
                      sourceDomain = new URL(img.source).hostname.replace('www.', '');
                    } catch(e) {
                      sourceDomain = img.source;
                    }
                  }
                  searchImages.push({
                    url: img.thumbnail || img.link,
                    title: img.title || searchQuery,
                    source: img.source || '',
                    sourceDomain
                  });
                }
              });
            }
            // 2. Extract from organic_results thumbnails/rich snippets
            if (searchData.data.organic_results && Array.isArray(searchData.data.organic_results)) {
              searchData.data.organic_results.forEach(result => {
                let imgUrl = result.thumbnail;
                if (!imgUrl && result.rich_snippet && result.rich_snippet.top && result.rich_snippet.top.detected_extensions) {
                  imgUrl = result.rich_snippet.top.detected_extensions.thumbnail;
                }
                
                if (imgUrl) {
                  let sourceDomain = '';
                  const url = result.link || result.url || '';
                  if (url) {
                    try {
                      sourceDomain = new URL(url).hostname.replace('www.', '');
                    } catch(e) {
                      sourceDomain = url;
                    }
                  }
                  searchImages.push({
                    url: imgUrl,
                    title: result.title || searchQuery,
                    source: url,
                    sourceDomain
                  });
                }
              });
            }
            // 3. Extract from knowledge_graph image
            if (searchData.data.knowledge_graph) {
              const kg = searchData.data.knowledge_graph;
              if (kg.image) {
                let sourceDomain = '';
                if (kg.source) {
                  try {
                    sourceDomain = new URL(kg.source).hostname.replace('www.', '');
                  } catch(e) {
                    sourceDomain = kg.source;
                  }
                }
                searchImages.push({
                  url: kg.image,
                  title: kg.title || searchQuery,
                  source: kg.source || '',
                  sourceDomain
                });
              }
              if (Array.isArray(kg.header_images)) {
                kg.header_images.forEach(img => {
                  if (img.image) {
                    searchImages.push({
                      url: img.image,
                      title: kg.title || searchQuery,
                      source: '',
                      sourceDomain: ''
                    });
                  }
                });
              }
            }
            // 4. Extract from news_results
            if (searchData.data.news_results && Array.isArray(searchData.data.news_results)) {
              searchData.data.news_results.forEach(news => {
                if (news.thumbnail) {
                  let sourceDomain = '';
                  if (news.link) {
                    try {
                      sourceDomain = new URL(news.link).hostname.replace('www.', '');
                    } catch(e) {
                      sourceDomain = news.link;
                    }
                  }
                  searchImages.push({
                    url: news.thumbnail,
                    title: news.title || searchQuery,
                    source: news.link || '',
                    sourceDomain
                  });
                }
              });
            }
          }

          // Filter duplicates
          const uniqueImages = [];
          const seenUrls = new Set();
          for (const img of searchImages) {
            if (img.url && !seenUrls.has(img.url)) {
              seenUrls.add(img.url);
              uniqueImages.push(img);
            }
          }

          // Map sources using uniqueImages for fallback thumbnails
          const sources = resultsList.map(item => {
            let domain = '';
            const url = item.link || item.url || '';
            try {
              domain = new URL(url).hostname;
            } catch(e) {
              domain = url;
            }
            
            let thumbnail = item.thumbnail || null;
            if (!thumbnail && uniqueImages.length > 0) {
              const cleanDom = domain.replace('www.', '');
              const matchedImg = uniqueImages.find(img => img.sourceDomain === cleanDom);
              if (matchedImg) {
                thumbnail = matchedImg.url;
              }
            }

            return {
              title: item.title || 'Untitled',
              link: url || '#',
              snippet: item.snippet || '',
              domain: domain,
              thumbnail: thumbnail
            };
          });

          // Update message state with sources and images
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const steps = msg.searchSteps || [];
                const lastIdx = steps.map(s => s.query).lastIndexOf(searchQuery);
                const updatedSteps = steps.map((step, idx) => 
                  idx === lastIdx
                    ? { ...step, isSearching: false, sources: sources, images: uniqueImages.slice(0, 6) }
                    : step
                );

                return { 
                  ...msg, 
                  isSearching: false, 
                  isThinking: true, 
                  searchQuery: searchQuery, 
                  searchResults: resultsList, 
                  searchSources: sources,
                  searchImages: uniqueImages.slice(0, 6),
                  searchSteps: updatedSteps
                };
              }
              return msg;
            })
          );

          // Build rich context from search results for the AI
          const searchContext = sources.map((s, idx) =>
            `[Sumber ${idx + 1}] ${s.title}\nURL: ${s.link}\nKutipan: ${s.snippet}`
          ).join('\n\n');

          // Initialize context history if empty
          searchContextHistoryRef.current[messageId] = searchContextHistoryRef.current[messageId] || [];
          // Add this step's context to the history
          searchContextHistoryRef.current[messageId].push(`--- HASIL PENCARIAN WEB (Langkah ke-${searchContextHistoryRef.current[messageId].length + 1} - Kata Kunci: "${searchQuery}") ---\n${searchContext}`);

          // Prevent loop bounds (max 4 steps)
          const currentStep = searchContextHistoryRef.current[messageId].length;
          const isMaxStepsReached = currentStep >= 4;
          
          // Helper: replace [Sumber N] or [Sumber N, M] with actual markdown links
          const replaceCitationsWithLinks = (text) => {
            if (!sources || sources.length === 0) return text;
            return text.replace(/\[Sumber\s*(\d+)\]/gi, (match, numStr) => {
              const idx = parseInt(numStr, 10) - 1;
              if (idx >= 0 && idx < sources.length) {
                const s = sources[idx];
                const domain = s.domain || s.link;
                return `[${s.title || domain}](${s.link})`;
              }
              return match;
            });
          };
          
          const userQuery = lastSentPromptRef.current || 'the query';
          const accumulatedHistoryContext = searchContextHistoryRef.current[messageId].join('\n\n');
          
          // Build a comprehensive conclusion prompt
          let conclusionPrompt = `Kamu baru saja melakukan pencarian web untuk pengguna.\n\nPertanyaan pengguna: "${userQuery}"\nKata kunci pencarian terbaru: "${searchQuery}" (Pencarian Langkah ke-${currentStep})\n\n`;
          
          if (aiOverviewText) {
            conclusionPrompt += `--- RINGKASAN AI GOOGLE (TERBARU) ---\n${aiOverviewText}\n\n`;
          }
          
          conclusionPrompt += `${accumulatedHistoryContext}\n\n`;
          
          conclusionPrompt += `--- INSTRUKSI KRITIS (WAJIB DIPATUHI) ---
1. Jawab pertanyaan pengguna MURNI menggunakan informasi dari RINGKASAN AI GOOGLE dan HASIL PENCARIAN WEB di atas.
2. JANGAN menggunakan pengetahuan internal Anda sendiri atau mengarang informasi (halusinasi) yang tidak tercantum secara jelas dalam hasil pencarian tersebut.
3. Jika hasil pencarian tidak mencantumkan informasi yang ditanyakan secara eksplisit, katakan dengan jujur bahwa informasi tersebut tidak ditemukan dalam hasil pencarian.
4. Berikan jawaban yang komprehensif, akurat, dan sebutkan fakta, tanggal, angka, atau data spesifik dari sumber secara jelas.
5. PENTING - CARA SITASI: Ketika merujuk pada informasi dari suatu sumber, sisipkan hyperlink markdown langsung ke dalam kalimat dengan format [nama situs atau judul singkat](URL_LENGKAP). Contoh: "Menurut [Kompas](https://www.kompas.com/artikel/...), ..." atau "Harga saham naik 5% ([CNBC Indonesia](https://www.cnbcindonesia.com/...)).". JANGAN gunakan format [Sumber 1], [Sumber 2], atau angka saja.
6. ${isMaxStepsReached ? 'JANGAN memicu tag [SEARCH_REQUEST] atau [IMAGE_REQUEST] lagi karena Anda telah mencapai batas maksimal pencarian.' : 'PENCARIAN BERTAHAP (MULTI-STEP): Analisis hasil pencarian secara kritis. Jika masih ada aspek pertanyaan yang belum terjawab lengkap, membutuhkan detail lebih mendalam, data terbaru, fakta pelengkap, atau perlu verifikasi silang dari sudut pandang/sumber lain, Anda HARUS DAN SANGAT DIANJURKAN memicu pencarian berikutnya dengan menulis tag format: [SEARCH_REQUEST: kata kunci baru]. Tulis tag tersebut di awal respons Anda tanpa kalimat pengantar lainnya. Lakukan ini secara bertahap sampai data benar-benar lengkap.'}
7. JANGAN memicu tag [IMAGE_REQUEST] lagi.
8. Langsung berikan jawaban final Anda tanpa menulis analisis/kesimpulan tambahan.`;
          
          console.log(`[ChatBot] Sending search results to Deepernova for step ${currentStep} conclusion...`);
          
          // Build history with the assistant's SEARCH_REQUEST message for alternating roles
          const historyWithSearchRequest = messages.map(msg => 
            msg.id === messageId
              ? { ...msg, text: (msg.text ? msg.text + '\n' : '') + `[SEARCH_REQUEST: ${searchQuery}]`, sender: 'bot' }
              : msg
          );

          const newAbortController = new AbortController();
          abortControllerRef.current = newAbortController;
          
          const botResponse = await sendMessageToGrok(
            conclusionPrompt, 
            historyWithSearchRequest, 
            userLanguage, 
            currentConversationId, 
            selectedPersonality, 
            newAbortController, 
            selectedModel, 
            isAuthenticated, 
            isGuest, 
            userName || user?.name, 
            false, 
            sessionMessageCount + 2
          );

          let finalResponseText = '';
          let displayedSearchText = '';
          let searchStreamFinished = false;
          let searchTypingTimer = null;
          let isRedirectedToNextSearch = false;

          const startSearchTypingAnimation = () => {
            if (searchTypingTimer) return;
            searchTypingTimer = setInterval(() => {
              if (displayedSearchText.length < finalResponseText.length) {
                const diff = finalResponseText.length - displayedSearchText.length;
                // Snappy step size: types faster and finishes instantly when stream is done
                const step = searchStreamFinished
                  ? Math.max(20, Math.ceil(diff / 3))
                  : Math.max(1, Math.min(diff, Math.ceil(diff / 8)));
                
                displayedSearchText += finalResponseText.substr(displayedSearchText.length, step);
                
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, text: sanitizeStreamingText(displayedSearchText), isThinking: false, isStreaming: true }
                      : msg
                  )
                );
              } else if (searchStreamFinished) {
                clearInterval(searchTypingTimer);
                searchTypingTimer = null;
              }
            }, 30); // Snappy 30ms interval
          };

          await processStreamingResponse(botResponse, (chunk) => {
            const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
            if (textChunk) {
              finalResponseText += textChunk;
              
              // Multi-step search detection during streaming conclusion
              if (!isMaxStepsReached && !isRedirectedToNextSearch) {
                const searchMatch = finalResponseText.match(/\[SEARCH_REQUEST:\s*(.+?)\]/);
                if (searchMatch) {
                  isRedirectedToNextSearch = true;
                  const nextQuery = searchMatch[1].trim();
                  console.log(`[ChatBot] 🔄 Multi-step SEARCH_REQUEST detected at step ${currentStep}: "${nextQuery}"`);
                  
                  // Cancel current typing/stream
                  newAbortController.abort();
                  if (searchTypingTimer) {
                    clearInterval(searchTypingTimer);
                    searchTypingTimer = null;
                  }
                  
                  // Allow this message to trigger search again by resetting its guard
                  triggeredSearchRequestsRef.current.delete(messageId);
                  
                  // Append next search query to the step list so it renders below the first one
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id === messageId) {
                        const newStep = {
                          query: nextQuery,
                          isSearching: true,
                          sources: [],
                          images: []
                        };
                        return {
                          ...msg,
                          isSearching: true,
                          searchSteps: [...(msg.searchSteps || []), newStep]
                        };
                      }
                      return msg;
                    })
                  );
                  
                  // Call recursively
                  triggerWebSearchIfNeeded(messageId, searchMatch[0]);
                  return;
                }
              }
              
              if (!isRedirectedToNextSearch) {
                startSearchTypingAnimation();
              }
            }
          }, newAbortController.signal);

          if (isRedirectedToNextSearch) {
            return; // Exit current step, recursion takes over
          }

          searchStreamFinished = true;
          startSearchTypingAnimation();

          // Wait for typing animation to catch up completely
          while (displayedSearchText.length < finalResponseText.length || searchTypingTimer !== null) {
            if (newAbortController.signal.aborted) {
              if (searchTypingTimer) clearInterval(searchTypingTimer);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Finalize: save and clean up
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, text: replaceCitationsWithLinks(cleanResponseText(finalResponseText)), isStreaming: false, isThinking: false }
                : msg
            );

            setConversations((prevConvs) => {
              const updatedConvs = prevConvs.map(conv => 
                conv.id === currentConversationId
                  ? { ...conv, messages: updated, isLoading: false, updatedAt: new Date().toISOString() }
                  : conv
              );
              ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
                .catch(err => console.error('[ChatBot] Error saving after search:', err));
              return updatedConvs;
            });
            return updated;
          });

          // Reset all states
          setConvLoading(false);
          setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
          setLastMessage(null);
          abortControllerRef.current = null;

        } catch (searchError) {
          console.error('[ChatBot] Error in search pathway, falling back to direct AI response:', searchError);
          
          try {
            // Inform user that search failed but we are getting direct answer
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? { ...msg, isSearching: false, isThinking: true, text: userLanguage === 'id' ? 'Pencarian gagal. Mengambil jawaban langsung dari AI...' : 'Search failed. Getting direct answer from AI...' }
                  : msg
              )
            );
            
            const userQuery = lastSentPromptRef.current || searchQuery;
            const fallbackPrompt = `[INFO SISTEM: Pencarian web gagal. Harap jawab pertanyaan pengguna berikut menggunakan pengetahuan internal Anda. Beritahukan secara singkat di awal bahwa pencarian gagal sehingga Anda menjawab menggunakan pengetahuan internal.]\n\nPertanyaan pengguna: "${userQuery}"`;
            
            const historyWithSearchRequest = messages.map(msg => 
              msg.id === messageId
                ? { ...msg, text: `[SEARCH_REQUEST: ${searchQuery}]`, sender: 'bot' }
                : msg
            );

            const newAbortController = new AbortController();
            abortControllerRef.current = newAbortController;
            
            const botResponse = await sendMessageToGrok(
              fallbackPrompt, 
              historyWithSearchRequest, 
              userLanguage, 
              currentConversationId, 
              selectedPersonality, 
              newAbortController, 
              selectedModel, 
              isAuthenticated, 
              isGuest, 
              userName || user?.name, 
              false, 
              sessionMessageCount + 2
            );

            let finalResponseText = '';
            let displayedSearchText = '';
            let searchStreamFinished = false;
            let searchTypingTimer = null;

            const startSearchTypingAnimation = () => {
              if (searchTypingTimer) return;
              searchTypingTimer = setInterval(() => {
                if (displayedSearchText.length < finalResponseText.length) {
                  const diff = finalResponseText.length - displayedSearchText.length;
                  const step = searchStreamFinished
                    ? Math.max(20, Math.ceil(diff / 3))
                    : Math.max(1, Math.min(diff, Math.ceil(diff / 8)));
                  
                  displayedSearchText += finalResponseText.substr(displayedSearchText.length, step);
                  
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageId
                        ? { ...msg, text: sanitizeStreamingText(displayedSearchText), isThinking: false, isStreaming: true }
                        : msg
                    )
                  );
                } else if (searchStreamFinished) {
                  clearInterval(searchTypingTimer);
                  searchTypingTimer = null;
                }
              }, 30);
            };

            await processStreamingResponse(botResponse, (chunk) => {
              const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
              if (textChunk) {
                finalResponseText += textChunk;
                startSearchTypingAnimation();
              }
            }, newAbortController.signal);

            searchStreamFinished = true;
            startSearchTypingAnimation();

            while (displayedSearchText.length < finalResponseText.length || searchTypingTimer !== null) {
              if (newAbortController.signal.aborted) {
                if (searchTypingTimer) clearInterval(searchTypingTimer);
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === messageId
                  ? { ...msg, text: cleanResponseText(finalResponseText), isStreaming: false, isThinking: false }
                  : msg
              );
              setConversations((prevConvs) => {
                const updatedConvs = prevConvs.map(conv => 
                  conv.id === currentConversationId
                    ? { ...conv, messages: updated, isLoading: false, updatedAt: new Date().toISOString() }
                    : conv
                );
                ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
                  .catch(err => console.error('[ChatBot] Error saving after fallback search:', err));
                return updatedConvs;
              });
              return updated;
            });

            setConvLoading(false);
            setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
            setLastMessage(null);
            abortControllerRef.current = null;

          } catch (fallbackError) {
            console.error('[ChatBot] Fallback AI execution failed:', fallbackError);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? { ...msg, isSearching: false, isThinking: false, text: humanizeClientError(fallbackError.message) }
                  : msg
              )
            );
            setConvLoading(false);
            setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
            setLastMessage(null);
            abortControllerRef.current = null;
          }
        } finally {
          isProcessingRef.current = false;
          isSearchAbortedRef.current = false; // Reset flag so future messages work normally
          setLoading(false); // Reset global loading state so next message can be sent normally
        }
      })();
    }
  };

  // ============================================================
  // 🧠 AUTONOMOUS MEMORY ACTION HANDLER (CLAUDE-STYLE CoT)
  // ============================================================
  const triggerMemoryActionsIfNeeded = (messageId, text) => {
    if (!text || typeof text !== 'string') return;
    const actionRegex = /\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):\s*([\s\S]*?)\]/gi;
    let match;

    while ((match = actionRegex.exec(text)) !== null) {
      const rawTagType = match[1].toUpperCase();
      const rawPayload = match[2].trim();
      const actionKey = `${messageId}_${rawTagType}_${rawPayload.substring(0, 50)}`;

      if (processedMemoryActionsRef.current.has(actionKey)) {
        continue;
      }
      processedMemoryActionsRef.current.add(actionKey);

      let parsedPayload = {};
      if (rawPayload.startsWith('{') && rawPayload.endsWith('}')) {
        try {
          parsedPayload = JSON.parse(rawPayload);
        } catch (e) {
          try {
            const relaxedJson = rawPayload.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
            parsedPayload = JSON.parse(relaxedJson);
          } catch (e2) {
            parsedPayload = { content: rawPayload };
          }
        }
      } else {
        if (rawTagType === 'MEMORY_DELETE') {
          parsedPayload = { target: rawPayload.replace(/^['"]|['"]$/g, '') };
        } else if (rawTagType === 'MEMORY_RECALL') {
          parsedPayload = { query: rawPayload.replace(/^['"]|['"]$/g, '') };
        } else {
          parsedPayload = { content: rawPayload.replace(/^['"]|['"]$/g, '') };
        }
      }

      const actionName = rawTagType === 'MEMORY_SAVE' ? 'save' :
                         rawTagType === 'MEMORY_UPDATE' ? 'update' :
                         rawTagType === 'MEMORY_DELETE' ? 'delete' : 'recall';

      parsedPayload.action = actionName;

      (async () => {
        try {
          const result = await memoryService.executeAction(parsedPayload, {
            isAuthenticated,
            isGuest,
            conversationId: currentConversationId,
            language: userLanguage
          });

          if (result && result.success) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                const existingActions = msg.memoryActions || [];
                if (!existingActions.some(a => a.id === actionKey)) {
                  return {
                    ...msg,
                    memoryActions: [...existingActions, {
                      id: actionKey,
                      type: actionName,
                      label: result.displayMessage,
                      category: result.category || parsedPayload.category,
                      detail: result.content || result.target || result.query,
                      timestamp: Date.now()
                    }]
                  };
                }
              }
              return msg;
            }));
          }
        } catch (err) {
          console.warn('[ChatBot] Autonomous memory action error:', err);
        }
      })();
    }
  };

  // ============================================================
  // 🧠 RECALL MEMORY & MULTI-STEP REASONING HANDLER
  // ============================================================
  const triggerRecallMemoryIfNeeded = (messageId, text) => {
    if (!text) return;
    const recallRequestMatch = text.match(/\[RECALL_MEMORY:\s*(.+?)\]/);
    if (recallRequestMatch && recallRequestMatch[1]) {
      const recallQuery = recallRequestMatch[1].trim();

      if (triggeredRecallRequestsRef.current.has(messageId)) {
        return; // Already triggered for this turn
      }
      triggeredRecallRequestsRef.current.add(messageId);

      console.log(`[ChatBot] 🧠 RECALL_MEMORY detected: "${recallQuery}" for message ${messageId}`);

      // 1) Clean streaming text
      const cleanedStreamingText = text.replace(/\[RECALL_MEMORY:\s*(.+?)\]/g, '').trim();
      currentStreamingTextRef.current = cleanedStreamingText;

      // 2) Stop current stream if active
      if (abortControllerRef.current) {
        isRecallAbortedRef.current = true;
        abortControllerRef.current.abort();
      }

      // 3) Stop typing animation & intervals
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }

      // 4) Update message state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const initialSteps = msg.memoryRecallSteps ? [...msg.memoryRecallSteps] : [];
            if (!initialSteps.some(s => s.query === recallQuery)) {
              initialSteps.push({
                step: initialSteps.length + 1,
                query: recallQuery,
                isRecalling: true,
                snippet: null
              });
            }
            return {
              ...msg,
              text: cleanedStreamingText || msg.text || '',
              isStreaming: false,
              isRecallingMemory: true,
              memoryRecallQuery: recallQuery,
              memoryRecallSteps: initialSteps
            };
          }
          return msg;
        })
      );

      // 5) Execute recall memory lookup asynchronously
      (async () => {
        try {
          const guestGlobalMemory = typeof localStorage !== 'undefined' ? (localStorage.getItem('guest_global_memory') || '') : '';
          const recallResult = memoryService.recallMemory(recallQuery, {
            currentConversationId,
            globalMemoryText: guestGlobalMemory,
            language: userLanguage,
            limit: 6
          });

          console.log(`[ChatBot] 🧠 Recalled ${recallResult.results.length} memories for "${recallQuery}"`);

          let snippetSummary = '';
          if (recallResult.results.length > 0) {
            snippetSummary = recallResult.results.map((r, i) => `${i + 1}. ${r.content.substring(0, 120)}`).join(' | ');
          } else {
            snippetSummary = userLanguage === 'id' ? 'Tidak ada memori terkait ditemukan' : 'No related memories found';
          }

          // Accumulate recall context history for this message turn
          if (!recallContextHistoryRef.current[messageId]) {
            recallContextHistoryRef.current[messageId] = [];
          }
          recallContextHistoryRef.current[messageId].push({
            query: recallQuery,
            context: recallResult.formattedContext
          });

          // Update step state in UI
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const steps = msg.memoryRecallSteps || [];
                const updatedSteps = steps.map((s) =>
                  s.query === recallQuery
                    ? { ...s, isRecalling: false, snippet: snippetSummary }
                    : s
                );
                return {
                  ...msg,
                  memoryRecallSteps: updatedSteps
                };
              }
              return msg;
            })
          );

          // Build multi-step prompt
          const currentStep = (recallContextHistoryRef.current[messageId] || []).length;
          const isMaxStepsReached = currentStep >= 3;

          const accumulatedRecallContexts = recallContextHistoryRef.current[messageId]
            .map((item, idx) => `[LANGKAH RECALL ${idx + 1} - "${item.query}"]:\n${item.context}`)
            .join('\n\n');

          const recallConclusionPrompt = userLanguage === 'id'
            ? `[KONTEKS MEMORI (SAMPEL SEMENTARA)]:\n${accumulatedRecallContexts}\n\n` +
              `INSTRUKSI MENJAWAB (PENTING):\n` +
              `1. Anda baru saja melakukan penarikan memori. Gunakan data memori di atas sebagai pegangan untuk MENJAWAB PERTANYAAN PENGGUNA SECARA LANGSUNG, UTUH, DAN DETAIL.\n` +
              `2. ${isMaxStepsReached ? 'JANGAN memicu tag [RECALL_MEMORY] lagi.' : 'Jika masih membutuhkan fakta/preferensi lain yang spesifik, Anda BOLEH memicu recall lanjutan dengan format tag: [RECALL_MEMORY: kata kunci baru]. Jika sudah cukup, LANGSUNG BERIKAN JAWABAN AKHIR LENGKAP Anda tanpa tag recall.'}\n` +
              `3. Berikan jawaban yang terstruktur, akurat, dan sopan.`
            : `[MEMORY CONTEXT (TEMPORARY SAMPLE)]:\n${accumulatedRecallContexts}\n\n` +
              `INSTRUCTIONS (CRITICAL):\n` +
              `1. You just recalled memory. Use the context above to ANSWER THE USER'S QUESTION DIRECTLY, FULLY, AND ACCURATELY.\n` +
              `2. ${isMaxStepsReached ? 'DO NOT trigger [RECALL_MEMORY] anymore.' : 'If additional keywords are needed, you MAY output [RECALL_MEMORY: new keywords]. Otherwise, IMMEDIATELY PROVIDE YOUR COMPLETE FINAL ANSWER without recall tags.'}\n` +
              `3. Provide a clear, comprehensive, and polite answer.`;

          const historyWithRecall = messages.map(msg =>
            msg.id === messageId
              ? { ...msg, text: `[RECALL_MEMORY: ${recallQuery}]`, sender: 'bot' }
              : msg
          );

          const newAbortController = new AbortController();
          abortControllerRef.current = newAbortController;

          const safeImages = (messages.find(m => m.id === messageId)?.uploadedImages) || [];

          const botResponse = await sendMessageToGrok(
            recallConclusionPrompt,
            historyWithRecall,
            userLanguage,
            currentConversationId,
            selectedPersonality,
            newAbortController,
            selectedModel,
            isAuthenticated,
            isGuest,
            userName || user?.name,
            sessionMessageCount + 1,
            safeImages
          );

          let rawRecallText = '';
          let finalResponseText = '';
          let displayedRecallText = '';
          let recallStreamFinished = false;
          let recallTypingTimer = null;
          let isRedirectedToNextRecall = false;

          const startRecallTypingAnimation = () => {
            if (recallTypingTimer) return;
            recallTypingTimer = setInterval(() => {
              if (displayedRecallText.length < finalResponseText.length) {
                const diff = finalResponseText.length - displayedRecallText.length;
                const step = recallStreamFinished
                  ? Math.max(20, Math.ceil(diff / 3))
                  : Math.max(1, Math.min(diff, Math.ceil(diff / 8)));
                displayedRecallText += finalResponseText.substr(displayedRecallText.length, step);

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, text: sanitizeStreamingText(displayedRecallText), isThinking: false, isStreaming: true, isRecallingMemory: false }
                      : msg
                  )
                );
              } else if (recallStreamFinished) {
                clearInterval(recallTypingTimer);
                recallTypingTimer = null;
              }
            }, 30);
          };

          await processStreamingResponse(botResponse, (chunk) => {
            const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
            if (textChunk) {
              rawRecallText += textChunk;
              finalResponseText = sanitizeStreamingText(rawRecallText);

              // Multi-step recall detection during streaming
              if (!isMaxStepsReached && !isRedirectedToNextRecall) {
                const nextRecallMatch = rawRecallText.match(/\[RECALL_MEMORY:\s*(.+?)\]/);
                if (nextRecallMatch) {
                  isRedirectedToNextRecall = true;
                  const nextQuery = nextRecallMatch[1].trim();
                  console.log(`[ChatBot] 🧠 Multi-step RECALL_MEMORY detected at step ${currentStep}: "${nextQuery}"`);

                  newAbortController.abort();
                  if (recallTypingTimer) {
                    clearInterval(recallTypingTimer);
                    recallTypingTimer = null;
                  }

                  // Reset guard for next turn
                  triggeredRecallRequestsRef.current.delete(messageId);

                  const newStep = {
                    step: currentStep + 1,
                    query: nextQuery,
                    isRecalling: true,
                    snippet: null
                  };

                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id === messageId) {
                        return {
                          ...msg,
                          isRecallingMemory: true,
                          memoryRecallSteps: [...(msg.memoryRecallSteps || []), newStep]
                        };
                      }
                      return msg;
                    })
                  );

                  triggerRecallMemoryIfNeeded(messageId, rawRecallText);
                  return;
                }
              }

              if (!isRedirectedToNextRecall) {
                startRecallTypingAnimation();
              }
            }
          }, newAbortController.signal);

          if (isRedirectedToNextRecall) {
            return;
          }

          recallStreamFinished = true;
          startRecallTypingAnimation();

          while (displayedRecallText.length < finalResponseText.length || recallTypingTimer !== null) {
            if (newAbortController.signal.aborted) {
              if (recallTypingTimer) clearInterval(recallTypingTimer);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          const cleanedFinalText = finalResponseText
            .replace(/\[RECALL_MEMORY:\s*(.+?)\]/g, '')
            .replace(/\[SEARCH_REQUEST:\s*(.+?)\]/g, '')
            .replace(/\[REMINDER_REQUEST:\s*\{[\s\S]*?\}\]/g, '')
            .trim();

          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    text: cleanResponseText(cleanedFinalText),
                    isStreaming: false,
                    isThinking: false,
                    isRecallingMemory: false
                  }
                : msg
            );

            setConversations((prevConvs) => {
              const updatedConvs = prevConvs.map(conv =>
                conv.id === currentConversationId
                  ? { ...conv, messages: updated, isLoading: false, updatedAt: new Date().toISOString() }
                  : conv
              );
              ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
                .catch(err => console.error('[ChatBot] Error saving after recall memory:', err));
              return updatedConvs;
            });
            return updated;
          });

          isRecallAbortedRef.current = false;
          setConvLoading(false);
          setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
          setLastMessage(null);
          abortControllerRef.current = null;

        } catch (err) {
          isRecallAbortedRef.current = false;
          console.error('[ChatBot] Error during recall memory processing:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, isRecallingMemory: false, isStreaming: false }
                : msg
            )
          );
          setConvLoading(false);
          abortControllerRef.current = null;
        } finally {
          isProcessingRef.current = false;
          setLoading(false);
        }
      })();
    }
  };

  const handleRetry = async () => {
    if (!lastMessage && !partialMessageIdRef.current) return;

    setError(null);
    setConvLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    // Store controller per conversation
    if (currentConversationId) {
      abortControllersMapRef.current.set(currentConversationId, abortController);
    }

    // Capture conversationId NOW so streaming callback uses the right conversation
    const streamingConversationId = currentConversationId;

    try {
      // If continuing from partial response, send continuation prompt
      if (partialMessageIdRef.current) {
        const continuePrompt = `[Lanjutkan dari mana tadi, jangan ulangi pesan sebelumnya, hanya lanjutkan teks berikutnya]`;
        const response = await sendMessageToGrok(continuePrompt, messages, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, false);
        const msgId = partialMessageIdRef.current;

        const initialText = messages.find(m => m.id === msgId)?.text || '';
        let accumulatedRetryText = '';
        let displayedText = '';
        let streamFinished = false;
        currentStreamingTextRef.current = '';

        const startTypingAnimation = () => {
          if (typingTimerRef.current) return;
          typingTimerRef.current = setInterval(() => {
            if (displayedText.length < accumulatedRetryText.length) {
              const diff = accumulatedRetryText.length - displayedText.length;
              const step = Math.max(1, Math.min(diff, Math.ceil(diff / 15)));
              displayedText += accumulatedRetryText.substr(displayedText.length, step);
              currentStreamingTextRef.current = initialText + displayedText;
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === msgId
                    ? { ...msg, text: sanitizeStreamingText(initialText + displayedText), isStreaming: true, isThinking: false }
                    : msg
                )
              );
            } else if (streamFinished) {
              clearInterval(typingTimerRef.current);
              typingTimerRef.current = null;
              finishStreaming(msgId, initialText + accumulatedRetryText);
            }
          }, 40);
        };
 
        await processStreamingResponse(response, (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            accumulatedRetryText += textChunk;
            currentStreamingTextRef.current = initialText + accumulatedRetryText;
            triggerInlineImageIfNeeded(msgId, initialText + accumulatedRetryText);
            startTypingAnimation();
          }
        }, abortController.signal);

        if (abortController.signal.aborted) {
          return;
        }
 
        streamFinished = true;
        startTypingAnimation();

        while (displayedText.length < accumulatedRetryText.length || typingTimerRef.current !== null) {
          if (abortController.signal.aborted) {
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        if (abortController.signal.aborted) {
          return;
        }

        finishStreaming(msgId, initialText + accumulatedRetryText);
        triggerInlineImageIfNeeded(msgId, initialText + accumulatedRetryText);
 
        partialMessageIdRef.current = null;
        // Keep compact focus when continuing partial responses
        setCompactView(true);
      } else {
        // Full retry for non-partial errors
        const response = await sendMessageToGrok(lastMessage, messages, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, false);
        const placeholderId = createBotPlaceholder();
        currentMessageIdRef.current = placeholderId;
 
        let accumulatedFullRetryText = '';
        let displayedText = '';
        let streamFinished = false;
        currentStreamingTextRef.current = '';

        const startTypingAnimation = () => {
          if (typingTimerRef.current) return;
          typingTimerRef.current = setInterval(() => {
            if (displayedText.length < accumulatedFullRetryText.length) {
              const diff = accumulatedFullRetryText.length - displayedText.length;
              const step = Math.max(1, Math.min(diff, Math.ceil(diff / 15)));
              displayedText += accumulatedFullRetryText.substr(displayedText.length, step);
              currentStreamingTextRef.current = displayedText;
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === placeholderId
                    ? { ...msg, text: sanitizeStreamingText(displayedText), isStreaming: true, isThinking: false }
                    : msg
                )
              );
            } else if (streamFinished) {
              clearInterval(typingTimerRef.current);
              typingTimerRef.current = null;
              finishStreaming(placeholderId, accumulatedFullRetryText);
            }
          }, 40);
        };
 
        await processStreamingResponse(response, (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            accumulatedFullRetryText += textChunk;
            currentStreamingTextRef.current = accumulatedFullRetryText;
            triggerInlineImageIfNeeded(placeholderId, accumulatedFullRetryText);
            startTypingAnimation();
          }
        }, abortController.signal);

        if (abortController.signal.aborted) {
          return;
        }
 
        streamFinished = true;
        startTypingAnimation();

        while (displayedText.length < accumulatedFullRetryText.length || typingTimerRef.current !== null) {
          if (abortController.signal.aborted) {
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        if (abortController.signal.aborted) {
          return;
        }

        finishStreaming(placeholderId, accumulatedFullRetryText);
        triggerInlineImageIfNeeded(placeholderId, accumulatedFullRetryText);
      }

      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
      setLastMessage(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showErrorBanner(`Gagal: ${err.message}. Klik Continue untuk coba lagi.`);
      }
      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
    }
  };

  // Auto-retry function (called automatically, no user interaction needed)
  const handleRetryAuto = async () => {
    if (!partialMessageIdRef.current) return;

    // CRITICAL: Keep the lock held throughout the entire retry process
    // isProcessingRef.current should ALREADY be true from the initial request
    // Do NOT clear it until we're completely done
    
    setConvLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    // Store controller per conversation
    if (currentConversationId) {
      abortControllersMapRef.current.set(currentConversationId, abortController);
    }

    // Capture conversationId NOW so streaming callback uses the right conversation
    const streamingConversationId = currentConversationId;

    try {
      // Continue from partial response (same as handleRetry but without user error message)
      const msgId = partialMessageIdRef.current;
      const initialText = messages.find(m => m.id === msgId)?.text || '';
      const continuePrompt = `[Lanjutkan dari mana tadi, jangan ulangi pesan sebelumnya, hanya lanjutkan teks berikutnya]`;
      const response = await sendMessageToGrok(continuePrompt, messages, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, false);
      
      let accumulatedAutoRetryText = '';
      let displayedText = '';
      let streamFinished = false;
      currentStreamingTextRef.current = '';

      const startTypingAnimation = () => {
        if (typingTimerRef.current) return;
        typingTimerRef.current = setInterval(() => {
          if (displayedText.length < accumulatedAutoRetryText.length) {
            const diff = accumulatedAutoRetryText.length - displayedText.length;
            const step = Math.max(1, Math.min(diff, Math.ceil(diff / 15)));
            displayedText += accumulatedAutoRetryText.substr(displayedText.length, step);
            currentStreamingTextRef.current = initialText + displayedText;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === msgId
                  ? { ...msg, text: sanitizeStreamingText(initialText + displayedText), isStreaming: true, isThinking: false }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
            finishStreaming(msgId, initialText + accumulatedAutoRetryText);
          }
        }, 40);
      };
 
      await processStreamingResponse(response, (chunk) => {
        const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
        if (textChunk) {
          accumulatedAutoRetryText += textChunk;
          currentStreamingTextRef.current = initialText + accumulatedAutoRetryText;
          triggerInlineImageIfNeeded(msgId, initialText + accumulatedAutoRetryText);
          startTypingAnimation();
        }
      }, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }
 
      streamFinished = true;
      startTypingAnimation();

      while (displayedText.length < accumulatedAutoRetryText.length || typingTimerRef.current !== null) {
        if (abortController.signal.aborted) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (abortController.signal.aborted) {
        return;
      }

      finishStreaming(msgId, initialText + accumulatedAutoRetryText);
      triggerInlineImageIfNeeded(msgId, initialText + accumulatedAutoRetryText);

      partialMessageIdRef.current = null;
      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
      
      // Reset auto-retry counter on success
      autoRetryCountRef.current = 0;
    } catch (err) {
      // If auto-retry fails again, give up and clear lock
      if (err.name !== 'AbortError') {
        console.error('[Auto-Retry Failed]', err.message);
      }
      setLoading(false);
      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
      
      // Rollback user input and remove stuck placeholder messages
      setInputValue(lastSentUserInputTextRef.current || '');
      if (partialMessageIdRef.current || lastSentUserMessageIdRef.current) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== partialMessageIdRef.current && m.id !== lastSentUserMessageIdRef.current)
        );
      }
      partialMessageIdRef.current = null;

      // Show connection error popup
      setConnectionErrorMessage(
        userLanguage === 'id'
          ? 'Pesan Anda tidak terkirim karena masalah koneksi jaringan. Teks Anda telah dikembalikan ke kolom input.'
          : 'Your message was not sent due to network issues. Your text has been restored to the input box.'
      );
      setShowConnectionErrorModal(true);
      autoRetryCountRef.current = 0;
    } finally {
      // CRITICAL: Clear the lock ONLY after retry attempt (success or final fail)
      isProcessingRef.current = false;
      console.log('[ChatBot] 🔓 Auto-retry processing lock cleared');
      setConvLoading(false);
    }
  };

  const memoizedMessageList = useMemo(() => {
    if (messages.length === 0) {
      const displayGreeting = generatingGreeting ? '' : (aiGreeting || getTimeBasedGreeting(userName || user?.name));
      const displayHint = generatingGreeting ? '' : (aiHint || FALLBACK_GREETINGS.hint);
      
      return (
        <div className="welcome-message">
          {displayGreeting ? <h2>{displayGreeting}</h2> : null}
          {displayHint ? <p className="welcome-hint">{displayHint}</p> : null}
          {generatingGreeting && <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Menyiapkan salam...</p>}
          
          {/* Quick action buttons */}
          <div className="welcome-actions">
            <button 
              type="button"
              className="welcome-action-btn"
              onClick={() => {
                onNavigate?.('documents', 'docx');
              }}
              title={userLanguage === 'id' ? 'Buka Typernova Word Agent & Susun Dokumen' : 'Open Typernova Word Agent & Draft Documents'}
            >
              <span className="action-btn-icon">📝</span>
              <span className="action-btn-label">{userLanguage === 'id' ? 'Word Agent' : 'Word Agent'}</span>
            </button>
            <button 
              type="button"
              className="welcome-action-btn"
              onClick={() => {
                onNavigate?.('codedance');
              }}
              title={userLanguage === 'id' ? 'Buka CodeDance Autonomous IDE & Koding' : 'Open CodeDance Autonomous IDE & Coding'}
            >
              <span className="action-btn-icon">⚡</span>
              <span className="action-btn-label">{userLanguage === 'id' ? 'CodeDance IDE' : 'CodeDance IDE'}</span>
            </button>
            <button 
              type="button"
              className="welcome-action-btn"
              onClick={() => {
                setInputValue(userLanguage === 'id' ? 'Buatkan gambar: ' : 'Create an image: ');
                textareaElementRef.current?.focus();
              }}
              title={userLanguage === 'id' ? 'Buat gambar baru dengan AI' : 'Create new image with AI'}
            >
              <span className="action-btn-icon">🎨</span>
              <span className="action-btn-label">{userLanguage === 'id' ? 'Buat Gambar' : 'Create Image'}</span>
            </button>
          </div>
        </div>
      );
    }

    return messages.map((message, index) => {
      const isLastMessage = index === messages.length - 1;
      const shouldHideByCompact = compactView && !isScrolledUp && messages.length > 0 && (() => {
        let userIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].sender === 'user') {
            userIdx = i;
            break;
          }
        }
        return index < userIdx;
      })();

      return (
        <div
          key={index}
          data-msg-id={message.id}
          className={`message ${message.sender}${shouldHideByCompact ? ' hidden-by-compact' : ''}${message.sender === 'user' && expandedUserMessageId === message.id ? ' expanded' : ''}`}
          onMouseDown={() => handleMessageMouseDown(message.id, message.text, message.sender === 'user')}
          onMouseUp={handleMessageMouseUp}
          onTouchStart={() => handleMessageMouseDown(message.id, message.text, message.sender === 'user')}
          onTouchEnd={handleMessageMouseUp}
          style={{ marginBottom: message.sender === 'user' && !expandedUserMessageId === message.id ? '32px' : '0' }}
        >
          <div className="message-content">
            {message.isImage && (
              <>
                {message.isThinking ? (
                  <div className="image-thinking-state">
                    <div className="spinner"></div>
                    <div className="thinking-text">{message.text}</div>
                  </div>
                ) : (
                  <>
                    {message.text && formatMessageText(message.text, false, message.id)}
                    {message.imageUrl && (
                      <div className="message-image-container" style={{ position: 'relative' }}>
                        <img
                          src={message.imageUrl}
                          alt="Generated Image"
                          className="message-image"
                          onClick={() => handleImageClick(message.imageUrl, 'Generated Image', message.imageId)}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: '8px',
                            marginTop: '12px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          title={userLanguage === 'id' ? 'Klik untuk membesar' : 'Click to enlarge'}
                          onError={(e) => {
                            console.error('[ChatBot] 🖼️ Image load error in chat - URL:', message.imageUrl, 'MessageID:', message.id);
                            console.error('[ChatBot] 🖼️ Image error element:', e.target);
                            fetch(message.imageUrl)
                              .then(res => {
                                console.log('[ChatBot] 🖼️ Fetch response:', res.status, res.statusText);
                                return res.blob();
                              })
                              .catch(err => console.error('[ChatBot] 🖼️ Fetch error:', err.message));
                          }}
                          onLoad={() => console.log('[ChatBot] ✅ Image loaded in chat - URL:', message.imageUrl)}
                        />
                        <button
                          type="button"
                          className={`hd-upscale-btn ${hdUpscalingMap[message.imageUrl] ? 'loading' : ''}`}
                          onClick={(e) => { e.stopPropagation(); handleUpscaleHD(message.imageUrl, message.id); }}
                          disabled={!!hdUpscalingMap[message.imageUrl]}
                          title={userLanguage === 'id' ? 'Tingkatkan kualitas ke HD' : 'Upscale to HD'}
                        >
                          {hdUpscalingMap[message.imageUrl] ? (
                            <><i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> HD...</>
                          ) : (
                            <><span className="hd-icon">HD</span></>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {message.sender === 'bot' && !message.isImage && (() => {
              return (
                <>
                  {/* Render multi-step search steps sequentially */}
                  {message.searchSteps && message.searchSteps.length > 0 ? (
                    <div className="multi-step-search-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {message.searchSteps.map((step, sIdx) => (
                        <div key={`step_${sIdx}_${step.query}`} className="search-step-block" style={{ animation: 'float-source-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
                          {step.isSearching ? (
                            <div className="search-simple-indicator">
                              <span className="search-simple-spinner"></span>
                              <span className="search-simple-text">
                                {userLanguage === 'id' ? `Mencari "${step.query}"...` : `Searching for "${step.query}"...`}
                              </span>
                            </div>
                          ) : (
                            step.sources && step.sources.length > 0 && (
                              <div className="search-sources-section" style={{ marginTop: '4px', animation: 'float-source-in 0.35s ease both' }}>
                                <SourceBubbleCarousel
                                  key={`carousel_${sIdx}_${step.query}_${step.sources.length}`}
                                  sources={step.sources}
                                  language={userLanguage}
                                  onShowAll={() => setActiveSearchSources({ query: step.query, sources: step.sources })}
                                />
                              </div>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Fallback to legacy single search rendering
                    <>
                      {message.isSearching && (
                        <div className="search-simple-indicator">
                          <span className="search-simple-spinner"></span>
                          <span className="search-simple-text">
                            {userLanguage === 'id' ? `Mencari "${message.searchQuery}"...` : `Searching for "${message.searchQuery}"...`}
                          </span>
                        </div>
                      )}

                      {message.searchSources && message.searchSources.length > 0 && (
                        <div className="search-sources-section">
                          <SourceBubbleCarousel
                            sources={message.searchSources}
                            language={userLanguage}
                            onShowAll={() => setActiveSearchSources({ query: message.searchQuery, sources: message.searchSources })}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Claude-Style Autonomous Memory Action Pills / CoT Card */}
                  {message.memoryActions && message.memoryActions.length > 0 && (
                    <div className="claude-memory-actions-container">
                      {message.memoryActions.map((action, aIdx) => (
                        <div key={`mem_act_${aIdx}_${action.id || aIdx}`} className={`claude-memory-pill pill-${action.type || 'save'}`}>
                          <span className="memory-pill-icon">
                            {action.type === 'save' && '🧠'}
                            {action.type === 'update' && '📝'}
                            {action.type === 'delete' && '🗑️'}
                            {action.type === 'recall' && '🔍'}
                          </span>
                          <span className="memory-pill-label">{action.label}</span>
                          {action.category && (
                            <span className="memory-pill-badge">{action.category}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Minimal Subtle Recall Memory Indicator */}
                  {message.isRecallingMemory && (
                    <div className="recall-memory-simple-indicator">
                      <span className="recall-memory-pulse-icon">🧠</span>
                      <span className="recall-memory-text shiny-text">
                        {userLanguage === 'id' ? 'Cek memori mendalam' : 'Recalling memory'}
                        <span className="moving-dots"><span>.</span><span>.</span><span>.</span></span>
                      </span>
                    </div>
                  )}

                  {/* Zero-Lag Isolated Reasoning Section */}
                  {message.reasoningText && (
                    <ReasoningSection
                      reasoningText={message.reasoningText}
                      isReasoning={message.isReasoning}
                      reasoningDuration={message.reasoningDuration}
                      userLanguage={userLanguage}
                    />
                  )}

                  {/* Plain loading dots & progressive phase text - ONLY shown during active pending phase */}
                  {((message.isStreaming || message.isThinking) && !message.text && !message.reasoningText && !message.isSearching && !message.isRecallingMemory && (!message.searchSteps || message.searchSteps.length === 0)) && (
                    <div className="typing-indicator-row">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      {loadingPhase && (
                        <span className="slow-processing-text">
                          {loadingPhase === 'sending' && (userLanguage === 'id' ? 'Mengirim...' : 'Sending...')}
                          {loadingPhase === 'thinking' && (userLanguage === 'id' ? 'Merenungi...' : 'Thinking...')}
                          {loadingPhase === 'slow' && (userLanguage === 'id' ? 'Merespon sedikit lebih lama dari biasanya...' : 'Taking a bit longer to respond...')}
                        </span>
                      )}
                    </div>
                  )}

                  {message.text && formatMessageText(message.text, message.isStreaming, message.id)}
                  {message.reminder && (
                    <ReminderCard reminder={message.reminder} />
                  )}
                </>
              );
            })()}
            {message.sender === 'user' && (
              <div className="user-bubble-text">
                {formatMessageText(message.text, false, message.id)}
              </div>
            )}
            {message.downloadUrl && message.fileName && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'rgba(100, 200, 255, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(100, 200, 255, 0.3)'
              }}>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = message.downloadUrl;
                    link.download = message.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  📥 Download: {message.fileName}
                </button>
                {message.downloadSummary && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '13px',
                    color: '#1f2937',
                    opacity: 0.85
                  }}>
                    {message.downloadSummary}
                  </div>
                )}
              </div>
            )}
            {message.files && message.files.length > 0 && (
              <div className="message-files">
                {message.files.map((file) => (
                  <div key={file.id} className="message-file-chip">
                    📎 {file.name}
                  </div>
                ))}
              </div>
            )}
            {message.textQueue && message.textQueue.length > 0 && (
              <div className="message-text-queue">
                {message.textQueue.map((item) => (
                  <div key={item.id} className="message-text-chip">
                    📋 {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User attached images rendered BELOW the text bubble */}
          {message.images && message.images.length > 0 && (
            <div className="user-attached-images-container">
              {message.images.map((image) => {
                const imgUrl = image.dataUrl || image.publicUrl;
                return (
                  <div
                    key={image.id}
                    className="user-attached-image-card"
                    onClick={() => handleImageClick(imgUrl, image.fileName, image.id)}
                    title={userLanguage === 'id' ? 'Klik untuk memperbesar & unduh' : 'Click to enlarge & download'}
                  >
                    <img
                      src={imgUrl}
                      alt={image.fileName || 'Uploaded image'}
                      onError={(e) => {
                        if (image.dataUrl && e.target.src !== image.dataUrl) {
                          e.target.src = image.dataUrl;
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {message.sender === 'bot' && !message.isStreaming && isLastMessage && (
            <div className="message-footer">
              <div className="message-actions">
                <button
                  className={`feedback-btn like-btn ${messageFeedback[message.id] === 'like' ? 'active' : ''}`}
                  onClick={() => handleMessageFeedback(message.id, 'like')}
                  title={userLanguage === 'id' ? 'Membantu' : 'Helpful'}
                >
                  <i className="fas fa-thumbs-up"></i>
                </button>
                <button
                  className={`feedback-btn dislike-btn ${messageFeedback[message.id] === 'dislike' ? 'active' : ''}`}
                  onClick={() => handleMessageFeedback(message.id, 'dislike')}
                  title={userLanguage === 'id' ? 'Tidak membantu' : 'Not helpful'}
                >
                  <i className="fas fa-thumbs-down"></i>
                </button>
                <button
                  className="feedback-btn copy-btn"
                  onClick={() => handleCopyMessage(message.text)}
                  title={userLanguage === 'id' ? 'Salin' : 'Copy'}
                >
                  <i className="fas fa-copy"></i>
                </button>
                <button
                  className={`feedback-btn tts-btn ${playingMessageId === message.id ? 'playing' : ''} ${ttsLoading === message.id ? 'loading' : ''}`}
                  onClick={() => handleTtsToggle(message)}
                  disabled={ttsLoading === message.id}
                  title={userLanguage === 'id'
                    ? (playingMessageId === message.id ? 'Hentikan suara' : 'Baca suara')
                    : (playingMessageId === message.id ? 'Stop audio' : 'Read aloud')}
                >
                  {ttsLoading === message.id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : playingMessageId === message.id ? (
                    <i className="fas fa-volume-up"></i>
                  ) : (
                    <i className="fas fa-volume-mute"></i>
                  )}
                </button>
              </div>
              <div className="message-attribution">
                {userLanguage === 'id'
                  ? 'Deepernova AI dapat membuat kekeliruan. Selalu verifikasi informasi penting.'
                  : 'Deepernova AI can make mistakes. Always verify important information.'}
              </div>
            </div>
          )}
        </div>
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, compactView, isScrolledUp, expandedUserMessageId, messageFeedback, userLanguage, playingMessageId, ttsLoading, aiGreeting, aiHint, generatingGreeting, isSlowProcessing, loadingPhase]);

  return (
    <div className={`chatbot-app ${isGenerating ? 'ai-generating' : ''}`}>
      {/* Modern Private Chat Modal */}
      {showPrivateModal && (
        <div className="modern-feature-modal-overlay" onClick={() => setShowPrivateModal(false)}>
          <div className="modern-private-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="feature-modal-close-btn"
              onClick={() => setShowPrivateModal(false)}
              aria-label="Tutup"
            >
              ✕
            </button>
            
            <div className="private-modal-lock-badge">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <div className="private-modal-tag">
              {userLanguage === 'id' ? '🔒 Mode Anonim & Privat' : '🔒 Private & Anonymous Mode'}
            </div>

            <h3 className="private-modal-title">
              {userLanguage === 'id' ? 'Mulai Obrolan Privat' : 'Start Private Chat'}
            </h3>

            <p className="private-modal-desc">
              {userLanguage === 'id'
                ? 'Obrolan privat tidak akan disimpan ke riwayat akun atau memori jangka panjang. Semua pesan akan langsung terhapus saat halaman di-refresh.'
                : 'Private chats are not saved to your account history or long-term memory. All messages will be automatically cleared when you refresh the page.'}
            </p>

            <div className="private-modal-chips-grid">
              <div className="private-chip-item">
                <span className="private-chip-icon">🚫</span>
                <span className="private-chip-text">{userLanguage === 'id' ? 'Tanpa Riwayat' : 'Zero History'}</span>
              </div>
              <div className="private-chip-item">
                <span className="private-chip-icon">⚡</span>
                <span className="private-chip-text">{userLanguage === 'id' ? 'Hanya Sesi Ini' : 'Session Only'}</span>
              </div>
              <div className="private-chip-item">
                <span className="private-chip-icon">🛡️</span>
                <span className="private-chip-text">{userLanguage === 'id' ? 'Isolasi Memori' : 'Memory Isolated'}</span>
              </div>
            </div>

            <div className="private-modal-actions-row">
              <button 
                type="button" 
                className="private-modal-btn cancel-btn"
                onClick={() => setShowPrivateModal(false)}
              >
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button 
                type="button" 
                className="private-modal-btn start-btn"
                onClick={startPrivateChat}
              >
                {userLanguage === 'id' ? 'Mulai Obrolan Privat' : 'Start Private Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Found Sources Panel - Show sources before generating answer */}
      {showFoundSourcesPanel && foundSources.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowFoundSourcesPanel(false)}>
          <div className="modal-content sources-panel" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowFoundSourcesPanel(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📰 {userLanguage === 'id' ? 'Sumber Ditemukan' : 'Sources Found'}</h2>
              <p className="sources-count">{foundSources.length} {userLanguage === 'id' ? 'sumber' : 'sources'}</p>
            </div>
            <div className="modal-body sources-list-body">
              {foundSources.map((source, idx) => (
                <div key={idx} className="source-item">
                  <div className="source-header">
                    <h3>{source.title}</h3>
                    <span className="source-badge">{source.source}</span>
                  </div>
                  <p className="source-description">{source.description}</p>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                      🔗 {userLanguage === 'id' ? 'Buka Sumber' : 'Open Source'}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer sources-footer">
              <button 
                className="modal-btn-cancel"
                onClick={() => setShowFoundSourcesPanel(false)}
              >
                {userLanguage === 'id' ? 'Tutup' : 'Close'}
              </button>
              <button 
                className="modal-btn-primary generate-answer-btn"
                onClick={() => {
                  setShowFoundSourcesPanel(false);
                  // Trigger AI to generate answer based on found sources
                  if (pendingAnswerMessage) {
                    handleGenerateAnswerFromSources(pendingAnswerMessage);
                  }
                }}
              >
                ✨ {userLanguage === 'id' ? 'Auto Generate' : 'Auto Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personality Selector Modal */}
      {showPersonalityModal && (
        <div className="modal-overlay" onClick={() => setShowPersonalityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowPersonalityModal(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2><i className="fas fa-theater-masks" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Pilih Kepribadian AI' : 'Choose AI Personality'}</h2>
            </div>
            <div className="modal-body">
              <p>
                {userLanguage === 'id'
                  ? 'Pilih kepribadian yang Anda sukai untuk mengubah gaya percakapan Deepernova AI'
                  : 'Choose a personality to change how Deepernova AI communicates with you'}
              </p>
              <div className="personality-modal-grid">
                {Object.values(PERSONALITIES).map((personality) => (
                  <button
                    key={personality.id}
                    className={`personality-modal-btn ${selectedPersonality === personality.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPersonality(personality.id);
                      setShowPersonalityModal(false);
                    }}
                  >
                    <span className="personality-modal-emoji">{personality.emoji}</span>
                    <span className="personality-modal-name">{personality.name}</span>
                    <span className="personality-modal-desc">{personality.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNameSetupModal && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowNameSetupModal(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📝 {userLanguage === 'id' ? 'Siapa nama kamu?' : 'What is your name?'}</h2>
            </div>
            <div className="modal-body">
              <p>{userLanguage === 'id' ? 'Supaya Deepernova AI bisa manggil kamu dengan nama yang benar.' : 'So Deepernova AI can call you by the right name.'}</p>
              <div className="settings-row">
                <label>{userLanguage === 'id' ? 'Nama' : 'Name'}</label>
                <input
                  type="text"
                  value={pendingUserName}
                  onChange={(e) => setPendingUserName(e.target.value)}
                  placeholder={userLanguage === 'id' ? 'Contoh: Nando' : 'Example: Nando'}
                />
              </div>
              <div className="settings-row modal-actions-row">
                <button
                  className="modal-btn-confirm"
                  onClick={() => saveUserName(pendingUserName)}
                >
                  {userLanguage === 'id' ? 'Simpan' : 'Save'}
                </button>
                <button
                  className="modal-btn-cancel"
                  onClick={skipNameSetup}
                >
                  {userLanguage === 'id' ? 'Lewati' : 'Skip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Non-Popup Settings Drawer Panel */}
      <div className={`modern-settings-backdrop ${showSettingsModal ? 'open' : ''}`} onClick={() => setShowSettingsModal(false)}></div>
      <div className={`modern-settings-drawer ${showSettingsModal ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-drawer-header">
          <div className="settings-header-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <h2>{userLanguage === 'id' ? 'Pengaturan' : 'Settings'}</h2>
          </div>
          <button 
            type="button"
            className="settings-drawer-close"
            onClick={() => setShowSettingsModal(false)}
            title={userLanguage === 'id' ? 'Tutup Pengaturan' : 'Close Settings'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="settings-drawer-content">
          {/* User Account Card */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Akun & Profil' : 'Account & Profile'}
            </div>
            <div className="settings-profile-row">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="settings-avatar" />
              ) : (
                <div className="settings-avatar-fallback">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="settings-profile-info">
                <div className="settings-profile-name">
                  {user?.name || (userLanguage === 'id' ? 'Pengguna Deepernova' : 'Deepernova User')}
                </div>
                <div className="settings-profile-email">
                  {user?.email || 'local-ai@deepernova'}
                </div>
              </div>
            </div>

            <div className="settings-field-item">
              <label className="settings-field-label">
                {userLanguage === 'id' ? 'Nama Tampilan' : 'Display Name'}
              </label>
              <div className="settings-input-group">
                <input
                  type="text"
                  className="modern-settings-input"
                  value={pendingUserName}
                  onChange={(e) => setPendingUserName(e.target.value)}
                  placeholder={userLanguage === 'id' ? 'Contoh: Ferry' : 'e.g. Ferry'}
                />
                <button
                  type="button"
                  className="settings-save-name-btn"
                  onClick={() => {
                    saveUserName(pendingUserName);
                    setCustomAlert(userLanguage === 'id' ? 'Nama berhasil diperbarui' : 'Name updated successfully');
                  }}
                >
                  {userLanguage === 'id' ? 'Simpan' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Preferensi Antarmuka' : 'UI Preferences'}
            </div>
            
            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Bahasa Aplikasi' : 'App Language'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Pilih bahasa antarmuka Deepernova AI' : 'Choose Deepernova UI language'}</span>
              </div>
              <select
                className="modern-settings-select"
                value={userLanguage}
                onChange={(e) => setUserLanguage(e.target.value)}
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Mode Privat' : 'Private Mode'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Jangan simpan sesi percakapan baru' : 'Do not save new conversation sessions'}</span>
              </div>
              <label className="modern-switch">
                <input 
                  type="checkbox" 
                  checked={isPrivateChat} 
                  onChange={() => setIsPrivateChat(s => !s)} 
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Statistik Token' : 'Token Usage'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Tampilkan info token di bawah pesan' : 'Show token usage metrics under messages'}</span>
              </div>
              <label className="modern-switch">
                <input 
                  type="checkbox" 
                  checked={showTokenUsage} 
                  onChange={() => setShowTokenUsage(prev => !prev)} 
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>

          {/* Data & AI Management Card */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Data & Integrasi' : 'Data & Integrations'}
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Memori AI' : 'AI Memory'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Hapus riwayat memori kontekstual AI' : 'Clear contextual long-term AI memory'}</span>
              </div>
              <button
                type="button"
                className="settings-action-btn danger-btn"
                onClick={() => {
                  if (confirm(userLanguage === 'id' ? 'Bersihkan semua memori AI?' : 'Clear all AI memories?')) {
                    memoryService.clearMemories();
                    setCustomAlert(userLanguage === 'id' ? 'Memori AI telah dibersihkan' : 'AI memories cleared');
                  }
                }}
              >
                {userLanguage === 'id' ? 'Hapus Memori' : 'Clear Memory'}
              </button>
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">🔌 API Marketplace</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Akses API Key dan integrasi pengembang' : 'Access API Keys and developer dashboard'}</span>
              </div>
              <button
                type="button"
                className="settings-action-btn primary-btn"
                onClick={() => {
                  setShowApiDashboard(true);
                  setShowSettingsModal(false);
                }}
              >
                {userLanguage === 'id' ? 'Buka Dashboard' : 'Open Dashboard'}
              </button>
            </div>
          </div>

          {/* Latest Update & System Status Card */}
          <div className="settings-group-card latest-update-card">
            <div className="settings-group-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{userLanguage === 'id' ? 'Info Pembaruan Terkini' : 'Latest System Update'}</span>
              <span className="update-pulse-badge">
                <span className="pulse-dot"></span>
                {userLanguage === 'id' ? 'Terkini' : 'Up to Date'}
              </span>
            </div>

            <div className="update-info-header">
              <div className="update-version-row">
                <span className="update-version-tag">v3.8.5 Enterprise</span>
                <span className="update-date-text">
                  📅 {new Intl.DateTimeFormat(userLanguage === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
                </span>
              </div>
              <div className="update-headline">
                {userLanguage === 'id' ? 'Pembaruan Sistem Hari Ini' : "Today's System Release"}
              </div>
            </div>

            <div className="update-features-list">
              <div className="update-feature-item">
                <span className="feature-icon">⚡</span>
                <div className="feature-content">
                  <div className="feature-title">Deepernova Synapse Ultra Engine</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Inferensi AI ultra-cepat dengan latensi respons instan <300ms.' : 'Ultra-fast AI inference with sub-300ms instant latency.'}</div>
                </div>
              </div>
              <div className="update-feature-item">
                <span className="feature-icon">📝</span>
                <div className="feature-content">
                  <div className="feature-title">Typernova Word Agent</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Penyusun dokumen otomatis (Cover, TOC titik-titik, Bab I-V, & Daftar Pustaka).' : 'Autonomous document drafter with full TOC leader dots & chapters.'}</div>
                </div>
              </div>
              <div className="update-feature-item">
                <span className="feature-icon">💻</span>
                <div className="feature-content">
                  <div className="feature-title">CodeDance Vibe Coding IDE</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Autonomous Coding Agent & Cloud Terminal Sandbox terintegrasi.' : 'Autonomous coding agent & live cloud terminal sandbox.'}</div>
                </div>
              </div>
              <div className="update-feature-item">
                <span className="feature-icon">⏱️</span>
                <div className="feature-content">
                  <div className="feature-title">Smart Redirect Countdown</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Kartu transisi halus 5 detik saat beralih workspace tanpa mengejutkan pengguna.' : 'Smooth 5s transition countdown card when switching workspaces.'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Sesi Akun' : 'Account Session'}
            </div>
            <button
              type="button"
              className="settings-logout-full-btn"
              onClick={() => {
                setShowSettingsModal(false);
                openLogoutConfirm();
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>{userLanguage === 'id' ? 'Keluar dari Akun' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HTML Editor Modal */}
      {showHtmlEditor && (
        <div className="modal-overlay" onClick={() => setShowHtmlEditor(false)}>
          <div className="modal-content html-editor-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowHtmlEditor(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>💻 {userLanguage === 'id' ? 'Editor Code' : 'Code Editor'}</h2>
            </div>
            
            <div className="modal-body html-editor-body">
              {/* Filename input */}
              <div className="html-filename-group">
                <label>{userLanguage === 'id' ? 'Nama file:' : 'Filename:'}</label>
                <input
                  type="text"
                  value={htmlFilename}
                  onChange={(e) => setHtmlFilename(e.target.value || 'code.txt')}
                  placeholder="code.txt"
                  className="html-filename-input"
                />
              </div>

              {/* Code Editor Textarea */}
              <div className="html-editor-group">
                <label>{userLanguage === 'id' ? 'Kode:' : 'Code:'}</label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="html-editor-textarea"
                  spellCheck="false"
                  placeholder={userLanguage === 'id' ? 'Edit code di sini...' : 'Edit code here...'}
                />
              </div>

              {/* Preview button */}
              <div className="html-preview-info">
                <svg className="info-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{userLanguage === 'id' ? 'Preview akan terbuka di tab baru (untuk HTML)' : 'Preview opens in new tab (for HTML)'}</span>
              </div>
            </div>

            <div className="modal-footer html-editor-footer">
              <button 
                className="html-preview-btn"
                onClick={() => setShowHtmlPreview(true)}
                title={userLanguage === 'id' ? 'Preview di dalam aplikasi' : 'Preview inside app'}
              >
                👁️ {userLanguage === 'id' ? 'Preview' : 'Preview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHtmlPreview && (
        <div className="modal-overlay" onClick={() => setShowHtmlPreview(false)}>
          <div className="modal-content html-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHtmlPreview(false)}>
              ✕
            </button>
            <div className="html-preview-body">
              <iframe
                className="html-preview-iframe"
                srcDoc={htmlContent}
                sandbox="allow-scripts allow-same-origin"
                title={userLanguage === 'id' ? 'Pratinjau HTML' : 'HTML Preview'}
              />
              <button className="preview-close-btn" onClick={() => setShowHtmlPreview(false)}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={closeLogoutConfirm}>
              ×
            </button>
            <div className="modal-header">
              <h2>{userLanguage === 'id' ? 'Konfirmasi Logout' : 'Logout Confirmation'}</h2>
            </div>
            <div className="modal-body">
              <p>
                {userLanguage === 'id'
                  ? 'Anda akan keluar dari akun ini. Semua session akan berakhir dan Anda harus login lagi untuk melanjutkan.'
                  : 'You will be logged out from this account. Your session will end and you will need to log in again to continue.'}
              </p>
              <p>
                {userLanguage === 'id'
                  ? 'Apakah Anda yakin ingin logout sekarang?'
                  : 'Are you sure you want to logout now?'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={closeLogoutConfirm}>
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button className="modal-btn-primary" onClick={confirmLogout} disabled={logoutLoading}>
                {logoutLoading
                  ? userLanguage === 'id' ? 'Logout...' : 'Logging out...'
                  : userLanguage === 'id' ? 'Logout' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessageId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={handleCancelEdit}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>{userLanguage === 'id' ? '✏️ Edit Pesan' : '✏️ Edit Message'}</h2>
            </div>
            <div className="modal-body">
              <textarea
                className="edit-message-textarea"
                value={editingMessageText}
                onChange={(e) => setEditingMessageText(e.target.value)}
                placeholder={userLanguage === 'id' ? 'Edit pesan Anda...' : 'Edit your message...'}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={handleCancelEdit}>
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button className="modal-btn-primary" onClick={handleEditAndResend}>
                {userLanguage === 'id' ? 'Edit & Kirim Ulang' : 'Edit & Resend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Marketplace Dashboard */}
      {showApiDashboard && (
        <div className="api-dashboard-fullscreen">
          <button 
            className="api-dashboard-close"
            onClick={() => setShowApiDashboard(false)}
            title="Back to chat"
          >
            ✕
          </button>
          <ApiMarketplace onLogout={() => setShowApiDashboard(false)} />
        </div>
      )}

      {/* Sources Modal */}
      {showSourcesModal && (
        <div className="modal-overlay" onClick={() => setShowSourcesModal(false)}>
          <div className="modal-content sources-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowSourcesModal(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📚 {userLanguage === 'id' ? 'Sumber Data' : 'Data Sources'}</h2>
            </div>
            
            <div className="modal-body sources-body">
              {!currentSources || currentSources.length === 0 ? (
                <div className="no-sources-message">
                  <p>
                    {userLanguage === 'id'
                      ? 'Belum ada sumber data untuk percakapan ini'
                      : 'No data sources available for this conversation'}
                  </p>
                  <p className="sources-hint">
                    {userLanguage === 'id'
                      ? 'Coba tanyakan tentang ekonomi, pasar, atau berita terbaru'
                      : 'Try asking about economy, markets, or latest news'}
                  </p>
                </div>
              ) : (
                <div className="sources-list">
                  {currentSources.map((source, idx) => (
                    <div key={source.id || idx} className="source-item">
                      <div className="source-header">
                        <span className="source-icon">{getSourceIcon(source.type)}</span>
                        <div className="source-meta">
                          <h3 className="source-title">{source.title}</h3>
                          <p className="source-type">{source.source}</p>
                          {source.timestamp && (
                            <p className="source-time">
                              {new Date(source.timestamp).toLocaleString(userLanguage === 'id' ? 'id-ID' : 'en-US')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {source.description && (
                        <p className="source-description">{source.description}</p>
                      )}
                      
                      <div className="source-actions">
                        {source.url && (
                          <button
                            className="source-open-btn"
                            onClick={() => handleOpenSource(source.url)}
                            title={userLanguage === 'id' ? 'Buka sumber' : 'Open source'}
                          >
                            🔗 {userLanguage === 'id' ? 'Buka' : 'Open'}
                          </button>
                        )}
                        <button
                          className="source-detail-btn"
                          onClick={() => handleViewSourceDetail(source)}
                          title={userLanguage === 'id' ? 'Lihat detail' : 'View details'}
                        >
                          📋 {userLanguage === 'id' ? 'Detail' : 'Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Detail Modal */}
      {selectedSource && (
        <div className="modal-overlay" onClick={() => setSelectedSource(null)}>
          <div className="modal-content source-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setSelectedSource(null)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📖 {userLanguage === 'id' ? 'Detail Sumber' : 'Source Details'}</h2>
            </div>
            
            <div className="modal-body source-detail-body">
              <div className="source-detail-grid">
                <div className="detail-field">
                  <label>{userLanguage === 'id' ? 'Judul' : 'Title'}</label>
                  <p className="detail-value">{selectedSource.title}</p>
                </div>
                
                <div className="detail-field">
                  <label>{userLanguage === 'id' ? 'Sumber' : 'Source'}</label>
                  <p className="detail-value">{selectedSource.source}</p>
                </div>
                
                <div className="detail-field">
                  <label>{userLanguage === 'id' ? 'Tipe' : 'Type'}</label>
                  <p className="detail-value">{selectedSource.type}</p>
                </div>
                
                {selectedSource.timestamp && (
                  <div className="detail-field">
                    <label>{userLanguage === 'id' ? 'Waktu' : 'Time'}</label>
                    <p className="detail-value">
                      {new Date(selectedSource.timestamp).toLocaleString(userLanguage === 'id' ? 'id-ID' : 'en-US')}
                    </p>
                  </div>
                )}
                
                {selectedSource.query && (
                  <div className="detail-field">
                    <label>{userLanguage === 'id' ? 'Query' : 'Query'}</label>
                    <p className="detail-value">{selectedSource.query}</p>
                  </div>
                )}
              </div>
              
              {selectedSource.description && (
                <div className="detail-section">
                  <h4>{userLanguage === 'id' ? 'Deskripsi' : 'Description'}</h4>
                  <p>{selectedSource.description}</p>
                </div>
              )}
              
              {selectedSource.url && (
                <div className="detail-actions">
                  <button
                    className="source-url-btn"
                    onClick={() => handleOpenSource(selectedSource.url)}
                  >
                    🔗 {selectedSource.url}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Combined Top-Left Control Pill (Hamburger + Plus button) */}
      <div className="top-left-combined-pill">
        <button
          className={`top-pill-btn toggle-sidebar-btn ${sidebarOpen ? 'sidebar-active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? (userLanguage === 'id' ? 'Tutup sidebar' : 'Close sidebar') : (userLanguage === 'id' ? 'Buka sidebar' : 'Open sidebar')}
        >
          <i className="fas fa-bars"></i>
        </button>
        <div className="top-pill-divider"></div>
        <button
          className={`top-pill-btn floating-add-btn ${showFloatingMenu ? 'active' : ''}`}
          onClick={() => setShowFloatingMenu(!showFloatingMenu)}
          title={userLanguage === 'id' ? 'Menu tambahan' : 'More options'}
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* Token Usage Display (Top-Right, left of + button, no background, hidden by default unless enabled in settings) */}
      {showTokenUsage && (
        <div 
          className={`top-right-token-display ${isTokenUsageLimited() ? 'limit-reached' : ''}`}
          onClick={() => {
            showAlert(
              userLanguage === 'id'
                ? `⚡ Token terpakai: ${tokenUsage.usedTokens.toLocaleString('id-ID')} / ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}. (Gambar = 30.000 token).${tokenUsage.resetTime ? ` Reset dalam: ${countdownText}` : ''}`
                : `⚡ Token usage: ${tokenUsage.usedTokens.toLocaleString('en-US')} / ${MAX_TOKEN_LIMIT.toLocaleString('en-US')}. (Image = 30,000 tokens).${tokenUsage.resetTime ? ` Reset in: ${countdownText}` : ''}`,
              tokenUsage.resetTime ? 'warning' : 'info',
              4000
            );
          }}
          title={
            userLanguage === 'id' 
              ? `Penggunaan Token: ${tokenUsage.usedTokens.toLocaleString('id-ID')} / ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}`
              : `Token Usage: ${tokenUsage.usedTokens.toLocaleString('en-US')} / ${MAX_TOKEN_LIMIT.toLocaleString('en-US')}`
          }
        >
          <span className="token-icon">{tokenUsage.resetTime ? '⏳' : '⚡'}</span>
          <span className="token-text">
            {tokenUsage.resetTime
              ? `Reset ${countdownText}`
              : `${tokenUsage.usedTokens.toLocaleString('id-ID')} / ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}`}
          </span>
        </div>
      )}



      {/* Floating menu for + button */}
      {showFloatingMenu && (
        <div className="floating-menu">
          <button
            className="floating-menu-item"
            onClick={() => {
              createNewConversation();
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Chat baru' : 'New chat'}
          >
            <i className="fas fa-comment-alt" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Chat Baru' : 'New Chat'}
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowPersonalityModal(true);
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Ubah kepribadian' : 'Change personality'}
          >
            <i className="fas fa-theater-masks" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Kepribadian' : 'Personality'}
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowApiDashboard(true);
              setShowFloatingMenu(false);
            }}
            title="API & Pricing"
          >
            <i className="fas fa-plug" style={{ marginRight: '8px' }}></i>API
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowPrivateModal(true);
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Mulai obrolan pribadi' : 'Start private chat'}
          >
            <i className="fas fa-lock" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Private Chat' : 'Private Chat'}
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowSettingsModal(true);
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Pengaturan' : 'Settings'}
          >
            <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Pengaturan' : 'Settings'}
          </button>
          {currentSources && currentSources.length > 0 && (
            <button
              className="floating-menu-item sources-menu-item"
              onClick={() => {
                handleShowSources();
                setShowFloatingMenu(false);
              }}
              title={userLanguage === 'id' ? 'Lihat sumber data' : 'View data sources'}
            >
              📚 {userLanguage === 'id' ? 'Sumber Data' : 'Sources'} ({currentSources.length})
            </button>
          )}
        </div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <div 
              className="sidebar-brand-wrapper" 
              onClick={() => onNavigate?.('landing')}
              style={{ cursor: 'pointer' }}
              title="Kembali ke Beranda / Landing Page"
            >
              <img src="/logo.png" alt="Deepernova AI" className="sidebar-brand-logo" />
              <div className="sidebar-brand-text">
                <h3>Deepernova AI</h3>
                <p className="sidebar-subtitle">indonesian ai research</p>
              </div>
            </div>
          </div>
          
          {/* API & Pricing Buttons */}


          <div className="sidebar-header-actions">


            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="sidebar-top-buttons-row">
          <button className="new-chat-btn" onClick={createNewConversation}>
            + New Chat
          </button>

          {isAuthenticated && !isGuest && (
            <button 
              className="saved-images-btn" 
              onClick={() => setShowSavedImagesGallery(true)}
              title={userLanguage === 'id' ? 'Gambar Tersimpan' : 'Saved Images'}
            >
              🎨 {userLanguage === 'id' ? 'Gambar Saya' : 'My Images'}
            </button>
          )}
        </div>

        <button 
          className="universe-sidebar-btn" 
          onClick={() => onNavigate?.('universe')}
          title={userLanguage === 'id' ? 'Deepernova Universe' : 'Universe'}
        >
          <img src="https://img.icons8.com/fluency/48/universe.png" alt="Universe" className="universe-btn-icon" />
          {userLanguage === 'id' ? 'Deepernova Universe' : 'Universe'}
        </button>

        {/* Search bar inside sidebar */}
        <div className="sidebar-search-container">
          <div className="sidebar-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="sidebar-search-input"
              placeholder={userLanguage === 'id' ? "Cari riwayat pesan..." : "Search chat history..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>

        {searchQuery.trim() ? (
          <div className="search-results-list">
            <div className="search-results-header">
              {userLanguage === 'id' ? `Hasil pencarian (${searchResults.length})` : `Search results (${searchResults.length})`}
            </div>
            {searchResults.length === 0 ? (
              <div className="search-results-empty">
                {userLanguage === 'id' ? 'Tidak ditemukan pesan' : 'No messages found'}
              </div>
            ) : (
              searchResults.map((result, idx) => {
                const matchIndex = result.text.toLowerCase().indexOf(searchQuery.toLowerCase());
                const start = Math.max(0, matchIndex - 30);
                const end = Math.min(result.text.length, matchIndex + searchQuery.length + 40);
                const snippet = (start > 0 ? '...' : '') + result.text.substring(start, end) + (end < result.text.length ? '...' : '');

                return (
                  <div
                    key={`${result.messageId}-${idx}`}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(result.conversationId, result.messageId)}
                  >
                    <div className="result-conv-title">{result.conversationTitle}</div>
                    <div className="result-sender">{result.sender === 'user' ? '👤 Anda' : '🤖 AI'}</div>
                    <div className="result-snippet">
                      {snippet.split(new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')).map((part, i) => 
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark key={i} className="search-highlight">{part}</mark>
                        ) : part
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="conversations-list">
            {[...conversations]
              .filter(conv => !conv.isPrivate)
              .sort((a, b) => {
                const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return timeB - timeA;
              })
              .map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''} ${conv.isDeleting ? 'deleting' : ''}`}
                onClick={() => switchConversation(conv.id)}
              >
                <div className="conv-title" title={conv.title}>{conv.title}</div>
                <div className="conv-time">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </div>
                <button
                  className={`conv-delete ${conv.isLoading ? 'loading-active' : ''}`}
                  disabled={conv.isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!conv.isLoading) {
                      deleteConversation(conv.id);
                    }
                  }}
                  title={conv.isLoading ? 'Generating...' : 'Delete session'}
                >
                  {conv.isLoading ? (
                    <div className="sidebar-loading-spinner">
                      <div className="spinner-circle"></div>
                      <div className="spinner-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  ) : (
                    <i className="fas fa-trash-alt" style={{ fontSize: '12px' }}></i>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}



        {/* Sidebar Footer (Settings & Profile) */}
        <div className="sidebar-footer">
          <div className="sidebar-profile-info">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="sidebar-profile-avatar" />
            ) : (
              <div className="sidebar-profile-avatar-fallback">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <div className="sidebar-profile-details">
              <div className="sidebar-profile-name" title={user?.name || (userLanguage === 'id' ? 'Pengguna Guest' : 'Guest User')}>
                {user?.name || (userLanguage === 'id' ? 'Pengguna Guest' : 'Guest User')}
              </div>
              <div className="sidebar-profile-email" title={user?.email || 'local-ai@deepernova'}>
                {user?.email || 'local-ai@deepernova'}
              </div>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <button 
              className="sidebar-footer-btn"
              onClick={() => setShowSettingsModal(true)}
              title={userLanguage === 'id' ? 'Pengaturan' : 'Settings'}
            >
              <i className="fas fa-cog"></i>
            </button>
            <button 
              className="sidebar-footer-btn"
              onClick={() => setShowGlobalMemorySettings(true)}
              title={userLanguage === 'id' ? 'Fine-Tune AI' : 'Fine-Tune AI'}
            >
              <i className="fas fa-dna"></i>
            </button>
            <button 
              className="sidebar-footer-btn"
              onClick={() => setShowPersonalityModal(true)}
              title={userLanguage === 'id' ? 'Kepribadian' : 'Personality'}
            >
              <i className="fas fa-theater-masks"></i>
            </button>
            {isAuthenticated && !isGuest && (
              <button 
                className="sidebar-footer-btn logout-btn"
                onClick={() => openLogoutConfirm()}
                title="Logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Sidebar backdrop for mobile */}
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? '' : 'closed'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="chatbot-container">
        <div className="chatbot-header">
        </div>

        {/* Custom Alert Notification */}
        {customAlert && (
          <div className={`custom-alert alert-${customAlert.type}${dismissingAlert ? ' dismissing' : ''}`}>
            <div className="alert-content">
              <span className="alert-message">{customAlert.message}</span>
              <button 
                className="alert-close"
                onClick={() => {
                  setDismissingAlert(true);
                  setTimeout(() => {
                    setCustomAlert(null);
                    setDismissingAlert(false);
                  }, 400);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="messages-container">
        {compactView && messages.length > 1 && !inputValue.trim() && (
          <div className="show-previous-wrapper">
            <button 
              type="button"
              className="show-previous-btn-modern"
              onClick={handleShowPreviousMessages}
              title={userLanguage === 'id' ? 'Lihat pesan sebelumnya' : 'View previous messages'}
            >
              <svg className="show-previous-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              <span>{userLanguage === 'id' ? 'Lihat Pesan Sebelumnya' : 'Lihat Pesan Sebelumnya'}</span>
            </button>
          </div>
        )}
        
        {foundSources.length > 0 && messages.length > 0 && (
          <div className="source-strip sources-above-output" onClick={() => setShowFoundSourcesPanel(true)}>
            <div className="source-strip-header">
              <div className="source-strip-text">
                <span>{userLanguage === 'id' ? 'Sumber internet' : 'Internet sources'}</span>
                <span className="source-strip-count">{foundSources.length} {userLanguage === 'id' ? 'sumber' : 'sources'}</span>
              </div>
              <div className="source-strip-label">{userLanguage === 'id' ? 'Klik untuk lihat detail' : 'Tap to view details'}</div>
            </div>
            <div className="source-logo-row small-logos">
              {foundSources.slice(0, 4).map((source, idx) => {
                const logo = getSourceLogo(source);
                return (
                  <button
                    key={source.id || idx}
                    type="button"
                    className="source-logo-chip"
                    aria-label={source.source || source.title || `Source ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFoundSourcesPanel(true);
                    }}
                  >
                    {logo.type === 'image' ? (
                      <img src={logo.value} alt={logo.label} />
                    ) : (
                      <span>{logo.value}</span>
                    )}
                  </button>
                );
              })}
              {foundSources.length > 4 && (
                <div className="source-logo-more">+{foundSources.length - 4}</div>
              )}
            </div>
          </div>
        )}

        {memoizedMessageList}

        {loading && (isGenerating || getConvLoading()) && loadingPhase && !messages.some(msg => msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isRecallingMemory || msg.isSearching)) && (
          <div className="message bot loading">
            <div className="message-content">
              <div className="typing-indicator-row">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="slow-processing-text">
                  {loadingPhase === 'sending' && (userLanguage === 'id' ? 'Mengirim...' : 'Sending...')}
                  {loadingPhase === 'thinking' && (userLanguage === 'id' ? 'Merenungi...' : 'Thinking...')}
                  {loadingPhase === 'slow' && (userLanguage === 'id' ? 'Merespon sedikit lebih lama dari biasanya...' : 'Taking a bit longer to respond...')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        
        {isScrolledUp && (
          <button 
            className={`scroll-to-bottom-btn ${isGenerating ? 'generating' : ''}`}
            onClick={handleScrollToBottomClick}
            title="Scroll ke bawah"
          >
            <img 
              src="https://img.icons8.com/ios-glyphs/30/ffffff/chevron-down.png" 
              alt="Scroll down" 
              style={{ width: '15px', height: '15px', display: 'block' }}
            />
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <div className="error-message">
              <p>Sorry, Pesan kamu tidak berhasil dikirim</p>
            </div>
            <div className="error-actions">
              <button 
                className="retry-button"
                onClick={handleRetry}
                disabled={loading}
              >
                {userLanguage === 'id' ? 'Lanjutkan' : 'Continue'}
              </button>
              <button 
                className="error-close"
                onClick={() => {
                  if (retryIntervalRef.current) {
                    clearInterval(retryIntervalRef.current);
                  }
                  setError(null);
                  setLastMessage(null);
                  partialMessageIdRef.current = null;
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <form className="input-form" onSubmit={handleSendMessage}>
        {/* Removed red no-internet banner - now handled by blurred screen overlay */}

        {/* Token Limit Popup Banner directly above input text */}
        {isTokenUsageLimited() && (
          <div className="token-limit-above-input-banner">
            <div className="token-banner-content">
              <span className="token-banner-icon">🔒</span>
              <span className="token-banner-text">
                {userLanguage === 'id' 
                  ? 'Maaf, Anda kehabisan token penggunaan.' 
                  : 'Sorry, you ran out of usage tokens.'}
              </span>
              <span className="token-banner-countdown">
                ⏳ {userLanguage === 'id' ? 'Reset dalam' : 'Reset in'} {countdownFullText || '04:00:00'}
              </span>
            </div>
          </div>
        )}

        {/* Mode & Active File Indicator Badge */}
        {activeFile && (
            <div className="active-file-indicator-pill">
              <span className="active-file-icon">📄</span>
              <span className="active-file-name" title={activeFile.name}>{activeFile.name}</span>
              <button 
                type="button"
                className="open-in-editor-btn"
                onClick={() => onNavigate?.('documents', activeFile.type)}
                title={userLanguage === 'id' ? 'Buka di Editor Penuh' : 'Open in Full Editor'}
              >
                <i className="fas fa-external-link-alt"></i>
              </button>
              <button
                type="button"
                className="clear-active-file-btn"
                onClick={() => {
                  setActiveFile(null);
                  showAlert(userLanguage === 'id' ? 'Berkas dinonaktifkan' : 'File deactivated', 'info');
                }}
                title={userLanguage === 'id' ? 'Tutup berkas' : 'Close file'}
              >
                ✕
              </button>
            </div>
          )}

        {/* Slash Command Autocomplete Popover */}
        {showSlashMenu && (() => {
          const filtered = SLASH_COMMANDS.filter(cmd => 
            cmd.command.toLowerCase().startsWith(inputValue.toLowerCase())
          );
          if (filtered.length === 0) return null;
          return (
            <div className="slash-commands-popover">
              <div className="popover-header">
                <span>⚡ {userLanguage === 'id' ? 'Perintah AI Agent' : 'AI Agent Commands'}</span>
              </div>
              <div className="popover-list">
                {filtered.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    type="button"
                    className={`popover-item ${idx === slashSelectedIndex ? 'active' : ''}`}
                    onClick={() => {
                      setInputValue(cmd.command + ' ');
                      setShowSlashMenu(false);
                      if (textareaElementRef.current) {
                        textareaElementRef.current.focus();
                      }
                    }}
                  >
                    <span className="popover-cmd">{cmd.command}</span>
                    <span className="popover-desc">
                      {userLanguage === 'id' ? cmd.desc_id : cmd.desc_en}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Uploaded Attachments Display */}
        {(uploadedFiles.length > 0 || uploadedImages.length > 0) && (
          <div className={`uploaded-attachments-container${attachmentQueueMinimized ? ' minimized' : ''}`}>
            <div className="uploaded-attachments-header">
              <span>📦 {uploadedFiles.length + uploadedImages.length} {userLanguage === 'id' ? 'lampiran' : 'attachment'}{uploadedFiles.length + uploadedImages.length !== 1 ? 's' : ''}</span>
              <div className="uploaded-attachments-header-actions">
                <button
                  className="minimize-files-btn"
                  type="button"
                  onClick={() => setAttachmentQueueMinimized(!attachmentQueueMinimized)}
                  title={attachmentQueueMinimized ? (userLanguage === 'id' ? 'Perluas' : 'Expand') : (userLanguage === 'id' ? 'Perkecil' : 'Minimize')}
                >
                  {attachmentQueueMinimized ? '▶' : '▼'}
                </button>
                <button
                  className="clear-files-btn"
                  onClick={clearAllAttachments}
                  title={userLanguage === 'id' ? 'Hapus semua lampiran' : 'Clear all attachments'}
                >
                  ✕
                </button>
              </div>
            </div>
            {!attachmentQueueMinimized && (
              <div className="uploaded-attachments-list">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="uploaded-file-chip">
                    <span className="file-icon">📄</span>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-meta">{file.size}KB · {file.tokens} tokens</span>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeUploadedFile(file.id)}
                      title={userLanguage === 'id' ? 'Hapus file' : 'Remove file'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {uploadedImages.map(image => (
                  <div key={image.id} className={`uploaded-image-chip status-${image.status}`}>
                    <div className="image-preview-thumb">
                      <img src={image.dataUrl} alt={image.fileName} />
                    </div>
                    <div className="image-chip-info">
                      <span className="image-file-name">{image.fileName}</span>
                      <span className="image-status">
                        {image.status === 'uploading' && '⬆️ Mengunggah...'}
                        {image.status === 'queued' && '⏳ Antrian'}
                        {image.status === 'analyzing' && '🔍 Analisis...'}
                        {image.status === 'analyzed' && '✅ Siap'}
                        {image.status === 'error' && `❌ ${image.error || 'Error'}`}
                      </span>
                    </div>
                    <div className="image-chip-actions">
                      <button
                        type="button"
                        className={`chip-hd-btn ${hdUpscalingMap[image.dataUrl] ? 'loading' : ''}`}
                        onClick={async () => {
                          if (hdUpscalingMap[image.dataUrl]) return;
                          setHdUpscalingMap((prev) => ({ ...prev, [image.dataUrl]: true }));
                          showAlert(userLanguage === 'id' ? '✨ Mengubah foto ke HD via Deepernova AI...' : '✨ Enhancing to HD via Deepernova AI...', 'info', 4000);
                          try {
                            const hdRes = await ImageGenerationService.generateImage(
                              'Enhance this image to crystal clear ultra HD quality with authentic Apple iPhone Pro color science. Sharpen all details, textures, and edges with lifelike balanced contrast while keeping all objects, people, colors, and scene 100% identical.',
                              '1024x1024',
                              null,
                              'qwen-image-edit-max',
                              image.dataUrl,
                              null
                            );
                            if (hdRes?.image?.url) {
                              setUploadedImages((prev) =>
                                prev.map((img) => (img.id === image.id ? { ...img, dataUrl: hdRes.image.url } : img))
                              );
                              showAlert(userLanguage === 'id' ? '✅ Foto di antrian berhasil di-HD-kan!' : '✅ Photo enhanced to HD!', 'success', 2500);
                            }
                          } catch (e) {
                            showAlert(userLanguage === 'id' ? '⚠️ Gagal meningkatkan HD.' : '⚠️ Failed to enhance HD.', 'error', 2500);
                          } finally {
                            setHdUpscalingMap((prev) => ({ ...prev, [image.dataUrl]: false }));
                          }
                        }}
                        title={userLanguage === 'id' ? 'Tingkatkan kualitas foto ini ke HD' : 'Upscale this photo to HD'}
                      >
                        {hdUpscalingMap[image.dataUrl] ? 'HD...' : '✨ HD'}
                      </button>
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => removeUploadedImage(image.id)}
                        title={userLanguage === 'id' ? 'Hapus gambar' : 'Remove image'}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Text Queue Display - OUTSIDE input-container, full width */}
        {textQueue.length > 0 && (
          <div className="pasted-text-container">
            <div className="pasted-text-header">
              <span>📋 {textQueue.length} {userLanguage === 'id' ? 'salinan teks' : 'text copy'}{textQueue.length !== 1 ? 's' : ''}</span>
              <button 
                className="clear-text-btn"
                type="button"
                onClick={() => setTextQueue([])}
                title={userLanguage === 'id' ? 'Hapus semua teks' : 'Clear all text'}
              >
                ✕
              </button>
            </div>
            <div className="pasted-text-list">
              {textQueue.map(item => (
                <div key={item.id} className="pasted-text-chip">
                  <span className="text-preview-icon">📄</span>
                  <div className="text-chip-info">
                    <span className="text-chip-label">{item.label}</span>
                    <span className="text-chip-preview">{item.content.substring(0, 60)}...</span>
                  </div>
                  <div className="text-chip-actions">
                    <button
                      type="button"
                      className="text-chip-edit-btn"
                      onClick={() => handleTextQueueItemClick(item)}
                      title={userLanguage === 'id' ? 'Edit teks' : 'Edit text'}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="text-chip-remove-btn"
                      onClick={() => handleRemoveTextItem(item.id)}
                      title={userLanguage === 'id' ? 'Hapus teks' : 'Remove text'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`input-container claude-style ${getConvLoading() ? 'generating' : ''}`}>
          {/* Attachment badge only when attachment queue is minimized */}
          {(uploadedFiles.length + uploadedImages.length > 0) && attachmentQueueMinimized && (
            <button
              type="button"
              className="file-attached-badge"
              onClick={() => setAttachmentQueueMinimized(false)}
              title={userLanguage === 'id' ? 'Tampilkan kembali lampiran' : 'Show attachments'}
            >
              📦 {uploadedFiles.length + uploadedImages.length}
            </button>
          )}

          {/* Hidden camera input for direct native camera trigger */}
          <input
            ref={(input) => {
              window.cameraCaptureInput = input;
            }}
            type="file"
            id="camera-capture-input"
            className="file-upload-input"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleImageUpload(e)}
            style={{ display: 'none' }}
          />

          {/* Hidden image gallery input */}
          <input
            ref={(input) => {
              window.imageUploadInput = input;
            }}
            type="file"
            id="image-upload-input"
            className="file-upload-input"
            accept="image/*"
            multiple
            onChange={(e) => handleImageUpload(e)}
            style={{ display: 'none' }}
          />

          {/* Hidden unified document upload input */}
          <input
            ref={(input) => {
              window.fileUploadInput = input;
            }}
            type="file"
            id="unified-upload-input"
            className="file-upload-input"
            accept=".txt,.csv,.json,.html,.md,.pdf,.docx,.doc,.xlsx,.xls"
            multiple
            onChange={(e) => handleFileUpload(e)}
            style={{ display: 'none' }}
          />

          {/* Top Multi-line Textarea Area */}
          <div className="textarea-wrapper">
            <textarea
              ref={(el) => {
                textareaElementRef.current = el;
                globalThis.textareaRef = el;
              }}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                scheduleTextareaResize(e.target);
              }}
              onKeyDown={(e) => {
                if (showSlashMenu) {
                  const filtered = SLASH_COMMANDS.filter(cmd => 
                    cmd.command.startsWith(inputValue.toLowerCase())
                  );
                  if (filtered.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSlashSelectedIndex(prev => (prev + 1) % filtered.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSlashSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                      return;
                    }
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const selected = filtered[slashSelectedIndex].command;
                      setInputValue(selected + ' ');
                      setShowSlashMenu(false);
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowSlashMenu(false);
                      return;
                    }
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (e.nativeEvent && e.nativeEvent.isComposing) {
                    return;
                  }
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              onPaste={handlePaste}
              placeholder={
                isTokenUsageLimited()
                  ? (userLanguage === 'id' ? "🔒 Maaf, token penggunaan Anda telah habis..." : "🔒 Sorry, token usage limit reached...")
                  : getConvLoading()
                    ? (userLanguage === 'id' ? "Sedang merespons..." : "Generating response...")
                    : (animatedPlaceholder || (userLanguage === 'id' ? "Tulis pesan ke Deepernova AI..." : "Message Deepernova AI..."))
              }
              disabled={getConvLoading() || isTokenUsageLimited()}
              className={`message-input ${getConvLoading() ? 'generating' : ''} ${isTokenUsageLimited() ? 'token-disabled' : ''}`}
              rows="1"
            />
          </div>

          {/* Bottom Card Toolbar: Actions, Model Selection, Mic, Voice Mode, Send */}
          <div className="input-card-toolbar">
            {/* Left: Attachment & Options (+) Button */}
            <div className="file-menu-container">
              <button
                type="button"
                className={`claude-attach-btn ${showInputMenu ? 'active' : ''}`}
                onClick={() => {
                  setShowInputMenu(!showInputMenu);
                  setShowModelMenu(false);
                }}
                title={userLanguage === 'id' ? 'Opsi & Lampiran' : 'Options & Attachments'}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              {showInputMenu && (
                <div className="file-menu-dropdown claude-dropdown">
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      handleOpenCamera();
                      setShowInputMenu(false);
                    }}
                    disabled={loading}
                  >
                    <span className="menu-icon"><i className="fas fa-camera" style={{ color: '#ef4444' }}></i></span>
                    <div className="menu-item-text">
                      <span className="menu-item-title">{userLanguage === 'id' ? 'Ambil Foto (Kamera Live)' : 'Take Photo (Live Camera)'}</span>
                      <span className="menu-item-desc">{userLanguage === 'id' ? 'Foto langsung objek / dokumen' : 'Live camera capture'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      window.imageUploadInput?.click();
                      setShowInputMenu(false);
                    }}
                    disabled={loading}
                  >
                    <span className="menu-icon"><i className="fas fa-image" style={{ color: '#3b82f6' }}></i></span>
                    <div className="menu-item-text">
                      <span className="menu-item-title">{userLanguage === 'id' ? 'Upload Gambar / Galeri' : 'Upload Image / Gallery'}</span>
                      <span className="menu-item-desc">{userLanguage === 'id' ? 'Analisis visual & reasoning' : 'Visual analysis'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      window.fileUploadInput?.click();
                      setShowInputMenu(false);
                    }}
                    disabled={loading}
                  >
                    <span className="menu-icon"><i className="fas fa-file-alt" style={{ color: '#ff6b00' }}></i></span>
                    <div className="menu-item-text">
                      <span className="menu-item-title">{userLanguage === 'id' ? 'Upload Dokumen / Berkas' : 'Upload Document / File'}</span>
                      <span className="menu-item-desc">PDF, Word (.docx), Excel (.xlsx)</span>
                    </div>
                  </button>

                  <div className="menu-divider"></div>

                  {/* Fine-Tune AI Settings */}
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setShowGlobalMemorySettings(true);
                      setShowInputMenu(false);
                    }}
                  >
                    <span className="menu-icon"><i className="fas fa-dna" style={{ color: '#8b5cf6' }}></i></span>
                    <div className="menu-item-text">
                      <span className="menu-item-title">{userLanguage === 'id' ? 'Fine-Tune AI & Memori' : 'Fine-Tune AI & Memory'}</span>
                      <span className="menu-item-desc">{userLanguage === 'id' ? 'Atur instruksi kustom Deepernova' : 'Custom AI instructions'}</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Deepernova Model Selector, Mic, Voice Mode, Send */}
            <div className="input-toolbar-right">
              {/* Deepernova Model Selector Dropdown Badge */}
              <div className="claude-model-selector-wrapper">
                <button
                  type="button"
                  className={`claude-model-selector-btn ${showModelMenu ? 'active' : ''}`}
                  onClick={() => {
                    setShowModelMenu(!showModelMenu);
                    setShowInputMenu(false);
                  }}
                  title={userLanguage === 'id' ? 'Pilih Model Deepernova AI' : 'Select Deepernova AI Model'}
                >
                  <span className="model-btn-name">{currentModelObj.name}</span>
                  <span className="model-btn-badge">{userLanguage === 'id' ? currentModelObj.speed : currentModelObj.speedEn}</span>
                  <svg className={`model-chevron ${showModelMenu ? 'open' : ''}`} viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {showModelMenu && (
                  <div className="claude-model-dropdown">
                    <div className="model-dropdown-note-banner">
                      <div className="model-dropdown-note-badge">
                        <i className="fas fa-info-circle"></i>
                        <span>{userLanguage === 'id' ? 'Catatan Pengembang' : 'Developer Note'}</span>
                      </div>
                      <p className="model-dropdown-note-desc">
                        {userLanguage === 'id'
                          ? 'Berhubung sedang dikembangkannya model AI kami yang seperti di bawah, maka kami memutuskan untuk efisiensi peluncuran dengan menggunakan API AI pihak ketiga yaitu ChatGPT Luna.'
                          : 'As our in-house AI models listed below are currently under development, for launch efficiency we are utilizing a third-party AI API (ChatGPT Luna).'}
                      </p>
                    </div>
                    <div className="model-dropdown-header">
                      <div className="model-dropdown-header-title">
                        <span>{userLanguage === 'id' ? 'Model Deepernova AI' : 'Deepernova AI Models'}</span>
                      </div>
                      <span className="model-dropdown-disabled-warning">
                        {userLanguage === 'id'
                          ? 'Di bawah ini model saat ini belum berfungsi'
                          : 'Models below are currently not functional'}
                      </span>
                    </div>
                    <div className="model-dropdown-list">
                      {DEEPERNOVA_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`model-option-item ${selectedModel === m.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setShowModelMenu(false);
                          }}
                        >
                          <div className="model-option-top">
                            <span className="model-option-icon">{m.icon}</span>
                            <span className="model-option-name">{m.name}</span>
                            <span className="model-option-tag">{userLanguage === 'id' ? m.speed : m.speedEn}</span>
                            {selectedModel === m.id && <span className="model-check-icon">✓</span>}
                          </div>
                          <p className="model-option-desc">
                            {userLanguage === 'id' ? m.desc : m.descEn}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Speech-to-Text Microphone Button */}
              <button
                type="button"
                className={`claude-tool-btn mic-btn ${isSttListening ? 'listening' : ''}`}
                onClick={toggleSpeechToText}
                disabled={isTokenUsageLimited()}
                title={
                  isSttListening
                    ? (userLanguage === 'id' ? 'Sedang mendengarkan... (Klik untuk berhenti)' : 'Listening... (Click to stop)')
                    : (userLanguage === 'id' ? 'Bicara untuk ketik pesan' : 'Speak to type message')
                }
              >
                <svg className="tool-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              </button>

              {/* Real-time Voice Chat Mode Button */}
              <button
                type="button"
                className="claude-tool-btn voice-btn"
                onClick={() => setShowVoiceDevModal(true)}
                title={userLanguage === 'id' ? 'Mode Obrolan Suara' : 'Voice Chat Mode'}
              >
                <span className="claude-wave-bars">
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                </span>
              </button>

              {/* Unified Send or Stop Action Button */}
              {getConvLoading() ? (
                <button 
                  type="button"
                  className="claude-action-btn stop-mode"
                  onClick={handleStopStreaming}
                  title={userLanguage === 'id' ? "Hentikan generasi" : "Stop generation"}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <rect x="5" y="5" width="14" height="14" rx="2"></rect>
                  </svg>
                </button>
              ) : (
                <button 
                  type="submit"
                  className={`claude-action-btn send-mode ${(inputValue.trim() || textQueue.length > 0) ? 'has-text' : 'empty'}`}
                  disabled={isTokenUsageLimited() || (!inputValue.trim() && textQueue.length === 0)}
                  title={userLanguage === 'id' ? "Kirim pesan" : "Send message"}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Reasoning popup was moved into the messages container to render inline with messages */}

      {/* Text Paste Popup Modal */}
      {showTextPopup && selectedTextItem && (
        <div className="text-popup-overlay" onClick={() => {
          setShowTextPopup(false);
          setSelectedTextItem(null);
          setEditingTextContent('');
        }}>
          <div className="text-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="text-popup-header">
              <h3>
                {userLanguage === 'id' ? '📋 Salinan Teks' : '📋 Text Copy'}
              </h3>
              <button
                type="button"
                className="popup-close-btn"
                onClick={() => {
                  setShowTextPopup(false);
                  setSelectedTextItem(null);
                  setEditingTextContent('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="text-popup-body">
              <textarea
                value={editingTextContent}
                onChange={(e) => setEditingTextContent(e.target.value)}
                className="text-popup-textarea"
                placeholder={userLanguage === 'id' ? 'Edit teks di sini...' : 'Edit text here...'}
              />
            </div>

            <div className="text-popup-footer">
              <button
                type="button"
                className="popup-action-btn save-btn"
                onClick={handleSaveTextEdit}
              >
                {userLanguage === 'id' ? '✓ Simpan & Kirim' : '✓ Save & Send'}
              </button>
              <button
                type="button"
                className="popup-action-btn cancel-btn"
                onClick={() => {
                  setShowTextPopup(false);
                  setSelectedTextItem(null);
                  setEditingTextContent('');
                }}
              >
                {userLanguage === 'id' ? '✕ Tutup' : '✕ Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Voice Feature In Development Pop-up Modal */}
      {showVoiceDevModal && (
        <div className="modern-feature-modal-overlay" onClick={() => setShowVoiceDevModal(false)}>
          <div className="modern-feature-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="feature-modal-close-btn"
              onClick={() => setShowVoiceDevModal(false)}
              aria-label="Tutup"
            >
              ✕
            </button>
            
            <div className="feature-modal-icon-badge voice-pulse">
              <span className="feature-modal-icon">🎙️</span>
            </div>

            <div className="feature-modal-tag">
              {userLanguage === 'id' ? 'Sedang Dikembangkan' : 'Under Development'}
            </div>

            <h3 className="feature-modal-title">
              {userLanguage === 'id' ? 'Fitur Obrolan Suara' : 'Voice Chat Feature'}
            </h3>

            <p className="feature-modal-desc">
              {userLanguage === 'id' 
                ? 'Maaf, fitur obrolan suara saat ini belum tersedia dan sedang dalam tahap pengembangan. Silakan coba kembali di lain waktu.' 
                : 'Sorry, the real-time voice chat feature is currently in development and not yet available. Please try again later.'}
            </p>

            <div className="feature-modal-actions">
              <button 
                type="button" 
                className="feature-modal-confirm-btn"
                onClick={() => setShowVoiceDevModal(false)}
              >
                {userLanguage === 'id' ? 'Mengerti' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVoiceChat && <VoiceChat onClose={() => setShowVoiceChat(false)} userLanguage={userLanguage} isAuthenticated={isAuthenticated} isGuest={isGuest} />}

      {/* Saved Images Gallery */}
      <SavedImagesGallery 
        isOpen={showSavedImagesGallery}
        onClose={() => setShowSavedImagesGallery(false)}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmConvId(null); }}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-header">
              <h3>⚠️ Hapus Sesi?</h3>
              <p>Apakah Anda yakin ingin menghapus sesi ini? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmConvId(null); }}
              >
                Batal
              </button>
              <button 
                className="btn-delete"
                onClick={() => confirmDeleteConversation(deleteConfirmConvId)}
              >
                Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonationModal && (
        <div className="modal-overlay" onClick={() => setShowDonationModal(false)}>
          <div className="modal-content donation-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowDonationModal(false)}
            >
              ✕
            </button>
            <div className="donation-modal-header">
              <h2>💝 Dukung Deepernova AI</h2>
            </div>
            <div className="donation-modal-body">
              <div className="donation-content">
                <div className="donation-qrcode">
                  <div className="qrcode-container">
                    <img 
                      src="/qr code qris.jpeg"
                      alt="QRIS Donation QR Code"
                      className="qrcode-image"
                    />
                    <p className="qrcode-label">
                      Scan QRIS ini. Nominal berapa pun berarti.
                    </p>
                  </div>
                </div>

                <div className="donation-message">
                  <p className="donation-text-main">
                    🇮🇩 AI Berkualitas Seharusnya Bukan Hak Orang Kaya
                  </p>
                  <p className="donation-text-secondary">
                    Hari ini, akses ke AI terbaik butuh biaya ratusan ribu hingga jutaan rupiah per tahun. Artinya jutaan pelajar Indonesia — yang justru paling butuh — tidak bisa menjangkaunya.
                  </p>
                  <p className="donation-text-secondary">
                    Anak yang tidak punya akses AI hari ini, akan tertinggal dari teman-temannya yang punya. Di sekolah. Di dunia kerja. Di masa depan.
                  </p>
                  <div className="donation-impact">
                    <h3>🚀 Deepernova Hadir untuk Menutup Kesenjangan Itu</h3>
                    <ul className="donation-points">
                      <li>✓ AI buatan anak bangsa. Gratis. Untuk siapa saja. Tanpa syarat.</li>
                      <li>✓ Kami tidak minta banyak — hanya kepercayaan Anda bahwa setiap anak Indonesia berhak punya kesempatan yang sama.</li>
                      <li>✓ Karena masa depan Indonesia tidak seharusnya ditentukan oleh siapa yang mampu membayar.</li>
                    </ul>
                  </div>
                  <p className="donation-text-secondary quote-text">
                    {userLanguage === 'id'
                      ? '"Kami tidak meminta banyak. Kami hanya minta Anda percaya bahwa anak Indonesia layak punya akses ke teknologi terbaik dunia — dan ikut mewujudkannya."'
                      : '"We do not ask for much. We only ask you to believe that Indonesian children deserve access to the world’s best technology — and help make it happen."'}
                  </p>
                  <p className="testimonial-author">
                    — Ferry & Tim Deepernova
                  </p>
                </div>
              </div>

              <div className="donation-testimonial">
                <p className="testimonial-text">
                  "Setiap rupiah yang Anda donasikan adalah investasi untuk generasi AI pioneers Indonesia yang kompeten dan bermoral."
                </p>
                <p className="testimonial-author">
                  — Ferry & Tim Deepernova
                </p>
              </div>
            </div>
            <div className="donation-modal-footer">
              <button
                className="modal-btn-cancel"
                onClick={() => setShowDonationModal(false)}
              >
                Tutup
              </button>
              <button
                className="modal-btn-primary donation-thanks-btn"
                onClick={() => setShowDonationModal(false)}
              >
                ❤️ Terima Kasih!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Generator Modal */}
      {/* Image Generator Modal - Removed: now generating inline in chat */}

      {/* Search Results Modal */}
      {activeSearchSources && (
        <div className="modal-overlay search-modal-overlay" onClick={() => setActiveSearchSources(null)}>
          <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close search-modal-close"
              onClick={() => setActiveSearchSources(null)}
              title={userLanguage === 'id' ? 'Tutup' : 'Close'}
            >
              ✕
            </button>
            
            <div className="search-modal-header">
              <h2><i className="fa-solid fa-square-rss" style={{ marginRight: '8px', color: '#1e3a8a' }}></i> {userLanguage === 'id' ? 'Hasil Pencarian Lengkap' : 'Full Search Results'}</h2>
              <p className="search-modal-query">{userLanguage === 'id' ? 'Kueri:' : 'Query:'} <strong>"{activeSearchSources.query}"</strong></p>
            </div>

            <div className="search-modal-body">
              <div className="search-results-list">
                {activeSearchSources.sources.map((item, idx) => (
                  <div key={idx} className="search-result-item">
                    <div className="search-result-title-row">
                      <img 
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${item.domain}`}
                        onError={(e) => { e.target.src = 'https://img.icons8.com/ios-glyphs/30/1e3a8a/globe.png' }}
                        className="search-result-favicon"
                      />
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="search-result-link-title">
                        {item.title}
                      </a>
                    </div>
                    <span className="search-result-url">{item.link}</span>
                    <p className="search-result-snippet">{item.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Enlargement Modal (Sleek Fullscreen Lightbox) */}
      {showImageModal && enlargedImage && (
        <div className="image-lightbox-overlay" onClick={closeImageModal}>
          <button 
            className="lightbox-close-btn"
            onClick={closeImageModal}
            title={userLanguage === 'id' ? 'Tutup' : 'Close'}
          >
            ✕
          </button>
          
          <div className="lightbox-image-container" onClick={(e) => e.stopPropagation()}>
            <img 
              src={enlargedImage.url} 
              alt={enlargedImage.alt}
              className="lightbox-image"
              onError={(e) => {
                console.error('[ChatBot] ❌ Enlarged image load error:', enlargedImage.url);
                fetch(enlargedImage.url, { method: 'HEAD' })
                  .then(res => {
                    console.log('[ChatBot] 🔍 Enlarged image fetch HEAD:', res.status, res.statusText);
                  })
                  .catch(err => console.error('[ChatBot] 🔍 Enlarged image fetch error:', err.message));
                e.target.parentElement.innerHTML = `<div style="padding: 40px; text-align: center; color: #f87171; font-weight: 600; font-size: 16px;">⚠️ ${userLanguage === 'id' ? 'Gagal memuat gambar' : 'Failed to load image'}</div>`;
              }}
              onLoad={() => {
                console.log('[ChatBot] ✅ Enlarged image loaded:', enlargedImage.url);
              }}
            />
            {enlargedImage.alt && enlargedImage.alt !== 'Generated Image' && enlargedImage.alt.trim().length > 0 && (
              <div className="lightbox-caption">
                {enlargedImage.alt}
              </div>
            )}
          </div>

          <div className="lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="lightbox-action-btn download-btn"
              onClick={handleDownloadImage}
            >
              ⬇️ {userLanguage === 'id' ? 'Unduh Gambar' : 'Download Image'}
            </button>
          </div>
        </div>
      )}


      {/* Agent Live Workspace Panel */}
      {aiMode === 'agent' && (
        <div className="agent-workspace-panel">
          <div className="workspace-header">
            <h3>
              <i className="fas fa-microchip" style={{ marginRight: 8, color: '#ea580c' }}></i>
              {userLanguage === 'id' ? 'Agent Live Workspace' : 'Agent Live Workspace'}
            </h3>
            <button 
              type="button"
              className="close-workspace-btn"
              onClick={() => {
                setAiMode('brainstorm');
                showAlert(userLanguage === 'id' ? 'Mode Brainstorm aktif' : 'Brainstorm Mode active', 'info');
              }}
              title={userLanguage === 'id' ? 'Tutup Workspace' : 'Close Workspace'}
            >
              ✕
            </button>
          </div>

          {/* Active File Preview Section */}
          {activeFile ? (
            <div className="workspace-active-file-card">
              <div className="active-file-header">
                <div className="file-info">
                  <span className="file-icon">
                    {activeFile.type === 'excel' ? '📊' : activeFile.type === 'pptx' ? '🎦' : '📄'}
                  </span>
                  <div>
                    <h4>{activeFile.name}</h4>
                    <p className="file-type-tag">{activeFile.type.toUpperCase()}</p>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    type="button"
                    className="workspace-btn primary"
                    onClick={() => onNavigate?.('documents', activeFile.type)}
                    title={userLanguage === 'id' ? 'Buka di Editor Penuh' : 'Open in Full Editor'}
                  >
                    <i className="fas fa-external-link-alt"></i>
                  </button>
                  <button
                    type="button"
                    className="workspace-btn danger"
                    onClick={async () => {
                      if (window.confirm(userLanguage === 'id' ? `Hapus berkas "${activeFile.name}"?` : `Delete file "${activeFile.name}"?`)) {
                        try {
                          await fetch(`/api/cloud/files/${activeFile.id}`, { method: 'DELETE' });
                          setActiveFile(null);
                          fetchWorkspaceFiles();
                          showAlert(userLanguage === 'id' ? 'Berkas dihapus' : 'File deleted', 'info');
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    title={userLanguage === 'id' ? 'Hapus Berkas' : 'Delete File'}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              {/* LIVE CONTENT PREVIEW */}
              <div className="active-file-preview-body">
                {activeFile.type === 'docx' && (
                  <div 
                    className="docx-preview-content"
                    dangerouslySetInnerHTML={{ __html: activeFile.content?.[0]?.text || '<p>Dokumen Kosong</p>' }}
                  />
                )}

                {activeFile.type === 'pptx' && (
                  <div className="pptx-preview-content">
                    {Array.isArray(activeFile.content) && activeFile.content.map((slide, index) => (
                      <div key={slide.id || index} className="ppt-slide-preview">
                        <div className="slide-num">Slide {index + 1}</div>
                        <h5>{slide.title || 'Tanpa Judul'}</h5>
                        <p>{slide.content || 'Kosong'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeFile.type === 'excel' && (
                  <div className="excel-preview-content">
                    {(() => {
                      const sheets = activeFile.content?.excelSheets || [];
                      const activeSheetIdx = activeFile.content?.activeSheet || 0;
                      const currentSheet = sheets[activeSheetIdx];
                      if (!currentSheet || !Array.isArray(currentSheet.data)) return <p>Sheet Kosong</p>;
                      return (
                        <div className="excel-preview-table-wrapper">
                          <div className="excel-sheets-tabs">
                            {sheets.map((sheet, sIdx) => (
                              <span key={sIdx} className={`sheet-tab ${sIdx === activeSheetIdx ? 'active' : ''}`}>
                                {sheet.name}
                              </span>
                            ))}
                          </div>
                          <table className="excel-preview-table">
                            <tbody>
                              {currentSheet.data.slice(0, 10).map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {Array.isArray(row) && row.slice(0, 6).map((cell, cIdx) => (
                                    <td key={cIdx}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {currentSheet.data.length > 10 && (
                            <div className="preview-more-rows">... dan {currentSheet.data.length - 10} baris lagi</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="workspace-no-active-file">
              <i className="fas fa-file-signature" style={{ fontSize: 32, color: '#94a3b8', marginBottom: 12 }}></i>
              <p>{userLanguage === 'id' ? 'Belum ada berkas aktif.' : 'No active file.'}</p>
              <span className="help-text">
                {userLanguage === 'id' 
                  ? 'Gunakan perintah `/buatfile [nama]` atau pilih salah satu berkas di bawah untuk mulai menyunting secara otomatis.' 
                  : 'Use `/buatfile [name]` or select a file below to start editing.'}
              </span>
            </div>
          )}

          {/* Agent Command Execution Live logs card */}
          {isAgentExecuting && (
            <div className="agent-execution-logs-card">
              <div className="card-header-logs">
                <span className="spinner-dots">⚙️</span>
                <h5>Agent Executing Task...</h5>
              </div>
              <div className="logs-body">
                {agentLogs.map((log, index) => (
                  <div key={index} className="log-line">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Manager list of files */}
          <div className="workspace-file-manager">
            <h4>
              <i className="fas fa-folder-open" style={{ marginRight: 6, color: '#ea580c' }}></i>
              {userLanguage === 'id' ? 'Berkas Workspace' : 'Workspace Files'}
            </h4>
            
            <div className="workspace-search-box">
              <input
                type="text"
                placeholder={userLanguage === 'id' ? 'Cari file...' : 'Search files...'}
                value={workspaceSearch}
                onChange={(e) => setWorkspaceSearch(e.target.value)}
              />
            </div>

            <div className="workspace-file-list">
              {workspaceFiles
                .filter(f => f.name.toLowerCase().includes(workspaceSearch.toLowerCase()))
                .map(file => (
                  <div 
                    key={file.id} 
                    className={`workspace-file-item ${activeFile && activeFile.id === file.id ? 'active' : ''}`}
                    onClick={() => selectActiveFile(file)}
                  >
                    <span className="file-icon">
                      {file.type === 'excel' ? '📊' : file.type === 'pptx' ? '🎦' : '📄'}
                    </span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-time">{new Date(file.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              {workspaceFiles.length === 0 && (
                <div className="empty-files-text">
                  {userLanguage === 'id' ? 'Belum ada berkas.' : 'No files found.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Memory Settings Modal */}
      <GlobalMemorySettings 
        isOpen={showGlobalMemorySettings}
        onClose={() => setShowGlobalMemorySettings(false)}
        isAuthenticated={isAuthenticated}
        isGuest={isGuest}
      />

      {/* 📡 Connection Error Blurred Backdrop Modal Popup */}
      {showConnectionErrorModal && (
        <div className="connection-error-modal-overlay" onClick={() => setShowConnectionErrorModal(false)}>
          <div className="connection-error-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowConnectionErrorModal(false)}>✕</button>
            <div className="modal-icon-badge">📡</div>
            <h3 className="modal-error-title">{userLanguage === 'id' ? 'Koneksi Terputus' : 'Connection Interrupted'}</h3>
            <p className="modal-error-description">{connectionErrorMessage}</p>
            <div className="modal-action-row">
              <button className="modal-dismiss-btn" onClick={() => setShowConnectionErrorModal(false)}>
                {userLanguage === 'id' ? 'Tutup' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧠 Blurred Backdrop Image Reasoning & Intent Flag Pop-up Modal */}
      {isReasoningImage && (
        <div className="image-reasoning-overlay">
          <div className="image-reasoning-card">
            <div className="image-reasoning-glow"></div>
            
            {/* Header */}
            <div className="image-reasoning-header">
              <div className="reasoning-brain-icon">🧠</div>
              <div className="reasoning-header-text">
                <h3>Visual Reasoning & Flag Engine</h3>
                <p>{userLanguage === 'id' ? 'Menganalisis payload gambar & menentukan intent AI...' : 'Analyzing image payload & determining AI intent...'}</p>
              </div>
            </div>

            {/* Thumbnail holding preview */}
            <div className="image-reasoning-preview">
              {reasoningImages && reasoningImages.length > 0 && reasoningImages.map((img, idx) => (
                <div key={idx} className="reasoning-thumb-wrapper">
                  <img src={img.dataUrl || img.url || img.base64} alt="Payload preview" className="reasoning-thumb" />
                  <span className="reasoning-thumb-badge">HOLD</span>
                </div>
              ))}
            </div>

            {/* Prompt Preview */}
            {reasoningPrompt && (
              <div className="reasoning-prompt-box">
                <span className="reasoning-prompt-label">Prompt:</span> "{reasoningPrompt}"
              </div>
            )}

            {/* Step Progress Indicators */}
            <div className="reasoning-steps-container">
              <div className={`reasoning-step-item ${reasoningStep >= 1 ? 'active' : ''}`}>
                <span className="step-icon">{reasoningStep >= 1 ? '✅' : '🔍'}</span>
                <span>{userLanguage === 'id' ? 'Inspeksi Visual Payload & Data Frame' : 'Visual Payload Inspection'}</span>
              </div>
              <div className={`reasoning-step-item ${reasoningStep >= 2 ? 'active' : ''}`}>
                <span className="step-icon">{reasoningStep >= 2 ? '✅' : '🤖'}</span>
                <span>{userLanguage === 'id' ? 'Klasifikasi Intent (Edit ✏️ | Baca 👁️ | Referensi 🎨)' : 'Intent Classification (Edit ✏️ | Vision 👁️ | Ref 🎨)'}</span>
              </div>
              <div className={`reasoning-step-item ${reasoningStep >= 3 ? 'active' : ''}`}>
                <span className="step-icon">{reasoningStep >= 3 ? '⚡' : '⏳'}</span>
                <span>{userLanguage === 'id' ? 'Penetapan Flag & Eksekusi AI' : 'Flag Assignment & AI Execution'}</span>
              </div>
            </div>

            {/* Decision Flag Badge */}
            {reasoningDecision && (
              <div className="reasoning-decision-badge animate-pop">
                <span className="decision-title">{userLanguage === 'id' ? 'FLAG DITETAPKAN' : 'FLAG SET'}</span>
                <div className="decision-value">{reasoningDecision}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom In-App Camera Viewfinder Modal */}
      {showCameraModal && (
        <div className="custom-camera-overlay" onClick={handleCloseCamera}>
          <div className="custom-camera-container" onClick={(e) => e.stopPropagation()}>
            {/* Camera Header Bar */}
            <div className="custom-camera-header">
              <div className="camera-header-left">
                <div className="camera-brand-badge">
                  <i className="fas fa-camera" style={{ color: '#ea580c', fontSize: '13px' }}></i>
                  <span>{userLanguage === 'id' ? 'Kamera Deepernova AI' : 'Deepernova AI Camera'}</span>
                </div>
              </div>

              <div className="camera-header-actions">
                {!capturedPhoto && (
                  <button
                    type="button"
                    className="camera-tool-btn flip-btn"
                    onClick={handleFlipCamera}
                    title={userLanguage === 'id' ? 'Putar Kamera' : 'Flip Camera'}
                  >
                    <i className="fas fa-sync-alt"></i>
                  </button>
                )}
                <button
                  type="button"
                  className="camera-tool-btn close-btn"
                  onClick={handleCloseCamera}
                  title={userLanguage === 'id' ? 'Tutup' : 'Close'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Viewfinder Viewport */}
            <div className={`custom-camera-viewport ${isCameraFlashing ? 'flashing' : ''}`}>
              {/* Shutter Flash Animation */}
              {isCameraFlashing && <div className="camera-flash-overlay"></div>}

              {cameraLoading && (
                <div className="camera-loading-overlay">
                  <div className="camera-spinner"></div>
                  <span>{userLanguage === 'id' ? 'Menyiapkan sensor kamera...' : 'Initializing camera sensor...'}</span>
                </div>
              )}

              {cameraError ? (
                <div className="camera-error-overlay">
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '36px', color: '#ef4444', marginBottom: '12px' }}></i>
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    className="camera-action-btn retry-btn"
                    onClick={() => startCameraStream(cameraFacingMode)}
                  >
                    {userLanguage === 'id' ? 'Coba Lagi' : 'Try Again'}
                  </button>
                </div>
              ) : capturedPhoto ? (
                <div className="camera-preview-wrapper">
                  <img src={capturedPhoto} alt="Captured preview" className="camera-captured-img" />
                  <div className="camera-preview-badge">
                    <span>✨ {userLanguage === 'id' ? 'Hasil Foto' : 'Photo Captured'}</span>
                  </div>
                  {isCameraEnhancingHD && (
                    <div className="camera-hd-processing-overlay">
                      <div className="camera-spinner"></div>
                      <div className="hd-processing-text">
                        <span>✨ Mengubah ke Ultra HD via Deepernova AI...</span>
                        <small>Mempertahankan detail & meningkatkan ketajaman</small>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="camera-video-wrapper">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`camera-video-feed ${cameraFacingMode === 'user' ? 'mirror' : ''}`}
                  />
                  
                  {/* Grid Lines for Composition */}
                  <div className="camera-grid-lines">
                    <div className="grid-line horizontal h1"></div>
                    <div className="grid-line horizontal h2"></div>
                    <div className="grid-line vertical v1"></div>
                    <div className="grid-line vertical v2"></div>
                  </div>

                  {/* AI Target Holographic Reticle */}
                  <div className="camera-reticle">
                    <div className="reticle-corner top-left"></div>
                    <div className="reticle-corner top-right"></div>
                    <div className="reticle-corner bottom-left"></div>
                    <div className="reticle-corner bottom-right"></div>
                    <div className="reticle-center-crosshair"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Bottom Controls */}
            <div className="custom-camera-controls">
              {capturedPhoto ? (
                <div className="camera-preview-controls-row">
                  <button
                    type="button"
                    className="camera-action-btn retake-btn"
                    onClick={handleRetakePhoto}
                    disabled={isCameraEnhancingHD}
                  >
                    <i className="fas fa-redo"></i>
                    <span>{userLanguage === 'id' ? 'Foto Ulang' : 'Retake'}</span>
                  </button>

                  <button
                    type="button"
                    className={`camera-action-btn hd-enhance-btn ${isCameraEnhancingHD ? 'loading' : ''}`}
                    onClick={handleEnhanceCapturedPhotoHD}
                    disabled={isCameraEnhancingHD}
                    title={userLanguage === 'id' ? 'Tingkatkan kualitas foto menjadi Ultra HD via Deepernova AI' : 'Enhance to Ultra HD via Deepernova AI'}
                  >
                    {isCameraEnhancingHD ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>HD...</span>
                      </>
                    ) : (
                      <>
                        <span className="hd-badge-glow">HD</span>
                        <span>{userLanguage === 'id' ? 'Buat HD' : 'Make HD'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="camera-action-btn use-btn"
                    onClick={handleUsePhoto}
                    disabled={isCameraEnhancingHD}
                  >
                    <i className="fas fa-check"></i>
                    <span>{userLanguage === 'id' ? 'Gunakan Foto' : 'Use Photo'}</span>
                  </button>
                </div>
              ) : (
                <div className="camera-live-controls-bar">
                  {/* Left: Gallery Shortcut */}
                  <button
                    type="button"
                    className="camera-bottom-tool-btn gallery-btn"
                    onClick={() => {
                      window.imageUploadInput?.click();
                      handleCloseCamera();
                    }}
                    title={userLanguage === 'id' ? 'Pilih dari Galeri' : 'Choose from Gallery'}
                  >
                    <i className="fas fa-images"></i>
                    <span>{userLanguage === 'id' ? 'Galeri' : 'Gallery'}</span>
                  </button>

                  {/* Center: Massive Glowing Shutter */}
                  <button
                    type="button"
                    className="camera-shutter-btn"
                    onClick={handleCapturePhoto}
                    disabled={cameraLoading || !!cameraError}
                    title={userLanguage === 'id' ? 'Ambil Foto' : 'Capture Photo'}
                  >
                    <div className="shutter-outer-ring">
                      <div className="shutter-inner-ring"></div>
                    </div>
                  </button>

                  {/* Right: Flip Camera */}
                  <button
                    type="button"
                    className="camera-bottom-tool-btn flip-bottom-btn"
                    onClick={handleFlipCamera}
                    title={userLanguage === 'id' ? 'Putar Kamera' : 'Flip Camera'}
                  >
                    <i className="fas fa-sync-alt"></i>
                    <span>{userLanguage === 'id' ? 'Putar' : 'Flip'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden Canvas for High-Resolution Capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}

    </div>
  </div>
  );
};


export default ChatBot;
