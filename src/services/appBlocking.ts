import { Linking, Platform } from 'react-native';

export interface InstalledApp {
  packageName: string;
  label: string;
  icon?: string;
}

export interface BlockSession {
  id: string;
  startedAt: number;
  endedAt: number | null;
  duration: number;
  blockedPackages: string[];
  reason: string;
}

const PERMISSIONS = {
  ACCESSIBILITY: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
  USAGE_STATS: 'android.permission.PACKAGE_USAGE_STATS',
};

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

export function getAccessibilityServiceComponent(): string {
  return 'com.asteway.chronoflow/.BlockAccessibilityService';
}

export function getAccessibilitySettingsIntent() {
  return Linking.openSettings();
}

export function getUsageStatsSettingsIntent() {
  if (Platform.OS !== 'android') return Promise.resolve();
  return Linking.openSettings();
}

export function getPackageIntent(packageName: string) {
  return Linking.openSettings();
}

export function buildBlockSession(
  blockedPackages: string[],
  durationMinutes: number,
  reason: string = 'Focus session active',
): BlockSession {
  return {
    id: `block-${Date.now()}`,
    startedAt: Date.now(),
    endedAt: null,
    duration: durationMinutes,
    blockedPackages,
    reason,
  };
}

export function formatSessionRemaining(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

export function isSessionActive(endAt: number): boolean {
  return Date.now() < endAt;
}

export const BLOCK_PERMISSIONS = PERMISSIONS;

export const BLOCKING_LIMITS = {
  MAX_BLOCKED_APPS: 20,
  MIN_SESSION_MINUTES: 1,
  MAX_SESSION_MINUTES: 240,
  DEFAULT_DAILY_LIMIT_MINUTES: 60,
};