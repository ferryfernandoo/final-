import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../apiConfig';
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
          <div className="logo" onClick={() => setCurrentPage('landing')} style={{ cursor: 'pointer' }}>
            <h1>⚡ DeeperNova API Platforms</h1>
            <span className="tagline">Enterprise AI Gateway & Sub-20ms Search Engine</span>
          </div>

          <button 
            className="nav-toggle" 
            onClick={() => setNavOpen(prev => !prev)} 
            aria-label="Toggle navigation menu"
          >
            {navOpen ? '✕' : '☰'}
          </button>

          <div className={`api-nav-menu ${navOpen ? 'open' : 'collapsed'}`}>
            <button 
              className={`api-nav-btn ${currentPage === 'landing' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('landing'); setNavOpen(false); }}
            >
              Beranda
            </button>
            <button 
              className={`api-nav-btn ${currentPage === 'docs' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('docs'); setNavOpen(false); }}
            >
              Dokumentasi API
            </button>
            <button 
              className={`api-nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('dashboard'); setNavOpen(false); }}
            >
              Dashboard & Keys
            </button>
            <button 
              className={`api-nav-btn ${currentPage === 'usage' ? 'active' : ''}`} 
              onClick={() => { setCurrentPage('usage'); setNavOpen(false); }}
            >
              📊 Laporan Usage & Grafik
            </button>
          </div>

          <div className="api-nav-actions">
            <button 
              className="btn-back-home" 
              onClick={() => onNavigate?.('landing')}
              title="Kembali ke Beranda Utama"
            >
              ← Beranda
            </button>
            {apiKeys.length > 0 ? (
              <button className="btn-get-started" onClick={() => setShowCreateKeyModal(true)}>
                + Buat API Key
              </button>
            ) : isAuthenticated ? (
              <button className="btn-get-started" onClick={() => setShowCreateKeyModal(true)}>
                Dapatkan Kunci API
              </button>
            ) : (
              <button className="btn-get-started" onClick={onLoginRequest || (() => onNavigate?.('landing'))}>
                Login / Daftar Akun
              </button>
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
                Hubungkan aplikasi web, mobile, bot, dan backend Anda ke model AI <strong>DeeperNova Gold 1.5</strong> (OpenAI-compatible) serta <strong>DeeperNova Search Engine API</strong> sub-20ms. Gratis 1.000.000 Token.
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
                    <li>✓ Kompatibel 100% dengan OpenAI SDK & LangChain</li>
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
                <p>Cukup arahkan <code>baseURL</code> ke DeeperNova dan masukkan API Key Anda.</p>
              </div>

              <div className="code-box-wrapper">
                <div className="code-box-header">
                  <div className="window-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="code-box-title">Node.js / OpenAI SDK Integration</span>
                  <button 
                    className="copy-btn-snippet" 
                    onClick={() => copyToClipboard(`import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "deepernova_sk_live_YOUR_KEY",
  baseURL: "${apiBaseUrl}/v1"
});

const response = await openai.chat.completions.create({
  model: "deepernova-gold-1.5",
  messages: [{ role: "user", content: "Halo DeeperNova Gold 1.5!" }]
});

console.log(response.choices[0].message.content);`, 'quick-snippet')}
                  >
                    {copiedText === 'quick-snippet' ? '✓ Tersalin' : 'Salin Kode'}
                  </button>
                </div>
                <pre className="code-snippet-pre">
                  <code>{`import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "deepernova_sk_live_YOUR_KEY",
  baseURL: "${apiBaseUrl}/v1"
});

const response = await openai.chat.completions.create({
  model: "deepernova-gold-1.5",
  messages: [{ role: "user", content: "Halo DeeperNova Gold 1.5!" }]
});

console.log(response.choices[0].message.content);`}</code>
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
                        DeeperNova Gold 1.5 sepenuhnya kompatibel dengan format <strong>OpenAI API</strong>. Anda cukup mengganti <code>baseURL</code> dan <code>apiKey</code> pada library OpenAI resmi.
                      </p>

                      <div className="base-url-card">
                        <span className="base-url-label">Endpoint Base URL Resmi:</span>
                        <code className="base-url-val">{apiBaseUrl}/v1</code>
                        <button className="btn-copy-small" onClick={() => copyToClipboard(`${apiBaseUrl}/v1`, 'base-url-ai')}>
                          {copiedText === 'base-url-ai' ? '✓ Tersalin' : 'Copy'}
                        </button>
                      </div>

                      <div className="lang-selector-row">
                        <button className={`lang-btn ${codeLanguage === 'javascript' ? 'active' : ''}`} onClick={() => setCodeLanguage('javascript')}>Node.js</button>
                        <button className={`lang-btn ${codeLanguage === 'python' ? 'active' : ''}`} onClick={() => setCodeLanguage('python')}>Python</button>
                        <button className={`lang-btn ${codeLanguage === 'curl' ? 'active' : ''}`} onClick={() => setCodeLanguage('curl')}>cURL</button>
                      </div>

                      <div className="code-display-box">
                        {codeLanguage === 'javascript' && (
                          <pre><code>{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPERNOVA_API_KEY, // Kunci API DeeperNova Anda
  baseURL: "${apiBaseUrl}/v1"
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "deepernova-gold-1.5",
    messages: [
      { role: "system", content: "Kamu adalah asisten cerdas." },
      { role: "user", content: "Halo DeeperNova Gold 1.5!" }
    ],
    temperature: 0.7
  });

  console.log(completion.choices[0].message.content);
}

main();`}</code></pre>
                        )}
                        {codeLanguage === 'python' && (
                          <pre><code>{`from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ.get("DEEPERNOVA_API_KEY"),
    base_url="${apiBaseUrl}/v1"
)

response = client.chat.completions.create(
    model="deepernova-gold-1.5",
    messages=[
        {"role": "system", "content": "Kamu adalah asisten cerdas."},
        {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ]
)

print(response.choices[0].message.content)`}</code></pre>
                        )}
                        {codeLanguage === 'curl' && (
                          <pre><code>{`curl -X POST "${apiBaseUrl}/v1/chat/completions" \\
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
                      <p>Mendukung percakapan teks, streaming real-time, serta parameter standar OpenAI.</p>
                      
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
                                <td><code>deepernova-gold-1.5</code> atau <code>deepernova-gold-1.5-pro</code></td>
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

            {/* --- SEARCH ENGINE API DOCUMENTATION --- */}
            {docsSection === 'search' && (
              <div className="docs-content-wrapper">
                <div className="docs-body" style={{ width: '100%' }}>
                  <section className="docs-section">
                    <div className="search-docs-badge">SUB-20MS ULTRA-FAST WEB SEARCH</div>
                    <h3>DeeperNova Search Engine API</h3>
                    <p>
                      Akses indeks web mandiri DeeperNova dengan pencarian berbasis BM25 dan latensi di bawah 20 milidetik. Sangat cocok untuk sistem <strong>RAG (Retrieval-Augmented Generation)</strong>, agen AI otonom, dan aplikasi pencarian.
                    </p>

                    <div className="base-url-card">
                      <span className="base-url-label">Endpoint Pencarian Web:</span>
                      <code className="base-url-val">{apiBaseUrl}/api/v1/search?q=query_anda</code>
                    </div>

                    <h4>Daftar Endpoint DeeperNova Search Engine API:</h4>
                    <div className="table-responsive">
                      <table className="param-table">
                        <thead>
                          <tr>
                            <th>Metode & Path</th>
                            <th>Fungsi</th>
                            <th>Parameter Utama</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><code>GET /api/v1/search</code></td>
                            <td>Pencarian web organik presisi tinggi (BM25 & PageRank)</td>
                            <td><code>q</code> (kata kunci), <code>limit</code> (1-50)</td>
                          </tr>
                          <tr>
                            <td><code>GET /api/v1/search-fast</code></td>
                            <td>Pencarian instan sub-10ms indeks lokal SQLite</td>
                            <td><code>q</code> (kata kunci), <code>limit</code> (1-50), <code>ai</code> (false/true)</td>
                          </tr>
                          <tr>
                            <td><code>GET /api/v1/images</code></td>
                            <td>Pencarian gambar terindeks dari halaman web</td>
                            <td><code>q</code> (kata kunci), <code>limit</code> (1-50)</td>
                          </tr>
                          <tr>
                            <td><code>GET /api/v1/suggest</code></td>
                            <td>Autocomplete & saran pelengkap query pencarian</td>
                            <td><code>q</code> (kata kunci)</td>
                          </tr>
                          <tr>
                            <td><code>GET /api/v1/status</code></td>
                            <td>Status kesehatan node, antrean crawler & metrik indeks</td>
                            <td><em>Tidak ada parameter</em></td>
                          </tr>
                          <tr>
                            <td><code>POST /api/v1/explain</code></td>
                            <td>Analisis pembobotan kata dan skor relevansi dokumen</td>
                            <td>Body: <code>{`{ "q": "kata kunci", "url": "..." }`}</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h4 style={{ marginTop: '20px' }}>Contoh Implementasi Kode:</h4>
                    <div className="lang-selector-row">
                      <button className={`lang-btn ${searchCodeLanguage === 'javascript' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('javascript')}>JavaScript (Fetch)</button>
                      <button className={`lang-btn ${searchCodeLanguage === 'python' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('python')}>Python (Requests)</button>
                      <button className={`lang-btn ${searchCodeLanguage === 'curl' ? 'active' : ''}`} onClick={() => setSearchCodeLanguage('curl')}>cURL</button>
                    </div>

                    <div className="code-display-box">
                      {searchCodeLanguage === 'javascript' && (
                        <pre><code>{`// Pencarian Web Real-Time via DeeperNova Search API
async function searchWeb(query) {
  const url = "${apiBaseUrl}/api/v1/search?q=" + encodeURIComponent(query) + "&limit=5";
  const response = await fetch(url, {
    headers: {
      "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY",
      "X-API-Key": "YOUR_DEEPERNOVA_API_KEY"
    }
  });

  const data = await response.json();
  console.log("Query:", data.query, "Hasil:", data.results?.length);
  (data.results || []).forEach((res, i) => {
    console.log(\`\${i + 1}. \${res.title} - \${res.url || res.link}\`);
  });
}

searchWeb("indonesia");`}</code></pre>
                      )}
                      {searchCodeLanguage === 'python' && (
                        <pre><code>{`import requests

url = "${apiBaseUrl}/api/v1/search"
params = {"q": "indonesia", "limit": 5}
headers = {
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY",
    "X-API-Key": "YOUR_DEEPERNOVA_API_KEY"
}

response = requests.get(url, params=params, headers=headers)
data = response.json()

print(f"Total hasil: {len(data.get('results', []))}")
for idx, item in enumerate(data.get('results', []), 1):
    print(f"{idx}. {item.get('title')} -> {item.get('url')}")`}</code></pre>
                      )}
                      {searchCodeLanguage === 'curl' && (
                        <pre><code>{`# 1. Pencarian Web Utama
curl -X GET "${apiBaseUrl}/api/v1/search?q=indonesia&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"

# 2. Pencarian Instan (Fast Search)
curl -X GET "${apiBaseUrl}/api/v1/search-fast?q=indonesia&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"

# 3. Pencarian Gambar
curl -X GET "${apiBaseUrl}/api/v1/images?q=indonesia&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"`}</code></pre>
                      )}
                    </div>

                    <h4>Contoh Respons JSON (/api/v1/search):</h4>
                    <pre><code>{`{
  "query": "indonesia",
  "results": [
    {
      "url": "https://media.licdn.com",
      "title": "indonesia",
      "snippet": "Community And Social Services jobs in Gambir, Jakarta, Indonesia...",
      "image": "https://media.licdn.com/dms/image/...",
      "score": 1000000000000
    }
  ],
  "cached": false
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
                  placeholder="Ketik pertanyaan untuk menguji respons API..."
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
                placeholder="misal: Aplikasi Mobile, Production Web"
                className="form-input"
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
