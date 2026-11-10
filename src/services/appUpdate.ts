import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { compareVersions } from '../logic';

/** Version of the build that is currently installed. */
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
const UPDATE_MANIFEST_URL = typeof extra.updateManifestUrl === 'string'
  ? extra.updateManifestUrl.trim()
  : '';

const androidPackage = Constants.expoConfig?.android?.package ?? 'com.asteway.chronoflow';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${androidPackage}`;

const UPDATE_CHECK_TIMEOUT_MS = 8_000;
const MAX_MANIFEST_CHARS = 16_384;

type UpdateAvailable = {
  currentVersion: string;
  latestVersion: string;
  notes: string;
  updateUrl: string | null;
};

export type UpdateCheckResult =
  | ({ status: 'required' } & UpdateAvailable)
  | ({ status: 'optional' } & UpdateAvailable)
  | { status: 'current'; currentVersion: string; latestVersion: string }
  | { status: 'unavailable'; currentVersion: string; message: string };

/**
 * Only HTTPS links are accepted so a tampered manifest cannot make the app open
 * an arbitrary scheme or an insecure page.
 */
function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function shortText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

type UpdateManifest = {
  latestVersion: string;
  minimumVersion: string;
  notes: string;
  updateUrl: string | null;
};

function parseManifest(raw: unknown): UpdateManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const latestVersion = shortText(record.latestVersion, 32);
  if (!/^\d+(\.\d+){0,3}$/.test(latestVersion)) return null;
  const minimumVersion = shortText(record.minimumVersion, 32);
  return {
    latestVersion,
    minimumVersion: /^\d+(\.\d+){0,3}$/.test(minimumVersion) ? minimumVersion : latestVersion,
    notes: shortText(record.notes, 300),
    updateUrl: safeHttpsUrl(record.updateUrl),
  };
}

function unavailableMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'The update check timed out. Check your connection and try again.';
  }
  return 'The update server could not be reached. This build may be offline — the clean Android build has no internet permission — so check the store page instead.';
}

/**
 * Reads the release manifest and decides whether this build must update.
 * Never throws: every failure is reported as an `unavailable` result so the
 * settings screen can explain the situation instead of crashing.
 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = APP_VERSION;
  if (!UPDATE_MANIFEST_URL || !/^https:\/\//i.test(UPDATE_MANIFEST_URL)) {
    return {
      status: 'unavailable',
      currentVersion,
      message: 'This build has no update source configured.',
    };
  }
  if (typeof fetch !== 'function') {
    return {
      status: 'unavailable',
      currentVersion,
      message: 'This platform cannot check for updates.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(UPDATE_MANIFEST_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return {
        status: 'unavailable',
        currentVersion,
        message: `The update server answered with ${response.status}.`,
      };
    }
    const text = await response.text();
    if (text.length > MAX_MANIFEST_CHARS) {
      return {
        status: 'unavailable',
        currentVersion,
        message: 'The update manifest was larger than expected and was ignored.',
      };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return {
        status: 'unavailable',
        currentVersion,
        message: 'The update manifest could not be read.',
      };
    }
    const manifest = parseManifest(raw);
    if (!manifest) {
      return {
        status: 'unavailable',
        currentVersion,
        message: 'The update manifest has an unexpected format.',
      };
    }

    if (compareVersions(manifest.minimumVersion, currentVersion) > 0) {
      return {
        status: 'required',
        currentVersion,
        latestVersion: manifest.latestVersion,
        notes: manifest.notes,
        updateUrl: manifest.updateUrl,
      };
    }
    if (compareVersions(manifest.latestVersion, currentVersion) > 0) {
      return {
        status: 'optional',
        currentVersion,
        latestVersion: manifest.latestVersion,
        notes: manifest.notes,
        updateUrl: manifest.updateUrl,
      };
    }
    return { status: 'current', currentVersion, latestVersion: manifest.latestVersion };
  } catch (error) {
    return { status: 'unavailable', currentVersion, message: unavailableMessage(error) };
  } finally {
    clearTimeout(timeout);
  }
}

/** Opens the store page, preferring the manifest's own HTTPS update link. */
export async function openUpdatePage(preferredUrl?: string | null): Promise<boolean> {
  const target = safeHttpsUrl(preferredUrl) ?? PLAY_STORE_URL;
  try {
    await Linking.openURL(target);
    return true;
  } catch {
    try {
      await Linking.openURL(PLAY_STORE_URL);
      return true;
    } catch {
      return false;
    }
  }
}
