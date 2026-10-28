import React from 'react';
import { PERSONALITIES } from './chatConstants';
import memoryService from '../../services/memoryService';
import ApiMarketplace from '../ApiMarketplace';
import VoiceChat from '../VoiceChat';
import SavedImagesGallery from '../SavedImagesGallery';
import GlobalMemorySettings from '../GlobalMemorySettings';

export const ChatPrimaryModals = React.memo(function ChatPrimaryModals({ ctx }) {
  const {
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
  } = ctx;

  return (
    <>
      {/* Modern Private Chat Modal */}
      {showPrivateModal && (
        <div className="modern-feature-modal-overlay" onClick={() => setShowPrivateModal(false)}>
          <div className="modern-private-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="feature-modal-close-btn"
              onClick={() => setShowPrivateModal(false)}
              aria-label="Tutup"
            >
              ✕
            </button>

            <div className="private-modal-lock-badge">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <div className="private-modal-tag">
              {userLanguage === 'id' ? '🔒 Mode Anonim & Privat' : '🔒 Private & Anonymous Mode'}
            </div>

            <h3 className="private-modal-title">
              {userLanguage === 'id' ? 'Mulai Obrolan Privat' : 'Start Private Chat'}
            </h3>

            <p className="private-modal-desc">
              {userLanguage === 'id'
                ? 'Obrolan privat tidak akan disimpan ke riwayat akun atau memori jangka panjang. Semua pesan akan langsung terhapus saat halaman di-refresh.'
                : 'Private chats are not saved to your account history or long-term memory. All messages will be automatically cleared when you refresh the page.'}
            </p>

            <div className="private-modal-chips-grid">
              <div className="private-chip-item">
                <span className="private-chip-icon">🚫</span>
                <span className="private-chip-text">{userLanguage === 'id' ? 'Tanpa Riwayat' : 'Zero History'}</span>
              </div>
              <div className="private-chip-item">
                <span className="private-chip-icon">⚡</span>
                <span className="private-chip-text">{userLanguage === 'id' ? 'Hanya Sesi Ini' : 'Session Only'}</span>
              </div>
              <div className="private-chip-item">
                <span className="private-chip-icon">🛡️</span>
                <span className="private-chip-text">{userLanguage === 'id' ? 'Isolasi Memori' : 'Memory Isolated'}</span>
              </div>
            </div>

            <div className="private-modal-actions-row">
              <button
                type="button"
                className="private-modal-btn cancel-btn"
                onClick={() => setShowPrivateModal(false)}
              >
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                className="private-modal-btn start-btn"
                onClick={startPrivateChat}
              >
                {userLanguage === 'id' ? 'Mulai Obrolan Privat' : 'Start Private Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Found Sources Panel - Show sources before generating answer */}
      {showFoundSourcesPanel && foundSources.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowFoundSourcesPanel(false)}>
          <div className="modal-content sources-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowFoundSourcesPanel(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📰 {userLanguage === 'id' ? 'Sumber Ditemukan' : 'Sources Found'}</h2>
              <p className="sources-count">{foundSources.length} {userLanguage === 'id' ? 'sumber' : 'sources'}</p>
            </div>
            <div className="modal-body sources-list-body">
              {foundSources.map((source, idx) => (
                <div key={idx} className="source-item">
                  <div className="source-header">
                    <h3>{source.title}</h3>
                    <span className="source-badge">{source.source}</span>
                  </div>
                  <p className="source-description">{source.description}</p>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                      🔗 {userLanguage === 'id' ? 'Buka Sumber' : 'Open Source'}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer sources-footer">
              <button
                className="modal-btn-cancel"
                onClick={() => setShowFoundSourcesPanel(false)}
              >
                {userLanguage === 'id' ? 'Tutup' : 'Close'}
              </button>
              <button
                className="modal-btn-primary generate-answer-btn"
                onClick={() => {
                  setShowFoundSourcesPanel(false);
                  if (pendingAnswerMessage) {
                    handleGenerateAnswerFromSources(pendingAnswerMessage);
                  }
                }}
              >
                ✨ {userLanguage === 'id' ? 'Auto Generate' : 'Auto Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personality Selector Modal */}
      {showPersonalityModal && (
        <div className="modal-overlay" onClick={() => setShowPersonalityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowPersonalityModal(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2><i className="fas fa-theater-masks" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Pilih Kepribadian AI' : 'Choose AI Personality'}</h2>
            </div>
            <div className="modal-body">
              <p>
                {userLanguage === 'id'
                  ? 'Pilih kepribadian yang Anda sukai untuk mengubah gaya percakapan Deepernova AI'
                  : 'Choose a personality to change how Deepernova AI communicates with you'}
              </p>
              <div className="personality-modal-grid">
                {Object.values(PERSONALITIES).map((personality) => (
                  <button
                    key={personality.id}
                    className={`personality-modal-btn ${selectedPersonality === personality.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPersonality(personality.id);
                      setShowPersonalityModal(false);
                    }}
                  >
                    <span className="personality-modal-emoji">{personality.emoji}</span>
                    <span className="personality-modal-name">{personality.name}</span>
                    <span className="personality-modal-desc">{personality.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNameSetupModal && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowNameSetupModal(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📝 {userLanguage === 'id' ? 'Siapa nama kamu?' : 'What is your name?'}</h2>
            </div>
            <div className="modal-body">
              <p>{userLanguage === 'id' ? 'Supaya Deepernova AI bisa manggil kamu dengan nama yang benar.' : 'So Deepernova AI can call you by the right name.'}</p>
              <div className="settings-row">
                <label>{userLanguage === 'id' ? 'Nama' : 'Name'}</label>
                <input
                  type="text"
                  value={pendingUserName}
                  onChange={(e) => setPendingUserName(e.target.value)}
                  placeholder={userLanguage === 'id' ? 'Contoh: Nando' : 'Example: Nando'}
                />
              </div>
              <div className="settings-row modal-actions-row">
                <button
                  className="modal-btn-confirm"
                  onClick={() => saveUserName(pendingUserName)}
                >
                  {userLanguage === 'id' ? 'Simpan' : 'Save'}
                </button>
                <button
                  className="modal-btn-cancel"
                  onClick={skipNameSetup}
                >
                  {userLanguage === 'id' ? 'Lewati' : 'Skip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Non-Popup Settings Drawer Panel */}
      <div className={`modern-settings-backdrop ${showSettingsModal ? 'open' : ''}`} onClick={() => setShowSettingsModal(false)}></div>
      <div className={`modern-settings-drawer ${showSettingsModal ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-drawer-header">
          <div className="settings-header-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <h2>{userLanguage === 'id' ? 'Pengaturan' : 'Settings'}</h2>
          </div>
          <button
            type="button"
            className="settings-drawer-close"
            onClick={() => setShowSettingsModal(false)}
            title={userLanguage === 'id' ? 'Tutup Pengaturan' : 'Close Settings'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="settings-drawer-content">
          {/* User Account Card */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Akun & Profil' : 'Account & Profile'}
            </div>
            <div className="settings-profile-row">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="settings-avatar" />
              ) : (
                <div className="settings-avatar-fallback">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="settings-profile-info">
                <div className="settings-profile-name">
                  {user?.name || (userLanguage === 'id' ? 'Pengguna Deepernova' : 'Deepernova User')}
                </div>
                <div className="settings-profile-email">
                  {user?.email || 'local-ai@deepernova'}
                </div>
              </div>
            </div>

            <div className="settings-field-item">
              <label className="settings-field-label">
                {userLanguage === 'id' ? 'Nama Tampilan' : 'Display Name'}
              </label>
              <div className="settings-input-group">
                <input
                  type="text"
                  className="modern-settings-input"
                  value={pendingUserName}
                  onChange={(e) => setPendingUserName(e.target.value)}
                  placeholder={userLanguage === 'id' ? 'Contoh: Ferry' : 'e.g. Ferry'}
                />
                <button
                  type="button"
                  className="settings-save-name-btn"
                  onClick={() => {
                    saveUserName(pendingUserName);
                    setCustomAlert(userLanguage === 'id' ? 'Nama berhasil diperbarui' : 'Name updated successfully');
                  }}
                >
                  {userLanguage === 'id' ? 'Simpan' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Preferensi Antarmuka' : 'UI Preferences'}
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Bahasa Aplikasi' : 'App Language'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Pilih bahasa antarmuka Deepernova AI' : 'Choose Deepernova UI language'}</span>
              </div>
              <select
                className="modern-settings-select"
                value={userLanguage}
                onChange={(e) => {
                  const nextLang = e.target.value;
                  setUserLanguage(nextLang);
                  saveLanguage(nextLang);
                }}
              >
                <option value="id">Bahasa Indonesia (ID)</option>
                <option value="en">English (US/UK)</option>
                <option value="zh">简体中文 (CN)</option>
              </select>
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Mode Privat' : 'Private Mode'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Jangan simpan sesi percakapan baru' : 'Do not save new conversation sessions'}</span>
              </div>
              <label className="modern-switch">
                <input
                  type="checkbox"
                  checked={isPrivateChat}
                  onChange={() => setIsPrivateChat(s => !s)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Statistik Token' : 'Token Usage'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Tampilkan info token di bawah pesan' : 'Show token usage metrics under messages'}</span>
              </div>
              <label className="modern-switch">
                <input
                  type="checkbox"
                  checked={showTokenUsage}
                  onChange={() => setShowTokenUsage(prev => !prev)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>

          {/* Data & AI Management Card */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Data & Integrasi' : 'Data & Integrations'}
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">{userLanguage === 'id' ? 'Memori AI' : 'AI Memory'}</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Hapus riwayat memori kontekstual AI' : 'Clear contextual long-term AI memory'}</span>
              </div>
              <button
                type="button"
                className="settings-action-btn danger-btn"
                onClick={() => {
                  if (confirm(userLanguage === 'id' ? 'Bersihkan semua memori AI?' : 'Clear all AI memories?')) {
                    memoryService.clearMemories();
                    setCustomAlert(userLanguage === 'id' ? 'Memori AI telah dibersihkan' : 'AI memories cleared');
                  }
                }}
              >
                {userLanguage === 'id' ? 'Hapus Memori' : 'Clear Memory'}
              </button>
            </div>

            <div className="settings-option-row">
              <div className="option-text">
                <span className="option-title">🔌 API Marketplace</span>
                <span className="option-desc">{userLanguage === 'id' ? 'Akses API Key dan integrasi pengembang' : 'Access API Keys and developer dashboard'}</span>
              </div>
              <button
                type="button"
                className="settings-action-btn primary-btn"
                onClick={() => {
                  setShowApiDashboard(true);
                  setShowSettingsModal(false);
                }}
              >
                {userLanguage === 'id' ? 'Buka Dashboard' : 'Open Dashboard'}
              </button>
            </div>
          </div>

          {/* Latest Update & System Status Card */}
          <div className="settings-group-card latest-update-card">
            <div className="settings-group-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{userLanguage === 'id' ? 'Info Pembaruan Terkini' : 'Latest System Update'}</span>
              <span className="update-pulse-badge">
                <span className="pulse-dot"></span>
                {userLanguage === 'id' ? 'Terkini' : 'Up to Date'}
              </span>
            </div>

            <div className="update-info-header">
              <div className="update-version-row">
                <span className="update-version-tag">v3.8.5 Enterprise</span>
                <span className="update-date-text">
                  📅 {new Intl.DateTimeFormat(userLanguage === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
                </span>
              </div>
              <div className="update-headline">
                {userLanguage === 'id' ? 'Pembaruan Sistem Hari Ini' : "Today's System Release"}
              </div>
            </div>

            <div className="update-features-list">
              <div className="update-feature-item">
                <span className="feature-icon">⚡</span>
                <div className="feature-content">
                  <div className="feature-title">Deepernova Synapse Ultra Engine</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Inferensi AI ultra-cepat dengan latensi respons instan <300ms.' : 'Ultra-fast AI inference with sub-300ms instant latency.'}</div>
                </div>
              </div>
              <div className="update-feature-item">
                <span className="feature-icon">📝</span>
                <div className="feature-content">
                  <div className="feature-title">Typernova Word Agent</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Penyusun dokumen otomatis (Cover, TOC titik-titik, Bab I-V, & Daftar Pustaka).' : 'Autonomous document drafter with full TOC leader dots & chapters.'}</div>
                </div>
              </div>
              <div className="update-feature-item">
                <span className="feature-icon">💻</span>
                <div className="feature-content">
                  <div className="feature-title">CodeDance Vibe Coding IDE</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Autonomous Coding Agent & Cloud Terminal Sandbox terintegrasi.' : 'Autonomous coding agent & live cloud terminal sandbox.'}</div>
                </div>
              </div>
              <div className="update-feature-item">
                <span className="feature-icon">⏱️</span>
                <div className="feature-content">
                  <div className="feature-title">Smart Redirect Countdown</div>
                  <div className="feature-desc">{userLanguage === 'id' ? 'Kartu transisi halus 5 detik saat beralih workspace tanpa mengejutkan pengguna.' : 'Smooth 5s transition countdown card when switching workspaces.'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone: Format Database Akun */}
          {isAuthenticated && !isGuest && (
            <div className="settings-group-card settings-danger-card">
              <div className="settings-group-title danger-title">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>{userLanguage === 'id' ? 'Zona Bahaya & Format Database' : 'Danger Zone & Database Format'}</span>
              </div>
              <p className="settings-group-desc-danger">
                {userLanguage === 'id'
                  ? 'Format total database akun Anda agar kembali fresh seperti akun baru. Seluruh riwayat chat, file dokumen, gambar, dan memori AI dibersihkan, dan kuota 1.000.000 token dipulihkan.'
                  : 'Completely format your account database to a 100% fresh state. Wipes chats, documents, images, and AI memories while restoring 1,000,000 token quota.'}
              </p>
              <button
                type="button"
                className="settings-danger-full-btn"
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowFormatDbModal(true);
                }}
              >
                <i className="fa-solid fa-trash-can"></i>
                <span>{userLanguage === 'id' ? 'Format Database Akun Fresh' : 'Format Account Database Fresh'}</span>
              </button>
            </div>
          )}

          {/* Account Actions */}
          <div className="settings-group-card">
            <div className="settings-group-title">
              {userLanguage === 'id' ? 'Sesi Akun' : 'Account Session'}
            </div>
            <button
              type="button"
              className="settings-logout-full-btn"
              onClick={() => {
                setShowSettingsModal(false);
                openLogoutConfirm();
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>{userLanguage === 'id' ? 'Keluar dari Akun' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HTML Editor Modal */}
      {showHtmlEditor && (
        <div className="modal-overlay" onClick={() => setShowHtmlEditor(false)}>
          <div className="modal-content html-editor-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowHtmlEditor(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>💻 {userLanguage === 'id' ? 'Editor Code' : 'Code Editor'}</h2>
            </div>

            <div className="modal-body html-editor-body">
              <div className="html-filename-group">
                <label>{userLanguage === 'id' ? 'Nama file:' : 'Filename:'}</label>
                <input
                  type="text"
                  value={htmlFilename}
                  onChange={(e) => setHtmlFilename(e.target.value || 'code.txt')}
                  placeholder="code.txt"
                  className="html-filename-input"
                />
              </div>

              <div className="html-editor-group">
                <label>{userLanguage === 'id' ? 'Kode:' : 'Code:'}</label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="html-editor-textarea"
                  spellCheck="false"
                  placeholder={userLanguage === 'id' ? 'Edit code di sini...' : 'Edit code here...'}
                />
              </div>

              <div className="html-preview-info">
                <svg className="info-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{userLanguage === 'id' ? 'Preview akan terbuka di tab baru (untuk HTML)' : 'Preview opens in new tab (for HTML)'}</span>
              </div>
            </div>

            <div className="modal-footer html-editor-footer">
              <button
                className="html-preview-btn"
                onClick={() => setShowHtmlPreview(true)}
                title={userLanguage === 'id' ? 'Preview di dalam aplikasi' : 'Preview inside app'}
              >
                👁️ {userLanguage === 'id' ? 'Preview' : 'Preview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHtmlPreview && (
        <div className="modal-overlay" onClick={() => setShowHtmlPreview(false)}>
          <div className="modal-content html-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHtmlPreview(false)}>
              ✕
            </button>
            <div className="html-preview-body">
              <iframe
                className="html-preview-iframe"
                srcDoc={htmlContent}
                sandbox="allow-scripts allow-same-origin"
                title={userLanguage === 'id' ? 'Pratinjau HTML' : 'HTML Preview'}
              />
              <button className="preview-close-btn" onClick={() => setShowHtmlPreview(false)}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={closeLogoutConfirm}>
              ×
            </button>
            <div className="modal-header">
              <h2>{userLanguage === 'id' ? 'Konfirmasi Logout' : 'Logout Confirmation'}</h2>
            </div>
            <div className="modal-body">
              <p>
                {userLanguage === 'id'
                  ? 'Anda akan keluar dari akun ini. Semua session akan berakhir dan Anda harus login lagi untuk melanjutkan.'
                  : 'You will be logged out from this account. Your session will end and you will need to log in again to continue.'}
              </p>
              <p>
                {userLanguage === 'id'
                  ? 'Apakah Anda yakin ingin logout sekarang?'
                  : 'Are you sure you want to logout now?'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={closeLogoutConfirm}>
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button className="modal-btn-primary" onClick={confirmLogout} disabled={logoutLoading}>
                {logoutLoading
                  ? userLanguage === 'id' ? 'Logout...' : 'Logging out...'
                  : userLanguage === 'id' ? 'Logout' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format Database Akun Modal (High Security Confirmation) */}
      {showFormatDbModal && (
        <div className="modal-overlay" onClick={() => !formatDbLoading && setShowFormatDbModal(false)}>
          <div className="modal-content format-db-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !formatDbLoading && setShowFormatDbModal(false)}
              disabled={formatDbLoading}
            >
              ×
            </button>
            <div className="modal-header format-db-header">
              <div className="format-db-icon-wrap">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h2>{userLanguage === 'id' ? 'Format Database Akun' : 'Format Account Database'}</h2>
                <p className="format-db-subtitle">
                  {userLanguage === 'id'
                    ? 'Kembalikan akun ke kondisi 100% fresh seperti baru'
                    : 'Restore account back to 100% fresh state'}
                </p>
              </div>
            </div>

            <div className="modal-body format-db-body">
              <div className="format-db-warning-banner">
                <p>
                  <strong>⚠️ PERINGATAN KRITIS:</strong> Tindakan ini akan <strong>menghapus permanen</strong> semua riwayat chat, dokumen cloud, gambar AI, dan memori personal akun Anda.
                </p>
                <p>
                  Akun Anda <strong>tidak akan dihapus</strong> dan tetap dapat login, serta kuota token Anda akan <strong>dipulihkan fresh menjadi 1.000.000 token</strong>.
                </p>
              </div>

              {formatDbError && (
                <div className="format-db-error-banner">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{formatDbError}</span>
                </div>
              )}

              <div className="format-db-step-block">
                <label className="format-db-label">
                  {userLanguage === 'id'
                    ? '1. Salin teks verifikasi keamanan di bawah ini:'
                    : '1. Copy the security verification text below:'}
                </label>
                <div className="format-db-copy-box">
                  <code className="format-db-keyword">HAPUS DATA SAYA</code>
                  <button
                    type="button"
                    className="format-db-copy-btn"
                    onClick={handleCopyFormatConfirmText}
                    title="Salin dan tempel teks"
                  >
                    <i className={formatDbCopied ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
                    <span>
                      {formatDbCopied
                        ? (userLanguage === 'id' ? 'Tersalin & Ditempel!' : 'Copied & Pasted!')
                        : (userLanguage === 'id' ? 'Salin Teks' : 'Copy Text')}
                    </span>
                  </button>
                </div>
              </div>

              <div className="format-db-step-block">
                <label className="format-db-label">
                  {userLanguage === 'id'
                    ? '2. Tempel atau ketik teks verifikasi di sini:'
                    : '2. Paste or type verification text here:'}
                </label>
                <input
                  type="text"
                  className={`format-db-input ${formatDbConfirmText.trim().toUpperCase() === 'HAPUS DATA SAYA' ? 'valid' : ''}`}
                  placeholder="Ketik: HAPUS DATA SAYA"
                  value={formatDbConfirmText}
                  onChange={(e) => {
                    setFormatDbConfirmText(e.target.value);
                    if (formatDbError) setFormatDbError(null);
                  }}
                  disabled={formatDbLoading}
                  autoComplete="off"
                />
              </div>

              <div className="format-db-step-block">
                <label className="format-db-label">
                  {userLanguage === 'id'
                    ? '3. Masukkan kata sandi akun Anda untuk verifikasi:'
                    : '3. Enter your account password for verification:'}
                </label>
                <div className="format-db-password-wrap">
                  <input
                    type={showFormatDbPassword ? "text" : "password"}
                    className="format-db-input password-input"
                    placeholder={userLanguage === 'id' ? 'Masukkan sandi akun Anda' : 'Enter your account password'}
                    value={formatDbPassword}
                    onChange={(e) => {
                      setFormatDbPassword(e.target.value);
                      if (formatDbError) setFormatDbError(null);
                    }}
                    disabled={formatDbLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="format-db-eye-btn"
                    onClick={() => setShowFormatDbPassword(!showFormatDbPassword)}
                    tabIndex="-1"
                  >
                    <i className={showFormatDbPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye"}></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer format-db-footer">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => {
                  setShowFormatDbModal(false);
                  setFormatDbPassword('');
                  setFormatDbConfirmText('');
                  setFormatDbError(null);
                }}
                disabled={formatDbLoading}
              >
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                className="modal-btn-danger-format"
                onClick={handleFormatDatabaseAccount}
                disabled={
                  formatDbLoading ||
                  formatDbConfirmText.trim().toUpperCase() !== 'HAPUS DATA SAYA' ||
                  !formatDbPassword
                }
              >
                {formatDbLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>{userLanguage === 'id' ? 'Memformat Database...' : 'Formatting Database...'}</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-radiation"></i>
                    <span>{userLanguage === 'id' ? 'Format Database Sekarang' : 'Format Database Now'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessageId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={handleCancelEdit}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>{userLanguage === 'id' ? '✏️ Edit Pesan' : '✏️ Edit Message'}</h2>
            </div>
            <div className="modal-body">
              <textarea
                className="edit-message-textarea"
                value={editingMessageText}
                onChange={(e) => setEditingMessageText(e.target.value)}
                placeholder={userLanguage === 'id' ? 'Edit pesan Anda...' : 'Edit your message...'}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={handleCancelEdit}>
                {userLanguage === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button className="modal-btn-primary" onClick={handleEditAndResend}>
                {userLanguage === 'id' ? 'Edit & Kirim Ulang' : 'Edit & Resend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Marketplace Dashboard */}
      {showApiDashboard && (
        <div className="api-dashboard-fullscreen">
          <button
            className="api-dashboard-close"
            onClick={() => setShowApiDashboard(false)}
            title="Back to chat"
          >
            ✕
          </button>
          <ApiMarketplace onLogout={() => setShowApiDashboard(false)} />
        </div>
      )}

      {/* Sources Modal */}
      {showSourcesModal && (
        <div className="modal-overlay" onClick={() => setShowSourcesModal(false)}>
          <div className="modal-content sources-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowSourcesModal(false)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📚 {userLanguage === 'id' ? 'Sumber Data' : 'Data Sources'}</h2>
            </div>

            <div className="modal-body sources-body">
              {!currentSources || currentSources.length === 0 ? (
                <div className="no-sources-message">
                  <p>
                    {userLanguage === 'id'
                      ? 'Belum ada sumber data untuk percakapan ini'
                      : 'No data sources available for this conversation'}
                  </p>
                  <p className="sources-hint">
                    {userLanguage === 'id'
                      ? 'Coba tanyakan tentang ekonomi, pasar, atau berita terbaru'
                      : 'Try asking about economy, markets, or latest news'}
                  </p>
                </div>
              ) : (
                <div className="sources-list">
                  {currentSources.map((source, idx) => (
                    <div key={source.id || idx} className="source-item">
                      <div className="source-header">
                        <span className="source-icon">{getSourceIcon(source.type)}</span>
                        <div className="source-meta">
                          <h3 className="source-title">{source.title}</h3>
                          <p className="source-type">{source.source}</p>
                          {source.timestamp && (
                            <p className="source-time">
                              {new Date(source.timestamp).toLocaleString(userLanguage === 'id' ? 'id-ID' : 'en-US')}
                            </p>
                          )}
                        </div>
                      </div>

                      {source.description && (
                        <p className="source-description">{source.description}</p>
                      )}

                      <div className="source-actions">
                        {source.url && (
                          <button
                            className="source-open-btn"
                            onClick={() => handleOpenSource(source.url)}
                            title={userLanguage === 'id' ? 'Buka sumber' : 'Open source'}
                          >
                            🔗 {userLanguage === 'id' ? 'Buka' : 'Open'}
                          </button>
                        )}
                        <button
                          className="source-detail-btn"
                          onClick={() => handleViewSourceDetail(source)}
                          title={userLanguage === 'id' ? 'Lihat detail' : 'View details'}
                        >
                          📋 {userLanguage === 'id' ? 'Detail' : 'Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Detail Modal */}
      {selectedSource && (
        <div className="modal-overlay" onClick={() => setSelectedSource(null)}>
          <div className="modal-content source-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedSource(null)}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2>📖 {userLanguage === 'id' ? 'Detail Sumber' : 'Source Details'}</h2>
            </div>

            <div className="modal-body source-detail-body">
              <div className="source-detail-grid">
                <div className="detail-field">
                  <label>{userLanguage === 'id' ? 'Judul' : 'Title'}</label>
                  <p className="detail-value">{selectedSource.title}</p>
                </div>

                <div className="detail-field">
                  <label>{userLanguage === 'id' ? 'Sumber' : 'Source'}</label>
                  <p className="detail-value">{selectedSource.source}</p>
                </div>

                <div className="detail-field">
                  <label>{userLanguage === 'id' ? 'Tipe' : 'Type'}</label>
                  <p className="detail-value">{selectedSource.type}</p>
                </div>

                {selectedSource.timestamp && (
                  <div className="detail-field">
                    <label>{userLanguage === 'id' ? 'Waktu' : 'Time'}</label>
                    <p className="detail-value">
                      {new Date(selectedSource.timestamp).toLocaleString(userLanguage === 'id' ? 'id-ID' : 'en-US')}
                    </p>
                  </div>
                )}

                {selectedSource.query && (
                  <div className="detail-field">
                    <label>{userLanguage === 'id' ? 'Query' : 'Query'}</label>
                    <p className="detail-value">{selectedSource.query}</p>
                  </div>
                )}
              </div>

              {selectedSource.description && (
                <div className="detail-section">
                  <h4>{userLanguage === 'id' ? 'Deskripsi' : 'Description'}</h4>
                  <p>{selectedSource.description}</p>
                </div>
              )}

              {selectedSource.url && (
                <div className="detail-actions">
                  <button
                    className="source-url-btn"
                    onClick={() => handleOpenSource(selectedSource.url)}
                  >
                    🔗 {selectedSource.url}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Token Usage Display */}
      {showTokenUsage && (
        <div
          className={`top-right-token-display ${isTokenUsageLimited() ? 'limit-reached' : ''}`}
          onClick={() => {
            showAlert(
              userLanguage === 'id'
                ? `⚡ Token terpakai: ${tokenUsage.usedTokens.toLocaleString('id-ID')} / ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}. (Gambar = 30.000 token).${tokenUsage.resetTime ? ` Reset dalam: ${countdownText}` : ''}`
                : `⚡ Token usage: ${tokenUsage.usedTokens.toLocaleString('en-US')} / ${MAX_TOKEN_LIMIT.toLocaleString('en-US')}. (Image = 30,000 tokens).${tokenUsage.resetTime ? ` Reset in: ${countdownText}` : ''}`,
              tokenUsage.resetTime ? 'warning' : 'info',
              4000
            );
          }}
          title={
            userLanguage === 'id'
              ? `Penggunaan Token: ${tokenUsage.usedTokens.toLocaleString('id-ID')} / ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}`
              : `Token Usage: ${tokenUsage.usedTokens.toLocaleString('en-US')} / ${MAX_TOKEN_LIMIT.toLocaleString('en-US')}`
          }
        >
          <span className="token-icon">{tokenUsage.resetTime ? '⏳' : '⚡'}</span>
          <span className="token-text">
            {tokenUsage.resetTime
              ? `Reset ${countdownText}`
              : `${tokenUsage.usedTokens.toLocaleString('id-ID')} / ${MAX_TOKEN_LIMIT.toLocaleString('id-ID')}`}
          </span>
        </div>
      )}

      {/* Floating menu for + button */}
      {showFloatingMenu && (
        <div className="floating-menu">
          <button
            className="floating-menu-item"
            onClick={() => {
              createNewConversation();
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Chat baru' : 'New chat'}
          >
            <i className="fas fa-comment-alt" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Chat Baru' : 'New Chat'}
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowPersonalityModal(true);
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Ubah kepribadian' : 'Change personality'}
          >
            <i className="fas fa-theater-masks" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Kepribadian' : 'Personality'}
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowApiDashboard(true);
              setShowFloatingMenu(false);
            }}
            title="AI & API Platforms"
          >
            <i className="fas fa-plug" style={{ marginRight: '8px' }}></i>AI & API Platforms
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowPrivateModal(true);
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Mulai obrolan pribadi' : 'Start private chat'}
          >
            <i className="fas fa-lock" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Private Chat' : 'Private Chat'}
          </button>
          <button
            className="floating-menu-item"
            onClick={() => {
              setShowSettingsModal(true);
              setShowFloatingMenu(false);
            }}
            title={userLanguage === 'id' ? 'Pengaturan' : 'Settings'}
          >
            <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>{userLanguage === 'id' ? 'Pengaturan' : 'Settings'}
          </button>
          {currentSources && currentSources.length > 0 && (
            <button
              className="floating-menu-item sources-menu-item"
              onClick={() => {
                handleShowSources();
                setShowFloatingMenu(false);
              }}
              title={userLanguage === 'id' ? 'Lihat sumber data' : 'View data sources'}
            >
              📚 {userLanguage === 'id' ? 'Sumber Data' : 'Sources'} ({currentSources.length})
            </button>
          )}
        </div>
      )}
    </>
  );
});

export const ChatSecondaryModals = React.memo(function ChatSecondaryModals({ ctx }) {
  const {
    showTextPopup,
    selectedTextItem,
    setShowTextPopup,
    setSelectedTextItem,
    setEditingTextContent,
    userLanguage,
    editingTextContent,
    handleSaveTextEdit,
    showVoiceDevModal,
    setShowVoiceDevModal,
    showVoiceChat,
    setShowVoiceChat,
    isAuthenticated,
    isGuest,
    showSavedImagesGallery,
    setShowSavedImagesGallery,
    user,
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
    showAlert,
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
  } = ctx;

  return (
    <>
      {/* Text Paste Popup Modal */}
      {showTextPopup && selectedTextItem && (
        <div
          className="text-popup-overlay"
          onClick={() => {
            setShowTextPopup(false);
            setSelectedTextItem(null);
            setEditingTextContent('');
          }}
        >
          <div className="text-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="text-popup-header">
              <h3>
                {userLanguage === 'id' ? '📋 Salinan Teks' : '📋 Text Copy'}
              </h3>
              <button
                type="button"
                className="popup-close-btn"
                onClick={() => {
                  setShowTextPopup(false);
                  setSelectedTextItem(null);
                  setEditingTextContent('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="text-popup-body">
              <textarea
                value={editingTextContent}
                onChange={(e) => setEditingTextContent(e.target.value)}
                className="text-popup-textarea"
                placeholder={userLanguage === 'id' ? 'Edit teks di sini...' : 'Edit text here...'}
              />
            </div>

            <div className="text-popup-footer">
              <button
                type="button"
                className="popup-action-btn save-btn"
                onClick={handleSaveTextEdit}
              >
                {userLanguage === 'id' ? '✓ Simpan & Kirim' : '✓ Save & Send'}
              </button>
              <button
                type="button"
                className="popup-action-btn cancel-btn"
                onClick={() => {
                  setShowTextPopup(false);
                  setSelectedTextItem(null);
                  setEditingTextContent('');
                }}
              >
                {userLanguage === 'id' ? '✕ Tutup' : '✕ Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Voice Feature In Development Pop-up Modal */}
      {showVoiceDevModal && (
        <div className="modern-feature-modal-overlay" onClick={() => setShowVoiceDevModal(false)}>
          <div className="modern-feature-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="feature-modal-close-btn"
              onClick={() => setShowVoiceDevModal(false)}
              aria-label="Tutup"
            >
              ✕
            </button>

            <div className="feature-modal-icon-badge voice-pulse">
              <span className="feature-modal-icon">🎙️</span>
            </div>

            <div className="feature-modal-tag">
              {userLanguage === 'id' ? 'Sedang Dikembangkan' : 'Under Development'}
            </div>

            <h3 className="feature-modal-title">
              {userLanguage === 'id' ? 'Fitur Obrolan Suara' : 'Voice Chat Feature'}
            </h3>

            <p className="feature-modal-desc">
              {userLanguage === 'id'
                ? 'Maaf, fitur obrolan suara saat ini belum tersedia dan sedang dalam tahap pengembangan. Silakan coba kembali di lain waktu.'
                : 'Sorry, the real-time voice chat feature is currently in development and not yet available. Please try again later.'}
            </p>

            <div className="feature-modal-actions">
              <button
                type="button"
                className="feature-modal-confirm-btn"
                onClick={() => setShowVoiceDevModal(false)}
              >
                {userLanguage === 'id' ? 'Mengerti' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVoiceChat && (
        <VoiceChat
          onClose={() => setShowVoiceChat(false)}
          userLanguage={userLanguage}
          isAuthenticated={isAuthenticated}
          isGuest={isGuest}
        />
      )}

      {/* Saved Images Gallery */}
      <SavedImagesGallery
        isOpen={showSavedImagesGallery}
        onClose={() => setShowSavedImagesGallery(false)}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmConvId(null); }}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-header">
              <h3>⚠️ Hapus Sesi?</h3>
              <p>Apakah Anda yakin ingin menghapus sesi ini? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="delete-confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmConvId(null); }}
              >
                Batal
              </button>
              <button
                className="btn-delete"
                onClick={() => confirmDeleteConversation(deleteConfirmConvId)}
              >
                Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonationModal && (
        <div className="modal-overlay" onClick={() => setShowDonationModal(false)}>
          <div className="modal-content donation-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowDonationModal(false)}
            >
              ✕
            </button>
            <div className="donation-modal-header">
              <h2>💝 Dukung Deepernova AI</h2>
            </div>
            <div className="donation-modal-body">
              <div className="donation-content">
                <div className="donation-qrcode">
                  <div className="qrcode-container">
                    <img
                      src="/qr code qris.jpeg"
                      alt="QRIS Donation QR Code"
                      className="qrcode-image"
                    />
                    <p className="qrcode-label">
                      Scan QRIS ini. Nominal berapa pun berarti.
                    </p>
                  </div>
                </div>

                <div className="donation-message">
                  <p className="donation-text-main">
                    🇮🇩 AI Berkualitas Seharusnya Bukan Hak Orang Kaya
                  </p>
                  <p className="donation-text-secondary">
                    Hari ini, akses ke AI terbaik butuh biaya ratusan ribu hingga jutaan rupiah per tahun. Artinya jutaan pelajar Indonesia — yang justru paling butuh — tidak bisa menjangkaunya.
                  </p>
                  <p className="donation-text-secondary">
                    Anak yang tidak punya akses AI hari ini, akan tertinggal dari teman-temannya yang punya. Di sekolah. Di dunia kerja. Di masa depan.
                  </p>
                  <div className="donation-impact">
                    <h3>🚀 Deepernova Hadir untuk Menutup Kesenjangan Itu</h3>
                    <ul className="donation-points">
                      <li>✓ AI buatan anak bangsa. Gratis. Untuk siapa saja. Tanpa syarat.</li>
                      <li>✓ Kami tidak minta banyak — hanya kepercayaan Anda bahwa setiap anak Indonesia berhak punya kesempatan yang sama.</li>
                      <li>✓ Karena masa depan Indonesia tidak seharusnya ditentukan oleh siapa yang mampu membayar.</li>
                    </ul>
                  </div>
                  <p className="donation-text-secondary quote-text">
                    {userLanguage === 'id'
                      ? '"Kami tidak meminta banyak. Kami hanya minta Anda percaya bahwa anak Indonesia layak punya akses ke teknologi terbaik dunia — dan ikut mewujudkannya."'
                      : '"We do not ask for much. We only ask you to believe that Indonesian children deserve access to the world’s best technology — and help make it happen."'}
                  </p>
                  <p className="testimonial-author">
                    — Ferry & Tim Deepernova
                  </p>
                </div>
              </div>

              <div className="donation-testimonial">
                <p className="testimonial-text">
                  "Setiap rupiah yang Anda donasikan adalah investasi untuk generasi AI pioneers Indonesia yang kompeten dan bermoral."
                </p>
                <p className="testimonial-author">
                  — Ferry & Tim Deepernova
                </p>
              </div>
            </div>
            <div className="donation-modal-footer">
              <button
                className="modal-btn-cancel"
                onClick={() => setShowDonationModal(false)}
              >
                Tutup
              </button>
              <button
                className="modal-btn-primary donation-thanks-btn"
                onClick={() => setShowDonationModal(false)}
              >
                ❤️ Terima Kasih!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Modal */}
      {activeSearchSources && (
        <div className="modal-overlay search-modal-overlay" onClick={() => setActiveSearchSources(null)}>
          <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close search-modal-close"
              onClick={() => setActiveSearchSources(null)}
              title={userLanguage === 'id' ? 'Tutup' : 'Close'}
            >
              ✕
            </button>

            <div className="search-modal-header">
              <h2><i className="fa-solid fa-square-rss" style={{ marginRight: '8px', color: '#1e3a8a' }}></i> {userLanguage === 'id' ? 'Hasil Pencarian Lengkap' : 'Full Search Results'}</h2>
              <p className="search-modal-query">{userLanguage === 'id' ? 'Kueri:' : 'Query:'} <strong>"{activeSearchSources.query}"</strong></p>
            </div>

            <div className="search-modal-body">
              <div className="search-results-list">
                {activeSearchSources.sources.map((item, idx) => (
                  <div key={idx} className="search-result-item">
                    <div className="search-result-title-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>
                        #{item.position || (idx + 1)}
                      </span>
                      {item.accuracyScore && (
                        <span style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
                          {Math.round(item.accuracyScore)}% Akurasi
                        </span>
                      )}
                      {item.pagerank && (
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#047857', fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
                          PR {item.pagerank}
                        </span>
                      )}
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${item.domain}`}
                        onError={(e) => { e.target.src = 'https://img.icons8.com/ios-glyphs/30/1e3a8a/globe.png'; }}
                        className="search-result-favicon"
                        alt=""
                      />
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="search-result-link-title" style={{ fontWeight: '600', color: '#1d4ed8' }}>
                        {item.title}
                      </a>
                    </div>
                    <span className="search-result-url">{item.link}</span>
                    <p className="search-result-snippet">{item.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Enlargement Modal */}
      {showImageModal && enlargedImage && (
        <div className="image-lightbox-overlay" onClick={closeImageModal}>
          <button
            className="lightbox-close-btn"
            onClick={closeImageModal}
            title={userLanguage === 'id' ? 'Tutup' : 'Close'}
          >
            ✕
          </button>

          <div className="lightbox-image-container" onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage.url}
              alt={enlargedImage.alt}
              className="lightbox-image"
              onError={(e) => {
                console.error('[ChatBot] ❌ Enlarged image load error:', enlargedImage.url);
                e.target.parentElement.innerHTML = `<div style="padding: 40px; text-align: center; color: #f87171; font-weight: 600; font-size: 16px;">⚠️ ${userLanguage === 'id' ? 'Gagal memuat gambar' : 'Failed to load image'}</div>`;
              }}
            />
            {enlargedImage.alt && enlargedImage.alt !== 'Generated Image' && enlargedImage.alt.trim().length > 0 && (
              <div className="lightbox-caption">
                {enlargedImage.alt}
              </div>
            )}
          </div>

          <div className="lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-action-btn download-btn"
              onClick={handleDownloadImage}
            >
              ⬇️ {userLanguage === 'id' ? 'Unduh Gambar' : 'Download Image'}
            </button>
          </div>
        </div>
      )}

      {/* Agent Live Workspace Panel */}
      {aiMode === 'agent' && (
        <div className="agent-workspace-panel">
          <div className="workspace-header">
            <h3>
              <i className="fas fa-microchip" style={{ marginRight: 8, color: '#ea580c' }}></i>
              {userLanguage === 'id' ? 'Agent Live Workspace' : 'Agent Live Workspace'}
            </h3>
            <button
              type="button"
              className="close-workspace-btn"
              onClick={() => {
                setAiMode('brainstorm');
                showAlert(userLanguage === 'id' ? 'Mode Brainstorm aktif' : 'Brainstorm Mode active', 'info');
              }}
              title={userLanguage === 'id' ? 'Tutup Workspace' : 'Close Workspace'}
            >
              ✕
            </button>
          </div>

          {activeFile ? (
            <div className="workspace-active-file-card">
              <div className="active-file-header">
                <div className="file-info">
                  <span className="file-icon">
                    {activeFile.type === 'excel' ? '📊' : activeFile.type === 'pptx' ? '🎦' : '📄'}
                  </span>
                  <div>
                    <h4>{activeFile.name}</h4>
                    <p className="file-type-tag">{activeFile.type.toUpperCase()}</p>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    type="button"
                    className="workspace-btn primary"
                    onClick={() => onNavigate?.('documents', activeFile.type)}
                    title={userLanguage === 'id' ? 'Buka di Editor Penuh' : 'Open in Full Editor'}
                  >
                    <i className="fas fa-external-link-alt"></i>
                  </button>
                  <button
                    type="button"
                    className="workspace-btn danger"
                    onClick={async () => {
                      if (window.confirm(userLanguage === 'id' ? `Hapus berkas "${activeFile.name}"?` : `Delete file "${activeFile.name}"?`)) {
                        try {
                          await fetch(`/api/cloud/files/${activeFile.id}`, { method: 'DELETE', credentials: 'include' });
                          setActiveFile(null);
                          fetchWorkspaceFiles();
                          showAlert(userLanguage === 'id' ? 'Berkas dihapus' : 'File deleted', 'info');
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    title={userLanguage === 'id' ? 'Hapus Berkas' : 'Delete File'}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="active-file-preview-body">
                {activeFile.type === 'docx' && (
                  <div
                    className="docx-preview-content"
                    dangerouslySetInnerHTML={{ __html: activeFile.content?.[0]?.text || '<p>Dokumen Kosong</p>' }}
                  />
                )}

                {activeFile.type === 'pptx' && (
                  <div className="pptx-preview-content">
                    {Array.isArray(activeFile.content) && activeFile.content.map((slide, index) => (
                      <div key={slide.id || index} className="ppt-slide-preview">
                        <div className="slide-num">Slide {index + 1}</div>
                        <h5>{slide.title || 'Tanpa Judul'}</h5>
                        <p>{slide.content || 'Kosong'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeFile.type === 'excel' && (
                  <div className="excel-preview-content">
                    {(() => {
                      const sheets = activeFile.content?.excelSheets || [];
                      const activeSheetIdx = activeFile.content?.activeSheet || 0;
                      const currentSheet = sheets[activeSheetIdx];
                      if (!currentSheet || !Array.isArray(currentSheet.data)) return <p>Sheet Kosong</p>;
                      return (
                        <div className="excel-preview-table-wrapper">
                          <div className="excel-sheets-tabs">
                            {sheets.map((sheet, sIdx) => (
                              <span key={sIdx} className={`sheet-tab ${sIdx === activeSheetIdx ? 'active' : ''}`}>
                                {sheet.name}
                              </span>
                            ))}
                          </div>
                          <table className="excel-preview-table">
                            <tbody>
                              {currentSheet.data.slice(0, 10).map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {Array.isArray(row) && row.slice(0, 6).map((cell, cIdx) => (
                                    <td key={cIdx}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {currentSheet.data.length > 10 && (
                            <div className="preview-more-rows">... dan {currentSheet.data.length - 10} baris lagi</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="workspace-no-active-file">
              <i className="fas fa-file-signature" style={{ fontSize: 32, color: '#94a3b8', marginBottom: 12 }}></i>
              <p>{userLanguage === 'id' ? 'Belum ada berkas aktif.' : 'No active file.'}</p>
              <span className="help-text">
                {userLanguage === 'id'
                  ? 'Gunakan perintah `/buatfile [nama]` atau pilih salah satu berkas di bawah untuk mulai menyunting secara otomatis.'
                  : 'Use `/buatfile [name]` or select a file below to start editing.'}
              </span>
            </div>
          )}

          {isAgentExecuting && (
            <div className="agent-execution-logs-card">
              <div className="card-header-logs">
                <span className="spinner-dots">⚙️</span>
                <h5>Agent Executing Task...</h5>
              </div>
              <div className="logs-body">
                {agentLogs.map((log, index) => (
                  <div key={index} className="log-line">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="workspace-file-manager">
            <h4>
              <i className="fas fa-folder-open" style={{ marginRight: 6, color: '#ea580c' }}></i>
              {userLanguage === 'id' ? 'Berkas Workspace' : 'Workspace Files'}
            </h4>

            <div className="workspace-search-box">
              <input
                type="text"
                placeholder={userLanguage === 'id' ? 'Cari file...' : 'Search files...'}
                value={workspaceSearch}
                onChange={(e) => setWorkspaceSearch(e.target.value)}
              />
            </div>

            <div className="workspace-file-list">
              {workspaceFiles
                .filter(f => f.name.toLowerCase().includes(workspaceSearch.toLowerCase()))
                .map(file => (
                  <div
                    key={file.id}
                    className={`workspace-file-item ${activeFile && activeFile.id === file.id ? 'active' : ''}`}
                    onClick={() => selectActiveFile(file)}
                  >
                    <span className="file-icon">
                      {file.type === 'excel' ? '📊' : file.type === 'pptx' ? '🎦' : '📄'}
                    </span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-time">{new Date(file.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              {workspaceFiles.length === 0 && (
                <div className="empty-files-text">
                  {userLanguage === 'id' ? 'Belum ada berkas.' : 'No files found.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Memory Settings Modal */}
      <GlobalMemorySettings
        isOpen={showGlobalMemorySettings}
        onClose={() => setShowGlobalMemorySettings(false)}
        isAuthenticated={isAuthenticated}
        isGuest={isGuest}
      />

      {/* Connection Error Modal */}
      {showConnectionErrorModal && (
        <div className="connection-error-modal-overlay" onClick={() => setShowConnectionErrorModal(false)}>
          <div className="connection-error-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowConnectionErrorModal(false)}>✕</button>
            <div className="modal-icon-badge">📡</div>
            <h3 className="modal-error-title">{userLanguage === 'id' ? 'Koneksi Terputus' : 'Connection Interrupted'}</h3>
            <p className="modal-error-description">{connectionErrorMessage}</p>
            <div className="modal-action-row">
              <button className="modal-dismiss-btn" onClick={() => setShowConnectionErrorModal(false)}>
                {userLanguage === 'id' ? 'Tutup' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Reasoning & Intent Flag Pop-up Modal */}
      {isReasoningImage && (
        <div className="image-reasoning-overlay">
          <div className="image-reasoning-card">
            <div className="image-reasoning-glow"></div>

            <div className="image-reasoning-header">
              <div className="reasoning-brain-icon">🧠</div>
              <div className="reasoning-header-text">
                <h3>Visual Reasoning & Flag Engine</h3>
                <p>{userLanguage === 'id' ? 'Menganalisis payload gambar & menentukan intent AI...' : 'Analyzing image payload & determining AI intent...'}</p>
              </div>
            </div>

            <div className="image-reasoning-preview">
              {reasoningImages && reasoningImages.length > 0 && reasoningImages.map((img, idx) => (
                <div key={idx} className="reasoning-thumb-wrapper">
                  <img src={img.dataUrl || img.url || img.base64} alt="Payload preview" className="reasoning-thumb" />
                  <span className="reasoning-thumb-badge">HOLD</span>
                </div>
              ))}
            </div>

            {reasoningPrompt && (
              <div className="reasoning-prompt-box">
                <span className="reasoning-prompt-label">Prompt:</span> "{reasoningPrompt}"
              </div>
            )}

            <div className="reasoning-steps-container">
              <div className={`reasoning-step-item ${reasoningStep >= 1 ? 'active' : ''}`}>
                <span className="step-icon">{reasoningStep >= 1 ? '✅' : '🔍'}</span>
                <span>{userLanguage === 'id' ? 'Inspeksi Visual Payload & Data Frame' : 'Visual Payload Inspection'}</span>
              </div>
              <div className={`reasoning-step-item ${reasoningStep >= 2 ? 'active' : ''}`}>
                <span className="step-icon">{reasoningStep >= 2 ? '✅' : '🤖'}</span>
                <span>{userLanguage === 'id' ? 'Klasifikasi Intent (Edit ✏️ | Baca 👁️ | Referensi 🎨)' : 'Intent Classification (Edit ✏️ | Vision 👁️ | Ref 🎨)'}</span>
              </div>
              <div className={`reasoning-step-item ${reasoningStep >= 3 ? 'active' : ''}`}>
                <span className="step-icon">{reasoningStep >= 3 ? '⚡' : '⏳'}</span>
                <span>{userLanguage === 'id' ? 'Penetapan Flag & Eksekusi AI' : 'Flag Assignment & AI Execution'}</span>
              </div>
            </div>

            {reasoningDecision && (
              <div className="reasoning-decision-badge animate-pop">
                <span className="decision-title">{userLanguage === 'id' ? 'FLAG DITETAPKAN' : 'FLAG SET'}</span>
                <div className="decision-value">{reasoningDecision}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom In-App Camera Viewfinder Modal */}
      {showCameraModal && (
        <div className="custom-camera-overlay" onClick={handleCloseCamera}>
          <div className="custom-camera-container" onClick={(e) => e.stopPropagation()}>
            <div className="custom-camera-header">
              <div className="camera-header-left">
                <div className="camera-brand-badge">
                  <i className="fas fa-camera" style={{ color: '#ea580c', fontSize: '13px' }}></i>
                  <span>{userLanguage === 'id' ? 'Kamera Deepernova AI' : 'Deepernova AI Camera'}</span>
                </div>
              </div>

              <div className="camera-header-actions">
                {!capturedPhoto && (
                  <button
                    type="button"
                    className="camera-tool-btn flip-btn"
                    onClick={handleFlipCamera}
                    title={userLanguage === 'id' ? 'Putar Kamera' : 'Flip Camera'}
                  >
                    <i className="fas fa-sync-alt"></i>
                  </button>
                )}
                <button
                  type="button"
                  className="camera-tool-btn close-btn"
                  onClick={handleCloseCamera}
                  title={userLanguage === 'id' ? 'Tutup' : 'Close'}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={`custom-camera-viewport ${isCameraFlashing ? 'flashing' : ''}`}>
              {isCameraFlashing && <div className="camera-flash-overlay"></div>}

              {cameraLoading && (
                <div className="camera-loading-overlay">
                  <div className="camera-spinner"></div>
                  <span>{userLanguage === 'id' ? 'Menyiapkan sensor kamera...' : 'Initializing camera sensor...'}</span>
                </div>
              )}

              {cameraError ? (
                <div className="camera-error-overlay">
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '36px', color: '#ef4444', marginBottom: '12px' }}></i>
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    className="camera-action-btn retry-btn"
                    onClick={() => startCameraStream(cameraFacingMode)}
                  >
                    {userLanguage === 'id' ? 'Coba Lagi' : 'Try Again'}
                  </button>
                </div>
              ) : capturedPhoto ? (
                <div className="camera-preview-wrapper">
                  <img src={capturedPhoto} alt="Captured preview" className="camera-captured-img" />
                  <div className="camera-preview-badge">
                    <span>✨ {userLanguage === 'id' ? 'Hasil Foto' : 'Photo Captured'}</span>
                  </div>
                  {isCameraEnhancingHD && (
                    <div className="camera-hd-processing-overlay">
                      <div className="camera-spinner"></div>
                      <div className="hd-processing-text">
                        <span>✨ Mengubah ke Ultra HD via Deepernova AI...</span>
                        <small>Mempertahankan detail & meningkatkan ketajaman</small>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="camera-video-wrapper">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`camera-video-feed ${cameraFacingMode === 'user' ? 'mirror' : ''}`}
                  />

                  <div className="camera-grid-lines">
                    <div className="grid-line horizontal h1"></div>
                    <div className="grid-line horizontal h2"></div>
                    <div className="grid-line vertical v1"></div>
                    <div className="grid-line vertical v2"></div>
                  </div>

                  <div className="camera-reticle">
                    <div className="reticle-corner top-left"></div>
                    <div className="reticle-corner top-right"></div>
                    <div className="reticle-corner bottom-left"></div>
                    <div className="reticle-corner bottom-right"></div>
                    <div className="reticle-center-crosshair"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="custom-camera-controls">
              {capturedPhoto ? (
                <div className="camera-preview-controls-row">
                  <button
                    type="button"
                    className="camera-action-btn retake-btn"
                    onClick={handleRetakePhoto}
                    disabled={isCameraEnhancingHD}
                  >
                    <i className="fas fa-redo"></i>
                    <span>{userLanguage === 'id' ? 'Foto Ulang' : 'Retake'}</span>
                  </button>

                  <button
                    type="button"
                    className={`camera-action-btn hd-enhance-btn ${isCameraEnhancingHD ? 'loading' : ''}`}
                    onClick={handleEnhanceCapturedPhotoHD}
                    disabled={isCameraEnhancingHD}
                    title={userLanguage === 'id' ? 'Tingkatkan kualitas foto menjadi Ultra HD via Deepernova AI' : 'Enhance to Ultra HD via Deepernova AI'}
                  >
                    {isCameraEnhancingHD ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>HD...</span>
                      </>
                    ) : (
                      <>
                        <span className="hd-badge-glow">HD</span>
                        <span>{userLanguage === 'id' ? 'Buat HD' : 'Make HD'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="camera-action-btn use-btn"
                    onClick={handleUsePhoto}
                    disabled={isCameraEnhancingHD}
                  >
                    <i className="fas fa-check"></i>
                    <span>{userLanguage === 'id' ? 'Gunakan Foto' : 'Use Photo'}</span>
                  </button>
                </div>
              ) : (
                <div className="camera-live-controls-bar">
                  <button
                    type="button"
                    className="camera-bottom-tool-btn gallery-btn"
                    onClick={() => {
                      window.imageUploadInput?.click();
                      handleCloseCamera();
                    }}
                    title={userLanguage === 'id' ? 'Pilih dari Galeri' : 'Choose from Gallery'}
                  >
                    <i className="fas fa-images"></i>
                    <span>{userLanguage === 'id' ? 'Galeri' : 'Gallery'}</span>
                  </button>

                  <button
                    type="button"
                    className="camera-shutter-btn"
                    onClick={handleCapturePhoto}
                    disabled={cameraLoading || !!cameraError}
                    title={userLanguage === 'id' ? 'Ambil Foto' : 'Capture Photo'}
                  >
                    <div className="shutter-outer-ring">
                      <div className="shutter-inner-ring"></div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="camera-bottom-tool-btn flip-bottom-btn"
                    onClick={handleFlipCamera}
                    title={userLanguage === 'id' ? 'Putar Kamera' : 'Flip Camera'}
                  >
                    <i className="fas fa-sync-alt"></i>
                    <span>{userLanguage === 'id' ? 'Putar' : 'Flip'}</span>
                  </button>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}
    </>
  );
});

export const ChatAgenticRightPanel = React.memo(function ChatAgenticRightPanel({
  showAgenticPanel,
  setShowAgenticPanel,
  agenticActiveTab,
  setAgenticActiveTab,
  agenticSteps,
  activeSources,
}) {
  if (!showAgenticPanel) return null;

  return (
    <div className="agentic-right-panel">
      <div className="agentic-panel-header">
        <div className="agentic-tabs-container">
          <button
            type="button"
            className={`agentic-tab-btn ${agenticActiveTab === 'langkah' ? 'active' : ''}`}
            onClick={() => setAgenticActiveTab('langkah')}
          >
            <span>Langkah</span>
            {agenticSteps.length > 0 && (
              <span className="agentic-tab-badge">{agenticSteps.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`agentic-tab-btn ${agenticActiveTab === 'sumber' ? 'active' : ''}`}
            onClick={() => setAgenticActiveTab('sumber')}
          >
            <span>Sumber</span>
            {activeSources.length > 0 && (
              <span className="agentic-tab-badge">{activeSources.length}</span>
            )}
          </button>
        </div>

        <button
          type="button"
          className="agentic-panel-close-btn"
          onClick={() => setShowAgenticPanel(false)}
          title="Tutup panel"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="agentic-panel-body">
        {agenticActiveTab === 'langkah' ? (
          <div className="agentic-steps-pane">
            {agenticSteps.length === 0 ? (
              <div className="agentic-empty-state">
                <div className="empty-icon-circle">
                  <i className="fa-solid fa-list-check" style={{ color: '#ea580c' }}></i>
                </div>
                <h4>Belum Ada Langkah Aktif</h4>
                <p>Langkah pemrosesan AI, penulisan kode, dan pembuatan artefak akan tampil di sini saat tugas dijalankan.</p>
              </div>
            ) : (
              <div className="agentic-stepper-timeline">
                {agenticSteps.map((step, idx) => (
                  <div key={idx} className={`stepper-node ${step.status}`}>
                    <div className="stepper-marker-column">
                      <div className={`stepper-dot ${step.status}`}>
                        {step.status === 'completed' ? (
                          <i className="fa-solid fa-check"></i>
                        ) : step.status === 'in-progress' ? (
                          <div className="stepper-spinner"></div>
                        ) : (
                          <span className="stepper-dot-inner"></span>
                        )}
                      </div>
                      {idx < agenticSteps.length - 1 && <div className="stepper-track-line"></div>}
                    </div>

                    <div className="stepper-content-column">
                      <div className="stepper-step-title">{step.title}</div>
                      {step.desc && <div className="stepper-step-desc">{step.desc}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="agentic-sources-pane">
            {activeSources.length === 0 ? (
              <div className="agentic-empty-state">
                <div className="empty-icon-circle">
                  <i className="fa-solid fa-globe" style={{ color: '#ea580c' }}></i>
                </div>
                <h4>Tidak Ada Sumber Web</h4>
                <p>Sumber referensi dari pencarian internet akan terdaftar di sini.</p>
              </div>
            ) : (
              <div className="agentic-sources-list">
                {activeSources.map((source, idx) => {
                  let domain = 'web';
                  try {
                    domain = new URL(source.url || 'https://google.com').hostname.replace(/^www\./, '');
                  } catch (e) {
                    domain = source.source || 'web';
                  }
                  return (
                    <a
                      key={source.id || idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="agentic-source-card-item"
                    >
                      <div className="source-card-header">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                          alt=""
                          className="source-card-favicon"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="source-card-domain">{domain}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square source-card-external"></i>
                      </div>
                      <div className="source-card-headline">{source.title || source.source || 'Sumber Terpercaya'}</div>
                      {source.snippet && <div className="source-card-snippet">{source.snippet}</div>}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

