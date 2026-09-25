import React, { useState, useEffect, useRef } from 'react';
import AD_CONFIG from '../config/adConfig';
import './MessageAdRotator.css';

export default function MessageAdRotator({ onNavigate, userLanguage = 'id' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [fadeAnim, setFadeAnim] = useState(true);

  const client = AD_CONFIG.adClient || 'ca-pub-6822768824603153';

  const ads = [
    {
      id: 'google_adsense_live',
      badge: userLanguage === 'id' ? 'IKLAN GOOGLE • 1/4' : 'GOOGLE ADS • 1/4',
      icon: (
        <svg className="google-icon-svg" viewBox="0 0 24 24" width="13" height="13">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
      ),
      title: 'Google AdSense Publisher',
      desc: userLanguage === 'id' ? 'Jaringan iklan resmi Google penayang terverifikasi' : 'Official Google verified publisher ad network',
      btnText: 'Google Ads',
      btnAction: () => window.open('https://ads.google.com/', '_blank'),
      accent: '#4285F4',
      isGoogleIns: true
    },
    {
      id: 'google_cloud_sponsor',
      badge: userLanguage === 'id' ? 'SPONSOR CLOUD • 2/4' : 'CLOUD SPONSOR • 2/4',
      icon: (
        <svg className="google-icon-svg" viewBox="0 0 24 24" width="13" height="13">
          <path fill="#4285F4" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
        </svg>
      ),
      title: 'Google Cloud & AI Infrastructure',
      desc: userLanguage === 'id' ? 'Infrastruktur komputasi berkecepatan tinggi Deepernova AI' : 'High-speed cloud computing for Deepernova AI',
      btnText: userLanguage === 'id' ? 'Jelajahi Cloud' : 'Explore Cloud',
      btnAction: () => window.open('https://cloud.google.com/', '_blank'),
      accent: '#34A853'
    },
    {
      id: 'google_ads_promote',
      badge: userLanguage === 'id' ? 'PROMOSI BISNIS • 3/4' : 'BUSINESS ADS • 3/4',
      icon: (
        <svg className="google-icon-svg" viewBox="0 0 24 24" width="13" height="13">
          <path fill="#FBBC05" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      ),
      title: userLanguage === 'id' ? 'Pasang Iklan Google Ads Bisnis Anda' : 'Advertise with Google Ads',
      desc: userLanguage === 'id' ? 'Jangkau jutaan pelanggan potensial di seluruh Indonesia' : 'Reach millions of customers across the web',
      btnText: userLanguage === 'id' ? 'Pasang Iklan' : 'Advertise',
      btnAction: () => window.open('https://ads.google.com/home/', '_blank'),
      accent: '#EA4335'
    },
    {
      id: 'google_workspace_typernova',
      badge: userLanguage === 'id' ? 'WORKSPACE • 4/4' : 'WORKSPACE • 4/4',
      icon: (
        <svg className="google-icon-svg" viewBox="0 0 24 24" width="13" height="13">
          <path fill="#4285F4" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      ),
      title: 'Google Docs & Typernova Document Studio',
      desc: userLanguage === 'id' ? 'Ekspor dokumen Word .docx & Excel rapi otomatis' : 'Auto-format Word .docx and Excel docs',
      btnText: userLanguage === 'id' ? 'Buka Dokumen' : 'Open Docs',
      btnAction: () => onNavigate && onNavigate('documents'),
      accent: '#0891b2'
    }
  ];

  // Auto-rotate every 5.5 seconds with smooth animation
  useEffect(() => {
    if (isHovered || isDismissed) return;
    const interval = setInterval(() => {
      setFadeAnim(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
        setFadeAnim(true);
      }, 180);
    }, 5500);

    return () => clearInterval(interval);
  }, [isHovered, isDismissed, ads.length]);

  // Attempt Google AdSense push on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (_err) {}
  }, []);

  if (isDismissed) return null;

  const currentAd = ads[currentIndex];

  const handlePrev = (e) => {
    e.stopPropagation();
    setFadeAnim(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
      setFadeAnim(true);
    }, 150);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setFadeAnim(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
      setFadeAnim(true);
    }, 150);
  };

  return (
    <div 
      className="message-ad-rotator google-rotator-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`google-rotator-content ${fadeAnim ? 'fade-in' : 'fade-out'}`}>
        <div className="google-rotator-left">
          <span 
            className="google-rotator-badge"
            style={{ borderColor: currentAd.accent, color: currentAd.accent }}
          >
            <i className="fa-solid fa-arrows-rotate rotating-icon"></i>
            {currentAd.badge}
          </span>

          <span className="google-rotator-icon">{currentAd.icon}</span>

          <div className="google-rotator-text">
            <span className="google-rotator-title">{currentAd.title}</span>
            <span className="google-rotator-sep">•</span>
            <span className="google-rotator-desc">{currentAd.desc}</span>
          </div>
        </div>

        <div className="google-rotator-right">
          {/* Controls: Prev / Next */}
          <div className="google-rotator-arrows">
            <button type="button" className="rotator-arrow-btn" onClick={handlePrev} title="Iklan sebelumnya">
              ‹
            </button>
            <button type="button" className="rotator-arrow-btn" onClick={handleNext} title="Iklan selanjutnya">
              ›
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="google-rotator-dots">
            {ads.map((_, idx) => (
              <span
                key={idx}
                className={`rotator-dot ${idx === currentIndex ? 'active' : ''}`}
                style={{ backgroundColor: idx === currentIndex ? currentAd.accent : '' }}
                onClick={() => {
                  setFadeAnim(false);
                  setTimeout(() => {
                    setCurrentIndex(idx);
                    setFadeAnim(true);
                  }, 150);
                }}
                title={`Iklan Google ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Button */}
          {currentAd.btnText && (
            <button
              type="button"
              className="google-rotator-action-btn"
              style={{ backgroundColor: currentAd.accent }}
              onClick={currentAd.btnAction}
            >
              {currentAd.btnText}
            </button>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            className="google-rotator-close-btn"
            onClick={() => setIsDismissed(true)}
            title={userLanguage === 'id' ? 'Sembunyikan iklan' : 'Hide ad'}
          >
            ×
          </button>
        </div>
      </div>

      {/* Hidden AdSense tag to preserve Google crawlers discovery */}
      <ins
        className="adsbygoogle"
        style={{ display: 'none' }}
        data-ad-client={client}
        data-ad-slot={AD_CONFIG.chatBottomSlotId || ''}
      />
    </div>
  );
}
