import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import ChatBot from './components/ChatBot'
import Login from './components/Login'
import LandingPage from './components/LandingPage'
import DocumentEditor from './components/DocumentEditor'
import DeepernovaUniverse from './components/DeepernovaUniverse'
import AICalendarHub from './components/AICalendarHub'
import AIManagerOffice from './components/AIManagerOffice'
import CodeDanceIDE from './components/CodeDanceIDE'
import HelpCenter from './components/HelpCenter'
import CloudSyncModal from './components/CloudSyncModal'
import { CookieConsent } from './components/CookieConsent'
import { ConversationPersistenceService } from './services/conversationPersistenceService'
import { API_BASE_URL } from './apiConfig';
import { safeSetItem, safeGetItem, safeRemoveItem } from './utils/safeStorage.js';
import './App.css'

export const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  return (
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:'
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#ffffff',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Terjadi Kendala Memuat Tampilan</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '520px', marginBottom: '16px' }}>
            Aplikasi mengalami kendala saat memproses tampilan dokumen. Informasi sesi telah dibersihkan agar aplikasi dapat berjalan dengan normal.
          </p>
          {this.state.error?.message && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', marginBottom: '20px', maxWidth: '500px', wordBreak: 'break-word' }}>
              Error Detail: {this.state.error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                sessionStorage.removeItem('open_target_artifact');
                sessionStorage.removeItem('cloud_file_to_parse');
                if (typeof window !== 'undefined') window.deepernova_active_cloud_file = null;
                window.location.reload();
              }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🔄 Bersihkan Cache & Refresh
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('open_target_artifact');
                sessionStorage.removeItem('cloud_file_to_parse');
                if (typeof window !== 'undefined') window.deepernova_active_cloud_file = null;
                this.setState({ hasError: false, error: null });
                this.props.onNavigate?.('office');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              📂 Kembali ke Cloud Storage
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const isNative = isNativePlatform();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      if (path === '/help' || hash === '#help') return 'help';
      if (path === '/codedance' || hash === '#codedance') return 'codedance';
      if (path === '/documents' || hash === '#documents') return 'documents';
      if (path === '/chat' || hash === '#chat') return 'chat';
      if (path === '/universe' || hash === '#universe') return 'universe';
    }
    return isNative ? 'chat' : 'landing';
  };

  // On Native Capacitor (APK): open directly in 'chat' view (no landing page)
  // On Web: open LandingPage or direct path (e.g. /help)
  const [currentView, setCurrentView] = useState(getInitialView);
  const [showLoginView, setShowLoginView] = useState(false);
  const [documentType, setDocumentType] = useState('docx'); // 'docx', 'xlsx', or 'ppt'
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingPostLoginRedirect, setPendingPostLoginRedirect] = useState(null);
  const [localConvsToSync, setLocalConvsToSync] = useState([]);

  // Enhanced navigation handler that supports document type & browser URL pushState
  const handleNavigate = (view, fileType) => {
    setCurrentView(view);
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      const routeMap = {
        help: '/help',
        codedance: '/codedance',
        documents: '/documents',
        chat: '/chat',
        universe: '/universe',
        landing: '/'
      };
      if (routeMap[view]) {
        try {
          window.history.pushState(null, '', routeMap[view]);
        } catch (_) {}
      }
    }
    if (fileType) {
      // Map user-friendly names to editor types
      const typeMap = {
        'word': 'docx',
        'excel': 'excel',
        'ppt': 'pptx'
      };
      setDocumentType(typeMap[fileType] || fileType);
    }
  };

  // Listen to browser forward/back buttons & hash navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      if (path === '/help' || hash === '#help') setCurrentView('help');
      else if (path === '/codedance' || hash === '#codedance') setCurrentView('codedance');
      else if (path === '/documents' || hash === '#documents') setCurrentView('documents');
      else if (path === '/chat' || hash === '#chat') setCurrentView('chat');
      else if (path === '/universe' || hash === '#universe') setCurrentView('universe');
      else if (path === '/' || hash === '#landing' || hash === '#home') setCurrentView('landing');
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    const verifyAuth = async () => {
      console.log('[AUTH] Connecting to API:', API_BASE_URL);

      const parseResponse = async (response) => {
        const text = await response.text();
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return JSON.parse(text);
        }
        throw new Error(text || `Unexpected response type: ${contentType}`);
      };

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await parseResponse(response);
          if (data.authenticated) {
            setIsAuthenticated(true);
            setIsGuest(false);
            setUser(data.user || null);
            safeSetItem('authUser', JSON.stringify(data.user));
            safeRemoveItem('guestSession');
            return;
          }

          if (data.guest) {
            setIsAuthenticated(false);
            setIsGuest(true);
            setUser(data.user || null);
            safeSetItem('guestSession', JSON.stringify(data.user || { guest: true }));
            safeRemoveItem('authUser');
            return;
          }
        }

        if (response.status === 401) {
          safeRemoveItem('authUser');
          const guestSessionStr = safeGetItem('guestSession');
          if (guestSessionStr) {
            try {
              const guestUser = JSON.parse(guestSessionStr);
              if (guestUser.guest) {
                setIsAuthenticated(false);
                setIsGuest(true);
                setUser(guestUser);
                return;
              }
            } catch {
              console.log('Invalid guest session in localStorage');
              safeRemoveItem('guestSession');
            }
          }

          // If in Native Capacitor APK, auto-initialize guest session so APK is immediately usable in Chat
          if (isNative) {
            const defaultGuest = { name: 'Guest', email: 'guest@deepernova.com', guest: true };
            setIsAuthenticated(false);
            setIsGuest(true);
            setUser(defaultGuest);
            safeSetItem('guestSession', JSON.stringify(defaultGuest));
            return;
          }

          setIsAuthenticated(false);
          setIsGuest(false);
          setUser(null);
          return;
        }

        const data = await parseResponse(response);
        throw new Error(data.error || 'Auth check failed');
      } catch (error) {
        console.error('Auth check error:', error);
        if (isNative) {
          const defaultGuest = { name: 'Guest', email: 'guest@deepernova.com', guest: true };
          setIsAuthenticated(false);
          setIsGuest(true);
          setUser(defaultGuest);
          safeSetItem('guestSession', JSON.stringify(defaultGuest));
        } else {
          setIsAuthenticated(false);
          setIsGuest(false);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();

    const params = new URLSearchParams(window.location.search);
    if (params.get('session_started')) {
      verifyAuth();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const triggerPostAuthSync = (userData) => {
    setIsAuthenticated(true);
    setIsGuest(false);
    setUser(userData);
    setShowLoginView(false);
    safeSetItem('authUser', JSON.stringify(userData));
    safeRemoveItem('guestSession');

    const localConvs = ConversationPersistenceService.loadFromLocalStorage();
    if (localConvs && Array.isArray(localConvs) && localConvs.length > 0) {
      setLocalConvsToSync(localConvs);
      setShowSyncModal(true);
    } else {
      if (pendingPostLoginRedirect) {
        setCurrentView(pendingPostLoginRedirect);
        setPendingPostLoginRedirect(null);
      } else {
        setCurrentView('chat');
      }
    }
  };

  const handleLoginSuccess = (userData) => {
    console.log('[App] User logged in and saved to localStorage:', userData.email);
    triggerPostAuthSync(userData);
  };

  const handleGuestLogin = (guestUser) => {
    setIsAuthenticated(false);
    setIsGuest(true);
    setShowLoginView(false);
    const guest = guestUser || { name: 'Guest', email: 'guest@deepernova.com', guest: true };
    setUser(guest);
    safeSetItem('guestSession', JSON.stringify(guest));
    safeRemoveItem('authUser');
    console.log('[App] Guest session started');
  };

  const handleSignupSuccess = (userData) => {
    console.log('[App] User signed up and saved to localStorage:', userData.email);
    triggerPostAuthSync(userData);
  };

  const handleConfirmCloudSync = async () => {
    if (localConvsToSync.length > 0) {
      console.log(`[App] Syncing ${localConvsToSync.length} local conversations to cloud...`);
      await ConversationPersistenceService.saveToBackend(localConvsToSync);
    }
    setShowSyncModal(false);
    setLocalConvsToSync([]);
    if (pendingPostLoginRedirect) {
      setCurrentView(pendingPostLoginRedirect);
      setPendingPostLoginRedirect(null);
    } else {
      setCurrentView('chat');
    }
  };

  const handleSkipCloudSync = () => {
    console.log('[App] User skipped cloud sync.');
    setShowSyncModal(false);
    setLocalConvsToSync([]);
    if (pendingPostLoginRedirect) {
      setCurrentView(pendingPostLoginRedirect);
      setPendingPostLoginRedirect(null);
    } else {
      setCurrentView('chat');
    }
  };

  const handleUpdateUser = (updatedFields) => {
    setUser((prevUser) => {
      const nextUser = { ...(prevUser || {}), ...updatedFields };
      if (isAuthenticated) {
        localStorage.setItem('authUser', JSON.stringify(nextUser));
      } else if (isGuest) {
        localStorage.setItem('guestSession', JSON.stringify(nextUser));
      }
      return nextUser;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear auth from localStorage & sessionStorage
      localStorage.removeItem('authUser');
      localStorage.removeItem('guestSession');
      localStorage.removeItem('chatbot_conversations');
      try { sessionStorage.clear(); } catch (_e) {}
      if (typeof window !== 'undefined') window.deepernova_file_cache = null;
      console.log('[App] User logged out, localStorage & sessionStorage cleared');
      
      setIsAuthenticated(false);
      setIsGuest(false);
      setUser(null);

      // On Web: return to landing page on logout
      if (!isNative) {
        setCurrentView('landing');
      } else {
        // On APK: auto-restart guest session
        const defaultGuest = { name: 'Guest', email: 'guest@deepernova.com', guest: true };
        setIsGuest(true);
        setUser(defaultGuest);
        safeSetItem('guestSession', JSON.stringify(defaultGuest));
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        gap: '18px',
        userSelect: 'none'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img
            src="/logo.png"
            alt="Deepernova AI"
            style={{
              width: '68px',
              height: '68px',
              objectFit: 'contain',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              animation: 'pulseLogo 2s ease-in-out infinite'
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: '#0f172a'
          }}>
            Deepernova AI
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid #e2e8f0',
              borderTopColor: '#f97316',
              borderRadius: '50%',
              animation: 'spinLoader 0.8s linear infinite'
            }} />
            <span style={{
              fontSize: '13px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              Memuat Deepernova AI...
            </span>
          </div>
        </div>
        <style>{`
          @keyframes spinLoader {
            to { transform: rotate(360deg); }
          }
          @keyframes pulseLogo {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.04); opacity: 0.92; }
          }
        `}</style>
      </div>
    );
  }

  // 1. Web Landing Page (ONLY for Web, NEVER for Native Capacitor APK)
  if (!isNative && currentView === 'landing' && !showLoginView) {
    return (
      <>
        <CookieConsent />
        <LandingPage
          isAuthenticated={isAuthenticated}
          isGuest={isGuest}
          user={user}
          onNavigate={handleNavigate}
          onStartChat={() => {
            if (!isAuthenticated && !isGuest) {
              handleGuestLogin();
            }
            handleNavigate('chat');
          }}
          onOpenOffice={() => {
            if (!isAuthenticated && !isGuest) {
              handleGuestLogin();
            }
            handleNavigate('documents');
          }}
          onOpenUniverse={() => {
            if (!isAuthenticated && !isGuest) {
              handleGuestLogin();
            }
            handleNavigate('universe');
          }}
          onOpenLogin={() => setShowLoginView(true)}
        />
      </>
    );
  }

  // 1.5. Help & Problem Solving Center (Publicly accessible without requiring login)
  if (currentView === 'help') {
    return (
      <ErrorBoundary onNavigate={handleNavigate}>
        <HelpCenter onNavigate={handleNavigate} />
      </ErrorBoundary>
    );
  }

  // 2. Explicit Login View (when opened from Landing Page or unauthenticated)
  if ((showLoginView || (!isAuthenticated && !isGuest && !isNative))) {
    console.log('[App] Rendering: Login form');
    return (
      <>
        <CookieConsent />
        <div style={{ position: 'relative' }}>
          {!isNative && (
            <button
              onClick={() => {
                setShowLoginView(false);
                setCurrentView('landing');
              }}
              style={{
                position: 'fixed',
                top: '20px',
                left: '20px',
                zIndex: 1000,
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)'
              }}
            >
              ← Kembali ke Beranda
            </button>
          )}
          <Login
            onLoginSuccess={handleLoginSuccess}
            onGuestLogin={(guest) => {
              handleGuestLogin(guest);
              setCurrentView('chat');
            }}
            onSignupSuccess={handleSignupSuccess}
          />
        </div>
      </>
    );
  }

  console.log(`[App] Rendering: ${currentView} (isNative=${isNative}, isAuthenticated=${isAuthenticated}, isGuest=${isGuest})`);
  
  if (currentView === 'documents') {
    return (
      <ErrorBoundary onNavigate={handleNavigate}>
        <DocumentEditor user={user} onNavigate={handleNavigate} documentType={documentType} />
      </ErrorBoundary>
    );
  }
  if (currentView === 'universe') {
    return (
      <>
        {showSyncModal && (
          <CloudSyncModal
            onConfirmSync={handleConfirmCloudSync}
            onSkipSync={handleSkipCloudSync}
            conversationCount={localConvsToSync.length}
          />
        )}
        <DeepernovaUniverse 
          onNavigate={handleNavigate} 
          isAuthenticated={isAuthenticated}
          isGuest={isGuest}
          user={user}
          onLoginRequest={(targetView = 'office') => {
            setPendingPostLoginRedirect(targetView);
            localStorage.removeItem('authUser');
            localStorage.removeItem('guestSession');
            setIsAuthenticated(false);
            setIsGuest(false);
            setUser(null);
            setShowLoginView(true);
          }}
        />
      </>
    );
  }
  if (currentView === 'office') {
    return (
      <>
        {showSyncModal && (
          <CloudSyncModal
            onConfirmSync={handleConfirmCloudSync}
            onSkipSync={handleSkipCloudSync}
            conversationCount={localConvsToSync.length}
          />
        )}
        <AIManagerOffice 
          user={user} 
          onNavigate={handleNavigate} 
          isAuthenticated={isAuthenticated} 
        />
      </>
    );
  }
  if (currentView === 'calendar') {
    return (
      <AICalendarHub onNavigate={handleNavigate} />
    );
  }
  if (currentView === 'codedance') {
    return (
      <ErrorBoundary onNavigate={handleNavigate}>
        <CodeDanceIDE 
          user={user}
          isAuthenticated={isAuthenticated}
          onNavigate={handleNavigate}
        />
      </ErrorBoundary>
    );
  }
  
  return (
    <>
      {showSyncModal && (
        <CloudSyncModal
          onConfirmSync={handleConfirmCloudSync}
          onSkipSync={handleSkipCloudSync}
          conversationCount={localConvsToSync.length}
        />
      )}
      <ChatBot
        user={user}
        isAuthenticated={isAuthenticated}
        isGuest={isGuest}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onUpdateUser={handleUpdateUser}
      />
    </>
  )
}

export default App
