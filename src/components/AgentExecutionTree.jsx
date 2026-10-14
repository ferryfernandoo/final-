import React, { useState, useEffect } from 'react';

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
  let cmd = (step.command || meta || title).trim();
  if (cmd.length > 55) {
    cmd = cmd.slice(0, 52) + '...';
  }

  switch (type) {
    case 'thought':
      return `Thought for ${step.duration || '1s'}`;
    case 'command':
      return `Ran ${cmd}`;
    case 'read':
    case 'check':
      return `Explored ${meta || title || '1 file'}`;
    case 'search':
      if (/^deepernova/i.test(title)) return title;
      return `Searched Deepernova for "${meta || title}"`;
    case 'write':
      return `Created ${meta || title}`;
    case 'execute':
      return `Executed ${meta || 'code'}`;
    case 'screenshot':
    case 'preview':
      return `Previewed live web capture`;
    default:
      if (/^(ran|thought|explored|searched|deepernova|created|executed|verified)\b/i.test(title)) {
        return title;
      }
      return title || 'Executed task action';
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
      title: 'Thought',
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
  const [isTreeOpen, setIsTreeOpen] = useState(true);
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
    if (!sec || sec < 60) return `${sec || 1}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const headerTitle = isStreaming
    ? `Working for ${formatDurationText(elapsedSec)}`
    : `Worked for ${duration || formatDurationText(elapsedSec)}`;

  const handleCopy = (e, step) => {
    e.stopPropagation();
    const textToCopy = step.detail || step.command || step.meta || '';
    if (textToCopy) {
      navigator.clipboard?.writeText(textToCopy);
      setCopiedId(step.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="agent-execution-tree">
      {/* 1. Collapsible Root Summary ("Worked for 2m ▾") */}
      <div 
        className="agent-tree-summary-row" 
        onClick={() => setIsTreeOpen(!isTreeOpen)}
        title="Klik untuk menyembunyikan atau menampilkan rincian aksi agent"
      >
        <div className="agent-tree-summary-left">
          {isStreaming ? (
            <span className="agent-tree-live-spinner">
              <i className="fa-solid fa-circle-notch fa-spin" />
            </span>
          ) : (
            <span className="agent-tree-done-icon">✓</span>
          )}
          <span className="agent-tree-summary-text">{headerTitle}</span>
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

            return (
              <div key={stepId} className="agent-tree-node">
                <div 
                  className={`agent-tree-node-row ${isExpanded ? 'is-open' : ''}`}
                  onClick={() => setActiveStepId(isExpanded ? null : stepId)}
                  title="Klik untuk memeriksa output atau kode aksi ini"
                >
                  <span className="agent-tree-node-title">{formattedTitle}</span>
                  <span className="agent-tree-node-chevron">{isExpanded ? '▾' : '›'}</span>
                </div>

                {/* Expanded Output / Code Drawer */}
                {isExpanded && (
                  <div className="agent-tree-node-drawer">
                    {step.meta && (
                      <div className="agent-tree-drawer-meta">
                        <span className="drawer-meta-key">Target:</span>
                        <span className="drawer-meta-val">{step.meta}</span>
                      </div>
                    )}
                    <pre className="agent-tree-drawer-code">
                      {rawDetail || step.command || '(Aksi selesai tanpa luaran konsol tambahan)'}
                    </pre>
                    <div className="agent-tree-drawer-actions">
                      <button 
                        type="button" 
                        className="agent-tree-copy-btn"
                        onClick={(e) => handleCopy(e, step)}
                      >
                        <i className={copiedId === step.id ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                        <span>{copiedId === step.id ? 'Tersalin' : 'Salin'}</span>
                      </button>

                      {step.type === 'write' && step.meta && (
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
                          <span>Buka di Editor</span>
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
