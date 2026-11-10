# Atna's Flow

Atna's Flow is an Expo managed time-management app. It includes a daily dashboard, task planner, focus timer, notebook, statistics, and local alarm reminders.

The app targets Expo SDK 58, React Native 0.88.1, and React 19.3.0. `src/theme.ts` is the shared source for colors, spacing, typography, radii, layout sizes, and elevation.

## Features

- Tasks with categories, priorities, durations, and completion tracking.
- Focus timer with work, short-break, and long-break modes. The timer end time is persisted so a running session survives Android killing the app process.
- Optional app blocking during focus sessions (opt-in build). Choose apps to block, or switch to allow-only mode where every unselected app is blocked. A blocked app sends you back to Atna's Flow, and leaving requires holding the unlock control for three seconds.
- Local alarm notifications with one-time and weekly schedules, snooze, an optional math dismiss challenge, and a choice of bundled alarm tones (chime, bell, digital, gentle) or the system default sound.
- Notebook with pinning, search, editing, soft-delete trash, restore, and permanent delete.
- On-device AI assistant that turns free-form text into scheduled tasks, suggests the next best task, breaks goals into steps, and summarises notes or focus sessions. It is deterministic rule-based logic, so it needs no model download, API key, or network.
- PDF library that imports documents from the device, extracts their text locally, and provides page navigation, text search, adjustable font size, and reading progress. Scanned PDFs without a text layer are reported as such instead of rendering blank pages.
- Light, dark, and automatic appearance; 12-hour and 24-hour display.
- Background image picker that copies the chosen image into app storage.
- JSON data export through the Android share sheet.

All data stays on the device. There are no accounts and no network calls at runtime.

## Run locally

Use Node.js `^22.13.0`, `^24.3.0`, or `>=26.0.0` (Node.js 20 is not supported by this SDK). From the project directory:

```sh
npm ci
npm run dev
```

The start scripts select Expo Go and use your local network. Connect your phone and computer to the same Wi-Fi, then open Expo Go and scan the QR code. If Expo Go reports an SDK mismatch, update Expo Go and restart the server. For a browser preview, run `npm run web`.

## Run with Docker

Docker Engine and Docker Compose are required. Start the Expo Go development server in a container with:

```sh
docker compose up --build dev
```

The development server uses the `@expo/ngrok` tunnel, so it can connect across different Wi-Fi networks. To run the static web export instead:

```sh
docker compose up --build web
```

The web preview is available at `http://localhost:8080` (or the port set by `PORT`).

## Release builds

Android release builds run on EAS Build:

```sh
npx eas-cli build --platform android --profile preview     # signed APK for direct install
npx eas-cli build --platform android --profile production  # signed AAB for Google Play
```

The `preview` profile produces an APK. The `production` profile produces an app bundle using the local version in `app.json` (`2.0.0`, Android version code `2`). Increment `android.versionCode` before the next Android upload. Signing credentials are stored by EAS, not in this repository.

Android builds include ARM 32-bit and 64-bit native libraries; x86 emulator ABIs are excluded to keep install packages smaller. Google Play app bundles still deliver device-specific splits.

To build locally, create a `keystore.properties` file in the project root and run `npm run prebuild:android` followed by `cd android && ./gradlew assembleRelease`. Release builds fail if no private keystore is configured; they never fall back to the public Android debug key. See [SECURITY.md](SECURITY.md) for the keystore variables and build details.

The default Android build has no AccessibilityService and no internet permission. The focus timer and generated ambience still work through a foreground service. App blocking (which requires an Accessibility service) is an explicit opt-in variant: `ATHNAS_ENABLE_APP_BLOCKER=1 npm run build:android:blocker`. That variant is not the default because Play Protect may block sideloaded APKs that use accessibility capabilities.

## Verify the project

```sh
npm run verify        # typecheck + ESLint + unit tests
npm run doctor        # expo-doctor
npm run export        # JS bundle for Android
npx expo install --check
```

Unit tests run with `tsx --test` and cover time formatting, persisted-data parsing, timer recovery, streak logic, alarm reactivation, and the on-device planner/coaching logic.

## Notes on the AI assistant

The assistant is intentionally local. `src/ai.ts` contains a small natural-language parser for dates, times, priorities, and durations, plus rule-based coaching and summarisation. It does not call an external model. This keeps the Android build free of the `INTERNET` permission and keeps task and note content on the device.

## Notes on the PDF reader

PDF text extraction runs in the app using `pdfjs-dist` (pinned to 3.11.x, the last release that works without Node/Canvas APIs). `metro.config.js` and `shims/empty.js` stub Node-only modules (`canvas`, `fs`, `http`, `path`, `url`, `zlib`) for the React Native bundle. Imported PDFs are copied into app storage, and the reader shows extracted text rather than rendering the original page layout. PDFs without a text layer (scans/images) show a notice instead of blank pages; there is no OCR.

## Notes on Android alarms

Alarm notifications require notification permission, and exact alarms may require the user to allow "Alarms & reminders" in Android settings. Battery optimisation and Do Not Disturb can delay delivery, so keep Atna's Flow unrestricted in Android settings if punctuality matters. Delivery is not a guaranteed full-screen system-clock alarm.

## Component layout

- `App.tsx` composes the app shell, navigation, screens, and dialogs.
- `src/screens/` contains the home, planner, focus timer, alarms, statistics, notebook, settings, AI assistant, and PDF library screens.
- `src/components/Common.tsx` contains reusable cards, buttons, headings, choice controls, and task rows.
- `src/components/Dialogs.tsx` contains form, ringing-alarm, and alarm-sound dialogs.
- `src/components/HoldToConfirm.tsx` implements the press-and-hold control used to leave app blocking.
- `src/components/ErrorBoundary.tsx` shows a recovery screen if rendering fails.
- `src/theme.ts` defines shared design tokens used by all screens and components.
- `src/useChronoFlow.ts` owns app state, persistence, alarm scheduling, timer behavior, blocker settings, and the PDF library.
- `src/logic.ts` and `src/dataValidation.ts` contain the tested pure logic and saved-data parsing.
- `src/ai.ts` contains the deterministic on-device planner, coaching, and summarisation logic.
- `src/storage.ts` handles AsyncStorage persistence and keeps a recovery copy of unreadable data.
- `src/notifications.ts` handles Android notification channels and alarm scheduling, including one channel per alarm sound.
- `src/services/alarmSound.ts` plays and previews the bundled alarm tones.
- `src/services/backgroundImage.ts` copies picked images into durable app storage.
- `src/services/pdfLibrary.ts` copies imported PDFs into app storage and extracts their text.
- `src/focusBlocker.ts` wraps the optional native focus/blocking module.
- `src/types.ts` and `src/constants.ts` define shared models and values.
