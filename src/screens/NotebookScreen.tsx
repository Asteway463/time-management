import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, ScreenHeading } from '../components/Common';
import { LAYOUT, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
type Note = { id: string; title: string; body: string; createdAt: number; pinned: boolean };
type Props = { data: any };
export function NotebookScreen({ data }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [trash, setTrash] = useState<Note[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const addNote = () => {
    if (!title.trim() && !body.trim()) return;
    const n: Note = { id: String(Date.now()), title: title.trim() || 'Untitled', body: body.trim(), createdAt: Date.now(), pinned: false };
    if (editing) { setNotes(notes.map((x) => x.id === editing ? { ...x, title: n.title, body: n.body } : x)); setEditing(null); }
    else setNotes([n, ...notes]);
    setTitle(''); setBody('');
  };
  const confirmDelete = (n: Note) => {
    Alert.alert('Delete note?', 'This note will move to trash.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { setNotes(notes.filter((x) => x.id !== n.id)); setTrash([n, ...trash]); } },
    ]);
  };
  const restore = (n: Note) => { setTrash(trash.filter((x) => x.id !== n.id)); setNotes([n, ...notes]); };
  const purge = (n: Note) => { setTrash(trash.filter((x) => x.id !== n.id)); };
  const togglePin = (n: Note) => setNotes(notes.map((x) => x.id === n.id ? { ...x, pinned: !x.pinned } : x));
  const filtered = notes.filter((n) => (n.title + ' ' + n.body).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return (
    <View style={styles.content}>
      <ScreenHeading title="Notebook" subtitle="Your personal notes." />
      <Card>
        <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.muted}
          style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 6 }} />
        <TextInput value={body} onChangeText={setBody} placeholder="Write your note..." placeholderTextColor={colors.muted}
          style={{ color: colors.text, minHeight: 80, textAlignVertical: 'top' }} multiline />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Button title={editing ? 'Update' : 'Add note'} onPress={addNote} />
          {editing && <Button title="Cancel" variant="secondary" onPress={() => { setEditing(null); setTitle(''); setBody(''); }} />}
        </View>
      </Card>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search notes..." placeholderTextColor={colors.muted}
        style={{ color: colors.text, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }} />
      <Button title={showTrash ? `Hide trash (${trash.length})` : `Trash (${trash.length})`} variant="secondary" onPress={() => setShowTrash(!showTrash)} />
      {(showTrash ? trash : filtered).map((n) => (
        <Card key={n.id}>
          <Pressable onLongPress={() => !showTrash && confirmDelete(n)} delayLongPress={800}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{n.pinned ? '📌 ' : ''}{n.title}</Text>
              {!showTrash && <Pressable onPress={() => togglePin(n)}><Text style={{ color: colors.muted, fontSize: 12 }}>{n.pinned ? 'Unpin' : 'Pin'}</Text></Pressable>}
            </View>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{n.body}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</Text>
            {!showTrash && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="Edit" small variant="secondary" onPress={() => { setEditing(n.id); setTitle(n.title); setBody(n.body); }} />
                <Button title="Delete" small variant="danger" onPress={() => confirmDelete(n)} />
              </View>
            )}
            {showTrash && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="Restore" small onPress={() => restore(n)} />
                <Button title="Delete forever" small variant="danger" onPress={() => purge(n)} />
              </View>
            )}
          </Pressable>
        </Card>
      ))}
      {(showTrash ? trash : filtered).length === 0 && (
        <Card><Text style={{ color: colors.muted, textAlign: 'center' }}>{showTrash ? 'Trash is empty.' : 'No notes yet.'}</Text></Card>
      )}
    </View>
  );
}
const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
});