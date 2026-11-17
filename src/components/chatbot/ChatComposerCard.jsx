import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DEEPERNOVA_MODELS } from './chatConstants';

const noop = () => { };

const ChatComposerCard = ({
  extraClassName = '',
  isConvLoading = false,
  isTokenLimited = false,
  userLanguage = 'id',
  inputValue = '',
  setInputValue = noop,
  textareaElementRef,
  scheduleTextareaResize = noop,
  handleSendMessage = noop,
  handlePaste = noop,
  handleImageUpload = noop,
  handleFileUpload = noop,
  handleOpenCamera = noop,
  handleStopStreaming = noop,
  showInputMenu = false,
  setShowInputMenu = noop,
  showModelMenu = false,
  setShowModelMenu = noop,
  showSlashMenu = false,
  setShowSlashMenu = noop,
  SLASH_COMMANDS = [],
  slashSelectedIndex = 0,
  setSlashSelectedIndex = noop,
  loading = false,
  currentModelObj = DEEPERNOVA_MODELS[0],
  selectedModel,
  setSelectedModel = noop,
  isReasoningCapable = false,
  isReasoningEnabled = false,
  toggleReasoning = noop,
  isSttListening = false,
  toggleSpeechToText = noop,
  isAutoVoiceEnabled = false,
  handleToggleAutoVoice = noop,
  setShowGlobalMemorySettings = noop,
  textQueue = [],
  uploadedFiles = [],
  uploadedImages = [],
  attachmentQueueMinimized = false,
  setAttachmentQueueMinimized = noop,
  enableDragDrop = false,
  syncHeroRef = false,
  showStopWhenLoading = false,
  onAfterFocus = null,
}) => {
  const cardRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const hasText = Boolean((inputValue || '').trim().length > 0 || textQueue.length > 0);
  const hasAttachments = uploadedFiles.length > 0 || uploadedImages.length > 0;
  const canSend = hasText || hasAttachments;
  const isExpanded = Boolean(
    isFocused ||
    hasText ||
    hasAttachments ||
    showInputMenu ||
    showModelMenu ||
    showSlashMenu ||
    isSttListening
  );

  const blurComposerInputs = () => {
    const activeEl = document.activeElement;
    if (activeEl && typeof activeEl.blur === 'function' && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      activeEl.blur();
    }
    if (textareaElementRef?.current && typeof textareaElementRef.current.blur === 'function') {
      textareaElementRef.current.blur();
    }
    if (globalThis.heroTextareaRef && typeof globalThis.heroTextareaRef.blur === 'function') {
      globalThis.heroTextareaRef.blur();
    }
    requestAnimationFrame(() => {
      const stillFocused = document.activeElement;
      if (stillFocused && typeof stillFocused.blur === 'function' && (stillFocused.tagName === 'TEXTAREA' || stillFocused.tagName === 'INPUT')) {
        stillFocused.blur();
      }
    });
  };

  const dismissKeyboardAfterSend = () => {
    setIsFocused(false);
    setShowInputMenu(false);
    setShowModelMenu(false);
    setShowSlashMenu(false);
    if (textareaElementRef?.current) {
      textareaElementRef.current.style.height = '';
    }
    if (globalThis.heroTextareaRef) {
      globalThis.heroTextareaRef.style.height = '';
    }
    blurComposerInputs();
  };

  // Keep textarea height collapsed cleanly when idle and auto-sized when expanded
  useEffect(() => {
    const el = cardRef.current?.querySelector('textarea');
    if (!el) return;
    if (!isExpanded) {
      el.style.height = '';
    } else if (inputValue) {
      scheduleTextareaResize(el);
    }
  }, [isExpanded, inputValue, scheduleTextareaResize]);

  // Collapse cleanly and dismiss popups when tapping anywhere outside the composer card
  useEffect(() => {
    if (!isExpanded) return;
    const handleOutsidePointer = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setIsFocused(false);
        setShowInputMenu(false);
        setShowModelMenu(false);
        setShowSlashMenu(false);
        if (textareaElementRef?.current && document.activeElement === textareaElementRef.current) {
          textareaElementRef.current.blur();
        }
      }
    };
    document.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer, true);
  }, [isExpanded, setShowInputMenu, setShowModelMenu, setShowSlashMenu, textareaElementRef]);

  const handleFocusCapture = () => {
    setIsFocused(true);
  };

  const handleBlurCapture = (e) => {
    const nextFocused = e.relatedTarget;
    if (nextFocused && cardRef.current?.contains(nextFocused)) {
      return;
    }
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (cardRef.current && active && cardRef.current.contains(active)) {
        return;
      }
      setIsFocused(false);
    });
  };

  const handleKeepFocusMouseDown = (e) => {
    e.preventDefault();
  };

  const handleDropFiles = (e) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const imageFiles = [];
      const otherFiles = [];
      for (let i = 0; i < droppedFiles.length; i++) {
        const f = droppedFiles[i];
        if (f.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)) {
          imageFiles.push(f);
        } else {
          otherFiles.push(f);
        }
      }
      if (imageFiles.length > 0) handleImageUpload({ files: imageFiles });
      if (otherFiles.length > 0) handleFileUpload({ files: otherFiles });
    }
  };

  const placeholderText = isTokenLimited
    ? (userLanguage === 'zh'
      ? '🔒 额度已用完（等待重置）...'
      : userLanguage === 'id'
        ? '🔒 Token habis (tunggu reset)...'
        : '🔒 Token limit reached...')
    : (userLanguage === 'zh'
      ? '询问 DeeperNova AI...'
      : userLanguage === 'id'
        ? 'Tanyakan apa saja...'
        : 'Ask anything...');

  const setTextareaRefs = useCallback((el) => {
    if (textareaElementRef) textareaElementRef.current = el;
    if (syncHeroRef) globalThis.heroTextareaRef = el;
    globalThis.textareaRef = el;
  }, [textareaElementRef, syncHeroRef]);

  return (
    <div
      ref={cardRef}
      className={`input-container claude-style minimal-morph ${extraClassName} ${isExpanded ? 'expanded' : 'collapsed'} ${isConvLoading ? 'generating' : ''}`.trim()}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      onDragOver={enableDragDrop ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
      onDrop={enableDragDrop ? handleDropFiles : undefined}
      onClick={(e) => {
        if (
          !e.target.closest('button') &&
          !e.target.closest('.file-menu-dropdown') &&
          !e.target.closest('.claude-model-dropdown') &&
          textareaElementRef?.current
        ) {
          textareaElementRef.current.focus();
        }
      }}
    >
      {hasAttachments && attachmentQueueMinimized && (
        <button
          type="button"
          className="file-attached-badge"
          onClick={() => setAttachmentQueueMinimized(false)}
          title={userLanguage === 'id' ? 'Tampilkan kembali lampiran' : 'Show attachments'}
        >
          📦 {uploadedFiles.length + uploadedImages.length}
        </button>
      )}

      {/* Hidden file inputs so uploads work cleanly from both hero and active chat */}
      <input
        ref={(input) => { if (input) window.cameraCaptureInput = input; }}
        type="file"
        id="camera-capture-input"
        className="file-upload-input"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleImageUpload(e)}
        style={{ display: 'none' }}
      />
      <input
        ref={(input) => { if (input) window.imageUploadInput = input; }}
        type="file"
        id="image-upload-input"
        className="file-upload-input"
        accept="image/*"
        multiple
        onChange={(e) => handleImageUpload(e)}
        style={{ display: 'none' }}
      />
      <input
        ref={(input) => { if (input) window.fileUploadInput = input; }}
        type="file"
        id="unified-upload-input"
        className="file-upload-input"
        accept=".txt,.csv,.json,.html,.md,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.zip"
        multiple
        onChange={(e) => handleFileUpload(e)}
        style={{ display: 'none' }}
      />

      <div className="textarea-wrapper">
        <textarea
          ref={setTextareaRefs}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            scheduleTextareaResize(e.target);
          }}
          onKeyDown={(e) => {
            if (showSlashMenu && SLASH_COMMANDS.length > 0) {
              const filtered = SLASH_COMMANDS.filter((cmd) =>
                cmd.command.toLowerCase().startsWith(inputValue.toLowerCase())
              );
              if (filtered.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSlashSelectedIndex((prev) => (prev + 1) % filtered.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSlashSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                  return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  const selected = filtered[slashSelectedIndex]?.command;
                  if (selected) setInputValue(`${selected} `);
                  setShowSlashMenu(false);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowSlashMenu(false);
                  return;
                }
              }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              if (e.nativeEvent && e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (canSend) {
                dismissKeyboardAfterSend();
                handleSendMessage(e);
              }
            }
          }}
          onPaste={handlePaste}
          placeholder={placeholderText}
          disabled={false}
          className="message-input"
          rows={1}
          onFocus={() => {
            setIsFocused(true);
            onAfterFocus?.();
          }}
        />
      </div>

      <div className="input-card-toolbar">
        <div className="toolbar-left-cluster">
          <div className="file-menu-container">
            <button
              type="button"
              className={`claude-attach-btn ${showInputMenu ? 'active' : ''}`}
              onMouseDown={handleKeepFocusMouseDown}
              onClick={(e) => {
                e.stopPropagation();
                setIsFocused(true);
                setShowInputMenu(!showInputMenu);
                setShowModelMenu(false);
              }}
              title={userLanguage === 'id' ? 'Opsi & Lampiran' : 'Options & Attachments'}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <div className={`toolbar-expandable-pills ${isExpanded ? 'visible' : 'hidden'}`}>
            <div className="claude-model-selector-wrapper">
              <button
                type="button"
                className={`claude-model-selector-btn ${showModelMenu ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextOpen = !showModelMenu;
                  setShowInputMenu(false);
                  setShowSlashMenu(false);
                  if (nextOpen) {
                    // Drop mobile soft keyboard cleanly so user sees the model list unobstructed
                    setIsFocused(false);
                    blurComposerInputs();
                    setShowModelMenu(true);
                  } else {
                    setShowModelMenu(false);
                  }
                }}
                title={userLanguage === 'id' ? 'Pilih Model Deepernova AI' : 'Select Deepernova AI Model'}
                tabIndex={isExpanded ? 0 : -1}
              >
                <span className="model-btn-name">{currentModelObj.shortName || currentModelObj.name}</span>
                <svg className={`model-chevron ${showModelMenu ? 'open' : ''}`} viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            {isReasoningCapable && (
              <button
                type="button"
                className={`claude-reasoning-toggle-btn ${isReasoningEnabled ? 'active' : ''}`}
                onMouseDown={handleKeepFocusMouseDown}
                onClick={toggleReasoning}
                title={
                  isReasoningEnabled
                    ? (userLanguage === 'id' ? 'Mode Penalaran: AKTIF (Klik untuk nonaktifkan)' : 'Reasoning Mode: ACTIVE (Click to disable)')
                    : (userLanguage === 'id' ? 'Mode Penalaran: NONAKTIF (Klik untuk aktifkan)' : 'Reasoning Mode: DISABLED (Click to enable)')
                }
                tabIndex={isExpanded ? 0 : -1}
              >
                <span className="reasoning-toggle-icon">🧠</span>
                <span className="reasoning-toggle-text">
                  {userLanguage === 'id' ? 'Penalaran' : 'Reasoning'}
                </span>
                <span className={`reasoning-toggle-status-pill ${isReasoningEnabled ? 'on' : 'off'}`}>
                  {isReasoningEnabled ? (userLanguage === 'id' ? 'Aktif' : 'On') : (userLanguage === 'id' ? 'Mati' : 'Off')}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="input-toolbar-right">
          <div className={`toolbar-expandable-action ${isExpanded ? 'visible' : 'hidden'}`}>
            <button
              type="button"
              className={`claude-tool-btn auto-voice-btn ${isAutoVoiceEnabled ? 'active voice-on' : 'voice-off'}`}
              onMouseDown={handleKeepFocusMouseDown}
              onClick={handleToggleAutoVoice}
              title={
                isAutoVoiceEnabled
                  ? (userLanguage === 'id' ? '🔊 Suara Otomatis: AKTIF - Klik untuk matikan' : '🔊 Auto-Voice: ON - Click to mute')
                  : (userLanguage === 'id' ? '🔇 Suara Otomatis: NONAKTIF - Klik untuk aktifkan' : '🔇 Auto-Voice: OFF - Click to enable')
              }
              tabIndex={isExpanded ? 0 : -1}
            >
              {isAutoVoiceEnabled ? (
                <span className="claude-wave-bars active">
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                  <span className="bar"></span>
                </span>
              ) : (
                <svg className="tool-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>
          </div>

          <button
            type="button"
            className={`claude-tool-btn mic-btn ${isSttListening ? 'listening' : ''}`}
            onMouseDown={handleKeepFocusMouseDown}
            onClick={toggleSpeechToText}
            disabled={isTokenLimited}
            title={
              isSttListening
                ? (userLanguage === 'id' ? 'Sedang mendengarkan... (Klik untuk berhenti)' : 'Listening... (Click to stop)')
                : (userLanguage === 'id' ? 'Bicara untuk ketik pesan' : 'Speak to type message')
            }
          >
            <svg className="tool-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          </button>

          {showStopWhenLoading && isConvLoading ? (
            <button
              type="button"
              className="claude-action-btn stop-mode"
              onClick={handleStopStreaming}
              title={userLanguage === 'id' ? 'Hentikan generasi' : 'Stop generation'}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2.5"></rect>
              </svg>
            </button>
          ) : (
            <button
              type={canSend ? 'submit' : 'button'}
              className={`claude-action-btn send-mode ${canSend ? 'has-text' : 'empty'}`}
              disabled={isTokenLimited}
              onMouseDown={canSend ? undefined : handleKeepFocusMouseDown}
              onClick={(e) => {
                if (canSend) {
                  dismissKeyboardAfterSend();
                  if (syncHeroRef) {
                    handleSendMessage(e);
                  }
                  // Form onSubmit handles type='submit' cleanly inside ChatComposerBar
                } else {
                  e.preventDefault();
                  textareaElementRef?.current?.focus();
                }
              }}
              title={userLanguage === 'id' ? 'Kirim pesan' : 'Send message'}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Render popups anchored directly to outer composer card so they open cleanly above it */}
      {showInputMenu && (
        <div className="file-menu-dropdown claude-dropdown" onClick={(e) => e.stopPropagation()}>
          {currentModelObj?.supportsVision !== false ? (
            <>
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  handleOpenCamera();
                  setShowInputMenu(false);
                }}
                disabled={loading}
              >
                <span className="menu-icon"><i className="fas fa-camera" style={{ color: '#ef4444' }}></i></span>
                <div className="menu-item-text">
                  <span className="menu-item-title">{userLanguage === 'id' ? 'Ambil Foto (Kamera Live)' : 'Take Photo (Live Camera)'}</span>
                  <span className="menu-item-desc">{userLanguage === 'id' ? 'Foto langsung objek / dokumen' : 'Live camera capture'}</span>
                </div>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  window.imageUploadInput?.click();
                  setShowInputMenu(false);
                }}
                disabled={loading}
              >
                <span className="menu-icon"><i className="fas fa-image" style={{ color: '#3b82f6' }}></i></span>
                <div className="menu-item-text">
                  <span className="menu-item-title">{userLanguage === 'id' ? 'Upload Gambar / Galeri' : 'Upload Image / Gallery'}</span>
                  <span className="menu-item-desc">{userLanguage === 'id' ? 'Analisis visual & reasoning' : 'Visual analysis'}</span>
                </div>
              </button>
            </>
          ) : (
            <div className="menu-item-disabled-notice" style={{ padding: '8px 14px', fontSize: '11.5px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', margin: '4px 8px' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
              {userLanguage === 'id' ? `Model ${currentModelObj.name} hanya teks (fitur gambar nonaktif)` : `${currentModelObj.name} is text-only (image upload disabled)`}
            </div>
          )}

          <button
            type="button"
            className="menu-item"
            onClick={() => {
              window.fileUploadInput?.click();
              setShowInputMenu(false);
            }}
            disabled={loading}
          >
            <span className="menu-icon"><i className="fas fa-file-alt" style={{ color: '#ff6b00' }}></i></span>
            <div className="menu-item-text">
              <span className="menu-item-title">{userLanguage === 'id' ? 'Upload Dokumen / Berkas' : 'Upload Document / File'}</span>
              <span className="menu-item-desc">PDF, Word (.docx), Excel (.xlsx)</span>
            </div>
          </button>

          <div className="menu-divider"></div>

          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setShowGlobalMemorySettings(true);
              setShowInputMenu(false);
            }}
          >
            <span className="menu-icon"><i className="fas fa-dna" style={{ color: '#8b5cf6' }}></i></span>
            <div className="menu-item-text">
              <span className="menu-item-title">{userLanguage === 'id' ? 'Fine-Tune AI & Memori' : 'Fine-Tune AI & Memory'}</span>
              <span className="menu-item-desc">{userLanguage === 'id' ? 'Atur instruksi kustom Deepernova' : 'Custom AI instructions'}</span>
            </div>
          </button>
        </div>
      )}

      {showModelMenu && (
        <div className="claude-model-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="model-dropdown-header">
            <div className="model-dropdown-header-title">
              <span>{userLanguage === 'id' ? 'Pilih Model AI' : 'Select Model'}</span>
            </div>
          </div>
          <div className="model-dropdown-list">
            {DEEPERNOVA_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`model-option-item ${selectedModel === m.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedModel(m.id);
                  try {
                    localStorage.setItem('deepernova_selected_model', m.id);
                  } catch (_e) { }
                  setShowModelMenu(false);
                }}
              >
                <div className="model-option-info">
                  <div className="model-option-name-row">
                    <span className="model-option-name">{m.name}</span>
                    <span className="model-option-pill">{userLanguage === 'id' ? m.tag : m.tagEn}</span>
                  </div>
                  <span className="model-option-sub">
                    {userLanguage === 'id' ? (m.sub || m.desc) : (m.subEn || m.descEn)}
                  </span>
                </div>
                {selectedModel === m.id && (
                  <span className="model-check-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ChatComposerCard);
