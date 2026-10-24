import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlarmSummary, Button, Card, Metric, TaskRow } from '../components/Common';
import { formatDuration } from '../constants';
import { COLORS, LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE } from '../theme';
import type { Alarm, AppData, Tab } from '../types';

type Props = {
  data: AppData;
  activeAlarms: Alarm[];
  completedCount: number;
  progress: number;
  onNavigate: (tab: Tab) => void;
  onAddAlarm: () => void;
  onAddTask: () => void;
  onToggleTask: (id: string) => void;
};

export function DashboardScreen({
  data,
  activeAlarms,
  completedCount,
  progress,
  onNavigate,
  onAddAlarm,
  onAddTask,
  onToggleTask,
}: Props) {
  return (
    <View style={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>YOUR DAILY OVERVIEW</Text>
        <Text style={styles.heroTitle}>Welcome back 👋</Text>
        <Text style={styles.muted}>A little structure makes room for great work.</Text>
        <View style={styles.metrics}>
          <Metric label="Done today" value={`${completedCount}/${data.tasks.length}`} color={COLORS.green} />
          <Metric label="Focus time" value={formatDuration(data.focus.totalFocusMinsToday)} color={COLORS.primary} />
          <Metric label="Alarms" value={`${activeAlarms.length}`} color={COLORS.amber} />
          <Metric label="Progress" value={`${progress}%`} color={COLORS.green} />
        </View>
      </View>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Today’s schedule progress</Text>
          <Text style={styles.accentText}>{progress}%</Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Upcoming alarms</Text>
          <Pressable accessibilityRole="button" onPress={() => onNavigate('alarms')}><Text style={styles.link}>Manage</Text></Pressable>
        </View>
        {activeAlarms.slice(0, 3).map((alarm) => <AlarmSummary key={alarm.id} alarm={alarm} />)}
        {activeAlarms.length === 0 && <Text style={styles.emptyText}>No alarms set yet.</Text>}
        <Button title="+ Set an alarm" onPress={onAddAlarm} variant="secondary" />
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Today’s tasks</Text>
          <Pressable accessibilityRole="button" onPress={() => onNavigate('tasks')}><Text style={styles.link}>Open planner</Text></Pressable>
        </View>
        {data.tasks.slice(0, 3).map((task) => (
          <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task.id)} />
        ))}
        {data.tasks.length === 0 && <Text style={styles.emptyText}>Your schedule is clear. Add a task to get started.</Text>}
        <Button title="+ Schedule a task" onPress={onAddTask} variant="secondary" />
      </Card>
      <Text style={styles.streak}>🔥  {data.streak}-day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  hero: {
    padding: SPACE.xl,
    borderRadius: RADII.xxl,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primaryStrong,
    gap: SPACE.xs,
  },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  heroTitle: { color: COLORS.text, fontSize: TYPE.heading, fontWeight: '800', marginTop: SPACE.xs },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  accentText: { color: COLORS.primarySoft, fontWeight: '800', fontSize: TYPE.body },
  progressTrack: { height: 9, borderRadius: RADII.pill, backgroundColor: COLORS.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: RADII.pill },
  link: { color: COLORS.primarySoft, fontWeight: '700', fontSize: TYPE.small, paddingVertical: SPACE.sm, paddingLeft: SPACE.sm },
  emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACE.md, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.relaxed },
  streak: { textAlign: 'center', color: COLORS.amber, fontWeight: '700', padding: SPACE.sm },
});
