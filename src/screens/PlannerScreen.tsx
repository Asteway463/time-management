import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, EmptyCard, ScreenHeading, TaskRow } from '../components/Common';
import { CATEGORIES } from '../constants';
import { COLORS, LAYOUT, SPACE, TYPE } from '../theme';
import type { Category, Task } from '../types';

type Props = {
  tasks: Task[];
  filter: Category | 'All';
  completedCount: number;
  onFilter: (filter: Category | 'All') => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function PlannerScreen({ tasks, filter, completedCount, onFilter, onAdd, onToggle, onDelete }: Props) {
  const filteredTasks = tasks.filter((task) => filter === 'All' || task.category === filter);
  return (
    <View style={styles.content}>
      <ScreenHeading
        title="Planner & tasks"
        subtitle="Block time for the things you want to finish."
        action={<Button title="+ Add task" onPress={onAdd} small />}
      />
      <Card>
        <ChoiceRow values={['All', ...CATEGORIES]} selected={filter} onSelect={onFilter} />
        <Text style={styles.smallMuted}>{completedCount}/{tasks.length} tasks completed</Text>
      </Card>
      {filteredTasks.length === 0 && <EmptyCard text="No tasks match this view. Add one to plan your time." />}
      {filteredTasks.map((task) => (
        <Card key={task.id}>
          <TaskRow task={task} onToggle={() => onToggle(task.id)} onDelete={() => onDelete(task.id)} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  smallMuted: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
});
