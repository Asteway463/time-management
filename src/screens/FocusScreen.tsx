import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, Animated, AppState, Easing, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, ScreenHeading } from '../components/Common';
import { formatCountdown, formatDuration } from '../constants';
import { LAYOUT, SPACE, TRACKING, TYPE, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, FocusMode } from '../types';
import { cancelNativeFocus, focusBlockerAvailable, isBlockerPermissionEnabled, listInstalledApps, openBlockerSettings, startNativeFocus, pauseNativeFocus, type InstalledApp } from '../focusBlocker';

type Props = {
  data: AppData;
  mode: FocusMode;
  remaining: number;
  timerRunning: boolean;
  onMode: (mode: FocusMode) => void;
  onSettings: () => void;
  onReset: () => void;
  onQuickFocus: (nativeManaged?: boolean, startNativeSession?: () => boolean) => void;
  onNativeToggleTimer: (nativeManaged?: boolean) => void;
};

const MODES: { id: FocusMode; label: string }[] = [
  { id: 'work', label: 'Focus' },
  { id: 'shortBreak', label: 'Short break' },
  { id: 'longBreak', label: 'Long break' },
];
const BLOCKED_APPS_KEY = 'asttime-blocked-apps-v1';

export function FocusScreen({
  data,
  mode,
  remaining,
  timerRunning,
  onMode,
  onSettings,
  onReset,
  onQuickFocus,
  onNativeToggleTimer,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const modeLabel = mode === 'work' ? 'DEEP FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  const timerPulse = useRef(new Animated.Value(1)).current;
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [permission, setPermission] = useState(false);
  const [playAudio, setPlayAudio] = useState(false);

  useEffect(() => {
    if (!focusBlockerAvailable) return;
    void listInstalledApps().then(setApps).catch(() => Alert.alert('App list unavailable', 'Android could not read installed apps.'));
    void AsyncStorage.getItem(BLOCKED_APPS_KEY).then((value) => {
      if (value) {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) setSelected(parsed);
      }
    }).catch(() => undefined).finally(() => setSelectionLoaded(true));
    const refresh = () => setPermission(isBlockerPermissionEnabled());
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (focusBlockerAvailable && selectionLoaded) {
      void AsyncStorage.setItem(BLOCKED_APPS_KEY, JSON.stringify(selected)).catch(() => undefined);
    }
  }, [selected, selectionLoaded]);

  const toggleSelected = (packageName: string) => setSelected((current) => current.includes(packageName)
    ? current.filter((item) => item !== packageName)
    : [...current, packageName]);
  const showAccessibilityDisclosure = () => Alert.alert(
    'About app-blocking access',
    'Ast Time uses Android Accessibility Service only to detect when you open an app you selected during a focus session, then return you to Ast Time. It does not read screen content or send this information off your device. Enabling the service is optional.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue to settings', onPress: () => openBlockerSettings() },
    ],
  );
  const requestFocusNotificationPermission = async () => {
    const status = await Notifications.getPermissionsAsync();
    const permissionResult = status.granted ? status : await Notifications.requestPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Notifications are disabled', 'The focus session can continue, but Android may hide its ongoing notification. Enable notifications in system settings for the full background experience.');
    }
  };
  const toggleTimer = async () => {
    let nativeManaged = false;
    if (!timerRunning && mode === 'work' && (selected.length > 0 || playAudio)) {
      await requestFocusNotificationPermission();
      if (selected.length > 0 && !permission) {
        showAccessibilityDisclosure();
        return;
      }
      const duration = Math.max(1, remaining) * 1000;
      if (!startNativeFocus(selected, Date.now() + duration, playAudio)) {
        Alert.alert('Could not start blocking', 'Please try again.');
        return;
      }
      nativeManaged = true;
    } else if (timerRunning) {
      pauseNativeFocus();
    }
    onNativeToggleTimer(nativeManaged);
  };
  const startQuickFocus = async () => {
    let nativeManaged = false;
    if (selected.length > 0 || playAudio) {
      await requestFocusNotificationPermission();
      if (selected.length > 0 && !permission) {
        showAccessibilityDisclosure();
        return;
      }
      nativeManaged = true;
    }
    const beginNativeSession = nativeManaged
      ? () => startNativeFocus(selected, Date.now() + data.focus.workMins * 60_000, playAudio)
      : undefined;
    onQuickFocus(nativeManaged, beginNativeSession);
  };

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
          onSelect={(nextMode) => { if (timerRunning) pauseNativeFocus(); onMode(nextMode); }}
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
            <Button title={timerRunning ? 'Pause' : 'Start session'} onPress={toggleTimer} />
          </View>
          <View style={styles.flex}>
            <Button title="Reset" onPress={() => { cancelNativeFocus(); onReset(); }} variant="secondary" />
          </View>
        </View>
        {timerRunning && (
          <Text style={styles.runningHint}>The timer keeps its end time even if you leave the app.</Text>
        )}
      </Card>

      {focusBlockerAvailable && <Card>
        <Text style={styles.cardTitle}>Block distracting apps</Text>
        <Text style={styles.smallMuted}>Select apps, then enable Ast Time in Android Accessibility settings. Android requires this permission for app switching protection.</Text>
        <Pressable onPress={showAccessibilityDisclosure} accessibilityRole="button">
          <Text style={styles.permission}>{permission ? 'App blocking permission enabled' : 'Open Accessibility settings'}</Text>
        </Pressable>
        <Text style={styles.selectedCount}>{selected.length} selected</Text>
        <View style={styles.audioRow}>
          <Text style={styles.appName}>Play low-volume ambient noise</Text>
          <Switch value={playAudio} onValueChange={setPlayAudio} disabled={timerRunning} accessibilityLabel="Play focus ambient noise" />
        </View>
        <ScrollView style={styles.appList} nestedScrollEnabled>
          {apps.map((app) => {
            const active = selected.includes(app.packageName);
            return <Pressable key={app.packageName} disabled={timerRunning} onPress={() => toggleSelected(app.packageName)} style={styles.appRow} accessibilityRole="checkbox" accessibilityState={{ checked: active, disabled: timerRunning }}>
              <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={styles.appIcon} />
              <Text style={styles.appName}>{active ? '☑' : '□'}  {app.name}</Text>
            </Pressable>;
          })}
        </ScrollView>
      </Card>}

      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Button title="Start a quick focus session" onPress={startQuickFocus} variant="secondary" />
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
  permission: { color: COLORS.primary, fontSize: TYPE.body, fontWeight: '700', paddingVertical: SPACE.sm },
  selectedCount: { color: COLORS.muted, fontSize: TYPE.caption },
  appList: { maxHeight: 220, alignSelf: 'stretch' },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  appIcon: { width: 28, height: 28, borderRadius: 6 },
  appName: { color: COLORS.text, fontSize: TYPE.body, flex: 1 },
  audioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, paddingVertical: SPACE.sm },
});
