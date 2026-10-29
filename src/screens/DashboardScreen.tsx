import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlarmSummary, Button, Card, Metric, ProgressBar, TaskRow } from '../components/Common';
import { AppIcon } from '../components/AppIcon';
import { formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { Alarm, AppData, Tab, TimeFormat } from '../types';

type Props = {
  data: AppData;
  activeAlarms: Alarm[];
  completedCount: number;
  progress: number;
  onNavigate: (tab: Tab) => void;
  onAddAlarm: () => void;
  onAddTask: () => void;
  onToggleTask: (id: string) => void;
  timeFormat: TimeFormat;
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
  timeFormat,
}: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>YOUR DAILY OVERVIEW</Text>
        <Text style={styles.heroTitle}>Welcome back</Text>
        <Text style={styles.muted}>A little structure makes room for great work.</Text>
        <View style={styles.metrics}>
          <Metric label="Done today" value={`${completedCount}/${data.tasks.length}`} color={colors.green} />
          <Metric label="Focus time" value={formatDuration(data.focus.totalFocusMinsToday)} color={colors.primary} />
          <Metric label="Alarms" value={`${activeAlarms.length}`} color={colors.amber} />
          <Metric label="Progress" value={`${progress}%`} color={colors.green} />
        </View>
      </View>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Today’s schedule progress</Text>
          <Text style={styles.accentText}>{progress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
          <ProgressBar progress={progress} color={colors.green} />
        </View>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Upcoming alarms</Text>
          <Pressable accessibilityRole="button" onPress={onAddAlarm}><Text style={styles.link}>Manage</Text></Pressable>
        </View>
        {activeAlarms.slice(0, 3).map((alarm) => <AlarmSummary key={alarm.id} alarm={alarm} timeFormat={timeFormat} />)}
        {activeAlarms.length === 0 && <Text style={styles.emptyText}>No alarms set yet</Text>}
        <Button title="Set an alarm" icon="plus" onPress={onAddAlarm} variant="secondary" />
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Today’s tasks..</Text>
          <Pressable accessibilityRole="button" onPress={() => onNavigate('home')}><Text style={styles.link}>Open planner</Text></Pressable>
        </View>
        {data.tasks.slice(0, 3).map((task) => (
          <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task.id)} timeFormat={timeFormat} />
        ))}
        {data.tasks.length === 0 && <Text style={styles.emptyText}>Your schedule is clear. Add a task to get started..</Text>}
        <Button title="Schedule a task" icon="plus" onPress={onAddTask} variant="secondary" />
      </Card>
      <View style={styles.streak}><AppIcon name="spark" size={17} color={colors.amber} /><Text style={styles.streakText}>{data.streak} day streak</Text></View>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
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
  link: { color: COLORS.primarySoft, fontWeight: '700', fontSize: TYPE.small, paddingVertical: SPACE.sm, paddingLeft: SPACE.sm },
  emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACE.md, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.relaxed },
  streak: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, padding: SPACE.sm },
  streakText: { color: COLORS.amber, fontWeight: '700' },
});
