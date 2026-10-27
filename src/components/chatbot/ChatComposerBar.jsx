import React from 'react';
import { DEEPERNOVA_MODELS } from './chatConstants';
import ImageGenerationService from '../../services/imageGenerationService';

const ChatComposerBar = React.memo(function ChatComposerBar({
  hasMessages,
  handleSendMessage,
  isTokenUsageLimited,
  userLanguage,
  countdownFullText,
  activeFile,
  onNavigate,
  setActiveFile,
  showAlert,
  showSlashMenu,
  setShowSlashMenu,
  SLASH_COMMANDS,
  inputValue,
  setInputValue,
  slashSelectedIndex,
  setSlashSelectedIndex,
  textareaElementRef,
  uploadedFiles,
  uploadedImages,
  setUploadedImages,
  attachmentQueueMinimized,
  setAttachmentQueueMinimized,
  clearAllAttachments,
  removeUploadedFile,
  removeUploadedImage,
  hdUpscalingMap,
  setHdUpscalingMap,
  textQueue,
  setTextQueue,
  handleTextQueueItemClick,
  handleRemoveTextItem,
  getConvLoading,
  handleImageUpload,
  handleFileUpload,
  scheduleTextareaResize,
  handlePaste,
  showInputMenu,
  setShowInputMenu,
  showModelMenu,
  setShowModelMenu,
  loading,
  currentModelObj,
  handleOpenCamera,
  setShowGlobalMemorySettings,
  selectedModel,
  setSelectedModel,
  isReasoningCapable,
  isReasoningEnabled,
  toggleReasoning,
  isSttListening,
  toggleSpeechToText,
  isAutoVoiceEnabled,
  handleToggleAutoVoice,
  handleStopStreaming,
}) {
  if (!hasMessages) return null;

  const isConvLoading = getConvLoading();
  const isTokenLimited = isTokenUsageLimited();

  return (
    <form className="input-form" onSubmit={handleSendMessage}>
      {/* Token Limit Popup Banner directly above input text */}
      {isTokenLimited && (
        <div className="token-limit-above-input-banner">
          <div className="token-banner-content">
            <span className="token-banner-icon">🔒</span>
            <span className="token-banner-text">
              {userLanguage === 'id'
                ? 'Maaf, Anda kehabisan token penggunaan.'
                : 'Sorry, you ran out of usage tokens.'}
            </span>
            <span className="token-banner-countdown">
              ⏳ {userLanguage === 'id' ? 'Reset dalam' : 'Reset in'} {countdownFullText || '04:00:00'}
            </span>
          </div>
        </div>
      )}

      {/* Mode & Active File Indicator Badge */}
      {activeFile && (
        <div className="active-file-indicator-pill">
          <span className="active-file-icon">📄</span>
          <span className="active-file-name" title={activeFile.name}>{activeFile.name}</span>
          <button
            type="button"
            className="open-in-editor-btn"
            onClick={() => onNavigate?.('documents', activeFile.type)}
            title={userLanguage === 'id' ? 'Buka di Editor Penuh' : 'Open in Full Editor'}
          >
            <i className="fas fa-external-link-alt"></i>
          </button>
          <button
            type="button"
            className="clear-active-file-btn"
            onClick={() => {
              setActiveFile(null);
              showAlert(userLanguage === 'id' ? 'Berkas dinonaktifkan' : 'File deactivated', 'info');
            }}
            title={userLanguage === 'id' ? 'Tutup berkas' : 'Close file'}
          >
            ✕
          </button>
        </div>
      )}

      {/* Slash Command Autocomplete Popover */}
      {showSlashMenu && (() => {
        const filtered = SLASH_COMMANDS.filter(cmd =>
          cmd.command.toLowerCase().startsWith(inputValue.toLowerCase())
        );
        if (filtered.length === 0) return null;
        return (
          <div className="slash-commands-popover">
            <div className="popover-header">
              <span>⚡ {userLanguage === 'id' ? 'Perintah AI Agent' : 'AI Agent Commands'}</span>
            </div>
            <div className="popover-list">
              {filtered.map((cmd, idx) => (
                <button
                  key={cmd.command}
                  type="button"
                  className={`popover-item ${idx === slashSelectedIndex ? 'active' : ''}`}
                  onClick={() => {
                    setInputValue(cmd.command + ' ');
                    setShowSlashMenu(false);
                    if (textareaElementRef.current) {
                      textareaElementRef.current.focus();
                    }
                  }}
                >
                  <span className="popover-cmd">{cmd.command}</span>
                  <span className="popover-desc">
                    {userLanguage === 'id' ? cmd.desc_id : cmd.desc_en}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Uploaded Attachments Display */}
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
                type="button"
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
                    type="button"
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
                      className={`chip-hd-btn ${hdUpscalingMap[image.dataUrl] ? 'loading' : ''}`}
                      onClick={async () => {
                        if (hdUpscalingMap[image.dataUrl]) return;
                        setHdUpscalingMap((prev) => ({ ...prev, [image.dataUrl]: true }));
                        showAlert(userLanguage === 'id' ? '✨ Mengubah foto ke HD via Deepernova AI...' : '✨ Enhancing to HD via Deepernova AI...', 'info', 4000);
                        try {
                          const hdRes = await ImageGenerationService.generateImage(
                            'Enhance this image to crystal clear ultra HD quality with authentic Apple iPhone Pro color science. Sharpen all details, textures, and edges with lifelike balanced contrast while keeping all objects, people, colors, and scene 100% identical.',
                            '1024x1024',
                            null,
                            'qwen-image-edit-max',
                            image.dataUrl,
                            null
                          );
                          if (hdRes?.image?.url) {
                            setUploadedImages((prev) =>
                              prev.map((img) => (img.id === image.id ? { ...img, dataUrl: hdRes.image.url } : img))
                            );
                            showAlert(userLanguage === 'id' ? '✅ Foto di antrian berhasil di-HD-kan!' : '✅ Photo enhanced to HD!', 'success', 2500);
                          }
                        } catch (e) {
                          showAlert(userLanguage === 'id' ? '⚠️ Gagal meningkatkan HD.' : '⚠️ Failed to enhance HD.', 'error', 2500);
                        } finally {
                          setHdUpscalingMap((prev) => ({ ...prev, [image.dataUrl]: false }));
                        }
                      }}
                      title={userLanguage === 'id' ? 'Tingkatkan kualitas foto ini ke HD' : 'Upscale this photo to HD'}
                    >
                      {hdUpscalingMap[image.dataUrl] ? 'HD...' : '✨ HD'}
                    </button>
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

      {/* Text Queue Display */}
      {textQueue.length > 0 && (
        <div className="pasted-text-container">
          <div className="pasted-text-header">
            <span>📋 {textQueue.length} {userLanguage === 'id' ? 'salinan teks' : 'text copy'}{textQueue.length !== 1 ? 's' : ''}</span>
            <button
              className="clear-text-btn"
              type="button"
              onClick={() => setTextQueue([])}
              title={userLanguage === 'id' ? 'Hapus semua teks' : 'Clear all text'}
            >
              ✕
            </button>
          </div>
          <div className="pasted-text-list">
            {textQueue.map(item => (
              <div key={item.id} className="pasted-text-chip">
                <span className="text-preview-icon">📄</span>
                <div className="text-chip-info">
                  <span className="text-chip-label">{item.label}</span>
                  <span className="text-chip-preview">{item.content.substring(0, 60)}...</span>
                </div>
                <div className="text-chip-actions">
                  <button
                    type="button"
                    className="text-chip-edit-btn"
                    onClick={() => handleTextQueueItemClick(item)}
                    title={userLanguage === 'id' ? 'Edit teks' : 'Edit text'}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="text-chip-remove-btn"
                    onClick={() => handleRemoveTextItem(item.id)}
                    title={userLanguage === 'id' ? 'Hapus teks' : 'Remove text'}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`input-container claude-style ${isConvLoading ? 'generating' : ''}`}>
        {(uploadedFiles.length + uploadedImages.length > 0) && attachmentQueueMinimized && (
          <button
            type="button"
            className="file-attached-badge"
            onClick={() => setAttachmentQueueMinimized(false)}
            title={userLanguage === 'id' ? 'Tampilkan kembali lampiran' : 'Show attachments'}
          >
            📦 {uploadedFiles.length + uploadedImages.length}
          </button>
        )}

        <input
          ref={(input) => {
            window.cameraCaptureInput = input;
          }}
          type="file"
          id="camera-capture-input"
          className="file-upload-input"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleImageUpload(e)}
          style={{ display: 'none' }}
        />

        <input
          ref={(input) => {
            window.imageUploadInput = input;
          }}
          type="file"
          id="image-upload-input"
          className="file-upload-input"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload(e)}
          style={{ display: 'none' }}
        />

        <input
          ref={(input) => {
            window.fileUploadInput = input;
          }}
          type="file"
          id="unified-upload-input"
          className="file-upload-input"
          accept=".txt,.csv,.json,.html,.md,.pdf,.docx,.doc,.xlsx,.xls"
          multiple
          onChange={(e) => handleFileUpload(e)}
          style={{ display: 'none' }}
        />

        <div className="textarea-wrapper">
          <textarea
            ref={(el) => {
              textareaElementRef.current = el;
              globalThis.textareaRef = el;
            }}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              scheduleTextareaResize(e.target);
            }}
            onKeyDown={(e) => {
              if (showSlashMenu) {
                const filtered = SLASH_COMMANDS.filter(cmd =>
                  cmd.command.startsWith(inputValue.toLowerCase())
                );
                if (filtered.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSlashSelectedIndex(prev => (prev + 1) % filtered.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSlashSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const selected = filtered[slashSelectedIndex].command;
                    setInputValue(selected + ' ');
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
                if (e.nativeEvent && e.nativeEvent.isComposing) {
                  return;
                }
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            onPaste={handlePaste}
            placeholder={
              isTokenLimited
                ? (userLanguage === 'id' ? '🔒 Token penggunaan telah habis (tunggu reset)...' : '🔒 Token limit reached (waiting for reset)...')
                : (userLanguage === 'id' ? 'Tanya Deepernova AI...' : 'Ask Deepernova AI...')
            }
            disabled={false}
            className="message-input"
            rows="1"
            onFocus={() => {
              const container = document.querySelector('.messages-container');
              const savedScroll = container ? container.scrollTop : 0;
              window.scrollTo(0, 0);
              document.body.scrollTop = 0;
              requestAnimationFrame(() => {
                window.scrollTo(0, 0);
                if (container) container.scrollTop = savedScroll;
              });
              setTimeout(() => {
                window.scrollTo(0, 0);
                if (container) container.scrollTop = savedScroll;
              }, 60);
            }}
          />
        </div>

        <div className="input-card-toolbar">
          <div className="file-menu-container">
            <button
              type="button"
              className={`claude-attach-btn ${showInputMenu ? 'active' : ''}`}
              onClick={() => {
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
              <div className="file-menu-dropdown claude-dropdown">
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
          </div>

          <div className="input-toolbar-right">
            <div className="claude-model-selector-wrapper">
              <button
                type="button"
                className={`claude-model-selector-btn ${showModelMenu ? 'active' : ''}`}
                onClick={() => {
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
                <div className="claude-model-dropdown">
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
                          } catch (e) { }
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

            {isConvLoading ? (
              <button
                type="button"
                className="claude-action-btn stop-mode"
                onClick={handleStopStreaming}
                title={userLanguage === 'id' ? 'Hentikan generasi' : 'Stop generation'}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2"></rect>
                </svg>
              </button>
            ) : (
              <button
                type={(!inputValue.trim() && textQueue.length === 0) ? 'button' : 'submit'}
                className={`claude-action-btn send-mode ${(inputValue.trim() || textQueue.length > 0) ? 'has-text' : 'empty'}`}
                disabled={isTokenLimited}
                onClick={(e) => {
                  if (!inputValue.trim() && textQueue.length === 0) {
                    e.preventDefault();
                    textareaElementRef.current?.focus();
                  }
                }}
                title={userLanguage === 'id' ? 'Kirim pesan' : 'Send message'}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
});

export default ChatComposerBar;

