import React, { useEffect, useRef, useState } from 'react';
import { Globe, Search, Radio, Database, Zap, Shield, TrendingUp, Newspaper, Code2 } from 'lucide-react';

function SmoothNumber({ value, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const lastValueRef = useRef(value);

  useEffect(() => {
    const startValue = lastValueRef.current;
    const endValue = Number(value);
    lastValueRef.current = endValue;

    if (startValue === endValue) return;

    let animationFrame = null;
    const duration = 300;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{Number(displayValue).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

export default function Header({ activeTab, setActiveTab, telemetry, isWsConnected, onSwitchToPublic }) {
  const crawlerState = telemetry?.crawler?.state || 'IDLE';
  const totalPages = telemetry?.db?.totalPages || 0;
  const speedRps = telemetry?.crawler?.rps || 0;

  return (
    <header className="app-header">
      <div className="logo-container" onClick={() => setActiveTab('search')}>
        <div className="logo-icon">
          <Shield size={20} className="text-cyan" />
        </div>
        <div className="logo-text">
          <span className="brand-title">Deepernova<span className="highlight-text">Search</span></span>
          <span className={`badge live-badge ${crawlerState.toLowerCase()}`}>
            {crawlerState === 'RUNNING' ? '15.000 WORKER LIVE' : crawlerState === 'PAUSED' ? 'PAUSED' : 'STANDBY (15.000 WORKER)'}
          </span>
        </div>
      </div>

      <div className="view-tabs">
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          title="Pencarian Web & AI Berkecepatan Tinggi"
        >
          <Search size={16} />
          Pencarian Web & AI
        </button>
        <button
          className={`tab-btn ${activeTab === 'crawler' ? 'active' : ''}`}
          onClick={() => setActiveTab('crawler')}
          title="Mission Control Crawler 15.000 Worker"
        >
          <Radio size={16} />
          Mission Control (15.000 Worker)
        </button>
        <button
          className={`tab-btn ${activeTab === 'economics' ? 'active' : ''}`}
          onClick={() => setActiveTab('economics')}
          title="Pasar Finansial, Saham IHSG/Wall St, Kripto & Kurs"
        >
          <TrendingUp size={16} />
          Economics & Pasar
        </button>
        <button
          className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
          title="Berita Nasional & Internasional Terkini"
        >
          <Newspaper size={16} />
          Berita
        </button>
        <button
          className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
          title="Developer & AI API Portal"
        >
          <Code2 size={16} />
          Developer API
        </button>
      </div>

      <div className="header-telemetry">
        <div className="stat-pill" title="Total indexed web pages in SQLite FTS5">
          <Database size={14} className="text-dim" />
          <span className="stat-label">Indexed:</span>
          <span className="stat-val text-cyan"><SmoothNumber value={totalPages} /></span>
        </div>

        <div className="stat-pill" title="Live crawling throughput (requests per second)">
          <Zap size={14} className="text-dim" />
          <span className="stat-label">Speed:</span>
          <span className="stat-val text-green"><SmoothNumber value={speedRps} decimals={1} /> req/s</span>
        </div>

        {telemetry?.governor?.isPriorityActive && (
          <div className="stat-pill priority-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#eab308' }} title="Adaptive QoS: Crawlers throttled to guarantee instant search latency (<25ms)">
            <Zap size={14} className="text-yellow" />
            <span className="stat-label">QoS:</span>
            <span className="stat-val" style={{ fontWeight: 600 }}>Priority Search</span>
          </div>
        )}

        {onSwitchToPublic && (
          <button 
            type="button" 
            onClick={onSwitchToPublic}
            className="public-switch-pill"
            title="Beralih ke Tampilan Minimalis / Sederhana"
          >
            <Globe size={14} />
            <span>Mode Minimalis</span>
          </button>
        )}
      </div>
    </header>
  );
}
