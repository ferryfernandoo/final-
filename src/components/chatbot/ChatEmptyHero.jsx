// ============================================================
// Deepernova AI ChatBot — Memoized Empty Hero State Component
// ============================================================
import React from 'react';
import { DEEPERNOVA_MODELS } from './chatConstants';
import ChatComposerCard from './ChatComposerCard';

export const ChatEmptyHero = React.memo(({
  userLanguage = 'id',
  aiGreeting = '',
  isPrivateChat = false,
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
  handleImageUpload,
  handleFileUpload,
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
  const defaultGreeting =
    userLanguage === 'zh'
      ? '现在想聊些什么？'
      : userLanguage === 'id'
        ? 'Mau ngobrolin apa sekarang?'
        : 'What would you like to talk about?';
  const headingText = (aiGreeting && aiGreeting.trim()) || defaultGreeting;

  return (
    <div className="meta-hero-empty-state">
      <div className="meta-hero-header-wrap">
        {isPrivateChat && (
          <div className="meta-hero-private-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>
              {userLanguage === 'zh'
                ? '隐私模式 · 对话不保存'
                : userLanguage === 'id'
                  ? 'Private Chat · Tidak disimpan ke riwayat'
                  : 'Private Chat · Not saved to history'}
            </span>
          </div>
        )}
        <h1 className="meta-hero-heading">{headingText}</h1>
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

      <ChatComposerCard
        extraClassName="meta-hero-claude-input"
        isConvLoading={isConvGenerating}
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
        showInputMenu={showInputMenu}
        setShowInputMenu={setShowInputMenu}
        showModelMenu={showModelMenu}
        setShowModelMenu={setShowModelMenu}
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
        syncHeroRef
        onAfterFocus={() => {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
        }}
      />
    </div>
  );
});

export default ChatEmptyHero;

