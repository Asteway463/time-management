import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, EmptyCard, ScreenHeading } from '../components/Common';
import { formatFileSize } from '../constants';
import {
  extractPdfText,
  persistPdf,
  type ExtractedPdf,
} from '../services/pdfLibrary';
import { LAYOUT, LINE_HEIGHT, RADII, SPACE, TYPE, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { PdfDocument } from '../types';

type Props = {
  pdfs: PdfDocument[];
  onAdd: (pdf: Pick<PdfDocument, 'title' | 'uri' | 'size'>) => void;
  onDelete: (id: string) => void;
  onProgress: (id: string, page: number) => void;
};

const FONT_SIZES = [14, 16, 18, 20, 23, 26];

export function LibraryScreen({ pdfs, onAdd, onDelete, onProgress }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [picking, setPicking] = useState(false);
  const [reader, setReader] = useState<PdfDocument | null>(null);
  const [doc, setDoc] = useState<ExtractedPdf | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fontIndex, setFontIndex] = useState(2);
  const [query, setQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  const sorted = useMemo(
    () => [...pdfs].sort((a, b) => (b.lastOpenedAt || b.addedAt) - (a.lastOpenedAt || a.addedAt)),
    [pdfs],
  );

  const openReader = async (pdf: PdfDocument) => {
    setReader(pdf);
    setDoc(null);
    setError('');
    setQuery('');
    setSearchMessage('');
    setLoading(true);
    const targetPage = Math.max(1, pdf.lastPage || 1);
    setPage(targetPage);
    try {
      const extracted = await extractPdfText(pdf.uri);
      const safePage = Math.min(Math.max(1, targetPage), Math.max(1, extracted.pages.length));
      setDoc(extracted);
      setPage(safePage);
      if (safePage !== targetPage) onProgress(pdf.id, safePage);
      else onProgress(pdf.id, safePage);
    } catch (reason) {
      setError(friendlyPdfError(reason));
    } finally {
      setLoading(false);
    }
  };

  const closeReader = () => {
    setReader(null);
    setDoc(null);
    setError('');
    setLoading(false);
    setQuery('');
    setSearchMessage('');
  };

  const addPdf = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
        base64: Platform.OS === 'web',
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      if (asset.mimeType && asset.mimeType !== 'application/pdf') {
        Alert.alert('Not a PDF', 'Choose a file with the .pdf extension.');
        return;
      }
      const stored = await persistPdf({
        uri: asset.uri,
        name: asset.name || 'Untitled.pdf',
        size: asset.size,
        base64: asset.base64,
        file: asset.file,
      });
      onAdd(stored);
    } catch (reason) {
      Alert.alert('Could not add that PDF', friendlyPdfError(reason));
    } finally {
      setPicking(false);
    }
  };

  const confirmDelete = (pdf: PdfDocument) => {
    Alert.alert('Remove PDF?', `"${pdf.title}" will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (reader?.id === pdf.id) closeReader();
          onDelete(pdf.id);
        },
      },
    ]);
  };

  const goToPage = (next: number) => {
    if (!doc || !reader) return;
    const clamped = Math.min(Math.max(1, next), Math.max(1, doc.pages.length));
    setPage(clamped);
    onProgress(reader.id, clamped);
  };

  const runSearch = () => {
    if (!doc) return;
    const needle = query.trim().toLowerCase();
    if (!needle) {
      setSearchMessage('');
      return;
    }
    const matches = doc.pages
      .map((text, index) => (text.toLowerCase().includes(needle) ? index + 1 : 0))
      .filter((value) => value > 0);
    if (matches.length === 0) {
      setSearchMessage('No page contains that text.');
      return;
    }
    const currentIndex = matches.findIndex((value) => value >= page);
    const target = currentIndex >= 0 ? matches[currentIndex] : matches[0];
    goToPage(target);
    setSearchMessage(`${matches.length} matching page${matches.length === 1 ? '' : 's'} · showing page ${target}`);
  };

  if (reader) {
    const pageText = doc?.pages[page - 1] ?? '';
    return (
      <View style={styles.content}>
        <View style={styles.readerHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to PDF library"
            onPress={closeReader}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹ Library</Text>
          </Pressable>
          <Text style={styles.readerTitle} numberOfLines={2}>{reader.title}</Text>
        </View>

        {loading && (
          <Card style={styles.centerCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Opening and reading this PDF on your device…</Text>
          </Card>
        )}

        {!loading && error.length > 0 && (
          <Card>
            <Text style={styles.errorTitle}>This PDF could not be opened</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try again" onPress={() => { void openReader(reader); }} />
            <Button title="Back to library" variant="secondary" onPress={closeReader} />
          </Card>
        )}

        {!loading && !error && doc && (
          <>
            <Card style={styles.readerCard}>
              <View style={styles.readerMetaRow}>
                <Text style={styles.readerMeta}>Page {page} of {doc.pages.length}</Text>
                <Text style={styles.readerMeta}>{formatFileSize(reader.size)}</Text>
              </View>
              {doc.author.length > 0 && <Text style={styles.readerMeta}>By {doc.author}</Text>}
              {doc.truncated && (
                <Text style={styles.notice}>
                  Very long PDF: only the first {doc.pages.length} pages were loaded to keep the app responsive.
                </Text>
              )}

              <View style={styles.readerControls}>
                <Button title="A−" small variant="secondary" onPress={() => setFontIndex((current) => Math.max(0, current - 1))} />
                <Button title="A+" small variant="secondary" onPress={() => setFontIndex((current) => Math.min(FONT_SIZES.length - 1, current + 1))} />
                <View style={styles.flex} />
                <Button title="‹ Prev" small variant="secondary" onPress={() => goToPage(page - 1)} />
                <Button title="Next ›" small variant="secondary" onPress={() => goToPage(page + 1)} />
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  accessibilityLabel="Search inside this PDF"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search this PDF"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.flex]}
                  returnKeyType="search"
                  onSubmitEditing={runSearch}
                />
                <Button title="Find" small onPress={runSearch} />
              </View>
              {searchMessage.length > 0 && <Text style={styles.notice}>{searchMessage}</Text>}

              <ScrollView style={styles.pageScroll} nestedScrollEnabled>
                {pageText.trim().length > 0 ? (
                  <Text selectable style={[styles.pageText, { fontSize: FONT_SIZES[fontIndex], lineHeight: FONT_SIZES[fontIndex] * 1.6 }]}>
                    {pageText}
                  </Text>
                ) : (
                  <Text style={styles.noText}>
                    This page has no selectable text. It may be a scanned image or a drawing-only page.
                  </Text>
                )}
              </ScrollView>

              <View style={styles.pageJumper}>
                <Button title="First page" small variant="secondary" onPress={() => goToPage(1)} />
                <Button title="Last page" small variant="secondary" onPress={() => goToPage(doc.pages.length)} />
              </View>
            </Card>
            <Text style={styles.footer}>Your place is saved automatically. Text is read locally; nothing is uploaded.</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <ScreenHeading
        title="PDF library"
        subtitle="Read PDFs inside the app. Files stay on this device."
        action={<Button title={picking ? 'Opening…' : 'Add PDF'} small onPress={() => { void addPdf(); }} />}
      />

      <Card>
        <Text style={styles.cardTitle}>A reader that works offline</Text>
        <Text style={styles.muted}>
          Pick a PDF, read page by page, search inside it, and change the text size. Scanned pages are
          shown with a clear notice instead of an error.
        </Text>
        <Button title={picking ? 'Opening file picker…' : 'Choose a PDF from this device'} onPress={() => { void addPdf(); }} variant="secondary" />
      </Card>

      {sorted.length === 0 && <EmptyCard text="No PDFs yet. Add one above and it will appear here." />}

      {sorted.map((pdf) => (
        <Card key={pdf.id}>
          <View style={styles.docHeader}>
            <View style={styles.flex}>
              <Text style={styles.docTitle} numberOfLines={2}>{pdf.title}</Text>
              <Text style={styles.docMeta}>
                {formatFileSize(pdf.size)} · {pdf.lastPage > 1 ? `continues on page ${pdf.lastPage}` : 'new'}
              </Text>
            </View>
          </View>
          <View style={styles.docActions}>
            <View style={styles.flex}><Button title="Read" onPress={() => { void openReader(pdf); }} /></View>
            <View style={styles.flex}><Button title="Remove" variant="danger" onPress={() => confirmDelete(pdf)} /></View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function friendlyPdfError(reason: unknown): string {
  const text = reason instanceof Error ? reason.message : String(reason);
  if (/password/i.test(text)) {
    return 'This PDF is password-protected. Remove the password and try again.';
  }
  if (/invalid|corrupt|format/i.test(text)) {
    return 'The file does not look like a valid PDF, or it is damaged.';
  }
  if (/storage|directory|permission/i.test(text)) {
    return 'The file could not be copied into app storage. Check free space and try again.';
  }
  return text || 'Unknown PDF error.';
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', gap: SPACE.md },
  cardTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surfaceInset,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    fontSize: TYPE.body,
    minHeight: 44,
  },
  flex: { flex: 1 },
  docHeader: { flexDirection: 'row', gap: SPACE.sm },
  docTitle: { color: COLORS.text, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  docMeta: { color: COLORS.muted, fontSize: TYPE.caption, marginTop: SPACE.xs },
  docActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
  readerHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  backButton: { minHeight: 44, justifyContent: 'center', paddingRight: SPACE.sm },
  backText: { color: COLORS.primarySoft, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  readerTitle: { color: COLORS.text, fontSize: TYPE.headingSmall, fontWeight: '800', flex: 1 },
  centerCard: { alignItems: 'center', paddingVertical: SPACE.xxl },
  errorTitle: { color: COLORS.red, fontSize: TYPE.bodyLarge, fontWeight: '700' },
  errorText: { color: COLORS.textSecondary, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body },
  readerCard: { gap: SPACE.sm },
  readerMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACE.sm },
  readerMeta: { color: COLORS.muted, fontSize: TYPE.caption },
  readerControls: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, flexWrap: 'wrap' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  pageScroll: { maxHeight: 460, backgroundColor: COLORS.surfaceInset, borderRadius: RADII.md, padding: SPACE.md },
  pageText: { color: COLORS.text, lineHeight: LINE_HEIGHT.relaxed },
  noText: { color: COLORS.muted, fontSize: TYPE.body, lineHeight: LINE_HEIGHT.body, textAlign: 'center', paddingVertical: SPACE.xl },
  pageJumper: { flexDirection: 'row', gap: SPACE.sm },
  notice: { color: COLORS.amber, fontSize: TYPE.caption, lineHeight: 17 },
  footer: { color: COLORS.muted, fontSize: TYPE.caption, textAlign: 'center' },
});
