import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, ScreenHeading } from '../components/Common';
import { formatCountdown, formatDuration } from '../constants';
import { LAYOUT, SPACE, TRACKING, TYPE, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, FocusMode } from '../types';

type Props = {
  data: AppData;
  mode: FocusMode;
  remaining: number;
  timerRunning: boolean;
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
  onMode,
  onSettings,
  onToggleTimer,
  onReset,
  onQuickFocus,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const modeLabel = mode === 'work' ? 'DEEP FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  const timerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!timerRunning) {
      timerPulse.stopAnimation();
      timerPulse.setValue(1);
      return;
    }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(timerPulse, { toValue: 1.02, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(timerPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [timerPulse, timerRunning]);

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Focus timer"
        subtitle="One thing at a time. You've got this."
        action={<Button title="Settings" onPress={onSettings} variant="secondary" small />}
      />

      <Card style={styles.focusCard}>
        <ChoiceRow<FocusMode>
          values={MODES.map((item) => item.id)}
          selected={mode}
          onSelect={onMode}
          labels={Object.fromEntries(MODES.map((item) => [item.id, item.label]))}
          equal
        />
        <Text style={styles.eyebrow}>{modeLabel}</Text>
        <Animated.Text
          accessibilityLabel={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          style={[styles.focusTime, { transform: [{ scale: timerPulse }] }]}
        >
          {formatCountdown(remaining)}
        </Animated.Text>
        <Text style={styles.smallMuted}>
          Focus completed today: {formatDuration(data.focus.totalFocusMinsToday)}
        </Text>
        <View style={styles.timerButtons}>
          <View style={styles.flex}>
            <Button title={timerRunning ? 'Pause' : 'Start session'} onPress={onToggleTimer} />
          </View>
          <View style={styles.flex}>
            <Button title="Reset" onPress={onReset} variant="secondary" />
          </View>
        </View>
        {timerRunning && (
          <Text style={styles.runningHint}>The timer keeps its end time even if you leave the app.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Button title="Start a quick focus session" onPress={onQuickFocus} variant="secondary" />
      </Card>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  focusCard: { alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.lg },
  focusTime: { color: COLORS.text, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: TRACKING.timer, fontSize: TYPE.timer },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label, textAlign: 'center' },
  timerButtons: { flexDirection: 'row', gap: SPACE.sm, alignSelf: 'stretch' },
  flex: { flex: 1 },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs, textAlign: 'center' },
  runningHint: { color: COLORS.muted, fontSize: TYPE.caption, textAlign: 'center', lineHeight: 17 },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
});
