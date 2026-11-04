import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const BACKGROUND_DIRECTORY = 'backgrounds/';

function getBackgroundDirectory(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${BACKGROUND_DIRECTORY}`;
}

function extensionFor(uri: string): string {
  const match = /\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Copies a picked image into the app's document directory. Image-picker URIs
 * often point at a cache file that Android may delete, which would leave the
 * saved background broken after a restart.
 */
export async function persistBackgroundImage(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  const directory = getBackgroundDirectory();
  if (!directory) throw new Error('App storage is unavailable on this device.');

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const suffix = Math.random().toString(36).slice(2, 7);
  const destination = `${directory}background-${Date.now()}-${suffix}.${extensionFor(sourceUri)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function removeBackgroundImage(uri: string | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  const directory = getBackgroundDirectory();
  if (!directory || !uri.startsWith(directory)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // A missing file is already the desired end state.
  }
}
