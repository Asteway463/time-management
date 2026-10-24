export type Tab = 'dashboard' | 'alarms' | 'tasks' | 'focus';
export type Category = 'Work' | 'Study' | 'Exercise' | 'Rest';
export type Priority = 'High' | 'Medium' | 'Low';
export type FocusMode = 'work' | 'shortBreak' | 'longBreak';

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
  focus: {
    workMins: number;
    shortMins: number;
    longMins: number;
    totalFocusMinsToday: number;
    focusDate: string;
    linkedTaskId: string;
  };
  streak: number;
  lastStreakDate: string;
};
