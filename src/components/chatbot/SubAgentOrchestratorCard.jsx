// ============================================================================
// DeeperNova AI — Synchronous Sub-Agent Orchestrator Card (ChatBot UI)
// ============================================================================
// Renders a clean, modern, interactive Sub-Agent Orchestrator panel inside
// ChatBot messages, displaying:
//   1. Synchronous 3-Stage Pipeline (Planner -> Engineer -> Verifier)
//   2. Collapsible Chain of Thought (CoT) with structured checkpoints & stream
//   3. Deliverable Files Hub (Inline Code Inspector, Live Web Preview, Single & ZIP Download)
//   4. Final Sub-Agent Explanation & Usage Guide
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  hdUpscalingMap
}) => {
  const [isCotExpanded, setIsCotExpanded] = useState(true);
  const [userToggledCot, setUserToggledCot] = useState(false);
  const [inspectedFileId, setInspectedFileId] = useState(null);
  const [copiedFileId, setCopiedFileId] = useState(null);
  const [copiedCot, setCopiedCot] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [previewViewport, setPreviewViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewKey, setPreviewKey] = useState(0);
  const cotScrollRef = useRef(null);

  const isRunning = subAgentData?.status === 'running';
  const isCompleted = subAgentData?.status === 'completed';
  const currentStage = subAgentData?.currentStage || 1;
  const files = useMemo(() => subAgentData?.files || [], [subAgentData?.files]);
  const thoughtSteps = useMemo(() => subAgentData?.thoughtSteps || [], [subAgentData?.thoughtSteps]);
  const cotText = subAgentData?.cotText || '';
  const activeWritingFile = subAgentData?.activeWritingFile || null;
  const finalAnswer = subAgentData?.finalAnswer || '';
  const elapsedSec = subAgentData?.elapsedSec || '0.5';

  // Auto-collapse CoT gently after completion unless user manually toggled it,
  // keeping it expanded while running so Chain of Thought is clearly visible
  useEffect(() => {
    if (isRunning && !userToggledCot) {
      setIsCotExpanded(true);
    }
  }, [isRunning, userToggledCot]);

  // Auto-scroll CoT box while streaming
  useEffect(() => {
    if (isRunning && isCotExpanded && cotScrollRef.current) {
      const el = cotScrollRef.current;
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [cotText, thoughtSteps.length, isRunning, isCotExpanded]);

  const primaryHtmlFile = useMemo(
    () => files.find(f => /\.(html?|svg)$/i.test(f.name)) || null,
    [files]
  );

  const bundledPreviewHtml = useMemo(() => {
    if (!previewModalFile) return '';
    return buildBundledHtmlPreview(files, previewModalFile);
  }, [files, previewModalFile]);

  if (!subAgentData) return null;

  const stages = [
    {
      index: 1,
      id: 'planner',
      label: userLanguage === 'en' ? '1. Planner & Architect' : '1. Arsitek & Perencana',
      sub: userLanguage === 'en' ? 'Blueprint & Files' : 'Desain & Spesifikasi',
      icon: 'fa-solid fa-compass-drafting'
    },
    {
      index: 2,
      id: 'engineer',
      label: userLanguage === 'en' ? '2. Engineer Sub-Agent' : '2. Konstruksi Berkas',
      sub: userLanguage === 'en' ? 'CoT & File Synthesis' : 'Eksekusi Kode & File',
      icon: 'fa-solid fa-microchip'
    },
    {
      index: 3,
      id: 'verifier',
      label: userLanguage === 'en' ? '3. Verifier & Delivery' : '3. Verifikasi & Kirim File',
      sub: userLanguage === 'en' ? 'QA & Packaging' : 'Validasi & Paket Unduh',
      icon: 'fa-solid fa-shield-check'
    }
  ];

  const handleToggleCot = () => {
    setUserToggledCot(true);
    setIsCotExpanded(prev => !prev);
  };

  const handleCopyCot = (e) => {
    e.stopPropagation();
    if (!cotText) return;
    navigator.clipboard?.writeText(cotText);
    setCopiedCot(true);
    setTimeout(() => setCopiedCot(false), 2000);
  };

  const handleCopyFileCode = (file) => {
    if (!file?.content) return;
    navigator.clipboard?.writeText(file.content);
    setCopiedFileId(file.id);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  const handleDownloadZip = async () => {
    if (files.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      await downloadAllSubAgentFilesAsZip(files, subAgentData.taskDescription || 'deepernova-subagent');
    } finally {
      setTimeout(() => setIsZipping(false), 600);
    }
  };

  const handleOpenPreviewNewTab = () => {
    if (!bundledPreviewHtml) return;
    const blob = new Blob([bundledPreviewHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getBadgeColorStyle = (badge = '') => {
    const b = badge.toUpperCase();
    if (b.includes('PLAN') || b.includes('ARSITEK')) {
      return { bg: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', border: 'rgba(79, 70, 229, 0.28)' };
    }
    if (b.includes('VERIF') || b.includes('QA')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.28)' };
    }
    return { bg: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: 'rgba(14, 165, 233, 0.28)' };
  };

  return (
    <div className="subagent-orchestrator-wrapper" style={{ marginTop: '14px', marginBottom: '12px', width: '100%' }}>
      {/* MAIN ORCHESTRATOR CARD */}
      <div
        className="subagent-orchestrator-card"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: isRunning ? '1.5px solid rgba(79, 70, 229, 0.45)' : '1.5px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: isRunning
            ? '0 10px 30px -5px rgba(79, 70, 229, 0.12), 0 4px 12px rgba(15, 23, 42, 0.04)'
            : '0 6px 20px -4px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          transition: 'all 0.25s ease'
        }}
      >
        {/* 1. TOP HEADER BAR */}
        <div
          style={{
            padding: '13px 16px',
            background: isRunning
              ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.06) 100%)'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, rgba(79, 70, 229, 0.04) 100%)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: isRunning
                  ? 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                flexShrink: 0,
                boxShadow: isRunning
                  ? '0 4px 12px rgba(79, 70, 229, 0.35)'
                  : '0 4px 12px rgba(16, 185, 129, 0.28)'
              }}
            >
              {isRunning ? (
                <i className="fa-solid fa-circle-notch fa-spin" />
              ) : (
                <i className="fa-solid fa-layer-group" />
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Sub-Agent Orchestrator
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '20px',
                    background: '#0f172a',
                    color: '#38bdf8',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  ⚡ SYNC MODE
                </span>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px'
                }}
                title={subAgentData.taskDescription}
              >
                {subAgentData.taskDescription}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '3px 9px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className="fa-regular fa-clock" style={{ fontSize: '10px', color: '#6366f1' }} />
              {elapsedSec}s
            </span>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3.5px 10px',
                borderRadius: '20px',
                background: isRunning ? 'rgba(79, 70, 229, 0.12)' : 'rgba(16, 185, 129, 0.14)',
                color: isRunning ? '#4f46e5' : '#047857',
                border: isRunning ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isRunning ? (
                <>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#4f46e5',
                      display: 'inline-block'
                    }}
                  />
                  {userLanguage === 'en' ? `Stage ${currentStage}/3` : `Tahap ${currentStage}/3`}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" style={{ fontSize: '10px' }} />
                  {userLanguage === 'en'
                    ? `Done • ${files.length} File${files.length !== 1 ? 's' : ''}`
                    : `Selesai • ${files.length} Berkas`}
                </>
              )}
            </span>
          </div>
        </div>

        {/* 2. SYNCHRONOUS 3-STAGE PIPELINE STEPPER */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '8px',
            padding: '10px 14px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          {stages.map((st) => {
            const stDone = isCompleted || currentStage > st.index;
            const stActive = isRunning && currentStage === st.index;
            return (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  background: stActive
                    ? '#ffffff'
                    : stDone
                      ? 'rgba(16, 185, 129, 0.06)'
                      : 'rgba(241, 245, 249, 0.7)',
                  border: stActive
                    ? '1.2px solid #6366f1'
                    : stDone
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : '1px solid #e2e8f0',
                  boxShadow: stActive ? '0 2px 8px rgba(99, 102, 241, 0.12)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    flexShrink: 0,
                    background: stDone ? '#10b981' : stActive ? '#4f46e5' : '#cbd5e1',
                    color: '#ffffff'
                  }}
                >
                  {stDone ? (
                    <i className="fa-solid fa-check" />
                  ) : stActive ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    st.index
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: stActive ? '#312e81' : stDone ? '#065f46' : '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {st.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {st.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. CHAIN OF THOUGHT (CoT) ACCORDION SECTION */}
        <div style={{ borderBottom: (files.length > 0 || activeWritingFile) ? '1px solid #e2e8f0' : 'none' }}>
          <div
            onClick={handleToggleCot}
            style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: isCotExpanded ? 'rgba(99, 102, 241, 0.04)' : '#ffffff',
              userSelect: 'none',
              transition: 'background 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px' }}>🧠</span>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                {userLanguage === 'en'
                  ? 'Sub-Agent Chain of Thought (CoT)'
                  : 'Chain of Thought (Alur Penalaran Sub-Agent)'}
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '1.5px 7px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#4f46e5'
                }}
              >
                {thoughtSteps.length} {userLanguage === 'en' ? 'steps' : 'langkah'}
              </span>
              {isRunning && (
                <span style={{ fontSize: '11px', color: '#4f46e5', fontStyle: 'italic', fontWeight: 600 }}>
                  {userLanguage === 'en' ? '• Reasoning synchronously...' : '• Menalar secara sinkron...'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cotText && (
                <button
                  type="button"
                  onClick={handleCopyCot}
                  title={userLanguage === 'en' ? 'Copy Chain of Thought' : 'Salin Chain of Thought'}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {copiedCot ? '✓ Disalin' : '📋 Salin CoT'}
                </button>
              )}
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                {isCotExpanded ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {isCotExpanded && (
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              {/* Structured CoT Checkpoints */}
              {thoughtSteps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: cotText ? '10px' : '0' }}>
                  {thoughtSteps.map((step, idx) => {
                    const badgeStyle = getBadgeColorStyle(step.badge);
                    const isStepRunning = step.status === 'running' && isRunning;
                    return (
                      <div
                        key={step.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '9px',
                          padding: '7px 10px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '9px',
                          fontSize: '12px'
                        }}
                      >
                        <span
                          style={{
                            marginTop: '2px',
                            color: isStepRunning ? '#4f46e5' : '#10b981',
                            fontSize: '12px',
                            flexShrink: 0
                          }}
                        >
                          {isStepRunning ? (
                            <i className="fa-solid fa-circle-notch fa-spin" />
                          ) : (
                            <i className="fa-solid fa-circle-check" />
                          )}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '5px',
                                background: badgeStyle.bg,
                                color: badgeStyle.color,
                                border: `1px solid ${badgeStyle.border}`
                              }}
                            >
                              {step.badge || 'AGENT'}
                            </span>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>
                              {step.title}
                            </span>
                          </div>
                          {step.detail && step.detail !== step.title && (
                            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '3px', lineHeight: 1.45 }}>
                              {step.detail}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Live Streaming CoT Monospace Trace */}
              {cotText && (
                <div
                  ref={cotScrollRef}
                  style={{
                    maxHeight: '185px',
                    overflowY: 'auto',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 13px',
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontSize: '11.5px',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: '1px solid #1e293b'
                  }}
                >
                  {cotText}
                  {isRunning && <span style={{ color: '#38bdf8', fontWeight: 800, marginLeft: '3px' }}>▍</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. LIVE FILE CONSTRUCTION INDICATOR (WHILE WRITING A FILE) */}
        {isRunning && activeWritingFile && (
          <div
            style={{
              padding: '11px 16px',
              background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(79, 70, 229, 0.05) 100%)',
              borderBottom: files.length > 0 ? '1px solid #e2e8f0' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-code fa-fade" style={{ color: '#0284c7', fontSize: '13px' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  {userLanguage === 'en'
                    ? `Writing file: ${activeWritingFile.name}`
                    : `Menulis berkas: ${activeWritingFile.name}`}
                </span>
              </div>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#0284c7',
                  background: 'rgba(14, 165, 233, 0.14)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                {activeWritingFile.lineCount} {userLanguage === 'en' ? 'lines' : 'baris'}...
              </span>
            </div>
            {activeWritingFile.previewTail && (
              <div
                style={{
                  background: '#0f172a',
                  color: '#94a3b8',
                  padding: '6px 10px',
                  borderRadius: '7px',
                  fontFamily: 'monospace',
                  fontSize: '10.5px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '62px',
                  overflow: 'hidden'
                }}
              >
                {activeWritingFile.previewTail}
              </div>
            )}
          </div>
        )}

        {/* 5. DELIVERABLE FILES HUB (MENGIRIMKAN FILE HASIL SUB-AGENT) */}
        {files.length > 0 && (
          <div style={{ padding: '14px 16px', background: '#ffffff' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px'
                  }}
                >
                  <i className="fa-solid fa-folder-open" />
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {userLanguage === 'en'
                      ? `Sub-Agent Deliverable Files (${files.length})`
                      : `Berkas Hasil Sub-Agent (${files.length} File)`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {userLanguage === 'en'
                      ? 'Ready to inspect, preview, or download to your device'
                      : 'Siap dilihat kodenya, dijalankan Live Preview, atau diunduh'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {primaryHtmlFile && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalFile(primaryHtmlFile)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9px',
                      border: '1px solid rgba(79, 70, 229, 0.3)',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                    }}
                  >
                    <i className="fa-solid fa-play" style={{ fontSize: '10px' }} />
                    <span>Live Preview</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9px',
                    border: '1px solid #059669',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <i className={`fa-solid ${isZipping ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`} />
                  <span>
                    {isZipping
                      ? (userLanguage === 'en' ? 'Packaging...' : 'Mengemas...')
                      : (userLanguage === 'en' ? 'Download All (.ZIP)' : 'Unduh Semua (.ZIP)')}
                  </span>
                </button>
              </div>
            </div>

            {/* Individual File Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {files.map((file) => {
                const isInspecting = inspectedFileId === file.id;
                const isHtmlOrSvg = /\.(html?|svg)$/i.test(file.name);
                return (
                  <div
                    key={file.id}
                    style={{
                      border: isInspecting ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        background: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '9px',
                            background: file.bg || 'rgba(79, 70, 229, 0.12)',
                            color: file.color || '#4f46e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            flexShrink: 0
                          }}
                        >
                          <i className={file.icon || 'fa-solid fa-file-code'} />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', Consolas, monospace",
                                fontSize: '12.5px',
                                fontWeight: 800,
                                color: '#0f172a'
                              }}
                            >
                              {file.name}
                            </span>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                padding: '1.5px 6px',
                                borderRadius: '5px',
                                background: file.bg || 'rgba(79, 70, 229, 0.1)',
                                color: file.color || '#4f46e5'
                              }}
                            >
                              {file.badge}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              {file.lineCount} {userLanguage === 'en' ? 'lines' : 'baris'} • {file.sizeFormatted}
                            </span>
                          </div>
                          {file.description && (
                            <div
                              style={{
                                fontSize: '11.5px',
                                color: '#475569',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {file.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* File Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setInspectedFileId(isInspecting ? null : file.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            border: '1px solid #cbd5e1',
                            background: isInspecting ? '#e0e7ff' : '#ffffff',
                            color: isInspecting ? '#3730a3' : '#334155',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <i className="fa-solid fa-code" style={{ fontSize: '10px' }} />
                          <span>{isInspecting ? (userLanguage === 'en' ? 'Hide' : 'Tutup') : (userLanguage === 'en' ? 'Code' : 'Kode')}</span>
                        </button>

                        {isHtmlOrSvg && (
                          <button
                            type="button"
                            onClick={() => setPreviewModalFile(file)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '7px',
                              border: '1px solid rgba(79, 70, 229, 0.35)',
                              background: 'rgba(79, 70, 229, 0.08)',
                              color: '#4f46e5',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <i className="fa-solid fa-eye" style={{ fontSize: '10px' }} />
                            <span>Preview</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => downloadSingleSubAgentFile(file)}
                          style={{
                            padding: '5px 11px',
                            borderRadius: '7px',
                            border: 'none',
                            background: '#0f172a',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <i className="fa-solid fa-download" style={{ fontSize: '10px' }} />
                          <span>{userLanguage === 'en' ? 'Download' : 'Unduh'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Code Inspector Drawer */}
                    {isInspecting && (
                      <div style={{ borderTop: '1px solid #e2e8f0', background: '#0f172a' }}>
                        <div
                          style={{
                            padding: '6px 12px',
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: '#94a3b8'
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {file.name} ({file.lineCount} baris)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyFileCode(file)}
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              border: 'none',
                              color: '#f8fafc',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {copiedFileId === file.id ? '✓ Tersalin' : '📋 Salin Kode'}
                          </button>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px 14px',
                            maxHeight: '340px',
                            overflow: 'auto',
                            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                            fontSize: '12px',
                            lineHeight: 1.55,
                            color: '#f8fafc'
                          }}
                        >
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
      </div>

      {/* 6. SUB-AGENT FINAL EXPLANATION & GUIDE */}
      {finalAnswer && (
        <div className="subagent-final-explanation" style={{ marginTop: '14px' }}>
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

      {/* 7. INTERACTIVE LIVE PREVIEW MODAL FOR HTML/WEB DELIVERABLES */}
      {previewModalFile && (
        <div
          onClick={() => setPreviewModalFile(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '1120px',
              height: '86vh',
              background: '#0f172a',
              borderRadius: '18px',
              border: '1px solid #334155',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Toolbar */}
            <div
              style={{
                padding: '10px 16px',
                background: '#1e293b',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }} />
                </div>
                <span style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>
                  ⚡ Live Preview — {previewModalFile.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {['desktop', 'tablet', 'mobile'].map((vp) => (
                  <button
                    key={vp}
                    type="button"
                    onClick={() => setPreviewViewport(vp)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: previewViewport === vp ? '#4f46e5' : 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {vp === 'desktop' ? '🖥️ Desktop' : vp === 'tablet' ? '📱 Tablet' : '📲 Mobile'}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPreviewKey(k => k + 1)}
                  title="Reload Preview"
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  🔄
                </button>

                <button
                  type="button"
                  onClick={handleOpenPreviewNewTab}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0ea5e9',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ↗ Tab Baru
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewModalFile(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✕ Tutup
                </button>
              </div>
            </div>

            {/* Iframe Viewport */}
            <div
              style={{
                flex: 1,
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: previewViewport === 'desktop' ? '0' : '16px',
                overflow: 'auto'
              }}
            >
              <iframe
                key={previewKey}
                title={`SubAgent Preview ${previewModalFile.name}`}
                srcDoc={bundledPreviewHtml}
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                style={{
                  width: previewViewport === 'mobile' ? '390px' : previewViewport === 'tablet' ? '768px' : '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: previewViewport === 'desktop' ? '0' : '14px',
                  background: '#ffffff',
                  boxShadow: previewViewport === 'desktop' ? 'none' : '0 12px 35px rgba(0,0,0,0.4)'
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

