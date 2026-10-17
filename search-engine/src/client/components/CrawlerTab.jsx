import React, { useState } from 'react';
import { 
  Sliders, Play, Pause, Square, RotateCw, Trash2, Globe, Zap, 
  Radio, PieChart, Sparkles, MapPin, Camera, CheckCircle2, RefreshCw
} from 'lucide-react';
import TelemetryCards from './TelemetryCards.jsx';
import LiveStreamLogs from './LiveStreamLogs.jsx';
import DomainDistribution from './DomainDistribution.jsx';
import TokohCrawlerMonitor from './TokohCrawlerMonitor.jsx';
import GeoCrawlerMonitor from './GeoCrawlerMonitor.jsx';
import ImageCrawlerMonitor from './ImageCrawlerMonitor.jsx';
import { SEED_CATEGORIES } from '../../crawler/seeds.js';

const PRESETS = {
  all: SEED_CATEGORIES.all || [],
  deepernova: SEED_CATEGORIES.deepernova || [],
  globalAi: SEED_CATEGORIES.globalAiAndTech || [],
  indonesia: SEED_CATEGORIES.indonesiaNews || [],
  indonesiaGov: SEED_CATEGORIES.indonesiaGov || [],
  indonesiaEdu: SEED_CATEGORIES.indonesiaEdu || [],
  indonesiaTech: SEED_CATEGORIES.indonesiaTech || [],
  indonesiaRegional: SEED_CATEGORIES.indonesiaRegional || [],
  indonesiaEcommerce: SEED_CATEGORIES.indonesiaEcommerce || [],
  globalNews: SEED_CATEGORIES.globalNews || [],
  globalTech: SEED_CATEGORIES.globalTech || [],
  knowledge: SEED_CATEGORIES.globalKnowledge || [],
  science: SEED_CATEGORIES.globalScience || [],
  universities: SEED_CATEGORIES.worldUniversities || [],
  finance: SEED_CATEGORIES.globalFinance || [],
  ecommerce: SEED_CATEGORIES.globalEcommerce || [],
  entertainment: SEED_CATEGORIES.globalEntertainment || [],
  sports: SEED_CATEGORIES.globalSports || [],
  travelHealth: SEED_CATEGORIES.globalTravelHealth || []
};

export default function CrawlerTab({
  telemetry,
  history = [],
  logs,
  onClearLogs,
  onStartCrawl,
  onPauseCrawl,
  onResumeCrawl,
  onStopCrawl,
  onRecalcPageRank,
  onResetDb,
  isStealthMode = false,
  onToggleStealth
}) {
  const [seeds, setSeeds] = useState(PRESETS.all.join('\n'));
  const concurrency = 64; // 64 Parallel Multi-Stream Workers (Zero Lag)
  const [maxDepth, setMaxDepth] = useState(15);
  const [maxPages, setMaxPages] = useState(10000000);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('domains'); // 'domains', 'tokoh', 'geo', 'images'

  const crawlerState = telemetry?.crawler?.state || 'IDLE';
  const isRunning = crawlerState === 'RUNNING';
  const isPaused = crawlerState === 'PAUSED';
  const activeWorkers = telemetry?.crawler?.activeWorkers || (isRunning ? 64 : 0);
  const isPriorityActive = Boolean(telemetry?.governor?.isPriorityActive);

  const handleStart = async () => {
    const seedList = seeds
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    setIsStarting(true);
    try {
      await onStartCrawl({
        seeds: seedList.length > 0 ? seedList : PRESETS.all,
        concurrency: 64,
        maxDepth,
        maxPages,
        perDomainDelayMs: 25,
        autonomousMode
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleRecalc = async () => {
    setIsRecalculating(true);
    try {
      await onRecalcPageRank();
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      {/* 1. Clean White Telemetry Highlights */}
      <TelemetryCards
        crawler={telemetry?.crawler}
        db={telemetry?.db}
        system={telemetry?.system}
      />

      {/* 2. Control Deck & Live Activity Stream Grid */}
      <div className="control-grid" style={{ marginTop: '1.25rem' }}>
        {/* Left: Crawler Parameters & Actions */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Sliders size={18} className="text-cyan" />
              <span>Google-Scale Crawler Control</span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={handleRecalc}
                disabled={isRecalculating}
                title="Hitung ulang PageRank graf link"
              >
                <RotateCw size={13} className={isRecalculating ? 'spin' : ''} />
                {isRecalculating ? 'Menghitung...' : 'PageRank'}
              </button>

              <button
                type="button"
                className="btn-secondary-action"
                onClick={onResetDb}
                style={{ color: '#dc2626' }}
                title="Hapus database dan reset antrean"
              >
                <Trash2 size={13} />
                Reset
              </button>
            </div>
          </div>

          {/* Integrated State & Action Control Bar */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}>
            {/* Integrated State Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div className={`state-badge-pill ${crawlerState.toLowerCase()}`}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isRunning ? '#10b981' : isPaused ? '#f59e0b' : '#94a3b8',
                  display: 'inline-block'
                }} className={isRunning ? 'animate-pulse' : ''} />
                <span>
                  {isRunning 
                    ? `RUNNING • 15.000 WORKER` 
                    : isPaused 
                    ? 'PAUSED' 
                    : 'STANDBY (SIAP)'}
                </span>
              </div>

              {isPriorityActive ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  <Zap size={12} className="animate-pulse" />
                  QoS Priority Search (&lt;25ms)
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#0284c7',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  <CheckCircle2 size={12} />
                  Governor Active
                </span>
              )}
            </div>

            {/* State Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isRunning ? (
                <>
                  <button 
                    type="button"
                    className="btn-state-action btn-pause" 
                    onClick={onPauseCrawl}
                    title="Jeda crawling sementara"
                  >
                    <Pause size={14} />
                    <span>Pause</span>
                  </button>
                  <button 
                    type="button"
                    className="btn-state-action btn-stop" 
                    onClick={onStopCrawl}
                    title="Hentikan crawler"
                  >
                    <Square size={14} />
                    <span>Stop</span>
                  </button>
                </>
              ) : isPaused ? (
                <>
                  <button 
                    type="button"
                    className="btn-state-action btn-resume" 
                    onClick={onResumeCrawl}
                    title="Lanjutkan crawling 15.000 worker"
                  >
                    <Play size={14} />
                    <span>Resume</span>
                  </button>
                  <button 
                    type="button"
                    className="btn-state-action btn-stop" 
                    onClick={onStopCrawl}
                    title="Hentikan crawler"
                  >
                    <Square size={14} />
                    <span>Stop</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-state-action btn-start"
                  onClick={handleStart}
                  disabled={isStarting}
                  title="Jalankan crawler berkecepatan 15.000 worker"
                >
                  <Play size={14} />
                  <span>{isStarting ? 'Memulai 15.000 Worker...' : 'Mulai Crawl (15.000 Worker)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Autonomous Ingestion Switch (Clean compact bar) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 0.85rem',
            background: autonomousMode ? 'rgba(2, 132, 199, 0.05)' : '#f8fafc',
            border: `1px solid ${autonomousMode ? '#bae6fd' : '#e2e8f0'}`,
            borderRadius: '10px',
            marginBottom: '0.85rem',
            cursor: 'pointer'
          }} onClick={() => setAutonomousMode(!autonomousMode)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={16} style={{ color: autonomousMode ? '#0284c7' : '#94a3b8' }} />
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: autonomousMode ? '#0369a1' : '#334155' }}>
                  Autonomous Web Ingestion (Continuous)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.4rem' }}>
                  — Crawl berkesinambungan otomatis
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autonomousMode}
              onChange={e => setAutonomousMode(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
            />
          </div>

          {/* Preset Target Seeds */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#0f172a' }}>Pilih Preset Target Seeds:</span>
              <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>Total: {PRESETS.all.length.toLocaleString()} verified seeds</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <button 
                type="button"
                className="preset-pill" 
                onClick={() => setSeeds(PRESETS.all.join('\n'))}
                style={seeds === PRESETS.all.join('\n') ? { background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', fontWeight: 700 } : {}}
              >
                🌐 Global Master ({PRESETS.all.length})
              </button>

              <button 
                type="button"
                className="preset-pill" 
                onClick={() => setSeeds(PRESETS.deepernova.join('\n'))}
                style={seeds === PRESETS.deepernova.join('\n') ? { background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', fontWeight: 700 } : {}}
              >
                🚀 DeeperNova
              </button>

              <button 
                type="button"
                className="preset-pill" 
                onClick={() => setSeeds([...PRESETS.indonesia, ...PRESETS.indonesiaGov, ...PRESETS.indonesiaEdu].join('\n'))}
                style={seeds === [...PRESETS.indonesia, ...PRESETS.indonesiaGov, ...PRESETS.indonesiaEdu].join('\n') ? { background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', fontWeight: 700 } : {}}
              >
                🇮🇩 Indonesia High-Trust
              </button>

              <button 
                type="button"
                className="preset-pill" 
                onClick={() => setSeeds([...PRESETS.globalAi, ...PRESETS.globalTech].join('\n'))}
                style={seeds === [...PRESETS.globalAi, ...PRESETS.globalTech].join('\n') ? { background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', fontWeight: 700 } : {}}
              >
                🤖 Global AI & Tech
              </button>

              <button 
                type="button"
                className="preset-pill" 
                onClick={() => setSeeds([...PRESETS.knowledge, ...PRESETS.science, ...PRESETS.universities].join('\n'))}
                style={seeds === [...PRESETS.knowledge, ...PRESETS.science, ...PRESETS.universities].join('\n') ? { background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', fontWeight: 700 } : {}}
              >
                📚 Sains & Riset
              </button>
            </div>

            <textarea
              className="form-textarea"
              rows={4}
              value={seeds}
              onChange={e => setSeeds(e.target.value)}
              placeholder="https://example.com/&#10;https://another.org/"
              style={{ fontSize: '0.78rem', lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Right: Live Stream Logs Terminal */}
        <div>
          <LiveStreamLogs
            logs={logs}
            onClear={onClearLogs}
            isStealthMode={isStealthMode}
            onToggleStealth={onToggleStealth}
          />
        </div>
      </div>

      {/* 3. Subsystem Discovery Modules & Domain Graph */}
      <div style={{ marginTop: '1.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveSubTab('domains')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'all 0.2s',
                background: activeSubTab === 'domains' ? '#eff6ff' : '#ffffff',
                borderColor: activeSubTab === 'domains' ? '#0284c7' : '#e2e8f0',
                color: activeSubTab === 'domains' ? '#0284c7' : '#64748b',
                boxShadow: activeSubTab === 'domains' ? '0 1px 3px rgba(2, 132, 199, 0.1)' : 'none'
              }}
            >
              <PieChart size={14} />
              Host & Domain Distribution
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('tokoh')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'all 0.2s',
                background: activeSubTab === 'tokoh' ? '#faf5ff' : '#ffffff',
                borderColor: activeSubTab === 'tokoh' ? '#7c3aed' : '#e2e8f0',
                color: activeSubTab === 'tokoh' ? '#7c3aed' : '#64748b',
                boxShadow: activeSubTab === 'tokoh' ? '0 1px 3px rgba(124, 58, 237, 0.1)' : 'none'
              }}
            >
              <Sparkles size={14} />
              Tokoh & Figur Publik
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('geo')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'all 0.2s',
                background: activeSubTab === 'geo' ? '#ecfdf5' : '#ffffff',
                borderColor: activeSubTab === 'geo' ? '#059669' : '#e2e8f0',
                color: activeSubTab === 'geo' ? '#059669' : '#64748b',
                boxShadow: activeSubTab === 'geo' ? '0 1px 3px rgba(5, 150, 105, 0.1)' : 'none'
              }}
            >
              <MapPin size={14} />
              Wilayah & Geografis
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('images')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'all 0.2s',
                background: activeSubTab === 'images' ? '#fffbeb' : '#ffffff',
                borderColor: activeSubTab === 'images' ? '#d97706' : '#e2e8f0',
                color: activeSubTab === 'images' ? '#d97706' : '#64748b',
                boxShadow: activeSubTab === 'images' ? '0 1px 3px rgba(217, 119, 6, 0.1)' : 'none'
              }}
            >
              <Camera size={14} />
              Visual Media Asset
            </button>
          </div>
        </div>

        {/* Subsystem Content */}
        <div>
          {activeSubTab === 'domains' && (
            <DomainDistribution
              topDomains={telemetry?.db?.topDomains}
              totalPages={telemetry?.db?.totalPages}
            />
          )}
          {activeSubTab === 'tokoh' && <TokohCrawlerMonitor />}
          {activeSubTab === 'geo' && <GeoCrawlerMonitor />}
          {activeSubTab === 'images' && <ImageCrawlerMonitor />}
        </div>
      </div>
    </div>
  );
}
