import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, ExternalLink, ChevronLeft, ChevronRight, Zap, Code2, 
  Layers, Clock, ShieldCheck, Sparkles, Globe, BarChart2, Info, ArrowUpRight, Cpu,
  Image as ImageIcon, Copy, Check, Maximize2, Download, LayoutGrid, Eye, Newspaper, Compass,
  Menu, SlidersHorizontal, ChevronDown, CheckCircle2, BookOpen, Terminal, Landmark, TrendingUp, Calculator, Bookmark,
  MapPin, Navigation, Coins, ArrowRightLeft, Map as MapIcon, ArrowLeft,
  Camera, Mic, MicOff, Sun, Moon, Flame, RefreshCw, Upload, Plus
} from 'lucide-react';
import JsonViewer from './JsonViewer.jsx';
import AiOverview from './AiOverview.jsx';
import NewsTab from './NewsTab.jsx';
import EconomicsTab from './EconomicsTab.jsx';
import ApiPortalTab from './ApiPortalTab.jsx';
import SearchSuggestions from './SearchSuggestions.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

const POPULAR_TOPICS = [
  'Indonesia',
  'DeepSeek AI',
  'DeeperNova',
  'YouTube',
  'Kecerdasan Buatan',
  'Wikipedia'
];

const SEARCH_TYPES = [
  { id: 'all', label: 'Semua Web', shortLabel: 'Semua', icon: Globe },
  { id: 'images', label: 'Gambar', shortLabel: 'Gambar', icon: ImageIcon },
  { id: 'news', label: 'Berita', shortLabel: 'Berita', icon: Newspaper },
  { id: 'economics', label: 'Finansial', shortLabel: 'Finansial', icon: TrendingUp },
  { id: 'api', label: 'API Developer', shortLabel: 'API', icon: Terminal }
];

const TIME_FILTERS = [
  { id: 'all', label: 'Kapan saja' },
  { id: '24h', label: '24 Jam Terakhir' },
  { id: 'week', label: '1 Minggu Terakhir' },
  { id: 'month', label: '1 Bulan Terakhir' }
];

const HOT_SEARCH_CATEGORIES = {
  all: [
    { rank: 1, title: 'Indonesia Emas & Ibu Kota Nusantara (IKN)', heat: '4.9M', tag: 'HOT', query: 'Ibu Kota Nusantara' },
    { rank: 2, title: 'DeepSeek AI & Reasoning Model R1', heat: '4.5M', tag: 'HOT', query: 'DeepSeek AI' },
    { rank: 3, title: 'BMKG Info Cuaca Ekstrem & Gempa Terkini', heat: '3.8M', tag: 'NAIK', query: 'BMKG Cuaca & Gempa' },
    { rank: 4, title: 'Nilai Tukar Dollar USD ke Rupiah Hari Ini', heat: '3.4M', tag: 'NAIK', query: '1 USD berapa rupiah' },
    { rank: 5, title: 'Harga Pasar Bitcoin & Aset Kripto Terkini', heat: '2.9M', tag: 'BARU', query: 'harga bitcoin hari ini' },
    { rank: 6, title: 'Teknologi Kecerdasan Buatan Generatif AI', heat: '2.6M', tag: '', query: 'Kecerdasan Buatan' },
    { rank: 7, title: 'Berita Nasional Terkini & Kebijakan Publik', heat: '2.2M', tag: '', query: 'Kompas Berita Nasional' },
    { rank: 8, title: 'Candi Borobudur Wisata Warisan Budaya Dunia', heat: '1.9M', tag: '', query: 'Borobudur' },
    { rank: 9, title: 'Saham Bank Central Asia (BBCA) & IHSG', heat: '1.7M', tag: '', query: 'saham bbca hari ini' },
    { rank: 10, title: 'Algoritma Pencarian PageRank & BM25', heat: '1.4M', tag: '', query: 'PageRank Algorithm' }
  ],
  national: [
    { rank: 1, title: 'Ibu Kota Nusantara Pembangunan Fasilitas Publik', heat: '4.8M', tag: 'HOT', query: 'Ibu Kota Nusantara' },
    { rank: 2, title: 'Kebijakan Ekonomi Nasional & Penguatan UMKM', heat: '3.9M', tag: 'NAIK', query: 'kebijakan ekonomi indonesia' },
    { rank: 3, title: 'BMKG Info Gempa & Prakiraan Gelombang', heat: '3.5M', tag: 'HOT', query: 'BMKG Cuaca & Gempa' },
    { rank: 4, title: 'Wisata Unggulan Bali, Labuan Bajo & Raja Ampat', heat: '2.8M', tag: 'BARU', query: 'wisata indonesia' },
    { rank: 5, title: 'Kereta Cepat Whoosh & Konektivitas Transportasi', heat: '2.4M', tag: '', query: 'kereta cepat indonesia' },
    { rank: 6, title: 'Pembangunan Jalan Tol Trans Jawa & Sumatra', heat: '2.1M', tag: '', query: 'jalan tol indonesia' },
    { rank: 7, title: 'Pendidikan Vokasi & Beasiswa LPDP 2026', heat: '1.8M', tag: '', query: 'beasiswa lpdp indonesia' },
    { rank: 8, title: 'Festival Budaya & Kuliner Khas Nusantara', heat: '1.5M', tag: '', query: 'kuliner nusantara' },
    { rank: 9, title: 'Konservasi Alam & Satwa Langka Indonesia', heat: '1.3M', tag: '', query: 'taman nasional komodo' },
    { rank: 10, title: 'Sejarah & Kejayaan Kerajaan Majapahit', heat: '1.1M', tag: '', query: 'Majapahit' }
  ],
  tech: [
    { rank: 1, title: 'DeepSeek LLM & Model Open Source Terunggul', heat: '5.1M', tag: 'HOT', query: 'DeepSeek AI' },
    { rank: 2, title: 'Generative AI & Agentic Workflow di Industri', heat: '4.3M', tag: 'HOT', query: 'Kecerdasan Buatan' },
    { rank: 3, title: 'Spesifikasi Smartphone Flagship & Gadget 2026', heat: '3.7M', tag: 'NAIK', query: 'gadget teknologi terbaru' },
    { rank: 4, title: 'Arsitektur Search Engine: Crawler & PageRank', heat: '3.2M', tag: 'BARU', query: 'PageRank Algorithm' },
    { rank: 5, title: 'Keamanan Siber (Cybersecurity) Data Nasional', heat: '2.9M', tag: '', query: 'cybersecurity indonesia' },
    { rank: 6, title: 'Komputasi Kuantum & Semikonduktor 2nm', heat: '2.5M', tag: '', query: 'komputasi kuantum' },
    { rank: 7, title: 'Robotika Humanoid & AI Otomasi Pabrik Modern', heat: '2.2M', tag: '', query: 'robot humanoid ai' },
    { rank: 8, title: 'Panduan Developer Web3 & Smart Contracts', heat: '1.9M', tag: '', query: 'web3 blockchain developer' },
    { rank: 9, title: 'Konektivitas Jaringan 5G-Advanced & Satelit LEO', heat: '1.6M', tag: '', query: 'satelit starlink indonesia' },
    { rank: 10, title: 'OpenAI o3 & Gemini Ultra AI Multimodal', heat: '1.4M', tag: '', query: 'ChatGPT OpenAI' }
  ],
  finance: [
    { rank: 1, title: 'Kurs Dollar USD ke Rupiah Real-Time Hari Ini', heat: '4.7M', tag: 'HOT', query: '1 USD berapa rupiah' },
    { rank: 2, title: 'Harga Emas Antam & Nilai Buyback Terkini', heat: '4.2M', tag: 'HOT', query: 'harga emas antam hari ini' },
    { rank: 3, title: 'Pergerakan IHSG & Saham Perbankan BBCA BBRI', heat: '3.6M', tag: 'NAIK', query: 'saham bbca hari ini' },
    { rank: 4, title: 'Analisis Pasar Kripto Bitcoin & Ethereum', heat: '3.3M', tag: 'BARU', query: 'harga bitcoin hari ini' },
    { rank: 5, title: 'Suku Bunga Bank Indonesia (BI-Rate) 2026', heat: '2.8M', tag: '', query: 'bank indonesia suku bunga' },
    { rank: 6, title: 'Investasi Obligasi Negara & SBN Ritel', heat: '2.4M', tag: '', query: 'obligasi negara sbn' },
    { rank: 7, title: 'Pertumbuhan Ekonomi & Neraca Perdagangan', heat: '2.0M', tag: '', query: 'ekonomi indonesia 2026' },
    { rank: 8, title: 'Laporan Keuangan Kuartal Emiten Bluechip', heat: '1.7M', tag: '', query: 'laporan keuangan bank' },
    { rank: 9, title: 'Harga Minyak Mentah Global Brent & WTI', heat: '1.4M', tag: '', query: 'harga minyak dunia hari ini' },
    { rank: 10, title: 'Perkembangan Industri Fintech & Aturan OJK', heat: '1.2M', tag: '', query: 'fintech ojk indonesia' }
  ]
};

function CurrencyCardWidget({ data }) {
  const [amountFrom, setAmountFrom] = useState(data.fromAmount || 1);
  const [period, setPeriod] = useState('1D');
  const [hoverPoint, setHoverPoint] = useState(null);

  const rawUnitRate = data.rawUnitRate || 1;
  const convertedTo = amountFrom * rawUnitRate;

  const chartSeries = data.chartSeries || {};
  const currentSeries = chartSeries[period] || chartSeries['1D'] || { points: [], changePct: 0 };
  const points = currentSeries.points || [];
  const changePct = currentSeries.changePct || 0;
  const isPositive = changePct >= 0;

  // Calculate SVG chart coordinates
  const svgWidth = 600;
  const svgHeight = 150;
  const padding = 20;

  let minRate = points.length > 0 ? Math.min(...points.map(p => p.rate)) : 0;
  let maxRate = points.length > 0 ? Math.max(...points.map(p => p.rate)) : 1;
  if (minRate === maxRate) {
    minRate *= 0.99;
    maxRate *= 1.01;
  }
  const range = maxRate - minRate || 1;

  const getX = (idx) => padding + (idx / Math.max(points.length - 1, 1)) * (svgWidth - padding * 2);
  const getY = (rate) => svgHeight - padding - ((rate - minRate) / range) * (svgHeight - padding * 2);

  const pathD = points.length > 0 
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.rate)}`, '')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${getX(points.length - 1)} ${svgHeight} L ${getX(0)} ${svgHeight} Z`
    : '';

  return (
    <div className="ia-currency-card" style={{ background: 'linear-gradient(135deg, rgba(240,253,244,0.95) 0%, rgba(248,250,252,0.9) 100%)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(5,150,105,0.2)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Coins size={16} />
          <span>{data.title || 'Kurs & Valuta Asing Terverifikasi'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Diperbarui: {data.lastUpdated || 'Hari ini'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '12px', border: '1px solid rgba(21,128,61,0.2)' }}>
            <CheckCircle2 size={11} /> Pasar Live
          </span>
        </div>
      </div>

      {/* Main Exchange Rate Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '2.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
          {convertedTo >= 1000 ? Math.round(convertedTo).toLocaleString('id-ID') : (Math.round(convertedTo * 100) / 100).toLocaleString('id-ID')}
        </span>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669' }}>
          {data.toName} ({data.toFlag} {data.toCode})
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.86rem', color: '#64748b', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span>1 {data.fromCode} = <strong>{data.unitRate} {data.toCode}</strong></span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: isPositive ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
          {isPositive ? 'â–²' : 'â–¼'} {changePct > 0 ? `+${changePct}%` : `${changePct}%`} ({period})
        </span>
      </div>

      {/* Dual Interactive Input Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem', marginBottom: '1.15rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <input 
            type="number"
            value={amountFrom}
            onChange={(e) => setAmountFrom(Math.max(0, parseFloat(e.target.value) || 0))}
            style={{ width: '60%', border: 'none', outline: 'none', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.92rem', color: '#334155' }}>
            <span>{data.fromFlag}</span>
            <span>{data.fromCode}</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '60%', fontSize: '1.2rem', fontWeight: 800, color: '#059669', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {convertedTo >= 1000 ? Math.round(convertedTo).toLocaleString('id-ID') : (Math.round(convertedTo * 100) / 100).toLocaleString('id-ID')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.92rem', color: '#334155' }}>
            <span>{data.toFlag}</span>
            <span>{data.toCode}</span>
          </div>
        </div>
      </div>

      {/* Interactive Price Chart Section */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '0.9rem 1rem', border: '1px solid #e2e8f0', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Time Period Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Grafik Nilai Tukar Waktu ke Waktu:
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px' }}>
            {['1D', '1W', '1M', '1Y', '5Y'].map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setHoverPoint(null); }}
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: period === p ? '#059669' : 'transparent',
                  color: period === p ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {p === '1D' ? '1H' : p === '1W' ? '1M' : p === '1M' ? '1B' : p === '1Y' ? '1T' : '5T'}
              </button>
            ))}
          </div>
        </div>

        {/* Hover Tooltip Value */}
        <div style={{ minHeight: '1.4rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
          {hoverPoint ? (
            <span><strong>{hoverPoint.label}:</strong> 1 {data.fromCode} = <strong style={{ color: '#059669' }}>{hoverPoint.rate.toLocaleString('id-ID')} {data.toCode}</strong></span>
          ) : (
            <span>Rentang Periode {period}: Terendah {minRate.toLocaleString('id-ID')} â€¢ Tertinggi {maxRate.toLocaleString('id-ID')}</span>
          )}
        </div>

        {/* SVG Sparkline / Interactive Line Chart */}
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="currencyChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#f1f5f9" strokeDasharray="3 3" />

            {/* Gradient Fill Area */}
            {areaD && <path d={areaD} fill="url(#currencyChartGrad)" />}

            {/* Main Trend Line */}
            {pathD && <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

            {/* Interactive Data Point Dots */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={getX(idx)}
                cy={getY(p.rate)}
                r={hoverPoint && hoverPoint.label === p.label ? "5" : "3"}
                fill={hoverPoint && hoverPoint.label === p.label ? "#059669" : "#fff"}
                stroke="#059669"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoverPoint(p)}
                onMouseLeave={() => setHoverPoint(null)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Multi-Tier Quick Comparison Table */}
      {data.comparisonTable && data.comparisonTable.length > 0 && (
        <div>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.3px' }}>
            Tabel Perbandingan Nilai Cepat:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem' }}>
            {data.comparisonTable.map((item, cIdx) => (
              <div key={cIdx} style={{ background: 'rgba(255,255,255,0.7)', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>{item.fromFormatted}</div>
                <div style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 800, marginTop: '0.1rem' }}>{item.toFormatted}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialAssetCardWidget({ data }) {
  if (!data) return null;
  const [period, setPeriod] = useState('1D');
  const livePrice = Number(data.rawPrice ?? data.price) || 100;

  const formattedMainPrice = data.priceMain || (data.currency === 'IDR'
    ? `Rp ${Math.round(livePrice).toLocaleString('id-ID')}`
    : (data.assetType === 'crypto' 
      ? `Rp ${Math.round(livePrice * 17700).toLocaleString('id-ID')}` 
      : `$${livePrice.toLocaleString('id-ID')}`));

  const chartSeries = data.chartSeries || {};
  const currentSeries = chartSeries[period] || chartSeries['1D'] || Object.values(chartSeries)[0] || { points: [], changePct: 0 };
  const points = Array.isArray(currentSeries.points) ? currentSeries.points : [];
  const changePct = currentSeries.changePct || (data.isPositive ? 1.5 : -1.5);
  const isPositive = changePct >= 0;

  // Ultra-compact Mini Sparkline SVG dimensions (height 18px, width 70px)
  const svgWidth = 70;
  const svgHeight = 18;
  const padX = 1;
  const padY = 2;

  let minRate = points.length > 0 ? Math.min(...points.map(p => Number(p.price) || 0)) : 0;
  let maxRate = points.length > 0 ? Math.max(...points.map(p => Number(p.price) || 1)) : 1;
  if (minRate === maxRate) {
    minRate *= 0.99;
    maxRate *= 1.01;
  }
  const range = (maxRate - minRate) || 1;

  const getX = (idx) => padX + (idx / Math.max(points.length - 1, 1)) * (svgWidth - padX * 2);
  const getY = (rate) => svgHeight - padY - ((rate - minRate) / range) * (svgHeight - padY * 2);

  const pathD = points.length > 0 
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(Number(p.price) || 0)}`, '')
    : '';

  const themeColor = isPositive ? '#16a34a' : '#dc2626';
  const themeBorder = isPositive ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)';
  const pillBg = isPositive ? '#dcfce7' : '#fee2e2';

  return (
    <div className="ia-financial-asset-card" style={{
      background: '#ffffff',
      borderRadius: '8px',
      padding: '0.3rem 0.65rem',
      border: `1px solid ${themeBorder}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.55rem',
      flexWrap: 'nowrap'
    }}>
      {/* Left: Ticker & Asset Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: '1 1 auto' }}>
        <span style={{
          background: '#0f172a',
          color: '#fff',
          fontSize: '0.66rem',
          fontWeight: 800,
          padding: '0.1rem 0.35rem',
          borderRadius: '4px',
          letterSpacing: '0.4px',
          flexShrink: 0
        }}>
          {data.ticker}
        </span>
        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.name}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: themeColor, fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: themeColor, display: 'inline-block' }} /> Live
        </span>
        <span style={{ fontSize: '0.66rem', color: '#94a3b8', flexShrink: 0 }}>
          {data.exchange}
        </span>
      </div>

      {/* Center: Mini Sparkline */}
      {points.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible', display: 'block' }}>
            {pathD && <path d={pathD} fill="none" stroke={themeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
            <circle
              cx={getX(points.length - 1)}
              cy={getY(points[points.length - 1].price)}
              r="2"
              fill={themeColor}
            />
          </svg>
        </div>
      )}

      {/* Mini Period Switcher inline */}
      <div style={{ display: 'flex', gap: '0.12rem', background: '#f8fafc', padding: '0.08rem', borderRadius: '4px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
        {['1D', '1W', '1M', '1Y'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '0.08rem 0.25rem',
              fontSize: '0.6rem',
              fontWeight: 700,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              background: period === p ? themeColor : 'transparent',
              color: period === p ? '#fff' : '#64748b'
            }}
          >
            {p === '1D' ? '1H' : p === '1W' ? '1M' : p === '1M' ? '1B' : '1T'}
          </button>
        ))}
      </div>

      {/* Right: Main Price + Change Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
          {formattedMainPrice}
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.1rem',
          background: pillBg,
          color: themeColor,
          fontSize: '0.7rem',
          fontWeight: 800,
          padding: '0.1rem 0.35rem',
          borderRadius: '4px',
          whiteSpace: 'nowrap'
        }}>
          {isPositive ? 'â–²' : 'â–¼'} {changePct > 0 ? `+${changePct}%` : `${changePct}%`}
        </span>
      </div>
    </div>
  );
}

function SlimBiographyCardWidget({ data }) {
  if (!data) return null;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ia-slim-bio-card" style={{
      background: '#ffffff',
      borderRadius: '8px',
      padding: '0.35rem 0.75rem',
      border: '1px solid rgba(37,99,235,0.18)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', flexWrap: 'nowrap' }}>
        {/* Left: Avatar + Identity + 1-Line Bio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: '1 1 auto' }}>
          {data.photo && (
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#e2e8f0',
              border: '1px solid #cbd5e1'
            }}>
              <img 
                src={data.photo} 
                alt={data.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
              />
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'nowrap' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data.title}
              </span>
              {data.verified && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.15rem',
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  padding: '0.06rem 0.3rem',
                  borderRadius: '8px',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={10} /> Tokoh
                </span>
              )}
              {data.subtitle && (
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  â€¢ {data.subtitle}
                </span>
              )}
            </div>
            {data.description && (
              <div style={{
                fontSize: '0.72rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '650px',
                marginTop: '0.05rem'
              }}>
                {data.description}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {data.attributes && data.attributes.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.12rem 0.3rem',
                borderRadius: '4px'
              }}
            >
              {expanded ? 'Tutup â–²' : 'Rincian â–¼'}
            </button>
          )}
          {data.sourceUrl && (
            <a 
              href={data.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#2563eb',
                fontSize: '0.7rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.15rem',
                background: '#eff6ff',
                padding: '0.15rem 0.45rem',
                borderRadius: '5px'
              }}
            >
              <span>Biografi</span>
              <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>

      {/* Expanded details (collapsed by default) */}
      {expanded && data.attributes && data.attributes.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.3rem',
          background: '#f8fafc',
          padding: '0.4rem 0.6rem',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          marginTop: '0.3rem'
        }}>
          {data.attributes.map((attr, aIdx) => (
            <div key={aIdx} style={{ fontSize: '0.7rem' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{attr.label}: </span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{attr.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



/**
 * 🛡️ SmartImageCard:
 * - Completely ignores & hides broken images from the gallery
 * - Attempts high-speed image proxy if external host blocks hotlinking (HTTP 403)
 * - If image fails completely or is a tracking pixel (<30px), removes card from layout (returns null)
 * - Smooth fade-in once validated
 */
function SmartImageCard({ img, onSelect }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'broken'
  const [imgSrc, setImgSrc] = useState(img.imageUrl || img.url);
  const [hasProxied, setHasProxied] = useState(false);

  useEffect(() => {
    // If the image takes longer than 2.8s to load (hanging host), drop and ignore it
    const timer = setTimeout(() => {
      setStatus(prev => (prev === 'loaded' ? 'loaded' : 'broken'));
    }, 2800);
    return () => clearTimeout(timer);
  }, [imgSrc]);

  // If broken: completely ignore this image and do not render the card (AFTER all hooks)
  if (status === 'broken') {
    return null;
  }

  const handleError = () => {
    if (!hasProxied) {
      setHasProxied(true);
      setImgSrc(`/api/proxy-image?url=${encodeURIComponent(img.imageUrl || img.url)}`);
    } else {
      setStatus('broken');
    }
  };

  const handleLoad = (e) => {
    const el = e.currentTarget;
    if (el.naturalWidth < 30 || el.naturalHeight < 30) {
      setStatus('broken');
    } else {
      setStatus('loaded');
    }
  };

  return (
    <div
      className={`image-card ${status === 'loaded' ? 'is-ready' : 'is-loading'}`}
      onClick={() => onSelect(img)}
      style={{ display: status === 'loaded' ? 'block' : 'none' }}
    >
      <div className="image-thumb-wrapper">
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          style={{
            opacity: status === 'loaded' ? 1 : 0,
            transition: 'opacity 0.2s ease-in'
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
      <div className="image-card-caption">
        <div className="image-domain-line">
          {img.logoUrl ? (
            <img 
              src={img.logoUrl} 
              alt="" 
              className="image-domain-logo"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Globe size={12} className="text-slate-400" />
          )}
          <span className="image-domain-name">{img.domain}</span>
        </div>
        <p className="image-title-text" title={img.alt || img.title}>
          {img.alt || img.title || img.domain}
        </p>
      </div>
    </div>
  );
}

export default function PublicSearch({ onSwitchToAdmin, telemetry }) {
  const isLocalOrAdmin = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.search.includes('admin') || window.location.pathname.startsWith('/admin'));
  const showCrawlerLiveBadge = true;
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [searchType, setSearchType] = useState('all'); // 'all' | 'images' | 'news' | 'economics' | 'api'
  const [timeFilter, setTimeFilter] = useState('all');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveCrawling, setLiveCrawling] = useState(false);
  const [viewMode, setViewMode] = useState('results'); // 'results' | 'json'
  const [selectedItemJson, setSelectedItemJson] = useState(null);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('deepernova_search_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('deepernova_search_theme', nextTheme);
    } catch {}
  };

  // AI Overview Toggle (Instant mode vs Deep AI mode)
  const [aiOverviewEnabled, setAiOverviewEnabled] = useState(() => {
    try {
      return localStorage.getItem('deepernova_ai_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleAiOverview = () => {
    setAiOverviewEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('deepernova_ai_enabled', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isSearchActive = Boolean(hasSearched || resultsData || isSearchFocused || searchType === 'news' || searchType === 'images' || searchType === 'economics' || searchType === 'api');

  // Auto-focus the header search input smoothly ONLY when entering active search mode from empty home state
  useEffect(() => {
    if (isSearchFocused && !hasSearched) {
      const timer = setTimeout(() => {
        if (!hasSearched) {
          inputRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchFocused, hasSearched]);

  // Google-style Search History (Persistent across sessions)
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem('deepernova_search_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      'deepernova ai',
      'deepseek',
      'deepernova/dte',
      'contoh kontribusi pramuniaga',
      'apa itu kontribusi dalam pekerjaan',
      'jalankan ai bagusan 3060 apa jetson',
      'kopdes india'
    ];
  });

  const saveRecentSearch = (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) return;
    const clean = searchQuery.trim();
    try {
      setRecentSearches(prev => {
        const filtered = [clean, ...prev.filter(item => {
          const q = typeof item === 'string' ? item : item.query;
          return q.toLowerCase() !== clean.toLowerCase();
        })].slice(0, 15);
        try {
          localStorage.setItem('deepernova_search_history', JSON.stringify(filtered));
        } catch {}
        return filtered;
      });
    } catch {}
  };

  const handlePlusClick = () => {
    if (query) {
      setQuery('');
      setShowSuggestions(true);
      setSelectedIndex(-1);
      if (recentSearches && recentSearches.length > 0) {
        setSuggestions(recentSearches.map(item => ({
          query: typeof item === 'string' ? item : item.query,
          type: 'history',
          subtitle: (typeof item === 'object' && item.subtitle) ? item.subtitle : ''
        })));
      } else {
        fetchSuggestions('');
      }
      inputRef.current?.focus();
    } else if (!hasSearched) {
      // If user hasn't searched and clicks '+', return smoothly to center hero
      setIsSearchFocused(false);
      setShowSuggestions(false);
    } else {
      handleResetHome();
    }
  };
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef(null);
  const suggestionDebounceRef = useRef(null);
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const [popularTopics, setPopularTopics] = useState(POPULAR_TOPICS);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);

  // Visual & Voice Search States
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const speechRecognitionRef = useRef(null);

  // Voice Search Handler
  const startVoiceSearch = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      setVoiceNotice('');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung Web Speech Recognition. Gunakan Chrome, Edge, atau browser modern.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Mendengarkan... Silakan ucapkan kata kunci pencarian Anda.');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setQuery(transcript);
          setVoiceNotice(`Mendengar: "${transcript}"`);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setVoiceNotice('');
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice('');
        if (inputRef.current && inputRef.current.value.trim()) {
          fetchSearch(inputRef.current.value.trim(), 1, searchType, timeFilter);
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech start error:', err);
      setIsListening(false);
    }
  };

  // Visual Search File Upload
  const handleVisualFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setShowVisualModal(false);
      setQuery(cleanName);
      setSearchType('images');
      fetchSearch(cleanName, 1, 'images', timeFilter);
    }
  };

  // Topik Hangat Real-Time Board State
  const [hotCategory, setHotCategory] = useState('all');
  const [isRefreshingHot, setIsRefreshingHot] = useState(false);
  const [trendingItems, setTrendingItems] = useState(HOT_SEARCH_CATEGORIES.all);

  const handleCategoryChange = (catKey) => {
    setHotCategory(catKey);
    setTrendingItems(HOT_SEARCH_CATEGORIES[catKey] || HOT_SEARCH_CATEGORIES.all);
  };

  const handleRefreshTrending = () => {
    setIsRefreshingHot(true);
    setTimeout(() => {
      const currentList = [...(HOT_SEARCH_CATEGORIES[hotCategory] || HOT_SEARCH_CATEGORIES.all)];
      const top3 = currentList.slice(0, 3);
      const rest = currentList.slice(3).sort(() => Math.random() - 0.5);
      const combined = [...top3, ...rest].map((item, i) => ({
        ...item,
        rank: i + 1
      }));
      setTrendingItems(combined);
      setIsRefreshingHot(false);
    }, 350);
  };

  const clientSearchCache = useRef(new Map());
  const clientSuggestionCache = useRef(new Map());
  const searchAbortRef = useRef(null);
  const suggestionAbortRef = useRef(null);

  // Load live trending queries on mount
  useEffect(() => {
    fetch('/api/suggestions/trending?limit=12')
      .then(res => res.json())
      .then(data => {
        if (data.trending && data.trending.length > 0) {
          const queries = data.trending.map(t => t.query);
          setPopularTopics(queries.slice(0, 6));

          setTrendingItems(prev => {
            const updated = [...prev];
            data.trending.forEach((item, idx) => {
              if (idx < updated.length) {
                updated[idx] = {
                  ...updated[idx],
                  title: item.query,
                  query: item.query,
                  heat: item.frequency ? `${(item.frequency * 1.5).toFixed(1)}M` : updated[idx].heat
                };
              }
            });
            return updated;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch search suggestions
  const fetchSuggestions = async (val) => {
    const trimmed = (val || '').trim();
    const cacheKey = trimmed.toLowerCase();

    if (loading || liveCrawling) return;

    if (!trimmed) {
      if (recentSearches && recentSearches.length > 0) {
        setSuggestions(recentSearches.map(item => ({
          query: typeof item === 'string' ? item : item.query,
          type: 'history',
          subtitle: (typeof item === 'object' && item.subtitle) ? item.subtitle : ''
        })));
        return;
      }
    }

    if (clientSuggestionCache.current.has(cacheKey)) {
      setSuggestions(clientSuggestionCache.current.get(cacheKey));
      return;
    }

    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
    }
    suggestionAbortRef.current = new AbortController();

    try {
      const endpoint = trimmed
        ? `/api/suggestions?q=${encodeURIComponent(trimmed)}&limit=8`
        : `/api/suggestions/trending?limit=8`;
      const res = await fetch(endpoint, { signal: suggestionAbortRef.current.signal });
      const data = await res.json();
      const rawList = data.suggestions || data.trending || [];
      const formattedList = rawList.map(s => {
        if (typeof s === 'string') {
          return { query: s, type: 'search' };
        }
        return {
          query: s.query || s.title || '',
          subtitle: s.subtitle || s.description || (s.type === 'entity' ? s.category : '') || '',
          thumbnail: s.thumbnail || s.image || s.leadImageUrl || '',
          type: s.type || 'search',
          isTrending: Boolean(s.isTrending || s.frequency > 500)
        };
      });
      clientSuggestionCache.current.set(cacheKey, formattedList);
      setSuggestions(formattedList);
    } catch (e) {
      if (e.name !== 'AbortError') {
        setSuggestions([]);
      }
    }
  };

  // Close suggestions, dismiss mobile soft keyboard, and reset focus mode when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        // 📱 Tutup keyboard Android saat tap di luar search box
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur();
        }
        if (!hasSearched && !query.trim()) {
          setIsSearchFocused(false);
        }
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setIsFilterMenuOpen(false);
      }
    };

    const handleDismissKeyboardOnScroll = () => {
      // 📱 Tutup keyboard Android saat user mulai scroll hasil pencarian
      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('scroll', handleDismissKeyboardOnScroll, { passive: true });
    window.addEventListener('touchmove', handleDismissKeyboardOnScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleDismissKeyboardOnScroll);
      window.removeEventListener('touchmove', handleDismissKeyboardOnScroll);
    };
  }, [hasSearched, query]);

  // Fetch search results
  const fetchSearch = async (searchQuery, targetPage = 1, type = searchType, time = timeFilter) => {
    // 📱 Tutup keyboard hp Android seketika begitu pencarian dijalankan
    setIsSearchFocused(false);
    setShowSuggestions(false);
    inputRef.current?.blur();
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    const trimmed = (searchQuery || '').trim();
    if (!trimmed && type !== 'images') {
      setResultsData(null);
      setHasSearched(false);
      return;
    }

    if (trimmed) {
      saveRecentSearch(trimmed);
    }

    const cacheKey = `${trimmed.toLowerCase()}_${targetPage}_${type}_${time}`;
    if (clientSearchCache.current.has(cacheKey)) {
      setResultsData(clientSearchCache.current.get(cacheKey));
      setHasSearched(true);
      setPage(targetPage);
      setShowSuggestions(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = new AbortController();

    // ⏱️ Batas waktu pencarian maksimal 10 detik per sesi tanya agar tidak membebani server untuk pengguna lain
    const searchTimeoutId = setTimeout(() => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    }, 10000);

    setLoading(true);
    setShowSuggestions(false);

    try {
      const url = `/api/search?q=${encodeURIComponent(trimmed)}&page=${targetPage}&limit=${type === 'images' ? 24 : 12}&type=${type}&time=${time}`;
      const res = await fetch(url, { signal: searchAbortRef.current.signal });
      clearTimeout(searchTimeoutId);
      const data = await res.json();
      clientSearchCache.current.set(cacheKey, data);
      setResultsData(data);
      setHasSearched(true);
      setPage(targetPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // ⚡ Instant Tab Switch Acceleration: Background pre-fetch images for this query
      if (type === 'all' && trimmed) {
        const imgKey = `${trimmed.toLowerCase()}_1_images_${time}`;
        if (!clientSearchCache.current.has(imgKey)) {
          const imgUrl = `/api/search?q=${encodeURIComponent(trimmed)}&page=1&limit=24&type=images&time=${time}`;
          fetch(imgUrl)
            .then(r => r.json())
            .then(imgData => {
              if (imgData && (imgData.results || imgData.images)) {
                clientSearchCache.current.set(imgKey, imgData);
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      clearTimeout(searchTimeoutId);
      if (e.name === 'AbortError') {
        setResultsData({
          query: trimmed,
          total: 0,
          results: [],
          durationMs: 10000,
          timedOut: true,
          message: 'Batas waktu pencarian 10 detik per sesi tanya tercapai (QoS Protection). Layanan dibatasi agar tetap cepat untuk semua pengguna.'
        });
        setHasSearched(true);
        setPage(1);
      } else {
        console.error('Search fetch failed:', e);
      }
    } finally {
      clearTimeout(searchTimeoutId);
      setLoading(false);
    }
  };

  const handleInputChange = (val) => {
    setQuery(val);
    setSelectedIndex(-1);
    setShowSuggestions(true);

    if (!val.trim()) {
      if (recentSearches && recentSearches.length > 0) {
        setSuggestions(recentSearches.map(item => ({
          query: typeof item === 'string' ? item : item.query,
          type: 'history',
          subtitle: (typeof item === 'object' && item.subtitle) ? item.subtitle : ''
        })));
      } else {
        fetchSuggestions('');
      }
      return;
    }

    if (suggestionDebounceRef.current) {
      clearTimeout(suggestionDebounceRef.current);
    }
    suggestionDebounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 120);
  };

  const handleInputFocus = () => {
    setIsSearchFocused(true);
    setShowSuggestions(true);
    if (!query.trim()) {
      if (recentSearches && recentSearches.length > 0) {
        setSuggestions(recentSearches.map(item => ({
          query: typeof item === 'string' ? item : item.query,
          type: 'history',
          subtitle: (typeof item === 'object' && item.subtitle) ? item.subtitle : ''
        })));
      } else {
        fetchSuggestions('');
      }
    } else {
      fetchSuggestions(query);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setIsSearchFocused(false);
    setShowSuggestions(false);
    // 📱 Tutup keyboard hp Android seketika
    inputRef.current?.blur();
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      const selected = suggestions[selectedIndex];
      const queryText = typeof selected === 'string' ? selected : (selected.query || selected.title || '');
      setQuery(queryText);
      fetchSearch(queryText, 1, searchType, timeFilter);
    } else {
      fetchSearch(query, 1, searchType, timeFilter);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // 📱 Tutup keyboard hp Android seketika saat tombol Enter ditekan
      setIsSearchFocused(false);
      setShowSuggestions(false);
      inputRef.current?.blur();
      if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }

    if (!showSuggestions || !suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      if (!hasSearched && !query.trim()) {
        setIsSearchFocused(false);
      }
    }
  };

  const handleSelectSuggestion = (text) => {
    setIsSearchFocused(false);
    setShowSuggestions(false);
    // 📱 Tutup keyboard hp Android seketika
    inputRef.current?.blur();
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    setQuery(text);
    fetchSearch(text, 1, searchType, timeFilter);
  };

  const handleFillQuery = (text) => {
    setQuery(text);
    inputRef.current?.focus();
  };

  // ⚡ Hover / Touch Tab Prefetch for Zero-Lag (0ms) Switching
  const prefetchTab = (tabId) => {
    if (!query.trim() || tabId === searchType) return;
    const trimmed = query.trim();
    const cacheKey = `${trimmed.toLowerCase()}_1_${tabId}_${timeFilter}`;
    if (clientSearchCache.current.has(cacheKey)) return;
    const url = `/api/search?q=${encodeURIComponent(trimmed)}&page=1&limit=${tabId === 'images' ? 24 : 12}&type=${tabId}&time=${timeFilter}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data && (data.results || data.images)) {
          clientSearchCache.current.set(cacheKey, data);
        }
      })
      .catch(() => {});
  };

  const handleSearchTypeChange = (typeId) => {
    setSearchType(typeId);
    if (query.trim() || typeId === 'images') {
      fetchSearch(query, 1, typeId, timeFilter);
    }
  };

  const handleTimeFilterChange = (timeId) => {
    setTimeFilter(timeId);
    if (query.trim()) {
      fetchSearch(query, 1, searchType, timeId);
    }
  };

  const handlePageChange = (newPage) => {
    fetchSearch(query, newPage, searchType, timeFilter);
  };

  const handleLiveCrawl = async () => {
    if (!query.trim()) return;
    setLiveCrawling(true);
    try {
      await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });
      // Invalidate cache and refetch
      clientSearchCache.current.clear();
      await fetchSearch(query, 1, searchType, timeFilter);
    } catch (e) {
      console.warn('Live crawl request failed:', e);
    } finally {
      setLiveCrawling(false);
    }
  };

  const handleResetHome = () => {
    setQuery('');
    setResultsData(null);
    setHasSearched(false);
    setPage(1);
    setSearchType('all');
    setTimeFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearQuery = () => {
    setQuery('');
    setSelectedIndex(-1);
    setShowSuggestions(true);
    if (recentSearches && recentSearches.length > 0) {
      setSuggestions(recentSearches.map(item => ({
        query: typeof item === 'string' ? item : item.query,
        type: 'history',
        subtitle: (typeof item === 'object' && item.subtitle) ? item.subtitle : ''
      })));
    } else {
      fetchSuggestions('');
    }
    if (searchType === 'images') {
      fetchSearch('', 1, 'images', timeFilter);
    } else if (!hasSearched) {
      setResultsData(null);
    }
    inputRef.current?.focus();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const itemsPerPage = searchType === 'images' ? 24 : 12;
  const totalPages = resultsData ? Math.max(1, Math.ceil(resultsData.total / itemsPerPage)) : 1;

  const renderPaginationNumbers = () => {
    return Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
      const pNum = i + 1;
      return (
        <button
          key={pNum}
          type="button"
          onClick={() => handlePageChange(pNum)}
          className={`page-num-btn ${page === pNum ? 'active' : ''}`}
        >
          {pNum}
        </button>
      );
    });
  };

  // Unified Navigation Tabs
  const renderNavigationTabs = (isHeaderMode = false) => (
    <div className={`google-tabs-wrapper ${isHeaderMode ? 'in-header' : 'in-hero'}`} ref={isHeaderMode ? filterMenuRef : undefined}>
      <div className="google-nav-tabs">
        {SEARCH_TYPES.map((t) => {
          const Icon = t.icon;
          const isActive = searchType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSearchTypeChange(t.id)}
              onMouseEnter={() => prefetchTab(t.id)}
              onTouchStart={() => prefetchTab(t.id)}
              className={`google-nav-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span className="pill-text-desktop">{t.label}</span>
              <span className="pill-text-mobile">{t.shortLabel || t.label}</span>
            </button>
          );
        })}

        {/* AI Overview Quick Toggle */}
        <button
          type="button"
          onClick={toggleAiOverview}
          className={`google-nav-tab ai-toggle-tab ${aiOverviewEnabled ? 'ai-active' : 'ai-disabled'}`}
          title={aiOverviewEnabled ? 'Ringkasan AI Aktif (Klik untuk Mode Cepat tanpa AI)' : 'Mode Cepat Aktif (Klik untuk mengaktifkan Ringkasan AI)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: aiOverviewEnabled ? 'rgba(66, 133, 244, 0.1)' : 'rgba(128, 128, 128, 0.08)',
            border: aiOverviewEnabled ? '1px solid rgba(66, 133, 244, 0.3)' : '1px solid rgba(128, 128, 128, 0.2)',
            color: aiOverviewEnabled ? '#1a73e8' : 'inherit'
          }}
        >
          <Sparkles size={13} style={{ color: aiOverviewEnabled ? '#1a73e8' : '#70757a' }} />
          <span>{aiOverviewEnabled ? 'AI Ringkasan: ON' : 'Mode Cepat'}</span>
        </button>

        {/* Options Menu */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`google-nav-tab options-tab ${isFilterMenuOpen || timeFilter !== 'all' || viewMode !== 'results' ? 'active' : ''}`}
            title="Opsi Tampilan, Rentang Waktu & Crawl"
          >
            <SlidersHorizontal size={14} />
            <span>Opsi</span>
            <ChevronDown size={11} className={`dropdown-arrow-icon ${isFilterMenuOpen ? 'rotated' : ''}`} />
          </button>

          {isFilterMenuOpen && (
            <div className="header-filter-dropdown-menu">
              <div className="dropdown-section">
                <span className="dropdown-section-title">Format Tampilan</span>
                <button
                  type="button"
                  onClick={() => { setViewMode('results'); setIsFilterMenuOpen(false); }}
                  className={`dropdown-item ${viewMode === 'results' ? 'active' : ''}`}
                >
                  <div className="item-label-group">
                    <Layers size={13} />
                    <span>{searchType === 'images' ? 'Galeri Gambar' : 'Hasil Web'}</span>
                  </div>
                  {viewMode === 'results' && <Check size={13} className="text-blue-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('json'); setIsFilterMenuOpen(false); }}
                  className={`dropdown-item ${viewMode === 'json' ? 'active' : ''}`}
                >
                  <div className="item-label-group">
                    <Code2 size={13} />
                    <span>JSON Rapi</span>
                  </div>
                  {viewMode === 'json' && <Check size={13} className="text-blue-600" />}
                </button>
              </div>

              {searchType === 'all' && (
                <div className="dropdown-section">
                  <span className="dropdown-section-title">Rentang Waktu</span>
                  {TIME_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { handleTimeFilterChange(f.id); setIsFilterMenuOpen(false); }}
                      className={`dropdown-item ${timeFilter === f.id ? 'active' : ''}`}
                    >
                      <div className="item-label-group">
                        <Clock size={13} />
                        <span>{f.label}</span>
                      </div>
                      {timeFilter === f.id && <Check size={13} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="dropdown-section no-border">
                <button
                  type="button"
                  onClick={() => { handleLiveCrawl(); setIsFilterMenuOpen(false); }}
                  disabled={liveCrawling}
                  className="dropdown-item crawl-action-item"
                >
                  <div className="item-label-group">
                    <Zap size={13} className={liveCrawling ? 'text-amber-500 animate-pulse' : 'text-blue-600'} />
                    <span>{liveCrawling ? 'Sedang Crawl...' : 'Live On-Demand Crawl'}</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Modern DeeperNova Search Input Form with Visual & Voice Search
  const renderSearchForm = (isHeaderMode = false) => (
    <div 
      ref={searchContainerRef} 
      className={`dn-search-form-wrap ${isHeaderMode ? 'in-header' : 'in-hero'}`}
      onClick={() => {
        if (!isHeaderMode && !isSearchFocused) {
          setIsSearchFocused(true);
          setShowSuggestions(true);
          setTimeout(() => inputRef.current?.focus(), 40);
        }
      }}
    >
      <form onSubmit={handleSubmit} className="dn-search-form">
        <div className={`dn-search-bar ${isHeaderMode ? 'is-header-bar google-header-bar' : 'is-hero-bar'} ${showSuggestions && suggestions.length > 0 ? 'has-dropdown' : ''} ${isListening ? 'listening-pulse' : ''}`}>
          
          {/* Left Icon: In header mode, clean '+' button as in Google mobile screenshot; in hero mode, Search icon */}
          {isHeaderMode ? (
            <button
              type="button"
              onClick={handlePlusClick}
              className="dn-plus-btn"
              title={query ? "Pencarian Baru (Bersihkan)" : "Kembali ke Beranda"}
            >
              <Plus size={20} />
            </button>
          ) : (
            <Search size={22} className="dn-search-icon" />
          )}

          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            inputMode="search"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Mendengarkan... Silakan berbicara kata kunci" : (isHeaderMode ? "Tanya DeeperNova" : "Telusuri dengan DeeperNova atau ketik URL...")}
            className="dn-search-input"
            autoFocus={false}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* In Header Mode: If query has text, show clean X. If query is empty, show Mic and Camera. Zero bulky 'Cari' button! */}
          {isHeaderMode ? (
            query.trim().length > 0 ? (
              <button
                type="button"
                onClick={clearQuery}
                className="dn-clear-btn google-clear-btn"
                title="Hapus kata kunci"
              >
                <X size={18} />
              </button>
            ) : (
              <div className="google-header-actions">
                <button
                  type="button"
                  onClick={startVoiceSearch}
                  className={`dn-action-btn dn-mic-btn ${isListening ? 'active-listening' : ''}`}
                  title={isListening ? "Hentikan perekaman suara" : "Pencarian Suara"}
                >
                  {isListening ? (
                    <MicOff size={18} className="mic-listening-icon" />
                  ) : (
                    <Mic size={18} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowVisualModal(true)}
                  className="dn-action-btn dn-camera-btn"
                  title="Cari dengan Gambar (Visual Search)"
                >
                  <Camera size={18} />
                </button>
              </div>
            )
          ) : (
            /* In Hero Mode: standard hero controls */
            <>
              {query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className="dn-clear-btn"
                  title="Hapus kata kunci"
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowVisualModal(true)}
                className="dn-action-btn dn-camera-btn"
                title="Cari dengan Gambar (Visual Search)"
              >
                <Camera size={19} />
              </button>

              <button
                type="button"
                onClick={startVoiceSearch}
                className={`dn-action-btn dn-mic-btn ${isListening ? 'active-listening' : ''}`}
                title={isListening ? "Hentikan perekaman suara" : "Pencarian Suara (Voice Search)"}
              >
                {isListening ? (
                  <MicOff size={19} className="mic-listening-icon" />
                ) : (
                  <Mic size={19} />
                )}
              </button>

              <button
                type="submit"
                className="dn-submit-btn"
                disabled={loading}
                title="Cari Web"
              >
                {loading ? (
                  <div className="spinner-sm" />
                ) : (
                  <>
                    <Search size={17} />
                    <span className="dn-submit-label">Cari</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Voice Listening Toast Indicator */}
      {isListening && (
        <div className="voice-listening-banner">
          <span className="voice-pulse-dot" />
          <span>{voiceNotice || 'Mendengarkan suara Anda... Silakan ucapkan kata kunci.'}</span>
        </div>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      <SearchSuggestions
        suggestions={suggestions}
        query={query}
        selectedIndex={selectedIndex}
        onSelectSuggestion={handleSelectSuggestion}
        onFillQuery={handleFillQuery}
        isVisible={showSuggestions}
      />
    </div>
  );

  return (
    <div className={`public-theme-wrapper ${theme === "dark" ? "dark-theme" : "light-theme"}`} data-theme={theme}>
      {/* Top Indeterminate Progress Bar */}
      {loading && (
        <div className="google-horizontal-loader" role="progressbar" aria-label="Memuat hasil pencarian...">
          <div className="google-loader-bar" />
        </div>
      )}

      {/* Top Navigation Bar: FULL HEADER EXPANSIVE SEARCH BAR */}
      <header className={`public-header ${isSearchActive ? 'active-search-header' : 'home-header'}`}>
        <div className="public-header-top-row">
          {/* Active Search Mode: Search input directly across full header with home button */}
          {isSearchActive ? (
            <div className="header-search-container-group">
              <button
                type="button"
                onClick={handleResetHome}
                className="header-home-btn desktop-only"
                title="Kembali ke Beranda"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="header-search-slot">
                {renderSearchForm(true)}
              </div>
            </div>
          ) : (
            <div className="home-header-placeholder" />
          )}

          {/* Header Right Actions */}
          <div className="header-actions-group">
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span className="theme-toggle-label">{theme === 'dark' ? 'Terang' : 'Gelap'}</span>
            </button>
            {showCrawlerLiveBadge && telemetry?.crawler?.state === 'RUNNING' && (
              <div 
                className="crawler-live-pill"
                onClick={onSwitchToAdmin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(0, 245, 160, 0.12)',
                  border: '1px solid rgba(0, 245, 160, 0.4)',
                  padding: '0.22rem 0.6rem',
                  borderRadius: '16px',
                  fontSize: '0.72rem',
                  color: '#00b875',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Crawler multi-workers sedang aktif berjalan bersamaan di latar belakang. Klik untuk membuka admin dashboard."
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f5a0', display: 'inline-block' }} className="animate-pulse" />
                <span className="crawler-live-text">Live Ingest: {(telemetry.crawler.rps || 0).toFixed(1)} req/s</span>
                <span className="crawler-live-short">{(telemetry.crawler.rps || 0).toFixed(1)} rps</span>
              </div>
            )}

            {onSwitchToAdmin && isLocalOrAdmin && (
              <button 
                type="button" 
                onClick={onSwitchToAdmin}
                className="admin-switch-btn"
                title="Buka panel Admin Crawler & Database"
              >
                <span>Admin</span>
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Single Set of Tabs in Header (Only when actively searching!) */}
        {isSearchActive && (
          <div className="public-header-tabs-row">
            {renderNavigationTabs(true)}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className={`public-main ${searchType === 'news' ? 'news-mode-active' : !isSearchActive ? 'hero-centered' : 'results-layout'}`}>
        {/* Search Hero Section (ONLY shown when !isSearchActive on home landing) */}
        {!isSearchActive && (
          <section className="search-hero-section expanded">
            <div className="hero-typography">
              <div className="hero-badge-pill">
                <Sparkles size={13} className="text-blue-500" />
                <span>Next-Gen AI Neural Search</span>
              </div>
              <h1 className="hero-title">
                DeeperNova <span className="hero-highlight">Search</span>
              </h1>
            </div>

            {/* Hero Search Box */}
            {renderSearchForm(false)}

            {/* Unified Navigation Tabs under search box */}
            <div style={{ marginTop: '1.25rem' }}>
              {renderNavigationTabs(false)}
            </div>

            {/* Topik Hangat Real-Time Board */}
            <div className="dn-hot-board-container">
              <div className="dn-hot-board-header">
                <div className="hot-header-left">
                  <Flame size={18} className="hot-flame-icon" />
                  <h2 className="hot-board-title">Topik Hangat Real-Time</h2>
                  <span className="hot-live-tag">
                    <span className="hot-pulse-dot" /> LIVE
                  </span>
                </div>

                <div className="hot-category-tabs">
                  {[
                    { id: 'all', label: 'Semua Tren' },
                    { id: 'national', label: 'Nasional' },
                    { id: 'tech', label: 'Teknologi & AI' },
                    { id: 'finance', label: 'Ekonomi' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`hot-category-pill ${hotCategory === cat.id ? 'active' : ''}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRefreshTrending}
                  disabled={isRefreshingHot}
                  className="hot-refresh-btn"
                  title="Segarkan daftar tren real-time"
                >
                  <RefreshCw size={13} className={isRefreshingHot ? 'animate-spin text-blue-600' : ''} />
                  <span>Segarkan</span>
                </button>
              </div>

              <div className="dn-hot-board-grid">
                {trendingItems.map((item, idx) => (
                  <div
                    key={`${hotCategory}_${idx}_${item.title}`}
                    className="hot-search-item"
                    onClick={() => {
                      setQuery(item.query || item.title);
                      fetchSearch(item.query || item.title, 1, 'all', 'all');
                    }}
                  >
                    <span className={`hot-rank-badge rank-${item.rank <= 3 ? item.rank : 'default'}`}>
                      {item.rank}
                    </span>
                    <span className="hot-item-title" title={item.title}>
                      {item.title}
                    </span>
                    {item.tag && (
                      <span className={`hot-item-tag tag-${item.tag.toLowerCase()}`}>
                        {item.tag}
                      </span>
                    )}
                    <span className="hot-item-heat">{item.heat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Topics Quick Chips */}
            <div className="popular-topics-row">
              <span className="popular-label">Pencarian Populer:</span>
              <div className="popular-chips">
                {popularTopics.map((topic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(topic);
                      fetchSearch(topic, 1, searchType, timeFilter);
                    }}
                    className="popular-chip"
                  >
                    <Search size={11} className="popular-chip-icon" />
                    <span>{topic}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Results Sections */}
        {isSearchActive && (
          <section className="search-results-section">
            {/* TAB: News Mode */}
            {searchType === 'news' && (
              <NewsTab 
                query={query} 
                onSelectNews={(article) => {
                  if (article && article.url) window.open(article.url, '_blank', 'noopener,noreferrer');
                }} 
              />
            )}

            {/* TAB: Economics Mode */}
            {searchType === 'economics' && (
              <EconomicsTab 
                query={query}
                onSelectAsset={(asset) => {
                  if (asset && asset.query) {
                    setQuery(asset.query);
                    fetchSearch(asset.query, 1, 'all', 'all');
                  }
                }}
              />
            )}

            {/* TAB: API Portal Mode */}
            {searchType === 'api' && (
              <ApiPortalTab 
                activeQuery={query}
                onTestQuery={(sampleQ) => {
                  setQuery(sampleQ);
                  setSearchType('all');
                  fetchSearch(sampleQ, 1, 'all', 'all');
                }}
              />
            )}

            {/* TAB 1: Web Results View in Responsive Grid with Sidebar */}
            {searchType === 'all' && viewMode === 'results' && resultsData && (
              <div className="dn-results-layout-grid">
                <div className="dn-results-primary-col">
                  {/* QoS 10-Second Search Deadline Notice Banner */}
                  {resultsData.timedOut && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '10px',
                      padding: '0.7rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary, #92400e)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                      <Clock size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                      <span>
                        <strong>Batas Waktu Sesi (Maks 10 Detik):</strong> Pencarian dibatasi maksimal 10 detik per sesi tanya agar sistem tetap ringan dan tidak mengganggu kecepatan pengguna lain.
                      </span>
                    </div>
                  )}

                  {/* Instant Answer Rich Widgets */}
                  {resultsData.instantAnswer && (
                    <ErrorBoundary fallback={null}>
                      <div className="instant-answer-container" style={{ marginBottom: '1.25rem' }}>
                        {resultsData.instantAnswer.type === 'currency_conversion' && (
                          <CurrencyCardWidget data={resultsData.instantAnswer} />
                        )}
                        {resultsData.instantAnswer.type === 'financial_asset' && (
                          <FinancialAssetCardWidget data={resultsData.instantAnswer} />
                        )}
                        {(resultsData.instantAnswer.type === 'knowledge_card' || resultsData.instantAnswer.type === 'celebrity_card') && (
                          <SlimBiographyCardWidget data={resultsData.instantAnswer} />
                        )}
                      </div>
                    </ErrorBoundary>
                  )}

                  {/* Ringkasan Cerdas DeeperNova AI Overview (Powered by Real AI) */}
                  {aiOverviewEnabled && (
                    <ErrorBoundary fallback={null}>
                      <AiOverview 
                        query={resultsData.query || query} 
                        results={resultsData.results || []} 
                      />
                    </ErrorBoundary>
                  )}

                  {/* Web Results List */}
                  {resultsData.results && resultsData.results.length > 0 ? (
                    <>
                      <div className={`search-results-list ${loading ? 'is-refreshing-results' : ''}`}>
                        {resultsData.results.map((item, idx) => (
                          <article 
                            key={`${resultsData.query || query}_${item.id || item.url || idx}`} 
                            className="search-result-card"
                            style={{ animationDelay: `${Math.min(idx, 15) * 35}ms` }}
                          >
                            <div className="result-card-main-content">
                              <div className="result-text-column">
                                <div className="result-header-row">
                                  <div className="domain-favicon-wrapper">
                                    {item.logoUrl ? (
                                      <img 
                                        src={item.logoUrl} 
                                        alt="" 
                                        className="domain-logo-img"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                    ) : (
                                      <Globe size={13} className="domain-fallback-icon" />
                                    )}
                                  </div>
                                  <span className="result-domain-name">{item.domain || 'web'}</span>
                                  <span className="result-url-display" title={item.url}>{item.url}</span>
                                </div>

                                <h2 className="result-title-link">
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    {(item.rawTitle || item.title || item.url || '').replace(/<[^>]*>/g, '')}
                                  </a>
                                </h2>

                                <p 
                                  className="result-snippet-text"
                                  dangerouslySetInnerHTML={{
                                    __html: item.snippet || item.description || ''
                                  }}
                                />
                              </div>

                              {item.leadImageUrl && (
                                <div className="result-lead-thumbnail-wrap">
                                  <img 
                                    src={item.leadImageUrl} 
                                    alt="" 
                                    className="result-lead-img"
                                    onError={(e) => {
                                      if (!e.currentTarget.dataset.proxied) {
                                        e.currentTarget.dataset.proxied = 'true';
                                        e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(item.leadImageUrl)}`;
                                      } else {
                                        const parent = e.currentTarget.closest('.result-lead-thumbnail-wrap');
                                        if (parent) parent.style.display = 'none';
                                        e.currentTarget.style.display = 'none';
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="search-pagination-bar">
                          <button
                            type="button"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className="pagination-btn"
                          >
                            <ChevronLeft size={16} />
                            <span>Sebelumnya</span>
                          </button>
                          <div className="pagination-pages-list">
                            {renderPaginationNumbers()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="pagination-btn"
                          >
                            <span>Selanjutnya</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-results-container">
                      <div className="empty-results-icon-wrap">
                        <Search size={32} />
                      </div>
                      <h3>Tidak ada hasil yang ditemukan untuk "{query}"</h3>
                      <p>Coba gunakan kata kunci yang lebih umum, periksa ejaan, atau gunakan kata kunci lain.</p>
                    </div>
                  )}
                </div>

                {/* Secondary Sidebar Column: Instant Cards & Quick Tools */}
                <aside className="dn-results-sidebar-col">
                  {/* Widget 2: Knowledge Base / Quick Info */}
                  <div className="dn-sidebar-card">
                    <div className="sidebar-card-header">
                      <div className="sidebar-header-title-group">
                        <Cpu size={16} className="text-blue-500" />
                        <h3 className="sidebar-card-title">DeeperNova Search AI</h3>
                      </div>
                    </div>
                    <div className="sidebar-card-body">
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                        Mesin pencari otonom Indonesia generasi baru dengan AI Overview, PageRank algoritma, BM25 indexing, dan crawler multi-pekerja berkecepatan tinggi.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* TAB 2: Image Search Gallery View */}
            {searchType === 'images' && viewMode === 'results' && resultsData && (
              <div className="images-gallery-section">
                {resultsData.results && resultsData.results.length > 0 ? (
                  <div className="images-waterfall-grid">
                    {resultsData.results.map((img, i) => (
                      <SmartImageCard
                        key={`${resultsData.query || query}_${img.id || img.imageUrl || i}`}
                        img={img}
                        onSelect={setSelectedImageModal}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="no-results-state">
                    <div className="no-results-icon">
                      <ImageIcon size={40} className="text-slate-300" />
                    </div>
                    <h3>Belum ada gambar yang cocok</h3>
                    <p>Jalankan Live On-Demand Crawl untuk meng-crawl web dan mengekstrak gambar berkualitas tinggi.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: JSON Inspector */}
            {viewMode === 'json' && resultsData && (
              <div className="json-inspector-section">
                <JsonViewer 
                  data={resultsData} 
                  title={`API Response: /api/search?q=${encodeURIComponent(resultsData.query || query)}&type=${searchType}`}
                />
              </div>
            )}
          </section>
        )}
      </main>

      {/* Visual Search Modal */}
      {showVisualModal && (
        <div className="visual-modal-backdrop" onClick={() => setShowVisualModal(false)}>
          <div className="visual-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="visual-modal-header">
              <div className="visual-modal-title">
                <Camera size={20} className="text-blue-600" />
                <h3>Pencarian Gambar (Visual Search)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVisualModal(false)}
                className="visual-modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>
            <div className="visual-modal-body">
              <label className="visual-upload-dropzone">
                <Upload size={36} className="text-blue-500 mb-2" />
                <span className="dropzone-main-text">Tarik foto ke sini atau klik untuk unggah</span>
                <span className="dropzone-sub-text">Mendukung file JPG, PNG, WEBP, GIF</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleVisualFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImageModal && (
        <div className="image-lightbox-backdrop" onClick={() => setSelectedImageModal(null)}>
          <div className="image-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedImageModal(null)}
              className="lightbox-close-btn"
            >
              <X size={20} />
            </button>
            <div className="lightbox-image-wrap">
              <img
                src={selectedImageModal.imageUrl || selectedImageModal.url}
                alt={selectedImageModal.alt || selectedImageModal.title || ''}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (!e.currentTarget.dataset.proxied) {
                    e.currentTarget.dataset.proxied = 'true';
                    e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(selectedImageModal.imageUrl || selectedImageModal.url)}`;
                  }
                }}
              />
            </div>
            <div className="lightbox-footer">
              <div className="lightbox-meta">
                <h4>{selectedImageModal.title || selectedImageModal.alt || 'Gambar Web'}</h4>
                <a href={selectedImageModal.pageUrl || selectedImageModal.url} target="_blank" rel="noopener noreferrer">
                  <span>Kunjungi Sumber ({selectedImageModal.domain})</span>
                  <ExternalLink size={13} />
                </a>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(selectedImageModal.imageUrl || selectedImageModal.url)}
                className="lightbox-copy-btn"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Tersalin' : 'Salin URL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
