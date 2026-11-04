import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultData,
  formatCountdown,
  formatDuration,
  formatTime,
  todayKey,
  validTime,
} from '../src/constants.ts';

test('validTime accepts 24-hour values and rejects invalid input', () => {
  assert.equal(validTime('00:00'), true);
  assert.equal(validTime('23:59'), true);
  assert.equal(validTime('7:30'), false);
  assert.equal(validTime('24:00'), false);
  assert.equal(validTime('12:60'), false);
  assert.equal(validTime('noon'), false);
});

test('formatTime converts to 12-hour time without losing midnight or noon', () => {
  assert.equal(formatTime('00:05', '12h'), '12:05 AM');
  assert.equal(formatTime('12:05', '12h'), '12:05 PM');
  assert.equal(formatTime('23:59', '12h'), '11:59 PM');
  assert.equal(formatTime('23:59', '24h'), '23:59');
  assert.equal(formatTime('not-a-time', '12h'), 'not-a-time');
});

test('formatDuration and formatCountdown produce stable labels', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(59.6), '1h');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(90), '1h 30m');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(25 * 60), '25:00');
});

test('todayKey is a local calendar date', () => {
  assert.equal(todayKey(new Date(2026, 0, 2, 23, 59)), '2026-01-02');
});

test('defaultData is a fresh, internally consistent object', () => {
  const first = defaultData();
  const second = defaultData();
  assert.notEqual(first, second);
  assert.notEqual(first.notes, second.notes);
  assert.equal(first.timer.running, false);
  assert.equal(first.timer.remainingSeconds, first.focus.workMins * 60);
  assert.equal(first.focus.focusDate, todayKey());
});
