import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type AppIconName =
  | 'home' | 'planner' | 'focus' | 'alarm' | 'blocking' | 'stats' | 'settings'
  | 'check' | 'close' | 'spark' | 'app' | 'trend' | 'clock' | 'plus';

type Props = { name: AppIconName; size?: number; color?: string; strokeWidth?: number };

/** ChronoFlow's small, consistent outline icon set. */
export function AppIcon({ name, size = 20, color = '#FFFFFF', strokeWidth = 1.8 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'home' && <Path {...common} d="m3.5 10 8.5-7 8.5 7v10a1 1 0 0 1-1 1h-5.3v-6.2h-5.4V21H4.5a1 1 0 0 1-1-1z" />}
      {name === 'planner' && <><Rect {...common} x="3.5" y="5" width="17" height="16" rx="2" /><Line {...common} x1="7.5" y1="3" x2="7.5" y2="7" /><Line {...common} x1="16.5" y1="3" x2="16.5" y2="7" /><Line {...common} x1="3.5" y1="10" x2="20.5" y2="10" /><Path {...common} d="m8 15 2 2 5-5" /></>}
      {name === 'focus' && <><Circle {...common} cx="12" cy="12" r="9" /><Circle {...common} cx="12" cy="12" r="5" /><Circle cx="12" cy="12" r="1.2" fill={color} /></>}
      {name === 'alarm' && <><Circle {...common} cx="12" cy="13" r="8" /><Path {...common} d="M12 8v5l3 2M5 3 2.8 5.2M19 3l2.2 2.2M8 3h8" /></>}
      {name === 'blocking' && <><Path {...common} d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><Path {...common} d="m9 9 6 6m0-6-6 6" /></>}
      {name === 'stats' && <><Path {...common} d="M4 20V11h4v9M10 20V4h4v16M16 20v-7h4v7" /><Line {...common} x1="3" y1="21" x2="21" y2="21" /></>}
      {name === 'settings' && <><Circle {...common} cx="12" cy="12" r="3" /><Path {...common} d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2A1.7 1.7 0 0 0 7.8 17l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2A1.7 1.7 0 0 0 5.4 5.8l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2A1.7 1.7 0 0 0 17 3.4l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9z" /></>}
      {name === 'check' && <Path {...common} d="m5 12 4.5 4.5L19 7" />}
      {name === 'close' && <Path {...common} d="m6 6 12 12M18 6 6 18" />}
      {name === 'plus' && <Path {...common} d="M12 5v14M5 12h14" />}
      {name === 'spark' && <><Path {...common} d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z" /><Path {...common} d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" /></>}
      {name === 'app' && <><Rect {...common} x="4" y="3" width="16" height="18" rx="3" /><Path {...common} d="M9 8h6M9 12h6M9 16h3" /></>}
      {name === 'trend' && <><Path {...common} d="m3 17 6-6 4 4 8-9" /><Path {...common} d="M15 6h6v6" /></>}
      {name === 'clock' && <><Circle {...common} cx="12" cy="12" r="9" /><Path {...common} d="M12 7v5l3.5 2" /></>}
    </Svg>
  );
}
