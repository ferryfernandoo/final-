import React, { useState, useEffect } from 'react';
import AD_CONFIG from '../config/adConfig';
import './AdsterraBanner.css';

/**
 * AdsterraBanner Component
 * Renders an isolated, secure Adsterra Native Banner widget (~200px height for complete viewability)
 * Placed directly above the user chat bubble.
 */
export default function AdsterraBanner({ 
  width = 340,
  height = 210 
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(height || 210);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'ADSTERRA_HEIGHT' && typeof e.data.height === 'number') {
        const clamped = Math.max(180, Math.min(320, e.data.height + 4));
        setBannerHeight(clamped);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isDismissed) return null;

  return (
    <div className="adsterra-banner-container" role="region" aria-label="Sponsor Banner">
      <div className="adsterra-banner-top-bar">
        <span className="adsterra-sponsor-tag">
          <span className="adsterra-tag-dot"></span>
          Sponsor • Adsterra
        </span>
        <button 
          type="button" 
          className="adsterra-banner-close" 
          onClick={() => setIsDismissed(true)}
          title="Tutup Iklan"
          aria-label="Tutup Iklan"
        >
          ✕
        </button>
      </div>

      <div className="adsterra-banner-frame-wrap" style={{ minHeight: `${bannerHeight}px` }}>
        <iframe
          src="/adsterra-banner.html"
          title="Sponsor Banner Adsterra"
          className="adsterra-iframe"
          style={{ width: '100%', maxWidth: `${width}px`, height: `${bannerHeight}px`, border: 'none', overflow: 'hidden' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}
