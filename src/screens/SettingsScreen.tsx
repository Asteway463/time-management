import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, ScreenHeading } from '../components/Common';
import { APP_NAME, TAB_LABELS } from '../constants';
import { checkForAppUpdate, openUpdatePage } from '../services/appUpdate';
import { persistBackgroundImage } from '../services/backgroundImage';
import { LAYOUT, RADII, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, Tab, TimeFormat } from '../types';

type Props = {
  data: AppData;
  onToggleNotifications: (enabled: boolean) => void;
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  onSetTimeFormat: (format: TimeFormat) => void;
  onSetBackgroundImage: (uri: string) => void;
  onToggleFeature: (tab: Tab) => void;
  onSetAllFeatures: (enabled: boolean) => void;
};

export function SettingsScreen({ data, onToggleNotifications, onSetTheme, onSetTimeFormat, onSetBackgroundImage, onToggleFeature, onSetAllFeatures }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [pickingImage, setPickingImage] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
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

  const checkForUpdates = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const result = await checkForAppUpdate();
      if (result.status === 'required') {
        Alert.alert(
          'Update required',
          `This application has to update. Version ${result.latestVersion} is required, but you are running ${result.currentVersion}. Install the latest version to keep using ${APP_NAME}.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Update now', onPress: () => { void openUpdatePage(result.updateUrl); } },
          ],
        );
      } else if (result.status === 'optional') {
        Alert.alert(
          'Update available',
          `Version ${result.latestVersion} is available and you are running ${result.currentVersion}.${result.notes ? `\n\n${result.notes}` : ''}`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Update now', onPress: () => { void openUpdatePage(result.updateUrl); } },
          ],
        );
      } else if (result.status === 'current') {
        Alert.alert('You are up to date', `${APP_NAME} ${result.currentVersion} is the latest version.`);
      } else {
        Alert.alert(
          'Could not check for updates',
          `${result.message}\n\nYou can still open the store page to see if a newer version is available.`,
          [
            { text: 'Close', style: 'cancel' },
            { text: 'Open store page', onPress: () => { void openUpdatePage(); } },
          ],
        );
      }
    } finally {
      setCheckingUpdate(false);
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
        <Text style={styles.sectionTitle}>Choose what to use</Text>
        <Text style={styles.aboutMeta}>
          Pick the features you want. Unselected features are hidden from the tab bar. Hold a tab name for 3 seconds to switch to it.
        </Text>
        <View style={styles.optionRow}>
          <Button title="Select all" variant="secondary" small onPress={() => onSetAllFeatures(true)} />
          <Button title="Clear all" variant="secondary" small onPress={() => onSetAllFeatures(false)} />
        </View>
        {TAB_LABELS.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="switch"
            accessibilityState={{ checked: data.enabledFeatures[item.id] }}
            accessibilityLabel={`Toggle ${item.label} feature`}
            onPress={() => onToggleFeature(item.id)}
            style={[styles.featureRow, data.enabledFeatures[item.id] && styles.featureRowActive]}
          >
            <View style={styles.featureLeft}>
              <Text style={styles.featureIcon}>{data.enabledFeatures[item.id] ? '☑' : '□'}</Text>
              <Text style={styles.featureLabel}>{item.label}</Text>
            </View>
            <Text style={styles.featureHint}>Hold 3s to switch</Text>
          </Pressable>
        ))}
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
        <Button
          title={checkingUpdate ? 'Checking for updates…' : 'Check for updates'}
          onPress={() => { void checkForUpdates(); }}
          variant="secondary"
        />
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceRaised,
    marginTop: SPACE.xs,
  },
  featureRowActive: { backgroundColor: COLORS.primaryMuted, borderWidth: 1, borderColor: COLORS.primaryStrong },
  featureLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexShrink: 1 },
  featureIcon: { color: COLORS.muted, fontSize: TYPE.body, width: 22 },
  featureLabel: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '600', flex: 1, minWidth: 0 },
  featureHint: { color: COLORS.muted, fontSize: TYPE.caption },
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
