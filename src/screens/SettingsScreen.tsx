import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, ScreenHeading } from '../components/Common';
import { LAYOUT, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, TimeFormat } from '../types';

type Props = {
  data: AppData;
  onToggleNotifications: (enabled: boolean) => void;
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  onSetTimeFormat: (format: TimeFormat) => void;
  onClearData: () => void;
  onExportData: () => void;
};

export function SettingsScreen({ data, onToggleNotifications, onSetTheme, onSetTimeFormat, onClearData, onExportData }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const handleClearData = () => {
    Alert.alert(
      'Clear all data',
      'This will delete all tasks, alarms, blocked apps, schedules, and session history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onClearData },
      ],
    );
  };

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Settings"
        subtitle="Manage your preferences and data."
      />

      <Card>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Focus reminders</Text>
          <Switch
            value={data.notificationsEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Time format</Text>
        <Text style={styles.aboutMeta}>Choose how times are displayed. Time entry fields use 24-hour input.</Text>
        <View style={styles.themeRow}>
          {(['12h', '24h'] as const).map((format) => (
            <Pressable
              key={format}
              accessibilityRole="radio"
              accessibilityState={{ selected: data.timeFormat === format }}
              accessibilityLabel={format === '12h' ? 'Use 12-hour time with AM and PM' : 'Use 24-hour time'}
              onPress={() => onSetTimeFormat(format)}
              style={[styles.themeButton, data.timeFormat === format && styles.themeButtonActive]}
            >
              <Text style={[styles.themeText, data.timeFormat === format && styles.themeTextActive]}>
                {format === '12h' ? '12-hour (AM/PM)' : '24-hour'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.aboutMeta}>Auto follows your device appearance setting.</Text>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <Pressable
              key={theme}
              accessibilityRole="radio"
              accessibilityState={{ selected: data.theme === theme }}
              accessibilityLabel={`Use ${theme === 'system' ? 'automatic' : theme} appearance`}
              onPress={() => onSetTheme(theme)}
              style={[styles.themeButton, data.theme === theme && styles.themeButtonActive]}
            >
              <Text style={[styles.themeText, data.theme === theme && styles.themeTextActive]}>
                {theme === 'system' ? 'Auto' : theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Focus timer</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Default focus duration</Text>
          <Text style={styles.value}>{data.focus.workMins} min</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Short break</Text>
          <Text style={styles.value}>{data.focus.shortMins} min</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Long break</Text>
          <Text style={styles.value}>{data.focus.longMins} min</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Daily goal</Text>
          <Text style={styles.value}>{data.focus.dailyGoal} min</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Data</Text>
        <Button title="Export data" onPress={onExportData} variant="secondary" />
        <Button title="Clear all data" onPress={handleClearData} variant="danger" />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>AST Time v1.0.0</Text>
        <Text style={styles.aboutMeta}>Built with Expo SDK 58 · React Native 0.88</Text>
      </Card>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  sectionTitle: { color: COLORS.muted, fontSize: TYPE.caption, fontWeight: '700', letterSpacing: 0.6, marginBottom: SPACE.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACE.xs },
  label: { color: COLORS.text, fontSize: TYPE.body },
  value: { color: COLORS.textSecondary, fontSize: TYPE.body, fontWeight: '600' },
  themeRow: { flexDirection: 'row', gap: SPACE.sm },
  themeButton: { flex: 1, paddingVertical: SPACE.sm, borderRadius: 8, backgroundColor: COLORS.surfaceRaised, alignItems: 'center' },
  themeButtonActive: { backgroundColor: COLORS.primaryStrong },
  themeText: { color: COLORS.muted, fontSize: TYPE.small, fontWeight: '600' },
  themeTextActive: { color: COLORS.white },
  aboutText: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '600' },
  aboutMeta: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs / 2 },
});