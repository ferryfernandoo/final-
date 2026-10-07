import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './ApiMarketplace.css';

const ApiMarketplace = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [apiKeys, setApiKeys] = useState([]);
  const [tokenQuota, setTokenQuota] = useState(1000000);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [remainingTokens, setRemainingTokens] = useState(1000000);
  const [loading, setLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showFullKeyModal, setShowFullKeyModal] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [activeTab, setActiveTab] = useState('getting-started');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [navOpen, setNavOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedKeyFull, setSelectedKeyFull] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Interactive Live Hit Tester State
  const [testKeyId, setTestKeyId] = useState('');
  const [testModel, setTestModel] = useState('deepernova-gold-1.5');
  const [testPrompt, setTestPrompt] = useState('Halo DeeperNova Gold 1.5! Bagaimana performamu hari ini dan apa saja keunggulanmu?');
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const totalKeys = apiKeys.length;
  const activeKeys = apiKeys.filter((key) => key.isActive).length;
  const apiBaseUrl = API_BASE_URL;

  useEffect(() => {
    fetchApiKeys();
  }, []);

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
        
        // Auto-select first key for test hit if not set
        if (data.keys && data.keys.length > 0 && !testKeyId) {
          const activeKey = data.keys.find(k => k.isActive) || data.keys[0];
          setTestKeyId(activeKey.id);
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setErrorMsg('Gagal memuat API keys');
    } finally {
      setLoading(false);
    }
  };

  const createNewApiKey = async () => {
    if (!newKeyName.trim()) {
      setErrorMsg('Silakan masukkan nama untuk API key');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/apikeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName })
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
        setErrorMsg(data.error || 'Gagal membuat API key');
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
      console.error('Error fetching full key:', error);
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
        setSuccessMsg('API Key berhasil disalin ke clipboard!');
        setTimeout(() => {
          setCopiedText('');
          setSuccessMsg('');
        }, 3000);
      }
    } catch (err) {
      console.error('Error copying key:', err);
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
      } else {
        setErrorMsg(data.error || 'Gagal memperbarui API key');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      setErrorMsg('Gagal memperbarui API key');
    }
  };

  const deleteApiKey = async (keyId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus API key ini?')) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/apikeys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        await fetchApiKeys();
        setErrorMsg('');
      } else {
        setErrorMsg(data.error || 'Gagal menghapus API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      setErrorMsg('Gagal menghapus API key');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2500);
  };

  // 🚀 LIVE TEST HIT API
  const handleLiveHitTest = async () => {
    if (!testKeyId) {
      setErrorMsg('Silakan pilih salah satu API Key aktif untuk melakukan test.');
      return;
    }
    try {
      setTestingApi(true);
      setErrorMsg('');
      setTestResult(null);

      // 1. Fetch the real full key
      const keyResp = await fetch(`${apiBaseUrl}/api/apikeys/${testKeyId}/full`, { credentials: 'include' });
      const keyData = await keyResp.json();
      if (!keyData.success || !keyData.fullKey) {
        throw new Error(keyData.error || 'Gagal mengambil secret key untuk testing');
      }
      const realKey = keyData.fullKey;

      // 2. Perform live request to /v1/chat/completions
      const startTime = Date.now();
      const hitResp = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realKey}`
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      const latencyMs = Date.now() - startTime;
      const hitData = await hitResp.json();

      if (!hitResp.ok || hitData.error) {
        const errorDetail = hitData.error?.message || hitData.error || `HTTP ${hitResp.status} Error`;
        setTestResult({
          success: false,
          status: hitResp.status,
          latencyMs,
          error: errorDetail
        });
        return;
      }

      const replyContent = hitData.choices?.[0]?.message?.content || '(Respons kosong)';
      const consumed = hitData.deepernova?.tokens_consumed || hitData.usage?.total_tokens || 0;
      const newRemaining = hitData.deepernova?.remaining_tokens ?? Math.max(0, remainingTokens - consumed);

      setTestResult({
        success: true,
        status: 200,
        latencyMs,
        model: hitData.model || testModel,
        reply: replyContent,
        tokensConsumed: consumed,
        promptTokens: hitData.usage?.prompt_tokens || 0,
        completionTokens: hitData.usage?.completion_tokens || 0,
        remainingTokens: newRemaining
      });

      // Instantly refresh balance in state
      setTokensUsed(prev => prev + consumed);
      setRemainingTokens(newRemaining);
      await fetchApiKeys();

    } catch (err) {
      console.error('[Live Hit Test Error]', err);
      setTestResult({
        success: false,
        status: 500,
        error: err.message || 'Koneksi ke endpoint API gagal.'
      });
    } finally {
      setTestingApi(false);
    }
  };

  const percentageUsed = Math.min(100, Math.round((tokensUsed / (tokenQuota || 1000000)) * 100));

  return (
    <div className="api-marketplace">
      <nav className="api-nav">
        <div className="nav-container">
          <div className="logo">
            <h1>🌟 DeeperNova Gold 1.5 API</h1>
            <span className="tagline">Enterprise High-Speed Cloud AI Gateway</span>
          </div>
          <button className="nav-toggle" onClick={() => setNavOpen((prev) => !prev)} aria-label="Toggle navigation menu" aria-expanded={navOpen}>
            {navOpen ? '×' : '☰'}
          </button>
          <div className={`api-nav-menu ${navOpen ? 'open' : 'collapsed'}`}>
            <button className={`api-nav-btn ${currentPage === 'landing' ? 'active' : ''}`} onClick={() => { setCurrentPage('landing'); setNavOpen(false); }}>Home</button>
            <button className={`api-nav-btn ${currentPage === 'docs' ? 'active' : ''}`} onClick={() => { setCurrentPage('docs'); setNavOpen(false); }}>Dokumentasi</button>
            <button className={`api-nav-btn ${currentPage === 'pricing' ? 'active' : ''}`} onClick={() => { setCurrentPage('pricing'); setNavOpen(false); }}>Pricing</button>
            <button className={`api-nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => { setCurrentPage('dashboard'); setNavOpen(false); }}>Dashboard & Keys</button>
          </div>
          <div className="api-nav-actions">
            {apiKeys.length > 0 ? (
              <button className="btn-logout" onClick={onLogout}>Logout</button>
            ) : (
              <button className="btn-get-started" onClick={() => setShowCreateKeyModal(true)}>Buat API Key</button>
            )}
          </div>
        </div>
      </nav>

      {/* Free 1 Million Token Balance Bar */}
      <div style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        color: '#ffffff',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🎁</span>
          <span>
            <strong>Free Welcome Quota:</strong> 1.000.000 Token (Input + Output)
          </span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            ACTIVE FREE TIER
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            Sisa Saldo: <strong style={{ color: '#38bdf8' }}>{remainingTokens.toLocaleString()} Token</strong> / {tokenQuota.toLocaleString()}
          </div>
          <div style={{
            width: '120px',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.max(5, 100 - percentageUsed)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
              borderRadius: '999px'
            }} />
          </div>
          <button
            onClick={fetchApiKeys}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="content-container">
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            margin: '16px auto',
            maxWidth: '1200px'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            padding: '12px 16px',
            borderRadius: '8px',
            margin: '16px auto',
            maxWidth: '1200px'
          }}>
            ✅ {successMsg}
          </div>
        )}

        {currentPage === 'landing' && (
          <div className="landing-page">
            <div className="hero">
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '800',
                marginBottom: '12px',
                letterSpacing: '0.05em'
              }}>
                🌟 FLAGSHIP CLOUD AI
              </span>
              <h1>DeeperNova Gold 1.5 API</h1>
              <p>Infrastruktur kecerdasan buatan berkecepatan tinggi berskala industri. Dukungan OpenAI format, multimodal vision, streaming instan, dan 1.000.000 token gratis untuk setiap akun terdaftar.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                <button className="btn-get-started" onClick={() => setCurrentPage('dashboard')}>Masuk ke Dashboard & API Keys</button>
                <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px' }} onClick={() => setCurrentPage('docs')}>Lihat Dokumentasi API</button>
              </div>
            </div>

            <div className="features">
              <div className="feature-card">
                <h3>⚡ DeeperNova Gold 1.5</h3>
                <p>Model flagship multimodal vision dengan konteks 128K dan latensi streaming ultra rendah.</p>
              </div>
              <div className="feature-card">
                <h3>🧠 DeeperNova Gold 1.5 Pro</h3>
                <p>Arsitektur 70B untuk penalaran mendalam, analisis data kompleks, logika matematika, dan penulisan kode terstruktur.</p>
              </div>
              <div className="feature-card">
                <h3>🎁 1 Juta Token Gratis</h3>
                <p>Setiap akun mendapatkan kuota gratis 1.000.000 input & output token yang siap digunakan langsung.</p>
              </div>
              <div className="feature-card">
                <h3>🔌 Kompatibel OpenAI</h3>
                <p>Drop-in replacement untuk SDK OpenAI (Python, Node.js, cURL) cukup dengan mengganti baseURL dan Authorization key.</p>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'docs' && (
          <div className="docs-page">
            <h2>Dokumentasi DeeperNova Gold 1.5 API</h2>
            <div className="docs-sidebar docs-nav">
              <button className={`doc-tab ${activeTab === 'getting-started' ? 'active' : ''}`} onClick={() => setActiveTab('getting-started')}>Getting Started</button>
              <button className={`doc-tab ${activeTab === 'authentication' ? 'active' : ''}`} onClick={() => setActiveTab('authentication')}>Autentikasi</button>
              <button className={`doc-tab ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>Pilihan Model</button>
              <button className={`doc-tab ${activeTab === 'chat-api' ? 'active' : ''}`} onClick={() => setActiveTab('chat-api')}>Chat Completions</button>
              <button className={`doc-tab ${activeTab === 'examples' ? 'active' : ''}`} onClick={() => setActiveTab('examples')}>Contoh Kode</button>
            </div>

            <div className="docs-content">
              {activeTab === 'getting-started' && (
                <section>
                  <h3>Memulai Cepat (Quickstart)</h3>
                  <p>DeeperNova Gold 1.5 API menyediakan endpoint yang 100% kompatibel dengan standar OpenAI API.</p>
                  <div className="doc-highlight">
                    <p><strong>Base URL Produksi:</strong></p>
                    <code>{window.location.origin}/v1</code>
                  </div>
                  <h4>Langkah Integrasi:</h4>
                  <ol>
                    <li>Buka tab <strong>Dashboard</strong> untuk melihat atau membuat API Key Anda.</li>
                    <li>Salin API Key rahasia Anda (berawalan <code>deepernova_</code>).</li>
                    <li>Gunakan pada aplikasi Anda dengan header <code>Authorization: Bearer &lt;API_KEY&gt;</code>.</li>
                    <li>Nikmati <strong>1.000.000 token gratis</strong> untuk input & output!</li>
                  </ol>
                </section>
              )}

              {activeTab === 'authentication' && (
                <section>
                  <h3>Autentikasi API Key</h3>
                  <p>Setiap request harus menyertakan API Key pada header HTTP:</p>
                  <div className="code-block">
                    <code>Authorization: Bearer YOUR_DEEPERNOVA_API_KEY</code>
                    <button onClick={() => copyToClipboard('Authorization: Bearer YOUR_DEEPERNOVA_API_KEY', 'auth-header')}>Copy</button>
                  </div>
                  <h4>Header Lengkap:</h4>
                  <pre>{`POST ${window.location.origin}/v1/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_DEEPERNOVA_API_KEY`}</pre>
                </section>
              )}

              {activeTab === 'models' && (
                <section>
                  <h3>Model yang Tersedia</h3>
                  <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h4 style={{ color: '#f59e0b', margin: 0 }}>🌟 deepernova-gold-1.5 (Default)</h4>
                      <p style={{ marginTop: '8px', color: '#cbd5e1' }}>
                        Model multimodal flagship unggulan DeeperNova. Mendukung analisis teks & gambar (vision), streaming super cepat, dan konteks 128K.
                      </p>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h4 style={{ color: '#818cf8', margin: 0 }}>🧠 deepernova-gold-1.5-pro</h4>
                      <p style={{ marginTop: '8px', color: '#cbd5e1' }}>
                        Model penalaran mendalam dan coding (arsitektur 70B). Dirancang khusus untuk tugas logika rumit, penulisan program, debugging, dan analisis komprehensif.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'chat-api' && (
                <section>
                  <h3>Chat Completions Endpoint</h3>
                  <code>POST /v1/chat/completions</code>
                  <h4>Request Payload (JSON):</h4>
                  <pre>{`{
  "model": "deepernova-gold-1.5",
  "messages": [
    { "role": "system", "content": "You are DeeperNova Gold 1.5, a helpful assistant." },
    { "role": "user", "content": "Jelaskan konsep machine learning dalam 2 kalimat." }
  ],
  "temperature": 0.7,
  "max_tokens": 500,
  "stream": false
}`}</pre>
                  <h4>Response Format:</h4>
                  <pre>{`{
  "id": "chatcmpl-deepernova-123",
  "object": "chat.completion",
  "model": "deepernova-gold-1.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Machine learning adalah cabang kecerdasan buatan..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 34,
    "total_tokens": 62
  },
  "deepernova": {
    "tokens_consumed": 62,
    "remaining_tokens": 999938
  }
}`}</pre>
                </section>
              )}

              {activeTab === 'examples' && (
                <section>
                  <h3>Contoh Integrasi Kode</h3>
                  <div className="code-lang-tabs">
                    <button className={`code-lang-btn ${codeLanguage === 'javascript' ? 'active' : ''}`} onClick={() => setCodeLanguage('javascript')}>Node.js / JS</button>
                    <button className={`code-lang-btn ${codeLanguage === 'python' ? 'active' : ''}`} onClick={() => setCodeLanguage('python')}>Python (OpenAI SDK)</button>
                    <button className={`code-lang-btn ${codeLanguage === 'curl' ? 'active' : ''}`} onClick={() => setCodeLanguage('curl')}>cURL</button>
                  </div>

                  {codeLanguage === 'javascript' && (
                    <div className="code-block-wrapper">
                      <pre className="code-block-content">{`// Node.js (fetch / Axios)
const response = await fetch('${window.location.origin}/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'deepernova-gold-1.5',
    messages: [
      { role: 'user', content: 'Halo DeeperNova Gold 1.5!' }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}</pre>
                    </div>
                  )}

                  {codeLanguage === 'python' && (
                    <div className="code-block-wrapper">
                      <pre className="code-block-content">{`# Python dengan OpenAI SDK Resmi
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="${window.location.origin}/v1"
)

response = client.chat.completions.create(
    model="deepernova-gold-1.5",
    messages=[
        {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ]
)

print(response.choices[0].message.content)`}</pre>
                    </div>
                  )}

                  {codeLanguage === 'curl' && (
                    <div className="code-block-wrapper">
                      <pre className="code-block-content">{`curl ${window.location.origin}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "deepernova-gold-1.5",
    "messages": [
      {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ]
  }'`}</pre>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

        {currentPage === 'pricing' && (
          <div className="pricing-page">
            <h2>Transparan & Hemat: DeeperNova Gold 1.5</h2>
            <p>Mulai gratis sekarang dengan 1.000.000 token input & output tanpa kartu kredit.</p>

            <div className="pricing-grid">
              <div className="pricing-card featured" style={{ border: '2px solid #f59e0b' }}>
                <span className="badge" style={{ background: '#f59e0b', color: '#000' }}>GRATIS 1 JUTA TOKEN</span>
                <h3>Free Tier</h3>
                <p className="price">Rp 0 <span>/ akun</span></p>
                <ul>
                  <li><strong>1.000.000 Token Gratis</strong> (Input + Output)</li>
                  <li>Akses DeeperNova Gold 1.5</li>
                  <li>Akses DeeperNova Gold 1.5 Pro</li>
                  <li>Mendukung Multimodal Vision</li>
                  <li>Latency Sub-detik & High Concurrency</li>
                </ul>
                <button className="btn-pricing primary" onClick={() => setCurrentPage('dashboard')}>Gunakan Sekarang</button>
              </div>

              <div className="pricing-card">
                <span className="badge">Developer Pro</span>
                <h3>Top-Up Saldo</h3>
                <p className="price">Rp 2.000 <span>/ 1 Juta Token</span></p>
                <ul>
                  <li>Top up setelah 1 juta token habis</li>
                  <li>Rate limit 5.000 RPM</li>
                  <li>Dedicated Support</li>
                  <li>SLA 99.9% Uptime</li>
                </ul>
                <button className="btn-pricing" onClick={() => alert('Saldo Anda saat ini masih aktif dengan kuota 1 Juta Token Free!')}>Top Up Token</button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'dashboard' && (
          <div className="dashboard-page">
            {/* Top Metrics Banner */}
            <div className="dashboard-hero">
              <div className="dashboard-hero-copy">
                <span className="eyebrow">DeeperNova Cloud Console</span>
                <h2>Dashboard & Live API Management</h2>
                <p>Kelola API Key, pantau saldo gratis 1.000.000 token Anda, dan lakukan pengujian langsung (*live hit*) secara instan.</p>
              </div>
              <div className="dashboard-hero-actions">
                <button className="btn-primary" onClick={() => setShowCreateKeyModal(true)} disabled={loading}>+ Buat API Key Baru</button>
                <button className="btn-secondary" onClick={fetchApiKeys} disabled={loading}>🔄 Refresh Saldo</button>
              </div>
            </div>

            {/* Token Balance Stats Card */}
            <div className="dashboard-metrics-grid">
              <div className="metric-card" style={{ borderTop: '3px solid #10b981' }}>
                <h4>🎁 Saldo Token Gratis</h4>
                <p className="metric-value" style={{ color: '#10b981' }}>{remainingTokens.toLocaleString()}</p>
                <span className="metric-label">Sisa dari kuota 1.000.000 token free</span>
              </div>
              <div className="metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
                <h4>📊 Total Token Digunakan</h4>
                <p className="metric-value" style={{ color: '#f59e0b' }}>{tokensUsed.toLocaleString()}</p>
                <span className="metric-label">Input + Output token yang telah diproses</span>
              </div>
              <div className="metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
                <h4>🔑 Active API Keys</h4>
                <p className="metric-value">{activeKeys} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {totalKeys}</span></p>
                <span className="metric-label">Kredensial aktif siap digunakan</span>
              </div>
              <div className="metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
                <h4>⚡ Model Default</h4>
                <p className="metric-value" style={{ fontSize: '18px' }}>Gold 1.5</p>
                <span className="metric-label">Multimodal Vision & Fast Streaming</span>
              </div>
            </div>

            {/* 🧪 INTERACTIVE LIVE API HIT TESTER */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧪</span> Live API Tester & Real Hit Verification
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                    Kirim request nyata ke endpoint <code>/v1/chat/completions</code> menggunakan API Key Anda. Buktikan pemotongan token dan respons AI secara langsung!
                  </p>
                </div>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ● LIVE ENDPOINT READY
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Pilih API Key Pengujian:
                  </label>
                  <select
                    value={testKeyId}
                    onChange={(e) => setTestKeyId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    {apiKeys.map(k => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.key}) {k.isActive ? '✓ Aktif' : '(Nonaktif)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Pilih Model DeeperNova:
                  </label>
                  <select
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="deepernova-gold-1.5">🌟 DeeperNova Gold 1.5 (Flagship Fast & Vision)</option>
                    <option value="deepernova-gold-1.5-pro">🧠 DeeperNova Gold 1.5 Pro (Deep Reasoning 70B & Code)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                  Prompt Uji Coba:
                </label>
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Ketik pertanyaan untuk menguji respons API..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleLiveHitTest}
                  disabled={testingApi || !testKeyId}
                  style={{
                    background: testingApi ? '#64748b' : 'linear-gradient(90deg, #ea580c, #f97316)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: testingApi ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)'
                  }}
                >
                  {testingApi ? '⏳ Sedang Menghubungi API...' : '🚀 Hit API Sekarang (Kirim Request Nyata)'}
                </button>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Setiap hit akan langsung memotong token dari kuota 1.000.000 Anda.
                </span>
              </div>

              {/* Live Test Result Output Box */}
              {testResult && (
                <div style={{
                  marginTop: '20px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: testResult.success ? '#059669' : '#dc2626',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        HTTP {testResult.status}
                      </span>
                      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                        Latency: <strong>{testResult.latencyMs} ms</strong>
                      </span>
                      {testResult.success && (
                        <span style={{ fontSize: '13px', color: '#38bdf8' }}>
                          Model: <strong>{testResult.model}</strong>
                        </span>
                      )}
                    </div>
                    {testResult.success && (
                      <div style={{ fontSize: '13px', color: '#34d399', fontWeight: '700' }}>
                        🔥 Token Dipotong: {testResult.tokensConsumed} Token (Sisa: {testResult.remainingTokens.toLocaleString()})
                      </div>
                    )}
                  </div>

                  {testResult.success ? (
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>RESPONS DARI DEEPERNOVA:</div>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {testResult.reply}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
                        <span>Input Tokens: <strong>{testResult.promptTokens}</strong></span>
                        <span>Output Tokens: <strong>{testResult.completionTokens}</strong></span>
                        <span>Total: <strong>{testResult.tokensConsumed}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#f87171', fontSize: '14px' }}>
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* API Keys Table */}
            <div className="dashboard-main-grid">
              <section className="dashboard-section dashboard-panel" style={{ width: '100%' }}>
                <div className="section-header">
                  <div>
                    <h3>Daftar API Keys Anda</h3>
                    <p className="section-subtitle">Gunakan kunci ini pada header <code>Authorization: Bearer &lt;KEY&gt;</code> di aplikasi Anda.</p>
                  </div>
                  <button className="btn-primary" onClick={() => setShowCreateKeyModal(true)} disabled={loading}>+ Buat API Key</button>
                </div>

                {loading ? (
                  <p>Memuat data API Keys...</p>
                ) : apiKeys.length === 0 ? (
                  <div className="empty-state-card">
                    <h4>Belum ada API Key</h4>
                    <p>Klik tombol di bawah untuk membuat kunci pertama Anda dan mulai menggunakan DeeperNova Gold 1.5.</p>
                    <button className="btn-primary" onClick={() => setShowCreateKeyModal(true)}>Buat API Key</button>
                  </div>
                ) : (
                  <div className="api-keys-table">
                    <table>
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
                            <td className="key-name"><strong>{key.name}</strong></td>
                            <td className="key-value">
                              <code style={{ background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>{key.key}</code>
                            </td>
                            <td>{(key.tokensUsed || 0).toLocaleString()} token</td>
                            <td>
                              <span className={`status-badge ${key.isActive ? 'active' : 'inactive'}`}>
                                {key.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="key-actions">
                              <button
                                className="btn-small btn-view"
                                onClick={() => copyKeyDirectly(key.id)}
                                title="Salin Secret Key Lengkap"
                              >
                                {copiedText === `key-${key.id}` ? '✓ Tersalin!' : 'Copy'}
                              </button>
                              <button
                                className="btn-small btn-view"
                                onClick={() => viewFullKey(key.id)}
                              >
                                Lihat
                              </button>
                              <button
                                className="btn-small btn-toggle"
                                onClick={() => updateApiKey(key.id, { isActive: !key.isActive })}
                              >
                                {key.isActive ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                className="btn-small btn-delete"
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
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Key */}
      {showCreateKeyModal && (
        <div className="modal-overlay" onClick={() => setShowCreateKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Buat API Key Baru</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Beri nama yang mudah diingat untuk proyek atau aplikasi Anda.
            </p>
            <div className="form-group">
              <label htmlFor="key-name">Nama Kunci (Label)</label>
              <input
                id="key-name"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="misal: Aplikasi Mobile, Production Web, Script Python"
                className="form-input"
                autoFocus
              />
            </div>
            {errorMsg && <div className="error-message">⚠️ {errorMsg}</div>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setShowCreateKeyModal(false); setNewKeyName(''); setErrorMsg(''); }}>Batal</button>
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
            <p style={{ fontSize: '13px', color: '#64748b' }}>Simpan kunci ini di tempat yang aman. Kunci ini terhubung dengan kuota 1 Juta Token gratis Anda.</p>
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
              ⚠️ Jangan bagikan kunci ini ke publik atau simpan di repository publik.
            </p>
            <button className="btn-primary modal-btn" onClick={() => setShowFullKeyModal(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiMarketplace;
