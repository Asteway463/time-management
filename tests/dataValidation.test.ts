import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultData } from '../src/constants.ts';
import { parseAppData } from '../src/dataValidation.ts';

test('parseAppData rejects values that are not objects', () => {
  assert.throws(() => parseAppData(null), /invalid format/);
  assert.throws(() => parseAppData([]), /invalid format/);
  assert.throws(() => parseAppData('state'), /invalid format/);
});

test('parseAppData keeps the saved background image (regression)', () => {
  const saved = { ...defaultData(), backgroundImage: 'file:///data/user/0/app/files/backgrounds/a.jpg' };
  const parsed = parseAppData(saved);
  assert.equal(parsed.backgroundImage, saved.backgroundImage);
});

test('parseAppData fills notes and timer for data saved by older versions', () => {
  const legacy = { ...defaultData() } as Record<string, unknown>;
  delete legacy.notes;
  delete legacy.timer;
  delete legacy.jobs;

  const parsed = parseAppData(legacy);
  assert.deepEqual(parsed.notes, []);
  assert.equal(parsed.timer.running, false);
  assert.equal(parsed.timer.remainingSeconds, parsed.focus.workMins * 60);
});

test('parseAppData adds blocker, PDF, and alarm-sound defaults for older data', () => {
  const legacy = {
    ...defaultData(),
    alarms: [{
      id: 'alarm-legacy',
      time: '07:30',
      label: 'Wake up',
      category: 'Personal',
      challenge: 'none',
      active: true,
      days: [1],
    }],
  } as unknown as Record<string, unknown>;
  delete legacy.blocker;
  delete legacy.pdfs;

  const parsed = parseAppData(legacy);
  assert.equal(parsed.blocker.mode, 'allow-only');
  assert.deepEqual(parsed.blocker.packages, []);
  assert.equal(parsed.alarms[0].sound, 'default');
  assert.deepEqual(parsed.pdfs, []);
});

test('parseAppData keeps valid blocker settings and PDF records', () => {
  const data = defaultData();
  data.blocker = { mode: 'block-selected', packages: ['com.example.app'], playAudio: true, holdSeconds: 4 };
  data.pdfs = [{
    id: 'pdf-1',
    title: 'Notes',
    uri: 'file:///documents/pdfs/notes.pdf',
    size: 1234,
    addedAt: 1,
    lastOpenedAt: 2,
    lastPage: 7,
  }];

  const parsed = parseAppData(data);
  assert.deepEqual(parsed.blocker, data.blocker);
  assert.deepEqual(parsed.pdfs, data.pdfs);
});

test('parseAppData validates notes and drops malformed entries', () => {
  const data = defaultData();
  data.notes = [
    {
      id: 'note-1',
      title: 'Groceries',
      body: 'Milk',
      createdAt: 1,
      updatedAt: 2,
      pinned: true,
      deletedAt: null,
    },
    { id: 'broken' },
  ] as never;

  const parsed = parseAppData(data);
  assert.equal(parsed.notes.length, 1);
  assert.equal(parsed.notes[0].title, 'Groceries');
  assert.equal(parsed.notes[0].pinned, true);
});

test('parseAppData keeps a valid running timer', () => {
  const data = defaultData();
  data.timer = {
    mode: 'work',
    running: true,
    endsAt: 1_800_000_000_000,
    remainingSeconds: 1_200,
    sessionStartedAt: 1_799_999_000_000,
  };
  const parsed = parseAppData(data);
  assert.deepEqual(parsed.timer, data.timer);
});

test('parseAppData pauses a running timer that has no end time', () => {
  const data = defaultData();
  data.timer = {
    mode: 'work',
    running: true,
    endsAt: null,
    remainingSeconds: 1_200,
    sessionStartedAt: 1_799_999_000_000,
  };
  const parsed = parseAppData(data);
  assert.equal(parsed.timer.running, false);
  assert.equal(parsed.timer.endsAt, null);
});

test('parseAppData clamps an absurd remaining timer value', () => {
  const data = defaultData();
  data.timer = {
    mode: 'work',
    running: false,
    endsAt: null,
    remainingSeconds: 999_999,
    sessionStartedAt: null,
  };
  const parsed = parseAppData(data);
  assert.equal(parsed.timer.remainingSeconds, 24 * 60 * 60);
});

test('parseAppData drops invalid tasks while keeping valid ones', () => {
  const data = defaultData();
  data.tasks = [
    {
      id: 'task-1',
      title: 'Write report',
      time: '09:30',
      duration: 45,
      priority: 'High',
      category: 'Work',
      completed: false,
    },
    {
      id: 'task-2',
      title: 'Broken',
      time: '9:30',
      duration: 5,
      priority: 'High',
      category: 'Work',
      completed: false,
    },
  ] as never;

  const parsed = parseAppData(data);
  assert.equal(parsed.tasks.length, 1);
  assert.equal(parsed.tasks[0].id, 'task-1');
});

test('parseAppData trims over-long note text instead of accepting it unbounded', () => {
  const data = defaultData();
  data.notes = [{
    id: 'note-1',
    title: 'x'.repeat(500),
    body: 'y'.repeat(25_000),
    createdAt: 1,
    updatedAt: 1,
    pinned: false,
    deletedAt: null,
  }];

  const parsed = parseAppData(data);
  assert.equal(parsed.notes[0].title.length, 200);
  assert.equal(parsed.notes[0].body.length, 20_000);
});
