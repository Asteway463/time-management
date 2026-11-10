import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type InstalledApp = { packageName: string; name: string; icon: string };
export type BlockedApp = { packageName: string; name: string; blockedAt: number };
export type BlockerMode = 'block-selected' | 'allow-only';
type FocusBlockerNative = {
  isAvailable(): boolean;
  isAccessibilityEnabled(): boolean;
  getInstalledApps(): Promise<InstalledApp[]>;
  openAccessibilitySettings(): void;
  startSession(packages: string[], endAt: number, playAudio: boolean, mode: BlockerMode, holdSeconds: number): boolean;
  pauseSession(): void;
  resumeSession(): void;
  stopSession(): void;
  cancelSession(): void;
  getLastBlockedApp(): BlockedApp | null;
  openBlockedApp(packageName: string): boolean;
};

const native = Platform.OS === 'android'
  ? requireOptionalNativeModule<FocusBlockerNative>('FocusBlocker') ?? undefined
  : undefined;
export const focusBlockerAvailable = Platform.OS === 'android' && Boolean(native?.isAvailable());
export const isBlockerPermissionEnabled = () => native?.isAccessibilityEnabled() ?? false;
export const listInstalledApps = () => native?.getInstalledApps() ?? Promise.resolve([]);
export const openBlockerSettings = () => native?.openAccessibilitySettings();
export const startNativeFocus = (
  packages: string[],
  endAt: number,
  playAudio = false,
  mode: BlockerMode = 'block-selected',
  holdSeconds = 3,
) => native?.startSession(packages, endAt, playAudio, mode, holdSeconds) ?? false;
export const pauseNativeFocus = () => native?.pauseSession();
export const resumeNativeFocus = () => native?.resumeSession();
export const stopNativeFocus = () => native?.stopSession();
export const cancelNativeFocus = () => native?.cancelSession();
export const getLastBlockedApp = () => native?.getLastBlockedApp() ?? null;
export const openBlockedApp = (packageName: string) => native?.openBlockedApp(packageName) ?? false;
