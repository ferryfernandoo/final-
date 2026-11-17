// ============================================================
// Deepernova AI ChatBot — Memoized Empty Hero State Component
// ============================================================
import React from 'react';
import { DEEPERNOVA_MODELS } from './chatConstants';
import ChatComposerCard from './ChatComposerCard';

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
  isAgenticMode = false,
  toggleAgenticMode,
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
          {userLanguage === 'zh'
            ? '今天我能为您提供什么帮助？'
            : userLanguage === 'id'
              ? 'Apa yang bisa saya bantu hari ini?'
              : 'What can I help you with today?'}
        </h1>
        <button
          type="button"
          className="meta-hero-agent-pill-btn"
          onClick={() => onNavigate?.('agent')}
          title={
            userLanguage === 'zh'
              ? '启动自主 AI Agent（代码执行、终端与项目）'
              : userLanguage === 'id'
                ? 'Buka Autonomous AI Agent (Eksekusi Kode, Terminal & Proyek)'
                : 'Launch Autonomous AI Agent (Code execution, terminal & projects)'
          }
        >
          <span className="agent-pill-icon">⚡</span>
          <span className="agent-pill-label">
            {userLanguage === 'zh' ? 'AI Agent 模式' : userLanguage === 'id' ? 'Mode AI Agent' : 'AI Agent'}
          </span>
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
        isAgenticMode={isAgenticMode}
        toggleAgenticMode={toggleAgenticMode}
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

      <div className="meta-prompt-chips-row">
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(
              userLanguage === 'zh'
                ? '请清晰易懂地解释这个概念：'
                : userLanguage === 'id'
                  ? 'Jelaskan konsep ini secara jelas dan mudah dipahami: '
                  : 'Explain this concept clearly and simply: '
            );
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          💡 {userLanguage === 'zh' ? '随心提问' : userLanguage === 'id' ? 'Tanyakan apa pun' : 'Ask anything'}
        </button>
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(
              userLanguage === 'zh'
                ? '请帮我编写代码实现：'
                : userLanguage === 'id'
                  ? 'Bantu saya menulis kode program untuk: '
                  : 'Help write code for: '
            );
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          💻 {userLanguage === 'zh' ? '编写代码' : userLanguage === 'id' ? 'Tulis kode' : 'Write code'}
        </button>
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(
              userLanguage === 'zh'
                ? '请帮我制定结构化计划与策略：'
                : userLanguage === 'id'
                  ? 'Bantu susun rencana dan langkah terstruktur untuk: '
                  : 'Help plan a structured strategy for: '
            );
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          🎯 {userLanguage === 'zh' ? '计划与策略' : userLanguage === 'id' ? 'Rencana & strategi' : 'Plan & strategy'}
        </button>
        <button
          type="button"
          className="meta-prompt-chip"
          onClick={() => {
            setInputValue(
              userLanguage === 'zh'
                ? '请帮我起草一份关于以下内容的专业文档：'
                : userLanguage === 'id'
                  ? 'Buatkan draf teks profesional tentang: '
                  : 'Draft a professional document about: '
            );
            setTimeout(() => {
              if (textareaElementRef?.current) {
                textareaElementRef.current.focus();
                scheduleTextareaResize?.(textareaElementRef.current);
              }
            }, 20);
          }}
        >
          📝 {userLanguage === 'zh' ? '撰写文档' : userLanguage === 'id' ? 'Tulis dokumen' : 'Write document'}
        </button>
      </div>
    </div>
  );
});

export default ChatEmptyHero;

