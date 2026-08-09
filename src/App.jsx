import React, { useState, useEffect } from 'react';
import ChatBot from './components/ChatBot'
import Login from './components/Login'
import DocumentEditor from './components/DocumentEditor'
import DeepernovaUniverse from './components/DeepernovaUniverse'
import AICalendarHub from './components/AICalendarHub'
import AIManagerOffice from './components/AIManagerOffice'
import CloudSyncModal from './components/CloudSyncModal'
import { CookieConsent } from './components/CookieConsent'
import { ConversationPersistenceService } from './services/conversationPersistenceService'
import { API_BASE_URL } from './apiConfig';
import './App.css'

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'documents'
  const [documentType, setDocumentType] = useState('docx'); // 'docx', 'xlsx', or 'ppt'
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingPostLoginRedirect, setPendingPostLoginRedirect] = useState(null);
  const [localConvsToSync, setLocalConvsToSync] = useState([]);

  // Enhanced navigation handler that supports document type
  const handleNavigate = (view, fileType) => {
    setCurrentView(view);
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
            localStorage.setItem('authUser', JSON.stringify(data.user));
            localStorage.removeItem('guestSession');
            return;
          }

          if (data.guest) {
            setIsAuthenticated(false);
            setIsGuest(true);
            setUser(data.user || null);
            localStorage.setItem('guestSession', JSON.stringify(data.user || { guest: true }));
            localStorage.removeItem('authUser');
            return;
          }
        }

        if (response.status === 401) {
          localStorage.removeItem('authUser');
          const guestSessionStr = localStorage.getItem('guestSession');
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
              localStorage.removeItem('guestSession');
            }
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
        setIsAuthenticated(false);
        setIsGuest(false);
        setUser(null);
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
    localStorage.setItem('authUser', JSON.stringify(userData));
    localStorage.removeItem('guestSession');

    const localConvs = ConversationPersistenceService.loadFromLocalStorage();
    if (localConvs && Array.isArray(localConvs) && localConvs.length > 0) {
      setLocalConvsToSync(localConvs);
      setShowSyncModal(true);
    } else {
      if (pendingPostLoginRedirect) {
        setCurrentView(pendingPostLoginRedirect);
        setPendingPostLoginRedirect(null);
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
    const guest = guestUser || { name: 'Guest', email: 'guest@deepernova.com', guest: true };
    setUser(guest);
    localStorage.setItem('guestSession', JSON.stringify(guest));
    localStorage.removeItem('authUser');
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
    }
  };

  const handleSkipCloudSync = () => {
    console.log('[App] User skipped cloud sync.');
    setShowSyncModal(false);
    setLocalConvsToSync([]);
    if (pendingPostLoginRedirect) {
      setCurrentView(pendingPostLoginRedirect);
      setPendingPostLoginRedirect(null);
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
    }
  };

  if (loading) {
    console.log('[App] Rendering: Loading...');
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated && !isGuest) {
    console.log('[App] Rendering: Login (not authenticated, not guest)');
    return (
      <>
        <CookieConsent />
        <Login onLoginSuccess={handleLoginSuccess} onGuestLogin={handleGuestLogin} onSignupSuccess={handleSignupSuccess} />
      </>
    );
  }

  console.log(`[App] Rendering: ChatBot (isAuthenticated=${isAuthenticated}, isGuest=${isGuest})`);
  
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
