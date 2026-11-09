import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Icon, type IconName } from './icons';
import { useTheme } from '../context/ThemeContext';
import { radius, sans, size, space, type } from '../theme/tokens';

/**
 * Presentational primitives shared by every screen. Each one carries the
 * prototype's metrics for that control literally, so screens compose them
 * and never restate a padding.
 */

/** The prototype's `cubic-bezier(.2,.8,.2,1)`, used by every transition. */
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

/** CSS's default `ease`, which the prototype's un-eased keyframes ride on. */
export const CSS_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/** The prototype's `.btn:active { transform: scale(.97) }`. */
export const pressedStyle = (pressed: boolean): ViewStyle =>
  pressed ? { transform: [{ scale: 0.97 }] } : {};

// ── Eyebrow ────────────────────────────────────────────────────────────────

export interface EyebrowProps {
  children: string;
  /** Grid section headers read in textMuted; every other eyebrow in textFaint. */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Eyebrow: React.FC<EyebrowProps> = ({ children, muted, style }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.eyebrow, style]}>
      <Text
        style={[
          type.eyebrowBlock,
          { color: muted ? theme.textMuted : theme.textFaint },
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

// ── Card ───────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  /** 16px inner padding for cards that hold copy; list-style cards inset rows themselves. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, padded, style }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.well },
        padded && styles.cardPadded,
        style,
      ]}
    >
      {children}
    </View>
  );
};

// ── Toggle ─────────────────────────────────────────────────────────────────

export type ToggleProps = {
  value: boolean;
  /** 40×24 variant used inside the auto-save card. */
  small?: boolean;
} & (
  | {
      onValueChange: (value: boolean) => void;
      accessibilityLabel: string;
    }
  | {
      /** Omit both when a parent row handles the press; the toggle is then only paint. */
      onValueChange?: undefined;
      accessibilityLabel?: undefined;
    }
);

/**
 * Drawn by hand: the platform Switch cannot be sized and on Android renders
 * Material's pill, which is the one shape the prototype never shows.
 */
export const Toggle: React.FC<ToggleProps> = ({
  value,
  small,
  onValueChange,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const w = small ? size.toggleSmW : size.toggleW;
  const h = small ? size.toggleSmH : size.toggleH;
  const thumb = small ? size.toggleSmThumb : size.toggleThumb;
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  // `transition: background .2s` cannot ride the native driver, so the track
  // tint runs on its own value while the thumb keeps its native transform.
  const tint = useRef(new Animated.Value(value ? 1 : 0)).current;
  /**
   * What the two values were last driven to.
   *
   * Both start at the resting position, so the run below used to animate from
   * `value` to `value` on mount: 220ms of native transform and 200ms of
   * JS-driven colour interpolation — a frame callback and a view update per
   * toggle per frame — for a track that was already the right colour and a
   * thumb that was already in place. Settings and Tools each mount two of
   * these *inside* their own 200ms entrance fade, so the waste landed on
   * exactly the frames the screen was arriving on. Only a real change is
   * worth an animation.
   */
  const driven = useRef(value);

  useEffect(() => {
    if (driven.current === value) {
      return undefined;
    }
    driven.current = value;
    const run = Animated.parallel([
      Animated.timing(x, {
        toValue: value ? 1 : 0,
        duration: 220,
        easing: EASE,
        useNativeDriver: true,
      }),
      Animated.timing(tint, {
        toValue: value ? 1 : 0,
        duration: 200,
        easing: CSS_EASE,
        useNativeDriver: false,
      }),
    ]);
    run.start();
    // The tint runs on the JS driver, so an unstopped one keeps a frame
    // callback alive against a view that is already gone — a settings row
    // toggled just before the overlay closes is exactly that.
    return () => run.stop();
  }, [value, x, tint]);

  /*
   * The two interpolations are held across renders, not rebuilt on each one.
   *
   * `Animated.View` memoises its `AnimatedProps` on the identity of the
   * animated nodes it is handed, so a fresh `interpolate()` every render meant
   * a fresh node graph every render: the old props node detached from the
   * value, a new one attached, and the JS-driven track pushed its colour
   * through `setNativeProps` again. A toggle re-renders whenever its screen
   * does — which, since the tap writes a pref, is once per tap, in the frame
   * the tint animation is starting in.
   */
  const trackTint = useMemo(
    () =>
      tint.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.borderHi, theme.accent],
      }),
    [tint, theme.borderHi, theme.accent],
  );
  const knobShift = useMemo(
    () =>
      x.interpolate({
        // left 3 → 21 (44px) / 19 (40px).
        inputRange: [0, 1],
        outputRange: [0, w - thumb - 6],
      }),
    [x, w, thumb],
  );

  const track = {
    width: w,
    height: h,
    borderRadius: h / 2,
    backgroundColor: trackTint,
  };
  const knob = (
    <Animated.View
      style={[
        styles.thumb,
        {
          width: thumb,
          height: thumb,
          borderRadius: thumb / 2,
          backgroundColor: theme.white,
          transform: [{ translateX: knobShift }],
        },
      ]}
    />
  );

  const bar = <Animated.View style={track}>{knob}</Animated.View>;
  if (!onValueChange) {
    return bar;
  }
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      style={styles.toggleHit}
    >
      {bar}
    </Pressable>
  );
};

// ── Row ────────────────────────────────────────────────────────────────────

/** "Share app", "Help", "Privacy & terms": the row title without the 1.2 line-height. */
const rowTitleSingle = sans(14.5, 500);

export interface RowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned value, e.g. the current language. */
  value?: string;
  /** The whole row toggles, as in the prototype; the switch itself is only paint. */
  toggle?: { value: boolean; onValueChange: (value: boolean) => void };
  /** 7px status dot before the chevron (Status folder row). */
  dot?: string;
  onPress?: () => void;
  /** Implied by onPress unless a toggle is present. */
  chevron?: boolean;
  singleLine?: boolean;
  /** 1.2 subtitle leading, for the subtitles the prototype keeps on one line. */
  subTight?: boolean;
  /**
   * Row the prototype does not mark `class="btn"` (Status folder, Share app,
   * Help, Privacy & terms): still pressable, but without the .97 press scale.
   */
  flat?: boolean;
  /** Screen-reader name; defaults to the title. */
  accessibilityLabel?: string;
}

export const Row: React.FC<RowProps> = ({
  title,
  subtitle,
  value,
  toggle,
  dot,
  onPress,
  chevron,
  singleLine,
  subTight,
  flat,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const showChevron = chevron ?? (!!onPress && !toggle);
  const press =
    onPress ?? (toggle ? () => toggle.onValueChange(!toggle.value) : undefined);

  const body = (
    <View style={[styles.row, { borderBottomColor: theme.hairline }]}>
      <View style={[styles.rowText, toggle && styles.rowTextBeforeToggle]}>
        <Text
          style={[singleLine ? rowTitleSingle : type.rowTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              subTight ? type.rowSubTight : type.rowSub,
              { color: theme.textMuted },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[type.value, { color: theme.textMuted }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        {toggle ? <Toggle value={toggle.value} /> : null}
        {showChevron ? (
          <Icon name="chevronRight" size={15} color={theme.textFaint} strokeWidth={2} />
        ) : null}
      </View>
    </View>
  );

  if (!press) {
    return body;
  }
  return (
    <Pressable
      onPress={press}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={subtitle}
      // The right-hand value is the row's current setting ("English" on the
      // Language row). Read as a value rather than folded into the name, so
      // the row keeps the label device tests locate it by.
      accessibilityValue={value ? { text: value } : undefined}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      style={({ pressed }) => (flat ? null : pressedStyle(pressed))}
    >
      {body}
    </Pressable>
  );
};

// ── Chip ───────────────────────────────────────────────────────────────────

export interface ChipProps {
  /** Drawn on the light theme's green top bar. */
  onTint?: boolean;
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
  /** Leading 11px glyph (the Vault padlock). */
  icon?: IconName;
  /** Auto-save mode variant: shares the row equally, 38 tall, transparent when idle. */
  grow?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  count,
  active,
  onPress,
  icon,
  grow,
  onTint,
}) => {
  const { theme } = useTheme();
  if (onTint) {
    // On the light theme's green top bar: white ink, the active chip a solid
    // white pill with green text, the rest a translucent well.
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.chip,
          grow && styles.chipGrow,
          {
            backgroundColor: active ? theme.onTopBar : theme.topBarWell,
            borderColor: active ? theme.onTopBar : 'transparent',
          },
          pressedStyle(pressed),
        ]}
      >
        {icon ? (
          <Icon name={icon} size={11} color={active ? theme.topBar : theme.onTopBar} strokeWidth={2.2} />
        ) : null}
        <Text
          style={[active ? type.chipActive : type.chip, { color: active ? theme.topBar : theme.onTopBar }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {typeof count === 'number' ? (
          <Text
            style={[type.monoSm, { color: active ? theme.topBar : theme.onTopBarMuted }]}
          >
            {count}
          </Text>
        ) : null}
      </Pressable>
    );
  }
  const fg = active ? theme.accent : theme.textMuted;
  const bg = active ? theme.accentFill : grow ? 'transparent' : theme.well;
  const border = active
    ? grow
      ? theme.accentFillEdge
      : theme.accentEdge
    : grow
    ? theme.borderHi
    : theme.border;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        grow && styles.chipGrow,
        { backgroundColor: bg, borderColor: border },
        pressedStyle(pressed),
      ]}
    >
      {icon ? <Icon name={icon} size={11} color={fg} strokeWidth={2.2} /> : null}
      <Text style={[active ? type.chipActive : type.chip, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text style={[type.monoSm, styles.chipCount, { color: fg }]}>{count}</Text>
      ) : null}
    </Pressable>
  );
};

// ── RoundButton ────────────────────────────────────────────────────────────

export interface RoundButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Accent glyph, e.g. refresh while a scan runs. */
  active?: boolean;
  /** Rotates the glyph once every 0.9s while true. */
  spinning?: boolean;
  /** Screen-reader name: "Refresh", "Sort by", "Settings". */
  label: string;
  strokeWidth?: number;
  /** Drawn on the light theme's green top bar: white glyph, translucent well. */
  onTint?: boolean;
}

export const RoundButton: React.FC<RoundButtonProps> = ({
  icon,
  onPress,
  onTint,
  active,
  spinning,
  label,
  strokeWidth,
}) => {
  const { theme } = useTheme();
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) {
      turn.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, turn]);

  /*
   * Held across renders for the same reason as the Toggle's: a new
   * interpolation node makes `Animated.View` drop and rebuild its
   * `AnimatedProps`. This one is native-driven while a scan runs, so the
   * rebuild is four calls into the native animation module — createNode,
   * connect, disconnect, drop — issued while the spin loop is turning, and
   * the Feed's header re-renders every time the scan reports.
   */
  const spin = useMemo(
    () =>
      turn.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [turn],
  );
  const spinStyle = useMemo(() => ({ transform: [{ rotate: spin }] }), [spin]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: onTint ? theme.topBarWell : theme.well },
        pressedStyle(pressed),
      ]}
    >
      <Animated.View style={spinStyle}>
        <Icon
          name={icon}
          size={16}
          color={onTint ? theme.onTopBar : active ? theme.accent : theme.textMuted}
          strokeWidth={strokeWidth}
        />
      </Animated.View>
    </Pressable>
  );
};

// ── Buttons ────────────────────────────────────────────────────────────────

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * Reads as disabled but still presses, so the screen can say what is missing
   * ("Open chat" toasts "Enter at least 6 digits" rather than going dead).
   */
  inactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 50px solid action: "Open chat", "Open the picker". Disabled sinks into the surface. */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  disabled,
  inactive,
  style,
}) => {
  const { theme } = useTheme();
  const quiet = disabled || inactive;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: quiet ? theme.surface : theme.accent },
        pressedStyle(pressed),
        style,
      ]}
    >
      <Text
        style={[type.action, { color: quiet ? theme.textFaint : theme.onAccent }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export interface GhostButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** 46px quiet action on the surface tone: "Open WhatsApp". */
export const GhostButton: React.FC<GhostButtonProps> = ({ label, onPress, icon, style }) => {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.ghost,
        { backgroundColor: theme.surface },
        pressedStyle(pressed),
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={theme.accent} /> : null}
      <Text style={[type.button, { color: theme.textSoft }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

// ── EmptyState ─────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, cta }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <Icon
        name="imageEmpty"
        size={50}
        color={theme.illustration}
        strokeWidth={1.3}
        style={styles.emptyIcon}
      />
      <Text style={[type.emptyTitle, styles.emptyTitle, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[type.bodyLg, styles.emptyBody, { color: theme.textMuted }]}>
        {body}
      </Text>
      {cta ? (
        <GhostButton
          label={cta.label}
          icon="forward"
          onPress={cta.onPress}
          style={styles.emptyCta}
        />
      ) : null}
    </View>
  );
};

// ── ScreenHeader ───────────────────────────────────────────────────────────

export interface ScreenHeaderProps {
  title: string;
  /** Mono meta line under the title ("automation & storage"). */
  subtitle?: string;
  right?: React.ReactNode;
  /** The light theme's green top bar: white title over the bar's colour. */
  tinted?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, right, tinted }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, tinted && { backgroundColor: theme.topBar }]}>
      <View style={styles.headerText}>
        <Text style={[type.screenTitle, { color: tinted ? theme.onTopBar : theme.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.metaLineWide, { color: tinted ? theme.onTopBarMuted : theme.textFaint }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
};

// ── SegmentedControl ───────────────────────────────────────────────────────

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
  icon: IconName;
}

export interface SegmentedControlProps<K extends string> {
  options: Array<SegmentOption<K>>;
  value: K;
  onChange: (key: K) => void;
  /** Prototype quirk kept on purpose: this segment's label is 600 even when idle. */
  boldKey?: K;
}

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  boldKey,
}: SegmentedControlProps<K>) {
  const { theme } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.well }]}>
      {options.map(option => {
        const active = option.key === value;
        const fg = active ? theme.onAccent : theme.textMuted;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segmentItem,
              active && { backgroundColor: theme.accent },
              pressedStyle(pressed),
            ]}
          >
            <Icon name={option.icon} size={14} color={fg} />
            <Text style={[option.key === boldKey ? type.chipActive : type.chip, { color: fg }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { paddingHorizontal: space.xl, paddingBottom: 11 },

  card: { borderRadius: radius.xl, overflow: 'hidden' },
  cardPadded: { padding: space.lg },

  toggleHit: { alignSelf: 'flex-start' },
  thumb: { position: 'absolute', top: 3, left: 3 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    borderBottomWidth: 1,
  },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowTextBeforeToggle: { paddingRight: space.lg },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: 13,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  /** The auto-mode chip only centres its label: no padding of its own. */
  chipGrow: {
    flex: 1,
    height: size.control,
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  chipCount: { opacity: 0.6 },

  round: {
    width: size.headerBtn,
    height: size.headerBtn,
    borderRadius: size.headerBtn / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primary: {
    height: size.viewerBtn,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    height: size.button,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  empty: { paddingTop: 80, paddingHorizontal: 44, alignItems: 'center' },
  emptyIcon: { marginBottom: space.xl },
  emptyTitle: { textAlign: 'center', marginBottom: 9 },
  emptyBody: { textAlign: 'center' },
  emptyCta: { marginTop: space.xl },

  header: {
    paddingTop: space.xs,
    paddingHorizontal: space.screen,
    paddingBottom: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1, minWidth: 0, gap: 5 },

  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.lg },
  segmentItem: {
    flex: 1,
    height: size.control,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
});

/**
 * A real pager: every page is mounted side by side, and the platform scrolls
 * between them.
 *
 * This is deliberately a paging ScrollView rather than a PanResponder. RN's
 * PanResponder runs on the JS thread, so every frame of a drag has to cross
 * the bridge and queue behind whatever the lists are doing — which is exactly
 * how the first version of this felt: it stuttered under the finger and then
 * snapped. A horizontal ScrollView is driven by the platform, so the drag
 * never touches JS at all and the neighbouring page tracks the finger at
 * whatever rate the display refreshes.
 *
 * The pages are the filter tabs, so each is the same grid over a filtered
 * slice of one already-loaded array: three virtualised lists, not three copies
 * of the media. Vertical lists inside a horizontal scroller nest cleanly —
 * only same-axis nesting is a problem.
 */
export interface PagerProps {
  /** Which page is on screen. */
  index: number;
  count: number;
  onIndexChange: (index: number) => void;
  /** Off while selecting: a drag across the tiles belongs to the selection. */
  enabled?: boolean;
  /** One node per page, in order. */
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Which page a resting scroll offset belongs to. */
export const pageAtOffset = (x: number, width: number): number =>
  width > 0 ? Math.round(x / width) : 0;

export const Pager: React.FC<PagerProps> = ({
  index,
  count,
  onIndexChange,
  enabled = true,
  children,
  style,
}) => {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView | null>(null);
  /** Where the scroller actually is, so an echo is not reported as a change. */
  const at = useRef(index);

  /**
   * Where the scroller starts, frozen at mount.
   *
   * `contentOffset` is not a hint on Android: the view manager answers every
   * value it is handed with `view.scrollTo(x)`, which is instant and has no
   * animation. Built inline from `index` it therefore changed on every page
   * change and fired a second, competing scroll into the same view in the
   * same commit as the animated one below — so a tab tap teleported instead
   * of gliding, and a slow drag past the halfway point had Android's paging
   * fling cut out from under the finger the moment `onScrollEndDrag`
   * reported the new page. Held here it is sent once, at mount, which is all
   * it was ever for.
   */
  const startOffset = useRef({ x: index * width, y: 0 }).current;

  // Follow the index when it changes from outside the gesture — a tab tap, or
  // a filter restored from prefs on first paint.
  useEffect(() => {
    if (at.current === index) {
      return;
    }
    at.current = index;
    ref.current?.scrollTo({ x: index * width, y: 0, animated: true });
  }, [index, width]);

  // A rotation changes the page width under a resting scroller, which would
  // otherwise leave it parked between two pages. Only a real change: the
  // effect also runs on mount, where `contentOffset` has already placed the
  // scroller and this was one more scroll command into the busiest frame of
  // the screen's life.
  const lastWidth = useRef(width);
  useEffect(() => {
    if (lastWidth.current === width) {
      return;
    }
    lastWidth.current = width;
    ref.current?.scrollTo({ x: at.current * width, y: 0, animated: false });
  }, [width]);

  const settled = useCallback(
    (x: number) => {
      const next = Math.min(Math.max(pageAtOffset(x, width), 0), count - 1);
      if (next === at.current) {
        return;
      }
      at.current = next;
      onIndexChange(next);
    },
    [count, onIndexChange, width],
  );

  return (
    <ScrollView
      ref={ref}
      style={style}
      horizontal
      pagingEnabled
      scrollEnabled={enabled}
      showsHorizontalScrollIndicator={false}
      // Snappier than the default without becoming abrupt.
      decelerationRate="fast"
      // Where the list starts, so a restored filter is not scrolled to. Frozen
      // at mount: see `startOffset`.
      contentOffset={startOffset}
      // A flick ends in momentum, a slow drag does not: both have to report.
      onMomentumScrollEnd={e => settled(e.nativeEvent.contentOffset.x)}
      onScrollEndDrag={e => {
        // With a fling under way the resting page is not this one:
        // onMomentumScrollEnd reports it once the scroller stops. Reporting
        // the lift-point page as well wrote the filter twice on a reversed
        // fling and flickered the underline through the wrong tab.
        if (Math.abs(e.nativeEvent.velocity?.x ?? 0) > 0.05) {
          return;
        }
        settled(e.nativeEvent.contentOffset.x);
      }}
      // The grids own the vertical axis; this one only ever moves sideways.
      directionalLockEnabled
      overScrollMode="never"
      bounces={false}
    >
      {React.Children.map(children, (child, i) => (
        // The two pages off screen are laid out beside this one so a drag can
        // reveal them, but a screen reader must not walk them: it announced
        // every tile three times and swiped from the last tile of All into
        // the first tile of Photos.
        <View
          style={{ width }}
          importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
        >
          {child}
        </View>
      ))}
    </ScrollView>
  );
};
