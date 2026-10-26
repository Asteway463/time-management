import { useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import type { BlockedApp, BlockSchedule } from './types';
import type { BlockSession } from './services/appBlocking';
import {
  buildBlockSession,
  getAccessibilitySettingsIntent,
  getAccessibilityServiceComponent,
  isAndroid,
} from './services/appBlocking';

export interface UseAppBlockingReturn {
  activeSession: BlockSession | null;
  sessionRemaining: number;
  isBlocking: boolean;
  accessibilityEnabled: boolean;
  requestAccessibilityPermission: () => Promise<void>;
  startBlockSession: (appIds: string[], durationMinutes: number, reason?: string) => Promise<void>;
  endBlockSession: () => Promise<void>;
  pauseBlockSession: () => void;
  addBlockedApp: (app: BlockedApp) => void;
  removeBlockedApp: (packageName: string) => void;
  updateBlockedApp: (packageName: string, updates: Partial<BlockedApp>) => void;
  addSchedule: (schedule: BlockSchedule) => void;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string, enabled: boolean) => void;
  getActiveBlockedApps: () => BlockedApp[];
}

export function useAppBlocking(): UseAppBlockingReturn {
  const [activeSession, setActiveSession] = useState<BlockSession | null>(null);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [schedules, setSchedules] = useState<BlockSchedule[]>([]);

  useEffect(() => {
    if (!activeSession) {
      setSessionRemaining(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((activeSession.startedAt + activeSession.duration * 60 * 1000 - Date.now()) / 1000),
      );
      setSessionRemaining(remaining);
      if (remaining === 0) {
        setActiveSession(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeSession]);

  const requestAccessibilityPermission = useCallback(async () => {
    if (!isAndroid()) {
      Alert.alert('Not available', 'App blocking requires Android.');
      return;
    }
    try {
      await getAccessibilitySettingsIntent();
      setAccessibilityEnabled(true);
    } catch {
      Alert.alert('Could not open settings', 'Please enable the accessibility service manually.');
    }
  }, []);

  const startBlockSession = useCallback(
    async (appIds: string[], durationMinutes: number, reason: string = 'Focus session active') => {
      if (!isAndroid()) {
        Alert.alert('Not available', 'App blocking requires Android.');
        return;
      }
      if (!accessibilityEnabled) {
        Alert.alert(
          'Permission required',
          'Enable the AST Time Focus Blocker accessibility service to block apps.',
        );
        return;
      }
      setActiveSession(buildBlockSession(appIds, durationMinutes, reason));
    },
    [accessibilityEnabled],
  );

  const endBlockSession = useCallback(async () => {
    if (!activeSession) return;
    setActiveSession((prev) =>
      prev ? { ...prev, endedAt: Date.now() } : prev,
    );
  }, [activeSession, sessionRemaining]);

  const pauseBlockSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  const addBlockedApp = useCallback((app: BlockedApp) => {
    setBlockedApps((prev) => [...prev, app]);
  }, []);

  const removeBlockedApp = useCallback((packageName: string) => {
    setBlockedApps((prev) => prev.filter((app) => app.packageName !== packageName));
  }, []);

  const updateBlockedApp = useCallback(
    (packageName: string, updates: Partial<BlockedApp>) => {
      setBlockedApps((prev) =>
        prev.map((app) => (app.packageName === packageName ? { ...app, ...updates } : app)),
      );
    },
    [],
  );

  const addSchedule = useCallback((schedule: BlockSchedule) => {
    setSchedules((prev) => [...prev, schedule]);
  }, []);

  const removeSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleSchedule = useCallback((id: string, enabled: boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
  }, []);

  const getActiveBlockedApps = useCallback(() => {
    return blockedApps.filter((app) => app.blockDuringFocus);
  }, [blockedApps]);

  return {
    activeSession,
    sessionRemaining,
    isBlocking: activeSession !== null,
    accessibilityEnabled,
    requestAccessibilityPermission,
    startBlockSession,
    endBlockSession,
    pauseBlockSession,
    addBlockedApp,
    removeBlockedApp,
    updateBlockedApp,
    addSchedule,
    removeSchedule,
    toggleSchedule,
    getActiveBlockedApps,
  };
}