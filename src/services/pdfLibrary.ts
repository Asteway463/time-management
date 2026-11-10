import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { PdfDocument } from '../types';

const PDF_DIRECTORY = 'pdfs/';
const MAX_PAGES = 500;

export type PickedPdf = {
  uri: string;
  name: string;
  size?: number;
  base64?: string;
  file?: File;
};

export type ExtractedPdf = {
  numPages: number;
  pages: string[];
  title: string;
  author: string;
  truncated: boolean;
};

type PdfJsModule = {
  getDocument: (options: Record<string, unknown>) => {
    promise: Promise<{
      numPages: number;
      getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
      getPage: (page: number) => Promise<{
        getTextContent: () => Promise<{ items: { str?: string; hasEOL?: boolean }[] }>;
      }>;
    }>;
  };
};

let pdfjsPromise: Promise<PdfJsModule> | null = null;

function getPdfDirectory(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${PDF_DIRECTORY}`;
}

function safeName(name: string): string {
  const withoutExtension = name.replace(/\.pdf$/i, '').trim();
  const cleaned = withoutExtension.replace(/[^a-zA-Z0-9 _.-]/g, '').replace(/\s+/g, '-');
  return (cleaned || 'document').slice(0, 60);
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/^data:[^;]+;base64,/, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const length = Math.floor((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(length);
  let byteIndex = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = BASE64_ALPHABET.indexOf(clean[index] ?? 'A');
    const b = BASE64_ALPHABET.indexOf(clean[index + 1] ?? 'A');
    const c = BASE64_ALPHABET.indexOf(clean[index + 2] ?? 'A');
    const d = BASE64_ALPHABET.indexOf(clean[index + 3] ?? 'A');
    const chunk = (a << 18) | (b << 12) | (c << 6) | d;
    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < length) bytes[byteIndex++] = chunk & 0xff;
  }
  return bytes;
}

async function readPdfBytes(uri: string, base64?: string, file?: File): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    if (base64) return decodeBase64(base64);
    if (file) return new Uint8Array(await file.arrayBuffer());
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`The PDF could not be opened (HTTP ${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }
  const contents = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return decodeBase64(contents);
}

/**
 * Copies the picked PDF into app storage so the library still works after the
 * operating system clears the cache — the same approach used for backgrounds.
 */
export async function persistPdf(asset: PickedPdf): Promise<Pick<PdfDocument, 'title' | 'uri' | 'size'>> {
  const title = asset.name.replace(/\.pdf$/i, '').trim() || 'Untitled PDF';
  if (Platform.OS === 'web') {
    return { title: title.slice(0, 200), uri: asset.uri, size: asset.size ?? 0 };
  }

  const directory = getPdfDirectory();
  if (!directory) throw new Error('App storage is unavailable on this device.');
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const suffix = Math.random().toString(36).slice(2, 7);
  const destination = `${directory}${safeName(asset.name)}-${Date.now()}-${suffix}.pdf`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  let size = asset.size ?? 0;
  if (!size) {
    try {
      const info = await FileSystem.getInfoAsync(destination);
      size = 'size' in info && typeof info.size === 'number' ? info.size : 0;
    } catch {
      size = 0;
    }
  }
  return { title: title.slice(0, 200), uri: destination, size };
}

export async function removePdfFile(uri: string): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  const directory = getPdfDirectory();
  if (!directory || !uri.startsWith(directory)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // A missing file is already the desired end state.
  }
}

function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // Load the worker before the main build so it registers on globalThis.
      // `pdf.js` then runs the worker on the main thread, which keeps this
      // implementation compatible with Hermes and Metro without native code.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const worker = require('pdfjs-dist/build/pdf.worker.js') as unknown;
      if (worker && typeof worker === 'object') {
        (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('pdfjs-dist') as PdfJsModule;
    })().catch((error: unknown) => {
      pdfjsPromise = null;
      throw error;
    });
  }
  return pdfjsPromise;
}

function joinTextItems(items: { str?: string; hasEOL?: boolean }[]): string {
  let text = '';
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    text += item.str;
    if (item.hasEOL) text += '\n';
    else if (item.str && !/\s$/.test(item.str)) text += ' ';
  }
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts selectable text page by page. Image-only (scanned) PDFs return an
 * empty string for the page instead of throwing, so the reader can show a clear
 * "no text on this page" message.
 */
export async function extractPdfText(
  uri: string,
  options: { base64?: string; file?: File; maxPages?: number } = {},
): Promise<ExtractedPdf> {
  let data: Uint8Array;
  try {
    data = await readPdfBytes(uri, options.base64, options.file);
  } catch (readError) {
    throw new Error(`Could not read the PDF file: ${readError instanceof Error ? readError.message : String(readError)}`);
  }
  if (data.byteLength === 0) throw new Error('The selected file is empty.');

  let pdfjs: PdfJsModule;
  try {
    pdfjs = await loadPdfJs();
  } catch (loadError) {
    throw new Error(`PDF reader library failed to load: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
  }

  let doc: Awaited<ReturnType<PdfJsModule['getDocument']>['promise']>;
  try {
    const task = pdfjs.getDocument({
      data,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableFontFace: true,
      useSystemFonts: true,
      verbosity: 0,
    });
    doc = await task.promise;
  } catch (parseError) {
    throw new Error(`The PDF could not be parsed. It may be corrupted or use an unsupported feature. (${parseError instanceof Error ? parseError.message : String(parseError)})`);
  }

  const limit = Math.min(doc.numPages, options.maxPages ?? MAX_PAGES);
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
    try {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(joinTextItems(content.items));
    } catch (pageError) {
      // A single bad page must not fail the whole document.
      pages.push('');
    }
  }

  let title = '';
  let author = '';
  try {
    const metadata = await doc.getMetadata();
    const info = metadata.info ?? {};
    title = typeof info.Title === 'string' ? info.Title : '';
    author = typeof info.Author === 'string' ? info.Author : '';
  } catch {
    // Metadata is optional; a broken metadata block must not fail the reader.
  }

  return {
    numPages: doc.numPages,
    pages,
    title: title.slice(0, 200),
    author: author.slice(0, 120),
    truncated: doc.numPages > limit,
  };
}
