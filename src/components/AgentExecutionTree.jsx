import React, { useState, useEffect, useRef } from 'react';

/**
 * Helper to unescape XML entities in detail strings
 */
function unescapeXml(safe) {
  if (!safe) return '';
  return String(safe)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Format step title to match Claude / Cursor / Antigravity Agent design
 * e.g. "Thought for 1s", "Ran git status", "Explored 1 file", etc.
 */
export function formatExecutionStepTitle(step) {
  const type = step.type || '';
  const title = (step.title || '').trim();
  const meta = (step.meta || '').trim();
  const dur = step.duration || '2s';

  switch (type) {
    case 'thought':
      return `Berpikir selama ${step.duration || '1s'}`;
    case 'command':
    case 'terminal':
      return `Perintah terminal dieksekusi · ${dur}`;
    case 'write':
    case 'file_write':
    case 'file':
      return `Membuat berkas ${meta || title || 'berkas'} · ${step.duration || '1s'}`;
    case 'patch':
    case 'patch_file':
      return `Patch diff ${meta || title || 'berkas'} · ${step.duration || '1s'}`;
    case 'grep':
    case 'grep_search':
      return `Grep pencarian kode ${meta ? `"${meta}"` : ''} · ${step.duration || '1s'}`;
    case 'revert':
    case 'revert_file':
      return `Rollback berkas ${meta || title || 'berkas'} · ${step.duration || '1s'}`;
    case 'delete':
    case 'file_delete':
      return `Menghapus berkas ${meta || title || 'berkas'} · ${step.duration || '1s'}`;
    case 'execute':
    case 'execute_code':
    case 'run_code':
      return `Eksekusi kode sandbox · ${dur}`;
    case 'read':
    case 'read_file':
      return `Membaca berkas ${meta || 'berkas'} · ${step.duration || '1s'}`;
    case 'check':
    case 'verify_file':
      return `Memverifikasi berkas ${meta || 'berkas'} · ${step.duration || '1s'}`;
    case 'search':
    case 'search_web':
      return `Pencarian Deepernova Search · ${step.duration || '1s'}`;
    case 'screenshot':
      return `Tangkapan layar web preview · ${step.duration || '1s'}`;
    case 'preview':
      return `Pratinjau web interaktif · ${step.duration || '1s'}`;
    case 'skill':
    case 'read_skill':
      return `📖 Membaca Skill: ${meta || title} · ${step.duration || '1s'}`;
    case 'search_skill':
      return `🔍 Menelusuri Pustaka Skill: ${meta || title} · ${step.duration || '1s'}`;
    case 'healing':
      return `Perbaikan Mandiri (Self-Healing) · ${dur}`;
    default:
      if (/terminal/i.test(title)) return `Perintah terminal dieksekusi · ${dur}`;
      if (/berkas|file/i.test(title)) return `Membuat berkas ${meta || title} · ${step.duration || '1s'}`;
      return `${title || 'Aksi dieksekusi'} · ${dur}`;
  }
}

/**
 * Extract structured search result items from step
 */
export function extractSearchResults(step) {
  if (!step) return [];
  if (Array.isArray(step.results) && step.results.length > 0) return step.results;
  if (Array.isArray(step.sources) && step.sources.length > 0) return step.sources;

  const text = step.detail || step.command || '';
  if (!text) return [];

  const items = [];
  const blocks = text.split(/\n\s*\n/);
  for (const b of blocks) {
    const urlMatch = b.match(/URL:\s*(https?:\/\/[^\s]+)/i) || b.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      const url = urlMatch[1];
      let domain = '';
      try { domain = new URL(url).hostname.replace(/^www\./i, ''); } catch (e) {}
      const firstLine = b.split('\n')[0].replace(/^[\d+.-]\s*/, '').trim();
      const title = firstLine && !firstLine.startsWith('URL:') ? firstLine : (domain || 'Sumber Terverifikasi');
      items.push({
        title,
        url,
        link: url,
        domain,
        snippet: b.replace(urlMatch[0], '').trim()
      });
    }
  }
  return items;
}

/**
 * Clean & Extract action pills and thoughts into discrete steps,
 * including stripping any <think>/<thought> or partial streaming <action_pill> tags
 * so raw XML never leaks into the chat bubble.
 */
export function extractExecutionStepsAndCleanContent(rawContent, reasoning = '', chainOfWork = []) {
  let content = String(rawContent || '');
  let combinedReasoning = String(reasoning || '').trim();
  const steps = [];

  // 0. Extract closed <think>, <thought>, <thinking>, <reasoning> tags from content
  const closedThoughtRegex = /<(?:think|thought|thinking|reasoning)>([\s\S]*?)<\/(?:think|thought|thinking|reasoning)>/gi;
  let tMatch;
  while ((tMatch = closedThoughtRegex.exec(content)) !== null) {
    const extracted = tMatch[1].trim();
    if (extracted && !combinedReasoning.includes(extracted)) {
      combinedReasoning += (combinedReasoning ? '\n\n' : '') + extracted;
    }
  }
  content = content.replace(closedThoughtRegex, '');

  // Strip unclosed <think> / <thought> tag at the end while streaming
  const unclosedThoughtRegex = /<(?:think|thought|thinking|reasoning)>([\s\S]*)$/i;
  const unclosedThoughtMatch = content.match(unclosedThoughtRegex);
  if (unclosedThoughtMatch) {
    const extracted = unclosedThoughtMatch[1].trim();
    if (extracted && !combinedReasoning.includes(extracted)) {
      combinedReasoning += (combinedReasoning ? '\n\n' : '') + extracted;
    }
    content = content.replace(unclosedThoughtRegex, '');
  }

  // 1. Thought / Reasoning step
  if (combinedReasoning) {
    steps.push({
      id: 'step_thought',
      type: 'thought',
      title: 'Penalaran & strategi',
      duration: '1s',
      detail: combinedReasoning,
      status: 'completed'
    });
  }

  // 2. Chain of Work items from backend
  if (Array.isArray(chainOfWork)) {
    chainOfWork.forEach((cow, idx) => {
      steps.push({
        id: cow.id || `cow_${idx}`,
        type: cow.type || 'command',
        title: cow.title || 'Langkah eksekusi',
        command: cow.command || cow.meta || '',
        meta: cow.meta || '',
        detail: cow.detail || cow.output || '',
        status: cow.status || 'completed',
        results: cow.results || cow.sources || [],
        sources: cow.sources || cow.results || []
      });
    });
  }

  // 3. Extract completed <action_pill> tags from streamed content
  const pillRegex = /<action_pill\s+id="([^"]*)"\s+type="([^"]*)"\s+title="([^"]*)"(?:\s+meta="([^"]*)")?(?:\s+status="([^"]*)")?>([\s\S]*?)<\/action_pill>/gi;
  let match;
  while ((match = pillRegex.exec(content)) !== null) {
    const pillId = match[1];
    if (!steps.some(s => s.id === pillId)) {
      steps.push({
        id: pillId,
        type: match[2],
        title: match[3],
        meta: match[4] || '',
        status: match[5] || 'completed',
        detail: unescapeXml(match[6])
      });
    }
  }

  // Remove completed action pills and any trailing unclosed <action_pill... during streaming
  const cleanContent = content
    .replace(pillRegex, '')
    .replace(/<action_pill[\s\S]*$/i, '')
    .trim();

  return { cleanContent, steps };
}

/**
 * ============================================================================
 * ⚡ ULTRA-CLEAN MINIMALIST EXECUTION TREE
 * Collapsed by default (even while streaming) so the UI stays calm & simple.
 * Shows a single quiet status line; click to expand steps if needed.
 * ============================================================================
 */
export default function AgentExecutionTree({ 
  steps = [], 
  isStreaming = false, 
  startTime = null,
  duration = null,
  onSelectFile,
  onOpenDrawer
}) {
  // Always collapsed by default for maximum simplicity! User can click to inspect.
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [activeStepId, setActiveStepId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(1);

  useEffect(() => {
    if (!isStreaming || !startTime) return;
    const timer = setInterval(() => {
      const sec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      setElapsedSec(sec);
    }, 1000);
    return () => clearInterval(timer);
  }, [isStreaming, startTime]);

  if (!steps || (steps.length === 0 && !isStreaming)) {
    return null;
  }

  const formatDurationText = (sec) => {
    if (!sec || sec < 60) return `${sec || 1}d`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}d` : `${m}m`;
  };

  const durText = duration || (elapsedSec ? formatDurationText(elapsedSec) : null);
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const activeStepTitle = lastStep
    ? formatExecutionStepTitle(lastStep).replace(/\s*·\s*\d+[smhd].*$/i, '')
    : 'Memproses permintaan...';

  const mainLabel = isStreaming
    ? activeStepTitle
    : `${steps.length} langkah selesai`;

  const handleCopyText = (e, text, idKey) => {
    e.stopPropagation();
    if (text) {
      navigator.clipboard?.writeText(text);
      setCopiedId(idKey);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className={`agent-execution-tree ${isTreeOpen ? 'is-open' : 'is-collapsed'}`}>
      <button
        type="button"
        className="agent-tree-summary-row" 
        onClick={() => setIsTreeOpen(!isTreeOpen)}
        title={isTreeOpen ? "Sembunyikan rincian langkah" : "Lihat rincian langkah kerja AI"}
      >
        <div className="agent-tree-summary-left">
          {isStreaming ? (
            <span className="agent-tree-live-spinner">
              <i className="fa-solid fa-circle-notch fa-spin" />
            </span>
          ) : (
            <span className="agent-tree-done-icon">
              <i className="fa-solid fa-check" />
            </span>
          )}
          <span className="agent-tree-summary-text">{mainLabel}</span>
          {durText && <span className="agent-tree-summary-time">· {durText}</span>}
        </div>
        <span className="agent-tree-summary-chevron">
          <i className={`fa-solid fa-chevron-${isTreeOpen ? 'up' : 'down'}`} />
        </span>
      </button>

      {isTreeOpen && steps.length > 0 && (
        <div className="agent-tree-items-list">
          {steps.map((step, idx) => {
            const stepId = step.id || `step_${idx}`;
            const isExpanded = activeStepId === stepId;
            const formattedTitle = formatExecutionStepTitle(step).replace(/\s*·\s*\d+[smhd].*$/i, '');
            const rawDetail = step.detail ? String(step.detail).trim() : '';
            const isWriteOrFile = ['write', 'file_write', 'file', 'patch', 'patch_file'].includes(step.type);
            const isSearch = ['search', 'search_web'].includes(step.type);
            const searchResults = isSearch ? extractSearchResults(step) : [];
            const isFailed = step.status === 'failed';
            const detailText = rawDetail || step.command || step.meta || '';

            return (
              <div key={stepId} className="agent-tree-node">
                <div 
                  className={`agent-tree-node-row ${isExpanded ? 'is-open' : ''} ${isFailed ? 'is-failed' : ''}`}
                  onClick={() => detailText && setActiveStepId(isExpanded ? null : stepId)}
                >
                  <span className="agent-tree-node-title">{formattedTitle}</span>
                  {detailText && (
                    <span className="agent-tree-node-chevron">{isExpanded ? '▾' : '›'}</span>
                  )}
                </div>

                {isExpanded && detailText && (
                  <div className="agent-tree-node-drawer">
                    {isSearch && searchResults.length > 0 && (
                      <div className="agent-tree-search-bubbles-wrap">
                        {searchResults.slice(0, 6).map((res, rIdx) => {
                          let domain = res.domain || '';
                          if (!domain && (res.url || res.link)) {
                            try { domain = new URL(res.url || res.link).hostname.replace(/^www\./i, ''); } catch (e) {}
                          }
                          return (
                            <a
                              key={`search_r_${rIdx}`}
                              href={res.url || res.link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="agent-search-bubble-item"
                            >
                              <div className="agent-search-bubble-info">
                                <span className="agent-search-bubble-domain">{domain || 'Web'}</span>
                                <span className="agent-search-bubble-title">{res.title || domain}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    <pre className="agent-tree-drawer-code">
                      {detailText.length > 2000 ? detailText.slice(0, 2000) + '\n...' : detailText}
                    </pre>

                    <div className="agent-tree-drawer-actions">
                      <button 
                        type="button" 
                        className="agent-tree-copy-btn"
                        onClick={(e) => handleCopyText(e, detailText, stepId)}
                      >
                        <i className={copiedId === stepId ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                        <span>{copiedId === stepId ? 'Tersalin' : 'Salin'}</span>
                      </button>
                      {isWriteOrFile && step.meta && (
                        <button
                          type="button"
                          className="agent-tree-editor-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFile?.(step.meta);
                            onOpenDrawer?.('files');
                          }}
                        >
                          <i className="fa-solid fa-code" />
                          <span>Buka di Workspace</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

