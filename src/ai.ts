import type { AppData, Category, Priority, Task } from './types';
import { formatDuration, todayKey } from './constants';

export type PlanItem = {
  title: string;
  time: string;
  duration: number;
  priority: Priority;
  category: Category;
};

export type PlanParseResult = {
  items: PlanItem[];
  skipped: string[];
  usedFallbackTime: boolean;
};

const PRIORITY_WORDS: { value: Priority; pattern: RegExp }[] = [
  { value: 'High', pattern: /\b(urgent|asap|important|critical|must|priority|deadline|exam|interview)\b/i },
  { value: 'Low', pattern: /\b(low priority|optional|someday|maybe|when i can|nice to have)\b/i },
];

const CATEGORY_WORDS: { value: Category; pattern: RegExp }[] = [
  { value: 'Exercise', pattern: /\b(gym|workout|run|running|walk|yoga|stretch|exercise|swim|cycling|football|sport)\b/i },
  { value: 'Study', pattern: /\b(study|read|reading|revise|revision|homework|assignment|course|class|learn|practice|exam|notes?)\b/i },
  { value: 'Rest', pattern: /\b(rest|break|lunch|dinner|breakfast|sleep|nap|relax|coffee|family|movie)\b/i },
  { value: 'Work', pattern: /\b(work|email|meeting|project|report|client|office|code|coding|design|presentation|invoice|budget|plan)\b/i },
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'over',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'as', 'i', 'you', 'we',
  'they', 'he', 'she', 'my', 'your', 'our', 'their', 'me', 'us', 'them', 'not', 'no', 'so',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'may',
]);

const pad = (value: number) => String(value).padStart(2, '0');

const minutesToTime = (minutes: number) => {
  const normalized = ((Math.round(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
};

function parseTime(text: string): number | null {
  const twelveHour = /\b(?:at|from|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(text);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] ?? '0');
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const isPm = twelveHour[3].toLowerCase().startsWith('p');
    if (hour === 12) hour = isPm ? 12 : 0;
    else if (isPm) hour += 12;
    return hour * 60 + minute;
  }

  const twentyFourHour = /\b(?:at|from|@)?\s*([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (twentyFourHour) {
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }
  return null;
}

function parseDuration(text: string): number | null {
  const minutes = /\b(?:for\s+)?(\d{1,3})\s*(?:min|mins|minute|minutes)\b/i.exec(text);
  if (minutes) {
    const value = Number(minutes[1]);
    return value >= 1 && value <= 480 ? value : null;
  }
  const hours = /\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b/i.exec(text);
  if (hours) {
    const value = Math.round(Number(hours[1]) * 60);
    return value >= 1 && value <= 480 ? value : null;
  }
  if (/\b(?:for\s+)?(an|one)\s+hour\b/i.test(text)) return 60;
  if (/\bhalf\s+an?\s+hour\b/i.test(text)) return 30;
  return null;
}

function detectPriority(text: string): Priority {
  return PRIORITY_WORDS.find((item) => item.pattern.test(text))?.value ?? 'Medium';
}

function detectCategory(text: string): Category {
  return CATEGORY_WORDS.find((item) => item.pattern.test(text))?.value ?? 'Work';
}

function cleanTitle(text: string): string {
  return text
    .replace(/\b(?:at|from|@)?\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, ' ')
    .replace(/\b(?:at|from|@)?\s*(?:[01]?\d|2[0-3]):[0-5]\d\b/g, ' ')
    .replace(/\b(?:for\s+)?\d{1,3}\s*(?:min|mins|minute|minutes|hour|hours|hr|hrs|h)\b/gi, ' ')
    .replace(/\b(?:for\s+)?(?:an|one)\s+hour\b/gi, ' ')
    .replace(/\bhalf\s+an?\s+hour\b/gi, ' ')
    .replace(/\b(?:urgent|asap|important|critical|must|low priority|optional|someday|maybe|nice to have)\b/gi, ' ')
    .replace(/^(?:please\s+)?(?:add|schedule|plan|create|remind me to|i need to|i have to|i want to|i should|work on|do)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
    .trim();
}

function splitSegments(input: string): string[] {
  const base = input
    .replace(/\r/g, '')
    .split(/\n|;|\.\s+(?=[A-Z0-9])/g);
  const segments: string[] = [];
  for (const part of base) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Split a comma-separated line only when the next chunk reads like a new
    // scheduled item. This keeps "Read chapter 3, pages 10-20" intact.
    const pieces = trimmed.split(/,\s*/);
    let current = pieces[0] ?? '';
    for (const piece of pieces.slice(1)) {
      const candidate = cleanTitle(piece);
      const startsNewItem = candidate.length >= 3
        && (parseTime(piece) !== null
          || /^(study|read|work|gym|run|walk|call|write|review|plan|email|meet|practice|exercise|clean|buy|cook|prepare|finish|start|continue|check|send|fix|build|design|learn|revise|attend|visit|pay|book)\b/i.test(candidate));
      if (startsNewItem) {
        if (current.trim()) segments.push(current.trim());
        current = piece;
      } else {
        current = `${current}, ${piece}`;
      }
    }
    if (current.trim()) segments.push(current.trim());
  }
  return segments;
}

/**
 * Turns a plain-language day plan into tasks. This is a deterministic,
 * on-device parser so it works offline, needs no API key, and never sends the
 * user's notes anywhere.
 */
export function parseDayPlan(
  input: string,
  options: { startMinutes?: number; defaultDuration?: number } = {},
): PlanParseResult {
  const startMinutes = options.startMinutes ?? 9 * 60;
  const defaultDuration = options.defaultDuration ?? 30;
  const segments = splitSegments(input);
  const items: PlanItem[] = [];
  const skipped: string[] = [];
  let cursor = startMinutes;
  let usedFallbackTime = false;

  for (const segment of segments.slice(0, 20)) {
    const title = cleanTitle(segment);
    if (!title || title.length < 2) {
      skipped.push(segment);
      continue;
    }
    const duration = parseDuration(segment) ?? defaultDuration;
    const parsedTime = parseTime(segment);
    if (parsedTime === null) usedFallbackTime = true;
    const time = parsedTime ?? cursor;
    items.push({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      time: minutesToTime(time),
      duration,
      priority: detectPriority(segment),
      category: detectCategory(segment),
    });
    cursor = Math.max(cursor, time) + duration;
  }

  return { items, skipped, usedFallbackTime };
}

export function planItemsToTasks(items: PlanItem[], createId: (prefix: string) => string): Task[] {
  return items.map((item) => ({
    id: createId('task'),
    title: item.title.slice(0, 100),
    time: item.time,
    duration: item.duration,
    priority: item.priority,
    category: item.category,
    completed: false,
  }));
}

export type CoachInsight = {
  tone: 'good' | 'warn' | 'info';
  title: string;
  detail: string;
  action?: 'focus' | 'plan' | 'alarms';
};

const pendingTasks = (data: AppData) => data.tasks.filter((task) => !task.completed);

export function nextBestTask(data: AppData): Task | null {
  const rank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  return [...pendingTasks(data)].sort((a, b) => {
    const byPriority = rank[a.priority] - rank[b.priority];
    return byPriority !== 0 ? byPriority : a.time.localeCompare(b.time);
  })[0] ?? null;
}

/**
 * Produces a small, explainable set of coaching insights from the user's own
 * data. No model inference or network call is involved.
 */
export function coachInsights(data: AppData, now = new Date()): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const pending = pendingTasks(data);
  const highPriority = pending.filter((task) => task.priority === 'High');
  const focusToday = data.focus.totalFocusMinsToday;
  const goal = data.focus.dailyGoal;
  const best = nextBestTask(data);
  const hour = now.getHours();

  if (focusToday === 0) {
    insights.push({
      tone: 'info',
      title: 'Start with one small block',
      detail: `A ${Math.min(25, data.focus.workMins)}-minute session is enough to build momentum. Your daily goal is ${formatDuration(goal)}.`,
      action: 'focus',
    });
  } else if (goal > 0 && focusToday >= goal) {
    insights.push({
      tone: 'good',
      title: 'Daily focus goal reached',
      detail: `${formatDuration(focusToday)} focused so far. Protect the rest of the day with a real break.`,
    });
  } else if (goal > 0) {
    const remaining = Math.max(0, goal - focusToday);
    insights.push({
      tone: 'info',
      title: 'Keep the streak moving',
      detail: `${formatDuration(remaining)} left to reach today's focus goal. One more session would do it.`,
      action: 'focus',
    });
  }

  if (best) {
    const overdue = best.time < `${pad(hour)}:${pad(now.getMinutes())}`;
    insights.push({
      tone: overdue ? 'warn' : 'info',
      title: overdue ? 'A planned task is behind schedule' : 'Best next task',
      detail: `${best.title} · ${best.priority.toLowerCase()} priority · ${formatDuration(best.duration)}${overdue ? `. It was planned for ${best.time}.` : '.'}`,
      action: 'plan',
    });
  } else if (data.tasks.length === 0) {
    insights.push({
      tone: 'info',
      title: 'Plan before you react',
      detail: 'Describe your day in plain language above and I will turn it into scheduled tasks.',
      action: 'plan',
    });
  }

  if (highPriority.length >= 2) {
    insights.push({
      tone: 'warn',
      title: 'Too many urgent tasks',
      detail: `${highPriority.length} high-priority tasks are still open. Pick one, finish it, then re-plan.`,
      action: 'plan',
    });
  }

  const activeAlarms = data.alarms.filter((alarm) => alarm.active).length;
  if (activeAlarms === 0 && pending.length > 0) {
    insights.push({
      tone: 'info',
      title: 'Nothing will remind you',
      detail: 'You have open tasks but no active alarm. Add one for your most important start time.',
      action: 'alarms',
    });
  }

  if (hour >= 21 && pending.length > 0) {
    insights.push({
      tone: 'warn',
      title: 'It is late',
      detail: 'Move unfinished low-priority tasks to tomorrow instead of stretching the night.',
      action: 'plan',
    });
  }

  return insights.slice(0, 4);
}

const splitSentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/([.!?])\s+/)
    .reduce<string[]>((sentences, part, index, parts) => {
      if (index % 2 === 0) {
        const punctuation = parts[index + 1] ?? '';
        const sentence = `${part}${punctuation}`.trim();
        if (sentence.length > 2) sentences.push(sentence);
      }
      return sentences;
    }, []);

function wordFrequency(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
    if (raw.length < 3 || STOP_WORDS.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return counts;
}

/** Extractive summary: picks the highest-signal sentences in their original order. */
export function summarizeText(text: string, maxSentences = 5): string {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  const frequency = wordFrequency(text);
  const scored = sentences.map((sentence, index) => {
    const words = (sentence.toLowerCase().match(/[a-z0-9']+/g) ?? [])
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
    const score = words.reduce((total, word) => total + (frequency.get(word) ?? 0), 0)
      / Math.max(4, words.length)
      + (index === 0 ? 1.5 : 0);
    return { sentence, index, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(' ');
}

export function summarizeNotes(data: AppData, maxSentences = 6): string {
  const notes = data.notes
    .filter((note) => note.deletedAt === null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);
  if (notes.length === 0) return '';
  const text = notes.map((note) => `${note.title}. ${note.body}`).join(' ');
  return summarizeText(text, maxSentences);
}

export type GoalStep = {
  title: string;
  duration: number;
  category: Category;
  priority: Priority;
};

/** Breaks a goal into a small, realistic first-session plan. */
export function breakDownGoal(goal: string): GoalStep[] {
  const cleaned = goal.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '');
  if (!cleaned) return [];
  const category = detectCategory(cleaned);
  const subject = cleaned.length > 70 ? `${cleaned.slice(0, 67)}...` : cleaned;
  return [
    {
      title: `Define what "done" means for ${subject}`,
      duration: 10,
      category,
      priority: 'High',
    },
    {
      title: `List the first three concrete actions for ${subject}`,
      duration: 15,
      category,
      priority: 'High',
    },
    {
      title: `Do a 25-minute first pass on ${subject}`,
      duration: 25,
      category,
      priority: 'Medium',
    },
    {
      title: `Review progress on ${subject} and plan the next session`,
      duration: 10,
      category,
      priority: 'Low',
    },
  ];
}

/** Today's completed focus time, useful for the assistant header. */
export function focusSummary(data: AppData, now = new Date()): string {
  const today = todayKey(now);
  if (data.focus.focusDate === today) {
    return formatDuration(data.focus.totalFocusMinsToday);
  }
  const sessionsToday = data.focusSessions.filter((session) => todayKey(new Date(session.startedAt)) === today);
  return formatDuration(sessionsToday.reduce((total, session) => total + session.duration, 0));
}
