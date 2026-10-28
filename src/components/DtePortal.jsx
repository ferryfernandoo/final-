import React, { useEffect } from 'react';
import { ORDER_DTE_URL } from '../apiConfig';
import { validateDteTargetUrl } from '../services/securityShield';
import './DtePortal.css';

const DtePortal = ({ onNavigate }) => {
  const safeOrderUrl = validateDteTargetUrl(ORDER_DTE_URL);

  // Preconnect & warm up the DTE Order Panel tunnel so opening is instantaneous
  useEffect(() => {
    if (!safeOrderUrl) return;
    fetch(`${safeOrderUrl}/api/ping`, { mode: 'no-cors', priority: 'high' }).catch(() => {});
  }, [safeOrderUrl]);

  const handleOpenOrderPortal = (e) => {
    if (!safeOrderUrl) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const newWin = window.open(safeOrderUrl, '_blank', 'noopener,noreferrer');
    if (newWin) newWin.opener = null;
  };

  return (
    <div className="dte-simple-page">
      {/* Top Navbar */}
      <header className="dte-simple-header">
        <button 
          type="button" 
          className="dte-simple-back" 
          onClick={() => onNavigate?.('landing')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Kembali ke Beranda</span>
        </button>

        <div className="dte-simple-brand">
          <span className="dte-brand-dot"></span>
          <span>Deepernova DTE</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="dte-simple-main">
        <div className="dte-card-box">
          <div className="dte-badge">
            <span className="dte-badge-icon">🏭</span>
            <span>PORTAL RESMI DTE • TERPROTEKSI DTE SHIELD</span>
          </div>

          <h1 className="dte-main-title">
            Order & Maintenance <span className="dte-text-orange">DTE</span>
          </h1>

          <p className="dte-main-subtitle">
            Sistem pemesanan work order dan manajemen pemeliharaan unit mesin terintegrasi.
          </p>

          <div className="dte-action-wrap">
            <a 
              href={safeOrderUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer" 
              referrerPolicy="no-referrer"
              onClick={handleOpenOrderPortal}
              className="dte-order-btn"
            >
              <span>Order Sekarang</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>

          <div className="dte-pills-row">
            <div className="dte-pill">
              <span className="dte-pill-check">✓</span>
              <span>Work Order Cepat</span>
            </div>
            <div className="dte-pill">
              <span className="dte-pill-check">✓</span>
              <span>Regu A, B, C, D</span>
            </div>
            <div className="dte-pill">
              <span className="dte-pill-check">✓</span>
              <span>Digital & Real-time</span>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="dte-simple-footer">
        <p>© {new Date().getFullYear()} Deepernova DTE. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DtePortal;
