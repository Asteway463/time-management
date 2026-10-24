import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button, Card, ChoiceRow, ScreenHeading } from '../components/Common';
import { COLORS, LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE } from '../theme';
import type { AppData, FocusMode, Task } from '../types';

type Props = {
  data: AppData;
  tasks: Task[];
  mode: FocusMode;
  remaining: number;
  timerRunning: boolean;
  onMode: (mode: FocusMode) => void;
  onSettings: () => void;
  onToggleTimer: () => void;
  onReset: () => void;
  onLinkTask: (id: string) => void;
};

const MODES: { id: FocusMode; label: string }[] = [
  { id: 'work', label: 'Focus' },
  { id: 'shortBreak', label: 'Short break' },
  { id: 'longBreak', label: 'Long break' },
];

export function FocusScreen({
  data,
  tasks,
  mode,
  remaining,
  timerRunning,
  onMode,
  onSettings,
  onToggleTimer,
  onReset,
  onLinkTask,
}: Props) {
  const { width } = useWindowDimensions();
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const modeLabel = mode === 'work' ? 'DEEP FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  const taskOptions = tasks.filter((task) => !task.completed);
  const taskLabels = Object.fromEntries(taskOptions.map((task) => [task.id, task.title]));

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Focus timer"
        subtitle="One thing at a time. You’ve got this."
        action={<Button title="Settings" onPress={onSettings} variant="secondary" small />}
      />
      <Card style={styles.focusCard}>
        <View style={styles.modeRow}>
          <ChoiceRow
            values={MODES.map(({ id }) => id)}
            selected={mode}
            onSelect={onMode}
            labels={Object.fromEntries(MODES.map(({ id, label }) => [id, label]))}
            equal
          />
        </View>
        <Text style={[styles.focusTime, { fontSize: Math.min(Math.max(width * 0.19, 54), 76) }]}>{minutes}:{seconds}</Text>
        <Text style={styles.eyebrow}>{modeLabel}</Text>
        <View style={styles.timerButtons}>
          <Button title={timerRunning ? 'Pause' : 'Start session'} onPress={onToggleTimer} />
          <Button title="Reset" onPress={onReset} variant="secondary" />
        </View>
        <Text style={styles.smallMuted}>Focus completed today: {Math.floor(data.focus.totalFocusMinsToday)} min</Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Focus on a task</Text>
        <Text style={styles.muted}>Choose a task to keep it in view during your session.</Text>
        <ChoiceRow
          values={['', ...taskOptions.map((task) => task.id)]}
          selected={data.focus.linkedTaskId}
          onSelect={onLinkTask}
          labels={{ '': 'General focus', ...taskLabels }}
        />
        {data.focus.linkedTaskId ? (
          <Text style={styles.linkedTask}>{tasks.find((task) => task.id === data.focus.linkedTaskId)?.title}</Text>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  focusCard: { alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.lg },
  modeRow: { backgroundColor: COLORS.surfaceInset, padding: SPACE.xs, borderRadius: RADII.md, alignSelf: 'stretch' },
  focusTime: { color: COLORS.text, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: TRACKING.timer },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  timerButtons: { flexDirection: 'row', gap: SPACE.sm, alignSelf: 'stretch' },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  linkedTask: { color: COLORS.green, fontSize: TYPE.small, fontWeight: '600', marginTop: SPACE.xs },
});
