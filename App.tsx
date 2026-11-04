import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './src/components/AppIcon';
import { LiveClock } from './src/components/Common';
import {
  AlarmFormModal,
  AppPickerModal,
  RingingAlarmModal,
  ScheduleFormModal,
  TaskFormModal,
  TimerSettingsModal,
} from './src/components/Dialogs';
import { TAB_LABELS } from './src/constants';
import { AlarmsScreen } from './src/screens/AlarmsScreen';
import { BlockingScreen } from './src/screens/BlockingScreen';
import { FocusScreen } from './src/screens/FocusScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { NotebookScreen } from './src/screens/NotebookScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { COLORS, LIGHT_COLORS, LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, ThemeColorsContext, type ThemeColors } from './src/theme';
import { useChronoFlow } from './src/useChronoFlow';

export default function App() {
  const flow = useChronoFlow();
  const systemColorScheme = useColorScheme();
  const colors = flow.data.theme === 'system' && systemColorScheme === 'light'
    ? LIGHT_COLORS
    : flow.data.theme === 'light' ? LIGHT_COLORS : COLORS;
  const styles = createStyles(colors);
  const closeForm = () => flow.setModal(null);
  const pendingTasks = flow.data.tasks.filter((task) => !task.completed).length;
  const activityProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    activityProgress.setValue(0);
    Animated.timing(activityProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flow.tab, activityProgress]);

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(logoRotate, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(bgAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textTranslate, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    });
  }, [logoScale, logoRotate, bgAnim, textOpacity, textTranslate]);
  const bgColor = bgAnim.interpolate({ inputRange: [0, 1], outputRange: ['#0B0F19', '#1a1040'] });
  if (!flow.loaded) {
    return (
      <Animated.View style={[styles.loading, { backgroundColor: bgColor, flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style={colors === LIGHT_COLORS ? 'dark' : 'light'} />
        <Animated.View style={{ transform: [{ scale: logoScale }, { rotate: logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <Image source={require('./assets/icon.png')} style={{ width: 96, height: 96, borderRadius: 24 }} />
        </Animated.View>
        <Animated.Text style={[styles.brandTitle, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}>ATNA Timmer</Animated.Text>
        <Animated.Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, opacity: textOpacity }}>Build with Asteway</Animated.Text>
        <Animated.Text style={[styles.muted, { opacity: textOpacity }]}>Getting your day in order…</Animated.Text>
      </Animated.View>
    );
  }

  return (
    <ThemeColorsContext.Provider value={colors}>
    <ImageBackground source={flow.data.backgroundImage ? { uri: flow.data.backgroundImage } : require('./assets/background.jpg')} style={{ flex: 1 }} imageStyle={{ opacity: 1 }}>
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
      <StatusBar style={colors === LIGHT_COLORS ? 'dark' : 'light'} />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><Image source={require('./assets/icon.png')} style={{ width: 26, height: 26, borderRadius: 6 }} /></View>
          <View>
            <Text style={styles.brandTitle}>ATNA Timmer</Text>
            <Text style={styles.headerSubtitle}>Make time for what matters</Text>
          </View>
        </View>
        <View style={styles.clockBox}><LiveClock timeFormat={flow.data.timeFormat} /><Pressable onPress={() => Alert.alert('Version', 'ChronoFlow v1.0.0 — up to date')} style={{ marginTop: 4 }}><Text style={{ color: colors.muted, fontSize: 10 }}>Update</Text></Pressable></View>
      </View>

      <View style={styles.tabsViewport}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TAB_LABELS.map((item) => {
            const count = item.id === 'home'
              ? pendingTasks
              : item.id === 'focus' ? 0 : 0;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: flow.tab === item.id }}
                accessibilityLabel={count ? `${item.label}, ${count}` : item.label}
                key={item.id}
                onPress={() => flow.setTab(item.id)}
                style={({ pressed }) => [styles.tab, flow.tab === item.id && styles.tabActive, pressed && styles.tabPressed]}
              >
                <AppIcon name={item.icon} size={18} color={flow.tab === item.id ? colors.white : colors.muted} />
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
            isBlocking={flow.isBlocking}
            onMode={flow.selectFocusMode}
            onSettings={flow.openTimerSettings}
            onToggleTimer={flow.timerRunning ? flow.pauseFocusTimer : flow.startFocusTimer}
            onReset={flow.resetFocusTimer}
            onQuickFocus={flow.startQuickFocus}
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
        {flow.tab === 'blocking' && (
          <BlockingScreen
            blockedApps={flow.data.blockedApps}
            schedules={flow.data.schedules}
            onAddApp={flow.openAddAppPicker}
            onRemoveApp={flow.removeBlockedApp}
            onToggleApp={flow.toggleBlockedApp}
            onAddSchedule={flow.openAddScheduleModal}
            onRemoveSchedule={flow.removeSchedule}
            onToggleSchedule={flow.toggleSchedule}
            timeFormat={flow.data.timeFormat}
            accessibilityEnabled={flow.accessibilityEnabled}
          />
        )}
        {flow.tab === 'stats' && (
          <StatsScreen
            data={flow.data}
            sessions={flow.data.focusSessions}
          />
        )}
        {flow.tab === 'notebook' && (
          <NotebookScreen data={flow.data} />
        )}
        {flow.tab === 'settings' && (
          <SettingsScreen
            data={flow.data}
            onToggleNotifications={flow.toggleNotifications}
            onSetTheme={flow.setTheme}
            onSetTimeFormat={flow.setTimeFormat}
            onSetBackgroundImage={flow.setBackgroundImage}
            onClearData={flow.clearAllData}
            onExportData={flow.exportData}
          />
        )}
        </Animated.View>
      </ScrollView>

      <AlarmFormModal
        visible={flow.modal === 'alarm'}
        onClose={() => {
          closeForm();
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
          closeForm();
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
        onClose={closeForm}
        onSave={flow.saveTimerSettings}
        settings={flow.settings}
        setSettings={flow.setSettings}
      />
      <ScheduleFormModal
        visible={flow.modal === 'schedule'}
        onClose={closeForm}
        onSave={flow.addSchedule}
        startTime={flow.newScheduleStart}
        setStartTime={flow.setNewScheduleStart}
        endTime={flow.newScheduleEnd}
        setEndTime={flow.setNewScheduleEnd}
        days={flow.newScheduleDays}
        setDays={flow.setNewScheduleDays}
      />
      <AppPickerModal
        visible={flow.modal === 'appPicker'}
        onClose={closeForm}
        onSelect={flow.selectAppToBlock}
        apps={flow.installedApps}
        loading={flow.loadingApps}
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
    </ImageBackground>
    </ThemeColorsContext.Provider>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  brandIcon: { width: 52, height: 52, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: TYPE.headingSmall, fontWeight: '800', color: COLORS.text, letterSpacing: TRACKING.subtle },
  headerSubtitle: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs / 2 },
  clockBox: { alignItems: 'flex-end' },
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
  tabTextActive: { color: COLORS.white },
  tabBadge: { minWidth: 20, height: 20, paddingHorizontal: SPACE.xs, borderRadius: RADII.pill, backgroundColor: COLORS.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  tabBadgeActive: { backgroundColor: COLORS.primaryStrong },
  tabBadgeText: { color: COLORS.white, fontSize: TYPE.micro, fontWeight: '700' },
  pageScroll: { flex: 1 },
  page: { width: '100%', alignItems: 'center', paddingHorizontal: LAYOUT.screenGutter, paddingTop: SPACE.xs, paddingBottom: SPACE.section, gap: SPACE.md },
});
