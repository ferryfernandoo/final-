import React, { useState, useEffect } from 'react';
import AD_CONFIG from '../config/adConfig';
import './MessageAdRotator.css';

export default function MessageAdRotator({ onSupportClick, onNavigate, userLanguage = 'id' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const ads = [
    {
      id: 'qris_support',
      badge: 'SPONSOR • REKENING',
      icon: '💝',
      title: userLanguage === 'id' ? 'Dukung Server AI Deepernova' : 'Support Deepernova AI Server',
      desc: userLanguage === 'id' ? 'Scan QRIS untuk bantu biaya server & GPU' : 'Scan QRIS to help GPU & server costs',
      btnText: 'QRIS / Bank',
      btnAction: () => onSupportClick && onSupportClick(),
      accent: '#ea580c'
    },
    {
      id: 'google_adsense',
      badge: 'ADSENSE • IKLAN',
      icon: '✨',
      title: userLanguage === 'id' ? 'Pasang Iklan Bisnis Anda di Sini' : 'Advertise Your Business Here',
      desc: userLanguage === 'id' ? 'Jangkau ribuan pelajar & developer Indonesia' : 'Reach thousands of Indonesian users',
      btnText: userLanguage === 'id' ? 'Info Iklan' : 'Ad Info',
      btnAction: () => {
        window.open('https://deepernova.com/terms.html', '_blank');
      },
      accent: '#3b82f6'
    },
    {
      id: 'codedance_promo',
      badge: 'FITUR UNGGULAN',
      icon: '⚡',
      title: 'CodeDance Vibe Coding IDE',
      desc: userLanguage === 'id' ? 'Coding & preview aplikasi fullstack gratis di browser' : 'Code & preview fullstack apps in browser',
      btnText: userLanguage === 'id' ? 'Buka IDE' : 'Open IDE',
      btnAction: () => onNavigate && onNavigate('codedance'),
      accent: '#06b6d4'
    },
    {
      id: 'typernova_promo',
      badge: 'DOKUMEN AI',
      icon: '📄',
      title: 'Typernova Document Studio',
      desc: userLanguage === 'id' ? 'Buat makalah Word .docx, PPTX & Excel rapi otomatis' : 'Auto-generate clean Word, PPTX & Excel docs',
      btnText: userLanguage === 'id' ? 'Buat Dokumen' : 'Create Doc',
      btnAction: () => onNavigate && onNavigate('documents'),
      accent: '#10b981'
    }
  ];

  // Auto-rotate every 7 seconds when not hovered
  useEffect(() => {
    if (isHovered || isDismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isHovered, isDismissed, ads.length]);

  if (isDismissed) return null;

  const currentAd = ads[currentIndex];

  return (
    <div 
      className="message-ad-rotator"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="message-ad-left">
        <span className="message-ad-badge" style={{ borderColor: currentAd.accent, color: currentAd.accent }}>
          <i className="fa-solid fa-arrows-rotate ad-rotate-icon"></i> {currentAd.badge}
        </span>
        <span className="message-ad-icon">{currentAd.icon}</span>
        <div className="message-ad-text">
          <span className="message-ad-title">{currentAd.title}</span>
          <span className="message-ad-sep">•</span>
          <span className="message-ad-desc">{currentAd.desc}</span>
        </div>
      </div>

      <div className="message-ad-right">
        {/* Indicators */}
        <div className="message-ad-dots">
          {ads.map((_, idx) => (
            <span
              key={idx}
              className={`ad-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              title={`Iklan ${idx + 1}`}
            />
          ))}
        </div>

        {currentAd.btnText && (
          <button
            type="button"
            className="message-ad-action-btn"
            style={{ backgroundColor: currentAd.accent }}
            onClick={currentAd.btnAction}
          >
            {currentAd.btnText}
          </button>
        )}

        <button
          type="button"
          className="message-ad-close-btn"
          onClick={() => setIsDismissed(true)}
          title={userLanguage === 'id' ? 'Sembunyikan iklan' : 'Hide ad'}
        >
          ×
        </button>
      </div>
    </div>
  );
}
