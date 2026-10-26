export type Tab = 'home' | 'focus' | 'blocking' | 'stats' | 'settings';

export type Category = 'Work' | 'Study' | 'Exercise' | 'Rest';
export type Priority = 'High' | 'Medium' | 'Low';
export type FocusMode = 'work' | 'shortBreak' | 'longBreak';
export type TimeFormat = '12h' | '24h';

export type BlockSchedule = {
  id: string;
  startTime: string;
  endTime: string;
  days: number[];
  enabled: boolean;
};

export type BlockedApp = {
  packageName: string;
  label: string;
  dailyLimitMinutes: number;
  blockDuringFocus: boolean;
  scheduleIds: string[];
};

export type FocusSession = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  duration: number;
  mode: FocusMode;
  blockedApps: string[];
  completed: boolean;
};

export type Alarm = {
  id: string;
  time: string;
  label: string;
  category: Category | 'Personal';
  challenge: 'none' | 'math';
  days: number[];
  active: boolean;
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

export type AppData = {
  alarms: Alarm[];
  tasks: Task[];
  blockedApps: BlockedApp[];
  schedules: BlockSchedule[];
  focusSessions: FocusSession[];
  focus: {
    workMins: number;
    shortMins: number;
    longMins: number;
    totalFocusMinsToday: number;
    focusDate: string;
    linkedTaskId: string;
    dailyGoal: number;
  };
  streak: number;
  lastStreakDate: string;
  theme: 'light' | 'dark' | 'system';
  timeFormat: TimeFormat;
  notificationsEnabled: boolean;
};