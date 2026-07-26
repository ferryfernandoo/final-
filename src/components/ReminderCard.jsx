import React, { useState } from 'react';
import { reminderService } from '../services/reminderService';
import './ReminderCard.css';

const ReminderCard = ({ reminder, onUpdate }) => {
  const [currentStatus, setCurrentStatus] = useState(reminder?.status || 'active');

  if (!reminder) return null;

  const dateObj = new Date(reminder.datetime);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSyncDeviceCalendar = () => {
    reminderService.syncToDeviceCalendar(reminder);
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

  if (currentStatus === 'deleted') return null;

  const getTypeIcon = () => {
    if (reminder.type === 'alarm') return '⏰';
    if (reminder.type === 'calendar') return '📅';
    return '🔔';
  };

  return (
    <div className="reminder-card-container">
      <div className="reminder-card-top">
        <span className="reminder-type-icon">{getTypeIcon()}</span>
        <div className="reminder-info">
          <span className="reminder-title">{reminder.title}</span>
          <span className="reminder-datetime">{formattedDate} • {formattedTime} WIB</span>
        </div>
        <button className="reminder-delete-btn" onClick={handleDelete} title="Hapus">✕</button>
      </div>

      <div className="reminder-card-actions">
        <button className="reminder-sync-btn" onClick={handleSyncDeviceCalendar}>
          📅 Tambah ke Kalender
        </button>
        <button className="reminder-done-btn" onClick={handleToggleStatus}>
          {currentStatus === 'completed' ? '↩️ Aktifkan' : '✓ Selesai'}
        </button>
      </div>
    </div>
  );
};

export default ReminderCard;
