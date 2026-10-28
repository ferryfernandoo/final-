import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, ExternalLink, ChevronLeft, ChevronRight, Zap,
  Clock, Newspaper, Trophy, RefreshCw, Image as ImageIcon,
  Maximize2, Flame, ArrowUpRight, Radio, Calendar, Feather,
  BookOpen, Compass, Award, Bookmark, TrendingUp
} from 'lucide-react';
import SearchSuggestions from './SearchSuggestions.jsx';

const NEWS_SORT_OPTIONS = [
  { id: 'toprank', label: '⭐ Top Rank' },
  { id: 'trending', label: '🔥 Trending' },
  { id: 'latest', label: '🕐 Terbaru' },
];

function formatNewspaperDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date().toLocaleDateString('id-ID', options).toUpperCase();
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Baru saja';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Cleans text from raw markdown/JSON and splits properly into structured paragraphs
 */
function cleanEditorialText(text) {
  if (!text) return '';
  return text
    .replace(/```[a-z]*\n?[\s\S]*?```/gi, '')
    .replace(/^\{[\s\S]*\}$/, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^>\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[\u2014\u2015\u2013—–]/g, ', ')
    .replace(/^.*?(sintesis|rangkuman berita|ikhtisar pers)\s*[:,\-–—]?\s*/i, '')
    .replace(/^[A-Za-z0-9\s]+,\s*(sintesis|laporan)\s*[:,\-–—]?\s*/i, '')
    .replace(/,\s*,/g, ',')
    .trim();
}

function renderEditorialBlocks(rawText) {
  if (!rawText) return null;
  // Clean raw text but preserve paragraph breaks
  const clean = cleanEditorialText(rawText);
  // Split on double newlines or single newlines
  const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) return null;

  let leadAssigned = false;

  return (
    <div className="newspaper-editorial-columns-flow">
      {lines.map((line, idx) => {
        // 1. Triple dashes or horizontal line dividers -> Render thin newspaper line
        if (/^(\s*[-*_]\s*){3,}$/.test(line) || line === '---' || line === '***' || line === '___') {
          return <div key={idx} className="newspaper-editorial-rule" />;
        }

        // 2. Sub-headings (short lines with emojis or without ending period)
        if (/^[\p{Emoji}\u200d\uFE0F\uFE0E]+\s+/u.test(line) || (line.length < 50 && !/[.!?]$/.test(line) && !/^\d+[.)]/.test(line))) {
          return (
            <h4 key={idx} className="newspaper-editorial-subhead">
              {line}
            </h4>
          );
        }

        // 3. Match numbered points like "1. ..." or "2) ..."
        const listMatch = line.match(/^(\d+)[.)]\s*(.*)$/);
        if (listMatch) {
          return (
            <div key={idx} className="newspaper-bulletin-item">
              <span className="bulletin-num">{listMatch[1]}</span>
              <p className="bulletin-text">{listMatch[2]}</p>
            </div>
          );
        }

        // 4. Normal paragraph (with dropcap on first lead paragraph)
        const isLead = !leadAssigned;
        if (isLead) leadAssigned = true;

        return (
          <p key={idx} className={`newspaper-prose-p ${isLead ? 'with-dropcap' : ''}`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

function isValidArticleImage(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http')) return false;
  if (trimmed.includes('favicon') || trimmed.includes('icon.png') || trimmed.includes('default-avatar')) return false;
  return true;
}

function getSourceBrand(domain) {
  const map = {
    'news.detik.com': { name: 'detikNews', color: '#1d4ed8' },
    'finance.detik.com': { name: 'detikFinance', color: '#047857' },
    'inet.detik.com': { name: 'detikInet', color: '#c2410c' },
    'hot.detik.com': { name: 'detikHot', color: '#b91c1c' },
    'sport.detik.com': { name: 'detikSport', color: '#1d4ed8' },
    'nasional.kompas.com': { name: 'Kompas.com', color: '#1e3a8a' },
    'megapolitan.kompas.com': { name: 'Kompas Metro', color: '#1e3a8a' },
    'money.kompas.com': { name: 'Kompas Money', color: '#15803d' },
    'tekno.kompas.com': { name: 'Kompas Tekno', color: '#6d28d9' },
    'bola.kompas.com': { name: 'Kompas Bola', color: '#1d4ed8' },
    'www.antaranews.com': { name: 'Antara News', color: '#b91c1c' },
    'www.cnnindonesia.com': { name: 'CNN Indonesia', color: '#dc2626' },
    'www.cnbcindonesia.com': { name: 'CNBC Indonesia', color: '#0369a1' },
    'nasional.tempo.co': { name: 'Tempo.co', color: '#312e81' },
    'bisnis.tempo.co': { name: 'Tempo Bisnis', color: '#065f46' },
    'tekno.tempo.co': { name: 'Tempo Tekno', color: '#581c87' },
    'www.tribunnews.com': { name: 'Tribunnews', color: '#b91c1c' },
    'kumparan.com': { name: 'Kumparan', color: '#0284c7' },
    'www.liputan6.com': { name: 'Liputan6', color: '#dc2626' },
    'www.merdeka.com': { name: 'Merdeka.com', color: '#b91c1c' },
    'www.suara.com': { name: 'Suara.com', color: '#1d4ed8' },
    'www.jawapos.com': { name: 'Jawa Pos', color: '#15803d' },
    'tirto.id': { name: 'Tirto.id', color: '#3730a3' },
    'katadata.co.id': { name: 'Katadata', color: '#0e7490' },
    'www.republika.co.id': { name: 'Republika', color: '#15803d' },
    'www.viva.co.id': { name: 'VIVA.co.id', color: '#c2410c' },
    'www.idntimes.com': { name: 'IDN Times', color: '#ea580c' },
    'nasional.sindonews.com': { name: 'SINDOnews', color: '#0369a1' },
    'news.okezone.com': { name: 'Okezone', color: '#c2410c' },
    'www.inews.id': { name: 'iNews', color: '#b91c1c' },
    'www.beritasatu.com': { name: 'BeritaSatu', color: '#1d4ed8' },
    'www.rri.co.id': { name: 'RRI News', color: '#1e3a8a' },
    'www.bmkg.go.id': { name: 'BMKG Resmi', color: '#1d4ed8' },
    'www.bbc.com': { name: 'BBC Indonesia', color: '#991b1b' },
  };

  for (const [key, val] of Object.entries(map)) {
    if (domain && domain.includes(key.replace('www.', ''))) return val;
  }
  return { name: domain || 'Media Pers', color: '#334155' };
}

export default function NewsTab({ query: externalQuery }) {
  const [query, setQuery] = useState(externalQuery || '');
  const [sort, setSort] = useState('toprank');
  const [newsSubView, setNewsSubView] = useState('articles');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [crawlerStats, setCrawlerStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // AI Editorial state
  const [aiEditorial, setAiEditorial] = useState({ text: '', loading: false, isStreaming: false });
  // Tracking failed image URLs so broken images are completely excluded from rendering
  const [failedImageKeys, setFailedImageKeys] = useState(new Set());

  const handleImageError = (key) => {
    if (!key) return;
    setFailedImageKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const suggestionDebounceRef = useRef(null);
  const editorialAbortRef = useRef(null);
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const fetchSuggestions = async (val) => {
    try {
      const endpoint = val && val.trim() 
        ? `/api/suggestions?q=${encodeURIComponent(val.trim())}&limit=8`
        : `/api/suggestions/trending?limit=8`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setSuggestions(data.suggestions || data.trending || []);
    } catch {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchNews(query, 1, sort, newsSubView);
    fetchCrawlerStats();
  }, []);

  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== query) {
      setQuery(externalQuery);
      setPage(1);
      fetchNews(externalQuery, 1, sort, newsSubView);
    }
  }, [externalQuery]);

  // STRICT USER RULE: Kalo gaada gambar gausah di tampilkan, kalo ada tampilkan!
  const validNewsWithImages = (resultsData?.results || []).filter(item => {
    if (!item) return false;
    const key = item.id || item.url;
    if (failedImageKeys.has(key)) return false;
    return isValidArticleImage(item.leadImageUrl);
  });

  useEffect(() => {
    if (validNewsWithImages && validNewsWithImages.length > 0 && newsSubView === 'articles') {
      streamAiEditorial(query, validNewsWithImages);
    }
    return () => {
      if (editorialAbortRef.current) {
        editorialAbortRef.current.abort();
      }
    };
  }, [resultsData, query, newsSubView]);

  const streamAiEditorial = async (searchQuery, articles) => {
    if (editorialAbortRef.current) {
      editorialAbortRef.current.abort();
    }
    const controller = new AbortController();
    editorialAbortRef.current = controller;

    setAiEditorial({ text: '', loading: true, isStreaming: true });
    try {
      const topItems = (articles || []).slice(0, 12);
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: searchQuery ? searchQuery.trim() : 'Peristiwa Berita Terhangat Nasional',
          results: topItems,
          mode: 'newspaper_editorial'
        })
      });

      if (!res.ok || !res.body) {
        generateLocalEditorial(searchQuery, topItems);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: [DONE]')) {
            setAiEditorial({ text: cleanEditorialText(accumulated), loading: false, isStreaming: false });
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.token) {
                accumulated += data.token;
                setAiEditorial({ text: cleanEditorialText(accumulated), loading: false, isStreaming: true });
              }
            } catch {}
          }
        }
      }

      setAiEditorial({ text: cleanEditorialText(accumulated), loading: false, isStreaming: false });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      generateLocalEditorial(searchQuery, (articles || []).slice(0, 10));
    }
  };

  const generateLocalEditorial = (searchQuery, topItems) => {
    if (!topItems || topItems.length === 0) {
      setAiEditorial({
        text: 'JAKARTA — Redaksi Harian DeeperNova memantau arus peristiwa nasional. Laporan pers akan segera diperbarui.',
        loading: false,
        isStreaming: false
      });
      return;
    }

    const lead = topItems[0];
    const second = topItems[1];
    const third = topItems[2];
    const fourth = topItems[3];

    let text = searchQuery 
      ? `JAKARTA — Redaksi pers nasional mencatat dinamika arus informasi penting seputar isu ${searchQuery.trim()}. Berbagai media arus utama di tanah air memberikan perhatian mendalam terhadap perkembangan mutakhir di lapangan.\n\n`
      : `JAKARTA — Laporan pers nasional merangkum dinamika peristiwa strategis yang berlangsung di tanah air hari ini. Arus informasi dihimpun dari puluhan ruang redaksi terpercaya di seluruh nusantara.\n\n`;

    if (lead) {
      const leadTitle = (lead.rawTitle || lead.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
      const leadSnippet = (lead.snippet || '').replace(/<[^>]+>/g, '').replace(/[\u2014\u2015\u2013—–]/g, ',');
      text += `Dalam tajuk utama, laporan ${lead.domain || 'media nasional'} mengangkat peristiwa "${leadTitle}". ${leadSnippet.slice(0, 220)}. Isu ini menjadi perhatian sentral masyarakat dan memerlukan respons solutif bagi publik.\n\n`;
    }

    if (second || third) {
      text += `Perkembangan Terkait dari Berbagai Sumber Pers:\n`;
      if (second) {
        const t2 = (second.rawTitle || second.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
        const s2 = (second.snippet || '').replace(/<[^>]+>/g, '');
        text += `• ${second.domain || 'Media pers'}: Melaporkan mengenai ${t2}. ${s2.slice(0, 160)}.\n`;
      }
      if (third) {
        const t3 = (third.rawTitle || third.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
        const s3 = (third.snippet || '').replace(/<[^>]+>/g, '');
        text += `• ${third.domain || 'Laporan pers'}: Menggarisbawahi dinamika ${t3}. ${s3.slice(0, 160)}.\n`;
      }
      if (fourth) {
        const t4 = (fourth.rawTitle || fourth.title || '').replace(/[\u2014\u2015\u2013—–]/g, ',');
        text += `• ${fourth.domain || 'Portal mitra'}: Turut mengulas perspektif lanjutan seputar ${t4}.\n`;
      }
      text += `\n`;
    }

    text += `Redaksi Harian DeeperNova menyimpulkan bahwa liputan bersama lintas media ini menegaskan urgensi keterbukaan informasi dan kecepatan verifikasi faktual. Pemantauan berkala terus dilanjutkan.`;

    setAiEditorial({ text: cleanEditorialText(text), loading: false, isStreaming: false });
  };

  const fetchNews = async (q = query, p = 1, s = sort, subtype = newsSubView) => {
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const limit = subtype === 'images' ? 24 : 20;
      const url = `/api/news?q=${encodeURIComponent(q.trim())}&page=${p}&limit=${limit}&sort=${s}&subtype=${subtype}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      setResultsData(data);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        setResultsData({
          results: [],
          total: 0,
          timedOut: true,
          message: 'Batas waktu pencarian berita 10 detik tercapai (QoS Protection).'
        });
      } else {
        console.error('News fetch error:', err);
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const fetchCrawlerStats = async () => {
    try {
      const res = await fetch('/api/news/stats');
      const data = await res.json();
      setCrawlerStats(data);
    } catch {}
  };

  const handleInputChange = (val) => {
    setQuery(val);
    setSelectedIndex(-1);
    clearTimeout(suggestionDebounceRef.current);
    suggestionDebounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
      setShowSuggestions(true);
    }, 120);
  };

  const handleInputFocus = () => {
    fetchSuggestions(query);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setShowSuggestions(true);
        fetchSuggestions(query);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        const selectedQuery = suggestions[selectedIndex].query;
        handleSelectSuggestion(selectedQuery);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelectSuggestion = (selectedQuery) => {
    setQuery(selectedQuery);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setPage(1);
    fetchNews(selectedQuery, 1, sort, newsSubView);
  };

  const handleFillQuery = (fillQuery) => {
    setQuery(fillQuery);
    setSelectedIndex(-1);
    inputRef.current?.focus();
    fetchSuggestions(fillQuery);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setPage(1);
    fetchNews(query, 1, sort, newsSubView);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
    fetchNews(query, 1, newSort, newsSubView);
  };

  const handleSubViewChange = (view) => {
    setNewsSubView(view);
    setPage(1);
    fetchNews(query, 1, sort, view);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchNews(query, newPage, sort, newsSubView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/news/crawl', { method: 'POST' });
      setTimeout(async () => {
        await fetchNews(query, page, sort, newsSubView);
        await fetchCrawlerStats();
        setRefreshing(false);
      }, 2000);
    } catch {
      setRefreshing(false);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setPage(1);
    fetchNews('', 1, sort, newsSubView);
    inputRef.current?.focus();
  };

  const itemsPerPage = newsSubView === 'images' ? 24 : 12;
  const totalPages = resultsData ? Math.max(1, Math.ceil((resultsData.total || validNewsWithImages.length) / itemsPerPage)) : 1;

  // Split results for broadsheet layout — strictly only articles with genuine, working images!
  const leadArticle = validNewsWithImages[0] || null;
  const sideArticles = validNewsWithImages.slice(1, 4);
  const gridArticles = validNewsWithImages.slice(4);

  return (
    <div className="broadsheet-news-page">
      <div className="broadsheet-paper-sheet">
        {/* ============================================================ */}
        {/* 📰 1. OTENTIK MASTHEAD SURAT KABAR NASIONAL */}
        {/* ============================================================ */}
        <header className="broadsheet-masthead">
          <div className="broadsheet-edition-bar">
            <div className="edition-col left">
              <span>{formatNewspaperDate()}</span>
            </div>
            <div className="edition-col center">
              <span className="broadsheet-motto">"AMANAT HATI NURANI RAKYAT & INFORMASI TERPERCAYA"</span>
            </div>
            <div className="edition-col right">
              <span>EDISI KHUSUS NO. 01 • AKSES BEBAS</span>
            </div>
          </div>

          <div className="broadsheet-main-title-wrap">
            <div className="masthead-flourish">❖</div>
            <h1 className="broadsheet-newspaper-title">HARIAN DEEPERNOVA</h1>
            <div className="masthead-flourish">❖</div>
          </div>

          <div className="broadsheet-subtitle-bar">
            <span>SURAT KABAR DIGITAL INDONESIA</span>
            <span className="dot-sep">•</span>
            <span>JARINGAN CRAWLER 40+ MEDIA NASIONAL</span>
            <span className="dot-sep">•</span>
            <span>REDAKSI PERS KECERDASAN BUATAN</span>
          </div>

          <div className="broadsheet-double-rule" />
        </header>

        {/* ============================================================ */}
        {/* 🔍 2. KONTROL & PENCARIAN LEMBARAN KORAN */}
        {/* ============================================================ */}
        <div className="broadsheet-search-toolbar">
          <div ref={searchContainerRef} className="broadsheet-search-box">
            <form onSubmit={handleSubmit} className="broadsheet-search-form">
              <div className={`broadsheet-input-box ${showSuggestions && suggestions.length > 0 ? 'has-dropdown' : ''}`}>
                <Search size={16} className="broadsheet-search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleInputFocus}
                  onKeyDown={handleKeyDown}
                  placeholder="Telusuri arsip berita, peristiwa, atau topik nasional (contoh: gempa, pemilu, APBN, BMKG)..."
                  className="broadsheet-input-field"
                  autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={clearQuery} className="broadsheet-clear-btn" title="Hapus pencarian">
                    <X size={14} />
                  </button>
                )}
                <button type="submit" className="broadsheet-submit-btn" disabled={loading}>
                  {loading ? <div className="spinner-sm" /> : <Search size={14} />}
                  <span>Cari Berita</span>
                </button>
              </div>
            </form>

            <SearchSuggestions
              suggestions={suggestions}
              query={query}
              selectedIndex={selectedIndex}
              onSelectSuggestion={handleSelectSuggestion}
              onFillQuery={handleFillQuery}
              isVisible={showSuggestions}
            />
          </div>

          <div className="broadsheet-nav-actions">
            <div className="broadsheet-view-pills">
              <button
                type="button"
                onClick={() => handleSubViewChange('articles')}
                className={`broadsheet-view-pill ${newsSubView === 'articles' ? 'active' : ''}`}
              >
                <Newspaper size={13} />
                <span>Lembaran Berita</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubViewChange('images')}
                className={`broadsheet-view-pill ${newsSubView === 'images' ? 'active' : ''}`}
              >
                <ImageIcon size={13} />
                <span>Galeri Foto Pers</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="broadsheet-crawl-btn"
              title="Tarik berita terbaru dari portal nasional"
            >
              <RefreshCw size={12} className={refreshing ? 'news-spin-anim' : ''} />
              <span>{refreshing ? 'Menerbitkan...' : 'Crawl Berita'}</span>
            </button>
          </div>
        </div>

        {/* QoS 10-Second Search Deadline Notice Banner */}
        {resultsData?.timedOut && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '10px',
            padding: '0.85rem 1.1rem',
            margin: '0 1rem 1.25rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.84rem',
            color: 'var(--text-primary, #92400e)'
          }}>
            <Clock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <span><strong>Batas Waktu Sesi Berita (Maks 10 Detik):</strong> Pencarian berita dibatasi maksimal 10 detik per sesi (QoS Protection) untuk menjaga server bebas bloat.</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 📰 3. HALAMAN DEPAN BROADSHEET (LAPORAN UTAMA + KOLOM SAMPING) */}
        {/* ============================================================ */}
        {newsSubView === 'articles' && (
          <section className="broadsheet-frontpage-section">
            <div className="broadsheet-columns-split">
              {/* Kolom Kiri: Laporan Utama & Tajuk Rencana AI */}
              <div className="broadsheet-lead-column">
                <div className="broadsheet-kicker-line">
                  <span className="kicker-tag">
                    <Feather size={12} />
                    LAPORAN UTAMA REDAKSI
                  </span>
                  <span className="kicker-time">
                    <Clock size={11} />
                    Terbitan Hari Ini • Diperbarui Real-Time
                  </span>
                </div>

                <h2 className="broadsheet-headline-hero">
                  {leadArticle?.rawTitle || (query ? `Sorotan Nasional: Liputan Khusus "${query}"` : 'Dinamika Peristiwa Strategis dan Arus Informasi Nasional')}
                </h2>

                <div className="broadsheet-dateline-byline">
                  <strong>JAKARTA, DEEPERNOVA</strong> — Disintesis secara objektif dari liputan {resultsData?.total || 40}+ portal media pers nasional terverifikasi
                </div>

                {/* Hero Lead Photojournalism Photo (Only if article actually contains genuine image) */}
                {leadArticle && isValidArticleImage(leadArticle.leadImageUrl) && (
                  <figure className="broadsheet-photo-figure">
                    <div className="photo-frame-border">
                      <img
                        src={leadArticle.leadImageUrl}
                        alt={leadArticle.rawTitle || 'Foto Berita Utama'}
                        className="broadsheet-hero-photo"
                        loading="eager"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (!e.currentTarget.dataset.proxyRetried) {
                            e.currentTarget.dataset.proxyRetried = 'true';
                            e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(leadArticle.leadImageUrl)}`;
                          } else {
                            handleImageError(leadArticle.id || leadArticle.url);
                          }
                        }}
                      />
                      {leadArticle.viralityBadge && (
                        <div className="photo-virality-tag">
                          <Flame size={11} />
                          <span>{leadArticle.viralityBadge.label}</span>
                        </div>
                      )}
                    </div>
                    <figcaption className="broadsheet-photo-caption">
                      <span className="caption-credit">DOKUMENTASI FOTO PERS:</span> {leadArticle.rawTitle || 'Liputan Peristiwa Utama'}. 
                      <span className="caption-source"> (Sumber: {leadArticle.domain || 'Media Nasional'} • {timeAgo(leadArticle.publishedAt)})</span>
                    </figcaption>
                  </figure>
                )}

                {/* Multi-Column Prose / Structured Paragraphs */}
                <div className="broadsheet-prose-container">
                  {aiEditorial.loading ? (
                    <div className="broadsheet-loading-box">
                      <div className="spinner-sm" />
                      <span>Menata dan mencetak tajuk rencana surat kabar...</span>
                    </div>
                  ) : aiEditorial.text ? (
                    renderEditorialBlocks(aiEditorial.text)
                  ) : (
                    <div className="newspaper-editorial-columns-flow">
                      <p className="newspaper-prose-p with-dropcap">
                        Dinamika peristiwa nasional bergerak cepat di berbagai sektor strategis. Jaringan DeeperNova terus mengumpulkan fakta, investigasi, dan laporan terhangat langsung dari ruang redaksi media arus utama di seluruh nusantara.
                      </p>
                    </div>
                  )}
                  {aiEditorial.isStreaming && <span className="ai-stream-cursor" />}
                </div>
              </div>

              {/* Kolom Kanan: Kolom Opini & Kilas Berita Hangat */}
              <aside className="broadsheet-sidebar-column">
                <div className="sidebar-header-bar">
                  <BookOpen size={13} />
                  <span>{query ? `HASIL PENELUSURAN PERS: "${query.toUpperCase()}"` : 'KILAS BERITA PERS TERHANGAT'}</span>
                </div>

                <div className="sidebar-articles-list">
                  {sideArticles.map((sideItem, sIdx) => {
                    const sideBrand = getSourceBrand(sideItem.domain);
                    const hasThumb = isValidArticleImage(sideItem.leadImageUrl);

                    return (
                      <article key={sideItem.id || sideItem.url || sIdx} className="sidebar-article-item">
                        {hasThumb && (
                          <div className="sidebar-photo-thumb">
                            <img
                              src={sideItem.leadImageUrl}
                              alt={sideItem.rawTitle || 'Foto'}
                              loading="lazy"
                              onError={(e) => {
                                if (!e.currentTarget.dataset.proxyRetried) {
                                  e.currentTarget.dataset.proxyRetried = 'true';
                                  e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(sideItem.leadImageUrl)}`;
                                } else {
                                  handleImageError(sideItem.id || sideItem.url);
                                }
                              }}
                            />
                          </div>
                        )}
                        <div className="sidebar-article-info">
                          <div className="sidebar-meta-row">
                            <span className="sidebar-brand-tag" style={{ color: sideBrand.color }}>
                              {sideBrand.name}
                            </span>
                            <span className="sidebar-time">{timeAgo(sideItem.publishedAt)}</span>
                          </div>
                          <h4 className="sidebar-headline">
                            <a
                              href={sideItem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              dangerouslySetInnerHTML={{ __html: sideItem.title || sideItem.rawTitle }}
                            />
                          </h4>
                          {sideItem.snippet && (
                            <p className="sidebar-snippet" dangerouslySetInnerHTML={{ __html: sideItem.snippet }} />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="sidebar-editorial-note">
                  <div className="note-title">CATATAN REDAKSI</div>
                  <p>
                    Peringkat berita dihitung berdasarkan indeks keviralan, peliputan bersama lintas portal berita, dan otoritas media nasional.
                  </p>
                </div>
              </aside>
            </div>

            {/* Pemisah Halaman Koran */}
            <div className="broadsheet-section-divider">
              <div className="divider-inner">
                <span>✦ ARSIP LEMBARAN BERITA & LIPUTAN KHUSUS ✦</span>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 📰 4. TOOLBAR FILTER & SORTING */}
        {/* ============================================================ */}
        {newsSubView === 'articles' && (
          <div className="broadsheet-filter-bar">
            <div className="filter-group">
              <span className="filter-label">Urutkan Lembaran:</span>
              {NEWS_SORT_OPTIONS.map((opt) => {
                const isActive = sort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSortChange(opt.id)}
                    className={`filter-btn ${isActive ? 'active' : ''}`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {resultsData && (
              <div className="filter-results-info">
                Menampilkan <strong>{validNewsWithImages.length}</strong> lembaran berita bergambar ({resultsData.durationMs || 0} ms)
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 📄 5. KORAN 3-KOLOM (BROADSHEET STORY GRID) */}
        {/* ============================================================ */}
        {loading ? (
          <div className="broadsheet-page-loading">
            <div className="broadsheet-spinner" />
            <h3>Membuka Lembaran Surat Kabar...</h3>
            <p>Menyusun arsip berita terverifikasi dari media pers nasional</p>
          </div>
        ) : newsSubView === 'articles' ? (
          <>
            {validNewsWithImages.length > 0 ? (
              <div className="broadsheet-stories-grid">
                {(gridArticles.length > 0 ? gridArticles : validNewsWithImages).map((item, idx) => {
                  const brand = getSourceBrand(item.domain);

                  return (
                    <article key={item.id || item.url || idx} className="broadsheet-story-card">
                      {/* Photo Frame (Only if article actually contains a genuine image) */}
                      <div className="story-photo-wrap">
                        <img
                          src={item.leadImageUrl}
                          alt={item.rawTitle || 'Foto Berita'}
                          loading="lazy"
                          className="story-photo-img"
                          onError={(e) => {
                            if (!e.currentTarget.dataset.proxyRetried) {
                              e.currentTarget.dataset.proxyRetried = 'true';
                              e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(item.leadImageUrl)}`;
                            } else {
                              handleImageError(item.id || item.url);
                            }
                          }}
                        />
                        {item.viralityBadge && (
                          <span className="story-virality-badge">
                            <Flame size={10} />
                            <span>{item.viralityBadge.label}</span>
                          </span>
                        )}
                      </div>

                      <div className="story-card-body">
                        <div className="story-meta-header">
                          <span className="story-source-brand" style={{ color: brand.color }}>
                            {brand.name}
                          </span>
                          <span className="story-time-label">
                            <Clock size={11} />
                            {timeAgo(item.publishedAt)}
                          </span>
                        </div>

                        <h3 className="story-card-headline">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            dangerouslySetInnerHTML={{ __html: item.title || item.rawTitle }}
                          />
                        </h3>

                        {item.snippet && (
                          <p className="story-card-snippet" dangerouslySetInnerHTML={{ __html: item.snippet }} />
                        )}

                        <div className="story-card-footer">
                          <div className="story-badges-row">
                            {item.viralityScore > 0 && (
                              <span className="story-pill viral">
                                <Flame size={10} />
                                <span>{item.viralityScore}%</span>
                              </span>
                            )}
                            {item.mediaTier && item.mediaTier.includes('Tier 1') && (
                              <span className="story-pill tier1">⭐ Tier 1</span>
                            )}
                          </div>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="story-read-link"
                            title="Buka artikel selengkapnya di sumber"
                          >
                            <span>Baca Laporan</span>
                            <ArrowUpRight size={12} />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="news-zero-state">
                <Newspaper size={44} className="news-zero-icon" />
                <h3>Belum Ada Berita Terindeks yang Sesuai</h3>
                <p>Silakan coba kata kunci lain atau jalankan crawler berita nasional.</p>
                <button type="button" onClick={handleRefresh} className="news-zero-btn">
                  <RefreshCw size={14} />
                  <span>Crawl Berita Baru Sekarang</span>
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="broadsheet-pagination">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="broadsheet-nav-btn"
                >
                  <ChevronLeft size={15} />
                  <span>Halaman Sebelumnya</span>
                </button>
                <span className="broadsheet-page-indicator">
                  Lembaran <strong>{page}</strong> dari <strong>{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="broadsheet-nav-btn"
                >
                  <span>Halaman Berikutnya</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        ) : (
          /* ============================================================ */
          /* 📸 6. GALERI FOTO PERS JURNALISTIK */
          /* ============================================================ */
          <div className="broadsheet-gallery-view">
            {resultsData?.results && resultsData.results.length > 0 ? (
              <div className="broadsheet-photos-grid">
                {resultsData.results.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="broadsheet-photo-card"
                    onClick={() => setSelectedImageModal(img)}
                  >
                    <div className="photo-card-thumb">
                      <img
                        src={img.imageUrl}
                        alt={img.alt || img.title || 'Foto Pers'}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (!e.currentTarget.dataset.proxyRetried) {
                            e.currentTarget.dataset.proxyRetried = 'true';
                            e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(img.imageUrl)}`;
                          } else {
                            e.currentTarget.style.opacity = '0.35';
                          }
                        }}
                      />
                      <div className="photo-hover-overlay">
                        <Maximize2 size={20} />
                        <span>Buka Foto Pers</span>
                      </div>
                    </div>
                    <div className="photo-card-caption-bar">
                      <p className="photo-caption-text">{img.pageTitle || img.title || img.domain}</p>
                      <span className="photo-domain-text">{img.domain}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="news-zero-state">
                <ImageIcon size={44} className="news-zero-icon" />
                <h3>Belum Ada Foto Pers yang Sesuai</h3>
                <p>Coba kata kunci pencarian berita untuk menemukan foto jurnalistik terkait.</p>
              </div>
            )}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedImageModal && (
          <div className="lightbox-backdrop" onClick={() => setSelectedImageModal(null)}>
            <div className="lightbox-content-box" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setSelectedImageModal(null)} className="lightbox-close-btn">
                <X size={18} />
              </button>
              <div className="lightbox-img-area">
                <img src={selectedImageModal.imageUrl} alt={selectedImageModal.title || 'Foto Pers'} />
              </div>
              <div className="lightbox-details-panel">
                <h4 className="lightbox-title">{selectedImageModal.pageTitle || selectedImageModal.title}</h4>
                <p className="lightbox-domain">{selectedImageModal.domain}</p>
                <div className="lightbox-actions-bar">
                  <a href={selectedImageModal.pageUrl} target="_blank" rel="noopener noreferrer" className="lightbox-btn-primary">
                    <span>Buka Artikel Sumber</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
