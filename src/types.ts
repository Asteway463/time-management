export type Tab = 'home' | 'planner' | 'focus' | 'alarms' | 'stats' | 'notebook' | 'settings';
export type Category = 'Work' | 'Study' | 'Exercise' | 'Rest';
export type Priority = 'High' | 'Medium' | 'Low';
export type FocusMode = 'work' | 'shortBreak' | 'longBreak';
export type TimeFormat = '12h' | '24h';

export type FocusSession = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  duration: number;
  mode: FocusMode;
  completed: boolean;
};

export type Alarm = {
  id: string;
  time: string;
  label: string;
  category: Category | 'Personal';
  challenge: 'none' | 'math';
  active: boolean;
  days: number[];
  fireAt?: number;
};

export type Task = {
  id: string;
  title: string;
  time: string;
  duration: number;
  priority: Priority;
  category: Category;
  completed: boolean;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  /** `null` while the note is in the notebook, a timestamp once moved to trash. */
  deletedAt: number | null;
};

export type FocusState = {
  workMins: number;
  shortMins: number;
  longMins: number;
  totalFocusMinsToday: number;
  focusDate: string;
  dailyGoal: number;
};

/**
 * Snapshot of the focus timer. Persisted so a running session survives Android
 * killing the app process.
 */
export type FocusTimerState = {
  mode: FocusMode;
  running: boolean;
  /** Epoch milliseconds when the current run ends. */
  endsAt: number | null;
  /** Seconds left when paused (or when no session has started). */
  remainingSeconds: number;
  /** Epoch milliseconds when the current uninterrupted run started. */
  sessionStartedAt: number | null;
};

export type AppData = {
  alarms: Alarm[];
  tasks: Task[];
  notes: Note[];
  focusSessions: FocusSession[];
  focus: FocusState;
  timer: FocusTimerState;
  streak: number;
  lastStreakDate: string;
  theme: 'light' | 'dark' | 'system';
  timeFormat: TimeFormat;
  notificationsEnabled: boolean;
  backgroundImage: string;
};
