import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { grid, radius, type } from '../theme/tokens';
import { formatDuration, formatStamp } from '../utils/format';
import { getVideoMeta, type VideoMeta } from '../utils/native';
import { Icon } from './icons';
import type { StatusFile } from '../types';

/** Section A (2 columns) draws hero tiles; section B (3 columns) small ones. */
export type TileVariant = 'hero' | 'small';

export interface TileProps {
  item: StatusFile;
  variant: TileVariant;
  isSaved: boolean;
  /** Feed only: newer than the previous open and not saved. Hero tiles only. */
  isNew: boolean;
  selecting: boolean;
  selected: boolean;
  /** Poster frame when the screen already holds one; otherwise the tile asks native. */
  thumbnailUri?: string | null;
  onPress: (item: StatusFile) => void;
  onLongPress: (item: StatusFile) => void;
  width: number;
  /**
   * `animation-delay` for `tileIn`, in ms: the grid staggers by 26 per item.
   *
   * `null` means this tile mounted outside the grid's opening deal — a cell the
   * virtualiser recycled into view during a scroll — and must not play an
   * entrance at all. See `TileIn`.
   */
  enterDelay?: number | null;
}

/** The prototype enters selection after this long a hold. */
export const LONG_PRESS_MS = 420;

/** `tileIn`, `.5s cubic-bezier(.2,.8,.2,1)`. */
const TILE_IN_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** `ringIn .26s cubic-bezier(.2,.9,.3,1.3)` on the saved tick. */
const RING_OVERSHOOT = Easing.bezier(0.2, 0.9, 0.3, 1.3);
/** CSS's default `ease`, which the .2s ringIn and the .14s fadeIn take. */
const CSS_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/*
 * Every overlay metric the template draws differently per column count. Hero
 * values come from template lines 165–197, small ones from 213–233.
 */
const METRICS = {
  hero: {
    play: 15,
    pillBottom: 10,
    pillRight: 10,
    pillPadV: 3,
    pillPadH: 6,
    pillRadius: radius.xs,
    tick: 21,
    // border-radius:11px on a 21px disc, as the template spells it.
    tickRadius: 11,
    tickOffset: 10,
    tickCheck: 11,
    tickStroke: 3.6,
    box: 22,
    boxOffset: 9,
    selCheck: 12,
  },
  small: {
    play: 14,
    pillBottom: 8,
    pillRight: 8,
    pillPadV: 2,
    pillPadH: 5,
    pillRadius: radius.xxs,
    tick: 18,
    tickRadius: 9,
    tickOffset: 8,
    tickCheck: 10,
    tickStroke: 3.8,
    box: 20,
    boxOffset: 8,
    selCheck: 11,
  },
} as const;

/**
 * `tileIn`: opacity 0 → 1 with translateY 12 → 0 and scale .985 → 1, over
 * .5s, `animation-delay` per item so a grid deals itself in.
 *
 * A `null` delay draws the finished state directly, with no animated node at
 * all. The prototype mounts its eighteen tiles once and deals them once; here
 * the list is virtualised, so a cell recycled into view mid-scroll was
 * replaying the whole entrance — visibly, on a tile the user had already
 * seen, and at a cost of ~32 native animated operations per tile issued from
 * the JS thread in the middle of the fling.
 */
const TileIn: React.FC<{
  children: React.ReactNode;
  width: number;
  delay: number | null;
}> = ({ children, width, delay }) => {
  /**
   * Both the delay and whether to animate at all are the tile's place in the
   * opening deal, read once at mount: the grid drops the delay to `null` after
   * the first batch, and re-reading it would either restart a half-played
   * entrance or — worse, since the two branches are different element types —
   * swap the wrapper out from under a running animation.
   */
  const startDelay = useRef(delay);
  const animate = useRef(delay !== null).current;
  return animate ? (
    <TileInAnimated width={width} delay={startDelay.current ?? 0}>
      {children}
    </TileInAnimated>
  ) : (
    <View style={{ width }}>{children}</View>
  );
};

const TileInAnimated: React.FC<{
  children: React.ReactNode;
  width: number;
  delay: number;
}> = ({ children, width, delay }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(v, {
      toValue: 1,
      duration: 500,
      delay,
      easing: TILE_IN_EASE,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
    // `delay` is latched by `TileIn` before it reaches here, so this effect
    // runs once and a half-played entrance is never restarted.
  }, [v, delay]);
  return (
    <Animated.View
      style={{
        width,
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

/**
 * `ringIn`: scale .6 → 1 with a fade, on the tick discs.
 *
 * `animate={false}` draws the settled disc with no animated node. A disc that
 * was already there when the tile mounted has nothing to pop about: the
 * prototype plays `ringIn` when the class is *added*, and a recycled cell
 * re-adding it on every pass through the window both flickered and cost
 * another ~29 native animated operations per tile — the whole of a saved
 * Library, where every tile carries a tick.
 */
const RingIn: React.FC<{
  children: React.ReactNode;
  style: object;
  duration: number;
  easing: (value: number) => number;
  animate: boolean;
}> = ({ children, style, duration, easing, animate }) => {
  const settled = useRef(!animate).current;
  return settled ? (
    <View pointerEvents="none" style={style}>
      {children}
    </View>
  ) : (
    <RingInAnimated style={style} duration={duration} easing={easing}>
      {children}
    </RingInAnimated>
  );
};

const RingInAnimated: React.FC<{
  children: React.ReactNode;
  style: object;
  duration: number;
  easing: (value: number) => number;
}> = ({ children, style, duration, easing }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(v, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: true,
    });
    run.start();
    // A tile can be recycled out of the window mid-animation; an unstopped
    // timing keeps a native animation alive for a view that no longer exists.
    return () => run.stop();
  }, [v, duration, easing]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          opacity: v,
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * `fadeIn .14s` on the selection wash. `animate={false}` — a tile recycled
 * into view while it was already selected — draws the settled wash directly.
 */
const FadeIn: React.FC<{ style: object; animate: boolean }> = ({ style, animate }) => {
  const settled = useRef(!animate).current;
  return settled ? (
    <View pointerEvents="none" style={style} />
  ) : (
    <FadeInAnimated style={style} />
  );
};

const FadeInAnimated: React.FC<{ style: object }> = ({ style }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(v, {
      toValue: 1,
      duration: 140,
      easing: CSS_EASE,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [v]);
  return <Animated.View pointerEvents="none" style={[style, { opacity: v }]} />;
};

const TileBase: React.FC<TileProps> = ({
  item,
  variant,
  isSaved,
  isNew,
  selecting,
  selected,
  thumbnailUri,
  onPress,
  onLongPress,
  width,
  enterDelay = 0,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const hero = variant === 'hero';
  const m = METRICS[variant];
  const isVideo = item.type === 'video';

  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);

  /*
   * Which of this tile's entrances are real entrances.
   *
   * `dealt` is the opening deal, latched at mount: the grid hands out a delay
   * for the first screenful it paints and `null` after that, so a cell the
   * virtualiser recycles into view during a scroll mounts settled instead of
   * re-dealing itself.
   *
   * The two overlays are about a state change, not about the cell: `ringIn`
   * and `fadeIn` belong to the moment the tick or the wash *appears*. An
   * overlay that was already drawn when this cell was created has nothing to
   * announce — that is the recycled tile, and it mounts settled. One that
   * appears afterwards does, so the refs below follow the overlay for the life
   * of the cell rather than freezing at mount: a tile recycled into view while
   * it was selected, then deselected and selected again, must wash on that
   * second selection like every other tile the finger touches, and the ticks
   * the selection hid must come back the way they did before.
   */
  const dealt = useRef(enterDelay !== null).current;
  const tickShown = isSaved && !selecting;
  const washShown = selecting && selected;
  const tickSeen = useRef(tickShown);
  const washSeen = useRef(washShown);
  const tickAnimates = dealt || !tickSeen.current;
  const washAnimates = dealt || !washSeen.current;
  useEffect(() => {
    tickSeen.current = tickShown;
  }, [tickShown]);
  useEffect(() => {
    washSeen.current = washShown;
  }, [washShown]);

  /**
   * The feed lists videos over SAF, where neither a poster frame nor a length
   * is known until native decodes the file — `item.duration` only ever arrives
   * on the CameraRoll-backed library and vault lists. One call brings back
   * both, so the poster and the duration pill land in a single state update
   * instead of two renders (or, as before, the pill never at all).
   */
  const wantsMeta = isVideo && (!thumbnailUri || !item.duration);

  useEffect(() => {
    if (!wantsMeta) {
      return;
    }
    let cancelled = false;
    getVideoMeta(item.uri, item.id)
      .then(next => {
        if (!cancelled) {
          setMeta(next);
        }
      })
      // An undecodable video still draws: play glyph and stamp over the well.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [wantsMeta, item.uri, item.id]);

  // Videos never show their own uri: the poster frame is cover-cropped instead,
  // and until it arrives the tile stays a dark well rather than a letterbox.
  const source = isVideo ? thumbnailUri ?? meta?.thumbnail ?? null : item.uri;
  const stamp = formatStamp(item.timestamp);
  /*
   * `durationMs` is null when the file states no length; the library and vault
   * lists carry seconds on the item itself, so either side can be the one that
   * knows. The ms → s rule is the one `getVideoDurationSeconds` uses: never
   * round a real clip down to "0:00", because the design always draws a pill
   * on a video tile.
   */
  const seconds =
    meta?.durationMs != null
      ? Math.max(1, Math.round(meta.durationMs / 1000))
      : item.duration ?? 0;
  const duration = isVideo ? formatDuration(seconds) : '';
  const kind = t(isVideo ? 'tile.video' : 'tile.photo');

  return (
    <TileIn width={width} delay={enterDelay}>
      <Pressable
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        delayLongPress={LONG_PRESS_MS}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('a11y.tile', { kind, time: stamp })}
        accessibilityState={selecting ? { selected } : undefined}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: theme.well,
            transform: [{ scale: pressed ? 0.972 : 1 }],
          },
        ]}
      >
        {source && source !== failedUri ? (
          <Image
            source={{ uri: source }}
            style={styles.media}
            resizeMode="cover"
            // Photos are the original files — a 1080×1920 status is an 8 MB
            // bitmap decoded for a 168 dp tile. `resize` has Fresco decode at
            // the view's size instead, which is what the video posters already
            // get for free from their bounded thumbnails.
            resizeMethod="resize"
            onError={() => setFailedUri(source)}
          />
        ) : null}

        {isVideo ? (
          <View style={styles.centre} pointerEvents="none">
            {hero ? (
              <View
                style={[
                  styles.playDisc,
                  { backgroundColor: theme.glassSoft, borderColor: theme.glassEdgeSoft },
                ]}
              >
                <Icon name="play" size={m.play} color={theme.white} />
              </View>
            ) : (
              <Icon name="play" size={m.play} color={theme.onMediaPlay} />
            )}
          </View>
        ) : null}

        {isVideo && duration ? (
          <View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                bottom: m.pillBottom,
                right: m.pillRight,
                paddingVertical: m.pillPadV,
                paddingHorizontal: m.pillPadH,
                borderRadius: m.pillRadius,
                backgroundColor: theme.pillOnMedia,
              },
            ]}
          >
            <Text
              style={[
                hero ? type.monoSmStrong : type.monoXs,
                { color: hero ? theme.onMediaBright : theme.onMedia },
              ]}
            >
              {duration}
            </Text>
          </View>
        ) : null}

        {hero ? (
          <LinearGradient
            colors={['transparent', theme.tileShade]}
            style={styles.scrim}
            pointerEvents="none"
          />
        ) : null}

        {hero ? (
          <Text
            numberOfLines={1}
            style={[
              type.mono,
              styles.stamp,
              { color: theme.onMedia, textShadowColor: theme.textShadow },
            ]}
          >
            {stamp}
          </Text>
        ) : null}

        {hero && isNew && !selecting ? (
          <View
            pointerEvents="none"
            style={[styles.badge, { backgroundColor: theme.accentBadge }]}
          >
            <Text style={[type.badge, { color: theme.onAccent }]}>{t('tile.new')}</Text>
          </View>
        ) : null}

        {tickShown ? (
          <RingIn
            animate={tickAnimates}
            duration={260}
            easing={RING_OVERSHOOT}
            style={[
              styles.disc,
              {
                top: m.tickOffset,
                right: m.tickOffset,
                width: m.tick,
                height: m.tick,
                borderRadius: m.tickRadius,
                backgroundColor: theme.accent,
              },
            ]}
          >
            <Icon
              name="check"
              size={m.tickCheck}
              color={theme.onAccent}
              strokeWidth={m.tickStroke}
            />
          </RingIn>
        ) : null}

        {selecting && !selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.box,
              {
                top: m.boxOffset,
                right: m.boxOffset,
                width: m.box,
                height: m.box,
                borderRadius: m.box / 2,
                borderColor: theme.boxEdge,
                backgroundColor: theme.boxOnMedia,
              },
            ]}
          />
        ) : null}

        {washShown ? (
          <>
            <FadeIn
              animate={washAnimates}
              style={[
                styles.selection,
                { backgroundColor: theme.accentSelection, borderColor: theme.accent },
              ]}
            />
            <RingIn
              animate={washAnimates}
              duration={200}
              easing={CSS_EASE}
              style={[
                styles.disc,
                {
                  top: m.boxOffset,
                  right: m.boxOffset,
                  width: m.box,
                  height: m.box,
                  borderRadius: m.box / 2,
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <Icon name="check" size={m.selCheck} color={theme.onAccent} strokeWidth={3.6} />
            </RingIn>
          </>
        ) : null}
      </Pressable>
    </TileIn>
  );
};

const styles = StyleSheet.create({
  tile: {
    // The entrance wrapper carries the column width; the tile fills it.
    width: '100%',
    aspectRatio: 1 / grid.ratio,
    borderRadius: radius.tile,
    overflow: 'hidden',
  },
  media: StyleSheet.absoluteFillObject,
  centre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { position: 'absolute' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%' },
  stamp: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radius.badge,
  },
  disc: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { position: 'absolute', borderWidth: 1.6 },
  selection: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: radius.tile,
  },
});

/**
 * Tiles are the hot path of a scrolling grid: skip the re-render unless
 * something this tile draws — or something it would call on a tap — has
 * changed. Every prop is covered, including `enterDelay` (the grid drops it to
 * `null` once the opening batch is past, and a tile that re-mounts with a
 * stale delay would sit invisible for its old wait) and the four `item` fields
 * the tile actually reads. `item.isSaved` / `item.inVault` are deliberately not
 * compared: the tile takes its saved state from the `isSaved` prop, which the
 * screen owns.
 */
export const Tile = memo(
  TileBase,
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.uri === next.item.uri &&
    prev.item.type === next.item.type &&
    prev.item.timestamp === next.item.timestamp &&
    prev.item.duration === next.item.duration &&
    prev.variant === next.variant &&
    prev.isSaved === next.isSaved &&
    prev.isNew === next.isNew &&
    prev.selecting === next.selecting &&
    prev.selected === next.selected &&
    prev.thumbnailUri === next.thumbnailUri &&
    prev.width === next.width &&
    prev.enterDelay === next.enterDelay &&
    prev.onPress === next.onPress &&
    prev.onLongPress === next.onLongPress,
);

export default Tile;
