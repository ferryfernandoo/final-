import React, { useState, useEffect, useRef } from 'react';
import { registerBackHandler } from '../services/mobileNavigationService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AgentService from '../services/agentService';
import { downloadFromUrl } from '../services/universalDownloadService';
import AgentExecutionTree, { extractExecutionStepsAndCleanContent } from './AgentExecutionTree';
import { detectLanguageSync, saveLanguage, LANGUAGE_OPTIONS } from '../utils/languageDetector';
import './AgentChat.css';

const AGENT_I18N = {
  id: {
    brandSubtitle: 'AI Agent',
    newSession: 'Tugas Agent Baru',
    searchSessions: 'Cari sesi tugas...',
    autonomousTask: 'Tugas Otonom AI',
    deleteSession: 'Hapus sesi',
    deleteConfirm: 'Hapus sesi agent dan seluruh berkas sandbox ini?',
    backHome: 'Kembali ke Beranda',
    menuSessions: 'Menu Sesi',
    switchChat: 'Chat Biasa',
    switchChatTitle: 'Beralih ke Chat Biasa',
    workspace: 'Workspace',
    openFiles: 'Buka panel berkas & workspace sandbox',
    moreOptions: 'Opsi & Alat Agent',
    effortTitle: 'Tingkat Usaha AI Agent',
    effortLow: 'Usaha Rendah',
    effortLowDesc: '1-3 iterasi · Eksekusi cepat & hemat token',
    effortMed: 'Usaha Sedang',
    effortMedDesc: 'Hingga 6 iterasi · Standar seimbang & teliti',
    effortHigh: 'Pantang Menyerah',
    effortHighDesc: 'Hingga 10+ iterasi · Pantang menyerah, analisa eror & perbaiki sampai berhasil',
    activeCheck: '✓ Aktif',
    toolsHeader: 'Menu Alat & Workspace',
    workspaceFiles: 'Berkas Workspace',
    workspaceFilesSub: 'Lihat file hasil generasi sandbox',
    terminalTitle: 'Terminal Console',
    terminalSub: 'Log terminal & eksekusi shell',
    previewTitle: 'Live Web Preview',
    previewSub: 'Pratinjau antarmuka web / HTML',
    skillTitle: 'Panduan SKILL.md',
    skillSub: 'Aturan & arsitektur dokumen',
    switchChatSub: 'Mode percakapan standar non-agent',
    welcomeHeading: 'Ada yang bisa saya bantu hari ini?',
    welcomeSub: 'Rekan berpikir dan asisten otonom untuk koding, analisis data, dokumen, dan riset.',
    starterDocxTitle: 'Dokumen Bisnis (.docx)',
    starterDocxSub: 'Proposal eksekutif & laporan formal',
    starterDocxPrompt: 'Buatkan dokumen proposal bisnis eksekutif profesional berformat .docx lengkap dengan tabel metrik KPI dan callout box.',
    starterPptxTitle: 'Presentasi Slide (.pptx)',
    starterPptxSub: 'Rancang deck 16:9 modern & visual KPI',
    starterPptxPrompt: 'Buatkan presentasi PowerPoint .pptx modern 16:9 bertema emerald dengan bento box cards dan visual KPI.',
    starterWebTitle: 'Aplikasi Web Interaktif',
    starterWebSub: 'Bangun web HTML/CSS/JS di sandbox',
    starterWebPrompt: 'Buatkan aplikasi web dashboard analitik interaktif modern lengkap dengan index.html, CSS, dan JS interaktif di sandbox.',
    starterChatTitle: 'Diskusi & Brainstorming',
    starterChatSub: 'Tukar ide, strategi, atau tanya santai',
    starterChatPrompt: 'Halo! Bisa bantu saya brainstorming ide dan berdiskusi santai tentang tren teknologi terkini?',
    composerPlaceholder: 'Tanya apa saja atau delegasikan tugas...',
    uploadTooltip: 'Unggah Lampiran ke Sandbox',
    effortPillHigh: 'Mode Mendalam',
    effortPillLow: 'Mode Cepat',
    effortPillMed: 'Mode Seimbang',
    effortPillTitle: 'Klik untuk mengganti mode kerja Agent (Cepat / Sedang / Mendalam)',
    sendMsg: 'Kirim pesan',
    stopExec: 'Hentikan eksekusi',
    uploadingIndicator: 'Mengunggah berkas ke sandbox...',
    savedInSandbox: 'Tersimpan di sandbox',
    filesBadge: (n) => `${n} berkas`,
    closePanel: 'Tutup Panel (Esc)',
    tabFiles: 'Berkas',
    tabTerminal: 'Terminal',
    tabPreview: 'Live Preview',
    tabSkill: 'SKILL.md',
    fileListTitle: 'Daftar Berkas',
    downloadZip: '.ZIP Semua',
    downloadZipTitle: 'Unduh seluruh project sebagai ZIP',
    emptySandboxFiles: 'Belum ada berkas di sandbox ini',
    backToFileList: 'Berkas',
    backToFileListTitle: 'Kembali ke daftar berkas',
    savingFile: 'Menyimpan...',
    saveFile: 'Simpan',
    downloadFile: 'Unduh',
    downloadFileTitle: 'Unduh berkas ini',
    previewFileTitle: 'Lihat di Web Preview',
    emptyFileContent: 'Isi berkas kosong...',
    selectFileToView: 'Pilih berkas untuk melihat atau mengedit',
    selectFileHint: 'Klik salah satu berkas dari daftar di atas',
    termReady: '$ Sandbox terminal siap.',
    termPlaceholder: 'Ketik perintah shell (misal: ls, node app.js)...',
    termRun: 'Jalankan',
    refreshPreview: 'Muat Ulang Preview',
    toggleViewport: 'Ubah Mode Layar (Desktop/Mobile)',
    openNewTab: 'Buka di Tab Baru',
    skillProtocolTitle: 'Protokol Panduan Agent (SKILL.md)',
    skillPlaceholder: 'Tulis aturan protokol agen di sini...',
    skillSavedAlert: 'Aturan SKILL.md berhasil diperbarui untuk sesi ini!'
  },
  en: {
    brandSubtitle: 'AI Agent',
    newSession: 'New Agent Task',
    searchSessions: 'Search sessions...',
    autonomousTask: 'Autonomous AI Task',
    deleteSession: 'Delete session',
    deleteConfirm: 'Delete this agent session and all sandbox files?',
    backHome: 'Back to Home',
    menuSessions: 'Session Menu',
    switchChat: 'Regular Chat',
    switchChatTitle: 'Switch to Regular Chat',
    workspace: 'Workspace',
    openFiles: 'Open sandbox files & workspace panel',
    moreOptions: 'Agent Tools & Options',
    effortTitle: 'AI Agent Effort Level',
    effortLow: 'Low Effort',
    effortLowDesc: '1-3 iterations · Fast execution & token efficient',
    effortMed: 'Medium Effort',
    effortMedDesc: 'Up to 6 iterations · Balanced & thorough standard',
    effortHigh: 'High Persistence',
    effortHighDesc: 'Up to 10+ iterations · Relentless self-correction & debugging until success',
    activeCheck: '✓ Active',
    toolsHeader: 'Tools & Workspace Menu',
    workspaceFiles: 'Workspace Files',
    workspaceFilesSub: 'View sandbox generated files',
    terminalTitle: 'Terminal Console',
    terminalSub: 'Terminal logs & shell execution',
    previewTitle: 'Live Web Preview',
    previewSub: 'Interactive web / HTML preview',
    skillTitle: 'SKILL.md Guide',
    skillSub: 'Document architecture & rules',
    switchChatSub: 'Standard conversation non-agent mode',
    welcomeHeading: 'What can I help you build today?',
    welcomeSub: 'Autonomous thinking copilot for coding, data analysis, documents, and deep research.',
    starterDocxTitle: 'Business Document (.docx)',
    starterDocxSub: 'Executive proposals & formal reports',
    starterDocxPrompt: 'Create a professional executive business proposal .docx document complete with KPI metric tables and callout boxes.',
    starterPptxTitle: 'Slide Presentation (.pptx)',
    starterPptxSub: 'Design modern 16:9 deck with KPI visual cards',
    starterPptxPrompt: 'Create a modern emerald-themed 16:9 PowerPoint .pptx presentation with bento box cards and KPI visual cards.',
    starterWebTitle: 'Interactive Web App',
    starterWebSub: 'Build HTML/CSS/JS web in sandbox',
    starterWebPrompt: 'Build a modern responsive analytics web dashboard index.html with interactive CSS and JS in the sandbox.',
    starterChatTitle: 'Brainstorm & Discuss',
    starterChatSub: 'Exchange ideas, strategy, or open discussion',
    starterChatPrompt: 'Hi! Can you help me brainstorm ideas and discuss the latest technology trends?',
    composerPlaceholder: 'Ask anything or delegate an autonomous task...',
    uploadTooltip: 'Upload attachments to sandbox',
    effortPillHigh: 'Deep Mode',
    effortPillLow: 'Fast Mode',
    effortPillMed: 'Balanced Mode',
    effortPillTitle: 'Click to toggle Agent effort level (Fast / Balanced / Deep)',
    sendMsg: 'Send message',
    stopExec: 'Stop execution',
    uploadingIndicator: 'Uploading files to sandbox...',
    savedInSandbox: 'Saved in sandbox',
    filesBadge: (n) => `${n} files`,
    closePanel: 'Close Panel (Esc)',
    tabFiles: 'Files',
    tabTerminal: 'Terminal',
    tabPreview: 'Live Preview',
    tabSkill: 'SKILL.md',
    fileListTitle: 'File List',
    downloadZip: 'All .ZIP',
    downloadZipTitle: 'Download entire project as ZIP',
    emptySandboxFiles: 'No files in this sandbox yet',
    backToFileList: 'Files',
    backToFileListTitle: 'Back to file list',
    savingFile: 'Saving...',
    saveFile: 'Save',
    downloadFile: 'Download',
    downloadFileTitle: 'Download this file',
    previewFileTitle: 'View in Web Preview',
    emptyFileContent: 'File content is empty...',
    selectFileToView: 'Select a file to view or edit',
    selectFileHint: 'Click a file from the list above',
    termReady: '$ Sandbox terminal ready.',
    termPlaceholder: 'Type shell command (e.g., ls, node app.js)...',
    termRun: 'Run',
    refreshPreview: 'Reload Preview',
    toggleViewport: 'Toggle Viewport (Desktop/Mobile)',
    openNewTab: 'Open in New Tab',
    skillProtocolTitle: 'Agent Guidance Protocol (SKILL.md)',
    skillPlaceholder: 'Write agent protocol rules here...',
    skillSavedAlert: 'SKILL.md rules updated successfully for this session!'
  },
  zh: {
    brandSubtitle: 'AI Agent',
    newSession: '新建任务',
    searchSessions: '搜索任务会话...',
    autonomousTask: '自主 AI 任务',
    deleteSession: '删除会话',
    deleteConfirm: '确定删除该 Agent 任务会话及其沙盒文件吗？',
    backHome: '返回主页',
    menuSessions: '会话菜单',
    switchChat: '常规对话',
    switchChatTitle: '切换到常规对话',
    workspace: '工作区',
    openFiles: '打开工作区文件与沙盒面板',
    moreOptions: 'Agent 工具与设置',
    effortTitle: 'AI Agent 思考与努力等级',
    effortLow: '快速精简',
    effortLowDesc: '1-3 次迭代 · 快速执行且节省 Token',
    effortMed: '标准平衡',
    effortMedDesc: '最多 6 次迭代 · 均衡严谨的标准模式',
    effortHigh: '坚韧深入',
    effortHighDesc: '最多 10+ 次循环迭代 · 坚韧不拔，自主分析报错并修复直至成功',
    activeCheck: '✓ 当前生效',
    toolsHeader: '工具与工作区菜单',
    workspaceFiles: '工作区文件',
    workspaceFilesSub: '查看沙盒生成的成果文件',
    terminalTitle: '终端控制台',
    terminalSub: '终端运行日志与 Shell 执行',
    previewTitle: '实时网页预览',
    previewSub: 'Web / HTML 交互式界面预览',
    skillTitle: 'SKILL.md 规则',
    skillSub: '文档规范与智能体指导协议',
    switchChatSub: '标准非 Agent 对话模式',
    welcomeHeading: '今天有什么我可以帮您构建的？',
    welcomeSub: '专注于全自主代码编写、数据分析、专业文档起草与深度调研的智能体。',
    starterDocxTitle: '商务执行方案书 (.docx)',
    starterDocxSub: '高管商务提案与正规分析报告',
    starterDocxPrompt: '请制作一份高管商务提案专业 .docx 文档，包含 KPI 核心指标分析表及重点提示框。',
    starterPptxTitle: '演示文稿幻灯片 (.pptx)',
    starterPptxSub: '设计现代 16:9 幻灯片与 KPI 视觉卡片',
    starterPptxPrompt: '请制作一份现代翡翠绿风格的 16:9 PowerPoint .pptx 演示文稿，包含便当盒卡片和 KPI 数据看板。',
    starterWebTitle: '交互式 Web 应用',
    starterWebSub: '在沙盒中构建 HTML/CSS/JS 网页应用',
    starterWebPrompt: '请在沙盒中构建一个现代响应式交互 Web 仪表盘 index.html，包含交互式 CSS 和 JS 图表组件。',
    starterChatTitle: '头脑风暴与深度讨论',
    starterChatSub: '交流创意、探讨战略或自由提问',
    starterChatPrompt: '你好！能否帮我进行头脑风暴并深入探讨当前最新的科技趋势？',
    composerPlaceholder: '向 Deepernova AI Agent 提问或指派自主任务...',
    uploadTooltip: '上传附件到沙盒',
    effortPillHigh: '深入模式',
    effortPillLow: '极速模式',
    effortPillMed: '平衡模式',
    effortPillTitle: '点击切换 Agent 模式（极速 / 平衡 / 深入）',
    sendMsg: '发送指令',
    stopExec: '停止执行',
    uploadingIndicator: '正在上传文件到沙盒...',
    savedInSandbox: '已存入沙盒',
    filesBadge: (n) => `${n} 个文件`,
    closePanel: '关闭面板 (Esc)',
    tabFiles: '文件',
    tabTerminal: '终端',
    tabPreview: '实时预览',
    tabSkill: 'SKILL.md',
    fileListTitle: '文件列表',
    downloadZip: '全部 .ZIP',
    downloadZipTitle: '将整个项目下载为 ZIP 压缩包',
    emptySandboxFiles: '当前沙盒中暂无文件',
    backToFileList: '文件',
    backToFileListTitle: '返回文件列表',
    savingFile: '正在保存...',
    saveFile: '保存',
    downloadFile: '下载',
    downloadFileTitle: '下载此文件',
    previewFileTitle: '在 Web 预览中查看',
    emptyFileContent: '文件内容为空...',
    selectFileToView: '选择文件以查看或编辑',
    selectFileHint: '点击上方列表中的任一文件',
    termReady: '$ 沙盒终端已就绪。',
    termPlaceholder: '输入 Shell 指令（如：ls, node app.js）...',
    termRun: '运行',
    refreshPreview: '刷新预览',
    toggleViewport: '切换视口（桌面/移动端）',
    openNewTab: '在新标签页中打开',
    skillProtocolTitle: 'Agent 行为指引协议 (SKILL.md)',
    skillPlaceholder: '在此编写智能体协议规则...',
    skillSavedAlert: 'SKILL.md 规则已成功保存至当前会话！'
  }
};

export default function AgentChat({ user, isAuthenticated, isGuest, onNavigate, onLogout, userLanguage: propLanguage, onLanguageChange }) {
  // Synchronized language state
  const [userLanguage, setUserLanguage] = useState(() => propLanguage || detectLanguageSync());
  const t = AGENT_I18N[userLanguage] || AGENT_I18N.id;

  useEffect(() => {
    if (propLanguage && propLanguage !== userLanguage) {
      setUserLanguage(propLanguage);
    }
  }, [propLanguage]);

  useEffect(() => {
    const handleLangChange = (e) => {
      const nextLang = e?.detail?.language;
      if (nextLang) setUserLanguage(nextLang);
    };
    const handleStorage = (e) => {
      if (e.key === 'deepernova_language' && e.newValue) {
        setUserLanguage(e.newValue);
      }
    };
    window.addEventListener('deepernova_language_changed', handleLangChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('deepernova_language_changed', handleLangChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleSelectLanguage = (langCode) => {
    setUserLanguage(langCode);
    saveLanguage(langCode);
    if (onLanguageChange) onLanguageChange(langCode);
  };
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

  // Zero-Search Skill Architecture: Active Skill State
  const [activeSkill, setActiveSkill] = useState(null);
  const [openingFileInStudio, setOpeningFileInStudio] = useState(null);

  // AI Agent Effort Level ('low' | 'medium' | 'high' - Pantang Menyerah)
  const [agentEffort, setAgentEffort] = useState(() => {
    try {
      return localStorage.getItem('deepernova_agent_effort') || 'high';
    } catch {
      return 'high';
    }
  });

  const handleSetEffort = (lvl) => {
    setAgentEffort(lvl);
    try {
      localStorage.setItem('deepernova_agent_effort', lvl);
    } catch {}
  };

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
    if (!isDrawerOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  // Mobile Back Button / Gesture Integration for Agent Chat
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (selectedFile) {
        setSelectedFile(null);
        return true;
      }
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }
      if (showMenuDropdown) {
        setShowMenuDropdown(false);
        return true;
      }
      return false; // Delegate to view navigation (back to Chat)
    }, 22);

    return unregister;
  }, [selectedFile, isDrawerOpen, showMenuDropdown]);

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
    setActiveSkill(null);
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

    if (msgs.length > 0) {
      setTimeout(() => scrollToBottom(false), 80);
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
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
      setActiveSkill(null);
      const files = await AgentService.getFiles(newSession.id);
      setSandboxFiles(files);
      setPreviewUrl(null);
      const skill = await AgentService.readFile(newSession.id, 'SKILL.md');
      if (skill) setSkillContent(skill);
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    }
  };

  // 4. Delete session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm(t.deleteConfirm)) return;
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
    setActiveSkill(null);

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
      activeSkill: null,
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
          const durSec = m.startTime ? Math.max(1, Math.round((Date.now() - m.startTime) / 1000)) : null;
          const durFormatted = durSec ? (durSec < 60 ? `${durSec}s` : `${Math.floor(durSec / 60)}m ${durSec % 60}s`) : null;
          return {
            ...m,
            id: payload?.messageId || m.id,
            isStreaming: false,
            duration: m.duration || durFormatted,
            content: payload?.content || targetContent || m.content,
            reasoning: payload?.reasoning || targetReasoning || m.reasoning || '',
            activeSkill: payload?.activeSkill || m.activeSkill,
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
        effort: agentEffort,
        language: userLanguage,
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
        onSkillActive: (skillData) => {
          setActiveSkill(skillData);
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, activeSkill: skillData } : m));
          // Pre-load skill into SKILL.md tab so drawer displays it immediately
          AgentService.readFile(currentSessionId, 'SKILL.md').then(content => {
            if (content) setSkillContent(content);
          }).catch(() => {});
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
          if (payload.activeSkill) {
            setActiveSkill(payload.activeSkill);
          }
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
              const durSec = m.startTime ? Math.max(1, Math.round((Date.now() - m.startTime) / 1000)) : null;
              const durFormatted = durSec ? (durSec < 60 ? `${durSec}s` : `${Math.floor(durSec / 60)}m ${durSec % 60}s`) : null;
              return {
                ...m,
                isStreaming: false,
                duration: m.duration || durFormatted,
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
        const durSec = m.startTime ? Math.max(1, Math.round((Date.now() - m.startTime) / 1000)) : null;
        const durFormatted = durSec ? (durSec < 60 ? `${durSec}s` : `${Math.floor(durSec / 60)}m ${durSec % 60}s`) : null;
        return {
          ...m,
          isStreaming: false,
          duration: m.duration || durFormatted,
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

  const handleDownloadSingleFile = (fileOrPath) => {
    if (!currentSessionId || !fileOrPath) return;
    const pathStr = typeof fileOrPath === 'string' ? fileOrPath : (fileOrPath.path || fileOrPath.name);
    const fileName = (typeof fileOrPath === 'string' ? fileOrPath.split('/').pop() : fileOrPath.name) || pathStr.split('/').pop() || 'download';
    const url = AgentService.getDownloadUrl(currentSessionId, pathStr);
    downloadFromUrl(url, fileName);
  };

  const handleDownloadAllZip = () => {
    if (!currentSessionId) return;
    const url = AgentService.getZipDownloadUrl(currentSessionId);
    downloadFromUrl(url, `deepernova-project-${currentSessionId.slice(-6)}.zip`, { mimeType: 'application/zip' });
  };

  // Open any sandbox deliverable file directly in Typernova Studio (DocumentEditor)
  const handleOpenFileInTypernova = async (file) => {
    if (!file || !currentSessionId) return;
    const filePath = typeof file === 'string' ? file : file.path;
    const fileName = (typeof file === 'string' ? file.split('/').pop() : file.name) || filePath;
    const ext = (file.ext || fileName.split('.').pop() || '').toLowerCase();

    setOpeningFileInStudio(filePath);
    try {
      const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
      const isPpt = ['pptx', 'ppt'].includes(ext);
      const isWord = ['docx', 'doc', 'pdf'].includes(ext);

      let editorCategory = 'word';
      let docxType = 'docx';
      if (isExcel) {
        editorCategory = 'excel';
        docxType = 'excel';
      } else if (isPpt) {
        editorCategory = 'ppt';
        docxType = 'pptx';
      } else {
        editorCategory = 'word';
        docxType = isWord ? 'docx' : ext;
      }

      const downloadUrl = AgentService.getDownloadUrl(currentSessionId, filePath);
      const res = await fetch(downloadUrl, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const cloudFilePayload = {
        id: `sandbox_${currentSessionId}_${Date.now()}`,
        name: fileName,
        ext: ext,
        type: docxType,
        dataUrl: dataUrl
      };

      if (typeof window !== 'undefined') {
        window.deepernova_active_cloud_file = cloudFilePayload;
      }

      try {
        sessionStorage.setItem('editor_return_view', 'agent');
        const storageDataUrl = (dataUrl && dataUrl.length < 2000000) ? dataUrl : downloadUrl;
        sessionStorage.setItem('cloud_file_to_parse', JSON.stringify({
          id: cloudFilePayload.id,
          name: fileName,
          ext: ext,
          type: docxType,
          dataUrl: storageDataUrl
        }));
      } catch (_e) {}

      onNavigate?.('documents', editorCategory);
    } catch (err) {
      console.error('[AgentChat] Gagal membuka file di Typernova Studio:', err);
      alert(`Gagal membuka file di Typernova Studio: ${err.message}`);
    } finally {
      setOpeningFileInStudio(null);
    }
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
    alert(t.skillSavedAlert);
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
          <span>{t.newSession}</span>
        </button>

        <div className="agent-search-box">
          <i className="fa-solid fa-magnifying-glass agent-search-icon" />
          <input
            type="text"
            placeholder={t.searchSessions}
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
                <span>{session.title || t.autonomousTask}</span>
              </div>
              <button
                className="agent-session-delete"
                onClick={(e) => handleDeleteSession(e, session.id)}
                title={t.deleteSession}
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
            title={t.backHome}
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
            <button className="agent-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title={t.menuSessions}>
              <i className="fa-solid fa-bars" />
            </button>
            <div className="agent-header-brand-clean">
              <span className="agent-header-brand-title">Deepernova</span>
              <span className="agent-header-brand-badge">{t.brandSubtitle}</span>
            </div>
          </div>

          <div className="agent-header-right" ref={menuDropdownRef}>
            {/* Quick Language Selector */}
            <div className="agent-lang-selector" style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 6 }}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelectLanguage(opt.code)}
                  style={{
                    padding: '3px 7px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: userLanguage === opt.code ? '#ea580c' : 'rgba(0,0,0,0.08)',
                    background: userLanguage === opt.code ? 'rgba(234, 88, 12, 0.1)' : 'transparent',
                    color: userLanguage === opt.code ? '#ea580c' : '#64748b',
                    fontSize: 11,
                    fontWeight: userLanguage === opt.code ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={opt.label}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="agent-header-switch-chat-btn"
              onClick={() => onNavigate?.('chat')}
              title={t.switchChatTitle}
            >
              <i className="fa-regular fa-comments" />
              <span>{t.switchChat}</span>
            </button>

            <button
              type="button"
              className={`agent-header-workspace-btn ${sandboxFiles.length > 0 ? 'has-files' : ''} ${isDrawerOpen ? 'is-open' : ''}`}
              onClick={() => {
                setActiveDrawerTab('files');
                setIsDrawerOpen(prev => !prev);
              }}
              title={t.openFiles}
            >
              <i className="fa-regular fa-folder-open" />
              <span className="agent-header-workspace-label">{t.workspace}</span>
              {sandboxFiles.length > 0 && (
                <span className="agent-header-file-count">{sandboxFiles.length}</span>
              )}
            </button>

            <div className="agent-menu-dropdown-container">
              <button
                type="button"
                className={`agent-more-menu-btn ${showMenuDropdown ? 'is-active' : ''}`}
                onClick={() => setShowMenuDropdown(prev => !prev)}
                title={t.moreOptions}
                aria-label={t.moreOptions}
              >
                <i className="fa-solid fa-ellipsis-vertical" />
                {sandboxFiles.length > 0 && <span className="agent-menu-indicator-dot" />}
              </button>

              {showMenuDropdown && (
                <div className="agent-menu-dropdown">
                  {/* Tingkat Usaha AI Agent Section */}
                  <div className="agent-menu-dropdown-header">
                    <span>{t.effortTitle}</span>
                  </div>
                  <div className="agent-effort-selector-group">
                    <button
                      type="button"
                      className={`agent-effort-btn ${agentEffort === 'low' ? 'is-active' : ''}`}
                      onClick={() => handleSetEffort('low')}
                    >
                      <div className="agent-effort-btn-header">
                        <span className="agent-effort-btn-title">
                          <i className="fa-solid fa-bolt" style={{ color: '#0284c7' }} /> {t.effortLow}
                        </span>
                        {agentEffort === 'low' && <span className="agent-effort-check">{t.activeCheck}</span>}
                      </div>
                      <span className="agent-effort-btn-desc">{t.effortLowDesc}</span>
                    </button>

                    <button
                      type="button"
                      className={`agent-effort-btn ${agentEffort === 'medium' ? 'is-active' : ''}`}
                      onClick={() => handleSetEffort('medium')}
                    >
                      <div className="agent-effort-btn-header">
                        <span className="agent-effort-btn-title">
                          <i className="fa-solid fa-scale-balanced" style={{ color: '#64748b' }} /> {t.effortMed}
                        </span>
                        {agentEffort === 'medium' && <span className="agent-effort-check">{t.activeCheck}</span>}
                      </div>
                      <span className="agent-effort-btn-desc">{t.effortMedDesc}</span>
                    </button>

                    <button
                      type="button"
                      className={`agent-effort-btn ${agentEffort === 'high' ? 'is-active' : ''}`}
                      onClick={() => handleSetEffort('high')}
                    >
                      <div className="agent-effort-btn-header">
                        <span className="agent-effort-btn-title">
                          <i className="fa-solid fa-fire" style={{ color: '#ea580c' }} /> {t.effortHigh}
                        </span>
                        {agentEffort === 'high' && <span className="agent-effort-check">{t.activeCheck}</span>}
                      </div>
                      <span className="agent-effort-btn-desc">{t.effortHighDesc}</span>
                    </button>
                  </div>

                  <div className="agent-menu-divider" />

                  <div className="agent-menu-dropdown-header">
                    <span>{t.toolsHeader}</span>
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
                        <span className="agent-menu-item-name">{t.workspaceFiles}</span>
                        <span className="agent-menu-count-badge">{sandboxFiles.length}</span>
                      </div>
                      <span className="agent-menu-item-sub">{t.workspaceFilesSub}</span>
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
                      <span className="agent-menu-item-name">{t.terminalTitle}</span>
                      <span className="agent-menu-item-sub">{t.terminalSub}</span>
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
                      <span className="agent-menu-item-name">{t.previewTitle}</span>
                      <span className="agent-menu-item-sub">{t.previewSub}</span>
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
                      <span className="agent-menu-item-name">{t.skillTitle}</span>
                      <span className="agent-menu-item-sub">{t.skillSub}</span>
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
                      <span className="agent-menu-item-name">{t.switchChat}</span>
                      <span className="agent-menu-item-sub">{t.switchChatSub}</span>
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
            <div className="agent-welcome-hero">
              <div className="agent-welcome-avatar">
                <img src="/logo.png" alt="Deepernova AI" />
              </div>
              <h2 className="agent-welcome-title">{t.welcomeHeading}</h2>
              <p className="agent-welcome-subtitle">
                {t.welcomeSub}
              </p>

              {/* Minimal Clean Starter Cards */}
              <div className="agent-starter-grid">
                <button
                  type="button"
                  className="agent-starter-card"
                  onClick={() => handleSendMessage(t.starterDocxPrompt)}
                >
                  <div className="agent-starter-icon">
                    <i className="fa-solid fa-file-word" />
                  </div>
                  <div className="agent-starter-body">
                    <span className="agent-starter-title">{t.starterDocxTitle}</span>
                    <span className="agent-starter-desc">{t.starterDocxSub}</span>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square agent-starter-arrow" />
                </button>

                <button
                  type="button"
                  className="agent-starter-card"
                  onClick={() => handleSendMessage(t.starterPptxPrompt)}
                >
                  <div className="agent-starter-icon">
                    <i className="fa-solid fa-file-powerpoint" />
                  </div>
                  <div className="agent-starter-body">
                    <span className="agent-starter-title">{t.starterPptxTitle}</span>
                    <span className="agent-starter-desc">{t.starterPptxSub}</span>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square agent-starter-arrow" />
                </button>

                <button
                  type="button"
                  className="agent-starter-card"
                  onClick={() => handleSendMessage(t.starterWebPrompt)}
                >
                  <div className="agent-starter-icon">
                    <i className="fa-solid fa-laptop-code" />
                  </div>
                  <div className="agent-starter-body">
                    <span className="agent-starter-title">{t.starterWebTitle}</span>
                    <span className="agent-starter-desc">{t.starterWebSub}</span>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square agent-starter-arrow" />
                </button>

                <button
                  type="button"
                  className="agent-starter-card"
                  onClick={() => handleSendMessage(t.starterChatPrompt)}
                >
                  <div className="agent-starter-icon">
                    <i className="fa-solid fa-comments" />
                  </div>
                  <div className="agent-starter-body">
                    <span className="agent-starter-title">{t.starterChatTitle}</span>
                    <span className="agent-starter-desc">{t.starterChatSub}</span>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square agent-starter-arrow" />
                </button>
              </div>
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
                  {/* Minimal Collapsible Execution Status Pill (Collapsed by default) */}
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
                      language={userLanguage}
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
                            <span>Sedang memproses...</span>
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
                  {isBot && msg.screenshotUrl && (() => {
                    const ssUrl = msg.screenshotUrl;
                    return (
                      <div className="agent-msg-screenshot-preview">
                        <div className="agent-screenshot-preview-header">
                          <div className="agent-screenshot-header-left">
                            <i className="fa-solid fa-image" style={{ color: '#64748b' }} />
                            <span className="agent-screenshot-title">Pratinjau Visual</span>
                          </div>
                          <div className="agent-screenshot-header-right">
                            <a
                              href={ssUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="agent-screenshot-btn is-zoom"
                              title="Buka gambar resolusi penuh"
                            >
                              <i className="fa-solid fa-up-right-and-down-left-from-center" />
                              <span>Perbesar</span>
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
                                <span>Live Preview</span>
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
                            alt="Pratinjau visual"
                            className="agent-screenshot-img"
                            loading="lazy"
                            onError={(e) => {
                              if (e.currentTarget?.parentElement?.parentElement) {
                                e.currentTarget.parentElement.parentElement.style.display = 'none';
                              }
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Clean Deliverable Cards (Only turn-specific deliverables, no internal helper scripts) */}
                  {isBot && (() => {
                    const rawTurnFiles = (msg.sandboxFiles || []).filter(f =>
                      f.path !== 'SKILL.md' &&
                      !f.path.startsWith('_runner_temp') &&
                      !f.path.endsWith('.pyc') &&
                      !f.path.includes('__pycache__')
                    );

                    if (rawTurnFiles.length === 0) return null;

                    const docExtensions = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'pdf', 'html', 'csv', 'zip', 'png', 'jpg', 'jpeg', 'svg', 'webp'];
                    const hasPrimaryArtifact = rawTurnFiles.some(f => docExtensions.includes((f.ext || '').toLowerCase()));
                    const helperScriptRegex = /^(?:generate|build|create|make|render|run|test)_.*\.(?:py|js|sh)$/i;

                    const filesToShow = hasPrimaryArtifact
                      ? rawTurnFiles.filter(f => !helperScriptRegex.test(f.name || f.path || ''))
                      : rawTurnFiles;

                    if (filesToShow.length === 0) return null;

                    return (
                      <div className="agent-msg-files-section">
                        <div className="agent-msg-files-grid">
                          {filesToShow.map((file) => {
                            const ext = (file.ext || (file.name || '').split('.').pop() || '').toLowerCase();
                            const iconMeta = getFileIcon(ext);
                            const isStudioDoc = ['docx', 'doc', 'xlsx', 'xls', 'csv', 'pptx', 'ppt', 'pdf'].includes(ext);
                            const isHtml = ext === 'html';
                            const isOpeningThis = openingFileInStudio === file.path;

                            const handlePrimaryFileClick = () => {
                              if (isStudioDoc) {
                                handleOpenFileInTypernova(file);
                              } else if (isHtml) {
                                setPreviewUrl(`/api/agent/preview/${currentSessionId}/${file.path}`);
                                setActiveDrawerTab('preview');
                                setIsDrawerOpen(true);
                              } else {
                                handleSelectFile(file.path);
                                setActiveDrawerTab('files');
                                setIsDrawerOpen(true);
                              }
                            };

                            return (
                              <div
                                key={file.path}
                                className={`agent-msg-file-card ${isOpeningThis ? 'is-opening' : ''}`}
                                onClick={handlePrimaryFileClick}
                                title={`Klik untuk membuka ${file.name}`}
                              >
                                <div className="agent-msg-file-info">
                                  <div className="agent-file-icon-box">
                                    <i className={iconMeta.icon} style={{ color: iconMeta.color }} />
                                  </div>
                                  <div className="agent-msg-file-meta">
                                    <span className="agent-msg-file-name" title={file.path}>
                                      {file.name}
                                    </span>
                                    <span className="agent-msg-file-size">
                                      {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ext.toUpperCase() || 'Berkas'}
                                    </span>
                                  </div>
                                </div>
                                <div className="agent-msg-file-actions">
                                  <button
                                    type="button"
                                    className="agent-file-card-btn is-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrimaryFileClick();
                                    }}
                                    title={isStudioDoc ? `Buka ${file.name} di Typernova Studio` : (isHtml ? 'Buka Live Preview' : 'Lihat isi berkas')}
                                  >
                                    {isOpeningThis ? (
                                      <>
                                        <i className="fa-solid fa-circle-notch fa-spin" />
                                        <span>Membuka...</span>
                                      </>
                                    ) : isStudioDoc ? (
                                      <>
                                        <i className="fa-solid fa-pen-to-square" />
                                        <span>Buka di Studio</span>
                                      </>
                                    ) : isHtml ? (
                                      <>
                                        <i className="fa-solid fa-eye" />
                                        <span>Preview</span>
                                      </>
                                    ) : (
                                      <>
                                        <i className="fa-solid fa-code" />
                                        <span>Lihat Kode</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="agent-file-card-btn is-download"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadSingleFile(file);
                                    }}
                                    title={`Unduh ${file.name}`}
                                  >
                                    <i className="fa-solid fa-download" />
                                    <span>Unduh</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                          <span>Live Preview</span>
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
                    <button type="button" onClick={() => removeAttachment(name)} title="✕">✕</button>
                  </span>
                ))}
                <span className="agent-upload-status">{t.savedInSandbox}</span>
              </div>
            )}

            {isUploading && (
              <div className="agent-uploading-indicator">
                <i className="fa-solid fa-circle-notch fa-spin" />
                <span>{t.uploadingIndicator}</span>
              </div>
            )}

            {/* Composer Box */}
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
                  placeholder={t.composerPlaceholder}
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
                    title={t.uploadTooltip}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`agent-composer-effort-pill is-${agentEffort}`}
                    onClick={() => {
                      const nextEffort = agentEffort === 'high' ? 'low' : (agentEffort === 'low' ? 'medium' : 'high');
                      handleSetEffort(nextEffort);
                    }}
                    title={t.effortPillTitle}
                  >
                    <i className={agentEffort === 'high' ? "fa-solid fa-bolt-lightning" : (agentEffort === 'low' ? "fa-solid fa-feather" : "fa-solid fa-sliders")} />
                    <span>
                      {agentEffort === 'high' ? t.effortPillHigh : (agentEffort === 'low' ? t.effortPillLow : t.effortPillMed)}
                    </span>
                  </button>
                </div>

                <div className="agent-composer-tools-right">
                  {isExecuting ? (
                    <button
                      type="button"
                      className="agent-composer-action-btn stop-mode"
                      onClick={handleStopExecution}
                      title={t.stopExec}
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
                      title={t.sendMsg}
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

      {/* ===== INTERACTIVE SANDBOX DRAWER & BACKDROP ===== */}
      {isDrawerOpen && (
        <>
          <div 
            className="agent-drawer-backdrop" 
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Tutup panel berkas"
          />
          <aside className="agent-sandbox-drawer" role="dialog" aria-modal="true">
            {/* Top Bar with Title, File Count, and Dedicated Close Button */}
            <div className="agent-drawer-header">
              <div className="agent-drawer-header-top">
                <div className="agent-drawer-title-group">
                  {activeDrawerTab === 'files' && selectedFile && (
                    <button
                      type="button"
                      className="agent-drawer-back-btn"
                      onClick={() => setSelectedFile(null)}
                      title={t.backToFileListTitle}
                    >
                      <i className="fa-solid fa-arrow-left" />
                      <span>{t.backToFileList}</span>
                    </button>
                  )}
                  <div className="agent-drawer-heading">
                    <span className="agent-drawer-title">
                      <i className="fa-solid fa-folder-tree" style={{ color: '#ea580c', marginRight: 8 }} />
                      Sandbox Workspace
                    </span>
                    <span className="agent-drawer-badge">{t.filesBadge(sandboxFiles.length)}</span>
                  </div>
                </div>

                <button 
                  type="button"
                  className="agent-drawer-close" 
                  onClick={() => setIsDrawerOpen(false)} 
                  title={t.closePanel}
                  aria-label={t.closePanel}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {/* Responsive Scrollable Tabs */}
              <div className="agent-drawer-tabs-wrapper">
                <div className="agent-drawer-tabs">
                  <button
                    type="button"
                    className={`agent-drawer-tab ${activeDrawerTab === 'files' ? 'is-active' : ''}`}
                    onClick={() => setActiveDrawerTab('files')}
                  >
                    <i className="fa-solid fa-folder" /> {t.tabFiles} ({sandboxFiles.length})
                  </button>
                  <button
                    type="button"
                    className={`agent-drawer-tab ${activeDrawerTab === 'terminal' ? 'is-active' : ''}`}
                    onClick={() => setActiveDrawerTab('terminal')}
                  >
                    <i className="fa-solid fa-terminal" /> {t.tabTerminal}
                  </button>
                  <button
                    type="button"
                    className={`agent-drawer-tab ${activeDrawerTab === 'preview' ? 'is-active' : ''}`}
                    onClick={() => setActiveDrawerTab('preview')}
                  >
                    <i className="fa-solid fa-globe" /> {t.tabPreview}
                  </button>
                  <button
                    type="button"
                    className={`agent-drawer-tab ${activeDrawerTab === 'skill' ? 'is-active' : ''}`}
                    onClick={() => setActiveDrawerTab('skill')}
                  >
                    <i className="fa-solid fa-book" /> {t.tabSkill}
                  </button>
                </div>
              </div>
            </div>

            <div className="agent-drawer-body">
              {/* Tab 1: Files */}
              {activeDrawerTab === 'files' && (
                <div className={`agent-files-layout ${selectedFile ? 'has-selected-file' : 'no-selected-file'}`}>
                  {/* File Tree / List */}
                  <div className="agent-files-tree">
                    <div className="agent-files-tree-header">
                      <span className="agent-files-tree-title">
                        {t.fileListTitle} ({sandboxFiles.length})
                      </span>
                      {sandboxFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDownloadAllZip}
                          className="agent-zip-download-btn"
                          title={t.downloadZipTitle}
                        >
                          <i className="fa-solid fa-file-zipper" /> {t.downloadZip}
                        </button>
                      )}
                    </div>
                    <div className="agent-files-tree-list">
                      {sandboxFiles.map(file => {
                        const iconData = getFileIcon(file.ext);
                        return (
                          <div
                            key={file.path}
                            className={`agent-tree-item ${selectedFile === file.path ? 'is-selected' : ''}`}
                            onClick={() => handleSelectFile(file.path)}
                            title={file.path}
                          >
                            <span className="agent-tree-item-name">
                              <i className={iconData.icon} style={{ color: iconData.color, marginRight: 8, fontSize: 14 }} />
                              {file.name}
                            </span>
                            <i className="fa-solid fa-chevron-right agent-tree-item-arrow" />
                          </div>
                        );
                      })}
                      {sandboxFiles.length === 0 && (
                        <div className="agent-files-empty">
                          <i className="fa-solid fa-folder-open" style={{ fontSize: 26, opacity: 0.35, marginBottom: 8 }} />
                          <div>{t.emptySandboxFiles}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File Editor View */}
                  <div className="agent-file-editor">
                    {selectedFile ? (
                      <>
                        <div className="agent-editor-bar">
                          <div className="agent-editor-bar-left">
                            <button
                              type="button"
                              className="agent-editor-mobile-back"
                              onClick={() => setSelectedFile(null)}
                              title={t.backToFileListTitle}
                            >
                              <i className="fa-solid fa-arrow-left" />
                              <span>{t.backToFileList}</span>
                            </button>
                            <span className="agent-editor-filename" title={selectedFile}>
                              <i className={(getFileIcon(selectedFile.split('.').pop()) || {}).icon || 'fa-solid fa-file-code'} style={{ color: (getFileIcon(selectedFile.split('.').pop()) || {}).color || '#ea580c', marginRight: 6 }} />
                              {selectedFile}
                            </span>
                          </div>
                          <div className="agent-editor-actions">
                            <button
                              type="button"
                              onClick={handleSaveCurrentFile}
                              disabled={isFileSaving}
                              className="agent-editor-btn is-save"
                            >
                              <i className={isFileSaving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk"} />
                              <span>{isFileSaving ? t.savingFile : t.saveFile}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadFile}
                              className="agent-editor-btn is-download"
                              title={t.downloadFileTitle}
                            >
                              <i className="fa-solid fa-download" />
                              <span>{t.downloadFile}</span>
                            </button>
                            {selectedFile.endsWith('.html') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewUrl(`/api/agent/preview/${currentSessionId}/${selectedFile}`);
                                  setActiveDrawerTab('preview');
                                }}
                                className="agent-editor-btn is-preview"
                                title={t.previewFileTitle}
                              >
                                <i className="fa-solid fa-eye" />
                                <span>Preview</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="agent-editor-textarea-wrap">
                          <textarea
                            className="agent-editor-textarea"
                            value={fileContent}
                            onChange={(e) => setFileContent(e.target.value)}
                            spellCheck={false}
                            placeholder={t.emptyFileContent}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="agent-editor-placeholder">
                        <i className="fa-solid fa-code" style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }} />
                        <div style={{ fontWeight: 600 }}>{t.selectFileToView}</div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{t.selectFileHint}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Terminal */}
              {activeDrawerTab === 'terminal' && (
                <div className="agent-terminal-view">
                  <div className="agent-terminal-logs">
                    {terminalLogs || t.termReady}
                  </div>
                  <form className="agent-terminal-prompt-bar" onSubmit={handleRunTerminalCommand}>
                    <span className="agent-term-prompt-sym">$</span>
                    <input
                      type="text"
                      className="agent-term-input"
                      placeholder={t.termPlaceholder}
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      disabled={isTermExecuting}
                    />
                    <button
                      type="submit"
                      disabled={isTermExecuting || !terminalInput.trim()}
                      className="agent-term-run-btn"
                    >
                      {isTermExecuting ? <i className="fa-solid fa-spinner fa-spin" /> : t.termRun}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: Web Preview */}
              {activeDrawerTab === 'preview' && (
                <div className="agent-preview-view">
                  <div className="agent-preview-toolbar">
                    <button
                      type="button"
                      onClick={() => setPreviewKey(Date.now())}
                      className="agent-preview-tool-btn"
                      title={t.refreshPreview}
                    >
                      <i className="fa-solid fa-rotate-right" />
                    </button>
                    <div className="agent-preview-url" title={previewUrl || 'about:blank'}>
                      {previewUrl || 'about:blank'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport(prev => prev === 'desktop' ? 'mobile' : 'desktop')}
                      className="agent-preview-tool-btn"
                      title={t.toggleViewport}
                    >
                      <i className={`fa-solid fa-${previewViewport === 'desktop' ? 'mobile-screen' : 'desktop'}`} />
                    </button>
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(previewUrl, '_blank')}
                        className="agent-preview-tool-btn"
                        title={t.openNewTab}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square" />
                      </button>
                    )}
                  </div>

                  <div className="agent-preview-frame-container">
                    <iframe
                      key={previewKey}
                      src={previewUrl || 'about:blank'}
                      className={`agent-preview-iframe ${previewViewport === 'mobile' ? 'is-mobile-frame' : 'is-desktop-frame'}`}
                      title="Sandbox Live Web Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: SKILL.md */}
              {activeDrawerTab === 'skill' && (
                <div className="agent-skill-view">
                  <div className="agent-skill-header">
                    <span className="agent-skill-title">
                      <i className="fa-solid fa-book-bookmark" style={{ color: '#10b981', marginRight: 6 }} />
                      {t.skillProtocolTitle}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveSkill}
                      disabled={isSkillSaving}
                      className="agent-skill-save-btn"
                    >
                      <i className={isSkillSaving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-check"} />
                      <span>{isSkillSaving ? t.savingFile : t.saveFile}</span>
                    </button>
                  </div>
                  <div className="agent-skill-textarea-wrap">
                    <textarea
                      className="agent-skill-textarea"
                      value={skillContent}
                      onChange={(e) => setSkillContent(e.target.value)}
                      spellCheck={false}
                      placeholder={t.skillPlaceholder}
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
