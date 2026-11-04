import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultData, STORAGE_KEY, todayKey } from './constants';
import { parseAppData } from './dataValidation';
import type { AppData } from './types';

const BACKUP_KEY_PREFIX = 'asttime-unreadable-';

async function keepRecoveryCopy(raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${BACKUP_KEY_PREFIX}${Date.now()}`, raw);
  } catch {
    // Best effort only: the original read failure is the error worth reporting.
  }
}

export async function loadAppData(): Promise<AppData> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === null) return defaultData();

  let data: AppData;
  try {
    data = parseAppData(JSON.parse(stored) as unknown);
  } catch (error) {
    await keepRecoveryCopy(stored);
    throw error;
  }

  const today = todayKey();
  if (data.focus.focusDate !== today) {
    return {
      ...data,
      focus: { ...data.focus, focusDate: today, totalFocusMinsToday: 0 },
    };
  }
  return data;
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export { parseAppData };
