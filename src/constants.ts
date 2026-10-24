import type { AppData, Alarm, Tab, Category } from './types';

export const STORAGE_KEY = 'chronoflow-state-v1';

export const CATEGORIES: Category[] = ['Work', 'Study', 'Exercise', 'Rest'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Home' },
  { id: 'alarms', label: 'Alarms' },
  { id: 'tasks', label: 'Planner' },
  { id: 'focus', label: 'Focus' },
];

export const todayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const defaultData = (): AppData => ({
  alarms: [],
  tasks: [],
  focus: {
    workMins: 25,
    shortMins: 5,
    longMins: 15,
    totalFocusMinsToday: 0,
    focusDate: todayKey(),
    linkedTaskId: '',
  },
  streak: 0,
  lastStreakDate: '',
});

export const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const nextTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date;
};

export const nextAlarmDate = (alarm: Alarm) => {
  if (alarm.days.length === 0) {
    if (alarm.fireAt !== undefined) return alarm.fireAt > Date.now() ? new Date(alarm.fireAt) : null;
    return nextTime(alarm.time);
  }
  const [hour, minute] = alarm.time.split(':').map(Number);
  const current = new Date();
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(current);
    candidate.setDate(current.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (alarm.days.includes(candidate.getDay()) && candidate.getTime() > current.getTime()) return candidate;
  }
  return null;
};

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
};
