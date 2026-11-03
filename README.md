# ChronoFlow

ChronoFlow is an Expo managed time-management app. It includes a daily dashboard, task planner, focus timer, and local alarm reminders.

The app targets Expo SDK 58, React Native 0.88.0, and React 19.3.0. `src/theme.ts` is the shared source for colors, spacing, typography, radii, layout sizes, and elevation.

## Run locally

Use Node.js `^22.13.0`, `^24.3.0`, or `>=26.0.0` (Node.js 20 is not supported by this SDK). From the project directory:

```sh
npm ci
npm run dev
```

The start scripts select Expo Go and use your local network. Connect your phone and computer to the same Wi-Fi, then open Expo Go and scan the QR code from Expo Go's scanner; scanning with the phone camera may open a web page instead. If Expo Go reports an SDK mismatch, update Expo Go and restart the server to generate a new QR code. For a browser preview, run `npx expo start --web`; web dependencies are already installed.

Expo Go may not include the Android-only `ExpoTopicSubscriptionModule`. `expo-notifications` 58.1.7 loads that module optionally, so local alarms work without it; remote topic subscriptions remain unavailable when the native module is absent. After installing or updating dependencies, restart Metro with `npx expo start --clear`.

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

## Expo limitations

App blocking is not available in this Expo managed app because Expo Go does not provide APIs to inspect or block other installed apps. The existing saved app lists and schedules are retained for data compatibility. Tasks, alarms, and focus sessions continue to work with Expo modules.

## Verify the project

```sh
npx expo install --check
npx expo-doctor
npm run typecheck
npx expo export --platform all
```

## Component layout

- `App.tsx` composes the app shell, navigation, screens, and dialogs.
- `src/screens/` contains the home, alarm manager, focus timer, app blocking, statistics, and settings screens.
- `src/components/Common.tsx` contains reusable cards, buttons, headings, choice controls, and task rows.
- `src/components/Dialogs.tsx` contains form and ringing-alarm dialogs.
- `src/theme.ts` defines shared design tokens used by all screens and components.
- `src/useChronoFlow.ts` owns app state, persistence, alarm scheduling, and timer behavior.
- `src/types.ts` and `src/constants.ts` define shared models and values.
