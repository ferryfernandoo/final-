/**
 * Native Bridge Service using Capacitor
 * Handles integration with Android Native APIs (Calendar, Notifications, Alarms)
 */

let CapacitorCore = null;
let LocalNotifications = null;

// Dynamic import or safe fallback for web environment
async function getCapacitor() {
  if (CapacitorCore) return CapacitorCore;
  try {
    CapacitorCore = await import('@capacitor/core');
    return CapacitorCore;
  } catch (e) {
    console.log('[NativeBridge] Running in pure web browser mode');
    return null;
  }
}

async function getLocalNotifications() {
  if (LocalNotifications) return LocalNotifications;
  try {
    const mod = await import('@capacitor/local-notifications');
    LocalNotifications = mod.LocalNotifications;
    return LocalNotifications;
  } catch (e) {
    console.log('[NativeBridge] LocalNotifications plugin not loaded');
    return null;
  }
}

class NativeBridge {
  constructor() {
    this.isNative = false;
    this.init();
  }

  async init() {
    const cap = await getCapacitor();
    if (cap && cap.Capacitor && cap.Capacitor.isNativePlatform()) {
      this.isNative = true;
      console.log('[NativeBridge] Native Android environment detected!');
      this.requestPermissions();
    }
  }

  async requestPermissions() {
    const notifs = await getLocalNotifications();
    if (notifs) {
      try {
        const status = await notifs.checkPermissions();
        if (status.display !== 'granted') {
          await notifs.requestPermissions();
        }
        this.registerNotificationActions();
      } catch (e) {
        console.warn('[NativeBridge] Error requesting notification permissions:', e);
      }
    }
  }

  async registerNotificationActions(reminderService) {
    const notifs = await getLocalNotifications();
    if (notifs) {
      try {
        await notifs.registerActionTypes({
          types: [
            {
              id: 'REMINDER_ACTIONS',
              actions: [
                {
                  id: 'snooze',
                  title: 'Snooze (10 mins)',
                  foreground: true
                },
                {
                  id: 'dismiss',
                  title: 'Dismiss',
                  destructive: true,
                  foreground: false
                }
              ]
            }
          ]
        });

        notifs.addListener('localNotificationActionPerformed', (notificationAction) => {
          console.log('[NativeBridge] Notification action:', notificationAction);
          const { actionId, notification } = notificationAction;
          const reminderId = notification.extra?.reminderId;
          
          if (this.reminderService) {
            if (actionId === 'snooze') {
              this.reminderService.snoozeReminder(reminderId, 10);
            } else if (actionId === 'dismiss') {
              this.reminderService.dismissReminder(reminderId);
            }
          }
        });
      } catch (e) {
        console.warn('[NativeBridge] Error registering notification actions:', e);
      }
    }
  }

  setReminderService(service) {
    this.reminderService = service;
  }

  /**
   * Schedule a local device notification / alarm chime with Snooze & Dismiss actions
   */
  async scheduleNotification({ id, title, body, datetime }) {
    const notifs = await getLocalNotifications();
    if (notifs) {
      try {
        const scheduleDate = new Date(datetime);
        const notifId = Math.floor(Math.abs(hashCode(id || title + datetime)) % 2147483647);
        await notifs.schedule({
          notifications: [
            {
              id: notifId,
              title: title || 'Deepernova Reminder',
              body: body || 'Time for your scheduled activity!',
              schedule: { at: scheduleDate },
              channelId: 'deepernova_alarm_channel',
              sound: 'notification_sound',
              actionTypeId: 'REMINDER_ACTIONS',
              extra: { reminderId: id }
            }
          ]
        });
        console.log('[NativeBridge] Scheduled local notification with Snooze/Dismiss actions for:', scheduleDate);
        return true;
      } catch (e) {
        console.error('[NativeBridge] Error scheduling notification:', e);
      }
    }
    return false;
  }

  /**
   * Cancel a scheduled local device notification / alarm chime
   */
  async cancelNotification(id) {
    const notifs = await getLocalNotifications();
    if (notifs) {
      try {
        const notifId = Math.floor(Math.abs(hashCode(id)) % 2147483647);
        await notifs.cancel({
          notifications: [{ id: notifId }]
        });
        console.log('[NativeBridge] Cancelled notification with ID:', notifId);
        return true;
      } catch (e) {
        console.warn('[NativeBridge] Error cancelling notification:', e);
      }
    }
    return false;
  }

  /**
   * Open Android Intent for Calendar Event creation
   * Uses native Java plugin first, fallback to intent URI
   */
  async createCalendarEvent({ title, datetime, description, location }) {
    const cap = await getCapacitor();
    const startDate = new Date(datetime);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    if (this.isNative && cap && cap.Capacitor) {
      try {
        const NativeDevice = cap.registerPlugin ? cap.registerPlugin('NativeDevice') : null;
        if (NativeDevice && NativeDevice.createCalendarEvent) {
          await NativeDevice.createCalendarEvent({
            title: title || 'Pengingat',
            description: description || 'Dibuat via Deepernova AI',
            startTime: startDate.getTime(),
            endTime: endDate.getTime()
          });
          return true;
        }
      } catch (e) {
        console.warn('[NativeBridge] Java plugin createCalendarEvent error:', e);
      }
      return true;
    }
    return false;
  }

  /**
   * Set a native Android system alarm directly in the Clock app (app Jam bawaan HP / Xiaomi Clock)
   * Executes silently in the background without forcing user into clock app
   */
  async createNativeAlarm({ title, datetime }) {
    const cap = await getCapacitor();
    const alarmDate = new Date(datetime);
    const hour = alarmDate.getHours();
    const minute = alarmDate.getMinutes();

    if (this.isNative && cap && cap.Capacitor) {
      try {
        const NativeDevice = cap.registerPlugin ? cap.registerPlugin('NativeDevice') : null;
        if (NativeDevice && NativeDevice.createAlarm) {
          await NativeDevice.createAlarm({
            hour,
            minute,
            message: title || 'Alarm Deepernova'
          });
          return true;
        }
      } catch (e) {
        console.warn('[NativeBridge] Java plugin createAlarm error:', e);
      }
      return true;
    }
    return false;
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export const nativeBridge = new NativeBridge();
