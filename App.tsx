import Constants from 'expo-constants';
import { BlurTargetView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, type ComponentRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './src/components/AppIcon';
import { LiveClock } from './src/components/Common';
import {
  AlarmFormModal,
  RingingAlarmModal,
  TaskFormModal,
  TimerSettingsModal,
} from './src/components/Dialogs';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { APP_NAME, TAB_LABELS } from './src/constants';
import { AlarmsScreen } from './src/screens/AlarmsScreen';
import { FocusScreen } from './src/screens/FocusScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { NotebookScreen } from './src/screens/NotebookScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import {
  COLORS,
  LIGHT_COLORS,
  LAYOUT,
  LINE_HEIGHT,
  RADII,
  SPACE,
  TRACKING,
  TYPE,
  BlurTargetContext,
  ThemeColorsContext,
  type ThemeColors,
} from './src/theme';
import { useChronoFlow } from './src/useChronoFlow';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const SPLASH_DURATION = 2300;

function AtnaFlowApp() {
  const flow = useChronoFlow();
  const systemColorScheme = useColorScheme();
  const isLight = flow.data.theme === 'light'
    || (flow.data.theme === 'system' && systemColorScheme === 'light');
  const colors = isLight ? LIGHT_COLORS : COLORS;
  const styles = createStyles(colors);
  const pendingTasks = flow.data.tasks.filter((task) => !task.completed).length;
  const activityProgress = useRef(new Animated.Value(1)).current;
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    activityProgress.setValue(0);
    Animated.timing(activityProgress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flow.tab, activityProgress]);

  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const orbDrift = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(24)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslate = useRef(new Animated.Value(18)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: SPLASH_DURATION,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(orbDrift, {
        toValue: 1,
        duration: SPLASH_DURATION,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
          Animated.timing(logoRotate, {
            toValue: 1,
            duration: 1150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.6,
            duration: 1050,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ringOpacity, { toValue: 0.5, duration: 420, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0, duration: 630, useNativeDriver: true }),
          ]),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(430),
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 560,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslate, {
            toValue: 0,
            duration: 560,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(subtitleTranslate, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(1020),
        Animated.timing(statusOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    logoScale,
    logoRotate,
    logoOpacity,
    ringScale,
    ringOpacity,
    bgAnim,
    orbDrift,
    titleOpacity,
    titleTranslate,
    subtitleOpacity,
    subtitleTranslate,
    statusOpacity,
  ]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: ['#070A12', '#1A1040', '#2A1A5E', '#0B1730'],
  });
  const orbOneTranslateY = orbDrift.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const orbTwoTranslateY = orbDrift.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const orbOneScale = orbDrift.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
  const orbTwoScale = orbDrift.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.92] });

  if (!flow.loaded) {
    return (
      <Animated.View style={[styles.loading, { backgroundColor: bgColor }]}>
        <StatusBar style="light" />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.splashOrb,
            styles.splashOrbOne,
            { transform: [{ translateY: orbOneTranslateY }, { scale: orbOneScale }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.splashOrb,
            styles.splashOrbTwo,
            { transform: [{ translateY: orbTwoTranslateY }, { scale: orbTwoScale }] },
          ]}
        />

        <View style={styles.splashContent}>
          <View style={styles.splashLogoWrap}>
            <Animated.View
              style={[
                styles.splashRing,
                { opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
            <Animated.View
              style={{
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { rotate: logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                ],
              }}
            >
              <Image source={require('./assets/icon.png')} style={styles.splashLogo} />
            </Animated.View>
          </View>

          <Animated.Text
            style={[
              styles.brandTitle,
              styles.splashTitle,
              { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] },
            ]}
          >
            {APP_NAME}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.splashSubtitle,
              { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslate }] },
            ]}
          >
            Make time for what matters
          </Animated.Text>
          <Animated.View style={[styles.splashStatus, { opacity: statusOpacity }]}>
            <View style={styles.splashDots}>
              <View style={[styles.splashDot, styles.splashDotActive]} />
              <View style={styles.splashDot} />
              <View style={styles.splashDot} />
            </View>
            <Text style={[styles.muted, styles.splashMuted]}>Getting your day in order…</Text>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  return (
    <ThemeColorsContext.Provider value={colors}>
      <BlurTargetContext.Provider value={blurTargetRef}>
        <View style={styles.root}>
          <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
            <ImageBackground
              source={flow.data.backgroundImage ? { uri: flow.data.backgroundImage } : require('./assets/background.jpg')}
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
              imageStyle={{ opacity: isLight ? 0.16 : 0.55 }}
            />
          </BlurTargetView>
          <SafeAreaView style={styles.safeArea}>
          <StatusBar style={isLight ? 'dark' : 'light'} />
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={require('./assets/icon.png')} style={styles.brandIcon} />
              <View style={styles.brandCopy}>
                <Text style={styles.brandTitle} numberOfLines={1}>{APP_NAME}</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Make time for what matters</Text>
              </View>
            </View>
            <View style={styles.clockBox}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${isLight ? 'dark' : 'light'} appearance`}
                onPress={() => flow.setTheme(isLight ? 'dark' : 'light')}
                style={styles.themeToggle}
              >
                <Text style={styles.themeToggleText}>{isLight ? '☾' : '☀'}</Text>
              </Pressable>
              <LiveClock timeFormat={flow.data.timeFormat} />
              <Text style={styles.version}>v{APP_VERSION}</Text>
            </View>
          </View>

          <View style={styles.tabsViewport}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {TAB_LABELS.map((item) => {
                const count = item.id === 'home' ? pendingTasks : 0;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: flow.tab === item.id }}
                    accessibilityLabel={count ? `${item.label}, ${count} pending tasks` : item.label}
                    key={item.id}
                    onPress={() => flow.setTab(item.id)}
                    style={({ pressed }) => [styles.tab, flow.tab === item.id && styles.tabActive, pressed && styles.tabPressed]}
                  >
                    <AppIcon name={item.icon} size={18} color={flow.tab === item.id ? colors.text : colors.muted} />
                    <Text style={[styles.tabText, flow.tab === item.id && styles.tabTextActive]}>{item.label}</Text>
                    {count > 0 && (
                      <View style={[styles.tabBadge, flow.tab === item.id && styles.tabBadgeActive]}>
                        <Text style={styles.tabBadgeText}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={styles.pageScroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.activityContent, {
              opacity: activityProgress,
              transform: [{ translateY: activityProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            }]}>
              {flow.tab === 'home' && (
                <HomeScreen
                  data={flow.data}
                  completedCount={flow.completedCount}
                  progress={flow.progress}
                  onNavigate={flow.setTab}
                  onAddTask={() => flow.setModal('task')}
                  onToggleTask={flow.toggleTask}
                  onAddAlarm={() => flow.setModal('alarm')}
                  onQuickFocus={flow.startQuickFocus}
                  timeFormat={flow.data.timeFormat}
                />
              )}
              {flow.tab === 'planner' && (
                <PlannerScreen
                  tasks={flow.data.tasks}
                  filter={flow.filter}
                  completedCount={flow.completedCount}
                  onFilter={flow.setFilter}
                  onAdd={() => flow.setModal('task')}
                  onToggle={flow.toggleTask}
                  onDelete={flow.deleteTask}
                  timeFormat={flow.data.timeFormat}
                />
              )}
              {flow.tab === 'focus' && (
                <FocusScreen
                  data={flow.data}
                  mode={flow.focusMode}
                  remaining={flow.remaining}
                  timerRunning={flow.timerRunning}
                  onMode={flow.selectFocusMode}
                  onSettings={flow.openTimerSettings}
                  onReset={flow.resetFocusTimer}
                  onQuickFocus={flow.startQuickFocus}
                  onNativeToggleTimer={(nativeManaged) => flow.timerRunning
                    ? flow.pauseFocusTimer()
                    : flow.startFocusTimer(nativeManaged)}
                />
              )}
              {flow.tab === 'alarms' && (
                <AlarmsScreen
                  alarms={flow.data.alarms}
                  onAddAlarm={() => flow.setModal('alarm')}
                  onToggleAlarm={flow.changeAlarmActive}
                  onDeleteAlarm={flow.deleteAlarm}
                  timeFormat={flow.data.timeFormat}
                />
              )}
              {flow.tab === 'stats' && (
                <StatsScreen
                  data={flow.data}
                  sessions={flow.data.focusSessions}
                />
              )}
              {flow.tab === 'notebook' && (
                <NotebookScreen
                  notes={flow.data.notes}
                  onAdd={flow.addNote}
                  onUpdate={flow.updateNote}
                  onDelete={flow.deleteNote}
                  onRestore={flow.restoreNote}
                  onPurge={flow.purgeNote}
                  onTogglePin={flow.toggleNotePin}
                />
              )}
              {flow.tab === 'settings' && (
                <SettingsScreen
                  data={flow.data}
                  onToggleNotifications={flow.toggleNotifications}
                  onSetTheme={flow.setTheme}
                  onSetTimeFormat={flow.setTimeFormat}
                  onSetBackgroundImage={flow.setBackgroundImage}
                />
              )}
            </Animated.View>
          </ScrollView>

          <AlarmFormModal
            visible={flow.modal === 'alarm'}
            onClose={() => {
              flow.setModal(null);
              flow.resetAlarmForm();
            }}
            onSave={flow.addAlarm}
            time={flow.alarmTime}
            setTime={flow.setAlarmTime}
            label={flow.alarmLabel}
            setLabel={flow.setAlarmLabel}
            category={flow.alarmCategory}
            setCategory={flow.setAlarmCategory}
            challenge={flow.alarmChallenge}
            setChallenge={flow.setAlarmChallenge}
            days={flow.alarmDays}
            setDays={flow.setAlarmDays}
          />
          <TaskFormModal
            visible={flow.modal === 'task'}
            onClose={() => {
              flow.setModal(null);
              flow.resetTaskForm();
            }}
            onSave={flow.addTask}
            title={flow.taskTitle}
            setTitle={flow.setTaskTitle}
            time={flow.taskTime}
            setTime={flow.setTaskTime}
            duration={flow.taskDuration}
            setDuration={flow.setTaskDuration}
            priority={flow.taskPriority}
            setPriority={flow.setTaskPriority}
            category={flow.taskCategory}
            setCategory={flow.setTaskCategory}
          />
          <TimerSettingsModal
            visible={flow.modal === 'settings'}
            onClose={() => flow.setModal(null)}
            onSave={flow.saveTimerSettings}
            settings={flow.settings}
            setSettings={flow.setSettings}
          />
          <RingingAlarmModal
            alarm={flow.ringing}
            mathQuestion={flow.mathQuestion.text}
            mathInput={flow.mathInput}
            setMathInput={flow.setMathInput}
            mathError={flow.mathError}
            onVerify={flow.verifyMath}
            onDismiss={flow.dismissAlarm}
            onSnooze={flow.snoozeAlarm}
            timeFormat={flow.data.timeFormat}
          />
        </SafeAreaView>
        </View>
      </BlurTargetContext.Provider>
    </ThemeColorsContext.Provider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AtnaFlowApp />
    </ErrorBoundary>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  splashContent: { alignItems: 'center', paddingHorizontal: LAYOUT.screenGutter },
  splashOrb: { position: 'absolute', borderRadius: 999 },
  splashOrbOne: { width: 280, height: 280, backgroundColor: '#5B3DF5', opacity: 0.22, top: '8%', left: '-24%' },
  splashOrbTwo: { width: 240, height: 240, backgroundColor: '#0E7490', opacity: 0.18, bottom: '6%', right: '-22%' },
  splashLogoWrap: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center' },
  splashRing: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1.5,
    borderColor: '#8B7BFF',
  },
  splashLogo: { width: 96, height: 96, borderRadius: 24 },
  splashTitle: { marginTop: SPACE.lg, color: '#F4F7FB', fontSize: TYPE.heading, letterSpacing: TRACKING.subtle },
  splashSubtitle: { color: '#B6BAFF', fontSize: TYPE.body, fontWeight: '700', letterSpacing: TRACKING.label, marginTop: SPACE.xs },
  splashStatus: { alignItems: 'center', marginTop: SPACE.xl, gap: SPACE.sm },
  splashDots: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  splashDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5B3DF5', opacity: 0.45 },
  splashDotActive: { backgroundColor: '#B6BAFF', opacity: 1 },
  splashMuted: { color: '#98A8BC' },
  header: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenGutter,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, flexShrink: 1 },
  brandCopy: { flexShrink: 1 },
  brandIcon: { width: 44, height: 44, borderRadius: RADII.md },
  brandTitle: { fontSize: TYPE.headingSmall, fontWeight: '800', color: COLORS.text, letterSpacing: TRACKING.subtle },
  headerSubtitle: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs / 2 },
  clockBox: { alignItems: 'flex-end' },
  themeToggle: { width: 36, height: 36, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.xs },
  themeToggleText: { color: COLORS.primarySoft, fontSize: 24, fontWeight: '700' },
  version: { color: COLORS.muted, fontSize: TYPE.micro, marginTop: SPACE.xs / 2, fontVariant: ['tabular-nums'] },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  tabsViewport: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center' },
  tabs: { paddingHorizontal: LAYOUT.screenGutter, paddingBottom: SPACE.md, gap: SPACE.sm },
  activityContent: { width: '100%' },
  tab: {
    minHeight: 44,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  tabActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primaryStrong },
  tabPressed: { opacity: 0.76 },
  tabText: { color: COLORS.muted, fontWeight: '600', fontSize: TYPE.body },
  tabTextActive: { color: COLORS.text },
  tabBadge: { minWidth: 20, height: 20, paddingHorizontal: SPACE.xs, borderRadius: RADII.pill, backgroundColor: COLORS.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  tabBadgeActive: { backgroundColor: COLORS.primaryStrong },
  tabBadgeText: { color: COLORS.white, fontSize: TYPE.micro, fontWeight: '700' },
  pageScroll: { flex: 1 },
  page: { width: '100%', alignItems: 'center', paddingHorizontal: LAYOUT.screenGutter, paddingTop: SPACE.xs, paddingBottom: SPACE.section, gap: SPACE.md },
});
