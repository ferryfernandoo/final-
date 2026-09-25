import React, { useEffect, useRef, useState } from 'react';
import AD_CONFIG from '../config/adConfig';
import './AdBanner.css';

export default function AdBanner({
  slotId,
  format = 'auto',
  className = '',
  onSupportClick = null
}) {
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  const client = AD_CONFIG.adClient;
  const isConfigured = client && !client.includes('XXXXXXXXXXXXXXXX') && AD_CONFIG.enabled;

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      }
    } catch (err) {
      console.warn('[AdBanner] AdSense display notice:', err?.message);
      setAdFailed(true);
    }
  }, [isConfigured]);

  // If AdSense is approved and configured, render the Google AdSense block
  if (isConfigured && !adFailed) {
    return (
      <div className={`ad-banner-wrapper ${className}`} ref={adRef}>
        <div className="ad-label">Sponsor / Advertisement</div>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={slotId || AD_CONFIG.sidebarSlotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Graceful fallback: Minimal sleek supporter pill / QRIS direct link
  if (AD_CONFIG.showDirectSponsorFallback) {
    return (
      <div className={`ad-fallback-banner ${className}`}>
        <div className="ad-fallback-content">
          <span className="ad-fallback-icon">⚡</span>
          <div className="ad-fallback-info">
            <span className="ad-fallback-title">Dukung Deepernova AI</span>
            <span className="ad-fallback-sub">100% Gratis untuk Pelajar Indonesia</span>
          </div>
        </div>
        {onSupportClick && (
          <button 
            type="button"
            className="ad-fallback-btn"
            onClick={onSupportClick}
            title="Dukung via QRIS / Rekening Bank"
          >
            QRIS / Donasi
          </button>
        )}
      </div>
    );
  }

  return null;
}
