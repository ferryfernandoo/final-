import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import './AgenticTaskChainView.css';

/**
 * Helper: Clean and format AI response text from machine tokens and raw asterisks
 */
const cleanMarkdownAnswer = (rawText) => {
  if (!rawText) return '';
  let text = typeof rawText === 'string' ? rawText : (rawText.content || rawText.text || rawText.finalAnswer || (typeof rawText === 'object' ? JSON.stringify(rawText) : String(rawText || '')));
  if (typeof text !== 'string') text = String(text || '');
  return text
    .replace(/\[object Object\]/gi, '')
    .replace(/\[FINISH\]([\s\S]*?)\[\/FINISH\]/gi, '$1')
    .replace(/\[FINISH\]/gi, '')
    .replace(/\[\/FINISH\]/gi, '')
    .replace(/<finish>([\s\S]*?)<\/finish>/gi, '$1')
    .replace(/<finish>/gi, '')
    .replace(/<\/finish>/gi, '')
    .replace(/\[CREATE_FILE:[^\]]+\][\s\S]*?\[\/CREATE_FILE\]/gi, '')
    .replace(/\[EDIT_FILE:[^\]]+\][\s\S]*?\[\/EDIT_FILE\]/gi, '')
    .replace(/\*{4,}/g, '\n\n---\n\n')
    .replace(/^\s*\*\*\*\s*$/gm, '\n---\n')
    .trim();
};

/**
 * ====================================================================
 * ULTRA-MINIMALIST AGENTIC TASK CHAIN ENGINE (Cursor & Claude Standard)
 * Clean, Elegant, High-Intelligence Pair Programming Interface
 * ====================================================================
 */
export const AgenticTaskChainView = ({ 
  task, 
  onOpenFile, 
  onOpenPreview, 
  onOpenTerminal,
  onRevertFile,
  onCancelTask
}) => {
  if (!task) return null;

  const isRunning = task.status === 'running';
  const cleanedAnswer = cleanMarkdownAnswer(task.finalAnswer);

  return (
    <div className="agentic-task-chain-container minimalist-flow">
      {/* 1. Sleek User Prompt Message Bubble */}
      {task.prompt && (
        <div className="agy-user-message-row">
          <div className="agy-user-bubble">
            <span className="user-bubble-text">{task.prompt}</span>
          </div>
        </div>
      )}

      {/* 2. Compact Autonomous Actions Stream (Cursor Composer Style) */}
      {task.steps && task.steps.length > 0 && (
        <div className="agy-compact-steps-stream">
          {task.steps.map((step, idx) => (
            <MinimalistStepCard 
              key={step.id || idx} 
              step={step}
              onOpenFile={onOpenFile}
              onOpenPreview={onOpenPreview}
              onOpenTerminal={onOpenTerminal}
              onRevertFile={onRevertFile}
            />
          ))}
        </div>
      )}

      {/* 3. AI Assistant Conversational Response (Rich Markdown Formatting) */}
      {(cleanedAnswer || isRunning) && (
        <div className={`agy-assistant-response-card ${isRunning ? 'is-streaming' : ''}`}>
          <div className="assistant-card-header">
            <div className="assistant-brand-tag">
              <span className="agent-sparkle-icon">✨</span>
              <span className="agent-brand-name">Deepernova Autonomous Engineer</span>
            </div>
            {isRunning ? (
              <span className="agent-thinking-pulse">
                <span className="pulse-dot-live"></span>
                Berpikir & merancang...
              </span>
            ) : (
              <span className="agent-done-tag">Selesai ✓</span>
            )}
          </div>

          <div className="assistant-markdown-body">
            {cleanedAnswer ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return (
                      <code className={`minimal-code-badge ${className || ''}`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre({ node, children, ...props }) {
                    return (
                      <pre className="minimal-code-block" {...props}>
                        {children}
                      </pre>
                    );
                  },
                  table({ node, children, ...props }) {
                    return (
                      <div className="minimal-table-wrapper">
                        <table className="minimal-table" {...props}>{children}</table>
                      </div>
                    );
                  }
                }}
              >
                {cleanedAnswer}
              </ReactMarkdown>
            ) : (
              <div className="streaming-placeholder">
                <span className="shimmer-text">Menganalisis kode dan menyusun langkah terbaik...</span>
              </div>
            )}
          </div>

          {/* Action Quick Links (Open file, preview, terminal) */}
          {task.actionsTaken && task.actionsTaken.length > 0 && (
            <div className="minimal-actions-bar">
              {task.actionsTaken.map((act, i) => (
                <button 
                  key={i} 
                  className={`minimal-action-pill ${act.type}`}
                  onClick={() => {
                    if (act.target && onOpenFile) onOpenFile(act.target);
                    if (act.type === 'preview' && onOpenPreview) onOpenPreview();
                    if (act.type === 'terminal' && onOpenTerminal) onOpenTerminal();
                  }}
                  title={`Buka ${act.label}`}
                >
                  <span className="action-pill-text">{act.label}</span>
                  <span className="action-pill-arrow">↗</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Minimalist Collapsible Step Pill
 */
const MinimalistStepCard = ({ 
  step, 
  onOpenFile, 
  onOpenPreview, 
  onOpenTerminal, 
  onRevertFile 
}) => {
  const isRunning = step.status === 'running';
  const isThought = step.type === 'thought';
  const [isOpen, setIsOpen] = useState(false);

  const getStepIcon = () => {
    switch (step.type) {
      case 'create': return '📄';
      case 'edit': return '✏️';
      case 'search': return '🔍';
      case 'read': return '📖';
      case 'terminal': return '⚡';
      case 'linter': return '🧪';
      case 'thought': return '💭';
      case 'delete': return '🗑️';
      default: return '⚙️';
    }
  };

  const getStepTitle = () => {
    if (isThought) {
      return isRunning ? 'Reasoning & Planning...' : 'Thought Process';
    }
    return step.title || step.type;
  };

  return (
    <div className={`minimal-step-item ${step.type} ${step.status} ${isOpen ? 'expanded' : ''}`}>
      <div 
        className="minimal-step-pill" 
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <span className="step-pill-icon">{getStepIcon()}</span>
        <span className="step-pill-title">{getStepTitle()}</span>
        
        <div className="step-pill-status">
          {isRunning ? (
            <span className="running-dot-pulse"></span>
          ) : step.status === 'completed' ? (
            <span className="done-check">✓</span>
          ) : step.status === 'error' ? (
            <span className="error-x">✕</span>
          ) : null}
          <span className="step-expand-caret">{isOpen ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Expandable Step Details (Diffs, Output, Reasoning) */}
      {isOpen && (
        <div className="minimal-step-drawer">
          {isThought && (
            <div className="step-drawer-thought">
              <pre>{step.details || 'Reasoning in progress...'}</pre>
            </div>
          )}

          {step.type === 'edit' && step.diff && (
            <div className="step-drawer-diff">
              <div className="drawer-diff-header">
                <span className="diff-target-file">{step.target}</span>
                {onRevertFile && (
                  <button 
                    className="drawer-revert-btn"
                    onClick={(e) => { e.stopPropagation(); onRevertFile(step.target); }}
                  >
                    ↺ Undo Edit
                  </button>
                )}
              </div>
              <div className="drawer-diff-box">
                {step.diff.original && (
                  <div className="diff-row removal">
                    <span className="diff-mark">-</span>
                    <pre>{step.diff.original}</pre>
                  </div>
                )}
                {step.diff.modified && (
                  <div className="diff-row addition">
                    <span className="diff-mark">+</span>
                    <pre>{step.diff.modified}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {step.type === 'create' && (
            <div className="step-drawer-create">
              <span>Berkas <code>{step.target}</code> berhasil dibuat & tersimpan.</span>
              {onOpenFile && (
                <button 
                  className="drawer-open-btn"
                  onClick={(e) => { e.stopPropagation(); onOpenFile(step.target); }}
                >
                  Buka di Editor ↗
                </button>
              )}
            </div>
          )}

          {step.type === 'terminal' && (
            <div className="step-drawer-terminal">
              <div className="term-drawer-cmd">$ {step.command}</div>
              {step.output && <pre className="term-drawer-out">{step.output}</pre>}
            </div>
          )}

          {step.type === 'search' && step.matches && (
            <div className="step-drawer-search">
              {step.matches.length === 0 ? (
                <span className="no-match-text">Tidak ada hasil cocok.</span>
              ) : (
                step.matches.map((m, i) => (
                  <div 
                    key={i} 
                    className="search-match-item"
                    onClick={(e) => { e.stopPropagation(); onOpenFile?.(m.file); }}
                  >
                    <span className="match-file">{m.file}:{m.line}</span>
                    <span className="match-snippet">{m.snippet}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
