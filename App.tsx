import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveClock } from './src/components/Common';
import {
  AlarmFormModal,
  RingingAlarmModal,
  TaskFormModal,
  TimerSettingsModal,
} from './src/components/Dialogs';
import { TAB_LABELS } from './src/constants';
import { AlarmsScreen } from './src/screens/AlarmsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FocusScreen } from './src/screens/FocusScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { COLORS, LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE } from './src/theme';
import { useChronoFlow } from './src/useChronoFlow';

export default function App() {
  const flow = useChronoFlow();
  const closeForm = () => flow.setModal(null);
  const pendingTasks = flow.data.tasks.filter((task) => !task.completed).length;

  if (!flow.loaded) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar style="light" />
        <Text style={styles.brandTitle}>ChronoFlow</Text>
        <Text style={styles.muted}>Getting your day in order…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><Text style={styles.brandIconText}>◷</Text></View>
          <View>
            <Text style={styles.brandTitle}>ChronoFlow</Text>
            <Text style={styles.headerSubtitle}>Make time for what matters</Text>
          </View>
        </View>
        <View style={styles.clockBox}><LiveClock /></View>
      </View>

      <View style={styles.tabsViewport}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TAB_LABELS.map((item) => {
            const count = item.id === 'alarms'
              ? flow.activeAlarms.length
              : item.id === 'tasks' ? pendingTasks : 0;
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
        {flow.tab === 'dashboard' && (
          <DashboardScreen
            data={flow.data}
            activeAlarms={flow.activeAlarms}
            completedCount={flow.completedCount}
            progress={flow.progress}
            onNavigate={flow.setTab}
            onAddAlarm={() => flow.setModal('alarm')}
            onAddTask={() => flow.setModal('task')}
            onToggleTask={flow.toggleTask}
          />
        )}
        {flow.tab === 'alarms' && (
          <AlarmsScreen
            alarms={flow.data.alarms}
            nextAlarm={flow.nextAlarm}
            onAdd={() => flow.setModal('alarm')}
            onToggle={flow.changeAlarmActive}
            onDelete={flow.deleteAlarm}
          />
        )}
        {flow.tab === 'tasks' && (
          <PlannerScreen
            tasks={flow.data.tasks}
            filter={flow.filter}
            completedCount={flow.completedCount}
            onFilter={flow.setFilter}
            onAdd={() => flow.setModal('task')}
            onToggle={flow.toggleTask}
            onDelete={flow.deleteTask}
          />
        )}
        {flow.tab === 'focus' && (
          <FocusScreen
            data={flow.data}
            tasks={flow.data.tasks}
            mode={flow.focusMode}
            remaining={flow.remaining}
            timerRunning={flow.timerRunning}
            onMode={flow.selectFocusMode}
            onSettings={flow.openTimerSettings}
            onToggleTimer={flow.timerRunning ? flow.pauseFocusTimer : flow.startFocusTimer}
            onReset={flow.resetFocusTimer}
            onLinkTask={flow.linkFocusTask}
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
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
