import React, { useState } from 'react';
import AD_CONFIG from '../config/adConfig';
import './AdsterraBanner.css';

/**
 * AdsterraBanner Component
 * Renders an isolated, secure Adsterra 300x50 / 320x50 banner unit
 * Placed directly under the AI chat messages and response generator.
 */
export default function AdsterraBanner({ 
  width = 320,
  height = 50 
}) {
  const [isDismissed, setIsDismissed] = useState(false);

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

      <div className="adsterra-banner-frame-wrap" style={{ minHeight: `${height}px` }}>
        <iframe
          src="/adsterra-banner.html"
          title="Sponsor Banner Adsterra"
          className="adsterra-iframe"
          style={{ width: `${width}px`, height: `${height}px`, border: 'none', overflow: 'hidden' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}
