import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Metric, ProgressBar, ScreenHeading } from '../components/Common';
import { AppIcon } from '../components/AppIcon';
import { formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, SPACE, TRACKING, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, FocusSession } from '../types';

type Props = {
  data: AppData;
  sessions: FocusSession[];
};

export function StatsScreen({ data, sessions }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const completedSessions = sessions.filter((s) => s.completed).length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const thisWeekMinutes = sessions
    .filter((s) => s.startedAt > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, s) => sum + s.duration, 0);

  const goalProgress = data.focus.dailyGoal > 0
    ? Math.min(100, Math.round((data.focus.totalFocusMinsToday / data.focus.dailyGoal) * 100))
    : 0;

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Statistics"
        subtitle="Track your focus progress over time."
      />

      <Card>
        <Text style={styles.eyebrow}>TODAY</Text>
        <Text style={styles.bigNumber}>{formatDuration(data.focus.totalFocusMinsToday)}</Text>
        <Text style={styles.muted}>Goal: {formatDuration(data.focus.dailyGoal)} · {goalProgress}%</Text>
        <ProgressBar progress={goalProgress} color={colors.green} />
      </Card>

      <View style={styles.metricsGrid}>
        <Metric label="This week" value={formatDuration(thisWeekMinutes)} color={colors.primary} />
        <Metric label="Total" value={formatDuration(totalMinutes)} color={colors.green} />
        <Metric label="Sessions" value={`${sessions.length}`} color={colors.amber} />
        <Metric label="Completed" value={`${completedSessions}`} color={colors.primarySoft} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Streak</Text>
        <View style={styles.streakRow}><AppIcon name="spark" size={20} color={colors.amber} /><Text style={styles.streakNumber}>{data.streak} days</Text></View>
        <Text style={styles.muted}>Keep your focus streak going!</Text>
      </Card>

      {sessions.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Recent sessions</Text>
          {sessions.slice(0, 5).map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <Text style={styles.sessionDate}>
                {new Date(session.startedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.sessionDuration}>
                {formatDuration(session.duration)} · {session.completed ? 'Completed' : 'Interrupted'}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  bigNumber: { color: COLORS.text, fontSize: TYPE.display, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: SPACE.xs },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700', marginBottom: SPACE.sm },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  streakNumber: { color: COLORS.amber, fontSize: TYPE.heading, fontWeight: '800' },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACE.xs },
  sessionDate: { color: COLORS.muted, fontSize: TYPE.caption },
  sessionDuration: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '600' },
});
