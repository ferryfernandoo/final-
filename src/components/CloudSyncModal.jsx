import React, { useState } from 'react';
import './CloudSyncModal.css';

const CloudSyncModal = ({ onConfirmSync, onSkipSync, conversationCount = 0 }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConfirm = async () => {
    setIsSyncing(true);
    await onConfirmSync?.();
    setIsSyncing(false);
  };

  return (
    <div className="sync-modal-backdrop">
      <div className="sync-modal-content">
        <div className="sync-icon-badge">
          <img src="https://img.icons8.com/fluency/96/cloud-sync.png" alt="Cloud Sync" />
        </div>

        <h3>Sinkronisasi Obrolan Cloud</h3>
        <p>
          Apakah Anda ingin menyinkronkan obrolan lokal Anda ({conversationCount} sesi) ke <strong>Deepernova Cloud</strong> agar obrolan terakhir Anda dapat terlihat di semua perangkat lainnya?
        </p>

        <div className="sync-modal-actions">
          <button className="sync-confirm-btn" onClick={handleConfirm} disabled={isSyncing}>
            {isSyncing ? '☁️ Menyinkronkan...' : '☁️ Ya, Sinkronkan Sekarang'}
          </button>
          <button className="sync-skip-btn" onClick={onSkipSync} disabled={isSyncing}>
            Tidak, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;
