// ============================================================
// Deepernova AI ChatBot — Memoized Single Message Component
// ============================================================
import React from 'react';
import ReminderCard from '../ReminderCard';
import {
  getFileBadgeInfo,
  getCleanUserDisplayText,
  getMessageAttachedFiles
} from './chatConstants';
import {
  SourceBubbleCarousel,
  ReasoningSection
} from './ChatSubComponents';
import { FormattedMessageBody } from './ChatMessageFormatter';

const ChatMessageItemComponent = ({
  message,
  isLatestUserMessage = false,
  shouldHideByCompact = false,
  isExpanded = false,
  feedbackValue = null,
  isPlayingTts = false,
  isLoadingTts = false,
  userLanguage = 'id',
  currentModelName = 'AI',
  loadingPhase = null,
  localModelProgress = { pct: 0, statusText: '', isLoading: false },
  hdUpscalingMap = {},
  quizSelectedAnswers,
  quizIsSubmitted = false,
  setQuizSelections,
  setQuizSubmitted,
  onNavigate,
  onMessageMouseDown,
  onMessageMouseUp,
  onImageClick,
  onUpscaleHD,
  onShowSearchSources,
  onMessageFeedback,
  onCopyMessage,
  onTtsToggle
}) => {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot' || message.role === 'assistant';

  return (
    <div
      data-msg-id={message.id}
      className={`message ${message.sender}${isLatestUserMessage ? ' is-latest-user-ask' : ''}${shouldHideByCompact ? ' hidden-by-compact' : ''}${isUser && isExpanded ? ' expanded' : ''}${message.isStreaming ? ' is-streaming' : ''}`}
      onMouseDown={() => onMessageMouseDown?.(message.id, message.text, isUser)}
      onMouseUp={onMessageMouseUp}
      onTouchStart={() => onMessageMouseDown?.(message.id, message.text, isUser)}
      onTouchEnd={onMessageMouseUp}
      style={{ marginBottom: isUser && !isExpanded ? '10px' : '0' }}
    >
      <div className={`message-content${message.isStreaming ? ' is-streaming' : ''}`}>
        {message.isImage && (
          <>
            {message.isThinking ? (
              <div className="image-thinking-state">
                <div className="spinner"></div>
                <div className="thinking-text">{message.text}</div>
              </div>
            ) : (
              <>
                {message.text && (
                  <FormattedMessageBody
                    text={message.text}
                    isStreaming={false}
                    message={message}
                    userLanguage={userLanguage}
                    onNavigate={onNavigate}
                    handleImageClick={onImageClick}
                    handleUpscaleHD={onUpscaleHD}
                    hdUpscalingMap={hdUpscalingMap}
                    quizSelectedAnswers={quizSelectedAnswers}
                    quizIsSubmitted={quizIsSubmitted}
                    setQuizSelections={setQuizSelections}
                    setQuizSubmitted={setQuizSubmitted}
                  />
                )}
                {message.imageUrl && (
                  <div className="message-image-container" style={{ position: 'relative' }}>
                    <img
                      src={message.imageUrl}
                      alt="Generated Image"
                      className="message-image"
                      onClick={() => onImageClick?.(message.imageUrl, 'Generated Image', message.imageId)}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        borderRadius: '8px',
                        marginTop: '12px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; }}
                      onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                      title={userLanguage === 'id' ? 'Klik untuk membesar' : 'Click to enlarge'}
                    />
                    <button
                      type="button"
                      className={`hd-upscale-btn ${hdUpscalingMap[message.imageUrl] ? 'loading' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onUpscaleHD?.(message.imageUrl, message.id); }}
                      disabled={!!hdUpscalingMap[message.imageUrl]}
                      title={userLanguage === 'id' ? 'Tingkatkan kualitas ke HD' : 'Upscale to HD'}
                    >
                      {hdUpscalingMap[message.imageUrl] ? (
                        <><i className="fas fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> HD...</>
                      ) : (
                        <><span className="hd-icon">HD</span></>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {message.sender === 'bot' && !message.isImage && (
          <>
            {message.searchSteps && message.searchSteps.length > 0 ? (
              <div className="multi-step-search-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {message.searchSteps.map((step, sIdx) => {
                  const stepSources = (step.sources && step.sources.length > 0)
                    ? step.sources
                    : (message.searchSources && message.searchSources.length > 0)
                      ? message.searchSources
                      : [];
                  return (
                    <div key={`step_${sIdx}_${step.query}`} className="search-step-block" style={{ animation: 'float-source-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
                      {step.isSearching ? (
                        <div className="search-simple-indicator">
                          <span className="search-simple-spinner"></span>
                          <span className="search-simple-text">
                            {userLanguage === 'id' ? `Mencari "${step.query}"...` : `Searching for "${step.query}"...`}
                          </span>
                        </div>
                      ) : (
                        stepSources.length > 0 && (
                          <div className="search-sources-section" style={{ marginTop: '4px', animation: 'float-source-in 0.35s ease both' }}>
                            <SourceBubbleCarousel
                              key={`carousel_${sIdx}_${step.query}_${stepSources.length}`}
                              sources={stepSources}
                              language={userLanguage}
                              onShowAll={() => onShowSearchSources?.({ query: step.query || message.searchQuery, sources: stepSources })}
                            />
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
                {(!message.searchSteps.some(s => s.sources && s.sources.length > 0) && message.searchSources && message.searchSources.length > 0) && (
                  <div className="search-sources-section" style={{ marginTop: '4px', animation: 'float-source-in 0.35s ease both' }}>
                    <SourceBubbleCarousel
                      key={`carousel_fallback_${message.searchSources.length}`}
                      sources={message.searchSources}
                      language={userLanguage}
                      onShowAll={() => onShowSearchSources?.({ query: message.searchQuery, sources: message.searchSources })}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                {message.isSearching && (
                  <div className="search-simple-indicator">
                    <span className="search-simple-spinner"></span>
                    <span className="search-simple-text">
                      {userLanguage === 'id' ? `Mencari "${message.searchQuery}"...` : `Searching for "${message.searchQuery}"...`}
                    </span>
                  </div>
                )}

                {message.searchSources && message.searchSources.length > 0 && (
                  <div className="search-sources-section">
                    <SourceBubbleCarousel
                      sources={message.searchSources}
                      language={userLanguage}
                      onShowAll={() => onShowSearchSources?.({ query: message.searchQuery, sources: message.searchSources })}
                    />
                  </div>
                )}
              </>
            )}

            {message.memoryActions && message.memoryActions.length > 0 && (
              <div className="claude-memory-actions-container">
                {message.memoryActions.map((action, aIdx) => (
                  <div key={`mem_act_${aIdx}_${action.id || aIdx}`} className={`claude-memory-pill pill-${action.type || 'save'}`}>
                    <span className="memory-pill-icon">
                      {action.type === 'save' && '🧠'}
                      {action.type === 'update' && '📝'}
                      {action.type === 'delete' && '🗑️'}
                      {action.type === 'recall' && '🔍'}
                    </span>
                    <span className="memory-pill-label">{action.label}</span>
                    {action.category && (
                      <span className="memory-pill-badge">{action.category}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {message.isRecallingMemory && (
              <div className="recall-memory-simple-indicator">
                <span className="recall-memory-pulse-icon">🧠</span>
                <span className="recall-memory-text shiny-text">
                  {userLanguage === 'id' ? 'Cek memori mendalam' : 'Recalling memory'}
                  <span className="moving-dots"><span>.</span><span>.</span><span>.</span></span>
                </span>
              </div>
            )}

            {message.reasoningText && (
              <ReasoningSection
                reasoningText={message.reasoningText}
                isReasoning={message.isReasoning}
                reasoningDuration={message.reasoningDuration}
                userLanguage={userLanguage}
                modelName={message.modelName || currentModelName || 'AI'}
              />
            )}

            {((message.isStreaming || message.isThinking) && !message.text && !message.reasoningText && !message.isSearching && !message.isRecallingMemory && (!message.searchSteps || message.searchSteps.length === 0)) && (
              <div className="typing-indicator-row">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                {loadingPhase && (
                  <span className="slow-processing-text">
                    {localModelProgress?.isLoading ? (
                      <span style={{ color: '#ea580c', fontWeight: 600 }}>
                        ⚡ {localModelProgress.statusText || `Memuat Boron 1.1 (${localModelProgress.pct}%)...`}
                      </span>
                    ) : (
                      <>
                        {loadingPhase === 'sending' && (userLanguage === 'id' ? 'Mengirim...' : 'Sending...')}
                        {loadingPhase === 'thinking' && (userLanguage === 'id' ? 'Merenungi...' : 'Thinking...')}
                        {loadingPhase === 'slow' && (userLanguage === 'id' ? 'Merespon sedikit lebih lama dari biasanya...' : 'Taking a bit longer to respond...')}
                      </>
                    )}
                  </span>
                )}
              </div>
            )}

            {message.isStreaming && message.reasoningText && !message.text && !message.isReasoning && (
              <div className="typing-indicator-row" style={{ marginTop: '8px', opacity: 0.85 }}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="slow-processing-text" style={{ fontStyle: 'italic', fontSize: '13px' }}>
                  {userLanguage === 'id' ? 'Menulis jawaban...' : 'Writing response...'}
                </span>
              </div>
            )}

            {((message.isStreaming || message.isThinking) && !message.text && !message.isSearching && (message.searchSteps && message.searchSteps.length > 0) && !message.isReasoning) && (
              <div className="typing-indicator-row" style={{ marginTop: '8px', opacity: 0.85 }}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="slow-processing-text" style={{ fontStyle: 'italic', fontSize: '13px' }}>
                  {userLanguage === 'id' ? 'Menulis jawaban...' : 'Writing response...'}
                </span>
              </div>
            )}

            {message.text && (
              <FormattedMessageBody
                text={message.text}
                isStreaming={message.isStreaming}
                message={message}
                userLanguage={userLanguage}
                onNavigate={onNavigate}
                handleImageClick={onImageClick}
                handleUpscaleHD={onUpscaleHD}
                hdUpscalingMap={hdUpscalingMap}
                quizSelectedAnswers={quizSelectedAnswers}
                quizIsSubmitted={quizIsSubmitted}
                setQuizSelections={setQuizSelections}
                setQuizSubmitted={setQuizSubmitted}
              />
            )}
            {message.reminder && (
              <ReminderCard reminder={message.reminder} />
            )}
          </>
        )}

        {isUser && (
          <div className="user-bubble-wrapper">
            {(() => {
              const attachedFiles = getMessageAttachedFiles(message);
              if (!attachedFiles || attachedFiles.length === 0) return null;

              return (
                <div className="user-bubble-files-container">
                  {attachedFiles.map((file, fIdx) => {
                    const badge = getFileBadgeInfo(file.name, file.fileType);
                    return (
                      <div key={file.id || fIdx} className="user-bubble-file-card">
                        <div className="file-card-icon-wrap" style={{ background: badge.bg, color: badge.color }}>
                          <i className={`fa-solid ${badge.icon}`} />
                        </div>
                        <div className="file-card-details">
                          <span className="file-card-name" title={file.name}>
                            {file.name}
                          </span>
                          <div className="file-card-meta">
                            <span className="file-card-type">{badge.label}</span>
                            {file.size ? <span className="file-card-dot">•</span> : null}
                            {file.size ? <span className="file-card-size">{file.size} KB</span> : null}
                          </div>
                        </div>
                        <div className="file-card-badge">
                          <i className="fa-solid fa-check" /> Terlampir
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {(() => {
              const cleanedText = getCleanUserDisplayText(message);
              return cleanedText ? (
                <div className="user-bubble-text">
                  <FormattedMessageBody
                    text={cleanedText}
                    isStreaming={false}
                    message={message}
                    userLanguage={userLanguage}
                    onNavigate={onNavigate}
                    handleImageClick={onImageClick}
                    handleUpscaleHD={onUpscaleHD}
                    hdUpscalingMap={hdUpscalingMap}
                    quizSelectedAnswers={quizSelectedAnswers}
                    quizIsSubmitted={quizIsSubmitted}
                    setQuizSelections={setQuizSelections}
                    setQuizSubmitted={setQuizSubmitted}
                  />
                </div>
              ) : null;
            })()}
          </div>
        )}

        {message.downloadUrl && message.fileName && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: 'rgba(100, 200, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(100, 200, 255, 0.3)'
          }}>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = message.downloadUrl;
                link.download = message.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#45a049'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#4CAF50'; }}
            >
              📥 Download: {message.fileName}
            </button>
            {message.downloadSummary && (
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: '#1f2937',
                opacity: 0.85
              }}>
                {message.downloadSummary}
              </div>
            )}
          </div>
        )}

        {!isUser && message.files && message.files.length > 0 && (
          <div className="message-files">
            {message.files.map((file) => (
              <div key={file.id} className="message-file-chip">
                📎 {file.name}
              </div>
            ))}
          </div>
        )}

        {message.textQueue && message.textQueue.length > 0 && (
          <div className="message-text-queue">
            {message.textQueue.map((item) => (
              <div key={item.id} className="message-text-chip">
                📋 {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {message.images && message.images.length > 0 && (
        <div className="user-attached-images-container">
          {message.images.map((image) => {
            const imgUrl = image.dataUrl || image.publicUrl;
            return (
              <div
                key={image.id}
                className="user-attached-image-card"
                onClick={() => onImageClick?.(imgUrl, image.fileName, image.id)}
                title={userLanguage === 'id' ? 'Klik untuk memperbesar & unduh' : 'Click to enlarge & download'}
              >
                <img
                  src={imgUrl}
                  alt={image.fileName || 'Uploaded image'}
                  onError={(e) => {
                    if (image.dataUrl && e.target.src !== image.dataUrl) {
                      e.target.src = image.dataUrl;
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {isBot && !message.isStreaming && (
        <div className="message-footer">
          <div className="message-actions">
            <button
              className={`feedback-btn like-btn ${feedbackValue === 'like' ? 'active' : ''}`}
              onClick={() => onMessageFeedback?.(message.id, 'like')}
              title={userLanguage === 'id' ? 'Membantu' : 'Helpful'}
            >
              <i className="fas fa-thumbs-up"></i>
            </button>
            <button
              className={`feedback-btn dislike-btn ${feedbackValue === 'dislike' ? 'active' : ''}`}
              onClick={() => onMessageFeedback?.(message.id, 'dislike')}
              title={userLanguage === 'id' ? 'Tidak membantu' : 'Not helpful'}
            >
              <i className="fas fa-thumbs-down"></i>
            </button>
            <button
              className="feedback-btn copy-btn"
              onClick={() => onCopyMessage?.(message.text)}
              title={userLanguage === 'id' ? 'Salin' : 'Copy'}
            >
              <i className="fas fa-copy"></i>
            </button>
            <button
              className={`feedback-btn tts-btn ${isPlayingTts ? 'playing' : ''} ${isLoadingTts ? 'loading' : ''}`}
              onClick={() => onTtsToggle?.(message)}
              disabled={isLoadingTts}
              title={userLanguage === 'id'
                ? (isPlayingTts ? 'Hentikan suara' : 'Baca suara')
                : (isPlayingTts ? 'Stop audio' : 'Read aloud')}
            >
              {isLoadingTts ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : isPlayingTts ? (
                <i className="fas fa-volume-up"></i>
              ) : (
                <i className="fas fa-volume-mute"></i>
              )}
            </button>
          </div>
          <div className="message-attribution">
            {userLanguage === 'id'
              ? 'Deepernova AI dapat membuat kekeliruan. Selalu verifikasi informasi penting.'
              : 'Deepernova AI can make mistakes. Always verify important information.'}
          </div>
        </div>
      )}
    </div>
  );
};

const areMessageItemPropsEqual = (prev, next) => {
  if (prev.message !== next.message) {
    if (
      prev.message?.id !== next.message?.id ||
      prev.message?.text !== next.message?.text ||
      prev.message?.isStreaming !== next.message?.isStreaming ||
      prev.message?.isThinking !== next.message?.isThinking ||
      prev.message?.isSearching !== next.message?.isSearching ||
      prev.message?.isRecallingMemory !== next.message?.isRecallingMemory ||
      prev.message?.isReasoning !== next.message?.isReasoning ||
      prev.message?.reasoningText !== next.message?.reasoningText ||
      prev.message?.reasoningDuration !== next.message?.reasoningDuration ||
      prev.message?.imageUrl !== next.message?.imageUrl ||
      prev.message?.imageUrls !== next.message?.imageUrls ||
      prev.message?.imageError !== next.message?.imageError ||
      prev.message?.imageErrors !== next.message?.imageErrors ||
      prev.message?.imageGenPhase !== next.message?.imageGenPhase ||
      prev.message?.searchSources !== next.message?.searchSources ||
      prev.message?.searchSteps !== next.message?.searchSteps ||
      prev.message?.memoryActions !== next.message?.memoryActions ||
      prev.message?.reminder !== next.message?.reminder ||
      prev.message?.downloadUrl !== next.message?.downloadUrl
    ) {
      return false;
    }
  }

  if (
    prev.isLatestUserMessage !== next.isLatestUserMessage ||
    prev.shouldHideByCompact !== next.shouldHideByCompact ||
    prev.isExpanded !== next.isExpanded ||
    prev.feedbackValue !== next.feedbackValue ||
    prev.isPlayingTts !== next.isPlayingTts ||
    prev.isLoadingTts !== next.isLoadingTts ||
    prev.userLanguage !== next.userLanguage ||
    prev.quizSelectedAnswers !== next.quizSelectedAnswers ||
    prev.quizIsSubmitted !== next.quizIsSubmitted ||
    prev.hdUpscalingMap !== next.hdUpscalingMap
  ) {
    return false;
  }

  if (next.message?.isStreaming || next.message?.isThinking) {
    if (
      prev.loadingPhase !== next.loadingPhase ||
      prev.localModelProgress !== next.localModelProgress
    ) {
      return false;
    }
  }

  return true;
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent, areMessageItemPropsEqual);
export default ChatMessageItem;

