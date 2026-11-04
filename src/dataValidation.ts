import { APP_NAME, createDefaultTimer, defaultData, nextTime, validTime } from './constants';
import type {
  Alarm,
  AppData,
  Category,
  FocusMode,
  FocusSession,
  FocusTimerState,
  Note,
  Priority,
  Task,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isCategory = (value: unknown): value is Category =>
  value === 'Work' || value === 'Study' || value === 'Exercise' || value === 'Rest';

const isPriority = (value: unknown): value is Priority =>
  value === 'High' || value === 'Medium' || value === 'Low';

const isFocusMode = (value: unknown): value is FocusMode =>
  value === 'work' || value === 'shortBreak' || value === 'longBreak';

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
  const fireAt = isFiniteNumber(value.fireAt)
    ? value.fireAt
    : days.length === 0 ? nextTime(value.time).getTime() : undefined;
  const expired = days.length === 0 && fireAt !== undefined && fireAt <= now;

  return {
    id: value.id,
    time: value.time,
    label: value.label.slice(0, 60),
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
    title: value.title.slice(0, 100),
    time: value.time,
    duration: value.duration,
    priority: value.priority,
    category: value.category,
    completed: value.completed,
  };
}

function parseNote(value: unknown): Note | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.title !== 'string'
    || typeof value.body !== 'string'
    || !isFiniteNumber(value.createdAt)
    || typeof value.pinned !== 'boolean') {
    return null;
  }

  const deletedAt = isFiniteNumber(value.deletedAt) ? value.deletedAt : null;
  return {
    id: value.id,
    title: value.title.slice(0, 200),
    body: value.body.slice(0, 20_000),
    createdAt: value.createdAt,
    updatedAt: isFiniteNumber(value.updatedAt) ? value.updatedAt : value.createdAt,
    pinned: value.pinned,
    deletedAt,
  };
}

function parseFocusSession(value: unknown): FocusSession | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || !isFiniteNumber(value.startedAt)
    || (value.endedAt !== null && !isFiniteNumber(value.endedAt))
    || !isFiniteNumber(value.duration)
    || value.duration < 0
    || !isFocusMode(value.mode)
    || typeof value.completed !== 'boolean') {
    return null;
  }

  return {
    id: value.id,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    duration: value.duration,
    mode: value.mode,
    completed: value.completed,
  };
}

function parseMinutes(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 120
    ? value
    : fallback;
}

function parseTimer(value: unknown, fallback: FocusTimerState): FocusTimerState {
  if (!isRecord(value) || !isFocusMode(value.mode)) return fallback;
  const endsAt = isFiniteNumber(value.endsAt) ? value.endsAt : null;
  const remainingSeconds = isFiniteNumber(value.remainingSeconds) && value.remainingSeconds >= 0
    ? Math.min(24 * 60 * 60, Math.round(value.remainingSeconds))
    : fallback.remainingSeconds;

  return {
    mode: value.mode,
    // A running timer without an end time could never finish, so treat it as paused.
    running: value.running === true && endsAt !== null,
    endsAt: value.running === true && endsAt !== null ? endsAt : null,
    remainingSeconds,
    sessionStartedAt: isFiniteNumber(value.sessionStartedAt) ? value.sessionStartedAt : null,
  };
}

export function parseAppData(value: unknown): AppData {
  const defaults = defaultData();
  if (!isRecord(value)) {
    throw new Error(`Saved ${APP_NAME} data has an invalid format.`);
  }

  const tasks = Array.isArray(value.tasks)
    ? value.tasks.map(parseTask).filter((task): task is Task => task !== null)
    : defaults.tasks;
  const alarms = Array.isArray(value.alarms)
    ? value.alarms.map((alarm) => parseAlarm(alarm, Date.now()))
      .filter((alarm): alarm is Alarm => alarm !== null)
    : defaults.alarms;
  const notes = Array.isArray(value.notes)
    ? value.notes.map(parseNote).filter((note): note is Note => note !== null)
    : defaults.notes;
  const focusSessions = Array.isArray(value.focusSessions)
    ? value.focusSessions.map(parseFocusSession).filter((session): session is FocusSession => session !== null)
    : defaults.focusSessions;

  const focus = isRecord(value.focus) ? value.focus : {};
  const focusDate = typeof focus.focusDate === 'string' ? focus.focusDate : defaults.focus.focusDate;
  const dailyGoal = typeof focus.dailyGoal === 'number'
    && Number.isInteger(focus.dailyGoal) && focus.dailyGoal >= 0
    ? focus.dailyGoal
    : defaults.focus.dailyGoal;
  const workMins = parseMinutes(focus.workMins, defaults.focus.workMins);

  return {
    alarms,
    tasks,
    notes,
    focusSessions,
    focus: {
      workMins,
      shortMins: parseMinutes(focus.shortMins, defaults.focus.shortMins),
      longMins: parseMinutes(focus.longMins, defaults.focus.longMins),
      totalFocusMinsToday: isFiniteNumber(focus.totalFocusMinsToday) && focus.totalFocusMinsToday >= 0
        ? focus.totalFocusMinsToday
        : defaults.focus.totalFocusMinsToday,
      focusDate,
      dailyGoal,
    },
    timer: parseTimer(value.timer, createDefaultTimer(workMins)),
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
    backgroundImage: typeof value.backgroundImage === 'string' ? value.backgroundImage : '',
  };
}
