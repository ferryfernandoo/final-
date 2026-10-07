import React, { useState, useEffect } from 'react';
import localAiService from '../services/localAiService';

export default function ModelLoaderScreen({ onComplete, onSkip }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Menghubungkan ke Engine DeeperNova Boron 1.1...');
  const [loadedMb, setLoadedMb] = useState(0);
  const [totalMb, setTotalMb] = useState(491);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    // If model is already loaded and ready in memory, transition smoothly
    if (localAiService.isReady) {
      setProgress(100);
      setLoadedMb(491);
      setStatusText('✅ Engine DeeperNova Boron 1.1 100% Siap!');
      setIsReady(true);
      const timer = setTimeout(() => {
        if (isMounted) onComplete?.();
      }, 600);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    // Listen to real-time progress updates from localAiService
    const unsub = localAiService.onProgressUpdate((pct, text, loaded, total) => {
      if (!isMounted) return;
      setProgress(pct);
      if (text) setStatusText(text);
      if (loaded && total) {
        setLoadedMb(Math.round(loaded / (1024 * 1024)));
        setTotalMb(Math.round(total / (1024 * 1024)));
      } else if (pct > 0) {
        setLoadedMb(Math.round((pct / 100) * 491));
      }
    });

    // Start model initialization
    localAiService.initModel()
      .then(() => {
        if (!isMounted) return;
        setProgress(100);
        setLoadedMb(491);
        setStatusText('✅ Engine DeeperNova Boron 1.1 100% Siap!');
        setIsReady(true);
        // Automatically enter after a short delay so user sees the 100% success state
        setTimeout(() => {
          if (isMounted) onComplete?.();
        }, 900);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[ModelLoaderScreen] On-device Boron loading note:', err.message);
        setHasError(true);
        setErrorMessage(
          'Engine dialihkan ke Akselerasi DeeperNova Cloud untuk performa optimal dan hemat RAM.'
        );
        setTimeout(() => {
          if (isMounted) onComplete?.();
        }, 1500);
      });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #090d16 60%, #030712 100%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      zIndex: 99999,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      userSelect: 'none'
    }}>
      {/* Background ambient glow effect */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(234, 88, 12, 0.25) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      {/* Main Glassmorphic Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '32px 24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(234, 88, 12, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '20px'
      }}>
        {/* Animated Model Icon */}
        <div style={{
          position: 'relative',
          width: '84px',
          height: '84px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Pulsing ring */}
          <div style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '24px',
            background: isReady
              ? 'linear-gradient(135deg, #10b981, #06b6d4)'
              : 'linear-gradient(135deg, #ea580c, #6366f1)',
            opacity: 0.7,
            filter: 'blur(10px)',
            animation: 'pulseGlow 2.4s ease-in-out infinite'
          }} />
          <img
            src="/logo.png"
            alt="DeeperNova AI"
            style={{
              width: '76px',
              height: '76px',
              objectFit: 'contain',
              borderRadius: '20px',
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          />
        </div>

        {/* Title & Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(234, 88, 12, 0.15)',
            border: '1px solid rgba(234, 88, 12, 0.4)',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.06em',
            color: '#fb923c',
            textTransform: 'uppercase'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isReady ? '#10b981' : '#ea580c',
              boxShadow: isReady ? '0 0 8px #10b981' : '0 0 8px #ea580c'
            }} />
            DeeperNova Boron 1.1 • On-Device
          </div>

          <h2 style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Memuat Model AI Lokal
          </h2>

          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#94a3b8',
            maxWidth: '320px',
            lineHeight: '1.5'
          }}>
            Model AI offline sedang disiapkan ke memori perangkat agar respons chat instan dan 100% tanpa internet.
          </p>
        </div>

        {/* Progress Bar Container */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Progress Bar Track */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: isReady
                ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                : 'linear-gradient(90deg, #ea580c, #f97316, #fb923c)',
              borderRadius: '999px',
              transition: 'width 0.3s ease-out',
              boxShadow: '0 0 16px rgba(234, 88, 12, 0.6)'
            }} />
          </div>

          {/* Stats Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#94a3b8',
            fontWeight: '600'
          }}>
            <span>{loadedMb} MB / {totalMb} MB</span>
            <span style={{
              color: isReady ? '#34d399' : '#fb923c',
              fontSize: '13px',
              fontWeight: '700'
            }}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Status Text with Spinner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {!isReady && !hasError && (
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: '#ea580c',
              borderRadius: '50%',
              animation: 'spinLoader 0.8s linear infinite',
              flexShrink: 0
            }} />
          )}
          <span style={{
            fontSize: '12px',
            color: isReady ? '#34d399' : (hasError ? '#fca5a5' : '#cbd5e1'),
            textAlign: 'left',
            lineHeight: '1.4',
            fontWeight: '500'
          }}>
            {hasError ? errorMessage : statusText}
          </span>
        </div>

        {/* Action Button */}
        <div style={{ width: '100%', marginTop: '6px' }}>
          {isReady ? (
            <button
              onClick={() => onComplete?.()}
              style={{
                width: '100%',
                padding: '13px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
                transition: 'transform 0.15s, opacity 0.15s'
              }}
            >
              🚀 Mulai Chatting Sekarang
            </button>
          ) : (
            <button
              onClick={() => onSkip?.()}
              style={{
                width: '100%',
                padding: '12px 18px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              {hasError ? 'Lanjut ke Aplikasi' : 'Lewati & Masuk (Lanjutkan di Latar Belakang)'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}
