import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { defaultData, nextAlarmDate, nextTime, STORAGE_KEY, todayKey, validTime } from './constants';
import type { Alarm, AppData, Category, FocusMode, Priority, Tab, Task } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useChronoFlow() {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
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
  const focusSessionStartedAtRef = useRef<number | null>(null);
  const dataRef = useRef(data);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  dataRef.current = data;

  const persist = (next: AppData) => {
    persistQueueRef.current = persistQueueRef.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  const syncAlarmNotifications = useCallback(async (alarms: Alarm[], askPermission: boolean) => {
    if (Platform.OS === 'web') return;
    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && askPermission) {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (!permission.granted) {
        if (askPermission) {
          Alert.alert(
            'Notifications are off',
            'The alarm is saved, but Expo cannot notify you while the app is closed until notification permission is enabled.',
          );
        }
        return;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alarms', {
          name: 'Alarms',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 500, 250, 500],
        });
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.alarmId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      for (const alarm of alarms.filter((item) => item.active)) {
        const content: Notifications.NotificationContentInput = {
          title: alarm.label || 'ChronoFlow alarm',
          body: `${alarm.category} alarm · ${alarm.time}`,
          sound: 'default',
          data: { alarmId: alarm.id },
          ...(Platform.OS === 'android' ? { channelId: 'alarms' } : {}),
        };
        if (alarm.days.length > 0) {
          for (const day of alarm.days) {
            await Notifications.scheduleNotificationAsync({
              content,
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: day + 1,
                hour: Number(alarm.time.slice(0, 2)),
                minute: Number(alarm.time.slice(3, 5)),
              },
            });
          }
        } else {
          const fireAt = alarm.fireAt ?? nextTime(alarm.time).getTime();
          await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(fireAt),
            },
          });
        }
      }
    } catch (error) {
      Alert.alert('Could not schedule alarm notifications', String(error));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<AppData>;
        const defaults = defaultData();
        const loadedData: AppData = {
          ...defaults,
          ...parsed,
          alarms: Array.isArray(parsed.alarms)
            ? parsed.alarms.map((alarm) => {
              const migrated = alarm.days.length === 0 && alarm.fireAt === undefined
                ? { ...alarm, fireAt: nextTime(alarm.time).getTime() }
                : alarm;
              return migrated.days.length === 0 && migrated.fireAt !== undefined && migrated.fireAt <= Date.now()
                ? { ...migrated, active: false }
                : migrated;
            })
            : defaults.alarms,
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaults.tasks,
          focus: { ...defaults.focus, ...parsed.focus },
        };
        if (loadedData.focus.focusDate !== todayKey()) {
          loadedData.focus.focusDate = todayKey();
          loadedData.focus.totalFocusMinsToday = 0;
        }
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
    void syncAlarmNotifications(dataRef.current.alarms, false);
  }, [loaded, syncAlarmNotifications]);

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
    if (!timerNotificationRef.current || Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(timerNotificationRef.current);
    } catch (error) {
      Alert.alert('Could not cancel timer notification', String(error));
    } finally {
      timerNotificationRef.current = null;
    }
  };

  const scheduleTimerNotification = async (date: Date) => {
    if (Platform.OS === 'web') return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return;
      timerNotificationRef.current = await Notifications.scheduleNotificationAsync({
        content: { title: 'Focus session complete', body: 'Your timer has finished.', sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    } catch (error) {
      Alert.alert('Could not schedule timer notification', String(error));
    }
  };

  useEffect(() => {
    if (!timerRunning || remaining > 0) return;
    setTimerRunning(false);
    setTimerEndAt(null);
    void cancelTimerNotification();
    if (focusMode === 'work') {
      const elapsedMinutes = focusSessionStartedAtRef.current === null
        ? dataRef.current.focus.workMins
        : Math.min(dataRef.current.focus.workMins, (Date.now() - focusSessionStartedAtRef.current) / 60_000);
      focusSessionStartedAtRef.current = null;
      updateData((current) => ({
        ...current,
        focus: { ...current.focus, totalFocusMinsToday: current.focus.totalFocusMinsToday + elapsedMinutes },
      }));
      Alert.alert('Focus session complete', 'Great work. Time for a break.');
    } else {
      focusSessionStartedAtRef.current = null;
      Alert.alert('Break complete', 'Ready to focus again?');
    }
  }, [remaining, timerRunning, focusMode, updateData]);

  const startFocusTimer = () => {
    const endAt = Date.now() + remaining * 1000;
    if (focusMode === 'work' && focusSessionStartedAtRef.current === null) {
      focusSessionStartedAtRef.current = Date.now();
    }
    setTimerEndAt(endAt);
    setTimerRunning(true);
    void scheduleTimerNotification(new Date(endAt));
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
    void syncAlarmNotifications(dataRef.current.alarms, active);
  };

  const deleteAlarm = (id: string) => {
    updateData((current) => ({ ...current, alarms: current.alarms.filter((alarm) => alarm.id !== id) }));
    void syncAlarmNotifications(dataRef.current.alarms, false);
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
    void syncAlarmNotifications(dataRef.current.alarms, true);
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
    void syncAlarmNotifications(dataRef.current.alarms, true);
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
    resetFocusTimer,
    openTimerSettings,
    linkFocusTask,
    resetAlarmForm,
    resetTaskForm,
    dismissAlarm,
    snoozeAlarm,
    verifyMath,
  };
}
