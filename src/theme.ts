import { createContext, useContext, useMemo } from 'react';

export const COLORS = {
  background: '#081321',
  surface: '#101E2F',
  surfaceRaised: '#192A3F',
  surfaceInset: '#0C1929',
  border: '#263A50',
  text: '#F4F7FB',
  textSecondary: '#D7E0EB',
  muted: '#98A8BC',
  primary: '#8188FF',
  primaryStrong: '#6971F2',
  primarySoft: '#B6BAFF',
  primaryMuted: '#252F55',
  green: '#53D7A5',
  greenMuted: '#173D39',
  amber: '#F4BF63',
  amberMuted: '#3A3223',
  red: '#F47C8B',
  redMuted: '#3A202D',
  white: '#FFFFFF',
  overlay: 'rgba(2, 8, 16, 0.78)',
} as const;

export const LIGHT_COLORS = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceRaised: '#EEF2F7',
  surfaceInset: '#E4E9F2',
  border: '#D4DAE4',
  text: '#1A2233',
  textSecondary: '#4A5568',
  muted: '#7B8799',
  primary: '#5B6AFF',
  primaryStrong: '#4A58E6',
  primarySoft: '#8B95FF',
  primaryMuted: '#E3E7FF',
  green: '#1DBD7A',
  greenMuted: '#DFF7EC',
  amber: '#E8A23C',
  amberMuted: '#FDF3E0',
  red: '#E0546A',
  redMuted: '#FDE8EC',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export type ThemeColors = { [Key in keyof typeof COLORS]: string };

export const ThemeColorsContext = createContext<ThemeColors>(COLORS);

export function useThemeColors(): ThemeColors {
  return useContext(ThemeColorsContext);
}

export function useThemedStyles<T>(createStyles: (colors: ThemeColors) => T): T {
  const colors = useThemeColors();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 28,
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const TYPE = {
  micro: 10,
  caption: 11,
  small: 12,
  body: 14,
  bodyLarge: 16,
  headingSmall: 18,
  heading: 22,
  display: 32,
  displayLarge: 38,
  timer: 44,
  icon: 26,
  symbol: 28,
  iconLarge: 36,
} as const;

export const LINE_HEIGHT = {
  compact: 16,
  body: 20,
  relaxed: 22,
  display: 30,
} as const;

export const TRACKING = {
  subtle: 0.2,
  badge: 0.6,
  label: 1.2,
  timer: 1,
} as const;

export const LAYOUT = {
  contentMaxWidth: 760,
  modalMaxWidth: 600,
  screenGutter: 20,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;