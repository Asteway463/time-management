# ChronoFlow

ChronoFlow is a React Native time-management app built with Expo. It includes a daily dashboard, task planner, focus timer, and local alarm reminders.

The app targets Expo SDK 58, React Native 0.88.0, and React 19.3.0. `src/theme.ts` is the shared source for colors, spacing, typography, radii, layout sizes, and elevation.

## Run locally

Use Node.js `^22.13.0`, `^24.3.0`, or `>=26.0.0` (Node.js 20 is not supported by this SDK). From the project directory:

```sh
npm install
npm run dev
```

The project uses Expo SDK 58, compatible with Expo Go for SDK 58. The start script explicitly selects Expo Go, so scan its QR code with the Expo Go app. If Expo Go still reports an SDK mismatch, update Expo Go and scan a newly generated QR code after restarting the server. For a browser preview, run `npx expo start --web`; web dependencies are already installed.

Tasks, alarms, and timer settings are stored on the device. Alarm notifications require notification permission. As with other scheduled notifications, delivery and sound can be affected by device focus, battery, and operating-system settings; this app does not yet provide a guaranteed full-screen system-clock alarm.

## Verify the project

```sh
npx expo install --check
npx expo-doctor
npx tsc --noEmit
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
