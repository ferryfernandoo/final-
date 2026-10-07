import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './AuthForms.css';

const RegisterForm = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Modern Gmail Interceptor Modal State
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [interceptedGmail, setInterceptedGmail] = useState('');
  const [suggestedUsername, setSuggestedUsername] = useState('');

  const lastServerCheckRef = useRef(0);

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

  const handleInputFocus = async () => {
    if (Date.now() - lastServerCheckRef.current < 30000) return;
    lastServerCheckRef.current = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        signal: controller.signal,
        credentials: 'include'
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.status >= 500) {
        setShowMaintenanceModal(true);
      }
    } catch (_err) {
      // Ignore network noise or timeout without showing modal
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'email' && (value.endsWith('@gmail.com') || value.endsWith('@googlemail.com'))) {
      checkGmailAndPrompt(value);
    }
  };

  const handleEmailBlur = () => {
    if (formData.email) {
      checkGmailAndPrompt(formData.email);
    }
  };

  const applySuggestedDeepernova = () => {
    setFormData(prev => ({
      ...prev,
      email: suggestedUsername
    }));
    setShowGmailModal(false);
    setError(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nama harus diisi');
      return false;
    }
    if (formData.name.trim().length < 2) {
      setError('Nama minimal 2 karakter');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Username / Email harus diisi');
      return false;
    }

    if (checkGmailAndPrompt(formData.email.trim())) {
      return false;
    }

    if (!formData.password) {
      setError('Password harus diisi');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    // Resolve final email: user doesn't need to type @deepernova.com
    let rawEmail = formData.email.trim().toLowerCase();
    let finalEmail = rawEmail;
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@deepernova.com`;
    } else if (finalEmail.endsWith('@deepmail.com')) {
      finalEmail = finalEmail.replace(/@deepmail\.com$/, '@deepernova.com');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: finalEmail,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isGmailError) {
          checkGmailAndPrompt(formData.email);
          return;
        }
        throw new Error(data.error || 'Registrasi gagal');
      }

      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      onRegisterSuccess?.(data.user);
    } catch (err) {
      console.error('Register error:', err);
      setError(err.message || 'Registrasi gagal. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

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

            <p className="auth-welcome">Buat Akun Baru</p>

            {error && <div className="error-message">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group name-field-group">
                <label htmlFor="reg-name" className="name-field-label">👋 Siapa nama kamu?</label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  placeholder="Contoh: Nando"
                  autoComplete="name"
                  disabled={loading}
                  className="name-field-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Username / Identitas Akun</label>
                <div className="input-with-domain">
                  <input
                    id="reg-email"
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    onFocus={handleInputFocus}
                    onClick={handleInputFocus}
                    placeholder="Contoh: nando"
                    autoComplete="username"
                    disabled={loading}
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                  <span className="auto-domain-badge">@deepernova.com</span>
                </div>
                <p className="domain-help-text">
                  ✨ Akun baru otomatis mendapatkan alamat <strong>@deepernova.com</strong> & kuota gratis 1.000.000 Token.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 karakter"
                    autoComplete="new-password"
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
                {formData.password && (
                  <div className="password-strength">
                    <div className={`strength-bar ${
                      formData.password.length < 6 ? 'weak' :
                      formData.password.length < 10 ? 'medium' :
                      'strong'
                    }`}></div>
                    <span className="strength-text">
                      {formData.password.length < 6 ? 'Lemah' :
                       formData.password.length < 10 ? 'Sedang' :
                       'Kuat'}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirmPassword">Konfirmasi Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="reg-confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirm(!showConfirm)}
                    disabled={loading}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <span className={`password-match ${
                    formData.password === formData.confirmPassword ? 'match' : 'no-match'
                  }`}>
                    {formData.password === formData.confirmPassword 
                      ? '✓ Password cocok' 
                      : '✗ Password tidak cocok'}
                  </span>
                )}
              </div>

              <button 
                className="auth-submit-btn" 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Sudah punya akun?</p>
              <button 
                className="switch-auth-btn" 
                onClick={onSwitchToLogin}
                disabled={loading}
              >
                Login sekarang
              </button>
            </div>

            <div className="auth-terms">
              <p>Dengan mendaftar, Anda menyetujui</p>
              <p>Syarat & Ketentuan Layanan DeeperNova AI</p>
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
              Platform DeeperNova AI menggunakan sistem identitas mandiri <strong>@deepernova.com</strong> demi privasi dan keamanan independen.
            </p>

            <div className="gmail-migration-box">
              <span className="gmail-old">{interceptedGmail || 'email@gmail.com'}</span>
              <span className="gmail-arrow">➔</span>
              <span className="gmail-new">{suggestedUsername}@deepernova.com</span>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '18px' }}>
              Kami arahkan akun baru Anda secara otomatis ke <strong>{suggestedUsername}@deepernova.com</strong>.
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

      {showMaintenanceModal && (
        <div className="auth-modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="auth-modal-icon">🛠️</span>
                <div>
                  <h3 className="auth-modal-title">Pembaruan Jaringan</h3>
                  <p className="auth-modal-subtitle">Infrastruktur Server DeeperNova</p>
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
              ⚙️ Network & Authentication Optimization
            </div>

            <div className="auth-modal-body">
              <p>
                Server autentikasi sedang menjalani optimalisasi berkala untuk meningkatkan kecepatan respons.
              </p>
            </div>

            <div className="auth-modal-actions">
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
    </div>
  );
};

export default RegisterForm;
