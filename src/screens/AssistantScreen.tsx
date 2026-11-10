import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, EmptyCard, ScreenHeading } from '../components/Common';
import {
  breakDownGoal,
  coachInsights,
  nextBestTask,
  parseDayPlan,
  summarizeNotes,
  type GoalStep,
  type PlanItem,
} from '../ai';
import { formatDuration } from '../constants';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { AppData, Tab } from '../types';

type Props = {
  data: AppData;
  onAddPlan: (items: PlanItem[]) => void;
  onStartFocus: (minutes: number) => void;
  onNavigate: (tab: Tab) => void;
};

export function AssistantScreen({ data, onAddPlan, onStartFocus, onNavigate }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [planInput, setPlanInput] = useState('');
  const [preview, setPreview] = useState<PlanItem[]>([]);
  const [planNotice, setPlanNotice] = useState('');
  const [goal, setGoal] = useState('');
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [summary, setSummary] = useState('');
  const [summaryOpened, setSummaryOpened] = useState(false);

  const insights = useMemo(() => coachInsights(data), [data]);
  const best = useMemo(() => nextBestTask(data), [data]);
  const pendingCount = data.tasks.filter((task) => !task.completed).length;

  const buildPlan = () => {
    const result = parseDayPlan(planInput, {
      startMinutes: Math.max(9 * 60, new Date().getHours() * 60 + new Date().getMinutes()),
    });
    setPreview(result.items);
    if (result.items.length === 0) {
      setPlanNotice('I could not find a task there. Try a line like "Study maths for 45 minutes at 9am".');
      return;
    }
    const notes = [
      result.usedFallbackTime ? 'Some items had no time, so they were placed in the next free slot.' : '',
      result.skipped.length > 0 ? `${result.skipped.length} fragment${result.skipped.length === 1 ? '' : 's'} could not be understood.` : '',
    ].filter(Boolean);
    setPlanNotice(notes.join(' '));
  };

  const acceptPlan = () => {
    if (preview.length === 0) return;
    onAddPlan(preview);
    setPreview([]);
    setPlanInput('');
    setPlanNotice(`Added ${preview.length} task${preview.length === 1 ? '' : 's'} to your planner.`);
  };

  const makeSteps = () => {
    setSteps(breakDownGoal(goal));
  };

  const acceptSteps = () => {
    if (steps.length === 0) return;
    const startHour = Math.max(9, new Date().getHours());
    let cursor = startHour * 60;
    const items: PlanItem[] = steps.map((step) => {
      const minutes = cursor;
      cursor += step.duration + 5;
      return {
        title: step.title,
        time: `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
        duration: step.duration,
        priority: step.priority,
        category: step.category,
      };
    });
    onAddPlan(items);
    setSteps([]);
    setGoal('');
    setPlanNotice(`Added ${items.length} goal steps to your planner.`);
  };

  const makeSummary = () => {
    setSummary(summarizeNotes(data));
    setSummaryOpened(true);
  };

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="AI assistant"
        subtitle="On-device planning and coaching. Your data never leaves this phone."
      />

      <Card>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>PRIVATE · ON DEVICE</Text>
          <Text style={styles.badgeMeta}>{pendingCount} open · {formatDuration(data.focus.totalFocusMinsToday)} focused</Text>
        </View>
        <Text style={styles.cardTitle}>Plan your day in plain language</Text>
        <Text style={styles.muted}>
          Write one task per line. Include a time and duration when you have one. For example:
          {'\n'}“Study maths for 45 minutes at 9am, gym at 6pm”
        </Text>
        <TextInput
          accessibilityLabel="Describe your day"
          value={planInput}
          onChangeText={setPlanInput}
          placeholder={'Read chapter 4 for 30 minutes at 10am\nGo for a run at 6pm'}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
          maxLength={2000}
        />
        <View style={styles.actionRow}>
          <View style={styles.flex}><Button title="Build a plan" onPress={buildPlan} /></View>
          <View style={styles.flex}>
            <Button
              title="Clear"
              variant="secondary"
              onPress={() => { setPlanInput(''); setPreview([]); setPlanNotice(''); }}
            />
          </View>
        </View>
        {planNotice.length > 0 && <Text style={styles.notice}>{planNotice}</Text>}
        {preview.length > 0 && (
          <View style={styles.preview}>
            {preview.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.previewRow}>
                <Text style={styles.previewTime}>{item.time}</Text>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {item.title}
                  <Text style={styles.previewMeta}>{`  ·  ${item.duration}m · ${item.priority} · ${item.category}`}</Text>
                </Text>
              </View>
            ))}
            <Button title={`Add ${preview.length} task${preview.length === 1 ? '' : 's'} to planner`} onPress={acceptPlan} />
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{"TODAY'S COACHING"}</Text>
        {insights.length === 0 && <EmptyCard text="Add a task or run a focus session and coaching will appear here." />}
        {insights.map((insight, index) => (
          <View key={`${insight.title}-${index}`} style={[styles.insight, insight.tone === 'good' && styles.insightGood, insight.tone === 'warn' && styles.insightWarn]}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightDetail}>{insight.detail}</Text>
          </View>
        ))}
        {best && (
          <View style={styles.actionRow}>
            <View style={styles.flex}>
              <Button
                title={`Focus ${Math.min(25, Math.max(5, data.focus.workMins))} min`}
                onPress={() => onStartFocus(Math.min(25, Math.max(5, data.focus.workMins)))}
              />
            </View>
            <View style={styles.flex}>
              <Button title="Open planner" variant="secondary" onPress={() => onNavigate('planner')} />
            </View>
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Break a goal into steps</Text>
        <Text style={styles.muted}>Turn a vague goal into a first session you can actually start.</Text>
        <TextInput
          accessibilityLabel="Describe a goal"
          value={goal}
          onChangeText={setGoal}
          placeholder="Finish my final project"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={300}
        />
        <Button title="Break it down" onPress={makeSteps} variant="secondary" />
        {steps.length > 0 && (
          <View style={styles.preview}>
            {steps.map((step, index) => (
              <View key={`${step.title}-${index}`} style={styles.previewRow}>
                <Text style={styles.previewTime}>{step.duration}m</Text>
                <Text style={styles.previewTitle} numberOfLines={3}>{step.title}</Text>
              </View>
            ))}
            <Button title="Add all steps to planner" onPress={acceptSteps} />
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Summarise my notes</Text>
        <Text style={styles.muted}>An extractive summary of your most recently edited notes.</Text>
        <Button title={summaryOpened ? 'Refresh summary' : 'Summarise notes'} onPress={makeSummary} variant="secondary" />
        {summaryOpened && (
          summary.length > 0
            ? <Text style={styles.summary}>{summary}</Text>
            : <Text style={styles.muted}>There are no notes to summarise yet.</Text>
        )}
        <Button title="Open notebook" variant="secondary" onPress={() => onNavigate('notebook')} />
      </Card>

      <Text style={styles.footer}>
        This assistant uses transparent, rule-based logic on your device. It is not a cloud AI model and it never needs an API key.
      </Text>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, flexWrap: 'wrap' },
  badge: { color: COLORS.green, fontSize: TYPE.micro, fontWeight: '800', letterSpacing: TRACKING.badge, backgroundColor: COLORS.greenMuted, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, borderRadius: RADII.pill },
  badgeMeta: { color: COLORS.muted, fontSize: TYPE.caption },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  sectionTitle: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surfaceInset,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
    fontSize: TYPE.body,
    minHeight: 48,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: SPACE.sm },
  flex: { flex: 1 },
  notice: { color: COLORS.amber, fontSize: TYPE.caption, lineHeight: 18 },
  preview: { gap: SPACE.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingTop: SPACE.md },
  previewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  previewTime: { color: COLORS.primarySoft, fontWeight: '800', fontSize: TYPE.small, fontVariant: ['tabular-nums'], minWidth: 44 },
  previewTitle: { color: COLORS.text, fontSize: TYPE.body, flex: 1, lineHeight: LINE_HEIGHT.body },
  previewMeta: { color: COLORS.muted, fontSize: TYPE.caption, fontWeight: '400' },
  insight: { borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: SPACE.md, paddingVertical: SPACE.xs, gap: SPACE.xs },
  insightGood: { borderLeftColor: COLORS.green },
  insightWarn: { borderLeftColor: COLORS.amber },
  insightTitle: { color: COLORS.text, fontSize: TYPE.body, fontWeight: '700' },
  insightDetail: { color: COLORS.muted, fontSize: TYPE.caption, lineHeight: 18 },
  summary: { color: COLORS.textSecondary, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.relaxed, backgroundColor: COLORS.surfaceInset, borderRadius: RADII.md, padding: SPACE.md },
  footer: { color: COLORS.muted, fontSize: TYPE.caption, lineHeight: 17, textAlign: 'center', paddingHorizontal: SPACE.md },
});
