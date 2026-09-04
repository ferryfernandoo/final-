import React, { useState, useEffect } from 'react';
import { reminderService } from '../services/reminderService';
import { nativeBridge } from '../services/nativeBridge';
import ReminderCard from './ReminderCard';
import './AICalendarHub.css';

const AICalendarHub = ({ onNavigate }) => {
  const [reminders, setReminders] = useState(reminderService.getReminders());
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'alarm' | 'calendar' | 'reminder'
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDatetime, setNewDatetime] = useState('');
  const [newType, setNewType] = useState('alarm');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Live WIB Clock Counter
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      setCurrentTimeStr(now.toLocaleTimeString('id-ID', options) + ' WIB');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = reminderService.subscribe((updatedReminders) => {
      setReminders([...updatedReminders]);
    });
    return () => unsubscribe();
  }, []);

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDatetime) return;

    reminderService.addReminder({
      title: newTitle.trim(),
      datetime: new Date(newDatetime).toISOString(),
      type: newType,
      description: 'Dibuat manual dari AI Calendar Command Center'
    });

    setNewTitle('');
    setNewDatetime('');
    setShowAddForm(false);
  };

  const handleSyncAllToNative = async () => {
    const activeItems = reminders.filter((r) => r.status === 'active');
    if (activeItems.length === 0) {
      alert('Tidak ada agenda aktif untuk disinkronkan.');
      return;
    }

    let syncedCount = 0;
    for (const rem of activeItems) {
      if (rem.type === 'alarm') {
        await nativeBridge.createNativeAlarm(rem);
        syncedCount++;
      } else {
        await reminderService.syncToDeviceCalendar(rem);
        syncedCount++;
      }
    }
    alert(`⚡ Berhasil mengirim ${syncedCount} agenda ke aplikasi Kalender & Jam HP Native!`);
  };

  const filteredReminders = reminders.filter((r) => {
    if (r.status === 'deleted') return false;
    if (activeFilter === 'all') return true;
    return r.type === activeFilter;
  });

  const activeAlarmCount = reminders.filter((r) => r.type === 'alarm' && r.status === 'active').length;
  const activeCalendarCount = reminders.filter((r) => r.type === 'calendar' && r.status === 'active').length;
  const activeReminderCount = reminders.filter((r) => r.type === 'reminder' && r.status === 'active').length;

  return (
    <div className="ai-calendar-futuristic-container">
      {/* Background Orbs */}
      <div className="calendar-orb orb-a"></div>
      <div className="calendar-orb orb-b"></div>

      {/* Futuristic Header */}
      <header className="calendar-futuristic-header">
        <div className="header-left-group">
          <button className="futuristic-back-btn" onClick={() => onNavigate?.('universe')} title="Kembali ke Deepernova Universe">
            <span className="back-arrow">‹</span>
            <span className="back-text">Universe</span>
          </button>

          <div className="header-title-box">
            <h1 className="cyber-title">AI Calendar <span className="highlight-text">& Alarm Hub</span></h1>
            <p className="cyber-subtitle">Pusat Komando Jadwal AI & Alarm Native Android</p>
          </div>
        </div>

        {/* Live Clock & Action Panel */}
        <div className="header-right-group">
          <div className="live-clock-badge">
            <span className="clock-icon">🕒</span>
            <span className="clock-time">{currentTimeStr || '19:48:35 WIB'}</span>
          </div>

          <div className="header-action-buttons">
            <button className="cyber-sync-btn" onClick={handleSyncAllToNative}>
              <span className="btn-icon">📱</span> Sync Semua ke HP
            </button>
            <button className="cyber-add-btn" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '✕ Batal' : '➕ Tambah Agenda'}
            </button>
          </div>
        </div>
      </header>

      {/* Manual Add Form Panel */}
      {showAddForm && (
        <form className="cyber-add-form-panel" onSubmit={handleAddManual}>
          <div className="form-panel-header">
            <h3>➕ Manual Command Entry</h3>
            <span className="form-tip">Set alarm atau jadwal baru secara cepat</span>
          </div>
          <div className="cyber-form-grid">
            <input
              type="text"
              className="cyber-input"
              placeholder="Nama agenda / alarm (contoh: Rapat Tim)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
            <input
              type="datetime-local"
              className="cyber-input"
              value={newDatetime}
              onChange={(e) => setNewDatetime(e.target.value)}
              required
            />
            <select className="cyber-select" value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="alarm">⏰ Alarm Jam HP</option>
              <option value="calendar">📅 Kalender HP</option>
              <option value="reminder">🔔 Pengingat AI</option>
            </select>
            <button type="submit" className="cyber-submit-btn">Simpan Command</button>
          </div>
        </form>
      )}

      {/* Dashboard Stats Overview */}
      <div className="calendar-stats-row">
        <div className="stat-card alarm-stat" onClick={() => setActiveFilter('alarm')}>
          <div className="stat-icon-box">⏰</div>
          <div className="stat-data">
            <span className="stat-val">{activeAlarmCount}</span>
            <span className="stat-name">Alarm HP Aktif</span>
          </div>
        </div>

        <div className="stat-card calendar-stat" onClick={() => setActiveFilter('calendar')}>
          <div className="stat-icon-box">📅</div>
          <div className="stat-data">
            <span className="stat-val">{activeCalendarCount}</span>
            <span className="stat-name">Agenda Kalender</span>
          </div>
        </div>

        <div className="stat-card reminder-stat" onClick={() => setActiveFilter('reminder')}>
          <div className="stat-icon-box">🔔</div>
          <div className="stat-data">
            <span className="stat-val">{activeReminderCount}</span>
            <span className="stat-name">Pengingat AI</span>
          </div>
        </div>
      </div>

      {/* Cyber Filter Bar */}
      <div className="cyber-filter-bar">
        <button
          className={`cyber-chip ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          Semua ({reminders.filter((r) => r.status !== 'deleted').length})
        </button>
        <button
          className={`cyber-chip alarm-chip ${activeFilter === 'alarm' ? 'active' : ''}`}
          onClick={() => setActiveFilter('alarm')}
        >
          ⏰ Alarm HP ({reminders.filter((r) => r.type === 'alarm' && r.status !== 'deleted').length})
        </button>
        <button
          className={`cyber-chip calendar-chip ${activeFilter === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveFilter('calendar')}
        >
          📅 Kalender ({reminders.filter((r) => r.type === 'calendar' && r.status !== 'deleted').length})
        </button>
        <button
          className={`cyber-chip reminder-chip ${activeFilter === 'reminder' ? 'active' : ''}`}
          onClick={() => setActiveFilter('reminder')}
        >
          🔔 Pengingat ({reminders.filter((r) => r.type === 'reminder' && r.status !== 'deleted').length})
        </button>
      </div>

      {/* Agenda Card Grid */}
      <div className="cyber-agenda-grid">
        {filteredReminders.length === 0 ? (
          <div className="cyber-empty-state">
            <div className="empty-icon-glow">🗓️</div>
            <h3>Belum Ada Command Agenda</h3>
            <p>Ketik pengingat atau alarm di room chat (contoh: <i>"ingatkan besok jam 8 pagi rapat"</i>) atau klik tombol Tambah Agenda di atas.</p>
          </div>
        ) : (
          filteredReminders.map((rem) => (
            <ReminderCard key={rem.id} reminder={rem} />
          ))
        )}
      </div>
    </div>
  );
};

export default AICalendarHub;
