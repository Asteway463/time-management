import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, ScreenHeading } from '../components/Common';
import { APP_NAME } from '../constants';
import { persistBackgroundImage } from '../services/backgroundImage';
import { LAYOUT, RADII, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, TimeFormat } from '../types';

type Props = {
  data: AppData;
  onToggleNotifications: (enabled: boolean) => void;
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  onSetTimeFormat: (format: TimeFormat) => void;
  onSetBackgroundImage: (uri: string) => void;
};

export function SettingsScreen({ data, onToggleNotifications, onSetTheme, onSetTimeFormat, onSetBackgroundImage }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [pickingImage, setPickingImage] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const versionCode = Constants.expoConfig?.android?.versionCode;
  const sdkVersion = Constants.expoConfig?.sdkVersion;

  const chooseBackground = async () => {
    if (pickingImage) return;
    setPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      const asset = result.canceled ? null : result.assets?.[0];
      if (!asset) return;
      const savedUri = await persistBackgroundImage(asset.uri);
      onSetBackgroundImage(savedUri);
    } catch (error) {
      Alert.alert('Could not use that image', String(error));
    } finally {
      setPickingImage(false);
    }
  };

  return (
    <View style={styles.content}>
      <ScreenHeading title="Settings" subtitle="Preferences and your data, all on this device." />

      <Card>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Alarms & timer reminders</Text>
          <Switch
            accessibilityLabel="Enable alarms and timer reminders"
            value={data.notificationsEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={styles.aboutMeta}>
          Alarms are local notifications. Battery optimisation and Do Not Disturb can delay delivery, so keep {APP_NAME} unrestricted in Android settings if punctuality matters.
        </Text>
        <Button title="Open Android app settings" variant="secondary" onPress={() => { Linking.openSettings().catch((error: unknown) => { Alert.alert('Could not open settings', String(error)); }); }} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Time format</Text>
        <Text style={styles.aboutMeta}>Choose how times are displayed. Time entry fields use 24-hour input.</Text>
        <View style={styles.optionRow}>
          {(['12h', '24h'] as const).map((format) => (
            <Pressable
              key={format}
              accessibilityRole="radio"
              accessibilityState={{ selected: data.timeFormat === format }}
              accessibilityLabel={format === '12h' ? 'Use 12-hour time with AM and PM' : 'Use 24-hour time'}
              onPress={() => onSetTimeFormat(format)}
              style={[styles.optionButton, data.timeFormat === format && styles.optionButtonActive]}
            >
              <Text style={[styles.optionText, data.timeFormat === format && styles.optionTextActive]}>
                {format === '12h' ? '12-hour (AM/PM)' : '24-hour'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.aboutMeta}>Auto follows your device appearance.</Text>
        <View style={styles.optionRow}>
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <Pressable
              key={theme}
              accessibilityRole="radio"
              accessibilityState={{ selected: data.theme === theme }}
              accessibilityLabel={`Use ${theme === 'system' ? 'automatic' : theme} appearance`}
              onPress={() => onSetTheme(theme)}
              style={[styles.optionButton, data.theme === theme && styles.optionButtonActive]}
            >
              <Text style={[styles.optionText, data.theme === theme && styles.optionTextActive]}>
                {theme === 'system' ? 'Auto' : theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Focus timer</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Focus session</Text>
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
        <Text style={styles.sectionTitle}>Background image</Text>
        <Text style={styles.aboutMeta}>The image is copied into {APP_NAME} storage so it survives restarts.</Text>
        <Button
          title={pickingImage ? 'Opening gallery...' : 'Choose background image'}
          onPress={() => { void chooseBackground(); }}
          variant="secondary"
        />
        {data.backgroundImage ? (
          <Button title="Remove background image" onPress={() => onSetBackgroundImage('')} variant="danger" />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>{APP_NAME}</Text>
        <Text style={styles.aboutMeta}>
          Version {version}{versionCode !== undefined ? ` (${versionCode})` : ''}
          {sdkVersion ? ` · Expo SDK ${sdkVersion}` : ''}
        </Text>
        <Text style={styles.aboutMeta}>{APP_NAME}. Asteway Teshome · © 2026</Text>
      </Card>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  sectionTitle: { color: COLORS.muted, fontSize: TYPE.caption, fontWeight: '700', letterSpacing: 0.6, marginBottom: SPACE.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, paddingVertical: SPACE.xs },
  label: { color: COLORS.text, fontSize: TYPE.body, flexShrink: 1 },
  value: { color: COLORS.textSecondary, fontSize: TYPE.body, fontWeight: '600' },
  optionRow: { flexDirection: 'row', gap: SPACE.sm },
  optionButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.xs,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonActive: { backgroundColor: COLORS.primaryStrong },
  optionText: { color: COLORS.muted, fontSize: TYPE.small, fontWeight: '600', textAlign: 'center' },
  optionTextActive: { color: COLORS.white },
  aboutText: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '600' },
  aboutMeta: { color: COLORS.muted, fontSize: TYPE.caption, lineHeight: 18, marginTop: SPACE.xs / 2 },
});
