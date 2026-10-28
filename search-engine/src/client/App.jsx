import React, { useState, useEffect, useRef } from 'react';
import PublicSearch from './components/PublicSearch.jsx';
import Header from './components/Header.jsx';
import SearchTab from './components/SearchTab.jsx';
import CrawlerTab from './components/CrawlerTab.jsx';
import EconomicsTab from './components/EconomicsTab.jsx';
import NewsTab from './components/NewsTab.jsx';
import ApiPortalTab from './components/ApiPortalTab.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  // Default to Public White Search Engine (Mode Putih / Clean Minimal View)
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (
        path.startsWith('/admin') ||
        path.startsWith('/crawler') ||
        path.startsWith('/search/admin') ||
        path.startsWith('/search/crawler')
      ) {
        return 'admin';
      }
    }
    return 'public';
  };

  const getInitialAdminTab = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\/search/, '');
      if (path.startsWith('/crawler') || path === '/admin') return 'crawler';
      if (path.startsWith('/economics')) return 'economics';
      if (path.startsWith('/news')) return 'news';
      if (path.startsWith('/api')) return 'api';
    }
    return 'search'; // Default to Search on landing page
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [activeAdminTab, setActiveAdminTab] = useState(getInitialAdminTab);
  const [telemetry, setTelemetry] = useState({
    crawler: { state: 'IDLE', crawledCount: 0, rps: 0, queueSize: 0, activeWorkers: 0, errorCount: 0, uniqueUrlsSeen: 0, activeDomains: 0, avgLatencyMs: 0, successRate: 100 },
    db: { totalPages: 0, totalLinks: 0, totalDomains: 0, topDomains: [] },
    governor: { isPriorityActive: false, mode: 'NORMAL', activeSearches: 0 },
    system: { memoryMb: 0, cpuUptime: 0 }
  });
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const isStealthModeRef = useRef(false);
  isStealthModeRef.current = isStealthMode;
  const currentViewRef = useRef(currentView);
  const lastPublicTelemetryUpdateRef = useRef(0);
  currentViewRef.current = currentView;
  const wsRef = useRef(null);

  const handleToggleStealth = async () => {
    const nextState = !isStealthMode;
    setIsStealthMode(nextState);
    if (nextState) {
      setLogs([]); // clear memory logs immediately
    }
    try {
      await fetch('/api/telemetry/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveLogs: !nextState })
      });
    } catch {}
  };

  // Switch view handler with clean browser history push
  const handleSwitchView = (view) => {
    setCurrentView(view);
    const isHostedUnderSearch = window.location.pathname.startsWith('/search');
    const basePrefix = isHostedUnderSearch ? '/search' : '';
    const newPath = view === 'admin' ? `${basePrefix}/admin` : (basePrefix || '/');
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // WebSocket Connection (used for Admin telemetry and background live sync)
  useEffect(() => {
    let timeoutId = null;
    let pollInterval = null;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.port === '5173' ? `${window.location.hostname}:3000` : window.location.host;
      const wsUrl = `${protocol}//${wsHost}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            const { type, data } = msg;

            if (type === 'init') {
              if (data) {
                setTelemetry(prev => ({
                  ...prev,
                  crawler: data.crawler || prev.crawler,
                  db: data.db || prev.db,
                  system: data.system || prev.system,
                  governor: data.governor || prev.governor
                }));
                if (!isStealthModeRef.current && data.db?.recentLogs && data.db.recentLogs.length > 0) {
                  setLogs(prev => prev.length === 0 ? data.db.recentLogs : prev);
                }
                if (Array.isArray(data.history) && data.history.length > 0) {
                  setHistory(data.history);
                } else if (data.point) {
                  setHistory([data.point]);
                }
              }
            } else if (type === 'telemetry') {
              if (data) {
                const isAdmin = currentViewRef.current === 'admin';
                const now = Date.now();
                if (isAdmin || (now - lastPublicTelemetryUpdateRef.current > 5000)) {
                  lastPublicTelemetryUpdateRef.current = now;
                  setTelemetry(prev => ({
                    ...prev,
                    crawler: data.crawler || prev.crawler,
                    db: data.db || prev.db,
                    system: data.system || prev.system,
                    governor: data.governor || prev.governor
                  }));
                  if (isAdmin && data.point) {
                    setHistory(prev => [...prev.slice(-120), data.point]);
                  }
                }
              }
            } else if (type === 'crawler_status') {
              if (data && currentViewRef.current === 'admin') {
                setTelemetry(prev => ({ ...prev, crawler: data }));
              }
            } else if (type === 'crawl_logs_batch') {
              if (currentViewRef.current === 'admin' && !isStealthModeRef.current && Array.isArray(data) && data.length > 0) {
                const latest = data[data.length - 1];
                setTelemetry(prev => ({
                  ...prev,
                  db: {
                    ...prev.db,
                    totalPages: latest?.totalPages || prev.db?.totalPages || 0
                  },
                  crawler: {
                    ...prev.crawler,
                    crawledCount: latest?.crawledCount || (prev.crawler?.crawledCount || 0) + data.length
                  }
                }));
                setLogs(prev => [...[...data].reverse(), ...prev].slice(0, 50));
              }
            } else if (type === 'crawl_log') {
              if (currentViewRef.current === 'admin' && !isStealthModeRef.current && data) {
                setTelemetry(prev => ({
                  ...prev,
                  db: {
                    ...prev.db,
                    totalPages: data.totalPages || prev.db?.totalPages || 0
                  },
                  crawler: {
                    ...prev.crawler,
                    crawledCount: data.crawledCount || (prev.crawler?.crawledCount || 0) + 1
                  }
                }));
                setLogs(prev => [data, ...prev].slice(0, 50));
              }
            }
          } catch (err) {
            console.error('WS Parse Error:', err);
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          timeoutId = setTimeout(connect, isLocalHost ? 1500 : 15000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('WS Init Error:', err);
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        timeoutId = setTimeout(connect, isLocalHost ? 1500 : 15000);
      }
    }

    connect();

    pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

      fetch('/api/status')
        .then(r => r.json())
        .then(data => {
          if (data) {
            setTelemetry(prev => ({
              ...prev,
              crawler: data.crawler || prev.crawler,
              db: data.db || prev.db,
              system: data.system || prev.system,
              governor: data.governor || prev.governor
            }));
            if (data.db?.recentLogs && data.db.recentLogs.length > 0) {
              setLogs(prev => {
                if (isStealthModeRef.current) return [];
                if (prev.length === 0) return data.db.recentLogs.slice(0, 3);
                const existingUrls = new Set(prev.slice(0, 10).map(l => l.url));
                const newItems = data.db.recentLogs.slice(0, 3).filter(l => !existingUrls.has(l.url));
                if (newItems.length === 0) return prev;
                return [...newItems, ...prev].slice(0, 6);
              });
            }
            if (Array.isArray(data.history) && data.history.length > 0) {
              setHistory(data.history);
            } else if (data.point) {
              setHistory(prev => [...prev.slice(-18000), data.point]);
            }
          }
        })
        .catch(() => {});
    }, 6000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (pollInterval) clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // API Action Handlers
  const handleStartCrawl = async (config) => {
    try {
      const res = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.status) {
        setTelemetry(prev => ({ ...prev, crawler: data.status }));
      }
    } catch (err) {
      console.error('Start Crawl Error:', err);
    }
  };

  const handlePauseCrawl = async () => {
    setTelemetry(prev => ({
      ...prev,
      crawler: { ...prev.crawler, state: 'PAUSED' }
    }));
    const res = await fetch('/api/crawl/pause', { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      setTelemetry(prev => ({ ...prev, crawler: data.status }));
    }
  };

  const handleResumeCrawl = async () => {
    setTelemetry(prev => ({
      ...prev,
      crawler: { ...prev.crawler, state: 'RUNNING' }
    }));
    const res = await fetch('/api/crawl/resume', { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      setTelemetry(prev => ({ ...prev, crawler: data.status }));
    }
  };

  const handleStopCrawl = async () => {
    setTelemetry(prev => ({
      ...prev,
      crawler: { ...prev.crawler, state: 'STOPPED', activeWorkers: 0, rps: 0 }
    }));
    const res = await fetch('/api/crawl/stop', { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      setTelemetry(prev => ({ ...prev, crawler: data.status }));
    }
  };

  const handleRecalcPageRank = async () => {
    const res = await fetch('/api/pagerank/calculate', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`PageRank berhasil dihitung untuk ${data.result.count} halaman dalam ${data.result.durationMs}ms!`);
    }
  };

  const handleResetDb = async () => {
    if (confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA DATA crawler dan indeks pencarian?')) {
      await fetch('/api/database/reset', { method: 'POST' });
      setLogs([]);
      setTelemetry({
        crawler: { state: 'IDLE', crawledCount: 0, rps: 0, queueSize: 0, activeWorkers: 0, errorCount: 0 },
        db: { totalPages: 0, totalLinks: 0, totalDomains: 0, topDomains: [] },
        system: { memoryMb: 0, cpuUptime: 0 }
      });
    }
  };

  // 1. PUBLIC MINIMALIST SEARCH VIEW (Optional toggle)
  if (currentView === 'public') {
    return (
      <ErrorBoundary>
        <PublicSearch 
          onSwitchToAdmin={() => handleSwitchView('admin')} 
          telemetry={telemetry}
        />
      </ErrorBoundary>
    );
  }

  // 2. MATURE HIGH-TECH INTERFACE (Default Landing View)
  return (
    <ErrorBoundary>
      <div className="app-layout">
        <Header
          activeTab={activeAdminTab}
          setActiveTab={setActiveAdminTab}
          telemetry={telemetry}
          isWsConnected={isWsConnected}
          onSwitchToPublic={() => handleSwitchView('public')}
        />

        <main className="main-container">
          {activeAdminTab === 'search' && (
            <SearchTab
              telemetry={telemetry}
              logs={logs}
              onSwitchToCrawler={() => setActiveAdminTab('crawler')}
            />
          )}

          {activeAdminTab === 'crawler' && (
            <CrawlerTab
              telemetry={telemetry}
              logs={logs}
              onClearLogs={() => setLogs([])}
              onStartCrawl={handleStartCrawl}
              onPauseCrawl={handlePauseCrawl}
              onResumeCrawl={handleResumeCrawl}
              onStopCrawl={handleStopCrawl}
              onRecalcPageRank={handleRecalcPageRank}
              onResetDb={handleResetDb}
              isStealthMode={isStealthMode}
              onToggleStealth={handleToggleStealth}
            />
          )}

          {activeAdminTab === 'economics' && (
            <div className="tab-pane-container" style={{ padding: '0.5rem 0' }}>
              <EconomicsTab />
            </div>
          )}

          {activeAdminTab === 'news' && (
            <div className="tab-pane-container" style={{ padding: '0.5rem 0' }}>
              <NewsTab />
            </div>
          )}

          {activeAdminTab === 'api' && (
            <div className="tab-pane-container" style={{ padding: '0.5rem 0' }}>
              <ApiPortalTab />
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
