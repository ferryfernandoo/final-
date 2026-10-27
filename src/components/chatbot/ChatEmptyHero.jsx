// ============================================================
// Deepernova AI ChatBot — Memoized Empty Hero State Component
// ============================================================
import React from 'react';
import { DEEPERNOVA_MODELS } from './chatConstants';

export const ChatEmptyHero = React.memo(({
  userLanguage = 'id',
  onNavigate,
  uploadedFiles = [],
  uploadedImages = [],
  attachmentQueueMinimized = false,
  setAttachmentQueueMinimized,
  clearAllAttachments,
  removeUploadedFile,
  removeUploadedImage,
  isConvGenerating = false,
  textareaElementRef,
  inputValue = '',
  setInputValue,
  scheduleTextareaResize,
  textQueue = [],
  handleSendMessage,
  handlePaste,
  isTokenLimited = false,
  showInputMenu = false,
  setShowInputMenu,
  showModelMenu = false,
  setShowModelMenu,
  loading = false,
  currentModelObj = DEEPERNOVA_MODELS[0],
  selectedModel,
  setSelectedModel,
  isReasoningCapable = false,
  isReasoningEnabled = false,
  toggleReasoning,
  isSttListening = false,
  toggleSpeechToText,
  isAutoVoiceEnabled = false,
  handleToggleAutoVoice,
  handleOpenCamera,
  setShowGlobalMemorySettings
}) => {
  return (
    <div className="meta-hero-empty-state">
      <div className="meta-hero-header-wrap">
        <h1 className="meta-hero-heading">
          {userLanguage === 'id' ? 'Apa yang bisa saya bantu hari ini?' : 'What can I help you with today?'}
        </h1>
        <button
          type="button"
          className="meta-hero-agent-pill-btn"
          onClick={() => onNavigate?.('agent')}
          title={userLanguage === 'id' ? 'Buka Autonomous AI Agent (Eksekusi Kode, Terminal & Proyek)' : 'Launch Autonomous AI Agent'}
        >
          <span className="agent-pill-icon">⚡</span>
          <span className="agent-pill-label">{userLanguage === 'id' ? 'Mode AI Agent' : 'AI Agent'}</span>
          <span className="agent-pill-arrow">→</span>
        </button>
      </div>

      {(uploadedFiles.length > 0 || uploadedImages.length > 0) && (
        <div className={`uploaded-attachments-container${attachmentQueueMinimized ? ' minimized' : ''}`}>
          <div className="uploaded-attachments-header">
            <span>📦 {uploadedFiles.length + uploadedImages.length} {userLanguage === 'id' ? 'lampiran' : 'attachment'}{uploadedFiles.length + uploadedImages.length !== 1 ? 's' : ''}</span>
            <div className="uploaded-attachments-header-actions">
              <button
                className="minimize-files-btn"
                type="button"
                onClick={() => setAttachmentQueueMinimized(!attachmentQueueMinimized)}
                title={attachmentQueueMinimized ? (userLanguage === 'id' ? 'Perluas' : 'Expand') : (userLanguage === 'id' ? 'Perkecil' : 'Minimize')}
              >
                {attachmentQueueMinimized ? '▶' : '▼'}
              </button>
              <button
                className="clear-files-btn"
                onClick={clearAllAttachments}
                title={userLanguage === 'id' ? 'Hapus semua lampiran' : 'Clear all attachments'}
              >
                ✕
              </button>
            </div>
          </div>
          {!attachmentQueueMinimized && (
            <div className="uploaded-attachments-list">
              {uploadedFiles.map(file => (
                <div key={file.id} className="uploaded-file-chip">
                  <span className="file-icon">📄</span>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-meta">{file.size}KB · {file.tokens} tokens</span>
                  </div>
                  <button
                    className="remove-file-btn"
                    onClick={() => removeUploadedFile(file.id)}
                    title={userLanguage === 'id' ? 'Hapus file' : 'Remove file'}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {uploadedImages.map(image => (
                <div key={image.id} className={`uploaded-image-chip status-${image.status}`}>
                  <div className="image-preview-thumb">
                    <img src={image.dataUrl} alt={image.fileName} />
                  </div>
                  <div className="image-chip-info">
                    <span className="image-file-name">{image.fileName}</span>
                    <span className="image-status">
                      {image.status === 'uploading' && '⬆️ Mengunggah...'}
                      {image.status === 'queued' && '⏳ Antrian'}
                      {image.status === 'analyzing' && '🔍 Analisis...'}
                      {image.status === 'analyzed' && '✅ Siap'}
                      {image.status === 'error' && `❌ ${image.error || 'Error'}`}
                    </span>
                  </div>
                  <div className="image-chip-actions">
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeUploadedImage(image.id)}
                      title={userLanguage === 'id' ? 'Hapus gambar' : 'Remove image'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={`input-container claude-style meta-hero-claude-input ${isConvGenerating ? 'generating' : ''}`}
        onClick={() => {
          if (textareaElementRef?.current) {
            textareaElementRef.current.focus();
          }
        }}
      >
        <div className="textarea-wrapper">
          <textarea
            ref={(el) => {
              if (textareaElementRef) textareaElementRef.current = el;
              globalThis.heroTextareaRef = el;
              globalThis.textareaRef = el;
            }}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              scheduleTextareaResize?.(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (e.nativeEvent && e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (inputValue.trim() || textQueue.length > 0) {
                  handleSendMessage?.(e);
                }
              }
            }}
            onPaste={handlePaste}
            placeholder={
              isTokenLimited
                ? (userLanguage === 'id' ? "🔒 Token penggunaan telah habis (tunggu reset)..." : "🔒 Token limit reached (waiting for reset)...")
                : (userLanguage === 'id' ? "Tanya Deepernova AI..." : "Ask Deepernova AI...")
            }
            disabled={false}
            className="message-input"
            rows={1}
            onFocus={() => {
              window.scrollTo(0, 0);
              document.body.scrollTop = 0;
            }}
          />
        </div>

        <div className="input-card-toolbar">
          <div className="file-menu-container">
            <button
              type="button"
              className={`claude-attach-btn ${showInputMenu ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
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
            {showInputMenu && (
              <div className="file-menu-dropdown claude-dropdown" onClick={(e) => e.stopPropagation()}>
                {currentModelObj?.supportsVision !== false ? (
                  <>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        handleOpenCamera?.();
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
                    setShowGlobalMemorySettings?.(true);
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
          </div>

          <div className="input-toolbar-right">
            <div className="claude-model-selector-wrapper">
              <button
                type="button"
                className={`claude-model-selector-btn ${showModelMenu ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModelMenu(!showModelMenu);
                  setShowInputMenu(false);
                }}
                title={userLanguage === 'id' ? 'Pilih Model Deepernova AI' : 'Select Deepernova AI Model'}
              >
                <span className="model-btn-icon-wrap" style={{ color: currentModelObj.color || '#06b6d4' }}>
                  <i className={`${currentModelObj.icon || 'fa-solid fa-microchip'} model-btn-cdn-icon`}></i>
                </span>
                <span className="model-btn-name">{currentModelObj.shortName || currentModelObj.name}</span>
                <span className="model-btn-badge">{userLanguage === 'id' ? (currentModelObj.tag || 'Cloud') : (currentModelObj.tagEn || 'Cloud')}</span>
                <svg className={`model-chevron ${showModelMenu ? 'open' : ''}`} viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showModelMenu && (
                <div className="claude-model-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="model-dropdown-header">
                    <div className="model-dropdown-header-title">
                      <span>{userLanguage === 'id' ? 'Pilih Model AI' : 'Select AI Model'}</span>
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
                        <div
                          className="model-option-icon-box"
                          style={{
                            background: m.bgColor || 'rgba(6, 182, 212, 0.12)',
                            color: m.color || '#06b6d4',
                            borderColor: m.color ? `${m.color}33` : 'transparent'
                          }}
                        >
                          <i className={`${m.icon} model-option-icon-cdn`}></i>
                        </div>
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
                          <span className="model-check-icon" style={{ color: m.color || '#06b6d4' }}>
                            <i className="fa-solid fa-check"></i>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isReasoningCapable && (
              <button
                type="button"
                className={`claude-reasoning-toggle-btn ${isReasoningEnabled ? 'active' : ''}`}
                onClick={toggleReasoning}
                title={
                  isReasoningEnabled
                    ? (userLanguage === 'id' ? 'Mode Penalaran: AKTIF (Klik untuk nonaktifkan)' : 'Reasoning Mode: ACTIVE (Click to disable)')
                    : (userLanguage === 'id' ? 'Mode Penalaran: NONAKTIF (Klik untuk aktifkan)' : 'Reasoning Mode: DISABLED (Click to enable)')
                }
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

            <button
              type="button"
              className={`claude-tool-btn mic-btn ${isSttListening ? 'listening' : ''}`}
              onClick={toggleSpeechToText}
              disabled={isTokenLimited}
              title={
                isSttListening
                  ? (userLanguage === 'id' ? 'Sedang mendengarkan... (Klik untuk berhenti)' : 'Listening... (Click to stop)')
                  : (userLanguage === 'id' ? 'Bicara untuk ketik pesan' : 'Speak to type message')
              }
            >
              <svg className="tool-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </button>

            <button
              type="button"
              className={`claude-tool-btn auto-voice-btn ${isAutoVoiceEnabled ? 'active voice-on' : 'voice-off'}`}
              onClick={handleToggleAutoVoice}
              title={
                isAutoVoiceEnabled
                  ? (userLanguage === 'id' ? '🔊 Suara Otomatis: AKTIF (Membaca otomatis setiap jawaban) - Klik untuk matikan' : '🔊 Auto-Voice: ON (AI responses read aloud) - Click to mute')
                  : (userLanguage === 'id' ? '🔇 Suara Otomatis: NONAKTIF (Hening) - Klik untuk aktifkan' : '🔇 Auto-Voice: OFF (Silent) - Click to enable')
              }
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
                <svg className="tool-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>

            <button
              type="button"
              className={`claude-action-btn send-mode ${(inputValue.trim() || textQueue.length > 0) ? 'has-text' : 'empty'}`}
              disabled={isTokenLimited}
              onClick={(e) => {
                if (inputValue.trim() || textQueue.length > 0) {
                  handleSendMessage?.(e);
                } else {
                  textareaElementRef?.current?.focus();
                }
              }}
              title={userLanguage === 'id' ? "Kirim pesan" : "Send message"}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="meta-prompt-chips-row">
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(userLanguage === 'id' ? 'Jelaskan konsep ini secara jelas dan mudah dipahami: ' : 'Explain this concept clearly and simply: ');
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          💡 {userLanguage === 'id' ? 'Tanyakan apa pun' : 'Ask anything'}
        </button>
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(userLanguage === 'id' ? 'Bantu saya menulis kode program untuk: ' : 'Help write code for: ');
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          💻 {userLanguage === 'id' ? 'Tulis kode' : 'Write code'}
        </button>
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(userLanguage === 'id' ? 'Bantu susun rencana dan langkah terstruktur untuk: ' : 'Help plan a structured strategy for: ');
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          🎯 {userLanguage === 'id' ? 'Rencana & strategi' : 'Plan & strategy'}
        </button>
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(userLanguage === 'id' ? 'Buatkan draf teks profesional tentang: ' : 'Draft a professional document about: ');
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          📝 {userLanguage === 'id' ? 'Tulis dokumen' : 'Write document'}
        </button>
      </div>
    </div>
  );
});

export default ChatEmptyHero;

