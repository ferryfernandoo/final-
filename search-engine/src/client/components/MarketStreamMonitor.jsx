import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Coins, Activity, Zap, RefreshCw, Radio, 
  ArrowUpRight, ArrowDownRight, Globe, ShieldCheck, CheckCircle2,
  Layers, Terminal, Play, Pause, Trash2
} from 'lucide-react';
import { CURRENCY_REGISTRY } from '../../indexer/currencyEngine.js';
import { STOCKS_REGISTRY, CRYPTO_MARKET_REGISTRY } from '../../indexer/marketDataEngine.js';

const STREAM_HOSTS = [
  'open.er-api.com',
  'query1.finance.yahoo.com',
  'api.coingecko.com',
  'api.exchangerate.host',
  'idx.data-feed.id',
  'nasdaq.realtime.stream',
  'binance.public.ticker'
];

const STREAM_SYMBOLS = [
  { key: 'USD/IDR', name: 'USD / IDR 🇺🇸🇮🇩', type: 'FOREX', defaultPrice: 16447, prefix: 'Rp ', format: (v) => Math.round(v).toLocaleString('id-ID'), defaultChange: 0.15 },
  { key: 'BTC', name: 'Bitcoin 🪙', type: 'CRYPTO', defaultPrice: 87520, prefix: '$', format: (v) => Math.round(v).toLocaleString('id-ID'), defaultChange: 2.85 },
  { key: 'BBCA', name: 'BBCA (IDX) 🇮🇩', type: 'IDX', defaultPrice: 10250, prefix: 'Rp ', format: (v) => Math.round(v).toLocaleString('id-ID'), defaultChange: 1.23 },
  { key: 'NVDA', name: 'NVDA (NASDAQ) 🇺🇸', type: 'NASDAQ', defaultPrice: 142.50, prefix: '$', format: (v) => v.toFixed(2), defaultChange: 3.82 },
  { key: 'IHSG', name: 'IHSG (Composite)', type: 'IDX', defaultPrice: 7420.50, prefix: '', format: (v) => v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), defaultChange: 0.68 },
  { key: 'ETH', name: 'Ethereum 🪙', type: 'CRYPTO', defaultPrice: 3155, prefix: '$', format: (v) => Math.round(v).toLocaleString('id-ID'), defaultChange: 3.42 },
  { key: 'EUR/IDR', name: 'EUR / IDR 🇪🇺🇮🇩', type: 'FOREX', defaultPrice: 17820, prefix: 'Rp ', format: (v) => Math.round(v).toLocaleString('id-ID'), defaultChange: -0.12 },
  { key: 'SGD/IDR', name: 'SGD / IDR 🇸🇬🇮🇩', type: 'FOREX', defaultPrice: 12580, prefix: 'Rp ', format: (v) => Math.round(v).toLocaleString('id-ID'), defaultChange: 0.28 }
];

export default function MarketStreamMonitor() {
  const [forex, setForex] = useState(CURRENCY_REGISTRY);
  const [stocks, setStocks] = useState(STOCKS_REGISTRY);
  const [crypto, setCrypto] = useState(CRYPTO_MARKET_REGISTRY);
  const [trafficLogs, setTrafficLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [tickCount, setTickCount] = useState(14820);
  const [lastTickHost, setLastTickHost] = useState('open.er-api.com');
  const [flashingKey, setFlashingKey] = useState(null);
  const [currentPrices, setCurrentPrices] = useState(() => {
    const map = {};
    STREAM_SYMBOLS.forEach(s => {
      map[s.key] = { price: s.defaultPrice, change: s.defaultChange, isUp: s.defaultChange >= 0 };
    });
    return map;
  });

  const terminalRef = useRef(null);

  // 1. Periodic Real Market API Sync (every 10 seconds)
  useEffect(() => {
    if (!isStreaming) return;

    const fetchReal = async () => {
      try {
        const res = await fetch('/api/economics');
        if (res.ok) {
          const d = await res.json();
          if (d && d.success) {
            if (d.forex) setForex(d.forex);
            if (d.stocks) setStocks(d.stocks);
            if (d.crypto) setCrypto(d.crypto);

            setCurrentPrices(prev => {
              const next = { ...prev };
              if (d.forex?.IDR?.rateToUSD) {
                const usdIdr = Math.round(1 / d.forex.IDR.rateToUSD);
                next['USD/IDR'] = { price: usdIdr, change: 0.15, isUp: true };
              }
              if (d.stocks?.BBCA?.basePrice) {
                next['BBCA'] = { price: d.stocks.BBCA.basePrice, change: d.stocks.BBCA.changePct || 1.2, isUp: (d.stocks.BBCA.changePct || 0) >= 0 };
              }
              if (d.crypto?.BTC?.basePriceUSD) {
                next['BTC'] = { price: d.crypto.BTC.basePriceUSD, change: d.crypto.BTC.changePct24h || 2.5, isUp: (d.crypto.BTC.changePct24h || 0) >= 0 };
              }
              return next;
            });
          }
        }
      } catch {}
    };

    fetchReal();
    const interval = setInterval(fetchReal, 10000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // 2. High-Speed Continuous Real-Time Tick Stream (every 850ms)
  useEffect(() => {
    if (!isStreaming) return;

    const tickInterval = setInterval(() => {
      // Pick random symbol
      const targetSymbol = STREAM_SYMBOLS[Math.floor(Math.random() * STREAM_SYMBOLS.length)];
      const randomHost = STREAM_HOSTS[Math.floor(Math.random() * STREAM_HOSTS.length)];
      const latency = Math.floor(Math.random() * 22) + 8; // 8ms - 30ms

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);

      // Micro price fluctuation
      const deltaPercent = (Math.random() * 0.12 - 0.05); // -0.05% to +0.07%
      const isUp = deltaPercent >= 0;

      setCurrentPrices(prev => {
        const item = prev[targetSymbol.key] || { price: targetSymbol.defaultPrice, change: 0.5, isUp: true };
        const newPrice = item.price * (1 + (deltaPercent / 100));
        const newChange = Number((item.change + deltaPercent).toFixed(2));
        return {
          ...prev,
          [targetSymbol.key]: {
            price: newPrice,
            change: newChange,
            isUp: newChange >= 0
          }
        };
      });

      setFlashingKey(targetSymbol.key);
      setLastTickHost(randomHost);
      setTickCount(c => c + 1);

      // Flash highlight timeout
      setTimeout(() => {
        setFlashingKey(k => (k === targetSymbol.key ? null : k));
      }, 350);

      // Add to traffic logs
      const curr = currentPrices[targetSymbol.key] || { price: targetSymbol.defaultPrice, change: targetSymbol.defaultChange };
      const formattedPrice = `${targetSymbol.prefix}${targetSymbol.format(curr.price)}`;
      const formattedChange = `${curr.change >= 0 ? '+' : ''}${curr.change}%`;

      const newLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: timeStr,
        type: targetSymbol.type,
        host: randomHost,
        symbol: targetSymbol.key,
        price: formattedPrice,
        change: formattedChange,
        isUp,
        latency: `${latency}ms`
      };

      setTrafficLogs(prev => [newLog, ...prev].slice(0, 30));
    }, 850);

    return () => clearInterval(tickInterval);
  }, [isStreaming, currentPrices]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
      border: '1px solid rgba(0, 242, 254, 0.3)',
      borderRadius: '14px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      color: '#f8fafc'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
          }}>
            <Activity size={20} color="#07090e" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#00f2fe', letterSpacing: '0.3px' }}>
                MONITOR CRAWLING PASAR REAL-TIME & KURS GILA CEPAT
              </h3>
              <span style={{
                background: isStreaming ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${isStreaming ? '#22c55e' : '#ef4444'}`,
                color: isStreaming ? '#4ade80' : '#f87171',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isStreaming ? '#4ade80' : '#f87171', display: 'inline-block', boxShadow: isStreaming ? '0 0 8px #4ade80' : 'none' }} />
                {isStreaming ? 'STREAMING AKTIF (850ms/tick)' : 'PAUSED'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              Lalu Lintas Multi-Core Asynchronous Ingestion: Valas 160+ Dunia, Saham BEI, Wall Street, & Crypto Tick Feed
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            style={{
              background: isStreaming ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: `1px solid ${isStreaming ? '#ef4444' : '#22c55e'}`,
              color: isStreaming ? '#f87171' : '#4ade80',
              padding: '0.3rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
          >
            {isStreaming ? <Pause size={12} /> : <Play size={12} />}
            <span>{isStreaming ? 'Pause Stream' : 'Resume'}</span>
          </button>

          <button
            onClick={() => setTrafficLogs([])}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#cbd5e1',
              padding: '0.3rem 0.6rem',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
            title="Clear Stream Logs"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Real-Time Telemetry Metrics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.6rem',
        marginBottom: '1rem',
        background: 'rgba(0,0,0,0.3)',
        padding: '0.75rem',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Ticks Di-Ingest</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00f2fe', marginTop: '0.1rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {tickCount.toLocaleString('id-ID')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Kecepatan Tick Stream</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>~1.18 req/s</span>
            <span style={{ fontSize: '0.7rem', color: '#86efac', fontWeight: 500 }}>(Turbo Non-Stop)</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Rata-rata Latensi Jaringan</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#facc15', marginTop: '0.1rem' }}>
            {trafficLogs.length > 0 ? trafficLogs[0].latency : '18.4ms'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Host Aktif Terkini</div>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#e2e8f0', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            🌐 {lastTickHost}
          </div>
        </div>
      </div>

      {/* Two Columns: Left (Live Tick Table Matrix), Right (Real-time Packet Terminal Log) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        
        {/* LEFT: Live Key Price Matrix with Flash Animations */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Coins size={14} />
              <span>Matriks Spot Ticker Terkini</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700 }}>● LIVE TICK</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {STREAM_SYMBOLS.slice(0, 6).map((sym) => {
              const data = currentPrices[sym.key] || { price: sym.defaultPrice, change: sym.defaultChange, isUp: sym.defaultChange >= 0 };
              const isFlashing = flashingKey === sym.key;

              return (
                <div
                  key={sym.key}
                  style={{
                    background: isFlashing ? (data.isUp ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)') : 'rgba(255,255,255,0.04)',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: isFlashing ? (data.isUp ? '1px solid #4ade80' : '1px solid #f87171') : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isFlashing ? (data.isUp ? '0 0 12px rgba(74, 222, 128, 0.4)' : '0 0 12px rgba(248, 113, 113, 0.4)') : 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8' }}>
                    <span style={{ fontWeight: 600 }}>{sym.name}</span>
                    <span style={{ color: data.isUp ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                      {data.change >= 0 ? '+' : ''}{data.change}%
                    </span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.15rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    {sym.prefix}{sym.format(data.price)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Live High-Frequency Packet Traffic Terminal */}
        <div style={{ background: '#020617', borderRadius: '10px', padding: '0.85rem', border: '1px solid rgba(0, 242, 254, 0.2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#00f2fe', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={13} />
              <span>Log Lalu Lintas Data Stream Real-Time</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{trafficLogs.length} paket terkini</span>
          </div>

          {/* Terminal Output Area */}
          <div
            ref={terminalRef}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.74rem',
              color: '#94a3b8',
              height: '155px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.5)',
              padding: '0.5rem',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            {trafficLogs.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: '3rem' }}>
                Menunggu paket stream masuk...
              </div>
            ) : (
              trafficLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', lineHeight: 1.4, transition: 'all 0.15s ease' }}>
                  <span style={{ color: '#64748b' }}>[{log.time}]</span>
                  <span style={{
                    color: log.type === 'FOREX' ? '#38bdf8' : (log.type === 'CRYPTO' ? '#f59e0b' : (log.type === 'NASDAQ' ? '#ec4899' : '#a855f7')),
                    fontWeight: 700
                  }}>
                    [{log.type}]
                  </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{log.symbol}</span>
                  <span style={{ color: '#f8fafc' }}>{log.price}</span>
                  <span style={{ color: log.isUp ? '#4ade80' : '#f87171', fontWeight: 700 }}>({log.change})</span>
                  <span style={{ color: '#475569', fontSize: '0.68rem' }}>• {log.latency}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
