import { createDefaultTimer, nextTime, todayKey } from './constants';
import type { Alarm, AppData, FocusSession, FocusTimerState } from './types';

/**
 * A streak only counts while it is current. If the last completed day is older
 * than yesterday, the displayed streak resets to zero.
 */
export function effectiveStreak(streak: number, lastStreakDate: string, now = new Date()): number {
  if (streak <= 0 || !lastStreakDate) return 0;
  const today = todayKey(now);
  if (lastStreakDate === today) return streak;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return lastStreakDate === todayKey(yesterday) ? streak : 0;
}

export type TimerRecovery = {
  data: AppData;
  completedSession: FocusSession | null;
  timerExpired: boolean;
};

/**
 * Restores the persisted focus timer after a cold start. If the timer expired
 * while the app process was dead, the finished focus session is recorded so the
 * user does not lose statistics.
 */
export function recoverTimer(data: AppData, now = Date.now()): TimerRecovery {
  const timer = data.timer;
  if (!timer.running || timer.endsAt === null) {
    return { data, completedSession: null, timerExpired: false };
  }

  if (timer.endsAt > now) {
    return {
      data: {
        ...data,
        timer: { ...timer, remainingSeconds: Math.ceil((timer.endsAt - now) / 1000) },
      },
      completedSession: null,
      timerExpired: false,
    };
  }

  let next = data;
  let completedSession: FocusSession | null = null;
  if (timer.mode === 'work' && timer.sessionStartedAt !== null) {
    const elapsedMinutes = Math.max(0, (timer.endsAt - timer.sessionStartedAt) / 60_000);
    const duration = Math.round(elapsedMinutes);
    if (duration >= 1) {
      completedSession = {
        id: `focus-${timer.endsAt}`,
        startedAt: timer.sessionStartedAt,
        endedAt: timer.endsAt,
        duration,
        mode: 'work',
        completed: true,
      };
      const sessionDay = todayKey(new Date(timer.endsAt));
      next = {
        ...data,
        focus: {
          ...data.focus,
          totalFocusMinsToday: sessionDay === data.focus.focusDate
            ? data.focus.totalFocusMinsToday + elapsedMinutes
            : data.focus.totalFocusMinsToday,
        },
        focusSessions: [completedSession, ...data.focusSessions].slice(0, 200),
      };
    }
  }

  return {
    data: { ...next, timer: createDefaultTimer(next.focus.workMins) },
    completedSession,
    timerExpired: true,
  };
}

/**
 * Compares dotted numeric versions. Returns -1 when `a` is older than `b`, 0
 * when they are equal, and 1 when `a` is newer. A leading `v` and pre-release
 * suffixes are ignored; only the leading numeric components matter.
 */
export function compareVersions(a: string, b: string): number {
  const parts = (value: string) => value.trim().replace(/^v/i, '').split(/[-+]/)[0].split('.');
  const left = parts(a);
  const right = parts(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = Number.parseInt(left[index] ?? '0', 10);
    const rightPart = Number.parseInt(right[index] ?? '0', 10);
    const leftNumber = Number.isFinite(leftPart) ? leftPart : 0;
    const rightNumber = Number.isFinite(rightPart) ? rightPart : 0;
    if (leftNumber !== rightNumber) return leftNumber > rightNumber ? 1 : -1;
  }
  return 0;
}

export function timerForMode(
  mode: FocusTimerState['mode'],
  workMins: number,
  shortMins: number,
  longMins: number,
): FocusTimerState {
  const minutes = mode === 'work' ? workMins : mode === 'shortBreak' ? shortMins : longMins;
  return {
    mode,
    running: false,
    endsAt: null,
    remainingSeconds: minutes * 60,
    sessionStartedAt: null,
  };
}

/**
 * Re-enabling a one-time alarm whose scheduled moment has already passed must
 * schedule the next occurrence. Otherwise the switch would flip itself back off
 * on the next five-second tick without ever ringing.
 */
export function reactivateAlarm(alarm: Alarm, now = Date.now()): Alarm {
  if (alarm.days.length > 0) return { ...alarm, active: true };
  const fireAt = alarm.fireAt !== undefined && alarm.fireAt > now
    ? alarm.fireAt
    : nextTime(alarm.time).getTime();
  return { ...alarm, active: true, fireAt };
}

/**
 * Decides whether tapping a delivered alarm notification should open the
 * full-screen alarm. One-time alarms may already be marked inactive by the time
 * the tap is handled, so a recent `fireAt` is accepted; repeating alarms must
 * still be active and close to their scheduled time.
 */
export function shouldRingForNotification(alarm: Alarm, now = Date.now()): boolean {
  const fireAt = alarm.fireAt;
  if (alarm.days.length === 0) {
    if (fireAt === undefined) return false;
    return now >= fireAt - 60_000 && now <= fireAt + 60 * 60_000;
  }
  if (!alarm.active) return false;
  const [hour, minute] = alarm.time.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return false;
  const date = new Date(now);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const scheduledMinutes = hour * 60 + minute;
  const difference = Math.abs(nowMinutes - scheduledMinutes);
  return Math.min(difference, 24 * 60 - difference) <= 5;
}
