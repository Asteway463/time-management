import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultData } from '../src/constants.ts';
import { compareVersions, effectiveStreak, reactivateAlarm, recoverTimer, shouldRingForNotification, timerForMode } from '../src/logic.ts';
import type { Alarm } from '../src/types.ts';

const MINUTE = 60_000;

const alarm = (overrides: Partial<Alarm> = {}): Alarm => ({
  id: 'alarm-1',
  time: '07:30',
  label: 'Wake up',
  category: 'Personal',
  challenge: 'none',
  sound: 'default',
  active: false,
  days: [],
  ...overrides,
});

test('effectiveStreak keeps a streak completed today or yesterday', () => {
  const now = new Date(2026, 5, 15, 12, 0);
  assert.equal(effectiveStreak(5, '2026-06-15', now), 5);
  assert.equal(effectiveStreak(5, '2026-06-14', now), 5);
});

test('effectiveStreak resets a stale streak', () => {
  const now = new Date(2026, 5, 15, 12, 0);
  assert.equal(effectiveStreak(5, '2026-06-13', now), 0);
  assert.equal(effectiveStreak(0, '2026-06-15', now), 0);
  assert.equal(effectiveStreak(5, '', now), 0);
});

test('compareVersions orders dotted versions numerically', () => {
  assert.equal(compareVersions('2.0.0', '2.0.1'), -1);
  assert.equal(compareVersions('2.1.0', '2.0.9'), 1);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
  assert.equal(compareVersions('v2.0', '2.0.0'), 0);
  assert.equal(compareVersions('2.0.10', '2.0.9'), 1);
  assert.equal(compareVersions('2.0.0-beta.1', '2.0.0'), 0);
});

test('recoverTimer recalculates a still-running timer', () => {
  const now = Date.now();
  const data = defaultData();
  data.timer = {
    mode: 'work',
    running: true,
    endsAt: now + 60_000,
    remainingSeconds: 999,
    sessionStartedAt: now - 5 * MINUTE,
  };

  const recovery = recoverTimer(data, now);
  assert.equal(recovery.timerExpired, false);
  assert.equal(recovery.completedSession, null);
  assert.equal(recovery.data.timer.remainingSeconds, 60);
  assert.equal(recovery.data.timer.running, true);
});

test('recoverTimer records a work session that expired while the app was dead', () => {
  const now = Date.now();
  const endsAt = now - 1_000;
  const data = defaultData();
  data.focus.workMins = 25;
  data.timer = {
    mode: 'work',
    running: true,
    endsAt,
    remainingSeconds: 0,
    sessionStartedAt: endsAt - 25 * MINUTE,
  };

  const recovery = recoverTimer(data, now);
  assert.equal(recovery.timerExpired, true);
  assert.ok(recovery.completedSession);
  assert.equal(recovery.completedSession?.completed, true);
  assert.equal(recovery.completedSession?.duration, 25);
  assert.equal(recovery.data.focusSessions.length, 1);
  assert.equal(recovery.data.focus.totalFocusMinsToday, 25);
  assert.equal(recovery.data.timer.running, false);
  assert.equal(recovery.data.timer.remainingSeconds, 25 * 60);
});

test('recoverTimer does not add an old session to today\'s focus total', () => {
  const now = new Date(2026, 5, 16, 9, 0).getTime();
  const endsAt = new Date(2026, 5, 14, 18, 0).getTime();
  const data = defaultData();
  data.focus.focusDate = '2026-06-16';
  data.focus.workMins = 25;
  data.timer = {
    mode: 'work',
    running: true,
    endsAt,
    remainingSeconds: 0,
    sessionStartedAt: endsAt - 25 * MINUTE,
  };

  const recovery = recoverTimer(data, now);
  assert.equal(recovery.completedSession?.duration, 25);
  assert.equal(recovery.data.focusSessions.length, 1);
  assert.equal(recovery.data.focus.totalFocusMinsToday, 0);
});

test('recoverTimer discards a break timer that expired while the app was dead', () => {
  const now = Date.now();
  const data = defaultData();
  data.timer = {
    mode: 'shortBreak',
    running: true,
    endsAt: now - 1_000,
    remainingSeconds: 0,
    sessionStartedAt: null,
  };

  const recovery = recoverTimer(data, now);
  assert.equal(recovery.timerExpired, true);
  assert.equal(recovery.completedSession, null);
  assert.equal(recovery.data.focusSessions.length, 0);
  assert.equal(recovery.data.timer.mode, 'work');
});

test('recoverTimer leaves paused timers untouched', () => {
  const data = defaultData();
  data.timer = {
    mode: 'shortBreak',
    running: false,
    endsAt: null,
    remainingSeconds: 123,
    sessionStartedAt: null,
  };

  const recovery = recoverTimer(data, Date.now());
  assert.equal(recovery.data, data);
});

test('timerForMode uses the configured duration', () => {
  assert.equal(timerForMode('work', 25, 5, 15).remainingSeconds, 25 * 60);
  assert.equal(timerForMode('shortBreak', 25, 5, 15).remainingSeconds, 5 * 60);
  assert.equal(timerForMode('longBreak', 25, 8, 20).remainingSeconds, 20 * 60);
});

test('reactivateAlarm moves a past one-time alarm to its next occurrence', () => {
  const now = new Date(2026, 5, 15, 9, 0).getTime();
  const expired = alarm({ fireAt: now - MINUTE });
  const reactivated = reactivateAlarm(expired, now);
  assert.equal(reactivated.active, true);
  assert.ok((reactivated.fireAt ?? 0) > now);
  assert.equal(new Date(reactivated.fireAt as number).getHours(), 7);
  assert.equal(new Date(reactivated.fireAt as number).getMinutes(), 30);
});

test('reactivateAlarm keeps an upcoming one-time fire time and repeating alarms', () => {
  const now = Date.now();
  const upcoming = reactivateAlarm(alarm({ fireAt: now + 5 * MINUTE }), now);
  assert.equal(upcoming.fireAt, now + 5 * MINUTE);
  const repeating = reactivateAlarm(alarm({ days: [1, 3], fireAt: undefined }), now);
  assert.equal(repeating.active, true);
  assert.equal(repeating.fireAt, undefined);
});

test('shouldRingForNotification accepts a recently delivered one-time alarm', () => {
  const now = Date.now();
  assert.equal(shouldRingForNotification(alarm({ fireAt: now - 5 * MINUTE }), now), true);
  assert.equal(shouldRingForNotification(alarm({ fireAt: now - 2 * 60 * MINUTE }), now), false);
  assert.equal(shouldRingForNotification(alarm({ fireAt: undefined }), now), false);
});

test('shouldRingForNotification only accepts repeating alarms near their time', () => {
  const at = (hour: number, minute: number) => new Date(2026, 5, 15, hour, minute).getTime();
  const repeating = alarm({ days: [1], active: true });
  assert.equal(shouldRingForNotification(repeating, at(7, 32)), true);
  assert.equal(shouldRingForNotification(repeating, at(12, 0)), false);
  assert.equal(shouldRingForNotification({ ...repeating, active: false }, at(7, 32)), false);
});
