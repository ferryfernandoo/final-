import React from 'react';
import ImageGenerationService from '../../services/imageGenerationService';
import ChatComposerCard from './ChatComposerCard';

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

      <ChatComposerCard
        isConvLoading={isConvLoading}
        isTokenLimited={isTokenLimited}
        userLanguage={userLanguage}
        inputValue={inputValue}
        setInputValue={setInputValue}
        textareaElementRef={textareaElementRef}
        scheduleTextareaResize={scheduleTextareaResize}
        handleSendMessage={handleSendMessage}
        handlePaste={handlePaste}
        handleImageUpload={handleImageUpload}
        handleFileUpload={handleFileUpload}
        handleOpenCamera={handleOpenCamera}
        handleStopStreaming={handleStopStreaming}
        showInputMenu={showInputMenu}
        setShowInputMenu={setShowInputMenu}
        showModelMenu={showModelMenu}
        setShowModelMenu={setShowModelMenu}
        showSlashMenu={showSlashMenu}
        setShowSlashMenu={setShowSlashMenu}
        SLASH_COMMANDS={SLASH_COMMANDS}
        slashSelectedIndex={slashSelectedIndex}
        setSlashSelectedIndex={setSlashSelectedIndex}
        loading={loading}
        currentModelObj={currentModelObj}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        isReasoningCapable={isReasoningCapable}
        isReasoningEnabled={isReasoningEnabled}
        toggleReasoning={toggleReasoning}
        isSttListening={isSttListening}
        toggleSpeechToText={toggleSpeechToText}
        isAutoVoiceEnabled={isAutoVoiceEnabled}
        handleToggleAutoVoice={handleToggleAutoVoice}
        setShowGlobalMemorySettings={setShowGlobalMemorySettings}
        textQueue={textQueue}
        uploadedFiles={uploadedFiles}
        uploadedImages={uploadedImages}
        attachmentQueueMinimized={attachmentQueueMinimized}
        setAttachmentQueueMinimized={setAttachmentQueueMinimized}
        enableDragDrop
        showStopWhenLoading
        onAfterFocus={() => {
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
    </form>
  );
});

export default ChatComposerBar;
