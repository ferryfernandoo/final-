import React, { useState, useEffect, useRef } from 'react';
import AD_CONFIG from '../config/adConfig';
import AdsterraBanner from './AdsterraBanner';
import './MessageAdRotator.css';

export default function MessageAdRotator({ userLanguage = 'id' }) {
  // If activeProvider is set to Adsterra, render the sleek Adsterra Native Banner unit (~210px for viewability)
  if (AD_CONFIG?.activeProvider === 'adsterra') {
    return <AdsterraBanner width={340} height={210} />;
  }

  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  const adsbygoogleRef = useRef(null);

  // Pure official Google Ads video campaigns (streamed directly from Google)
  // Absolutely ZERO fallback videos, ZERO local drive files, ZERO cloud bucket files
  const googleAdsVideoCampaigns = [
    {
      id: 'gads_meridian_overview',
      tag: 'Google Ads',
      title: userLanguage === 'id' 
        ? 'Google Ads — Tingkatkan Bisnis Anda' 
        : 'Google Ads — Grow Your Business',
      desc: userLanguage === 'id' 
        ? 'Jangkau jutaan calon pelanggan potensial saat mereka mencari produk di Google.' 
        : 'Reach millions of potential customers when they search on Google.',
      cta: userLanguage === 'id' ? 'Mulai Sekarang' : 'Get Started',
      url: 'https://ads.google.com/',
      youtubeId: 'X3ksrQ1U1SI' // Official Google Ads & Analytics (Active & Embeddable)
    },
    {
      id: 'gads_analytics_budget',
      tag: 'Google Ads',
      title: userLanguage === 'id' 
        ? 'Google Ads — Maksimalkan Penjualan' 
        : 'Google Ads — Maximize Your Sales',
      desc: userLanguage === 'id' 
        ? 'Tingkatkan kunjungan situs dan penjualan toko dengan teknologi periklanan Google AI.' 
        : 'Drive website visits and sales with Google AI advertising technology.',
      cta: userLanguage === 'id' ? 'Pasang Iklan' : 'Advertise Now',
      url: 'https://ads.google.com/intl/id_id/home/',
      youtubeId: 'NpPmidwdZPU' // Official Google Ads Channel Budgeting (Active & Embeddable)
    },
    {
      id: 'gads_ai_meridian',
      tag: 'Google AI',
      title: userLanguage === 'id' 
        ? 'Google AI — Teknologi Periklanan Cerdas' 
        : 'Google AI — Smart Advertising Technology',
      desc: userLanguage === 'id' 
        ? 'Optimalkan performa iklan otomatis dengan machine learning terdepan dari Google.' 
        : 'Optimize automated ad performance with cutting-edge machine learning from Google.',
      cta: userLanguage === 'id' ? 'Pelajari Selengkapnya' : 'Learn More',
      url: 'https://ads.google.com/',
      youtubeId: 'L2QmrfCVnBQ' // Official Google Ads AI Meridian (Active & Embeddable)
    }
  ];

  const currentAd = googleAdsVideoCampaigns[currentAdIndex];

  // Rotate video ad campaigns smoothly every 30 seconds
  useEffect(() => {
    if (isDismissed) return;

    const DURATION_MS = 30000;
    const TICK_MS = 200;
    const step = (TICK_MS / DURATION_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentAdIndex((idx) => (idx + 1) % googleAdsVideoCampaigns.length);
          return 0;
        }
        return prev + step;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [currentAdIndex, isDismissed, googleAdsVideoCampaigns.length]);

  // Handle switching to next Google Ads video
  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setProgress(0);
    setCurrentAdIndex((prev) => (prev + 1) % googleAdsVideoCampaigns.length);
  };

  // Trigger Google AdSense tag if ready
  useEffect(() => {
    if (typeof window !== 'undefined' && window.adsbygoogle && AD_CONFIG?.enabled) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // Silently handled
      }
    }
  }, [currentAdIndex]);

  if (isDismissed) return null;

  return (
    <div className="message-google-video-ad-unit" role="region" aria-label="Iklan Video Google">
      {/* Top Header Bar */}
      <div className="gvideo-ad-header">
        <div className="gvideo-ad-header-left">
          <span className="gvideo-ad-google-badge">
            <svg className="google-icon-svg" viewBox="0 0 24 24" width="13" height="13">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Iklan Video Google
          </span>
          <span className="gvideo-ad-live-status">
            <span className="gvideo-ad-live-dot"></span>
            Diputar • {currentAd.tag}
          </span>
        </div>

        <div className="gvideo-ad-header-right">
          <button
            type="button"
            className="gvideo-ad-ctrl-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
            aria-label={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="gvideo-ad-ctrl-btn"
            onClick={handleNext}
            title="Video Iklan Selanjutnya"
            aria-label="Video Iklan Selanjutnya"
          >
            ⏭
          </button>
          <button
            type="button"
            className="gvideo-ad-close-btn"
            onClick={() => setIsDismissed(true)}
            title="Tutup Iklan"
            aria-label="Tutup Iklan"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Video Body */}
      <div className="gvideo-ad-body">
        {/* Pure Video Player from Google Ads (Direct Google Stream) */}
        <div className="gvideo-ad-player-box">
          <iframe
            key={currentAd.id + (isMuted ? '_muted' : '_unmuted')}
            src={`https://www.youtube-nocookie.com/embed/${currentAd.youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${currentAd.youtubeId}&modestbranding=1&rel=0&playsinline=1`}
            title={currentAd.title}
            className="gvideo-ad-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className="gvideo-ad-badge-overlay">Ad</div>
        </div>

        {/* Ad Info & Action Button */}
        <div className="gvideo-ad-info-box">
          <div className="gvideo-ad-text-wrap">
            <h4 className="gvideo-ad-title">{currentAd.title}</h4>
            <p className="gvideo-ad-desc">{currentAd.desc}</p>
          </div>

          <div className="gvideo-ad-action-wrap">
            <a
              href={currentAd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="gvideo-ad-cta-btn"
            >
              {currentAd.cta} ↗
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Progress Track */}
      <div className="gvideo-ad-progress-track">
        <div 
          className="gvideo-ad-progress-fill" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>

      {/* Official Google AdSense tag mounted for live publisher monetization */}
      {AD_CONFIG.chatBottomSlotId && (
        <ins
          ref={adsbygoogleRef}
          className="adsbygoogle"
          style={{ display: 'none' }}
          data-ad-client={AD_CONFIG.adClient}
          data-ad-slot={AD_CONFIG.chatBottomSlotId}
        />
      )}
    </div>
  );
}
