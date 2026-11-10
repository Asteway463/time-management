const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

const ACCESSIBILITY_SERVICE = 'com.asteway.chronoflow.FocusBlockerAccessibilityService';
const SESSION_SERVICE = 'com.asteway.chronoflow.FocusSessionService';

/**
 * The app blocker uses an AccessibilityService, which Play Protect treats as a
 * sensitive capability when the APK is sideloaded (not installed from Play).
 *
 * Default builds therefore EXCLUDE the accessibility service. This keeps the
 * normal release APK installable without the "sensitive data" Play Protect
 * block while preserving the timer, alarms, ambient audio, planner, stats and
 * notebook features.
 *
 * Power users who explicitly want app blocking can build the opt-in variant:
 *   ATHNAS_ENABLE_APP_BLOCKER=1 npm run build:android:blocker
 *
 * That variant is deliberately not the default and is still subject to Play
 * Protect review; the flag is not a bypass.
 */
const blockerEnabled = process.env.ATHNAS_ENABLE_APP_BLOCKER === '1';

module.exports = function withFocusBlocker(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) throw new Error('with-focus-blocker: generated manifest has no <application> element.');

    manifest['uses-permission'] = manifest['uses-permission'] || [];

    const addPermission = (name) => {
      if (!manifest['uses-permission'].some((entry) => entry.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    };
    const removePermission = (name) => {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (entry) => entry.$['android:name'] !== name,
      );
      manifest['uses-permission'].push({
        $: {
          'android:name': name,
          'tools:node': 'remove',
        },
      });
    };

    // Required by the foreground focus session (timer + optional ambient audio).
    addPermission('android.permission.FOREGROUND_SERVICE');
    addPermission('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
    addPermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    addPermission('android.permission.POST_NOTIFICATIONS');
    addPermission('android.permission.WAKE_LOCK');

    // Defense in depth: never inherit broad package visibility or overlay
    // permission from a dependency. The app only needs its own launcher list.
    removePermission('android.permission.QUERY_ALL_PACKAGES');
    removePermission('android.permission.SYSTEM_ALERT_WINDOW');

    // The app is fully offline. Keep release builds from gaining network access
    // through a transitive manifest merge.
    removePermission('android.permission.INTERNET');

    if (blockerEnabled) {
      manifest.queries = manifest.queries || [];
      const launcherQueryExists = manifest.queries.some((query) =>
        query.intent?.some((intent) =>
          intent.action?.some((action) => action.$['android:name'] === 'android.intent.action.MAIN') &&
          intent.category?.some((category) => category.$['android:name'] === 'android.intent.category.LAUNCHER'),
        ),
      );
      if (!launcherQueryExists) {
        manifest.queries.push({
          intent: [{
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          }],
        });
      }
    }

    app.service = (app.service || []).filter(
      (service) => service.$?.['android:name'] !== ACCESSIBILITY_SERVICE,
    );

    const sessionService = {
      $: {
        'android:name': SESSION_SERVICE,
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse|mediaPlayback',
        'android:stopWithTask': 'false',
      },
      property: [{
        $: {
          'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
          'android:value': 'Runs the user-started focus timer and optional generated ambient audio.',
        },
      }],
    };
    const existingSessionIndex = app.service.findIndex(
      (service) => service.$?.['android:name'] === SESSION_SERVICE,
    );
    if (existingSessionIndex >= 0) app.service[existingSessionIndex] = sessionService;
    else app.service.push(sessionService);

    if (blockerEnabled) {
      app.service.push({
        $: {
          'android:name': ACCESSIBILITY_SERVICE,
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'true',
          'android:label': "Atna's Flow app blocker",
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }],
        }],
        'meta-data': [{
          $: {
            'android:name': 'android.accessibilityservice',
            'android:resource': '@xml/focus_blocker_accessibility',
          },
        }],
      });
    }

    // Do not inherit cleartext HTTP from a debug manifest in release builds.
    app.$ = app.$ || {};
    app.$['android:usesCleartextTraffic'] = 'false';

    return mod;
  });

  return withGradleProperties(config, (mod) => {
    const architectures = mod.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures',
    );
    if (architectures) architectures.value = 'armeabi-v7a,arm64-v8a';
    else mod.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'armeabi-v7a,arm64-v8a',
    });
    return mod;
  });
};
