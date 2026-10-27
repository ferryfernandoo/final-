// ============================================================
// Deepernova AI ChatBot — Memoized Meta AI / ChatGPT Sidebar
// ============================================================
import React, { useMemo } from 'react';

export const ChatSidebar = React.memo(({
  sidebarOpen,
  setSidebarOpen,
  userLanguage = 'id',
  user,
  isAuthenticated,
  isGuest,
  conversations = [],
  currentConversationId,
  searchQuery = '',
  setSearchQuery,
  searchResults = [],
  showSidebarSearchInput,
  setShowSidebarSearchInput,
  showSidebarMoreMenu,
  setShowSidebarMoreMenu,
  showSidebarProfileMenu,
  setShowSidebarProfileMenu,
  onNavigate,
  createNewConversation,
  switchConversation,
  deleteConversation,
  handleSearchResultClick,
  parseConvTimestamp,
  setShowSavedImagesGallery,
  setShowAgenticPanel,
  setAgenticActiveTab,
  setShowApiDashboard,
  setShowPersonalityModal,
  setShowPrivateModal,
  setShowGlobalMemorySettings,
  setShowSettingsModal,
  setShowFormatDbModal,
  openLogoutConfirm,
  showAlert
}) => {
  const sortedPublicConversations = useMemo(() => {
    const publicConvs = conversations.filter(c => !c.isPrivate);
    if (!parseConvTimestamp) return publicConvs;
    return [...publicConvs].sort((a, b) => parseConvTimestamp(b) - parseConvTimestamp(a));
  }, [conversations, parseConvTimestamp]);

  return (
    <>
      <div className={`sidebar meta-ai-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Top Header: Rotating Gradient Logo Orb & Collapse Sidebar Button */}
        <div className="meta-sidebar-top-bar">
          <div
            className="lp-brand meta-sidebar-brand"
            onClick={() => onNavigate?.('landing')}
            title={userLanguage === 'id' ? 'Kembali ke Beranda' : 'Return to Home'}
          >
            <img src="/logo.png" alt="Deepernova AI" className="lp-brand-icon meta-sidebar-brand-icon" />
            <div className="lp-brand-text meta-sidebar-brand-text">
              <span className="lp-brand-name meta-sidebar-brand-name">Deepernova AI</span>
              <span className="lp-brand-sub meta-sidebar-brand-sub">indonesian technology research</span>
            </div>
          </div>

          <button
            type="button"
            className="meta-sidebar-collapse-btn"
            onClick={() => setSidebarOpen(false)}
            title={userLanguage === 'id' ? 'Tutup sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        {/* Primary Meta AI Nav Items */}
        <div className="meta-sidebar-nav-list">
          {/* 1. New chat (Ctrl+Shift+O) */}
          <button
            type="button"
            className="meta-sidebar-nav-btn"
            onClick={createNewConversation}
            title="Mulai percakapan baru (Ctrl+Shift+O)"
          >
            <div className="meta-nav-left-content">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>{userLanguage === 'id' ? 'New chat' : 'New chat'}</span>
            </div>
            <span className="meta-nav-shortcut">Ctrl+Shift+O</span>
          </button>

          {/* 2. Search (Ctrl+K) */}
          <button
            type="button"
            className={`meta-sidebar-nav-btn ${showSidebarSearchInput ? 'active' : ''}`}
            onClick={() => {
              setShowSidebarSearchInput(prev => !prev);
              setTimeout(() => {
                const el = document.querySelector('.meta-sidebar-search-box input');
                if (el) el.focus();
              }, 60);
            }}
            title="Cari riwayat (Ctrl+K)"
          >
            <div className="meta-nav-left-content">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>{userLanguage === 'id' ? 'Search' : 'Search'}</span>
            </div>
            <span className="meta-nav-shortcut">Ctrl+K</span>
          </button>

          {/* Inline search bar popup */}
          {showSidebarSearchInput && (
            <div className="meta-sidebar-search-box">
              <input
                type="text"
                placeholder={userLanguage === 'id' ? "Cari obrolan..." : "Search chats..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          )}

          {/* 3. Media */}
          <button
            type="button"
            className="meta-sidebar-nav-btn"
            onClick={() => setShowSavedImagesGallery(true)}
            title="Galeri Media & Foto AI"
          >
            <div className="meta-nav-left-content">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>{userLanguage === 'id' ? 'Media' : 'Media'}</span>
            </div>
          </button>

          {/* 4. Artifacts */}
          <button
            type="button"
            className="meta-sidebar-nav-btn"
            onClick={() => {
              setShowAgenticPanel(true);
              setAgenticActiveTab('langkah');
            }}
            title="Artefak & Kode AI"
          >
            <div className="meta-nav-left-content">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>{userLanguage === 'id' ? 'Artifacts' : 'Artifacts'}</span>
            </div>
          </button>

          {/* 5. Scheduled */}
          <button
            type="button"
            className="meta-sidebar-nav-btn"
            onClick={() => {
              showAlert?.(
                userLanguage === 'id'
                  ? '📅 Fitur Jadwal & Alarm AI aktif: Anda dapat meminta AI untuk menyetel alarm atau jadwal di dalam obrolan.'
                  : '📅 Scheduled tasks active: ask DeeperNova AI to set reminders in chat.',
                'info',
                3500
              );
            }}
            title="Jadwal & Pengingat AI"
          >
            <div className="meta-nav-left-content">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{userLanguage === 'id' ? 'Scheduled' : 'Scheduled'}</span>
            </div>
          </button>

          {/* 6. More */}
          <div className="meta-more-wrapper">
            <button
              type="button"
              className={`meta-sidebar-nav-btn ${showSidebarMoreMenu ? 'active' : ''}`}
              onClick={() => setShowSidebarMoreMenu(!showSidebarMoreMenu)}
              title="Menu Lainnya"
            >
              <div className="meta-nav-left-content">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="19" cy="12" r="1.5"></circle>
                  <circle cx="5" cy="12" r="1.5"></circle>
                </svg>
                <span>{userLanguage === 'id' ? 'More' : 'More'}</span>
              </div>
            </button>

            {showSidebarMoreMenu && (
              <div className="meta-more-dropdown-card" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="meta-more-dropdown-item"
                  onClick={() => {
                    setShowApiDashboard(true);
                    setShowSidebarMoreMenu(false);
                  }}
                >
                  <i className="fa-solid fa-cloud-bolt"></i>
                  <span>AI & API Platforms</span>
                </button>
                <button
                  type="button"
                  className="meta-more-dropdown-item"
                  onClick={() => {
                    setShowPersonalityModal(true);
                    setShowSidebarMoreMenu(false);
                  }}
                >
                  <i className="fa-solid fa-masks-theater"></i>
                  <span>{userLanguage === 'id' ? 'Kepribadian AI' : 'AI Personality'}</span>
                </button>
                <button
                  type="button"
                  className="meta-more-dropdown-item"
                  onClick={() => {
                    setShowPrivateModal(true);
                    setShowSidebarMoreMenu(false);
                  }}
                >
                  <i className="fa-solid fa-user-shield"></i>
                  <span>{userLanguage === 'id' ? 'Obrolan Privat' : 'Private Chat'}</span>
                </button>
                <button
                  type="button"
                  className="meta-more-dropdown-item"
                  onClick={() => {
                    setShowGlobalMemorySettings(true);
                    setShowSidebarMoreMenu(false);
                  }}
                >
                  <i className="fa-solid fa-dna"></i>
                  <span>{userLanguage === 'id' ? 'Fine-Tune & Memori' : 'Fine-Tune & Memory'}</span>
                </button>
                <div className="meta-more-dropdown-divider"></div>
                <button
                  type="button"
                  className="meta-more-dropdown-item"
                  onClick={() => {
                    setShowSettingsModal(true);
                    setShowSidebarMoreMenu(false);
                  }}
                >
                  <i className="fa-solid fa-gear"></i>
                  <span>{userLanguage === 'id' ? 'Pengaturan' : 'Settings'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section: History Header */}
        <div className="meta-sidebar-section-header">
          <span>{userLanguage === 'id' ? 'History' : 'History'}</span>
        </div>

        {/* History Scroll Area */}
        <div className="meta-sidebar-history-container">
          {searchQuery.trim() ? (
            <div className="search-results-list">
              <div className="search-results-header">
                {userLanguage === 'id' ? `Hasil pencarian (${searchResults.length})` : `Search results (${searchResults.length})`}
              </div>
              {searchResults.length === 0 ? (
                <div className="search-results-empty">
                  {userLanguage === 'id' ? 'Tidak ditemukan pesan' : 'No messages found'}
                </div>
              ) : (
                searchResults.map((result, idx) => {
                  const matchIndex = result.text.toLowerCase().indexOf(searchQuery.toLowerCase());
                  const start = Math.max(0, matchIndex - 30);
                  const end = Math.min(result.text.length, matchIndex + searchQuery.length + 40);
                  const snippet = (start > 0 ? '...' : '') + result.text.substring(start, end) + (end < result.text.length ? '...' : '');

                  return (
                    <div
                      key={`${result.messageId}-${idx}`}
                      className="search-result-item"
                      onClick={() => handleSearchResultClick(result.conversationId, result.messageId)}
                    >
                      <div className="result-conv-title">{result.conversationTitle}</div>
                      <div className="result-sender">{result.sender === 'user' ? '👤 Anda' : '🤖 AI'}</div>
                      <div className="result-snippet">
                        {snippet.split(new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')).map((part, i) =>
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark key={i} className="search-highlight">{part}</mark>
                          ) : part
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : sortedPublicConversations.length === 0 ? (
            <div className="meta-empty-history-wrapper">
              <div className="meta-empty-chat-icon-bubble">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="meta-empty-chat-main-text">
                {userLanguage === 'id' ? 'Belum ada obrolan' : 'No conversations yet'}
              </div>
              <div className="meta-empty-chat-sub-text">
                {userLanguage === 'id' ? 'Mulai obrolan dengan DeeperNova AI' : 'Start a conversation with DeeperNova AI'}
              </div>
              <button
                type="button"
                className="meta-empty-chat-btn"
                onClick={createNewConversation}
              >
                {userLanguage === 'id' ? 'Obrolan baru' : 'New chat'}
              </button>
            </div>
          ) : (
            <div className="meta-chat-items-list">
              {sortedPublicConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`meta-chat-item ${currentConversationId === conv.id ? 'active' : ''}`}
                  onClick={() => switchConversation(conv.id)}
                  title={conv.title}
                >
                  <i className="fa-regular fa-message meta-chat-item-icon"></i>
                  <span className="meta-chat-item-text">{conv.title}</span>
                  <button
                    type="button"
                    className="meta-chat-delete-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    title="Hapus percakapan"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Profile Footer */}
        <div className="meta-sidebar-footer">
          <div
            className="meta-sidebar-user-section"
            onClick={() => setShowSidebarProfileMenu(!showSidebarProfileMenu)}
          >
            <div className="meta-sidebar-avatar-circle">
              {user?.picture ? (
                <img src={user.picture} alt={user.name || 'User'} className="meta-sidebar-avatar-img" />
              ) : (
                <div className="meta-sidebar-avatar-initial">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
                </div>
              )}
            </div>
            <span className="meta-sidebar-handle-text" title={user?.name || 'ferryfernandoo_'}>
              {user?.name || 'ferryfernandoo_'}
            </span>
          </div>

          <button
            type="button"
            className="meta-sidebar-bell-btn"
            onClick={() => {
              showAlert?.(
                userLanguage === 'id'
                  ? '🔔 Semua fitur DeeperNova AI berjalan normal tanpa kendala.'
                  : '🔔 All DeeperNova AI systems operational.',
                'info',
                3000
              );
            }}
            title="Notifikasi"
          >
            <i className="fa-regular fa-bell"></i>
          </button>

          {showSidebarProfileMenu && (
            <div className="meta-profile-popover" onClick={(e) => e.stopPropagation()}>
              <div className="meta-popover-header">
                <strong>{user?.name || 'ferryfernandoo_'}</strong>
                <span>{user?.email || 'user@deepernova.com'}</span>
              </div>
              <div className="meta-popover-divider"></div>
              <button
                type="button"
                className="meta-popover-item"
                onClick={() => {
                  setShowSettingsModal(true);
                  setShowSidebarProfileMenu(false);
                }}
              >
                <i className="fa-solid fa-gear"></i>
                <span>{userLanguage === 'id' ? 'Pengaturan Akun' : 'Account Settings'}</span>
              </button>
              <button
                type="button"
                className="meta-popover-item"
                onClick={() => {
                  onNavigate?.('landing');
                  setShowSidebarProfileMenu(false);
                }}
              >
                <i className="fa-solid fa-house"></i>
                <span>{userLanguage === 'id' ? 'Kembali ke Beranda' : 'Back to Home'}</span>
              </button>
              {isAuthenticated && !isGuest && (
                <>
                  <button
                    type="button"
                    className="meta-popover-item danger"
                    onClick={() => {
                      setShowSidebarProfileMenu(false);
                      setShowFormatDbModal(true);
                    }}
                  >
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{userLanguage === 'id' ? 'Format Database Akun' : 'Format Account Database'}</span>
                  </button>
                  <div className="meta-popover-divider"></div>
                  <button
                    type="button"
                    className="meta-popover-item delete"
                    onClick={() => {
                      setShowSidebarProfileMenu(false);
                      openLogoutConfirm();
                    }}
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
});

export default ChatSidebar;

