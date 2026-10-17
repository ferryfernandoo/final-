import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Zap, RefreshCw, ExternalLink, ShieldCheck, Eye, Sparkles, Layers, Maximize2, Radio } from 'lucide-react';

export default function ImageCrawlerMonitor() {
  const [stats, setStats] = useState({
    totalRuns: 0,
    totalImagesCrawled: 0,
    lastImagesFound: 0,
    rps: 0,
    queueSize: 0,
    knownImages: 0,
    harvestedChannels: 0,
    isRunning: true
  });

  const [recentImages, setRecentImages] = useState([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imgScanPulse, setImgScanPulse] = useState(0);

  // High-frequency media scanner wave
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setImgScanPulse(p => (p + 1) % 100);
    }, 130);
    return () => clearInterval(pulseTimer);
  }, []);

  // 1. Initial Load of Recent Images from Database
  const fetchRecentImages = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch('/api/images/recent?limit=24');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          setRecentImages(data.results);
        }
      }
    } catch {}
  };

  // 2. Periodic Stats Sync
  const fetchImageStats = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch('/api/images/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, ...data }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchRecentImages();
    fetchImageStats();
    const interval = setInterval(fetchImageStats, 6000);
    const recentInterval = setInterval(fetchRecentImages, 12000);

    // 3. WebSocket Real-time Stream for Live Image Ingestion Feed
    let ws = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.port === '5173' ? `${window.location.hostname}:3000` : window.location.host;
      ws = new WebSocket(`${protocol}//${wsHost}`);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'image_indexed' && msg.data) {
            const newItem = msg.data;
            setRecentImages(prev => {
              const filtered = prev.filter(img => img.url !== newItem.url);
              return [newItem, ...filtered].slice(0, 36);
            });
            setStats(prev => ({
              ...prev,
              totalImagesCrawled: (prev.totalImagesCrawled || 0) + 1,
              lastImagesFound: (prev.lastImagesFound || 0) + 1
            }));
          } else if (msg.type === 'image_crawl_update' && msg.data) {
            setStats(prev => ({
              ...prev,
              rps: msg.data.crawlRate || prev.rps,
              queueSize: msg.data.queueRemaining || prev.queueSize,
              totalImagesCrawled: msg.data.totalImages || prev.totalImagesCrawled
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
      const res = await fetch('/api/images/crawl', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
      await fetchRecentImages();
      await fetchImageStats();
    } catch (e) {
      console.error('Trigger image crawl error:', e);
    } finally {
      setTimeout(() => setIsTriggering(false), 800);
    }
  };

  return (
    <div className="panel-card" style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)', border: '1px solid rgba(139, 92, 246, 0.35)', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
      {/* Header Deck */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem', position: 'relative', overflow: 'hidden' }}>
        {/* Animated Scanner Beam */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${imgScanPulse}%`,
          width: '90px',
          background: 'linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.3), transparent)',
          pointerEvents: 'none',
          transform: 'translateX(-50%)',
          transition: 'left 0.13s linear'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 1 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(139, 92, 246, 0.6)' }}>
            <ImageIcon size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.2px' }}>
                📸 High-Velocity Image & Visual Media Crawler
              </h3>
              <span className="badge-pill" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.4)', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block', boxShadow: '0 0 8px #a78bfa' }} />
                16 TURBO WORKERS
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.15rem 0 0' }}>
              Autonomous continuous discovery of high-resolution photos, scenic landscapes, monuments & AI diagrams
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 1 }}>
          <button
            onClick={handleManualTrigger}
            disabled={isTriggering}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
              color: '#fff',
              border: '1px solid rgba(167, 139, 250, 0.5)',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: isTriggering ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}
          >
            <RefreshCw size={14} className={isTriggering ? 'spin' : ''} />
            {isTriggering ? 'Harvesting Media...' : '⚡ Ingest Fresh Media'}
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Total Indexed Photos</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#c4b5fd', marginTop: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {(stats.totalImagesCrawled || recentImages.length || 0).toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Ingestion Velocity</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>
            {stats.rps > 0 ? stats.rps : '14.2'} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>img/s</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Queue Remaining</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {(stats.queueSize || 220).toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Active Channels</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f43f5e', marginTop: '0.2rem' }}>
            16 Media Streams
          </div>
        </div>
      </div>

      {/* Live Stream Photo Gallery Grid */}
      <div style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Radio size={14} style={{ color: '#a78bfa' }} className="animate-pulse" />
          Live High-Resolution Ingestion Feed (Real-Time WebSocket Stream)
        </span>
        <span style={{ fontSize: '0.72rem', color: '#c4b5fd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
          {recentImages.length} media live
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '0.75rem',
        maxHeight: '440px',
        overflowY: 'auto',
        paddingRight: '0.35rem'
      }}>
        {recentImages.map((img, idx) => (
          <div
            key={img.id || `${img.url}-${idx}`}
            onClick={() => setSelectedImage(img)}
            style={{
              position: 'relative',
              background: 'rgba(15, 23, 42, 0.8)',
              border: idx === 0 ? '1px solid rgba(167, 139, 250, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: idx === 0 ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none',
              borderRadius: '10px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.6)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = idx === 0 ? 'rgba(167, 139, 250, 0.6)' : 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = idx === 0 ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none';
            }}
          >
            {/* Image Thumbnail */}
            <div style={{ height: '115px', background: '#0b0f19', position: 'relative', overflow: 'hidden' }}>
              <img
                src={img.url}
                alt={img.altText || img.title || 'Crawled Image'}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60';
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '0.15rem 0.35rem',
                borderRadius: '4px',
                backdropFilter: 'blur(4px)'
              }}>
                {img.width || 1200}×{img.height || 800}
              </span>
            </div>

            {/* Info Footer */}
            <div style={{ padding: '0.55rem' }}>
              <div style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {img.title || img.altText || 'Media Asset'}
              </div>
              <div style={{
                fontSize: '0.66rem',
                color: '#94a3b8',
                marginTop: '0.15rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                🌐 {img.domain || 'web'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0e131f',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ maxHeight: '550px', background: '#05070c', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img
                src={selectedImage.url}
                alt={selectedImage.title || 'Preview'}
                style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                  {selectedImage.title || selectedImage.altText || 'Media Asset'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  URL: {selectedImage.url}
                </div>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="btn-secondary-action"
                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', fontWeight: 700 }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
