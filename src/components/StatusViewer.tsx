import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Animated,
  AppState,
  Easing,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  GestureResponderHandlers,
  LayoutChangeEvent,
  ListRenderItemInfo,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video, { ViewType } from 'react-native-video';
import type { OnLoadData, OnProgressData, VideoRef } from 'react-native-video';
import { ConfirmSheet } from './ConfirmSheet';
import { Icon } from './icons';
import {
  FeedbackProvider,
  TOAST_BOTTOM,
  dismissToast,
  useToastBottom,
} from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme/tokens';
import { radius, sans, size, space, type } from '../theme/tokens';
import { formatBytesMB, formatCaptured, formatStamp } from '../utils/format';
import { hapticSave } from '../utils/haptics';
import {
  getVideoMeta,
  getVideoThumbnail,
  restoreBaseSystemBars,
  setKeepAwake,
  setSystemBars,
} from '../utils/native';
import { extensionOf } from '../utils/share';
import type { StatusFile } from '../types';

export interface StatusViewerProps {
  visible: boolean;
  items: StatusFile[];
  /** Index into `items` of the status on screen; the parent owns it. */
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  isSaved: (id: string) => boolean;
  isFavourite: (id: string) => boolean;
  /** Resolves true once the file is in the gallery; the parent shows the toast. */
  onSave: (item: StatusFile) => Promise<boolean>;
  onToggleFavourite: (item: StatusFile) => void;
  onShare: (item: StatusFile) => void;
  onRepost: (item: StatusFile) => void;
  /**
   * Removes the saved copy, confirmed first. Optional: a screen with no saved
   * copy to remove simply leaves the button off.
   *
   * The confirmation lives in here rather than at the parent because an
   * Android Modal is a window of its own — a sheet rendered beside this one in
   * the screen's tree opens behind it, invisible, with the viewer still taking
   * every touch.
   */
  onDelete?: (item: StatusFile) => void;
}

/** Two taps inside this window count as a double tap. */
const DOUBLE_TAP_MS = 280;
/**
 * Taps are ignored for this long after the viewer opens.
 *
 * The Modal is on screen one frame after the tile's `onPress`, and the rails
 * cover most of the media, so the second tap of a double tap on a Feed tile
 * used to land in here and page to the next status a moment later. Slightly
 * longer than the double-tap window, so both taps of that gesture fall inside
 * it.
 */
const OPEN_TAP_GRACE_MS = 320;
/** Design: transform .4s cubic-bezier(.2,.8,.2,1) on the media. */
const ZOOM_SCALE = 1.55;
const ZOOM_MS = 400;
/** Design: burst .7s. */
const BURST_MS = 700;
/** Design: sheetUp .26s. */
const SHEET_MS = 260;
/** Design shows position rails for the first 12 items only. */
const RAIL_COUNT = 12;
/** Thumbnail strip geometry: 30px tile + 5px gap, 22px side inset. */
const STRIP_TILE = 30;
const STRIP_GAP = 5;

/** The seek row is `adjustable`, so it has to answer TalkBack's two actions. */
const SEEK_ACTIONS: AccessibilityActionInfo[] = [
  { name: 'increment' },
  { name: 'decrement' },
];

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/*
 * ── The playback position ─────────────────────────────────────────────────
 *
 * `onProgress` fires four times a second for the whole length of a clip, and a
 * scrub fires once per touch move on top of that. Both only move a 3dp bar, a
 * 10dp knob and two clock labels — but held in state on the body they
 * re-rendered the entire viewer: the `Video` element (whose `source` object is
 * rebuilt, invalidating react-native-video's own `src` memo), the top shade,
 * the twelve rails, the strip and both action rows, plus two `interpolate()`
 * calls whose fresh nodes make React Native throw away and rebuild the media
 * layer's and the sheet's native animation nodes on every one of those
 * renders.
 *
 * So the position lives outside React and only `SeekColumn` subscribes to it.
 */
interface Ticker {
  read: () => number;
  /** No-ops on an unchanged value, so a paused clip's repeats cost nothing. */
  write: (seconds: number) => void;
  subscribe: (listener: () => void) => () => void;
}

const createTicker = (): Ticker => {
  let seconds = 0;
  const listeners = new Set<() => void>();
  return {
    read: () => seconds,
    write: next => {
      if (next === seconds) {
        return;
      }
      seconds = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/** hitSlop lifts the 14px seek row to a 44px touch target. */
const SEEK_HITSLOP = { top: 15, bottom: 15 } as const;

type Translate = ReturnType<typeof useLanguage>['t'];

/*
 * ── Gesture arbitration on the media layer ────────────────────────────────
 *
 * Four gestures share the same finger, so each one is separated by *where* it
 * starts and *which way* it travels:
 *
 *  - The seek bar and the thumbnail strip live in the bottom sheet, which is a
 *    sibling *above* the media layer. The media layer's PanResponder is a
 *    capture-phase responder, and capture only runs down the touched view's own
 *    ancestor chain, so a drag that starts on the seek track or the strip can
 *    never be stolen from them. That is why the pan layer must stay wrapped
 *    around the media alone.
 *  - Prev/next taps and the double-tap save are `onPress` on descendants of the
 *    media layer. They only fire when no drag was claimed, and a claim needs
 *    real travel (14dp down, 20dp sideways), which a tap never has. When a
 *    swipe does commit we also drop the pending single tap, so a swipe can
 *    never be followed by the step the tap had queued.
 *  - Down versus sideways is decided once per gesture, on the first move that
 *    clears its threshold, and only if that axis beats the other by 1.6×. A
 *    sloppy diagonal therefore resolves to exactly one of "dismiss" and "page",
 *    never to both, and the axis is remembered for the rest of the drag so the
 *    decision cannot flip mid-swipe.
 */
/** dp of travel before the media layer claims a downward drag. */
const SWIPE_CLAIM_DOWN = 14;
/** dp of travel before the media layer claims a sideways drag. */
const SWIPE_CLAIM_SIDE = 20;
/** How much the winning axis must beat the other one by. */
const SWIPE_AXIS_BIAS = 1.6;
/** dp a sideways swipe must cover to change status. */
export const SWIPE_STEP_DP = 60;
/** A flick covers less ground, so velocity (dp/ms) stands in for distance. */
const SWIPE_FLICK_VX = 0.6;
const SWIPE_FLICK_DP = 24;
/** dp (or dp/ms) a downward swipe needs to dismiss the viewer. */
const SWIPE_CLOSE_DP = 110;
const SWIPE_CLOSE_VY = 0.9;

export type SwipeAxis = 'x' | 'y';

/** One column of the viewer's captured / size / type block. */
interface MetaCell {
  label: string;
  value: string;
}

/** Which gesture a drag on the media is, or null while it is still ambiguous. */
export const swipeAxisOf = (dx: number, dy: number): SwipeAxis | null => {
  const across = Math.abs(dx);
  const down = Math.abs(dy);
  if (dy > SWIPE_CLAIM_DOWN && down > across * SWIPE_AXIS_BIAS) {
    return 'y';
  }
  if (across > SWIPE_CLAIM_SIDE && across > down * SWIPE_AXIS_BIAS) {
    return 'x';
  }
  return null;
};

/**
 * How far a released sideways swipe pages: 1 next, -1 previous, 0 stay.
 * Dragging left pulls the next status in, matching the right-hand tap zone.
 */
export const swipeStepOf = (dx: number, vx: number): -1 | 0 | 1 => {
  const far = Math.abs(dx) > SWIPE_STEP_DP;
  const flicked =
    Math.abs(vx) > SWIPE_FLICK_VX && Math.abs(dx) > SWIPE_FLICK_DP;
  if (!far && !flicked) {
    return 0;
  }
  return dx < 0 ? 1 : -1;
};

/** Downward travel over which the backdrop thins to nothing and the media shrinks to 86%. */
const DISMISS_TRAVEL_DP = 420;

/** Whether a released downward swipe dismisses rather than springing back. */
export const closesFromSwipe = (dy: number, vy: number): boolean =>
  dy > SWIPE_CLOSE_DP || vy > SWIPE_CLOSE_VY;

/**
 * Seeking onto the very last frame makes `repeat` restart the clip, so the
 * progress bar snaps back to zero and starts running again — the "spun"
 * progress bar. The tail guard keeps the final quarter-second unreachable by
 * dragging, which is invisible on a 300dp track but keeps the knob where the
 * user left it.
 */
const SEEK_END_GUARD_S = 0.25;

/** Seconds a seek ratio maps to, or null while the duration is unknown. */
export const seekTargetOf = (
  ratio: number,
  duration: number,
): number | null => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const ceiling = Math.max(0, duration - SEEK_END_GUARD_S);
  return Math.min(clamp(ratio, 0, 1) * duration, ceiling);
};

/**
 * Where the status the viewer is showing has moved to after the parent
 * replaced the list under it, or null when nothing needs correcting (it is
 * still at `index`, or it is gone from the list altogether).
 */
export const followedIndex = (
  items: StatusFile[],
  trackedId: string,
  index: number,
): number | null => {
  const at = items.findIndex(item => item.id === trackedId);
  return at >= 0 && at !== index ? at : null;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Seconds → "00:07": the viewer's elapsed/total pair is always two digits each. */
const clock = (seconds: number): string => {
  const total =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};

/** Design: .btn:active{transform:scale(.97)}. */
const pressed =
  (base: StyleProp<ViewStyle>) =>
  ({ pressed: down }: PressableStateCallbackType): StyleProp<ViewStyle> =>
    [base, down ? styles.pressed : null];

/**
 * Resolves the frame a media page or strip tile should show.
 *
 * The resolved path is stamped with the id it belongs to. This hook keeps its
 * state across a change of `item` (the component stays in the same slot of the
 * tree — `<Poster item={current} />` is the viewer's whole media page), so a
 * bare path meant the previous video's frame stayed on screen underneath the
 * next one until native answered: stepping between two videos showed the clip
 * you had just left. An unmatched stamp reads as "no frame yet".
 */
const usePoster = (item: StatusFile): string | null => {
  const { id, uri, type: kind } = item;
  const [poster, setPoster] = useState<{
    id: string;
    path: string | null;
  } | null>(null);

  useEffect(() => {
    if (kind !== 'video') {
      return;
    }
    let cancelled = false;
    getVideoThumbnail(uri, id).then(path => {
      if (!cancelled) {
        setPoster({ id, path });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kind, uri, id]);

  if (kind !== 'video') {
    return uri;
  }
  return poster && poster.id === id ? poster.path : null;
};

/** Design: fadeIn .2s on the info block and strip. */
const FadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fade = Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    fade.start();
    // Folding the sheet away inside the 200ms unmounts this view mid-run, and
    // a native-driven animation left going is attached to a node that no
    // longer exists.
    return () => fade.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

/** One 30×38 tile in the bottom-sheet thumbnail strip. */
const StripThumb: React.FC<{
  item: StatusFile;
  index: number;
  active: boolean;
  label: string;
  theme: Palette;
  /*
   * The slot, not a closure over it: `onPress={() => goTo(i)}` built inside
   * the list's `renderItem` gave every tile a new prop on every pass, so the
   * memo never held and all of the strip re-rendered — each tile re-running
   * `usePoster` — whenever the viewer paged.
   */
  onSelect: (index: number) => void;
}> = memo(({ item, index, active, label, theme, onSelect }) => {
  const source = usePoster(item);

  return (
    <Pressable
      onPress={() => onSelect(index)}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={pressed([
        styles.stripTile,
        active ? null : styles.stripDim,
        {
          borderColor: active ? theme.white : theme.stripRing,
          backgroundColor: theme.mediaBtnSoft,
        },
      ])}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={styles.fill}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  );
});

StripThumb.displayName = 'StripThumb';

/** Poster frame under a video while ExoPlayer is still attaching. */
const Poster: React.FC<{ item: StatusFile }> = memo(({ item }) => {
  const source = usePoster(item);
  // Matches the player it sits under, or the frame would jump when the video
  // attaches.
  return source ? (
    <Image source={{ uri: source }} style={styles.fill} resizeMode="contain" />
  ) : null;
});

Poster.displayName = 'Poster';

/**
 * The seek column: the track with its fill and knob, and the elapsed / total
 * pair. The only subtree subscribed to the `Ticker`, so a progress tick and a
 * scrub move re-render these eight nodes and nothing else in the viewer.
 */
const SeekColumn: React.FC<{
  ticker: Ticker;
  duration: number;
  theme: Palette;
  t: Translate;
  panHandlers: GestureResponderHandlers;
  onTrackLayout: (event: LayoutChangeEvent) => void;
  onAction: (event: AccessibilityActionEvent) => void;
}> = memo(
  ({ ticker, duration, theme, t, panHandlers, onTrackLayout, onAction }) => {
    const currentTime = useSyncExternalStore(ticker.subscribe, ticker.read);
    const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
    const progressPct = `${progress * 100}%` as const;

    return (
      <View style={styles.seekColumn}>
        <View
          style={styles.seekTouch}
          hitSlop={SEEK_HITSLOP}
          accessibilityRole="adjustable"
          /*
            Built from `viewer.counter` ("{n} / {total}"), the one key
            the app already has for "this one out of that many". Hard
            coding the slash left the only string in the viewer that
            never went through t(): every locale read the elapsed and
            total back with an English separator.
          */
          accessibilityLabel={t('viewer.counter', {
            n: clock(currentTime),
            total: clock(duration),
          })}
          accessibilityValue={{
            now: Math.round(progress * 100),
            min: 0,
            max: 100,
          }}
          accessibilityActions={SEEK_ACTIONS}
          onAccessibilityAction={onAction}
          {...panHandlers}
        >
          {/*
            `pointerEvents="none"` is load-bearing, not decoration.
            `locationX` in the grant below is measured against whichever
            view the finger actually hit, and the 10dp knob is the
            topmost child of this track: grabbing the knob — the one
            obvious way to scrub — reported a locationX of 0-10 and
            jumped the clip back to the start. Excluding the track and
            its children from hit testing makes the seek row itself the
            target every time, and its left edge is the track's.
          */}
          <View
            pointerEvents="none"
            style={[styles.track, { backgroundColor: theme.progressTrack }]}
            onLayout={onTrackLayout}
          >
            <View
              style={[
                styles.trackFill,
                { width: progressPct, backgroundColor: theme.white },
              ]}
            />
            <View
              style={[
                styles.knob,
                {
                  left: progressPct,
                  backgroundColor: theme.white,
                  shadowColor: theme.textShadow,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.times}>
          <Text style={[type.monoTime, { color: theme.onMediaTime }]}>
            {clock(currentTime)}
          </Text>
          <Text style={[type.monoTime, { color: theme.onMediaTime }]}>
            {clock(duration)}
          </Text>
        </View>
      </View>
    );
  },
);

SeekColumn.displayName = 'SeekColumn';

const StatusViewer: React.FC<StatusViewerProps> = props => {
  const open = props.visible && props.items.length > 0;
  // Root-provider toasts sit above the sheet while the viewer is up.
  useToastBottom(open ? TOAST_BOTTOM.viewer : undefined);

  /*
   * The body publishes its own close here so the Android back button takes the
   * same path as the Close button. Calling `onClose` straight from the Modal
   * silenced nothing: the parent's state change and the Modal's fade both land
   * after the current frame, and a playing status kept its audio going right
   * through the dismissal.
   */
  const requestCloseRef = useRef<(() => void) | null>(null);

  // Mounted only while open: every open starts from a clean playback state and
  // no ExoPlayer survives a close.
  if (!open) {
    return null;
  }

  return (
    <Modal
      visible
      /*
       * Transparent, and without the Modal's own fade: the viewer animates
       * itself in and out. With an opaque window and `animationType="fade"`
       * a swipe-down was two motions — the media slid off over a solid black
       * screen, and only then did the whole window fade — and the second one
       * was Android's, not ours, so it could not follow the finger. Now the
       * backdrop thins as the media is pulled, the Feed shows through, and
       * when the drag lets go there is nothing left to fade.
       */
      transparent
      animationType="none"
      hardwareAccelerated
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => (requestCloseRef.current ?? props.onClose)()}
    >
      {/*
        An Android Modal is its own window, so the root provider's toast would
        paint underneath it. A nested provider hosts toasts inside this window,
        and `FeedbackProvider` routes every toast — including the ones the
        parent screen raises for a save made from here — to whichever provider
        mounted last, which while this Modal is up is this one.
      */}
      <FeedbackProvider>
        <ViewerBody {...props} closeRef={requestCloseRef} />
      </FeedbackProvider>
    </Modal>
  );
};

interface ViewerBodyProps extends StatusViewerProps {
  /** Filled with the body's own close so the Modal's back button uses it. */
  closeRef: React.MutableRefObject<(() => void) | null>;
}

const ViewerBody: React.FC<ViewerBodyProps> = ({
  items,
  index,
  onClose,
  onIndexChange,
  isSaved,
  isFavourite,
  onSave,
  onToggleFavourite,
  onShare,
  onRepost,
  onDelete,
  closeRef,
}) => {
  const { theme, isDark } = useTheme();
  const { t, tp, tag } = useLanguage();
  const insets = useSafeAreaInsets();
  // The nested provider's toasts (inside this Modal window) sit above the sheet too.
  useToastBottom(TOAST_BOTTOM.viewer);

  const stripRef = useRef<FlatList<StatusFile>>(null);
  const videoRef = useRef<VideoRef | null>(null);
  const mounted = useRef(true);
  /** The seek maths reads the length without re-rendering on every drag. */
  const durationRef = useRef(0);

  const count = items.length;
  const safeIndex = clamp(index, 0, count - 1);
  const current = items[safeIndex];
  const isVideo = current.type === 'video';

  const [paused, setPaused] = useState(false);
  /*
   * The total shown beside the seek bar. Three things can set it, in order of
   * how good the answer is: the listing, if it carries one; the native
   * metadata read; and finally the player itself, which is authoritative.
   *
   * The listing used to be the only seed, and then the gallery read stopped
   * asking for durations, because getting them meant opening every saved
   * video with a MediaMetadataRetriever. That left this at 0 until ExoPlayer
   * reported metadata, so the total flashed 00:00 on every Library video and
   * stayed there for good on a clip the player could not open. The effect
   * below fills the gap from the same cached native read the tile already
   * made.
   */
  const [duration, setDuration] = useState(current.duration ?? 0);
  /** The 4 Hz position, outside React on purpose — see `Ticker`. */
  const ticker = useRef(createTicker()).current;
  /**
   * The detail block (captured / size / type + the thumbnail strip) starts
   * folded away. The prototype opens it by default, but on a real phone that
   * sheet swallows a third of the status you came to look at; the grabber
   * reveals it, which is the prototype's own collapsed state (its sheetOpen
   * toggle), so nothing is lost and the media gets the room.
   */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [burstOn, setBurstOn] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /*
   * The viewer's ground is #060607 in both themes, and it draws under the
   * status bar, so the bars need white icons while it is up whatever the app
   * is set to. In Light the clock, battery and signal bars were painted black
   * on near-black for as long as a status was open.
   */
  useEffect(() => {
    // This body only exists while the viewer is up, so mounting is the signal.
    // Re-sent on each page too: a property update on the Modal makes React
    // Native re-derive the dialog's bars from the system night mode.
    void setSystemBars(false, theme.viewerBg);
    // `isDark` is a dependency so that a theme flip while a status is open
    // re-forces the light icons after the restore effect's cleanup has run.
  }, [index, isDark, theme.viewerBg]);
  useEffect(
    () => () => {
      // Back to whatever the screen underneath asked for, which may include
      // the light theme's green status bar, not a guess at the theme's own.
      void restoreBaseSystemBars();
    },
    [isDark, theme.bg],
  );

  // ── Zoom ──────────────────────────────────────────────────────────────────
  /*
   * Every animated value in the viewer is native from birth. A value only
   * becomes native when a native-driven animation first starts on it, and
   * until then `setValue` takes the JS path: `AnimatedValue.setValue` flushes
   * the graph, which calls the view's animated-props callback, which on Fabric
   * is a `setNativeProps` plus a re-render every 48ms. That is what the first
   * swipe-down of every viewer paid, per touch move, and what `zoomAnim`'s
   * reset paid on every status change. Declaring the driver up front costs a
   * node at mount and nothing after.
   */
  const zoomAnim = useRef(
    new Animated.Value(1, { useNativeDriver: true }),
  ).current;

  const toggleZoom = useCallback(() => {
    const next = !zoomed;
    setZoomed(next);
    Animated.timing(zoomAnim, {
      toValue: next ? ZOOM_SCALE : 1,
      duration: ZOOM_MS,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [zoomAnim, zoomed]);

  /*
   * Keyed on the id, never on the item object: the list screen rebuilds these
   * objects on every folder refresh, and an effect keyed on the object restarted
   * the video the user was halfway through watching.
   */
  useEffect(() => {
    // `durationRef` feeds the seek maths, so it has to be reset in the same
    // breath as the state: left behind, a drag on the new clip's track seeked
    // against the previous clip's length.
    durationRef.current = current.duration ?? 0;
    setDuration(current.duration ?? 0);
    ticker.write(0);
    setPaused(false);
    setFailed(false);
    setZoomed(false);
    zoomAnim.setValue(1);
    // Keyed on the id alone: `current.duration` for that id never changes, and
    // adding the object would restart playback on every folder rescan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  /*
   * A total for a video whose listing carries none, which since the gallery
   * read dropped durations is every video in every list.
   *
   * This is the same call the tile behind this viewer already made for its
   * poster frame, and getVideoMeta memoises per id, so opening a status the
   * user just tapped normally resolves from memory without touching the file.
   * The player still wins: handleLoad overwrites this the moment ExoPlayer
   * reports a real length, and the guards here make sure a slow read for the
   * previous clip cannot land on the current one or undo a better answer that
   * arrived first.
   */
  useEffect(() => {
    if (!isVideo || current.duration) {
      return;
    }
    let cancelled = false;
    getVideoMeta(current.uri, current.id)
      .then(meta => {
        /*
         * The exact length, in the unit handleLoad uses, and deliberately not
         * getVideoDurationSeconds: that one rounds, because a tile's pill
         * must never read 0:00. Here `clock` floors, so a rounded seed made a
         * 14.6 s clip read 00:15 until the player loaded and then drop to
         * 00:14, and a drag to the end of the track seeked past the clip.
         */
        const seconds = meta?.durationMs ? meta.durationMs / 1000 : 0;
        if (cancelled || seconds <= 0 || durationRef.current > 0) {
          return;
        }
        durationRef.current = seconds;
        setDuration(seconds);
      })
      // An unreadable clip keeps 00:00, which is what it showed before.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isVideo, current.id, current.uri, current.duration]);

  // Keep the strip's active tile in view as the index moves.
  useEffect(() => {
    if (!sheetOpen) {
      return;
    }
    stripRef.current?.scrollToIndex({
      index: safeIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [safeIndex, sheetOpen]);

  // ── Sheet ─────────────────────────────────────────────────────────────────
  const sheetAnim = useRef(
    new Animated.Value(0, { useNativeDriver: true }),
  ).current;

  useEffect(() => {
    const rise = Animated.timing(sheetAnim, {
      toValue: 1,
      duration: SHEET_MS,
      easing: EASE,
      useNativeDriver: true,
    });
    rise.start();
    // A viewer closed inside the 260ms entry (a fast swipe down) must not
    // leave the run going against a detached node.
    return () => rise.stop();
  }, [sheetAnim]);

  /*
   * ── Pending single tap ───────────────────────────────────────────────────
   *
   * Declared up here, above `goTo`, because a deliberate jump has to be able
   * to drop it: `handleTap` (which needs the save handlers) stays further
   * down and only adds the arming half.
   */
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When this viewer opened, for the tap grace above. */
  const openedAt = useRef(Date.now());

  /** Drops a single tap that has not fired yet. */
  const cancelPendingTap = useCallback(() => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
    lastTap.current = 0;
  }, []);

  useEffect(
    () => () => {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
    },
    [],
  );

  // ── Paging ────────────────────────────────────────────────────────────────
  /*
   * The viewer follows a *status*, not a slot. Every deliberate move records
   * the id it lands on, which is what lets the effect below tell "the user
   * paged" apart from "the parent handed us a re-ordered list".
   */
  const trackedId = useRef(current.id);

  /**
   * Stops the sound of the player that is on screen right now, without a
   * re-render. Used by every path that takes the current status away.
   */
  const silence = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const target = items[next];
      if (!target) {
        return;
      }
      /*
       * `trackedId` is the status this viewer is on (or the one a move already
       * in flight is heading for), so this is "the destination is really
       * changing" — which matters twice:
       *
       *  - The outgoing clip is silenced before the swap. Unmounting the
       *    `Video` releases ExoPlayer, but that lands after this frame, and
       *    the tail of audio over the next status is audible.
       *  - Nothing is paused when the destination is where we already are (a
       *    tap on the current strip tile, or `step` on a one-item list). Doing
       *    it there would pause the player with no re-render to un-pause it,
       *    leaving silent video under a button still reading "Pause".
       */
      if (target.id !== trackedId.current) {
        silence();
      }
      /*
       * A queued side tap is a *relative* step from the slot the finger landed
       * on. Once a jump has named an absolute destination that step is stale:
       * left armed, tapping a strip tile inside the double-tap window landed
       * one status past the tile the user had picked.
       */
      cancelPendingTap();
      trackedId.current = target.id;
      onIndexChange(next);
    },
    [cancelPendingTap, items, onIndexChange, silence],
  );

  const step = useCallback(
    (delta: number) => goTo((safeIndex + delta + count) % count),
    [count, goTo, safeIndex],
  );

  /*
   * `step` is rebuilt on every index or list change, and two callers must not
   * capture it:
   *
   *  - the queued single tap (a tap is held back one double-tap window, and a
   *    save made from here re-sorts the feed inside that window, so a captured
   *    `step` would page from the slot the finger landed on rather than from
   *    where the status now is);
   *  - the swipe PanResponder, which must be created exactly once. Rebuilding
   *    it hands the in-flight gesture a fresh gestureState whose x0/y0 are
   *    still 0, so mid-drag the dx jumps to the raw page coordinate and the
   *    release pages by a screen's width. A list rebuild under a moving finger
   *    is enough to trigger it.
   */
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  /*
   * Saving from here re-sorts the feed (the item loses its "new" bucket) and a
   * delete or a rescan can drop items entirely. Without this the counter, the
   * rails and the strip would keep pointing at the slot while a different file
   * slid into it. Chasing the id keeps all three honest; when the tracked file
   * is gone from the list we adopt whatever now occupies the slot instead.
   */
  useEffect(() => {
    const moved = followedIndex(items, trackedId.current, safeIndex);
    if (moved !== null) {
      onIndexChange(moved);
      return;
    }
    trackedId.current = current.id;
  }, [items, safeIndex, current.id, onIndexChange]);

  /*
   * Only the immediate neighbours' still frames are warmed, and only the
   * frames: their video streams stay untouched so exactly one ExoPlayer is
   * ever alive. `getVideoThumbnail` memoises, so stepping to a neighbour finds
   * its poster already decoded instead of showing black while native works.
   */
  useEffect(() => {
    const neighbours = [
      items[(safeIndex + 1) % count],
      items[(safeIndex + count - 1) % count],
    ];
    for (const item of neighbours) {
      if (!item || item.id === current.id) {
        continue;
      }
      if (item.type === 'video') {
        void getVideoThumbnail(item.uri, item.id);
        continue;
      }
      try {
        void Image.prefetch(item.uri).catch(() => undefined);
      } catch {
        // Prefetch is an optimisation; a decoder that refuses is not an error.
      }
    }
  }, [count, current.id, items, safeIndex]);

  // ── Playback lifecycle ────────────────────────────────────────────────────
  /*
   * Stops the sound now, without a re-render: the play button must not flip to
   * "play" for the length of the dismiss animation. The unmount releases the
   * player anyway, but the parent's state update and the 180ms swipe-out both
   * land after this frame, and that tail of audio is very audible.
   */
  const stopPlayback = useCallback(() => {
    silence();
    void setKeepAwake(false);
  }, [silence]);

  const requestClose = useCallback(() => {
    stopPlayback();
    onClose();
  }, [onClose, stopPlayback]);

  // The Modal's back button closes through the same door as the Close button.
  useEffect(() => {
    closeRef.current = requestClose;
    return () => {
      closeRef.current = null;
    };
  }, [closeRef, requestClose]);

  /** Read, never captured, by the swipe responder — see `stepRef`. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /*
   * A video that is actually running holds the display on. Pausing, closing
   * the viewer or sending the app to the background all drop the flag, so the
   * screen can never be pinned awake by a viewer the user has left.
   */
  const [appActive, setAppActive] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next =>
      setAppActive(next === 'active'),
    );
    return () => sub.remove();
  }, []);

  const awake = isVideo && !paused && !failed && appActive;

  useEffect(() => {
    void setKeepAwake(awake);
  }, [awake]);

  // Separate from the effect above so a pause does not clear and re-set the
  // flag; this one exists purely as the "viewer went away" backstop.
  useEffect(
    () => () => {
      void setKeepAwake(false);
    },
    [],
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const burstAnim = useRef(
    new Animated.Value(0, { useNativeDriver: true }),
  ).current;

  /*
   * The burst is mounted only while it plays: an always-mounted disc at
   * opacity 0 still sat in the middle of every viewer on some GPUs.
   */
  const playBurst = useCallback(() => {
    setBurstOn(true);
    burstAnim.setValue(0);
    Animated.timing(burstAnim, {
      toValue: 1,
      duration: BURST_MS,
      easing: EASE,
      useNativeDriver: true,
    }).start(({ finished }) => {
      /*
       * `finished` matters: a second double tap inside the 700ms calls
       * `setValue(0)` above, which stops this run and calls back straight away
       * with finished:false. Clearing on that unmounted the burst that had
       * just started, so saving twice in quick succession flashed once.
       */
      if (finished && mounted.current) {
        setBurstOn(false);
      }
    });
  }, [burstAnim]);

  // The parent owns the outcome (toast, undo, saved markers); the viewer only
  // reflects it through `isSaved` on the next render.
  const saveCurrent = useCallback(() => {
    // Swallowed here, not floated: the parent reports the outcome itself, and
    // a save that rejects (MediaStore refusing, the file vanishing mid-copy)
    // would otherwise be an unhandled rejection, which is a crash in a
    // release build rather than a failed save.
    Promise.resolve(onSave(current)).catch(() => undefined);
  }, [current, onSave]);

  /*
   * The one haptic in the viewer. A double tap has no pressed state to look
   * at, so the 10ms tick is what tells the finger the gesture was recognised —
   * it fires with the burst, before the save has finished. Silent on a device
   * with no motor.
   */
  const doubleSave = useCallback(() => {
    hapticSave();
    playBurst();
    saveCurrent();
  }, [playBurst, saveCurrent]);

  // ── Tap zones ─────────────────────────────────────────────────────────────
  /*
   * A single tap is held back for one double-tap window. Firing it immediately
   * would make a double tap on the left rail step to the previous status and
   * then save the wrong file.
   */
  const handleTap = useCallback(
    (delta?: -1 | 1) => {
      const now = Date.now();
      // The tap that opened the viewer, or its double-tap partner, arriving
      // through a window that was not on screen when the finger went down.
      if (now - openedAt.current < OPEN_TAP_GRACE_MS) {
        return;
      }
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        if (tapTimer.current) {
          clearTimeout(tapTimer.current);
          tapTimer.current = null;
        }
        doubleSave();
        return;
      }
      lastTap.current = now;
      if (delta === undefined) {
        return;
      }
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        // Read at fire time, never captured: see `stepRef`.
        stepRef.current(delta);
      }, DOUBLE_TAP_MS);
    },
    [doubleSave],
  );

  // ── Swipes ────────────────────────────────────────────────────────────────
  /*
   * Swipe down dismisses, swipe sideways steps — see the arbitration note by
   * `swipeAxisOf`. The layer covers the media only (the shade and the sheet are
   * siblings above it), so the strip and the seek track never compete for a
   * horizontal drag. Capture-phase because the tap zones are descendants and
   * would otherwise hold the responder for the whole gesture.
   */
  const dragY = useRef(
    new Animated.Value(0, { useNativeDriver: true }),
  ).current;
  /**
   * True from the moment a swipe-down commits until the parent unmounts us.
   * The viewer is see-through well before the outrun ends, and the Feed
   * underneath looks tappable while this window still owns every touch: the
   * invisible action row answered taps meant for the tile behind it.
   */
  const [closing, setClosing] = useState(false);
  const swipeAxis = useRef<SwipeAxis | null>(null);
  /** True only between a real grant and its release: see the reset below. */
  const swipeHeld = useRef(false);
  const swipePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        /*
         * The axis survives only a gesture that was actually granted.
         *
         * Deciding the axis is not the same as being given the drag: the
         * responder system asks whoever holds the responder to let go, and the
         * seek bar refuses (`onPanResponderTerminationRequest: () => false`),
         * which is exactly what a second finger landing on the media during a
         * scrub asks it to do. A claim refused that way never gets a release or
         * a terminate, so the axis it decided was still sitting here when the
         * next finger came down — and a stale axis claims that gesture on its
         * first dp of travel. Every tap travels a dp or two, so prev/next and
         * the double-tap save stopped working for the rest of the session.
         */
        onStartShouldSetPanResponderCapture: () => {
          if (!swipeHeld.current) {
            swipeAxis.current = null;
          }
          return false;
        },
        onMoveShouldSetPanResponderCapture: (_evt, g) => {
          // The axis is decided once and kept: a drag that starts down and
          // curls sideways stays a dismiss, and vice versa.
          const axis = swipeAxis.current ?? swipeAxisOf(g.dx, g.dy);
          if (!axis) {
            return false;
          }
          swipeAxis.current = axis;
          // A claimed drag is not a tap, so the tap queued by the finger going
          // down must not fire behind the swipe.
          cancelPendingTap();
          return true;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          swipeHeld.current = true;
        },
        onPanResponderMove: (_evt, g) => {
          if (swipeAxis.current === 'y') {
            dragY.setValue(Math.max(0, g.dy));
          }
        },
        onPanResponderRelease: (_evt, g) => {
          const axis = swipeAxis.current;
          swipeAxis.current = null;
          swipeHeld.current = false;
          if (axis === 'x') {
            const delta = swipeStepOf(g.dx, g.vx);
            if (delta !== 0) {
              stepRef.current(delta);
            }
            return;
          }
          if (closesFromSwipe(g.dy, g.vy)) {
            // Sound stops as the media starts leaving, not when it lands.
            stopPlayback();
            /*
             * The toast host is a sibling of the animated root, so a toast
             * raised in here (a save, a favourite) does not thin with the
             * viewer and would hang at full strength over the Feed for the
             * length of the outrun. It belongs to this window and goes with
             * it; nothing is lost, because the Modal takes it away a moment
             * later regardless.
             */
            dismissToast();
            setClosing(true);
            Animated.timing(dragY, {
              toValue: 900,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(({ finished }) => {
              /*
               * Only a run that reached the end closes. An interrupted one is
               * the unmount's own stopAnimation, or a parent that dropped the
               * viewer mid-flight, and this callback holds *that* mount's
               * onClose: fired late it would close a viewer the user had since
               * re-opened.
               *
               * And nothing is reset here. The value used to be set back to 0
               * right after onClose, which lands before React has unmounted
               * the body: for that frame the backdrop was solid and the media
               * back in place — the viewer visibly reappeared and then
               * vanished. The body remounts with a fresh value on every open.
               */
              if (finished && mounted.current) {
                onCloseRef.current();
              }
            });
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          swipeAxis.current = null;
          swipeHeld.current = false;
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    // Every dependency here is stable for the life of the viewer, so the
    // responder is built once and a gesture can never be handed a fresh
    // gestureState halfway through: see `stepRef`.
    [cancelPendingTap, dragY, stopPlayback],
  );

  /*
   * Every value the viewer drives is stopped when the viewer goes away. All
   * three can still be mid-run at that moment — the 400ms zoom, the 700ms
   * burst, the 180ms swipe-out — and each is native-driven, so a run left
   * going belongs to a node that has just been detached. Declared after the
   * `mounted` effect, so the guards inside their end callbacks already read
   * false by the time this cleanup stops them.
   */
  useEffect(
    () => () => {
      zoomAnim.stopAnimation();
      burstAnim.stopAnimation();
      dragY.stopAnimation();
    },
    [burstAnim, dragY, zoomAnim],
  );

  // ── Seek bar ──────────────────────────────────────────────────────────────
  /*
   * Each `interpolate()` builds a fresh `AnimatedInterpolation`, and React
   * Native keys an `Animated.View`'s props node on the identity of the nodes
   * in its style: an inline interpolation therefore threw away the view's
   * whole native animation node and built a new one on *every* render of the
   * body — twice per render here, and four times a second while a video
   * played. Built once, they are compared equal and the native nodes stand.
   */
  /*
   * The entrance. The Modal no longer fades for us, so the whole viewer fades
   * itself in over the same 200ms the info block and strip use.
   */
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(enter, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [enter]);
  /*
   * A pulled-down viewer thins out as a whole — chrome, sheet and backdrop
   * together — so the Feed shows through under the finger, and the media
   * shrinks a little as it goes, the way a photo viewer's does. By 420dp of
   * travel the backdrop is gone, which is before the release animation has
   * finished carrying the media off: the close that follows has nothing
   * visible left to remove, so it is instant and reads as one motion.
   */
  const dragBackdrop = useMemo(
    () =>
      dragY.interpolate({
        inputRange: [0, DISMISS_TRAVEL_DP],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [dragY],
  );
  const backdropOpacity = useMemo(
    () => Animated.multiply(enter, dragBackdrop),
    [enter, dragBackdrop],
  );
  const dragScale = useMemo(
    () =>
      dragY.interpolate({
        inputRange: [0, DISMISS_TRAVEL_DP],
        outputRange: [1, 0.86],
        extrapolate: 'clamp',
      }),
    [dragY],
  );
  const rootStyle = useMemo(
    () => [
      styles.root,
      { backgroundColor: theme.viewerBg, opacity: backdropOpacity },
    ],
    [backdropOpacity, theme.viewerBg],
  );
  const mediaStyle = useMemo(
    () => [
      styles.fill,
      { transform: [{ translateY: dragY }, { scale: dragScale }] },
    ],
    [dragScale, dragY],
  );
  const sheetLift = useMemo(
    () => sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }),
    [sheetAnim],
  );
  const burstFade = useMemo(
    () =>
      burstAnim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0, 1, 0],
      }),
    [burstAnim],
  );
  const burstScale = useMemo(
    () =>
      burstAnim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0.4, 1.1, 1.6],
      }),
    [burstAnim],
  );

  const trackWidth = useRef(0);
  const trackOrigin = useRef(0);
  const scrubbing = useRef(false);

  /** Read, never captured, by the seek responder — see `stepRef`. */
  const failedRef = useRef(false);
  useEffect(() => {
    failedRef.current = failed;
  }, [failed]);

  const seekToRatio = useCallback(
    (ratio: number) => {
      /*
       * There is no player to seek once the stream has failed, and moving the
       * knob and the elapsed clock anyway made the sheet claim a position the
       * dead clip was nowhere near — the one control in the viewer that answered
       * a drag by lying about it.
       */
      if (failedRef.current) {
        return;
      }
      const target = seekTargetOf(ratio, durationRef.current);
      if (target === null) {
        return;
      }
      videoRef.current?.seek(target);
      /*
       * A plain write, with no `mounted` guard: the position is not React state
       * any more, so a late seek cannot update an unmounted tree — the seek row
       * unsubscribed on its way out.
       */
      ticker.write(target);
    },
    [ticker],
  );

  const seekPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: evt => {
          scrubbing.current = true;
          const { locationX, pageX } = evt.nativeEvent;
          trackOrigin.current = pageX - locationX;
          if (trackWidth.current > 0) {
            seekToRatio(locationX / trackWidth.current);
          }
        },
        onPanResponderMove: (_evt, g) => {
          if (trackWidth.current > 0) {
            seekToRatio((g.moveX - trackOrigin.current) / trackWidth.current);
          }
        },
        onPanResponderRelease: () => {
          scrubbing.current = false;
        },
        onPanResponderTerminate: () => {
          scrubbing.current = false;
        },
      }),
    [seekToRatio],
  );

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  }, []);

  /*
   * A scrub in progress when the status changes never gets its release: the
   * seek row unmounts under the finger, which is what a queued side tap firing
   * — or a rescan moving the viewer on to a photo — does to it. `scrubbing`
   * left standing swallows every later `onProgress`, so the knob and the
   * elapsed clock froze for the rest of the session, on every clip.
   */
  useEffect(() => {
    scrubbing.current = false;
  }, [current.id, isVideo]);

  /**
   * TalkBack's swipe up / swipe down on the seek row. `adjustable` promises the
   * gesture and announces it; without these it did nothing at all.
   */
  const handleSeekAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const length = durationRef.current;
      if (!Number.isFinite(length) || length <= 0) {
        return;
      }
      const step = event.nativeEvent.actionName === 'decrement' ? -0.05 : 0.05;
      seekToRatio(ticker.read() / length + step);
    },
    [seekToRatio, ticker],
  );

  // ── Video callbacks ───────────────────────────────────────────────────────
  const handleLoad = useCallback((data: OnLoadData) => {
    // A container can state a length of 0; keep the listing's figure then,
    // rather than replacing a usable total with nothing.
    if (!Number.isFinite(data.duration) || data.duration <= 0) {
      return;
    }
    durationRef.current = data.duration;
    setDuration(data.duration);
  }, []);

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      if (!scrubbing.current) {
        ticker.write(data.currentTime);
      }
    },
    [ticker],
  );

  /*
   * A clip ExoPlayer cannot open — a half-written file, or a codec this device
   * lacks — used to leave a black screen and a play button that did nothing.
   * Dropping the player puts the poster frame back on screen, and the play
   * button becomes "try again", so save / share / close all still work.
   */
  const handleError = useCallback(() => {
    setFailed(true);
    // The button has to read "play" for the retry to be inviting; nothing else
    // about the sheet moves, so no laid-out state changes.
    setPaused(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (failed) {
      setFailed(false);
      setPaused(false);
      // The retry remounts the player, which starts the clip from the top; the
      // bar and the clock kept the position it died at and read the new run's
      // first seconds as its last.
      ticker.write(0);
      return;
    }
    setPaused(prev => !prev);
  }, [failed, ticker]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const saved = isSaved(current.id);
  /*
   * Whether the "remove this file?" sheet is up. What it is asking about is
   * not staged with it: the sheet answers for whatever is on screen, and the
   * viewer cannot be paged while it is open — its scrim takes those touches.
   */
  const [confirmDelete, setConfirmDelete] = useState(false);
  /*
   * One delete per opening of the sheet. The sheet keeps its buttons live
   * through its exit animation, so a second tap on Delete used to start a
   * second delete of the same file. Gallery deletes are now queued rather
   * than overwriting each other, so that second one ran after the first had
   * succeeded, against a file already gone: a second system dialog, or a
   * "Delete failed" toast over a delete that worked. LibraryScreen guards its
   * own sheet the same way.
   */
  const deleteArmed = useRef(false);
  const askDelete = useCallback(() => {
    deleteArmed.current = true;
    setConfirmDelete(true);
  }, []);
  const closeConfirm = useCallback(() => {
    deleteArmed.current = false;
    setConfirmDelete(false);
  }, []);
  const runDelete = useCallback(() => {
    if (!deleteArmed.current) {
      return;
    }
    deleteArmed.current = false;
    setConfirmDelete(false);
    onDelete?.(current);
  }, [current, onDelete]);
  /*
   * A sheet asking about a file that is no longer the one on screen would be
   * answered for the wrong file, so anything that changes the current status
   * closes it. Keyed on the id rather than the index: a delete shortens the
   * list, and the item at the old index is then a different status.
   */
  useEffect(() => {
    deleteArmed.current = false;
    setConfirmDelete(false);
  }, [current.id]);
  const favourite = isFavourite(current.id);

  const tileLabel = useCallback(
    (item: StatusFile) =>
      t('a11y.tile', {
        kind: t(item.type === 'video' ? 'tile.video' : 'tile.photo'),
        time: formatStamp(item.timestamp),
      }),
    [t],
  );

  /*
   * The captured / size / type block, with each cell holding the last value it
   * had for *this* status. A rescan can hand the viewer the same file back with
   * a junk timestamp (the formatters answer "" to those) before MediaStore has
   * caught up, and the block must not blink to nothing under the user's
   * finger. Cached per id, so nothing ever leaks from the previous status.
   */
  const lastMeta = useRef<{ id: string; cells: MetaCell[] } | null>(null);

  const meta = useMemo(() => {
    const ext = extensionOf(current.filename);
    const cells: MetaCell[] = [
      {
        label: t('viewer.captured'),
        value: formatCaptured(current.timestamp, t, { locale: tag }),
      },
      { label: t('viewer.size'), value: formatBytesMB(current.size) },
      {
        label: t('viewer.type'),
        value: (ext || current.type).toUpperCase(),
      },
    ];
    const held =
      lastMeta.current?.id === current.id ? lastMeta.current.cells : null;
    const filled = cells.map((cell, i) =>
      cell.value ? cell : { label: cell.label, value: held?.[i]?.value ?? '' },
    );
    lastMeta.current = { id: current.id, cells: filled };
    return filled;
  }, [current, t, tag]);

  const rails = items.slice(0, RAIL_COUNT);

  const getStripLayout = useCallback(
    (_data: ArrayLike<StatusFile> | null | undefined, i: number) => ({
      length: STRIP_TILE,
      offset: space.xl + (STRIP_TILE + STRIP_GAP) * i,
      index: i,
    }),
    [],
  );

  const handleStripScrollFailed = useCallback((info: { index: number }) => {
    stripRef.current?.scrollToOffset({
      offset: space.xl + (STRIP_TILE + STRIP_GAP) * info.index,
      animated: false,
    });
  }, []);

  const renderStripItem = useCallback(
    ({ item, index: i }: ListRenderItemInfo<StatusFile>) => (
      <StripThumb
        item={item}
        index={i}
        active={i === safeIndex}
        label={tileLabel(item)}
        theme={theme}
        onSelect={goTo}
      />
    ),
    [goTo, safeIndex, theme, tileLabel],
  );

  const keyExtractor = useCallback((item: StatusFile) => item.id, []);

  /*
   * One object per file. react-native-video memoises the internal source it
   * hands the native player on the identity of this prop, so a fresh literal
   * rebuilt it — and re-sent `src` across to ExoPlayer — on every render of
   * the body, which used to include every pause, zoom and save.
   */
  const source = useMemo(() => ({ uri: current.uri }), [current.uri]);

  const roundBtn = (bg: string, border: string): ViewStyle => ({
    backgroundColor: bg,
    borderColor: border,
  });

  return (
    <Animated.View style={rootStyle} pointerEvents={closing ? 'none' : 'auto'}>
      {/* ── Media + rails ── */}
      <Animated.View style={mediaStyle} {...swipePan.panHandlers}>
        <Animated.View
          style={[styles.fill, { transform: [{ scale: zoomAnim }] }]}
        >
          {isVideo ? (
            <>
              {/* Under the player, so a failed or not-yet-attached stream
                  still shows the status rather than a black rectangle. */}
              <Poster item={current} />
              {/*
                Exactly one Video in the tree, keyed on the id: stepping
                unmounts the previous player (releasing its codec and surface)
                before the next one attaches, so however fast the user taps
                prev/next there is never a second stream running.
              */}
              {failed ? null : (
                <Video
                  key={current.id}
                  ref={videoRef}
                  source={source}
                  style={styles.fill}
                  /*
                   * The whole frame, letterboxed on the viewer's own ground.
                   * `cover` filled the screen by cropping to it, which takes
                   * roughly a fifth of the height off a 9:16 status on a
                   * modern phone and most of a landscape one. Zoom only
                   * magnifies and there is no pan, so whatever was cropped
                   * could not be reached at all.
                   */
                  resizeMode="contain"
                  // A SurfaceView is composited outside the view tree and
                  // ignores its ancestors' opacity and transforms, so the
                  // player used to sit fully opaque over the Feed while
                  // everything else faded in, and slid off at full strength
                  // during a swipe-down. A TextureView follows the root.
                  viewType={ViewType.TEXTURE}
                  paused={paused}
                  repeat
                  playInBackground={false}
                  playWhenInactive={false}
                  controls={false}
                  progressUpdateInterval={250}
                  onLoad={handleLoad}
                  onProgress={handleProgress}
                  onError={handleError}
                />
              )}
            </>
          ) : (
            /*
              Keyed on the id for the same reason the poster carries its own
              stamp: a bare source change reuses the native view, and Android
              holds the bitmap it already has (cross-fading over 300ms) until
              the next one decodes. Stepping between photos therefore left the
              one you had just left on screen — and a double tap in that window
              saves `current`, so the file that got saved was not the file the
              user was looking at. A remount shows nothing instead, which the
              neighbour prefetch keeps down to a frame.
            */
            <Image
              key={current.id}
              source={source}
              style={styles.fill}
              // The whole frame, as above.
              resizeMode="contain"
            />
          )}
        </Animated.View>

        <Pressable
          style={styles.fill}
          onPress={() => handleTap()}
          accessibilityRole="image"
          accessibilityLabel={tileLabel(current)}
        />
        {/* Each rail is named after the status it leads to. */}
        <Pressable
          style={[styles.zone, styles.zoneLeft]}
          onPress={() => handleTap(-1)}
          accessibilityRole="button"
          accessibilityLabel={tileLabel(items[(safeIndex + count - 1) % count])}
        />
        <Pressable
          style={[styles.zone, styles.zoneRight]}
          onPress={() => handleTap(1)}
          accessibilityRole="button"
          accessibilityLabel={tileLabel(items[(safeIndex + 1) % count])}
        />
      </Animated.View>

      {/* ── Top shade ── */}
      <LinearGradient
        colors={[theme.viewerTopShade, 'transparent']}
        style={[styles.topShade, { paddingTop: insets.top + 14 }]}
        pointerEvents="box-none"
      >
        <View style={styles.rails} pointerEvents="none">
          {rails.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.rail,
                {
                  backgroundColor:
                    i < safeIndex
                      ? theme.white
                      : i === safeIndex
                      ? theme.railOn
                      : theme.railOff,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel={t('viewer.close')}
            style={pressed([
              styles.roundBtn,
              roundBtn(theme.mediaBtn, theme.mediaBtnEdge),
            ])}
          >
            <Icon name="close" size={17} color={theme.white} strokeWidth={2} />
          </Pressable>

          <View style={styles.controlsRight}>
            <Pressable
              onPress={toggleZoom}
              accessibilityRole="button"
              accessibilityLabel={t('viewer.zoom')}
              accessibilityState={{ selected: zoomed }}
              style={pressed([
                styles.roundBtn,
                roundBtn(
                  zoomed ? theme.accentGlass : theme.mediaBtn,
                  theme.mediaBtnEdge,
                ),
              ])}
            >
              <Icon
                name="zoomIn"
                size={16}
                color={theme.white}
                strokeWidth={1.9}
              />
            </Pressable>

            <Pressable
              onPress={() => onToggleFavourite(current)}
              accessibilityRole="button"
              accessibilityLabel={t('viewer.favourite')}
              accessibilityState={{ selected: favourite }}
              style={pressed([
                styles.roundBtn,
                favourite
                  ? roundBtn(theme.dangerSoft, theme.dangerEdge)
                  : roundBtn(theme.mediaBtn, theme.mediaBtnEdge),
              ])}
            >
              <Icon
                name="heart"
                size={17}
                color={favourite ? theme.danger : theme.white}
                fill={favourite ? theme.danger : 'none'}
                strokeWidth={1.8}
              />
            </Pressable>

            <Text
              style={[type.monoCounter, { color: theme.onMediaMuted }]}
              numberOfLines={1}
            >
              {t('viewer.counter', { n: safeIndex + 1, total: count })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.viewerSheet,
            borderTopColor: theme.viewerSheetEdge,
            paddingBottom: Math.max(insets.bottom, 16) + 10,
            opacity: sheetAnim,
            transform: [{ translateY: sheetLift }],
          },
        ]}
      >
        <Pressable
          onPress={() => setSheetOpen(prev => !prev)}
          hitSlop={{ top: 10, bottom: 6, left: 40, right: 40 }}
          accessibilityRole="button"
          // Named after what it reveals: the captured / size / type block.
          accessibilityLabel={meta.map(cell => cell.label).join(' · ')}
          accessibilityState={{ expanded: sheetOpen }}
          style={pressed(styles.grabberRow)}
        >
          <View style={[styles.grabber, { backgroundColor: theme.railOff }]} />
        </Pressable>

        {isVideo ? (
          <View style={styles.videoRow}>
            <Pressable
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={paused ? t('viewer.play') : t('viewer.pause')}
              style={pressed([
                styles.playBtn,
                roundBtn(theme.mediaBtnSoft, theme.mediaBtnSoftEdge),
              ])}
            >
              <Icon
                name={paused ? 'play' : 'pause'}
                size={15}
                color={theme.white}
              />
            </Pressable>

            <SeekColumn
              ticker={ticker}
              duration={duration}
              theme={theme}
              t={t}
              panHandlers={seekPan.panHandlers}
              onTrackLayout={handleTrackLayout}
              onAction={handleSeekAction}
            />
          </View>
        ) : null}

        {/* Design: the info block and the strip each carry their own fadeIn .2s. */}
        {sheetOpen ? (
          <FadeIn>
            <View
              style={[
                styles.info,
                {
                  borderTopColor: theme.viewerRule,
                  borderBottomColor: theme.viewerRule,
                },
              ]}
            >
              <View style={styles.infoRow}>
                {meta.map(cell => (
                  <View key={cell.label} style={styles.infoCell}>
                    <Text
                      style={[type.eyebrowMedia, { color: theme.onMediaFaint }]}
                      numberOfLines={1}
                    >
                      {cell.label}
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: theme.onMedia }]}
                      numberOfLines={1}
                    >
                      {cell.value}
                    </Text>
                  </View>
                ))}
              </View>
              <Text
                style={[
                  type.footer,
                  styles.hint,
                  { color: theme.onMediaFaint },
                ]}
              >
                {t('viewer.hint')}
              </Text>
            </View>
          </FadeIn>
        ) : null}

        {sheetOpen ? (
          <FadeIn>
            <FlatList
              ref={stripRef}
              data={items}
              renderItem={renderStripItem}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              getItemLayout={getStripLayout}
              initialScrollIndex={safeIndex}
              onScrollToIndexFailed={handleStripScrollFailed}
              initialNumToRender={24}
              /*
               * A strip tile is 30dp on a 35dp pitch, so a phone shows about
               * twelve of them. The default windowSize of 21 viewports would
               * keep roughly 250 mounted, every one of them decoding a status
               * into the bitmap cache for a thumbnail nobody is looking at:
               * on a 1 GB phone that is both the memory and, worse, an
               * eviction storm that throws out the full-screen image the user
               * actually has open. Five viewports is about sixty tiles, a
               * couple of flicks either side of the current one, and
               * getItemLayout is exact, so a scrub lands on the right tile
               * with no jump.
               *
               * One honest caveat, measured rather than assumed: tapping the
               * side rail at the first status wraps to the last, and that is
               * an animated scroll across more tiles than the window keeps
               * mounted, so empty cells stream past during the glide. It is
               * cosmetic and it settles. Making the wrap jump instead of
               * glide would remove it, but that is a change to how the strip
               * moves, so it is left alone rather than decided here.
               */
              windowSize={5}
              maxToRenderPerBatch={12}
              extraData={safeIndex}
              style={styles.strip}
              contentContainerStyle={styles.stripContent}
            />
          </FadeIn>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={saveCurrent}
            accessibilityRole="button"
            accessibilityLabel={saved ? t('viewer.saved') : t('viewer.save')}
            accessibilityState={{ selected: saved }}
            style={pressed([
              styles.saveBtn,
              saved
                ? roundBtn(theme.mediaBtnSoft, theme.mediaBtnEdge)
                : roundBtn(theme.white, theme.white),
            ])}
          >
            {saved ? (
              <Icon
                name="check"
                size={18}
                color={theme.white}
                strokeWidth={2.6}
              />
            ) : (
              <Icon
                name="download"
                size={18}
                color={theme.onWhite}
                strokeWidth={2.1}
              />
            )}
            <Text
              style={[
                type.action,
                { color: saved ? theme.white : theme.onWhite },
              ]}
              numberOfLines={1}
            >
              {saved ? t('viewer.saved') : t('viewer.save')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onShare(current)}
            accessibilityRole="button"
            accessibilityLabel={t('viewer.share')}
            style={pressed([
              styles.shareBtn,
              { borderColor: theme.mediaBtnOutline },
            ])}
          >
            <Icon
              name="share"
              size={18}
              color={theme.white}
              strokeWidth={1.9}
            />
          </Pressable>

          {/* Only over a file there is a saved copy of: on an unsaved status
              it would delete nothing, and the original in WhatsApp's cache is
              not this app's to remove. */}
          {onDelete && saved ? (
            <Pressable
              onPress={askDelete}
              accessibilityRole="button"
              accessibilityLabel={t('viewer.delete')}
              style={pressed([
                styles.shareBtn,
                { borderColor: theme.dangerEdge },
              ])}
            >
              <Icon
                name="trash"
                size={18}
                color={theme.dangerText}
                strokeWidth={1.9}
              />
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => onRepost(current)}
            accessibilityRole="button"
            accessibilityLabel={t('viewer.repost')}
            style={pressed([
              styles.repostBtn,
              roundBtn(theme.accentWash, theme.accentWashEdge),
            ])}
          >
            <Icon
              name="forward"
              size={18}
              color={theme.accentBright}
              strokeWidth={1.9}
            />
            <Text
              style={[type.action, { color: theme.accentBright }]}
              numberOfLines={1}
            >
              {t('viewer.repost')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Double-tap burst (z-index 4: above the shade and the sheet) ── */}
      {burstOn ? (
        <View style={styles.burstLayer} pointerEvents="none">
          <Animated.View
            style={[
              styles.burst,
              {
                backgroundColor: theme.accentBurst,
                opacity: burstFade,
                transform: [{ scale: burstScale }],
              },
            ]}
          >
            <Icon
              name="check"
              size={40}
              color={theme.onAccent}
              strokeWidth={3}
            />
          </Animated.View>
        </View>
      ) : null}

      {/* Inside the viewer's own window, and last, so it lands over the media,
          the sheet and the burst alike. */}
      <ConfirmSheet
        visible={confirmDelete}
        destructive
        title={tp('confirm.deleteTitle', 1)}
        body={t('confirm.deleteBody')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        onClose={closeConfirm}
        onConfirm={runDelete}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Design: the viewer layer is `overflow:hidden`, so a zoomed frame is clipped.
  root: { flex: 1, overflow: 'hidden' },
  fill: StyleSheet.absoluteFillObject,
  pressed: { transform: [{ scale: 0.97 }] },

  // Design: prev/next rails are 32% wide, top 100 / bottom 300.
  // Design: 100 / 300 of a 780dp frame. Proportions rather than dp, so a
  // landscape frame does not give the zones a negative height.
  zone: { position: 'absolute', top: '13%', bottom: '38%', width: '32%' },
  zoneLeft: { left: 0 },
  zoneRight: { right: 0 },

  burstLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Top shade: padding 14 20 34, .64 → 0 ──
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.screen,
    paddingBottom: space.huge,
  },
  /*
   * Design: `margin:16px 0 0` under the frame's own status row. The row itself
   * is the system status bar here (counted in the shade's paddingTop), but the
   * 16px it stands off by is real design spacing and stays.
   */
  rails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    marginTop: space.lg,
  },
  rail: { flex: 1, height: 2, borderRadius: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
  },
  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  roundBtn: {
    width: size.mediaBtn,
    height: size.mediaBtn,
    borderRadius: size.mediaBtn / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Sheet: 1px top edge, radius 26 26 0 0, padding 10 0 0 ──
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.viewerSheet,
    borderTopRightRadius: radius.viewerSheet,
    paddingTop: space.gap,
  },
  grabberRow: { alignItems: 'center', paddingTop: 2, paddingBottom: space.xs },
  grabber: {
    width: size.grabberW,
    height: size.grabberH,
    borderRadius: 2,
  },

  // Video row: padding 10 22 0, gap 12.
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.gap,
    paddingHorizontal: space.xl,
  },
  playBtn: {
    width: size.control,
    height: size.control,
    borderRadius: size.control / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekColumn: { flex: 1, gap: 7 },
  seekTouch: { height: 14, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2 },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  // 10px knob centred on the 3px track: translate(-50%,-50%) in the design.
  knob: {
    position: 'absolute',
    top: -3.5,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 1,
    elevation: 2,
  },
  times: { flexDirection: 'row', justifyContent: 'space-between' },

  // Info: margin 16 22 0, padding 14 0, 1px rules above and below.
  info: {
    marginTop: space.lg,
    marginHorizontal: space.xl,
    paddingVertical: space.row,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  infoRow: { flexDirection: 'row', gap: 24 },
  infoCell: { gap: space.xxs },
  infoValue: sans(12.5, 500),
  hint: { marginTop: space.md },

  // Strip: padding 14 22 0, gap 5, 30×38 tiles.
  strip: { paddingTop: space.row, flexGrow: 0 },
  stripContent: { paddingHorizontal: space.xl, gap: STRIP_GAP },
  stripTile: {
    width: STRIP_TILE,
    height: 38,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  stripDim: { opacity: 0.55 },

  // Actions: padding 16 18 0, gap 10.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    paddingTop: space.lg,
    paddingHorizontal: space.bar,
  },
  saveBtn: {
    flex: 1,
    height: size.viewerBtn,
    borderRadius: radius.toast,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  shareBtn: {
    width: size.viewerBtn,
    height: size.viewerBtn,
    borderRadius: radius.toast,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repostBtn: {
    height: size.viewerBtn,
    paddingHorizontal: space.bar,
    borderRadius: radius.toast,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});

export default StatusViewer;
