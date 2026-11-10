import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert, Animated, AppState, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, ScreenHeading } from '../components/Common';
import { HoldToConfirm } from '../components/HoldToConfirm';
import { formatCountdown, formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, BlockerMode, BlockerSettings, FocusMode } from '../types';
import {
  cancelNativeFocus,
  focusBlockerAvailable,
  getLastBlockedApp,
  isBlockerPermissionEnabled,
  listInstalledApps,
  openBlockerSettings,
  openBlockedApp,
  pauseNativeFocus,
  startNativeFocus,
  type BlockedApp,
  type InstalledApp,
} from '../focusBlocker';

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
  onUpdateBlocker: (patch: Partial<BlockerSettings>) => void;
};

const MODES: { id: FocusMode; label: string }[] = [
  { id: 'work', label: 'Focus' },
  { id: 'shortBreak', label: 'Short break' },
  { id: 'longBreak', label: 'Long break' },
];

const BLOCKER_MODES: { id: BlockerMode; label: string }[] = [
  { id: 'block-selected', label: 'Block selected' },
  { id: 'allow-only', label: 'Allow only selected' },
];

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
  onUpdateBlocker,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const modeLabel = mode === 'work' ? 'DEEP FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  const timerPulse = useRef(new Animated.Value(1)).current;
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [permission, setPermission] = useState(false);
  const [blockedApp, setBlockedApp] = useState<BlockedApp | null>(null);
  const blocker = data.blocker;
  const selected = blocker.packages;
  const holdSeconds = blocker.holdSeconds || 3;
  const lockActive = timerRunning && focusBlockerAvailable && selected.length > 0;

  useEffect(() => {
    if (!focusBlockerAvailable) return;
    void listInstalledApps()
      .then(setApps)
      .catch(() => Alert.alert('App list unavailable', 'Android could not read installed apps.'));
    const refresh = () => setPermission(isBlockerPermissionEnabled());
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, []);

  const refreshBlockedApp = useCallback(() => {
    if (!focusBlockerAvailable) return;
    const blocked = getLastBlockedApp();
    if (!blocked) return;
    // Ignore stale records left over from an earlier session.
    if (Date.now() - blocked.blockedAt > 2 * 60_000) return;
    setBlockedApp((current) => {
      if (current?.packageName === blocked.packageName && current.blockedAt === blocked.blockedAt) return current;
      return blocked;
    });
  }, []);

  useEffect(() => {
    if (!timerRunning) {
      setBlockedApp(null);
      return;
    }
    refreshBlockedApp();
    const interval = setInterval(refreshBlockedApp, 2000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshBlockedApp();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshBlockedApp, timerRunning]);

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

  const toggleSelected = (packageName: string) => {
    const packages = selected.includes(packageName)
      ? selected.filter((item) => item !== packageName)
      : [...selected, packageName];
    onUpdateBlocker({ packages });
  };

  const showAccessibilityDisclosure = () => Alert.alert(
    'About app-blocking access',
    "Atna's Flow uses Android Accessibility Service only to detect when a blocked app opens during a focus session, then returns you to Atna's Flow. It does not read screen content or send anything off your device. Enabling the service is optional.",
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

  const prepareNativeSession = async (durationMs: number): Promise<boolean> => {
    const wantsBlocking = selected.length > 0;
    if (wantsBlocking) {
      await requestFocusNotificationPermission();
      if (!permission) {
        showAccessibilityDisclosure();
        return false;
      }
    }
    if (!startNativeFocus(selected, Date.now() + durationMs, blocker.playAudio, blocker.mode, holdSeconds)) {
      Alert.alert('Could not start blocking', 'Please try again. If this keeps happening, reopen Android Accessibility settings and re-enable Atna\'s Flow.');
      return false;
    }
    return true;
  };

  const toggleTimer = async () => {
    let nativeManaged = false;
    if (!timerRunning && mode === 'work' && (selected.length > 0 || blocker.playAudio)) {
      const duration = Math.max(1, remaining) * 1000;
      nativeManaged = await prepareNativeSession(duration);
      if (!nativeManaged) return;
    } else if (timerRunning) {
      pauseNativeFocus();
    }
    onNativeToggleTimer(nativeManaged);
  };

  const startQuickFocus = async () => {
    let nativeManaged = false;
    let beginNativeSession: (() => boolean) | undefined;
    if (selected.length > 0 || blocker.playAudio) {
      await requestFocusNotificationPermission();
      if (selected.length > 0 && !permission) {
        showAccessibilityDisclosure();
        return;
      }
      nativeManaged = true;
      beginNativeSession = () => startNativeFocus(
        selected,
        Date.now() + data.focus.workMins * 60_000,
        blocker.playAudio,
        blocker.mode,
        holdSeconds,
      );
    }
    onQuickFocus(nativeManaged, beginNativeSession);
  };

  const exitFocusLock = () => {
    pauseNativeFocus();
    setBlockedApp(null);
    onNativeToggleTimer(false);
  };

  const openBlockedOnce = () => {
    if (!blockedApp) return;
    openBlockedApp(blockedApp.packageName);
    setBlockedApp(null);
  };

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
          onSelect={(nextMode) => {
            if (timerRunning) return;
            onMode(nextMode);
          }}
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
        {lockActive ? (
          <View style={styles.lockActions}>
            <HoldToConfirm
              holdSeconds={holdSeconds}
              label="Hold to exit focus lock"
              holdingLabel="Keep holding to unlock…"
              onComplete={exitFocusLock}
            />
            <Text style={styles.runningHint}>
              Apps are locked until the timer ends. Releasing early keeps the session running.
            </Text>
          </View>
        ) : (
          <View style={styles.timerButtons}>
            <View style={styles.flex}>
              <Button title={timerRunning ? 'Pause' : 'Start session'} onPress={() => { void toggleTimer(); }} />
            </View>
            <View style={styles.flex}>
              <Button title="Reset" onPress={() => { cancelNativeFocus(); onReset(); }} variant="secondary" />
            </View>
          </View>
        )}
        {timerRunning && !lockActive && (
          <Text style={styles.runningHint}>The timer keeps its end time even if you leave the app.</Text>
        )}
      </Card>

      {focusBlockerAvailable && <Card>
        <Text style={styles.cardTitle}>App blocking</Text>
        <Text style={styles.smallMuted}>
          Choose which apps are blocked while a focus session runs. In allow-only mode every unselected app is blocked.
        </Text>
        <ChoiceRow<BlockerMode>
          values={BLOCKER_MODES.map((item) => item.id)}
          selected={blocker.mode}
          onSelect={(nextMode) => { if (!timerRunning) onUpdateBlocker({ mode: nextMode }); }}
          labels={Object.fromEntries(BLOCKER_MODES.map((item) => [item.id, item.label]))}
        />
        <Pressable disabled={timerRunning} onPress={showAccessibilityDisclosure} accessibilityRole="button">
          <Text style={styles.permission}>{permission ? 'App blocking permission enabled' : 'Open Accessibility settings'}</Text>
        </Pressable>
        <Text style={styles.selectedCount}>
          {selected.length} {blocker.mode === 'allow-only' ? 'allowed' : 'selected'}
          {' · '}hold {holdSeconds}s to exit
        </Text>
        {blocker.mode === 'allow-only' && selected.length === 0 && (
          <Text style={styles.warning}>Select at least one app before starting a locked session.</Text>
        )}
        <View style={styles.audioRow}>
          <Text style={styles.appName}>Play low-volume ambient noise</Text>
          <Switch value={blocker.playAudio} onValueChange={(value) => onUpdateBlocker({ playAudio: value })} disabled={timerRunning} accessibilityLabel="Play focus ambient noise" />
        </View>
        <Text style={styles.listLabel}>
          {blocker.mode === 'allow-only' ? 'Apps you can still use' : 'Apps to block'}
        </Text>
        <ScrollView style={styles.appList} nestedScrollEnabled>
          {apps.map((app) => {
            const active = selected.includes(app.packageName);
            return <Pressable key={app.packageName} disabled={timerRunning} onPress={() => toggleSelected(app.packageName)} style={styles.appRow} accessibilityRole="checkbox" accessibilityState={{ checked: active, disabled: timerRunning }}>
              <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={styles.appIcon} />
              <Text style={styles.appName}>{active ? '☑' : '□'}  {app.name}</Text>
            </Pressable>;
          })}
        </ScrollView>
        <Text style={styles.smallMuted}>
          When a blocked app opens, Atna&apos;s Flow comes back to the front. Hold its name here for {holdSeconds} seconds to open it once.
        </Text>
      </Card>}

      {!focusBlockerAvailable && <Card>
        <Text style={styles.cardTitle}>App blocking</Text>
        <Text style={styles.smallMuted}>
          This build does not include the optional Android app-blocking service. Use the full Android build to block apps during focus sessions.
        </Text>
      </Card>}

      <Card>
        <Text style={styles.cardTitle}>Ambient focus audio</Text>
        <Text style={styles.smallMuted}>Play a quiet, generated brown-noise background while the timer runs. It is generated on the device and needs no extra permission.</Text>
        <View style={styles.audioRow}>
          <Text style={styles.appName}>Play low-volume ambient noise</Text>
          <Switch value={blocker.playAudio} onValueChange={(value) => onUpdateBlocker({ playAudio: value })} disabled={timerRunning} accessibilityLabel="Play focus ambient noise" />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Button title="Start a quick focus session" onPress={() => { void startQuickFocus(); }} variant="secondary" />
      </Card>

      <Modal visible={blockedApp !== null} transparent animationType="fade" onRequestClose={() => setBlockedApp(null)}>
        <View style={styles.lockBackdrop}>
          <View style={styles.lockCard}>
            <Text style={styles.lockEyebrow}>FOCUS LOCK</Text>
            <Text style={styles.lockTitle} numberOfLines={3}>{blockedApp?.name ?? 'That app'} is blocked</Text>
            <Text style={styles.lockBody}>
              You chose to keep {blocker.mode === 'allow-only' ? 'only the selected apps' : 'distracting apps'} out of this session.
              Stay here, or hold the button for {holdSeconds} seconds to open it once.
            </Text>
            <HoldToConfirm
              holdSeconds={holdSeconds}
              label={`Hold to open ${blockedApp?.name ?? 'this app'} once`}
              onComplete={openBlockedOnce}
              variant="primary"
            />
            <Button title="Stay focused" variant="secondary" onPress={() => setBlockedApp(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  focusCard: { alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.lg },
  focusTime: { color: COLORS.text, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: TRACKING.timer, fontSize: TYPE.timer },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label, textAlign: 'center' },
  timerButtons: { flexDirection: 'row', gap: SPACE.sm, alignSelf: 'stretch' },
  lockActions: { alignSelf: 'stretch', gap: SPACE.sm },
  flex: { flex: 1 },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs, textAlign: 'center' },
  runningHint: { color: COLORS.muted, fontSize: TYPE.caption, textAlign: 'center', lineHeight: 17 },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  permission: { color: COLORS.primary, fontSize: TYPE.body, fontWeight: '700', paddingVertical: SPACE.sm },
  selectedCount: { color: COLORS.muted, fontSize: TYPE.caption },
  warning: { color: COLORS.amber, fontSize: TYPE.caption, lineHeight: 17 },
  listLabel: { color: COLORS.textSecondary, fontSize: TYPE.small, fontWeight: '700', marginTop: SPACE.xs },
  appList: { maxHeight: 220, alignSelf: 'stretch' },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  appIcon: { width: 28, height: 28, borderRadius: 6 },
  appName: { color: COLORS.text, fontSize: TYPE.body, flex: 1 },
  audioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, paddingVertical: SPACE.sm },
  lockBackdrop: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  lockCard: { width: '100%', maxWidth: 440, backgroundColor: COLORS.surface, borderColor: COLORS.red, borderWidth: 1, borderRadius: RADII.xxl, padding: SPACE.xl, gap: SPACE.md },
  lockEyebrow: { color: COLORS.red, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label, textAlign: 'center' },
  lockTitle: { color: COLORS.text, fontSize: TYPE.heading, fontWeight: '800', textAlign: 'center' },
  lockBody: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body, textAlign: 'center' },
});
