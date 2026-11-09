import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * The prototype's own glyphs, path for path.
 *
 * Every icon in Status Saver is a 24×24 stroked SVG; this file carries
 * the exact path data so the app draws the same shapes at the same weights
 * instead of the nearest Material glyph. Stroke width defaults to what the
 * prototype uses for that icon at its most common size; callers override it
 * where the prototype does (e.g. the check is 3.6 on tiles, 2.6 in sheets).
 */
export type IconName =
  | 'feed'
  | 'download'
  | 'bolt'
  | 'refresh'
  | 'sort'
  | 'gear'
  | 'close'
  | 'search'
  | 'play'
  | 'pause'
  | 'check'
  | 'lock'
  | 'lockWide'
  | 'share'
  | 'trash'
  | 'chevronRight'
  | 'forward'
  | 'zoomIn'
  | 'heart'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'imageEmpty';

export interface IconProps {
  name: IconName;
  /** Rendered width and height. */
  size?: number;
  /** Stroke colour (and fill colour for the solid glyphs). Always a token. */
  color: string;
  strokeWidth?: number;
  /** Interior fill for the heart; ignored elsewhere. */
  fill?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

interface Spec {
  strokeWidth: number;
  /** Solid glyph: drawn with fill, no stroke. */
  solid?: boolean;
  /** Adds stroke-linejoin="round" where the prototype does. */
  join?: boolean;
  draw: (color: string, fill: string) => React.ReactNode;
}

const SPECS: Record<IconName, Spec> = {
  feed: {
    strokeWidth: 1.8,
    draw: c => (
      <>
        <Rect x={3} y={4} width={18} height={16} rx={2.5} />
        <Path d="M3 15.5l4.6-4.2 4 3.4 3.4-3.1L21 16" />
        <Circle cx={15.4} cy={8.6} r={1.4} fill={c} stroke="none" />
      </>
    ),
  },
  download: {
    strokeWidth: 1.8,
    draw: () => <Path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 18.5h15" />,
  },
  bolt: {
    strokeWidth: 1.8,
    join: true,
    draw: () => <Path d="M13 2.5 5 13.5h5l-1 8 8-11h-5z" />,
  },
  refresh: {
    strokeWidth: 1.9,
    draw: () => (
      <>
        <Path d="M20.5 11.5A8.5 8.5 0 1 0 12 20" />
        <Path d="M20.5 5v6.5H14" />
      </>
    ),
  },
  sort: {
    strokeWidth: 1.9,
    draw: () => <Path d="M4 7h16M7 12h10M10 17h4" />,
  },
  /**
   * A toothed cog rather than the prototype's spoked circle: drawn at 16px the
   * prototype's version reads as a brightness/sun glyph, and the owner could
   * not tell it opened Settings. Same 24-box, same stroke weight, so nothing
   * around it moves.
   */
  gear: {
    strokeWidth: 1.7,
    join: true,
    draw: () => (
      <>
        <Circle cx={12} cy={12} r={3.2} />
        <Path d="M19.1 14.4a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.04-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H3.3a1.9 1.9 0 1 1 0-3.8h.09a1.6 1.6 0 0 0 1.46-1.04 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.76.32h.08a1.6 1.6 0 0 0 .97-1.46V3.3a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.46.97h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.46.97z" />
      </>
    ),
  },
  close: {
    strokeWidth: 1.9,
    draw: () => <Path d="M6 6l12 12M18 6 6 18" />,
  },
  search: {
    strokeWidth: 2,
    draw: () => (
      <>
        <Circle cx={11} cy={11} r={6.5} />
        <Path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  play: {
    strokeWidth: 0,
    solid: true,
    draw: () => <Path d="M8 5.2v13.6L19 12z" />,
  },
  pause: {
    strokeWidth: 0,
    solid: true,
    draw: () => (
      <>
        <Rect x={7} y={5.5} width={3.4} height={13} rx={1.2} />
        <Rect x={13.6} y={5.5} width={3.4} height={13} rx={1.2} />
      </>
    ),
  },
  check: {
    strokeWidth: 2.6,
    join: true,
    draw: () => <Path d="M4 12.5 9.5 18 20 6.5" />,
  },
  /** Selection tray and collection chip padlock. */
  lock: {
    strokeWidth: 1.9,
    draw: () => (
      <>
        <Rect x={4.5} y={10.5} width={15} height={9.5} rx={2} />
        <Path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
      </>
    ),
  },
  /** Onboarding footnote padlock (slightly taller body). */
  lockWide: {
    strokeWidth: 1.9,
    draw: () => (
      <>
        <Rect x={4} y={10} width={16} height={10} rx={2.5} />
        <Path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      </>
    ),
  },
  share: {
    strokeWidth: 1.9,
    draw: () => (
      <>
        <Circle cx={17} cy={5.5} r={2.6} />
        <Circle cx={7} cy={12} r={2.6} />
        <Circle cx={17} cy={18.5} r={2.6} />
        <Path d="M9.3 10.7 14.7 7M9.3 13.3l5.4 3.7" />
      </>
    ),
  },
  trash: {
    strokeWidth: 1.9,
    join: true,
    draw: () => <Path d="M5 7h14M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.5 7" />,
  },
  chevronRight: {
    strokeWidth: 2,
    draw: () => <Path d="M9 5.5 16 12l-7 6.5" />,
  },
  /** Repost / Open WhatsApp arrow. */
  forward: {
    strokeWidth: 1.9,
    join: true,
    draw: () => <Path d="M15 5.5 20 11l-5 5.5M20 11H8.5A4.5 4.5 0 0 0 4 15.5V19" />,
  },
  zoomIn: {
    strokeWidth: 1.9,
    draw: () => (
      <>
        <Circle cx={10.5} cy={10.5} r={6.5} />
        <Path d="M15.5 15.5 20.5 20.5M8 10.5h5M10.5 8v5" />
      </>
    ),
  },
  heart: {
    strokeWidth: 1.8,
    join: true,
    draw: (_c, fill) => (
      <Path d="M12 20.3 4.8 13a4.6 4.6 0 0 1 7.2-5.6A4.6 4.6 0 0 1 19.2 13z" fill={fill} />
    ),
  },
  sun: {
    strokeWidth: 1.8,
    draw: () => (
      <>
        <Circle cx={12} cy={12} r={4} />
        <Path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
      </>
    ),
  },
  moon: {
    strokeWidth: 0,
    solid: true,
    draw: () => <Path d="M20 14.5A8.6 8.6 0 0 1 9.5 4 8.6 8.6 0 1 0 20 14.5z" />,
  },
  monitor: {
    strokeWidth: 1.8,
    draw: () => (
      <>
        <Rect x={3} y={4.5} width={18} height={12} rx={2} />
        <Path d="M8.5 20h7" />
      </>
    ),
  },
  imageEmpty: {
    strokeWidth: 1.3,
    draw: () => (
      <>
        <Rect x={3} y={4.5} width={18} height={15} rx={2.5} />
        <Path d="M3 15l4.6-4.2 4 3.4 3.4-3.1L21 15.5" />
        <Circle cx={15.4} cy={8.6} r={1.3} />
      </>
    ),
  },
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color,
  strokeWidth,
  fill = 'none',
  style,
  accessibilityLabel,
}) => {
  const spec = SPECS[name];
  const solid = !!spec.solid;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? color : 'none'}
      stroke={solid ? 'none' : color}
      strokeWidth={solid ? 0 : strokeWidth ?? spec.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin={spec.join ? 'round' : 'miter'}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
    >
      {spec.draw(color, fill)}
    </Svg>
  );
};

export default Icon;
