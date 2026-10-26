import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenHeading } from '../components/Common';
import { formatCountdown, formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, FocusMode, Tab } from '../types';

type Props = {
  data: AppData;
  mode: FocusMode;
  remaining: number;
  timerRunning: boolean;
  isBlocking: boolean;
  onMode: (mode: FocusMode) => void;
  onSettings: () => void;
  onToggleTimer: () => void;
  onReset: () => void;
  onQuickFocus: () => void;
};

const MODES: { id: FocusMode; label: string }[] = [
  { id: 'work', label: 'Focus' },
  { id: 'shortBreak', label: 'Short break' },
  { id: 'longBreak', label: 'Long break' },
];

export function FocusScreen({
  data,
  mode,
  remaining,
  timerRunning,
  isBlocking,
  onMode,
  onSettings,
  onToggleTimer,
  onReset,
  onQuickFocus,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const modeLabel = mode === 'work' ? 'DEEP FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Focus timer"
        subtitle="One thing at a time. You've got this."
        action={<Button title="Settings" onPress={onSettings} variant="secondary" small />}
      />

      <Card style={styles.focusCard}>
        <Text style={[styles.eyebrow, { textAlign: 'center' }]}>{modeLabel}</Text>
        <Text style={styles.focusTime}>{formatCountdown(remaining)}</Text>
        <Text style={styles.smallMuted}>
          Focus completed today: {Math.floor(data.focus.totalFocusMinsToday)} min
        </Text>
        <View style={styles.timerButtons}>
          <Button title={timerRunning ? 'Pause' : 'Start session'} onPress={onToggleTimer} />
          <Button title="Reset" onPress={onReset} variant="secondary" />
        </View>
        {isBlocking && (
          <View style={styles.blockingBadge}>
            <Text style={styles.blockingText}>🚫 Apps blocked during session</Text>
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Button title="Quick Focus (25 min)" onPress={onQuickFocus} variant="secondary" />
      </Card>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  focusCard: { alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.lg },
  focusTime: { color: COLORS.text, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: TRACKING.timer, fontSize: TYPE.timer },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  timerButtons: { flexDirection: 'row', gap: SPACE.sm, alignSelf: 'stretch' },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  blockingBadge: {
    marginTop: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.redMuted,
  },
  blockingText: { color: COLORS.red, fontSize: TYPE.caption, fontWeight: '700', textAlign: 'center' },
});