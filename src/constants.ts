import type { AlarmSound, AppData, EnabledFeatures, FocusTimerState, Tab, Category } from './types';
import type { AppIconName } from './components/AppIcon';

export const STORAGE_KEY = 'asttime-state-v1';

export const APP_NAME = "Atna's Flow";

export const CATEGORIES: Category[] = ['Work', 'Study', 'Exercise', 'Rest'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const ALARM_SOUNDS: { id: AlarmSound; label: string; file: string }[] = [
  { id: 'default', label: 'System default', file: 'default' },
  { id: 'chime', label: 'Chime', file: 'chime.wav' },
  { id: 'bell', label: 'Bell', file: 'bell.wav' },
  { id: 'digital', label: 'Digital', file: 'digital.wav' },
  { id: 'gentle', label: 'Gentle', file: 'gentle.wav' },
];
export const TAB_LABELS: { id: Tab; label: string; icon: AppIconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'planner', label: 'Planner', icon: 'planner' },
  { id: 'focus', label: 'Focus', icon: 'focus' },
  { id: 'alarms', label: 'Alarms', icon: 'alarm' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'notebook', label: 'Notebook', icon: 'app' },
  { id: 'assistant', label: 'AI', icon: 'spark' },
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

/** Every feature enabled by default. */
export const defaultEnabledFeatures = (): EnabledFeatures => ({
  home: true,
  planner: true,
  focus: true,
  alarms: true,
  stats: true,
  notebook: true,
  assistant: true,
  library: true,
  settings: true,
});

export const todayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const createDefaultTimer = (workMins = 25): FocusTimerState => ({
  mode: 'work',
  running: false,
  endsAt: null,
  remainingSeconds: workMins * 60,
  sessionStartedAt: null,
});

export const defaultData = (): AppData => ({
  alarms: [],
  tasks: [],
  notes: [],
  focusSessions: [],
  focus: {
    workMins: 25,
    shortMins: 5,
    longMins: 15,
    totalFocusMinsToday: 0,
    focusDate: todayKey(),
    dailyGoal: 60,
  },
  timer: createDefaultTimer(),
  blocker: {
    mode: 'allow-only',
    packages: [],
    playAudio: false,
    holdSeconds: 3,
  },
  pdfs: [],
  streak: 0,
  lastStreakDate: '',
  theme: 'system',
  timeFormat: '12h',
  notificationsEnabled: true,
  backgroundImage: '',
  enabledFeatures: defaultEnabledFeatures(),
});

export const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const formatTime = (value: string, format: '12h' | '24h') => {
  if (format === '24h' || !validTime(value)) return value;
  const [hourText, minute] = value.split(':');
  const hour = Number(hourText);
  const period = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:${minute} ${period}`;
};

export const nextTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date;
};

export const formatDuration = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
