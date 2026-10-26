import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, EmptyCard, ScreenHeading } from '../components/Common';
import { formatTime } from '../constants';
import { LAYOUT, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { BlockedApp, BlockSchedule, TimeFormat } from '../types';

type Props = {
  blockedApps: BlockedApp[];
  schedules: BlockSchedule[];
  onAddApp: () => void;
  onRemoveApp: (packageName: string) => void;
  onToggleApp: (packageName: string, blockDuringFocus: boolean) => void;
  onAddSchedule: () => void;
  onRemoveSchedule: (id: string) => void;
  onToggleSchedule: (id: string, enabled: boolean) => void;
  onOpenPermissions: () => void;
  timeFormat: TimeFormat;
};

export function BlockingScreen({
  blockedApps,
  schedules,
  onAddApp,
  onRemoveApp,
  onToggleApp,
  onAddSchedule,
  onRemoveSchedule,
  onToggleSchedule,
  onOpenPermissions,
  timeFormat,
}: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.content}>
      <ScreenHeading
        title="App blocking"
        subtitle="Block distracting apps during focus sessions."
        action={<Button title="Add app" onPress={onAddApp} small />}
      />

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Accessibility service</Text>
        </View>
        <Text style={styles.muted}>
          Enable the AST Time Focus Blocker to actively prevent access to selected apps during focus sessions.
        </Text>
        <Button title="Grant permission" onPress={onOpenPermissions} variant="secondary" />
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Blocked apps</Text>
        </View>
        {blockedApps.length === 0 ? (
          <EmptyCard text="No apps selected. Add apps you want to block during focus." />
        ) : (
          blockedApps.map((app) => (
            <View key={app.packageName} style={styles.appRow}>
              <View style={styles.flex}>
                <Text style={styles.appLabel} numberOfLines={1}>{app.label}</Text>
                <Text style={styles.appMeta} numberOfLines={1}>{app.packageName}</Text>
              </View>
              <Switch
                value={app.blockDuringFocus}
                onValueChange={(v) => onToggleApp(app.packageName, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
              <Pressable onPress={() => onRemoveApp(app.packageName)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Blocking schedules</Text>
          <Button title="+ Add" onPress={onAddSchedule} small variant="secondary" />
        </View>
        {schedules.length === 0 && (
          <Text style={styles.muted}>No schedules set. Add one to auto-block apps at specific times.</Text>
        )}
        {schedules.map((schedule) => (
          <View key={schedule.id} style={styles.scheduleRow}>
            <View style={styles.flex}>
              <Text style={styles.scheduleTime}>{formatTime(schedule.startTime, timeFormat)} – {formatTime(schedule.endTime, timeFormat)}</Text>
              <Text style={styles.scheduleDays}>
                {schedule.days.map((d) => ['S','M','T','W','T','F','S'][d]).join(' ')} · {schedule.enabled ? 'Active' : 'Paused'}
              </Text>
            </View>
            <Switch
              value={schedule.enabled}
              onValueChange={(v) => onToggleSchedule(schedule.id, v)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
            <Pressable onPress={() => onRemoveSchedule(schedule.id)}>
              <Text style={styles.removeText}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </Card>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: 20 },
  flex: { flex: 1, minWidth: 0 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xs },
  appLabel: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '600' },
  appMeta: { color: COLORS.muted, fontSize: TYPE.caption },
  removeText: { color: COLORS.red, fontSize: TYPE.small, fontWeight: '700' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xs, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACE.xs, paddingTop: SPACE.xs },
  scheduleTime: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
  scheduleDays: { color: COLORS.muted, fontSize: TYPE.caption },
});