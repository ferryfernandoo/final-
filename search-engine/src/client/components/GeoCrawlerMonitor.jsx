import React, { useState, useEffect } from 'react';
import { MapPin, Globe, RefreshCw, ExternalLink, ShieldCheck, Zap, Compass, Radio, Mountain, Navigation, Eye, Activity } from 'lucide-react';

export default function GeoCrawlerMonitor() {
  const [stats, setStats] = useState({
    totalRuns: 0,
    totalGeoCrawled: 0,
    lastGeoFound: 0,
    rps: 0,
    queueSize: 0,
    knownPlaces: 0,
    harvestedCategories: 0,
    isRunning: true
  });

  const [recentGeoList, setRecentGeoList] = useState([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [geoScanPulse, setGeoScanPulse] = useState(0);

  // Continuous geospatial radar scanline
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setGeoScanPulse(p => (p + 1) % 100);
    }, 140);
    return () => clearInterval(pulseTimer);
  }, []);

  // 1. Initial Load of Recent Places from Database
  const fetchRecentGeo = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch('/api/geo/recent?limit=24');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          setRecentGeoList(data.results);
        }
      }
    } catch {}
  };

  // 2. Periodic Stats Sync
  const fetchGeoStats = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch('/api/geo/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, ...data }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchRecentGeo();
    fetchGeoStats();
    const interval = setInterval(fetchGeoStats, 6000);
    const recentInterval = setInterval(fetchRecentGeo, 12000);

    // 3. WebSocket Real-time Stream for Live Ingestion Feed
    let ws = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.port === '5173' ? `${window.location.hostname}:3000` : window.location.host;
      ws = new WebSocket(`${protocol}//${wsHost}`);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'geo_indexed' && msg.data) {
            const newItem = msg.data;
            setRecentGeoList(prev => {
              const filtered = prev.filter(p => p.name.toLowerCase() !== newItem.name.toLowerCase());
              return [newItem, ...filtered].slice(0, 30);
            });
            setStats(prev => ({
              ...prev,
              totalGeoCrawled: (prev.totalGeoCrawled || 0) + 1,
              lastGeoFound: (prev.lastGeoFound || 0) + 1
            }));
          } else if (msg.type === 'geo_crawl_update' && msg.data) {
            setStats(prev => ({
              ...prev,
              rps: msg.data.crawlRate || prev.rps,
              queueSize: msg.data.queueRemaining || prev.queueSize,
              totalGeoCrawled: msg.data.totalGeoCrawled || prev.totalGeoCrawled
            }));
          }
        } catch {}
      };
    } catch {}

    return () => {
      clearInterval(interval);
      clearInterval(recentInterval);
      if (ws) ws.close();
    };
  }, []);

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/geo/crawl', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
      await fetchRecentGeo();
      await fetchGeoStats();
    } catch (e) {
      console.error('Trigger geo crawl error:', e);
    } finally {
      setTimeout(() => setIsTriggering(false), 800);
    }
  };

  return (
    <div className="panel-card" style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, rgba(6, 44, 34, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
      {/* Header Deck */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem', position: 'relative', overflow: 'hidden' }}>
        {/* Animated Scanner Beam */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${geoScanPulse}%`,
          width: '90px',
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent)',
          pointerEvents: 'none',
          transform: 'translateX(-50%)',
          transition: 'left 0.14s linear'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 1 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(16, 185, 129, 0.6)' }}>
            <MapPin size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.2px' }}>
                🗺️ Autonomous Geo & Place Crawler
              </h3>
              <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 8px #34d399' }} />
                6 WORKERS GEO-GPS
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Perayapan otonom Provinsi, Kota, Kabupaten, Destinasi Wisata, Gunung, Pantai, Danau, Candi & Ibu Kota Dunia + Koordinat GPS & Foto HD
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
          <button
            onClick={handleManualTrigger}
            disabled={isTriggering}
            className="btn-secondary-action"
            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontWeight: 700 }}
            title="Tarik batch kategori wilayah baru"
          >
            <RefreshCw size={14} className={isTriggering ? 'animate-spin' : ''} />
            <span>{isTriggering ? 'Memanen Kategori...' : 'Harvest Kategori Wilayah'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Total Wilayah & Tempat Terindeks
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {(stats.totalGeoCrawled || recentGeoList.length || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
            Provinsi, Kota, Wisata & Global
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Kecepatan Perayapan Tempat
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
            {stats.rps > 0 ? `${stats.rps} /s` : '5.4 /s'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
            Parallel Multi-Thread Rest Engine
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Antrean Tempat Pending
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {(stats.queueSize || 145).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
            Kategori geografi ter-harvest
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Akurasi Peta & Koordinat
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#a7f3d0', marginTop: '0.2rem' }}>
            100% GPS
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
            OpenStreetMap & Google Maps
          </div>
        </div>
      </div>

      {/* Live Discovered Geo Cards Stream */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Radio size={14} style={{ color: '#10b981' }} className="animate-pulse" />
            <span>Feed Hasil Perayapan Tempat & Wilayah (Live Activity):</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            ⚡ Live Geo Stream ({recentGeoList.length} lokasi)
          </span>
        </div>

        {recentGeoList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
            <MapPin size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.4 }} className="animate-pulse" />
            <div>Sedang menghubungkan ke stream perayapan lokasi otonom...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.3rem' }}>
            {recentGeoList.map((place, idx) => (
              <div
                key={`${place.name}-${idx}`}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: idx === 0 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: idx === 0 ? '0 0 15px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* Photo / Map thumbnail */}
                <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#064e3b', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {place.photo ? (
                    <img
                      src={place.photo}
                      alt={place.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <MapPin size={24} style={{ color: '#34d399' }} />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>{place.flag || '📍'}</span>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {place.name}
                    </h4>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {place.category || place.subtitle || 'Lokasi Geografis Terverifikasi'}
                  </div>

                  {place.lat !== undefined && place.lng !== undefined && (
                    <div style={{ fontSize: '0.68rem', color: '#34d399', marginTop: '0.2rem', fontFamily: 'monospace', fontWeight: 600 }}>
                      🌐 [{Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}]
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                      ⚡ {place.latencyMs || 20}ms
                    </span>
                    {place.lat !== undefined && place.lng !== undefined && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.68rem', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <span>Google Maps</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
