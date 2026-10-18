import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './PromoVideoAd.css';

/**
 * 🎬 PromoVideoAd.jsx
 * Precision 30-Second Commercial Video Scene for Deepernova:
 * 1. Search Engine (0.0s - 7.5s)
 * 2. AI Chatbot Biasa (7.5s - 15.0s)
 * 3. Autonomous Agentic AI (15.0s - 22.5s)
 * 4. Platform API di Belakangnya (22.5s - 30.0s)
 * -> Seamless Google-Style Kinetic Loop back to 0.0s
 */

const TOTAL_DURATION_SEC = 30;
const CHAPTERS = [
  {
    id: 'search',
    label: 'Search Engine',
    sublabel: 'Sub-Second Neural AI Search',
    badge: '01 · SEARCH ENGINE',
    color: '#3b82f6',
    start: 0,
    end: 7.5,
    icon: 'fa-solid fa-magnifying-glass',
    targetView: 'search'
  },
  {
    id: 'chatbot',
    label: 'AI ChatBot Biasa',
    sublabel: 'Minimalis & Serene Claude/GPT Style',
    badge: '02 · AI CHATBOT',
    color: '#06b6d4',
    start: 7.5,
    end: 15.0,
    icon: 'fa-solid fa-comment-dots',
    targetView: 'chat'
  },
  {
    id: 'agent',
    label: 'Autonomous Agentic AI',
    sublabel: 'Self-Directed Vibe Coding Sandbox',
    badge: '03 · AGENTIC AI',
    color: '#8b5cf6',
    start: 15.0,
    end: 22.5,
    icon: 'fa-solid fa-bolt',
    targetView: 'agent'
  },
  {
    id: 'api',
    label: 'Platform API',
    sublabel: 'Ultra-Low Latency Developer Cloud',
    badge: '04 · DEVELOPER API',
    color: '#ea580c',
    start: 22.5,
    end: 30.0,
    icon: 'fa-solid fa-terminal',
    targetView: 'api'
  }
];

export default function PromoVideoAd({ onNavigate, onClose }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState('curl');

  const containerRef = useRef(null);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(null);
  const audioCtxRef = useRef(null);
  const prevChapterIndexRef = useRef(0);

  // Determine active chapter based on currentTime
  const currentChapterIndex = useMemo(() => {
    const t = currentTime % TOTAL_DURATION_SEC;
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (t >= CHAPTERS[i].start) return i;
    }
    return 0;
  }, [currentTime]);

  const activeChapter = CHAPTERS[currentChapterIndex];

  // Sound Engine using Web Audio API (No external sound files required)
  const playTechChime = useCallback((freq = 520, type = 'sine', duration = 0.22) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }, [isMuted]);

  // Audio trigger on chapter change
  useEffect(() => {
    if (prevChapterIndexRef.current !== currentChapterIndex) {
      prevChapterIndexRef.current = currentChapterIndex;
      const pitches = [440, 554, 659, 880];
      playTechChime(pitches[currentChapterIndex] || 520, 'triangle', 0.28);
    }
  }, [currentChapterIndex, playTechChime]);

  // Main High-Precision Animation Tick Loop
  const animate = useCallback((time) => {
    if (lastTimeRef.current != null && isPlaying) {
      const delta = (time - lastTimeRef.current) / 1000;
      setCurrentTime((prevTime) => {
        let nextTime = prevTime + delta * playbackRate;
        if (nextTime >= TOTAL_DURATION_SEC) {
          if (isLooping) {
            nextTime = nextTime % TOTAL_DURATION_SEC;
            // Loop chime
            playTechChime(587, 'sine', 0.35);
          } else {
            nextTime = TOTAL_DURATION_SEC;
            setIsPlaying(false);
          }
        }
        return nextTime;
      });
    }
    lastTimeRef.current = time;
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, playbackRate, isLooping, playTechChime]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  // Keyboard shortcut listener (Space = play/pause, M = mute, F = fullscreen)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyM') {
        setIsMuted((m) => !m);
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(pct * TOTAL_DURATION_SEC);
  };

  const jumpToChapter = (chapter) => {
    setCurrentTime(chapter.start);
    setIsPlaying(true);
    playTechChime(520, 'sine', 0.2);
  };

  // Chapter relative progress within [start, end]
  const chapterTime = Math.max(0, Math.min(7.5, currentTime - activeChapter.start));
  const chapterProgress = chapterTime / 7.5; // 0 to 1

  // Format time MM:SS.S
  const formatTime = (sec) => {
    const s = Math.floor(sec);
    const ms = Math.floor((sec % 1) * 10);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}.${ms}`;
  };

  // Simulated animated typing for Search Engine (0.0s to 3.5s)
  const searchFullText = "arsitektur AI terbarukan 2026 dan agentic workflow";
  const searchCharsToShow = Math.min(
    searchFullText.length,
    Math.floor((chapterTime / 3.0) * searchFullText.length)
  );
  const currentSearchTyped = currentChapterIndex === 0 ? searchFullText.slice(0, searchCharsToShow) : searchFullText;

  // Seamless Loop Morph Overlay (activates between 29.3s and 30.0s)
  const isLoopWarpActive = currentTime >= 29.2;
  const loopWarpProgress = isLoopWarpActive ? (currentTime - 29.2) / 0.8 : 0;

  return (
    <div 
      className={`promo-video-scene ${isFullscreen ? 'is-fullscreen' : ''}`}
      ref={containerRef}
    >
      {/* Dynamic Ambient Background Glows */}
      <div 
        className="promo-ambient-glow glow-primary" 
        style={{ '--glow-color': activeChapter.color }} 
      />
      <div 
        className="promo-ambient-glow glow-secondary" 
        style={{ '--glow-color': currentChapterIndex === 3 ? '#3b82f6' : '#06b6d4' }} 
      />

      {/* TOP BAR / HEADER */}
      <header className="promo-ad-header">
        <div className="promo-header-left">
          <div className="promo-brand-badge" onClick={() => onNavigate?.('landing')}>
            <span className="promo-brand-dot"></span>
            <span className="promo-brand-title">Deepernova AI</span>
            <span className="promo-live-pill">30s SHOWCASE</span>
          </div>
          <div className="promo-google-motion-indicator">
            <span className="google-dot g-blue"></span>
            <span className="google-dot g-red"></span>
            <span className="google-dot g-yellow"></span>
            <span className="google-dot g-green"></span>
            <span className="google-motion-text">Google-Style Kinetic Preview</span>
          </div>
        </div>

        <div className="promo-header-right">
          <button 
            type="button" 
            className="promo-header-cta-btn"
            onClick={() => onNavigate?.(activeChapter.targetView)}
            title={`Buka ${activeChapter.label} sekarang`}
          >
            <span>Coba Fitur Ini Sekarang</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
          {onClose && (
            <button 
              type="button" 
              className="promo-close-btn"
              onClick={onClose}
              title="Tutup Iklan"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </header>

      {/* CHAPTER STEPPER NAVIGATION (Clickable 4 Pillars) */}
      <nav className="promo-chapters-nav">
        {CHAPTERS.map((chap, idx) => {
          const isActive = currentChapterIndex === idx;
          const isPassed = currentTime > chap.end;
          const prog = isActive ? chapterProgress : (isPassed ? 1 : 0);

          return (
            <button
              key={chap.id}
              type="button"
              className={`promo-nav-pill ${isActive ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
              onClick={() => jumpToChapter(chap)}
              style={{ '--pill-accent': chap.color }}
            >
              <div className="pill-fill-progress" style={{ width: `${prog * 100}%` }}></div>
              <div className="pill-content">
                <i className={`${chap.icon} pill-icon`}></i>
                <div className="pill-text-wrap">
                  <span className="pill-badge">{chap.badge}</span>
                  <span className="pill-label">{chap.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* MAIN VIDEO STAGE / MONITOR (16:9 Cinema Viewport) */}
      <main className="promo-viewport-container">
        <div 
          className="promo-cinema-frame"
          style={{
            transform: `perspective(1200px) rotateX(${Math.sin(chapterProgress * Math.PI) * 1.2}deg) scale(${1 + Math.sin(chapterProgress * Math.PI) * 0.015})`
          }}
        >
          {/* Top Window Bar (Chrome/OS Style with exact window dots) */}
          <div className="cinema-window-bar">
            <div className="window-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="window-url-bar">
              <i className="fa-solid fa-lock window-lock-icon"></i>
              <span className="url-protocol">https://</span>
              <span className="url-domain">deepernova.com</span>
              <span className="url-path">
                {currentChapterIndex === 0 && '/search'}
                {currentChapterIndex === 1 && '/chat'}
                {currentChapterIndex === 2 && '/agent'}
                {currentChapterIndex === 3 && '/api'}
              </span>
            </div>
            <div className="window-status-badge">
              <span className="pulse-green-dot"></span>
              <span>100% LIVE REAL UI</span>
            </div>
          </div>

          {/* INNER VIEWPORT SCREEN */}
          <div className="cinema-viewport-screen">
            
            {/* ======================================================== */}
            {/* SCENE 1: DEEPERNOVA SEARCH ENGINE (0.0s - 7.5s)          */}
            {/* ======================================================== */}
            <div className={`scene-wrapper scene-search ${currentChapterIndex === 0 ? 'is-visible' : ''}`}>
              <div className="real-search-hero">
                
                {/* Search Badge Pill */}
                <div className="real-search-badge-pill">
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#3b82f6' }}></i>
                  <span>Next-Gen AI Neural Search</span>
                </div>

                {/* Search Title */}
                <h1 className="real-search-title">
                  DeeperNova <span className="title-gradient">Search</span>
                </h1>

                {/* Exact Hero Search Box */}
                <div className="real-search-box-wrap">
                  <div className="real-search-box">
                    <button type="button" className="real-search-lens-btn">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </button>
                    <input 
                      type="text" 
                      className="real-search-input"
                      value={currentSearchTyped}
                      readOnly
                      placeholder="Telusuri dengan DeeperNova atau ketik URL..."
                    />
                    <div className="real-search-box-actions">
                      <button type="button" className="action-pill-icon"><i className="fa-solid fa-camera"></i></button>
                      <button type="button" className="action-pill-icon"><i className="fa-solid fa-microphone"></i></button>
                      <button type="button" className="real-search-submit-btn">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <span>Cari</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search Tabs Row */}
                <div className="real-search-tabs-row">
                  <span className="real-search-tab active"><i className="fa-solid fa-globe"></i> Semua Web</span>
                  <span className="real-search-tab"><i className="fa-solid fa-image"></i> Gambar</span>
                  <span className="real-search-tab"><i className="fa-solid fa-newspaper"></i> Berita</span>
                  <span className="real-search-tab"><i className="fa-solid fa-chart-line"></i> Finansial</span>
                  <span className="real-search-tab ai-overview-pill"><i className="fa-solid fa-sparkles"></i> AI Ringkasan: ON</span>
                </div>

                {/* Instant Pop-in AI Overview & Live Result (Appears at >3.2s) */}
                {chapterTime >= 3.2 && (
                  <div className="real-search-results-preview animated-slide-up">
                    <div className="real-ai-overview-card">
                      <div className="ai-overview-header">
                        <div className="ai-header-left">
                          <i className="fa-solid fa-bolt" style={{ color: '#3b82f6' }}></i>
                          <span className="ai-overview-title">Ringkasan AI DeeperNova</span>
                          <span className="ai-latency-pill">⚡ 180ms · Sub-Second Neural Rank</span>
                        </div>
                        <span className="ai-sources-count">4 Sumber Terverifikasi</span>
                      </div>
                      <p className="ai-overview-body">
                        Arsitektur AI 2026 bergeser ke <strong>Autonomous Agentic Workflows</strong> dengan memadukan multi-tool calling, sandboxed code execution, dan penelusuran berkecepatan tinggi tanpa batas latency.
                      </p>
                    </div>

                    <div className="real-search-item-card">
                      <div className="item-url-breadcrumb">
                        <img src="/favicon.ico" alt="" className="item-favicon" />
                        <span>deepernova.com › research › agentic-workflow-2026</span>
                      </div>
                      <h3 className="item-title">Generative AI & Agentic Workflow di Industri Modern 2026</h3>
                      <p className="item-snippet">
                        Panduan arsitektur end-to-end implementasi agent mandiri, integrasi search engine BM25 + Vector ranking, dan pemrosesan kode terisolasi...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SCENE 2: AI CHATBOT BIASA (7.5s - 15.0s)                  */}
            {/* ======================================================== */}
            <div className={`scene-wrapper scene-chatbot ${currentChapterIndex === 1 ? 'is-visible' : ''}`}>
              <div className="real-chatbot-stage">
                
                {/* Greeting Screen (7.5s - 10.5s) */}
                {chapterTime < 3.2 ? (
                  <div className="real-hero-greeting-container animated-fade-in">
                    <div className="meta-hero-header-wrap">
                      <h1 className="meta-hero-heading">Apa yang bisa saya bantu hari ini?</h1>
                      <div className="meta-hero-agent-pill-btn">
                        <span className="agent-pill-icon">⚡</span>
                        <span className="agent-pill-label">Mode AI Agent</span>
                        <span className="agent-pill-arrow">→</span>
                      </div>
                    </div>

                    {/* Claude-Style Central Floating Input Box */}
                    <div className="meta-hero-input-container">
                      <div className="hero-fake-textarea">
                        <span>Tanya Deepernova AI...</span>
                      </div>
                      <div className="input-card-toolbar">
                        <div className="file-menu-container">
                          <button type="button" className="claude-attach-btn" title="Opsi & Lampiran">
                            <i className="fa-solid fa-plus"></i>
                          </button>
                        </div>
                        <div className="input-toolbar-right">
                          <div className="claude-model-selector-btn">
                            <i className="fa-solid fa-microchip" style={{ color: '#06b6d4' }}></i>
                            <span className="model-name">Deepernova Flash</span>
                            <span className="model-badge">Cloud</span>
                          </div>
                          <div className="reasoning-toggle-pill on">
                            <span>Penalaran: Aktif</span>
                          </div>
                          <div className="claude-tool-btn mic-btn">
                            <i className="fa-solid fa-microphone"></i>
                          </div>
                          <div className="claude-tool-btn auto-voice-btn active">
                            <div className="wave-bars"><span></span><span></span><span></span></div>
                          </div>
                          <div className="claude-action-btn send-mode has-text">
                            <i className="fa-solid fa-arrow-up"></i>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4 Clean Serene Prompt Chips */}
                    <div className="meta-prompt-chips-row">
                      <span className="meta-prompt-chip">💡 Tanyakan apa pun</span>
                      <span className="meta-prompt-chip active-highlight">💻 Tulis kode</span>
                      <span className="meta-prompt-chip">🎯 Rencana & strategi</span>
                      <span className="meta-prompt-chip">📝 Tulis dokumen</span>
                    </div>
                  </div>
                ) : (
                  /* Live Streaming Conversation View (10.5s - 15.0s) */
                  <div className="real-chat-messages-container animated-slide-up">
                    {/* User Message */}
                    <div className="real-message user-bubble">
                      <div className="message-content">
                        Bantu saya menulis kode program untuk: WebSocket Real-time streaming server di Node.js
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="real-message bot-bubble">
                      <div className="bot-header-info">
                        <span className="bot-avatar-icon">🌌</span>
                        <span className="bot-name">Deepernova AI</span>
                        <span className="model-tag">Flash 1.5</span>
                      </div>

                      {/* Deep Thought Reasoning Block */}
                      <div className="real-reasoning-collapsible">
                        <div className="reasoning-summary">
                          <i className="fa-solid fa-brain" style={{ color: '#eab308' }}></i>
                          <span>Penalaran Model (0.42s) · Arsitektur non-blocking event-driven</span>
                        </div>
                      </div>

                      {/* Code Block with real syntax colors */}
                      <div className="real-code-block-box">
                        <div className="code-block-header">
                          <span className="code-lang-label">javascript</span>
                          <button type="button" className="copy-code-btn">
                            <i className="fa-solid fa-copy"></i>
                            <span>Salin</span>
                          </button>
                        </div>
                        <pre className="code-pre">
                          <code>{`import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('⚡ Client terhubung dengan latensi ultra-rendah');
  ws.send(JSON.stringify({ status: 'connected', server: 'Deepernova Engine' }));
});`}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SCENE 3: AUTONOMOUS AGENTIC AI (15.0s - 22.5s)           */}
            {/* ======================================================== */}
            <div className={`scene-wrapper scene-agent ${currentChapterIndex === 2 ? 'is-visible' : ''}`}>
              <div className="real-agent-workspace">
                
                {/* Agent Header */}
                <div className="agent-live-header">
                  <div className="agent-header-meta">
                    <span className="agent-mode-badge">⚡ VIBE CODING & AUTONOMOUS AGENT</span>
                    <h2 className="agent-mission-title">Task #409: Refactor Indexing & Multi-Step Verification</h2>
                  </div>
                  <div className="agent-status-pill running">
                    <span className="agent-pulse"></span>
                    <span>Status: Menjalankan Perintah Terminal</span>
                  </div>
                </div>

                {/* Execution Chain Steps (Real UI pills) */}
                <div className="agent-pills-flow">
                  {/* Step 1: Plan */}
                  <div className="agent-inline-pill-wrap is-completed">
                    <div className="agent-inline-pill-btn">
                      <div className="agent-pill-btn-left">
                        <span className="agent-pill-icon-tag" style={{ color: '#0284c7', background: '#e0f2fe' }}>
                          <i className="fa-solid fa-book-open"></i>
                        </span>
                        <span className="agent-pill-title">Rencana Eksekusi: 4 Langkah Pembaruan Kode & Build</span>
                      </div>
                      <div className="agent-pill-btn-right">
                        <span className="agent-pill-status is-success"><i className="fa-solid fa-check"></i> Selesai</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Terminal Execution */}
                  <div className="agent-inline-pill-wrap is-completed">
                    <div className="agent-inline-pill-btn">
                      <div className="agent-pill-btn-left">
                        <span className="agent-pill-icon-tag" style={{ color: '#475569', background: '#f1f5f9' }}>
                          <i className="fa-solid fa-terminal"></i>
                        </span>
                        <span className="agent-pill-title">Perintah Terminal: node --version && npm test</span>
                      </div>
                      <div className="agent-pill-btn-right">
                        <span className="agent-pill-status is-success"><i className="fa-solid fa-check"></i> 0 Error</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: File Diff / Patch */}
                  <div className="agent-inline-pill-wrap is-completed">
                    <div className="agent-inline-pill-btn">
                      <div className="agent-pill-btn-left">
                        <span className="agent-pill-icon-tag" style={{ color: '#8b5cf6', background: '#ede9fe' }}>
                          <i className="fa-solid fa-wand-magic-sparkles"></i>
                        </span>
                        <span className="agent-pill-title">Diff / Patch Berkas: src/indexer/search.js (+34 lines)</span>
                      </div>
                      <div className="agent-pill-btn-right">
                        <span className="agent-pill-status is-success"><i className="fa-solid fa-check"></i> Diterapkan</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Self-Healing Check */}
                  <div className="agent-inline-pill-wrap is-completed">
                    <div className="agent-inline-pill-btn">
                      <div className="agent-pill-btn-left">
                        <span className="agent-pill-icon-tag" style={{ color: '#16a34a', background: '#dcfce7' }}>
                          <i className="fa-solid fa-circle-check"></i>
                        </span>
                        <span className="agent-pill-title">Perbaikan Mandiri: Build Lolos & Siap Deploy</span>
                      </div>
                      <div className="agent-pill-btn-right">
                        <span className="agent-pill-status is-success"><i className="fa-solid fa-check"></i> 100% Valid</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Real Terminal Sandbox Console Output */}
                <div className="agent-console-box">
                  <div className="console-titlebar">
                    <div className="console-dots"><span></span><span></span><span></span></div>
                    <span className="console-title">Autonomous Terminal Sandbox (Bash PID #2891)</span>
                  </div>
                  <pre className="console-output">
                    <code>
{`$ git status --short
M src/indexer/search.js
M src/services/agentService.js
$ vitest run --silent
✓ src/indexer/search.test.js (14 tests passed, 82ms)
✓ src/services/agentService.test.js (28 tests passed, 42ms)
[Autonomous Agent] Semua 42 test lolos tanpa kesalahan. Kode siap diintegrasikan.`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SCENE 4: PLATFORM API & DEVELOPER CLOUD (22.5s - 30.0s)   */}
            {/* ======================================================== */}
            <div className={`scene-wrapper scene-api ${currentChapterIndex === 3 ? 'is-visible' : ''}`}>
              <div className="real-api-platform">
                
                {/* Platform Header */}
                <div className="api-platform-header">
                  <div className="api-title-group">
                    <span className="api-kicker">ENTERPRISE CLOUD SUITE</span>
                    <h2 className="api-main-heading">DeeperNova AI & Search Platform API</h2>
                  </div>
                  <div className="api-key-quick-pill">
                    <i className="fa-solid fa-key" style={{ color: '#ea580c' }}></i>
                    <span>API Key Aktif: dnv_live_9f8...7a2</span>
                  </div>
                </div>

                {/* 3 Live Metric Badges */}
                <div className="api-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-num text-emerald">99.98%</span>
                    <span className="metric-lbl">High-Availability Uptime</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-num text-cyan">&lt; 85ms</span>
                    <span className="metric-lbl">P99 Sub-Second Latency</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-num text-purple">1,000,000</span>
                    <span className="metric-lbl">Gratis Token Per Akun</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-num text-orange">Hybrid</span>
                    <span className="metric-lbl">Token Mix Architecture</span>
                  </div>
                </div>

                {/* Interactive Code Playground & Live Stream */}
                <div className="api-code-playground">
                  <div className="playground-tabs-bar">
                    <div className="tabs-left">
                      <button 
                        type="button" 
                        className={`code-tab ${activeCodeTab === 'curl' ? 'active' : ''}`}
                        onClick={() => setActiveCodeTab('curl')}
                      >
                        cURL
                      </button>
                      <button 
                        type="button" 
                        className={`code-tab ${activeCodeTab === 'js' ? 'active' : ''}`}
                        onClick={() => setActiveCodeTab('js')}
                      >
                        JavaScript SDK
                      </button>
                      <button 
                        type="button" 
                        className={`code-tab ${activeCodeTab === 'python' ? 'active' : ''}`}
                        onClick={() => setActiveCodeTab('python')}
                      >
                        Python
                      </button>
                    </div>
                    <span className="endpoint-badge">POST /v1/chat/completions</span>
                  </div>

                  <div className="code-split-view">
                    {/* Left: Request */}
                    <div className="code-editor-pane">
                      <div className="pane-title">Request Payload</div>
                      <pre>
                        <code>
{activeCodeTab === 'curl' && `curl https://api.deepernova.com/v1/chat/completions \\
  -H "Authorization: Bearer dnv_live_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepernova-gold-1.5",
    "stream": true,
    "messages": [{"role": "user", "content": "Riset pasar AI"}]
  }'`}
{activeCodeTab === 'js' && `import { DeepernovaAI } from '@deepernova/sdk';

const client = new DeepernovaAI({ apiKey: 'dnv_live_...' });
const stream = await client.chat.create({
  model: 'deepernova-gold-1.5',
  stream: true,
  messages: [{ role: 'user', content: 'Riset pasar AI' }]
});`}
{activeCodeTab === 'python' && `from deepernova import DeepernovaAI

client = DeepernovaAI(api_key="dnv_live_...")
response = client.chat.completions.create(
    model="deepernova-gold-1.5",
    messages=[{"role": "user", "content": "Riset pasar AI"}],
    stream=True
)`}
                        </code>
                      </pre>
                    </div>

                    {/* Right: Live Stream Output */}
                    <div className="code-response-pane">
                      <div className="pane-title">
                        <span className="stream-dot"></span>
                        <span>Live Stream Response (200 OK)</span>
                      </div>
                      <pre className="stream-output">
                        <code>
{`HTTP/2 200 OK
content-type: text/event-stream
x-deepernova-latency: 68ms

data: {"id":"chatcmpl-01","object":"chat.completion.chunk","choices":[{"delta":{"content":"Analisis"}}]}
data: {"id":"chatcmpl-02","object":"chat.completion.chunk","choices":[{"delta":{"content":" data"}}]}
data: {"id":"chatcmpl-03","object":"chat.completion.chunk","choices":[{"delta":{"content":" selesai."}}]}
data: [DONE]`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SEAMLESS GOOGLE-STYLE KINETIC LOOP WARP OVERLAY (29.2s+) */}
            {/* ======================================================== */}
            {isLoopWarpActive && (
              <div 
                className="promo-loop-warp-overlay"
                style={{
                  opacity: loopWarpProgress,
                  transform: `scale(${1 + loopWarpProgress * 0.15})`
                }}
              >
                <div className="loop-ripple-circle"></div>
                <div className="loop-brand-flash">
                  <span className="loop-dot"></span>
                  <span className="loop-text">Deepernova AI Ecosystem</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* BOTTOM CONTROLS & HUD DOCK (30s Scrubber, Play, Mute, Loop) */}
      <footer className="promo-ad-controls-dock">
        
        {/* Timeline Scrubber Bar with Chapter Pip Indicators */}
        <div 
          className="promo-timeline-scrubber" 
          onClick={handleSeek}
          title="Klik untuk navigasi waktu (0:00 - 0:30)"
        >
          <div 
            className="timeline-track-fill" 
            style={{ width: `${(currentTime / TOTAL_DURATION_SEC) * 100}%` }}
          ></div>
          <div 
            className="timeline-scrubber-handle"
            style={{ left: `${(currentTime / TOTAL_DURATION_SEC) * 100}%` }}
          ></div>

          {/* Chapter Break Pips */}
          {CHAPTERS.map((chap, i) => (
            <div 
              key={chap.id}
              className={`timeline-chapter-pip ${currentTime >= chap.start ? 'active' : ''}`}
              style={{ left: `${(chap.start / TOTAL_DURATION_SEC) * 100}%` }}
              title={`${chap.label} (${chap.start}s)`}
            >
              <span className="pip-label">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Controller Action Buttons */}
        <div className="promo-controls-row">
          
          {/* Left Controls */}
          <div className="controls-group-left">
            <button 
              type="button" 
              className="ctrl-btn play-pause-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Jeda (Spasi)" : "Putar (Spasi)"}
            >
              <i className={`fa-solid fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>

            <button 
              type="button" 
              className="ctrl-btn replay-btn"
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(true);
                playTechChime(440, 'sine', 0.25);
              }}
              title="Ulangi dari awal (0:00)"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>

            <div className="ctrl-time-display">
              <span className="current-t">{formatTime(currentTime)}</span>
              <span className="sep-t">/</span>
              <span className="total-t">00:30.0</span>
            </div>
          </div>

          {/* Center Info / Active Pillar Title */}
          <div className="controls-group-center">
            <span className="active-scene-icon" style={{ color: activeChapter.color }}>
              <i className={activeChapter.icon}></i>
            </span>
            <span className="active-scene-name">{activeChapter.label}</span>
            <span className="active-scene-sub">— {activeChapter.sublabel}</span>
          </div>

          {/* Right Controls */}
          <div className="controls-group-right">
            
            {/* Speed Multiplier */}
            <button 
              type="button" 
              className="ctrl-btn speed-btn"
              onClick={() => {
                const speeds = [1, 1.5, 2, 0.5];
                const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
                setPlaybackRate(next);
              }}
              title="Kecepatan putar"
            >
              <span>{playbackRate}x</span>
            </button>

            {/* Seamless Loop Toggle */}
            <button 
              type="button" 
              className={`ctrl-btn loop-btn ${isLooping ? 'is-active' : ''}`}
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? "Loop Aktif (Otomatis ulang tanpa batas)" : "Loop Nonaktif"}
            >
              <i className="fa-solid fa-repeat"></i>
            </button>

            {/* Audio Synth Toggle */}
            <button 
              type="button" 
              className={`ctrl-btn audio-btn ${!isMuted ? 'is-active' : ''}`}
              onClick={() => {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                if (newMuted === false) {
                  playTechChime(520, 'sine', 0.3);
                }
              }}
              title={isMuted ? "Klik untuk Suara / Unmute Chime (M)" : "Matikan Suara (M)"}
            >
              <i className={`fa-solid fa-volume-${isMuted ? 'xmark' : 'high'}`}></i>
            </button>

            {/* Fullscreen Button */}
            <button 
              type="button" 
              className="ctrl-btn fullscreen-btn"
              onClick={toggleFullscreen}
              title="Layar Penuh (F)"
            >
              <i className={`fa-solid fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
