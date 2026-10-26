# ChronoFlow

ChronoFlow is a React Native time-management app built with Expo. It includes a daily dashboard, task planner, focus timer, and local alarm reminders.

The app targets Expo SDK 58, React Native 0.88.0, and React 19.3.0. `src/theme.ts` is the shared source for colors, spacing, typography, radii, layout sizes, and elevation.

## Run locally

Use Node.js `^22.13.0`, `^24.3.0`, or `>=26.0.0` (Node.js 20 is not supported by this SDK). From the project directory:

```sh
npm ci
npm run dev
```

The start scripts select Expo Go and use your local network. Connect your phone and computer to the same Wi-Fi, then open Expo Go and scan the QR code from Expo Go's scanner; scanning with the phone camera may open a web page instead. If Expo Go reports an SDK mismatch, update Expo Go and restart the server to generate a new QR code. For a browser preview, run `npx expo start --web`; web dependencies are already installed.

The install applies a small `expo-notifications` compatibility patch: Expo Go may not include the Android-only `ExpoTopicSubscriptionModule`, which otherwise crashes app startup even when the app only uses local notifications. The patch loads this module optionally; remote topic subscription remains unavailable when the native module is absent. After installing or updating dependencies, restart Metro with `npx expo start --clear`.

## Run with Docker

Docker Engine and Docker Compose are required. Start the Expo Go development server in a container with:

```sh
docker compose up --build dev
```

The development server uses the `@expo/ngrok` tunnel, so it can connect across different Wi-Fi networks without requiring an Expo account login. Scan its QR code from inside Expo Go and keep the container running. To run the static web export instead, use:

```sh
docker compose up --build web
```

The web preview is available at `http://localhost:8080` (or the port set by `PORT`). `docker compose build` builds both images. If Docker reports permission denied for `/var/run/docker.sock`, run the command with `sudo` or ask the system administrator to grant Docker access; membership in the `docker` group gives root-equivalent privileges.

Tasks, alarms, and timer settings are stored on the device. Alarm notifications require notification permission. As with other scheduled notifications, delivery and sound can be affected by device focus, battery, and operating-system settings; this app does not yet provide a guaranteed full-screen system-clock alarm.

Settings include dark, light, and automatic appearance (which follows the device), plus 12-hour AM/PM or 24-hour time display. Time entry fields accept 24-hour values; display preferences are saved on the device.

## Android notifications

Android requires an alarm notification channel to exist before reminders are scheduled. The channel now supplies explicit audio attributes when enabling its default sound; omitting them caused the Android null-pointer error in `setNotificationChannelAsync`. The channel ID is `chronoflow-alarms-v2` so Android does not reuse an older channel with immutable settings. If notification permission is denied, alarms remain saved but Android will not deliver them.

Changes to the Expo notification plugin configuration require a native rebuild; restarting Metro or refreshing Expo Go does not apply native configuration. For device testing, generate/update the native project and install a development build:

```sh
npx expo prebuild --platform android
npx expo run:android
```

This requires a JDK and Android SDK/Platform Tools. An Expo Go client must also match the project SDK. Verify permission prompts, channel sound/settings, and scheduled delivery on a physical Android device before release.

## Verify the project

```sh
npx expo install --check
npx expo-doctor
npm run typecheck
npx expo export --platform all
```

## Component layout

- `App.tsx` composes the app shell, navigation, screens, and dialogs.
- `src/screens/` contains the dashboard, alarm manager, planner, and focus timer screens.
- `src/components/Common.tsx` contains reusable cards, buttons, headings, choice controls, and task rows.
- `src/components/Dialogs.tsx` contains form and ringing-alarm dialogs.
- `src/theme.ts` defines shared design tokens used by all screens and components.
- `src/useChronoFlow.ts` owns app state, persistence, alarm scheduling, and timer behavior.
- `src/types.ts` and `src/constants.ts` define shared models and values.
