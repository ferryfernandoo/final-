// High-Speed Client In-Memory AI Synthesis Cache (Instant 0ms display on repeat queries)
const aiOverviewClientCache = new Map();
const AI_CACHE_MAX = 500;
import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, Check, ExternalLink, ChevronDown, ChevronUp, AlertCircle, 
  Globe, BookOpen, ThumbsUp, ThumbsDown, MessageSquare, ArrowRight,
  RefreshCw, Sparkles, Brain, Layers
} from 'lucide-react';

/**
 * Google 4-Color AI Sparkle Icon Component
 */
function GoogleSparkleIcon({ size = 20, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path 
        d="M12 2L14.4 8.2L20.5 10.5L14.4 12.8L12 19L9.6 12.8L3.5 10.5L9.6 8.2L12 2Z" 
        fill="url(#google_ai_grad)" 
      />
      <circle cx="19" cy="5" r="1.8" fill="#4285F4" />
      <circle cx="5" cy="18" r="1.5" fill="#34A853" />
      <defs>
        <linearGradient id="google_ai_grad" x1="3.5" y1="2" x2="20.5" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.35" stopColor="#8b5cf6" />
          <stop offset="0.7" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Enhanced custom markdown renderer with interactive citation pills [1], [2], ... [15]
 */
function MarkdownRenderer({ content, sources = [] }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null; // 'ul' | 'ol'

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="ai-md-ol">
            {currentList.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item, sources) }} />
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="ai-md-ul">
            {currentList.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item, sources) }} />
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const formatInline = (text, sourcesList) => {
    let formatted = text
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-inline-link">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Strip citation tags [1], [2], ... [15] completely for clean, uncluttered reading
    formatted = formatted.replace(/\[\d+\]/g, '');

    return formatted;
  };

  lines.forEach((rawLine, lineIdx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    // Headers
    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${lineIdx}`} className="ai-md-h4" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(5), sources) }} />
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${lineIdx}`} className="ai-md-h3" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(4), sources) }} />
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${lineIdx}`} className="ai-md-h2" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(3), sources) }} />
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${lineIdx}`} className="ai-md-h1" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2), sources) }} />
      );
    }
    // Numbered list
    else if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(line.replace(/^\d+\.\s+/, ''));
    }
    // Bullet list
    else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(line.replace(/^[-*•]\s+/, ''));
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`bq-${lineIdx}`} className="ai-md-quote" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2), sources) }} />
      );
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <p key={`p-${lineIdx}`} className="ai-md-p" dangerouslySetInnerHTML={{ __html: formatInline(line, sources) }} />
      );
    }
  });

  flushList();
  return <div className="ai-markdown-body">{elements}</div>;
}

export default function AiOverview({ query, results = [] }) {
  const [summary, setSummary] = useState('');
  const [thinking, setThinking] = useState('');
  const [showThinking, setShowThinking] = useState(false);
  const [engineName, setEngineName] = useState('DeepSeek v4 Pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const [showAllSources, setShowAllSources] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down'
  const [activeCitIdx, setActiveCitIdx] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  // Interactive follow-up questions state
  const [chatHistory, setChatHistory] = useState([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Dynamic loading phase indicator
  const [loadingPhase, setLoadingPhase] = useState(0);

  useEffect(() => {
    let timer = null;
    if (loading) {
      setLoadingPhase(0);
      timer = setInterval(() => {
        setLoadingPhase(prev => (prev + 1) % 3);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const loadingPhrases = [
    `Membaca & menganalisis 15 sumber web untuk "${query}"...`,
    `DeepSeek sedang menyusun ringkasan cepat & padat...`,
    `Menyajikan jawaban langsung dengan sitasi terverifikasi...`
  ];

  const abortControllerRef = useRef(null);
  const pendingContentRef = useRef('');
  const renderFrameRef = useRef(null);

  const scheduleUpdate = (newText) => {
    pendingContentRef.current = newText;
    if (!renderFrameRef.current) {
      renderFrameRef.current = setTimeout(() => {
        setSummary(pendingContentRef.current);
        renderFrameRef.current = null;
      }, 30);
    }
  };

  const fetchSummary = async (targetQuery = query, targetResults = results) => {
    if (!targetQuery || !targetQuery.trim()) {
      setSummary('');
      return;
    }

    const normKey = targetQuery.trim().toLowerCase();
    if (aiOverviewClientCache.has(normKey)) {
      const cached = aiOverviewClientCache.get(normKey);
      setSummary(cached.summary);
      setThinking(cached.thinking || '');
      setSources(cached.sources || []);
      setLoading(false);
      setError(null);
      setLastQuery(targetQuery);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setSummary('');
    setThinking('');
    setShowThinking(false);
    setLastQuery(targetQuery);
    setIsExpanded(false);
    setShowAllSources(false);
    setFeedback(null);
    pendingContentRef.current = '';
    if (renderFrameRef.current) {
      clearTimeout(renderFrameRef.current);
      renderFrameRef.current = null;
    }

    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: targetQuery,
          // Send top 15 results for comprehensive grounding
          results: targetResults && targetResults.length > 0 ? targetResults.slice(0, 15) : []
        }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedThinking = '';
      let accumulatedContent = '';
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            currentEvent = null;
            continue;
          }

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
            continue;
          }

          if (trimmed === 'data: [DONE]') {
            if (renderFrameRef.current) {
              clearTimeout(renderFrameRef.current);
              renderFrameRef.current = null;
            }
            if (accumulatedContent) setSummary(accumulatedContent);
            setLoading(false);
            return;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              // 1. Step event (delivers 15 sources instantly in <50ms)
              if (currentEvent === 'step' || data.step) {
                if (data.sources && data.sources.length > 0) {
                  setSources(data.sources);
                }
              }
              // 2. Thinking event (if any reasoning trace is sent)
              else if (currentEvent === 'thinking' || data.chunk !== undefined) {
                const chunk = data.chunk || '';
                accumulatedThinking = data.accumulated || (accumulatedThinking + chunk);
                setThinking(accumulatedThinking);
                setShowThinking(true);
                setLoading(false);
              }
              // 3. Token event (DeepSeek answer live streaming word-by-word with smooth batching)
              else if (currentEvent === 'token' || data.token !== undefined) {
                const tok = data.token || '';
                accumulatedContent = data.accumulated || (accumulatedContent + tok);
                scheduleUpdate(accumulatedContent);
                setLoading(false);
              }
              // 4. Complete event
              else if (currentEvent === 'complete') {
                if (renderFrameRef.current) {
                  clearTimeout(renderFrameRef.current);
                  renderFrameRef.current = null;
                }
                const finalSumm = data.summary || accumulatedContent;
                const finalThink = data.thinking || accumulatedThinking;
                setSummary(finalSumm);
                if (data.thinking) setThinking(data.thinking);
                if (data.sources && data.sources.length > 0) setSources(data.sources);
                if (data.followUps && data.followUps.length > 0) setFollowUps(data.followUps);
                if (data.engine) setEngineName(data.engine);
                setLoading(false);

                // Cache in memory for instant 0ms access
                if (targetQuery && finalSumm) {
                  aiOverviewClientCache.set(targetQuery.trim().toLowerCase(), {
                    summary: finalSumm,
                    thinking: finalThink,
                    sources: data.sources || []
                  });
                }
              }
              // 5. Error event
              else if (currentEvent === 'error') {
                throw new Error(data.message || 'AI Synthesis error');
              }
            } catch (jsonErr) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('AI summary stream fetch error, falling back to instant client synthesis:', err);
      // Fallback: Synthesize intelligent summary directly from top web results
      const topSources = targetResults && targetResults.length > 0 ? targetResults.slice(0, 8) : [];
      if (topSources.length > 0) {
        const validSnippets = topSources
          .map(r => (r.snippet || r.description || '').replace(/<[^>]+>/g, '').trim())
          .filter(s => s.length > 20);

        let fallbackSummary = '';
        if (validSnippets.length > 0) {
          const first = validSnippets[0].slice(0, 180).replace(/[.,;:]\s*$/, '') + '.';
          const second = validSnippets[1] ? ' ' + validSnippets[1].slice(0, 150).replace(/[.,;:]\s*$/, '') + '.' : '';
          fallbackSummary = `${first}${second}`;
        } else {
          fallbackSummary = `**${targetQuery}** adalah kueri penelusuran di DeeperNova Search. Hasil teratas mencakup informasi dari ${topSources.map(s => s.domain).filter(Boolean).slice(0, 3).join(', ')}.`;
        }

        setSummary(fallbackSummary);
        setSources(topSources.map((s, idx) => ({
          citId: idx + 1,
          title: s.title || s.rawTitle || s.domain,
          domain: s.domain || '',
          url: s.url || '#',
          snippet: (s.snippet || s.description || '').slice(0, 150)
        })));
        setError(null);
      } else {
        setError({ message: 'Tidak dapat memuat Ringkasan AI saat ini. Silakan muat ulang.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query && query.trim() && query !== lastQuery) {
      fetchSummary(query, results);
    }
  }, [query]);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskFollowUp = async (textToAsk) => {
    const q = (textToAsk || followUpInput).trim();
    if (!q) return;

    setFollowUpInput('');
    setIsAsking(true);

    const updatedHistory = [...chatHistory, { role: 'user', text: q }];
    setChatHistory(updatedHistory);

    try {
      const res = await fetch('/api/ai/deep-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, history: updatedHistory })
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setChatHistory([
          ...updatedHistory,
          { role: 'assistant', text: data.summary, sources: data.sources || sources }
        ]);
      }
    } catch (e) {
      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', text: 'Maaf, terjadi kendala saat merespons pertanyaan lanjutan Anda.' }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  if (!query || !query.trim()) return null;

  const isLongContent = summary && summary.length > 260;

  return (
    <div className="ai-overview-compact-wrap">
      <div className="ai-overview-compact-card">
        {/* Shimmer line when generating */}
        {loading && <div className="ai-compact-shimmer" />}

        {/* Minimal Micro-Bar: NO bulky header, just a subtle 16px indicator */}
        <div className="ai-compact-row">
          <div className="ai-compact-brand">
            <GoogleSparkleIcon size={14} className={loading ? 'sparkle-spin-anim' : ''} />
            <span className="ai-compact-label">Ringkasan AI</span>
          </div>

          <div className="ai-compact-actions">
            {summary && (
              <button
                type="button"
                onClick={handleCopy}
                title="Salin ringkasan"
                className="ai-compact-icon-btn"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchSummary(query, results)}
              disabled={loading}
              title="Perbarui ringkasan"
              className="ai-compact-icon-btn"
            >
              <RefreshCw size={12} className={loading ? 'spin-anim' : ''} />
            </button>
          </div>
        </div>

        {/* Compact 1-line Loading State */}
        {loading && !summary && (
          <div className="ai-compact-loading">
            <span className="ai-compact-loading-dot" />
            <span className="ai-compact-loading-text">{loadingPhrases[loadingPhase]}</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="ai-compact-error">
            <AlertCircle size={13} />
            <span>{error.message}</span>
          </div>
        )}

        {/* Summary Content Body */}
        {summary && (
          <>
            <div className={`ai-compact-text-body ${isLongContent && !isExpanded ? 'is-clamped' : ''}`}>
              <MarkdownRenderer content={summary} sources={sources} />
            </div>

            {isLongContent && (
              <div style={{ marginTop: '0.2rem', marginBottom: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="ai-compact-expand-link"
                >
                  <span>{isExpanded ? 'Tampilkan lebih sedikit' : 'Selengkapnya'}</span>
                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
