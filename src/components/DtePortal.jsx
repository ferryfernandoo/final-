import React, { useState } from 'react';
import { ORDER_DTE_URL } from '../apiConfig';
import './DtePortal.css';

const DtePortal = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'features', 'shifts', 'guide'

  const shiftGroups = [
    { name: 'Regu A (Shift Pagi)', time: '07:00 - 15:00 WIB', color: '#3b82f6', icon: '🌅', desc: 'Operasional lini produksi utama & inspeksi awal mesin' },
    { name: 'Regu B (Shift Sore)', time: '15:00 - 23:00 WIB', color: '#f59e0b', icon: '☀️', desc: 'Pemantauan throughput mesin & log pengerjaan harian' },
    { name: 'Regu C (Shift Malam)', time: '23:00 - 07:00 WIB', color: '#8b5cf6', icon: '🌙', desc: 'Maintenance berkala, perbaikan darurat & handover shift' },
    { name: 'Regu D (Regu Cadangan/Off)', time: 'Rotasi Terjadwal', color: '#10b981', icon: '🔄', desc: 'Standby pengganti cuti, training teknis & preventive task' }
  ];

  const keyFeatures = [
    {
      icon: '🛠️',
      title: 'Manajemen Work Order (WO)',
      desc: 'Pembuatan, disposisi penugasan teknisi, pelacakan progres perbaikan unit mesin, dan penutupan tiket secara real-time.'
    },
    {
      icon: '⚙️',
      title: 'Pemeliharaan Unit Mesin (Maintenance)',
      desc: 'Checklist inspeksi digital, rekap riwayat kerusakan unit, dan penjadwalan preventive maintenance terotomasi.'
    },
    {
      icon: '👥',
      title: 'Rotasi Shift Regu (A, B, C, D)',
      desc: 'Pengaturan jadwal shift kerja operator, presensi regu, dan handover catatan pekerjaan antar-shift tanpa kehilangan konteks.'
    },
    {
      icon: '✍️',
      title: 'Tanda Tangan Digital Operator',
      desc: 'Verifikasi persetujuan pengerjaan dan validasi perbaikan mesin dengan tanda tangan digital sah langsung di layar perangkat.'
    },
    {
      icon: '📧',
      title: 'Notifikasi Email Terintegrasi',
      desc: 'Pengiriman pemberitahuan otomatis secara instan ke supervisor, kepala regu, dan teknisi saat tiket diterbitkan atau selesai.'
    },
    {
      icon: '📊',
      title: 'Analitik & Rekap Efisiensi',
      desc: 'Dasbor visual statistik downtime mesin, mean time to repair (MTTR), dan produktivitas maintenance per lini pabrik.'
    }
  ];

  return (
    <div className="dte-page-wrapper">
      {/* Top Navbar */}
      <header className="dte-header">
        <div className="dte-header-container">
          <button 
            type="button" 
            className="dte-back-btn" 
            onClick={() => onNavigate?.('landing')}
            title="Kembali ke Beranda Deepernova"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Kembali ke Beranda</span>
          </button>

          <div className="dte-header-brand">
            <span className="dte-brand-badge">DEEPERNOVA DTE</span>
            <span className="dte-brand-title">Sistem Order DTE</span>
          </div>

          <div className="dte-header-actions">
            <a 
              href={ORDER_DTE_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="dte-portal-btn-top"
            >
              <span>Buka Portal DTE</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="dte-main-content">
        {/* Hero Section */}
        <section className="dte-hero">
          <div className="dte-hero-glow"></div>
          <div className="dte-hero-content">
            <div className="dte-pill-badge">
              <span className="dte-pill-dot"></span>
              <span>SISTEM OPERASIONAL & MAINTENANCE RESMI</span>
            </div>

            <h1 className="dte-hero-title">
              Sistem Order & Manajemen Maintenance DTE 🏭
            </h1>

            <p className="dte-hero-desc">
              Solusi digital terintegrasi untuk pengelolaan <strong>Work Order (WO)</strong>, pelacakan pemeliharaan unit mesin, rotasi kerja <strong>Shift Regu (Group A, B, C, D)</strong>, tanda tangan digital operator, dan sistem notifikasi instan untuk operasional industri modern.
            </p>

            <div className="dte-hero-actions">
              <a 
                href={ORDER_DTE_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="dte-btn-primary"
              >
                <span>🚀 Masuk ke Portal Order DTE</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </a>

              <button 
                type="button" 
                className="dte-btn-secondary"
                onClick={() => {
                  const el = document.getElementById('dte-features-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>📋 Pelajari Fitur Sistem</span>
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="dte-status-card">
              <div className="dte-status-item">
                <span className="dte-status-label">Status Server Portal</span>
                <span className="dte-status-value success">● Online & Aktif</span>
              </div>
              <div className="dte-status-divider"></div>
              <div className="dte-status-item">
                <span className="dte-status-label">Cakupan Regu</span>
                <span className="dte-status-value">Group A, B, C, D</span>
              </div>
              <div className="dte-status-divider"></div>
              <div className="dte-status-item">
                <span className="dte-status-label">Aksesibilitas</span>
                <span className="dte-status-value">Mobile, Tablet & Desktop</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="dte-features-section" className="dte-features-section">
          <div className="dte-section-header">
            <span className="dte-section-tag">FITUR UTAMA</span>
            <h2 className="dte-section-title">Dirancang Khusus untuk Ketepatan & Kecepatan Kerja</h2>
            <p className="dte-section-subtitle">
              Setiap komponen dibuat untuk memangkas birokrasi kertas dan mempercepat response time penanganan kerusakan mesin di lapangan.
            </p>
          </div>

          <div className="dte-features-grid">
            {keyFeatures.map((feat, idx) => (
              <div key={idx} className="dte-feature-card">
                <div className="dte-feature-icon">{feat.icon}</div>
                <h3 className="dte-feature-title">{feat.title}</h3>
                <p className="dte-feature-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Shift Management Section */}
        <section className="dte-shifts-section">
          <div className="dte-section-header">
            <span className="dte-section-tag">ROTASI REGU</span>
            <h2 className="dte-section-title">Struktur Jadwal Shift Operasional DTE</h2>
            <p className="dte-section-subtitle">
              Koordinasi 24 jam nonstop dengan transparansi tugas dan histori perbaikan yang tercatat rapi.
            </p>
          </div>

          <div className="dte-shifts-grid">
            {shiftGroups.map((shift, idx) => (
              <div key={idx} className="dte-shift-card">
                <div className="dte-shift-header">
                  <span className="dte-shift-icon">{shift.icon}</span>
                  <div className="dte-shift-badge" style={{ backgroundColor: `${shift.color}18`, color: shift.color, borderColor: `${shift.color}40` }}>
                    {shift.time}
                  </div>
                </div>
                <h3 className="dte-shift-name">{shift.name}</h3>
                <p className="dte-shift-desc">{shift.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Portal Launcher Banner */}
        <section className="dte-launcher-banner">
          <div className="dte-launcher-inner">
            <div className="dte-launcher-text">
              <h2>Siap Mengelola Work Order Hari Ini?</h2>
              <p>Buka sistem Order DTE untuk mulai mencatat WO baru, validasi checklist mesin, atau menandatangani dokumen serah terima teknisi.</p>
            </div>
            <div className="dte-launcher-action">
              <a 
                href={ORDER_DTE_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="dte-launcher-btn"
              >
                <span>Buka Portal Order DTE Sekarang ➔</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dte-footer">
        <div className="dte-footer-container">
          <div className="dte-footer-left">
            <span className="dte-footer-logo">🏭 Deepernova DTE System</span>
            <p className="dte-footer-sub">Industrial Maintenance & Shift Operations Ecosystem</p>
          </div>
          <div className="dte-footer-right">
            <button type="button" onClick={() => onNavigate?.('landing')} className="dte-footer-link">Beranda</button>
            <button type="button" onClick={() => onNavigate?.('chat')} className="dte-footer-link">AI Workspace</button>
            <button type="button" onClick={() => onNavigate?.('help')} className="dte-footer-link">Help Center</button>
            <a href={ORDER_DTE_URL} target="_blank" rel="noopener noreferrer" className="dte-footer-link highlight">Portal DTE</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DtePortal;
