import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, Share } from 'react-native';
import { APP_NAME, defaultData, nextTime, todayKey, validTime } from './constants';
import { effectiveStreak, reactivateAlarm, recoverTimer, shouldRingForNotification, timerForMode } from './logic';
import {
  scheduleFocusCompletionNotificationAsync,
  syncAlarmNotificationsAsync,
} from './notifications';
import { removeBackgroundImage } from './services/backgroundImage';
import { loadAppData, saveAppData } from './storage';
import type {
  Alarm,
  AppData,
  Category,
  FocusMode,
  FocusSession,
  Note,
  Priority,
  Tab,
  Task,
  TimeFormat,
} from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MINIMUM_SPLASH_MS = 2300;

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function useChronoFlow() {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [modal, setModal] = useState<'alarm' | 'task' | 'settings' | null>(null);
  const [ringing, setRinging] = useState<Alarm | null>(null);
  const [mathQuestion, setMathQuestion] = useState({ text: '', answer: 0 });
  const [mathInput, setMathInput] = useState('');
  const [mathError, setMathError] = useState(false);
  const [alarmTime, setAlarmTime] = useState('08:00');
  const [alarmLabel, setAlarmLabel] = useState('');
  const [alarmCategory, setAlarmCategory] = useState<Alarm['category']>('Personal');
  const [alarmChallenge, setAlarmChallenge] = useState<Alarm['challenge']>('none');
  const [alarmDays, setAlarmDays] = useState<number[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('09:00');
  const [taskDuration, setTaskDuration] = useState('30');
  const [taskPriority, setTaskPriority] = useState<Priority>('Medium');
  const [taskCategory, setTaskCategory] = useState<Category>('Work');
  const [settings, setSettings] = useState({ work: '25', short: '5', long: '15' });
  const [focusMode, setFocusMode] = useState<FocusMode>('work');
  const [remaining, setRemaining] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);

  const lastFiredRef = useRef('');
  const timerNotificationRef = useRef<string | null>(null);
  const timerNotificationGenerationRef = useRef(0);
  const focusSessionStartedAtRef = useRef<number | null>(null);
  const dataRef = useRef(data);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  dataRef.current = data;

  const persist = useCallback((next: AppData) => {
    persistQueueRef.current = persistQueueRef.current.then(async () => {
      try {
        await saveAppData(next);
      } catch (error) {
        Alert.alert('Could not save changes', String(error));
      }
    });
  }, []);

  const updateData = useCallback((updater: (current: AppData) => AppData) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    persist(next);
  }, [persist]);

  const syncNotifications = useCallback(async (alarms: Alarm[], askPermission: boolean) => {
    if (Platform.OS === 'web') return;
    const notificationsEnabled = dataRef.current.notificationsEnabled;
    try {
      const result = await syncAlarmNotificationsAsync(
        notificationsEnabled ? alarms : [],
        askPermission && notificationsEnabled,
        dataRef.current.timeFormat,
      );
      if (result === 'permission-denied' && askPermission && notificationsEnabled) {
        Alert.alert(
          'Notifications are off',
          'The alarm is saved, but it will not notify you until notification permission is enabled in system settings.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not schedule alarm notifications',
        `Your alarm is saved, but its reminder could not be scheduled. ${String(error)}`,
      );
    }
  }, []);

  const ringAlarm = useCallback((alarm: Alarm) => {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 20) + 5;
    setMathQuestion({ text: `${a} + ${b} = ?`, answer: a + b });
    setMathInput('');
    setMathError(false);
    setRinging(alarm);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const startedAt = Date.now();
      try {
        const stored = await loadAppData();
        let restored = stored;

        const streak = effectiveStreak(stored.streak, stored.lastStreakDate);
        if (streak !== stored.streak) restored = { ...restored, streak };

        const recovery = recoverTimer(restored);
        restored = recovery.data;

        if (!mounted) return;
        dataRef.current = restored;
        setData(restored);
        setFocusMode(restored.timer.mode);
        setRemaining(restored.timer.remainingSeconds);
        setTimerRunning(restored.timer.running);
        setTimerEndAt(restored.timer.endsAt);
        focusSessionStartedAtRef.current = restored.timer.running
          ? restored.timer.sessionStartedAt
          : null;

        try {
          await saveAppData(restored);
        } catch {
          // A failed save is reported by the next update; loading still succeeds.
        }

        if (recovery.completedSession) {
          setTimeout(() => {
            if (mounted) {
              Alert.alert('Focus session complete', 'Your focus session finished while the app was closed.');
            }
          }, 350);
        }
      } catch (error) {
        if (mounted) {
          Alert.alert(
            'Could not load saved data',
            `${String(error)} A recovery copy was kept on this device, and ${APP_NAME} opened with a clean state.`,
          );
        }
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < MINIMUM_SPLASH_MS) await delay(MINIMUM_SPLASH_MS - elapsed);
        if (mounted) setLoaded(true);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void syncNotifications(dataRef.current.alarms, false);
  }, [loaded, syncNotifications]);

  useEffect(() => {
    if (!loaded) return;
    const resetFocusDay = () => {
      const today = todayKey();
      if (dataRef.current.focus.focusDate !== today) {
        updateData((current) => ({
          ...current,
          focus: { ...current.focus, focusDate: today, totalFocusMinsToday: 0 },
        }));
      }
    };
    resetFocusDay();
    const interval = setInterval(resetFocusDay, 60_000);
    return () => clearInterval(interval);
  }, [loaded, updateData]);

  useEffect(() => {
    if (!loaded) return;

    const tick = () => {
      const current = new Date();
      const now = current.getTime();
      const alarms = dataRef.current.alarms;

      const expiredIds = alarms
        .filter((alarm) => alarm.active && alarm.days.length === 0
          && alarm.fireAt !== undefined && now >= alarm.fireAt + 60_000)
        .map((alarm) => alarm.id);

      if (expiredIds.length > 0) {
        updateData((currentData) => ({
          ...currentData,
          alarms: currentData.alarms.map((alarm) =>
            expiredIds.includes(alarm.id) ? { ...alarm, active: false } : alarm),
        }));
        void syncNotifications(dataRef.current.alarms, false);
        return;
      }

      const minute = `${todayKey(current)}-${current.getHours()}:${current.getMinutes()}`;
      const time = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
      for (const alarm of alarms) {
        if (!alarm.active) continue;
        const oneTimeDue = alarm.days.length === 0
          && alarm.fireAt !== undefined
          && now >= alarm.fireAt
          && now < alarm.fireAt + 60_000;
        const repeatsToday = alarm.days.length > 0 && alarm.days.includes(current.getDay());
        const due = alarm.days.length === 0 ? oneTimeDue : repeatsToday && alarm.time === time;
        if (!due || lastFiredRef.current === `${alarm.id}-${minute}`) continue;

        lastFiredRef.current = `${alarm.id}-${minute}`;
        ringAlarm(alarm);
        if (alarm.days.length === 0) {
          updateData((currentData) => ({
            ...currentData,
            alarms: currentData.alarms.map((item) =>
              item.id === alarm.id ? { ...item, active: false } : item),
          }));
          void syncNotifications(dataRef.current.alarms, false);
        }
      }
    };

    const interval = setInterval(tick, 5_000);
    tick();
    return () => clearInterval(interval);
  }, [loaded, ringAlarm, syncNotifications, updateData]);

  useEffect(() => {
    if (!loaded || Platform.OS === 'web') return;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const alarmId = response.notification.request.content.data?.alarmId;
      if (typeof alarmId !== 'string') return;
      const alarm = dataRef.current.alarms.find((item) => item.id === alarmId);
      if (!alarm || !shouldRingForNotification(alarm)) return;
      const now = new Date();
      lastFiredRef.current = `${alarm.id}-${todayKey(now)}-${now.getHours()}:${now.getMinutes()}`;
      ringAlarm(alarm);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (!response) return;
      handleResponse(response);
      await Notifications.clearLastNotificationResponseAsync();
    });
    return () => subscription.remove();
  }, [loaded, ringAlarm]);

  useEffect(() => {
    if (!timerRunning || timerEndAt === null) return;
    const refresh = () => {
      const actual = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
      setRemaining((current) => current === actual ? current : actual);
    };
    refresh();
    const interval = setInterval(refresh, 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [timerRunning, timerEndAt]);

  const cancelTimerNotification = useCallback(async () => {
    timerNotificationGenerationRef.current += 1;
    const notificationId = timerNotificationRef.current;
    timerNotificationRef.current = null;
    if (!notificationId || Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
      // The notification already fired or was removed by the system: nothing to do.
    }
  }, []);

  const scheduleTimerNotification = useCallback(async (date: Date) => {
    if (Platform.OS === 'web' || !dataRef.current.notificationsEnabled) return;
    const generation = ++timerNotificationGenerationRef.current;
    try {
      const notificationId = await scheduleFocusCompletionNotificationAsync(date);
      if (!notificationId) {
        Alert.alert(
          'Timer reminder unavailable',
          'The timer will continue while the app is open, but notification permission is required for a reminder while it is in the background.',
        );
        return;
      }
      if (generation !== timerNotificationGenerationRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        return;
      }
      timerNotificationRef.current = notificationId;
    } catch (error) {
      Alert.alert('Could not schedule timer notification', String(error));
    }
  }, []);

  useEffect(() => {
    if (!loaded || !timerRunning || remaining > 0) return;

    const endedAt = Date.now();
    const startedAt = focusSessionStartedAtRef.current;
    focusSessionStartedAtRef.current = null;
    setTimerRunning(false);
    setTimerEndAt(null);
    void cancelTimerNotification();

    if (focusMode === 'work') {
      const elapsedMinutes = startedAt === null
        ? 0
        : Math.min(dataRef.current.focus.workMins, (endedAt - startedAt) / 60_000);
      const duration = Math.round(elapsedMinutes);
      const session: FocusSession | null = elapsedMinutes > 0
        ? {
          id: createId('focus'),
          startedAt: endedAt - Math.round(elapsedMinutes * 60_000),
          endedAt,
          duration,
          mode: 'work',
          completed: true,
        }
        : null;
      updateData((current) => ({
        ...current,
        focus: {
          ...current.focus,
          totalFocusMinsToday: current.focus.totalFocusMinsToday + elapsedMinutes,
        },
        focusSessions: session ? [session, ...current.focusSessions].slice(0, 200) : current.focusSessions,
        timer: timerForMode('work', current.focus.workMins, current.focus.shortMins, current.focus.longMins),
      }));
      setRemaining(dataRef.current.focus.workMins * 60);
      Alert.alert('Focus session complete', 'Great work. Time for a break.');
      try { Speech.speak('Great job! Focus session complete. Time for a break.'); } catch {}
    } else {
      updateData((current) => ({
        ...current,
        timer: timerForMode(focusMode, current.focus.workMins, current.focus.shortMins, current.focus.longMins),
      }));
      const breakMinutes = focusMode === 'shortBreak'
        ? dataRef.current.focus.shortMins
        : dataRef.current.focus.longMins;
      setRemaining(breakMinutes * 60);
      Alert.alert('Break complete', 'Ready to focus again?');
      try { Speech.speak('Break complete. Ready to focus again?'); } catch {}
    }
  }, [cancelTimerNotification, focusMode, loaded, remaining, timerRunning, updateData]);

  const startTimerForMode = (mode: FocusMode, seconds: number) => {
    const durationSeconds = Math.max(1, Math.round(seconds));
    const endsAt = Date.now() + durationSeconds * 1000;
    const sessionStartedAt = mode === 'work' ? Date.now() : null;

    focusSessionStartedAtRef.current = sessionStartedAt;
    setFocusMode(mode);
    setRemaining(durationSeconds);
    setTimerEndAt(endsAt);
    setTimerRunning(true);
    updateData((current) => ({
      ...current,
      timer: {
        mode,
        running: true,
        endsAt,
        remainingSeconds: durationSeconds,
        sessionStartedAt,
      },
    }));
    void scheduleTimerNotification(new Date(endsAt));
  };

  const startFocusTimer = () => {
    const minutes = focusMode === 'work' ? data.focus.workMins
      : focusMode === 'shortBreak' ? data.focus.shortMins : data.focus.longMins;
    startTimerForMode(focusMode, remaining > 0 ? remaining : minutes * 60);
  };

  const pauseFocusTimer = () => {
    const now = Date.now();
    const actualRemaining = timerEndAt !== null
      ? Math.max(0, Math.ceil((timerEndAt - now) / 1000))
      : remaining;
    const startedAt = focusSessionStartedAtRef.current;
    focusSessionStartedAtRef.current = null;

    setTimerRunning(false);
    setTimerEndAt(null);
    setRemaining(actualRemaining);
    void cancelTimerNotification();

    updateData((current) => {
      let focus = current.focus;
      let focusSessions = current.focusSessions;

      if (focusMode === 'work' && startedAt !== null) {
        const elapsedMinutes = Math.max(0, (now - startedAt) / 60_000);
        if (elapsedMinutes > 0) {
          focus = {
            ...focus,
            totalFocusMinsToday: focus.totalFocusMinsToday + elapsedMinutes,
          };
          const duration = Math.round(elapsedMinutes);
          if (duration >= 1) {
            focusSessions = [{
              id: createId('focus'),
              startedAt,
              endedAt: now,
              duration,
              mode: 'work' as const,
              completed: false,
            }, ...focusSessions].slice(0, 200);
          }
        }
      }

      return {
        ...current,
        focus,
        focusSessions,
        timer: {
          mode: focusMode,
          running: false,
          endsAt: null,
          remainingSeconds: actualRemaining,
          sessionStartedAt: null,
        },
      };
    });
  };

  const startQuickFocus = () => {
    if (timerRunning) pauseFocusTimer();
    startTimerForMode('work', dataRef.current.focus.workMins * 60);
  };

  const selectFocusMode = (mode: FocusMode) => {
    if (timerRunning) pauseFocusTimer();
    const minutes = mode === 'work' ? dataRef.current.focus.workMins
      : mode === 'shortBreak' ? dataRef.current.focus.shortMins : dataRef.current.focus.longMins;
    setFocusMode(mode);
    setRemaining(minutes * 60);
    updateData((current) => ({
      ...current,
      timer: {
        mode,
        running: false,
        endsAt: null,
        remainingSeconds: minutes * 60,
        sessionStartedAt: null,
      },
    }));
  };

  const resetFocusTimer = () => {
    if (timerRunning) pauseFocusTimer();
    const minutes = focusMode === 'work' ? dataRef.current.focus.workMins
      : focusMode === 'shortBreak' ? dataRef.current.focus.shortMins : dataRef.current.focus.longMins;
    setRemaining(minutes * 60);
    updateData((current) => ({
      ...current,
      timer: {
        mode: focusMode,
        running: false,
        endsAt: null,
        remainingSeconds: minutes * 60,
        sessionStartedAt: null,
      },
    }));
  };

  const changeAlarmActive = (id: string, active: boolean) => {
    updateData((current) => ({
      ...current,
      alarms: current.alarms.map((alarm) => {
        if (alarm.id !== id) return alarm;
        if (!active) return { ...alarm, active: false };
        return reactivateAlarm(alarm);
      }),
    }));
    void syncNotifications(dataRef.current.alarms, active);
  };

  const deleteAlarm = (id: string) => {
    updateData((current) => ({ ...current, alarms: current.alarms.filter((alarm) => alarm.id !== id) }));
    void syncNotifications(dataRef.current.alarms, false);
  };

  const resetAlarmForm = () => {
    setAlarmTime('08:00');
    setAlarmLabel('');
    setAlarmCategory('Personal');
    setAlarmChallenge('none');
    setAlarmDays([]);
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskTime('09:00');
    setTaskDuration('30');
    setTaskPriority('Medium');
    setTaskCategory('Work');
  };

  const addAlarm = () => {
    if (!validTime(alarmTime)) {
      Alert.alert('Check the time', 'Enter a time in 24-hour format, for example 07:30.');
      return;
    }
    if (!alarmLabel.trim()) {
      Alert.alert('Add an alarm name', 'A short label helps you recognize this alarm.');
      return;
    }
    const alarm: Alarm = {
      id: createId('alarm'),
      time: alarmTime,
      label: alarmLabel.trim(),
      category: alarmCategory,
      challenge: alarmChallenge,
      days: [...alarmDays].sort(),
      active: true,
      ...(alarmDays.length === 0 ? { fireAt: nextTime(alarmTime).getTime() } : {}),
    };
    updateData((current) => ({ ...current, alarms: [...current.alarms, alarm] }));
    void syncNotifications(dataRef.current.alarms, true);
    setModal(null);
    resetAlarmForm();
  };

  const addTask = () => {
    const duration = Number(taskDuration);
    if (!taskTitle.trim()) {
      Alert.alert('Add a task name', 'Enter a short title for your task.');
      return;
    }
    if (!validTime(taskTime) || !Number.isInteger(duration) || duration < 5 || duration > 480) {
      Alert.alert('Check task details', 'Use a valid 24-hour time and a duration between 5 and 480 minutes.');
      return;
    }
    const task: Task = {
      id: createId('task'),
      title: taskTitle.trim(),
      time: taskTime,
      duration,
      priority: taskPriority,
      category: taskCategory,
      completed: false,
    };
    updateData((current) => ({
      ...current,
      tasks: [...current.tasks, task].sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setModal(null);
    resetTaskForm();
  };

  const toggleTask = (id: string) => {
    updateData((current) => {
      const tasks = current.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task);
      const completing = current.tasks.find((task) => task.id === id)?.completed === false;
      if (!completing) return { ...current, tasks };

      const today = todayKey();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const baseStreak = effectiveStreak(current.streak, current.lastStreakDate);
      const streak = current.lastStreakDate === today
        ? Math.max(1, current.streak)
        : baseStreak + 1;
      return { ...current, tasks, streak, lastStreakDate: today };
    });
  };

  const deleteTask = (id: string) => {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }));
  };

  const saveTimerSettings = () => {
    const values = [Number(settings.work), Number(settings.short), Number(settings.long)];
    if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 120)) {
      Alert.alert('Check timer lengths', 'Each duration must be a whole number between 1 and 120 minutes.');
      return;
    }
    if (timerRunning) pauseFocusTimer();

    const minutes = focusMode === 'work' ? values[0]
      : focusMode === 'shortBreak' ? values[1] : values[2];
    updateData((current) => ({
      ...current,
      focus: {
        ...current.focus,
        workMins: values[0],
        shortMins: values[1],
        longMins: values[2],
      },
      timer: {
        mode: focusMode,
        running: false,
        endsAt: null,
        remainingSeconds: minutes * 60,
        sessionStartedAt: null,
      },
    }));
    setRemaining(minutes * 60);
    setModal(null);
  };

  const dismissAlarm = () => setRinging(null);

  const snoozeAlarm = () => {
    if (!ringing) return;
    const snoozed = new Date(Date.now() + 5 * 60 * 1000);
    const time = `${String(snoozed.getHours()).padStart(2, '0')}:${String(snoozed.getMinutes()).padStart(2, '0')}`;
    const snooze: Alarm = {
      id: createId('snooze'),
      time,
      label: `Snoozed: ${ringing.label}`,
      category: 'Personal',
      challenge: 'none',
      days: [],
      active: true,
      fireAt: snoozed.getTime(),
    };
    setRinging(null);
    updateData((current) => ({ ...current, alarms: [...current.alarms, snooze] }));
    void syncNotifications(dataRef.current.alarms, true);
  };

  const verifyMath = () => {
    if (mathInput.trim() && Number(mathInput) === mathQuestion.answer) {
      dismissAlarm();
    } else {
      setMathError(true);
    }
  };

  const openTimerSettings = () => {
    setSettings({
      work: `${data.focus.workMins}`,
      short: `${data.focus.shortMins}`,
      long: `${data.focus.longMins}`,
    });
    setModal('settings');
  };

  const toggleNotifications = (enabled: boolean) => {
    updateData((current) => ({ ...current, notificationsEnabled: enabled }));
    void syncNotifications(dataRef.current.alarms, enabled);
  };

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    updateData((current) => ({ ...current, theme }));
  };

  const setTimeFormat = (timeFormat: TimeFormat) => {
    updateData((current) => ({ ...current, timeFormat }));
    void syncNotifications(dataRef.current.alarms, false);
  };

  const setBackgroundImage = (uri: string) => {
    const previous = dataRef.current.backgroundImage;
    updateData((current) => ({ ...current, backgroundImage: uri }));
    if (previous && previous !== uri) void removeBackgroundImage(previous);
  };

  const clearAllData = () => {
    const next = defaultData();
    setTimerRunning(false);
    setTimerEndAt(null);
    setRemaining(next.focus.workMins * 60);
    setFocusMode('work');
    focusSessionStartedAtRef.current = null;
    void cancelTimerNotification();
    void removeBackgroundImage(dataRef.current.backgroundImage);
    setRinging(null);
    setModal(null);
    lastFiredRef.current = '';
    updateData(() => next);
    void syncNotifications([], false);
  };

  const exportData = async () => {
    try {
      await Share.share({
        title: `${APP_NAME} data`,
        message: JSON.stringify(dataRef.current, null, 2),
      });
    } catch (error) {
      Alert.alert('Could not export data', String(error));
    }
  };

  const addNote = (title: string, body: string) => {
    const now = Date.now();
    const note: Note = {
      id: createId('note'),
      title: title.trim().slice(0, 200) || 'Untitled',
      body: body.trim().slice(0, 20_000),
      createdAt: now,
      updatedAt: now,
      pinned: false,
      deletedAt: null,
    };
    updateData((current) => ({ ...current, notes: [note, ...current.notes] }));
  };

  const updateNote = (id: string, title: string, body: string) => {
    updateData((current) => ({
      ...current,
      notes: current.notes.map((note) => note.id === id
        ? {
          ...note,
          title: title.trim().slice(0, 200) || 'Untitled',
          body: body.trim().slice(0, 20_000),
          updatedAt: Date.now(),
        }
        : note),
    }));
  };

  const deleteNote = (id: string) => {
    updateData((current) => ({
      ...current,
      notes: current.notes.map((note) => note.id === id
        ? { ...note, deletedAt: Date.now() }
        : note),
    }));
  };

  const restoreNote = (id: string) => {
    updateData((current) => ({
      ...current,
      notes: current.notes.map((note) => note.id === id
        ? { ...note, deletedAt: null }
        : note),
    }));
  };

  const purgeNote = (id: string) => {
    updateData((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== id),
    }));
  };

  const toggleNotePin = (id: string) => {
    updateData((current) => ({
      ...current,
      notes: current.notes.map((note) => note.id === id
        ? { ...note, pinned: !note.pinned, updatedAt: Date.now() }
        : note),
    }));
  };

  const completedCount = data.tasks.filter((task) => task.completed).length;
  const progress = data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0;

  return {
    data,
    loaded,
    tab,
    setTab,
    filter,
    setFilter,
    modal,
    setModal,
    ringing,
    mathQuestion,
    mathInput,
    setMathInput,
    mathError,
    alarmTime,
    setAlarmTime,
    alarmLabel,
    setAlarmLabel,
    alarmCategory,
    setAlarmCategory,
    alarmChallenge,
    setAlarmChallenge,
    alarmDays,
    setAlarmDays,
    taskTitle,
    setTaskTitle,
    taskTime,
    setTaskTime,
    taskDuration,
    setTaskDuration,
    taskPriority,
    setTaskPriority,
    taskCategory,
    setTaskCategory,
    settings,
    setSettings,
    focusMode,
    remaining,
    timerRunning,
    completedCount,
    progress,
    addAlarm,
    addTask,
    changeAlarmActive,
    deleteAlarm,
    toggleTask,
    deleteTask,
    saveTimerSettings,
    selectFocusMode,
    pauseFocusTimer,
    startFocusTimer,
    startQuickFocus,
    resetFocusTimer,
    openTimerSettings,
    resetAlarmForm,
    resetTaskForm,
    dismissAlarm,
    snoozeAlarm,
    verifyMath,
    toggleNotifications,
    setTheme,
    setTimeFormat,
    setBackgroundImage,
    clearAllData,
    exportData,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    purgeNote,
    toggleNotePin,
  };
}
