import React, { useState, useEffect } from 'react';
import './AgenticTaskChainView.css';

/**
 * ====================================================================
 * ANTIGRAVITY AGENTIC TASK CHAIN ENGINE (Google Antigravity Standard)
 * ====================================================================
 * Faithful replica of Antigravity Orchestrator Flow:
 * - 🔬 Phase: RESEARCH & DISCOVERY (`grep_search`, `view_file`)
 * - 📋 Phase: PLANNING (`implementation_plan`, Checklist)
 * - ⚡ Phase: EXECUTION (`replace_file_content`, `write_to_file`)
 * - 🧪 Phase: VERIFICATION & SELF-HEALING (`linter_runner`, `run_command`)
 * - 🏁 Phase: WALKTHROUGH & TASK RESOLUTION
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

  // Calculate current active phase
  const getActivePhase = () => {
    if (task.status === 'completed') return { label: 'COMPLETE', color: 'green' };
    if (task.status === 'cancelled') return { label: 'CANCELLED', color: 'slate' };
    if (task.status === 'failed') return { label: 'FAILED', color: 'red' };
    
    const lastStep = task.steps?.[task.steps.length - 1];
    if (!lastStep) return { label: 'RESEARCH', color: 'blue' };
    if (lastStep.type === 'search' || lastStep.type === 'read') return { label: 'RESEARCH', color: 'blue' };
    if (lastStep.type === 'plan') return { label: 'PLANNING', color: 'orange' };
    if (lastStep.type === 'edit' || lastStep.type === 'create') return { label: 'EXECUTION', color: 'orange' };
    if (lastStep.type === 'linter' || lastStep.type === 'terminal') return { label: 'VERIFICATION', color: 'purple' };
    return { label: 'ACTING', color: 'orange' };
  };

  const currentPhase = getActivePhase();

  return (
    <div className="agentic-task-chain-container antigravity-flow">
      {/* 1. Antigravity Task Header */}
      <div className="task-header-card agy-header">
        <div className="task-header-left">
          <div className={`agy-status-pill phase-${currentPhase.color}`}>
            {task.status === 'running' && <span className="agy-pulse-icon">●</span>}
            <span className="phase-name">{currentPhase.label}</span>
          </div>
          <div className="task-meta">
            <span className="task-id-badge">ANTIGRAVITY TASK #{task.taskId?.slice(-4) || '101'}</span>
            <span className="task-status-text">
              {task.status === 'running' ? 'Autonomous ReAct Loop Active' : task.status === 'completed' ? 'All Operations Verified' : task.status === 'cancelled' ? 'Task Cancelled' : 'Execution Failed'}
            </span>
          </div>
        </div>

        <div className="task-header-right">
          {task.status === 'running' && onCancelTask && (
            <button 
              className="task-cancel-header-btn" 
              onClick={onCancelTask}
              title="Hentikan Antigravity Agent"
            >
              ⏹ Hentikan
            </button>
          )}
          <span className="task-steps-counter">
            {task.steps?.filter(s => s.status === 'completed').length || 0}/{task.steps?.length || 0} Actions
          </span>
        </div>
      </div>

      {/* 2. User Prompt Context Banner */}
      <div className="task-user-prompt-card agy-prompt">
        <div className="prompt-header-row">
          <span className="prompt-label">&lt;USER_REQUEST&gt;</span>
        </div>
        <p className="prompt-text">{task.prompt}</p>
        <span className="prompt-label">&lt;/USER_REQUEST&gt;</span>
      </div>

      {/* 3. Living Stream of Antigravity Actions */}
      <div className="task-chain-stream">
        {task.steps && task.steps.map((step, idx) => (
          <AntigravityStepCard 
            key={step.id || idx} 
            step={step}
            onOpenFile={onOpenFile}
            onOpenPreview={onOpenPreview}
            onOpenTerminal={onOpenTerminal}
            onRevertFile={onRevertFile}
          />
        ))}
      </div>

      {/* 4. Walkthrough & Resolution Card */}
      {task.finalAnswer && (
        <div className={`task-resolution-card agy-walkthrough ${task.status === 'cancelled' ? 'cancelled' : ''}`}>
          <div className="resolution-header">
            <span className="resolution-icon">{task.status === 'cancelled' ? '⏹' : '🏁'}</span>
            <h4>{task.status === 'cancelled' ? 'Eksekusi Dihentikan' : 'Walkthrough & Resolusi Tugas'}</h4>
          </div>
          <div className="resolution-body">
            <p>{task.finalAnswer}</p>
          </div>
          {task.actionsTaken && task.actionsTaken.length > 0 && (
            <div className="resolution-actions-bar">
              {task.actionsTaken.map((act, i) => (
                <button 
                  key={i} 
                  className={`res-action-btn ${act.type}`}
                  onClick={() => {
                    if (act.target && onOpenFile) onOpenFile(act.target);
                    if (act.type === 'preview' && onOpenPreview) onOpenPreview();
                    if (act.type === 'terminal' && onOpenTerminal) onOpenTerminal();
                  }}
                >
                  <span>{act.label}</span>
                  <span className="action-arrow">↗</span>
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
 * Antigravity Deterministic Tool Call Card
 */
const AntigravityStepCard = ({ 
  step, 
  onOpenFile, 
  onOpenPreview, 
  onOpenTerminal, 
  onRevertFile 
}) => {
  const isRunning = step.status === 'running';
  const [isOpen, setIsOpen] = useState(isRunning);
  const [userToggled, setUserToggled] = useState(false);

  useEffect(() => {
    if (step.status === 'running') {
      setIsOpen(true);
      setUserToggled(false);
    } else if (step.status === 'completed' && !userToggled) {
      // Auto-minimize/collapse when step finishes to keep UI neat
      setIsOpen(false);
    }
  }, [step.status, userToggled]);

  const handleToggle = () => {
    setUserToggled(true);
    setIsOpen(prev => !prev);
  };

  const getToolCallName = () => {
    switch (step.type) {
      case 'plan': return 'implementation_plan.md';
      case 'search': return 'call:default_api:grep_search';
      case 'read': return 'call:default_api:view_file';
      case 'edit': return 'call:default_api:replace_file_content';
      case 'create': return 'call:default_api:write_to_file';
      case 'delete': return 'call:default_api:delete_file';
      case 'terminal': return 'call:default_api:run_command';
      case 'linter': return 'call:default_api:linter_runner';
      case 'thought': return 'thought';
      default: return 'call:default_api:action';
    }
  };

  const getPhaseIcon = () => {
    switch (step.type) {
      case 'plan': return '📋';
      case 'search': return '🔍';
      case 'read': return '📖';
      case 'edit': return '✏️';
      case 'create': return '📄';
      case 'delete': return '🗑️';
      case 'terminal': return '💻';
      case 'linter': return '🧪';
      case 'thought': return '💭';
      default: return '⚡';
    }
  };

  return (
    <div className={`chain-step-card agy-step-card ${step.type} ${step.status} ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      {/* Header Bar with Tool Invocation Signature */}
      <button 
        type="button" 
        className="step-header-btn agy-step-header"
        onClick={handleToggle}
        title={isOpen ? "Klik untuk meminimalkan" : "Klik untuk membuka detail"}
      >
        <div className="step-header-left">
          <span className={`step-type-icon ${step.type === 'thought' && isRunning ? 'pulse-thinking' : ''}`}>
            {getPhaseIcon()}
          </span>
          <div className="agy-title-column">
            <div className="agy-signature-row">
              <span className="agy-tool-badge">{getToolCallName()}</span>
              {step.duration && <span className="agy-duration">({step.duration})</span>}
            </div>
            <span className="step-title">
              {step.type === 'thought' && isRunning ? (
                <span className="thinking-title-animated">
                  {step.title} <span className="live-thinking-dots">...</span>
                </span>
              ) : (
                step.title
              )}
            </span>
          </div>
        </div>

        <div className="step-header-right">
          {step.status === 'running' && (
            <span className="step-running-badge">
              <span className="mini-pulse-dot"></span>
              {step.type === 'thought' ? 'Reasoning...' : 'Running...'}
            </span>
          )}
          {step.status === 'completed' && (
            <span className="step-completed-badge">
              {step.type === 'thought' ? '✓ Reasoned' : '✓ Done'}
            </span>
          )}
          {step.status === 'error' && (
            <span className="step-error-badge">✕ Diagnostics</span>
          )}
          <span className="accordion-arrow">{isOpen ? '▼' : '▶'}</span>
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="step-body-content agy-body-content">
          {/* 1. Plan Mode (Checklist view) */}
          {step.type === 'plan' && (
            <div className="plan-checklist-view">
              <div className="plan-title-bar">
                <span>📋 Proposed Implementation Plan:</span>
              </div>
              <ul className="plan-items-list">
                {(step.items || (step.details ? step.details.split('\n') : [])).map((item, idx) => {
                  const cleaned = item.replace(/^[-*•\d.]\s*/, '').trim();
                  if (!cleaned) return null;
                  return (
                    <li key={idx} className="plan-item">
                      <span className="plan-check-bullet">[✓]</span>
                      <span className="plan-item-text">{cleaned}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 2. Codebase Grep Search */}
          {step.type === 'search' && (
            <div className="search-step-view">
              <div className="search-summary-bar">
                <span>{step.details}</span>
              </div>
              {step.matches && step.matches.length > 0 && (
                <div className="search-matches-list">
                  {step.matches.map((m, idx) => (
                    <div 
                      key={idx} 
                      className="search-match-row" 
                      onClick={() => onOpenFile?.(m.file)}
                      title={`Buka ${m.file} di baris ${m.line}`}
                    >
                      <span className="match-file">[{m.file}#L{m.line}]</span>
                      <span className="match-snippet">{m.snippet}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Reasoning / Chain of Thought */}
          {step.type === 'thought' && (
            <div className="thought-view agy-thought">
              <div className="thought-tag">&lt;thought&gt;</div>
              <pre>{step.details || step.thought}</pre>
              <div className="thought-tag">&lt;/thought&gt;</div>
            </div>
          )}

          {/* 4. View File (Read Line-Numbered Window) */}
          {step.type === 'read' && (
            <div className="read-file-view">
              <div className="file-bar">
                <span className="file-tag" onClick={() => onOpenFile?.(step.target || step.file)}>
                  📄 [{step.target || step.file}{step.lines ? `#L${step.lines}` : ''}]
                </span>
                {onOpenFile && (
                  <button className="open-in-editor-btn" onClick={() => onOpenFile(step.target || step.file)}>
                    Buka File ↗
                  </button>
                )}
              </div>
              <pre className="code-window">{step.details}</pre>
            </div>
          )}

          {/* 5. Inline Diff (+ / -) */}
          {step.type === 'edit' && (
            <div className="diff-view">
              <div className="diff-file-bar">
                <span className="diff-file-tag">📄 [{step.target || step.file}]</span>
                {step.confidence && (
                  <span className="confidence-pill">Match: {Math.round(step.confidence * 100)}%</span>
                )}
                {onRevertFile && step.target && (
                  <button 
                    className="revert-diff-btn" 
                    onClick={() => onRevertFile(step.target)}
                    title="Rollback snapshot berkas"
                  >
                    ↺ Revert Snapshot
                  </button>
                )}
              </div>

              {step.diff ? (
                <div className="inline-diff-container">
                  {step.diff.original && (
                    <div className="diff-chunk removal">
                      <span className="diff-symbol">-</span>
                      <pre className="diff-text">{step.diff.original}</pre>
                    </div>
                  )}
                  {step.diff.modified && (
                    <div className="diff-chunk addition">
                      <span className="diff-symbol">+</span>
                      <pre className="diff-text">{step.diff.modified}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="diff-summary-box">
                  <pre>{step.details || 'Atomic patch diterapkan dengan sukses.'}</pre>
                </div>
              )}
            </div>
          )}

          {/* 6. Write File (New File Creation) */}
          {step.type === 'create' && (
            <div className="create-file-view">
              <div className="create-file-bar">
                <span>📄 [{step.target}]</span>
                {onOpenFile && (
                  <button className="open-in-editor-btn" onClick={() => onOpenFile(step.target)}>
                    Buka di Editor ↗
                  </button>
                )}
              </div>
              {step.previewSnippet && (
                <pre className="code-snippet-preview">{step.previewSnippet}</pre>
              )}
            </div>
          )}

          {/* 7. Run Command (Terminal Live Output) */}
          {step.type === 'terminal' && (
            <div className="terminal-step-view">
              <div className="terminal-cmd-bar">
                <span className="cmd-prompt">$</span>
                <span className="cmd-text">{step.command}</span>
              </div>
              {step.output && (
                <div className="terminal-output-box">
                  <pre>{step.output}</pre>
                </div>
              )}
            </div>
          )}

          {/* 8. Linter & Static Analysis Verification */}
          {step.type === 'linter' && (
            <div className={`linter-step-view ${step.status}`}>
              <div className="linter-header">
                <span>{step.status === 'completed' ? '✓ Linter Diagnostics: Clean (0 Syntax Errors)' : '⚠️ Diagnostics Warning (Self-Healing Active)'}</span>
              </div>
              {step.diagnostics && (
                <pre className="linter-diagnostics">{step.diagnostics}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AgenticTaskChainView;
