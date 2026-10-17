import React, { useState, useMemo, useEffect } from 'react';
import { Terminal, Trash2, ArrowDown, EyeOff, Eye, Zap, Cpu, Activity, Radio, Compass } from 'lucide-react';

export default function LiveStreamLogs({ logs = [], onClear, isStealthMode = false, onToggleStealth }) {
  const [filter, setFilter] = useState('ALL'); // ALL, OK, ERR, ROBOTS
  const [scanTick, setScanTick] = useState(0);

  // High-speed radar scanning pulse to ensure visual motion is continuous at all times
  useEffect(() => {
    if (isStealthMode) return;
    const timer = setInterval(() => {
      setScanTick(t => (t + 1) % 100);
    }, 120);
    return () => clearInterval(timer);
  }, [isStealthMode]);

  // Ensure logs are strictly ordered with newest item at index 0 (top)
  const orderedLogs = useMemo(() => {
    if (isStealthMode) return [];
    return [...logs].sort((a, b) => {
      const timeA = a.created_at || a.timestamp || 0;
      const timeB = b.created_at || b.timestamp || 0;
      return timeB - timeA;
    });
  }, [logs, isStealthMode]);

  // Filter logs and display up to 15 newest items for fluid stream
  const displayLogs = useMemo(() => {
    if (isStealthMode) return [];
    const filtered = orderedLogs.filter(log => {
      if (filter === 'OK') return log.status >= 200 && log.status < 400 && log.type !== 'skip';
      if (filter === 'ERR') return log.type === 'error' || log.status >= 400 || log.status === 0;
      if (filter === 'ROBOTS') return log.type === 'skip' || log.status === 403;
      return true;
    });
    return filtered.slice(0, 35);
  }, [orderedLogs, filter, isStealthMode]);

  return (
    <div className="panel-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ paddingBottom: '0.65rem' }}>
        <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Terminal size={18} className="text-cyan" />
          <span style={{ fontWeight: 700 }}>Real-time Live Activity</span>
          {isStealthMode ? (
            <span className="badge-pill" style={{ fontSize: '0.68rem', background: 'rgba(0, 245, 160, 0.15)', color: '#00f5a0', border: '1px solid rgba(0, 245, 160, 0.4)' }}>
              ⚡ HEMAT KOMPUTASI
            </span>
          ) : (
            <span className="badge-pill live-pulse" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 242, 254, 0.12)', border: '1px solid rgba(0, 242, 254, 0.35)', color: '#00f2fe' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00f2fe', display: 'inline-block', boxShadow: '0 0 10px #00f2fe' }} />
              STREAM AKTIF ({displayLogs.length} URL)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Stealth Mode Toggle */}
          <button
            className={`btn-secondary-action ${isStealthMode ? 'active' : ''}`}
            onClick={onToggleStealth}
            title={isStealthMode ? "Aktifkan kembali tampilan live log" : "Sembunyikan log realtime untuk menghemat 100% CPU/RAM"}
            style={isStealthMode ? { background: 'rgba(0, 245, 160, 0.2)', color: '#00f5a0', borderColor: 'rgba(0, 245, 160, 0.5)' } : {}}
          >
            {isStealthMode ? <Eye size={13} /> : <EyeOff size={13} />}
            {isStealthMode ? 'Tampilkan Log' : 'Sembunyikan Activity'}
          </button>

          {!isStealthMode && (
            <>
              {/* Quick Filters */}
              <div className="preset-pills" style={{ margin: 0 }}>
                {['ALL', 'OK', 'ROBOTS', 'ERR'].map(f => (
                  <button
                    key={f}
                    className={`preset-pill ${filter === f ? 'active' : ''}`}
                    style={filter === f ? { background: 'rgba(0, 242, 254, 0.15)', color: 'var(--primary)', borderColor: 'rgba(0, 242, 254, 0.4)' } : {}}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button className="btn-secondary-action" onClick={onClear} title="Clear terminal logs">
                <Trash2 size={13} />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {isStealthMode ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at center, rgba(0, 245, 160, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)',
          borderRadius: '8px',
          border: '1px dashed rgba(0, 245, 160, 0.3)',
          margin: '0.5rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(0, 245, 160, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem',
            border: '1px solid rgba(0, 245, 160, 0.3)'
          }}>
            <Zap size={24} style={{ color: '#00f5a0' }} className="animate-pulse" />
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>
            Mode Hemat Komputasi Aktif (Turbo Stealth)
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.5, marginBottom: '1.2rem' }}>
            Rendering log realtime dan broadcast telemetri disembunyikan. 100% daya prosesor dialokasikan khusus untuk *network fetch* dan *indexing* berkecepatan penuh tanpa hambatan UI.
          </div>

          <button
            className="btn-secondary-action"
            onClick={onToggleStealth}
            style={{ padding: '0.5rem 1rem', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', borderColor: 'rgba(0, 242, 254, 0.4)', borderRadius: '6px', fontWeight: 600 }}
          >
            <Eye size={14} style={{ marginRight: '0.4rem' }} />
            Tampilkan Kembali Realtime Stream
          </button>
        </div>
      ) : (
        <>
          {/* Real-time Dynamic Radar Scanline Bar */}
          <div style={{
            padding: '0.4rem 0.75rem',
            background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08) 0%, rgba(157, 78, 221, 0.08) 100%)',
            borderBottom: '1px solid rgba(0, 242, 254, 0.15)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glowing animated scanner beam */}
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${scanTick}%`,
              width: '80px',
              background: 'linear-gradient(90deg, transparent, rgba(0, 242, 254, 0.35), transparent)',
              pointerEvents: 'none',
              transform: 'translateX(-50%)',
              transition: 'left 0.12s linear'
            }} />

            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00f2fe', fontWeight: 700, zIndex: 1 }}>
              <Radio size={13} className="text-cyan animate-pulse" />
              <span>Multi-Stream Ingestion Live</span>
              <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.68rem' }}>
                (Web • News • Tokoh • Geo • Media)
              </span>
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4ade80', fontWeight: 700, zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              LIVE RADAR
            </span>
          </div>

          <div className="terminal-container" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', maxHeight: '420px' }}>
            {displayLogs.length === 0 ? (
              <div className="empty-hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem 0' }}>
                <Activity size={24} className="text-cyan animate-pulse" />
                <span>Menghubungkan ke jalur multi-stream... URL fetch akan muncul secara real-time.</span>
              </div>
            ) : (
              displayLogs.map((log, idx) => {
                let tagClass = 'ok';
                let tagText = `${log.status || 200} OK`;

                if (log.status === 404) {
                  tagClass = 'muted';
                  tagText = '404 LINK MATI';
                } else if (log.status === 403 || log.type === 'skip') {
                  tagClass = 'skip';
                  tagText = '403 BOT SHIELD';
                } else if (log.status === 429) {
                  tagClass = 'skip';
                  tagText = '429 RATE LIMIT';
                } else if (log.status === 0 || log.statusText?.toLowerCase().includes('timeout')) {
                  tagClass = 'skip';
                  tagText = 'TIMEOUT SKIP';
                } else if (log.type === 'error' || log.status >= 500) {
                  tagClass = 'err';
                  tagText = `${log.status || '500'} SERVER ERR`;
                }

                const timeStr = new Date(log.created_at || log.timestamp || Date.now()).toLocaleTimeString();
                const latencyStr = log.latencyMs ? `${log.latencyMs}ms` : '';
                const linksStr = log.newQueued !== undefined ? `+${log.newQueued} links` : '';
                const isTopLatest = idx === 0;

                // Source indicator badge
                const sourceBadge = log.source ? (
                  <span style={{
                    fontSize: '0.6rem',
                    background: log.source === 'news' ? 'rgba(59, 130, 246, 0.2)' : (log.source === 'tokoh' ? 'rgba(168, 85, 247, 0.2)' : (log.source === 'geo' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)')),
                    color: log.source === 'news' ? '#60a5fa' : (log.source === 'tokoh' ? '#c084fc' : (log.source === 'geo' ? '#4ade80' : '#fbbf24')),
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.08rem 0.3rem',
                    borderRadius: '4px',
                    marginRight: '0.35rem',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {log.source}
                  </span>
                ) : null;

                return (
                  <div
                    className={`terminal-line ${isTopLatest ? 'latest' : ''}`}
                    key={log.id || `${log.url}-${idx}-${log.created_at || log.timestamp || idx}`}
                    style={{
                      padding: '0.5rem 0.65rem',
                      marginBottom: '0.35rem',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isTopLatest && (
                      <span style={{
                        fontSize: '0.62rem',
                        background: '#0284c7',
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        marginRight: '0.4rem',
                        letterSpacing: '0.3px'
                      }}>
                        LATEST
                      </span>
                    )}
                    {sourceBadge}
                    <span className={`term-tag ${tagClass}`}>{tagText}</span>
                    <span className="term-meta">[{timeStr}] {latencyStr} {linksStr}</span>
                    <span className="term-url" style={isTopLatest ? { fontWeight: 600 } : {}}>
                      {log.title ? <span style={{ color: '#0284c7', marginRight: '0.4rem', fontWeight: 600 }}>[{log.title}]</span> : null}
                      {log.url}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
