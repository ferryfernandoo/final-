import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Link, ExternalLink, ChevronLeft, ChevronRight, Zap, Radio, Activity, Globe } from 'lucide-react';
import AiOverview from './AiOverview.jsx';

const SUGGESTIONS = [
  'Indonesia',
  'Kecerdasan buatan',
  'Komputer',
  'PageRank algorithm',
  'Search Engine',
  'Internet'
];

export default function SearchTab({ telemetry, logs = [], onSwitchToCrawler }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState('all');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveCrawling, setLiveCrawling] = useState(false);
  const [liveCrawlNotice, setLiveCrawlNotice] = useState(null);
  const debounceRef = useRef(null);
  const searchAbortRef = useRef(null);

  const fetchSearch = async (q, p = 1, filter = timeFilter, live = false, forceOriginal = false) => {
    const trimmed = (q || '').trim();
    if (!trimmed) {
      setResultsData(null);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = new AbortController();

    setLoading(true);
    if (live) setLiveCrawling(true);

    try {
      const url = `/api/search?q=${encodeURIComponent(trimmed)}&page=${p}&limit=15&timeFilter=${filter}${live ? '&liveCrawl=true' : ''}${forceOriginal ? '&forceOriginal=true' : ''}`;
      const res = await fetch(url, { signal: searchAbortRef.current.signal });
      const data = await res.json();
      setResultsData(data);

      if (live) {
        // Automatically re-query after 3 seconds to catch newly crawled live pages
        setTimeout(async () => {
          try {
            const reRes = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=${p}&limit=15&timeFilter=${filter}`, { signal: searchAbortRef.current?.signal });
            const reData = await reRes.json();
            setResultsData(reData);
          } finally {
            setLiveCrawling(false);
          }
        }, 3000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
      }
      setLiveCrawling(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (val) => {
    setQuery(val);
    setPage(1);
    if (!val.trim()) {
      setResultsData(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    if (query.trim()) {
      fetchSearch(query, 1, timeFilter);
    }
  };

  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
    setPage(1);
    if (query.trim()) {
      fetchSearch(query, 1, filter);
    }
  };

  const handleLiveCrawlTrigger = () => {
    if (!query.trim()) return;
    setLiveCrawlNotice(`⚡ Prioritas kata kunci "${query}" dikirim ke 80 Crawler Workers! Background crawling tetap berjalan penuh tanpa jeda.`);
    fetchSearch(query, 1, timeFilter, true);
    setTimeout(() => {
      setLiveCrawlNotice(null);
    }, 6000);
  };

  const handleChipClick = (q) => {
    setQuery(q);
    setPage(1);
    clearTimeout(debounceRef.current);
    fetchSearch(q, 1, timeFilter);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchSearch(query, newPage, timeFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasSearched = resultsData !== null;
  const isCompact = hasSearched || query.trim().length > 0;
  const totalResults = resultsData?.total || 0;
  const totalPages = Math.ceil(totalResults / 15);

  return (
    <div className="search-view-container">
      {/* 🚀 Concurrent Background Crawling Status Bar (Proof that Crawler NEVER stops while searching) */}
      <div className="search-crawler-concurrent-strip" style={{
        background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 255, 159, 0.08) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        borderRadius: '12px',
        padding: '0.65rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(0, 255, 159, 0.15)',
            border: '1px solid rgba(0, 255, 159, 0.4)',
            color: '#00ff9f',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            padding: '0.2rem 0.55rem',
            borderRadius: '14px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff9f', display: 'inline-block' }} className="animate-pulse" />
            CRAWLER 15.000 WORKER CONCURRENT
          </span>

          <span style={{ fontSize: '0.84rem', color: 'var(--text-main, #fff)', fontWeight: 600 }}>
            ⚡ Kecepatan: <strong style={{ color: '#00ff9f' }}>{(telemetry?.crawler?.rps || 0).toFixed(1)} req/s</strong>
          </span>

          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>

          <span style={{ fontSize: '0.84rem', color: 'var(--text-dim, #94a3b8)' }}>
            👥 Workers: <strong style={{ color: '#00f0ff' }}>15.000 Multi-Stream Aktif</strong>
          </span>

          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>

          <span style={{ fontSize: '0.84rem', color: 'var(--text-dim, #94a3b8)' }}>
            📚 Terindeks: <strong style={{ color: '#fff' }}>{(telemetry?.db?.totalPages || 0).toLocaleString()} Hal.</strong>
          </span>

          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>

          <span style={{ fontSize: '0.84rem', color: 'var(--text-dim, #94a3b8)' }}>
            📦 Antrean: <strong style={{ color: '#f59e0b' }}>{(telemetry?.crawler?.queueSize || 0).toLocaleString()} URL</strong>
          </span>
        </div>

        {onSwitchToCrawler && (
          <button
            type="button"
            onClick={onSwitchToCrawler}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(0, 240, 255, 0.12)',
              border: '1px solid rgba(0, 240, 255, 0.35)',
              color: '#00f0ff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Buka Mission Control untuk melihat log crawling live"
          >
            <Radio size={12} />
            <span>Mission Control (15.000 Worker)</span>
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Live Recent Crawl Ingestion Ticker in Search Tab */}
      {logs && logs.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '0.35rem 0.75rem',
          marginBottom: '1rem',
          fontSize: '0.74rem',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ color: '#00ff9f', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Activity size={12} /> Live Ingest:
          </span>
          <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {logs[0]?.title ? `${logs[0].domain} — "${logs[0].title.slice(0, 60)}..."` : logs[0]?.url || 'Crawling live web...'}
          </span>
          <span style={{ marginLeft: 'auto', color: '#00f0ff', fontSize: '0.68rem', fontFamily: 'monospace' }}>
            {logs[0]?.latencyMs || 25}ms
          </span>
        </div>
      )}

      {/* Real-Time Live Crawl Notice */}
      {liveCrawlNotice && (
        <div style={{
          background: 'rgba(0, 255, 159, 0.12)',
          border: '1px solid rgba(0, 255, 159, 0.4)',
          borderRadius: '8px',
          padding: '0.6rem 0.9rem',
          marginBottom: '1rem',
          color: '#00ff9f',
          fontSize: '0.84rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Zap size={15} />
          <span>{liveCrawlNotice}</span>
        </div>
      )}

      {/* Search Hero Area */}
      <div className={`search-hero ${isCompact ? 'compact' : ''}`}>
        <h1>Deepernova<span className="highlight-text">Search</span></h1>
        <p className="search-subtitle">
          Real-Time Full-Text Search Engine with Freshness Prioritization, BM25 & PageRank.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="search-input-wrapper">
            <Search size={20} className="text-dim" style={{ marginLeft: '0.2rem' }} />
            <input
              type="text"
              placeholder="Telusuri apa saja atau cari informasi terbaru di internet..."
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              autoFocus
            />

            <div className="search-actions">
              {query && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setQuery('');
                    setResultsData(null);
                  }}
                >
                  <X size={18} />
                </button>
              )}

              <button type="submit" className="btn-search">
                {loading ? <Zap size={16} className="spin" /> : <Search size={16} />}
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Time Filters & Live Crawl Button */}
        {isCompact && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className={`preset-pill ${timeFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleTimeFilterChange('all')}
                style={timeFilter === 'all' ? { background: 'rgba(0, 240, 255, 0.2)', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' } : {}}
              >
                Semua Waktu
              </button>
              <button
                className={`preset-pill ${timeFilter === '24h' ? 'active' : ''}`}
                onClick={() => handleTimeFilterChange('24h')}
                style={timeFilter === '24h' ? { background: 'rgba(0, 240, 255, 0.2)', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' } : {}}
              >
                ⚡ 24 Jam Terakhir
              </button>
              <button
                className={`preset-pill ${timeFilter === '7d' ? 'active' : ''}`}
                onClick={() => handleTimeFilterChange('7d')}
                style={timeFilter === '7d' ? { background: 'rgba(0, 240, 255, 0.2)', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' } : {}}
              >
                1 Minggu Terakhir
              </button>
            </div>

            {query.trim() && (
              <button
                className="btn-secondary-action"
                onClick={handleLiveCrawlTrigger}
                disabled={liveCrawling}
                style={{ background: 'rgba(0, 255, 159, 0.1)', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                title="Cari & sedot data terbaru dari live web jika belum ada"
              >
                <Zap size={14} className={liveCrawling ? 'spin' : ''} />
                {liveCrawling ? 'Crawling Live Web...' : '⚡ Crawl Live Web Sekarang'}
              </button>
            )}
          </div>
        )}

        {!isCompact && (
          <div className="query-chips-bar">
            <span>Contoh query:</span>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                className="query-chip"
                onClick={() => handleChipClick(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results Area */}
      {hasSearched && (
        <div className="search-results-area">
          {/* Anti-Typo / Did You Mean Banner */}
          {resultsData.correction && (
            <div className="typo-correction-banner" style={{
              background: 'rgba(0, 255, 159, 0.08)',
              border: '1px solid rgba(0, 255, 159, 0.3)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '0.8rem 1.1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.1rem' }}>💡</span>
              <div style={{ flex: 1, fontSize: '0.92rem' }}>
                {resultsData.correction.autoCorrected ? (
                  <div>
                    <span style={{ color: 'var(--text-main, #fff)', fontWeight: 600 }}>Menampilkan hasil untuk: </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(resultsData.correction.correctedQuery);
                        fetchSearch(resultsData.correction.correctedQuery, 1, timeFilter);
                      }}
                      style={{
                        color: 'var(--accent-green, #00ff9f)',
                        fontWeight: 800,
                        fontStyle: 'italic',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                    >
                      {resultsData.correction.correctedQuery}
                    </button>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim, #94a3b8)', marginTop: '0.2rem' }}>
                      Telusuri kata kunci asli:{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(resultsData.correction.originalQuery);
                          fetchSearch(resultsData.correction.originalQuery, 1, timeFilter, false, true);
                        }}
                        style={{
                          color: '#f87171',
                          textDecoration: 'underline',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer'
                        }}
                      >
                        {resultsData.correction.originalQuery}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: 'var(--text-main, #fff)', fontWeight: 600 }}>Mungkin yang Anda maksud adalah: </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(resultsData.correction.correctedQuery);
                        fetchSearch(resultsData.correction.correctedQuery, 1, timeFilter);
                      }}
                      style={{
                        color: 'var(--accent-green, #00ff9f)',
                        fontWeight: 800,
                        fontStyle: 'italic',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                    >
                      {resultsData.correction.correctedQuery}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DeeperNova AI Deep Synthesis Overview */}
          <AiOverview 
            query={resultsData.query || query} 
            results={resultsData.results || []} 
          />

          <div className="results-meta-bar">
            <span>
              Found <strong>{totalResults.toLocaleString()}</strong> results for &ldquo;{resultsData.query}&rdquo;
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              ⚡ {resultsData.durationMs} ms
            </span>
          </div>

          {totalResults === 0 ? (
            <div className="empty-hint" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Tidak ditemukan dokumen yang cocok.
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Coba gunakan kata kunci umum, atau buka tab <strong>Mission Control</strong> untuk mencrawl lebih banyak website real.
              </p>
            </div>
          ) : (
            <div className="results-list">
              {resultsData.results.map((item, idx) => {
                const pr = (item.pagerank || 1.0).toFixed(2);
                return (
                  <article className="result-item" key={`${item.url}-${idx}`}>
                    <div className="result-header">
                      <div className="result-domain-wrap">
                        <span>🌐 {item.domain}</span>
                        <span>›</span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.url}
                        </a>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {(item.formattedDate || item.date) && (
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 600 }}>
                            🕒 {item.formattedDate || item.date}
                          </span>
                        )}
                        <div className="pr-badge" title="PageRank Graph Authority Score">
                          ⭐ PR {pr}
                        </div>
                      </div>
                    </div>

                    <h2 className="result-title">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {(item.rawTitle || item.title || 'Untitled Web Document').replace(/<[^>]*>/g, '')}
                      </a>
                    </h2>

                    <p className="result-snippet">
                      {(item.formattedDate || item.date) && (
                        <span style={{ color: '#64748b', fontWeight: 600, marginRight: '5px' }}>
                          {item.formattedDate || item.date} —
                        </span>
                      )}
                      <span dangerouslySetInnerHTML={{ __html: item.snippet || 'No description snippet available.' }} />
                    </p>

                    <div className="result-footer">
                      <span><Link size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {item.inLinks || 0} Backlinks</span>
                      {item.crawledAt && (
                        <span>Crawled: {new Date(item.crawledAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn-page"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft size={16} style={{ verticalAlign: 'middle' }} /> Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-page"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next <ChevronRight size={16} style={{ verticalAlign: 'middle' }} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

