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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

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
      <div className="reminder-card-container" style={{ opacity: 0.5, padding: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>🗑️ Pengingat telah dihapus</span>
      </div>
    );
  }

  const getTypeLabel = () => {
    if (reminder.type === 'alarm') return { text: '⏰ ALARM BROWSER', class: 'alarm' };
    if (reminder.type === 'calendar') return { text: '📅 JADWAL KALENDER HP', class: 'calendar' };
    return { text: '🔔 PENGINGAT CHATBOT', class: 'reminder' };
  };

  const typeInfo = getTypeLabel();

  return (
    <div className="reminder-card-container">
      <div className="reminder-card-header">
        <span className={`reminder-type-badge ${typeInfo.class}`}>{typeInfo.text}</span>
        <span className={`reminder-status-tag ${currentStatus}`}>{currentStatus === 'completed' ? '✓ Selesai' : '⏳ Aktif'}</span>
      </div>

      <div className="reminder-card-body">
        <h4 className="reminder-title">{reminder.title}</h4>
        <div className="reminder-time-box">
          <span className="reminder-time-icon">🗓️</span>
          <div>
            <div>{formattedDate}</div>
            <div style={{ fontWeight: 'bold', color: '#ff9e00' }}>Pukul {formattedTime} WIB</div>
          </div>
        </div>
      </div>

      <div className="reminder-actions">
        <button
          className="reminder-action-btn primary-sync"
          onClick={handleOpenGoogleCalendar}
          title="Buka & Tambahkan ke Google / HP Calendar"
        >
          <span>📲 Sync ke Google Calendar / HP</span>
        </button>

        <div className="reminder-btn-row">
          <button className="reminder-action-btn secondary" onClick={handleDownloadICS} title="Unduh File Berkas Kalender (.ics)">
            <span>📁 Unduh Berkas .ICS</span>
          </button>
          <button
            className="reminder-action-btn secondary"
            onClick={handleTestAudio}
            style={{ color: isPlayingAudio ? '#ff9e00' : undefined }}
            title="Uji Suara Alarm"
          >
            <span>{isPlayingAudio ? '🔊 Memutar...' : '🔔 Tes Suara'}</span>
          </button>
        </div>

        <div className="reminder-btn-row">
          <button
            className={`reminder-action-btn ${currentStatus === 'completed' ? 'secondary' : 'secondary'}`}
            onClick={handleToggleStatus}
          >
            <span>{currentStatus === 'completed' ? '↩️ Tandai Belum Selesai' : '✅ Tandai Selesai'}</span>
          </button>
          <button className="reminder-action-btn danger" onClick={handleDelete} style={{ maxWidth: '80px' }}>
            <span>🗑️ Hapus</span>
          </button>
        </div>
      </div>

      <div className="reminder-footer-hint">Sync otomatis dapat dibuka langsung di aplikasi Kalender HP bawaan</div>
    </div>
  );
};

export default ReminderCard;
