import React, { useState, useEffect, useMemo } from 'react';
import { 
  Code2, Key, Terminal, Cpu, Copy, Check, Play, Zap, ShieldCheck, 
  Sparkles, ExternalLink, RefreshCw, CheckCircle2, ChevronRight, Globe,
  Layers, BookOpen, Sliders, AlertCircle, ArrowRight, CornerDownRight,
  Eye, EyeOff, Image as ImageIcon, Download, Maximize2, Minimize2, 
  Filter, Search, FileText, X, ChevronDown
} from 'lucide-react';

export default function ApiPortalTab() {
  // Main View Navigation: 'playground' | 'docs' | 'keygen'
  const [activeTab, setActiveTab] = useState('playground');

  // API Key State & Storage
  const [apiKey, setApiKey] = useState('dn_live_free_public_demo');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [activeLang, setActiveLang] = useState('frontend_js');
  const [apiHostMode, setApiHostMode] = useState('auto'); // 'auto' | 'tunnel' | 'local' | 'custom'
  const [customHost, setCustomHost] = useState('');
  const [tunnelInfo, setTunnelInfo] = useState({
    serverTunnel: 'https://drops-lots-tunnel-world.trycloudflare.com',
    clientTunnel: 'https://auto-sales-time-places.trycloudflare.com',
    isFixed: true,
    localUrl: 'http://localhost:3000'
  });

  // Interactive Playground State
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/search');
  const [testMethod, setTestMethod] = useState('GET');
  const [testQuery, setTestQuery] = useState('Presiden Indonesia');
  const [testLimit, setTestLimit] = useState(6);
  const [testTimeFilter, setTestTimeFilter] = useState('all');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);
  const [testLatency, setTestLatency] = useState(null);
  const [testStatusCode, setTestStatusCode] = useState(null);

  // Playground Presentation Mode: 'cards' | 'json' | 'images' | 'ai_context'
  const [resultViewMode, setResultViewMode] = useState('cards');
  const [jsonWrap, setJsonWrap] = useState(true);
  const [jsonSearchFilter, setJsonSearchFilter] = useState('');
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState(null);

  // Load saved key from localStorage on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('deepernova_api_key');
      if (savedKey) {
        setApiKey(savedKey);
      }
    } catch {}
  }, []);

  // Fetch live network and active tunnel info dynamically from server
  useEffect(() => {
    fetch('/api/tunnel/info')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setTunnelInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  // Sync apiKey to localStorage
  const handleApiKeyChange = (newVal) => {
    setApiKey(newVal);
    try {
      if (newVal && newVal.trim()) {
        localStorage.setItem('deepernova_api_key', newVal.trim());
      }
    } catch {}
  };

  // Handle Copy to Clipboard
  const handleCopy = (text, sectionId) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  // Generate New API Key
  const handleGenerateKey = async (e) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() || 'My AI Agent' })
      });
      const data = await res.json();
      if (data.success && data.apiKey) {
        handleApiKeyChange(data.apiKey);
        setKeyName('');
        handleCopy(data.apiKey, 'gen-key');
        setActiveTab('playground');
      }
    } catch (err) {
      console.error('Failed to generate key:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute Live Test in Playground
  const handleRunPlayground = async (overrideQuery = null, overrideEndpoint = null) => {
    const q = overrideQuery != null ? overrideQuery : testQuery;
    const ep = overrideEndpoint != null ? overrideEndpoint : testEndpoint;

    setTestLoading(true);
    setTestResponse(null);
    setTestLatency(null);
    setTestStatusCode(null);

    const t0 = performance.now();
    try {
      let url = `${ep}`;
      let options = {
        method: testMethod,
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'X-API-Key': apiKey.trim()
        }
      };

      if (testMethod === 'GET') {
        const params = new URLSearchParams();
        if (ep !== '/api/v1/health') {
          if (q.trim()) params.append('q', q.trim());
          params.append('limit', String(testLimit));
          if (testTimeFilter !== 'all') params.append('timeFilter', testTimeFilter);
        }
        params.append('api_key', apiKey.trim());
        const qs = params.toString();
        if (qs) url += `?${qs}`;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({
          query: q.trim(),
          limit: testLimit,
          time_filter: testTimeFilter
        });
      }

      const res = await fetch(url, options);
      const elapsed = Math.round((performance.now() - t0) * 10) / 10;
      const data = await res.json();
      
      setTestLatency(elapsed);
      setTestStatusCode(res.status);
      setTestResponse(data);

      if (ep === '/api/v1/images') {
        setResultViewMode('images');
      } else if (ep === '/api/v1/health') {
        setResultViewMode('json');
      } else if (resultViewMode === 'images') {
        setResultViewMode('cards');
      }
    } catch (err) {
      setTestStatusCode(500);
      setTestResponse({ 
        status: 'error', 
        error: 'Network error or server unreachable', 
        details: String(err) 
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Automatically run initial playground request once on load
  useEffect(() => {
    handleRunPlayground();
  }, []);

  // Extract all images from testResponse for the visual gallery
  const extractedImages = useMemo(() => {
    if (!testResponse) return [];
    
    // 1. Direct /api/v1/images endpoint results
    if (testEndpoint === '/api/v1/images' && Array.isArray(testResponse.results)) {
      return testResponse.results.map((img, idx) => ({
        id: img.id || `img-${idx}`,
        url: img.imageUrl || img.url,
        title: img.alt || img.title || 'Image Result',
        domain: img.domain || 'web',
        width: img.width,
        height: img.height,
        isLogo: Boolean(img.isLogo || img.is_logo),
        pageUrl: img.pageUrl || img.sourceUrl
      })).filter(img => Boolean(img.url));
    }

    // 2. /api/v1/search or /api/v1/news results
    const list = [];
    const results = testResponse.results || [];
    results.forEach((item, itemIdx) => {
      if (item.lead_image_url) {
        list.push({
          id: `lead-${itemIdx}`,
          url: item.lead_image_url,
          title: item.title || 'Lead Image',
          domain: item.domain || 'news',
          isLogo: false,
          pageUrl: item.url
        });
      }
      if (item.logo_url) {
        list.push({
          id: `logo-${itemIdx}`,
          url: item.logo_url,
          title: `${item.domain || 'Site'} Brand Logo`,
          domain: item.domain || 'web',
          isLogo: true,
          pageUrl: item.url
        });
      }
      if (Array.isArray(item.images)) {
        item.images.forEach((img, imgIdx) => {
          if (img && img.url) {
            list.push({
              id: `sub-${itemIdx}-${imgIdx}`,
              url: img.url,
              title: img.title || img.alt_text || item.title || 'Extracted Image',
              domain: item.domain || 'web',
              width: img.width,
              height: img.height,
              isLogo: Boolean(img.is_logo),
              pageUrl: item.url
            });
          }
        });
      }
    });

    const seen = new Set();
    return list.filter(img => {
      if (!img.url || seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });
  }, [testResponse, testEndpoint]);

  // Full Formatted JSON string
  const fullJsonString = useMemo(() => {
    if (!testResponse) return '';
    return JSON.stringify(testResponse, null, 2);
  }, [testResponse]);

  // Filtered JSON lines for search in JSON
  const filteredJsonContent = useMemo(() => {
    if (!fullJsonString) return '';
    if (!jsonSearchFilter.trim()) return fullJsonString;

    const term = jsonSearchFilter.toLowerCase();
    const lines = fullJsonString.split('\n');
    return lines
      .filter(line => line.toLowerCase().includes(term))
      .join('\n');
  }, [fullJsonString, jsonSearchFilter]);

  // JSON Syntax Highlighter Helper
  const renderSyntaxJson = (str) => {
    if (!str) return null;
    const escaped = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const highlighted = escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let color = '#38bdf8';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            color = '#7dd3fc'; // key (sky blue)
          } else {
            color = '#4ade80'; // string (emerald green)
          }
        } else if (/true|false/.test(match)) {
          color = '#c084fc'; // boolean (purple)
        } else if (/null/.test(match)) {
          color = '#94a3b8'; // null (slate)
        } else {
          color = '#f59e0b'; // number (amber)
        }
        return `<span style="color:${color}">${match}</span>`;
      }
    );

    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // Download JSON file
  const handleDownloadJson = () => {
    if (!fullJsonString) return;
    const blob = new Blob([fullJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepernova-api-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Dynamic Target API Host Base URL (Intelligent Automatic Detection + Cloudflare Tunnel + Custom Host)
  const currentOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('about:blank') 
    ? window.location.origin 
    : 'http://localhost:3000';
  const isBrowsingViaCloudflare = currentOrigin.includes('trycloudflare.com') || (currentOrigin.startsWith('https://') && !currentOrigin.includes('localhost'));
  
  const liveServerTunnel = tunnelInfo?.serverTunnel || 'https://drops-lots-tunnel-world.trycloudflare.com';

  const targetBaseUrl = useMemo(() => {
    if (apiHostMode === 'custom' && customHost.trim()) {
      return customHost.trim().replace(/\/+$/, '');
    }
    if (apiHostMode === 'local') {
      return currentOrigin.includes('localhost') ? 'http://localhost:3000' : currentOrigin;
    }
    if (apiHostMode === 'tunnel') {
      return liveServerTunnel.replace(/\/+$/, '');
    }
    // 'auto' mode (default):
    // If browsing via Cloudflare client or remote domain, use that active domain!
    // If on localhost, use active Cloudflare server tunnel so external cURL/Python works directly!
    if (isBrowsingViaCloudflare) {
      return currentOrigin;
    }
    return liveServerTunnel;
  }, [apiHostMode, customHost, currentOrigin, isBrowsingViaCloudflare, liveServerTunnel]);

  // Multi-Language & Frontend Code Snippets Generator
  const getCodeSnippet = (lang) => {
    const keyVal = apiKey.trim() || 'dn_live_free_public_demo';
    switch (lang) {
      case 'frontend_js':
        return `// Browser Vanilla JavaScript (CORS Enabled - Siap Hit Langsung dari Frontend Web)
const API_BASE_URL = "${targetBaseUrl}/api/v1";
const API_KEY = "${keyVal}"; // Gratis, atau gunakan 'dn_live_free_public_demo'

async function searchWeb(query) {
  try {
    const url = new URL(\`\${API_BASE_URL}/search\`);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', '5');

    // CORS didukung 100% tanpa perlu proxy backend!
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: Gagal memuat pencarian\`);
    }

    const data = await response.json();
    console.log(\`⚡ Kecepatan Mesin: \${data.duration_ms}ms | Ditemukan: \${data.total_results} hasil\`);
    
    // Iterasi hasil pencarian
    data.results.forEach((item, idx) => {
      console.log(\`[\${idx + 1}] \${item.title} (\${item.url})\`);
    });

    return data;
  } catch (err) {
    console.error('Error saat fetch dari frontend:', err);
  }
}

// Jalankan pencarian langsung dari konsol atau event peramban:
searchWeb('${testQuery}');`;

      case 'frontend_react':
        return `// React / Next.js Component (Client-Side Search dengan Dukungan CORS Penuh)
import React, { useState } from 'react';

const API_ENDPOINT = "${targetBaseUrl}/api/v1/search";
const API_KEY = "${keyVal}";

export function DeeperNovaSearchWidget() {
  const [query, setQuery] = useState('${testQuery}');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Direct Cross-Origin Fetch dari browser klien tanpa backend proxy
      const res = await fetch(\`\${API_ENDPOINT}?q=\${encodeURIComponent(query)}&limit=5\`, {
        headers: {
          'Authorization': \`Bearer \${API_KEY}\`
        }
      });
      const data = await res.json();
      setResults(data.results || []);
      setDuration(data.duration_ms);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari web..."
          style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '0.75rem 1.25rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Mencari...' : 'Cari'}
        </button>
      </form>

      {duration != null && (
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
          ⚡ Respon cepat dalam <strong>{duration}ms</strong>
        </p>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {results.map((item, idx) => (
          <div key={idx} style={{ padding: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>{item.domain}</span>
            <h4 style={{ margin: '0.25rem 0' }}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#0f172a', textDecoration: 'none' }}>
                {item.title}
              </a>
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>{item.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}`;

      case 'frontend_html':
        return `<!-- Simpan kode ini sebagai 'search.html' dan buka langsung di Browser (Chrome / Edge / Firefox) -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeeperNova Frontend Live Search</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 680px; margin: 2.5rem auto; padding: 0 1rem; color: #0f172a; }
    .box { display: flex; gap: 8px; margin-bottom: 12px; }
    input { flex: 1; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; outline: none; }
    button { background: #0284c7; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px; }
    .stat { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
    .card h3 { margin: 4px 0; font-size: 17px; }
    .card a { color: #0284c7; text-decoration: none; }
    .card p { margin: 0; color: #475569; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <h2>DeeperNova Search (Frontend Widget Demo)</h2>
  <div class="box">
    <input type="text" id="qInput" value="${testQuery}" placeholder="Ketik kata kunci..." />
    <button onclick="cari()">Cari Web</button>
  </div>
  <div id="stat" class="stat">Siap melakukan pencarian...</div>
  <div id="results"></div>

  <script>
    async function cari() {
      const q = document.getElementById('qInput').value;
      const stat = document.getElementById('stat');
      const list = document.getElementById('results');
      stat.innerText = '⚡ Mengambil data dari server DeeperNova...';
      list.innerHTML = '';

      try {
        // Direct browser fetch dengan dukungan CORS:
        const response = await fetch(\`${targetBaseUrl}/api/v1/search?q=\${encodeURIComponent(q)}&limit=5\`, {
          headers: {
            'Authorization': 'Bearer ${keyVal}'
          }
        });
        const data = await response.json();
        stat.innerHTML = \`⚡ Selesai dalam <strong>\${data.duration_ms}ms</strong> (Total: \${data.total_results} hasil)\`;

        (data.results || []).forEach(r => {
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = \`
            <small style="color:#0284c7; font-weight:bold;">\${r.domain}</small>
            <h3><a href="\${r.url}" target="_blank">\${r.title}</a></h3>
            <p>\${r.snippet}</p>
          \`;
          list.appendChild(div);
        });
      } catch (err) {
        stat.innerText = 'Error: ' + err.message;
      }
    }
    // Langsung cari saat file dibuka
    cari();
  </script>
</body>
</html>`;

      case 'curl':
        return `# 1. Pencarian Web Super Cepat (Sub-20ms BM25 + AI Context)
curl -X GET "${targetBaseUrl}/api/v1/search?q=${encodeURIComponent(testQuery)}&limit=5" \\
  -H "Authorization: Bearer ${keyVal}"

# 2. Pencarian Berita Nasional Terkini
curl -X GET "${targetBaseUrl}/api/v1/news?q=gempa+bumi&limit=5" \\
  -H "X-API-Key: ${keyVal}"

# 3. Pencarian Gambar & Visual Media
curl -X GET "${targetBaseUrl}/api/v1/images?q=teknologi+ai&limit=8" \\
  -H "Authorization: Bearer ${keyVal}"

# 4. POST Request dengan JSON Body (Ideal untuk Backend & AI Agent)
curl -X POST "${targetBaseUrl}/api/v1/search" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${keyVal}" \\
  -d '{"query": "mobil listrik indonesia", "limit": 5}'`;

      case 'python':
        return `import requests

API_KEY = "${keyVal}"
BASE_URL = "${targetBaseUrl}/api/v1"

def search_deepernova(query: str, limit: int = 5):
    """
    Mencari web menggunakan DeeperNova Search API.
    Mengembalikan hasil berperingkat BM25 + PageRank dan konteks AI (RAG siap pakai).
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "User-Agent": "MyAIAgent/1.0"
    }
    params = {
        "q": query,
        "limit": limit
    }
    
    response = requests.get(f"{BASE_URL}/search", headers=headers, params=params)
    response.raise_for_status()
    data = response.json()
    
    print(f"⚡ Status: {data['status']} | Latensi Mesin: {data.get('duration_ms')}ms")
    print(f"Ditemukan {data.get('total_results')} hasil:\\n")
    
    for item in data.get("results", []):
        print(f"• [{item['domain']}] {item['title']}")
        print(f"  URL: {item['url']}")
        print(f"  Snippet: {item['snippet'][:120]}...\\n")
        
    # ai_context siap langsung dimasukkan ke prompt LLM / RAG:
    return data.get("ai_context")

if __name__ == "__main__":
    ai_context = search_deepernova("${testQuery}", limit=3)
    print("--- RAG AI CONTEXT SIAP INJEKSI LLM ---")
    print(ai_context)`;

      case 'python_async':
        return `import asyncio
import httpx

API_KEY = "${keyVal}"
SEARCH_URL = "${targetBaseUrl}/api/v1/search"

async def async_search(query: str, limit: int = 5):
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"q": query, "limit": limit}
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(SEARCH_URL, headers=headers, params=params)
        res.raise_for_status()
        data = res.json()
        return data

async def main():
    result = await async_search("${testQuery}")
    print(f"⚡ Latency: {result.get('duration_ms')}ms | Total: {result.get('total_results')}")
    for r in result.get('results', []):
        print(f"-> {r['title']} ({r['url']})")

if __name__ == "__main__":
    asyncio.run(main())`;

      case 'javascript':
        return `// Node.js Backend Client (Fetch API)
const API_KEY = '${keyVal}';
const ENDPOINT = '${targetBaseUrl}/api/v1/search';

async function searchDeeperNova(query, limit = 5) {
  const url = new URL(ENDPOINT);
  url.searchParams.append('q', query);
  url.searchParams.append('limit', limit);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(\`Search failed with status: \${response.status}\`);
  }

  const data = await response.json();
  console.log(\`⚡ Engine Latency: \${data.duration_ms}ms\`);
  
  data.results.forEach((item, index) => {
    console.log(\`[\${index + 1}] \${item.title} - \${item.domain}\`);
    console.log(\`    \${item.url}\`);
  });

  return data;
}

searchDeeperNova('${testQuery}');`;

      case 'c':
        return `/* 
 * Program Pencarian C menggunakan libcurl
 * Kompilasi: gcc search_deepernova.c -lcurl -o search_deepernova
 * Jalankan:   ./search_deepernova
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>

struct MemoryStruct {
  char *memory;
  size_t size;
};

static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb, void *userp) {
  size_t realsize = size * nmemb;
  struct MemoryStruct *mem = (struct MemoryStruct *)userp;

  char *ptr = realloc(mem->memory, mem->size + realsize + 1);
  if(!ptr) return 0;

  mem->memory = ptr;
  memcpy(&(mem->memory[mem->size]), contents, realsize);
  mem->size += realsize;
  mem->memory[mem->size] = 0;

  return realsize;
}

int main(void) {
  CURL *curl_handle;
  CURLcode res;
  struct MemoryStruct chunk;

  chunk.memory = malloc(1);
  chunk.size = 0;

  curl_global_init(CURL_GLOBAL_ALL);
  curl_handle = curl_easy_init();

  const char *url = "${targetBaseUrl}/api/v1/search?q=indonesia&limit=3";
  struct curl_slist *headers = NULL;
  headers = curl_slist_append(headers, "Authorization: Bearer ${keyVal}");

  curl_easy_setopt(curl_handle, CURLOPT_URL, url);
  curl_easy_setopt(curl_handle, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl_handle, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
  curl_easy_setopt(curl_handle, CURLOPT_WRITEDATA, (void *)&chunk);
  curl_easy_setopt(curl_handle, CURLOPT_USERAGENT, "libcurl-agent/1.0");

  res = curl_easy_perform(curl_handle);

  if(res != CURLE_OK) {
    fprintf(stderr, "curl_easy_perform() gagal: %s\\n", curl_easy_strerror(res));
  } else {
    printf("⚡ Respons Berhasil Diterima (%lu bytes):\\n%s\\n", (unsigned long)chunk.size, chunk.memory);
  }

  curl_slist_free_all(headers);
  curl_easy_cleanup(curl_handle);
  free(chunk.memory);
  curl_global_cleanup();

  return 0;
}`;

      case 'go':
        return `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type SearchResponse struct {
	Status       string \`json:"status"\`
	DurationMs   float64 \`json:"duration_ms"\`
	TotalResults int    \`json:"total_results"\`
	Results      []struct {
		Title  string \`json:"title"\`
		URL    string \`json:"url"\`
		Domain string \`json:"domain"\`
	} \`json:"results"\`
	AIContext string \`json:"ai_context"\`
}

func main() {
	apiKey := "${keyVal}"
	baseURL := "${targetBaseUrl}/api/v1/search"

	params := url.Values{}
	params.Add("q", "${testQuery}")
	params.Add("limit", "5")

	req, err := http.NewRequest("GET", baseURL+"?"+params.Encode(), nil)
	if err != nil {
		panic(err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var searchRes SearchResponse
	json.Unmarshal(body, &searchRes)

	fmt.Printf("⚡ Latensi: %.2fms | Total Hasil: %d\\n", searchRes.DurationMs, searchRes.TotalResults)
	for i, r := range searchRes.Results {
		fmt.Printf("[%d] %s (%s)\\n", i+1, r.Title, r.URL)
	}
}`;

      case 'ai_tool':
        return `{
  "type": "function",
  "function": {
    "name": "deepernova_web_search",
    "description": "Lakukan pencarian web Indonesia real-time berkecepatan sub-20ms dengan peringkat PageRank + BM25 untuk mendapatkan fakta terkini, berita, dan referensi.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Kata kunci pencarian, topik, atau pertanyaan faktual"
        },
        "limit": {
          "type": "integer",
          "description": "Jumlah hasil yang diinginkan (default 5, maks 20)",
          "default": 5
        }
      },
      "required": ["query"]
    }
  }
}`;

      default:
        return '';
    }
  };

  return (
    <div className="api-portal-container" style={{
      width: '100%',
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0.75rem 0.5rem 3rem 0.5rem',
      color: '#0f172a',
      boxSizing: 'border-box'
    }}>
      {/* ========================================================================= */}
      {/* 1. HERO & SUB-NAVIGATION BAR                                              */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1329 0%, #1e293b 100%)',
        borderRadius: '24px',
        padding: 'clamp(1.25rem, 3vw, 2.25rem)',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Background Glow Accent */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              API v1 Live
            </span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid rgba(52, 211, 153, 0.4)'
            }}>
              <ShieldCheck size={13} /> {tunnelInfo?.isFixed || !targetBaseUrl.includes('trycloudflare.com') ? '🛡️ URL Permanen (Anti-Rotasi)' : 'URL Aktif'}
            </span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Zap size={13} /> Sub-20ms QoS Active
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px'
            }}>
              Free Tier: 120 req/min
            </span>
            <span style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Globe size={13} /> Full Frontend CORS (Direct Browser Hit)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Base URL:</span>
            <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.6rem', borderRadius: '6px', color: '#38bdf8', fontSize: '0.82rem' }}>
              {targetBaseUrl}/api/v1
            </code>
            <button
              type="button"
              onClick={() => handleCopy(`${targetBaseUrl}/api/v1`, 'header-base-url')}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                color: '#cbd5e1',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              title="Salin Base URL API"
            >
              {copiedSection === 'header-base-url' ? <Check size={12} style={{ color: '#4ade80' }} /> : <Copy size={12} />}
              <span>{copiedSection === 'header-base-url' ? 'Tersalin!' : 'Salin'}</span>
            </button>
          </div>
        </div>

        <h1 style={{
          fontSize: 'clamp(1.4rem, 3.2vw, 2.2rem)',
          fontWeight: 800,
          margin: '0 0 0.5rem 0',
          letterSpacing: '-0.02em',
          lineHeight: 1.2
        }}>
          DeeperNova Developer & AI API Studio
        </h1>

        <p style={{
          fontSize: 'clamp(0.88rem, 1.8vw, 1.05rem)',
          color: '#cbd5e1',
          maxWidth: '820px',
          margin: '0 0 1.5rem 0',
          lineHeight: 1.5
        }}>
          Injeksi pencarian web live, berita nasional, dan jutaan gambar terindeks ke dalam AI Agent (OpenAI, Claude, DeepSeek, LangChain) atau aplikasi Anda secara gratis dengan latensi ultra cepat.
        </p>

        {/* TOP LEVEL VIEW NAVIGATION PILLS */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '0.4rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          width: 'fit-content',
          maxWidth: '100%'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'playground' ? '#0284c7' : 'transparent',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '44px'
            }}
          >
            <Play size={16} />
            <span>Playground Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'docs' ? '#0284c7' : 'transparent',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '44px'
            }}
          >
            <Code2 size={16} />
            <span>Dokumentasi Kode & SDK</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keygen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'keygen' ? '#0284c7' : 'transparent',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '44px'
            }}
          >
            <Key size={16} />
            <span>Generate API Key</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: DEDICATED PLAYGROUND STUDIO (TAMPILAN SENDIRI)                  */}
      {/* ========================================================================= */}
      {activeTab === 'playground' && (
        <div className="playground-studio" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SECTION A: API KEY & REQUEST CONTROL STUDIO */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: 'clamp(1.15rem, 2.5vw, 1.75rem)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            
            {/* API KEY INPUT ROW (USER REQUEST: INPUT UNTUK MASUKIN API KEY KITA) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                  <Key size={16} style={{ color: '#0284c7' }} />
                  <span>Kunci API Anda (Otentikasi HTTP):</span>
                </label>

                {/* Status Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {apiKey.trim() === 'dn_live_free_public_demo' ? (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      🟢 Public Demo Key Aktif
                    </span>
                  ) : apiKey.trim().startsWith('dn_live_') ? (
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      🔑 Custom API Key Aktif
                    </span>
                  ) : apiKey.trim() === '' ? (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      ⚠️ Tanpa Key (Unauthorized)
                    </span>
                  ) : (
                    <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      Kunci Khusus
                    </span>
                  )}
                </div>
              </div>

              {/* INPUT BOX WITH ACTION BUTTONS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{
                  flex: '1 1 260px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0 0.75rem',
                  minHeight: '44px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Masukkan API Key Anda (misal: dn_live_... atau dn_live_free_public_demo)"
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      background: 'transparent',
                      padding: '0.5rem 0'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleApiKeyChange('dn_live_free_public_demo')}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Gunakan Demo Key
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('keygen')}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Sparkles size={14} /> Buat Key Baru
                </button>
              </div>
            </div>

            {/* REQUEST PARAMETERS FORM */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem' }}>
              
              {/* Endpoint Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Target Endpoint:
                </label>
                <select
                  value={testEndpoint}
                  onChange={(e) => {
                    const newEp = e.target.value;
                    setTestEndpoint(newEp);
                    if (newEp === '/api/v1/images') {
                      setResultViewMode('images');
                    } else if (newEp === '/api/v1/health') {
                      setResultViewMode('json');
                    } else {
                      setResultViewMode('cards');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                >
                  <option value="/api/v1/search">GET /api/v1/search (Web Search + AI Context)</option>
                  <option value="/api/v1/news">GET /api/v1/news (Berita Nasional Terkini)</option>
                  <option value="/api/v1/images">GET /api/v1/images (Pencarian Gambar & Logo)</option>
                  <option value="/api/v1/health">GET /api/v1/health (Status Mesin & QoS Governor)</option>
                </select>
              </div>

              {/* Method Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Metode HTTP:
                </label>
                <select
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                >
                  <option value="GET">GET (Query String)</option>
                  {testEndpoint === '/api/v1/search' && <option value="POST">POST (JSON Body Payload)</option>}
                </select>
              </div>

              {/* Result Limit */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Batas Hasil (limit):
                </label>
                <select
                  value={testLimit}
                  onChange={(e) => setTestLimit(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    background: '#ffffff',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                >
                  <option value="3">3 hasil (Ultra Ringan)</option>
                  <option value="6">6 hasil (Standar)</option>
                  <option value="12">12 hasil</option>
                  <option value="24">24 hasil</option>
                </select>
              </div>

              {/* Time Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Rentang Waktu:
                </label>
                <select
                  value={testTimeFilter}
                  onChange={(e) => setTestTimeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    background: '#ffffff',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                >
                  <option value="all">Semua Waktu</option>
                  <option value="24h">24 Jam Terakhir</option>
                  <option value="7d">7 Hari Terakhir</option>
                  <option value="30d">30 Hari Terakhir</option>
                </select>
              </div>
            </div>

            {/* QUERY INPUT ROW & QUICK PRESET BUTTONS */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                Kueri Pencarian (q):
              </label>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  flex: '1 1 240px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0 0.85rem',
                  minHeight: '46px'
                }}>
                  <Search size={18} style={{ color: '#94a3b8', marginRight: '0.5rem' }} />
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRunPlayground(); }}
                    placeholder="Ketik kata kunci pencarian..."
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 500
                    }}
                  />
                  {testQuery && (
                    <button
                      type="button"
                      onClick={() => setTestQuery('')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRunPlayground()}
                  disabled={testLoading}
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1.6rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: testLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
                    minHeight: '46px'
                  }}
                >
                  {testLoading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                  <span>{testLoading ? 'Mengambil Data...' : 'Kirim Request (Sub-20ms)'}</span>
                </button>
              </div>

              {/* QUICK SUGGESTIONS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Coba Cepat:</span>
                {[
                  'Presiden Indonesia',
                  'Kecerdasan Buatan AI',
                  'Gempa BMKG',
                  'Danantara Indonesia',
                  'Mobil Listrik',
                  'Pasar Saham IHSG'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTestQuery(preset);
                      handleRunPlayground(preset);
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION B: RESPONSE STUDIO DISPLAY (JSON PENUH & GAMBAR) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* RESPONSE METRICS & TAB SWITCHER BAR */}
            <div style={{
              background: '#0f172a',
              color: '#f8fafc',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              borderBottom: '1px solid #1e293b'
            }}>
              {/* Left: View Mode Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                
                {/* TAB 1: GAMBAR & MEDIA VISUAL */}
                <button
                  type="button"
                  onClick={() => setResultViewMode('images')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: resultViewMode === 'images' ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '36px'
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Galeri Gambar & Media</span>
                  <span style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {extractedImages.length}
                  </span>
                </button>

                {/* TAB 2: JSON RESPON PENUH */}
                <button
                  type="button"
                  onClick={() => setResultViewMode('json')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: resultViewMode === 'json' ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '36px'
                  }}
                >
                  <Code2 size={14} />
                  <span>JSON Respons Penuh</span>
                  {fullJsonString && (
                    <span style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {(fullJsonString.length / 1024).toFixed(1)} KB
                    </span>
                  )}
                </button>

                {/* TAB 3: KARTU HASIL PENCARIAN */}
                <button
                  type="button"
                  onClick={() => setResultViewMode('cards')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: resultViewMode === 'cards' ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '36px'
                  }}
                >
                  <Layers size={14} />
                  <span>Kartu Hasil Web & Berita</span>
                </button>

                {/* TAB 4: RAG AI CONTEXT MARKDOWN */}
                {testResponse?.ai_context && (
                  <button
                    type="button"
                    onClick={() => setResultViewMode('ai_context')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: resultViewMode === 'ai_context' ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: '36px'
                    }}
                  >
                    <Sparkles size={14} style={{ color: '#facc15' }} />
                    <span>AI RAG Context</span>
                  </button>
                )}
              </div>

              {/* Right: Response Telemetry Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {testStatusCode && (
                  <span style={{
                    background: testStatusCode === 200 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: testStatusCode === 200 ? '#4ade80' : '#f87171',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    border: testStatusCode === 200 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                  }}>
                    HTTP {testStatusCode} {testStatusCode === 200 ? 'OK' : 'Error'}
                  </span>
                )}

                {testResponse?.duration_ms != null && (
                  <span style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px'
                  }}>
                    ⚡ Mesin: {testResponse.duration_ms}ms
                  </span>
                )}

                {testLatency != null && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontSize: '0.78rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px'
                  }}>
                    Client RTT: {testLatency}ms
                  </span>
                )}

                {testResponse?.total_results != null && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px'
                  }}>
                    Total: {testResponse.total_results}
                  </span>
                )}
              </div>
            </div>

            {/* RESPONSE CONTENT BODY */}
            <div style={{ padding: '1.25rem', minHeight: '360px', background: '#fafafa' }}>
              
              {/* ------------------------------------------------------------------- */}
              {/* VIEW 1: VISUAL IMAGE GALLERY                                       */}
              {/* ------------------------------------------------------------------- */}
              {resultViewMode === 'images' && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        Pratinjau Galeri Gambar Terindeks
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                        Ditemukan <strong>{extractedImages.length} aset gambar & logo</strong> dari query ini.
                      </p>
                    </div>

                    {testEndpoint !== '/api/v1/images' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTestEndpoint('/api/v1/images');
                          handleRunPlayground(testQuery, '/api/v1/images');
                        }}
                        style={{
                          background: '#f1f5f9',
                          color: '#0284c7',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <ImageIcon size={13} />
                        Cari Khusus di /api/v1/images
                      </button>
                    )}
                  </div>

                  {extractedImages.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
                      gap: '1rem'
                    }}>
                      {extractedImages.map((img) => (
                        <div
                          key={img.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                        >
                          {/* Image Thumbnail Container */}
                          <div 
                            onClick={() => setSelectedImageModal(img)}
                            style={{
                              position: 'relative',
                              width: '100%',
                              paddingTop: '65%',
                              background: '#f1f5f9',
                              cursor: 'pointer',
                              overflow: 'hidden'
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.opacity = '0.3';
                              }}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: img.isLogo ? 'contain' : 'cover',
                                padding: img.isLogo ? '12px' : 0,
                                transition: 'transform 0.3s ease'
                              }}
                            />
                            
                            {img.isLogo && (
                              <span style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(15, 23, 42, 0.85)',
                                color: '#38bdf8',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                LOGO
                              </span>
                            )}
                          </div>

                          {/* Image Metadata Info */}
                          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                                <Globe size={11} style={{ color: '#94a3b8' }} />
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                  {img.domain}
                                </span>
                              </div>
                              <p style={{
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebKitLineClamp: 2,
                                WebKitBoxOrient: 'vertical',
                                lineHeight: 1.3
                              }}>
                                {img.title}
                              </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedImageModal(img)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                Perbesar
                              </button>

                              <a
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#64748b',
                                  textDecoration: 'none',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                              >
                                <span>Buka</span>
                                <ExternalLink size={11} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1.5rem',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto'
                      }}>
                        <ImageIcon size={28} />
                      </div>
                      <h4 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                        Tidak Ada Gambar pada Respon Ini
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
                        Endpoint <code>{testEndpoint}</code> untuk kata kunci ini tidak mengembalikan gambar langsung. Coba beralih ke endpoint khusus gambar kami.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTestEndpoint('/api/v1/images');
                          handleRunPlayground(testQuery, '/api/v1/images');
                        }}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '0.65rem 1.25rem',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <ImageIcon size={15} />
                        Cari Gambar dengan /api/v1/images
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* VIEW 2: FULL JSON VIEWER (USER REQUEST: LIAT HASIL JSON PENUH)     */}
              {/* ------------------------------------------------------------------- */}
              {resultViewMode === 'json' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {/* JSON Controls Toolbar */}
                  <div style={{
                    background: '#1e293b',
                    borderRadius: '12px',
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    color: '#cbd5e1'
                  }}>
                    {/* Search inside JSON */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '8px',
                      padding: '0 0.6rem',
                      minHeight: '34px',
                      flex: '1 1 200px',
                      maxWidth: '350px'
                    }}>
                      <Filter size={13} style={{ color: '#94a3b8', marginRight: '0.4rem' }} />
                      <input
                        type="text"
                        value={jsonSearchFilter}
                        onChange={(e) => setJsonSearchFilter(e.target.value)}
                        placeholder="Filter baris JSON (cari key / value)..."
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#f8fafc',
                          fontSize: '0.8rem',
                          width: '100%'
                        }}
                      />
                      {jsonSearchFilter && (
                        <button
                          type="button"
                          onClick={() => setJsonSearchFilter('')}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Toolbar Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setJsonWrap(!jsonWrap)}
                        style={{
                          background: jsonWrap ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Wrap: {jsonWrap ? 'ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {isJsonExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        <span>{isJsonExpanded ? 'Kecilkan' : 'Perbesar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(fullJsonString, 'full-json')}
                        style={{
                          background: copiedSection === 'full-json' ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {copiedSection === 'full-json' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedSection === 'full-json' ? 'Tersalin!' : 'Salin Semua JSON'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadJson}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Download size={13} />
                        <span>Download .json</span>
                      </button>
                    </div>
                  </div>

                  {/* High-Contrast Syntax-Highlighted JSON Viewer */}
                  <div style={{
                    background: '#0a0e1a',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    color: '#f8fafc',
                    fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
                    fontSize: '0.84rem',
                    lineHeight: 1.55,
                    maxHeight: isJsonExpanded ? '850px' : '520px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    border: '1px solid #1e293b',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    <pre style={{
                      margin: 0,
                      whiteSpace: jsonWrap ? 'pre-wrap' : 'pre',
                      wordBreak: jsonWrap ? 'break-word' : 'normal'
                    }}>
                      {testResponse ? (
                        renderSyntaxJson(filteredJsonContent)
                      ) : (
                        <span style={{ color: '#64748b' }}>
                          // Tekan tombol "Kirim Request" di atas untuk memuat respons JSON live...
                        </span>
                      )}
                    </pre>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* VIEW 3: STRUCTURED SEARCH RESULT CARDS                             */}
              {/* ------------------------------------------------------------------- */}
              {resultViewMode === 'cards' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {testLoading ? (
                    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                      <RefreshCw size={28} style={{ color: '#0284c7', margin: '0 auto 0.75rem auto', animation: 'spin 1s linear infinite' }} />
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>Memuat Hasil API Live...</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Mengambil respon dari {testEndpoint}</div>
                    </div>
                  ) : testResponse?.status === 'error' ? (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      color: '#991b1b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                        <AlertCircle size={20} style={{ color: '#dc2626' }} />
                        <span>Respon API Error (Status {testStatusCode || 500})</span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                        {testResponse.error || 'Terjadi kesalahan saat memanggil endpoint API.'}
                      </div>
                      {testResponse.details && (
                        <pre style={{ background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', overflowX: 'auto' }}>
                          {testResponse.details}
                        </pre>
                      )}
                    </div>
                  ) : testResponse?.results && testResponse.results.length > 0 ? (
                    testResponse.results.map((item, idx) => {
                      const safeDate = item.published_at ? (() => {
                        try {
                          const d = new Date(item.published_at);
                          return !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : null;
                        } catch {
                          return null;
                        }
                      })() : null;

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            padding: '1.15rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {item.logo_url ? (
                                <img src={item.logo_url} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <Globe size={14} style={{ color: '#94a3b8' }} />
                              )}
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                                {item.domain || 'web'}
                              </span>
                              {safeDate && (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                  • {safeDate}
                                </span>
                              )}
                              {item.trust_score != null && (
                                <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '6px', fontWeight: 600 }}>
                                  Trust: {item.trust_score}
                                </span>
                              )}
                              {item.pagerank != null && (
                                <span style={{ fontSize: '0.72rem', background: '#f0f9ff', color: '#0284c7', padding: '1px 6px', borderRadius: '6px', fontWeight: 600 }}>
                                  PR: {Number(item.pagerank).toFixed(2)}
                                </span>
                              )}
                            </div>

                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#0284c7',
                                fontSize: '0.78rem',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.url}
                              </span>
                              <ExternalLink size={12} />
                            </a>
                          </div>

                          <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.05rem', color: '#0f172a' }}>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#0f172a', textDecoration: 'none' }}
                              dangerouslySetInnerHTML={{ __html: item.title || item.rawTitle || item.url || 'Tanpa Judul' }}
                            />
                          </h4>

                          <p
                            style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}
                            dangerouslySetInnerHTML={{ __html: item.snippet || item.description || 'Tidak ada ringkasan snippet tersedia.' }}
                          />
                        </div>
                      );
                    })
                  ) : testResponse ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                      <Layers size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem auto' }} />
                      <div style={{ fontWeight: 600, color: '#334155' }}>Tidak ada hasil terstruktur untuk query ini.</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>Coba ubah kata kunci atau beralih ke tab JSON Respons Penuh.</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                      <Layers size={32} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>Siap Menguji Endpoint API</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', margin: '0.4rem auto 0 auto' }}>
                        Tekan tombol <strong>"Kirim Request"</strong> di atas untuk memanggil API secara live dan melihat kartu hasil pencarian terstruktur.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* VIEW 4: AI RAG CONTEXT MARKDOWN                                    */}
              {/* ------------------------------------------------------------------- */}
              {resultViewMode === 'ai_context' && testResponse?.ai_context && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f1f5f9',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      Markdown Context RAG (Siap Di-paste ke Prompt LLM):
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(testResponse.ai_context, 'ai-ctx')}
                      style={{
                        background: copiedSection === 'ai-ctx' ? '#22c55e' : '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {copiedSection === 'ai-ctx' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedSection === 'ai-ctx' ? 'Tersalin!' : 'Salin AI Context'}</span>
                    </button>
                  </div>

                  <div style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    color: '#0f172a',
                    maxHeight: '500px',
                    overflowY: 'auto'
                  }}>
                    {testResponse.ai_context}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB 2: DOKUMENTASI KODE & SDK                                         */}
      {/* ========================================================================= */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: 'clamp(1.15rem, 2.5vw, 1.75rem)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    padding: '0.5rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Code2 size={20} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Dokumentasi Kode & SDK
                  </h2>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  Contoh integrasi lengkap siap salin (copy-paste) dalam berbagai bahasa pemrograman:
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(getCodeSnippet(activeLang), 'code-snippet')}
                style={{
                  background: copiedSection === 'code-snippet' ? '#22c55e' : '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  minHeight: '40px'
                }}
              >
                {copiedSection === 'code-snippet' ? <Check size={14} /> : <Copy size={14} />}
                {copiedSection === 'code-snippet' ? 'Kode Disalin!' : 'Salin Kode'}
              </button>
            </div>

            {/* TARGET HOST SELECTOR FOR FRONTEND INTEGRATION */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={16} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    Pilih Target Domain / Base URL:
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setApiHostMode('auto')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: apiHostMode === 'auto' ? '#0284c7' : '#cbd5e1',
                      background: apiHostMode === 'auto' ? '#0284c7' : '#ffffff',
                      color: apiHostMode === 'auto' ? '#ffffff' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Menggunakan domain otomatis sesuai browser saat ini"
                  >
                    ⚡ Otomatis ({currentOrigin.replace(/^https?:\/\//, '').slice(0, 18)}...)
                  </button>

                  <button
                    type="button"
                    onClick={() => setApiHostMode('tunnel')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: apiHostMode === 'tunnel' ? '#0284c7' : '#cbd5e1',
                      background: apiHostMode === 'tunnel' ? '#0284c7' : '#ffffff',
                      color: apiHostMode === 'tunnel' ? '#ffffff' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Direct Public Server Tunnel URL (Permanen)"
                  >
                    🌐 URL Publik Permanen
                  </button>

                  <button
                    type="button"
                    onClick={() => setApiHostMode('local')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: apiHostMode === 'local' ? '#0284c7' : '#cbd5e1',
                      background: apiHostMode === 'local' ? '#0284c7' : '#ffffff',
                      color: apiHostMode === 'local' ? '#ffffff' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    💻 Localhost (3000)
                  </button>

                  <button
                    type="button"
                    onClick={() => setApiHostMode('custom')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: apiHostMode === 'custom' ? '#0284c7' : '#cbd5e1',
                      background: apiHostMode === 'custom' ? '#0284c7' : '#ffffff',
                      color: apiHostMode === 'custom' ? '#ffffff' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Kustom URL
                  </button>
                </div>
              </div>

              {/* ACTIVE URL DISPLAY & CUSTOM INPUT */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                background: '#ffffff',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                {apiHostMode === 'custom' ? (
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="Masukkan domain/IP, misal: https://api.domainanda.com"
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #94a3b8',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Base URL Aktif dalam Kode:</span>
                    <code style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7' }}>
                      {targetBaseUrl}/api/v1
                    </code>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleCopy(`${targetBaseUrl}/api/v1`, 'code-base-url')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  {copiedSection === 'code-base-url' ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
                  <span>{copiedSection === 'code-base-url' ? 'Tersalin!' : 'Salin Base URL'}</span>
                </button>
              </div>
            </div>

            {/* CORS NOTICE BANNER */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: '#166534'
            }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span>
                <strong>Dukungan Frontend CORS 100% Aktif:</strong> Pengguna lain dapat langsung memanggil API ini dari peramban web mana saja (React, Next.js, Vue, Svelte, script HTML) tanpa terhalang error CORS dan tanpa perlu backend proxy!
              </span>
            </div>

            {/* LANGUAGE TABS */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '1rem',
              WebkitOverflowScrolling: 'touch'
            }}>
              {[
                { id: 'frontend_js', label: '🌐 Browser JS (Fetch / CORS)' },
                { id: 'frontend_react', label: '⚛️ React / Next.js Component' },
                { id: 'frontend_html', label: '📄 HTML Widget Standalone' },
                { id: 'curl', label: 'cURL (Terminal)' },
                { id: 'python', label: 'Python (requests)' },
                { id: 'python_async', label: 'Python (httpx)' },
                { id: 'javascript', label: 'Node.js (Backend)' },
                { id: 'c', label: 'C (libcurl)' },
                { id: 'go', label: 'Go (Golang)' },
                { id: 'ai_tool', label: '🤖 AI Agent Tool Schema' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLang(tab.id)}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeLang === tab.id ? '#0284c7' : '#f1f5f9',
                    color: activeLang === tab.id ? '#ffffff' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    minHeight: '38px'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CODE DISPLAY BLOCK */}
            <div style={{
              background: '#090d16',
              borderRadius: '14px',
              padding: '1.25rem',
              color: '#e2e8f0',
              fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
              fontSize: '0.88rem',
              overflowX: 'auto',
              lineHeight: 1.6,
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
              WebkitOverflowScrolling: 'touch'
            }}>
              <pre style={{ margin: 0 }}>
                <code>{getCodeSnippet(activeLang)}</code>
              </pre>
            </div>
          </div>

          {/* ENDPOINTS REFERENCE TABLE */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: 'clamp(1.15rem, 2.5vw, 1.75rem)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                background: '#ede9fe',
                color: '#7c3aed',
                padding: '0.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={20} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Referensi Endpoint & Parameter
              </h2>
            </div>

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.88rem',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Endpoint</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Method</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Deskripsi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Parameter Utama</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                      /api/v1/search
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>GET / POST</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      Pencarian web berkecepatan tinggi dengan BM25, PageRank, dan context AI RAG.
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      <code>q</code> (wajib), <code>limit</code> (1-50), <code>page</code>, <code>timeFilter</code>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                      /api/v1/news
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>GET</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      Pencarian berita terkini langsung dari 50+ media nasional & RSS feeds.
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      <code>q</code>, <code>limit</code>, <code>sort</code> ('latest' | 'relevance')
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                      /api/v1/images
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>GET</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      Pencarian gambar, ilustrasi, dan logo situs web terindeks.
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      <code>q</code> (wajib), <code>limit</code> (1-50), <code>page</code>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                      /api/v1/health
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>GET</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      Cek status operasional mesin pencari dan status QoS Priority Governor.
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      Tidak memerlukan parameter.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 3: GENERATE API KEY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'keygen' && (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: 'clamp(1.5rem, 3vw, 2.25rem)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                background: '#e0f2fe',
                color: '#0284c7',
                padding: '0.65rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Key size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Buat Kunci API Baru Gratis
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Langsung aktif tanpa kartu kredit. Kuota 120 req/menit gratis selamanya.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Nama Aplikasi / Nama Agent:
                </label>
                <input
                  type="text"
                  placeholder="Misal: My LangChain Agent / Web App"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                  minHeight: '46px'
                }}
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Membuat Kunci...' : 'Generate API Key Sekarang'}
              </button>
            </form>

            {/* Current Active Key Preview */}
            <div style={{
              marginTop: '0.5rem',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                Kunci Aktif Saat Ini:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{
                  flex: 1,
                  background: '#ffffff',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#0284c7',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {apiKey}
                </code>

                <button
                  type="button"
                  onClick={() => handleCopy(apiKey, 'active-key-view')}
                  style={{
                    background: copiedSection === 'active-key-view' ? '#22c55e' : '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {copiedSection === 'active-key-view' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('playground')}
                style={{
                  marginTop: '0.5rem',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>Buka di Playground Studio untuk Pengujian</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. IMAGE LIGHTBOX MODAL                                                   */}
      {/* ========================================================================= */}
      {selectedImageModal && (
        <div 
          onClick={() => setSelectedImageModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a',
              borderRadius: '20px',
              maxWidth: '900px',
              width: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedImageModal.title}
              </span>
              <button
                type="button"
                onClick={() => setSelectedImageModal(null)}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000000',
              maxHeight: '65vh',
              overflow: 'hidden'
            }}>
              <img
                src={selectedImageModal.url}
                alt={selectedImageModal.title}
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              background: '#1e293b',
              color: '#cbd5e1',
              fontSize: '0.85rem'
            }}>
              <div>
                <span>Sumber: <strong>{selectedImageModal.domain}</strong></span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedImageModal.url, 'modal-url')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {copiedSection === 'modal-url' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSection === 'modal-url' ? 'URL Disalin' : 'Salin URL'}</span>
                </button>

                <a
                  href={selectedImageModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span>Buka Asli</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
