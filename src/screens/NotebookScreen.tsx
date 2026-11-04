import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, EmptyCard, ScreenHeading } from '../components/Common';
import { LAYOUT, RADII, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { Note } from '../types';

type Props = {
  notes: Note[];
  onAdd: (title: string, body: string) => void;
  onUpdate: (id: string, title: string, body: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onTogglePin: (id: string) => void;
};

export function NotebookScreen({ notes, onAdd, onUpdate, onDelete, onRestore, onPurge, onTogglePin }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  const activeNotes = useMemo(() => notes.filter((note) => note.deletedAt === null), [notes]);
  const trashedNotes = useMemo(() => notes.filter((note) => note.deletedAt !== null), [notes]);
  const visibleNotes = useMemo(() => {
    const source = showTrash ? trashedNotes : activeNotes;
    const needle = query.trim().toLowerCase();
    return source
      .filter((note) => !needle
        || note.title.toLowerCase().includes(needle)
        || note.body.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [activeNotes, query, showTrash, trashedNotes]);

  const resetEditor = () => {
    setEditing(null);
    setTitle('');
    setBody('');
  };

  const saveNote = () => {
    if (!title.trim() && !body.trim()) return;
    if (editing) {
      onUpdate(editing, title, body);
    } else {
      onAdd(title, body);
    }
    resetEditor();
  };

  const startEditing = (note: Note) => {
    setEditing(note.id);
    setTitle(note.title);
    setBody(note.body);
  };

  const confirmPurge = (note: Note) => {
    Alert.alert('Delete forever?', 'This note cannot be recovered.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onPurge(note.id) },
    ]);
  };

  return (
    <View style={styles.content}>
      <ScreenHeading title="Notebook" subtitle="Notes are saved on this device." />

      <Card>
        <TextInput
          accessibilityLabel="Note title"
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.muted}
          style={styles.titleInput}
          maxLength={200}
        />
        <TextInput
          accessibilityLabel="Note body"
          value={body}
          onChangeText={setBody}
          placeholder="Write your note..."
          placeholderTextColor={colors.muted}
          style={styles.bodyInput}
          multiline
          maxLength={20_000}
        />
        <View style={styles.editorActions}>
          <View style={styles.flex}>
            <Button title={editing ? 'Update note' : 'Add note'} onPress={saveNote} />
          </View>
          {editing !== null && (
            <View style={styles.flex}>
              <Button title="Cancel" variant="secondary" onPress={resetEditor} />
            </View>
          )}
        </View>
      </Card>

      <TextInput
        accessibilityLabel="Search notes"
        value={query}
        onChangeText={setQuery}
        placeholder="Search notes..."
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
      />

      <Button
        title={showTrash ? `Back to notes (${activeNotes.length})` : `Trash (${trashedNotes.length})`}
        variant="secondary"
        onPress={() => setShowTrash((current) => !current)}
      />

      {visibleNotes.length === 0 && (
        <EmptyCard text={showTrash
          ? 'Trash is empty.'
          : query.trim() ? 'No notes match your search.' : 'No notes yet. Write one above.'} />
      )}

      {visibleNotes.map((note) => (
        <Card key={note.id}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle} numberOfLines={2}>
              {note.pinned ? 'Pinned · ' : ''}{note.title}
            </Text>
            {!showTrash && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                hitSlop={8}
                onPress={() => onTogglePin(note.id)}
                style={({ pressed }) => [styles.pinButton, pressed && styles.pressed]}
              >
                <Text style={styles.pinText}>{note.pinned ? 'Unpin' : 'Pin'}</Text>
              </Pressable>
            )}
          </View>
          {note.body.length > 0 && <Text style={styles.noteBody}>{note.body}</Text>}
          <Text style={styles.noteMeta}>
            {new Date(note.deletedAt ?? note.updatedAt).toLocaleString()}
          </Text>
          {!showTrash ? (
            <View style={styles.noteActions}>
              <View style={styles.flex}><Button title="Edit" small variant="secondary" onPress={() => startEditing(note)} /></View>
              <View style={styles.flex}><Button title="Delete" small variant="danger" onPress={() => onDelete(note.id)} /></View>
            </View>
          ) : (
            <View style={styles.noteActions}>
              <View style={styles.flex}><Button title="Restore" small onPress={() => onRestore(note.id)} /></View>
              <View style={styles.flex}><Button title="Delete forever" small variant="danger" onPress={() => confirmPurge(note)} /></View>
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  titleInput: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: TYPE.bodyLarge,
    minHeight: 44,
    paddingVertical: SPACE.xs,
  },
  bodyInput: {
    color: COLORS.text,
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: TYPE.body,
  },
  searchInput: {
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACE.md,
    minHeight: 48,
    borderRadius: RADII.md,
    fontSize: TYPE.body,
  },
  editorActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xs },
  flex: { flex: 1 },
  noteHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACE.sm },
  noteTitle: { color: COLORS.text, fontWeight: '700', fontSize: TYPE.bodyLarge, flex: 1 },
  pinButton: { minHeight: 40, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  pinText: { color: COLORS.primarySoft, fontSize: TYPE.small, fontWeight: '700' },
  noteBody: { color: COLORS.textSecondary, fontSize: TYPE.body, lineHeight: 20, marginTop: SPACE.xs },
  noteMeta: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.sm },
  noteActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
  pressed: { opacity: 0.75 },
});
