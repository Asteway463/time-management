import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ALARM_SOUNDS, APP_NAME, formatTime, nextTime, validTime } from './constants';
import type { Alarm, AlarmSound, TimeFormat } from './types';

export const ALARM_CHANNEL_ID = 'chronoflow-alarms-v2';

type AlarmSyncResult = 'scheduled' | 'permission-denied' | 'none';

const channelSetup = new Map<string, Promise<void>>();
let alarmSyncQueue = Promise.resolve();

const soundFileFor = (sound: AlarmSound = 'default') =>
  ALARM_SOUNDS.find((item) => item.id === sound)?.file ?? 'default';

export const alarmChannelId = (sound: AlarmSound = 'default') =>
  sound === 'default' ? ALARM_CHANNEL_ID : `${ALARM_CHANNEL_ID}-${sound}`;

export async function ensureAlarmChannelAsync(sound: AlarmSound = 'default'): Promise<void> {
  if (Platform.OS !== 'android') return;
  const channelId = alarmChannelId(sound);
  let setup = channelSetup.get(channelId);
  if (!setup) {
    setup = Notifications.setNotificationChannelAsync(channelId, {
      name: sound === 'default' ? `${APP_NAME} alarms` : `${APP_NAME} alarms · ${sound}`,
      description: 'Alarm and focus timer reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: soundFileFor(sound),
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: false,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
      vibrationPattern: [0, 600, 300, 600, 300, 600],
      enableVibrate: true,
      showBadge: false,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).then(() => undefined).catch((error: unknown) => {
      channelSetup.delete(channelId);
      throw error;
    });
    channelSetup.set(channelId, setup);
  }
  await setup;
}

async function cancelManagedAlarmNotificationsAsync(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const managed = scheduled.filter(
    (notification) => typeof notification.content.data?.alarmId === 'string',
  );
  await Promise.all(managed.map((notification) =>
    Notifications.cancelScheduledNotificationAsync(notification.identifier),
  ));
}

function triggersForAlarm(alarm: Alarm): Notifications.NotificationTriggerInput[] {
  if (!validTime(alarm.time)) {
    throw new Error(`Alarm "${alarm.label}" has an invalid time.`);
  }

  const [hour, minute] = alarm.time.split(':').map(Number);
  if (alarm.days.length > 0) {
    const validDays = [...new Set(alarm.days.filter(
      (day) => Number.isInteger(day) && day >= 0 && day <= 6,
    ))];
    if (validDays.length === 0) {
      throw new Error(`Alarm "${alarm.label}" has no valid repeat days.`);
    }
    return validDays.map((day) => ({
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: day + 1,
      hour,
      minute,
    }));
  }

  const fireAt = alarm.fireAt ?? nextTime(alarm.time).getTime();
  if (!Number.isFinite(fireAt) || fireAt <= Date.now()) return [];
  return [{
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date(fireAt),
  }];
}

async function synchronizeAlarmNotificationsAsync(
  alarms: Alarm[],
  requestPermission: boolean,
  timeFormat: TimeFormat,
): Promise<AlarmSyncResult> {
  const activeAlarms = alarms.filter((alarm) => alarm.active);
  if (activeAlarms.length === 0) {
    await cancelManagedAlarmNotificationsAsync();
    return 'none';
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    await cancelManagedAlarmNotificationsAsync();
    return 'permission-denied';
  }

  for (const sound of new Set(activeAlarms.map((alarm) => alarm.sound ?? 'default'))) {
    await ensureAlarmChannelAsync(sound);
  }
  await cancelManagedAlarmNotificationsAsync();

  try {
    for (const alarm of activeAlarms) {
      const soundFile = soundFileFor(alarm.sound);
      const content: Notifications.NotificationContentInput = {
        title: alarm.label || `${APP_NAME} alarm`,
        body: `${alarm.category} alarm · ${formatTime(alarm.time, timeFormat)}`,
        sound: soundFile,
        data: { alarmId: alarm.id },
        ...(Platform.OS === 'android' ? { channelId: alarmChannelId(alarm.sound) } : {}),
      };

      for (const trigger of triggersForAlarm(alarm)) {
        await Notifications.scheduleNotificationAsync({ content, trigger });
      }
    }
  } catch (error) {
    try {
      await cancelManagedAlarmNotificationsAsync();
    } catch (cleanupError) {
      throw new Error(
        `Notification scheduling failed (${String(error)}); partial scheduled alarms could not be cleared (${String(cleanupError)}).`,
      );
    }
    throw error;
  }

  return 'scheduled';
}

export function syncAlarmNotificationsAsync(
  alarms: Alarm[],
  requestPermission: boolean,
  timeFormat: TimeFormat = '24h',
): Promise<AlarmSyncResult> {
  const operation = alarmSyncQueue.then(
    () => synchronizeAlarmNotificationsAsync(alarms, requestPermission, timeFormat),
  );
  alarmSyncQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function scheduleFocusCompletionNotificationAsync(date: Date): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return null;

  await ensureAlarmChannelAsync();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Focus session complete',
      body: 'Your timer has finished.',
      sound: 'default',
      data: { notificationType: 'focus-timer' },
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}
