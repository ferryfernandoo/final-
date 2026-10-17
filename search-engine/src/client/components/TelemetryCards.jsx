import React, { useEffect, useRef, useState } from 'react';
import { Activity, Layers, Compass, Cpu, AlertTriangle, Network, Radio, Zap } from 'lucide-react';

function SmoothNumber({ value, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const lastValueRef = useRef(value);

  useEffect(() => {
    const startValue = lastValueRef.current;
    const endValue = Number(value);
    lastValueRef.current = endValue;

    if (startValue === endValue) return;

    let animationFrame = null;
    const duration = 280;
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

export default function TelemetryCards({ crawler, db, system }) {
  const state = crawler?.state || 'IDLE';
  const isRunning = state === 'RUNNING';
  const isPaused = state === 'PAUSED';
  const isStopped = state === 'STOPPED';

  const crawledCount = Number(crawler?.crawledCount || 0);
  const totalDbPages = Number(db?.totalPages || crawledCount);
  const errorCount = Number(crawler?.errorCount || 0);
  const rps = Number(crawler?.rps || 0);
  const queueSize = Number(crawler?.queueSize || 0);
  const uniqueSeen = Number(crawler?.uniqueUrlsSeen || 0);
  const activeWorkers = Number(crawler?.activeWorkers || (isRunning ? 15000 : 0));
  const totalDomains = Number(db?.totalDomains || crawler?.activeDomains || 0);
  const memoryMb = Number(system?.memoryMb || 0);
  const avgLatencyMs = Number(crawler?.avgLatencyMs || 0);
  const successRate = Number(crawler?.successRate ?? (crawledCount + errorCount > 0 ? Math.round((crawledCount / (crawledCount + errorCount)) * 100) : 100));

  const stateColor = isRunning ? '#059669' : isPaused ? '#d97706' : isStopped ? '#dc2626' : '#64748b';
  const stateBg = isRunning ? '#ecfdf5' : isPaused ? '#fffbeb' : isStopped ? '#fef2f2' : '#f1f5f9';

  return (
    <div className="telemetry-grid">
      {/* 1. Crawl Rate & Engine State */}
      <div className="telemetry-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="card-top">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>Crawl Rate</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.12rem 0.45rem',
              borderRadius: '999px',
              background: stateBg,
              color: stateColor,
              border: `1px solid ${stateColor}30`
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: stateColor, display: 'inline-block' }} className={isRunning ? 'animate-pulse' : ''} />
              {state}
            </span>
          </span>
          <Activity size={18} className="card-icon text-cyan" />
        </div>
        <div className="card-val text-cyan" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <SmoothNumber value={rps} decimals={1} /> <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>req/s</span>
        </div>
        <div className="card-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Zap size={12} className={isRunning ? "text-cyan animate-pulse" : "text-muted"} />
          <span>{isRunning ? `${activeWorkers.toLocaleString()} multi-stream workers aktif` : isPaused ? 'Pekerja di-pause' : 'Pekerja standby (15.000 worker)'}</span>
        </div>
      </div>

      {/* 2. Pages Indexed & Session Yield */}
      <div className="telemetry-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="card-top">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>Pages Indexed</span>
            {successRate < 100 && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: successRate > 85 ? '#00f5a0' : '#ff9f1c',
                background: 'rgba(255,255,255,0.05)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px'
              }}>
                {successRate}% OK
              </span>
            )}
          </span>
          <Layers size={18} className="card-icon text-green" />
        </div>
        <div className="card-val text-green" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <SmoothNumber value={totalDbPages} />
        </div>
        <div className="card-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#00f5a0', fontWeight: 600 }}>+{crawledCount.toLocaleString()} session</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: errorCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{errorCount} errors</span>
        </div>
      </div>

      {/* 3. Frontier Queue */}
      <div className="telemetry-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="card-top">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Frontier Queue</span>
            {queueSize > 0 && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9d4edd', display: 'inline-block', boxShadow: '0 0 8px #9d4edd' }} className="animate-pulse" />
            )}
          </span>
          <Compass size={18} className="card-icon text-purple" />
        </div>
        <div className="card-val text-purple" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {queueSize.toLocaleString()}
        </div>
        <div className="card-subtext">
          {uniqueSeen > 0 ? `${uniqueSeen.toLocaleString()} unique URLs discovered` : 'Menunggu injeksi URL'}
        </div>
      </div>

      {/* 4. Domains & System Health */}
      <div className="telemetry-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="card-top">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Domains & Hosts</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff9f1c', display: 'inline-block', boxShadow: '0 0 8px #ff9f1c' }} />
          </span>
          <Network size={18} className="card-icon text-orange" />
        </div>
        <div className="card-val text-orange" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {totalDomains.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>domains</span>
        </div>
        <div className="card-subtext">
          {memoryMb > 0 ? `${memoryMb} MB heap` : 'WAL Active'}
          {avgLatencyMs > 0 ? ` • ${avgLatencyMs}ms avg latency` : ' • Lightning SSD'}
        </div>
      </div>
    </div>
  );
}
