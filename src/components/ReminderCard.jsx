import React, { useState } from 'react';
import { reminderService } from '../services/reminderService';
import './ReminderCard.css';

const ReminderCard = ({ reminder, onUpdate }) => {
  const [currentStatus, setCurrentStatus] = useState(reminder?.status || 'active');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!reminder || currentStatus === 'deleted') return null;

  const dateObj = new Date(reminder.datetime);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAlarm = reminder.type === 'alarm';
  const typeIcon = isAlarm ? '⏰' : reminder.type === 'calendar' ? '📅' : '🔔';
  const typeTitle = isAlarm ? 'ALARM AI' : reminder.type === 'calendar' ? 'JADWAL KALENDER' : 'PENGINGAT AI';

  const handleDeleteConfirmed = (e) => {
    e.stopPropagation();
    reminderService.deleteReminder(reminder.id);
    reminderService.stopAlarmChime();
    setCurrentStatus('deleted');
    setShowDeleteModal(false);
    if (onUpdate) onUpdate(reminder.id, 'deleted');
  };

  const handleSnoozeConfirmed = (e) => {
    e.stopPropagation();
    reminderService.snoozeReminder(reminder.id, 10);
    setShowDeleteModal(false);
    if (onUpdate) onUpdate(reminder.id, 'snoozed');
  };

  return (
    <>
      {/* Clickable Reminder Card */}
      <div 
        className={`clean-reminder-card ${isAlarm ? 'is-alarm' : ''} ${currentStatus === 'dismissed' ? 'is-dismissed' : ''}`}
        onClick={() => setShowDeleteModal(true)}
        role="button"
        tabIndex={0}
        title="Klik untuk opsi hapus / kelola agenda"
      >
        <div className="clean-card-header">
          <div className="clean-type-badge">
            <span className="badge-icon">{typeIcon}</span>
            <span className="badge-text">{typeTitle}</span>
          </div>
          <span className="applied-check-badge">
            ✓ Aktif Otomatis di AI
          </span>
        </div>

        <div className="clean-card-body">
          <h4 className="clean-card-title">{reminder.title}</h4>
          <div className="clean-card-datetime">
            <span className="calendar-mini-icon">🗓️</span>
            <span>{formattedDate} • {formattedTime} WIB</span>
          </div>
        </div>
      </div>

      {/* Blurred Backdrop Modal Popup */}
      {showDeleteModal && (
        <div className="reminder-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="reminder-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>✕</button>

            <div className="modal-icon-badge">
              <span style={{ fontSize: '32px' }}>{typeIcon}</span>
            </div>

            <h3 className="modal-reminder-title">{reminder.title}</h3>
            <p className="modal-reminder-datetime">🗓️ {formattedDate} • {formattedTime} WIB</p>
            
            <div className="modal-applied-pill">
              ✓ Pengingat Aktif Otomatis (Terima Jadi)
            </div>

            <div className="modal-action-row">
              <button className="modal-delete-btn" onClick={handleDeleteConfirmed}>
                🗑️ Hapus & Matikan Agenda
              </button>
              <button className="modal-snooze-btn" onClick={handleSnoozeConfirmed}>
                💤 Snooze (10m)
              </button>
              <button className="modal-cancel-btn" onClick={() => setShowDeleteModal(false)}>
                ✕ Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReminderCard;
