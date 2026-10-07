import React, { useState, useEffect } from 'react';

/**
 * ReasoningContainer - Futuristic Collapsible Container for DeeperNova Boron 1.1 Reasoning Monologue
 * Renders the thinking process inside <think> ... </think> tags separately from the final answer.
 */
export default function ReasoningContainer({
  thought = '',
  isStreaming = false,
  duration = null,
  initiallyExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [copied, setCopied] = useState(false);

  // Auto-expand while streaming thoughts
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  if (!thought && !isStreaming) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!thought) return;
    navigator.clipboard.writeText(thought);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-slate-900/90 via-slate-950/85 to-slate-900/90 shadow-xl backdrop-blur-md transition-all duration-300">
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Animated Brain Icon / Status */}
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400">
            <span className="text-sm">🧠</span>
            {isStreaming && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-amber-300 tracking-wide uppercase">
                Proses Penalaran Boron 1.1
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                {isStreaming ? '⚡ Sedang Berpikir...' : duration ? `Selesai (${duration}s)` : 'Selesai Menalar'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 truncate">
              {isStreaming
                ? 'Menganalisis logika instruksi & rantai pemikiran deduktif...'
                : 'Langkah pemikiran deduktif internal sebelum menyajikan jawaban'}
            </span>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 shrink-0">
          {thought && (
            <button
              onClick={handleCopy}
              title="Salin proses penalaran"
              className="rounded-lg p-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {copied ? '✓ Tersalin' : '📋'}
            </button>
          )}

          <div className="text-slate-400 text-xs px-1">
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Body monologue */}
      {isExpanded && (
        <div className="border-t border-amber-500/15 bg-black/40 px-4 py-3 text-xs leading-relaxed font-mono text-slate-300 whitespace-pre-wrap max-h-72 overflow-y-auto selection:bg-amber-500/30">
          <div className="italic opacity-90">
            {thought || (isStreaming ? 'Memulai simulasi penalaran...' : '')}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-400 animate-pulse align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
