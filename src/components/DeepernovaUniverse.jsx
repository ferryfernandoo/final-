import React, { useState } from 'react';
import './DeepernovaUniverse.css';

const DeepernovaUniverse = ({ onNavigate, isAuthenticated = false, isGuest = true, user = null, onLoginRequest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const openEditor = (type) => {
    if (typeof onNavigate === 'function') onNavigate('documents', type);
  };

  const handleOpenOffice = () => {
    if (isAuthenticated && !isGuest) {
      onNavigate?.('office');
    } else {
      setShowAuthModal(true);
    }
  };

  const apps = [
    {
      id: 'office',
      title: 'AI Management Office',
      tag: 'Cloud Storage & Vault (Wajib Login)',
      desc: 'Pusat komando penyimpanan cloud, arsip berkas AI terenkripsi, dan manajemen dokumen terpadu (Khusus Akun Terdaftar).',
      icon: 'https://img.icons8.com/fluency/96/cloud-storage.png',
      badgeColor: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.4)',
      action: () => handleOpenOffice()
    },
    {
      id: 'word',
      title: 'Typernova (Word)',
      tag: 'AI Document Studio',
      desc: 'Editor dokumen generasi baru berteknologi AI untuk penulisan esai, laporan, dan naskah profesional.',
      icon: 'https://img.icons8.com/color/96/microsoft-word-2019.png',
      badgeColor: '#00d2ff',
      glow: 'rgba(0, 210, 255, 0.4)',
      action: () => openEditor('word')
    },
    {
      id: 'excel',
      title: 'Sheets Analytic',
      tag: 'Smart Data & Grid',
      desc: 'Spreadsheet interaktif berkemampuan analisis otomatis, kalkulasi otomatis, dan pengelolaan tabel data.',
      icon: 'https://img.icons8.com/color/96/microsoft-excel-2019.png',
      badgeColor: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      action: () => openEditor('excel')
    },
    {
      id: 'ppt',
      title: 'Presentasi Deck',
      tag: 'AI Slide Architect',
      desc: 'Rancang slide presentasi visual berkelas dunia dengan berbagai pilihan template futuristik.',
      icon: 'https://img.icons8.com/color/96/microsoft-powerpoint-2019.png',
      badgeColor: '#f97316',
      glow: 'rgba(249, 115, 22, 0.4)',
      action: () => openEditor('ppt')
    },
    {
      id: 'calendar',
      title: 'AI Calendar & Alarm',
      tag: 'Native Android Sync',
      desc: 'Pusat komando jadwal, alarm HP bawaan, dan pengingat AI yang tersinkronisasi otomatis dengan Android Native.',
      icon: 'https://img.icons8.com/fluency/96/calendar.png',
      badgeColor: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.4)',
      action: () => onNavigate?.('calendar')
    },
    {
      id: 'codedance',
      title: 'CodeDance IDE',
      tag: 'VS Code Cloud Sandbox & AI Agent',
      desc: 'Editor kode masa depan ala VS Code dengan Cloud Sandbox Terminal, live web preview, dan Agentic AI yang mengeksekusi kode secara otonom.',
      icon: 'https://img.icons8.com/color/96/visual-studio-code-2019.png',
      badgeColor: '#007acc',
      glow: 'rgba(0, 122, 204, 0.5)',
      action: () => onNavigate?.('codedance')
    }
  ];

  const filteredApps = apps.filter(app =>
    app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="universe-futuristic-container">
      {/* Ambient background glows */}
      <div className="ambient-glow orb-1"></div>
      <div className="ambient-glow orb-2"></div>
      <div className="ambient-glow orb-3"></div>

      {/* Top Header Navigation */}
      <header className="universe-header-futuristic">
        <button className="futuristic-back-btn" onClick={() => onNavigate?.('chat')} title="Kembali ke Room Chat">
          <span className="back-arrow">‹</span>
          <span className="back-text">Chat AI</span>
        </button>

        <div className="brand-badge">
          <span className="badge-dot"></span>
          <span>DEEPERNOVA CREATIVE SUITE v2.5</span>
        </div>
      </header>

      {/* Hero Title Section */}
      <div className="universe-hero">
        <div className="hero-icon-wrapper">
          <img src="https://img.icons8.com/fluency/96/universe.png" alt="Universe Logo" className="hero-logo-img" />
        </div>
        <h1 className="hero-title">Deepernova <span className="gradient-text">Universe</span></h1>
        <p className="hero-subtitle">
          Ekosistem aplikasi produktivitas dan kreativitas masa depan, dirancang khusus gratis untuk seluruh pelajar & mahasiswa Indonesia.
        </p>

        {/* Quick Search Filter */}
        <div className="hero-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="hero-search-input"
            placeholder="Cari alat produktivitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
      </div>

      {/* Futuristic Apps Grid */}
      <div className="universe-apps-grid">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="futuristic-app-card"
            onClick={app.action}
            style={{ '--card-glow': app.glow }}
            role="button"
            tabIndex={0}
          >
            <div className="card-top-bar">
              <span className="app-tag-badge" style={{ backgroundColor: `${app.badgeColor}22`, color: app.badgeColor, borderColor: `${app.badgeColor}44` }}>
                {app.tag}
              </span>
              <span className="launch-icon">↗</span>
            </div>

            <div className="app-icon-container">
              <img src={app.icon} alt={app.title} className="app-icon-img" />
            </div>

            <div className="app-card-content">
              <h3>{app.title}</h3>
              <p>{app.desc}</p>
            </div>

            <div className="card-footer-action">
              <span className="action-link-text">Buka Aplikasi</span>
              <span className="action-arrow">→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats Bar */}
      <footer className="universe-futuristic-footer">
        <div className="stat-item">
          <span className="stat-number">4</span>
          <span className="stat-label">Aplikasi Utama</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-number">⚡ 100%</span>
          <span className="stat-label">Android Native Sync</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-number">🎁 Gratis</span>
          <span className="stat-label">Untuk Pelajar Indonesia</span>
        </div>
      </footer>

      {/* Auth Required Modal */}
      {showAuthModal && (
        <div className="auth-required-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="auth-required-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-badge">🔐</div>
            <h3>Fitur Memerlukan Akun Terdaftar</h3>
            <p>
              <strong>AI Management Office (Cloud Storage)</strong> membutuhkan akses akun resmi Deepernova AI untuk menyimpan berkas di Cloud Vault.
              Silakan Login terlebih dahulu untuk membuka fitur ini.
            </p>
            <div className="modal-actions">
              <button className="modal-login-btn" onClick={() => { setShowAuthModal(false); onLoginRequest?.(); }}>
                🔑 Login Sekarang
              </button>
              <button className="modal-cancel-btn" onClick={() => setShowAuthModal(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepernovaUniverse;
