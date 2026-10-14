import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AgentService from '../services/agentService';
import AgentExecutionTree, { extractExecutionStepsAndCleanContent } from './AgentExecutionTree';
import './AgentChat.css';

function unescapeXml(safe) {
  if (!safe) return '';
  return String(safe)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getPillConfig(type) {
  switch (type) {
    case 'read':
      return { icon: 'fa-solid fa-book-open', color: '#0284c7', bg: '#e0f2fe', label: 'Berkas Dibaca' };
    case 'search':
      return { icon: 'fa-solid fa-magnifying-glass', color: '#d97706', bg: '#fef3c7', label: 'Kueri Pencarian' };
    case 'command':
      return { icon: 'fa-solid fa-terminal', color: '#475569', bg: '#f1f5f9', label: 'Perintah Terminal' };
    case 'write':
      return { icon: 'fa-solid fa-file-pen', color: '#059669', bg: '#d1fae5', label: 'Berkas Ditulis' };
    case 'execute':
      return { icon: 'fa-solid fa-bolt', color: '#ea580c', bg: '#ffedd5', label: 'Bahasa Eksekusi' };
    case 'check':
      return { icon: 'fa-solid fa-circle-check', color: '#16a34a', bg: '#dcfce7', label: 'Pemeriksaan Berkas' };
    case 'thought':
      return { icon: 'fa-solid fa-lightbulb', color: '#eab308', bg: '#fef9c3', label: 'Catatan Rencana' };
    case 'screenshot':
      return { icon: 'fa-solid fa-camera-retro', color: '#e11d48', bg: '#ffe4e6', label: 'Tangkapan Layar' };
    case 'preview':
      return { icon: 'fa-solid fa-eye', color: '#7c3aed', bg: '#f3e8ff', label: 'Visual Preview' };
    default:
      return { icon: 'fa-solid fa-gear', color: '#64748b', bg: '#f1f5f9', label: 'Tindakan Sistem' };
  }
}

function InlineActionPill({ id, type, title, meta, status = 'completed', detail, sessionId, onSelectFile, onOpenDrawer }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const config = getPillConfig(type);
  const rawDetail = unescapeXml(detail);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(rawDetail || meta || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`agent-inline-pill-wrap is-${status}`}>
      <button
        type="button"
        className={`agent-inline-pill-btn ${isExpanded ? 'is-open' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Klik untuk melihat detail aksi"
      >
        <div className="agent-pill-btn-left">
          <span className="agent-pill-icon-tag" style={{ color: config.color, background: config.bg }}>
            <i className={config.icon} />
          </span>
          <span className="agent-pill-title">{title}</span>
        </div>
        <div className="agent-pill-btn-right">
          {status === 'completed' ? (
            <span className="agent-pill-status is-success">
              <i className="fa-solid fa-check" /> Selesai
            </span>
          ) : (
            <span className="agent-pill-status is-fail">
              <i className="fa-solid fa-xmark" /> Gagal
            </span>
          )}
          <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} agent-pill-chevron`} />
        </div>
      </button>

      {isExpanded && (
        <div className="agent-inline-pill-drawer">
          {meta && (
            <div className="agent-pill-drawer-meta">
              <span className="agent-pill-meta-label">{config.label}:</span>
              <span className="agent-pill-meta-value">{meta}</span>
            </div>
          )}
          <div className="agent-pill-drawer-content">
            <pre>{rawDetail || '(Tidak ada detail output tambahan)'}</pre>
          </div>
          <div className="agent-pill-drawer-footer">
            <button type="button" className="agent-pill-action-btn" onClick={handleCopy}>
              <i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"} />
              <span>{copied ? 'Tersalin' : 'Salin Detail'}</span>
            </button>
            {type === 'write' && meta && (
              <button
                type="button"
                className="agent-pill-action-btn"
                onClick={() => {
                  onSelectFile?.(meta);
                  onOpenDrawer?.('files');
                }}
              >
                <i className="fa-solid fa-code" />
                <span>Buka di Editor</span>
              </button>
            )}
            {type === 'screenshot' && sessionId && (
              <a
                href={`/api/agent/screenshot/${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="agent-pill-action-btn"
                style={{ textDecoration: 'none' }}
              >
                <i className="fa-solid fa-image" />
                <span>Buka Tangkapan Layar</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function extractMessageReasoningAndContent(rawContent, existingReasoning = '') {
  if (!rawContent && !existingReasoning) return { cleanContent: '', reasoning: '' };
  let reasoning = existingReasoning || '';
  let cleanContent = String(rawContent || '');

  // Extract <thought>...</thought>, <think>...</think>, <thinking>...</thinking>, <reasoning>...</reasoning>
  const tagRegex = /<(?:think|thought|thinking|reasoning)>([\s\S]*?)<\/(?:think|thought|thinking|reasoning)>/gi;
  let match;
  while ((match = tagRegex.exec(cleanContent)) !== null) {
    const extracted = match[1].trim();
    if (extracted) {
      reasoning += (reasoning ? '\n\n' : '') + extracted;
    }
  }
  cleanContent = cleanContent.replace(tagRegex, '');

  // Handle unclosed <thought> or <think> if currently streaming or trailing
  const unclosedRegex = /<(?:think|thought|thinking|reasoning)>([\s\S]*)$/i;
  const unclosedMatch = cleanContent.match(unclosedRegex);
  if (unclosedMatch) {
    const extracted = unclosedMatch[1].trim();
    if (extracted) {
      reasoning += (reasoning ? '\n\n' : '') + extracted;
    }
    cleanContent = cleanContent.replace(unclosedRegex, '');
  }

  return {
    cleanContent: cleanContent.trim(),
    reasoning: reasoning.trim()
  };
}

function AgentReasoningBox({ reasoning = '', isStreaming = false, isExpanded = false, onToggle }) {
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (isExpanded && boxRef.current) {
      const el = boxRef.current;
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [reasoning, isExpanded]);

  const reasoningSnippet = useMemo(() => {
    if (!reasoning) return '';
    const clean = reasoning.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    return clean.length > 150 ? clean.slice(0, 150) + '...' : clean;
  }, [reasoning]);

  if (!reasoning && !isStreaming) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!reasoning) return;
    navigator.clipboard?.writeText(reasoning);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="agent-reasoning-wrap">
      <div className="agent-reasoning-header">
        <button
          type="button"
          className={`agent-reasoning-btn ${isExpanded ? 'is-expanded' : ''} ${isStreaming ? 'is-streaming' : ''}`}
          onClick={onToggle}
          title={isExpanded ? "Sembunyikan detail penalaran" : "Buka proses penalaran AI"}
        >
          <div className="agent-reasoning-btn-left">
            <span className={`agent-reasoning-brain-icon ${isStreaming ? 'is-pulsing' : ''}`}>
              <i className="fa-solid fa-brain" />
            </span>
            <span className="agent-reasoning-btn-label">
              {isStreaming ? (
                'Sedang menalar & merancang strategi...'
              ) : (
                `Proses Penalaran AI (${isExpanded ? 'Sembunyikan Detail' : 'Buka Detail'})`
              )}
            </span>
          </div>
          <div className="agent-reasoning-btn-right">
            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} agent-reasoning-chevron`} />
          </div>
        </button>

        {isExpanded && reasoning && (
          <button
            type="button"
            className="agent-reasoning-copy-btn"
            onClick={handleCopy}
            title="Salin proses pemikiran"
          >
            <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} />
            <span>{copied ? 'Tersalin' : 'Salin Nalar'}</span>
          </button>
        )}
      </div>

      {!isExpanded && reasoningSnippet && !isStreaming && (
        <div 
          className="agent-reasoning-preview-quote" 
          onClick={onToggle} 
          title="Klik untuk membaca nalar lengkap"
        >
          <i className="fa-solid fa-quote-left agent-reasoning-quote-icon" />
          <span className="agent-reasoning-quote-text">{reasoningSnippet}</span>
        </div>
      )}

      {isExpanded && (
        <div className="agent-reasoning-drawer" ref={boxRef}>
          <div className="agent-reasoning-drawer-banner">
            <i className="fa-solid fa-microchip" style={{ color: '#ea580c' }} />
            <span>Analisis Internal & Perencanaan Logika (Extended Reasoning)</span>
          </div>
          <div className="agent-reasoning-drawer-body">
            <pre>{reasoning || (isStreaming ? 'Memulai penalaran internal...' : '')}</pre>
            {isStreaming && <span className="agent-reasoning-caret">▌</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function parseContentWithPills(content) {
  if (!content) return [];
  const pillRegex = /<action_pill\s+id="([^"]*)"\s+type="([^"]*)"\s+title="([^"]*)"(?:\s+meta="([^"]*)")?(?:\s+status="([^"]*)")?>([\s\S]*?)<\/action_pill>/gi;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = pillRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }
    segments.push({
      type: 'pill',
      id: match[1],
      pillType: match[2],
      title: match[3],
      meta: match[4] || '',
      status: match[5] || 'completed',
      detail: match[6]
    });
    lastIndex = pillRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return segments;
}

export default function AgentChat({ user, isAuthenticated, isGuest, onNavigate, onLogout }) {
  // Sessions & Active Conversation
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 769);

  // Sandbox Drawer & Tools Panel
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('files'); // 'files' | 'terminal' | 'preview' | 'skill'
  const [sandboxFiles, setSandboxFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isFileSaving, setIsFileSaving] = useState(false);

  // Terminal State
  const [terminalLogs, setTerminalLogs] = useState('> Deepernova AI Agent Sandbox Terminal initialized.\n> Workspace jailed in isolated session.\n');
  const [terminalInput, setTerminalInput] = useState('');
  const [isTermExecuting, setIsTermExecuting] = useState(false);

  // Preview State
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [previewViewport, setPreviewViewport] = useState('desktop'); // 'desktop' | 'mobile'

  // SKILL.md State
  const [skillContent, setSkillContent] = useState('');
  const [isSkillSaving, setIsSkillSaving] = useState(false);

  // Live Chain of Work Accordion state for active turn
  const [activeChainOfWork, setActiveChainOfWork] = useState([]);
  const [expandedChains, setExpandedChains] = useState({});
  const toggleChain = (id) => setExpandedChains(prev => ({ ...prev, [id]: !prev[id] }));

  // Extended Thinking / Reasoning Box (Collapsed by default for clean UI)
  const [expandedReasonings, setExpandedReasonings] = useState({});
  const toggleReasoning = (id) => setExpandedReasonings(prev => ({ ...prev, [id]: !prev[id] }));

  // Expandable files map for internal/extra files toggle
  const [showAllFilesMap, setShowAllFilesMap] = useState({});
  const toggleShowAllFiles = (id) => setShowAllFilesMap(prev => ({ ...prev, [id]: !prev[id] }));

  // File Attachment & Upload State
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const touchStartYRef = useRef(0);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const abortControllerRef = useRef(null);
  const smoothStreamTimerRef = useRef(null);

  // Top Header 3-dots Menu Dropdown State
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const menuDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(e.target)) {
        setShowMenuDropdown(false);
      }
    };
    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuDropdown]);

  useEffect(() => {
    return () => {
      if (smoothStreamTimerRef.current) {
        clearInterval(smoothStreamTimerRef.current);
        smoothStreamTimerRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = (smooth = true) => {
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Wheel detection: deltaY < 0 means user is scrolling up to read earlier text
  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      userScrolledUpRef.current = true;
      setShowScrollBottomBtn(true);
    } else if (e.deltaY > 0) {
      const el = messagesContainerRef.current;
      if (el) {
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (dist <= 30) {
          userScrolledUpRef.current = false;
          setShowScrollBottomBtn(false);
        }
      }
    }
  };

  // Touch gesture detection for mobile devices
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      const currentY = e.touches[0].clientY;
      if (currentY > touchStartYRef.current + 10) {
        userScrolledUpRef.current = true;
        setShowScrollBottomBtn(true);
      }
    }
  };

  // Detect user scroll away from bottom
  const handleContainerScroll = (e) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 70) {
      userScrolledUpRef.current = true;
      setShowScrollBottomBtn(true);
    } else if (distanceFromBottom <= 25) {
      userScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
    }
  };

  // 1. Initial Load: fetch sessions
  useEffect(() => {
    const loadSessions = async () => {
      const list = await AgentService.getSessions();
      setSessions(list);
      if (list.length > 0) {
        selectSession(list[0].id);
      } else {
        startNewSession();
      }
    };
    loadSessions();
  }, []);

  // 2. Select session and load messages + files
  const selectSession = async (sessionId) => {
    if (smoothStreamTimerRef.current) {
      clearInterval(smoothStreamTimerRef.current);
      smoothStreamTimerRef.current = null;
    }
    setCurrentSessionId(sessionId);
    setActiveChainOfWork([]);
    const msgs = await AgentService.getMessages(sessionId);
    setMessages(msgs);

    const files = await AgentService.getFiles(sessionId);
    setSandboxFiles(files);

    const htmlFile = files.find(f => f.ext === 'html');
    if (htmlFile) {
      setPreviewUrl(`/api/agent/preview/${sessionId}/${htmlFile.path}`);
    } else {
      setPreviewUrl(null);
    }

    // Load SKILL.md
    const skill = await AgentService.readFile(sessionId, 'SKILL.md');
    if (skill) setSkillContent(skill);

    setTimeout(() => scrollToBottom(false), 80);
  };

  // 3. Start a new agent session
  const startNewSession = async () => {
    if (isExecuting) return;
    const newSession = await AgentService.createSession('Tugas Otonom Baru');
    if (newSession) {
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setActiveChainOfWork([]);
      const files = await AgentService.getFiles(newSession.id);
      setSandboxFiles(files);
      setPreviewUrl(null);
      const skill = await AgentService.readFile(newSession.id, 'SKILL.md');
      if (skill) setSkillContent(skill);
      setTimeout(() => scrollToBottom(false), 50);
    }
  };

  // 4. Delete session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Hapus sesi agent dan seluruh berkas sandbox ini?')) return;
    await AgentService.deleteSession(sessionId);
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        selectSession(updated[0].id);
      } else {
        startNewSession();
      }
    }
  };

  // 5. Send Prompt & Execute Autonomous Loop
  const handleSendMessage = async (customPrompt = null) => {
    let textToSend = customPrompt || inputValue.trim();
    if (!textToSend || isExecuting || !currentSessionId) return;

    if (uploadedAttachments.length > 0) {
      textToSend += `\n\n[Berkas lampiran yang diunggah pengguna ke sandbox: ${uploadedAttachments.join(', ')}]`;
      setUploadedAttachments([]);
    }

    setInputValue('');
    setIsExecuting(true);
    setActiveChainOfWork([]);

    const startTimestamp = Date.now();
    const userMsgId = `msg_user_${startTimestamp}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    const botMsgId = `bot_${startTimestamp}_${Math.random().toString(36).slice(2, 6)}`;
    const initialBotMsg = {
      id: botMsgId,
      role: 'assistant',
      content: '',
      reasoning: '',
      isStreaming: true,
      chainOfWork: [],
      sandboxFiles: [],
      startTime: startTimestamp,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg, initialBotMsg]);

    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);

    // FLOW: Bubble ask user naik jadi paling atas dan sisakan ruangan bawahnya untuk ai generating
    setTimeout(() => {
      const userEl = document.getElementById(userMsgId);
      if (userEl && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const targetTop = userEl.offsetTop - 24;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }, 40);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Smooth Typewriter Controller for Autonomous Agent Chat
    let targetContent = '';
    let displayedContent = '';
    let targetReasoning = '';
    let displayedReasoning = '';
    let isStreamDone = false;
    let pendingDonePayload = null;
    let smoothTimer = null;

    const stopSmoothTimer = () => {
      if (smoothTimer) {
        clearInterval(smoothTimer);
        smoothTimer = null;
        smoothStreamTimerRef.current = null;
      }
    };

    const finalizeDone = (payload) => {
      stopSmoothTimer();
      setIsExecuting(false);
      setMessages(prev => prev.map(m => {
        if (m.id === botMsgId) {
          return {
            ...m,
            id: payload?.messageId || m.id,
            isStreaming: false,
            content: payload?.content || targetContent || m.content,
            reasoning: payload?.reasoning || targetReasoning || m.reasoning || '',
            chainOfWork: payload?.chainOfWork || m.chainOfWork,
            sandboxFiles: payload?.files || m.sandboxFiles,
            allFiles: payload?.allFiles || payload?.files || m.sandboxFiles,
            screenshotUrl: payload?.screenshotUrl || payload?.previewUrl,
            previewUrl: payload?.previewUrl
          };
        }
        return m;
      }));
      setActiveChainOfWork([]);

      const filesList = payload?.allFiles || payload?.files;
      if (filesList) {
        setSandboxFiles(filesList);
        const html = filesList.find(f => f.ext === 'html');
        if (html) {
          setPreviewUrl(`/api/agent/preview/${currentSessionId}/${html.path}`);
          setPreviewKey(Date.now());
        }
      }

      // Update sidebar title if first turn
      if (messages.length <= 1) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: textToSend.slice(0, 35) } : s));
      }

      // TIDAK memaksa auto-scroll agar user bebas membaca teks di posisinya
    };

    const flushSmoothTyping = () => {
      if (abortController.signal.aborted) {
        stopSmoothTimer();
        return;
      }

      let updated = false;

      // 1. Smooth Reasoning Stream (Santai & Paced)
      if (displayedReasoning.length < targetReasoning.length) {
        const diff = targetReasoning.length - displayedReasoning.length;
        let step = 1;
        if (diff <= 80) step = 1;
        else if (diff <= 200) step = 2;
        else step = Math.min(diff, Math.max(2, Math.min(3, Math.ceil(diff / 60))));

        if (isStreamDone) {
          step = Math.min(diff, Math.max(step, Math.min(4, Math.ceil(diff / 20))));
        }

        displayedReasoning += targetReasoning.substr(displayedReasoning.length, step);
        updated = true;
      }

      // 2. Smooth Main Content Stream (Santai, Halus, Tidak Kalap Token)
      if (displayedContent.length < targetContent.length) {
        const remainingTarget = targetContent.slice(displayedContent.length);

        // Instant reveal for completed <action_pill> tags to prevent raw broken XML rendering
        if (remainingTarget.startsWith('<action_pill')) {
          const closePillIdx = remainingTarget.indexOf('</action_pill>');
          if (closePillIdx !== -1) {
            const pillLength = closePillIdx + '</action_pill>'.length;
            displayedContent += remainingTarget.slice(0, pillLength);
            updated = true;
          }
        } else {
          // Regular text content: santai & smooth character pacing
          const nextPillIdx = remainingTarget.indexOf('<action_pill');
          const maxAllowed = nextPillIdx !== -1 ? nextPillIdx : remainingTarget.length;

          if (maxAllowed > 0) {
            const diff = maxAllowed;
            // Kecepatan santai terkontrol agar nyaman dibaca dan tidak membanjiri teks
            let step = 1;
            if (diff <= 80) step = 1;
            else if (diff <= 220) step = 2;
            else step = Math.min(diff, Math.max(2, Math.min(3, Math.ceil(diff / 60))));

            if (isStreamDone) {
              step = Math.min(diff, Math.max(step, Math.min(4, Math.ceil(diff / 20))));
            }

            step = Math.min(step, maxAllowed);
            displayedContent += remainingTarget.substr(0, step);
            updated = true;
          }
        }
      }

      if (updated) {
        setMessages(prev => prev.map(m => {
          if (m.id === botMsgId) {
            return {
              ...m,
              content: displayedContent,
              reasoning: displayedReasoning
            };
          }
          return m;
        }));

        // FLOW: If user has NOT scrolled up, follow bottom as content generates past viewport!
        // If user scrolled up, DO NOT fight the user!
        if (!userScrolledUpRef.current && messagesContainerRef.current) {
          const el = messagesContainerRef.current;
          const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (dist > 0 && el.scrollHeight > el.clientHeight) {
            el.scrollTop = el.scrollHeight;
          }
        }
      }

      // 3. Finalization when upstream stream is done AND visual text has fully caught up
      if (isStreamDone && displayedContent.length >= targetContent.length && displayedReasoning.length >= targetReasoning.length) {
        finalizeDone(pendingDonePayload);
      }
    };

    const startSmoothTimer = () => {
      if (!smoothTimer) {
        smoothTimer = setInterval(flushSmoothTyping, 32);
        smoothStreamTimerRef.current = smoothTimer;
      }
    };

    try {
      await AgentService.runTask({
        sessionId: currentSessionId,
        prompt: textToSend,
        model: 'deepernova-gold-1.5',
        history: messages,
        signal: abortController.signal,
        onDelta: (chunk) => {
          targetContent += chunk;
          startSmoothTimer();
        },
        onReasoning: (chunk) => {
          targetReasoning += chunk;
          startSmoothTimer();
        },
        onFilesUpdate: (newFiles) => {
          setSandboxFiles(newFiles);
          setMessages(prev => prev.map(m => {
            if (m.id === botMsgId) {
              return { ...m, sandboxFiles: newFiles };
            }
            return m;
          }));
          const html = newFiles.find(f => f.ext === 'html');
          if (html) {
            setPreviewUrl(`/api/agent/preview/${currentSessionId}/${html.path}`);
          }
        },
        onStep: (step) => {
          setMessages(prev => prev.map(m => {
            if (m.id === botMsgId) {
              const currentCow = m.chainOfWork || [];
              return { ...m, chainOfWork: [...currentCow, step] };
            }
            return m;
          }));
          setActiveChainOfWork(prev => [...prev, step]);
          if (!userScrolledUpRef.current && messagesContainerRef.current) {
            const el = messagesContainerRef.current;
            if (el.scrollHeight > el.clientHeight) {
              el.scrollTop = el.scrollHeight;
            }
          }
        },
        onStepUpdate: (updatedStep) => {
          setMessages(prev => prev.map(m => {
            if (m.id === botMsgId) {
              const currentCow = (m.chainOfWork || []).map(s => s.id === updatedStep.id ? updatedStep : s);
              return { ...m, chainOfWork: currentCow };
            }
            return m;
          }));
          setActiveChainOfWork(prev => prev.map(s => s.id === updatedStep.id ? updatedStep : s));
          if (!userScrolledUpRef.current && messagesContainerRef.current) {
            const el = messagesContainerRef.current;
            if (el.scrollHeight > el.clientHeight) {
              el.scrollTop = el.scrollHeight;
            }
          }
        },
        onDone: (payload) => {
          isStreamDone = true;
          pendingDonePayload = payload;
          if (payload.content) targetContent = payload.content;
          if (payload.reasoning) targetReasoning = payload.reasoning;
          startSmoothTimer();
          // If visual text is already fully rendered, finalize immediately
          if (displayedContent.length >= targetContent.length && displayedReasoning.length >= targetReasoning.length) {
            finalizeDone(payload);
          }
        },
        onError: (errPayload) => {
          stopSmoothTimer();
          setIsExecuting(false);
          setMessages(prev => prev.map(m => {
            if (m.id === botMsgId) {
              return {
                ...m,
                isStreaming: false,
                content: (m.content ? m.content + '\n\n' : '') + `⚠️ Kendala eksekusi agent: ${errPayload.error || 'Terjadi kesalahan tidak terduga.'}`
              };
            }
            return m;
          }));
          setActiveChainOfWork([]);
          scrollToBottom(true);
        }
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      stopSmoothTimer();
      setIsExecuting(false);
    }
  };

  const handleStopExecution = () => {
    if (smoothStreamTimerRef.current) {
      clearInterval(smoothStreamTimerRef.current);
      smoothStreamTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExecuting(false);
    setMessages(prev => prev.map(m => {
      if (m.isStreaming) {
        return {
          ...m,
          isStreaming: false,
          content: (m.content || '') + '\n\n*(Proses dihentikan oleh pengguna)*'
        };
      }
      return m;
    }));
    setActiveChainOfWork([]);
  };

  // 6. Sandbox File Editor Actions
  const handleSelectFile = async (filePath) => {
    setSelectedFile(filePath);
    const content = await AgentService.readFile(currentSessionId, filePath);
    setFileContent(content || '');
  };

  const handleSaveCurrentFile = async () => {
    if (!selectedFile || !currentSessionId) return;
    setIsFileSaving(true);
    await AgentService.writeFile(currentSessionId, selectedFile, fileContent);
    const files = await AgentService.getFiles(currentSessionId);
    setSandboxFiles(files);
    setIsFileSaving(false);
    if (selectedFile.endsWith('.html')) {
      setPreviewKey(Date.now());
    }
  };

  const handleDownloadFile = () => {
    if (!selectedFile) return;
    handleDownloadSingleFile(selectedFile);
  };

  const getFileIcon = (ext) => {
    switch (ext?.toLowerCase()) {
      case 'doc':
      case 'docx': return { icon: 'fa-solid fa-file-word', color: '#2b579a' };
      case 'xls':
      case 'xlsx':
      case 'csv': return { icon: 'fa-solid fa-file-excel', color: '#107c41' };
      case 'ppt':
      case 'pptx': return { icon: 'fa-solid fa-file-powerpoint', color: '#d24726' };
      case 'pdf': return { icon: 'fa-solid fa-file-pdf', color: '#dc2626' };
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz': return { icon: 'fa-solid fa-file-zipper', color: '#7c3aed' };
      case 'html': return { icon: 'fa-brands fa-html5', color: '#e34f26' };
      case 'css': return { icon: 'fa-brands fa-css3-alt', color: '#1572b6' };
      case 'js':
      case 'jsx': return { icon: 'fa-brands fa-js', color: '#ca8a04' };
      case 'ts':
      case 'tsx': return { icon: 'fa-solid fa-code', color: '#2563eb' };
      case 'py': return { icon: 'fa-brands fa-python', color: '#0284c7' };
      case 'json': return { icon: 'fa-solid fa-brackets-curly', color: '#d97706' };
      case 'md': return { icon: 'fa-solid fa-file-lines', color: '#64748b' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp': return { icon: 'fa-solid fa-file-image', color: '#10b981' };
      default: return { icon: 'fa-solid fa-file-code', color: '#ea580c' };
    }
  };

  const handleDownloadSingleFile = (filePath) => {
    if (!currentSessionId || !filePath) return;
    const url = AgentService.getDownloadUrl(currentSessionId, filePath);
    window.open(url, '_blank');
  };

  const handleDownloadAllZip = () => {
    if (!currentSessionId) return;
    const url = AgentService.getZipDownloadUrl(currentSessionId);
    window.open(url, '_blank');
  };

  const handleUserFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !currentSessionId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const res = await AgentService.uploadFile(currentSessionId, file);
        if (res && res.success) {
          setUploadedAttachments(prev => [...prev, file.name]);
        }
      }
      const updated = await AgentService.getFiles(currentSessionId);
      setSandboxFiles(updated);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (fileName) => {
    setUploadedAttachments(prev => prev.filter(n => n !== fileName));
  };

  // 7. Terminal Execution Action
  const handleRunTerminalCommand = async (e) => {
    e?.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd || isTermExecuting || !currentSessionId) return;

    setTerminalInput('');
    setIsTermExecuting(true);
    setTerminalLogs(prev => prev + `\n$ ${cmd}\n`);

    const res = await AgentService.executeCode(currentSessionId, { command: cmd });
    setIsTermExecuting(false);

    let outputText = '';
    if (res.stdout) outputText += res.stdout;
    if (res.stderr) outputText += (outputText ? '\n' : '') + res.stderr;
    if (!outputText) outputText = `(Proses selesai dengan kode keluar ${res.exitCode})`;

    setTerminalLogs(prev => prev + `${outputText}\n`);
    // Refresh files list if files created
    const files = await AgentService.getFiles(currentSessionId);
    setSandboxFiles(files);
  };

  // 8. Save SKILL.md
  const handleSaveSkill = async () => {
    if (!currentSessionId) return;
    setIsSkillSaving(true);
    await AgentService.writeFile(currentSessionId, 'SKILL.md', skillContent);
    setIsSkillSaving(false);
    alert('Aturan SKILL.md berhasil diperbarui untuk sesi ini!');
  };

  const filteredSessions = sessions.filter(s =>
    (s.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="agent-app">
      {/* ===== SIDEBAR ===== */}
      <aside className={`agent-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="agent-sidebar-header">
          <div className="agent-sidebar-brand" onClick={() => onNavigate?.('landing')}>
            <img src="/logo.png" alt="Deepernova AI" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>Deepernova</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#ea580c', letterSpacing: '0.5px' }}>AI Agent</span>
            </div>
          </div>
          {typeof window !== 'undefined' && window.innerWidth < 768 && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>

        <button className="agent-new-chat-btn" onClick={startNewSession}>
          <i className="fa-solid fa-plus" />
          <span>Tugas Agent Baru</span>
        </button>

        <div className="agent-search-box">
          <i className="fa-solid fa-magnifying-glass agent-search-icon" />
          <input
            type="text"
            placeholder="Cari sesi tugas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="agent-session-list">
          {filteredSessions.map(session => (
            <div
              key={session.id}
              className={`agent-session-item ${currentSessionId === session.id ? 'is-active' : ''}`}
              onClick={() => selectSession(session.id)}
            >
              <div className="agent-session-title">
                <i className="fa-solid fa-bolt" style={{ color: '#ea580c', fontSize: 11 }} />
                <span>{session.title || 'Tugas Otonom AI'}</span>
              </div>
              <button
                className="agent-session-delete"
                onClick={(e) => handleDeleteSession(e, session.id)}
                title="Hapus sesi"
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>

        <div className="agent-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#ea580c', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13
            }}>
              {(user?.name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', maxWidth: 140 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Developer'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>AI Agent</div>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('landing')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, fontSize: 15 }}
            title="Kembali ke Beranda"
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      {/* ===== MAIN CHAT AREA ===== */}
      <main className="agent-main">
        {/* Top Header */}
        <header className="agent-header">
          <div className="agent-header-left">
            <button className="agent-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="fa-solid fa-bars" />
            </button>
            <div className="agent-header-brand-clean">
              <span className="agent-header-brand-title">Deepernova AI</span>
              <span className="agent-header-brand-badge">Agent</span>
            </div>
          </div>

          <div className="agent-header-right" ref={menuDropdownRef}>
            <div className="agent-menu-dropdown-container">
              <button
                type="button"
                className={`agent-more-menu-btn ${showMenuDropdown ? 'is-active' : ''}`}
                onClick={() => setShowMenuDropdown(prev => !prev)}
                title="Opsi & Alat Agent"
                aria-label="Opsi & Alat Agent"
              >
                <i className="fa-solid fa-ellipsis-vertical" />
                {sandboxFiles.length > 0 && <span className="agent-menu-indicator-dot" />}
              </button>

              {showMenuDropdown && (
                <div className="agent-menu-dropdown">
                  <div className="agent-menu-dropdown-header">
                    <span>Menu Alat & Workspace</span>
                  </div>

                  <button
                    type="button"
                    className={`agent-menu-item ${isDrawerOpen && activeDrawerTab === 'files' ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveDrawerTab('files');
                      setIsDrawerOpen(true);
                      setShowMenuDropdown(false);
                    }}
                  >
                    <span className="agent-menu-item-icon files-icon">
                      <i className="fa-solid fa-folder-open" />
                    </span>
                    <div className="agent-menu-item-info">
                      <div className="agent-menu-item-title-row">
                        <span className="agent-menu-item-name">Berkas Workspace</span>
                        <span className="agent-menu-count-badge">{sandboxFiles.length}</span>
                      </div>
                      <span className="agent-menu-item-sub">Lihat file hasil generasi sandbox</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`agent-menu-item ${isDrawerOpen && activeDrawerTab === 'terminal' ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveDrawerTab('terminal');
                      setIsDrawerOpen(true);
                      setShowMenuDropdown(false);
                    }}
                  >
                    <span className="agent-menu-item-icon terminal-icon">
                      <i className="fa-solid fa-terminal" />
                    </span>
                    <div className="agent-menu-item-info">
                      <span className="agent-menu-item-name">Terminal Console</span>
                      <span className="agent-menu-item-sub">Log terminal & eksekusi shell</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`agent-menu-item ${isDrawerOpen && activeDrawerTab === 'preview' ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveDrawerTab('preview');
                      setIsDrawerOpen(true);
                      setShowMenuDropdown(false);
                    }}
                  >
                    <span className="agent-menu-item-icon preview-icon">
                      <i className="fa-solid fa-globe" />
                    </span>
                    <div className="agent-menu-item-info">
                      <span className="agent-menu-item-name">Live Web Preview</span>
                      <span className="agent-menu-item-sub">Pratinjau antarmuka web / HTML</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`agent-menu-item ${isDrawerOpen && activeDrawerTab === 'skill' ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveDrawerTab('skill');
                      setIsDrawerOpen(true);
                      setShowMenuDropdown(false);
                    }}
                  >
                    <span className="agent-menu-item-icon skill-icon">
                      <i className="fa-solid fa-book-bookmark" />
                    </span>
                    <div className="agent-menu-item-info">
                      <span className="agent-menu-item-name">Panduan SKILL.md</span>
                      <span className="agent-menu-item-sub">Aturan & arsitektur dokumen</span>
                    </div>
                  </button>

                  <div className="agent-menu-divider" />

                  <button
                    type="button"
                    className="agent-menu-item is-chat-switch"
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onNavigate?.('chat');
                    }}
                  >
                    <span className="agent-menu-item-icon chat-icon">
                      <i className="fa-solid fa-comments" />
                    </span>
                    <div className="agent-menu-item-info">
                      <span className="agent-menu-item-name">Beralih ke Chat Biasa</span>
                      <span className="agent-menu-item-sub">Mode percakapan standar non-agent</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Message Feed */}
        <div 
          className="agent-messages-container"
          ref={messagesContainerRef}
          onScroll={handleContainerScroll}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {messages.length === 0 && activeChainOfWork.length === 0 && (
            <div className="agent-welcome">
              <div className="agent-welcome-avatar">
                <img src="/logo.png" alt="Deepernova AI" />
              </div>
              <h2 className="agent-welcome-title">Deepernova AI Agent</h2>
            </div>
          )}

          {/* Historical Messages */}
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant';
            const { cleanContent, steps } = isBot
              ? extractExecutionStepsAndCleanContent(msg.content, msg.reasoning, msg.chainOfWork)
              : { cleanContent: msg.content, steps: [] };

            return (
              <div 
                key={msg.id} 
                id={msg.id} 
                className={`agent-msg-row is-${msg.role === 'user' ? 'user' : 'bot'} ${msg.isStreaming ? 'is-generating' : ''}`}
              >
                <div className="agent-msg-avatar">
                  {msg.role === 'user' ? (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                  ) : (
                    <img src="/logo.png" alt="Deepernova AI" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
                  )}
                </div>
                <div className="agent-msg-content">
                  {/* Unified Claude/Gemini Execution Tree (Collapsible "Worked for 2m ▾", sub-steps, no messy pills) */}
                  {isBot && (steps.length > 0 || msg.isStreaming) && (
                    <AgentExecutionTree
                      steps={steps}
                      isStreaming={!!msg.isStreaming}
                      startTime={msg.startTime}
                      duration={msg.duration}
                      onSelectFile={handleSelectFile}
                      onOpenDrawer={(tab) => {
                        setActiveDrawerTab(tab);
                        setIsDrawerOpen(true);
                      }}
                    />
                  )}

                  {/* Message Bubble */}
                  <div className="agent-msg-bubble">
                    {msg.role === 'user' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="agent-msg-body">
                        {msg.isStreaming && !cleanContent?.trim() && steps.length === 0 && (
                          <div className="agent-streaming-placeholder">
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#ea580c' }} />
                            <span>Deepernova AI sedang merancang & menyusun jawaban...</span>
                          </div>
                        )}
                        {cleanContent?.trim() && (
                          <div className="agent-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {cleanContent}
                            </ReactMarkdown>
                          </div>
                        )}
                        {msg.isStreaming && cleanContent?.trim() && (
                          <span className="agent-typing-cursor">▌</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Screenshot / Visual Result Preview Card */}
                  {isBot && (msg.screenshotUrl || (msg.sandboxFiles || []).some(f => f.name === 'screenshot.png' || f.name === 'preview.png')) && (() => {
                    const ssUrl = msg.screenshotUrl || `/api/agent/screenshot/${currentSessionId}?t=${Date.now()}`;
                    return (
                      <div className="agent-msg-screenshot-preview">
                        <div className="agent-screenshot-preview-header">
                          <div className="agent-screenshot-header-left">
                            <i className="fa-solid fa-camera-retro" style={{ color: '#ea580c' }} />
                            <span className="agent-screenshot-title">Tangkapan Layar Hasil Kodingan</span>
                            <span className="agent-screenshot-badge">Live Capture</span>
                          </div>
                          <div className="agent-screenshot-header-right">
                            <a
                              href={ssUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="agent-screenshot-btn is-zoom"
                              title="Buka gambar resolusi penuh di tab baru"
                            >
                              <i className="fa-solid fa-up-right-and-down-left-from-center" />
                              <span>Ukuran Penuh</span>
                            </a>
                            {(msg.previewUrl || previewUrl) && (
                              <button
                                type="button"
                                className="agent-screenshot-btn is-live"
                                onClick={() => {
                                  if (msg.previewUrl) setPreviewUrl(msg.previewUrl);
                                  setActiveDrawerTab('preview');
                                  setIsDrawerOpen(true);
                                }}
                                title="Buka live web interaktif"
                              >
                                <i className="fa-solid fa-globe" />
                                <span>Buka Live Web</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div
                          className="agent-screenshot-img-container"
                          onClick={() => window.open(ssUrl, '_blank')}
                          title="Klik untuk melihat resolusi penuh"
                        >
                          <img
                            src={ssUrl}
                            alt="Tangkapan layar hasil kodingan"
                            className="agent-screenshot-img"
                            loading="lazy"
                            onError={(e) => {
                              if (e.currentTarget?.parentElement?.parentElement) {
                                e.currentTarget.parentElement.parentElement.style.display = 'none';
                              }
                            }}
                          />
                          <div className="agent-screenshot-zoom-overlay">
                            <i className="fa-solid fa-magnifying-glass-plus" />
                            <span>Klik untuk memperbesar gambar</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Interactive Downloadable File Deliverables (AI Cerdas) */}
                  {isBot && (() => {
                    const allSessionFiles = msg.allFiles || sandboxFiles || [];
                    const primaryDeliverables = (msg.sandboxFiles || []).filter(f => 
                      f.path !== 'SKILL.md' && !f.path.startsWith('_runner_temp')
                    );
                    
                    if (primaryDeliverables.length === 0 && allSessionFiles.length === 0) return null;

                    const extraFiles = allSessionFiles.filter(f => 
                      f.path !== 'SKILL.md' && 
                      !f.path.startsWith('_runner_temp') &&
                      !f.path.endsWith('.pyc') &&
                      !f.path.includes('__pycache__') &&
                      !primaryDeliverables.some(p => p.path === f.path)
                    );

                    const isExtraExpanded = !!showAllFilesMap[msg.id];
                    const filesToShow = isExtraExpanded 
                      ? [...primaryDeliverables, ...extraFiles] 
                      : primaryDeliverables;

                    if (filesToShow.length === 0) return null;

                    return (
                      <div className="agent-msg-files-section">
                        <div className="agent-msg-files-header">
                          <div className="agent-msg-files-title">
                            <i className="fa-solid fa-file-circle-check" style={{ color: '#ea580c' }} />
                            <span>Berkas Proyek ({primaryDeliverables.length})</span>
                            <span className="agent-smart-filter-badge" title="AI secara otomatis menyaring berkas yang relevan dengan instruksi Anda">
                              <i className="fa-solid fa-wand-magic-sparkles" /> Siap Pakai
                            </span>
                          </div>
                          <button 
                            className="agent-zip-download-btn"
                            onClick={handleDownloadAllZip}
                            title="Unduh seluruh project sebagai arsip .ZIP"
                          >
                            <i className="fa-solid fa-file-zipper" />
                            <span>Unduh Semua (.ZIP)</span>
                          </button>
                        </div>

                        <div className="agent-msg-files-grid">
                          {filesToShow.map((file) => {
                            const iconMeta = getFileIcon(file.ext);
                            const isExtra = !primaryDeliverables.some(p => p.path === file.path);
                            return (
                              <div key={file.path} className={`agent-msg-file-card ${isExtra ? 'is-extra-file' : ''}`}>
                                <div className="agent-msg-file-info">
                                  <div className="agent-file-icon-box">
                                    <i className={iconMeta.icon} style={{ color: iconMeta.color }} />
                                  </div>
                                  <div className="agent-msg-file-meta">
                                    <span className="agent-msg-file-name" title={file.path}>
                                      {file.name}
                                      {isExtra && <span className="agent-extra-badge">internal</span>}
                                    </span>
                                    <span className="agent-msg-file-size">
                                      {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'File'}
                                    </span>
                                  </div>
                                </div>
                                <div className="agent-msg-file-actions">
                                  <button
                                    className="agent-file-card-btn is-download"
                                    onClick={() => handleDownloadSingleFile(file.path)}
                                    title={`Unduh berkas ${file.name}`}
                                  >
                                    <i className="fa-solid fa-download" /> Unduh
                                  </button>
                                  <button
                                    className="agent-file-card-btn is-view"
                                    onClick={() => {
                                      handleSelectFile(file.path);
                                      setActiveDrawerTab('files');
                                      setIsDrawerOpen(true);
                                    }}
                                    title={`Buka & periksa ${file.name}`}
                                  >
                                    <i className="fa-solid fa-code" /> Lihat
                                  </button>
                                  {file.ext === 'html' && (
                                    <button
                                      className="agent-file-card-btn is-preview"
                                      onClick={() => {
                                        setPreviewUrl(`/api/agent/preview/${currentSessionId}/${file.path}`);
                                        setActiveDrawerTab('preview');
                                        setIsDrawerOpen(true);
                                      }}
                                      title="Live Preview di tab web"
                                    >
                                      <i className="fa-solid fa-eye" /> Preview
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {extraFiles.length > 0 && (
                          <div className="agent-extra-files-toggle-wrap">
                            <button
                              type="button"
                              className="agent-extra-files-toggle-btn"
                              onClick={() => toggleShowAllFiles(msg.id)}
                            >
                              <i className={`fa-solid fa-chevron-${isExtraExpanded ? 'up' : 'down'}`} />
                              <span>
                                {isExtraExpanded 
                                  ? `Sembunyikan ${extraFiles.length} berkas teknis/internal` 
                                  : `Tampilkan Semua Berkas Sandbox (+${extraFiles.length} berkas teknis/internal)`}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Clean Minimalist Action Footer: Copy & Quick Preview */}
                  {isBot && !msg.isStreaming && cleanContent?.trim() && (
                    <div className="agent-minimal-actions">
                      <button
                        type="button"
                        className="agent-minimal-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText(cleanContent);
                          setCopiedMsgId(msg.id);
                          setTimeout(() => setCopiedMsgId(null), 2000);
                        }}
                        title="Salin jawaban AI"
                      >
                        <i className={copiedMsgId === msg.id ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                        <span>{copiedMsgId === msg.id ? 'Tersalin' : 'Salin'}</span>
                      </button>

                      {(msg.previewUrl || previewUrl) && (
                        <button
                          type="button"
                          className="agent-minimal-btn is-preview-accent"
                          onClick={() => {
                            if (msg.previewUrl) setPreviewUrl(msg.previewUrl);
                            setActiveDrawerTab('preview');
                            setIsDrawerOpen(true);
                          }}
                          title="Buka live web interaktif di panel kerja"
                        >
                          <i className="fa-solid fa-globe" />
                          <span>Buka Live Web</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
          {showScrollBottomBtn && (
            <button
              type="button"
              className="agent-floating-scroll-bottom"
              onClick={() => scrollToBottom(true)}
              title="Kembali ke teks terbaru"
            >
              <i className="fa-solid fa-arrow-down" />
              <span>Teks Terbaru</span>
            </button>
          )}
        </div>

        {/* Input Bar — Autonomous Agent Composer */}
        <div className="agent-input-wrapper">
          <div className="agent-input-container">
            {/* User Attachments Preview Chips */}
            {uploadedAttachments.length > 0 && (
              <div className="agent-upload-chips">
                {uploadedAttachments.map((name) => (
                  <span key={name} className="agent-upload-chip">
                    <i className="fa-solid fa-paperclip" />
                    <span>{name}</span>
                    <button type="button" onClick={() => removeAttachment(name)} title="Hapus lampiran">✕</button>
                  </span>
                ))}
                <span className="agent-upload-status">Tersimpan di sandbox</span>
              </div>
            )}

            {isUploading && (
              <div className="agent-uploading-indicator">
                <i className="fa-solid fa-circle-notch fa-spin" />
                <span>Mengunggah berkas ke sandbox...</span>
              </div>
            )}

            <div className={`agent-composer-box ${isExecuting ? 'generating' : ''}`}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUserFileUpload}
                multiple
                style={{ display: 'none' }}
              />

              <div className="agent-composer-textarea-wrapper">
                <textarea
                  className="agent-composer-input"
                  placeholder="Tanya Deepernova AI Agent..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isExecuting}
                  rows={1}
                />
              </div>

              <div className="agent-composer-toolbar">
                <div className="agent-composer-tools-left">
                  <button
                    type="button"
                    className="agent-composer-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExecuting || isUploading}
                    title="Opsi & Lampiran"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>

                <div className="agent-composer-tools-right">
                  {isExecuting ? (
                    <button
                      type="button"
                      className="agent-composer-action-btn stop-mode"
                      onClick={handleStopExecution}
                      title="Hentikan eksekusi"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <rect x="5" y="5" width="14" height="14" rx="2"></rect>
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`agent-composer-action-btn send-mode ${(inputValue.trim() || uploadedAttachments.length > 0) ? 'has-text' : 'empty'}`}
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() && uploadedAttachments.length === 0}
                      title="Kirim pesan"
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
          </div>
        </div>
      </main>

      {/* ===== INTERACTIVE SANDBOX DRAWER ===== */}
      {isDrawerOpen && (
        <aside className="agent-sandbox-drawer">
          <div className="agent-drawer-header">
            <div className="agent-drawer-tabs">
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'files' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('files')}
              >
                <i className="fa-solid fa-folder" /> Berkas ({sandboxFiles.length})
              </button>
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'terminal' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('terminal')}
              >
                <i className="fa-solid fa-terminal" /> Terminal
              </button>
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'preview' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('preview')}
              >
                <i className="fa-solid fa-globe" /> Preview
              </button>
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'skill' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('skill')}
              >
                <i className="fa-solid fa-book" /> SKILL.md
              </button>
            </div>

            <button className="agent-drawer-close" onClick={() => setIsDrawerOpen(false)} title="Tutup Panel">
              ✕
            </button>
          </div>

          <div className="agent-drawer-body">
            {/* Tab 1: Files */}
            {activeDrawerTab === 'files' && (
              <div className="agent-files-layout">
                <div className="agent-files-tree">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Workspace ({sandboxFiles.length})
                    </span>
                    {sandboxFiles.length > 0 && (
                      <button
                        onClick={handleDownloadAllZip}
                        style={{
                          background: 'rgba(234, 88, 12, 0.1)',
                          border: 'none',
                          color: '#ea580c',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Unduh seluruh project sebagai ZIP"
                      >
                        <i className="fa-solid fa-file-zipper" /> .ZIP
                      </button>
                    )}
                  </div>
                  {sandboxFiles.map(file => (
                    <div
                      key={file.path}
                      className={`agent-tree-item ${selectedFile === file.path ? 'is-selected' : ''}`}
                      onClick={() => handleSelectFile(file.path)}
                      title={file.path}
                    >
                      <span>
                        <i className={`fa-solid fa-${file.ext === 'html' ? 'code' : file.ext === 'py' ? 'file-lines' : 'file'}`} style={{ marginRight: 6, opacity: 0.7 }} />
                        {file.name}
                      </span>
                    </div>
                  ))}
                  {sandboxFiles.length === 0 && (
                    <div style={{ fontSize: 11.5, color: '#64748b', padding: 8 }}>Belum ada berkas</div>
                  )}
                </div>

                <div className="agent-file-editor">
                  {selectedFile ? (
                    <>
                      <div className="agent-editor-bar">
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{selectedFile}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={handleSaveCurrentFile}
                            disabled={isFileSaving}
                            style={{
                              background: '#2563eb', color: 'white', border: 'none',
                              padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11
                            }}
                          >
                            {isFileSaving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button
                            onClick={handleDownloadFile}
                            style={{
                              background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none',
                              padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11
                            }}
                          >
                            Unduh
                          </button>
                        </div>
                      </div>
                      <textarea
                        className="agent-editor-textarea"
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        spellCheck={false}
                      />
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 13 }}>
                      Pilih berkas di sebelah kiri untuk melihat atau mengedit
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Terminal */}
            {activeDrawerTab === 'terminal' && (
              <div className="agent-terminal-view">
                <div className="agent-terminal-logs">
                  {terminalLogs}
                </div>
                <form className="agent-terminal-prompt-bar" onSubmit={handleRunTerminalCommand}>
                  <span style={{ color: '#10b981' }}>$</span>
                  <input
                    type="text"
                    placeholder="Ketik perintah shell (misal: node index.js atau ls)..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    disabled={isTermExecuting}
                  />
                  <button
                    type="submit"
                    disabled={isTermExecuting || !terminalInput.trim()}
                    style={{ background: '#10b981', color: '#000', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                  >
                    {isTermExecuting ? '...' : 'Jalankan'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Web Preview */}
            {activeDrawerTab === 'preview' && (
              <div className="agent-preview-view">
                <div className="agent-preview-toolbar">
                  <button
                    onClick={() => setPreviewKey(Date.now())}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                    title="Reload Preview"
                  >
                    <i className="fa-solid fa-rotate-right" />
                  </button>
                  <div className="agent-preview-url">
                    {previewUrl || 'about:blank'}
                  </div>
                  <button
                    onClick={() => setPreviewViewport(prev => prev === 'desktop' ? 'mobile' : 'desktop')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                    title="Toggle Ukuran Layar"
                  >
                    <i className={`fa-solid fa-${previewViewport === 'desktop' ? 'mobile-screen' : 'desktop'}`} />
                  </button>
                  {previewUrl && (
                    <button
                      onClick={() => window.open(previewUrl, '_blank')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                      title="Buka di Tab Baru"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                    </button>
                  )}
                </div>

                <div style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  background: '#0f172a',
                  padding: previewViewport === 'mobile' ? '14px 0' : 0
                }}>
                  <iframe
                    key={previewKey}
                    src={previewUrl || 'about:blank'}
                    className="agent-preview-iframe"
                    title="Sandbox Live Web Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
                    style={{
                      width: previewViewport === 'mobile' ? '375px' : '100%',
                      height: '100%',
                      borderRadius: previewViewport === 'mobile' ? '12px' : '0',
                      boxShadow: previewViewport === 'mobile' ? '0 0 30px rgba(0,0,0,0.5)' : 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tab 4: SKILL.md */}
            {activeDrawerTab === 'skill' && (
              <div className="agent-skill-view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>Protokol Panduan Agent (SKILL.md)</span>
                  <button
                    onClick={handleSaveSkill}
                    disabled={isSkillSaving}
                    style={{
                      background: '#10b981', color: 'black', fontWeight: 700, border: 'none',
                      borderRadius: 4, padding: '5px 12px', fontSize: 11.5, cursor: 'pointer'
                    }}
                  >
                    {isSkillSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
                <textarea
                  value={skillContent}
                  onChange={(e) => setSkillContent(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
