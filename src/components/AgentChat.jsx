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

  // Live Chain of Work & Copy state
  const [activeChainOfWork, setActiveChainOfWork] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // File Attachment & Upload State
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-scroll controller: never fights user when user scrolls up
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userIsReadingAboveRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

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
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Scroll handler on container to detect if user is reading above
  const handleContainerScroll = (e) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 80) {
      userIsReadingAboveRef.current = true;
      setShowScrollBottomBtn(true);
    } else {
      userIsReadingAboveRef.current = false;
      setShowScrollBottomBtn(false);
    }
  };

  // Format elapsed duration
  const formatDuration = (ms) => {
    const sec = Math.max(1, Math.round(ms / 1000));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
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
    userIsReadingAboveRef.current = false;
    setShowScrollBottomBtn(false);

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

    // FLOW: Bubble ask user naik ke paling atas untuk menyisakan ruangan di bawahnya
    setTimeout(() => {
      const el = document.getElementById(userMsgId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 40);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
      const totalDuration = formatDuration(Date.now() - startTimestamp);

      setMessages(prev => prev.map(m => {
        if (m.id === botMsgId) {
          return {
            ...m,
            isStreaming: false,
            duration: totalDuration,
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

      if (messages.length <= 1) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: textToSend.slice(0, 35) } : s));
      }
    };

    const flushSmoothTyping = () => {
      if (abortController.signal.aborted) {
        stopSmoothTimer();
        return;
      }

      let updated = false;

      // 1. Smooth Reasoning Stream
      if (displayedReasoning.length < targetReasoning.length) {
        const diff = targetReasoning.length - displayedReasoning.length;
        let step = diff <= 80 ? 1 : Math.min(diff, Math.max(2, Math.min(3, Math.ceil(diff / 60))));
        if (isStreamDone) step = Math.min(diff, Math.max(step, Math.min(4, Math.ceil(diff / 20))));
        displayedReasoning += targetReasoning.substr(displayedReasoning.length, step);
        updated = true;
      }

      // 2. Smooth Main Content Stream
      if (displayedContent.length < targetContent.length) {
        const remainingTarget = targetContent.slice(displayedContent.length);

        // Instant reveal for action_pill tags to maintain valid markup
        if (remainingTarget.startsWith('<action_pill')) {
          const closePillIdx = remainingTarget.indexOf('</action_pill>');
          if (closePillIdx !== -1) {
            const pillLength = closePillIdx + '</action_pill>'.length;
            displayedContent += remainingTarget.slice(0, pillLength);
            updated = true;
          }
        } else {
          const nextPillIdx = remainingTarget.indexOf('<action_pill');
          const maxAllowed = nextPillIdx !== -1 ? nextPillIdx : remainingTarget.length;
          if (maxAllowed > 0) {
            const diff = maxAllowed;
            let step = diff <= 80 ? 1 : Math.min(diff, Math.max(2, Math.min(3, Math.ceil(diff / 60))));
            if (isStreamDone) step = Math.min(diff, Math.max(step, Math.min(4, Math.ceil(diff / 20))));
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

        // FLOW: If user has NOT scrolled up, smoothly follow bottom!
        // If user scrolled up, DO NOT fight the user!
        if (!userIsReadingAboveRef.current && messagesContainerRef.current) {
          const el = messagesContainerRef.current;
          if (el.scrollHeight > el.clientHeight) {
            el.scrollTop = el.scrollHeight;
          }
        }
      }

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
          if (!userIsReadingAboveRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
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
        },
        onDone: (payload) => {
          isStreamDone = true;
          pendingDonePayload = payload;
          if (payload.content) targetContent = payload.content;
          if (payload.reasoning) targetReasoning = payload.reasoning;
          startSmoothTimer();
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
      case 'docx': return { icon: 'fa-solid fa-file-word', color: '#3b82f6' };
      case 'xls':
      case 'xlsx':
      case 'csv': return { icon: 'fa-solid fa-file-excel', color: '#10b981' };
      case 'ppt':
      case 'pptx': return { icon: 'fa-solid fa-file-powerpoint', color: '#f97316' };
      case 'pdf': return { icon: 'fa-solid fa-file-pdf', color: '#ef4444' };
      case 'zip':
      case 'rar':
      case '7z': return { icon: 'fa-solid fa-file-zipper', color: '#a855f7' };
      case 'html': return { icon: 'fa-brands fa-html5', color: '#ea580c' };
      case 'css': return { icon: 'fa-brands fa-css3-alt', color: '#06b6d4' };
      case 'js':
      case 'jsx': return { icon: 'fa-brands fa-js', color: '#eab308' };
      case 'ts':
      case 'tsx': return { icon: 'fa-solid fa-code', color: '#3b82f6' };
      case 'py': return { icon: 'fa-brands fa-python', color: '#0ea5e9' };
      case 'json': return { icon: 'fa-solid fa-brackets-curly', color: '#f59e0b' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp': return { icon: 'fa-solid fa-file-image', color: '#10b981' };
      default: return { icon: 'fa-solid fa-file-code', color: '#a1a1aa' };
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
    <div className="agent-app dark-theme">
      {/* ===== SIDEBAR ===== */}
      <aside className={`agent-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="agent-sidebar-header">
          <div className="agent-sidebar-brand" onClick={() => onNavigate?.('landing')}>
            <img src="/logo.png" alt="Deepernova AI" className="agent-logo-img" />
            <div className="agent-brand-text">
              <span className="brand-name">Deepernova</span>
              <span className="brand-badge">AI Agent</span>
            </div>
          </div>
          {typeof window !== 'undefined' && window.innerWidth < 768 && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="agent-sidebar-close-btn"
            >
              ✕
            </button>
          )}
        </div>

        <button className="agent-new-chat-btn" onClick={startNewSession}>
          <i className="fa-solid fa-plus" />
          <span>Tugas Baru</span>
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
                <i className="fa-solid fa-bolt" />
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
          <div className="agent-user-badge">
            <div className="agent-user-avatar">
              {(user?.name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="agent-user-info">
              <div className="agent-user-name">{user?.name || 'Developer'}</div>
              <div className="agent-user-sub">AI Agent Pro</div>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('landing')}
            className="agent-logout-btn"
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
                title="Alat & Sandbox"
              >
                <i className="fa-solid fa-ellipsis-vertical" />
                {sandboxFiles.length > 0 && <span className="agent-menu-indicator-dot" />}
              </button>

              {showMenuDropdown && (
                <div className="agent-menu-dropdown">
                  <div className="agent-menu-dropdown-header">
                    <span>Panel Kerja & Sandbox</span>
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
                      <i className="fa-solid fa-folder-tree" />
                    </span>
                    <div className="agent-menu-item-info">
                      <span className="agent-menu-item-name">File Sandbox ({sandboxFiles.length})</span>
                      <span className="agent-menu-item-sub">Lihat berkas hasil kodingan</span>
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
                      <span className="agent-menu-item-name">Terminal Sandbox</span>
                      <span className="agent-menu-item-sub">Jalankan perintah shell terisolasi</span>
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

        {/* Message Feed (Spacious, wide, minimalist flow) */}
        <div 
          className="agent-messages-container" 
          ref={messagesContainerRef}
          onScroll={handleContainerScroll}
        >
          {messages.length === 0 && (
            <div className="agent-welcome">
              <div className="agent-welcome-avatar">
                <img src="/logo.png" alt="Deepernova AI" />
              </div>
              <h2 className="agent-welcome-title">Deepernova AI Agent</h2>
              <p className="agent-welcome-sub">Autonomous Full-Stack AI Engineer, Document Designer & Problem Solver</p>
            </div>
          )}

          {/* Historical Messages */}
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant';

            if (!isBot) {
              return (
                <div key={msg.id} id={msg.id} className="agent-msg-row is-user">
                  <div className="agent-user-bubble">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            }

            // Extract steps and clean text without action pills
            const { cleanContent: parsedContent, steps: parsedSteps } = extractExecutionStepsAndCleanContent(
              msg.content,
              msg.reasoning,
              msg.chainOfWork
            );

            // Filter deliverables
            const allSessionFiles = msg.allFiles || sandboxFiles || [];
            const primaryDeliverables = (msg.sandboxFiles || allSessionFiles).filter(f => 
              f.path && f.path !== 'SKILL.md' && !f.path.startsWith('_runner_temp') && !f.path.endsWith('.pyc')
            );

            const ssUrl = msg.screenshotUrl || ((msg.sandboxFiles || []).some(f => f.name === 'screenshot.png' || f.name === 'preview.png')
              ? `/api/agent/screenshot/${currentSessionId}?t=${Date.now()}`
              : null);

            return (
              <div key={msg.id} id={msg.id} className="agent-msg-row is-bot">
                {/* 1. Claude/Antigravity Tree: Worked for 2m ▾ */}
                <AgentExecutionTree 
                  steps={parsedSteps}
                  isStreaming={!!msg.isStreaming}
                  startTime={msg.startTime}
                  duration={msg.duration}
                  onSelectFile={handleSelectFile}
                  onOpenDrawer={(tab) => {
                    setActiveDrawerTab(tab);
                    setIsDrawerOpen(true);
                  }}
                />

                {/* 2. Main Markdown Narrative Answer */}
                {parsedContent ? (
                  <div className="agent-msg-body-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {parsedContent}
                    </ReactMarkdown>
                    {msg.isStreaming && <span className="agent-typing-cursor">▌</span>}
                  </div>
                ) : (
                  msg.isStreaming && parsedSteps.length === 0 && (
                    <div className="agent-streaming-placeholder">
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Sedang merancang & menyusun langkah...</span>
                    </div>
                  )
                )}

                {/* 3. Screenshot Preview (if captured) */}
                {ssUrl && (
                  <div className="agent-msg-screenshot-preview">
                    <div className="agent-screenshot-header">
                      <span>Live Screen Capture</span>
                      <a href={ssUrl} target="_blank" rel="noopener noreferrer">Ukuran Penuh ↗</a>
                    </div>
                    <img src={ssUrl} alt="Hasil web capture" loading="lazy" onClick={() => window.open(ssUrl, '_blank')} />
                  </div>
                )}

                {/* 4. Compact Deliverables Bar (Clean chips, no bulky buttons) */}
                {primaryDeliverables.length > 0 && (
                  <div className="agent-deliverables-bar">
                    <div className="agent-deliverables-label">
                      <i className="fa-solid fa-file-code" /> Berkas Hasil Kerja:
                    </div>
                    <div className="agent-deliverables-chips">
                      {primaryDeliverables.map(file => {
                        const iconInfo = getFileIcon(file.ext);
                        return (
                          <div key={file.path} className="agent-file-chip">
                            <i className={iconInfo.icon} style={{ color: iconInfo.color }} />
                            <span className="chip-name">{file.name}</span>
                            {file.size && <span className="chip-size">({(file.size / 1024).toFixed(1)} KB)</span>}
                            <button 
                              type="button" 
                              className="chip-btn" 
                              onClick={() => handleDownloadSingleFile(file.path)} 
                              title={`Unduh ${file.name}`}
                            >
                              <i className="fa-solid fa-download" />
                            </button>
                            <button 
                              type="button" 
                              className="chip-btn" 
                              onClick={() => { handleSelectFile(file.path); setActiveDrawerTab('files'); setIsDrawerOpen(true); }}
                              title={`Buka ${file.name} di editor`}
                            >
                              <i className="fa-solid fa-code" />
                            </button>
                            {file.ext === 'html' && (
                              <button 
                                type="button" 
                                className="chip-btn is-preview" 
                                onClick={() => { setPreviewUrl(`/api/agent/preview/${currentSessionId}/${file.path}`); setActiveDrawerTab('preview'); setIsDrawerOpen(true); }}
                                title="Buka live preview web"
                              >
                                <i className="fa-solid fa-globe" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {primaryDeliverables.length > 1 && (
                        <button type="button" className="agent-zip-download-chip" onClick={handleDownloadAllZip} title="Unduh semua berkas dalam format ZIP">
                          <i className="fa-solid fa-file-zipper" /> Unduh ZIP
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Minimal Copy Footer */}
                {parsedContent && (
                  <div className="agent-msg-footer">
                    <button 
                      type="button" 
                      className="agent-clean-copy-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText(parsedContent);
                        setCopiedMsgId(msg.id);
                        setTimeout(() => setCopiedMsgId(null), 2000);
                      }}
                      title="Salin jawaban"
                    >
                      <i className={copiedMsgId === msg.id ? "fa-solid fa-check" : "fa-regular fa-copy"} />
                      <span>{copiedMsgId === msg.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottomBtn && (
          <button 
            type="button" 
            className="agent-floating-scroll-bottom"
            onClick={() => {
              userIsReadingAboveRef.current = false;
              setShowScrollBottomBtn(false);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Lompat ke paling bawah"
          >
            <i className="fa-solid fa-arrow-down" />
            <span>Lompat ke bawah</span>
          </button>
        )}

        {/* Input Bar — Autonomous Agent Composer */}
        <div className="agent-input-wrapper">
          <div className="agent-composer-box">
            {/* User Attachments Preview Chips */}
            {uploadedAttachments.length > 0 && (
              <div className="agent-upload-chips">
                {uploadedAttachments.map((name) => (
                  <span key={name} className="agent-upload-chip">
                    <i className="fa-solid fa-paperclip" />
                    <span>{name}</span>
                    <button type="button" onClick={() => removeAttachment(name)}>✕</button>
                  </span>
                ))}
              </div>
            )}

            {isUploading && (
              <div className="agent-uploading-indicator">
                <i className="fa-solid fa-circle-notch fa-spin" />
                <span>Mengunggah berkas ke sandbox...</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUserFileUpload}
              multiple
              style={{ display: 'none' }}
            />

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

            <div className="agent-composer-actions">
              <div className="agent-composer-left-actions">
                <button
                  type="button"
                  className="agent-composer-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Lampirkan berkas ke sandbox"
                  disabled={isExecuting || isUploading}
                >
                  <i className="fa-solid fa-paperclip" />
                </button>
                <button
                  type="button"
                  className="agent-composer-btn"
                  onClick={() => {
                    setActiveDrawerTab('files');
                    setIsDrawerOpen(true);
                  }}
                  title="Buka panel file sandbox"
                >
                  <i className="fa-solid fa-folder-tree" />
                </button>
              </div>

              {isExecuting ? (
                <button
                  type="button"
                  className="agent-stop-btn"
                  onClick={handleStopExecution}
                  title="Hentikan eksekusi"
                >
                  <i className="fa-solid fa-stop" />
                  <span>Hentikan</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="agent-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim()}
                  title="Kirim instruksi"
                >
                  <i className="fa-solid fa-arrow-up" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ===== SANDBOX DRAWER PANEL ===== */}
      {isDrawerOpen && (
        <aside className="agent-drawer">
          <div className="agent-drawer-header">
            <div className="agent-drawer-tabs">
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'files' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('files')}
              >
                <i className="fa-solid fa-folder-tree" />
                <span>Files</span>
              </button>
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'terminal' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('terminal')}
              >
                <i className="fa-solid fa-terminal" />
                <span>Terminal</span>
              </button>
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'preview' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('preview')}
              >
                <i className="fa-solid fa-globe" />
                <span>Preview</span>
              </button>
              <button
                className={`agent-drawer-tab ${activeDrawerTab === 'skill' ? 'is-active' : ''}`}
                onClick={() => setActiveDrawerTab('skill')}
              >
                <i className="fa-solid fa-book-bookmark" />
                <span>SKILL.md</span>
              </button>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="agent-drawer-close-btn"
            >
              ✕
            </button>
          </div>

          <div className="agent-drawer-body">
            {/* Tab 1: Files & Editor */}
            {activeDrawerTab === 'files' && (
              <div className="agent-files-view">
                <div className="agent-files-sidebar">
                  <div className="agent-files-sidebar-header">
                    <span>Berkas Sandbox ({sandboxFiles.length})</span>
                    <button onClick={handleDownloadAllZip} className="agent-zip-icon-btn" title="Unduh semua (.ZIP)">
                      <i className="fa-solid fa-file-zipper" />
                    </button>
                  </div>
                  <div className="agent-files-tree">
                    {sandboxFiles.map(file => {
                      const iconInfo = getFileIcon(file.ext);
                      return (
                        <div
                          key={file.path}
                          className={`agent-file-tree-item ${selectedFile === file.path ? 'is-selected' : ''}`}
                          onClick={() => handleSelectFile(file.path)}
                        >
                          <i className={iconInfo.icon} style={{ color: iconInfo.color }} />
                          <span className="file-item-name">{file.name}</span>
                          <span className="file-item-size">{file.size ? `${(file.size / 1024).toFixed(1)}k` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="agent-files-editor">
                  {selectedFile ? (
                    <>
                      <div className="agent-editor-header">
                        <span className="agent-editor-path">{selectedFile}</span>
                        <div className="agent-editor-actions">
                          <button onClick={handleSaveCurrentFile} className="agent-editor-btn is-save">
                            {isFileSaving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button onClick={handleDownloadFile} className="agent-editor-btn is-download">
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
                    <div className="agent-editor-empty">
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
                  <span className="terminal-prompt-symbol">$</span>
                  <input
                    type="text"
                    placeholder="Ketik perintah shell (misal: node index.js atau ls)..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    disabled={isTermExecuting}
                  />
                  <button type="submit" disabled={isTermExecuting || !terminalInput.trim()}>
                    {isTermExecuting ? '...' : 'Jalankan'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Web Preview */}
            {activeDrawerTab === 'preview' && (
              <div className="agent-preview-view">
                <div className="agent-preview-toolbar">
                  <button onClick={() => setPreviewKey(Date.now())} title="Reload Preview">
                    <i className="fa-solid fa-rotate-right" />
                  </button>
                  <div className="agent-preview-url">
                    {previewUrl || 'about:blank'}
                  </div>
                  <button onClick={() => setPreviewViewport(prev => prev === 'desktop' ? 'mobile' : 'desktop')} title="Toggle Ukuran Layar">
                    <i className={`fa-solid fa-${previewViewport === 'desktop' ? 'mobile-screen' : 'desktop'}`} />
                  </button>
                  {previewUrl && (
                    <button onClick={() => window.open(previewUrl, '_blank')} title="Buka di Tab Baru">
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                    </button>
                  )}
                </div>

                <div className="agent-preview-frame-container" style={{ padding: previewViewport === 'mobile' ? '14px 0' : 0 }}>
                  <iframe
                    key={previewKey}
                    src={previewUrl || 'about:blank'}
                    className="agent-preview-iframe"
                    title="Sandbox Live Web Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
                    style={{
                      width: previewViewport === 'mobile' ? '375px' : '100%',
                      height: '100%',
                      borderRadius: previewViewport === 'mobile' ? '12px' : '0'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tab 4: SKILL.md */}
            {activeDrawerTab === 'skill' && (
              <div className="agent-skill-view">
                <div className="agent-skill-header">
                  <span>Protokol Panduan Agent (SKILL.md)</span>
                  <button onClick={handleSaveSkill} disabled={isSkillSaving}>
                    {isSkillSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
                <textarea
                  className="agent-skill-textarea"
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
