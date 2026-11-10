import test from 'node:test';
import assert from 'node:assert/strict';
import {
  breakDownGoal,
  coachInsights,
  parseDayPlan,
  summarizeText,
} from '../src/ai.ts';
import { defaultData } from '../src/constants.ts';

test('parseDayPlan reads times, durations, categories, and priorities', () => {
  const result = parseDayPlan('Study maths for 45 minutes at 9am, gym at 6pm\nurgent report at 14:30 for 1 hour');
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items[0], {
    title: 'Study maths',
    time: '09:00',
    duration: 45,
    priority: 'Medium',
    category: 'Study',
  });
  assert.equal(result.items[1].time, '18:00');
  assert.equal(result.items[1].category, 'Exercise');
  assert.equal(result.items[2].time, '14:30');
  assert.equal(result.items[2].duration, 60);
  assert.equal(result.items[2].priority, 'High');
});

test('parseDayPlan keeps comma-separated title fragments together', () => {
  const result = parseDayPlan('Read chapter 3, pages 10-20 for 30 minutes');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Read chapter 3, pages 10-20');
  assert.equal(result.items[0].duration, 30);
});

test('parseDayPlan assigns fallback times in sequence', () => {
  const result = parseDayPlan('write report for 20 minutes\nreview report for 10 minutes', {
    startMinutes: 10 * 60,
  });
  assert.equal(result.usedFallbackTime, true);
  assert.equal(result.items[0].time, '10:00');
  assert.equal(result.items[1].time, '10:20');
});

test('breakDownGoal returns a practical first-session plan', () => {
  const steps = breakDownGoal('Finish my final project');
  assert.equal(steps.length, 4);
  assert.equal(steps[0].duration, 10);
  assert.ok(steps.some((step) => step.duration === 25));
  assert.ok(steps.every((step) => step.title.includes('Finish my final project')));
});

test('summarizeText shortens long text without inventing sentences', () => {
  const text = [
    'The project needs a design.',
    'The design needs colors.',
    'Colors should be blue.',
    'The project deadline is Friday.',
    'Friday is soon.',
    'The team meets on Monday.',
  ].join(' ');
  const summary = summarizeText(text, 2);
  assert.ok(summary.length > 0);
  assert.ok(summary.length < text.length);
  assert.ok(text.includes(summary.split(' ').slice(0, 2).join(' ')));
});

test('coachInsights reacts to an empty day and high-priority work', () => {
  const data = defaultData();
  data.focus.dailyGoal = 60;
  const empty = coachInsights(data, new Date(2026, 4, 4, 10, 0));
  assert.ok(empty.some((insight) => insight.action === 'focus'));

  data.tasks = [
    { id: '1', title: 'A', time: '09:00', duration: 30, priority: 'High', category: 'Work', completed: false },
    { id: '2', title: 'B', time: '10:00', duration: 30, priority: 'High', category: 'Study', completed: false },
  ];
  const busy = coachInsights(data, new Date(2026, 4, 4, 10, 0));
  assert.ok(busy.some((insight) => /urgent/i.test(insight.title)));
});
