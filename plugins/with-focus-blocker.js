const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withFocusBlocker(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application[0];
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const permissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
    ];
    for (const name of permissions) {
      if (!manifest['uses-permission'].some((entry) => entry.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    app.service = app.service || [];
    app.service.push({
      $: {
        'android:name': 'com.asteway.chronoflow.FocusSessionService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse|mediaPlayback',
        'android:stopWithTask': 'false',
      },
      'property': [{ $: { 'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE', 'android:value': 'Manages a user-started focus timer and its persistent notification.' } }],
    });
    app.service.push({
      $: {
        'android:name': 'com.asteway.chronoflow.FocusBlockerAccessibilityService',
        'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        'android:exported': 'true',
        'android:label': "Ast Time app blocker",
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/focus_blocker_accessibility' } }],
    });
    return mod;
  });
  return withGradleProperties(config, (mod) => {
    const architectures = mod.modResults.find((item) => item.type === 'property' && item.key === 'reactNativeArchitectures');
    if (architectures) architectures.value = 'armeabi-v7a,arm64-v8a';
    else mod.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'armeabi-v7a,arm64-v8a' });
    return mod;
  });
};
