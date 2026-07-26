/**
 * Reminder, Alarm, and Phone Calendar Service
 * Handles web alarms, audio chime triggers, ICS calendar file export, Google Calendar URL generation,
 * and NLP reminder intent parsing for the ChatBot.
 */

const STORAGE_KEY = 'deepernova_reminders_v1';

class ReminderService {
  constructor() {
    this.reminders = this.loadReminders();
    this.audioCtx = null;
    this.listeners = new Set();
    this.timerId = null;
    this.initTimer();
  }

  // Load from localStorage
  loadReminders() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading reminders:', e);
      return [];
    }
  }

  // Save to localStorage
  saveReminders() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reminders));
      this.notifyListeners();
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  }

  // Subscribe to changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((cb) => cb(this.reminders));
  }

  // Add a new reminder / alarm / calendar event
  addReminder({ title, datetime, type = 'reminder', description = '', repeat = 'none', location = '' }) {
    const reminderDate = new Date(datetime);
    const newReminder = {
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: title || 'Pengingat Baru',
      datetime: reminderDate.toISOString(),
      type, // 'reminder' | 'alarm' | 'calendar'
      description,
      repeat, // 'none' | 'daily' | 'weekly'
      location,
      status: 'active', // 'active' | 'completed' | 'dismissed'
      createdAt: new Date().toISOString(),
      alarmSoundEnabled: true,
    };

    this.reminders.push(newReminder);
    this.saveReminders();

    // Ask for notification permission if needed
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return newReminder;
  }

  // Delete reminder
  deleteReminder(id) {
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.saveReminders();
  }

  // Update status
  updateStatus(id, status) {
    const rem = this.reminders.find((r) => r.id === id);
    if (rem) {
      rem.status = status;
      this.saveReminders();
    }
  }

  // Get all active reminders
  getReminders() {
    return this.reminders;
  }

  // Web Audio Alarm Synthesizer - plays pleasant chime tone without external audio files
  playAlarmChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Create dual-tone chime (notes: E5 -> G5 -> C6)
      const notes = [659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0, now + idx * 0.18);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.65);
      });
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }

  // Background interval check for active alarms
  initTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      const now = new Date();
      this.reminders.forEach((rem) => {
        if (rem.status === 'active') {
          const remTime = new Date(rem.datetime);
          // Trigger if within 30 seconds of target time
          const diff = remTime.getTime() - now.getTime();
          if (diff <= 0 && diff > -30000) {
            this.triggerAlarm(rem);
          }
        }
      });
    }, 5000);
  }

  // Trigger alarm notification & audio
  triggerAlarm(rem) {
    rem.status = 'triggered';
    this.saveReminders();

    if (rem.alarmSoundEnabled) {
      this.playAlarmChime();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⏰ ${rem.title}`, {
        body: `Waktunya: ${new Date(rem.datetime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
        icon: 'https://img.icons8.com/fluency/96/alarm.png',
        tag: rem.id,
      });
    }
  }

  /**
   * Generates a standard .ics (iCalendar) file for mobile calendars (iOS, Android, Samsung, Outlook)
   */
  generateICSFile(reminder) {
    const startDate = new Date(reminder.datetime);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // Default 30 min duration

    const formatDateStr = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Deepernova AI Chatbot//NANDO//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${reminder.id}@deepernova.ai`,
      `DTSTAMP:${formatDateStr(new Date())}`,
      `DTSTART:${formatDateStr(startDate)}`,
      `DTEND:${formatDateStr(endDate)}`,
      `SUMMARY:${reminder.title}`,
      `DESCRIPTION:${reminder.description || 'Dibuat via Deepernova AI Chatbot'}`,
      reminder.location ? `LOCATION:${reminder.location}` : '',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Pengingat: ${reminder.title}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');

    return icsContent;
  }

  /**
   * Download .ics file directly for HP Calendar import
   */
  downloadICS(reminder) {
    const content = this.generateICSFile(reminder);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${reminder.title.replace(/[^a-z0-9]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Directly launches or exports to native Device Calendar (iPhone, Samsung, Android System Calendar)
   */
  syncToDeviceCalendar(reminder) {
    const icsContent = this.generateICSFile(reminder);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // iOS Safari natively launches Apple Calendar app with data URI or webcal
      const dataUri = 'data:text/calendar;charset=utf8,' + encodeURIComponent(icsContent);
      window.location.href = dataUri;
    } else {
      // Android / Desktop - download and launch .ics file for system calendar handler
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `${reminder.title.replace(/[^a-z0-9]/gi, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Generate Google Calendar Template URL for optional web sync
   */
  getGoogleCalendarUrl(reminder) {
    const startDate = new Date(reminder.datetime);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const formatDateStr = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: reminder.title,
      dates: `${formatDateStr(startDate)}/${formatDateStr(endDate)}`,
      details: reminder.description || 'Dibuat melalui Deepernova AI Chatbot',
      location: reminder.location || '',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Natural Language Intent Parser for Indonesian/English queries
   */
  parseReminderIntent(text) {
    if (!text || typeof text !== 'string') return null;

    const lower = text.toLowerCase();

    // Check keywords for reminder/alarm/calendar creation
    const isAlarm = lower.includes('alarm') || lower.includes('bangungkan') || lower.includes('set alarm');
    const isCalendar = lower.includes('kalender') || lower.includes('jadwal') || lower.includes('agenda') || lower.includes('event');
    const isReminder = lower.includes('ingatkan') || lower.includes('pengingat') || lower.includes('remind') || lower.includes('catat');

    if (!isAlarm && !isCalendar && !isReminder) {
      return null;
    }

    const now = new Date();
    let targetDate = new Date(now);

    // Extract Date Keywords
    if (lower.includes('besok') || lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('lusa')) {
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (lower.includes('minggu depan')) {
      targetDate.setDate(targetDate.getDate() + 7);
    } else {
      // Check for explicit date like "28 juli", "15 agustus", "2026-07-28"
      const dateMatch = lower.match(/(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
        const monthIndex = monthNames.findIndex((m) => dateMatch[2].toLowerCase().startsWith(m));
        if (monthIndex !== -1) {
          targetDate.setMonth(monthIndex);
          targetDate.setDate(day);
          if (targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        }
      }
    }

    // Extract Time (e.g. "jam 8 pagi", "jam 08:30", "jam 19:00", " jam 7 malam", "8 am", "6:30 pm")
    let hours = 9; // Default 9 AM
    let minutes = 0;

    const time24Match = lower.match(/(?:jam|pukul)?\s*(\d{1,2})[:.]([0-5]\d)/);
    const timeWordMatch = lower.match(/(?:jam|pukul)?\s*(\d{1,2})\s*(pagi|siang|sore|malam|am|pm)?/);

    if (time24Match) {
      hours = parseInt(time24Match[1], 10);
      minutes = parseInt(time24Match[2], 10);
    } else if (timeWordMatch) {
      hours = parseInt(timeWordMatch[1], 10);
      const modifier = timeWordMatch[2];
      if (modifier) {
        if ((modifier === 'malam' || modifier === 'sore' || modifier === 'pm') && hours < 12) {
          hours += 12;
        } else if (modifier === 'siang' && hours < 12 && hours > 1) {
          hours += 12;
        } else if ((modifier === 'pagi' || modifier === 'am') && hours === 12) {
          hours = 0;
        }
      }
    }

    targetDate.setHours(hours, minutes, 0, 0);

    // If target date is in past today (e.g. user asks "jam 6" at 10 AM without specifying date), assume tomorrow
    if (targetDate <= now && !lower.includes('besok') && !lower.includes('lusa')) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Extract Clean Title
    let title = text
      .replace(/tolong\s+/gi, '')
      .replace(/buatkan\s+/gi, '')
      .replace(/bikin\s+/gi, '')
      .replace(/ingatkan\s+saya\s+/gi, '')
      .replace(/ingatkan\s+/gi, '')
      .replace(/set\s+alarm\s+/gi, '')
      .replace(/tambah\s+jadwal\s+/gi, '')
      .replace(/di\s+kalender\s+/gi, '')
      .replace(/ke\s+kalender\s+/gi, '')
      .replace(/(?:besok|lusa|hari ini|minggu depan)/gi, '')
      .replace(/(?:jam|pukul)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam|am|pm)?/gi, '')
      .replace(/untuk\s+/gi, '')
      .trim();

    if (!title || title.length < 2) {
      if (isAlarm) title = `Alarm ${targetDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      else if (isCalendar) title = 'Jadwal Agenda HP';
      else title = 'Pengingat Aktivitas';
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const type = isAlarm ? 'alarm' : isCalendar ? 'calendar' : 'reminder';

    return {
      title,
      datetime: targetDate.toISOString(),
      type,
      description: `Dibuat dari chat: "${text}"`,
    };
  }
}

export const reminderService = new ReminderService();
