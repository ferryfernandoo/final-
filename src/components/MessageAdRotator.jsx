import React, { useEffect, useRef, useState } from 'react';
import AD_CONFIG from '../config/adConfig';
import './MessageAdRotator.css';

export default function MessageAdRotator({ userLanguage = 'id' }) {
  const adRef = useRef(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Trigger Google AdSense ad fill
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setIsRendered(true);
      }
    } catch (err) {
      console.warn('[GoogleAdSense] Init notice:', err?.message);
    }
  }, []);

  const client = AD_CONFIG.adClient || 'ca-pub-6822768824603153';

  return (
    <div className="message-ad-rotator google-ad-wrapper" ref={adRef}>
      <div className="google-ad-header">
        <span className="google-ad-tag">
          <svg className="google-icon-svg" viewBox="0 0 24 24" width="12" height="12">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          {userLanguage === 'id' ? 'Iklan Google' : 'Google Ads'}
        </span>
        <span className="google-ad-sub">
          Ads by Google
        </span>
      </div>

      <div className="google-ad-slot-frame">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '60px' }}
          data-ad-client={client}
          data-ad-slot={AD_CONFIG.chatBottomSlotId || ''}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
