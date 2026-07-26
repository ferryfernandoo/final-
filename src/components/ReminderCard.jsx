import React, { useState } from 'react';
import { reminderService } from '../services/reminderService';
import './ReminderCard.css';

const ReminderCard = ({ reminder, onUpdate }) => {
  const [currentStatus, setCurrentStatus] = useState(reminder?.status || 'active');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!reminder) return null;

  const dateObj = new Date(reminder.datetime);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSyncDeviceCalendar = () => {
    reminderService.syncToDeviceCalendar(reminder);
  };

  const handleDownloadICS = () => {
    reminderService.downloadICS(reminder);
  };

  const handleOpenGoogleCalendar = () => {
    const url = reminderService.getGoogleCalendarUrl(reminder);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTestAudio = () => {
    setIsPlayingAudio(true);
    reminderService.playAlarmChime();
    setTimeout(() => setIsPlayingAudio(false), 1200);
  };

  const handleToggleStatus = () => {
    const nextStatus = currentStatus === 'completed' ? 'active' : 'completed';
    setCurrentStatus(nextStatus);
    reminderService.updateStatus(reminder.id, nextStatus);
    if (onUpdate) onUpdate(reminder.id, nextStatus);
  };

  const handleDelete = () => {
    reminderService.deleteReminder(reminder.id);
    setCurrentStatus('deleted');
    if (onUpdate) onUpdate(reminder.id, 'deleted');
  };

  if (currentStatus === 'deleted') {
    return (
      <div className="reminder-card-container" style={{ opacity: 0.6, padding: '10px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: '#ff6b00' }}>🗑️ Pengingat telah dihapus</span>
      </div>
    );
  }

  const getTypeLabel = () => {
    if (reminder.type === 'alarm') return '⏰ ALARM BROWSER';
    if (reminder.type === 'calendar') return '📅 KALENDER HP';
    return '🔔 PENGINGAT';
  };

  return (
    <div className="reminder-card-container">
      <div className="reminder-card-header">
        <span className="reminder-type-badge">{getTypeLabel()}</span>
        <span className={`reminder-status-tag ${currentStatus}`}>{currentStatus === 'completed' ? '✓ Selesai' : '⏳ Aktif'}</span>
      </div>

      <div className="reminder-card-body">
        <h4 className="reminder-title">{reminder.title}</h4>
        <div className="reminder-time-box">
          <span className="reminder-time-icon">🗓️</span>
          <div>
            <div>{formattedDate}</div>
            <div style={{ fontWeight: '800' }}>Pukul {formattedTime} WIB</div>
          </div>
        </div>
      </div>

      <div className="reminder-actions">
        <button
          className="reminder-action-btn primary-sync"
          onClick={handleSyncDeviceCalendar}
          title="Tambah langsung ke Kalender Perangkat HP"
        >
          <span>📱 Tambah ke Kalender HP</span>
        </button>

        <div className="reminder-btn-row">
          <button className="reminder-action-btn secondary" onClick={handleDownloadICS} title="Unduh Berkas .ICS">
            <span>📁 .ICS</span>
          </button>
          <button className="reminder-action-btn secondary" onClick={handleOpenGoogleCalendar} title="Google Web">
            <span>🌐 Web</span>
          </button>
          <button
            className="reminder-action-btn secondary"
            onClick={handleTestAudio}
            style={{ color: isPlayingAudio ? '#d95200' : undefined }}
            title="Tes Suara Alarm"
          >
            <span>{isPlayingAudio ? '🔊' : '🔔 Tes'}</span>
          </button>
        </div>

        <div className="reminder-btn-row">
          <button
            className="reminder-action-btn secondary"
            onClick={handleToggleStatus}
          >
            <span>{currentStatus === 'completed' ? '↩️ Belum Selesai' : '✅ Selesai'}</span>
          </button>
          <button className="reminder-action-btn danger" onClick={handleDelete} style={{ maxWidth: '80px' }}>
            <span>🗑️ Hapus</span>
          </button>
        </div>
      </div>

      <div className="reminder-footer-hint">Langsung tersimpan di aplikasi Kalender bawaan HP</div>
    </div>
  );
};

export default ReminderCard;
