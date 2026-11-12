// ============================================================================
// DeeperNova AI — Clean Minimal Sub-Agent Orchestrator Card (AI-Agent Style)
// ============================================================================
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  downloadSingleSubAgentFile,
  downloadAllSubAgentFilesAsZip,
  buildBundledHtmlPreview
} from '../../services/subAgentOrchestratorService';
import { highlightCode } from '../../utils/codeHighlight';
import { renderHighlightedCode } from './chatTextUtils';
import { FormattedMessageBody } from './ChatMessageFormatter';

export const SubAgentOrchestratorCard = React.memo(({
  subAgentData,
  userLanguage = 'id',
  message,
  onNavigate,
  onImageClick,
  onUpscaleHD,
  hdUpscalingMap,
  onSubAgentAction
}) => {
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [showRawLog, setShowRawLog] = useState(false);
  const [inspectedFileId, setInspectedFileId] = useState(null);
  const [copiedFileId, setCopiedFileId] = useState(null);
  const [copiedCot, setCopiedCot] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const logRef = useRef(null);

  const status = subAgentData?.status || 'idle';
  const isAwaiting = status === 'awaiting_confirmation';
  const isDismissed = status === 'dismissed';
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isAborted = status === 'aborted';

  const currentStage = subAgentData?.currentStage || 1;
  const files = useMemo(() => subAgentData?.files || [], [subAgentData?.files]);
  const thoughtSteps = useMemo(() => subAgentData?.thoughtSteps || [], [subAgentData?.thoughtSteps]);
  const cotText = subAgentData?.cotText || '';
  const activeWritingFile = subAgentData?.activeWritingFile || null;
  const finalAnswer = subAgentData?.finalAnswer || '';
  const elapsedSec = subAgentData?.elapsedSec || '0.2';
  const isEn = userLanguage === 'en';

  const primaryHtmlFile = useMemo(
    () => files.find((f) => /\.(html?|svg)$/i.test(f.name)) || null,
    [files]
  );

  const bundledPreviewHtml = useMemo(() => {
    if (!previewModalFile) return '';
    return buildBundledHtmlPreview(files, previewModalFile);
  }, [files, previewModalFile]);

  useEffect(() => {
    if (showRawLog && isRunning && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [cotText, showRawLog, isRunning]);

  if (!subAgentData) return null;

  const handleCopyFileCode = async (file) => {
    try {
      await navigator.clipboard.writeText(file.content || '');
      setCopiedFileId(file.id);
      setTimeout(() => setCopiedFileId(null), 1800);
    } catch (_e) {
      // ignore clipboard errors
    }
  };

  const handleCopyCot = async () => {
    try {
      await navigator.clipboard.writeText(cotText || '');
      setCopiedCot(true);
      setTimeout(() => setCopiedCot(false), 1800);
    } catch (_e) {
      // ignore clipboard errors
    }
  };

  const handleDownloadZip = async () => {
    if (isZipping || files.length === 0) return;
    setIsZipping(true);
    try {
      await downloadAllSubAgentFilesAsZip(files, subAgentData.taskDescription);
    } finally {
      setIsZipping(false);
    }
  };

  const handleOpenPreviewNewTab = () => {
    if (!bundledPreviewHtml) return;
    const blob = new Blob([bundledPreviewHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  // 1. AWAITING USER CONFIRMATION (Always ask user before Sub-Agent activates)
  if (isAwaiting) {
    const taskPreview = (subAgentData.taskDescription || '').trim();
    return (
      <div className="subagent-confirm-card">
        <div className="subagent-confirm-top">
          <div className="subagent-confirm-icon" aria-hidden="true">
            <i className="fa-solid fa-layer-group" />
          </div>
          <div className="subagent-confirm-text">
            <div className="subagent-confirm-title">
              <span>{isEn ? 'Activate Sub-Agent?' : 'Aktifkan Sub-Agent?'}</span>
              <span className="subagent-confirm-badge">
                {isEn ? 'Confirmation' : 'Konfirmasi'}
              </span>
            </div>
            {taskPreview && (
              <p className="subagent-confirm-desc">{taskPreview}</p>
            )}
          </div>
        </div>

        <div className="subagent-confirm-actions">
          <button
            type="button"
            className="subagent-btn-secondary"
            onClick={() => onSubAgentAction?.(message?.id, 'dismiss', subAgentData)}
          >
            {isEn ? 'Skip, keep text only' : 'Lewati'}
          </button>
          <button
            type="button"
            className="subagent-btn-primary"
            onClick={() => onSubAgentAction?.(message?.id, 'confirm', subAgentData)}
          >
            <i className="fa-solid fa-bolt" style={{ fontSize: '11px' }} />
            <span>{isEn ? 'Activate & Run' : 'Aktifkan Sub-Agent'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. DISMISSED STATE (Quiet reversible whisper pill)
  if (isDismissed) {
    return (
      <div className="subagent-dismissed-pill">
        <span>
          <i className="fa-regular fa-circle-pause" style={{ marginRight: '6px' }} />
          {isEn ? 'Sub-Agent was skipped' : 'Sub-Agent tidak diaktifkan'}
        </span>
        <button
          type="button"
          className="subagent-re-enable-btn"
          onClick={() => onSubAgentAction?.(message?.id, 'confirm', subAgentData)}
        >
          {isEn ? 'Activate' : 'Aktifkan'}
        </button>
      </div>
    );
  }

  // 3. RUNNING / COMPLETED / ERROR / ABORTED (Calm Minimal AI-Agent Pill + Expandable Tree)
  const latestStep = thoughtSteps[thoughtSteps.length - 1];
  const pillLabel = isRunning
    ? (activeWritingFile
        ? (isEn ? `Writing ${activeWritingFile}...` : `Menulis ${activeWritingFile}...`)
        : (latestStep?.title || (isEn ? 'Sub-Agent working...' : 'Sub-Agent bekerja...')))
    : isCompleted
    ? (isEn
        ? `Done • ${thoughtSteps.length} steps${files.length ? ` • ${files.length} files` : ''}`
        : `Selesai • ${thoughtSteps.length} langkah${files.length ? ` • ${files.length} berkas` : ''}`)
    : isAborted
    ? (isEn ? 'Sub-Agent stopped' : 'Sub-Agent dihentikan')
    : (isEn ? 'Sub-Agent interrupted' : 'Sub-Agent terganggu');

  const stageNames = isEn
    ? ['Planner', 'Engineer', 'Verifier']
    : ['Perencana', 'Konstruktor', 'Verifikator'];

  return (
    <div className="subagent-tree-root">
      {/* Compact AI-Agent Summary Pill */}
      <div className="subagent-pill-row">
        <button
          type="button"
          className={`subagent-summary-pill${isRunning ? ' is-running' : ''}${isCompleted ? ' is-completed' : ''}${isError ? ' is-error' : ''}`}
          onClick={() => setIsTreeExpanded((prev) => !prev)}
          aria-expanded={isTreeExpanded}
        >
          <span className="subagent-pill-indicator" aria-hidden="true">
            {isRunning ? (
              <span className="subagent-live-spinner" />
            ) : isCompleted ? (
              <i className="fa-solid fa-check" />
            ) : (
              <i className="fa-solid fa-circle-exclamation" />
            )}
          </span>
          <span className="subagent-pill-text">{pillLabel}</span>
          <span className="subagent-pill-meta">{elapsedSec}s</span>
          <i
            className={`fa-solid fa-chevron-down subagent-pill-chevron${isTreeExpanded ? ' open' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isRunning && (
          <button
            type="button"
            className="subagent-stop-chip"
            onClick={() => onSubAgentAction?.(message?.id, 'cancel', subAgentData)}
            title={isEn ? 'Stop Sub-Agent' : 'Hentikan Sub-Agent'}
          >
            <i className="fa-solid fa-stop" style={{ fontSize: '9px' }} />
            <span>{isEn ? 'Stop' : 'Stop'}</span>
          </button>
        )}
      </div>

      {/* Expanded Minimal Execution Tree Drawer */}
      {isTreeExpanded && (
        <div className="subagent-tree-drawer">
          <div className="subagent-stage-bar">
            {stageNames.map((name, idx) => {
              const stageNum = idx + 1;
              const isStageDone = isCompleted || currentStage > stageNum;
              const isStageActive = isRunning && currentStage === stageNum;
              return (
                <div
                  key={name}
                  className={`subagent-stage-chip${isStageActive ? ' active' : ''}${isStageDone ? ' done' : ''}`}
                >
                  <span className="subagent-stage-dot" />
                  <span>{name}</span>
                </div>
              );
            })}
          </div>

          <div className="subagent-step-list">
            {thoughtSteps.map((step, idx) => {
              const stepId = step.id || `step_${idx}`;
              const stepDone = isCompleted || step.status === 'done';
              const stepRunning = isRunning && !stepDone && idx === thoughtSteps.length - 1;
              const isStepOpen = expandedStepId === stepId;
              return (
                <div key={stepId} className="subagent-step-item">
                  <button
                    type="button"
                    className="subagent-step-btn"
                    onClick={() => step.detail && setExpandedStepId(isStepOpen ? null : stepId)}
                  >
                    <span className={`subagent-step-icon${stepDone ? ' done' : stepRunning ? ' running' : ''}`}>
                      {stepDone ? (
                        <i className="fa-solid fa-check" />
                      ) : stepRunning ? (
                        <span className="subagent-mini-dot" />
                      ) : (
                        <span className="subagent-idle-dot" />
                      )}
                    </span>
                    <span className="subagent-step-title">{step.title}</span>
                    {step.badge && (
                      <span className="subagent-step-badge">{step.badge}</span>
                    )}
                    {step.detail && (
                      <i
                        className={`fa-solid fa-chevron-right subagent-step-arrow${isStepOpen ? ' open' : ''}`}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  {isStepOpen && step.detail && (
                    <div className="subagent-step-detail">{step.detail}</div>
                  )}
                </div>
              );
            })}
          </div>

          {cotText && (
            <div className="subagent-rawlog-section">
              <div className="subagent-rawlog-bar">
                <button
                  type="button"
                  className="subagent-rawlog-toggle"
                  onClick={() => setShowRawLog((prev) => !prev)}
                >
                  <i className="fa-solid fa-terminal" style={{ fontSize: '10px' }} />
                  <span>
                    {showRawLog
                      ? (isEn ? 'Hide execution log' : 'Tutup log proses')
                      : (isEn ? 'View execution log' : 'Lihat log proses')}
                  </span>
                </button>
                {showRawLog && (
                  <button
                    type="button"
                    className="subagent-rawlog-copy"
                    onClick={handleCopyCot}
                  >
                    {copiedCot ? (isEn ? 'Copied' : 'Tersalin') : (isEn ? 'Copy' : 'Salin')}
                  </button>
                )}
              </div>
              {showRawLog && (
                <pre ref={logRef} className="subagent-rawlog-pre">
                  {cotText}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clean Compact Deliverables Hub (Only rendered when files are produced) */}
      {files.length > 0 && (
        <div className="subagent-files-card">
          <div className="subagent-files-header">
            <span className="subagent-files-title">
              <i className="fa-regular fa-folder-open" style={{ marginRight: '6px', color: '#ea580c' }} />
              {isEn ? `Generated Files (${files.length})` : `Berkas Hasil (${files.length})`}
            </span>
            <div className="subagent-files-bulk-actions">
              {primaryHtmlFile && (
                <button
                  type="button"
                  className="subagent-action-pill primary"
                  onClick={() => setPreviewModalFile(primaryHtmlFile)}
                >
                  <i className="fa-solid fa-play" style={{ fontSize: '10px' }} />
                  <span>Preview Web</span>
                </button>
              )}
              {files.length > 1 && (
                <button
                  type="button"
                  className="subagent-action-pill"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                >
                  <i className={`fa-solid ${isZipping ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`} />
                  <span>{isZipping ? '...' : '.ZIP'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="subagent-files-list">
            {files.map((file) => {
              const isInspecting = inspectedFileId === file.id;
              const isHtmlOrSvg = /\.(html?|svg)$/i.test(file.name);
              return (
                <div key={file.id} className="subagent-file-item">
                  <div className="subagent-file-row">
                    <div className="subagent-file-info">
                      <span
                        className="subagent-file-icon"
                        style={{
                          background: file.bg || '#fff7ed',
                          color: file.color || '#ea580c'
                        }}
                      >
                        <i className={file.icon || 'fa-solid fa-file-code'} />
                      </span>
                      <div className="subagent-file-meta-col">
                        <span className="subagent-file-name">{file.name}</span>
                        <span className="subagent-file-submeta">
                          {file.badge} • {file.lineCount} {isEn ? 'lines' : 'baris'} • {file.sizeFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="subagent-file-actions">
                      <button
                        type="button"
                        className={`subagent-file-btn${isInspecting ? ' active' : ''}`}
                        onClick={() => setInspectedFileId(isInspecting ? null : file.id)}
                      >
                        {isInspecting ? (isEn ? 'Hide' : 'Tutup') : (isEn ? 'Code' : 'Kode')}
                      </button>
                      {isHtmlOrSvg && (
                        <button
                          type="button"
                          className="subagent-file-btn accent"
                          onClick={() => setPreviewModalFile(file)}
                        >
                          Preview
                        </button>
                      )}
                      <button
                        type="button"
                        className="subagent-file-btn dark"
                        onClick={() => downloadSingleSubAgentFile(file)}
                      >
                        {isEn ? 'Save' : 'Unduh'}
                      </button>
                    </div>
                  </div>

                  {isInspecting && (
                    <div className="subagent-code-inspector">
                      <div className="subagent-code-toolbar">
                        <span>{file.name} ({file.lineCount} baris)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyFileCode(file)}
                        >
                          {copiedFileId === file.id ? '✓ Tersalin' : 'Salin Kode'}
                        </button>
                      </div>
                      <pre className="subagent-code-pre">
                        <code>
                          {renderHighlightedCode(highlightCode(file.content || '', file.language || 'javascript'))}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Sub-Agent Markdown Summary */}
      {finalAnswer && (
        <div className="subagent-final-explanation" style={{ marginTop: '12px' }}>
          <FormattedMessageBody
            text={finalAnswer}
            isStreaming={isRunning}
            message={message}
            userLanguage={userLanguage}
            onNavigate={onNavigate}
            handleImageClick={onImageClick}
            handleUpscaleHD={onUpscaleHD}
            hdUpscalingMap={hdUpscalingMap}
          />
        </div>
      )}

      {/* Clean Responsive Web Live Preview Modal */}
      {previewModalFile && (
        <div
          className="subagent-preview-overlay"
          onClick={() => setPreviewModalFile(null)}
        >
          <div
            className="subagent-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="subagent-preview-toolbar">
              <div className="subagent-preview-title">
                <i className="fa-solid fa-bolt" style={{ color: '#ea580c' }} />
                <span>Preview — {previewModalFile.name}</span>
              </div>

              <div className="subagent-preview-controls">
                {['desktop', 'tablet', 'mobile'].map((vp) => (
                  <button
                    key={vp}
                    type="button"
                    className={`subagent-vp-btn${previewViewport === vp ? ' active' : ''}`}
                    onClick={() => setPreviewViewport(vp)}
                  >
                    {vp === 'desktop' ? 'Desktop' : vp === 'tablet' ? 'Tablet' : 'Mobile'}
                  </button>
                ))}
                <button
                  type="button"
                  className="subagent-vp-btn"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  title="Reload"
                >
                  <i className="fa-solid fa-rotate-right" />
                </button>
                <button
                  type="button"
                  className="subagent-vp-btn primary"
                  onClick={handleOpenPreviewNewTab}
                >
                  ↗ Tab Baru
                </button>
                <button
                  type="button"
                  className="subagent-vp-btn close"
                  onClick={() => setPreviewModalFile(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={`subagent-preview-stage${previewViewport === 'desktop' ? ' full' : ''}`}>
              <iframe
                key={previewKey}
                title={`SubAgent Preview ${previewModalFile.name}`}
                srcDoc={bundledPreviewHtml}
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                className="subagent-preview-iframe"
                style={{
                  width: previewViewport === 'mobile' ? '390px' : previewViewport === 'tablet' ? '768px' : '100%',
                  borderRadius: previewViewport === 'desktop' ? '0' : '12px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SubAgentOrchestratorCard;
