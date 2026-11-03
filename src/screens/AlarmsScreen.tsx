import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, EmptyCard, ScreenHeading } from '../components/Common';
import { formatTime, WEEKDAY_NAMES } from '../constants';
import { LAYOUT, RADII, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { Alarm, TimeFormat } from '../types';

type Props = {
  alarms: Alarm[];
  onAddAlarm: () => void;
  onToggleAlarm: (id: string, active: boolean) => void;
  onDeleteAlarm: (id: string) => void;
  timeFormat: TimeFormat;
};

export function AlarmsScreen({
  alarms,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  timeFormat,
}: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const sortedAlarms = [...alarms].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.time.localeCompare(b.time);
  });

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Alarms"
        subtitle="Set reminders for the moments that matter."
        action={<Button title="Add alarm" onPress={onAddAlarm} small />}
      />

      {sortedAlarms.length === 0 ? (
        <EmptyCard text="No alarms yet. Add one to get a reminder at a specific time." />
      ) : (
        sortedAlarms.map((alarm) => {
          const repeat = alarm.days.length === 0
            ? 'One time'
            : alarm.days.map((day) => WEEKDAY_NAMES[day].slice(0, 3)).join(', ');
          return (
            <Card key={alarm.id}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={[styles.time, !alarm.active && styles.inactive]}>{formatTime(alarm.time, timeFormat)}</Text>
                  <Text style={[styles.label, !alarm.active && styles.inactive]} numberOfLines={1}>{alarm.label}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {repeat} · {alarm.category}{alarm.challenge === 'math' ? ' · Math challenge' : ''}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`${alarm.active ? 'Disable' : 'Enable'} ${alarm.label} alarm`}
                  value={alarm.active}
                  onValueChange={(active) => onToggleAlarm(alarm.id, active)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${alarm.label} alarm`}
                  onPress={() => onDeleteAlarm(alarm.id)}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  flex: { flex: 1, minWidth: 0 },
  time: { color: COLORS.text, fontSize: TYPE.heading, fontWeight: '800', fontVariant: ['tabular-nums'] },
  label: { color: COLORS.textSecondary, fontSize: TYPE.body, fontWeight: '600', marginTop: SPACE.xs },
  meta: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
  inactive: { color: COLORS.muted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  deleteButton: { minHeight: 36, paddingHorizontal: SPACE.md, borderRadius: RADII.sm, justifyContent: 'center', backgroundColor: COLORS.redMuted },
  deleteText: { color: COLORS.red, fontSize: TYPE.small, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});
