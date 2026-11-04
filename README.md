# Atna's Flow

Atna's Flow is an Expo managed time-management app. It includes a daily dashboard, task planner, focus timer, notebook, statistics, and local alarm reminders.

The app targets Expo SDK 58, React Native 0.88.1, and React 19.3.0. `src/theme.ts` is the shared source for colors, spacing, typography, radii, layout sizes, and elevation.

## Features

- Tasks with categories, priorities, durations, and completion tracking.
- Focus timer with work, short-break, and long-break modes. The timer end time is persisted so a running session survives Android killing the app process.
- Local alarm notifications with one-time and weekly schedules, snooze, and an optional math dismiss challenge.
- Notebook with pinning, search, editing, soft-delete trash, restore, and permanent delete.
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

The Android focus blocker and optional generated ambience require a custom native build, not Expo Go. Users must enable the optional Accessibility service and notification permission for the corresponding background features. Before Google Play submission, complete the Accessibility API and installed-app visibility declarations and disclose Accessibility use in the store listing.

## Verify the project

```sh
npm run verify        # typecheck + ESLint + unit tests
npm run doctor        # expo-doctor
npm run export        # JS bundle for Android
npx expo install --check
```

Unit tests run with `tsx --test` and cover time formatting, persisted-data parsing, timer recovery, streak logic, and alarm reactivation.

## Notes on Android alarms

Alarm notifications require notification permission, and exact alarms may require the user to allow "Alarms & reminders" in Android settings. Battery optimisation and Do Not Disturb can delay delivery, so keep Atna's Flow unrestricted in Android settings if punctuality matters. Delivery is not a guaranteed full-screen system-clock alarm.

## Component layout

- `App.tsx` composes the app shell, navigation, screens, and dialogs.
- `src/screens/` contains the home, planner, focus timer, alarms, statistics, notebook, and settings screens.
- `src/components/Common.tsx` contains reusable cards, buttons, headings, choice controls, and task rows.
- `src/components/Dialogs.tsx` contains form and ringing-alarm dialogs.
- `src/components/ErrorBoundary.tsx` shows a recovery screen if rendering fails.
- `src/theme.ts` defines shared design tokens used by all screens and components.
- `src/useChronoFlow.ts` owns app state, persistence, alarm scheduling, and timer behavior.
- `src/logic.ts` and `src/dataValidation.ts` contain the tested pure logic and saved-data parsing.
- `src/storage.ts` handles AsyncStorage persistence and keeps a recovery copy of unreadable data.
- `src/notifications.ts` handles Android notification channels and alarm scheduling.
- `src/services/backgroundImage.ts` copies picked images into durable app storage.
- `src/types.ts` and `src/constants.ts` define shared models and values.
