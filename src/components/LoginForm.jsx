import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './AuthForms.css';

const LoginForm = ({ onLoginSuccess, onSwitchToRegister, onGuestLogin }) => {
  const [email, setEmail] = useState('tulis@deepmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'user-not-found', 'wrong-password', 'validation', 'network'
  const [showPassword, setShowPassword] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [_isCheckingServer, setIsCheckingServer] = useState(false);

  const lastServerCheckRef = useRef(0);

  // Ping server check when user interacts with inputs
  const handleInputFocus = async () => {
    // Rate limit server checks (once every 15 seconds)
    if (Date.now() - lastServerCheckRef.current < 15000) return;
    lastServerCheckRef.current = Date.now();
    setIsCheckingServer(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        signal: controller.signal,
        credentials: 'include'
      }).catch(() => null);

      clearTimeout(timeoutId);

      // If server is unreachable or throwing 5xx error
      if (!response || response.status >= 500) {
        setShowMaintenanceModal(true);
      }
    } catch (_err) {
      setShowMaintenanceModal(true);
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);

    if (!email.trim()) {
      setError('Email harus diisi');
      setErrorType('validation');
      return;
    }
    // Enforce @deepmail.com domain for all accounts
    if (!email.toLowerCase().endsWith('@deepmail.com')) {
      setError('Email harus menggunakan domain @deepmail.com (contoh: user@deepmail.com)');
      setErrorType('validation');
      return;
    }
    if (!password) {
      setError('Password harus diisi');
      setErrorType('validation');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          password 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types from backend
        if (data.message === 'Username tidak ditemukan') {
          setError(`❌ Username tidak ditemukan. Email "${email}" belum terdaftar.`);
          setErrorType('user-not-found');
        } else if (data.message === 'Password salah') {
          setError('🔐 Password salah. Silakan cek kembali password Anda.');
          setErrorType('wrong-password');
        } else {
          setError(`❌ ${data.error || data.message || 'Server sedang menjalani perawatan'}`);
          setErrorType('network');
          setShowMaintenanceModal(true);
        }
        throw new Error(data.error || data.message || 'Login gagal');
      }

      setEmail('');
      setPassword('');
      onLoginSuccess?.(data.user);
    } catch (err) {
      console.error('Login error:', err);
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        setShowMaintenanceModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // waktu lokal untuk ucapan selamat
  const now = new Date();
  const hour = now.getHours();
  let timeLabel = '';
  if (hour >= 4 && hour < 12) timeLabel = 'Pagi';
  else if (hour >= 12 && hour < 15) timeLabel = 'Siang';
  else if (hour >= 15 && hour < 18) timeLabel = 'Sore';
  else timeLabel = 'Malam';
  const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="auth-container">
      <div className="auth-box modern">
        <aside className="auth-side-left" aria-hidden="true">
          <div className="visual-brand">
            <h1 className="brand-title">🚀 Deepernova AI</h1>
            <p className="brand-subtitle">AI gratis untuk semua siswa Indonesia</p>
            <div className="brand-deco" />
          </div>
        </aside>

        <main className="auth-side-right">
          <div className="auth-card">
            <div className="mobile-brand-header">
              <h2>🚀 Deepernova AI</h2>
              <p>Platform AI Studio Agentic Otonom #1 Indonesia</p>
            </div>

            <p className="auth-welcome">Selamat datang</p>

            {error && <div className={`error-message ${errorType || ''}`}>{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  placeholder="you@deepmail.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleInputFocus}
                    onClick={handleInputFocus}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                className="auth-submit-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-divider">atau</div>

            <p className="guest-subtitle">Gunakan AI Lokal & Keamanan Kuat tanpa Login</p>

            <button 
              className="guest-btn" 
              onClick={() => setShowPrivacyModal(true)} 
              disabled={loading}
            >
              🔐 Gunakan AI Lokal Keamanan Kuat
            </button>

            <div className="auth-footer">
              <p>Belum punya akun?</p>
              <button
                className="switch-auth-btn"
                onClick={onSwitchToRegister}
                disabled={loading}
              >
                Daftar sekarang
              </button>
            </div>

            <div className="greeting-banner" aria-live="polite">
              <div className="greeting-time">{`${timeLabel} • ${timeString}`}</div>
              <div className="greeting-text">selamat datang di deepernova ai</div>
            </div>
          </div>
        </main>
      </div>

      {/* POPUP MODAL 1: Server Maintenance Notification */}
      {showMaintenanceModal && (
        <div className="auth-modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="auth-modal-icon">🛠️</span>
                <div>
                  <h3 className="auth-modal-title">Server Sedang Berada Dalam Perawatan</h3>
                  <p className="auth-modal-subtitle">Infrastruktur Poseidon Server Kebumen</p>
                </div>
              </div>
              <button 
                className="auth-modal-close-btn"
                onClick={() => setShowMaintenanceModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="maintenance-badge">
              ⚙️ Scheduled Maintenance & Network Optimization
            </div>

            <div className="auth-modal-body">
              <p>
                Maaf atas ketidaknyamanannya. Saat ini server autentikasi sedang menjalani pemeliharaan berkala untuk peningkatan kecepatan jaringan dan pembaruan sistem.
              </p>
              <p style={{ marginTop: '10px' }}>
                <strong>Jangan khawatir!</strong> Anda tetap dapat menggunakan <strong>Mode AI Lokal (Keamanan Kuat)</strong> secara 100% instan dan gratis tanpa terpengaruh proses perawatan server.
              </p>
            </div>

            <div className="auth-modal-actions">
              <button 
                className="modal-primary-btn"
                onClick={() => {
                  setShowMaintenanceModal(false);
                  onGuestLogin?.();
                }}
              >
                🔐 Masuk AI Lokal Instan (Keamanan Kuat)
              </button>
              <button 
                className="modal-secondary-btn"
                onClick={() => setShowMaintenanceModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: Privacy & Zero Data Collection Info */}
      {showPrivacyModal && (
        <div className="auth-modal-overlay" onClick={() => setShowPrivacyModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="auth-modal-icon">🛡️</span>
                <div>
                  <h3 className="auth-modal-title">Jaminan Keamanan & Privasi Data 100%</h3>
                  <p className="auth-modal-subtitle">Deepernova AI Pure Client-Side Protection</p>
                </div>
              </div>
              <button 
                className="auth-modal-close-btn"
                onClick={() => setShowPrivacyModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="privacy-badge">
              🔒 Zero Data Collection • 100% Client-Side Privacy
            </div>

            <div className="auth-modal-body">
              <p style={{ fontWeight: 600, color: '#3b2a1a' }}>
                Kami sangat menghormati privasi Anda. Berikut adalah komitmen penuh Deepernova AI:
              </p>

              <ul className="auth-modal-list">
                <li>
                  <span>🚫</span>
                  <div>
                    <strong>Kami Tidak Mengambil Data Anda:</strong> Semua percakapan obrolan, dokumen Word, spreadsheet, dan file Anda tidak disimpan di server luar.
                  </div>
                </li>
                <li>
                  <span>💾</span>
                  <div>
                    <strong>Penyimpanan Lokal Mandiri:</strong> Seluruh riwayat obrolan tersimpan 100% di memori browser perangkat Anda sendiri (*client-side storage*).
                  </div>
                </li>
                <li>
                  <span>🛡️</span>
                  <div>
                    <strong>Bebas Pelacakan & Iklan:</strong> Tidak ada *tracking cookies*, tidak ada penambangan data (*data mining*), dan data Anda tidak akan pernah dijual.
                  </div>
                </li>
                <li>
                  <span>⚡</span>
                  <div>
                    <strong>Akses Instan & Bebas:</strong> Manfaatkan penuh fitur AI Studio, pembuat dokumen Word otonom, dan generator grafik secara gratis tanpa wajib login.
                  </div>
                </li>
              </ul>
            </div>

            <div className="auth-modal-actions">
              <button 
                className="modal-primary-btn"
                onClick={() => {
                  setShowPrivacyModal(false);
                  onGuestLogin?.();
                }}
              >
                🚀 Lanjutkan Masuk AI Lokal (100% Aman)
              </button>
              <button 
                className="modal-secondary-btn"
                onClick={() => setShowPrivacyModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
