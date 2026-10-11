import React, { useState, useEffect } from 'react';
import { API_BASE_URL, PUBLIC_API_BASE_URL } from '../apiConfig';
import './ApiMarketplace.css';

const ApiMarketplace = ({ onLogout, onNavigate, user, isAuthenticated, onLoginRequest }) => {
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'docs', 'dashboard', 'usage'
  const [apiKeys, setApiKeys] = useState([]);
  const [tokenQuota, setTokenQuota] = useState(1000000);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [remainingTokens, setRemainingTokens] = useState(1000000);
  const [loading, setLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showFullKeyModal, setShowFullKeyModal] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  
  // Documentation Tab State
  const [docsSection, setDocsSection] = useState('ai'); // 'ai' or 'search'
  const [activeTab, setActiveTab] = useState('getting-started');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [searchCodeLanguage, setSearchCodeLanguage] = useState('javascript');
  const [searchAuthMode, setSearchAuthMode] = useState('no-key'); // 'no-key' (Bebas Tanpa API Key) or 'with-key' (Dengan API Key)
  
  const [navOpen, setNavOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedKeyFull, setSelectedKeyFull] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Interactive Live Hit Tester State
  const [testKeyId, setTestKeyId] = useState('');
  const [testModel, setTestModel] = useState('deepernova-gold-1.5');
  const [testPrompt, setTestPrompt] = useState('Halo DeeperNova Gold 1.5! Berikan 3 tips belajar coding yang efektif.');
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Usage Reports & Analytics State
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageHistory, setUsageHistory] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [usageStatsOverview, setUsageStatsOverview] = useState({
    totalRequests: 0,
    totalTokens: 0,
    avgLatency: 0
  });

  const apiBaseUrl = API_BASE_URL;
  const publicApiBaseUrl = (PUBLIC_API_BASE_URL || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://conversion-unified-rat-fellowship.trycloudflare.com')).replace(/\/+$/, '');

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    if (currentPage === 'usage') {
      fetchUsageAnalytics();
    }
  }, [currentPage, apiKeys]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/apikeys`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys || []);
        if (data.tokenQuota !== undefined) setTokenQuota(data.tokenQuota);
        if (data.tokensUsed !== undefined) setTokensUsed(data.tokensUsed);
        if (data.remainingTokens !== undefined) setRemainingTokens(data.remainingTokens);
        
        if (data.keys && data.keys.length > 0 && !testKeyId) {
          const activeKey = data.keys.find(k => k.isActive) || data.keys[0];
          setTestKeyId(activeKey.id);
        }
      }
    } catch (error) {
      console.warn('API keys fetch:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageAnalytics = async () => {
    try {
      setUsageLoading(true);
      // Determine active key for auth header if needed
      let activeKeyStr = '';
      if (apiKeys.length > 0) {
        const fullKeyRes = await fetch(`${apiBaseUrl}/api/apikeys/${apiKeys[0].id}/full`, {
          credentials: 'include'
        }).catch(() => null);
        if (fullKeyRes && fullKeyRes.ok) {
          const kData = await fullKeyRes.json();
          if (kData.fullKey) activeKeyStr = kData.fullKey;
        }
      }

      const headers = { 'Content-Type': 'application/json' };
      if (activeKeyStr) {
        headers['Authorization'] = `Bearer ${activeKeyStr}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/usage`, {
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsageHistory(data.history || []);
          setRecentLogs(data.recent_logs || []);
          if (data.token_quota !== undefined) setTokenQuota(data.token_quota);
          if (data.tokens_used !== undefined) setTokensUsed(data.tokens_used);
          if (data.remaining_tokens !== undefined) setRemainingTokens(data.remaining_tokens);

          const totReq = (data.history || []).reduce((acc, h) => acc + (h.requestCount || 0), 0);
          const avgLat = (data.history || []).length > 0
            ? Math.round((data.history || []).reduce((acc, h) => acc + (h.avgLatency || 0), 0) / (data.history.length || 1))
            : 0;

          setUsageStatsOverview({
            totalRequests: totReq || (data.tokens_used > 0 ? 1 : 0),
            totalTokens: data.tokens_used || 0,
            avgLatency: avgLat || 120
          });
        }
      }
    } catch (err) {
      console.warn('Usage analytics fetch error:', err.message);
    } finally {
      setUsageLoading(false);
    }
  };

  const createNewApiKey = async () => {
    if (!newKeyName.trim()) {
      setErrorMsg('Masukkan nama untuk API Key');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/apikeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setCreatedKey(data.key);
        setShowApiKeyModal(true);
        setShowCreateKeyModal(false);
        setNewKeyName('');
        setErrorMsg('');
        await fetchApiKeys();
      } else {
        setErrorMsg(data.error || 'Gagal membuat API Key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      setErrorMsg('Gagal membuat API key');
    } finally {
      setLoading(false);
    }
  };

  const viewFullKey = async (keyId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/apikeys/${keyId}/full`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setSelectedKeyFull(data.fullKey);
        setShowFullKeyModal(true);
      }
    } catch (error) {
      setErrorMsg('Gagal memuat API key lengkap');
    }
  };

  const copyKeyDirectly = async (keyId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/apikeys/${keyId}/full`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        navigator.clipboard.writeText(data.fullKey);
        setCopiedText(`key-${keyId}`);
        setSuccessMsg('API Key berhasil disalin!');
        setTimeout(() => {
          setCopiedText('');
          setSuccessMsg('');
        }, 3000);
      }
    } catch (err) {
      setErrorMsg('Gagal menyalin key');
    }
  };

  const updateApiKey = async (keyId, updates) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/apikeys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        await fetchApiKeys();
      }
    } catch (error) {
      setErrorMsg('Gagal mengubah status key');
    }
  };

  const deleteApiKey = async (keyId) => {
    if (!window.confirm('Hapus API key ini? Aplikasi yang menggunakannya tidak dapat mengakses API lagi.')) {
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/apikeys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        await fetchApiKeys();
      }
    } catch (error) {
      setErrorMsg('Gagal menghapus API key');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(''), 2500);
  };

  const handleLiveHitTest = async () => {
    if (!testKeyId) {
      setErrorMsg('Pilih API Key terlebih dahulu untuk pengujian.');
      return;
    }

    setTestingApi(true);
    setTestResult(null);
    setErrorMsg('');

    try {
      const keyRes = await fetch(`${apiBaseUrl}/api/apikeys/${testKeyId}/full`, {
        credentials: 'include'
      });
      const keyData = await keyRes.json();
      if (!keyData.success || !keyData.fullKey) {
        throw new Error('Gagal mengambil secret key untuk pengetesan.');
      }

      const activeSecretKey = keyData.fullKey;

      const hitRes = await fetch(`${apiBaseUrl}/api/v1/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeSecretKey}`
        },
        body: JSON.stringify({
          prompt: testPrompt.trim(),
          model: testModel
        })
      });

      const hitData = await hitRes.json();

      if (hitRes.ok && hitData.success) {
        setTestResult({
          success: true,
          status: hitData.status || 200,
          latencyMs: hitData.latency_ms || 0,
          model: hitData.model || testModel,
          reply: hitData.reply || '',
          tokensConsumed: hitData.tokens_consumed || 0,
          promptTokens: Math.ceil(testPrompt.length / 4),
          completionTokens: Math.ceil((hitData.reply || '').length / 4),
          remainingTokens: hitData.remaining_tokens ?? remainingTokens,
          tokenQuota: hitData.token_quota ?? tokenQuota
        });

        if (hitData.remaining_tokens !== undefined) {
          setRemainingTokens(hitData.remaining_tokens);
        }
        await fetchApiKeys();
      } else {
        setTestResult({
          success: false,
          status: hitRes.status,
          error: hitData.error || hitData.message || 'Hit test gagal dieksekusi.'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        status: 500,
        error: err.message || 'Koneksi ke backend API gagal.'
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Helper chart computation for 7-day trend
  const chartDays = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const found = usageHistory.find(h => h.date === iso);
      days.push({
        date: iso,
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        tokens: found ? (found.totalTokens || 0) : 0,
        requests: found ? (found.requestCount || 0) : 0
      });
    }
    return days;
  })();

  const maxTokensInChart = Math.max(100, ...chartDays.map(d => d.tokens));
  const maxRequestsInChart = Math.max(5, ...chartDays.map(d => d.requests));

  return (
    <div className="api-marketplace">
      {/* Sticky Top Navbar */}
      <nav className="api-nav">
        <div className="nav-container">
          <div className="logo" onClick={() => { setCurrentPage('landing'); setNavOpen(false); }} style={{ cursor: 'pointer' }}>
            <h1>⚡ DeeperNova API</h1>
            <span className="tagline">Enterprise AI Gateway & Sub-20ms Search</span>
          </div>

          <div className="nav-right-cluster">
            <div className="api-nav-actions">
              <button 
                className="btn-back-home desktop-only-btn" 
                onClick={() => onNavigate?.('landing')}
                title="Kembali ke Beranda Utama"
              >
                ← Beranda
              </button>
              {apiKeys.length > 0 ? (
                <button className="btn-get-started" onClick={() => { setShowCreateKeyModal(true); setNavOpen(false); }}>
                  <span className="btn-text-full">+ Buat API Key</span>
                  <span className="btn-text-mobile">+ Key</span>
                </button>
              ) : isAuthenticated ? (
                <button className="btn-get-started" onClick={() => { setShowCreateKeyModal(true); setNavOpen(false); }}>
                  <span className="btn-text-full">Dapatkan Kunci API</span>
                  <span className="btn-text-mobile">Kunci API</span>
                </button>
              ) : (
                <button className="btn-get-started" onClick={() => { onLoginRequest ? onLoginRequest() : onNavigate?.('landing'); setNavOpen(false); }}>
                  <span className="btn-text-full">Login / Daftar</span>
                  <span className="btn-text-mobile">Login</span>
                </button>
              )}
            </div>

            <button 
              className="nav-toggle" 
              onClick={() => setNavOpen(prev => !prev)} 
              aria-label="Toggle navigation menu"
            >
              {navOpen ? '✕' : '☰'}
            </button>
          </div>

          <div className={`api-nav-menu ${navOpen ? 'open' : 'collapsed'}`}>
            <button 
              className={`api-nav-btn ${currentPage === 'landing' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('landing'); setNavOpen(false); }}
            >
              🏠 Beranda Portal API
            </button>
            <button 
              className={`api-nav-btn ${currentPage === 'docs' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('docs'); setNavOpen(false); }}
            >
              📖 Dokumentasi API
            </button>
            <button 
              className={`api-nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('dashboard'); setNavOpen(false); }}
            >
              🔑 Dashboard & Keys
            </button>
            <button 
              className={`api-nav-btn ${currentPage === 'usage' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('usage'); setNavOpen(false); }}
            >
              📊 Laporan Usage & Grafik
            </button>

            {/* Mobile Menu Bottom Navigation */}
            <div className="mobile-menu-divider"></div>
            <button 
              className="api-nav-btn mobile-back-home-btn" 
              onClick={() => { onNavigate?.('landing'); setNavOpen(false); }}
            >
              ⬅️ Kembali ke Beranda Utama
            </button>
            {user && (
              <div className="mobile-user-status">
                <span>Login sebagai: <strong>{user.username || user.email || 'Developer'}</strong></span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Free 1 Million Token Welcome Ribbon */}
      <div className="token-welcome-ribbon">
        <div className="token-welcome-left">
          <span className="token-gift-icon">🎁</span>
          <span>
            <strong>Free Developer Quota:</strong> 1.000.000 Token Input & Output Gratis (Semua Akun Aktif)
          </span>
          <span className="token-free-badge">100% FREE ACTIVE</span>
        </div>
        <div className="token-welcome-right">
          <span>Sisa Saldo: <strong>{remainingTokens.toLocaleString()}</strong> Token</span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && <div className="alert-toast success">✓ {successMsg}</div>}
      {errorMsg && <div className="alert-toast error">⚠️ {errorMsg}</div>}

      <div className="api-container">
        {/* ============================================================ */}
        {/* PAGE 1: LANDING & OVERVIEW */}
        {/* ============================================================ */}
        {currentPage === 'landing' && (
          <div className="api-landing-page">
            <header className="hero-section">
              <div className="hero-badge">⚡ DUA API POWERFUL DALAM SATU PLATFORM</div>
              <h1 className="hero-title">
                AI Gateway Generasi Baru & <br />
                <span className="gradient-text">Mesin Pencari Berkecepatan Tinggi</span>
              </h1>
              <p className="hero-subtitle">
                Hubungkan aplikasi web, mobile, bot, dan backend Anda ke model AI <strong>DeeperNova Gold 1.5</strong> via direct Cloudflare REST API serta <strong>DeeperNova Search Engine API</strong> sub-20ms. Gratis 1.000.000 Token.
              </p>

              <div className="hero-cta-group">
                <button className="btn-primary-large" onClick={() => setCurrentPage('dashboard')}>
                  🚀 Buka Dashboard & Buat Kunci
                </button>
                <button className="btn-secondary-large" onClick={() => setCurrentPage('docs')}>
                  📖 Lihat Dokumentasi Lengkap
                </button>
                <button className="btn-secondary-large" onClick={() => setCurrentPage('usage')}>
                  📊 Lihat Laporan Usage
                </button>
              </div>

              {/* Two Platform Pillars Card */}
              <div className="platform-pillars-grid">
                <div className="pillar-card ai-pillar">
                  <div className="pillar-icon">🌟</div>
                  <h3>DeeperNova Gold 1.5 AI API</h3>
                  <p>Inference cloud ultra-cepat dengan arsitektur multimodal vision dan penalaran mendalam.</p>
                  <ul className="pillar-list">
                    <li>✓ Direct Cloudflare REST API (Tembak langsung tanpa library OpenAI)</li>
                    <li>✓ Jendela Konteks Luas 128.000 Token</li>
                    <li>✓ Dukungan Streaming Real-Time (SSE)</li>
                    <li>✓ Model: Gold 1.5 & Gold 1.5 Pro (70B)</li>
                  </ul>
                  <button className="btn-pillar" onClick={() => { setDocsSection('ai'); setCurrentPage('docs'); }}>
                    Dokumentasi AI API ➔
                  </button>
                </div>

                <div className="pillar-card search-pillar">
                  <div className="pillar-icon">🔍</div>
                  <h3>DeeperNova Search Engine API</h3>
                  <p>Mesin pencari mandiri berkecepatan tinggi dengan latensi sub-20ms dan indeks web real-time.</p>
                  <ul className="pillar-list">
                    <li>✓ Endpoint: <code>/api/v1/search</code>, <code>/images</code>, <code>/news</code></li>
                    <li>✓ Latensi pencarian rata-rata 12ms - 18ms</li>
                    <li>✓ Anti-typo cerdas & pembobotan BM25 presisi</li>
                    <li>✓ Web grounding siap diintegrasikan ke RAG / Agent</li>
                  </ul>
                  <button className="btn-pillar" onClick={() => { setDocsSection('search'); setCurrentPage('docs'); }}>
                    Dokumentasi Search Engine API ➔
                  </button>
                </div>
              </div>
            </header>

            {/* Live Interactive Code Preview */}
            <section className="preview-section">
              <div className="preview-header">
                <h3>Integrasi Instan dalam 3 Baris Kode</h3>
                <p>Langsung tembak endpoint Cloudflare DeeperNova menggunakan <code>fetch()</code> atau HTTP client pilihan Anda.</p>
              </div>

              <div className="code-box-wrapper">
                <div className="code-box-header">
                  <div className="window-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="code-box-title">Direct Cloudflare REST API (JavaScript / Fetch)</span>
                  <button 
                    className="copy-btn-snippet" 
                    onClick={() => copyToClipboard(`const response = await fetch("${publicApiBaseUrl}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY"
  },
  body: JSON.stringify({
    model: "deepernova-gold-1.5",
    messages: [{ role: "user", content: "Halo DeeperNova Gold 1.5!" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`, 'quick-snippet')}
                  >
                    {copiedText === 'quick-snippet' ? '✓ Tersalin' : 'Salin Kode'}
                  </button>
                </div>
                <pre className="code-snippet-pre">
                  <code>{`const response = await fetch("${publicApiBaseUrl}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY"
  },
  body: JSON.stringify({
    model: "deepernova-gold-1.5",
    messages: [{ role: "user", content: "Halo DeeperNova Gold 1.5!" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}</code>
                </pre>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================ */}
        {/* PAGE 2: USAGE REPORTS & ANALYTICS WITH GRAPHIC / CHART */}
        {/* ============================================================ */}
        {currentPage === 'usage' && (
          <div className="usage-page">
            <div className="page-header-row">
              <div>
                <h2>📊 Laporan Penggunaan & Grafik Usage</h2>
                <p>Pantau konsumsi token, volume request harian, dan metrik latensi API Anda secara transparan.</p>
              </div>
              <button className="btn-secondary" onClick={fetchUsageAnalytics} disabled={usageLoading}>
                {usageLoading ? 'Memperbarui...' : '🔄 Refresh Data Usage'}
              </button>
            </div>

            {/* Metrics Overview Cards */}
            <div className="metrics-cards-grid">
              <div className="metric-box">
                <div className="metric-icon">🔥</div>
                <div className="metric-info">
                  <span className="metric-label">Total Token Terpakai</span>
                  <span className="metric-val">{(tokensUsed || usageStatsOverview.totalTokens).toLocaleString()}</span>
                  <span className="metric-sub">Token diproses</span>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-icon">🎁</div>
                <div className="metric-info">
                  <span className="metric-label">Sisa Kuota Gratis</span>
                  <span className="metric-val">{remainingTokens.toLocaleString()}</span>
                  <span className="metric-sub">dari 1.000.000 token</span>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-icon">🚀</div>
                <div className="metric-info">
                  <span className="metric-label">Total Request</span>
                  <span className="metric-val">{usageStatsOverview.totalRequests}</span>
                  <span className="metric-sub">Panggilan API</span>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-icon">⚡</div>
                <div className="metric-info">
                  <span className="metric-label">Rata-Rata Latensi</span>
                  <span className="metric-val">{usageStatsOverview.avgLatency || 120} ms</span>
                  <span className="metric-sub">Super responsif</span>
                </div>
              </div>
            </div>

            {/* Visual Usage Chart (7-Day Token Trend) */}
            <div className="chart-card-wrapper">
              <div className="chart-header">
                <div>
                  <h3>📈 Grafik Tren Penggunaan Token Harian (7 Hari Terakhir)</h3>
                  <p className="chart-subtitle">Akumulasi input dan output token per hari yang tercatat di server.</p>
                </div>
                <span className="chart-badge">Live Server Database Sync</span>
              </div>

              <div className="chart-canvas-container">
                <div className="chart-bars-row">
                  {chartDays.map((item, idx) => {
                    const heightPercent = maxTokensInChart > 0 
                      ? Math.max(8, Math.round((item.tokens / maxTokensInChart) * 100))
                      : 8;

                    return (
                      <div key={idx} className="chart-bar-col">
                        <div className="chart-bar-tooltip">
                          <strong>{item.date}</strong><br />
                          {item.tokens.toLocaleString()} Token<br />
                          {item.requests} Request
                        </div>
                        <div className="chart-bar-track">
                          <div 
                            className="chart-bar-fill" 
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                        </div>
                        <span className="chart-bar-label">{item.label}</span>
                        <span className="chart-bar-val">{item.tokens > 0 ? `${item.tokens}t` : '0'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Request Count Trend Chart */}
            <div className="chart-card-wrapper" style={{ marginTop: '20px' }}>
              <div className="chart-header">
                <div>
                  <h3>📊 Grafik Volume Panggilan Request Harian</h3>
                  <p className="chart-subtitle">Frekuensi pemanggilan endpoint API DeeperNova per hari.</p>
                </div>
              </div>

              <div className="chart-canvas-container">
                <div className="chart-bars-row">
                  {chartDays.map((item, idx) => {
                    const heightPercent = maxRequestsInChart > 0 
                      ? Math.max(8, Math.round((item.requests / maxRequestsInChart) * 100))
                      : 8;

                    return (
                      <div key={idx} className="chart-bar-col">
                        <div className="chart-bar-tooltip">
                          <strong>{item.date}</strong><br />
                          {item.requests} Request Berhasil
                        </div>
                        <div className="chart-bar-track">
                          <div 
                            className="chart-bar-fill requests-fill" 
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                        </div>
                        <span className="chart-bar-label">{item.label}</span>
                        <span className="chart-bar-val">{item.requests} req</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Request Logs Table */}
            <div className="logs-table-card" style={{ marginTop: '24px' }}>
              <div className="chart-header">
                <div>
                  <h3>📋 Riwayat Pemanggilan API Terkini (Server Database Logs)</h3>
                  <p className="chart-subtitle">Catatan historis setiap panggilan API yang tercatat di database server.</p>
                </div>
              </div>

              {recentLogs.length === 0 ? (
                <div className="empty-logs-box">
                  <p>Belum ada rekaman pemanggilan API untuk akun ini.</p>
                  <button className="btn-primary" onClick={() => setCurrentPage('dashboard')}>
                    Coba Hit API Sekarang di Dashboard
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Waktu (WIB)</th>
                        <th>Endpoint</th>
                        <th>Model</th>
                        <th>Token In/Out</th>
                        <th>Total Token</th>
                        <th>Status</th>
                        <th>Latensi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td><code>{log.endpoint}</code></td>
                          <td><span className="model-chip">{log.model}</span></td>
                          <td>{log.promptTokens || 0} / {log.completionTokens || 0}</td>
                          <td><strong>{(log.totalTokens || 0).toLocaleString()}</strong></td>
                          <td>
                            <span className={`status-pill ${log.statusCode < 400 ? 'ok' : 'err'}`}>
                              HTTP {log.statusCode}
                            </span>
                          </td>
                          <td>{log.latencyMs} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PAGE 3: DOCUMENTATION (AI API & SEARCH ENGINE API) */}
        {/* ============================================================ */}
        {currentPage === 'docs' && (
          <div className="docs-page">
            <div className="docs-header">
              <h2>Dokumentasi Lengkap DeeperNova API</h2>
              <p>Pilih platform API yang ingin Anda integrasikan dengan panduan langkah demi langkah.</p>

              {/* Sub-Tabs: AI vs Search Engine */}
              <div className="docs-platform-selector">
                <button 
                  className={`docs-platform-btn ${docsSection === 'ai' ? 'active' : ''}`}
                  onClick={() => setDocsSection('ai')}
                >
                  🌟 DeeperNova Gold 1.5 AI API
                </button>
                <button 
                  className={`docs-platform-btn ${docsSection === 'search' ? 'active' : ''}`}
                  onClick={() => setDocsSection('search')}
                >
                  🔍 DeeperNova Search Engine API
                </button>
              </div>
            </div>

            {/* --- AI API DOCUMENTATION --- */}
            {docsSection === 'ai' && (
              <div className="docs-content-wrapper">
                <div className="docs-subnav">
                  <button className={`docs-subnav-btn ${activeTab === 'getting-started' ? 'active' : ''}`} onClick={() => setActiveTab('getting-started')}>Quickstart</button>
                  <button className={`docs-subnav-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat Completions</button>
                  <button className={`docs-subnav-btn ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>Model AI</button>
                  <button className={`docs-subnav-btn ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>Cek Kuota & Saldo</button>
                </div>

                <div className="docs-body">
                  {activeTab === 'getting-started' && (
                    <section className="docs-section">
                      <h3>1. Memulai Integrasi DeeperNova Gold 1.5</h3>
                      <p>
                        DeeperNova Gold 1.5 menggunakan arsitektur <strong>Direct Cloudflare REST API</strong>. Anda dapat langsung menembak endpoint resmi dari backend, aplikasi web, bot, atau script tanpa perlu menginstal library OpenAI pihak ketiga.
                      </p>

                      <div className="base-url-card">
                        <span className="base-url-label">Endpoint Base URL Resmi (Cloudflare):</span>
                        <code className="base-url-val">{publicApiBaseUrl}/v1</code>
                        <button className="btn-copy-small" onClick={() => copyToClipboard(`${publicApiBaseUrl}/v1`, 'base-url-ai')}>
                          {copiedText === 'base-url-ai' ? '✓ Tersalin' : 'Copy'}
                        </button>
                      </div>

                      <div className="lang-selector-row">
                        <button className={`lang-btn ${codeLanguage === 'javascript' ? 'active' : ''}`} onClick={() => setCodeLanguage('javascript')}>JavaScript (Fetch)</button>
                        <button className={`lang-btn ${codeLanguage === 'python' ? 'active' : ''}`} onClick={() => setCodeLanguage('python')}>Python (Requests)</button>
                        <button className={`lang-btn ${codeLanguage === 'curl' ? 'active' : ''}`} onClick={() => setCodeLanguage('curl')}>cURL</button>
                      </div>

                      <div className="code-display-box">
                        {codeLanguage === 'javascript' && (
                          <pre><code>{`// Panggil langsung via Fetch API (Native Node.js / Browser)
const response = await fetch("${publicApiBaseUrl}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY"
  },
  body: JSON.stringify({
    model: "deepernova-gold-1.5",
    messages: [
      { role: "system", content: "Kamu adalah asisten cerdas DeeperNova." },
      { role: "user", content: "Halo DeeperNova Gold 1.5!" }
    ],
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}</code></pre>
                        )}
                        {codeLanguage === 'python' && (
                          <pre><code>{`# Panggil langsung via requests (Python)
import os
import requests

url = "${publicApiBaseUrl}/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.environ.get('DEEPERNOVA_API_KEY', 'YOUR_DEEPERNOVA_API_KEY')}"
}
payload = {
    "model": "deepernova-gold-1.5",
    "messages": [
        {"role": "system", "content": "Kamu adalah asisten cerdas DeeperNova."},
        {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ],
    "temperature": 0.7
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(data["choices"][0]["message"]["content"])`}</code></pre>
                        )}
                        {codeLanguage === 'curl' && (
                          <pre><code>{`curl -X POST "${publicApiBaseUrl}/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepernova-gold-1.5",
    "messages": [
      {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ]
  }'`}</code></pre>
                        )}
                      </div>
                    </section>
                  )}

                  {activeTab === 'chat' && (
                    <section className="docs-section">
                      <h3>2. Endpoint Chat Completions (<code>POST /v1/chat/completions</code>)</h3>
                      <p>Mendukung percakapan teks, streaming real-time (SSE), serta parameter standar industri.</p>
                      
                      <div className="param-table-card">
                        <h4>Parameter Request:</h4>
                        <div className="table-responsive">
                          <table className="param-table">
                            <thead>
                              <tr>
                                <th>Parameter</th>
                                <th>Tipe</th>
                                <th>Deskripsi</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td><code>model</code></td>
                                <td>string</td>
                                <td><code>deepernova-silicon-1.4</code>, <code>deepernova-gold-1.5</code> atau <code>deepernova-gold-1.5-pro</code></td>
                              </tr>
                              <tr>
                                <td><code>messages</code></td>
                                <td>array</td>
                                <td>Daftar pesan role ('system', 'user', 'assistant')</td>
                              </tr>
                              <tr>
                                <td><code>stream</code></td>
                                <td>boolean</td>
                                <td><code>true</code> untuk Server-Sent Events (SSE) streaming</td>
                              </tr>
                              <tr>
                                <td><code>temperature</code></td>
                                <td>number</td>
                                <td>Tingkat kreativitas (0.0 - 1.0, default 0.7)</td>
                              </tr>
                              <tr>
                                <td><code>max_tokens</code></td>
                                <td>integer</td>
                                <td>Maksimal token balasan (default 2048)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'models' && (
                    <section className="docs-section">
                      <h3>3. Model DeeperNova Cloud AI yang Tersedia</h3>
                      <div className="models-catalog-grid">
                        <div className="model-catalog-card">
                          <span className="catalog-badge silicon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)' }}>SILICON 1.4</span>
                          <h4>deepernova-silicon-1.4</h4>
                          <p>Model generasi baru super cepat dengan penalaran multimodal vision dan latensi respons ultra instan.</p>
                          <div className="catalog-specs">
                            <span>Konteks: 128.000 Token</span>
                            <span>Vision: Aktif</span>
                            <span>Biaya: Kuota Gratis 1M</span>
                          </div>
                        </div>

                        <div className="model-catalog-card">
                          <span className="catalog-badge">FLAGSHIP</span>
                          <h4>deepernova-gold-1.5</h4>
                          <p>Model multimodal vision & ultra-fast reasoning berkecepatan tinggi dengan konteks 128K. Ideal untuk percakapan, analisis dokumen, dan tugas umum.</p>
                          <div className="catalog-specs">
                            <span>Konteks: 128.000 Token</span>
                            <span>Vision: Aktif</span>
                            <span>Biaya: Kuota Gratis 1M</span>
                          </div>
                        </div>

                        <div className="model-catalog-card">
                          <span className="catalog-badge pro">REASONING & CODE</span>
                          <h4>deepernova-gold-1.5-pro</h4>
                          <p>Model 70B parameter dengan penalaran matematis mendalam, arsitektur coding kompleks, dan analisis logika tingkat tinggi.</p>
                          <div className="catalog-specs">
                            <span>Konteks: 128.000 Token</span>
                            <span>Coding: Ahli</span>
                            <span>Biaya: Kuota Gratis 1M</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'balance' && (
                    <section className="docs-section">
                      <h3>4. Endpoint Cek Saldo Token (<code>GET /v1/balance</code>)</h3>
                      <p>Gunakan endpoint ini untuk memantau sisa token akun Anda dari dalam aplikasi Anda secara terprogram.</p>
                      <pre><code>{`curl -X GET "${apiBaseUrl}/v1/balance" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"`}</code></pre>
                      <h4>Contoh Respons:</h4>
                      <pre><code>{`{
  "success": true,
  "token_quota": 1000000,
  "tokens_used": 1420,
  "remaining_tokens": 998580
}`}</code></pre>
                    </section>
                  )}
                </div>
              </div>
            )}

            {/* --- SEARCH ENGINE API DOCUMENTATION (SELARAS DENGAN HALAMAN DEEPERNOVA SEARCH) --- */}
            {docsSection === 'search' && (
              <div className="docs-content-wrapper">
                <div className="docs-body" style={{ width: '100%' }}>
                  <section className="docs-section">
                    <div className="search-docs-badge">SUB-20MS ULTRA-FAST WEB SEARCH • PUBLIC & ENTERPRISE SERP</div>
                    <h3>DeeperNova Search Engine API (Mandiri & Terdistribusi)</h3>
                    <p>
                      Akses indeks web mandiri DeeperNova dengan pencarian berbasis algoritma <strong>BM25 & PageRank</strong>, latensi sub-20ms, dan ringkasan <strong>AI Context</strong> yang siap diintegrasikan ke sistem <strong>RAG (Retrieval-Augmented Generation)</strong>, agen AI otonom, peramban web, atau bot.
                    </p>

                    {/* CORS & Free Access Banner (Selaras dengan DeeperNova Search) */}
                    <div className="cors-banner-box">
                      <span className="cors-banner-icon">🟢</span>
                      <div>
                        <strong>Dukungan Frontend CORS 100% Aktif & Akses Bebas Tanpa API Key:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                          Anda dapat langsung memanggil API ini dari peramban web mana saja (React, Next.js, Vue, Svelte, vanilla JS, skrip HTML) tanpa terhalang error CORS dan tanpa perlu backend proxy! Anda bisa menggunakannya <strong>secara bebas tanpa API Key</strong> (Anonymous Free Access) atau menyertakan API Key untuk prioritas antrean QoS Governor.
                        </p>
                      </div>
                    </div>

                    <div className="base-url-card">
                      <div>
                        <span className="base-url-label">Endpoint Base URL Resmi (Cloudflare & Server):</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <code className="base-url-val">{publicApiBaseUrl}/api/v1</code>
                          <button className="btn-copy-small" onClick={() => copyToClipboard(`${publicApiBaseUrl}/api/v1`, 'base-url-search')}>
                            {copiedText === 'base-url-search' ? '✓ Tersalin' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Authentication Mode Switcher */}
                    <div style={{ margin: '22px 0 10px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-title)', display: 'block', marginBottom: '8px' }}>
                        Pilih Mode Autentikasi Contoh Kode:
                      </span>
                      <div className="search-auth-switcher">
                        <button 
                          className={`search-auth-btn ${searchAuthMode === 'no-key' ? 'active' : ''}`}
                          onClick={() => setSearchAuthMode('no-key')}
                        >
                          🟢 Mode Bebas (Tanpa API Key - Anonymous)
                        </button>
                        <button 
                          className={`search-auth-btn with-key ${searchAuthMode === 'with-key' ? 'active with-key' : ''}`}
                          onClick={() => setSearchAuthMode('with-key')}
                        >
                          🔑 Mode API Key (Dedicated Developer Key)
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 14px' }}>
                        {searchAuthMode === 'no-key' 
                          ? '⚡ Mode Bebas: Panggil endpoint langsung tanpa header Authorization atau query key. Otomatis dilayani sebagai Anonymous Free User.'
                          : '🚀 Mode API Key: Gunakan header Authorization: Bearer <KEY> atau demo key \'dn_live_free_public_demo\' untuk alokasi bandwidth prioritas QoS.'}
                      </p>
                    </div>

                    {/* Endpoints Reference Table */}
                    <h4>Referensi Endpoint DeeperNova Search API:</h4>
                    <div className="table-responsive">
                      <table className="param-table">
                        <thead>
                          <tr>
                            <th>Endpoint & Metode</th>
                            <th>Autentikasi</th>
                            <th>Deskripsi Fungsi</th>
                            <th>Parameter Utama</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <code>/api/v1/search</code><br />
                              <span className="search-method-badge">GET / POST</span>
                            </td>
                            <td><span className="auth-badge-free">Bebas (Tanpa Key)</span></td>
                            <td>Pencarian web berkecepatan tinggi dengan BM25, PageRank, dan ringkasan context AI RAG.</td>
                            <td><code>q</code> (wajib), <code>limit</code> (1-50), <code>page</code>, <code>timeFilter</code> ('all','24h','7d')</td>
                          </tr>
                          <tr>
                            <td>
                              <code>/api/v1/news</code><br />
                              <span className="search-method-badge">GET</span>
                            </td>
                            <td><span className="auth-badge-free">Bebas (Tanpa Key)</span></td>
                            <td>Pencarian berita terkini langsung dari 50+ media nasional terpercaya & RSS feeds real-time.</td>
                            <td><code>q</code>, <code>limit</code> (1-50), <code>sort</code> ('latest' | 'relevance')</td>
                          </tr>
                          <tr>
                            <td>
                              <code>/api/v1/images</code><br />
                              <span className="search-method-badge">GET</span>
                            </td>
                            <td><span className="auth-badge-free">Bebas (Tanpa Key)</span></td>
                            <td>Pencarian gambar, ilustrasi, media visual, dan logo website terindeks.</td>
                            <td><code>q</code> (wajib), <code>limit</code> (1-50), <code>page</code></td>
                          </tr>
                          <tr>
                            <td>
                              <code>/api/v1/health</code><br />
                              <span className="search-method-badge">GET</span>
                            </td>
                            <td><span className="auth-badge-free">Bebas (Tanpa Key)</span></td>
                            <td>Cek status operasional node pencari, antrean crawler, metrik indeks, dan QoS Governor.</td>
                            <td><em>Tidak memerlukan parameter</em></td>
                          </tr>
                          <tr>
                            <td>
                              <code>/api/v1/suggest</code><br />
                              <span className="search-method-badge">GET</span>
                            </td>
                            <td><span className="auth-badge-free">Bebas (Tanpa Key)</span></td>
                            <td>Autocomplete & saran pelengkap frasa kueri pencarian sub-10ms.</td>
                            <td><code>q</code> (kata kunci pencarian)</td>
                          </tr>
                          <tr>
                            <td>
                              <code>/api/v1/search-fast</code><br />
                              <span className="search-method-badge">GET</span>
                            </td>
                            <td><span className="auth-badge-free">Bebas (Tanpa Key)</span></td>
                            <td>Pencarian instan sub-10ms indeks lokal SQLite database.</td>
                            <td><code>q</code> (kata kunci), <code>limit</code> (1-50)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Multi-Language Code Snippets */}
                    <h4 style={{ marginTop: '24px' }}>Contoh Implementasi Kode:</h4>
                    <div className="lang-selector-row">
                      <button className={`lang-btn ${searchCodeLanguage === 'javascript' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('javascript')}>
                        🌐 JavaScript (Browser Fetch)
                      </button>
                      <button className={`lang-btn ${searchCodeLanguage === 'react' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('react')}>
                        ⚛️ React / Next.js
                      </button>
                      <button className={`lang-btn ${searchCodeLanguage === 'html' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('html')}>
                        📄 HTML Standalone Widget
                      </button>
                      <button className={`lang-btn ${searchCodeLanguage === 'python' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('python')}>
                        🐍 Python (Requests & RAG)
                      </button>
                      <button className={`lang-btn ${searchCodeLanguage === 'curl' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('curl')}>
                        💻 cURL (Terminal)
                      </button>
                    </div>

                    <div className="code-display-box">
                      {searchCodeLanguage === 'javascript' && (
                        searchAuthMode === 'no-key' ? (
                          <pre><code>{`// 🌐 Pencarian Web Bebas Tanpa API Key (100% Dukungan CORS dari Browser)
async function searchWeb(query) {
  const url = "${publicApiBaseUrl}/api/v1/search?q=" + encodeURIComponent(query) + "&limit=5";

  // Panggil langsung dari peramban web (React, Vue, Vanilla JS) tanpa perlu backend proxy
  const response = await fetch(url);
  const data = await response.json();

  console.log("⚡ Status:", data.status, "| Latensi:", data.duration_ms + "ms");
  console.log("Total Hasil:", data.total_results);

  (data.results || []).forEach((res, i) => {
    console.log(\`[\${i + 1}] \${res.title} (\${res.url})\`);
    console.log(\`    \${res.snippet}\\n\`);
  });

  return data;
}

// Uji coba pencarian langsung:
searchWeb("indonesia");`}</code></pre>
                        ) : (
                          <pre><code>{`// 🔑 Pencarian Web dengan API Key (Prioritas QoS Governor)
async function searchWeb(query) {
  const url = "${publicApiBaseUrl}/api/v1/search?q=" + encodeURIComponent(query) + "&limit=5";

  const response = await fetch(url, {
    headers: {
      "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY",
      "X-API-Key": "YOUR_DEEPERNOVA_API_KEY" // atau gunakan demo key: dn_live_free_public_demo
    }
  });

  const data = await response.json();
  console.log("⚡ Selesai dalam", data.duration_ms, "ms (Total:", data.total_results, "hasil)");
  return data.results;
}

searchWeb("indonesia");`}</code></pre>
                        )
                      )}

                      {searchCodeLanguage === 'react' && (
                        searchAuthMode === 'no-key' ? (
                          <pre><code>{`// ⚛️ React / Next.js Component: Client-Side Web Search (Bebas Tanpa API Key)
import React, { useState } from 'react';

const SEARCH_ENDPOINT = "${publicApiBaseUrl}/api/v1/search";

export default function DeeperNovaSearchWidget() {
  const [query, setQuery] = useState('teknologi ai');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Direct browser fetch tanpa API Key & bebas CORS!
      const res = await fetch(\`\${SEARCH_ENDPOINT}?q=\${encodeURIComponent(query)}&limit=5\`);
      const data = await res.json();
      setResults(data.results || []);
      setLatency(data.duration_ms);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '20px auto', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari web..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }}>
          {loading ? 'Mencari...' : 'Cari'}
        </button>
      </form>

      {latency != null && <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>⚡ Latensi: <strong>{latency} ms</strong></p>}

      <div style={{ marginTop: 16 }}>
        {results.map((r, i) => (
          <div key={i} style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>{r.domain}</span>
            <h4 style={{ margin: '4px 0' }}><a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#0f172a' }}>{r.title}</a></h4>
            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}`}</code></pre>
                        ) : (
                          <pre><code>{`// ⚛️ React / Next.js Component: Client-Side Web Search (Dengan API Key)
import React, { useState } from 'react';

const SEARCH_ENDPOINT = "${publicApiBaseUrl}/api/v1/search";
const API_KEY = "YOUR_DEEPERNOVA_API_KEY"; // atau gunakan "dn_live_free_public_demo"

export default function DeeperNovaSearchWidget() {
  const [query, setQuery] = useState('teknologi ai');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(\`\${SEARCH_ENDPOINT}?q=\${encodeURIComponent(query)}&limit=5\`, {
        headers: { "Authorization": \`Bearer \${API_KEY}\` }
      });
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '20px auto' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari..." style={{ flex: 1, padding: 10, borderRadius: 8 }} />
        <button type="submit" disabled={loading} style={{ background: '#059669', color: '#fff', padding: '10px 18px', border: 'none', borderRadius: 8 }}>Cari</button>
      </form>
    </div>
  );
}`}</code></pre>
                        )
                      )}

                      {searchCodeLanguage === 'html' && (
                        <pre><code>{`<!-- 📄 Simpan sebagai 'search.html' dan buka langsung di Browser (Chrome / Edge / Firefox) -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeeperNova Live Search Widget</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 680px; margin: 2.5rem auto; padding: 0 1rem; color: #0f172a; }
    .box { display: flex; gap: 8px; margin-bottom: 12px; }
    input { flex: 1; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; outline: none; }
    button { background: #059669; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
    .stat { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
    .card a { color: #059669; text-decoration: none; font-size: 17px; font-weight: bold; }
  </style>
</head>
<body>
  <h2>DeeperNova Search (Frontend Standalone Demo)</h2>
  <div class="box">
    <input type="text" id="qInput" value="indonesia" placeholder="Ketik kata kunci..." />
    <button onclick="cari()">Cari Web</button>
  </div>
  <div id="stat" class="stat">Siap melakukan pencarian...</div>
  <div id="results"></div>

  <script>
    async function cari() {
      const q = document.getElementById('qInput').value;
      const stat = document.getElementById('stat');
      const list = document.getElementById('results');
      stat.innerText = '⚡ Mengambil hasil pencarian...';
      list.innerHTML = '';

      try {
        // Panggilan langsung tanpa API Key & 100% bebas CORS:
        const response = await fetch(\`${publicApiBaseUrl}/api/v1/search?q=\${encodeURIComponent(q)}&limit=5\`${searchAuthMode === 'with-key' ? `, { headers: { 'Authorization': 'Bearer YOUR_DEEPERNOVA_API_KEY' } }` : ''});
        const data = await response.json();
        stat.innerHTML = \`⚡ Selesai dalam <strong>\${data.duration_ms}ms</strong> (Total: \${data.total_results} hasil)\`;

        (data.results || []).forEach(r => {
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = \`
            <small style="color:#059669; font-weight:bold;">\${r.domain}</small>
            <div><a href="\${r.url}" target="_blank">\${r.title}</a></div>
            <p style="margin:4px 0 0; color:#475569; font-size:14px;">\${r.snippet}</p>
          \`;
          list.appendChild(div);
        });
      } catch (err) {
        stat.innerText = 'Error: ' + err.message;
      }
    }
    cari();
  </script>
</body>
</html>`}</code></pre>
                      )}

                      {searchCodeLanguage === 'python' && (
                        searchAuthMode === 'no-key' ? (
                          <pre><code>{`import requests

# 🐍 Panggilan Search Engine DeeperNova Bebas Tanpa API Key
url = "${publicApiBaseUrl}/api/v1/search"
params = {
    "q": "perkembangan ai indonesia",
    "limit": 5
}

response = requests.get(url, params=params)
data = response.json()

print(f"⚡ Status: {data.get('status')} | Latensi: {data.get('duration_ms')}ms")
print(f"Total Ditemukan: {data.get('total_results')} hasil\\n")

for idx, item in enumerate(data.get("results", []), 1):
    print(f"[{idx}] {item.get('title')}")
    print(f"    URL: {item.get('url')}")
    print(f"    Snippet: {item.get('snippet')[:120]}...\\n")

# ai_context siap langsung dimasukkan ke prompt LLM / sistem RAG:
if "ai_context" in data:
    print("--- CONTEXT RAG SIAP PAKAI ---")
    print(data["ai_context"])`}</code></pre>
                        ) : (
                          <pre><code>{`import requests

# 🔑 Panggilan Search Engine DeeperNova dengan API Key
API_KEY = "YOUR_DEEPERNOVA_API_KEY"
url = "${publicApiBaseUrl}/api/v1/search"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "X-API-Key": API_KEY # atau gunakan "dn_live_free_public_demo"
}
params = {
    "q": "perkembangan ai indonesia",
    "limit": 5
}

response = requests.get(url, headers=headers, params=params)
data = response.json()

print(f"⚡ Status: {data.get('status')} | Latensi: {data.get('duration_ms')}ms")
for item in data.get("results", []):
    print(f"• {item.get('title')} -> {item.get('url')}")`}</code></pre>
                        )
                      )}

                      {searchCodeLanguage === 'curl' && (
                        searchAuthMode === 'no-key' ? (
                          <pre><code>{`# 1. Web Search Organik (Tanpa API Key - Anonymous Free Access)
curl -X GET "${publicApiBaseUrl}/api/v1/search?q=indonesia&limit=5"

# 2. Berita Nasional Terkini (Tanpa API Key)
curl -X GET "${publicApiBaseUrl}/api/v1/news?q=teknologi+ai&limit=5"

# 3. Pencarian Gambar & Visual Media (Tanpa API Key)
curl -X GET "${publicApiBaseUrl}/api/v1/images?q=ai+indonesia&limit=8"

# 4. Cek Status Kesehatan Mesin & QoS Governor
curl -X GET "${publicApiBaseUrl}/api/v1/health"

# 5. POST Request Body (Tanpa API Key)
curl -X POST "${publicApiBaseUrl}/api/v1/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "mobil listrik indonesia", "limit": 5}'`}</code></pre>
                        ) : (
                          <pre><code>{`# 1. Web Search dengan Dedicated API Key (Prioritas QoS Governor)
curl -X GET "${publicApiBaseUrl}/api/v1/search?q=indonesia&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"

# 2. Atau menggunakan Demo Key Bawaan:
curl -X GET "${publicApiBaseUrl}/api/v1/search?q=indonesia&limit=5" \\
  -H "X-API-Key: dn_live_free_public_demo"

# 3. Pencarian Berita Nasional Terkini
curl -X GET "${publicApiBaseUrl}/api/v1/news?q=teknologi+ai&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"

# 4. Pencarian Gambar
curl -X GET "${publicApiBaseUrl}/api/v1/images?q=ai+indonesia&limit=8" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"`}</code></pre>
                        )
                      )}
                    </div>

                    <h4>Contoh Format Respons JSON Realistis (/api/v1/search):</h4>
                    <pre><code>{`{
  "status": "success",
  "query": "indonesia",
  "duration_ms": 14.8,
  "total_results": 142,
  "results": [
    {
      "title": "Portal Informasi Indonesia - Berita & Layanan Publik",
      "url": "https://indonesia.go.id",
      "domain": "indonesia.go.id",
      "snippet": "Portal resmi informasi pemerintah Republik Indonesia. Berita terkini, regulasi, pariwisata, dan layanan digital nasional.",
      "score": 98.4,
      "crawled_at": "2026-10-11T12:00:00Z"
    },
    {
      "title": "Kementerian Komunikasi dan Digital RI",
      "url": "https://komdigi.go.id",
      "domain": "komdigi.go.id",
      "snippet": "Perkembangan ekosistem teknologi informasi, kecerdasan buatan, dan kedaulatan data digital nasional Indonesia.",
      "score": 95.1
    }
  ],
  "ai_context": "Indonesia adalah negara kepulauan yang sedang mengakselerasi transformasi digital dan adopsi kecerdasan buatan nasional...",
  "auth_mode": "${searchAuthMode === 'no-key' ? 'Anonymous Free User (Tanpa API Key)' : 'Dedicated Developer Key'}"
}`}</code></pre>
                  </section>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PAGE 4: DASHBOARD & API KEYS MANAGEMENT + LIVE HIT TESTER */}
        {/* ============================================================ */}
        {currentPage === 'dashboard' && (
          <div className="dashboard-page">
            <div className="dashboard-hero">
              <div className="dashboard-hero-copy">
                <span className="eyebrow">DeeperNova Developer Console</span>
                <h2>Dashboard & Live API Management</h2>
                <p>Kelola API Key, pantau saldo 1.000.000 token gratis, dan uji coba langsung respons API secara live.</p>
              </div>
              <div className="dashboard-hero-actions">
                <button className="btn-primary" onClick={() => setShowCreateKeyModal(true)} disabled={loading}>
                  + Buat API Key Baru
                </button>
                <button className="btn-secondary" onClick={fetchApiKeys} disabled={loading}>
                  🔄 Refresh Saldo
                </button>
              </div>
            </div>

            {/* Live Interactive API Hit Tester */}
            <div className="live-tester-card">
              <div className="live-tester-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot"></span>
                  <h3>Live Interactive API Hit Tester</h3>
                </div>
                <span className="live-tester-badge">Hit API Nyata</span>
              </div>
              <p className="live-tester-subtitle">
                Uji coba panggilan API secara langsung ke endpoint backend DeeperNova tanpa perlu membuka Postman atau terminal.
              </p>

              <div className="tester-form-row">
                <div className="form-group flex-1">
                  <label htmlFor="test-key-select">Pilih Kunci API:</label>
                  <select
                    id="test-key-select"
                    value={testKeyId}
                    onChange={(e) => setTestKeyId(e.target.value)}
                    className="form-select"
                  >
                    {apiKeys.length === 0 ? (
                      <option value="">Belum ada kunci API</option>
                    ) : (
                      apiKeys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name} ({k.key}) {k.isActive ? '• Aktif' : '• Nonaktif'}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="test-model-select">Pilih Model:</label>
                  <select
                    id="test-model-select"
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value)}
                    className="form-select"
                  >
                    <option value="deepernova-silicon-1.4">⚡ DeeperNova Silicon 1.4 (Ultra Fast & Vision)</option>
                    <option value="deepernova-gold-1.5">🌟 DeeperNova Gold 1.5 (Flagship Fast & Vision)</option>
                    <option value="deepernova-gold-1.5-pro">🧠 DeeperNova Gold 1.5 Pro (Deep Reasoning 70B & Code)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="test-prompt-input">Prompt Uji Coba:</label>
                <textarea
                  id="test-prompt-input"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  rows={2}
                  className="form-textarea"
                  placeholder="Tulis prompt untuk uji coba API..."
                  spellCheck="false"
                />
              </div>

              <div className="tester-action-row">
                <button
                  onClick={handleLiveHitTest}
                  disabled={testingApi || !testKeyId}
                  className="btn-hit-test"
                >
                  {testingApi ? '⏳ Sedang Menghubungi API...' : '🚀 Hit API Sekarang (Kirim Request Nyata)'}
                </button>
                <span className="tester-note">
                  Setiap hit memotong token dari kuota 1.000.000 gratis Anda dan langsung dicatat ke server database.
                </span>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div className={`test-result-box ${testResult.success ? 'success' : 'error'}`}>
                  <div className="test-result-meta-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-pill ${testResult.success ? 'ok' : 'err'}`}>
                        HTTP {testResult.status}
                      </span>
                      <span>Latensi: <strong>{testResult.latencyMs} ms</strong></span>
                      {testResult.success && <span>Model: <strong>{testResult.model}</strong></span>}
                    </div>
                    {testResult.success && (
                      <div className="tokens-consumed-label">
                        🔥 Terpakai: {testResult.tokensConsumed} Token (Sisa: {testResult.remainingTokens.toLocaleString()})
                      </div>
                    )}
                  </div>

                  {testResult.success ? (
                    <div>
                      <div className="result-label">RESPONS DARI DEEPERNOVA GOLD 1.5:</div>
                      <div className="result-content-body">
                        {testResult.reply}
                      </div>
                      <div className="result-tokens-breakdown">
                        <span>Input: <strong>{testResult.promptTokens}</strong> token</span>
                        <span>Output: <strong>{testResult.completionTokens}</strong> token</span>
                        <span>Total: <strong>{testResult.tokensConsumed}</strong> token</span>
                      </div>
                    </div>
                  ) : (
                    <div className="result-error-msg">
                      <strong>Gagal:</strong> {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* API Keys Table */}
            <div className="keys-section-card">
              <div className="section-header">
                <div>
                  <h3>Daftar API Keys Anda</h3>
                  <p className="section-subtitle">
                    Gunakan kunci ini pada header <code>Authorization: Bearer &lt;KEY&gt;</code> di aplikasi Anda.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateKeyModal(true)} disabled={loading}>
                  + Buat Kunci Baru
                </button>
              </div>

              {loading ? (
                <p>Memuat data API Keys...</p>
              ) : apiKeys.length === 0 ? (
                <div className="empty-state-card">
                  <h4>Belum ada API Key</h4>
                  <p>Klik tombol di bawah untuk membuat kunci pertama Anda dan mulai menggunakan DeeperNova Gold 1.5.</p>
                  <button className="btn-primary" onClick={() => setShowCreateKeyModal(true)}>
                    Buat Kunci Sekarang
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="api-keys-table">
                    <thead>
                      <tr>
                        <th>Nama Kunci</th>
                        <th>Secret Key</th>
                        <th>Token Terpakai</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((key) => (
                        <tr key={key.id}>
                          <td><strong>{key.name}</strong></td>
                          <td>
                            <code className="masked-key">{key.key}</code>
                          </td>
                          <td>{(key.tokensUsed || 0).toLocaleString()} token</td>
                          <td>
                            <span className={`status-badge ${key.isActive ? 'active' : 'inactive'}`}>
                              {key.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="key-actions-cell">
                            <button
                              className="btn-action-copy"
                              onClick={() => copyKeyDirectly(key.id)}
                              title="Salin Secret Key Lengkap"
                            >
                              {copiedText === `key-${key.id}` ? '✓ Tersalin!' : 'Copy'}
                            </button>
                            <button
                              className="btn-action-view"
                              onClick={() => viewFullKey(key.id)}
                            >
                              Lihat
                            </button>
                            <button
                              className="btn-action-toggle"
                              onClick={() => updateApiKey(key.id, { isActive: !key.isActive })}
                            >
                              {key.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              className="btn-action-delete"
                              onClick={() => deleteApiKey(key.id)}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Key */}
      {showCreateKeyModal && (
        <div className="modal-overlay" onClick={() => setShowCreateKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buat API Key Baru</h3>
            <p className="modal-sub">
              Beri nama label yang mudah diingat untuk proyek atau aplikasi Anda.
            </p>
            <div className="form-group">
              <label htmlFor="key-name-modal">Nama Kunci (Label)</label>
              <input
                id="key-name-modal"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Contoh: Aplikasi Mobile"
                className="form-input"
                autoComplete="off"
                spellCheck="false"
                autoFocus
              />
            </div>
            {errorMsg && <div className="error-message">⚠️ {errorMsg}</div>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setShowCreateKeyModal(false); setNewKeyName(''); setErrorMsg(''); }}>
                Batal
              </button>
              <button className="btn-primary" onClick={createNewApiKey} disabled={loading || !newKeyName.trim()}>
                {loading ? 'Membuat...' : 'Buat API Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: API Key Ready */}
      {showApiKeyModal && createdKey && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🎉 API Key Berhasil Dibuat!</h3>
            <p className="modal-sub">
              Simpan kunci ini di tempat yang aman. Kunci ini terhubung dengan kuota 1.000.000 Token gratis Anda.
            </p>
            <div className="modal-key-display">
              <code>{createdKey.key}</code>
              <button onClick={() => copyToClipboard(createdKey.key, 'modal-key')}>
                {copiedText === 'modal-key' ? '✓ Tersalin' : 'Copy'}
              </button>
            </div>
            <button className="btn-primary modal-btn" onClick={() => { setShowApiKeyModal(false); setCreatedKey(null); setCurrentPage('dashboard'); }}>
              Buka Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Modal: Full Key View */}
      {showFullKeyModal && selectedKeyFull && (
        <div className="modal-overlay" onClick={() => setShowFullKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Secret API Key Lengkap</h3>
            <div className="modal-key-display">
              <code>{selectedKeyFull}</code>
              <button onClick={() => copyToClipboard(selectedKeyFull, 'full-key')}>
                {copiedText === 'full-key' ? '✓ Tersalin' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px' }}>
              ⚠️ Jangan bagikan kunci rahasia ini ke publik atau simpan di repository terbuka.
            </p>
            <button className="btn-primary modal-btn" onClick={() => setShowFullKeyModal(false)}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiMarketplace;
