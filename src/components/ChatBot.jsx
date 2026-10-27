import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { sendMessageToGrok, processStreamingResponse } from '../services/grokApi';
import localAiService, { extractResponseFromReasoning, generateInstantBoronResponse } from '../services/localAiService';
import { memoryService } from '../services/memoryService';
import { ragService } from '../services/ragService';
import { ConversationPersistenceService } from '../services/conversationPersistenceService';
import DocumentGenerationService from '../services/documentGenerationService';
import ImageGenerationService from '../services/imageGenerationService';
import ClientFileParser from '../services/clientFileParser';
import { deepernovaTtsService } from '../services/deepernovaTtsService';
import { saveImageToGallery, downloadImageDirectly } from '../services/imageStorageService';
import { reminderService } from '../services/reminderService';
import { API_BASE_URL } from '../apiConfig';
import { executeWebSearch, detectUpfrontSearchIntent } from '../services/clientSearchService';
import { initRealtimeSync, createTypewriter } from '../services/realtimeSyncService';
import { detectLanguageSync, detectLanguageAsync, saveLanguage } from '../utils/languageDetector';
import {
  formatBubbleDomainLabel,
  PERSONALITIES,
  DEFAULT_PERSONALITY,
  DEEPERNOVA_MODELS,
  SUGGESTION_PROMPTS_POOL,
  RANDOM_GREETINGS,
  RANDOM_HINTS,
  getTimeBasedGreeting,
  FALLBACK_GREETINGS,
  getFileBadgeInfo,
  getCleanUserDisplayText,
  getMessageAttachedFiles,
  getSmoothTypingStep,
} from './chatbot/chatConstants';
import {
  extractAgenticSteps,
  parseStreamingText,
  sanitizeWelcomeText,
  ensurePerfectTable,
  cleanResponseText,
  sanitizeStreamingText,
  detectChartType,
  parseChartDataFromText,
  _extractChartBlock,
  isExecutionLogLine,
  removeExecutionLogLines,
  removeDownloadStatusLines,
  humanizeClientError,
} from './chatbot/chatTextUtils';
import { formatMessageContent } from './chatbot/ChatMessageFormatter';
import ChatMessageItem from './chatbot/ChatMessageItem';
import ChatSidebar from './chatbot/ChatSidebar';
import ChatEmptyHero from './chatbot/ChatEmptyHero';
import ChatComposerBar from './chatbot/ChatComposerBar';
import { ChatPrimaryModals, ChatSecondaryModals, ChatAgenticRightPanel } from './chatbot/ChatModals';
import './ChatBot.css';

export { DEEPERNOVA_MODELS, SUGGESTION_PROMPTS_POOL };

const ChatBot = ({ onLogout, user, isAuthenticated, isGuest, onNavigate, onUpdateUser }) => {
  // Conversations management
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [inputValue, setInputValue] = useState('');
  const [aiMode, setAiMode] = useState('brainstorm'); // 'brainstorm' | 'agent'
  const [activeFile, setActiveFile] = useState(null); // null or { id, name, type, content }
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [agentLogs, setAgentLogs] = useState([]);
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendGenerating, setIsSendGenerating] = useState(false);
  const isSendGeneratingRef = useRef(false);
  const [error, setError] = useState(null);
  const [, setAnimatingMessages] = useState({});
  const [, setExpandedMessages] = useState({});
  const [lastMessage, setLastMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 769);
  const [userLanguage, setUserLanguage] = useState(() => detectLanguageSync());
  const [, setUserCountry] = useState('ID');
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [isPrivateChat, setIsPrivateChat] = useState(false);
  const [, setIsPaused] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [compactView, setCompactView] = useState(false); // show only last exchange when true and at bottom
  const [loadingStatusMsg, setLoadingStatusMsg] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState(DEFAULT_PERSONALITY);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFormatDbModal, setShowFormatDbModal] = useState(false);
  const [formatDbPassword, setFormatDbPassword] = useState('');
  const [formatDbConfirmText, setFormatDbConfirmText] = useState('');
  const [formatDbLoading, setFormatDbLoading] = useState(false);
  const [formatDbError, setFormatDbError] = useState(null);
  const [showFormatDbPassword, setShowFormatDbPassword] = useState(false);
  const [formatDbCopied, setFormatDbCopied] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingUserName, setPendingUserName] = useState('');
  const [showNameSetupModal, setShowNameSetupModal] = useState(false);
  const [showApiDashboard, setShowApiDashboard] = useState(false); // API Marketplace dashboard
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [quizSelections, setQuizSelections] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]); // Track uploaded files
  const [showHtmlEditor, setShowHtmlEditor] = useState(false); // HTML editor modal
  const [htmlContent, setHtmlContent] = useState(''); // Current HTML being edited
  const [htmlFilename, setHtmlFilename] = useState('index.html'); // Filename for download
  const [showHtmlPreview, setShowHtmlPreview] = useState(false); // HTML preview modal
  const [showCodePanelPulse, setShowCodePanelPulse] = useState(false); // Highlight code panel after generation
  const [showVoiceChat, setShowVoiceChat] = useState(false); // Voice chat modal
  const [showVoiceDevModal, setShowVoiceDevModal] = useState(false); // Voice in development modal
  const [showSavedImagesGallery, setShowSavedImagesGallery] = useState(false); // Saved images gallery modal
  const [isSttListening, setIsSttListening] = useState(false); // Speech-To-Text mic listening state
  const sttRecognitionRef = useRef(null);
  const remoteTypewriterRef = useRef(null);

  // Agentic Right Side Panel & Header States
  const [showAgenticPanel, setShowAgenticPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [agenticActiveTab, setAgenticActiveTab] = useState('langkah'); // 'langkah' | 'sumber'
  const [showConvMenu, setShowConvMenu] = useState(false);

  // Keyboard Shortcuts: Ctrl+Shift+O (New Chat), Ctrl+K (Search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        createNewConversation();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSidebarOpen(true);
        setTimeout(() => {
          const input = document.querySelector('.sidebar-search-input');
          if (input) input.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile virtual keyboard tracker: keeps the entire AI view fixed while lifting ONLY the input bar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;

      // Calculate how much the virtual keyboard overlaps the bottom of the window
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      const isAndroidKb = window.screen && window.screen.height && (window.screen.height - vv.height > 180);

      if (keyboardHeight > 50 || isAndroidKb) {
        document.documentElement.style.setProperty('--keyboard-offset', `${Math.round(keyboardHeight)}px`);
        document.body.classList.add('mobile-keyboard-open');
      } else {
        document.documentElement.style.setProperty('--keyboard-offset', '0px');
        document.body.classList.remove('mobile-keyboard-open');
      }

      // Ensure the window/body viewport itself never scrolls or gets pushed up
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      document.documentElement.style.removeProperty('--keyboard-offset');
      document.body.classList.remove('mobile-keyboard-open');
    };
  }, []);

  // Timeout & connection ping states for slow response (>10s) and no-internet rollback (>30s)
  const [showNoInternetBanner, setShowNoInternetBanner] = useState(false);
  const [isSlowProcessing, setIsSlowProcessing] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(null); // 'sending' (0-2s) | 'thinking' (2-8s) | 'slow' (>8s) | null
  const loadingPhaseTimer1Ref = useRef(null);
  const loadingPhaseTimer2Ref = useRef(null);
  const slowProcessingTimerRef = useRef(null);
  const timeoutInternetCheckRef = useRef(null);
  const lastSentUserInputTextRef = useRef('');

  const startLoadingPhaseTimers = () => {
    setLoadingPhase('sending');
    if (loadingPhaseTimer1Ref.current) clearTimeout(loadingPhaseTimer1Ref.current);
    if (loadingPhaseTimer2Ref.current) clearTimeout(loadingPhaseTimer2Ref.current);

    // 2 detik pertama: 'sending' ("Mengirim...")
    // Setelah 2 detik: 'thinking' ("Merenungi...")
    loadingPhaseTimer1Ref.current = setTimeout(() => {
      setLoadingPhase('thinking');
    }, 2000);

    // Setelah 8 detik: 'slow' ("Merespon sedikit lebih lama dari biasanya...")
    loadingPhaseTimer2Ref.current = setTimeout(() => {
      setLoadingPhase('slow');
      setIsSlowProcessing(true);
    }, 8000);
  };

  const clearLoadingPhaseTimers = () => {
    if (loadingPhaseTimer1Ref.current) {
      clearTimeout(loadingPhaseTimer1Ref.current);
      loadingPhaseTimer1Ref.current = null;
    }
    if (loadingPhaseTimer2Ref.current) {
      clearTimeout(loadingPhaseTimer2Ref.current);
      loadingPhaseTimer2Ref.current = null;
    }
    if (slowProcessingTimerRef.current) {
      clearTimeout(slowProcessingTimerRef.current);
      slowProcessingTimerRef.current = null;
    }
    setIsSlowProcessing(false);
    setLoadingPhase(null);
  };

  // Online / offline event listeners
  useEffect(() => {
    const handleOnline = () => setShowNoInternetBanner(false);
    const handleOffline = () => setShowNoInternetBanner(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  const stopSpeechToText = () => {
    if (sttRecognitionRef.current) {
      try {
        sttRecognitionRef.current.stop();
      } catch (e) {}
      sttRecognitionRef.current = null;
    }
    setIsSttListening(false);
  };

  const toggleSpeechToText = async () => {
    if (isSttListening) {
      stopSpeechToText();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: If browser/web view doesn't support Web Speech API, open Voice Chat Modal
      setShowVoiceChat(true);
      return;
    }

    // 1. Request microphone permission via getUserMedia first (triggers native permission prompt on Android WebView)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop stream tracks immediately so hardware microphone isn't locked by getUserMedia
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (permErr) {
      console.warn('[STT] Mic permission denied:', permErr);
      showAlert(
        userLanguage === 'id'
          ? '⚠️ Izin mikrofon ditolak. Mohon beri izin akses mikrofon di pengaturan HP/browser.'
          : '⚠️ Microphone permission denied. Please allow microphone access in app settings.',
        'warning',
        4000
      );
      return;
    }

    // 2. Initialize SpeechRecognition
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = userLanguage === 'en' ? 'en-US' : 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let baseText = inputValue || '';

      recognition.onstart = () => {
        setIsSttListening(true);
        showAlert(
          userLanguage === 'id' ? '🎙️ Bicara sekarang... (Klik mikrofon lagi untuk berhenti)' : '🎙️ Listening... (Click mic again to stop)',
          'info',
          3000
        );
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        if (finalChunk) {
          baseText = (baseText + ' ' + finalChunk).trim();
          setInputValue(baseText);
        } else if (interim) {
          setInputValue((baseText + ' ' + interim).trim());
        }

        if (textareaElementRef.current) {
          scheduleTextareaResize(textareaElementRef.current);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[STT] Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          showAlert(
            userLanguage === 'id' ? `⚠️ Rekaman suara: ${event.error}` : `⚠️ Speech recognition: ${event.error}`,
            'warning',
            3000
          );
        }
        stopSpeechToText();
      };

      recognition.onend = () => {
        setIsSttListening(false);
        sttRecognitionRef.current = null;
      };

      sttRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[STT] Failed to start recognition:', err);
      setIsSttListening(false);
      setShowVoiceChat(true);
    }
  };

  // Visual Reasoning Payload Overlay state
  const [isReasoningImage, setIsReasoningImage] = useState(false);
  const [reasoningImages, setReasoningImages] = useState([]);
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningStep, setReasoningStep] = useState(1);
  const [reasoningDecision, setReasoningDecision] = useState(null);
  const capturedRefImagesRef = useRef([]);
  const currentConversationHistoryRef = useRef([]);

  const [collapsedCodeBlocks, setCollapsedCodeBlocks] = useState({}); // Track collapsed code blocks
  const [customAlert, setCustomAlert] = useState(null); // Modern alert system
  const [showInputMenu, setShowInputMenu] = useState(false); // Show/hide input menu
  const [showModelMenu, setShowModelMenu] = useState(false); // Show/hide model selection dropdown
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('deepernova_selected_model') || 'deepernova-gold-1.5';
    } catch (e) {
      return 'deepernova-gold-1.5';
    }
  });
  const [isReasoningEnabled, setIsReasoningEnabled] = useState(() => {
    try {
      return localStorage.getItem('deepernova_reasoning_enabled') === 'true'; // Default is FALSE as requested
    } catch (e) {
      return false;
    }
  });
  const toggleReasoning = useCallback(() => {
    setIsReasoningEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('deepernova_reasoning_enabled', String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const [localModelProgress, setLocalModelProgress] = useState({ pct: 0, statusText: '', isLoading: false });
  const currentModelObj = useMemo(() => {
    return DEEPERNOVA_MODELS.find(m => m.id === selectedModel) || DEEPERNOVA_MODELS[0];
  }, [selectedModel]);
  const isReasoningCapable = currentModelObj?.supportsReasoning === true && !currentModelObj?.id?.toLowerCase().includes('gold');

  const [showSourcesModal, setShowSourcesModal] = useState(false); // Show sources modal
  const [showSidebarMoreMenu, setShowSidebarMoreMenu] = useState(false); // Meta AI sidebar More menu
  const [showSidebarProfileMenu, setShowSidebarProfileMenu] = useState(false); // Meta AI sidebar Profile menu
  const [showSidebarSearchInput, setShowSidebarSearchInput] = useState(false); // Meta AI sidebar inline search toggle
  const [currentSources, setCurrentSources] = useState([]); // Current conversation sources
  const [selectedSource, setSelectedSource] = useState(null); // Selected source for detail view
  const [foundSources, setFoundSources] = useState([]); // Sources found during search
  const [showFoundSourcesPanel, setShowFoundSourcesPanel] = useState(false); // Show found sources panel
  const [, _setPendingAnswerMessage] = useState(false); // Waiting for user to generate answer
  const [pendingAnswerMessage, _setPendingAnswerMessageContent] = useState(null); // Message pending answer generation
  const [messageFeedback, setMessageFeedback] = useState({}); // Track like/dislike feedback for messages: { messageId: 'like'|'dislike'|null }
  const [playingMessageId, setPlayingMessageId] = useState(null); // Currently playing TTS message ID
  const playingMessageIdRef = useRef(null);
  const [ttsLoading, setTtsLoading] = useState(null); // Message ID currently generating TTS
  const [isAutoVoiceEnabled, setIsAutoVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem('deepernova_auto_voice') === 'true';
    } catch (_) {
      return false;
    }
  });
  const isAutoVoiceEnabledRef = useRef(isAutoVoiceEnabled);

  useEffect(() => {
    isAutoVoiceEnabledRef.current = isAutoVoiceEnabled;
    try {
      localStorage.setItem('deepernova_auto_voice', String(isAutoVoiceEnabled));
    } catch (_) {}
  }, [isAutoVoiceEnabled]);
  const [aiGreeting, setAiGreeting] = useState(null); // AI-generated greeting
  const [aiHint, setAiHint] = useState(null); // AI-generated hint for empty chat
  const [generatingGreeting, setGeneratingGreeting] = useState(false); // Loading state for AI greeting
  const [sessionMessageCount, setSessionMessageCount] = useState(0); // Track total messages in current session for memory extraction trigger (every 3)
  const [extractedMemory, setExtractedMemory] = useState(null); // Store extracted memory from conversation
  const [expandedMemoryId, setExpandedMemoryId] = useState(null); // Track which message has expanded memory modal
  const [showGlobalMemorySettings, setShowGlobalMemorySettings] = useState(false); // Show global memory settings modal
  const [showConnectionErrorModal, setShowConnectionErrorModal] = useState(false); // Show connection error modal
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];

    conversations.forEach((conv) => {
      if (conv.isPrivate) return;
      if (!conv.messages) return;

      conv.messages.forEach((msg) => {
        if (msg.text && msg.text.toLowerCase().includes(query)) {
          results.push({
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: msg.id,
            sender: msg.sender,
            text: msg.text,
            timestamp: conv.updatedAt || conv.createdAt
          });
        }
      });
    });

    return results;
  }, [searchQuery, conversations]);
  const textareaElementRef = useRef(null);
  const typingTimerRef = useRef(null);
  const resizeFrameRef = useRef(null);
  const greetingGenerationRef = useRef(false);
  const finishedStreamingIdsRef = useRef(new Set());
  const lazyScrollAnimRef = useRef(null);
  const targetScrollTopRef = useRef(null);

  // True when any message is currently streaming or when sending/generating
  const isGenerating = useMemo(() => {
    if (isSendGenerating) return true;
    try {
      const streaming = messages.some((m) => m.isStreaming);
      return !!generatingGreeting || streaming;
    } catch (e) {
      return !!generatingGreeting;
    }
  }, [messages, generatingGreeting, isSendGenerating]);

  // ===== AGGRESSIVE SAFETY: Auto-reconcile generating state =====
  useEffect(() => {
    const hasActiveFlags = messages.some(
      (m) => m.sender === 'bot' && (m.isStreaming || m.isThinking || m.isSearching || m.isRecallingMemory || m.isImageGenerating || m.isReasoning)
    );

    // If NO bot message is actively running in any state:
    if (!hasActiveFlags) {
      if (isSendGenerating || isSendGeneratingRef.current) {
        setIsSendGenerating(false);
        isSendGeneratingRef.current = false;
      }
      if (loading) {
        setLoading(false);
        setLoadingPhase(null);
      }
      if (isProcessingRef.current) {
        isProcessingRef.current = false;
      }
      return;
    }

    // Safety fallback: if active flags remain stuck beyond 60s, force-clear them aggressively
    const safetyTimer = setTimeout(() => {
      setMessages((prev) => {
        const stillStuck = prev.some(
          (m) => m.sender === 'bot' && (m.isStreaming || m.isThinking || m.isSearching || m.isRecallingMemory || m.isImageGenerating || m.isReasoning)
        );
        if (stillStuck) {
          console.warn('[ChatBot] Safety: force-clearing stuck message flags after 60s timeout');
          return prev.map((msg) =>
            msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating || msg.isReasoning)
              ? { ...msg, isStreaming: false, isThinking: false, isSearching: false, isRecallingMemory: false, isImageGenerating: false, isReasoning: false }
              : msg
          );
        }
        return prev;
      });
      setConversations((prev) => prev.map((c) => (c.isLoading ? { ...c, isLoading: false } : c)));
      setLoading(false);
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      setLoadingPhase(null);
      isProcessingRef.current = false;
    }, 60000);

    return () => clearTimeout(safetyTimer);
  }, [messages, loading, isSendGenerating]);

  // ===== CONVERSATION PERSISTENCE (AUTO-SAVE ON CHANGE) =====
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const isStreamingActive = messages.some(m => m.isStreaming || m.isThinking || (m.sender === 'bot' && (!m.text || m.text.trim() === '')));
    if (isStreamingActive) return;

    const timer = setTimeout(() => {
      try {
        const convId = currentConversationId || `conv_${Date.now()}`;
        if (!currentConversationId) {
          lastLoadedConversationIdRef.current = convId;
          setCurrentConversationId(convId);
        }

        const firstUserMsg = messages.find(m => m.sender === 'user' || m.role === 'user');
        const autoTitle = firstUserMsg ? (firstUserMsg.text || firstUserMsg.content || '').slice(0, 32) : 'Obrolan AI';

        const updatedActiveConv = {
          id: convId,
          title: autoTitle,
          messages: messages,
          updatedAt: new Date().toISOString()
        };

        setConversations(prevConvs => {
          const existingOthers = Array.isArray(prevConvs) ? prevConvs.filter(c => c.id !== convId) : [];
          const updatedList = [updatedActiveConv, ...existingOthers];

          ConversationPersistenceService.saveConversations(updatedList, isAuthenticated, isGuest)
            .catch(saveErr => console.warn('[ChatBot] Auto-save error:', saveErr));

          return updatedList;
        });
      } catch (saveErr) {
        console.warn('[ChatBot] Auto-save outer error:', saveErr);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [messages, currentConversationId, isAuthenticated, isGuest]);

  const scheduleTextareaResize = (textarea) => {
    if (!textarea) return;
    if (resizeFrameRef.current) {
      cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });
  };



  const generateAIWelcomeText = async () => {
    if (messages.length > 0 || greetingGenerationRef.current) return;
    
    greetingGenerationRef.current = true;
    setGeneratingGreeting(true);
    
    try {
      const greeting = getTimeBasedGreeting(userName);
      const randomHint = RANDOM_HINTS[Math.floor(Math.random() * RANDOM_HINTS.length)];
      setAiGreeting(greeting);
      setAiHint(randomHint);
    } catch (error) {
      console.error('[ChatBot] Welcome text error:', error);
      setAiGreeting(getTimeBasedGreeting(userName));
      setAiHint(FALLBACK_GREETINGS.hint);
    } finally {
      setGeneratingGreeting(false);
      greetingGenerationRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      if (lazyScrollAnimRef.current) {
        cancelAnimationFrame(lazyScrollAnimRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('deepernova_user_name');
    const accountName = user?.name && user.name.trim() && !user.guest && user.name.toLowerCase() !== 'guest' ? user.name.trim() : null;

    if (accountName) {
      setUserName(accountName);
      setPendingUserName(accountName);
      localStorage.setItem('deepernova_user_name', accountName);
      setShowNameSetupModal(false);
      return;
    }

    if (storedName && storedName.trim()) {
      setUserName(storedName.trim());
      setPendingUserName(storedName.trim());
      setShowNameSetupModal(false);
      return;
    }

    setShowNameSetupModal(true);
  }, [user]);

  const saveUserName = async (name) => {
    const safeName = (name || '').trim() || 'Teman';
    setUserName(safeName);
    setPendingUserName(safeName);
    localStorage.setItem('deepernova_user_name', safeName);

    if (isAuthenticated && user?.id) {
      const apiUrl = API_BASE_URL;
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: safeName }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            onUpdateUser?.({ name: data.user.name });
          }
        } else {
          const errorData = await response.json().catch(() => null);
          console.warn('[ChatBot] Failed saving name to server:', errorData);
        }
      } catch (error) {
        console.warn('[ChatBot] Error saving name to server:', error);
      }
    } else {
      onUpdateUser?.({ name: safeName });
    }

    setShowNameSetupModal(false);
  };

  const skipNameSetup = () => {
    saveUserName('Teman');
  };

  // Generate greeting when chat is empty or conversation changes
  useEffect(() => {
    if (messages.length === 0) {
      setAiGreeting(null);
      setAiHint(null);
      greetingGenerationRef.current = false;
      generateAIWelcomeText();
    }
  }, [currentConversationId, userName, messages.length]);

  const getSourceLogo = (source) => {
    const iconValue = source?.sourceIcon || source?.icon || '';
    if (iconValue && /^(https?:\/\/|\/).+\.(png|jpe?g|svg|webp)$/i.test(iconValue)) {
      return {
        type: 'image',
        value: iconValue,
        label: source.source || source.title || 'source'
      };
    }

    if (iconValue) {
      return {
        type: 'text',
        value: iconValue
      };
    }

    const sourceName = source?.source || source?.title || 'Sumber';
    const initials = sourceName
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('');

    return {
      type: 'text',
      value: initials || '🔎'
    };
  };

  const [expandedUserMessageId, setExpandedUserMessageId] = useState(null); // Track which user message is expanded
  
  // Text queue management for pasted text
  const [textQueue, setTextQueue] = useState([]); // Queue of pasted text items: [{id, content, label: "salinan teks"}]
  const [selectedTextItem, setSelectedTextItem] = useState(null); // Currently selected text item for popup preview
  const [showTextPopup, setShowTextPopup] = useState(false); // Show/hide text popup for editing
  const [editingTextContent, setEditingTextContent] = useState(''); // Editable content in popup
  const [showDonationModal, setShowDonationModal] = useState(false); // Donation modal visibility
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Delete confirmation modal
  const [deleteConfirmConvId, setDeleteConfirmConvId] = useState(null); // Which conversation to delete
  const [uploadedImages, setUploadedImages] = useState([]); // Queue of uploaded images for vision analysis
  const [activeImageFollowUps, setActiveImageFollowUps] = useState([]); // Active image context kept for follow-up prompts, hidden from queue UI
  const [imageUploadInput, setImageUploadInput] = useState(null); // Ref for hidden image input
  const [attachmentQueueMinimized, setAttachmentQueueMinimized] = useState(false); // Minimize/maximize attachment queue container

  // Camera state & refs
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraTorch, setCameraTorch] = useState(false);
  const [isCameraFlashing, setIsCameraFlashing] = useState(false);
  const [isCameraEnhancingHD, setIsCameraEnhancingHD] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopCameraStream = () => {
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      setCameraStream(null);
    }
    setCameraTorch(false);
  };

  const startCameraStream = async (facing = 'environment') => {
    setCameraLoading(true);
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(userLanguage === 'id' ? 'Browser/perangkat tidak mendukung akses kamera langsung.' : 'Camera API not supported on this device.');
      }

      const constraints = {
        video: {
          facingMode: facing === 'user' ? 'user' : { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraFacingMode(facing);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err) {
      console.warn('[Camera] Failed to start stream with ideal constraints, trying fallback:', err);
      try {
        const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCameraStream(simpleStream);
        if (videoRef.current) {
          videoRef.current.srcObject = simpleStream;
          videoRef.current.play().catch(() => {});
        }
        setCameraLoading(false);
      } catch (fallbackErr) {
        setCameraLoading(false);
        setCameraError(userLanguage === 'id' ? 'Gagal mengakses kamera. Mohon izinkan akses kamera di pengaturan.' : 'Failed to access camera. Please allow camera permissions.');
      }
    }
  };

  const handleOpenCamera = () => {
    if (currentModelObj?.supportsVision === false) {
      alert(userLanguage === 'id'
        ? `Model ${currentModelObj.name} berbasis teks dan tidak mendukung analisis gambar/kamera. Silakan pilih model lain untuk mengambil foto.`
        : `The ${currentModelObj.name} model is text-only and does not support image/camera analysis. Please select another model.`);
      return;
    }
    setShowCameraModal(true);
    setCapturedPhoto(null);
    setCameraError(null);
    setIsCameraEnhancingHD(false);
    setTimeout(() => {
      startCameraStream(cameraFacingMode || 'environment');
    }, 150);
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCapturedPhoto(null);
    setCameraError(null);
    setIsCameraEnhancingHD(false);
  };

  const handleFlipCamera = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextMode);
  };

  const handleToggleTorch = async () => {
    if (cameraStream) {
      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        try {
          const next = !cameraTorch;
          await track.applyConstraints({ advanced: [{ torch: next }] });
          setCameraTorch(next);
        } catch (e) {
          setCameraTorch(!cameraTorch);
        }
      }
    }
  };

  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch (e) {}
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    playShutterSound();
    setIsCameraFlashing(true);
    setTimeout(() => setIsCameraFlashing(false), 160);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (cameraFacingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setIsCameraEnhancingHD(false);
    startCameraStream(cameraFacingMode);
  };

  const handleEnhanceCapturedPhotoHD = async () => {
    if (!capturedPhoto || isCameraEnhancingHD) return;
    setIsCameraEnhancingHD(true);
    showAlert(userLanguage === 'id' ? '✨ Sedang meningkatkan foto ke Ultra HD via Deepernova AI...' : '✨ Enhancing photo to Ultra HD via Deepernova AI...', 'info', 5000);

    try {
      const hdResult = await ImageGenerationService.generateImage(
        'Enhance this captured photo into ultra HD quality with authentic Apple iPhone Pro natural color science (Smart HDR / Deep Fusion aesthetic). Enhance crystal clear sharpness, natural warm skin tones, lifelike textures, and rich dynamic range with balanced cinematic micro-contrast. Do NOT change, modify, add, or remove any objects, people, faces, scene elements, or composition. Only upgrade sharpness and apply pristine iPhone camera color grading and clarity.',
        '1024x1024',
        null,
        'qwen-image-edit-max',
        capturedPhoto,
        null
      );

      if (hdResult?.image?.url) {
        setCapturedPhoto(hdResult.image.url);
        showAlert(userLanguage === 'id' ? '✅ Foto berhasil diubah menjadi Ultra HD!' : '✅ Photo successfully enhanced to Ultra HD!', 'success', 3000);
      } else {
        throw new Error('No HD image returned');
      }
    } catch (err) {
      console.warn('[Camera] HD enhancement error:', err);
      showAlert(userLanguage === 'id' ? '⚠️ Gagal meningkatkan kualitas HD. Silakan coba lagi.' : '⚠️ Failed to enhance HD. Try again.', 'error', 3000);
    } finally {
      setIsCameraEnhancingHD(false);
    }
  };

  const handleUsePhoto = () => {
    if (!capturedPhoto) return;
    const newImageObj = {
      id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      dataUrl: capturedPhoto,
      fileName: `Foto_${new Date().toLocaleTimeString('id-ID').replace(/:/g, '-')}.jpg`,
      size: Math.round(capturedPhoto.length * 0.75),
      status: 'analyzed'
    };
    setUploadedImages((prev) => [...prev, newImageObj]);
    handleCloseCamera();
  };

    const apiBaseUrl = API_BASE_URL;
  const retryIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamingIntervalRef = useRef(null);
  const streamingStartTimeRef = useRef(null);
  const smoothStreamTimerRef = useRef(null);
  const statusUpdateIntervalRef = useRef(null);
  const isPausedRef = useRef(false);
  const currentMessageIdRef = useRef(null);
  const currentStreamingTextRef = useRef('');
  const currentTextRef = useRef('');
  const charIndexRef = useRef(0);
  const holdScrollRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const lastScrollTickRef = useRef(0);
  const isLockedToUserAskRef = useRef(false);
  const lockedUserMessageIdRef = useRef(null);
  const lastProcessedUserMsgIdRef = useRef(null);
  const switchingConvRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const prevLastMessageTextRef = useRef('');

  const stopGlide = () => {
    if (lazyScrollAnimRef.current) {
      cancelAnimationFrame(lazyScrollAnimRef.current);
      lazyScrollAnimRef.current = null;
    }
    targetScrollTopRef.current = null;
    programmaticScrollRef.current = false;
  };
  const abortControllerRef = useRef(null);
  const abortControllersMapRef = useRef(new Map()); // Per-conversation abort controllers
  const isUserStoppedRef = useRef(false); // Tracks explicit user stop action to prevent retry loops
  const partialMessageIdRef = useRef(null);
  const autoRetryTimeoutRef = useRef(null);
  const autoRetryCountRef = useRef(0);
  const backgroundAgentCountRef = useRef(0); // number of running background agent tasks
  const triggeredAgentTasksRef = useRef(new Set()); // Prevent duplicate background agent execution
  const triggeredImageRequestsRef = useRef(new Set()); // Prevent duplicate background image generation
  const triggeredSearchRequestsRef = useRef(new Set()); // Prevent duplicate web search requests
  const searchContextHistoryRef = useRef({}); // Tracks accumulated search contexts for multi-step search per messageId
  const isSearchAbortedRef = useRef(false); // Track if current stream was aborted for search
  const isRecallAbortedRef = useRef(false); // Track if current stream was aborted for recall memory
  const triggeredRecallRequestsRef = useRef(new Set()); // Prevent duplicate recall memory requests
  const recallContextHistoryRef = useRef({}); // Tracks accumulated recall contexts for multi-step recall per messageId
  const processedMemoryActionsRef = useRef(new Set()); // Tracks executed autonomous memory actions (save, update, delete)
  const [expandedCotMap, setExpandedCotMap] = useState({}); // Toggles expand/collapse for CoT blocks
  const [activeSearchSources, setActiveSearchSources] = useState(null); // Full search results for popup modal
  const prevHasCodeRef = useRef(false);
  const manuallyNamedConversationsRef = useRef(new Set()); // Track which conversations have manual titles
  const aiTitledConversationsRef = useRef(new Set()); // Track which conversations already had AI title generated (ONCE max)
  const lastPasteTimeRef = useRef(0); // Timestamp of last paste event to prevent auto-sending on paste
  const MAX_AUTO_RETRY = 1;  // REDUCED: Max 1 retry to prevent token waste (1 initial + 1 retry = 2 max calls)

  // ===== Token Limit System Configuration =====
  // Token limit: 2.000.000 tokens (2 juta). Image generation/edit: 30.000 tokens. Reset time: 4 hours.
  const MAX_TOKEN_LIMIT = 2000000;
  const IMAGE_TOKEN_COST = 30000;
  const TOKEN_RESET_HOURS = 4;

  const clearTokenUsageMultiStorage = () => {
    try { localStorage.removeItem('deepernova_token_usage_system'); } catch (e) {}
    try { sessionStorage.removeItem('deepernova_token_usage_system'); } catch (e) {}
    try { document.cookie = 'deepernova_token_usage=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; } catch (e) {}
  };

  // Helper for multi-storage redundancy (localStorage + sessionStorage + Cookie) in Local AI Mode
  const saveTokenUsageMultiStorage = (usage) => {
    if (!usage || (usage.usedTokens === 0 && !usage.resetTime)) {
      clearTokenUsageMultiStorage();
      return;
    }
    const jsonStr = JSON.stringify(usage);
    try {
      localStorage.setItem('deepernova_token_usage_system', jsonStr);
    } catch (e) {}
    try {
      sessionStorage.setItem('deepernova_token_usage_system', jsonStr);
    } catch (e) {}
    try {
      const expiresDays = usage.resetTime ? Math.max(0.1, (usage.resetTime - Date.now()) / (24 * 60 * 60 * 1000)) : 1;
      const expiresDate = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `deepernova_token_usage=${encodeURIComponent(jsonStr)}; expires=${expiresDate}; path=/; SameSite=Lax`;
    } catch (e) {}
  };

  const loadTokenUsageMultiStorage = () => {
    const sources = [];

    // 1. LocalStorage
    try {
      const ls = localStorage.getItem('deepernova_token_usage_system');
      if (ls) sources.push(JSON.parse(ls));
    } catch (e) {}

    // 2. SessionStorage
    try {
      const ss = sessionStorage.getItem('deepernova_token_usage_system');
      if (ss) sources.push(JSON.parse(ss));
    } catch (e) {}

    // 3. Document Cookie
    try {
      const cookieMatch = document.cookie.match(/deepernova_token_usage=([^;]+)/);
      if (cookieMatch) {
        sources.push(JSON.parse(decodeURIComponent(cookieMatch[1])));
      }
    } catch (e) {}

    let highestUsed = 0;
    let activeReset = null;
    let hasValidActiveLock = false;

    for (const src of sources) {
      if (src && typeof src === 'object') {
        if (src.resetTime) {
          if (Date.now() < src.resetTime) {
            // Still within the 4-hour window
            if (!activeReset || src.resetTime > activeReset) {
              activeReset = src.resetTime;
            }
            hasValidActiveLock = true;
          } else {
            // 4 hours have passed! Stale lock expired, reset immediately
            clearTokenUsageMultiStorage();
            return { usedTokens: 0, resetTime: null };
          }
        }
        if (typeof src.usedTokens === 'number' && src.usedTokens > highestUsed) {
          highestUsed = src.usedTokens;
        }
      }
    }

    // If 4 hours expired or if token was maxed out without an active resetTime, auto-reset to 0
    if (highestUsed >= MAX_TOKEN_LIMIT && !hasValidActiveLock) {
      clearTokenUsageMultiStorage();
      return { usedTokens: 0, resetTime: null };
    }

    if (activeReset && Date.now() >= activeReset) {
      clearTokenUsageMultiStorage();
      return { usedTokens: 0, resetTime: null };
    }

    return {
      usedTokens: hasValidActiveLock ? highestUsed : (highestUsed >= MAX_TOKEN_LIMIT ? 0 : highestUsed),
      resetTime: hasValidActiveLock ? activeReset : null
    };
  };

  const [tokenUsage, setTokenUsage] = useState(() => {
    return loadTokenUsageMultiStorage();
  });

  const [countdownText, setCountdownText] = useState('');
  const [countdownFullText, setCountdownFullText] = useState('');

  // State to control visibility of top-right token display (hidden by default)
  const [showTokenUsage, setShowTokenUsage] = useState(() => {
    try {
      const saved = localStorage.getItem('deepernova_show_token_usage');
      return saved === 'true'; // Default: false (hidden)
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('deepernova_show_token_usage', String(showTokenUsage));
    } catch (e) {}
  }, [showTokenUsage]);

  // Persist token usage to multi-storage and broadcast across browser tabs in real-time
  useEffect(() => {
    saveTokenUsageMultiStorage(tokenUsage);

    let channel = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('deepernova_token_channel');
        channel.postMessage({ type: 'TOKEN_UPDATE', payload: tokenUsage });
        channel.onmessage = (event) => {
          if (event.data?.type === 'TOKEN_UPDATE' && event.data.payload) {
            const remote = event.data.payload;
            setTokenUsage((prev) => {
              if (!remote.resetTime && remote.usedTokens === 0) {
                return { usedTokens: 0, resetTime: null };
              }
              const maxUsed = Math.max(prev.usedTokens, remote.usedTokens || 0);
              const maxReset = (remote.resetTime && Date.now() < remote.resetTime) ? remote.resetTime : prev.resetTime;
              if (maxUsed !== prev.usedTokens || maxReset !== prev.resetTime) {
                return { usedTokens: maxUsed, resetTime: maxReset };
              }
              return prev;
            });
          }
        };
      }
    } catch (e) {}

    const handleStorageEvent = (e) => {
      if (e.key === 'deepernova_token_usage_system') {
        const loaded = loadTokenUsageMultiStorage();
        setTokenUsage(loaded);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (channel) channel.close();
    };
  }, [tokenUsage]);

  // Timer for 4-hour reset countdown and auto-reset check
  useEffect(() => {
    const updateCountdown = () => {
      if (tokenUsage.resetTime) {
        const diffMs = tokenUsage.resetTime - Date.now();
        if (diffMs <= 0) {
          clearTokenUsageMultiStorage();
          setTokenUsage({ usedTokens: 0, resetTime: null });
          setCountdownText('');
          setCountdownFullText('');
          showAlert(
            userLanguage === 'id' 
              ? '🔄 Limit token telah di-reset! Anda dapat kembali mengobrol.' 
              : '🔄 Token limit has reset! You can resume chat.',
            'success',
            4000
          );
        } else {
          const totalSec = Math.floor(diffMs / 1000);
          const hours = Math.floor(totalSec / 3600);
          const mins = Math.floor((totalSec % 3600) / 60);
          const secs = totalSec % 60;
          const pad = (n) => String(n).padStart(2, '0');
          
          setCountdownFullText(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);

          if (hours > 0) {
            setCountdownText(`${hours}j ${mins}m`);
          } else {
            setCountdownText(`${mins}m ${secs}s`);
          }
        }
      } else {
        setCountdownText('');
        setCountdownFullText('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [tokenUsage.resetTime, userLanguage]);

  // Sync token usage with backend IP tracking endpoint (if available)
  useEffect(() => {
    const syncIpTokenUsage = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/token-usage/check`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.usedTokens === 'number') {
            setTokenUsage((prev) => {
              if (data.resetTime && Date.now() >= data.resetTime) {
                clearTokenUsageMultiStorage();
                return { usedTokens: 0, resetTime: null };
              }
              const serverUsed = data.usedTokens;
              const serverReset = data.resetTime || null;
              const maxUsed = Math.max(prev.usedTokens, serverUsed);
              const activeReset = prev.resetTime || serverReset;
              return {
                usedTokens: maxUsed,
                resetTime: activeReset
              };
            });
          }
        }
      } catch (e) {
        // Silently skip if endpoint doesn't exist
      }
    };

    syncIpTokenUsage();
    const syncInterval = setInterval(syncIpTokenUsage, 60000);
    return () => clearInterval(syncInterval);
  }, []);

  // Function to consume tokens
  const consumeTokens = (amount) => {
    setTokenUsage((prev) => {
      let currentUsed = prev.usedTokens;
      let currentReset = prev.resetTime;

      // Auto-reset if expired
      if (currentReset && Date.now() >= currentReset) {
        clearTokenUsageMultiStorage();
        currentUsed = 0;
        currentReset = null;
      }

      const newUsed = currentUsed + amount;
      let newReset = currentReset;

      if (newUsed >= MAX_TOKEN_LIMIT && !currentReset) {
        newReset = Date.now() + TOKEN_RESET_HOURS * 60 * 60 * 1000;
        showAlert(
          userLanguage === 'id'
            ? `⚠️ Batas token ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')} tercapai! Penggunaan token akan di-reset otomatis dalam 4 jam.`
            : `⚠️ Token limit ${MAX_TOKEN_LIMIT.toLocaleString('en-US')} reached! Usage will reset automatically in 4 hours.`,
          'warning',
          6000
        );
      }

      return {
        usedTokens: newUsed,
        resetTime: newReset
      };
    });

    // Notify server to consume tokens for this IP (if backend supports it)
    try {
      fetch(`${API_BASE_URL}/api/token-usage/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount })
      }).catch(() => {});
    } catch (e) {}
  };

  // Function to check if token usage limit is active (airtight multi-storage & anti-tamper fallback for local mode)
  const isTokenUsageLimited = () => {
    if (tokenUsage.resetTime) {
      if (Date.now() >= tokenUsage.resetTime) {
        clearTokenUsageMultiStorage();
        if (tokenUsage.usedTokens !== 0 || tokenUsage.resetTime !== null) {
          setTokenUsage({ usedTokens: 0, resetTime: null });
        }
        return false;
      }
      return true;
    }
    if (tokenUsage.usedTokens >= MAX_TOKEN_LIMIT) {
      const newReset = Date.now() + TOKEN_RESET_HOURS * 60 * 60 * 1000;
      setTokenUsage({ usedTokens: tokenUsage.usedTokens, resetTime: newReset });
      return true;
    }
    return false;
  };
  // Refs for message editing
  const lastSentPromptRef = useRef('');
  const lastSentUserMessageIdRef = useRef(null);
  const isProcessingRef = useRef(false); // MUTEX: Prevent concurrent image OR text responses - 1 prompt = 1 response only

  // Image modal for enlarged view and download
  const [enlargedImage, setEnlargedImage] = useState(null); // { url, alt } for lightbox
  const [showImageModal, setShowImageModal] = useState(false); // Show/hide image modal
  const [hdUpscalingMap, setHdUpscalingMap] = useState({}); // Track which images are being HD upscaled { imageUrl: true/false }

  const handleUpscaleHD = async (originalImageUrl, messageId) => {
    if (!originalImageUrl || hdUpscalingMap[originalImageUrl]) return;

    setHdUpscalingMap(prev => ({ ...prev, [originalImageUrl]: true }));
    showAlert(userLanguage === 'id' ? '🔄 Sedang meningkatkan kualitas gambar ke HD...' : '🔄 Upscaling image to HD...', 'info', 5000);

    try {
      const hdResult = await ImageGenerationService.generateImage(
        'Enhance this image into ultra HD resolution with authentic Apple iPhone Pro natural color science (Smart HDR look). Elevate sharpness, micro-contrast, realistic textures, and vibrant true-to-life color depth. Keep all subjects, people, composition, and objects 100% identical, only elevate the image quality to crisp, high-definition iPhone Pro photo aesthetics.',
        '1024x1024',
        null,
        'qwen-image-edit-max',
        originalImageUrl,
        null
      );

      if (hdResult?.image?.url) {
        const hdUrl = hdResult.image.url;
        console.log('[HD Upscale] ✅ HD image generated:', hdUrl?.substring(0, 80));

        // Update the message in state with the new HD image URL
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            // Update main imageUrl
            const updated = { ...msg };
            if (updated.imageUrl === originalImageUrl) {
              updated.imageUrl = hdUrl;
            }
            // Update imageUrls array
            if (updated.imageUrls) {
              updated.imageUrls = updated.imageUrls.map(u => u === originalImageUrl ? hdUrl : u);
            }
            // Update text markdown
            if (updated.text && updated.text.includes(originalImageUrl)) {
              updated.text = updated.text.replace(originalImageUrl, hdUrl);
            }
            return updated;
          }
          return msg;
        }));

        showAlert(userLanguage === 'id' ? '✅ Gambar berhasil ditingkatkan ke HD!' : '✅ Image upscaled to HD!', 'success', 3000);
      } else {
        throw new Error('No HD image URL returned');
      }
    } catch (err) {
      console.error('[HD Upscale] ❌ Error:', err);
      showAlert(
        userLanguage === 'id' ? '⚠️ Gagal meningkatkan kualitas gambar. Coba lagi nanti.' : '⚠️ Failed to upscale image. Try again later.',
        'error',
        4000
      );
    } finally {
      setHdUpscalingMap(prev => ({ ...prev, [originalImageUrl]: false }));
    }
  };
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const editLongPressTimeoutRef = useRef(null);

  const openLogoutConfirm = () => setShowLogoutConfirm(true);
  const closeLogoutConfirm = () => setShowLogoutConfirm(false);

  // Modern alert system
  const showAlert = (message, type = 'info', duration = 4000) => {
    setCustomAlert({ message, type });
    if (duration > 0) {
      setTimeout(() => setCustomAlert(null), duration);
    }
  };

  const finishStreaming = (messageId, finalText = null, realUsage = null) => {
    setLoadingPhase(null);
    clearLoadingPhaseTimers();
    setIsSendGenerating(false);
    isSendGeneratingRef.current = false;
    isProcessingRef.current = false;
    setLoading(false);
    setConvLoading(false);

    if (isLockedToUserAskRef.current && !holdScrollRef.current) {
      requestAnimationFrame(() => {
        if (isLockedToUserAskRef.current && !holdScrollRef.current) {
          lockUserAskToTop(true);
        }
      });
      setTimeout(() => {
        if (isLockedToUserAskRef.current && !holdScrollRef.current) {
          lockUserAskToTop(true);
        }
      }, 50);
      setTimeout(() => {
        if (isLockedToUserAskRef.current && !holdScrollRef.current) {
          lockUserAskToTop(true);
        }
      }, 150);
    }
    setMessages((prev) => {
      const updated = prev.map((msg) => {
        if (msg.id === messageId) {
          let textToUse = finalText !== null ? finalText : msg.text;

          // GUARANTEE: NEVER FORGET TO RESPOND AFTER REASONING
          if ((!textToUse || !textToUse.trim()) && (msg.reasoningText || msg.thought)) {
            const rSource = (msg.reasoningText || msg.thought).trim();
            if (rSource) {
              console.warn('[ChatBot] finishStreaming: empty response with reasoning detected. Synthesizing verified answer...');
              textToUse = extractResponseFromReasoning(rSource);
            }
          }
          
          // Detect if user asked to create a file or open deepernova universe
          const isCreateFileQuery = /\b(buat|bikin|create|new|tulis|buka)\b.*\b(file|dokumen|document|docx|excel|spreadsheet|ppt|slide|xlsx|pptx|universe|typernova)\b/i.test(lastSentPromptRef.current || '');
          if (isCreateFileQuery && textToUse && !textToUse.includes('[NAVIGATE_UNIVERSE]')) {
            textToUse += '\n\n[NAVIGATE_UNIVERSE]';
          }
          
          // Extract download metadata if present
          let downloadUrl = null;
          let fileName = null;
          let downloadSummary = null;
          let cleanText = textToUse;
          
          const downloadMatch = textToUse?.match(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):(.+):([^:]+):?([^\]]*)\]/);
          if (downloadMatch) {
            downloadUrl = downloadMatch[1];
            fileName = downloadMatch[2];
            if (downloadMatch[3]) {
              try {
                downloadSummary = decodeURIComponent(downloadMatch[3]);
              } catch (e) {
                downloadSummary = downloadMatch[3];
              }
            }
            cleanText = textToUse
              .replace(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):[^\]]*\]\n*/g, '')
              .replace(/\[(?:FILE_DOWNLOAD_END|FILEDOWNLOADEND)\]\n*/g, '');
            cleanText = removeDownloadStatusLines(cleanText);
          }

          // Extract REMINDER_REQUEST flag if present
          let reminderData = msg.reminder || null;
          const reminderMatch = textToUse?.match(/\[REMINDER_REQUEST:\s*(\{[\s\S]*?\})\]/);
          if (reminderMatch) {
            try {
              const payload = JSON.parse(reminderMatch[1]);
              reminderData = reminderService.addReminder({
                title: payload.title || 'Pengingat',
                datetime: payload.datetime || new Date().toISOString(),
                type: payload.type || 'reminder',
                description: payload.description || 'Dibuat via AI Chatbot'
              });
              textToUse = textToUse.replace(/\[REMINDER_REQUEST:\s*\{[\s\S]*?\}\]\n*/g, '').trim();
            } catch (e) {
              console.error('[ChatBot] Error in finishStreaming parsing REMINDER_REQUEST:', e);
            }
          } else if (!reminderData) {
            const userPromptText = lastSentUserInputTextRef.current || '';
            const fallbackIntent = reminderService.parseReminderIntent(userPromptText);
            if (fallbackIntent) {
              reminderData = reminderService.addReminder({
                title: fallbackIntent.title,
                datetime: fallbackIntent.datetime,
                type: fallbackIntent.type,
                description: fallbackIntent.description || 'Dibuat via AI Chatbot'
              });
            }
          }

          cleanText = cleanResponseText(cleanText);

          // Use REAL token count from API when available, otherwise estimate
          let processTokens;
          if (realUsage && typeof realUsage.total_tokens === 'number') {
            processTokens = realUsage.total_tokens;
            console.log(`[TokenUsage] Real API tokens: prompt=${realUsage.prompt_tokens}, completion=${realUsage.completion_tokens}, total=${realUsage.total_tokens}`);
          } else {
            // Fallback estimation when API doesn't return usage
            const estimatedInput = Math.ceil((lastSentPromptRef.current || '').length / 3.5);
            const estimatedOutput = Math.ceil((cleanText || '').length / 3.5);
            processTokens = Math.max(50, estimatedInput + estimatedOutput);
            console.log(`[TokenUsage] Estimated tokens (no API usage): ${processTokens}`);
          }
          consumeTokens(processTokens);

          return {
            ...msg,
            text: cleanText,
            isStreaming: false,
            isThinking: false,
            isReasoning: false,
            isSearching: false,
            isRecallingMemory: false,
            isImageGenerating: false,
            reminder: reminderData,
            downloadUrl,
            fileName,
            downloadSummary
          };
        }
        return msg;
      });

      // Defer side-effects and INSTANT CONVERSATION PERSISTENCE outside the state updater using setTimeout
      setTimeout(() => {
        try {
          const convId = currentConversationId || `conv_${Date.now()}`;
          if (!currentConversationId) {
            lastLoadedConversationIdRef.current = convId;
            setCurrentConversationId(convId);
          }

          const firstUserMsg = updated.find(m => m.sender === 'user' || m.role === 'user');
          const autoTitle = firstUserMsg ? (firstUserMsg.text || firstUserMsg.content || '').slice(0, 32) : 'Obrolan AI';

          const sanitizedMessages = updated.map(m => ({
            ...m,
            isStreaming: false,
            isThinking: false,
            isReasoning: false,
            isSearching: false,
            isRecallingMemory: false,
            isImageGenerating: false
          }));

          const updatedActiveConv = {
            id: convId,
            title: autoTitle,
            messages: sanitizedMessages,
            isLoading: false,
            updatedAt: new Date().toISOString()
          };

          setConversations(prevConvs => {
            const existingOthers = Array.isArray(prevConvs) ? prevConvs.filter(c => c.id !== convId) : [];
            const updatedList = [updatedActiveConv, ...existingOthers.map(c => ({ ...c, isLoading: false }))];

            ConversationPersistenceService.saveToLocalStorage(updatedList);

            ConversationPersistenceService.saveConversations(updatedList, isAuthenticated, isGuest)
              .catch(saveErr => console.warn('[ChatBot] Instant save error:', saveErr));

            return updatedList;
          });
        } catch (e) {
          console.warn('[ChatBot] finishStreaming instant save error:', e);
        }

        // 🎙️ AUTO-VOICE is handled by a dedicated useEffect watching `messages` (always reads the freshest final text)

        const recentMessages = updated
          .filter(m => m.text && m.sender)
          .slice(-3)
          .map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text.substring(0, 300)
          }));

        if (recentMessages.length > 0) {
          if (isAuthenticated && !isGuest) {
            // For authenticated users, send to API
            console.log('[GLOBAL_MEMORY] Auto-trigger update for latest chat exchange', recentMessages.length);
            fetch(`${API_BASE_URL}/api/memory/global/update`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recentMessages })
            })
            .then(async res => {
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data?.error || `Status ${res.status}`);
              }
              console.log('[GLOBAL_MEMORY] Auto-update completed', data);
            })
            .catch(err => console.warn('[GLOBAL_MEMORY] Auto-update failed:', err.message));
          } else if (isGuest) {
            // For guests, trigger AI auto-update using the same API proxy
            const guestMemory = localStorage.getItem('guest_global_memory') || '';
            console.log('[GLOBAL_MEMORY_LOCAL] Auto-trigger update for guest latest chat exchange', recentMessages.length);
            
            fetch(`${API_BASE_URL}/api/memory/global/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recentMessages, currentMemory: guestMemory })
            })
            .then(async res => {
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data?.error || `Status ${res.status}`);
              }
              localStorage.setItem('guest_global_memory', data.globalMemory || '');
              localStorage.setItem('guest_global_memory_updated', data.lastUpdatedAt || new Date().toISOString());
              console.log('[GLOBAL_MEMORY_LOCAL] Guest auto-update completed', data);
            })
            .catch(err => console.warn('[GLOBAL_MEMORY_LOCAL] Guest auto-update failed:', err.message));
          }
        }
      }, 0);

      return updated;
    });

    setSessionMessageCount(prev => prev + 1);
  };




  // Handle paste events - intercept text paste and add to queue instead of input
  const handlePaste = (e) => {
    lastPasteTimeRef.current = Date.now();
    const pastedText = e.clipboardData.getData('text');
    
    // If there's actual pasted text, add to text queue and prevent default paste
    if (pastedText && pastedText.trim()) {
      e.preventDefault();
      
      // Add to text queue
      const newTextItem = {
        id: Date.now(),
        content: pastedText,
        label: userLanguage === 'id' ? 'salinan teks' : 'text copy',
      };
      
      setTextQueue((prev) => [...prev, newTextItem]);
      
      // Show brief feedback
      showAlert(
        userLanguage === 'id' 
          ? '📋 Teks ditambahkan ke antrian' 
          : '📋 Text added to queue',
        'info',
        2000
      );
    }
  };

  // Open text popup for preview/edit
  const handleTextQueueItemClick = (item) => {
    setSelectedTextItem(item);
    setEditingTextContent(item.content);
    setShowTextPopup(true);
  };

  // Save edited text content
  const handleSaveTextEdit = () => {
    if (!selectedTextItem) return;
    
    // Update text in queue
    setTextQueue((prev) =>
      prev.map((item) =>
        item.id === selectedTextItem.id
          ? { ...item, content: editingTextContent }
          : item
      )
    );
    
    // Close popup
    setShowTextPopup(false);
    setSelectedTextItem(null);
    setEditingTextContent('');
    
    showAlert(
      userLanguage === 'id' 
        ? '✅ Teks diperbarui' 
        : '✅ Text updated',
      'success',
      2000
    );
  };

  // Remove text item from queue
  const handleRemoveTextItem = (itemId) => {
    setTextQueue((prev) => prev.filter((item) => item.id !== itemId));
    
    // Close popup if this item is being edited
    if (selectedTextItem?.id === itemId) {
      setShowTextPopup(false);
      setSelectedTextItem(null);
      setEditingTextContent('');
    }
    
    showAlert(
      userLanguage === 'id' 
        ? '🗑️ Teks dihapus dari antrian' 
        : '🗑️ Text removed from queue',
      'info',
      2000
    );
  };
  // Image modal handlers
  const handleImageClick = (imageUrl, alt = 'Generated Image', imageId = null) => {
    setEnlargedImage({ url: imageUrl, alt, imageId });
    setShowImageModal(true);
    console.log('[IMAGE] Opened image modal for:', imageUrl, 'ID:', imageId);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setEnlargedImage(null);
  };

  const handleDownloadImage = async () => {
    if (!enlargedImage?.url) {
      console.error('[IMAGE] No image URL available');
      return;
    }

    try {
      const url = enlargedImage.url;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `deepernova-image-${timestamp}-${Date.now()}.png`;

      await downloadImageDirectly(url, filename);
      showAlert(
        userLanguage === 'id' ? '✅ Gambar berhasil diunduh' : '✅ Image downloaded',
        'success',
        2000
      );
    } catch (error) {
      console.error('[IMAGE] Download error:', error);
      window.open(enlargedImage.url, '_blank');
    }
  };


  // Check if last message has code (not just any message)
  const hasCodeMessage = messages.length > 0 && 
    messages[messages.length - 1].sender === 'bot' && 
    messages[messages.length - 1].text && 
    messages[messages.length - 1].text.includes('```');

  useEffect(() => {
    if (hasCodeMessage && !prevHasCodeRef.current) {
      setShowCodePanelPulse(true);
    }
    prevHasCodeRef.current = hasCodeMessage;
    if (!hasCodeMessage) {
      setShowCodePanelPulse(false);
    }
  }, [hasCodeMessage]);

  // Initialize RAG knowledge base on mount
  useEffect(() => {
    const initializeRag = async () => {
      try {
        const success = await ragService.ingestKnowledgeBase('/data/datasets/deepernova_dataset.json');
        if (success) {
          console.log('✅ RAG Knowledge Base Ready');
        }
      } catch (e) {
        console.debug('RAG initialization optional:', e?.message);
      }
    };
    initializeRag();
  }, []);

  const confirmLogout = async () => {
    setLogoutLoading(true);
    try {
      if (isAuthenticated && !isGuest) {
        // Persist current conversations before destroying the session,
        // so token usage and chat history remain accurate after re-login.
        await ConversationPersistenceService.saveConversations(conversations, true, false);
      }
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLogoutLoading(false);
      setShowLogoutConfirm(false);
      resetLocalStorageData();
      onLogout?.();
    }
  };

  const resetLocalStorageData = () => {
    const keysToClear = [
      'chatbot_conversations',
      'chatbot_last_conversation',
      'deepernova_memory_system',
      'deepernova_message_feedback',
      'deepernova_chat_branches',
      'deepernova_rag_index_v1',
      'deepernova_reminders_v1',
      'deepernova_saved_images',
      'research_anonymous_id',
      'guest_global_memory',
      'guest_global_memory_updated',
      'authUser',
      'guestSession',
    ];
    keysToClear.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });
    try { sessionStorage.clear(); } catch (_e) {}
    console.log('[ChatBot] ALL localStorage cleared for logout — AI context reset');
  };


  const normalizeToTimestamp = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') {
      return val < 10000000000 ? val * 1000 : val;
    }
    if (typeof val === 'string') {
      if (/^\d{10,13}$/.test(val)) {
        const num = parseInt(val, 10);
        return val.length === 10 ? num * 1000 : num;
      }
      let s = val.trim();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T') + 'Z';
      }
      const parsed = new Date(s).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  const parseConvTimestamp = (c) => {
    if (!c) return 0;
    // 1. Most accurate: timestamp of the last message inside the conversation
    if (Array.isArray(c.messages) && c.messages.length > 0) {
      for (let i = c.messages.length - 1; i >= 0; i--) {
        const msg = c.messages[i];
        if (msg) {
          const rawMsgTime = msg.timestamp || msg.createdAt || msg.time;
          if (rawMsgTime) {
            const t = normalizeToTimestamp(rawMsgTime);
            if (t > 0) return t;
          }
        }
      }
    }
    // 2. Next: conversation-level timestamps
    const rawConvTime = c.updatedAt || c.createdAt || c.timestamp;
    if (rawConvTime) {
      const t = normalizeToTimestamp(rawConvTime);
      if (t > 0) return t;
    }
    // 3. Fallback: numeric ID if timestamp-based
    if (typeof c.id === 'number' && c.id > 1000000000) return c.id;
    if (typeof c.id === 'string' && /^\d{10,14}$/.test(c.id)) {
      return parseInt(c.id, 10) || 0;
    }
    return 0;
  };

  const getLatestConversation = (loaded) => {
    if (!Array.isArray(loaded) || loaded.length === 0) return null;
    return loaded.reduce((latest, conv) => {
      if (!conv || !conv.id) return latest;
      if (!latest) return conv;
      const latestTime = parseConvTimestamp(latest);
      const convTime = parseConvTimestamp(conv);
      return convTime >= latestTime ? conv : latest;
    }, null);
  };

  const rememberConversationId = (convId) => {
    try {
      if (convId) {
        localStorage.setItem('chatbot_last_conversation', String(convId));
      }
    } catch (e) {
      console.warn('Unable to save last conversation id:', e);
    }
  };

  // Create new conversation
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConv = {
      id: newId,
      title: userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat',
      messages: [],
      isLoading: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: false,
    };
    // Clean out empty non-active sessions when user starts a fresh chat
    remoteTypewriterRef.current?.finishNow();
    deepernovaTtsService.stop();
    deepernovaTtsService.clearCache();
    playingMessageIdRef.current = null;
    setPlayingMessageId(null);
    streamingSeenIdsRef.current.clear();
    autoSpokenIdsRef.current.clear();
    if (autoVoiceTimerRef.current) {
      clearTimeout(autoVoiceTimerRef.current);
      autoVoiceTimerRef.current = null;
    }
    setConversations((prev) => [newConv, ...prev.filter(c => c && c.messages && c.messages.length > 0)]);
    switchingConvRef.current = true;
    setCurrentConversationId(newId);
    rememberConversationId(newId);
    setMessages([]);
    currentConversationHistoryRef.current = [];
    lastSentPromptRef.current = '';
    lastSentUserMessageIdRef.current = null;
    lastSentUserInputTextRef.current = '';
    prevMessagesLengthRef.current = 0;
    prevLastMessageTextRef.current = '';
    setCompactView(true);
    setIsPrivateChat(false);
    isLockedToUserAskRef.current = false;
    lockedUserMessageIdRef.current = null;
    setActiveImageFollowUps([]);
    setUploadedImages([]);
    setUploadedFiles([]);
    capturedRefImagesRef.current = [];
    setTimeout(() => {
      switchingConvRef.current = false;
    }, 300);
  };

  // Format Database Akun Handlers
  const handleCopyFormatConfirmText = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('HAPUS DATA SAYA');
      }
      setFormatDbConfirmText('HAPUS DATA SAYA');
      setFormatDbCopied(true);
      setTimeout(() => setFormatDbCopied(false), 2000);
    } catch (_e) {
      setFormatDbConfirmText('HAPUS DATA SAYA');
      setFormatDbCopied(true);
      setTimeout(() => setFormatDbCopied(false), 2000);
    }
  };

  const handleFormatDatabaseAccount = async () => {
    if (formatDbConfirmText.trim().toUpperCase() !== 'HAPUS DATA SAYA') {
      setFormatDbError(userLanguage === 'id' ? 'Teks konfirmasi harus tepat "HAPUS DATA SAYA"' : 'Confirmation text must be exactly "HAPUS DATA SAYA"');
      return;
    }
    if (!formatDbPassword) {
      setFormatDbError(userLanguage === 'id' ? 'Masukkan kata sandi akun Anda' : 'Please enter your account password');
      return;
    }

    setFormatDbLoading(true);
    setFormatDbError(null);

    try {
      const res = await fetch('/api/account/format-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: formatDbPassword,
          confirmText: formatDbConfirmText.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (userLanguage === 'id' ? 'Gagal memformat database akun' : 'Failed to format account database'));
      }

      // Format successful!
      const freshId = Date.now().toString();
      const freshConv = {
        id: freshId,
        title: userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat',
        messages: [],
        isLoading: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPrivate: false,
      };

      setConversations([freshConv]);
      switchingConvRef.current = true;
      setCurrentConversationId(freshId);
      rememberConversationId(freshId);
      setMessages([]);
      prevMessagesLengthRef.current = 0;
      prevLastMessageTextRef.current = '';
      setWorkspaceFiles([]);
      setActiveFile(null);
      setActiveImageFollowUps([]);
      setUploadedImages([]);
      setUploadedFiles([]);
      capturedRefImagesRef.current = [];
      
      try {
        localStorage.removeItem('chatbot_conversations');
        localStorage.removeItem('cached_conversations');
        localStorage.removeItem('chatbot_artifacts');
        localStorage.removeItem('chatbot_last_conversation');
      } catch (_e) {}

      setShowFormatDbModal(false);
      setFormatDbPassword('');
      setFormatDbConfirmText('');
      setFormatDbError(null);

      showAlert(
        userLanguage === 'id'
          ? '✅ Database akun Anda berhasil diformat fresh! Kuota token dipulihkan ke 1.000.000.'
          : '✅ Account database successfully formatted fresh! Token quota restored to 1,000,000.',
        'success'
      );
    } catch (err) {
      console.error('[Format DB] Error:', err);
      setFormatDbError(err.message || (userLanguage === 'id' ? 'Terjadi kesalahan saat memformat database.' : 'An error occurred while formatting database.'));
    } finally {
      setFormatDbLoading(false);
    }
  };

  // Load conversations on mount: restore active session or most recent conversation seamlessly
  useEffect(() => {
    const loadConversations = async () => {
      try {
        console.log(`[ChatBot] Loading conversations. Auth: isAuth=${isAuthenticated}, isGuest=${isGuest}`);
        const loaded = await ConversationPersistenceService.loadConversations(isAuthenticated, isGuest);
        
        let cleanedLoaded = [];
        if (loaded && Array.isArray(loaded)) {
          cleanedLoaded = loaded.filter(c => c && c.id && Array.isArray(c.messages) && c.messages.length > 0);
          // Sort conversations with most recent activity strictly at index 0
          cleanedLoaded.sort((a, b) => parseConvTimestamp(b) - parseConvTimestamp(a));
        }

        if (cleanedLoaded.length > 0) {
          console.log(`[ChatBot] ✅ Loaded ${cleanedLoaded.length} past conversations`);
          
          let savedConvId = null;
          try {
            savedConvId = localStorage.getItem('chatbot_last_conversation');
          } catch (_e) {}

          let targetConv = cleanedLoaded.find(c => String(c.id) === String(savedConvId));
          if (!targetConv) {
            targetConv = cleanedLoaded[0];
          }

          setConversations(cleanedLoaded);
          switchingConvRef.current = true;
          setCurrentConversationId(targetConv.id);
          rememberConversationId(targetConv.id);
          setMessages(targetConv.messages || []);
          prevMessagesLengthRef.current = (targetConv.messages || []).length;
          const lastMsg = targetConv.messages && targetConv.messages.length > 0 ? targetConv.messages[targetConv.messages.length - 1] : null;
          prevLastMessageTextRef.current = lastMsg ? (lastMsg.text || lastMsg.content || '') : '';
          setCompactView(true);
          setIsPrivateChat(targetConv.isPrivate || false);
          setTimeout(() => {
            switchingConvRef.current = false;
          }, 300);
        } else {
          // If 0 past conversations, create single initial conversation
          const newId = Date.now().toString();
          const newConv = {
            id: newId,
            title: userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat',
            messages: [],
            isLoading: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPrivate: false,
          };
          setConversations([newConv]);
          switchingConvRef.current = true;
          setCurrentConversationId(newId);
          rememberConversationId(newId);
          setMessages([]);
          prevMessagesLengthRef.current = 0;
          prevLastMessageTextRef.current = '';
          setCompactView(true);
          setIsPrivateChat(false);
          setTimeout(() => {
            switchingConvRef.current = false;
          }, 300);
        }

        setActiveImageFollowUps([]);
        setUploadedImages([]);
        setUploadedFiles([]);
        capturedRefImagesRef.current = [];
      } catch (err) {
        console.error('Error loading conversations:', err);
        createNewConversation();
      }
    };

    loadConversations();
  }, [isAuthenticated, isGuest]);

  // Save conversations whenever they change (to localStorage or backend)
  useEffect(() => {
    const saveConversations = async () => {
      if (conversations.length > 0) {
        try {
          console.log(`[ChatBot] Auto-saving ${conversations.length} conversations. Auth: isAuth=${isAuthenticated}, isGuest=${isGuest}`);
          const result = await ConversationPersistenceService.saveConversations(conversations, isAuthenticated, isGuest);
          console.log(`[ChatBot] Save result:`, result);
        } catch (err) {
          console.error('Error auto-saving conversations:', err);
        }
      }
    };

    const saveTimer = setTimeout(() => {
      saveConversations();
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [conversations, isAuthenticated, isGuest]);


  // Keep the active conversation object in sync with the current messages state (skip during 22ms streaming ticks)
  useEffect(() => {
    if (!currentConversationId) return;
    const isAnyStreaming = messages.some((m) => m && (m.isStreaming || m.isThinking));
    if (isAnyStreaming) return;

    const isSwitching = switchingConvRef.current;
    const currentLen = messages.length;
    const lastMsg = currentLen > 0 ? messages[currentLen - 1] : null;
    const lastText = lastMsg ? (lastMsg.text || lastMsg.content || '') : '';

    const hasNewContent =
      !isSwitching &&
      (currentLen > prevMessagesLengthRef.current || (lastMsg && lastText !== prevLastMessageTextRef.current));

    prevMessagesLengthRef.current = currentLen;
    prevLastMessageTextRef.current = lastText;

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== currentConversationId) return conv;
        return {
          ...conv,
          messages,
          ...(hasNewContent ? { updatedAt: new Date().toISOString() } : {})
        };
      })
    );
  }, [messages, currentConversationId]);


  // ============================================================================
  // 🔄 REAL-TIME MULTI-DEVICE / 2 HP LIVE SYNC ENGINE
  // ============================================================================
  // Beban server 0%: hanya sync saat 1 jawaban selesai (stream_done) & user_ask
  // Dilengkapi animasi mengetik (typewriter) halus di layar HP kedua!
  // ============================================================================
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;

    const unsubscribe = initRealtimeSync({
      isAuthenticated,
      isGuest,
      // 1. User bertanya di HP lain
      onUserAsk: (payload) => {
        if (!payload || !payload.sessionId) return;
        const remoteUserMsg = {
          id: payload.userMessageId || `user_${Date.now()}`,
          sender: 'user',
          text: payload.userQuery,
          timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
          personality: payload.personality || 'mentor'
        };

        const remotePendingBotMsg = {
          id: `bot_live_${payload.sessionId}`,
          sender: 'bot',
          text: '',
          isStreaming: true,
          timestamp: new Date()
        };

        if (currentConversationId === payload.sessionId) {
          setMessages((prev) => {
            const alreadyExists = prev.some(
              (m) =>
                m.id === remoteUserMsg.id ||
                (m.sender === 'user' && m.text === remoteUserMsg.text && Math.abs(new Date(m.timestamp) - new Date(remoteUserMsg.timestamp)) < 5000)
            );
            if (alreadyExists) return prev;
            return [...prev, remoteUserMsg, remotePendingBotMsg];
          });
          setLoading(true);
          setIsSendGenerating(true);
          setTimeout(() => scrollToBottom(true), 80);
        }

        // Update sidebar
        setConversations((prev) => {
          const found = prev.find((c) => c.id === payload.sessionId);
          if (found) {
            const msgs = [...(found.messages || [])];
            if (!msgs.some((m) => m.id === remoteUserMsg.id)) {
              msgs.push(remoteUserMsg);
            }
            return prev.map((c) =>
              c.id === payload.sessionId
                ? { ...c, messages: msgs, updatedAt: payload.timestamp || new Date().toISOString() }
                : c
            );
          } else {
            const newConv = {
              id: payload.sessionId,
              title: payload.userQuery ? payload.userQuery.slice(0, 45) : (userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat'),
              messages: [remoteUserMsg],
              isLoading: false,
              createdAt: payload.timestamp || new Date().toISOString(),
              updatedAt: payload.timestamp || new Date().toISOString(),
              isPrivate: false
            };
            return [newConv, ...prev];
          }
        });
      },

      // 2. Jawaban selesai di HP lain -> Tampilkan dengan animasi mengetik (typewriter)
      onStreamDone: (payload) => {
        if (!payload || !payload.sessionId) return;
        const botMsgId = payload.assistantMsgId || `bot_${Date.now()}`;

        // Jika user sedang aktif melihat percakapan ini -> Mainkan animasi mengetik!
        if (currentConversationId === payload.sessionId) {
          remoteTypewriterRef.current?.cancel();

          // Pastikan bubble pesan bot ada di state
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) => m.id === botMsgId || m.id === `bot_live_${payload.sessionId}` || (m.sender === 'bot' && m.isStreaming)
            );
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], id: botMsgId, isStreaming: true };
              return updated;
            }
            return [
              ...prev,
              {
                id: botMsgId,
                sender: 'bot',
                text: '',
                isStreaming: true,
                timestamp: new Date()
              }
            ];
          });

          // Jalankan animasi typewriter
          remoteTypewriterRef.current = createTypewriter({
            fullText: payload.text || '',
            speedMs: 16,
            onTick: (revealedText, isDone) => {
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === botMsgId || m.id === `bot_live_${payload.sessionId}`);
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = {
                    ...updated[idx],
                    id: botMsgId,
                    text: revealedText,
                    isStreaming: !isDone
                  };
                  return updated;
                }
                return prev;
              });
              scrollToBottom(false);
            },
            onComplete: () => {
              setLoading(false);
              setIsSendGenerating(false);
              isSendGeneratingRef.current = false;
              remoteTypewriterRef.current = null;
              setTimeout(() => scrollToBottom(true), 100);

              // Update ke daftar percakapan
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === payload.sessionId) {
                    const msgs = [...(c.messages || [])];
                    const botIdx = msgs.findIndex((m) => m.id === botMsgId || m.id === `bot_live_${payload.sessionId}`);
                    const finalBotMsg = {
                      id: botMsgId,
                      sender: 'bot',
                      text: payload.text,
                      isStreaming: false,
                      timestamp: new Date()
                    };
                    if (botIdx !== -1) {
                      msgs[botIdx] = finalBotMsg;
                    } else {
                      msgs.push(finalBotMsg);
                    }
                    return {
                      ...c,
                      messages: msgs,
                      updatedAt: payload.updatedAt || new Date().toISOString()
                    };
                  }
                  return c;
                })
              );
            }
          });
        } else {
          // Jika percakapan tidak sedang aktif dibuka, langsung simpan ke list tanpa animasi
          const finalBotMsg = {
            id: botMsgId,
            sender: 'bot',
            text: payload.text,
            isStreaming: false,
            timestamp: new Date()
          };
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === payload.sessionId) {
                const msgs = [...(c.messages || [])];
                const botIdx = msgs.findIndex((m) => m.id === botMsgId || m.id === `bot_live_${payload.sessionId}`);
                if (botIdx !== -1) {
                  msgs[botIdx] = finalBotMsg;
                } else {
                  msgs.push(finalBotMsg);
                }
                return {
                  ...c,
                  messages: msgs,
                  updatedAt: payload.updatedAt || new Date().toISOString()
                };
              }
              return c;
            })
          );
        }
      },

      // 3. Update daftar percakapan dari HP lain
      onConversationsUpdated: async () => {
        try {
          const loaded = await ConversationPersistenceService.loadConversations(isAuthenticated, isGuest);
          if (loaded && Array.isArray(loaded)) {
            setConversations(loaded.filter((c) => c && c.id && c.messages?.length > 0));
          }
        } catch (_e) {}
      },

      // 4. Format database dari HP lain
      onDatabaseFormatted: () => {
        const freshId = Date.now().toString();
        const freshConv = {
          id: freshId,
          title: userLanguage === 'id' ? 'Obrolan AI' : 'AI Chat',
          messages: [],
          isLoading: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPrivate: false
        };
        setConversations([freshConv]);
        setCurrentConversationId(freshId);
        rememberConversationId(freshId);
        setMessages([]);
        try {
          localStorage.removeItem('chatbot_conversations');
          localStorage.removeItem('cached_conversations');
          localStorage.removeItem('chatbot_artifacts');
          localStorage.removeItem('chatbot_last_conversation');
        } catch (_e) {}
        showAlert(
          userLanguage === 'id'
            ? 'Database akun telah diformat fresh dari perangkat lain.'
            : 'Account database formatted fresh from another device.',
          'info'
        );
      },

      // 5. Hapus percakapan dari HP lain
      onConversationDeleted: (payload) => {
        const delSessionId = payload?.sessionId;
        if (delSessionId) {
          setConversations((prev) => prev.filter((c) => c.id !== delSessionId));
          if (currentConversationId === delSessionId) {
            createNewConversation();
          }
        }
      }
    });

    // Catch-up polling cepat saat layar HP dibuka kembali
    const catchUpSync = async () => {
      if (!isAuthenticated || isGuest || isSendGeneratingRef.current) return;
      try {
        const activeId = currentConversationId;
        const res = await fetch(`/api/realtime/sync-poll?activeSessionId=${encodeURIComponent(activeId || '')}`, {
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        if (activeId && Array.isArray(data.activeMessages) && data.activeMessages.length > 0) {
          setMessages((prev) => {
            if (!isSendGeneratingRef.current && data.activeMessages.length >= prev.length) {
              const prevLast = prev[prev.length - 1];
              const srvLast = data.activeMessages[data.activeMessages.length - 1];
              if (!prevLast || prev.length !== data.activeMessages.length || (srvLast && prevLast.text !== srvLast.text)) {
                return data.activeMessages;
              }
            }
            return prev;
          });
        }
      } catch (_e) {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') catchUpSync();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      unsubscribe();
      remoteTypewriterRef.current?.cancel();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [isAuthenticated, isGuest, currentConversationId]);

  const lastLoadedConversationIdRef = useRef(null);

  // Auto-scroll to bottom only when a conversation is explicitly loaded or switched
  useEffect(() => {
    if (!currentConversationId || messages.length === 0) return;
    if (lastLoadedConversationIdRef.current === currentConversationId) return;
    lastLoadedConversationIdRef.current = currentConversationId;

    // Never auto-scroll to bottom during an active chat turn, generation, or when locked to user ask
    if (isGenerating || isSendGeneratingRef.current || isProcessingRef.current || isLockedToUserAskRef.current) return;

    const scrollTimer = setTimeout(() => {
      if (!isGenerating && !isSendGeneratingRef.current && !isProcessingRef.current && !isLockedToUserAskRef.current) {
        scrollToBottom(true);
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [currentConversationId]);

  // Preload external RAG index from public/rag_index.json when the app mounts
  useEffect(() => {
    const preloadRagIndex = async () => {
      try {
        await ragService.tryLoadRemoteIndex();
      } catch (err) {
        console.debug('RAG preload failed:', err);
      }
    };

    preloadRagIndex();
  }, []);

  // Detect user location and language according to strict country rules:
  // - ID -> 'id'
  // - CN/TW/HK/MO -> 'zh'
  // - All other countries -> strictly 'en' (never Indonesian)
  useEffect(() => {
    let isMounted = true;
    detectLanguageAsync().then((lang) => {
      if (isMounted && lang) {
        setUserLanguage(lang);
      }
    });

    const handleLanguageChanged = (e) => {
      const nextLang = e?.detail?.language;
      if (nextLang) {
        setUserLanguage(nextLang);
      }
    };
    window.addEventListener('deepernova_language_changed', handleLanguageChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('deepernova_language_changed', handleLanguageChanged);
    };
  }, []);

  // ==========================================
  // AI AGENT & SLASH COMMAND INTEGRATION
  // ==========================================
  const SLASH_COMMANDS = [
    { command: '/brainstorm', desc_id: 'Ganti ke Mode Brainstorming (Diskusi & Ide)', desc_en: 'Switch to Brainstorming Mode (General Chat)' },
    { command: '/agent', desc_id: 'Ganti ke Mode AI Agent (Eksekusi Dokumen)', desc_en: 'Switch to AI Agent Mode (Document Copilot)' },
    { command: '/buatfile', desc_id: 'Buat berkas dokumen baru (Word/Excel/PPT)', desc_en: 'Create a new document, spreadsheet, or slide' },
    { command: '/editfile', desc_id: 'Buka dan sunting berkas yang ada', desc_en: 'Open and edit an existing document' },
    { command: '/perbaiki', desc_id: 'Modifikasi / perbaiki isi berkas aktif', desc_en: 'Modify or edit lines in the active document' },
    { command: '/files', desc_id: 'Lihat daftar berkas di Workspace Cloud', desc_en: 'List files in your cloud workspace' }
  ];

  const fetchWorkspaceFiles = async () => {
    try {
      const response = await fetch('/api/cloud/files', { credentials: 'include' });
      if (!response.ok) return;
      const text = await response.text();
      if (!text || text.trim().startsWith('<')) return;
      const data = JSON.parse(text);
      if (data.success && data.files) {
        setWorkspaceFiles(data.files);
      }
    } catch (error) {
      console.warn('Workspace files fetch skipped (non-JSON response):', error.message);
    }
  };

  const selectActiveFile = async (file) => {
    try {
      const response = await fetch(`/api/cloud/files/${file.id}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.file) {
        setActiveFile(data.file);
        setAiMode('agent');
        showAlert(userLanguage === 'id' ? `Berkas "${data.file.name}" aktif` : `File "${data.file.name}" active`, 'info');
      } else {
        showAlert(userLanguage === 'id' ? 'Gagal memuat berkas.' : 'Failed to load file.', 'error');
      }
    } catch (error) {
      console.error('Error loading cloud file:', error);
      showAlert(userLanguage === 'id' ? 'Gagal memuat berkas.' : 'Failed to load file.', 'error');
    }
  };

  const handleExecuteCommand = async (fullCommand) => {
    const parts = fullCommand.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ').trim();
    
    // Add user message to display
    const userMsg = {
      id: Date.now(),
      text: fullCommand,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    if (globalThis.textareaRef) {
      globalThis.textareaRef.style.height = 'auto';
    }

    const addBotMessage = (text, isAgentLog = false) => {
      const id = Date.now() + Math.random();
      setMessages(prev => [...prev, {
        id,
        text,
        sender: 'bot',
        timestamp: new Date(),
        isAgentLog
      }]);
      return id;
    };

    if (command === '/brainstorm') {
      setAiMode('brainstorm');
      addBotMessage(userLanguage === 'id' 
        ? '🧠 Mode berganti ke **Brainstorming**. Mari berdiskusi bebas, mencari ide, atau riset web.'
        : '🧠 Switched to **Brainstorming Mode**. Let\'s brainstorm, discuss, or run web searches.');
      return;
    }

    if (command === '/agent') {
      setAiMode('agent');
      addBotMessage(userLanguage === 'id'
        ? '🤖 Mode berganti ke **AI Agent (Copilot Dokumen)**. Anda dapat membuat berkas dengan `/buatfile [nama]` atau memperbaikinya dengan `/perbaiki [instruksi]`.'
        : '🤖 Switched to **AI Agent Mode (Document Copilot)**. You can now create files with `/buatfile [name]` or fix/edit with `/perbaiki [instructions]`.');
      fetchWorkspaceFiles();
      return;
    }

    if (command === '/files') {
      setIsAgentExecuting(true);
      setAgentLogs(['🔍 Membaca direktori workspace cloud...']);
      try {
        const response = await fetch('/api/cloud/files', { credentials: 'include' });
        const data = await response.json();
        if (data.success && data.files) {
          setWorkspaceFiles(data.files);
          setAgentLogs(prev => [...prev, `✅ Berkas berhasil di-scan.`]);
          
          const fileLines = data.files.map(f => {
            const icon = f.type === 'excel' ? '📊' : f.type === 'pptx' ? '🎦' : '📄';
            return `- ${icon} **${f.name}** (Tipe: ${f.type}) - ${new Date(f.updatedAt).toLocaleString()}`;
          }).join('\n');
          
          setTimeout(() => {
            addBotMessage(userLanguage === 'id'
              ? `### 📁 Daftar Berkas Workspace Cloud\n\n${fileLines || '_Belum ada berkas di workspace ini._'}`
              : `### 📁 Cloud Workspace Files\n\n${fileLines || '_No files created yet in this workspace._'}`);
            setIsAgentExecuting(false);
          }, 600);
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Gagal memuat berkas: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }

    if (command === '/editfile') {
      if (!args) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Harap tentukan nama file yang ingin sunting. Contoh: `/editfile laporan.docx`'
          : '❌ Please specify the file name you want to open. Example: `/editfile report.docx`');
        return;
      }
      
      setIsAgentExecuting(true);
      setAgentLogs([`🔍 Mencari berkas "${args}"...`]);
      
      try {
        const response = await fetch('/api/cloud/files', { credentials: 'include' });
        const data = await response.json();
        const found = data.files?.find(f => f.name.toLowerCase() === args.toLowerCase() || f.name.toLowerCase().replace(/\.[^/.]+$/, "") === args.toLowerCase());
        
        if (found) {
          setAgentLogs(prev => [...prev, `📂 Berkas ditemukan! Memuat konten berkas...`]);
          const detailRes = await fetch(`/api/cloud/files/${found.id}`, { credentials: 'include' });
          const detailData = await detailRes.json();
          if (detailData.success && detailData.file) {
            setActiveFile(detailData.file);
            setAiMode('agent');
            setAgentLogs(prev => [...prev, `✅ Berkas "${detailData.file.name}" berhasil dibuka.`]);
            setTimeout(() => {
              addBotMessage(userLanguage === 'id'
                ? `📂 Berkas **${detailData.file.name}** berhasil dibuka di panel Agent Workspace!`
                : `📂 File **${detailData.file.name}** successfully loaded into the Agent Workspace!`);
              setIsAgentExecuting(false);
            }, 800);
          } else {
            throw new Error('Gagal memuat detail berkas');
          }
        } else {
          setAgentLogs(prev => [...prev, `❌ Berkas "${args}" tidak ditemukan.`]);
          addBotMessage(userLanguage === 'id'
            ? `❌ Berkas dengan nama atau pola **"${args}"** tidak ditemukan di workspace cloud. Gunakan perintah \`/files\` untuk melihat daftar berkas.`
            : `❌ File matching **"${args}"** was not found. Use \`/files\` to list files.`);
          setIsAgentExecuting(false);
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Kesalahan: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }

    if (command === '/buatfile') {
      if (!args) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Harap sertakan nama file dan deskripsi/topik. Contoh: `/buatfile Rencana_Bisnis.docx membuat rencana bisnis startup`'
          : '❌ Please specify file name and description. Example: `/buatfile Business_Plan.docx startup plans`');
        return;
      }
      
      const spaceIdx = args.indexOf(' ');
      const filename = spaceIdx > 0 ? args.substring(0, spaceIdx) : args;
      const topic = spaceIdx > 0 ? args.substring(spaceIdx + 1) : (userLanguage === 'id' ? 'Dokumen kosong' : 'Empty document');
      
      let fileType = 'docx';
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.toLowerCase().includes('excel') || filename.toLowerCase().includes('sheet')) {
        fileType = 'excel';
      } else if (filename.endsWith('.pptx') || filename.endsWith('.ppt') || filename.toLowerCase().includes('slide') || filename.toLowerCase().includes('presentasi')) {
        fileType = 'pptx';
      }
      
      const finalFilename = filename.includes('.') ? filename : `${filename}.${fileType}`;
      
      setIsAgentExecuting(true);
      setAgentLogs([
        `⚙️ Menentukan parameter untuk berkas "${finalFilename}"...`,
        `🧠 Mengirim instruksi ke Deepernova AI Agent untuk draf awal tentang "${topic}"...`
      ]);
      
      try {
        const prompt = `Buat draf isi dokumen awal tentang "${topic}" untuk jenis dokumen "${fileType}". Format output harus sesuai tipe dokumen:
        - Jika "docx": Tulis konten HTML bersih (tag h1, h2, p, ul, li) dibungkus tag [CONTENT_START] dan [CONTENT_END].
        - Jika "pptx": Tulis JSON array slide [{ "id": 1, "type": "slide", "title": "...", "content": "..." }] dibungkus tag [CONTENT_START] dan [CONTENT_END].
        - Jika "excel": Tulis JSON array 2D [[ "Header1", "Header2" ], [ "Row1Col1", "Row1Col2" ]] dibungkus tag [CONTENT_START] dan [CONTENT_END].`;
        
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            model: 'llama-4-maverick',
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            max_tokens: 1024
          })
        });
        
        const resData = await response.json();
        const aiResponseText = resData.choices?.[0]?.message?.content || '';
        
        setAgentLogs(prev => [...prev, `📝 Menerima draf konten dari AI. Memproses parsing data...`]);
        
        const contentMatch = aiResponseText.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
        let parsedContent = null;
        const rawContent = contentMatch ? contentMatch[1].trim() : aiResponseText.trim();
        
        if (fileType === 'docx') {
          parsedContent = [{ id: Date.now(), type: 'html', text: rawContent }];
        } else if (fileType === 'pptx') {
          try {
            parsedContent = JSON.parse(rawContent);
          } catch {
            parsedContent = [
              { id: 1, type: 'slide', title: 'Judul Presentasi', content: topic, notes: '' },
              { id: 2, type: 'slide', title: 'Pendahuluan', content: 'Draf otomatis presentasi', notes: '' }
            ];
          }
        } else if (fileType === 'excel') {
          try {
            const rawTable = JSON.parse(rawContent);
            parsedContent = {
              excelSheets: [{ name: 'Sheet1', data: rawTable }],
              activeSheet: 0
            };
          } catch {
            parsedContent = {
              excelSheets: [{ name: 'Sheet1', data: [['Kolom 1', 'Kolom 2'], ['Data 1', 'Data 2']] }],
              activeSheet: 0
            };
          }
        }
        
        setAgentLogs(prev => [...prev, `💾 Menyimpan berkas ke database cloud...`]);
        
        const saveRes = await fetch('/api/cloud/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: null,
            parentId: null,
            name: finalFilename,
            type: fileType,
            content: parsedContent
          })
        });
        const saveResult = await saveRes.json();
        
        if (saveResult.success && saveResult.file) {
          setAgentLogs(prev => [...prev, `✅ Berkas "${finalFilename}" berhasil dibuat!`]);
          setActiveFile(saveResult.file);
          setAiMode('agent');
          fetchWorkspaceFiles();
          
          setTimeout(() => {
            addBotMessage(userLanguage === 'id'
              ? `✨ Berkas baru **${finalFilename}** berhasil dibuat tentang topik *"${topic}"*. Berkas sekarang aktif di Workspace Agent.`
              : `✨ New file **${finalFilename}** successfully created about *"${topic}"*. The file is now active in the Agent Workspace.`);
            setIsAgentExecuting(false);
          }, 800);
        } else {
          throw new Error(saveResult.error || 'Database save failed');
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Kegagalan pembuatan berkas: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }

    if (command === '/perbaiki') {
      if (!activeFile) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Tidak ada berkas aktif saat ini. Buka berkas terlebih dahulu menggunakan `/editfile [nama]` atau buat berkas baru dengan `/buatfile [nama]`.'
          : '❌ No active file loaded. Open a file first using `/editfile [name]` or create a new one with `/buatfile [name]`.');
        return;
      }
      if (!args) {
        addBotMessage(userLanguage === 'id'
          ? '❌ Harap berikan instruksi perbaikan. Contoh: `/perbaiki tambahkan paragraf baru tentang kesimpulan`'
          : '❌ Please specify editing instructions. Example: `/perbaiki add a new paragraph about conclusions`');
        return;
      }
      
      setIsAgentExecuting(true);
      setAgentLogs([
        `⚙️ Membaca konten berkas "${activeFile.name}"...`,
        `🧠 Mengirim konten dan instruksi perbaikan ke Deepernova AI Agent...`
      ]);
      
      try {
        const fileContentString = JSON.stringify(activeFile.content);
        const prompt = `Kamu adalah Deepernova AI Agent. Tugasmu adalah memodifikasi konten dokumen berikut sesuai dengan instruksi pengguna.
        
Konten dokumen saat ini:
${fileContentString}

Tipe dokumen: ${activeFile.type}
Instruksi perbaikan: "${args}"

TOLONG kembalikan konten dokumen yang sudah dimodifikasi secara utuh, menggunakan struktur JSON yang sama persis seperti aslinya.
- Jika tipenya docx: Formatnya harus tetap array of html block [{ "id": 1, "type": "html", "text": "HTML_BARU" }]. Harap perbaiki kode HTML-nya langsung.
- Jika tipenya pptx: Formatnya harus tetap array of slide [{ "id": 1, "type": "slide", "title": "Judul Baru", "content": "Konten Baru" }].
- Jika tipenya excel: Formatnya harus tetap object { excelSheets: [...], activeSheet: 0 }.

Bungkus hasil modifikasi final Anda di dalam tag [CONTENT_START] dan [CONTENT_END]. Jangan menambahkan teks penjelasan di luar tag tersebut.`;

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            model: 'llama-4-maverick',
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            max_tokens: 1024
          })
        });
        
        const resData = await response.json();
        const aiResponseText = resData.choices?.[0]?.message?.content || '';
        
        setAgentLogs(prev => [...prev, `📝 Menerima hasil pembaruan dari AI. Memproses parsing data...`]);
        
        const contentMatch = aiResponseText.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
        const rawContent = contentMatch ? contentMatch[1].trim() : aiResponseText.trim();
        
        let updatedContent = JSON.parse(rawContent);
        
        setAgentLogs(prev => [...prev, `💾 Menyimpan perubahan berkas ke database cloud...`]);
        
        const saveRes = await fetch('/api/cloud/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeFile.id,
            parentId: activeFile.parentId,
            name: activeFile.name,
            type: activeFile.type,
            content: updatedContent
          })
        });
        const saveResult = await saveRes.json();
        
        if (saveResult.success && saveResult.file) {
          setAgentLogs(prev => [...prev, `✅ Perubahan berhasil disimpan!`]);
          setActiveFile(saveResult.file);
          fetchWorkspaceFiles();
          
          setTimeout(() => {
            addBotMessage(userLanguage === 'id'
              ? `✍️ Berkas **${activeFile.name}** berhasil dimodifikasi sesuai instruksi: *"${args}"*.`
              : `✍️ File **${activeFile.name}** successfully modified with instructions: *"${args}"*.`);
            setIsAgentExecuting(false);
          }, 800);
        } else {
          throw new Error(saveResult.error || 'Save failed');
        }
      } catch (err) {
        setAgentLogs(prev => [...prev, `❌ Kegagalan memodifikasi berkas: ${err.message}`]);
        setIsAgentExecuting(false);
      }
      return;
    }
  };

  useEffect(() => {
    if (aiMode === 'agent') {
      fetchWorkspaceFiles();
    }
  }, [aiMode]);

  useEffect(() => {
    if (inputValue.startsWith('/')) {
      const parts = inputValue.split(' ');
      if (parts.length === 1) {
        setShowSlashMenu(true);
        setSlashSelectedIndex(0);
      } else {
        setShowSlashMenu(false);
      }
    } else {
      setShowSlashMenu(false);
    }
  }, [inputValue]);

  // Pre-fetch files on mount
  useEffect(() => {
    fetchWorkspaceFiles();
  }, []);

  // Detect scroll position untuk show/hide scroll to bottom button
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    
    if (!messagesContainer) return; // Early return jika container belum ready
    
    const getIsAtMessageBottom = () => {
      const allMessages = messagesContainer.querySelectorAll('.message');
      const lastMsg = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
      if (lastMsg) {
        const containerRect = messagesContainer.getBoundingClientRect();
        const msgRect = lastMsg.getBoundingClientRect();
        // If bottom of last message is visible above the bottom input bar (within 130px):
        return (msgRect.bottom - containerRect.bottom) <= 130;
      }
      const distanceFromBottom = 
        messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
      return distanceFromBottom < 120;
    };

    const handleScroll = () => {
      try {
        const isAtBottom = getIsAtMessageBottom();
        setIsScrolledUp(!isAtBottom);

        if (isAtBottom) {
          holdScrollRef.current = false;
        }

        if (!programmaticScrollRef.current) {
          stopGlide();
        }
      } catch (_err) {
        console.log('Scroll handler error:', _err);
      }
    };

    const handleWheel = (_e) => {
      try {
        stopGlide();

        if (Math.abs(_e.deltaY) > 2) {
          isLockedToUserAskRef.current = false;
        }

        if (_e.deltaY < 0) {
          holdScrollRef.current = true;
          setIsScrolledUp(true);
        } else if (_e.deltaY > 0) {
          const isAtBottom = getIsAtMessageBottom();
          if (isAtBottom) {
            holdScrollRef.current = false;
            setIsScrolledUp(false);
          }
        }
      } catch (_err) {
        // ignore
      }
    };

    const handleTouchMove = () => {
      // User manually drags/swipes on touch screen
      isLockedToUserAskRef.current = false;
      stopGlide();
    };

    messagesContainer.addEventListener('scroll', handleScroll, { passive: true });
    messagesContainer.addEventListener('wheel', handleWheel, { passive: true });
    messagesContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    // Triple-click to jump to bottom
    const handleTripleClick = () => {
      scrollToBottom(true);
    };
    messagesContainer.addEventListener('triple-click', handleTripleClick);
    
    // Custom triple-click detection using click events (more reliable than mousedown)
    let clickCount = 0;
    let clickTimer = null;
    const handleClick = (e) => {
      clickCount++;
      
      if (clickCount === 1) {
        // Start timer for triple-click window
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 300);
      }
      
      if (clickCount === 3) {
        e.preventDefault();
        clearTimeout(clickTimer);
        clickCount = 0;
        scrollToBottom(true);
      }
    };
    messagesContainer.addEventListener('click', handleClick);
    
    return () => {
      try {
        messagesContainer.removeEventListener('scroll', handleScroll);
        messagesContainer.removeEventListener('wheel', handleWheel);
        messagesContainer.removeEventListener('touchmove', handleTouchMove);
        messagesContainer.removeEventListener('triple-click', handleTripleClick);
        messagesContainer.removeEventListener('click', handleClick);
      } catch (_err) {
        console.log('Remove scroll listener error:', _err);
      }
    };
  }, []);



  // Helper: Set loading state for current conversation
  const setConvLoading = (isLoadingNow) => {
    setLoading(isLoadingNow); // Keep global loading for overall UI
    if (!isLoadingNow) {
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      setLoadingPhase(null);
      clearLoadingPhaseTimers();
      // ALWAYS clear message streaming/generating flags when stopping/finished
      setMessages((prev) =>
        prev.map((msg) =>
          (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating || msg.isReasoning)
            ? {
                ...msg,
                isStreaming: false,
                isThinking: false,
                isSearching: false,
                isRecallingMemory: false,
                isImageGenerating: false,
                isReasoning: false
              }
            : msg
        )
      );
      // ALWAYS clear isLoading on all conversations when loading finishes
      setConversations((prev) =>
        prev.map((c) => (c.isLoading ? { ...c, isLoading: false } : c))
      );
    } else if (currentConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId 
            ? { ...c, isLoading: true }
            : c
        )
      );
    }
  };

  // Helper: Derived active generating state - single source of truth from messages & generation flags
  const isBotResponding = (loading || isGenerating) && messages.some(
    (msg) => msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating)
  );

  // Helper: Get loading state for current conversation (instantly true the moment user sends, true while generating)
  const getConvLoading = () => {
    if (isSendGenerating || isSendGeneratingRef.current) return true;
    if (generatingGreeting) return true;
    return messages.some(
      (msg) => msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating)
    );
  };

  // Memoized Active Conversation & Title
  const activeConv = useMemo(() => {
    return conversations.find(c => c.id === currentConversationId);
  }, [conversations, currentConversationId]);

  const activeConvTitle = useMemo(() => {
    if (activeConv?.title) return activeConv.title;
    if (messages.length > 0) {
      const firstUser = messages.find(m => m.sender === 'user' || m.role === 'user');
      if (firstUser?.text) return firstUser.text.slice(0, 32);
    }
    return userLanguage === 'id' ? 'Tanya Deepernova AI' : 'Ask Deepernova AI';
  }, [activeConv, messages, userLanguage]);

  // Extract latest AI message for live agentic step parsing
  const latestAiMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'ai' || messages[i].sender === 'bot' || messages[i].role === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const isConvSearching = useMemo(() => {
    return messages.some(m => m.isSearching);
  }, [messages]);

  const agenticSteps = useMemo(() => {
    const text = latestAiMessage?.text || latestAiMessage?.content || '';
    const sources = latestAiMessage?.searchSources || foundSources;
    const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
    const userPrompt = lastUserMessage?.text || lastUserMessage?.content || '';
    return extractAgenticSteps(text, getConvLoading(), isConvSearching, sources, userPrompt);
  }, [latestAiMessage, messages, isConvSearching, foundSources]);

  const activeSources = useMemo(() => {
    if (latestAiMessage?.searchSources && latestAiMessage.searchSources.length > 0) {
      return latestAiMessage.searchSources;
    }
    return foundSources || [];
  }, [latestAiMessage, foundSources]);

  const handleShareConv = () => {
    setShowConvMenu(false);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href);
      }
      showAlert(
        userLanguage === 'id' ? '🔗 Tautan obrolan disalin ke papan klip!' : '🔗 Chat link copied to clipboard!',
        'success',
        3000
      );
    } catch (err) {
      showAlert('Tautan obrolan siap dibagikan.', 'info', 3000);
    }
  };

  const handleExportConv = () => {
    setShowConvMenu(false);
    if (!messages || messages.length === 0) {
      showAlert(userLanguage === 'id' ? 'Belum ada pesan untuk diekspor' : 'No messages to export', 'warning', 3000);
      return;
    }
    const textData = messages.map(m => `[${m.sender === 'user' ? 'Anda' : 'Deepernova AI'}]:\n${m.text || m.content || ''}\n\n`).join('---\n\n');
    const blob = new Blob([textData], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeConvTitle || 'obrolan').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert(userLanguage === 'id' ? '📥 Obrolan berhasil diekspor!' : '📥 Chat exported successfully!', 'success', 3000);
  };

  const handleDeleteActiveConv = () => {
    setShowConvMenu(false);
    if (currentConversationId) {
      deleteConversation(currentConversationId);
    }
  };

  const startPrivateChat = () => {
    setShowPrivateModal(false);
    const newId = `private_${Date.now()}`;
    const _newConv = {
      id: newId,
      title: '🔒 Private Chat',
      messages: [],
      isLoading: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: true,
    };
    // Add to state only, not to saved conversations
    setCurrentConversationId(newId);
    setMessages([]);
    setIsPrivateChat(true);
    setError(null);
    setCompactView(true);
  };

  // Switch conversation
  const switchConversation = (convId) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      remoteTypewriterRef.current?.finishNow();
      deepernovaTtsService.stop();
      deepernovaTtsService.clearCache();
      playingMessageIdRef.current = null;
      setPlayingMessageId(null);
      streamingSeenIdsRef.current.clear();
      autoSpokenIdsRef.current.clear();
      if (autoVoiceTimerRef.current) {
        clearTimeout(autoVoiceTimerRef.current);
        autoVoiceTimerRef.current = null;
      }
      switchingConvRef.current = true;
      const convMsgs = conv.messages || [];
      const imageCount = convMsgs.reduce((sum, msg) => sum + (msg.images?.length || 0), 0);
      console.log(`[ChatBot] Switching to conversation "${conv.title}" (${convMsgs.length} messages, ${imageCount} images)`);
      
      setCurrentConversationId(convId);
      setMessages(convMsgs);
      currentConversationHistoryRef.current = convMsgs;
      lastSentPromptRef.current = '';
      lastSentUserMessageIdRef.current = null;
      lastSentUserInputTextRef.current = '';
      prevMessagesLengthRef.current = convMsgs.length;
      const lastMsg = convMsgs.length > 0 ? convMsgs[convMsgs.length - 1] : null;
      prevLastMessageTextRef.current = lastMsg ? (lastMsg.text || lastMsg.content || '') : '';

      setError(null);
      setCompactView(true);
      rememberConversationId(convId);
      isLockedToUserAskRef.current = false;
      lockedUserMessageIdRef.current = null;
      
      setTimeout(() => {
        switchingConvRef.current = false;
        scrollToBottom(true);
      }, 150);
    }
  };

  const handleSearchResultClick = (conversationId, messageId) => {
    switchConversation(conversationId);
    setCompactView(false);
    setSidebarOpen(false);
    
    setTimeout(() => {
      const element = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('search-message-highlight');
        setTimeout(() => {
          element.classList.remove('search-message-highlight');
        }, 3000);
      }
    }, 400);
  };

  // Delete conversation
  const deleteConversation = async (convId) => {
    // Show confirmation dialog first
    setDeleteConfirmConvId(convId);
    setShowDeleteConfirm(true);
  };

  // Confirm and execute deletion
  const confirmDeleteConversation = async (convId) => {
    const apiBaseUrl = API_BASE_URL;

    // Show loading state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, isDeleting: true, isLoading: true } : c
      )
    );

    if (isAuthenticated && !isGuest) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/conversations/${convId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('Failed to delete conversation from backend:', response.status);
          setCustomAlert({
            type: 'error',
            message: 'Failed to delete session. Please try again.'
          });
          // Reset loading state on failure
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId ? { ...c, isDeleting: false, isLoading: false } : c
            )
          );
          setShowDeleteConfirm(false);
          setDeleteConfirmConvId(null);
          return;
        }
      } catch (err) {
        console.error('Error deleting conversation from backend:', err);
        setCustomAlert({
          type: 'error',
          message: 'Error deleting session: ' + err.message
        });
        // Reset loading state on error
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, isDeleting: false, isLoading: false } : c
          )
        );
        setShowDeleteConfirm(false);
        setDeleteConfirmConvId(null);
        return;
      }
    }

    // Remove from conversations list
    const remaining = conversations.filter((c) => c.id !== convId);
    setConversations(remaining);

    // Show success feedback
    setCustomAlert({
      type: 'success',
      message: 'Session deleted successfully'
    });

    // Switch to another conversation if current one was deleted
    if (currentConversationId === convId) {
      if (remaining.length > 0) {
        switchConversation(remaining[0].id);
      } else {
        createNewConversation();
      }
    }

    // Close confirmation modal
    setShowDeleteConfirm(false);
    setDeleteConfirmConvId(null);
  };

  // Handle file upload and parsing directly on client-side (supports PDF, DOCX, XLSX, XLS, PPTX, CSV, JSON, TXT, Code, etc.)
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parseResult = await ClientFileParser.parseFile(file);
        const content = parseResult.content;
        const sizeKB = parseResult.meta.sizeKB;
        const tokenEstimate = parseResult.meta.tokenEstimate;

        // Store in memory
        memoryService.addMemory(
          {
            content: content,
            type: 'file_content',
            weight: 2
          },
          currentConversationId,
          userLanguage
        );

        // Add to uploaded files list
        const newFile = {
          id: `file_${Date.now()}_${i}`,
          name: file.name,
          size: sizeKB,
          tokens: tokenEstimate,
          content: content,
          fileType: parseResult.fileType
        };

        setUploadedFiles(prev => [...prev, newFile]);

        showAlert(
          userLanguage === 'id'
            ? `✅ "${file.name}" dibaca (${sizeKB}KB · ~${tokenEstimate} token)`
            : `✅ "${file.name}" read (${sizeKB}KB · ~${tokenEstimate} tokens)`,
          'success',
          3000
        );
      } catch (error) {
        console.error('Frontend file upload parse error:', error);
        showAlert(`❌ ${error?.message || 'Gagal membaca file'}`, 'error', 3500);
      }
    }

    if (e.target) {
      e.target.value = '';
    }
    if (window.fileUploadInput) {
      window.fileUploadInput.value = '';
    }
  };

  // Remove file from uploaded list
  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Clear all uploaded files and images
  const clearAllAttachments = () => {
    setUploadedFiles([]);
    setUploadedImages([]);
  };

  const uploadImageToServer = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const uploadUrl = `${apiBaseUrl}/api/vision/upload`;
    console.log('[ChatBot] Upload image to server:', uploadUrl, file.name, file.type, file.size);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('[ChatBot] Image upload response error:', response.status, errorData);
      throw new Error(errorData?.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  };

  // Handle image upload from file input or camera file object
  const handleImageUpload = async (e) => {
    if (currentModelObj?.supportsVision === false) {
      alert(userLanguage === 'id'
        ? `Model ${currentModelObj.name} berbasis teks dan tidak mendukung analisis gambar. Silakan pilih model lain jika ingin mengunggah gambar.`
        : `The ${currentModelObj.name} model is text-only and does not support image analysis. Please select another model to upload images.`);
      return;
    }
    const rawFiles = e?.target?.files || e?.files || (e instanceof File ? [e] : []);
    const files = Array.from(rawFiles);
    if (!files.length) return;

    for (const file of files) {
      try {
        // Validate image type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validImageTypes.includes(file.type)) {
          alert(userLanguage === 'id' 
            ? '❌ Format gambar tidak didukung. Gunakan: JPG, PNG, WebP, GIF'
            : '❌ Image format not supported. Use: JPG, PNG, WebP, GIF');
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(userLanguage === 'id' 
            ? '❌ Gambar terlalu besar (max 10MB)'
            : '❌ Image too large (max 10MB)');
          continue;
        }

        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const rawBase64 = evt.target.result;

          // Compress image to max 768x768 JPEG (80% quality) to avoid huge base64 payloads
          const compressImage = (dataUrl) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const MAX = 768;
              let { width, height } = img;
              if (width > MAX || height > MAX) {
                if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
                else { width = Math.round((width * MAX) / height); height = MAX; }
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              canvas.getContext('2d').drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(dataUrl); // fallback original
            img.src = dataUrl;
          });

          const base64Data = await compressImage(rawBase64);
          console.log(`[ChatBot] Image compressed: ${Math.round(rawBase64.length/1024)}KB -> ${Math.round(base64Data.length/1024)}KB`);

          const newImage = {
            id: imageId,
            fileName: file.name,
            dataUrl: base64Data,
            publicUrl: null,
            status: 'uploading',
            analysis: null,
            error: null,
            followUpRemaining: 20,
          };

          setUploadedImages(prev => [...prev, newImage]);
          setAttachmentQueueMinimized(false);

          let gotPublicUrl = false;
          try {
            const uploadResult = await uploadImageToServer(file);
            setUploadedImages(prev => prev.map(img => 
              img.id === imageId
                ? { ...img, publicUrl: uploadResult.url, status: 'analyzed' }
                : img
            ));
            gotPublicUrl = true;
          } catch (uploadError) {
            console.log('[ChatBot] Server upload offline — using compressed base64 dataUrl for vision:', uploadError.message);
            setUploadedImages(prev => prev.map(img => 
              img.id === imageId
                ? { ...img, status: 'analyzed', isLocal: true }
                : img
            ));
          }

          // Auto-save uploaded image to "Gambar Saya" (works for both local mode and logged-in mode)
          saveImageToGallery({
            id: imageId,
            prompt: `Unggahan: ${file.name}`,
            imageUrl: gotPublicUrl ? uploadResult.url : base64Data,
            type: 'uploaded',
            model: 'user-upload'
          }, isAuthenticated, user).catch(e => console.warn('[ChatBot] Auto-save uploaded image error:', e));

          setCustomAlert({
            type: 'success',
            message: userLanguage === 'id' 
              ? `📸 Gambar "${file.name}" siap${gotPublicUrl ? '' : ' (Mode Lokal)'}`
              : `📸 Image "${file.name}" ready${gotPublicUrl ? '' : ' (Local Mode)'}`,
            duration: 2000
          });
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[ChatBot] Image upload error:', error);
        setCustomAlert({
          type: 'error',
          message: userLanguage === 'id' ? '❌ Error upload gambar' : '❌ Image upload error',
          duration: 3000
        });
      }
    }

    if (window.imageUploadInput) window.imageUploadInput.value = '';
    if (window.cameraCaptureInput) window.cameraCaptureInput.value = '';
  };

  // Remove uploaded image
  const removeUploadedImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };



  // Save/load uploaded images from localStorage safely
  useEffect(() => {
    if (!currentConversationId) return;
    
    // Save to localStorage safely without crashing UI
    const storageKey = `deepernova_images_${currentConversationId}`;
    if (uploadedImages.length > 0) {
      try {
        const lightImages = uploadedImages.map(img => {
          const { dataUrl, ...rest } = img;
          return {
            ...rest,
            dataUrl: (dataUrl && dataUrl.length < 2000000) ? dataUrl : null
          };
        });
        localStorage.setItem(storageKey, JSON.stringify(lightImages));
      } catch (err) {
        console.warn('[ChatBot] Prevented QuotaExceededError crash saving uploadedImages:', err.message);
      }
    } else {
      try {
        localStorage.removeItem(storageKey);
      } catch (_e) {}
    }
  }, [uploadedImages, currentConversationId]);

  useEffect(() => {
    if (!currentConversationId) return;

    const activeKey = `deepernova_active_images_${currentConversationId}`;
    if (activeImageFollowUps.length > 0) {
      try {
        localStorage.setItem(activeKey, JSON.stringify(activeImageFollowUps));
      } catch (err) {
        console.warn('[ChatBot] Prevented QuotaExceededError crash saving active followups:', err.message);
      }
    } else {
      try {
        localStorage.removeItem(activeKey);
      } catch (_e) {}
    }
  }, [activeImageFollowUps, currentConversationId]);

  // Load uploaded images from localStorage when conversation changes
  useEffect(() => {
    if (!currentConversationId) return;
    
    // Always clear ref-based image state when conversation changes to prevent cross-session leaks
    capturedRefImagesRef.current = [];

    const storageKey = `deepernova_images_${currentConversationId}`;
    const savedImages = localStorage.getItem(storageKey);
    if (savedImages) {
      try {
        const parsedImages = JSON.parse(savedImages);
        setUploadedImages(parsedImages);
      } catch (error) {
        console.error('[ChatBot] Error loading saved images:', error);
      }
    } else {
      setUploadedImages([]);
    }

    const activeKey = `deepernova_active_images_${currentConversationId}`;
    const savedActive = localStorage.getItem(activeKey);
    if (savedActive) {
      try {
        const parsedActive = JSON.parse(savedActive);
        setActiveImageFollowUps(Array.isArray(parsedActive) ? parsedActive : []);
      } catch (error) {
        console.error('[ChatBot] Error loading active image follow-ups:', error);
        setActiveImageFollowUps([]);
      }
    } else {
      setActiveImageFollowUps([]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (uploadedFiles.length + uploadedImages.length > 0) {
      setAttachmentQueueMinimized(false);
    }
  }, [uploadedFiles.length, uploadedImages.length, currentConversationId]);

  // Handle customAlert auto-dismiss with fade-out animation
  const [dismissingAlert, setDismissingAlert] = useState(false);
  const alertTimeoutRef = useRef(null);



  // Helper to show error banner only when there are no background agent tasks running
  const showErrorBanner = (msg) => {
    if (backgroundAgentCountRef.current > 0 || isProcessingRef.current) {
      console.log('[ChatBot] Suppressed error banner because backend still processing:', msg);
      return;
    }
    setError(humanizeClientError(msg));
  };

  useEffect(() => {
    if (!customAlert || customAlert.duration === 0) return;

    // Clear any existing timeout
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);

    // Trigger fade-out after duration - allow 400ms for animation
    const dismissDelay = Math.max(customAlert.duration - 400, 0);
    alertTimeoutRef.current = setTimeout(() => {
      setDismissingAlert(true);
      // Clear after animation completes
      setTimeout(() => {
        setCustomAlert(null);
        setDismissingAlert(false);
      }, 400);
    }, dismissDelay);

    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [customAlert]);

  const openHtmlEditor = (text) => {
    // Try to extract code blocks first (fenced code)
    const codeMatch = text.match(/```[\s\S]*?```/);
    if (codeMatch) {
      const codeContent = codeMatch[0]
        .replace(/^```\w*\n?/, '') // Remove opening fence and language
        .replace(/```$/, '');       // Remove closing fence
      setHtmlContent(codeContent);
      setHtmlFilename(`code-${Date.now()}.txt`);
      setShowHtmlEditor(true);
      return;
    }
    
    // Try to extract HTML from message
    const htmlMatch = text.match(/<html[^>]*>[\s\S]*<\/html>/i) || 
                     text.match(/<body[^>]*>[\s\S]*<\/body>/i) ||
                     text.match(/<div[^>]*>[\s\S]*<\/div>/i) ||
                     text.match(/<!DOCTYPE[^>]*>[\s\S]*<\/html>/i);
    
    if (htmlMatch) {
      setHtmlContent(htmlMatch[0]);
      setHtmlFilename(`page-${Date.now()}.html`);
      setShowHtmlEditor(true);
    } else {
      alert(userLanguage === 'id' 
        ? '❌ Tidak ada code/HTML ditemukan dalam pesan ini' 
        : '❌ No code/HTML found in this message');
    }
  };

  // Download code/HTML file
  const _downloadHtmlFile = () => {
    if (!htmlContent.trim()) {
      alert(userLanguage === 'id' ? 'Code kosong' : 'Code is empty');
      return;
    }

    try {
      // Determine MIME type based on filename or content
      let mimeType = 'text/plain';
      if (htmlFilename.endsWith('.html') || htmlFilename.endsWith('.htm')) {
        mimeType = 'text/html';
      } else if (htmlFilename.endsWith('.js')) {
        mimeType = 'application/javascript';
      } else if (htmlFilename.endsWith('.json')) {
        mimeType = 'application/json';
      } else if (htmlFilename.endsWith('.css')) {
        mimeType = 'text/css';
      }
      
      const blob = new Blob([htmlContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = htmlFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(userLanguage === 'id' 
        ? `✅ File diunduh: ${htmlFilename}` 
        : `✅ File downloaded: ${htmlFilename}`);
      setShowHtmlEditor(false);
    } catch (error) {
      alert(`❌ ${error.message}`);
    }
  };

  // Update conversation title based on first message (only if not manually named)
  const _updateConversationTitle = (convId, newMessages) => {
    // Skip if conversation was already manually named
    if (manuallyNamedConversationsRef.current.has(convId)) {
      return;
    }
    
    if (newMessages.length > 0 && newMessages[0].sender === 'user') {
      const firstUserMsg = newMessages[0].text;
      const title = firstUserMsg.split('\n')[0].substring(0, 50);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, title: title || 'Chat', updatedAt: new Date().toISOString() }
            : c
        )
      );
    }
  };

  // Generate chat title using AI for all users (MAX ONCE per session to save tokens)
  const generateChatTitle = async (convId) => {
    if (!convId) return;

    // Skip if already manually named or AI title already generated for this session
    if (manuallyNamedConversationsRef.current.has(convId) || aiTitledConversationsRef.current.has(convId)) {
      return;
    }

    // Immediately flag session so we never re-trigger API call
    aiTitledConversationsRef.current.add(convId);

    const targetConv = conversations.find((c) => c.id === convId);
    const convMessages = targetConv?.messages || [];
    if (convMessages.length < 2) return; // Need at least 1 exchange

    // Instant local fallback title
    const userMsg = convMessages.find((m) => m.sender === 'user');
    const fallbackTitle = userMsg ? userMsg.text.split('\n')[0].substring(0, 45).trim() : 'Chat Baru';

    // If session already has a custom title, keep it
    if (targetConv?.title && targetConv.title !== 'Chat Baru' && targetConv.title !== 'New Chat' && targetConv.title !== 'Chat' && targetConv.title !== 'Percakapan AI') {
      return;
    }

    try {
      const contextMessages = convMessages.slice(-4).map((m) => {
        const prefix = m.sender === 'user' ? 'User' : 'AI';
        return `${prefix}: ${m.text.substring(0, 70)}`;
      }).join('\n');

      const titlePrompt = userLanguage === 'en'
        ? `Generate a SHORT (2-4 words max) memorable chat title in English for this conversation:\n\n${contextMessages}\n\nRespond ONLY with the title, nothing else. No quotes, no explanation.`
        : `Generate a SHORT (2-4 words max) memorable chat title in Indonesian for this conversation:\n\n${contextMessages}\n\nRespond ONLY with the title, nothing else. No quotes, no explanation.`;

      const apiBaseUrl = API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepernova-2.3-pro',
          messages: [{ role: 'user', content: titlePrompt }],
          temperature: 0.3,
          max_tokens: 15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let generatedTitle = data.choices?.[0]?.message?.content?.trim() || '';
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
        if (!generatedTitle) generatedTitle = fallbackTitle;

        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: generatedTitle, updatedAt: new Date().toISOString() } : c))
        );
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: fallbackTitle, updatedAt: new Date().toISOString() } : c))
        );
      }
    } catch (error) {
      console.error('Failed to generate chat title:', error);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: fallbackTitle, updatedAt: new Date().toISOString() } : c))
      );
    }
  };

  // Check if message is long (>10 chars AND >1 line)
  const _isLongMessage = (text) => {
    if (!text) return false;
    return text.length > 10 && text.split('\n').length > 1;
  };

  // Toggle message expand/collapse
  const _toggleExpandMessage = (messageId) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  // Create a placeholder bot message immediately so the response feels faster
  const createBotPlaceholder = () => {
    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const placeholderMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
      isPlaceholder: true,
    };
    setMessages((prev) => [...prev, placeholderMessage]);
    setAnimatingMessages((prev) => ({ ...prev, [placeholderId]: true }));
    setIsScrolledUp(false);
    return placeholderId;
  };

  // Add AI message dengan animasi streaming
  const _addStreamingMessage = (text, existingMessageId = null) => {
    const messageId = existingMessageId || Date.now() + 1;
    const emptyMessage = {
      id: messageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };

    if (!existingMessageId) {
      setMessages((prev) => [...prev, emptyMessage]);
    } else {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, ...emptyMessage } : msg
        )
      );
    }

    setAnimatingMessages((prev) => ({ ...prev, [messageId]: true }));
    setIsScrolledUp(false); // Hide scroll button
    
    // Don't scroll saat AI mulai menjawab - biarkan user scroll manual
    // Scroll hanya terjadi di finishStreaming setelah text selesai
    
    // Store references untuk stop
    currentMessageIdRef.current = messageId;
    currentTextRef.current = text;
    charIndexRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);

    // Function untuk update text secara increment - multiple chars per tick
    const updateStreamingText = () => {
      if (charIndexRef.current <= text.length) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, text: text.substring(0, charIndexRef.current) }
              : msg
          )
        );
        charIndexRef.current += 3; // Show fewer chars per tick - slower
      } else {
        // Selesai streaming
        finishStreaming(messageId);
      }
    };

    const interval = setInterval(updateStreamingText, 80); // Slower interval
    streamingIntervalRef.current = interval;
  };

  // Handle long-press on message to show edit button (user messages only)
  const handleMessageLongPress = (messageId, messageText, isSenderUser) => {
    if (!isSenderUser) return; // Only allow editing user messages
    
    setEditingMessageId(messageId);
    setEditingMessageText(messageText);
  };

  // Clear long-press timeout on mouse up
  const handleMessageMouseUp = () => {
    if (editLongPressTimeoutRef.current) {
      clearTimeout(editLongPressTimeoutRef.current);
      editLongPressTimeoutRef.current = null;
    }
  };

  // Start long-press timer on mouse down
  const handleMessageMouseDown = (messageId, messageText, isSenderUser) => {
    if (!isSenderUser) return;
    
    editLongPressTimeoutRef.current = setTimeout(() => {
      handleMessageLongPress(messageId, messageText, isSenderUser);
    }, 500); // 500ms for long press
  };

  // Handle edit and resend
  const handleEditAndResend = async () => {
    if (!editingMessageId || !editingMessageText.trim()) {
      setEditingMessageId(null);
      setEditingMessageText('');
      return;
    }

    // Find the index of the edited message
    const editIndex = messages.findIndex(m => m.id === editingMessageId);
    if (editIndex === -1) {
      setEditingMessageId(null);
      setEditingMessageText('');
      return;
    }

    // Truncate messages to BEFORE the edited one (delete original + all after)
    const truncatedMessages = messages.slice(0, editIndex);
    
    // Update messages state - remove old message and its AI response
    setMessages(truncatedMessages);
    
    // Clear edit state
    setEditingMessageId(null);
    setEditingMessageText('');
    
    // Immediately send the edited message as new message
    const newUserMessage = {
      id: Date.now(),
      text: editingMessageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    // Add to messages
    setMessages((_prev) => [...truncatedMessages, newUserMessage]);
    setCompactView(true);
    
    // Store for stop-restore
    lastSentPromptRef.current = editingMessageText;
    lastSentUserMessageIdRef.current = newUserMessage.id;
    
    // Create AI placeholder
    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const botMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setMessages((prev) => [...prev, botMessage]);
    // Lock edited user message cleanly to top
    holdScrollRef.current = false;
    isLockedToUserAskRef.current = true;
    lockedUserMessageIdRef.current = newUserMessage.id;
    scrollToUserMessage(false);

    // Start streaming
    streamingStartTimeRef.current = Date.now();
    
    // Trigger immediate save (don't wait for debounce)
    const saveNow = async () => {
      if (conversations.length > 0) {
        console.log(`[ChatBot] Immediate save triggered after message sent`);
        await ConversationPersistenceService.saveConversations(conversations, isAuthenticated, isGuest);
      }
    };
    setTimeout(() => saveNow(), 100); // Small delay to ensure messages state is updated
    
    try {
      setConvLoading(true);
      const response = await sendMessageToGrok(
        editingMessageText,
        [...truncatedMessages, newUserMessage],
        userLanguage,
        currentConversationId,
        selectedPersonality,
        new AbortController(),
        selectedModel,
        isAuthenticated,
        isGuest,
        userName || user?.name
      );

      let fullText = '';
      let displayedText = '';
      let streamFinished = false;
      currentStreamingTextRef.current = '';

      let streamUsage = null; // Will hold real API usage data

      const startTypingAnimation = () => {
        if (typingTimerRef.current) return;
        typingTimerRef.current = setInterval(() => {
          if (displayedText.length < fullText.length) {
            const diff = fullText.length - displayedText.length;
            const step = getSmoothTypingStep(diff, streamFinished, displayedText.length, fullText.length);
            displayedText += fullText.substr(displayedText.length, step);
            currentStreamingTextRef.current = displayedText;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === placeholderId
                  ? { ...msg, text: sanitizeStreamingText(displayedText), isStreaming: true, isThinking: false }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
            finishStreaming(placeholderId, fullText, streamUsage);
          }
        }, 22);
      };
      
      const streamResult = await processStreamingResponse(
        response,
        (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            fullText += textChunk;
            currentStreamingTextRef.current = fullText;
            startTypingAnimation();
          }
        }
      );
      streamUsage = streamResult?.usage || null;

      streamFinished = true;
      startTypingAnimation();

      let editWaitCount = 0;
      while ((displayedText.length < fullText.length || typingTimerRef.current !== null) && editWaitCount < 600) {
        editWaitCount++;
        await new Promise(resolve => setTimeout(resolve, 14));
      }

      finishStreaming(placeholderId, fullText, streamUsage);
      
      setConvLoading(false);
      currentMessageIdRef.current = null;
    } catch (err) {
      console.error('Error sending edited message:', err);
      setConvLoading(false);
        showErrorBanner('Gagal mengirim pesan yang diedit');
    }
    
    // Scroll to bottom
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  // Handle message feedback (like/dislike)
  const handleMessageFeedback = async (messageId, feedbackType) => {
    try {
      // Update local state
      setMessageFeedback((prev) => ({
        ...prev,
        [messageId]: prev[messageId] === feedbackType ? null : feedbackType,
      }));

      // Save to database
      if (isAuthenticated) {
        const response = await fetch(`${apiBaseUrl}/api/message-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            conversationId: currentConversationId,
            feedbackType: messageFeedback[messageId] === feedbackType ? null : feedbackType,
            userId: user?.id,
          }),
        });
        if (!response.ok) console.error('Failed to save feedback');
      }
    } catch (err) {
      console.error('Error saving feedback:', err);
    }
  };

  // Handle copy message text
  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showAlert(userLanguage === 'id' ? 'Teks disalin!' : 'Text copied!', 'success', 2000);
    }).catch(() => {
      showAlert(userLanguage === 'id' ? 'Gagal menyalin' : 'Failed to copy', 'error', 2000);
    });
  };

  /**
   * Helper to strip technical markdown, URLs, and code blocks for ultra-clean, natural speech
   */
  const cleanTextForTts = (raw) => {
    if (!raw) return '';
    return raw
      .replace(/<think[\s\S]*?<\/think>/gi, '')
      .replace(/<reasoning[\s\S]*?<\/reasoning>/gi, '')
      .replace(/<thought[\s\S]*?<\/thought>/gi, '')
      .replace(/<\/?(?:reasoning|thought|think|action_pill)\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[(?:FILE_DOWNLOAD_START|FILEDOWNLOADSTART):[\s\S]*?\]/gi, '')
      .replace(/\[(?:FILE_DOWNLOAD_END|FILEDOWNLOADEND)\]/gi, '')
      .replace(/\[(?:MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|REMINDER_REQUEST|NAVIGATE_UNIVERSE|SEARCH_REQUEST)[\s\S]*?\]/gi, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/https?:\/\/\S+/gi, 'tautan')
      .replace(/[#*_~>]/g, ' ')
      .replace(/&/g, ' dan ')
      .replace(/[<>{}\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Handle TTS play/stop for a message with zero latency and natural voice
   */
  const handleTtsToggle = async (message, options = {}) => {
    const { forcePlay = false } = options;
    try {
      deepernovaTtsService.unlockAudio();

      // If already playing this message, stop it (manual toggle only)
      if (!forcePlay && playingMessageIdRef.current === message.id) {
        deepernovaTtsService.stop();
        playingMessageIdRef.current = null;
        setPlayingMessageId(null);
        return;
      }

      // Stop any currently playing audio unconditionally
      deepernovaTtsService.stop();
      deepernovaTtsService.clearCache();

      setTtsLoading(message.id);

      // Always resolve the FRESHEST version of this message from state (avoids stale closures)
      const freshMsg = (messagesRef.current || []).find(m => m.id === message.id);
      const rawText = (freshMsg && (freshMsg.text || freshMsg.content)) || message.text || message.content || '';
      const textForSpeech = cleanTextForTts(rawText);
      console.log('[TTS] Speaking message', message.id, '→', textForSpeech.substring(0, 80));

      if (!textForSpeech) {
        setTtsLoading(null);
        showAlert(
          userLanguage === 'id'
            ? 'Tidak ada teks utama untuk dibaca.'
            : 'No main text available to speak.',
          'warning',
          2500
        );
        return;
      }

      // High-Speed Streaming TTS: starts speaking instantly via audio stream (~200-300ms)
      playingMessageIdRef.current = message.id;
      setPlayingMessageId(message.id);

      const onDone = () => {
        if (playingMessageIdRef.current === message.id) playingMessageIdRef.current = null;
        setPlayingMessageId(prev => (prev === message.id ? null : prev));
        setTtsLoading(null);
      };

      const onStarted = () => {
        setTtsLoading(null);
      };

      deepernovaTtsService.speakStream(
        textForSpeech,
        null,
        onStarted,
        onDone,
        () => {
          onDone();
        }
      );
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('[ChatBot] TTS Error:', error);
      setTtsLoading(null);
      setPlayingMessageId(null);
      showAlert(
        userLanguage === 'id' 
          ? 'Gagal memutar audio: ' + (error?.message || 'Error audio')
          : 'Failed to play audio: ' + (error?.message || 'Audio error'),
        'error',
        3000
      );
    }
  };

  /**
   * Global Auto-Voice Toggle:
   * When ON: Automatically speaks all latest AI responses with low latency
   * When OFF: Silent
   */
  const handleToggleAutoVoice = () => {
    deepernovaTtsService.unlockAudio();
    const nextState = !isAutoVoiceEnabled;
    setIsAutoVoiceEnabled(nextState);
    isAutoVoiceEnabledRef.current = nextState;
    try {
      localStorage.setItem('deepernova_auto_voice', String(nextState));
    } catch (_) {}

    if (nextState) {
      showAlert(
        userLanguage === 'id'
          ? '🔊 Mode Suara Aktif: Setiap respon AI baru akan otomatis dibaca'
          : '🔊 Auto-Voice ON: New AI responses will be read aloud',
        'success',
        2500
      );
    } else {
      deepernovaTtsService.stop();
      playingMessageIdRef.current = null;
      setPlayingMessageId(null);
      if (autoVoiceTimerRef.current) {
        clearTimeout(autoVoiceTimerRef.current);
        autoVoiceTimerRef.current = null;
      }
      showAlert(
        userLanguage === 'id'
          ? '🔇 Mode Senyap: Respon AI hening'
          : '🔇 Silent Mode: AI responses silent',
        'info',
        2000
      );
    }
  };

  // 🎙️ AUTO-VOICE ENGINE
  // Watches messages: any bot message that was seen streaming in this session and is now
  // finished gets spoken exactly once, using its FINAL text (never stale/old answers).
  const handleTtsToggleRef = useRef(handleTtsToggle);
  handleTtsToggleRef.current = handleTtsToggle;
  const streamingSeenIdsRef = useRef(new Set());
  const autoSpokenIdsRef = useRef(new Set());
  const autoVoiceTimerRef = useRef(null);

  useEffect(() => {
    const list = messages || [];
    let candidate = null;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.sender === 'bot' || m.role === 'assistant') {
        candidate = m;
        break;
      }
    }
    if (!candidate) return;

    const isBusy = candidate.isStreaming || candidate.isThinking || candidate.isSearching ||
      candidate.isReasoning || candidate.isRecallingMemory || candidate.isImageGenerating;

    if (isBusy) {
      streamingSeenIdsRef.current.add(candidate.id);
      if (autoVoiceTimerRef.current) {
        clearTimeout(autoVoiceTimerRef.current);
        autoVoiceTimerRef.current = null;
      }
      return;
    }

    const text = (candidate.text || candidate.content || '').trim();
    if (!isAutoVoiceEnabledRef.current) return;
    if (!streamingSeenIdsRef.current.has(candidate.id)) return; // skip loaded history
    if (autoSpokenIdsRef.current.has(candidate.id)) return;
    if (!text || /\[SEARCH_REQUEST:/i.test(text)) return;

    // Small debounce so follow-up updates (search/memory/finalization) settle first
    if (autoVoiceTimerRef.current) clearTimeout(autoVoiceTimerRef.current);
    const targetId = candidate.id;
    autoVoiceTimerRef.current = setTimeout(() => {
      autoVoiceTimerRef.current = null;
      const fresh = (messagesRef.current || []).find(m => m.id === targetId);
      if (!fresh || fresh.isStreaming || !isAutoVoiceEnabledRef.current) return;
      if (autoSpokenIdsRef.current.has(targetId)) return;
      autoSpokenIdsRef.current.add(targetId);
      handleTtsToggleRef.current(fresh, { forcePlay: true });
    }, 350);
  }, [messages]);

  // Handle stop streaming
  const handleStopStreaming = () => {
    isUserStoppedRef.current = true;
    isSearchAbortedRef.current = true;
    isRecallAbortedRef.current = true;
    setIsSendGenerating(false);
    isSendGeneratingRef.current = false;
    setLoading(false);
    setConvLoading(false);

    // Clear any scheduled auto-retry timeouts immediately
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
    autoRetryCountRef.current = 0;
    partialMessageIdRef.current = null;

    // Abort every active stream controller so X always stops generation no matter what
    abortControllersMapRef.current.forEach((controller) => {
      try {
        controller.abort();
      } catch (err) {
        console.debug('Abort controller error:', err);
      }
    });
    abortControllersMapRef.current.clear();

    // Fallback for global ref (for backward compatibility)
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (err) {
        console.debug('Abort fallback error:', err);
      }
      abortControllerRef.current = null;
    }

    // Explicitly notify server and Python backend to kill GPU token generation instantly
    const stopUrls = [
      '/api/chat/stop',
      `${API_BASE_URL || ''}/api/chat/stop`,
      'http://localhost:3001/api/chat/stop',
      'http://127.0.0.1:8000/v1/chat/stop'
    ];
    stopUrls.forEach(url => {
      try {
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      } catch (_e) {}
    });

    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    if (smoothStreamTimerRef.current) {
      clearInterval(smoothStreamTimerRef.current);
      smoothStreamTimerRef.current = null;
    }
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
      statusUpdateIntervalRef.current = null;
    }
    clearLoadingPhaseTimers();
    if (timeoutInternetCheckRef.current) {
      clearTimeout(timeoutInternetCheckRef.current);
      timeoutInternetCheckRef.current = null;
    }

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    // Immediately stop streaming flag on all active messages
    const targetMsgId = currentMessageIdRef.current;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming || msg.isThinking || msg.isSearching || msg.isRecallingMemory || msg.isImageGenerating || (targetMsgId && msg.id === targetMsgId)
          ? {
              ...msg,
              isStreaming: false,
              isThinking: false,
              isReasoning: false,
              isReasoningComplete: true,
              isSearching: false,
              isRecallingMemory: false,
              isImageGenerating: false,
            }
          : msg
      )
    );
    if (targetMsgId) {
      setAnimatingMessages((prev) => ({ ...prev, [targetMsgId]: false }));
    }

    setLoadingStatusMsg('Generasi dihentikan');
    streamingStartTimeRef.current = null;
    isPausedRef.current = false;
    setIsPaused(false);
    
    // IMMEDIATELY clear ALL generation state — no flicker, no delay, no retries
    setIsSendGenerating(false);
    isSendGeneratingRef.current = false;
    setConvLoading(false);
    setLoading(false);
    setLoadingPhase(null);
    isProcessingRef.current = false;
    currentMessageIdRef.current = null;
  };


  const latestFormatHandlersRef = useRef(null);
  latestFormatHandlersRef.current = {
    setQuizSelections,
    setQuizSubmitted,
    onNavigate,
    openHtmlEditor: (code, filename) => {
      setHtmlContent(code);
      setHtmlFilename(filename);
      setShowHtmlEditor(true);
    },
    showAlert,
    setEnlargedImage,
    setShowImageModal,
    setMessages,
    saveImageToGallery,
    downloadImageDirectly,
    onSelectSuggestion: (cleanLine) => {
      setInputValue(cleanLine);
      setTimeout(() => {
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
      }, 80);
    },
  };

  const stableFormatHandlers = useMemo(() => ({
    setQuizSelections: (...args) => latestFormatHandlersRef.current.setQuizSelections(...args),
    setQuizSubmitted: (...args) => latestFormatHandlersRef.current.setQuizSubmitted(...args),
    onNavigate: (...args) => latestFormatHandlersRef.current.onNavigate?.(...args),
    openHtmlEditor: (...args) => latestFormatHandlersRef.current.openHtmlEditor(...args),
    showAlert: (...args) => latestFormatHandlersRef.current.showAlert(...args),
    setEnlargedImage: (...args) => latestFormatHandlersRef.current.setEnlargedImage(...args),
    setShowImageModal: (...args) => latestFormatHandlersRef.current.setShowImageModal(...args),
    setMessages: (...args) => latestFormatHandlersRef.current.setMessages(...args),
    saveImageToGallery: (...args) => latestFormatHandlersRef.current.saveImageToGallery(...args),
    downloadImageDirectly: (...args) => latestFormatHandlersRef.current.downloadImageDirectly(...args),
    onSelectSuggestion: (...args) => latestFormatHandlersRef.current.onSelectSuggestion(...args),
  }), []);

  const formatMessageText = (text, isStreaming = false, messageId = null) => {
    const msgObj = messageId ? messages.find((m) => m.id === messageId) : null;
    return formatMessageContent({
      text,
      isStreaming,
      messageId,
      message: msgObj,
      userLanguage,
      quizSelections: messageId ? quizSelections[messageId] : undefined,
      quizSubmitted: messageId ? quizSubmitted[messageId] : undefined,
      handlers: stableFormatHandlers,
    });
  };


  // Helper to accurately locate where the last user ask bubble should sit (locked at top)
  const getLastUserMessageTargetTop = (container) => {
    try {
      if (!container) return null;
      const userMessages = container.querySelectorAll('.message.user');
      if (!userMessages || userMessages.length === 0) return null;

      let targetUserMsg = null;
      const targetId = lockedUserMessageIdRef.current || lastSentUserMessageIdRef.current;
      if (targetId) {
        targetUserMsg = container.querySelector(`[data-msg-id="${targetId}"]`);
      }
      // If targetId was specified but not found in DOM yet, fallback to the last user message
      if (!targetUserMsg) {
        targetUserMsg = userMessages[userMessages.length - 1];
      }
      if (!targetUserMsg) return null;

      const containerRect = container.getBoundingClientRect();
      const userBubble = targetUserMsg.querySelector('.message-content') || targetUserMsg.querySelector('.user-bubble-wrapper') || targetUserMsg;
      if (!userBubble) return null;
      const bubbleRect = userBubble.getBoundingClientRect();

      // Position the user ask bubble cleanly at the top of the container (~8px breathing space below header)
      const targetTop = container.scrollTop + (bubbleRect.top - containerRect.top) - 8;
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

      return Math.max(0, Math.min(targetTop, maxScroll));
    } catch (_e) {
      return null;
    }
  };

  // Rock-solid lock: keeps user ask bubble anchored cleanly at the top
  const lockUserAskToTop = (isImmediate = false) => {
    if (holdScrollRef.current) return;
    const el = document.querySelector('.messages-container');
    if (!el) return;

    const target = getLastUserMessageTargetTop(el);
    if (target === null || isNaN(target)) return;

    const diff = Math.abs(el.scrollTop - target);
    if (diff < 0.75) return; // Already precisely positioned, zero movement!

    if (isImmediate) {
      stopGlide();
      programmaticScrollRef.current = true;
      el.scrollTop = target;
    } else {
      glideToTarget(target);
    }
  };

  // Ultra-silky frame-independent glide engine with smooth exponential braking ("ngerem")
  const glideToTarget = (targetScrollTop) => {
    const scrollElement = document.querySelector('.messages-container');
    if (!scrollElement || targetScrollTop === null || targetScrollTop === undefined) return;

    const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
    const clampedTarget = Math.max(0, Math.min(targetScrollTop, maxScroll));
    targetScrollTopRef.current = clampedTarget;

    if (lazyScrollAnimRef.current) return;

    let lastTime = performance.now();
    const startTime = lastTime;
    let prevPos = scrollElement.scrollTop;

    const animateGlide = (currentTime) => {
      const el = document.querySelector('.messages-container');
      if (!el || targetScrollTopRef.current === null) {
        stopGlide();
        return;
      }

      // Hard safety guard: stop after 900ms to guarantee scroll container is never locked
      if (currentTime - startTime > 900) {
        stopGlide();
        return;
      }

      const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // in seconds, capped at 50ms
      lastTime = currentTime;

      const current = el.scrollTop;
      const effectiveMax = Math.max(0, el.scrollHeight - el.clientHeight);
      const target = Math.max(0, Math.min(targetScrollTopRef.current, effectiveMax));
      const diff = target - current;

      // When difference is tiny or position is stuck at container boundary, stop completely
      if (Math.abs(diff) < 1.5 || (Math.abs(current - prevPos) < 0.2 && Math.abs(diff) < 8)) {
        el.scrollTop = target;
        stopGlide();
        return;
      }
      prevPos = current;

      const decay = 1 - Math.exp(-8.0 * dt);
      const step = diff * decay;

      programmaticScrollRef.current = true;
      el.scrollTop = current + step;

      lazyScrollAnimRef.current = requestAnimationFrame(animateGlide);
    };

    lazyScrollAnimRef.current = requestAnimationFrame(animateGlide);
  };

  // Scroll so the user message locks firmly to the top of the chat area
  const scrollToUserMessage = (isImmediate = false) => {
    holdScrollRef.current = false;
    isLockedToUserAskRef.current = true;
    const scrollElement = document.querySelector('.messages-container');
    if (!scrollElement) return;

    stopGlide();

    const doScroll = () => {
      if (holdScrollRef.current || !isLockedToUserAskRef.current) return;
      lockUserAskToTop(isImmediate);
    };

    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 30);
    setTimeout(doScroll, 80);
    setTimeout(doScroll, 180);
    setTimeout(doScroll, 350);
    setTimeout(doScroll, 600);
    setTimeout(doScroll, 1000);
  };

  // Auto-focus latest user ask: when user sends chat and response begins generating,
  // glide user bubble smoothly up to the top so user focus is 100% on the latest generation!
  useEffect(() => {
    try {
      if (!messages || messages.length === 0) return;
      const lastMsg = messages[messages.length - 1];
      const prevMsg = messages.length > 1 ? messages[messages.length - 2] : null;

      const latestUserMsg = lastMsg?.sender === 'user' ? lastMsg : (prevMsg?.sender === 'user' ? prevMsg : null);
      if (!latestUserMsg || !latestUserMsg.id) return;

      if (isGenerating && lastProcessedUserMsgIdRef.current !== latestUserMsg.id) {
        lastProcessedUserMsgIdRef.current = latestUserMsg.id;
        lockedUserMessageIdRef.current = latestUserMsg.id;
        isLockedToUserAskRef.current = true;
        holdScrollRef.current = false;
        scrollToUserMessage(false);
      }
    } catch (err) {
      console.warn('[ChatBot] Auto-focus user ask error:', err);
    }
  }, [messages, isGenerating]);

  // When generating finishes, keep the user ask bubble firmly locked to top
  const prevIsGeneratingRef = useRef(false);
  useEffect(() => {
    try {
      if (prevIsGeneratingRef.current && !isGenerating) {
        // Generating has just finished
        if (isLockedToUserAskRef.current && !holdScrollRef.current) {
          requestAnimationFrame(() => {
            if (isLockedToUserAskRef.current && !holdScrollRef.current) {
              lockUserAskToTop(true);
            }
          });
          setTimeout(() => {
            if (isLockedToUserAskRef.current && !holdScrollRef.current) {
              lockUserAskToTop(true);
            }
          }, 60);
          setTimeout(() => {
            if (isLockedToUserAskRef.current && !holdScrollRef.current) {
              lockUserAskToTop(true);
            }
          }, 180);
        }
      }
      prevIsGeneratingRef.current = isGenerating;
    } catch (_err) {
      // safe guard
    }
  }, [isGenerating]);

  // Auto-scroll logic during streaming is removed as requested by user.
  // The viewport stays peacefully anchored at the user message, with ample space for AI response.
  const smoothAutoScroll = (_force = false) => {
    // Intentionally no-op to keep chat viewport stable and prevent continuous jitter while generating
  };

  const scrollToBottom = (isImmediate = false) => {
    holdScrollRef.current = false;

    const scrollElement = document.querySelector('.messages-container');
    if (!scrollElement) return;

    stopGlide();

    // Prioritize targeting the last message element to avoid overshooting into bottom padding / spacers
    const allMessages = scrollElement.querySelectorAll('.message');
    if (allMessages && allMessages.length > 0) {
      const lastMsg = allMessages[allMessages.length - 1];
      const containerRect = scrollElement.getBoundingClientRect();
      const msgRect = lastMsg.getBoundingClientRect();

      // Position bottom of last message ~110px above container bottom (clearing bottom input bar)
      const targetScroll = scrollElement.scrollTop + (msgRect.bottom - containerRect.bottom) + 110;
      const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
      const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll));

      if (isImmediate) {
        scrollElement.scrollTop = clampedScroll;
      } else {
        glideToTarget(clampedScroll);
      }
      return;
    }

    const maxScroll = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
    if (isImmediate) {
      scrollElement.scrollTop = maxScroll;
    } else {
      glideToTarget(maxScroll);
    }
  };

  // Handle scroll to bottom button click
  const handleScrollToBottomClick = () => {
    // User explicitly requested bottom — clear hold, release lock, and perform scroll
    holdScrollRef.current = false;
    isLockedToUserAskRef.current = false;
    lockedUserMessageIdRef.current = null;
    try {
      const scrollEl = document.querySelector('.messages-container');
      if (scrollEl) scrollEl.classList.remove('prefill-space');
    } catch (_e) {
      // ignore
    }
    scrollToBottom(false);
    setIsScrolledUp(false);
  };

  // Handle show previous messages button
  const handleShowPreviousMessages = () => {
    // Disable compact view to show all messages
    setCompactView(false);
    // Scroll to bottom to show the latest chat
    setTimeout(() => {
      scrollToBottom(true);
    }, 100);
  };


  // Remember active conversation ID and trigger one-time AI title generation after first exchange
  useEffect(() => {
    if (!currentConversationId) return;
    const isAnyStreaming = messages.some((m) => m && (m.isStreaming || m.isThinking));
    if (isAnyStreaming) return;

    rememberConversationId(currentConversationId);
    if (messages.length === 2 && !aiTitledConversationsRef.current.has(currentConversationId)) {
      const titleConvId = currentConversationId;
      setTimeout(() => {
        if (titleConvId) {
          generateChatTitle(titleConvId);
        }
      }, 300);
    }
  }, [messages, currentConversationId]);


  // Close input menu (+ attachment menu), model menu, and floating menu when clicking or tapping outside
  useEffect(() => {
    if (!showInputMenu && !showModelMenu && !showFloatingMenu && !showSidebarMoreMenu && !showSidebarProfileMenu) return;

    const handleClickOutside = (e) => {
      if (showInputMenu) {
        const fileMenuContainer = document.querySelector('.file-menu-container');
        if (fileMenuContainer && !fileMenuContainer.contains(e.target)) {
          setShowInputMenu(false);
        }
      }

      if (showModelMenu) {
        const modelSelectorWrapper = document.querySelector('.claude-model-selector-wrapper');
        if (modelSelectorWrapper && !modelSelectorWrapper.contains(e.target)) {
          setShowModelMenu(false);
        }
      }

      if (showFloatingMenu) {
        const floatingMenu = document.querySelector('.floating-menu');
        const floatingBtn = document.querySelector('.floating-add-btn');
        if (
          floatingMenu && 
          !floatingMenu.contains(e.target) && 
          (!floatingBtn || !floatingBtn.contains(e.target))
        ) {
          setShowFloatingMenu(false);
        }
      }

      if (showSidebarMoreMenu) {
        const moreWrapper = document.querySelector('.meta-more-wrapper');
        if (moreWrapper && !moreWrapper.contains(e.target)) {
          setShowSidebarMoreMenu(false);
        }
      }

      if (showSidebarProfileMenu) {
        const profileFooter = document.querySelector('.meta-sidebar-footer');
        if (profileFooter && !profileFooter.contains(e.target)) {
          setShowSidebarProfileMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showInputMenu, showModelMenu, showFloatingMenu, showSidebarMoreMenu, showSidebarProfileMenu]);

  // ==================== SOURCE MANAGEMENT ====================
  /**
   * Load sources for current conversation from backend
   */
  const loadSourcesForConversation = async (conversationId) => {
    try {
      if (!conversationId) return;
      
      const response = await fetch(`${apiBaseUrl}/api/sources/${conversationId}`);
      const data = await response.json();
      
      if (data.success && data.sources) {
        setCurrentSources(data.sources);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  /**
   * Show sources modal for current conversation
   */
  const handleShowSources = async () => {
    if (!currentConversationId) return;
    await loadSourcesForConversation(currentConversationId);
    setShowSourcesModal(true);
  };

  /**
   * View source details when clicked
   */
  const handleViewSourceDetail = (source) => {
    setSelectedSource(source);
  };

  /**
   * Open source URL in new tab
   */
  const handleOpenSource = (url) => {
    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
    }
  };

  /**
   * Get icon for source type
   */
  const getSourceIcon = (type) => {
    const iconMap = {
      'finance_data': '💰',
      'crypto_data': '₿',
      'stock_data': '📈',
      'macro_data': '📊',
      'web_search': '🔍',
      'news': '📰',
      'economic': '💹'
    };
    return iconMap[type] || '📚';
  };

  /**
   * Generate answer from found sources
   */
  const handleGenerateAnswerFromSources = async (userQuery) => {
    if (!userQuery) return;

    // Build sources context
    const sourcesContext = foundSources.map((s, i) => 
      `[Sumber ${i+1}] ${s.title}\n${s.description}\nURL: ${s.url}\nSumber: ${s.source}`
    ).join('\n\n');

    const fullQuery = `Berdasarkan sumber-sumber berikut yang telah ditemukan, berikan jawaban untuk pertanyaan: "${userQuery}"\n\nSOURCES:\n${sourcesContext}`;

    // Clear sources panel
    setShowFoundSourcesPanel(false);
    setFoundSources([]);
    // setIsWaitingForAnswer(false); - removed unused setter

    // Add user message to display
    const userMessage = {
      id: Date.now(),
      text: userQuery,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCompactView(true);
    // Store the last sent prompt for restore-on-stop functionality
    lastSentPromptRef.current = userQuery;
    lastSentUserMessageIdRef.current = userMessage.id;
    setInputValue('');

    // Create placeholder for bot response
    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const botMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, botMessage]);

    try {
      setConvLoading(true);
      const response = await sendMessageToGrok(
        fullQuery,
        [...messages, userMessage],
        userLanguage,
        currentConversationId,
        selectedPersonality,
        new AbortController(),
        selectedModel,
        isAuthenticated,
        isGuest,
        userName || user?.name
      );

      let fullText = '';
      let displayedText = '';
      let streamFinished = false;
      currentStreamingTextRef.current = '';

      let streamUsage = null; // Will hold real API usage data
      
      const startTypingAnimation = () => {
        if (typingTimerRef.current) return;
        typingTimerRef.current = setInterval(() => {
          if (displayedText.length < fullText.length) {
            const diff = fullText.length - displayedText.length;
            const step = getSmoothTypingStep(diff, streamFinished, displayedText.length, fullText.length);
            displayedText += fullText.substr(displayedText.length, step);
            currentStreamingTextRef.current = displayedText;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === placeholderId
                  ? { ...msg, text: sanitizeStreamingText(displayedText), isStreaming: true, isThinking: false }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
            finishStreaming(placeholderId, fullText, streamUsage);
          }
        }, 22);
      };
      
      const streamResult = await processStreamingResponse(
        response,
        (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            fullText += textChunk;
            currentStreamingTextRef.current = fullText;
            startTypingAnimation();
          }
        }
      );
      streamUsage = streamResult?.usage || null;

      streamFinished = true;
      startTypingAnimation();

      let sourcesWaitCount = 0;
      while ((displayedText.length < fullText.length || typingTimerRef.current !== null) && sourcesWaitCount < 600) {
        sourcesWaitCount++;
        await new Promise(resolve => setTimeout(resolve, 14));
      }

      finishStreaming(placeholderId, fullText, streamUsage);
      setConvLoading(false);
    } catch (err) {
      setConvLoading(false);
      if (err.isTokenLimitError) {
        setTokenUsage({
          usedTokens: err.usedTokens || MAX_TOKEN_LIMIT,
          resetTime: err.resetTime || (Date.now() + TOKEN_RESET_HOURS * 60 * 60 * 1000)
        });
        showAlert(
          userLanguage === 'id'
            ? `⚠️ Batas token IP (${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}) tercapai! Input terkunci selama 4 jam.`
            : `⚠️ IP Token limit (${MAX_TOKEN_LIMIT.toLocaleString('en-US')}) reached! Input locked for 4 hours.`,
          'error',
          6000
        );
      } else if (err.name !== 'AbortError') {
        showErrorBanner(`Error: ${err.message}`);
      }
    }
  };

  /**
   * Handle inline image generation in chat
   * Generates image and displays it in chat format
   */
  const handleInlineImageGeneration = async (imageRequest, userMessage, imagesToUseParam = null) => {
    // Check token limit before image generation
    if (isTokenUsageLimited()) {
      showAlert(
        userLanguage === 'id'
          ? `⚠️ Limit token ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')} telah tercapai. Penggunaan token akan di-reset dalam ${countdownText || '4 jam'}.`
          : `⚠️ Token limit ${MAX_TOKEN_LIMIT.toLocaleString('en-US')} reached. Token usage will reset in ${countdownText || '4 hours'}.`,
        'error',
        5000
      );
      return;
    }

    // Deduct 30,000 tokens for image generation or edit
    consumeTokens(IMAGE_TOKEN_COST);

    // Define variables outside try block so they're accessible in catch
    let placeholderId = Date.now() + '_img';
    let thinkingStartTime;
    const imageAbortController = new AbortController();
    
    try {
      console.log('[ChatBot] Starting inline image generation for:', imageRequest.prompt);
      
      // Store abort controller so handleStopStreaming can abort it
      abortControllersMapRef.current.set('image-' + placeholderId, imageAbortController);
      
      // Add user message to chat
      setMessages((prev) => [...prev, userMessage]);
      setCompactView(true);
      
      thinkingStartTime = Date.now();
      
      // Collect images from parameters, active follow-ups, and message history
      const historyImages = (messages || [])
        .filter(m => m.sender === 'user' && m.images && Array.isArray(m.images))
        .flatMap(m => m.images);

      const imagesToConsider = (imagesToUseParam && imagesToUseParam.length > 0)
        ? imagesToUseParam
        : ((activeImageFollowUps && activeImageFollowUps.length > 0) ? activeImageFollowUps : []);

      const lastUploadedImage = imagesToConsider && imagesToConsider.length > 0 ? imagesToConsider[imagesToConsider.length - 1] : null;
      const isEditRequest = !!lastUploadedImage && ImageGenerationService.detectImageEditRequest(imageRequest.prompt, true);
      const modeLabel = isEditRequest ? '✏️ Edit' : '🎨 Generate';
      
      console.log('[ChatBot] Mode:', modeLabel);
      console.log('[ChatBot] Last uploaded image:', lastUploadedImage ? (lastUploadedImage.fileName || lastUploadedImage.name || 'image') : 'none');
      console.log('[ChatBot] Is edit request:', isEditRequest);
      
      // Add thinking placeholder with 2x speed animation initially (pas awal-awal)
      const thinkingMessage = {
        id: placeholderId,
        text: `${modeLabel} sedang membuat gambar...`,
        sender: 'bot',
        timestamp: new Date(),
        isThinking: true,
        isImage: true,
        imagePrompt: imageRequest.prompt,
        isEditMode: isEditRequest,
        imageGenPhase: 'initial', // 2x speed 3-dot animation at initial start
      };
      
      setMessages((prev) => [...prev, thinkingMessage]);
      setConvLoading(true);
      setError(null);
      setIsScrolledUp(false);
      
      // Scroll to show thinking message
      setTimeout(() => {
        try {
          const msgEl = document.querySelector(`[data-msg-id="${placeholderId}"]`);
          if (msgEl) msgEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch (_e) {
          // ignore
        }
      }, 100);
      
      // Generate image via API with an English prompt that is first refined by the chat model
      console.log('[ChatBot] Calling image generation API...');
      
      console.log('[ChatBot] 🟡 Step 1: Original prompt:', imageRequest.prompt);
      
      let englishPrompt = await ImageGenerationService.generateEnglishImagePrompt(imageRequest.prompt);
      
      // AI responded - transition 3-dot animation speed to 1x normal speed!
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, imageGenPhase: 'responding' } : m));

      if (!englishPrompt) {
        console.warn('[ChatBot] ⚠️ English prompt generation failed, falling back to dictionary translation');
        englishPrompt = ImageGenerationService.translateToEnglish(imageRequest.prompt);
      }
      console.log('[ChatBot] 🟡 Step 2: English prompt:', englishPrompt);
      
      const refinedPrompt = ImageGenerationService.enhancePrompt(englishPrompt);
      console.log('[ChatBot] 🟡 Step 3: Refined prompt:', refinedPrompt);

      // Transition to generating image phase with 1x normal speed animation
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, imageGenPhase: 'generating' } : m));

      // Reasoning generation removed - focus on direct image generation
      console.log(`[ChatBot] 🟡 Step 4: Calling ${isEditRequest ? 'editImage' : 'generateImage'} with prompt:`, refinedPrompt);
      
      let imageData;
      if (isEditRequest && lastUploadedImage) {
        // Edit mode: use reference image (auto-selects qwen-image-edit-max)
        console.log('[ChatBot] Using edit mode with reference image:', lastUploadedImage.fileName);
        console.log('[ChatBot] Image object keys:', Object.keys(lastUploadedImage));
        console.log('[ChatBot] publicUrl:', lastUploadedImage.publicUrl?.substring?.(0, 50));
        console.log('[ChatBot] dataUrl:', lastUploadedImage.dataUrl?.substring?.(0, 50));
        
        // Use publicUrl if available, otherwise fall back to dataUrl
        const referenceImageSource = lastUploadedImage.publicUrl || lastUploadedImage.dataUrl;
        console.log('[ChatBot] Using reference source:', referenceImageSource?.substring?.(0, 50));
        
        // Call generateImage directly for edit mode with abort signal
        imageData = await ImageGenerationService.generateImage(
          refinedPrompt,
          imageRequest.size || '1024x1024',
          currentConversationId,
          null, // Model auto-selected: qwen-image-edit-max for editing
          referenceImageSource, // Reference image for editing
          imageAbortController.signal // Pass abort signal for timeout support
        );
      } else {
        // Generation mode: create new image (auto-selects imagen-4-fast)
        imageData = await ImageGenerationService.generateImage(
          refinedPrompt,
          imageRequest.size || '1024x1024',
          currentConversationId,
          null, // Model auto-selected: imagen-4-fast for generation
          null, // No reference image for generation
          imageAbortController.signal
        );
      }
      
      console.log('[ChatBot] 🟡 Step 5: Image', isEditRequest ? 'edited' : 'generated', 'successfully');
      const generationTime = Math.round((Date.now() - thinkingStartTime) / 1000);
      
      console.log(`[ChatBot] Image ${isEditRequest ? 'edited' : 'generated'} in ${generationTime}s`);
      
      const assistantIntro = `${isEditRequest ? '[Edit Mode] ' : ''}I ${isEditRequest ? 'edited your image using the prompt' : 'translated your request to English and refined it for the image model'}:\n"${refinedPrompt}"\n\n`;
      const updatedMessage = {
        id: placeholderId,
        text: assistantIntro + `\n\n![Generated Image](${imageData.image.url})`,
        imageUrl: imageData.image.url,
        imageId: imageData.image.id,
        sender: 'bot',
        timestamp: new Date(),
        isImage: true,
        isThinking: false,
        generationTime: generationTime,
        isEditMode: isEditRequest,
      };
      
      console.log('[ChatBot] 🔴 updatedMessage.text length:', updatedMessage.text.length);
      console.log('[ChatBot] 🔴 updatedMessage.imageUrl:', updatedMessage.imageUrl);
      console.log('[ChatBot] 🔴 updatedMessage.imageId:', updatedMessage.imageId);
      console.log('[ChatBot] 🔴 updatedMessage.text preview:', updatedMessage.text.substring(0, 200));
      
      setMessages((_prev) => {
        const updated = _prev.map((msg) =>
          msg.id === placeholderId ? updatedMessage : msg
        );
        
        // Update conversations state with new messages (including imageUrl)
        setConversations((prevConvs) => {
          const updatedConvs = prevConvs.map(conv => 
            conv.id === currentConversationId
              ? { ...conv, messages: updated, updatedAt: new Date().toISOString() }
              : conv
          );
          
          console.log(`[ChatBot] Updated conversation ${currentConversationId} with image message`);
          console.log(`[ChatBot] Message text length: ${updatedMessage.text.length}, has imageUrl: ${!!updatedMessage.imageUrl}`);
          
          // Save conversation immediately with updated messages
          ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
            .catch(err => console.error('[ChatBot] Error saving conversation:', err));

          // Save generated/edited image to "Gambar Saya" (works for both local mode and logged-in mode)
          saveImageToGallery({
            id: `gen_${placeholderId}`,
            prompt: imageRequest?.prompt || refinedPrompt || 'Gambar Dihasilkan AI',
            imageUrl: imageData.image.url,
            type: isEditRequest ? 'edited' : 'generated',
            model: isEditRequest ? 'qwen-image-edit-max' : 'qwen-image'
          }, isAuthenticated, user).catch(e => console.warn('[ChatBot] Auto-save generated image error:', e));
          
          return updatedConvs;
        });
        
        return updated;
      });
      
      setConvLoading(false);
      
      // Auto-scroll to image
      setTimeout(() => {
        try {
          const msgEl = document.querySelector(`[data-msg-id="${placeholderId}"]`);
          if (msgEl) msgEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch (_e) {
          // ignore
        }
      }, 300);

      // CRITICAL: Clear the processing lock flag on success
      console.log('[ChatBot] Image generation completed successfully, clearing processing lock');
      isProcessingRef.current = false;
      
      // Clean up the abort controller
      abortControllersMapRef.current.delete('image-' + placeholderId);
      
    } catch (err) {
      console.error('[ChatBot] Image generation error:', err);

      // Don't show error if it was aborted (user cancelled)
      if (err.name === 'AbortError') {
        console.log('[ChatBot] Image generation cancelled by user');
        // Remove the thinking message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== placeholderId)
        );
      } else {
        const isSafetyErr = err.message && err.message.includes('melanggar kebijakan kami');
        const displayErrorMessage = isSafetyErr ? `❌ ${err.message}` : `❌ Gagal membuat gambar: ${err.message}`;

        // Update the thinking placeholder to show the failure clearly
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId
              ? {
                  ...msg,
                  text: displayErrorMessage,
                  isThinking: false,
                  isError: true,
                }
              : msg
          )
        );

        // Show error message in chat as a separate fallback
        const errorId = Date.now() + '_err';
        setMessages((prev) => [
          ...prev,
          {
            id: errorId,
            text: displayErrorMessage,
            sender: 'bot',
            timestamp: new Date(),
            isError: true,
          },
        ]);

        showErrorBanner(isSafetyErr ? err.message : `Failed to generate image: ${err.message}`);
      }

      setConvLoading(false);
      
      // CRITICAL: Clear the processing lock flag
      console.log('[ChatBot] Error occurred, clearing processing lock flag');
      isProcessingRef.current = false;
      
      // Clean up the abort controller
      abortControllersMapRef.current.delete('image-' + placeholderId);
    }
  };

  const checkForImageRequest = (message) => {
    return ImageGenerationService.detectImageRequest(message);
  };

  const shouldUseRagForInput = (input) => {
    if (!input || typeof input !== 'string') return false;
    const normalized = input.toLowerCase();
    const triggers = [
      'deepernova', 'deepernova', 'deeper nova', 'misi', 'visi', 'fitur', 'produk',
      'tim', 'donasi', 'panduan', 'dokumen', 'manual', 'spesifikasi', 'roadmap',
      'knowledge base', 'pengetahuan', 'layanan', 'kebijakan', 'harga', 'company',
      'team', 'founder', 'cara kerja', 'apa itu'
    ];
    return triggers.some(term => normalized.includes(term));
  };

  /**
   * Call the web search endpoint
   * Returns: { success, answer, searchResults, error }
   */


  const isDocumentGenerationRequest = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const norm = promptText.trim().toLowerCase();
    const docKeywords = [
      'buatkan file', 'bikin file', 'buat file', 'buatkan dokumen', 'bikin dokumen', 'buat dokumen',
      'buatkan makalah', 'bikin makalah', 'buat makalah', 'buatkan laporan', 'bikin laporan', 'buat laporan',
      'buatkan excel', 'bikin excel', 'buat excel', 'buatkan ppt', 'bikin ppt', 'buat ppt', 'buatkan presentasi',
      'buatkan spreadsheet', 'bikin spreadsheet', 'buat spreadsheet', 'generasi file', 'generasi dokumen'
    ];
    return docKeywords.some(k => norm.includes(k));
  };

  const isChatToDocumentRequest = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const norm = promptText.trim().toLowerCase();
    const chatDocKeywords = [
      'jadikan obrolan', 'bikin obrolan', 'ubah obrolan', 'ekspor obrolan', 'rangkum obrolan',
      'jadikan chat', 'bikin chat', 'ubah chat', 'ekspor chat', 'rangkum chat',
      'jadikan percakapan', 'bikin percakapan', 'ubah percakapan', 'ekspor percakapan',
      'dari chat ini', 'dari obrolan ini', 'dari percakapan ini', 'dari diskusi ini',
      'jadikan file', 'jadikan dokumen', 'bikin file dari diskusi', 'ubah diskusi jadi file'
    ];
    return chatDocKeywords.some(k => norm.includes(k));
  };

  const handleDocumentTransitionSequence = (topic, docType, userMessage, chatContext = '') => {
    const cardMsgId = `asst_${Date.now()}`;
    const isFromChat = !!chatContext;
    const step1Label = isFromChat 
      ? `📝 *Mengumpulkan seluruh riwayat obrolan & merancang dokumen...*`
      : `📝 *Menganalisis instruksi & menyiapkan agen pembuat file...*`;

    const initialText = `📝 **PERMINTAAN PEMBUATAN FILE TERDETEKSI**\n\n📌 **Topik & Obrolan:** "${topic}"\n\n\`[Step 1/3 - 0s]\` ${step1Label}`;

    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: cardMsgId,
        sender: 'assistant',
        timestamp: new Date(),
        text: initialText
      }
    ]);

    // Interval 2 detik: Step 2
    setTimeout(() => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === cardMsgId) {
          return {
            ...msg,
            text: `📝 **PERMINTAAN PEMBUATAN FILE TERDETEKSI**\n\n📌 **Topik & Obrolan:** "${topic}"\n\n✅ \`[Step 1/3]\` ${isFromChat ? 'Riwayat obrolan terkumpul' : 'Instruksi dianalisis'}.\n\`[Step 2/3 - 2s]\` ⚙️ *Mempersiapkan Typernova Document Studio...*`
          };
        }
        return msg;
      }));
    }, 2000);

    // Interval 2 detik berikutnya: Step 3 (Total 4s) -> Switch view to Typernova!
    setTimeout(() => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === cardMsgId) {
          return {
            ...msg,
            text: `📝 **PERMINTAAN PEMBUATAN FILE TERDETEKSI**\n\n📌 **Topik & Obrolan:** "${topic}"\n\n✅ \`[Step 1/3]\` ${isFromChat ? 'Riwayat obrolan terkumpul' : 'Instruksi dianalisis'}.\n✅ \`[Step 2/3]\` Typernova Studio Siap.\n🚀 \`[Step 3/3 - 4s]\` *Mengalihkan rute & memicu penulisan file otomatis di Typernova!*`
          };
        }
        return msg;
      }));

      setTimeout(() => {
        localStorage.setItem('pending_agent_topic', topic);
        if (chatContext) {
          localStorage.setItem('pending_chat_context', chatContext);
        }
        onNavigate?.('documents', docType);
      }, 600);
    }, 4000);
  };

  const handleSendMessage = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Unlock browser audio upon sending so auto-voice can speak seamlessly when generation completes
    deepernovaTtsService.unlockAudio();

    // Check 700k Token Limit
    if (isTokenUsageLimited()) {
      showAlert(
        userLanguage === 'id'
          ? `⚠️ Limit token 700.000 telah tercapai. Penggunaan token akan di-reset dalam ${countdownText || '4 jam'}.`
          : `⚠️ Token limit 700,000 reached. Token usage will reset in ${countdownText || '4 hours'}.`,
        'error',
        5000
      );
      return;
    }

    if (inputValue.trim().startsWith('/')) {
      handleExecuteCommand(inputValue.trim());
      return;
    }

    // Check if there's any message content to send (regular text OR text queue OR uploaded images OR uploaded files)
    const hasRegularText = inputValue.trim().length > 0;
    const hasQueuedText = textQueue.length > 0;
    const hasUploadedImages = uploadedImages.length > 0;
    const hasUploadedFiles = uploadedFiles.length > 0;

    console.log('[DEBUG] hasRegularText:', hasRegularText, 'inputValue:', inputValue);
    console.log('[DEBUG] hasQueuedText:', hasQueuedText, 'hasUploadedImages:', hasUploadedImages, 'hasUploadedFiles:', hasUploadedFiles);

    if (!hasRegularText && !hasQueuedText && !hasUploadedImages && !hasUploadedFiles) {
      console.log('[DEBUG] No content to send, returning');
      return;
    }

    // Instantly switch Send button into Stop Generating with zero delay!
    isUserStoppedRef.current = false;
    isSearchAbortedRef.current = false;
    isRecallAbortedRef.current = false;
    setIsSendGenerating(true);
    isSendGeneratingRef.current = true;
    setLoading(true);

    // Auto-expire safety timer: isSendGenerating only serves as an instant bridge
    setTimeout(() => {
      if (isSendGeneratingRef.current) {
        isSendGeneratingRef.current = false;
        setIsSendGenerating(false);
      }
    }, 4000);

    // DeeperNova AI requires active connection
    if (!navigator.onLine) {
      console.warn('[ChatBot] Cannot send message: offline detected');
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      setLoading(false);
      isProcessingRef.current = false;
      setConvLoading(false);
      setConnectionErrorMessage(
        userLanguage === 'id'
          ? 'Tidak ada koneksi internet. Pastikan jaringan aktif untuk menggunakan DeeperNova AI.'
          : 'No internet connection. Please ensure an active network to use DeeperNova AI.'
      );
      setShowConnectionErrorModal(true);
      return;
    }

    const safeStringify = (value, maxLen = 30000) => {
      if (value == null) return '';
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return str.length > maxLen ? `${str.slice(0, maxLen)}\n...[TRUNCATED]` : str;
    };

    const queuedTextContent = textQueue
      .map(item => safeStringify(item.content, 20000))
      .filter(Boolean)
      .join('\n\n')
      .trim();
    const activeFileContent = activeFile ? safeStringify(activeFile.content, 20000) : '';
    const uploadedFilesContent = uploadedFiles
      .map((file, index) => `=== ATTACHED FILE ${index + 1}: ${file.name} ===\n${safeStringify(file.content, 20000)}`)
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const fullMessageParts = [];
    if (inputValue.trim()) fullMessageParts.push(inputValue.trim());
    if (queuedTextContent) fullMessageParts.push(queuedTextContent);
    if (activeFileContent) {
      fullMessageParts.push(`File: ${activeFile.name || 'unknown'}\n${activeFileContent}`);
    }
    if (uploadedFilesContent) fullMessageParts.push(uploadedFilesContent);

    let fullMessage = fullMessageParts.join('\n\n').trim();
    if (!fullMessage) {
      fullMessage = userLanguage === 'id'
        ? 'Silakan periksa berkas atau gambar terlampir.'
        : 'Please review the attached files or images.';
    }

    console.log('[DEBUG] fullMessage:', fullMessage.substring(0, 2000));
    isUserStoppedRef.current = false;

    // Collect all attached files metadata for clean, summarized bubble rendering
    const filesToDisplay = [];
    if (activeFile && activeFile.content) {
      filesToDisplay.push({
        id: activeFile.id || `active_${Date.now()}`,
        name: activeFile.name || 'Berkas Terlampir',
        size: activeFile.size || Math.round(activeFile.content.length / 1024),
        fileType: activeFile.fileType || activeFile.type || 'document'
      });
    }
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach(f => {
        filesToDisplay.push({
          id: f.id,
          name: f.name,
          size: f.size,
          tokens: f.tokens,
          fileType: f.fileType
        });
      });
    }

    // Clean user display text: ONLY the prompt typed by user (never raw file dump!)
    const cleanUserText = inputValue.trim();

    const userMessageForChat = {
      id: `user_${Date.now()}`,
      text: cleanUserText, // Clean text only, never raw file dump!
      fullPrompt: fullMessage, // Complete prompt with file content for LLM
      sender: 'user',
      timestamp: new Date(),
      textQueue: textQueue.length > 0 ? textQueue : undefined,
      uploadedFiles: filesToDisplay.length > 0 ? filesToDisplay : undefined,
      files: filesToDisplay.length > 0 ? filesToDisplay : undefined,
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
    };

    const placeholderId = Date.now() + Math.floor(Math.random() * 1000);
    const botMessage = {
      id: placeholderId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
      modelName: currentModelObj?.name || 'DeeperNova Gold 1.5',
    };

    const updatedConversationHistory = [...messages, userMessageForChat];
    currentConversationHistoryRef.current = updatedConversationHistory;
    setMessages(prev => [...prev, userMessageForChat, botMessage]);
    lastSentPromptRef.current = fullMessage;
    lastSentUserMessageIdRef.current = userMessageForChat.id;
    lastSentUserInputTextRef.current = inputValue.trim() || fullMessage;
    currentMessageIdRef.current = placeholderId;

    // Ensure conversation ID is established immediately so later state updates don't cause sudden scroll jumping
    let activeConvId = currentConversationId;
    if (!activeConvId) {
      activeConvId = `conv_${Date.now()}`;
      lastLoadedConversationIdRef.current = activeConvId;
      setCurrentConversationId(activeConvId);
      rememberConversationId(activeConvId);
    try { memoryService.processConversation([...messages, userMessageForChat], activeConvId, userLanguage); } catch (e) {}
    }

    // Reset internet warning banner & start progressive loading phase timers (Mengirim -> Merenungi -> Lambat)
    setShowNoInternetBanner(false);
    startLoadingPhaseTimers();
    if (timeoutInternetCheckRef.current) clearTimeout(timeoutInternetCheckRef.current);

    // 1. Capture uploaded images to RAM state BEFORE clearing UI input tray
    const imagesToActivate = uploadedImages.map(img => ({
      ...img,
      followUpRemaining: img.followUpRemaining != null ? img.followUpRemaining : 20,
      activatedAt: Date.now(),
    }));

    // Auto-save reference images to permanent gallery storage (local & logged-in modes)
    imagesToActivate.forEach(img => {
      saveImageToGallery({
        id: img.id,
        prompt: `Referensi: ${img.fileName || 'Gambar'}`,
        imageUrl: img.publicUrl || img.dataUrl || img.url,
        type: 'uploaded',
        model: 'user-upload'
      }, isAuthenticated, user).catch(e => console.warn('[ChatBot] Gallery save warning:', e));
    });

    // Reference images for current turn:
    // If user uploaded new image(s) in this message, use ONLY the new image(s) (do NOT merge previous images).
    // If user didn't upload new image, only retain previous images IF the user explicitly references the image/visual.
    const isExplicitImageFollowUp = activeImageFollowUps.length > 0 &&
      /(gambar|foto|lukisan|image|photo|picture|di atas|ini apa|siapa ini|jelaskan gambar|lihat|visual|yg tadi)/i.test(inputValue);

    let imagesToPass = [];
    if (imagesToActivate.length > 0) {
      setActiveImageFollowUps(imagesToActivate);
      imagesToPass = imagesToActivate;
      capturedRefImagesRef.current = imagesToActivate;
    } else if (isExplicitImageFollowUp) {
      imagesToPass = activeImageFollowUps;
      capturedRefImagesRef.current = activeImageFollowUps;
    } else {
      // General question or search query: do NOT pass old images to prevent biasing LLM
      imagesToPass = [];
      capturedRefImagesRef.current = [];
      if (activeImageFollowUps.length > 0) {
        setActiveImageFollowUps([]);
      }
    }

    // 2. IMMEDIATELY CLEAR INPUT TRAY UI STATE (input text, uploaded images preview, uploaded files)
    setInputValue('');
    setTextQueue([]);
    setUploadedImages([]);
    setUploadedFiles([]);
    setAttachmentQueueMinimized(true);
    if (globalThis.textareaRef) globalThis.textareaRef.style.height = 'auto';
    if (currentConversationId) {
      localStorage.removeItem(`deepernova_images_${currentConversationId}`);
    }

    const detectedImageRequest = checkForImageRequest(inputValue);
    if (detectedImageRequest && detectedImageRequest.isExplicit) {
      console.log('[ChatBot] Explicit image request directive detected in handleSendMessage:', detectedImageRequest);
      handleInlineImageGeneration(detectedImageRequest, userMessageForChat, imagesToPass);
      return;
    }

    // 🔍 UPFRONT SEARCH INTENT & WEB SEARCH DIRECTIVE DETECTION
    // Autonomous AI search instinct (no manual Web Search button) — skipped when files/images are attached
    const hasAttachmentContext = imagesToPass.length > 0 || filesToDisplay.length > 0 || textQueue.length > 0;
    const detectedSearchQuery = hasAttachmentContext
      ? null
      : detectUpfrontSearchIntent(cleanUserText, userLanguage);

    if (detectedSearchQuery) {
      console.log('[ChatBot] 🔍 Upfront search intent detected:', detectedSearchQuery);
      triggeredSearchRequestsRef.current.add(placeholderId);
      currentStreamingTextRef.current = '';

      // Update placeholder bot message to searching state with empty text
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                text: '',
                isStreaming: false,
                isSearching: true,
                searchQuery: detectedSearchQuery,
                searchResults: null,
                searchSources: [],
                searchSteps: [{
                  query: detectedSearchQuery,
                  isSearching: true,
                  sources: [],
                  images: []
                }]
              }
            : msg
        )
      );

      setConvLoading(true);
      setLoading(true);
      setError(null);
      setIsScrolledUp(false);
      holdScrollRef.current = false;
      isLockedToUserAskRef.current = true;
      lockedUserMessageIdRef.current = userMessageForChat.id;
      scrollToUserMessage(false);

      // Execute search, extract sources & media bubbles, then synthesize final answer
      executeSearchAndSynthesize({
        messageId: placeholderId,
        searchQuery: detectedSearchQuery,
        userPrompt: cleanUserText,
        baseHistory: updatedConversationHistory
      });
      return;
    }

    if (imagesToPass.length > 0 && !isReasoningImage) {
      setReasoningImages(imagesToPass);
      setReasoningPrompt(inputValue);
      setReasoningDecision(null);
    }

    // Status messages that change based on elapsed time - longer intervals for believability
    // Pre-calculate random delays for consistency
    const statusMessages = [
      { time: 2000, msg: userLanguage === 'id' ? 'membaca pertanyaan...' : 'reading question...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 4000, msg: userLanguage === 'id' ? 'memproses konteks...' : 'processing context...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 7000, msg: userLanguage === 'id' ? 'menganalisis informasi...' : 'analyzing information...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 10000, msg: userLanguage === 'id' ? 'sedang berpikir...' : 'thinking...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 13000, msg: userLanguage === 'id' ? 'menghitung respons...' : 'calculating response...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 16000, msg: userLanguage === 'id' ? 'menyusun jawaban...' : 'composing answer...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 19000, msg: userLanguage === 'id' ? 'memvalidasi data...' : 'validating data...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 22000, msg: userLanguage === 'id' ? 'mengorganisir informasi...' : 'organizing information...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 25000, msg: userLanguage === 'id' ? 'menyiapkan output...' : 'preparing output...', randomDelay: (Math.random() - 0.5) * 800 },
      { time: 28000, msg: userLanguage === 'id' ? 'finalisasi respons...' : 'finalizing response...', randomDelay: (Math.random() - 0.5) * 800 },
    ];
    
    // Set up status update interval
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
    }
    
    statusUpdateIntervalRef.current = setInterval(() => {
      if (streamingStartTimeRef.current) {
        const elapsed = Date.now() - streamingStartTimeRef.current;
        let matchedMsg = '';
        
        for (let i = statusMessages.length - 1; i >= 0; i--) {
          // Use the pre-calculated random delay for consistency
          if (elapsed > statusMessages[i].time + statusMessages[i].randomDelay) {
            matchedMsg = statusMessages[i].msg;
            break;
          }
        }
        
        setLoadingStatusMsg(matchedMsg);
      }
    }, 500); // Check every 500ms for smooth updates
    
    setConvLoading(true);
    setError(null);
    setIsScrolledUp(false); // Hide scroll button
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    abortControllersMapRef.current.set('current', abortController);
    if (activeConvId) {
      abortControllersMapRef.current.set(activeConvId, abortController);
    }
    if (currentConversationId) {
      abortControllersMapRef.current.set(currentConversationId, abortController);
    }
    
    // SCROLL PERTAMA - kunci bubble chat ask tepat di paling atas viewport
    holdScrollRef.current = false;
    isLockedToUserAskRef.current = true;
    lockedUserMessageIdRef.current = userMessageForChat.id;
    scrollToUserMessage(false);

    let rawText = '';
    let targetFullText = '';
    let displayedFullText = '';
    let fullText = '';
    let targetReasoningText = '';
    let displayedReasoningText = '';
    let reasoningStartTime = null;
    let reasoningEndTime = null;
    let isReasoning = false;
    let reasoningDuration = null;

    try {
      // Send to Deepernova AI with conversation history for advanced context
      // Use fullMessage (with file contents) instead of inputValue
      // Capture conversationId NOW so it's used in streaming callback, not currentConversationId (which can change)
      const streamingConversationId = currentConversationId;
      
      const response = await sendMessageToGrok(fullMessage, updatedConversationHistory, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, sessionMessageCount + 1, imagesToPass, isReasoningCapable ? isReasoningEnabled : false, true);
      let streamDone = false;
      currentStreamingTextRef.current = '';

      let streamUsage = null;
      let smoothStreamTimer = null;

      const flushSmoothTick = () => {
        // Bail immediately if aborted (stop button pressed)
        if (abortController.signal.aborted) {
          if (smoothStreamTimer) {
            clearInterval(smoothStreamTimer);
            smoothStreamTimer = null;
            smoothStreamTimerRef.current = null;
          }
          return;
        }
        let updated = false;

        // 1. Smoothly advance reasoning text
        if (displayedReasoningText.length < targetReasoningText.length) {
          const diff = targetReasoningText.length - displayedReasoningText.length;
          const step = getSmoothTypingStep(diff, streamDone, displayedReasoningText.length, targetReasoningText.length);
          displayedReasoningText += targetReasoningText.substr(displayedReasoningText.length, step);
          updated = true;
        }

        // 2. Smoothly advance main content text
        if (displayedFullText.length < targetFullText.length) {
          const diff = targetFullText.length - displayedFullText.length;
          const step = getSmoothTypingStep(diff, streamDone, displayedFullText.length, targetFullText.length);
          displayedFullText += targetFullText.substr(displayedFullText.length, step);
          currentStreamingTextRef.current = displayedFullText;
          updated = true;
        }

        if (updated) {
          // Smooth auto-scroll while generating if user is near bottom
          const now = Date.now();
          if (now - lastScrollTickRef.current > 75) {
            lastScrollTickRef.current = now;
            smoothAutoScroll();
          }

          // When stream is done AND display has caught up, mark as NOT streaming anymore
          const stillFlushing = displayedFullText.length < targetFullText.length || displayedReasoningText.length < targetReasoningText.length;
          const streamingFlag = streamDone ? stillFlushing : true;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? {
                    ...msg,
                    text: displayedFullText,
                    reasoningText: displayedReasoningText,
                    reasoningDuration: reasoningDuration || msg.reasoningDuration,
                    isReasoning: isReasoning,
                    isReasoningComplete: !isReasoning && !!displayedReasoningText,
                    isStreaming: streamingFlag,
                    isThinking: isReasoning,
                  }
                : msg
            )
          );
        }
      };

      const startSmoothStreamer = () => {
        if (!smoothStreamTimer) {
          smoothStreamTimer = setInterval(flushSmoothTick, 22);
          smoothStreamTimerRef.current = smoothStreamTimer;
        }
      };

      // Process streaming response - chunks come in real-time
      const streamResult = await processStreamingResponse(response, (chunk) => {
        // Clear loading phase timers once tokens start streaming
        clearLoadingPhaseTimers();
        if (timeoutInternetCheckRef.current) {
          clearTimeout(timeoutInternetCheckRef.current);
          timeoutInternetCheckRef.current = null;
        }

        // Handle stepper-type updates (don't accumulate as text)
        if (typeof chunk === 'object' && chunk.type === 'stepper') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? { ...msg, stepperData: chunk.data }
                : msg
            )
          );
          return;
        }

        // Handle live reasoning chunk from DeepSeek / Boron
        if (typeof chunk === 'object' && chunk.type === 'reasoning') {
          if (!isReasoningCapable || !isReasoningEnabled) {
            // When reasoning mode is OFF or model does not support reasoning (like Gold), do not show reasoning box or stream reasoning text
            return;
          }
          if (!reasoningStartTime) {
            reasoningStartTime = Date.now();
            isReasoning = true;
          }
          targetReasoningText += chunk.content;
          triggerWebSearchIfNeeded(placeholderId, targetReasoningText);
          if (triggeredSearchRequestsRef.current.has(placeholderId)) {
            return;
          }
          startSmoothStreamer();
          return;
        }
        
        // Handle regular text / content chunk with smooth fluid render
        const textContent = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
        if (textContent) {
          if (isReasoning && !reasoningEndTime) {
            reasoningEndTime = Date.now();
            isReasoning = false;
            reasoningDuration = Math.max(0.1, ((reasoningEndTime - reasoningStartTime) / 1000)).toFixed(1);
          }

          rawText += textContent;
          targetFullText = sanitizeStreamingText(rawText);
          triggerInlineImageIfNeeded(placeholderId, rawText);
          triggerWebSearchIfNeeded(placeholderId, rawText);
          triggerRecallMemoryIfNeeded(placeholderId, rawText);
          triggerMemoryActionsIfNeeded(placeholderId, rawText);
          if (triggeredSearchRequestsRef.current.has(placeholderId) || triggeredRecallRequestsRef.current.has(placeholderId)) {
            return;
          }
          // Hold rendering while a (possibly split) search tag is still arriving, so raw
          // "[SEARCH_REQUEST: ..." or preamble text is never flashed before the result bubbles.
          const leadingText = rawText.trimStart();
          const isPartialSearchTag =
            /^\[(?:S|SE|SEA|SEAR|SEARC|SEARCH)(?:_|_R|_RE|_REQ|_REQU|_REQUE|_REQUES|_REQUEST)?(?::[^\]]*)?$/i.test(leadingText) ||
            /^<(?:s|se|sea|sear|searc|search)(?:_request)?(?:>[\s\S]*)?$/i.test(leadingText) && !/<\/search(?:_request)?>/i.test(leadingText) ||
            /\[(?:SEARCH_REQUEST|SEARCH):[^\]]*$/i.test(rawText);
          if (isPartialSearchTag) {
            return;
          }
          startSmoothStreamer();
        }
        // Do not auto-scroll here; keep the blank area stable while generating
      }, abortController.signal);
      streamUsage = streamResult?.usage || null;

      if (abortController.signal.aborted || isUserStoppedRef.current) {
        if (smoothStreamTimer) {
          clearInterval(smoothStreamTimer);
          smoothStreamTimer = null;
          smoothStreamTimerRef.current = null;
        }
        if (!isSearchAbortedRef.current && !isRecallAbortedRef.current) {
          setConvLoading(false);
          setLoading(false);
          setLoadingPhase(null);
          isProcessingRef.current = false;
        }
        return;
      }

      streamDone = true;
      startSmoothStreamer();

      // Smoothly let typing animation catch up completely with capped, fluid pace
      let drainSafetyLimit = 0;
      while ((displayedFullText.length < targetFullText.length || displayedReasoningText.length < targetReasoningText.length) && drainSafetyLimit < 300) {
        if (abortController.signal.aborted || isUserStoppedRef.current) break;
        drainSafetyLimit++;
        flushSmoothTick();
        await new Promise((r) => setTimeout(r, 10));
      }

      if (smoothStreamTimer) {
        clearInterval(smoothStreamTimer);
        smoothStreamTimer = null;
        smoothStreamTimerRef.current = null;
      }

      displayedFullText = targetFullText;
      displayedReasoningText = targetReasoningText;
      fullText = targetFullText;

      // GUARANTEE: NEVER FORGET TO RESPOND AFTER REASONING OR ON EMPTY STREAM
      if (!fullText || !fullText.trim()) {
        const reasoningSource = (targetReasoningText || displayedReasoningText)?.trim();
        if (reasoningSource) {
          console.warn('[ChatBot] Stream finished with reasoning but empty text. Auto-synthesizing verified response...');
          fullText = extractResponseFromReasoning(reasoningSource);
        }
        if (!fullText || !fullText.trim()) {
          console.warn('[ChatBot] Stream finished completely empty. Generating guaranteed Boron 1.1 response...');
          fullText = generateInstantBoronResponse(lastSentUserInputTextRef.current || '');
        }
        displayedFullText = fullText;
        targetFullText = fullText;
      }

      if (reasoningStartTime && !reasoningDuration) {
        const endTime = reasoningEndTime || Date.now();
        reasoningDuration = Math.max(0.1, ((endTime - reasoningStartTime) / 1000)).toFixed(1);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                text: fullText,
                reasoningText: targetReasoningText || msg.reasoningText,
                reasoningDuration: reasoningDuration || msg.reasoningDuration,
                isReasoning: false,
                isReasoningComplete: !!(targetReasoningText || msg.reasoningText),
                isStreaming: false,
                isThinking: false,
              }
            : msg
        )
      );

      finishStreaming(placeholderId, fullText, streamUsage);
      setConvLoading(false);
      setLoading(false);
      clearLoadingPhaseTimers();

      // Ensure user ask bubble stays anchored at the top when generating completes
      if (isLockedToUserAskRef.current && !holdScrollRef.current) {
        lockUserAskToTop(true);
        setTimeout(() => {
          if (isLockedToUserAskRef.current && !holdScrollRef.current) {
            lockUserAskToTop(true);
          }
        }, 60);
      }

      if (abortController.signal.aborted) {
        return;
      }

      // ============================================================
      // 🔍 CHECK FOR SEARCH FLAG BEFORE ANY CLEANUP
      // This must happen FIRST so the search flow can take over
      // and the normal cleanup doesn't interfere.
      // ============================================================
      const hasSearchFlag = /\[(?:SEARCH_REQUEST|SEARCH):\s*(.+?)\]/i.test(fullText) || /<search(?:_request)?>\s*([\s\S]+?)\s*<\/search(?:_request)?>/i.test(fullText);
      if (hasSearchFlag) {
        // Trigger search immediately — this will handle its own cleanup
        triggerWebSearchIfNeeded(placeholderId, fullText);
        // Skip ALL normal completion cleanup — search flow handles it
        return;
      }

      // ============================================================
      // 🧠 CHECK FOR RECALL MEMORY FLAG BEFORE ANY CLEANUP
      // ============================================================
      const hasRecallFlag = /\[RECALL_MEMORY:\s*(.+?)\]/.test(fullText);
      if (hasRecallFlag) {
        triggerRecallMemoryIfNeeded(placeholderId, fullText);
        return;
      }

      // ============================================================
      // 🧠 CHECK FOR AUTONOMOUS MEMORY ACTIONS BEFORE CLEANUP
      // ============================================================
      triggerMemoryActionsIfNeeded(placeholderId, fullText);

      // ============================================================
      // ⏰ CHECK FOR AI REMINDER/ALARM/CALENDAR FLAG
      // ============================================================
      console.log('[ChatBot] Full AI response text:', fullText);
      console.log('[ChatBot] Contains REMINDER_REQUEST?', fullText.includes('REMINDER_REQUEST'));
      const reminderMatch = fullText.match(/\[REMINDER_REQUEST:\s*(\{[\s\S]*?\})\]/);
      console.log('[ChatBot] reminderMatch result:', reminderMatch);
      let createdReminder = null;
      if (reminderMatch) {
        try {
          const payload = JSON.parse(reminderMatch[1]);
          console.log('[ChatBot] Parsed reminder payload:', payload);
          createdReminder = reminderService.addReminder({
            title: payload.title || 'Pengingat',
            datetime: payload.datetime || new Date().toISOString(),
            type: payload.type || 'reminder',
            description: payload.description || 'Dibuat via AI Chatbot'
          });
          console.log('[ChatBot] Created reminder:', createdReminder);
          fullText = fullText.replace(/\[REMINDER_REQUEST:\s*\{[\s\S]*?\}\]\n*/g, '').trim();
        } catch (e) {
          console.error('[ChatBot] Error parsing REMINDER_REQUEST flag:', e);
        }
      } else {
        // Fallback: If AI did not output tag, check if user's prompt had explicit reminder/alarm intent
        const userPromptText = lastSentUserInputTextRef.current || '';
        const fallbackIntent = reminderService.parseReminderIntent(userPromptText);
        if (fallbackIntent) {
          createdReminder = reminderService.addReminder({
            title: fallbackIntent.title,
            datetime: fallbackIntent.datetime,
            type: fallbackIntent.type,
            description: fallbackIntent.description || 'Dibuat via AI Chatbot'
          });
          console.log('[ChatBot] Created reminder via fallback intent:', createdReminder);
        }
      }

      // finishStreaming already executed at line ~7276

      if (createdReminder) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId ? { ...msg, reminder: createdReminder } : msg
          )
        );
      }
      

      
      // Keep view stable with user ask bubble peacefully at the top
      

      
      // ✨ AI Self-Trigger Agent Detection
      // Parse [AGENT_EXECUTE: task_description] flag from response
      const agentExecuteMatch = fullText.match(/\[AGENT_EXECUTE:\s*([^\]]+)\]/);
      if (agentExecuteMatch) {
        const agentTaskDescription = agentExecuteMatch[1].trim();
        console.log(`[ChatBot] 🤖 AI triggered agent execution: "${agentTaskDescription}"`);
        
        // Remove the flag from displayed text
        const cleanedText = fullText.replace(/\s*\[AGENT_EXECUTE:[^\]]*\]/, '').trim();
        
        // Update message with cleaned text (without flag)
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const msgIndex = updatedMessages.findIndex(m => m.id === placeholderId);
          if (msgIndex !== -1) {
            updatedMessages[msgIndex] = {
              ...updatedMessages[msgIndex],
              text: cleanedText
            };
          }
          return updatedMessages;
        });

        // Prevent duplicate triggers for the same message
        if (triggeredAgentTasksRef.current.has(placeholderId)) {
          console.log(`[ChatBot] Agent task already triggered for message ${placeholderId}, skipping duplicate execution`);
        } else {
          triggeredAgentTasksRef.current.add(placeholderId);

          // Queue agent execution asynchronously to avoid blocking
          setTimeout(async () => {
            // Track background agent tasks to avoid showing premature error banners
            backgroundAgentCountRef.current += 1;
            try {
              console.log(`[ChatBot] Executing agent task: ${agentTaskDescription}`);
              const userId = user?.id || 'guest';
              
              // Call agent endpoint
              const response = await fetch(`${API_BASE_URL}/api/agent/execute`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  task: agentTaskDescription,
                  userId: userId
                })
              });
              
              if (!response.ok) {
                console.error(`Agent execution failed: ${response.status}`);
                return;
              }
              
              const result = await response.json();
              console.log(`[ChatBot] Agent execution completed:`, result);
              
              // If file was generated, add download link to message
              if (result.success && result.fileName && result.downloadUrl) {
                setMessages((prevMessages) => {
                  const updatedMessages = [...prevMessages];
                  const msgIndex = updatedMessages.findIndex(m => m.id === placeholderId);
                  if (msgIndex !== -1) {
                    updatedMessages[msgIndex] = {
                      ...updatedMessages[msgIndex],
                      downloadUrl: result.downloadUrl,
                      fileName: result.fileName,
                      agentResult: result
                    };
                  }
                  return updatedMessages;
                });
              }
            } catch (err) {
              console.error('[ChatBot] Agent execution error:', err);
            } finally {
              backgroundAgentCountRef.current = Math.max(0, backgroundAgentCountRef.current - 1);
            }
          }, 500);
        }
      }
      
      // finishStreaming already called at drain completion (line ~7231) — no duplicate call needed
      
      setAnimatingMessages((prev) => ({ ...prev, [placeholderId]: false }));
      setLastMessage(null);
      setLoading(false);
      setConvLoading(false); // Mark this conversation as done loading
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      isProcessingRef.current = false;
      clearLoadingPhaseTimers();
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }

      // Immediate save after response completes
      const saveAfterResponse = async () => {
        console.log(`[ChatBot] Saving conversation after response completed`);
        await ConversationPersistenceService.saveConversations(conversations, isAuthenticated, isGuest);
      };
      setTimeout(() => saveAfterResponse(), 100);

      // Clear uploaded files and images, then minimize image queue
      setTimeout(() => {
        setUploadedFiles([]);
        setUploadedImages([]);
        setAttachmentQueueMinimized(true);
        // Also clear from localStorage
        if (currentConversationId) {
          localStorage.removeItem(`deepernova_images_${currentConversationId}`);
        }
      }, 200);

      // Keep view stable without inserting previous-messages button layout shifts
      // (Compact view is managed only when explicitly toggled)

      // Only trigger inline image generation when the assistant explicitly emits an IMAGE_REQUEST tag.
      const textForImageTrigger = fullText;
      triggerInlineImageIfNeeded(placeholderId, textForImageTrigger);

      // Process and store memories from this interaction
      memoryService.processConversation([...messages, userMessageForChat], currentConversationId, userLanguage);

      // Generate AI-powered chat title after first response (only once per session)
      const titleConvId = currentConversationId;
      setTimeout(() => {
        if (titleConvId) {
          if (!aiTitledConversationsRef.current.has(titleConvId)) {
            generateChatTitle(titleConvId);
          }
          // Load sources for display
          loadSourcesForConversation(titleConvId);
        }
      }, 500);
      
      // Reset auto-retry counter on success
      autoRetryCountRef.current = 0;
    } catch (err) {
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
      clearLoadingPhaseTimers();
      if (timeoutInternetCheckRef.current) {
        clearTimeout(timeoutInternetCheckRef.current);
        timeoutInternetCheckRef.current = null;
      }

      const isAborted = isUserStoppedRef.current ||
                        abortController?.signal?.aborted ||
                        err.name === 'AbortError' ||
                        (err.message && /abort|cancel/i.test(err.message));

      if (isAborted) {
        if (isSearchAbortedRef.current || isRecallAbortedRef.current) {
          // DON'T reset the flag here — the search/recall flow will handle it
          return;
        }
        if (autoRetryTimeoutRef.current) {
          clearTimeout(autoRetryTimeoutRef.current);
          autoRetryTimeoutRef.current = null;
        }
        autoRetryCountRef.current = 0;
        partialMessageIdRef.current = null;
        isProcessingRef.current = false;
        setConvLoading(false);
        setLoading(false);
        setLoadingPhase(null);
        showErrorBanner(userLanguage === 'id' ? 'Permintaan dihentikan.' : 'Request stopped.');
        return;
      } else {
        const isNetworkErr = !navigator.onLine || 
          (err.message && /failed to fetch|network|offline|load failed|timeout/i.test(err.message));

        const hasAnyContent = !!(fullText || rawText || displayedFullText);
        const isLocalBoron = selectedModel === 'deepernova-boron-1.1' || selectedModel?.toLowerCase()?.includes('boron');

        // For local Boron model, NEVER erase the bot message on load issues! Provide immediate friendly answer
        if (!hasAnyContent && isLocalBoron) {
          const emergencyFallback = generateInstantBoronResponse(lastSentUserInputTextRef.current || '');
          
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    text: emergencyFallback,
                    isStreaming: false,
                    isThinking: false
                  }
                : m
            )
          );
          setConvLoading(false);
          setLoading(false);
          isProcessingRef.current = false;
        } else if (!hasAnyContent && (isNetworkErr || autoRetryCountRef.current >= MAX_AUTO_RETRY)) {
          // Rollback: restore input text to input field
          setInputValue(lastSentUserInputTextRef.current || fullMessage || '');

          // Remove bot placeholder and user message from conversation history
          if (placeholderId || lastSentUserMessageIdRef.current) {
            setMessages((prev) =>
              prev.filter((m) => m.id !== placeholderId && m.id !== lastSentUserMessageIdRef.current)
            );
          }

          // Show blurred popup connection error modal
          setConnectionErrorMessage(
            userLanguage === 'id'
              ? 'Pesan Anda tidak terkirim karena masalah koneksi internet. Teks Anda telah dikembalikan ke kolom input.'
              : 'Your message was not sent due to network connection issues. Your text has been restored to the input box.'
          );
          setShowConnectionErrorModal(true);

          autoRetryCountRef.current = 0;
          setConvLoading(false);
          isProcessingRef.current = false; // Clear lock only when giving up
        } else if (hasAnyContent) {
          // Content was partially received, just finalize what we have without deleting!
          finishStreaming(placeholderId, fullText || rawText || displayedFullText);
          setConvLoading(false);
          setLoading(false);
          isProcessingRef.current = false;
        } else {
          // Auto-retry with exponential backoff
          if (placeholderId) {
            partialMessageIdRef.current = placeholderId;
          }
          autoRetryCountRef.current += 1;
          const delayMs = 1000 * autoRetryCountRef.current; // 1s, 2s, 3s
          
          console.log(`[Auto-Retry] Attempt ${autoRetryCountRef.current}/${MAX_AUTO_RETRY} in ${delayMs}ms`);
          
          // Clear any existing timeout
          if (autoRetryTimeoutRef.current) {
            clearTimeout(autoRetryTimeoutRef.current);
          }
          
          autoRetryTimeoutRef.current = setTimeout(() => {
            console.log(`[Auto-Retry] Retrying now...`);
            handleRetryAuto();
          }, delayMs);
          
          setConvLoading(false);
          setError(null);
          return;
        }
      }
      abortControllerRef.current = null;
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
    } finally {
      clearLoadingPhaseTimers();
      if (timeoutInternetCheckRef.current) {
        clearTimeout(timeoutInternetCheckRef.current);
        timeoutInternetCheckRef.current = null;
      }
      isProcessingRef.current = false;
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      setLoading(false);
      setConvLoading(false);
      console.log('[ChatBot] 🔓 Finished message processing & fully restored send button');
    }
  };

  const triggerInlineImageIfNeeded = (messageId, text) => {
    if (!text) return;
    
    // Find all matches globally
    const matches = [...text.matchAll(/\[IMAGE_REQUEST:\s*(.+?)\]/g)];
    if (matches.length === 0) return;
    
    // Check if we already processed this messageId
    if (triggeredImageRequestsRef.current.has(messageId)) {
      return;
    }
    triggeredImageRequestsRef.current.add(messageId);
    
    console.log(`[ChatBot] 🎨 IMAGE_REQUESTs detected: ${matches.length} images for message ${messageId}`);
    
    // Initialize states for all detected images
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { 
              ...msg, 
              isImageGenerating: true,
              imageUrls: msg.imageUrls || [],
              imageErrors: msg.imageErrors || [],
              imageGeneratingStates: matches.map(() => true)
            }
          : msg
      )
    );

    // Process each image request in parallel
    matches.forEach((match, index) => {
      const imagePrompt = match[1].trim();
      setTimeout(async () => {
        try {
          console.log(`[ChatBot] Starting in-place image #${index+1} generation for:`, imagePrompt);
          let englishPrompt = await ImageGenerationService.generateEnglishImagePrompt(imagePrompt);
          if (!englishPrompt) {
            englishPrompt = ImageGenerationService.translateToEnglish(imagePrompt);
          }
          const refinedPrompt = ImageGenerationService.enhancePrompt(englishPrompt);
          
          const imageAbortController = new AbortController();
          abortControllersMapRef.current.set(`image-${messageId}-${index}`, imageAbortController);

          const availableRefList = (capturedRefImagesRef.current && capturedRefImagesRef.current.length > 0)
            ? capturedRefImagesRef.current
            : ((uploadedImages && uploadedImages.length > 0)
              ? uploadedImages
              : (activeImageFollowUps && activeImageFollowUps.length > 0 ? activeImageFollowUps : []));

          // Helper to find targeted photo index from prompt (1st, 2nd, 3rd, 4th, etc.)
          const findTargetPhotoIndex = (text = '') => {
            if (!text || typeof text !== 'string') return -1;
            const lower = text.toLowerCase();
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?5|kelima|5|five)\b|\b(?:ke-?5|kelima)\s*(?:foto|gambar)\b/i.test(lower)) return 4;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?4|keempat|4|four)\b|\b(?:ke-?4|keempat)\s*(?:foto|gambar)\b/i.test(lower)) return 3;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?3|ketiga|3|three)\b|\b(?:ke-?3|ketiga)\s*(?:foto|gambar)\b/i.test(lower)) return 2;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?2|kedua|2|two|second)\b|\b(?:ke-?2|kedua)\s*(?:foto|gambar)\b/i.test(lower)) return 1;
            if (/\b(?:foto|gambar|image|picture|slide)\s*(?:ke-?1|pertama|kesatu|1|one|first)\b|\b(?:ke-?1|pertama|kesatu)\s*(?:foto|gambar)\b/i.test(lower)) return 0;
            if (/\b(?:foto|gambar|image)\s*(?:terakhir|paling akhir|last)\b/i.test(lower)) return 999;
            return -1;
          };

          // Smart reference image picker based on imagePrompt, userPrompt, or iteration index
          let activeRefObj = null;
          if (availableRefList.length > 0) {
            const promptTargetIdx = findTargetPhotoIndex(imagePrompt);
            const userTargetIdx = findTargetPhotoIndex(lastSentUserInputTextRef.current || '');

            if (promptTargetIdx >= 0) {
              activeRefObj = promptTargetIdx === 999
                ? availableRefList[availableRefList.length - 1]
                : (availableRefList[promptTargetIdx] || availableRefList[0]);
            } else if (userTargetIdx >= 0) {
              activeRefObj = userTargetIdx === 999
                ? availableRefList[availableRefList.length - 1]
                : (availableRefList[userTargetIdx] || availableRefList[0]);
            } else if (matches.length > 1) {
              activeRefObj = availableRefList[index] || availableRefList[0];
            } else {
              activeRefObj = availableRefList[0];
            }
          }

          const refImg = activeRefObj ? (activeRefObj.dataUrl || activeRefObj.url || activeRefObj.base64 || (typeof activeRefObj === 'string' ? activeRefObj : null)) : null;
          console.log(`[ChatBot] Generating image #${index+1} with targeted reference image:`, refImg ? (typeof refImg === 'string' ? refImg.substring(0, 30) + '...' : 'present') : 'none');

          const imageData = await ImageGenerationService.generateImage(
            refinedPrompt,
            '1024x1024',
            currentConversationId,
            null,
            refImg,
            imageAbortController.signal
          );

          console.log(`[ChatBot] Image #${index+1} generated successfully:`, imageData.image.url);

          setMessages((prev) => {
            const updated = prev.map((msg) => {
              if (msg.id === messageId) {
                const newUrls = [...(msg.imageUrls || [])];
                newUrls[index] = imageData.image.url;
                
                const newStates = [...(msg.imageGeneratingStates || [])];
                newStates[index] = false;
                
                // Keep legacy fields populated using the first generated image
                const firstUrl = newUrls.find(u => u) || imageData.image.url;

                return { 
                  ...msg, 
                  imageUrl: firstUrl, 
                  imageUrls: newUrls,
                  imageGeneratingStates: newStates,
                  isImage: false,
                  isImageGenerating: newStates.some(state => state)
                };
              }
              return msg;
            });

            setConversations((prevConvs) => {
              const updatedConvs = prevConvs.map(conv => 
                conv.id === currentConversationId
                  ? { ...conv, messages: updated, updatedAt: new Date().toISOString() }
                  : conv
              );
              ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
                .catch(err => console.error('[ChatBot] Error saving conversation:', err));
              return updatedConvs;
            });

            return updated;
          });
          
          abortControllersMapRef.current.delete(`image-${messageId}-${index}`);
        } catch (err) {
          console.error(`[ChatBot] Error generating image #${index+1}:`, err);
          const isSafetyErr = err.message && (err.message.includes('melanggar kebijakan') || err.message.includes('kebijakan'));
          const displayErrorMessage = isSafetyErr ? err.message : 'Model gambar sedang sangat sibuk, coba lagi nanti.';

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const newErrors = [...(msg.imageErrors || [])];
                newErrors[index] = displayErrorMessage;
                
                const newStates = [...(msg.imageGeneratingStates || [])];
                newStates[index] = false;

                return { 
                  ...msg, 
                  imageErrors: newErrors,
                  imageGeneratingStates: newStates,
                  isImageGenerating: newStates.some(state => state)
                };
              }
              return msg;
            })
          );
        }
      }, index * 150);
    });
  };

  // ============================================================
  // 🔍 SHARED SEARCH EXECUTION & CONVERSATIONAL SYNTHESIS
  // Executes web search, extracts media/sources, and calls AI to synthesize
  // response in full conversation context without reciting news like a robot.
  // ============================================================
  async function executeSearchAndSynthesize({ messageId, searchQuery, userPrompt = '', baseHistory = null }) {
    try {
      if (isUserStoppedRef.current) {
        console.log('[ChatBot] Search cancelled early by user stop');
        return;
      }

      const isGuestMode = Boolean(isGuest || !isAuthenticated || !user);
      console.log(`[ChatBot] Executing web search (isGuestMode: ${isGuestMode}): "${searchQuery}"`);
      const searchData = await executeWebSearch(searchQuery, {
        isGuest: isGuestMode,
        limit: 16,
        includeImages: true,
        userPrompt,
        language: userLanguage
      });
      
      if (isUserStoppedRef.current) {
        console.log('[ChatBot] Search returned but user already clicked stop');
        return;
      }
      
      console.log('[ChatBot] Search results received:', searchData);
      
      let resultsList = [];
      let aiOverviewText = '';
      if (searchData.success && searchData.data) {
        resultsList = searchData.data.organic_results || [];
        aiOverviewText = searchData.data._ai_overview_text || '';
      }
      
      if (resultsList.length === 0) {
        console.warn('[ChatBot] No organic_results from search API');
      }
      
      // Extract search images from results (inline images, organic thumbnails, and news images)
      const searchImages = [];
      if (searchData.success && searchData.data) {
        // 1. Extract from inline_images
        if (searchData.data.inline_images && Array.isArray(searchData.data.inline_images)) {
          searchData.data.inline_images.forEach(img => {
            if (img.thumbnail || img.link) {
              let sourceDomain = '';
              if (img.source) {
                try {
                  sourceDomain = new URL(img.source).hostname.replace('www.', '');
                } catch(e) {
                  sourceDomain = img.source;
                }
              }
              searchImages.push({
                url: img.thumbnail || img.link,
                title: img.title || searchQuery,
                source: img.source || '',
                sourceDomain
              });
            }
          });
        }
        // 2. Extract from organic_results thumbnails/rich snippets
        if (searchData.data.organic_results && Array.isArray(searchData.data.organic_results)) {
          searchData.data.organic_results.forEach(result => {
            let imgUrl = result.thumbnail;
            if (!imgUrl && result.rich_snippet && result.rich_snippet.top && result.rich_snippet.top.detected_extensions) {
              imgUrl = result.rich_snippet.top.detected_extensions.thumbnail;
            }
            
            if (imgUrl) {
              let sourceDomain = '';
              const url = result.link || result.url || '';
              if (url) {
                try {
                  sourceDomain = new URL(url).hostname.replace('www.', '');
                } catch(e) {
                  sourceDomain = url;
                }
              }
              searchImages.push({
                url: imgUrl,
                title: result.title || searchQuery,
                source: url,
                sourceDomain
              });
            }
          });
        }
        // 3. Extract from knowledge_graph image
        if (searchData.data.knowledge_graph) {
          const kg = searchData.data.knowledge_graph;
          if (kg.image) {
            let sourceDomain = '';
            if (kg.source) {
              try {
                sourceDomain = new URL(kg.source).hostname.replace('www.', '');
              } catch(e) {
                sourceDomain = kg.source;
              }
            }
            searchImages.push({
              url: kg.image,
              title: kg.title || searchQuery,
              source: kg.source || '',
              sourceDomain
            });
          }
          if (Array.isArray(kg.header_images)) {
            kg.header_images.forEach(img => {
              if (img.image) {
                searchImages.push({
                  url: img.image,
                  title: kg.title || searchQuery,
                  source: '',
                  sourceDomain: ''
                });
              }
            });
          }
        }
        // 4. Extract from news_results
        if (searchData.data.news_results && Array.isArray(searchData.data.news_results)) {
          searchData.data.news_results.forEach(news => {
            if (news.thumbnail) {
              let sourceDomain = '';
              if (news.link) {
                try {
                  sourceDomain = new URL(news.link).hostname.replace('www.', '');
                } catch(e) {
                  sourceDomain = news.link;
                }
              }
              searchImages.push({
                url: news.thumbnail,
                title: news.title || searchQuery,
                source: news.link || '',
                sourceDomain
              });
            }
          });
        }
      }

      // Filter duplicates
      const uniqueImages = [];
      const seenUrls = new Set();
      for (const img of searchImages) {
        if (img.url && !seenUrls.has(img.url)) {
          seenUrls.add(img.url);
          uniqueImages.push(img);
        }
      }

      // Map sources using uniqueImages for fallback thumbnails
      const sources = resultsList.map(item => {
        let domain = '';
        const url = item.link || item.url || '';
        try {
          domain = new URL(url).hostname;
        } catch(e) {
          domain = url;
        }
        
        let thumbnail = item.thumbnail || null;
        if (!thumbnail && uniqueImages.length > 0) {
          const cleanDom = domain.replace('www.', '');
          const matchedImg = uniqueImages.find(img => img.sourceDomain === cleanDom);
          if (matchedImg) {
            thumbnail = matchedImg.url;
          }
        }

        return {
          title: item.title || 'Untitled',
          link: url || '#',
          snippet: item.snippet || item.description || item.content || '',
          domain: domain,
          thumbnail: thumbnail
        };
      });

      // Update message state with sources and images (keep text strictly empty while preparing)
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const steps = (msg.searchSteps && msg.searchSteps.length > 0) ? [...msg.searchSteps] : [];
            let updatedSteps = [];
            if (steps.length === 0) {
              updatedSteps = [{
                query: searchQuery,
                isSearching: false,
                sources: sources,
                images: uniqueImages.slice(0, 6)
              }];
            } else {
              let matched = false;
              updatedSteps = steps.map((step) => {
                if (step.query === searchQuery || !matched) {
                  matched = true;
                  return { ...step, isSearching: false, sources: sources, images: uniqueImages.slice(0, 6) };
                }
                return step;
              });
              if (!matched) {
                updatedSteps.push({
                  query: searchQuery,
                  isSearching: false,
                  sources: sources,
                  images: uniqueImages.slice(0, 6)
                });
              }
            }

            return { 
              ...msg, 
              text: '', // Strictly empty!
              isSearching: false, 
              isThinking: true, 
              searchQuery: searchQuery, 
              searchResults: resultsList, 
              searchSources: sources,
              searchImages: uniqueImages.slice(0, 6),
              searchSteps: updatedSteps
            };
          }
          return msg;
        })
      );

      // Render search result bubbles first before AI starts typing response
      await new Promise(resolve => setTimeout(resolve, 450));

      // Build rich context from search results for the AI
      const searchContext = sources.map((s, idx) =>
        `[Sumber ${idx + 1}] ${s.title}\nURL: ${s.link}\nKutipan: ${s.snippet}`
      ).join('\n\n');

      // Initialize context history if empty
      searchContextHistoryRef.current[messageId] = searchContextHistoryRef.current[messageId] || [];
      searchContextHistoryRef.current[messageId].push(`--- HASIL PENCARIAN WEB (Kata Kunci: "${searchQuery}") ---\n${searchContext}`);

      // Single search only — no multi-step
      const currentStep = searchContextHistoryRef.current[messageId].length;
      
      // Helper: replace [Sumber N] with actual markdown links
      const replaceCitationsWithLinks = (text) => {
        if (!sources || sources.length === 0 || !text) return text || '';
        return text.replace(/\[Sumber\s*(\d+)\](?!\()/gi, (match, numStr) => {
          const idx = parseInt(numStr, 10) - 1;
          if (idx >= 0 && idx < sources.length) {
            const s = sources[idx];
            let domain = s.domain;
            if (!domain && s.link) {
              try {
                domain = new URL(s.link).hostname.replace(/^www\./i, '');
              } catch (e) {
                domain = 'Web';
              }
            }
            return `[${domain || 'Sumber ' + numStr}](${s.link})`;
          }
          return match;
        });
      };
      
      const currentTurnInput = (lastSentUserInputTextRef.current || '').trim();
      const userQuery = userPrompt || currentTurnInput || lastSentPromptRef.current || searchQuery || 'the query';
      const accumulatedHistoryContext = searchContextHistoryRef.current[messageId].join('\n\n');
      
      const nowTime = new Date();
      const currentYear = nowTime.getFullYear();
      const dayNameId = nowTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
      const dateFormattedId = nowTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });

      // Build a clear, focused conclusion prompt with strict latest-topic priority
      let conclusionPrompt = `[INSTRUKSI SISTEM: Waktu saat ini adalah tahun ${currentYear}, hari ${dayNameId}, ${dateFormattedId}. DILARANG mengucapkan terima kasih atas hasil pencarian atau menyebut "terima kasih atas informasinya". Pengguna TIDAK memberikan data ini; data ini didapat otomatis oleh mesin pencari internal. FOKUS SEPENUHNYA pada Pertanyaan Pengguna terbaru di bawah. Jika pengguna berganti topik baru, JAWAB TUNTAS TOPIK BARU TERSEBUT tanpa mengaitkan ke percakapan lama. LANGSUNG jawab pertanyaan pengguna secara komprehensif, terstruktur, dan akurat.]\n\n`;
      conclusionPrompt += `Pertanyaan Pengguna: "${userQuery}"\n\n`;
      conclusionPrompt += `--- DATA HASIL PENCARIAN WEB TERVERIFIKASI ---\n${accumulatedHistoryContext}\n\n`;
      if (aiOverviewText) {
        conclusionPrompt += `--- RINGKASAN INTISARI PENCARIAN ---\n${aiOverviewText}\n\n`;
      }
      conclusionPrompt += `--- PANDUAN STRUKTUR & KUALITAS JAWABAN PENCARIAN (SANGAT PENTING) ---
1. DILARANG BERTERIMA KASIH: Jangan pernah menulis "Terima kasih atas hasil pencariannya..." atau sejenisnya. Pengguna tidak memberikan informasi ini. Langsung mulai jawaban di paragraf pertama!
2. WAJIB BERPEDOMAN PADA WAKTU SEKARANG: Tahun saat ini adalah ${currentYear} (BUKAN 2024). Semua analisis berita dan peristiwa terkini berpedoman pada tanggal hari ini: ${dateFormattedId}.
3. FORMAT SUPER RAPI, BERJENJANG & SCANNABLE (WAJIB):
   - RINGKASAN INTI AWAL (1-2 kalimat): Awali jawaban langsung dengan inti/jawaban tegas atas pertanyaan pengguna di paragraf pertama.
   - SUBJUDUL TEMATIK (###): Gunakan heading markdown tingkat 3 (contoh: "### 1. Perkembangan Utama" atau "### Rincian Lengkap") untuk memecah informasi ke topik-topik terpisah.
   - POIN DENGAN JUDUL TEBAL (BOLD LEAD): Gunakan daftar bernomor atau bullet list di mana SETIAP BUTIR DIAWALI DENGAN JUDUL TEBAL:
     Contoh: "1. **Kenaikan Tarif:** Mulai diberlakukan..." atau "- **Dampak Regulasi:** Menurut laporan resmi..."
   - SATU BARIS KOSONG (BLANK LINE): Pisahkan setiap paragraf, subjudul, dan butir poin dengan SATU BARIS KOSONG agar jawaban lega, berjarak nyaman, dan tidak menumpuk padat.
   - TEBALKAN DATA KRUSIAL: Cetak tebal angka penting, persentase, tanggal spesifik, atau nama lembaga kunci.

4. KEAKURATAN & SITASI SUMBER:
   - Manfaatkan data faktual dari HASIL PENCARIAN WEB di atas. Jangan membaca berita kaku seperti robot, sajikan secara cerdas dan mengalir.
   - Cantumkan sitasi link markdown: [Nama Sumber](URL) tepat di akhir kalimat fakta yang bersumber dari web.

5. KNOWLEDGE FALLBACK PERCAYA DIRI:
   - Jika hasil web minim atau kurang relevan: Padukan mulus dengan pengetahuan internal Anda secara cerdas dan percaya diri tanpa meminta maaf dan tanpa menyalahkan hasil pencarian.

6. FOKUS MURNI PADA TOPIK TERAKHIR (TOPIC SWITCHING):
   - Jawab HANYA berdasarkan "Pertanyaan Pengguna" di atas dan data hasil pencarian web terkait.
   - Jika pertanyaan pengguna di atas adalah topik baru yang berbeda dari percakapan sebelumnya, DILARANG KERAS memaksakan mengaitkan, menghubungkan, atau mengungkit topik lama yang tidak relevan!

7. Berikan jawaban utuh sekarang. JANGAN memicu tag [SEARCH_REQUEST] lagi.\n\n[PERINGATAN SANGAT PENTING: Jawab HANYA tentang "${userQuery}" dan data web di atas! DILARANG KERAS menjawab atau menyinggung topik obrolan sebelumnya!]`;
      
      console.log(`[ChatBot] Sending search results to Deepernova for step ${currentStep} conclusion...`);
      
      if (isUserStoppedRef.current) {
        console.log('[ChatBot] Search conclusion cancelled early by user stop');
        return;
      }

      // Build history with clean conversational turns (omit pending message and search request flags)
      const sourceHistory = Array.isArray(baseHistory) && baseHistory.length > 0 
        ? baseHistory 
        : ((currentConversationHistoryRef.current && currentConversationHistoryRef.current.length > 0) ? currentConversationHistoryRef.current : messages);
      const cleanHistoryForSearch = sourceHistory
        .filter(msg => msg && msg.id !== messageId)
        .filter(msg => {
          const txt = (msg.text || msg.content || '').trim();
          return !txt.startsWith('[SEARCH_REQUEST:') && !msg.isSearching;
        })
        .slice(-2); // Limit to max 2 recent turns to prevent cross-topic pollution

      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;
      if (currentConversationId) {
        abortControllersMapRef.current.set(currentConversationId, newAbortController);
      }
      
      const botResponse = await sendMessageToGrok(
        conclusionPrompt, 
        cleanHistoryForSearch, 
        userLanguage, 
        currentConversationId, 
        selectedPersonality, 
        newAbortController, 
        selectedModel, 
        isAuthenticated, 
        isGuest, 
        userName || user?.name, 
        sessionMessageCount + 2, 
        [],
        false // enableReasoning = false (ALWAYS disabled for search conclusion so it reads & summarizes news immediately!)
      );

      let finalResponseText = '';
      let displayedSearchText = '';
      let searchStreamFinished = false;
      let searchTypingTimer = null;
      let searchReasoningText = '';
      let isSearchReasoning = false;
      let searchReasoningStartTime = null;
      let searchReasoningDuration = null;

      const startSearchTypingAnimation = () => {
        if (searchTypingTimer) return;
        searchTypingTimer = setInterval(() => {
          if (displayedSearchText.length < finalResponseText.length) {
            const diff = finalResponseText.length - displayedSearchText.length;
            const step = getSmoothTypingStep(diff, searchStreamFinished, displayedSearchText.length, finalResponseText.length);
            
            displayedSearchText += finalResponseText.substr(displayedSearchText.length, step);
            
            const now = Date.now();
            if (now - lastScrollTickRef.current > 75) {
              lastScrollTickRef.current = now;
              smoothAutoScroll();
            }
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? { 
                      ...msg, 
                      text: sanitizeStreamingText(displayedSearchText), 
                      isThinking: false, 
                      isStreaming: true,
                      reasoningText: searchReasoningText || msg.reasoningText,
                      reasoningDuration: searchReasoningDuration || msg.reasoningDuration,
                      isReasoning: isSearchReasoning,
                      isReasoningComplete: !isSearchReasoning && !!(searchReasoningText || msg.reasoningText)
                    }
                  : msg
              )
            );
          } else if (searchStreamFinished) {
            clearInterval(searchTypingTimer);
            searchTypingTimer = null;
          }
        }, 22);
      };

      await processStreamingResponse(botResponse, (chunk) => {
        // 1. Handle live reasoning chunk from reasoning models (Boron 1.1 / Doubao / DeepSeek)
        if (typeof chunk === 'object' && chunk.type === 'reasoning') {
          if (!searchReasoningStartTime) {
            searchReasoningStartTime = Date.now();
          }
          isSearchReasoning = true;
          searchReasoningText += chunk.content;
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    reasoningText: searchReasoningText,
                    isReasoning: true,
                    isThinking: true,
                    isStreaming: true
                  }
                : msg
            )
          );
          return;
        }

        // 2. Handle regular text content chunk
        const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
        if (textChunk) {
          if (isSearchReasoning && !searchReasoningDuration) {
            searchReasoningDuration = Math.max(0.1, ((Date.now() - searchReasoningStartTime) / 1000)).toFixed(1);
            isSearchReasoning = false;
          }
          finalResponseText += textChunk;
          startSearchTypingAnimation();
        }
      }, newAbortController.signal);

      searchStreamFinished = true;
      if (isSearchReasoning) {
        isSearchReasoning = false;
        if (searchReasoningStartTime && !searchReasoningDuration) {
          searchReasoningDuration = Math.max(0.1, ((Date.now() - searchReasoningStartTime) / 1000)).toFixed(1);
        }
      }

      // GUARANTEE: NEVER RETURN EMPTY AFTER SEARCH!
      if (!finalResponseText || !finalResponseText.trim()) {
        const candidateReasoning = (searchReasoningText || '').trim();
        if (candidateReasoning) {
          console.warn('[ChatBot] Search conclusion stream ended with reasoning but empty text. Extracting answer...');
          const extracted = extractResponseFromReasoning(candidateReasoning);
          if (extracted && extracted.trim()) {
            finalResponseText = extracted;
          }
        }
        
        if (!finalResponseText || !finalResponseText.trim()) {
          console.warn('[ChatBot] Synthesizing verified answer directly from search results...');
          if (aiOverviewText && aiOverviewText.trim()) {
            finalResponseText = aiOverviewText.trim();
          } else if (sources && sources.length > 0) {
            const topSources = sources.slice(0, 4);
            const bulletPoints = topSources
              .filter(s => s.snippet && s.snippet.trim())
              .map((s) => `- **${s.title}**: ${s.snippet} [${s.domain || 'Sumber'}](${s.link})`)
              .join('\n\n');
            finalResponseText = `Berdasarkan penelusuran web terkini mengenai **${userQuery}**:\n\n${bulletPoints}`;
          } else {
            finalResponseText = generateInstantBoronResponse(userQuery);
          }
        }
        displayedSearchText = finalResponseText;
      }

      // Guarantee: If sources is empty but text contains markdown links, parse them into sources so bubbles definitely show!
      if ((!sources || sources.length === 0) && finalResponseText) {
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
        let match;
        const seenLinks = new Set();
        while ((match = linkRegex.exec(finalResponseText)) !== null) {
          const title = match[1];
          const link = match[2];
          if (!seenLinks.has(link)) {
            seenLinks.add(link);
            let domain = '';
            try { domain = new URL(link).hostname; } catch(e) { domain = link; }
            sources.push({
              title,
              link,
              snippet: title,
              domain: domain || 'Web',
              thumbnail: null
            });
          }
        }
      }

      startSearchTypingAnimation();

      // Wait for typing animation to catch up completely with smooth, fluid pace
      let searchCatchUpWaitCount = 0;
      while ((displayedSearchText.length < finalResponseText.length || searchTypingTimer !== null) && searchCatchUpWaitCount < 600) {
        searchCatchUpWaitCount++;
        if (newAbortController.signal.aborted || isUserStoppedRef.current) {
          if (searchTypingTimer) {
            clearInterval(searchTypingTimer);
            searchTypingTimer = null;
          }
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 14));
      }

      if (searchTypingTimer) {
        clearInterval(searchTypingTimer);
        searchTypingTimer = null;
      }

      // Finalize: save and clean up
      const cleanedFinalText = replaceCitationsWithLinks(cleanResponseText(finalResponseText));
      const finalizedSources = (sources && sources.length > 0) ? sources : [];
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId
            ? { 
                ...msg, 
                text: cleanedFinalText, 
                reasoningText: searchReasoningText || msg.reasoningText,
                reasoningDuration: searchReasoningDuration || msg.reasoningDuration,
                isStreaming: false, 
                isThinking: false,
                isSearching: false,
                isRecallingMemory: false,
                isImageGenerating: false,
                isReasoning: false,
                isReasoningComplete: !!(searchReasoningText || msg.reasoningText),
                searchSources: (msg.searchSources && msg.searchSources.length > 0) ? msg.searchSources : finalizedSources,
                searchSteps: (msg.searchSteps && msg.searchSteps.length > 0) ? msg.searchSteps : (updatedSteps || [])
              }
            : msg
        );

        setConversations((prevConvs) => {
          const updatedConvs = prevConvs.map(conv => 
            conv.id === currentConversationId
              ? { ...conv, messages: updated, isLoading: false, updatedAt: new Date().toISOString() }
              : conv
          );
          ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
            .catch(err => console.error('[ChatBot] Error saving after search:', err));
          return updatedConvs;
        });
        return updated;
      });

      // Reset all states aggressively
      setConvLoading(false);
      setLoading(false);
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      isProcessingRef.current = false;
      isSearchAbortedRef.current = false;
      setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
      setLastMessage(null);
      abortControllerRef.current = null;
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }

      // Ensure user ask bubble stays anchored at the top after search completion
      if (isLockedToUserAskRef.current && !holdScrollRef.current) {
        lockUserAskToTop(true);
        setTimeout(() => {
          if (isLockedToUserAskRef.current && !holdScrollRef.current) {
            lockUserAskToTop(true);
          }
        }, 60);
      }

    } catch (searchError) {
      console.error('[ChatBot] Error in search pathway, falling back to direct AI response:', searchError);
      
      try {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, isSearching: false, isThinking: true, text: userLanguage === 'id' ? 'Pencarian gagal. Mengambil jawaban langsung dari AI...' : 'Search failed. Getting direct answer from AI...' }
              : msg
          )
        );
        
        const userQuery = userPrompt || lastSentPromptRef.current || searchQuery;
        const fallbackPrompt = `[INFO SISTEM: Pencarian web gagal. Harap jawab pertanyaan pengguna berikut menggunakan pengetahuan internal Anda secara akurat dan percaya diri. Jika pertanyaan ini membahas topik baru yang berbeda, fokus penuh 100% pada topik baru ini tanpa mengaitkan ke percakapan lama sebelumnya.]\n\nPertanyaan pengguna: "${userQuery}"`;
        
        const sourceHistory = Array.isArray(baseHistory) && baseHistory.length > 0 ? baseHistory : messages;
        const cleanHistoryForSearch = sourceHistory
          .filter(msg => msg && msg.id !== messageId)
          .filter(msg => {
            const txt = (msg.text || msg.content || '').trim();
            return !txt.startsWith('[SEARCH_REQUEST:');
          });

        const newAbortController = new AbortController();
        abortControllerRef.current = newAbortController;
        
        const botResponse = await sendMessageToGrok(
          fallbackPrompt, 
          cleanHistoryForSearch, 
          userLanguage, 
          currentConversationId, 
          selectedPersonality, 
          newAbortController, 
          selectedModel, 
          isAuthenticated, 
          isGuest, 
          userName || user?.name, 
          sessionMessageCount + 2, 
          [],
          false // enableReasoning = false
        );

        let finalResponseText = '';
        let displayedSearchText = '';
        let searchStreamFinished = false;
        let searchTypingTimer = null;
        let searchReasoningText = '';
        let isSearchReasoning = false;
        let searchReasoningStartTime = null;
        let searchReasoningDuration = null;

        const startSearchTypingAnimation = () => {
          if (searchTypingTimer) return;
          searchTypingTimer = setInterval(() => {
            if (displayedSearchText.length < finalResponseText.length) {
              const diff = finalResponseText.length - displayedSearchText.length;
              const step = getSmoothTypingStep(diff, searchStreamFinished, displayedSearchText.length, finalResponseText.length);
              
              displayedSearchText += finalResponseText.substr(displayedSearchText.length, step);
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId
                    ? { 
                        ...msg, 
                        text: sanitizeStreamingText(displayedSearchText), 
                        isThinking: false, 
                        isStreaming: true,
                        reasoningText: searchReasoningText || msg.reasoningText,
                        reasoningDuration: searchReasoningDuration || msg.reasoningDuration,
                        isReasoning: isSearchReasoning,
                        isReasoningComplete: !isSearchReasoning && !!(searchReasoningText || msg.reasoningText)
                      }
                    : msg
                )
              );
            } else if (searchStreamFinished) {
              clearInterval(searchTypingTimer);
              searchTypingTimer = null;
            }
          }, 22);
        };

        await processStreamingResponse(botResponse, (chunk) => {
          if (typeof chunk === 'object' && chunk.type === 'reasoning') {
            if (!searchReasoningStartTime) searchReasoningStartTime = Date.now();
            isSearchReasoning = true;
            searchReasoningText += chunk.content;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      reasoningText: searchReasoningText,
                      isReasoning: true,
                      isThinking: true,
                      isStreaming: true
                    }
                  : msg
              )
            );
            return;
          }

          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            if (isSearchReasoning && !searchReasoningDuration) {
              searchReasoningDuration = Math.max(0.1, ((Date.now() - searchReasoningStartTime) / 1000)).toFixed(1);
              isSearchReasoning = false;
            }
            finalResponseText += textChunk;
            startSearchTypingAnimation();
          }
        }, newAbortController.signal);

        searchStreamFinished = true;
        if (isSearchReasoning) {
          isSearchReasoning = false;
          if (searchReasoningStartTime && !searchReasoningDuration) {
            searchReasoningDuration = Math.max(0.1, ((Date.now() - searchReasoningStartTime) / 1000)).toFixed(1);
          }
        }

        // Guaranteed fallback response if model finished empty
        if (!finalResponseText || !finalResponseText.trim()) {
          const candidateReasoning = (searchReasoningText || '').trim();
          if (candidateReasoning) {
            const extracted = extractResponseFromReasoning(candidateReasoning);
            if (extracted && extracted.trim()) {
              finalResponseText = extracted;
            }
          }
          if (!finalResponseText || !finalResponseText.trim()) {
            finalResponseText = generateInstantBoronResponse(userQuery);
          }
          displayedSearchText = finalResponseText;
        }

        startSearchTypingAnimation();

        let searchCatchUpWaitCount = 0;
        while ((displayedSearchText.length < finalResponseText.length || searchTypingTimer !== null) && searchCatchUpWaitCount < 600) {
          searchCatchUpWaitCount++;
          if (newAbortController.signal.aborted || isUserStoppedRef.current) {
            if (searchTypingTimer) {
              clearInterval(searchTypingTimer);
              searchTypingTimer = null;
            }
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 14));
        }

        if (searchTypingTimer) {
          clearInterval(searchTypingTimer);
          searchTypingTimer = null;
        }

        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === messageId
              ? { 
                  ...msg, 
                  text: replaceCitationsWithLinks(cleanResponseText(finalResponseText)), 
                  reasoningText: searchReasoningText || msg.reasoningText,
                  reasoningDuration: searchReasoningDuration || msg.reasoningDuration,
                  isStreaming: false, 
                  isThinking: false,
                  isSearching: false,
                  isRecallingMemory: false,
                  isImageGenerating: false,
                  isReasoning: false,
                  isReasoningComplete: !!(searchReasoningText || msg.reasoningText)
                }
              : msg
          );
          setConversations((prevConvs) => {
            const updatedConvs = prevConvs.map(conv => 
              conv.id === currentConversationId
                ? { ...conv, messages: updated, isLoading: false, updatedAt: new Date().toISOString() }
                : conv
            );
            ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
              .catch(err => console.error('[ChatBot] Error saving after fallback search:', err));
            return updatedConvs;
          });
          return updated;
        });

        setIsSendGenerating(false);
        isSendGeneratingRef.current = false;
        setConvLoading(false);
        setLoading(false);
        isProcessingRef.current = false;
        isSearchAbortedRef.current = false;
        setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
        setLastMessage(null);
        abortControllerRef.current = null;
        if (currentConversationId) {
          abortControllersMapRef.current.delete(currentConversationId);
        }

      } catch (fallbackError) {
        console.error('[ChatBot] Fallback AI execution failed:', fallbackError);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { 
                  ...msg, 
                  isSearching: false, 
                  isThinking: false, 
                  isStreaming: false,
                  isRecallingMemory: false,
                  isImageGenerating: false,
                  isReasoning: false,
                  text: fallbackError?.message || 'Gagal memproses jawaban.'
                }
              : msg
          )
        );
        setIsSendGenerating(false);
        isSendGeneratingRef.current = false;
        setConvLoading(false);
        setLoading(false);
        isProcessingRef.current = false;
        setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
      }
    } finally {
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      isProcessingRef.current = false;
      isSearchAbortedRef.current = false;
      setLoading(false);
      setConvLoading(false);
    }
  }

  const triggerWebSearchIfNeeded = (messageId, text) => {
    if (!text) return;
    let searchQuery = null;
    const searchRequestMatch = text.match(/\[(?:SEARCH_REQUEST|SEARCH):\s*(.+?)\]/i) || text.match(/<search(?:_request)?>\s*([\s\S]+?)\s*<\/search(?:_request)?>/i);
    if (searchRequestMatch && searchRequestMatch[1]) {
      searchQuery = searchRequestMatch[1].trim();
    } else {
      return;
    }

    if (searchQuery) {
      if (triggeredSearchRequestsRef.current.has(messageId)) {
        return; // Already triggered!
      }
      triggeredSearchRequestsRef.current.add(messageId);
      
      const currentTurnText = (lastSentUserInputTextRef.current || '').trim();
      const historyPool = (currentConversationHistoryRef.current && currentConversationHistoryRef.current.length > 0)
        ? currentConversationHistoryRef.current
        : (Array.isArray(messages) ? messages : []);
      const lastUserMsg = [...historyPool].reverse().find(m => m && (m.sender === 'user' || m.role === 'user'));
      const userPrompt = currentTurnText || (lastUserMsg ? (lastUserMsg.text || lastUserMsg.content || '') : '') || searchQuery;
      const finalSearchQuery = searchQuery.replace(/^["']|["']$/g, '').trim();

      console.log(`[ChatBot] 🔍 AI-determined SEARCH_REQUEST: "${finalSearchQuery}" (userPrompt: "${userPrompt}") for message ${messageId}`);
      
      // 1) IMMEDIATELY WIPE any preamble or streaming text! NEVER show hallucinated text before search!
      currentStreamingTextRef.current = '';
      
      // 2) Stop current stream if still active
      if (abortControllerRef.current) {
        isSearchAbortedRef.current = true;
        abortControllerRef.current.abort();
      }
      
      // 3) Stop typing animation and status updates immediately
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
      
      // 4) Remove prefill-space
      const scrollEl = document.querySelector('.messages-container');
      if (scrollEl) {
        try { scrollEl.classList.remove('prefill-space'); } catch (e) {}
      }

      // 5) Mark the message as searching with STRICTLY EMPTY text
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const initialSteps = msg.searchSteps || [];
            if (!initialSteps.some(s => s.query === finalSearchQuery)) {
              initialSteps.push({
                query: finalSearchQuery,
                isSearching: true,
                sources: [],
                images: []
              });
            }
            return { 
              ...msg, 
              text: '', // STRICTLY EMPTY! Wipe any ngawur text!
              isStreaming: false,
              isSearching: true, 
              searchQuery: finalSearchQuery, 
              searchResults: null, 
              searchSources: [],
              searchSteps: initialSteps
            };
          }
          return msg;
        })
      );

      // 6) Execute search and synthesis directly with fresh history and prompt
      executeSearchAndSynthesize({
        messageId,
        searchQuery: finalSearchQuery,
        userPrompt,
        baseHistory: historyPool
      });
    }
  };

  // ============================================================
  // 🧠 AUTONOMOUS MEMORY ACTION HANDLER (CLAUDE-STYLE CoT)
  // ============================================================
  const triggerMemoryActionsIfNeeded = (messageId, text) => {
    if (!text || typeof text !== 'string') return;
    const actionRegex = /\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):\s*([\s\S]*?)\]/gi;
    let match;

    while ((match = actionRegex.exec(text)) !== null) {
      const rawTagType = match[1].toUpperCase();
      const rawPayload = match[2].trim();
      const actionKey = `${messageId}_${rawTagType}_${rawPayload.substring(0, 50)}`;

      if (processedMemoryActionsRef.current.has(actionKey)) {
        continue;
      }
      processedMemoryActionsRef.current.add(actionKey);

      let parsedPayload = {};
      if (rawPayload.startsWith('{') && rawPayload.endsWith('}')) {
        try {
          parsedPayload = JSON.parse(rawPayload);
        } catch (e) {
          try {
            const relaxedJson = rawPayload.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
            parsedPayload = JSON.parse(relaxedJson);
          } catch (e2) {
            parsedPayload = { content: rawPayload };
          }
        }
      } else {
        if (rawTagType === 'MEMORY_DELETE') {
          parsedPayload = { target: rawPayload.replace(/^['"]|['"]$/g, '') };
        } else if (rawTagType === 'MEMORY_RECALL') {
          parsedPayload = { query: rawPayload.replace(/^['"]|['"]$/g, '') };
        } else {
          parsedPayload = { content: rawPayload.replace(/^['"]|['"]$/g, '') };
        }
      }

      const actionName = rawTagType === 'MEMORY_SAVE' ? 'save' :
                         rawTagType === 'MEMORY_UPDATE' ? 'update' :
                         rawTagType === 'MEMORY_DELETE' ? 'delete' : 'recall';

      parsedPayload.action = actionName;

      (async () => {
        try {
          const result = await memoryService.executeAction(parsedPayload, {
            isAuthenticated,
            isGuest,
            conversationId: currentConversationId,
            language: userLanguage
          });

          if (result && result.success) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                const existingActions = msg.memoryActions || [];
                if (!existingActions.some(a => a.id === actionKey)) {
                  return {
                    ...msg,
                    memoryActions: [...existingActions, {
                      id: actionKey,
                      type: actionName,
                      label: result.displayMessage,
                      category: result.category || parsedPayload.category,
                      detail: result.content || result.target || result.query,
                      timestamp: Date.now()
                    }]
                  };
                }
              }
              return msg;
            }));
          }
        } catch (err) {
          console.warn('[ChatBot] Autonomous memory action error:', err);
        }
      })();
    }
  };

  // ============================================================
  // 🧠 RECALL MEMORY & MULTI-STEP REASONING HANDLER
  // ============================================================
  const triggerRecallMemoryIfNeeded = (messageId, text) => {
    if (!text) return;
    const recallRequestMatch = text.match(/\[RECALL_MEMORY:\s*(.+?)\]/);
    if (recallRequestMatch && recallRequestMatch[1]) {
      const recallQuery = recallRequestMatch[1].trim();

      if (triggeredRecallRequestsRef.current.has(messageId)) {
        return; // Already triggered for this turn
      }
      triggeredRecallRequestsRef.current.add(messageId);

      console.log(`[ChatBot] 🧠 RECALL_MEMORY detected: "${recallQuery}" for message ${messageId}`);

      // 1) Clean streaming text
      const cleanedStreamingText = text.replace(/\[RECALL_MEMORY:\s*(.+?)\]/g, '').trim();
      currentStreamingTextRef.current = cleanedStreamingText;

      // 2) Stop current stream if active
      if (abortControllerRef.current) {
        isRecallAbortedRef.current = true;
        abortControllerRef.current.abort();
      }

      // 3) Stop typing animation & intervals
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }

      // 4) Update message state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const initialSteps = msg.memoryRecallSteps ? [...msg.memoryRecallSteps] : [];
            if (!initialSteps.some(s => s.query === recallQuery)) {
              initialSteps.push({
                step: initialSteps.length + 1,
                query: recallQuery,
                isRecalling: true,
                snippet: null
              });
            }
            return {
              ...msg,
              text: cleanedStreamingText || msg.text || '',
              isStreaming: false,
              isRecallingMemory: true,
              memoryRecallQuery: recallQuery,
              memoryRecallSteps: initialSteps
            };
          }
          return msg;
        })
      );

      // 5) Execute recall memory lookup asynchronously
      (async () => {
        try {
          const guestGlobalMemory = typeof localStorage !== 'undefined' ? (localStorage.getItem('guest_global_memory') || '') : '';
          const recallResult = memoryService.recallMemory(recallQuery, {
            currentConversationId,
            globalMemoryText: guestGlobalMemory,
            language: userLanguage,
            limit: 6
          });

          console.log(`[ChatBot] 🧠 Recalled ${recallResult.results.length} memories for "${recallQuery}"`);

          let snippetSummary = '';
          if (recallResult.results.length > 0) {
            snippetSummary = recallResult.results.map((r, i) => `${i + 1}. ${r.content.substring(0, 120)}`).join(' | ');
          } else {
            snippetSummary = userLanguage === 'id' ? 'Tidak ada memori terkait ditemukan' : 'No related memories found';
          }

          // Accumulate recall context history for this message turn
          if (!recallContextHistoryRef.current[messageId]) {
            recallContextHistoryRef.current[messageId] = [];
          }
          recallContextHistoryRef.current[messageId].push({
            query: recallQuery,
            context: recallResult.formattedContext
          });

          // Update step state in UI
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const steps = msg.memoryRecallSteps || [];
                const updatedSteps = steps.map((s) =>
                  s.query === recallQuery
                    ? { ...s, isRecalling: false, snippet: snippetSummary }
                    : s
                );
                return {
                  ...msg,
                  memoryRecallSteps: updatedSteps
                };
              }
              return msg;
            })
          );

          // Build multi-step prompt
          const currentStep = (recallContextHistoryRef.current[messageId] || []).length;
          const isMaxStepsReached = currentStep >= 3;

          const accumulatedRecallContexts = recallContextHistoryRef.current[messageId]
            .map((item, idx) => `[LANGKAH RECALL ${idx + 1} - "${item.query}"]:\n${item.context}`)
            .join('\n\n');

          const recallConclusionPrompt = userLanguage === 'id'
            ? `[KONTEKS MEMORI (SAMPEL SEMENTARA)]:\n${accumulatedRecallContexts}\n\n` +
              `INSTRUKSI MENJAWAB (PENTING):\n` +
              `1. Anda baru saja melakukan penarikan memori. Gunakan data memori di atas sebagai pegangan untuk MENJAWAB PERTANYAAN PENGGUNA SECARA LANGSUNG, UTUH, DAN DETAIL.\n` +
              `2. ${isMaxStepsReached ? 'JANGAN memicu tag [RECALL_MEMORY] lagi.' : 'Jika masih membutuhkan fakta/preferensi lain yang spesifik, Anda BOLEH memicu recall lanjutan dengan format tag: [RECALL_MEMORY: kata kunci baru]. Jika sudah cukup, LANGSUNG BERIKAN JAWABAN AKHIR LENGKAP Anda tanpa tag recall.'}\n` +
              `3. Berikan jawaban yang terstruktur, akurat, dan sopan.`
            : `[MEMORY CONTEXT (TEMPORARY SAMPLE)]:\n${accumulatedRecallContexts}\n\n` +
              `INSTRUCTIONS (CRITICAL):\n` +
              `1. You just recalled memory. Use the context above to ANSWER THE USER'S QUESTION DIRECTLY, FULLY, AND ACCURATELY.\n` +
              `2. ${isMaxStepsReached ? 'DO NOT trigger [RECALL_MEMORY] anymore.' : 'If additional keywords are needed, you MAY output [RECALL_MEMORY: new keywords]. Otherwise, IMMEDIATELY PROVIDE YOUR COMPLETE FINAL ANSWER without recall tags.'}\n` +
              `3. Provide a clear, comprehensive, and polite answer.`;

          const historyWithRecall = messages.map(msg =>
            msg.id === messageId
              ? { ...msg, text: `[RECALL_MEMORY: ${recallQuery}]`, sender: 'bot' }
              : msg
          );

          const newAbortController = new AbortController();
          abortControllerRef.current = newAbortController;

          const safeImages = (messages.find(m => m.id === messageId)?.uploadedImages) || [];

          const botResponse = await sendMessageToGrok(
            recallConclusionPrompt,
            historyWithRecall,
            userLanguage,
            currentConversationId,
            selectedPersonality,
            newAbortController,
            selectedModel,
            isAuthenticated,
            isGuest,
            userName || user?.name,
            sessionMessageCount + 1,
            safeImages
          );

          let rawRecallText = '';
          let finalResponseText = '';
          let displayedRecallText = '';
          let recallStreamFinished = false;
          let recallTypingTimer = null;
          let isRedirectedToNextRecall = false;

          const startRecallTypingAnimation = () => {
            if (recallTypingTimer) return;
            recallTypingTimer = setInterval(() => {
              if (displayedRecallText.length < finalResponseText.length) {
                const diff = finalResponseText.length - displayedRecallText.length;
                const step = getSmoothTypingStep(diff, recallStreamFinished, displayedRecallText.length, finalResponseText.length);
                displayedRecallText += finalResponseText.substr(displayedRecallText.length, step);

                const now = Date.now();
                if (now - lastScrollTickRef.current > 75) {
                  lastScrollTickRef.current = now;
                  smoothAutoScroll();
                }

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, text: sanitizeStreamingText(displayedRecallText), isThinking: false, isStreaming: true, isRecallingMemory: false }
                      : msg
                  )
                );
              } else if (recallStreamFinished) {
                clearInterval(recallTypingTimer);
                recallTypingTimer = null;
              }
            }, 22);
          };

          await processStreamingResponse(botResponse, (chunk) => {
            const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
            if (textChunk) {
              rawRecallText += textChunk;
              finalResponseText = sanitizeStreamingText(rawRecallText);

              // Multi-step recall detection during streaming
              if (!isMaxStepsReached && !isRedirectedToNextRecall) {
                const nextRecallMatch = rawRecallText.match(/\[RECALL_MEMORY:\s*(.+?)\]/);
                if (nextRecallMatch) {
                  isRedirectedToNextRecall = true;
                  const nextQuery = nextRecallMatch[1].trim();
                  console.log(`[ChatBot] 🧠 Multi-step RECALL_MEMORY detected at step ${currentStep}: "${nextQuery}"`);

                  newAbortController.abort();
                  if (recallTypingTimer) {
                    clearInterval(recallTypingTimer);
                    recallTypingTimer = null;
                  }

                  // Reset guard for next turn
                  triggeredRecallRequestsRef.current.delete(messageId);

                  const newStep = {
                    step: currentStep + 1,
                    query: nextQuery,
                    isRecalling: true,
                    snippet: null
                  };

                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id === messageId) {
                        return {
                          ...msg,
                          isRecallingMemory: true,
                          memoryRecallSteps: [...(msg.memoryRecallSteps || []), newStep]
                        };
                      }
                      return msg;
                    })
                  );

                  triggerRecallMemoryIfNeeded(messageId, rawRecallText);
                  return;
                }
              }

              if (!isRedirectedToNextRecall) {
                startRecallTypingAnimation();
              }
            }
          }, newAbortController.signal);

          if (isRedirectedToNextRecall) {
            return;
          }

          recallStreamFinished = true;
          startRecallTypingAnimation();

            let recallWaitCount = 0;
            while ((displayedRecallText.length < finalResponseText.length || recallTypingTimer !== null) && recallWaitCount < 600) {
              recallWaitCount++;
              if (newAbortController.signal.aborted || isUserStoppedRef.current) {
                if (recallTypingTimer) {
                  clearInterval(recallTypingTimer);
                  recallTypingTimer = null;
                }
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 14));
            }

            if (recallTypingTimer) {
              clearInterval(recallTypingTimer);
              recallTypingTimer = null;
            }

            const cleanedFinalText = finalResponseText
              .replace(/\[RECALL_MEMORY:\s*(.+?)\]/g, '')
              .replace(/\[SEARCH_REQUEST:\s*(.+?)\]/g, '')
              .replace(/\[REMINDER_REQUEST:\s*\{[\s\S]*?\}\]/g, '')
              .trim();

            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      text: cleanResponseText(cleanedFinalText),
                      isStreaming: false,
                      isThinking: false,
                      isSearching: false,
                      isRecallingMemory: false,
                      isImageGenerating: false,
                      isReasoning: false
                    }
                  : msg
              );

              setConversations((prevConvs) => {
                const updatedConvs = prevConvs.map(conv =>
                  conv.id === currentConversationId
                    ? { ...conv, messages: updated, isLoading: false, updatedAt: new Date().toISOString() }
                    : conv
                );
                ConversationPersistenceService.saveConversations(updatedConvs, isAuthenticated, isGuest)
                  .catch(err => console.error('[ChatBot] Error saving after recall memory:', err));
                return updatedConvs;
              });
              return updated;
            });

            isRecallAbortedRef.current = false;
            setIsSendGenerating(false);
            isSendGeneratingRef.current = false;
            setConvLoading(false);
            setLoading(false);
            isProcessingRef.current = false;
            setAnimatingMessages((prev) => ({ ...prev, [messageId]: false }));
            setLastMessage(null);
            abortControllerRef.current = null;
            if (currentConversationId) {
              abortControllersMapRef.current.delete(currentConversationId);
            }

          } catch (err) {
            isRecallAbortedRef.current = false;
            console.error('[ChatBot] Error during recall memory processing:', err);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? { 
                      ...msg, 
                      isRecallingMemory: false, 
                      isStreaming: false,
                      isThinking: false,
                      isSearching: false,
                      isImageGenerating: false,
                      isReasoning: false
                    }
                  : msg
              )
            );
            setIsSendGenerating(false);
            isSendGeneratingRef.current = false;
            setConvLoading(false);
            setLoading(false);
            isProcessingRef.current = false;
            abortControllerRef.current = null;
            if (currentConversationId) {
              abortControllersMapRef.current.delete(currentConversationId);
            }
          } finally {
            setIsSendGenerating(false);
            isSendGeneratingRef.current = false;
            isProcessingRef.current = false;
            setLoading(false);
            setConvLoading(false);
          }
      })();
    }
  };

  const handleRetry = async () => {
    if (!lastMessage && !partialMessageIdRef.current) return;

    setError(null);
    setConvLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    // Store controller per conversation
    if (currentConversationId) {
      abortControllersMapRef.current.set(currentConversationId, abortController);
    }

    // Capture conversationId NOW so streaming callback uses the right conversation
    const streamingConversationId = currentConversationId;

    try {
      // If continuing from partial response, send continuation prompt
      if (partialMessageIdRef.current) {
        const continuePrompt = `[Lanjutkan dari mana tadi, jangan ulangi pesan sebelumnya, hanya lanjutkan teks berikutnya]`;
        const response = await sendMessageToGrok(continuePrompt, messages, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, false);
        const msgId = partialMessageIdRef.current;

        const initialText = messages.find(m => m.id === msgId)?.text || '';
        let accumulatedRetryText = '';
        let displayedText = '';
        let streamFinished = false;
        currentStreamingTextRef.current = '';

        const startTypingAnimation = () => {
          if (typingTimerRef.current) return;
          typingTimerRef.current = setInterval(() => {
            if (displayedText.length < accumulatedRetryText.length) {
              const diff = accumulatedRetryText.length - displayedText.length;
              const step = getSmoothTypingStep(diff, streamFinished, displayedText.length, accumulatedRetryText.length);
              displayedText += accumulatedRetryText.substr(displayedText.length, step);
              currentStreamingTextRef.current = initialText + displayedText;
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === msgId
                    ? { ...msg, text: sanitizeStreamingText(initialText + displayedText), isStreaming: true, isThinking: false }
                    : msg
                )
              );
            } else if (streamFinished) {
              clearInterval(typingTimerRef.current);
              typingTimerRef.current = null;
              finishStreaming(msgId, initialText + accumulatedRetryText);
            }
          }, 22);
        };
 
        await processStreamingResponse(response, (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            accumulatedRetryText += textChunk;
            currentStreamingTextRef.current = initialText + accumulatedRetryText;
            triggerInlineImageIfNeeded(msgId, initialText + accumulatedRetryText);
            startTypingAnimation();
          }
        }, abortController.signal);

        if (abortController.signal.aborted) {
          return;
        }
 
        streamFinished = true;
        startTypingAnimation();

        let retryWaitCount = 0;
        while ((displayedText.length < accumulatedRetryText.length || typingTimerRef.current !== null) && retryWaitCount < 600) {
          if (abortController.signal.aborted) {
            return;
          }
          retryWaitCount++;
          await new Promise(resolve => setTimeout(resolve, 14));
        }

        if (abortController.signal.aborted) {
          return;
        }

        finishStreaming(msgId, initialText + accumulatedRetryText);
        triggerInlineImageIfNeeded(msgId, initialText + accumulatedRetryText);
 
        partialMessageIdRef.current = null;
        // Keep compact focus when continuing partial responses
        setCompactView(true);
      } else {
        // Full retry for non-partial errors
        const response = await sendMessageToGrok(lastMessage, messages, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, false);
        const placeholderId = createBotPlaceholder();
        currentMessageIdRef.current = placeholderId;
 
        let accumulatedFullRetryText = '';
        let displayedText = '';
        let streamFinished = false;
        currentStreamingTextRef.current = '';

        const startTypingAnimation = () => {
          if (typingTimerRef.current) return;
          typingTimerRef.current = setInterval(() => {
            if (displayedText.length < accumulatedFullRetryText.length) {
              const diff = accumulatedFullRetryText.length - displayedText.length;
              const step = getSmoothTypingStep(diff, streamFinished, displayedText.length, accumulatedFullRetryText.length);
              displayedText += accumulatedFullRetryText.substr(displayedText.length, step);
              currentStreamingTextRef.current = displayedText;
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === placeholderId
                    ? { ...msg, text: sanitizeStreamingText(displayedText), isStreaming: true, isThinking: false }
                    : msg
                )
              );
            } else if (streamFinished) {
              clearInterval(typingTimerRef.current);
              typingTimerRef.current = null;
              finishStreaming(placeholderId, accumulatedFullRetryText);
            }
          }, 22);
        };
 
        await processStreamingResponse(response, (chunk) => {
          const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            accumulatedFullRetryText += textChunk;
            currentStreamingTextRef.current = accumulatedFullRetryText;
            triggerInlineImageIfNeeded(placeholderId, accumulatedFullRetryText);
            startTypingAnimation();
          }
        }, abortController.signal);

        if (abortController.signal.aborted) {
          return;
        }
 
        streamFinished = true;
        startTypingAnimation();

        let fullRetryWaitCount = 0;
        while ((displayedText.length < accumulatedFullRetryText.length || typingTimerRef.current !== null) && fullRetryWaitCount < 600) {
          if (abortController.signal.aborted) {
            return;
          }
          fullRetryWaitCount++;
          await new Promise(resolve => setTimeout(resolve, 14));
        }

        if (abortController.signal.aborted) {
          return;
        }

        finishStreaming(placeholderId, accumulatedFullRetryText);
        triggerInlineImageIfNeeded(placeholderId, accumulatedFullRetryText);
      }

      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
      setLastMessage(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showErrorBanner(`Gagal: ${err.message}. Klik Continue untuk coba lagi.`);
      }
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      setLoading(false);
      setConvLoading(false);
      isProcessingRef.current = false;
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
    }
  };

  // Auto-retry function (called automatically, no user interaction needed)
  const handleRetryAuto = async () => {
    if (!partialMessageIdRef.current) return;

    // CRITICAL: Keep the lock held throughout the entire retry process
    // isProcessingRef.current should ALREADY be true from the initial request
    // Do NOT clear it until we're completely done
    
    setConvLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    // Store controller per conversation
    if (currentConversationId) {
      abortControllersMapRef.current.set(currentConversationId, abortController);
    }

    // Capture conversationId NOW so streaming callback uses the right conversation
    const streamingConversationId = currentConversationId;

    try {
      // Continue from partial response (same as handleRetry but without user error message)
      const msgId = partialMessageIdRef.current;
      const initialText = messages.find(m => m.id === msgId)?.text || '';
      const continuePrompt = `[Lanjutkan dari mana tadi, jangan ulangi pesan sebelumnya, hanya lanjutkan teks berikutnya]`;
      const response = await sendMessageToGrok(continuePrompt, messages, userLanguage, streamingConversationId, selectedPersonality, abortController, selectedModel, isAuthenticated, isGuest, userName || user?.name, false);
      
      let accumulatedAutoRetryText = '';
      let displayedText = '';
      let streamFinished = false;
      currentStreamingTextRef.current = '';

      const startTypingAnimation = () => {
        if (typingTimerRef.current) return;
        typingTimerRef.current = setInterval(() => {
          if (displayedText.length < accumulatedAutoRetryText.length) {
            const diff = accumulatedAutoRetryText.length - displayedText.length;
            const step = getSmoothTypingStep(diff, streamFinished, displayedText.length, accumulatedAutoRetryText.length);
            displayedText += accumulatedAutoRetryText.substr(displayedText.length, step);
            currentStreamingTextRef.current = initialText + displayedText;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === msgId
                  ? { ...msg, text: sanitizeStreamingText(initialText + displayedText), isStreaming: true, isThinking: false }
                  : msg
              )
            );
          } else if (streamFinished) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
            finishStreaming(msgId, initialText + accumulatedAutoRetryText);
          }
        }, 22);
      };
 
      await processStreamingResponse(response, (chunk) => {
        const textChunk = typeof chunk === 'object' ? (chunk.type === 'content' ? chunk.content : '') : (typeof chunk === 'string' ? chunk : '');
        if (textChunk) {
          accumulatedAutoRetryText += textChunk;
          currentStreamingTextRef.current = initialText + accumulatedAutoRetryText;
          triggerInlineImageIfNeeded(msgId, initialText + accumulatedAutoRetryText);
          startTypingAnimation();
        }
      }, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }
 
      streamFinished = true;
      startTypingAnimation();

      let autoRetryWaitCount = 0;
      while ((displayedText.length < accumulatedAutoRetryText.length || typingTimerRef.current !== null) && autoRetryWaitCount < 600) {
        if (abortController.signal.aborted) {
          return;
        }
        autoRetryWaitCount++;
        await new Promise(resolve => setTimeout(resolve, 14));
      }

      if (abortController.signal.aborted) {
        return;
      }

      finishStreaming(msgId, initialText + accumulatedAutoRetryText);
      triggerInlineImageIfNeeded(msgId, initialText + accumulatedAutoRetryText);

      partialMessageIdRef.current = null;
      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
      
      // Reset auto-retry counter on success
      autoRetryCountRef.current = 0;
    } catch (err) {
      // If auto-retry fails again, give up and clear lock
      if (err.name !== 'AbortError') {
        console.error('[Auto-Retry Failed]', err.message);
      }
      setLoading(false);
      setConvLoading(false);
      abortControllerRef.current = null;
      // Clean up conversation-specific abort controller
      if (currentConversationId) {
        abortControllersMapRef.current.delete(currentConversationId);
      }
      
      // Rollback user input and remove stuck placeholder messages
      setInputValue(lastSentUserInputTextRef.current || '');
      if (partialMessageIdRef.current || lastSentUserMessageIdRef.current) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== partialMessageIdRef.current && m.id !== lastSentUserMessageIdRef.current)
        );
      }
      partialMessageIdRef.current = null;

      // Show connection error popup
      setConnectionErrorMessage(
        userLanguage === 'id'
          ? 'Pesan Anda tidak terkirim karena masalah koneksi jaringan. Teks Anda telah dikembalikan ke kolom input.'
          : 'Your message was not sent due to network issues. Your text has been restored to the input box.'
      );
      setShowConnectionErrorModal(true);
      autoRetryCountRef.current = 0;
    } finally {
      // CRITICAL: Clear the lock ONLY after retry attempt (success or final fail)
      isProcessingRef.current = false;
      console.log('[ChatBot] 🔓 Auto-retry processing lock cleared');
      setIsSendGenerating(false);
      isSendGeneratingRef.current = false;
      setLoading(false);
      setConvLoading(false);
    }
  };

  const renderEmptyHeroState = () => (
    <ChatEmptyHero
      userLanguage={userLanguage}
      onNavigate={onNavigate}
      uploadedFiles={uploadedFiles}
      uploadedImages={uploadedImages}
      attachmentQueueMinimized={attachmentQueueMinimized}
      setAttachmentQueueMinimized={setAttachmentQueueMinimized}
      clearAllAttachments={clearAllAttachments}
      removeUploadedFile={removeUploadedFile}
      removeUploadedImage={removeUploadedImage}
      isConvGenerating={getConvLoading()}
      textareaElementRef={textareaElementRef}
      inputValue={inputValue}
      setInputValue={setInputValue}
      scheduleTextareaResize={scheduleTextareaResize}
      textQueue={textQueue}
      handleSendMessage={handleSendMessage}
      handlePaste={handlePaste}
      isTokenLimited={isTokenUsageLimited()}
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
      handleOpenCamera={handleOpenCamera}
      setShowGlobalMemorySettings={setShowGlobalMemorySettings}
    />
  );

  const memoizedMessageList = useMemo(() => {
    if (messages.length === 0) {
      return null;
    }

    let lastBotIndex = -1;
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (lastBotIndex === -1 && (messages[i].sender === 'bot' || messages[i].role === 'assistant')) {
        lastBotIndex = i;
      }
      if (lastUserIndex === -1 && messages[i]?.sender === 'user') {
        lastUserIndex = i;
      }
      if (lastBotIndex !== -1 && lastUserIndex !== -1) break;
    }

    return messages.map((message, index) => {
      const isLastMessage = index === messages.length - 1;
      const isLastBotMessage = index === lastBotIndex;
      const shouldHideByCompact = Boolean(compactView && !isScrolledUp && lastUserIndex !== -1 && index < lastUserIndex);
      const isLatestUserMessage = message.sender === 'user' && index === lastUserIndex;
      const msgKey = message.id || index;

      return (
        <ChatMessageItem
          key={msgKey}
          message={message}
          isLatestUserMessage={isLatestUserMessage}
          shouldHideByCompact={shouldHideByCompact}
          isExpanded={expandedUserMessageId === msgKey}
          feedbackValue={message.id ? (messageFeedback[message.id] || null) : null}
          isPlayingTts={Boolean(message.id && playingMessageId === message.id)}
          isLoadingTts={Boolean(message.id && ttsLoading === message.id)}
          userLanguage={userLanguage}
          currentModelName={currentModelObj?.shortName || currentModelObj?.name || 'AI'}
          loadingPhase={loadingPhase}
          localModelProgress={localModelProgress}
          hdUpscalingMap={hdUpscalingMap}
          quizSelectedAnswers={message.id ? quizSelections[message.id] : undefined}
          quizIsSubmitted={Boolean(message.id && quizSubmitted[message.id])}
          setQuizSelections={stableFormatHandlers.setQuizSelections}
          setQuizSubmitted={stableFormatHandlers.setQuizSubmitted}
          onNavigate={stableFormatHandlers.onNavigate}
          onMessageMouseDown={handleMessageMouseDown}
          onMessageMouseUp={handleMessageMouseUp}
          onImageClick={handleImageClick}
          onUpscaleHD={handleUpscaleHD}
          onShowSearchSources={setActiveSearchSources}
          onMessageFeedback={handleMessageFeedback}
          onCopyMessage={handleCopyMessage}
          onTtsToggle={handleTtsToggle}
        />
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages,
    compactView,
    isScrolledUp,
    expandedUserMessageId,
    messageFeedback,
    userLanguage,
    playingMessageId,
    ttsLoading,
    isSlowProcessing,
    loadingPhase,
    quizSelections,
    quizSubmitted,
    stableFormatHandlers,
    localModelProgress,
    hdUpscalingMap,
    currentModelObj,
  ]);

  const modalCtx = {
    showPrivateModal,
    setShowPrivateModal,
    userLanguage,
    startPrivateChat,
    showFoundSourcesPanel,
    setShowFoundSourcesPanel,
    foundSources,
    pendingAnswerMessage,
    handleGenerateAnswerFromSources,
    showPersonalityModal,
    setShowPersonalityModal,
    selectedPersonality,
    setSelectedPersonality,
    showNameSetupModal,
    setShowNameSetupModal,
    pendingUserName,
    setPendingUserName,
    saveUserName,
    skipNameSetup,
    showSettingsModal,
    setShowSettingsModal,
    user,
    setCustomAlert,
    setUserLanguage,
    saveLanguage,
    isPrivateChat,
    setIsPrivateChat,
    showTokenUsage,
    setShowTokenUsage,
    setShowApiDashboard,
    isAuthenticated,
    isGuest,
    setShowFormatDbModal,
    openLogoutConfirm,
    showHtmlEditor,
    setShowHtmlEditor,
    htmlFilename,
    setHtmlFilename,
    htmlContent,
    setHtmlContent,
    setShowHtmlPreview,
    showHtmlPreview,
    showLogoutConfirm,
    closeLogoutConfirm,
    confirmLogout,
    logoutLoading,
    showFormatDbModal,
    formatDbLoading,
    formatDbError,
    setFormatDbError,
    handleCopyFormatConfirmText,
    formatDbCopied,
    formatDbConfirmText,
    setFormatDbConfirmText,
    showFormatDbPassword,
    setShowFormatDbPassword,
    formatDbPassword,
    setFormatDbPassword,
    handleFormatDatabaseAccount,
    editingMessageId,
    handleCancelEdit,
    editingMessageText,
    setEditingMessageText,
    handleEditAndResend,
    showApiDashboard,
    showSourcesModal,
    setShowSourcesModal,
    currentSources,
    getSourceIcon,
    handleOpenSource,
    handleViewSourceDetail,
    selectedSource,
    setSelectedSource,
    isTokenUsageLimited,
    showAlert,
    tokenUsage,
    MAX_TOKEN_LIMIT,
    countdownText,
    showFloatingMenu,
    createNewConversation,
    setShowFloatingMenu,
    handleShowSources,
    showTextPopup,
    selectedTextItem,
    setShowTextPopup,
    setSelectedTextItem,
    setEditingTextContent,
    editingTextContent,
    handleSaveTextEdit,
    showVoiceDevModal,
    setShowVoiceDevModal,
    showVoiceChat,
    setShowVoiceChat,
    showSavedImagesGallery,
    setShowSavedImagesGallery,
    showDeleteConfirm,
    setShowDeleteConfirm,
    setDeleteConfirmConvId,
    confirmDeleteConversation,
    deleteConfirmConvId,
    showDonationModal,
    setShowDonationModal,
    activeSearchSources,
    setActiveSearchSources,
    showImageModal,
    enlargedImage,
    closeImageModal,
    handleDownloadImage,
    aiMode,
    setAiMode,
    activeFile,
    onNavigate,
    setActiveFile,
    fetchWorkspaceFiles,
    isAgentExecuting,
    agentLogs,
    workspaceSearch,
    setWorkspaceSearch,
    workspaceFiles,
    selectActiveFile,
    showGlobalMemorySettings,
    setShowGlobalMemorySettings,
    showConnectionErrorModal,
    setShowConnectionErrorModal,
    connectionErrorMessage,
    isReasoningImage,
    reasoningImages,
    reasoningPrompt,
    reasoningStep,
    reasoningDecision,
    showCameraModal,
    handleCloseCamera,
    capturedPhoto,
    handleFlipCamera,
    isCameraFlashing,
    cameraLoading,
    cameraError,
    startCameraStream,
    cameraFacingMode,
    isCameraEnhancingHD,
    videoRef,
    handleRetakePhoto,
    handleEnhanceCapturedPhotoHD,
    handleUsePhoto,
    handleCapturePhoto,
    canvasRef,
  };

  return (
    <div className={`chatbot-app ${isGenerating ? 'ai-generating' : ''}`}>
      <ChatPrimaryModals ctx={modalCtx} />

      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userLanguage={userLanguage}
        user={user}
        isAuthenticated={isAuthenticated}
        isGuest={isGuest}
        conversations={conversations}
        currentConversationId={currentConversationId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        showSidebarSearchInput={showSidebarSearchInput}
        setShowSidebarSearchInput={setShowSidebarSearchInput}
        showSidebarMoreMenu={showSidebarMoreMenu}
        setShowSidebarMoreMenu={setShowSidebarMoreMenu}
        showSidebarProfileMenu={showSidebarProfileMenu}
        setShowSidebarProfileMenu={setShowSidebarProfileMenu}
        onNavigate={onNavigate}
        createNewConversation={createNewConversation}
        switchConversation={switchConversation}
        deleteConversation={deleteConversation}
        handleSearchResultClick={handleSearchResultClick}
        parseConvTimestamp={parseConvTimestamp}
        setShowSavedImagesGallery={setShowSavedImagesGallery}
        setShowAgenticPanel={setShowAgenticPanel}
        setAgenticActiveTab={setAgenticActiveTab}
        setShowApiDashboard={setShowApiDashboard}
        setShowPersonalityModal={setShowPersonalityModal}
        setShowPrivateModal={setShowPrivateModal}
        setShowGlobalMemorySettings={setShowGlobalMemorySettings}
        setShowSettingsModal={setShowSettingsModal}
        setShowFormatDbModal={setShowFormatDbModal}
        openLogoutConfirm={openLogoutConfirm}
        showAlert={showAlert}
      />


      {/* Main chat area */}
      <div className="chatbot-container">
        {/* Modern Agentic Header (Clean: Dock Button on Left, Conversation Title in Center, Agent Steps on Right) */}
        <div className={`chatbot-header modern-agentic-header ${messages.length === 0 ? 'empty-hero-header' : ''}`}>
          <div className="header-left-actions">
            <button
              type="button"
              className="header-dock-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? (userLanguage === 'id' ? 'Tutup sidebar' : 'Close sidebar') : (userLanguage === 'id' ? 'Buka sidebar' : 'Open sidebar')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          </div>

          {messages.length > 0 && (
            <div className="header-center-title">
              <div 
                className="header-title-pill" 
                onClick={() => setShowConvMenu(!showConvMenu)}
                title="Opsi percakapan"
              >
                <span className="header-title-text">{activeConvTitle}</span>
                <i className={`fa-solid fa-chevron-down header-chevron ${showConvMenu ? 'open' : ''}`}></i>
              </div>

              {showConvMenu && (
                <div className="header-conv-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button" 
                    className="dropdown-menu-item"
                    onClick={handleExportConv}
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>{userLanguage === 'id' ? 'Ekspor Obrolan (.md)' : 'Export Chat'}</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    type="button" 
                    className="dropdown-menu-item delete"
                    onClick={handleDeleteActiveConv}
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    <span>{userLanguage === 'id' ? 'Hapus Percakapan' : 'Delete Chat'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {messages.length > 0 && (
            <div className="header-right-actions">
              <button
                type="button"
                className={`header-voice-toggle-btn ${isAutoVoiceEnabled ? 'active' : ''}`}
                onClick={handleToggleAutoVoice}
                title={
                  isAutoVoiceEnabled
                    ? (userLanguage === 'id' ? 'Suara Otomatis: AKTIF (Klik untuk nonaktifkan)' : 'Auto-Voice: ON (Click to mute)')
                    : (userLanguage === 'id' ? 'Suara Otomatis: NONAKTIF (Klik untuk aktifkan)' : 'Auto-Voice: OFF (Click to enable)')
                }
              >
                <i className={`fa-solid ${isAutoVoiceEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                <span className="header-voice-label">{isAutoVoiceEnabled ? (userLanguage === 'id' ? 'Suara' : 'Voice') : (userLanguage === 'id' ? 'Senyap' : 'Muted')}</span>
              </button>
              <button 
                type="button" 
                className={`header-agentic-btn ${showAgenticPanel ? 'active' : ''}`}
                onClick={() => {
                  setShowAgenticPanel(!showAgenticPanel);
                  if (!showAgenticPanel) setAgenticActiveTab('langkah');
                }}
                title={userLanguage === 'id' ? 'Buka Langkah & Sumber AI' : 'Agent Steps & Sources'}
              >
                <i className="fa-solid fa-list-check"></i>
                <span className="agentic-btn-label">Langkah</span>
                {agenticSteps.length > 0 && (
                  <span className="agentic-steps-badge">{agenticSteps.length}</span>
                )}
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="header-right-actions">
              <button
                type="button"
                className="header-switch-agent-btn"
                onClick={() => onNavigate?.('agent')}
                title={userLanguage === 'id' ? 'Buka Mode AI Agent (Eksekusi Kode & File)' : 'Open AI Agent Mode'}
              >
                <i className="fa-solid fa-bolt"></i>
                <span>AI Agent</span>
              </button>
            </div>
          )}
        </div>

        {/* Custom Alert Notification */}
        {customAlert && (
          <div className={`custom-alert alert-${customAlert.type}${dismissingAlert ? ' dismissing' : ''}`}>
            <div className="alert-content">
              <span className="alert-message">{customAlert.message}</span>
              <button 
                className="alert-close"
                onClick={() => {
                  setDismissingAlert(true);
                  setTimeout(() => {
                    setCustomAlert(null);
                    setDismissingAlert(false);
                  }, 400);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className={`messages-container ${isGenerating ? 'generating-active prefill-space' : ''}${messages.length === 0 ? ' empty-hero-active' : ''}`}>
        {compactView && messages.length > 1 && !inputValue.trim() && (
          <div className="show-previous-wrapper">
            <button 
              type="button"
              className="show-previous-btn-modern"
              onClick={handleShowPreviousMessages}
              title={userLanguage === 'id' ? 'Lihat pesan sebelumnya' : 'View previous messages'}
            >
              <svg className="show-previous-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              <span>{userLanguage === 'id' ? 'Lihat Pesan Sebelumnya' : 'Lihat Pesan Sebelumnya'}</span>
            </button>
          </div>
        )}
        
        {foundSources.length > 0 && messages.length > 0 && (
          <div className="source-strip sources-above-output" onClick={() => setShowFoundSourcesPanel(true)}>
            <div className="source-strip-header">
              <div className="source-strip-text">
                <span>{userLanguage === 'id' ? 'Sumber internet' : 'Internet sources'}</span>
                <span className="source-strip-count">{foundSources.length} {userLanguage === 'id' ? 'sumber' : 'sources'}</span>
              </div>
              <div className="source-strip-label">{userLanguage === 'id' ? 'Klik untuk lihat detail' : 'Tap to view details'}</div>
            </div>
            <div className="source-logo-row small-logos">
              {foundSources.slice(0, 4).map((source, idx) => {
                const logo = getSourceLogo(source);
                return (
                  <button
                    key={source.id || idx}
                    type="button"
                    className="source-logo-chip"
                    aria-label={source.source || source.title || `Source ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFoundSourcesPanel(true);
                    }}
                  >
                    {logo.type === 'image' ? (
                      <img src={logo.value} alt={logo.label} />
                    ) : (
                      <span>{logo.value}</span>
                    )}
                  </button>
                );
              })}
              {foundSources.length > 4 && (
                <div className="source-logo-more">+{foundSources.length - 4}</div>
              )}
            </div>
          </div>
        )}

        {messages.length === 0 ? renderEmptyHeroState() : memoizedMessageList}

        {loading && (isGenerating || getConvLoading()) && loadingPhase && !messages.some(msg => msg.sender === 'bot' && (msg.isStreaming || msg.isThinking || msg.isRecallingMemory || msg.isSearching)) && (
          <div className="message bot loading">
            <div className="message-content">
              <div className="typing-indicator-row">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="slow-processing-text">
                  {localModelProgress.isLoading ? (
                    <span style={{ color: '#ea580c', fontWeight: 600 }}>
                      ⚡ {localModelProgress.statusText || `Memuat AI Boron 1.1 (${localModelProgress.pct}%)...`}
                    </span>
                  ) : (
                    <>
                      {loadingPhase === 'sending' && (userLanguage === 'id' ? 'Mengirim...' : 'Sending...')}
                      {loadingPhase === 'thinking' && (userLanguage === 'id' ? 'Merenungi...' : 'Thinking...')}
                      {loadingPhase === 'slow' && (userLanguage === 'id' ? 'Merespon sedikit lebih lama dari biasanya...' : 'Taking a bit longer to respond...')}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modern AI Chat spacer: maintains ample room below prompt & AI response so the user bubble stays anchored at the top without collapsing */}
        {messages.length > 0 && (
          <div className="chat-generating-spacer" aria-hidden="true" />
        )}

        <div ref={messagesEndRef} />

        {isScrolledUp && (
          <button
            className={`scroll-to-bottom-btn ${isGenerating ? 'generating' : ''}`}
            onClick={handleScrollToBottomClick}
            title="Scroll ke bawah"
            aria-label="Scroll ke bawah"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <div className="error-message">
              <p>Sorry, Pesan kamu tidak berhasil dikirim</p>
            </div>
            <div className="error-actions">
              <button
                className="retry-button"
                onClick={handleRetry}
                disabled={loading}
              >
                {userLanguage === 'id' ? 'Lanjutkan' : 'Continue'}
              </button>
              <button
                className="error-close"
                onClick={() => {
                  if (retryIntervalRef.current) {
                    clearInterval(retryIntervalRef.current);
                  }
                  setError(null);
                  setLastMessage(null);
                  partialMessageIdRef.current = null;
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatComposerBar
        hasMessages={messages.length > 0}
        handleSendMessage={handleSendMessage}
        isTokenUsageLimited={isTokenUsageLimited}
        userLanguage={userLanguage}
        countdownFullText={countdownFullText}
        activeFile={activeFile}
        onNavigate={onNavigate}
        setActiveFile={setActiveFile}
        showAlert={showAlert}
        showSlashMenu={showSlashMenu}
        setShowSlashMenu={setShowSlashMenu}
        SLASH_COMMANDS={SLASH_COMMANDS}
        inputValue={inputValue}
        setInputValue={setInputValue}
        slashSelectedIndex={slashSelectedIndex}
        setSlashSelectedIndex={setSlashSelectedIndex}
        textareaElementRef={textareaElementRef}
        uploadedFiles={uploadedFiles}
        uploadedImages={uploadedImages}
        setUploadedImages={setUploadedImages}
        attachmentQueueMinimized={attachmentQueueMinimized}
        setAttachmentQueueMinimized={setAttachmentQueueMinimized}
        clearAllAttachments={clearAllAttachments}
        removeUploadedFile={removeUploadedFile}
        removeUploadedImage={removeUploadedImage}
        hdUpscalingMap={hdUpscalingMap}
        setHdUpscalingMap={setHdUpscalingMap}
        textQueue={textQueue}
        setTextQueue={setTextQueue}
        handleTextQueueItemClick={handleTextQueueItemClick}
        handleRemoveTextItem={handleRemoveTextItem}
        getConvLoading={getConvLoading}
        handleImageUpload={handleImageUpload}
        handleFileUpload={handleFileUpload}
        scheduleTextareaResize={scheduleTextareaResize}
        handlePaste={handlePaste}
        showInputMenu={showInputMenu}
        setShowInputMenu={setShowInputMenu}
        showModelMenu={showModelMenu}
        setShowModelMenu={setShowModelMenu}
        loading={loading}
        currentModelObj={currentModelObj}
        handleOpenCamera={handleOpenCamera}
        setShowGlobalMemorySettings={setShowGlobalMemorySettings}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        isReasoningCapable={isReasoningCapable}
        isReasoningEnabled={isReasoningEnabled}
        toggleReasoning={toggleReasoning}
        isSttListening={isSttListening}
        toggleSpeechToText={toggleSpeechToText}
        isAutoVoiceEnabled={isAutoVoiceEnabled}
        handleToggleAutoVoice={handleToggleAutoVoice}
        handleStopStreaming={handleStopStreaming}
      />

      <ChatSecondaryModals ctx={modalCtx} />
    </div>

    <ChatAgenticRightPanel
      showAgenticPanel={showAgenticPanel}
      setShowAgenticPanel={setShowAgenticPanel}
      agenticActiveTab={agenticActiveTab}
      setAgenticActiveTab={setAgenticActiveTab}
      agenticSteps={agenticSteps}
      activeSources={activeSources}
    />
  </div>
  );
};

export default ChatBot;
