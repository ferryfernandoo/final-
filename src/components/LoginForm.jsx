import React, { useState } from 'react';
import { API_BASE_URL } from '../apiConfig';
import { safeSetItem } from '../utils/safeStorage.js';
import './AuthForms.css';

const LoginForm = ({ onLoginSuccess, onSwitchToRegister, onGuestLogin }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'user-not-found', 'wrong-password', 'validation', 'network'
  const [showPassword, setShowPassword] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Modern Gmail Interceptor Modal State
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [interceptedGmail, setInterceptedGmail] = useState('');
  const [suggestedUsername, setSuggestedUsername] = useState('');

  const checkGmailAndPrompt = (val) => {
    const raw = (val || '').trim().toLowerCase();
    if (raw.endsWith('@gmail.com') || raw.endsWith('@googlemail.com') || raw.includes('@gmail') || raw.includes('@googlemail')) {
      const extracted = raw.split('@')[0].trim() || 'user';
      setInterceptedGmail(val);
      setSuggestedUsername(extracted);
      setShowGmailModal(true);
      return true;
    }
    return false;
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsernameInput(val);
    if (val.endsWith('@gmail.com') || val.endsWith('@googlemail.com')) {
      checkGmailAndPrompt(val);
    }
  };

  const handleInputBlur = () => {
    if (usernameInput) {
      checkGmailAndPrompt(usernameInput);
    }
  };

  const applySuggestedDeepernova = () => {
    setUsernameInput(suggestedUsername);
    setShowGmailModal(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);

    const trimmedInput = usernameInput.trim();
    if (!trimmedInput) {
      setError('Username / Email DeeperNova harus diisi');
      setErrorType('validation');
      return;
    }

    if (checkGmailAndPrompt(trimmedInput)) {
      return;
    }

    if (!password) {
      setError('Password harus diisi');
      setErrorType('validation');
      return;
    }

    // Resolve final email: user doesn't need to type @deepernova.com
    let finalEmail = trimmedInput.toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@deepernova.com`;
    } else if (finalEmail.endsWith('@deepmail.com')) {
      finalEmail = finalEmail.replace(/@deepmail\.com$/, '@deepernova.com');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: finalEmail, 
          password 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types from backend
        if (data.code === 'GMAIL_NOT_ALLOWED' || data.isGmailError) {
          checkGmailAndPrompt(usernameInput);
          return;
        }

        if (data.message && data.message.includes('belum terdaftar')) {
          setError(`❌ Akun "${finalEmail}" belum terdaftar. Silakan gunakan menu Daftar.`);
          setErrorType('user-not-found');
        } else if (data.message === 'Username tidak ditemukan') {
          setError(`❌ Username/Email "${finalEmail}" belum terdaftar.`);
          setErrorType('user-not-found');
        } else if (data.message === 'Password salah') {
          setError('🔐 Password salah. Silakan cek kembali password Anda.');
          setErrorType('wrong-password');
        } else {
          setError(`❌ ${data.error || data.message || 'Server sedang menjalani perawatan'}`);
          setErrorType('network');
        }
        throw new Error(data.error || data.message || 'Login gagal');
      }

      setUsernameInput('');
      setPassword('');
      onLoginSuccess?.(data.user);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    try {
      setError(null);
      setErrorType(null);
      setGuestLoading(true);
      const guestUser = {
        name: 'Guest',
        email: 'guest@deepernova.com',
        guest: true
      };
      safeSetItem('guestSession', JSON.stringify(guestUser));
      onGuestLogin?.(guestUser);
    } catch (err) {
      console.error('Guest login error:', err);
      setError(err.message || 'Guest login failed');
      setErrorType('network');
    } finally {
      setGuestLoading(false);
    }
  };

  // Waktu lokal untuk ucapan selamat
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
            <p className="brand-subtitle">Platform AI mandiri & berkecepatan tinggi Indonesia</p>
            <div className="brand-deco" />
          </div>
        </aside>

        <main className="auth-side-right">
          <div className="auth-card">
            <div className="mobile-brand-header">
              <h2>🚀 Deepernova AI</h2>
              <p>Platform AI Cloud Mandiri, Cepat & Aman</p>
            </div>

            <p className="auth-welcome">Selamat datang kembali</p>

            {error && <div className={`error-message ${errorType || ''}`}>{error}</div>}

            <div className="guest-quick-card">
              <div className="guest-quick-badge">⚡ Masuk Instan</div>
              <h3>Mulai pakai AI tanpa login</h3>
              <p>Coba langsung percakapan dan studio tanpa perlu mendaftar akun.</p>
              <button
                className="guest-btn primary"
                type="button"
                onClick={handleGuestAccess}
                disabled={loading || guestLoading}
              >
                {guestLoading ? 'Membuka AI Cloud...' : '🚀 Mulai Mode Tamu Instan'}
              </button>
              <div className="guest-privacy-inline">🔒 Sesi instan aman & berkecepatan tinggi</div>
            </div>

            <div className="auth-divider">atau masuk dengan akun DeeperNova</div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="login-email">Username / Akun</label>
                <div className="input-with-domain">
                  <input
                    id="login-email"
                    name="username"
                    type="text"
                    value={usernameInput}
                    onChange={handleUsernameChange}
                    onBlur={handleInputBlur}
                    placeholder="Contoh: nando"
                    autoComplete="username"
                    disabled={loading}
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                  <span className="auto-domain-badge">@deepernova.com</span>
                </div>
                <p className="domain-help-text">
                  ✨ Domain <strong>@deepernova.com</strong> terpasang otomatis. Cukup masukkan username Anda.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label="Toggle password visibility"
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
                {loading ? 'Masuk...' : 'Masuk ke Akun'}
              </button>
            </form>

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

      {/* Modern Pop-up Interceptor Modal for @gmail.com */}
      {showGmailModal && (
        <div className="gmail-modal-overlay" onClick={() => setShowGmailModal(false)}>
          <div className="gmail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gmail-icon-glow">🚫</div>
            <h3>Google Mail (@gmail.com) Tidak Didukung</h3>
            <p>
              Ekosistem DeeperNova AI menggunakan sistem identitas terpadu <strong>@deepernova.com</strong> demi privasi independen dan keamanan penuh.
            </p>

            <div className="gmail-migration-box">
              <span className="gmail-old">{interceptedGmail || 'email@gmail.com'}</span>
              <span className="gmail-arrow">➔</span>
              <span className="gmail-new">{suggestedUsername}@deepernova.com</span>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '18px' }}>
              Kami arahkan akun Anda secara otomatis ke <strong>{suggestedUsername}@deepernova.com</strong>.
            </p>

            <div className="gmail-modal-actions">
              <button
                type="button"
                className="gmail-btn-confirm"
                onClick={applySuggestedDeepernova}
              >
                ✨ Gunakan @deepernova.com (Otomatis)
              </button>
              <button
                type="button"
                className="gmail-btn-dismiss"
                onClick={() => setShowGmailModal(false)}
              >
                Tutup & Ubah Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
