import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyCard, Metric, ProgressBar, ScreenHeading, TaskRow } from '../components/Common';
import { AppIcon } from '../components/AppIcon';
import { formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, SPACE, TRACKING, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, Tab, TimeFormat } from '../types';

type Props = {
  data: AppData;
  completedCount: number;
  progress: number;
  onNavigate: (tab: Tab) => void;
  onAddTask: () => void;
  onAddAlarm: () => void;
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
  onAddAlarm,
  onToggleTask,
  onQuickFocus,
  timeFormat,
}: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const goalProgress = data.focus.dailyGoal > 0
    ? Math.min(100, Math.round((data.focus.totalFocusMinsToday / data.focus.dailyGoal) * 100))
    : 0;
  const hasTasks = data.tasks.length > 0;

  return (
    <View style={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.eyebrow}>TODAY'S FOCUS</Text>
        <Text style={styles.focusTime}>{formatDuration(data.focus.totalFocusMinsToday)}</Text>
        <Text style={styles.muted}>of {formatDuration(data.focus.dailyGoal)} goal</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: goalProgress }} style={{ width: '100%' }}>
          <ProgressBar progress={goalProgress} color={colors.green} />
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
          <Button title="Add" icon="plus" onPress={onAddTask} small variant="secondary" />
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
        <Button title="Set an alarm" onPress={onAddAlarm} variant="secondary" />
      </Card>

      <View style={styles.streak}><AppIcon name="spark" size={17} color={colors.amber} /><Text style={styles.streakText}>{data.streak} day streak</Text></View>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  heroCard: { alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.xs },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  focusTime: { color: COLORS.text, fontSize: TYPE.display, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  quickButton: { marginTop: SPACE.md, width: '100%' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  streak: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, padding: SPACE.sm },
  streakText: { color: COLORS.amber, fontWeight: '700' },
});
