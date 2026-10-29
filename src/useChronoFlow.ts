import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, Share } from 'react-native';
import { defaultData, nextAlarmDate, nextTime, todayKey, validTime } from './constants';
import {
  scheduleFocusCompletionNotificationAsync,
  syncAlarmNotificationsAsync,
} from './notifications';
import {
  clearNativeBlockState,
  getInstalledApps,
  isAccessibilityEnabled as checkAccessibility,
  isNativeBlockingAvailable,
  openAccessibilitySettings,
  setNativeBlockState,
  type InstalledApp,
} from './services/appBlocking';
import { loadAppData, saveAppData } from './storage';
import type {
  Alarm,
  AppData,
  BlockSchedule,
  BlockedApp,
  Category,
  FocusMode,
  FocusSession,
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

function getActiveScheduleEnd(schedules: BlockSchedule[], now: Date): number | null {
  let earliestEnd: number | null = null;
  for (const schedule of schedules) {
    if (!schedule.enabled || schedule.days.length === 0) continue;
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) continue;

    const start = new Date(now);
    start.setHours(startHour, startMinute, 0, 0);
    if (start.getTime() > now.getTime()) start.setDate(start.getDate() - 1);

    const end = new Date(start);
    end.setHours(endHour, endMinute, 0, 0);
    if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);

    const isActive = schedule.days.includes(start.getDay())
      && now.getTime() >= start.getTime()
      && now.getTime() < end.getTime();
    if (isActive && (earliestEnd === null || end.getTime() < earliestEnd)) {
      earliestEnd = end.getTime();
    }
  }
  return earliestEnd;
}

export function useChronoFlow() {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [modal, setModal] = useState<'alarm' | 'task' | 'settings' | 'appPicker' | 'schedule' | null>(null);
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
  const [isBlocking, setIsBlocking] = useState(false);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [addAppModal, setAddAppModal] = useState(false);
  const [addScheduleModal, setAddScheduleModal] = useState(false);
  const [newAppPackage, setNewAppPackage] = useState('');
  const [newAppLabel, setNewAppLabel] = useState('');
  const [newScheduleStart, setNewScheduleStart] = useState('21:00');
  const [newScheduleEnd, setNewScheduleEnd] = useState('23:00');
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const lastFiredRef = useRef('');
  const timerNotificationRef = useRef<string | null>(null);
  const timerNotificationGenerationRef = useRef(0);
  const focusSessionStartedAtRef = useRef<number | null>(null);
  const dataRef = useRef(data);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  dataRef.current = data;

  const persist = (next: AppData) => {
    persistQueueRef.current = persistQueueRef.current.then(async () => {
      try {
        await saveAppData(next);
      } catch (error) {
        Alert.alert('Could not save changes', String(error));
      }
    });
  };

  const updateData = useCallback((updater: (current: AppData) => AppData) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    void persist(next);
  }, []);

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const loadedData = await loadAppData();
        if (mounted) setData(loadedData);
      } catch (error) {
        Alert.alert('Could not load saved data', String(error));
      } finally {
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
    const checkAccess = async () => {
      const enabled = await checkAccessibility();
      setAccessibilityEnabled(enabled);
    };
    checkAccess();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAccess();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!loaded || timerRunning) return;
    if (Platform.OS !== 'android' || !isNativeBlockingAvailable()) return;

    const applySchedules = () => {
      const packages = dataRef.current.blockedApps
        .filter((app) => app.blockDuringFocus)
        .map((app) => app.packageName);
      const endAt = accessibilityEnabled
        ? getActiveScheduleEnd(dataRef.current.schedules, new Date())
        : null;

      if (endAt !== null && packages.length > 0) {
        setNativeBlockState(packages, 'Scheduled focus block', endAt);
        setIsBlocking(true);
      } else {
        clearNativeBlockState();
        setIsBlocking(false);
      }
    };

    applySchedules();
    const interval = setInterval(applySchedules, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') applySchedules();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loaded, timerRunning, accessibilityEnabled, data.schedules, data.blockedApps]);

  useEffect(() => {
    if (!loaded) return;
    const resetFocusDay = () => {
      const today = todayKey();
      if (data.focus.focusDate !== today) {
        updateData((current) => ({
          ...current,
          focus: { ...current.focus, focusDate: today, totalFocusMinsToday: 0 },
        }));
      }
    };
    resetFocusDay();
    const interval = setInterval(resetFocusDay, 60_000);
    return () => clearInterval(interval);
  }, [loaded, data.focus.focusDate, updateData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date();
      const expiredIds = data.alarms
        .filter((alarm) => alarm.active && alarm.days.length === 0 && alarm.fireAt !== undefined && current.getTime() >= alarm.fireAt + 60_000)
        .map((alarm) => alarm.id);
      if (expiredIds.length > 0) {
        updateData((currentData) => ({
          ...currentData,
          alarms: currentData.alarms.map((alarm) => expiredIds.includes(alarm.id) ? { ...alarm, active: false } : alarm),
        }));
        return;
      }
      const minute = `${todayKey(current)}-${current.getHours()}:${current.getMinutes()}`;
      for (const alarm of data.alarms) {
        const time = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
        const oneTimeDue = alarm.days.length === 0
          && alarm.fireAt !== undefined
          && current.getTime() >= alarm.fireAt
          && current.getTime() < alarm.fireAt + 60_000;
        const repeatsToday = alarm.days.length > 0 && alarm.days.includes(current.getDay());
        const due = alarm.days.length === 0 ? oneTimeDue : repeatsToday && alarm.time === time;
        if (alarm.active && due && lastFiredRef.current !== `${alarm.id}-${minute}`) {
          lastFiredRef.current = `${alarm.id}-${minute}`;
          const a = Math.floor(Math.random() * 20) + 5;
          const b = Math.floor(Math.random() * 20) + 5;
          setMathQuestion({ text: `${a} + ${b} = ?`, answer: a + b });
          setMathInput('');
          setMathError(false);
          setRinging(alarm);
          if (alarm.days.length === 0) {
            updateData((currentData) => ({
              ...currentData,
              alarms: currentData.alarms.map((item) => item.id === alarm.id ? { ...item, active: false } : item),
            }));
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [data.alarms, updateData]);

  useEffect(() => {
    if (!timerRunning || timerEndAt === null) return;
    const interval = setInterval(() => {
      const actualRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
      setRemaining((current) => current === actualRemaining ? current : actualRemaining);
    }, 250);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const actualRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
        setRemaining((current) => current === actualRemaining ? current : actualRemaining);
      }
    });
    return () => {
      clearInterval(interval);
      appState.remove();
    };
  }, [timerRunning, timerEndAt]);

  const cancelTimerNotification = async () => {
    timerNotificationGenerationRef.current += 1;
    const notificationId = timerNotificationRef.current;
    timerNotificationRef.current = null;
    if (!notificationId || Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      Alert.alert('Could not cancel timer notification', String(error));
    }
  };

  const scheduleTimerNotification = async (date: Date) => {
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
  };

  useEffect(() => {
    if (!timerRunning || remaining > 0) return;
    setTimerRunning(false);
    setTimerEndAt(null);
    clearNativeBlockState();
    setIsBlocking(false);
    void cancelTimerNotification();
    if (focusMode === 'work') {
      const elapsedMinutes = focusSessionStartedAtRef.current === null
        ? dataRef.current.focus.workMins
        : Math.min(dataRef.current.focus.workMins, (Date.now() - focusSessionStartedAtRef.current) / 60_000);
      const blockedApps = dataRef.current.blockedApps
        .filter((app) => app.blockDuringFocus)
        .map((app) => app.packageName);
      const session: FocusSession = {
        id: `focus-${Date.now()}`,
        startedAt: Date.now() - Math.round(elapsedMinutes * 60_000),
        endedAt: Date.now(),
        duration: Math.round(elapsedMinutes),
        mode: 'work',
        blockedApps,
        completed: true,
      };
      focusSessionStartedAtRef.current = null;
      updateData((current) => ({
        ...current,
        focus: { ...current.focus, totalFocusMinsToday: current.focus.totalFocusMinsToday + elapsedMinutes },
        focusSessions: [session, ...current.focusSessions].slice(0, 200),
      }));
      Alert.alert('Focus session complete', 'Great work. Time for a break.');
    } else {
      focusSessionStartedAtRef.current = null;
      Alert.alert('Break complete', 'Ready to focus again?');
    }
  }, [remaining, timerRunning, focusMode, updateData]);

  const startTimerForMode = (mode: FocusMode, seconds: number) => {
    const durationSeconds = Math.max(1, Math.round(seconds));
    const endAt = Date.now() + durationSeconds * 1000;
    if (mode === 'work') {
      if (focusSessionStartedAtRef.current === null) {
        focusSessionStartedAtRef.current = Date.now();
      }
      const blockedPackages = dataRef.current.blockedApps
        .filter((app) => app.blockDuringFocus)
        .map((app) => app.packageName);
      if (blockedPackages.length > 0 && accessibilityEnabled) {
        setNativeBlockState(blockedPackages, 'Focus session active', endAt);
        setIsBlocking(true);
      }
    }
    setFocusMode(mode);
    setRemaining(durationSeconds);
    setTimerEndAt(endAt);
    setTimerRunning(true);
    void scheduleTimerNotification(new Date(endAt));
  };

  const startFocusTimer = () => {
    const minutes = focusMode === 'work' ? data.focus.workMins
      : focusMode === 'shortBreak' ? data.focus.shortMins : data.focus.longMins;
    startTimerForMode(focusMode, remaining > 0 ? remaining : minutes * 60);
  };

  const startQuickFocus = () => {
    if (timerRunning) pauseFocusTimer();
    startTimerForMode('work', dataRef.current.focus.workMins * 60);
  };

  const pauseFocusTimer = () => {
    if (timerEndAt !== null) setRemaining(Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000)));
    if (focusMode === 'work' && focusSessionStartedAtRef.current !== null) {
      const elapsedMinutes = (Date.now() - focusSessionStartedAtRef.current) / 60_000;
      focusSessionStartedAtRef.current = null;
      updateData((current) => ({
        ...current,
        focus: { ...current.focus, totalFocusMinsToday: current.focus.totalFocusMinsToday + elapsedMinutes },
      }));
    } else {
      focusSessionStartedAtRef.current = null;
    }
    setTimerRunning(false);
    setTimerEndAt(null);
    clearNativeBlockState();
    setIsBlocking(false);
    void cancelTimerNotification();
  };

  const selectFocusMode = (mode: FocusMode) => {
    if (timerRunning) pauseFocusTimer();
    const minutes = mode === 'work' ? data.focus.workMins
      : mode === 'shortBreak' ? data.focus.shortMins : data.focus.longMins;
    setFocusMode(mode);
    setRemaining(minutes * 60);
  };

  const changeAlarmActive = (id: string, active: boolean) => {
    updateData((current) => ({
      ...current,
      alarms: current.alarms.map((alarm) => alarm.id === id ? { ...alarm, active } : alarm),
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
      id: `${Date.now()}`,
      time: alarmTime,
      label: alarmLabel.trim(),
      category: alarmCategory,
      challenge: alarmChallenge,
      days: alarmDays,
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
      id: `${Date.now()}`,
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
      const tasks = current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
      const completing = current.tasks.find((task) => task.id === id)?.completed === false;
      if (!completing) return { ...current, tasks };
      const today = todayKey();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const streak = current.lastStreakDate === today
        ? current.streak
        : current.lastStreakDate === todayKey(yesterday) ? current.streak + 1 : 1;
      return { ...current, tasks, streak, lastStreakDate: today };
    });
  };

  const deleteTask = (id: string) => {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
      focus: { ...current.focus, linkedTaskId: current.focus.linkedTaskId === id ? '' : current.focus.linkedTaskId },
    }));
  };

  const saveTimerSettings = () => {
    const values = [Number(settings.work), Number(settings.short), Number(settings.long)];
    if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 120)) {
      Alert.alert('Check timer lengths', 'Each duration must be a whole number between 1 and 120 minutes.');
      return;
    }
    updateData((current) => ({
      ...current,
      focus: { ...current.focus, workMins: values[0], shortMins: values[1], longMins: values[2] },
    }));
    if (timerRunning) pauseFocusTimer();
    setModal(null);
    const minutes = focusMode === 'work' ? values[0]
      : focusMode === 'shortBreak' ? values[1] : values[2];
    setRemaining(minutes * 60);
  };

  const dismissAlarm = () => setRinging(null);

  const snoozeAlarm = () => {
    if (!ringing) return;
    const snoozed = new Date(Date.now() + 5 * 60 * 1000);
    const time = `${String(snoozed.getHours()).padStart(2, '0')}:${String(snoozed.getMinutes()).padStart(2, '0')}`;
    const snooze: Alarm = {
      id: `${Date.now()}`,
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
    if (Number(mathInput) === mathQuestion.answer && mathInput.trim()) {
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

  const resetFocusTimer = () => {
    pauseFocusTimer();
    const minutes = focusMode === 'work' ? data.focus.workMins
      : focusMode === 'shortBreak' ? data.focus.shortMins : data.focus.longMins;
    setRemaining(minutes * 60);
  };

  const linkFocusTask = (id: string) => {
    updateData((current) => ({ ...current, focus: { ...current.focus, linkedTaskId: id } }));
  };

  const activeAlarms = data.alarms.filter((alarm) => alarm.active);
  const completedCount = data.tasks.filter((task) => task.completed).length;
  const progress = data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0;
  const nextAlarm = activeAlarms
    .map((alarm) => ({ alarm, date: nextAlarmDate(alarm) }))
    .filter((item): item is { alarm: Alarm; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const fetchApps = async () => {
    setLoadingApps(true);
    try {
      const apps = await getInstalledApps();
      setInstalledApps(apps);
    } catch (error) {
      Alert.alert('Could not get apps', String(error));
    } finally {
      setLoadingApps(false);
    }
  };

  const openAddAppPicker = () => {
    if (!isNativeBlockingAvailable()) {
      Alert.alert(
        'Development build required',
        'App blocking uses a native Android service and is not available in Expo Go. Install a development or production build of AST Time to use it.',
      );
      return;
    }
    setModal('appPicker');
    void fetchApps();
  };

  const selectAppToBlock = (packageName: string, label: string) => {
    if (data.blockedApps.some((app) => app.packageName === packageName)) {
      Alert.alert('Already added', 'This app is already in your block list.');
      return;
    }
    const app: BlockedApp = {
      packageName,
      label,
      dailyLimitMinutes: 60,
      blockDuringFocus: true,
      scheduleIds: [],
    };
    updateData((current) => ({ ...current, blockedApps: [...current.blockedApps, app] }));
  };

  const addBlockedApp = () => {
    if (!newAppPackage.trim() || !newAppLabel.trim()) {
      Alert.alert('Add an app', 'Enter both the package name and display label.');
      return;
    }
    const app: BlockedApp = {
      packageName: newAppPackage.trim(),
      label: newAppLabel.trim(),
      dailyLimitMinutes: 60,
      blockDuringFocus: true,
      scheduleIds: [],
    };
    updateData((current) => ({ ...current, blockedApps: [...current.blockedApps, app] }));
    setNewAppPackage('');
    setNewAppLabel('');
    setAddAppModal(false);
  };

  const removeBlockedApp = (packageName: string) => {
    updateData((current) => ({
      ...current,
      blockedApps: current.blockedApps.filter((app) => app.packageName !== packageName),
    }));
  };

  const toggleBlockedApp = (packageName: string, blockDuringFocus: boolean) => {
    updateData((current) => ({
      ...current,
      blockedApps: current.blockedApps.map((app) =>
        app.packageName === packageName ? { ...app, blockDuringFocus } : app,
      ),
    }));
  };

  const addSchedule = () => {
    if (!validTime(newScheduleStart) || !validTime(newScheduleEnd)) {
      Alert.alert('Check times', 'Use a valid 24-hour format, for example 21:00.');
      return;
    }
    if (newScheduleStart === newScheduleEnd) {
      Alert.alert('Check times', 'The start and end time must be different.');
      return;
    }
    if (newScheduleDays.length === 0) {
      Alert.alert('Select repeat days', 'Choose at least one day for this schedule.');
      return;
    }
    const schedule: BlockSchedule = {
      id: `schedule-${Date.now()}`,
      startTime: newScheduleStart,
      endTime: newScheduleEnd,
      days: [...newScheduleDays].sort(),
      enabled: true,
    };
    updateData((current) => ({ ...current, schedules: [...current.schedules, schedule] }));
    setNewScheduleDays([1, 2, 3, 4, 5]);
    setModal(null);
  };

  const removeSchedule = (id: string) => {
    updateData((current) => ({ ...current, schedules: current.schedules.filter((s) => s.id !== id) }));
  };

  const toggleSchedule = (id: string, enabled: boolean) => {
    updateData((current) => ({
      ...current,
      schedules: current.schedules.map((s) => (s.id === id ? { ...s, enabled } : s)),
    }));
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

  const clearAllData = () => {
    const next = defaultData();
    setTimerRunning(false);
    setTimerEndAt(null);
    setRemaining(next.focus.workMins * 60);
    setFocusMode('work');
    clearNativeBlockState();
    setIsBlocking(false);
    void cancelTimerNotification();
    setRinging(null);
    setModal(null);
    lastFiredRef.current = '';
    updateData(() => next);
    void syncNotifications([], false);
  };

  const exportData = async () => {
    try {
      await Share.share({
        title: 'AST Time data',
        message: JSON.stringify(dataRef.current, null, 2),
      });
    } catch (error) {
      Alert.alert('Could not export data', String(error));
    }
  };

  const handleOpenPermissions = () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not available', 'App blocking is only available on Android.');
      return;
    }
    if (!isNativeBlockingAvailable()) {
      Alert.alert(
        'Development build required',
        'App blocking uses a native Android service and is not available in Expo Go. Install a development or production build of AST Time to use it.',
      );
      return;
    }
    openAccessibilitySettings();
  };

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
    isBlocking,
    accessibilityEnabled,
    installedApps,
    loadingApps,
    activeAlarms,
    completedCount,
    progress,
    nextAlarm,
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
    linkFocusTask,
    resetAlarmForm,
    resetTaskForm,
    dismissAlarm,
    snoozeAlarm,
    verifyMath,
    openAddAppPicker,
    selectAppToBlock,
    addBlockedApp,
    removeBlockedApp,
    toggleBlockedApp,
    addSchedule,
    removeSchedule,
    toggleSchedule,
    toggleNotifications,
    setTheme,
    setTimeFormat,
    clearAllData,
    exportData,
    openPermissions: handleOpenPermissions,
    openAddAppModal: () => setAddAppModal(true),
    openAddScheduleModal: () => setModal('schedule'),
    addAppModal,
    addScheduleModal,
    newAppPackage,
    setNewAppPackage,
    newAppLabel,
    setNewAppLabel,
    newScheduleStart,
    setNewScheduleStart,
    newScheduleEnd,
    setNewScheduleEnd,
    newScheduleDays,
    setNewScheduleDays,
  };
}
