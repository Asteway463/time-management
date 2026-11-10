# Security review: Play Protect installation block

## Root cause

Google Play Protect blocked installation of **Atna's Flow** because the release APK combined two things it treats as high risk:

1. **A sideloaded (unverified) build.** The APK was not distributed or verified through Google Play.
2. **An AccessibilityService capability**, which Play Protect classifies as a sensitive permission often abused for financial fraud.

The release APK was also **signed with the public Android debug certificate** (`CN=Android Debug`). That key is published in the Android SDK, so anyone can forge updates to an app signed with it. It is a real security defect and an additional trust signal against the app.

Google's own explanation of this block:

> "It may prevent an application from being installed that is unverified and uses sensitive device permissions that are commonly targeted by scammers to commit financial fraud."

This is a Play Protect policy decision, not a malware detection in the app's code. The app itself contained no malicious behaviour.

## Vulnerabilities and risky configuration found

| Issue | Risk | Status |
| --- | --- | --- |
| Release APK signed with the public Android debug key | Anyone can sign a malicious update; destroys update integrity | Fixed: private 4096-bit RSA release key, v2 + v3 signing, v1 disabled |
| AccessibilityService shipped in the default build | Triggers Play Protect sensitive-permission block on sideloaded APKs; very broad device access | Removed from the default build; now an explicit opt-in variant |
| `QUERY_ALL_PACKAGES` inherited from a dependency | Broad app-visibility permission, restricted by Google Play policy | Removed |
| `SYSTEM_ALERT_WINDOW` inherited from a dependency | Draw-over-other-apps capability, commonly abused | Removed |
| `INTERNET` merged in from a dependency | The app is fully offline; network access is unnecessary attack surface | Removed |
| Cleartext HTTP allowed | Weakens transport security if a network path is ever added | `usesCleartextTraffic=false` enforced |
| Backups enabled | App data could be extracted via ADB/cloud backup | `allowBackup=false` |
| Missing release signing guard | A release build could silently fall back to the debug key | Build now fails closed if no release keystore is configured |

The remaining manifest permissions are normal or signature-level permissions from Expo/React Native, `expo-notifications`, and the launcher-badge library. They do not include internet, package-query, overlay, or accessibility access.

## What changed

### Default build is clean

- `plugins/with-focus-blocker.js` no longer adds `FocusBlockerAccessibilityService`, its `<queries>` launcher list, or `@xml/focus_blocker_accessibility` unless `ATHNAS_ENABLE_APP_BLOCKER=1`.
- It actively strips `QUERY_ALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`, and `INTERNET` from the merged manifest.
- It adds the foreground-service, notification, and wake-lock permissions actually used by the timer/audio features, and forces `usesCleartextTraffic=false`.
- The accessibility service source, resources, and manifest entry now live behind the `src/blocker` source set and are only compiled into the opt-in variant.

### Runtime guard

`FocusBlockerModule.kt` checks whether the service is declared before using it. In the default build it reports the blocker as unavailable, so the UI hides the blocker controls and shows the ambient-focus-audio card instead of a broken feature.

### Release signing

`plugins/with-release-signing.js` reads the release key from `keystore.properties` in the project root, or from environment variables in CI:

- `ATHNAS_KEYSTORE_PATH`
- `ATHNAS_KEYSTORE_PASSWORD`
- `ATHNAS_KEY_ALIAS`
- `ATHNAS_KEY_PASSWORD`

Release builds fail if none is configured. `keystore.properties`, `*.jks`, and `*.keystore` are git-ignored.

`eas.json` production builds now produce an **app bundle** for Play upload instead of a sideloadable APK. EAS manages its own release signing and should not be pointed at the local keystore.

### Preserved behaviour

- `RECEIVE_BOOT_COMPLETED` is kept because `expo-notifications` needs it to restore scheduled alarms after reboot.
- Remote notifications are disabled; the app only uses local notifications.
- The timer, alarms, planner, notes, statistics, themes, and generated ambient audio are unchanged.
- The opt-in blocker variant keeps app blocking for users who accept that Play Protect may still flag it.

## Build artifacts

| Artifact | SHA-256 |
| --- | --- |
| `dist/release/atnas-flow-2.0.0-clean.apk` (recommended) | `efde80aa857f5d34c0fa9afa53196b0aefca0011a4ef27b559e7f0d8206453a6` |
| `dist/release/atnas-flow-2.0.0-blocker.apk` (opt-in) | `c1725a2fd242e6c8915e52be78cb06fd6620c6f86c0c3b5e603362526c8c2f50` |

Both are signed with the same private release certificate:

- DN: `CN=Atna's Flow, OU=Mobile, O=Asteway, L=Addis Ababa, ST=Addis Ababa, C=ET`
- Certificate SHA-256: `428bde07793c1a911fbbb8bdfec6a5f7f8dfd27dab1d0b86c0ae6c8758aa83ef`
- Key: RSA 4096-bit
- APK Signature Scheme v2 and v3: verified; v1 disabled (minSdk 24 supports v2)

Build properties: `versionCode 2`, `versionName 2.0.0`, `minSdk 24`, `targetSdk 36`, `allowBackup=false`, `usesCleartextTraffic=false`.

## Verification performed

- `apksigner verify` passes for v2 and v3 on both artifacts.
- `apkanalyzer` confirms the clean APK has **no** `INTERNET`, `QUERY_ALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`, `BIND_ACCESSIBILITY_SERVICE` request, and no accessibility service in the manifest.
- The accessibility service class is absent from the clean APK's dex. (The class-name string remains as a constant in `FocusBlockerModule`, but the class is not defined.)
- The blocker APK contains the service declaration, the `BIND_ACCESSIBILITY_SERVICE` service permission, the accessibility XML resource, and the service class. It still has no `INTERNET`, `QUERY_ALL_PACKAGES`, or `SYSTEM_ALERT_WINDOW`.
- App label resolves to `Atna's Flow`.
- `npx expo-doctor`: 20/20 checks passed.
- `npm run verify`: typecheck, lint, and all 26 tests pass.
- `npx expo export --platform android`: bundle succeeds.
- `npm audit --omit=dev`: 5 moderate advisories in Expo CLI build tooling (`glob`/`minimatch`); no high or critical findings. The suggested force-fix would downgrade Expo to 52 and was not applied.

## Not verified

**No physical Android device or emulator was connected**, so installation and the absence of the Play Protect warning were not tested on-device. The manifest, permissions, dex contents, and signatures were verified statically. A real-device install is the final confirmation step.

## How to build

Requirements: JDK 17, Android SDK with platform 36, build-tools 36+, and NDK/CMake as required by React Native. Create `keystore.properties` in the project root:

```properties
storeFile=/absolute/path/to/release.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Then:

```bash
npm run prebuild:android
cd android && ./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.

Opt-in blocker build (may still be flagged by Play Protect):

```bash
ATHNAS_ENABLE_APP_BLOCKER=1 npm run build:android:blocker
```

After any `expo prebuild --clean`, recreate `android/local.properties` with `sdk.dir=/path/to/Android/Sdk` if Gradle cannot find the SDK.

**Do not run `expo export` after copying release APKs into `dist/`.** Export clears the whole `dist/` directory. Copy APKs out afterward, or export to a different directory.

## If Play Protect still warns

1. Confirm the installed file is the clean APK with the SHA-256 above and not an older debug-signed build. Uninstall the old app first, because Android will refuse an update signed by a different key.
2. Install from a trusted local source, not a browser download that may be re-packaged.
3. If the warning persists, submit the APK through the [Play Protect appeal form](https://support.google.com/googleplay/android-developer/answer/2992033) and explain that the app is offline, has no internet permission, and no accessibility service in the default build.
4. The durable fix for distribution is to publish through Google Play. A Play-signed build carries Play Protect trust and avoids the unverified-sideload block.
5. Never use the blocker variant to work around Play Protect review. It keeps a legitimate accessibility capability and may be flagged.

## Residual risks

- Sideloaded builds can still be flagged by Play Protect for other reasons, and Google does not guarantee that any particular APK will install without a warning.
- The opt-in blocker variant intentionally keeps the accessibility capability. It is not the default and is not recommended for distribution.
- `expo-notifications` still pulls in Firebase Messaging transitively and some of its manifest entries (for example `ACCESS_NETWORK_STATE` and `c2dm.RECEIVE`), even though remote notifications are disabled and `INTERNET` is removed.
- The release keystore must be backed up securely. Losing it prevents updates to the same app identity.
- The auditing covered the project configuration, generated manifest, dex contents, and signing. It did not include a full dynamic penetration test on a device.
