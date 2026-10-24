import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, EmptyCard, ScreenHeading } from '../components/Common';
import { WEEKDAYS } from '../constants';
import { COLORS, LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE } from '../theme';
import type { Alarm } from '../types';

type Props = {
  alarms: Alarm[];
  nextAlarm?: { alarm: Alarm; date: Date };
  onAdd: () => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
};

export function AlarmsScreen({ alarms, nextAlarm, onAdd, onToggle, onDelete }: Props) {
  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Alarm manager"
        subtitle="Get reminders for the moments that matter."
        action={<Button title="+ Add" onPress={onAdd} small />}
      />
      <Card style={styles.nextAlarmCard}>
        <Text style={styles.eyebrow}>NEXT ALARM</Text>
        <Text style={styles.nextAlarmTime}>{nextAlarm ? nextAlarm.alarm.time : '--:--'}</Text>
        <Text style={styles.muted}>
          {nextAlarm ? `${nextAlarm.alarm.label} · ${nextAlarm.alarm.category}` : 'No active alarms scheduled'}
        </Text>
        {nextAlarm && <Text style={styles.smallMuted}>At {nextAlarm.date.toLocaleString()}</Text>}
      </Card>
      {alarms.length === 0 && <EmptyCard text="No alarms yet. Add your first alarm to get started." />}
      {alarms.map((alarm) => (
        <Card key={alarm.id} style={styles.alarmCard}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.tag}>{alarm.category}{alarm.challenge === 'math' ? ' · Math challenge' : ''}</Text>
              <Text style={styles.alarmTime}>{alarm.time}</Text>
              <Text style={styles.cardText}>{alarm.label}</Text>
            </View>
            <Switch
              accessibilityLabel={`Toggle ${alarm.label}`}
              value={alarm.active}
              onValueChange={(value) => onToggle(alarm.id, value)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>
          <View style={styles.dayRow}>
            {WEEKDAYS.map((day, index) => (
              <View key={`${alarm.id}-${index}`} style={[styles.dayDot, alarm.days.includes(index) && styles.dayDotActive]}>
                <Text style={[styles.dayText, alarm.days.includes(index) && styles.dayTextActive]}>{day}</Text>
              </View>
            ))}
            <Text style={styles.smallMuted}>{alarm.days.length ? 'Repeats weekly' : 'One time'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${alarm.label}`}
              hitSlop={4}
              onPress={() => onDelete(alarm.id)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        </Card>
      ))}
      <Text style={styles.note}>
        Notifications depend on OS permissions and power settings. Expo alarms are reminders, not guaranteed full-screen system-clock alarms.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  nextAlarmCard: { alignItems: 'center', paddingVertical: SPACE.xl },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  nextAlarmTime: { color: COLORS.green, fontSize: TYPE.displayLarge, fontWeight: '800', marginTop: SPACE.xs, fontVariant: ['tabular-nums'] },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body, textAlign: 'center' },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
  alarmCard: { gap: SPACE.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  flex: { flex: 1, minWidth: 0 },
  tag: {
    color: COLORS.primarySoft,
    backgroundColor: COLORS.primaryMuted,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADII.sm,
    fontSize: TYPE.caption,
    fontWeight: '700',
  },
  alarmTime: { color: COLORS.text, fontSize: TYPE.display, fontWeight: '800', marginTop: SPACE.sm, fontVariant: ['tabular-nums'] },
  cardText: { color: COLORS.textSecondary, fontSize: TYPE.body, fontWeight: '600' },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACE.md,
  },
  dayDot: { width: 26, height: 26, borderRadius: RADII.sm, backgroundColor: COLORS.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: COLORS.primaryStrong },
  dayText: { color: COLORS.muted, fontSize: TYPE.micro, fontWeight: '700' },
  dayTextActive: { color: COLORS.white },
  deleteButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: SPACE.xs },
  deleteText: { color: COLORS.red, fontSize: TYPE.small, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  note: { color: COLORS.muted, fontSize: TYPE.caption, lineHeight: LINE_HEIGHT.body, paddingHorizontal: SPACE.xs },
});
