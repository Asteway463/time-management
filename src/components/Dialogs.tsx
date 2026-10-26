import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, ChoiceRow, Field, ModalHeading } from './Common';
import { CATEGORIES, formatTime, WEEKDAY_NAMES, WEEKDAYS } from '../constants';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TRACKING, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { Alarm, Category, Priority, TimeFormat } from '../types';

type AlarmFormProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  time: string;
  setTime: (value: string) => void;
  label: string;
  setLabel: (value: string) => void;
  category: Alarm['category'];
  setCategory: (value: Alarm['category']) => void;
  challenge: Alarm['challenge'];
  setChallenge: (value: Alarm['challenge']) => void;
  days: number[];
  setDays: React.Dispatch<React.SetStateAction<number[]>>;
};

export function AlarmFormModal(props: AlarmFormProps) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <FormModal visible={props.visible} onClose={props.onClose}>
      <ModalHeading title="Create an alarm" onClose={props.onClose} />
      <Field label="Alarm name">
        <TextInput accessibilityLabel="Alarm name" value={props.label} onChangeText={props.setLabel} placeholder="Morning routine" placeholderTextColor={colors.muted} style={styles.input} maxLength={60} />
      </Field>
      <Field label="Time (24-hour)">
        <TextInput accessibilityLabel="Alarm time, 24-hour" value={props.time} onChangeText={props.setTime} placeholder="07:30" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" style={styles.input} maxLength={5} />
      </Field>
      <Field label="Category">
        <ChoiceRow<Alarm['category']> values={['Personal', ...CATEGORIES]} selected={props.category} onSelect={props.setCategory} />
      </Field>
      <Field label="Dismiss challenge">
        <ChoiceRow<Alarm['challenge']> values={['none', 'math']} selected={props.challenge} onSelect={props.setChallenge} labels={{ none: 'Standard', math: 'Simple math' }} />
      </Field>
      <Field label="Repeat days · leave empty for one time">
        <View style={styles.dayChoiceRow}>
          {WEEKDAYS.map((day, index) => (
            <Pressable
              key={`${day}-${index}`}
              accessibilityRole="checkbox"
              accessibilityLabel={WEEKDAY_NAMES[index]}
              accessibilityState={{ checked: props.days.includes(index) }}
              onPress={() => props.setDays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}
              style={({ pressed }) => [styles.dayChoice, props.days.includes(index) && styles.dayChoiceActive, pressed && styles.pressed]}
            >
              <Text style={[styles.dayText, props.days.includes(index) && styles.dayTextActive]}>{day}</Text>
            </Pressable>
          ))}
        </View>
      </Field>
      <ModalActions onCancel={props.onClose} onSave={props.onSave} saveLabel="Save alarm" />
    </FormModal>
  );
}

type TaskFormProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  setTitle: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  priority: Priority;
  setPriority: (value: Priority) => void;
  category: Category;
  setCategory: (value: Category) => void;
};

export function TaskFormModal(props: TaskFormProps) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <FormModal visible={props.visible} onClose={props.onClose}>
      <ModalHeading title="Schedule a task" onClose={props.onClose} />
      <Field label="Task title">
        <TextInput accessibilityLabel="Task title" value={props.title} onChangeText={props.setTitle} placeholder="What needs your attention?" placeholderTextColor={colors.muted} style={styles.input} maxLength={100} />
      </Field>
      <View style={styles.rowGap}>
        <View style={styles.flex}>
          <Field label="Start time">
            <TextInput accessibilityLabel="Task start time, 24-hour" value={props.time} onChangeText={props.setTime} placeholder="09:00" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" style={styles.input} maxLength={5} />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Duration (min)">
            <TextInput accessibilityLabel="Task duration in minutes" value={props.duration} onChangeText={props.setDuration} keyboardType="number-pad" style={styles.input} maxLength={3} />
          </Field>
        </View>
      </View>
      <Field label="Priority">
        <ChoiceRow<Priority> values={['High', 'Medium', 'Low']} selected={props.priority} onSelect={props.setPriority} />
      </Field>
      <Field label="Category">
        <ChoiceRow<Category> values={CATEGORIES} selected={props.category} onSelect={props.setCategory} />
      </Field>
      <ModalActions onCancel={props.onClose} onSave={props.onSave} saveLabel="Add task" />
    </FormModal>
  );
}

export function TimerSettingsModal({
  visible,
  onClose,
  onSave,
  settings,
  setSettings,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  settings: { work: string; short: string; long: string };
  setSettings: React.Dispatch<React.SetStateAction<{ work: string; short: string; long: string }>>;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <FormModal visible={visible} onClose={onClose}>
      <ModalHeading title="Timer settings" onClose={onClose} />
      <Field label="Focus session (minutes)">
        <TextInput accessibilityLabel="Focus session duration in minutes" value={settings.work} onChangeText={(value) => setSettings((current) => ({ ...current, work: value }))} keyboardType="number-pad" style={styles.input} maxLength={3} />
      </Field>
      <Field label="Short break (minutes)">
        <TextInput accessibilityLabel="Short break duration in minutes" value={settings.short} onChangeText={(value) => setSettings((current) => ({ ...current, short: value }))} keyboardType="number-pad" style={styles.input} maxLength={3} />
      </Field>
      <Field label="Long break (minutes)">
        <TextInput accessibilityLabel="Long break duration in minutes" value={settings.long} onChangeText={(value) => setSettings((current) => ({ ...current, long: value }))} keyboardType="number-pad" style={styles.input} maxLength={3} />
      </Field>
      <ModalActions onCancel={onClose} onSave={onSave} saveLabel="Save settings" />
    </FormModal>
  );
}

export function RingingAlarmModal({
  alarm,
  mathQuestion,
  mathInput,
  setMathInput,
  mathError,
  onVerify,
  onDismiss,
  onSnooze,
  timeFormat = '24h',
}: {
  alarm: Alarm | null;
  mathQuestion: string;
  mathInput: string;
  setMathInput: (value: string) => void;
  mathError: boolean;
  onVerify: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
  timeFormat?: TimeFormat;
}) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal visible={alarm !== null} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.ringBackdrop}>
        <ScrollView contentContainerStyle={styles.ringScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.ringCard}>
            <Text style={styles.ringIcon}>◉</Text>
            <Text style={styles.eyebrow}>{alarm?.category.toUpperCase()} ALARM</Text>
            <Text style={styles.ringTitle}>{alarm?.label}</Text>
            <Text style={styles.ringTime}>{alarm ? formatTime(alarm.time, timeFormat) : ''}</Text>
            {alarm?.challenge === 'math' ? (
              <>
                <Text style={styles.muted}>Solve this to dismiss</Text>
                <Text style={styles.mathQuestion}>{mathQuestion}</Text>
                <TextInput
                  accessibilityLabel="Math answer"
                  value={mathInput}
                  onChangeText={setMathInput}
                  keyboardType="number-pad"
                  placeholder="Answer"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                {mathError && <Text style={styles.errorText}>Not quite — try again.</Text>}
                <Button title="Check answer" onPress={onVerify} />
              </>
            ) : (
              <Button title="Dismiss alarm" onPress={onDismiss} />
            )}
            <Button title="Snooze for 5 minutes" variant="secondary" onPress={onSnooze} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FormModal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModalActions({ onCancel, onSave, saveLabel }: { onCancel: () => void; onSave: () => void; saveLabel: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.modalActions}>
      <View style={styles.actionButton}><Button title="Cancel" variant="secondary" onPress={onCancel} /></View>
      <View style={styles.actionButton}><Button title={saveLabel} onPress={onSave} /></View>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalScroll: { width: '100%', maxWidth: LAYOUT.modalMaxWidth, maxHeight: '92%', alignSelf: 'center' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADII.xxl, borderTopRightRadius: RADII.xxl, padding: SPACE.xl, paddingBottom: SPACE.section, gap: SPACE.md, borderWidth: 1, borderColor: COLORS.border },
  input: { color: COLORS.text, backgroundColor: COLORS.surfaceInset, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADII.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, fontSize: TYPE.body, minHeight: 48 },
  dayChoiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  dayChoice: { width: 44, height: 44, borderRadius: RADII.md, backgroundColor: COLORS.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  dayChoiceActive: { backgroundColor: COLORS.primaryStrong },
  dayText: { color: COLORS.muted, fontSize: TYPE.caption, fontWeight: '700' },
  dayTextActive: { color: COLORS.white },
  pressed: { opacity: 0.75 },
  rowGap: { flexDirection: 'row', gap: SPACE.md },
  flex: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xs },
  actionButton: { flex: 1 },
  ringBackdrop: { flex: 1, backgroundColor: COLORS.redMuted, justifyContent: 'center', alignItems: 'center', padding: SPACE.lg },
  ringScrollContent: { flexGrow: 1, justifyContent: 'center', width: '100%', alignItems: 'center' },
  ringCard: { width: '100%', maxWidth: 420, backgroundColor: COLORS.surface, borderColor: COLORS.red, borderWidth: 1, borderRadius: RADII.xxl, padding: SPACE.xl, alignItems: 'stretch', gap: SPACE.md },
  ringIcon: { color: COLORS.red, fontSize: TYPE.iconLarge, textAlign: 'center' },
  eyebrow: { color: COLORS.primarySoft, fontSize: TYPE.caption, fontWeight: '800', letterSpacing: TRACKING.label, textAlign: 'center' },
  ringTitle: { color: COLORS.text, fontSize: TYPE.heading, fontWeight: '800', textAlign: 'center' },
  ringTime: { color: COLORS.red, fontSize: TYPE.timer, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body, textAlign: 'center' },
  mathQuestion: { color: COLORS.text, fontSize: TYPE.heading, fontWeight: '800', textAlign: 'center' },
  errorText: { color: COLORS.red, textAlign: 'center', fontSize: TYPE.small },
});
