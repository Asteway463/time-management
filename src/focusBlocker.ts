import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type InstalledApp = { packageName: string; name: string; icon: string };
type FocusBlockerNative = {
  isAvailable(): boolean;
  isAccessibilityEnabled(): boolean;
  getInstalledApps(): Promise<InstalledApp[]>;
  openAccessibilitySettings(): void;
  startSession(packages: string[], endAt: number, playAudio: boolean): boolean;
  pauseSession(): void;
  resumeSession(): void;
  stopSession(): void;
  cancelSession(): void;
};

const native = Platform.OS === 'android'
  ? requireOptionalNativeModule<FocusBlockerNative>('FocusBlocker') ?? undefined
  : undefined;
export const focusBlockerAvailable = Platform.OS === 'android' && Boolean(native?.isAvailable());
export const isBlockerPermissionEnabled = () => native?.isAccessibilityEnabled() ?? false;
export const listInstalledApps = () => native?.getInstalledApps() ?? Promise.resolve([]);
export const openBlockerSettings = () => native?.openAccessibilitySettings();
export const startNativeFocus = (packages: string[], endAt: number, playAudio = false) => native?.startSession(packages, endAt, playAudio) ?? false;
export const pauseNativeFocus = () => native?.pauseSession();
export const resumeNativeFocus = () => native?.resumeSession();
export const stopNativeFocus = () => native?.stopSession();
export const cancelNativeFocus = () => native?.cancelSession();
