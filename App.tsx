import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveClock } from './src/components/Common';
import {
  AlarmFormModal,
  RingingAlarmModal,
  TaskFormModal,
  TimerSettingsModal,
} from './src/components/Dialogs';
import { TAB_LABELS } from './src/constants';
import { BlockingScreen } from './src/screens/BlockingScreen';
import { FocusScreen } from './src/screens/FocusScreen';
import { HomeScreen } from './src/screens/HomeScreen';
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

  if (!flow.loaded) {
    return (
      <SafeAreaView style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={colors === LIGHT_COLORS ? 'dark' : 'light'} />
        <Text style={styles.brandTitle}>AST Time</Text>
        <Text style={styles.muted}>Getting your day in order…</Text>
      </SafeAreaView>
    );
  }

  return (
    <ThemeColorsContext.Provider value={colors}>
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={colors === LIGHT_COLORS ? 'dark' : 'light'} />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><Text style={styles.brandIconText}>◷</Text></View>
          <View>
            <Text style={styles.brandTitle}>AST Time</Text>
            <Text style={styles.headerSubtitle}>Block distractions. Focus on what matters</Text>
          </View>
        </View>
        <View style={styles.clockBox}><LiveClock timeFormat={flow.data.timeFormat} /></View>
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
        {flow.tab === 'home' && (
          <HomeScreen
            data={flow.data}
            completedCount={flow.completedCount}
            progress={flow.progress}
            onNavigate={flow.setTab}
            onAddTask={() => flow.setModal('task')}
            onToggleTask={flow.toggleTask}
            onQuickFocus={flow.startFocusTimer}
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
            onQuickFocus={flow.startFocusTimer}
          />
        )}
        {flow.tab === 'blocking' && (
          <BlockingScreen
            blockedApps={flow.data.blockedApps}
            schedules={flow.data.schedules}
            onAddApp={flow.openAddAppModal}
            onRemoveApp={flow.removeBlockedApp}
            onToggleApp={flow.toggleBlockedApp}
            onAddSchedule={flow.openAddScheduleModal}
            onRemoveSchedule={flow.removeSchedule}
            onToggleSchedule={flow.toggleSchedule}
            onOpenPermissions={flow.openPermissions}
            timeFormat={flow.data.timeFormat}
          />
        )}
        {flow.tab === 'stats' && (
          <StatsScreen
            data={flow.data}
            sessions={flow.data.focusSessions}
          />
        )}
        {flow.tab === 'settings' && (
          <SettingsScreen
            data={flow.data}
            onToggleNotifications={flow.toggleNotifications}
            onSetTheme={flow.setTheme}
            onSetTimeFormat={flow.setTimeFormat}
            onClearData={flow.clearAllData}
            onExportData={flow.exportData}
          />
        )}
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
  brandIcon: { width: 44, height: 44, borderRadius: RADII.md, backgroundColor: COLORS.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: TYPE.icon, color: COLORS.white, fontWeight: '700' },
  brandTitle: { fontSize: TYPE.headingSmall, fontWeight: '800', color: COLORS.text, letterSpacing: TRACKING.subtle },
  headerSubtitle: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs / 2 },
  clockBox: { alignItems: 'flex-end' },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  tabsViewport: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center' },
  tabs: { paddingHorizontal: LAYOUT.screenGutter, paddingBottom: SPACE.md, gap: SPACE.sm },
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
