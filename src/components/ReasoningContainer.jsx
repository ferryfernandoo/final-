import React, { useState, useEffect, useRef } from 'react';

/**
 * ReasoningContainer - Minimalist Collapsible Box Holder for Boron 1.1 Reasoning Monologue
 */
export default function ReasoningContainer({
  thought = '',
  isStreaming = false,
  duration = null,
  initiallyExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  // Auto-expand and scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (isExpanded && boxRef.current) {
      const el = boxRef.current;
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    }
  }, [thought, isStreaming, isExpanded]);

  if (!thought && !isStreaming) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!thought) return;
    navigator.clipboard?.writeText(thought);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buttonLabel = isStreaming
    ? 'Proses Penalaran Boron 1.1 (Menalar...)'
    : duration
      ? `Proses Penalaran Boron 1.1 (${duration}s)`
      : 'Proses Penalaran Boron 1.1';

  return (
    <div className="reasoning-completed-container">
      <div className="reasoning-completed-header-row">
        <button
          type="button"
          className={`reasoning-pill-btn ${isExpanded ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(prev => !prev);
          }}
        >
          <span className={`reasoning-pill-icon ${isStreaming ? 'reasoning-brain-pulse' : ''}`}>🧠</span>
          <span className="reasoning-pill-label">{buttonLabel}</span>
          <span className="reasoning-pill-chevron">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {isExpanded && thought && (
          <button
            type="button"
            className="reasoning-copy-btn"
            onClick={handleCopy}
            title="Salin proses penalaran"
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="reasoning-box-holder" ref={boxRef}>
          <div className="reasoning-box-content">
            {thought || (isStreaming ? 'Memulai penalaran...' : '')}
            {isStreaming && <span className="reasoning-blinking-caret">▍</span>}
          </div>
        </div>
      )}
    </div>
  );
}
