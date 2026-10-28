import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, TrainerSettings } from '../types';
import { formatDateSpanish, getDaysDifference, getTodayString } from '../utils/date';

export const ANDROID_CHANNEL_ID = 'gym-reminders';
const NOTIFIED_TODAY_STORAGE_KEY = '@derwin_gym_notified_today_v1';

// Configure foreground notification presentation
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Ensures the Android notification channel exists and requests notification permissions.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Avisos de Vencimiento',
        description: 'Recordatorios cuando a un alumno le quedan pocos días para vencer su mensualidad',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
}

interface NotifiedTodayState {
  date: string;
  keys: string[];
}

async function getNotifiedTodayKeys(): Promise<Set<string>> {
  try {
    const today = getTodayString();
    const raw = await AsyncStorage.getItem(NOTIFIED_TODAY_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: NotifiedTodayState = JSON.parse(raw);
    if (parsed.date !== today || !Array.isArray(parsed.keys)) {
      return new Set();
    }
    return new Set(parsed.keys);
  } catch {
    return new Set();
  }
}

async function saveNotifiedTodayKeys(keys: Set<string>): Promise<void> {
  try {
    const state: NotifiedTodayState = {
      date: getTodayString(),
      keys: Array.from(keys),
    };
    await AsyncStorage.setItem(NOTIFIED_TODAY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

/**
 * Cancels previous scheduled notifications and reschedules alerts for all active trainees
 * based on `settings.notifications.daysBefore` and `settings.notifications.notifyOnDueDate`.
 */
export async function syncClientNotifications(
  clients: Client[],
  settings: TrainerSettings
): Promise<{ scheduledCount: number }> {
  if (Platform.OS === 'web') return { scheduledCount: 0 };

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const notifConfig = settings.notifications;
    if (!notifConfig || !notifConfig.enabled) {
      return { scheduledCount: 0 };
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      return { scheduledCount: 0 };
    }

    const daysBefore = Math.max(1, Math.min(30, Number(notifConfig.daysBefore) || 3));
    const notifyOnDueDate = notifConfig.notifyOnDueDate ?? true;
    const hour = Math.max(0, Math.min(23, Number(notifConfig.hour) ?? 9));

    const now = new Date();
    const notifiedToday = await getNotifiedTodayKeys();
    let notifiedTodayModified = false;
    let scheduledCount = 0;

    for (const client of clients) {
      if (!client.active || !client.nextDueDate) continue;

      const parts = client.nextDueDate.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) continue;
      const [dueYear, dueMonth, dueDay] = parts;

      const paid = client.paidAmount || 0;
      const remaining = Math.max(0, Number((client.amount - paid).toFixed(2)));
      const amountLabel = remaining > 0 ? remaining : client.amount;
      const curr = client.currency || '$';
      const daysDiff = getDaysDifference(client.nextDueDate);

      // 1. Schedule notification X days before due date
      const beforeDate = new Date(dueYear, dueMonth - 1, dueDay - daysBefore, hour, 0, 0, 0);
      const beforeTitle = `⏰ Vence en ${daysBefore} ${daysBefore === 1 ? 'día' : 'días'}: ${client.fullName}`;
      const beforeBody = `Su plan ${client.planName} (${curr}${amountLabel}) vence el ${formatDateSpanish(client.nextDueDate)}. Toca para avisarle por WhatsApp.`;

      if (beforeDate.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: beforeTitle,
            body: beforeBody,
            sound: 'default',
            data: { clientId: client.id, type: 'days_before' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: beforeDate,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
        scheduledCount++;
      } else if (daysDiff === daysBefore) {
        // Today is exactly X days before due date, and the scheduled hour already passed today
        const immediateKey = `${client.id}_before_${client.nextDueDate}_${daysBefore}`;
        if (!notifiedToday.has(immediateKey)) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: beforeTitle,
              body: beforeBody,
              sound: 'default',
              data: { clientId: client.id, type: 'days_before' },
            },
            trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
          });
          notifiedToday.add(immediateKey);
          notifiedTodayModified = true;
          scheduledCount++;
        }
      }

      // 2. Schedule notification on the exact due date
      if (notifyOnDueDate) {
        const dueDateAlarm = new Date(dueYear, dueMonth - 1, dueDay, hour, 0, 0, 0);
        const dueTitle = `🚨 Vence HOY: ${client.fullName}`;
        const dueBody = `Hoy vence su plan ${client.planName} (${curr}${amountLabel}). Toca para enviarle recordatorio por WhatsApp.`;

        if (dueDateAlarm.getTime() > now.getTime()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: dueTitle,
              body: dueBody,
              sound: 'default',
              data: { clientId: client.id, type: 'due_today' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: dueDateAlarm,
              channelId: ANDROID_CHANNEL_ID,
            },
          });
          scheduledCount++;
        } else if (daysDiff === 0) {
          const immediateDueKey = `${client.id}_due_${client.nextDueDate}`;
          if (!notifiedToday.has(immediateDueKey)) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: dueTitle,
                body: dueBody,
                sound: 'default',
                data: { clientId: client.id, type: 'due_today' },
              },
              trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
            });
            notifiedToday.add(immediateDueKey);
            notifiedTodayModified = true;
            scheduledCount++;
          }
        }
      }
    }

    if (notifiedTodayModified) {
      await saveNotifiedTodayKeys(notifiedToday);
    }

    return { scheduledCount };
  } catch (err) {
    console.warn('Error syncing client notifications:', err);
    return { scheduledCount: 0 };
  }
}

/**
 * Fires an immediate test notification on the device so the user can verify sound/banner.
 */
export async function sendTestNotification(daysBefore: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  const cleanDays = Math.max(1, Number(daysBefore) || 3);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ Vence en ${cleanDays} ${cleanDays === 1 ? 'día' : 'días'}: Alumno de Prueba`,
      body: `Así te avisará Gym Tracking cuando a un alumno le queden ${cleanDays} ${cleanDays === 1 ? 'día' : 'días'} para vencer.`,
      sound: 'default',
      data: { type: 'test' },
    },
    trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
  });

  return true;
}
