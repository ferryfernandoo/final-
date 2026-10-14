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
    case 'search_skill':
      return `Panduan Keahlian: ${meta || title} · ${step.duration || '1s'}`;
    case 'healing':
      return `Perbaikan Mandiri (Self-Healing) · ${dur}`;
    default:
      if (/terminal/i.test(title)) return `Perintah terminal dieksekusi · ${dur}`;
      if (/berkas|file/i.test(title)) return `Membuat berkas ${meta || title} · ${step.duration || '1s'}`;
      return `${title || 'Aksi dieksekusi'} · ${dur}`;
  }
}

/**
 * Clean & Extract action pills and thoughts into discrete steps
 */
export function extractExecutionStepsAndCleanContent(rawContent, reasoning = '', chainOfWork = []) {
  let content = String(rawContent || '');
  const steps = [];

  // 1. Thought / Reasoning step
  if (reasoning && reasoning.trim()) {
    steps.push({
      id: 'step_thought',
      type: 'thought',
      title: 'Catatan Berpikir AI',
      duration: '1s',
      detail: reasoning.trim(),
      status: 'completed'
    });
  }

  // 2. Chain of Work items from backend
  if (Array.isArray(chainOfWork)) {
    chainOfWork.forEach((cow, idx) => {
      steps.push({
        id: cow.id || `cow_${idx}`,
        type: cow.type || 'command',
        title: cow.title || 'Action',
        command: cow.command || cow.meta || '',
        meta: cow.meta || '',
        detail: cow.detail || cow.output || '',
        status: cow.status || 'completed'
      });
    });
  }

  // 3. Extract <action_pill> tags from streamed content
  const pillRegex = /<action_pill\s+id="([^"]*)"\s+type="([^"]*)"\s+title="([^"]*)"(?:\s+meta="([^"]*)")?(?:\s+status="([^"]*)")?>([\s\S]*?)<\/action_pill>/gi;
  let match;
  while ((match = pillRegex.exec(content)) !== null) {
    const pillId = match[1];
    // Avoid duplicate if already exists in chainOfWork
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

  // Remove action pills from the final narrative text
  const cleanContent = content.replace(pillRegex, '').trim();

  return { cleanContent, steps };
}

/**
 * ============================================================================
 * ⚡ AGENT EXECUTION TREE (Claude / Cursor / Antigravity Agent Standard)
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
  // Closed by default when AI is done or loaded from history, open while streaming
  const [isTreeOpen, setIsTreeOpen] = useState(Boolean(isStreaming));
  const [activeStepId, setActiveStepId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(1);
  const prevStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (!isStreaming || !startTime) return;
    const timer = setInterval(() => {
      const sec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      setElapsedSec(sec);
    }, 1000);
    return () => clearInterval(timer);
  }, [isStreaming, startTime]);

  // When AI finishes answering (isStreaming transitions from true to false),
  // automatically collapse into closed state!
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setIsTreeOpen(false);
    } else if (!prevStreamingRef.current && isStreaming) {
      setIsTreeOpen(true);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  if (!steps || (steps.length === 0 && !isStreaming)) {
    return null;
  }

  const formatDurationText = (sec) => {
    if (!sec || sec < 60) return `${sec || 1}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const durText = duration || (elapsedSec ? formatDurationText(elapsedSec) : null);

  // Label changes to 'Lihat langkah...' when closed, and 'Sembunyikan langkah' when open
  const mainLabel = isStreaming
    ? 'Menjalankan tugas'
    : (isTreeOpen ? 'Sembunyikan langkah' : 'Lihat langkah...');

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
      {/* 1. Collapsible Root Summary ("Lihat langkah... · 2s ›") */}
      <div 
        className="agent-tree-summary-row" 
        onClick={() => setIsTreeOpen(!isTreeOpen)}
        title={isTreeOpen ? "Klik untuk menyembunyikan rincian langkah" : "Klik untuk melihat rincian langkah eksekusi"}
      >
        <div className="agent-tree-summary-left">
          {isStreaming ? (
            <span className="agent-tree-live-spinner">
              <i className="fa-solid fa-circle-notch fa-spin" />
            </span>
          ) : (
            <span className="agent-tree-done-icon">✓</span>
          )}
          <span className="agent-tree-summary-text">{mainLabel}</span>
          {durText && <span className="agent-tree-summary-time">· {durText}</span>}
        </div>
        <span className="agent-tree-summary-chevron">
          {isTreeOpen ? '▾' : '›'}
        </span>
      </div>

      {/* 2. Sub-steps Tree Items */}
      {isTreeOpen && steps.length > 0 && (
        <div className="agent-tree-items-list">
          {steps.map((step, idx) => {
            const stepId = step.id || `step_${idx}`;
            const isExpanded = activeStepId === stepId;
            const formattedTitle = formatExecutionStepTitle(step);
            const rawDetail = step.detail ? String(step.detail).trim() : '';
            const isCommandOrExec = ['command', 'terminal', 'execute', 'execute_code', 'run_code'].includes(step.type);
            const isWriteOrFile = ['write', 'file_write', 'file'].includes(step.type);
            const isFailed = step.status === 'failed' || /error|failed|gagal/i.test(rawDetail);

            const inputContent = step.command || (isWriteOrFile ? rawDetail : (step.meta || ''));
            const outputContent = isCommandOrExec ? (rawDetail || '(Proses selesai tanpa error tambahan)') : (rawDetail || 'Selesai');

            return (
              <div key={stepId} className="agent-tree-node">
                <div 
                  className={`agent-tree-node-row ${isExpanded ? 'is-open' : ''}`}
                  onClick={() => setActiveStepId(isExpanded ? null : stepId)}
                  title="Klik untuk memeriksa input dan output aksi ini"
                >
                  <span className="agent-tree-node-title">{formattedTitle}</span>
                  <span className="agent-tree-node-chevron">{isExpanded ? '▾' : '›'}</span>
                </div>

                {/* Expanded Input / Output Drawer */}
                {isExpanded && (
                  <div className="agent-tree-node-drawer">
                    {/* CASE 1: Terminal Command or Code Execution -> Distinct Input & Output Boxes */}
                    {isCommandOrExec ? (
                      <div className="agent-tree-io-grid">
                        {/* INPUT BOX */}
                        <div className="agent-tree-io-card is-input">
                          <div className="agent-tree-io-header">
                            <span className="agent-tree-io-badge input-badge">
                              <i className="fa-solid fa-terminal" /> Input Terminal / Perintah
                            </span>
                            <button
                              type="button"
                              className="agent-tree-io-copy-btn"
                              onClick={(e) => handleCopyText(e, inputContent, `${stepId}_in`)}
                              title="Salin perintah terminal"
                            >
                              <i className={copiedId === `${stepId}_in` ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                              <span>{copiedId === `${stepId}_in` ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <pre className="agent-tree-drawer-code is-terminal-input">
                            $ {inputContent || '(perintah internal)'}
                          </pre>
                        </div>

                        {/* OUTPUT BOX */}
                        <div className="agent-tree-io-card is-output">
                          <div className="agent-tree-io-header">
                            <span className={`agent-tree-io-badge ${isFailed ? 'failed-badge' : 'output-badge'}`}>
                              <i className={isFailed ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-check"} />
                              {isFailed ? ' Output Terminal (Eror)' : ' Output Terminal (Berhasil)'}
                            </span>
                            <button
                              type="button"
                              className="agent-tree-io-copy-btn"
                              onClick={(e) => handleCopyText(e, outputContent, `${stepId}_out`)}
                              title="Salin luaran terminal"
                            >
                              <i className={copiedId === `${stepId}_out` ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                              <span>{copiedId === `${stepId}_out` ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                          <pre className={`agent-tree-drawer-code is-terminal-output ${isFailed ? 'has-error' : ''}`}>
                            {outputContent}
                          </pre>
                        </div>
                      </div>
                    ) : isWriteOrFile ? (
                      /* CASE 2: File Creation -> Code / File Content & Status Box */
                      <div className="agent-tree-io-grid">
                        <div className="agent-tree-io-card is-input">
                          <div className="agent-tree-io-header">
                            <span className="agent-tree-io-badge file-badge">
                              <i className="fa-solid fa-file-lines" /> Isi Berkas: {step.meta || 'berkas'}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                className="agent-tree-io-copy-btn"
                                onClick={(e) => handleCopyText(e, inputContent, `${stepId}_code`)}
                                title="Salin isi berkas"
                              >
                                <i className={copiedId === `${stepId}_code` ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                                <span>{copiedId === `${stepId}_code` ? 'Tersalin' : 'Salin'}</span>
                              </button>
                              {step.meta && (
                                <button
                                  type="button"
                                  className="agent-tree-io-editor-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFile?.(step.meta);
                                    onOpenDrawer?.('files');
                                  }}
                                  title="Buka file ini di Editor"
                                >
                                  <i className="fa-solid fa-code" />
                                  <span>Editor</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <pre className="agent-tree-drawer-code is-file-content">
                            {inputContent || '(Berkas kosong)'}
                          </pre>
                        </div>
                        <div className="agent-tree-io-status-bar">
                          <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />
                          <span>Berkas <strong>{step.meta || 'file'}</strong> tersimpan sukses di workspace sandbox.</span>
                        </div>
                      </div>
                    ) : (
                      /* CASE 3: General / Thought / Exploration */
                      <div className="agent-tree-io-grid">
                        {step.meta && (
                          <div className="agent-tree-drawer-meta">
                            <span className="drawer-meta-key">Target:</span>
                            <span className="drawer-meta-val">{step.meta}</span>
                          </div>
                        )}
                        <pre className="agent-tree-drawer-code">
                          {rawDetail || step.command || '(Selesai tanpa luaran tambahan)'}
                        </pre>
                        <div className="agent-tree-drawer-actions">
                          <button 
                            type="button" 
                            className="agent-tree-copy-btn"
                            onClick={(e) => handleCopyText(e, rawDetail || step.command || step.meta, `${stepId}_gen`)}
                          >
                            <i className={copiedId === `${stepId}_gen` ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                            <span>{copiedId === `${stepId}_gen` ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>
                      </div>
                    )}
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

