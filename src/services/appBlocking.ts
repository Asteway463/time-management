import { Platform } from 'react-native';

export function isNativeBlockingAvailable(): boolean {
  return false;
}

export interface InstalledApp {
  packageName: string;
  label: string;
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

export async function isAccessibilityEnabled(): Promise<boolean> {
  return false;
}

export function openAccessibilitySettings() {}

export async function getInstalledApps(): Promise<InstalledApp[]> {
  return [];
}

export function setNativeBlockState(packages: string[], reason: string, endAt: number) {
  void packages;
  void reason;
  void endAt;
}

export function clearNativeBlockState() {
  // Expo Go does not expose an API for blocking other installed apps.
}

export function getAccessibilityServiceComponent(): string {
  return '';
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
