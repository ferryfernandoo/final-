import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AgentService from '../services/agentService';
import './AgentChat.css';

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
  const [collapsedChains, setCollapsedChains] = useState({});

  // File Attachment & Upload State
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
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

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await AgentService.runTask({
        sessionId: currentSessionId,
        prompt: textToSend,
        model: 'deepernova-gold-1.5',
        history: messages,
        signal: abortController.signal,
        onStep: (step) => {
          setActiveChainOfWork(prev => [...prev, step]);
          scrollToBottom(true);
        },
        onStepUpdate: (updatedStep) => {
          setActiveChainOfWork(prev => prev.map(s => s.id === updatedStep.id ? updatedStep : s));
          scrollToBottom(true);
        },
        onDone: (payload) => {
          setIsExecuting(false);
          const botMsg = {
            id: payload.messageId || `bot_${Date.now()}`,
            role: 'assistant',
            content: payload.content,
            chainOfWork: payload.chainOfWork || [],
            sandboxFiles: payload.files || [],
            screenshotUrl: payload.previewUrl,
            createdAt: new Date().toISOString()
          };

          setMessages(prev => [...prev, botMsg]);
          setActiveChainOfWork([]);

          if (payload.files) {
            setSandboxFiles(payload.files);
            const html = payload.files.find(f => f.ext === 'html');
            if (html) {
              setPreviewUrl(`/api/agent/preview/${currentSessionId}/${html.path}`);
              setPreviewKey(Date.now());
            }
          }

          // Update sidebar title if first turn
          if (messages.length === 0) {
            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: textToSend.slice(0, 35) } : s));
          }

          setTimeout(() => scrollToBottom(true), 100);
        },
        onError: (errPayload) => {
          setIsExecuting(false);
          const errorMsg = {
            id: `bot_err_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Kendala eksekusi agent: ${errPayload.error || 'Terjadi kesalahan tidak terduga.'}`,
            createdAt: new Date().toISOString()
          };
          setMessages(prev => [...prev, errorMsg]);
          scrollToBottom(true);
        }
      });
    } catch (err) {
      setIsExecuting(false);
    }
  };

  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsExecuting(false);
    }
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
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#ea580c', letterSpacing: '0.5px' }}>AI Agent Sandbox</span>
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
              <div style={{ fontSize: 11, color: '#64748b' }}>AI Agent Sandbox</div>
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
            <div className="agent-model-pill">
              <i className="fa-solid fa-circle-dot" style={{ color: '#10b981', fontSize: 10 }} />
              <span>Deepernova Agent 2.5 (Sandbox Ready)</span>
            </div>
          </div>

          <div className="agent-header-right">
            <button
              className={`agent-tool-btn ${isDrawerOpen && activeDrawerTab === 'files' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveDrawerTab('files');
                setIsDrawerOpen(true);
              }}
              title="Buka Berkas Workspace"
            >
              <i className="fa-solid fa-folder-open" />
              <span>Berkas</span>
              <span className="agent-count-badge">{sandboxFiles.length}</span>
            </button>

            <button
              className={`agent-tool-btn ${isDrawerOpen && activeDrawerTab === 'terminal' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveDrawerTab('terminal');
                setIsDrawerOpen(true);
              }}
              title="Terminal Console"
            >
              <i className="fa-solid fa-terminal" />
              <span>Terminal</span>
            </button>

            <button
              className={`agent-tool-btn ${isDrawerOpen && activeDrawerTab === 'preview' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveDrawerTab('preview');
                setIsDrawerOpen(true);
              }}
              title="Live Web Preview"
            >
              <i className="fa-solid fa-globe" />
              <span>Preview</span>
            </button>

            <button
              className={`agent-tool-btn ${isDrawerOpen && activeDrawerTab === 'skill' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveDrawerTab('skill');
                setIsDrawerOpen(true);
              }}
              title="Lihat Aturan SKILL.md"
            >
              <i className="fa-solid fa-book-bookmark" />
              <span>SKILL.md</span>
            </button>

            <button
              className="agent-tool-btn"
              onClick={() => onNavigate?.('chat')}
              style={{ background: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.3)', color: '#fdba74' }}
              title="Kembali ke Chat Standar"
            >
              <i className="fa-solid fa-comments" />
              <span>Chat Biasa</span>
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <div className="agent-messages-container">
          {messages.length === 0 && activeChainOfWork.length === 0 && (
            <div className="agent-welcome">
              <img src="/logo.png" alt="Deepernova AI" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', display: 'block', boxShadow: '0 4px 16px rgba(234, 88, 12, 0.2)' }} />
              <h2>Deepernova Autonomous AI Agent</h2>
              <p>
                Agent cerdas berkemampuan koding penuh dengan eksekusi sandbox nyata.
                Dapat menyusun berkas aplikasi, mengeksekusi kode Node.js/Python, menangkap log terminal,
                dan menampilkan live preview web secara transparan.
              </p>

              <div className="agent-starters-grid">
                <div
                  className="agent-starter-card"
                  onClick={() => handleSendMessage('Buat kalkulator modern interaktif lengkap dengan HTML, CSS, dan JavaScript lalu jalankan di sandbox.')}
                >
                  <h4><i className="fa-solid fa-calculator" style={{ color: '#ea580c' }} /> Kalkulator Modern</h4>
                  <p>Aplikasi web interaktif dengan tombol estetik dan live preview.</p>
                </div>

                <div
                  className="agent-starter-card"
                  onClick={() => handleSendMessage('Buat script Python yang melakukan simulasi data statistik dan visualisasi ASCII, lalu eksekusi dan perlihatkan output terminalnya.')}
                >
                  <h4><i className="fa-brands fa-python" style={{ color: '#ea580c' }} /> Eksekusi Script Python</h4>
                  <p>Menjalankan kode Python di sandbox dan menangkap log stdout.</p>
                </div>

                <div
                  className="agent-starter-card"
                  onClick={() => handleSendMessage('Buat game Snake klasik menggunakan Canvas HTML5 dan JavaScript yang playable dan modern.')}
                >
                  <h4><i className="fa-solid fa-gamepad" style={{ color: '#ea580c' }} /> Game Snake HTML5</h4>
                  <p>Membuat game arcade yang langsung bisa dimainkan di tab Live Preview.</p>
                </div>

                <div
                  className="agent-starter-card"
                  onClick={() => {
                    setActiveDrawerTab('skill');
                    setIsDrawerOpen(true);
                  }}
                >
                  <h4><i className="fa-solid fa-scroll" style={{ color: '#ea580c' }} /> Periksa SKILL.md</h4>
                  <p>Pelajari atau sesuaikan protokol panduan teknis yang dipatuhi AI.</p>
                </div>
              </div>
            </div>
          )}

          {/* Historical Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className={`agent-msg-row is-${msg.role === 'user' ? 'user' : 'bot'}`}>
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
                {/* Chain of Work Accordion if attached to this assistant message */}
                {msg.chainOfWork && msg.chainOfWork.length > 0 && (
                  <div className="agent-chain-container">
                    <div
                      className="agent-chain-header"
                      onClick={() => setCollapsedChains(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                    >
                      <h4>
                        <i className="fa-solid fa-list-check" />
                        <span>Chain-of-Work: {msg.chainOfWork.length} Langkah Selesai</span>
                      </h4>
                      <i className={`fa-solid fa-chevron-${collapsedChains[msg.id] ? 'down' : 'up'}`} style={{ color: '#64748b', fontSize: 11 }} />
                    </div>

                    {!collapsedChains[msg.id] && (
                      <div className="agent-chain-steps">
                        {msg.chainOfWork.map((step, idx) => (
                          <div key={idx} className={`agent-step-item is-${step.status}`}>
                            <div className="agent-step-icon">
                              {step.status === 'running' && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#3b82f6' }} />}
                              {step.status === 'completed' && <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />}
                              {step.status === 'failed' && <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444' }} />}
                            </div>
                            <div className="agent-step-content">
                              <div className="agent-step-title">{step.title}</div>
                              {step.detail && <div className="agent-step-detail">{step.detail}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="agent-msg-bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>

                  {/* Interactive Downloadable File Deliverables */}
                  {msg.role === 'assistant' && (() => {
                    const deliverables = (msg.sandboxFiles || []).filter(f => 
                      f.path !== 'SKILL.md' && !f.path.startsWith('_runner_temp')
                    );
                    if (deliverables.length === 0) return null;
                    return (
                      <div className="agent-msg-files-section">
                        <div className="agent-msg-files-header">
                          <div className="agent-msg-files-title">
                            <i className="fa-solid fa-file-circle-check" style={{ color: '#ea580c' }} />
                            <span>Berkas yang Dibuat AI ({deliverables.length})</span>
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
                          {deliverables.map((file) => {
                            const iconMeta = getFileIcon(file.ext);
                            return (
                              <div key={file.path} className="agent-msg-file-card">
                                <div className="agent-msg-file-info">
                                  <div className="agent-file-icon-box">
                                    <i className={iconMeta.icon} style={{ color: iconMeta.color }} />
                                  </div>
                                  <div className="agent-msg-file-meta">
                                    <span className="agent-msg-file-name" title={file.path}>{file.name}</span>
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
                      </div>
                    );
                  })()}

                  {/* Actions Bar */}
                  {msg.role === 'assistant' && (
                    <div className="agent-action-bar">
                      <button
                        className="agent-action-btn"
                        onClick={() => {
                          setActiveDrawerTab('files');
                          setIsDrawerOpen(true);
                        }}
                      >
                        <i className="fa-solid fa-folder-open" /> Buka Sandbox
                      </button>

                      <button
                        className="agent-action-btn"
                        onClick={handleDownloadAllZip}
                        title="Unduh seluruh project sebagai berkas ZIP"
                      >
                        <i className="fa-solid fa-file-zipper" /> Unduh ZIP Proyek
                      </button>

                      {msg.screenshotUrl && (
                        <button
                          className="agent-action-btn"
                          onClick={() => {
                            setActiveDrawerTab('preview');
                            setIsDrawerOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-globe" /> Buka Live Preview
                        </button>
                      )}

                      <button
                        className="agent-action-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.content);
                          alert('Teks berhasil disalin!');
                        }}
                      >
                        <i className="fa-solid fa-copy" /> Salin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Real-time Streaming Active Chain-of-Work during generation */}
          {isExecuting && activeChainOfWork.length > 0 && (
            <div className="agent-msg-row is-bot">
              <div className="agent-msg-avatar">
                <img src="/logo.png" alt="Deepernova AI" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
              </div>
              <div className="agent-msg-content">
                <div className="agent-chain-container" style={{ borderStyle: 'solid', borderColor: '#fed7aa' }}>
                  <div className="agent-chain-header" style={{ background: '#fff7ed' }}>
                    <h4>
                      <i className="fa-solid fa-spinner fa-spin" style={{ color: '#ea580c' }} />
                      <span style={{ color: '#c2410c' }}>AI Agent Sedang Bekerja di Sandbox...</span>
                    </h4>
                  </div>
                  <div className="agent-chain-steps">
                    {activeChainOfWork.map((step, idx) => (
                      <div key={idx} className={`agent-step-item is-${step.status}`}>
                        <div className="agent-step-icon">
                          {step.status === 'running' && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#3b82f6' }} />}
                          {step.status === 'completed' && <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />}
                          {step.status === 'failed' && <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444' }} />}
                        </div>
                        <div className="agent-step-content">
                          <div className="agent-step-title">{step.title}</div>
                          {step.detail && <div className="agent-step-detail">{step.detail}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="agent-input-wrapper">
          <div className="agent-input-container">
            <div className="agent-prompt-chips">
              <button className="agent-prompt-chip" onClick={() => setInputValue('Buat aplikasi web to-do list modern dengan LocalStorage, animasi CSS, dan dark mode')}>
                ⚡ Web To-Do App
              </button>
              <button className="agent-prompt-chip" onClick={() => setInputValue('Buat script Python untuk kalkulasi algoritma Fibonacci dan benchmark waktu eksekusinya')}>
                🐍 Benchmark Python
              </button>
              <button className="agent-prompt-chip" onClick={() => setInputValue('Jalankan terminal command di sandbox untuk mengecek versi node dan file yang ada')}>
                💻 Terminal Inspect
              </button>
              <button className="agent-prompt-chip" onClick={() => setInputValue('Buka dan evaluasi file SKILL.md apakah ada aturan baru yang perlu disesuaikan')}>
                📜 Evaluasi SKILL.md
              </button>
            </div>

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

            <div className="agent-textarea-box">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUserFileUpload}
                multiple
                style={{ display: 'none' }}
              />

              <textarea
                placeholder="Instruksikan AI Agent untuk membuat file, koding, atau mengeksekusi sandbox..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isExecuting}
              />

              <div className="agent-input-actions">
                <div className="agent-input-actions-left">
                  <button
                    type="button"
                    className="agent-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExecuting || isUploading}
                    title="Unggah berkas ke sandbox (Kode, Dokumen, Skrip, Data)"
                  >
                    <i className="fa-solid fa-paperclip" />
                    <span>Lampirkan</span>
                  </button>

                  <span className="agent-input-tip">
                    Tekan <b>Enter</b> untuk mengeksekusi otonom, <b>Shift+Enter</b> untuk baris baru
                  </span>
                </div>

                {isExecuting ? (
                  <button className="agent-send-btn is-running" onClick={handleStopExecution} title="Hentikan Eksekusi">
                    <i className="fa-solid fa-square" />
                  </button>
                ) : (
                  <button className="agent-send-btn" onClick={() => handleSendMessage()} disabled={!inputValue.trim() && uploadedAttachments.length === 0}>
                    <i className="fa-solid fa-arrow-up" />
                  </button>
                )}
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
