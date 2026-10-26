import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultData, nextTime, STORAGE_KEY, todayKey, validTime } from './constants';
import type { Alarm, AppData, Category, Priority, Task } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCategory = (value: unknown): value is Category =>
  value === 'Work' || value === 'Study' || value === 'Exercise' || value === 'Rest';

const isPriority = (value: unknown): value is Priority =>
  value === 'High' || value === 'Medium' || value === 'Low';

function parseAlarm(value: unknown, now: number): Alarm | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.time !== 'string'
    || !validTime(value.time)
    || typeof value.label !== 'string'
    || typeof value.active !== 'boolean') {
    return null;
  }

  const category = value.category === 'Personal' || isCategory(value.category)
    ? value.category
    : null;
  if (!category) return null;

  const days = Array.isArray(value.days)
    ? [...new Set(value.days.filter(
      (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
    ))].sort()
    : [];
  const challenge = value.challenge === 'math' ? 'math' : 'none';
  const fireAt = typeof value.fireAt === 'number' && Number.isFinite(value.fireAt)
    ? value.fireAt
    : days.length === 0 ? nextTime(value.time).getTime() : undefined;
  const expired = days.length === 0 && fireAt !== undefined && fireAt <= now;

  return {
    id: value.id,
    time: value.time,
    label: value.label,
    category,
    challenge,
    days,
    active: value.active && !expired,
    ...(fireAt === undefined ? {} : { fireAt }),
  };
}

function parseTask(value: unknown): Task | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.title !== 'string'
    || typeof value.time !== 'string'
    || !validTime(value.time)
    || typeof value.duration !== 'number'
    || !Number.isInteger(value.duration)
    || value.duration < 5
    || value.duration > 480
    || !isPriority(value.priority)
    || !isCategory(value.category)
    || typeof value.completed !== 'boolean') {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    time: value.time,
    duration: value.duration,
    priority: value.priority,
    category: value.category,
    completed: value.completed,
  };
}

function parseMinutes(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 120
    ? value
    : fallback;
}

export function parseAppData(value: unknown): AppData {
  const defaults = defaultData();
  if (!isRecord(value)) {
    throw new Error('Saved AST Time data has an invalid format.');
  }

  const tasks = Array.isArray(value.tasks)
    ? value.tasks.map(parseTask).filter((task): task is Task => task !== null)
    : defaults.tasks;
  const alarms = Array.isArray(value.alarms)
    ? value.alarms.map((alarm) => parseAlarm(alarm, Date.now()))
      .filter((alarm): alarm is Alarm => alarm !== null)
    : defaults.alarms;

  const focus = isRecord(value.focus) ? value.focus : {};
  const linkedTaskId = typeof focus.linkedTaskId === 'string' ? focus.linkedTaskId : '';
  const focusDate = typeof focus.focusDate === 'string' ? focus.focusDate : defaults.focus.focusDate;
  const dailyGoal = typeof focus.dailyGoal === 'number'
    && Number.isInteger(focus.dailyGoal) && focus.dailyGoal >= 0
    ? focus.dailyGoal
    : defaults.focus.dailyGoal;

  return {
    alarms,
    tasks,
    blockedApps: defaults.blockedApps,
    schedules: defaults.schedules,
    focusSessions: defaults.focusSessions,
    focus: {
      workMins: parseMinutes(focus.workMins, defaults.focus.workMins),
      shortMins: parseMinutes(focus.shortMins, defaults.focus.shortMins),
      longMins: parseMinutes(focus.longMins, defaults.focus.longMins),
      totalFocusMinsToday: typeof focus.totalFocusMinsToday === 'number'
        && Number.isFinite(focus.totalFocusMinsToday)
        && focus.totalFocusMinsToday >= 0
        ? focus.totalFocusMinsToday
        : defaults.focus.totalFocusMinsToday,
      focusDate,
      linkedTaskId: tasks.some((task) => task.id === linkedTaskId) ? linkedTaskId : '',
      dailyGoal,
    },
    streak: typeof value.streak === 'number' && Number.isInteger(value.streak) && value.streak >= 0
      ? value.streak
      : defaults.streak,
    lastStreakDate: typeof value.lastStreakDate === 'string' ? value.lastStreakDate : '',
    theme: value.theme === 'light' || value.theme === 'dark' || value.theme === 'system'
      ? value.theme
      : defaults.theme,
    timeFormat: value.timeFormat === '24h' || value.timeFormat === '12h'
      ? value.timeFormat
      : defaults.timeFormat,
    notificationsEnabled: typeof value.notificationsEnabled !== 'boolean'
      ? defaults.notificationsEnabled
      : value.notificationsEnabled,
  };
}

export async function loadAppData(): Promise<AppData> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === null) return defaultData();

  const data = parseAppData(JSON.parse(stored) as unknown);
  if (data.focus.focusDate !== todayKey()) {
    data.focus.focusDate = todayKey();
    data.focus.totalFocusMinsToday = 0;
  }
  return data;
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}