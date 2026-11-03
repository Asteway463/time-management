import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { formatTime } from '../constants';
import type { Alarm, Task, TimeFormat } from '../types';
import { LINE_HEIGHT, RADII, SHADOWS, SPACE, TRACKING, TYPE, useThemedStyles, type ThemeColors } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.screenHeading}>
      <View style={styles.screenHeadingCopy}>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenSubtitle}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

export function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function ProgressBar({ progress, color, height = 9 }: { progress: number; color: string; height?: number }) {
  const styles = useStyles();
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(width, {
      toValue: Math.max(0, Math.min(100, progress)),
      duration: 650,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, width]);
  return (
    <View style={[styles.progressTrack, { height }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

export function LiveClock({ timeFormat = '24h' }: { timeFormat?: TimeFormat }) {
  const styles = useStyles();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  return (
    <>
      <Text style={styles.clock}>{now.toLocaleTimeString([], {
        hour: timeFormat === '12h' ? 'numeric' : '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h',
      })}</Text>
      <Text style={styles.date}>{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
    </>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  small = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  small?: boolean;
  icon?: import('./AppIcon').AppIconName;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        small && styles.buttonSmall,
        pressed && styles.pressed,
      ]}
    >
      {icon && <AppIcon name={icon} size={16} color={variant === 'secondary' ? styles.buttonTextSecondary.color as string : '#FFFFFF'} />}
      <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}

export function EmptyCard({ text }: { text: string }) {
  const styles = useStyles();
  return <Card><Text style={styles.emptyText}>{text}</Text></Card>;
}

export function AlarmSummary({ alarm, timeFormat = '24h' }: { alarm: Alarm; timeFormat?: TimeFormat }) {
  const styles = useStyles();
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryTime}>{formatTime(alarm.time, timeFormat)}</Text>
      <View style={styles.flex}>
        <Text style={styles.cardText} numberOfLines={1}>{alarm.label}</Text>
        <Text style={styles.smallMuted}>{alarm.category}</Text>
      </View>
      <Text style={styles.activeLabel}>ACTIVE</Text>
    </View>
  );
}

export function TaskRow({
  task,
  onToggle,
  onDelete,
  timeFormat = '24h',
}: {
  task: Task;
  onToggle: () => void;
  onDelete?: () => void;
  timeFormat?: TimeFormat;
}) {
  const styles = useStyles();
  const priorityStyle = task.priority === 'High'
    ? styles.priorityHigh
    : task.priority === 'Medium' ? styles.priorityMedium : styles.priorityLow;
  const priorityTextStyle = task.priority === 'High'
    ? styles.priorityTextHigh
    : task.priority === 'Medium' ? styles.priorityTextMedium : styles.priorityTextLow;
  const checkScale = useRef(new Animated.Value(task.completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkScale, { toValue: task.completed ? 1 : 0, useNativeDriver: true, speed: 24, bounciness: 7 }).start();
  }, [checkScale, task.completed]);

  return (
    <View style={styles.taskRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}
        accessibilityState={{ checked: task.completed }}
        onPress={onToggle}
        style={({ pressed }) => [styles.checkbox, task.completed && styles.checkboxDone, pressed && styles.pressed]}
      >
        {task.completed && (
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <AppIcon name="check" size={15} color={styles.checkmark.color as string} strokeWidth={2.6} />
          </Animated.View>
        )}
      </Pressable>
      <View style={styles.taskCopy}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.smallMuted} numberOfLines={1}>{formatTime(task.time, timeFormat)} · {task.duration} min · {task.category}</Text>
      </View>
      <View style={[styles.priority, priorityStyle]}>
        <Text style={[styles.priorityText, priorityTextStyle]}>{task.priority}</Text>
      </View>
      {onDelete && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
          hitSlop={4}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <AppIcon name="close" size={16} color={styles.deleteText.color as string} />
        </Pressable>
      )}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

export function ModalHeading({ title, onClose }: { title: string; onClose: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
        <AppIcon name="close" size={18} color={styles.close.color as string} />
      </Pressable>
    </View>
  );
}

export function ChoiceRow<T extends string>({
  values,
  selected,
  onSelect,
  labels = {},
  equal = false,
}: {
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  labels?: Record<string, string>;
  equal?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.choices}>
      {values.map((value) => {
        const isSelected = selected === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [styles.choice, equal && styles.choiceEqual, isSelected && styles.choiceActive, pressed && styles.pressed]}
          >
            <Text style={[styles.choiceText, isSelected && styles.choiceTextActive]}>{labels[value] || value}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function useStyles() {
  return useThemedStyles(createStyles);
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  card: {
    padding: SPACE.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACE.md,
    ...SHADOWS.card,
  },
  progressTrack: { width: '100%', height: 9, borderRadius: RADII.pill, backgroundColor: COLORS.surfaceRaised, overflow: 'hidden', marginTop: SPACE.sm },
  progressFill: { height: '100%', borderRadius: RADII.pill },
  screenHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  screenHeadingCopy: { flex: 1, gap: SPACE.xs },
  screenTitle: { color: COLORS.text, fontSize: TYPE.heading, fontWeight: '800' },
  screenSubtitle: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  metric: {
    width: '47%',
    flexGrow: 1,
    minHeight: 78,
    padding: SPACE.md,
    backgroundColor: COLORS.surfaceInset,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  metricLabel: { color: COLORS.muted, fontSize: TYPE.caption, fontWeight: '600' },
  metricValue: { fontSize: TYPE.headingSmall, fontWeight: '800', marginTop: SPACE.xs },
  clock: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700', fontVariant: ['tabular-nums'] },
  date: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs / 2 },
  button: {
    minHeight: 48,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.xs,
  },
  buttonSecondary: { backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border },
  buttonDanger: { backgroundColor: COLORS.red },
  buttonSmall: { minHeight: 42, paddingHorizontal: SPACE.md },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: TYPE.body },
  buttonTextSecondary: { color: COLORS.textSecondary },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACE.md, fontSize: TYPE.body, lineHeight: 21 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceRaised,
  },
  summaryTime: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cardText: { color: COLORS.textSecondary, fontSize: TYPE.body, fontWeight: '600' },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
  activeLabel: { color: COLORS.green, fontSize: TYPE.micro, fontWeight: '800', letterSpacing: TRACKING.badge },
  flex: { flex: 1 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 48 },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  checkmark: { color: COLORS.background, fontWeight: '900', fontSize: TYPE.body },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { color: COLORS.text, fontWeight: '600', fontSize: TYPE.body },
  taskTitleDone: { color: COLORS.muted, textDecorationLine: 'line-through' },
  priority: { paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, borderRadius: RADII.pill },
  priorityHigh: { backgroundColor: COLORS.redMuted },
  priorityMedium: { backgroundColor: COLORS.amberMuted },
  priorityLow: { backgroundColor: COLORS.greenMuted },
  priorityText: { fontSize: TYPE.micro, fontWeight: '700' },
  priorityTextHigh: { color: COLORS.red },
  priorityTextMedium: { color: COLORS.amber },
  priorityTextLow: { color: COLORS.green },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: COLORS.red, fontSize: TYPE.heading, fontWeight: '600' },
  field: { gap: SPACE.sm },
  fieldLabel: { color: COLORS.textSecondary, fontSize: TYPE.small, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  modalTitle: { color: COLORS.text, fontSize: TYPE.headingSmall, fontWeight: '800' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  close: { color: COLORS.muted, fontSize: TYPE.symbol, lineHeight: LINE_HEIGHT.display },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  choice: { minHeight: 44, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADII.sm, backgroundColor: COLORS.surfaceRaised, justifyContent: 'center' },
  choiceEqual: { flex: 1, alignItems: 'center', paddingHorizontal: SPACE.xs },
  choiceActive: { backgroundColor: COLORS.primaryStrong },
  choiceText: { color: COLORS.muted, fontSize: TYPE.small, fontWeight: '600' },
  choiceTextActive: { color: COLORS.white },
});
