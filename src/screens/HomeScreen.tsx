import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyCard, Metric, ScreenHeading, TaskRow } from '../components/Common';
import { formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, Tab, TimeFormat } from '../types';

type Props = {
  data: AppData;
  completedCount: number;
  progress: number;
  onNavigate: (tab: Tab) => void;
  onAddTask: () => void;
  onToggleTask: (id: string) => void;
  onQuickFocus: () => void;
  timeFormat: TimeFormat;
};

export function HomeScreen({
  data,
  completedCount,
  progress,
  onNavigate,
  onAddTask,
  onToggleTask,
  onQuickFocus,
  timeFormat,
}: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const goalProgress = Math.min(100, Math.round((data.focus.totalFocusMinsToday / data.focus.dailyGoal) * 100));
  const hasTasks = data.tasks.length > 0;

  return (
    <View style={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.eyebrow}>TODAY'S FOCUS</Text>
        <Text style={styles.focusTime}>{formatDuration(data.focus.totalFocusMinsToday)}</Text>
        <Text style={styles.muted}>of {formatDuration(data.focus.dailyGoal)} goal</Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: goalProgress }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
        </View>
        <Button title="Quick Focus Session" onPress={onQuickFocus} />
      </Card>

      <View style={styles.metricsGrid}>
        <Metric label="Tasks done" value={`${completedCount}/${data.tasks.length}`} color={colors.green} />
        <Metric label="Streak" value={`${data.streak} days`} color={colors.amber} />
        <Metric label="Sessions" value={`${data.focusSessions.length}`} color={colors.primary} />
        <Metric label="Progress" value={`${progress}%`} color={colors.green} />
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Today's tasks</Text>
          <Button title="+ Add" onPress={onAddTask} small variant="secondary" />
        </View>
        {hasTasks ? (
          data.tasks.slice(0, 3).map((task) => (
            <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task.id)} timeFormat={timeFormat} />
          ))
        ) : (
          <EmptyCard text="No tasks yet. Add one to plan your day." />
        )}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Quick actions</Text>
        </View>
        <Button title="Start Focus Timer" onPress={() => onNavigate('focus')} variant="secondary" />
      </Card>

      <Text style={styles.streak}>🔥 {data.streak} day streak</Text>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  heroCard: { alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.xs },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  focusTime: { color: COLORS.text, fontSize: TYPE.display, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  progressTrack: { height: 9, borderRadius: RADII.pill, backgroundColor: COLORS.surfaceRaised, overflow: 'hidden', marginTop: SPACE.sm },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: RADII.pill },
  quickButton: { marginTop: SPACE.md, width: '100%' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  streak: { textAlign: 'center', color: COLORS.amber, fontWeight: '700', padding: SPACE.sm },
});