/**
 * @format
 *
 * The viewer's invisible half: gesture arbitration, the single player, the
 * keep-awake flag and the ways a status can change under an open viewer.
 */

import React from 'react';
import {
  Animated,
  Image,
  Modal,
  NativeModules,
  Pressable,
  Text,
  Vibration,
} from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

/*
 * A player that records its own life. jest.setup.js renders react-native-video
 * as an inert host string, which cannot answer "was the previous ExoPlayer
 * released before the next one attached?" — the one thing this suite has to be
 * able to prove.
 */
jest.mock('react-native-video', () => {
  const ReactRuntime = require('react');
  const alive: string[] = [];
  const mounts: string[] = [];
  const silenced: string[] = [];
  /** Every render, not just every mount: the media layer's cost per frame. */
  const renders: string[] = [];
  const MockVideo = ReactRuntime.forwardRef(
    (props: { source: { uri: string } }, ref: unknown) => {
      const { uri } = props.source;
      renders.push(uri);
      ReactRuntime.useImperativeHandle(ref, () => ({
        pause: () => silenced.push(uri),
        resume: () => undefined,
        seek: () => undefined,
      }));
      ReactRuntime.useEffect(() => {
        alive.push(uri);
        mounts.push(uri);
        return () => {
          alive.splice(alive.indexOf(uri), 1);
        };
      }, [uri]);
      return null;
    },
  );
  return {
    __esModule: true,
    default: MockVideo,
    // The viewer asks for a TextureView so the player follows the root fade.
    ViewType: { TEXTURE: 0, SURFACE: 1, SURFACE_SECURE: 2 },
    alive,
    mounts,
    silenced,
    renders,
  };
});

import StatusViewer, {
  closesFromSwipe,
  followedIndex,
  seekTargetOf,
  swipeAxisOf,
  swipeStepOf,
  SWIPE_STEP_DP,
  type StatusViewerProps,
} from '../src/components/StatusViewer';
import { Icon } from '../src/components/icons';
import { FeedbackProvider, useFeedback } from '../src/context/FeedbackContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { clearThumbnailCache } from '../src/utils/native';
import { en } from '../src/i18n/en';
import { ConfirmSheet } from '../src/components/ConfirmSheet';
import { status } from '../test-support/testUtils';
import type { StatusFile } from '../src/types';

const player = jest.requireMock('react-native-video') as {
  default: React.ComponentType<{ onError: () => void; onLoad: (d: unknown) => void }>;
  alive: string[];
  mounts: string[];
  silenced: string[];
  renders: string[];
};

const native = NativeModules.FolderPicker;

/** Five statuses so index 0 has two neighbours that are not each other. */
const items: StatusFile[] = [
  status({ id: 'v1.mp4', filename: 'v1.mp4', type: 'video', uri: 'file:///v1.mp4', duration: 14, timestamp: new Date(2026, 0, 2, 12, 1).getTime() }),
  status({ id: 'p2.jpg', filename: 'p2.jpg', uri: 'file:///p2.jpg', timestamp: new Date(2026, 0, 2, 12, 2).getTime() }),
  status({ id: 'p3.jpg', filename: 'p3.jpg', uri: 'file:///p3.jpg', timestamp: new Date(2026, 0, 2, 12, 3).getTime() }),
  status({ id: 'v4.mp4', filename: 'v4.mp4', type: 'video', uri: 'file:///v4.mp4', timestamp: new Date(2026, 0, 2, 12, 4).getTime() }),
  status({ id: 'p5.jpg', filename: 'p5.jpg', uri: 'file:///p5.jpg', timestamp: new Date(2026, 0, 2, 12, 5).getTime() }),
];

type Tree = ReactTestRenderer.ReactTestRenderer;

const shell = (props: StatusViewerProps): React.ReactElement => (
  <ThemeProvider>
    <LanguageProvider>
      <FeedbackProvider>
        <StatusViewer {...props} />
      </FeedbackProvider>
    </LanguageProvider>
  </ThemeProvider>
);

/*
 * The strip is a VirtualizedList, which schedules a render pass on a timer.
 * Left mounted, that pass lands after the test has finished and React warns
 * about an update outside act(); unmounting cancels it.
 */
const trees: Tree[] = [];

afterEach(async () => {
  await act(async () => {
    for (const tree of trees.splice(0)) {
      tree.unmount();
    }
  });
});

/*
 * A clock the tests can push forward.
 *
 * The viewer ignores taps for a moment after it opens, because the second tap
 * of a double tap on a Feed tile lands in a window that was not on screen when
 * the finger went down. Every test here taps the instant it has mounted, so
 * `mount` steps the clock past that grace; a test that wants to tap *inside*
 * it holds the offset itself.
 */
let clockOffset = 0;
const realNow = Date.now.bind(Date);

beforeEach(() => {
  clockOffset = 0;
  jest.spyOn(Date, 'now').mockImplementation(() => realNow() + clockOffset);
});

afterEach(() => {
  (Date.now as unknown as jest.Mock).mockRestore?.();
});

/** Moves the shared clock, for the grace above and the double-tap window. */
const advanceClock = (ms: number): void => {
  clockOffset += ms;
};

const mount = async (over: Partial<StatusViewerProps> = {}) => {
  const props: StatusViewerProps = {
    visible: true,
    items,
    index: 0,
    onClose: jest.fn(),
    onIndexChange: jest.fn(),
    isSaved: () => false,
    isFavourite: () => false,
    onSave: jest.fn().mockResolvedValue(true),
    onToggleFavourite: jest.fn(),
    onShare: jest.fn(),
    onRepost: jest.fn(),
    ...over,
  };
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(shell(props));
  });
  const rerender = async (patch: Partial<StatusViewerProps>) => {
    Object.assign(props, patch);
    await act(async () => {
      tree.update(shell({ ...props }));
    });
  };
  trees.push(tree);
  // Past the open-tap grace, which is where every test below wants to start.
  advanceClock(400);
  return { tree, props, rerender };
};

const pressables = (tree: Tree, role: string) =>
  tree.root.findAll(
    n => n.props.accessibilityRole === role && typeof n.props.onPress === 'function',
  );

const byLabel = (tree: Tree, label: string) =>
  tree.root.findAll(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];

const texts = (tree: Tree): string[] =>
  tree.root
    .findAllByType(Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter((c): c is string => typeof c === 'string');

/** The video row's two clocks, elapsed then total, and nothing else in mm:ss. */
const clocks = (tree: Tree): string[] => texts(tree).filter(s => /^\d\d:\d\d$/.test(s));

/**
 * The two prev/next tap zones, left first. They are the only role="button"
 * pressables in the viewer that are not named chrome — each one is labelled
 * after the status it leads to, which is exactly why they cannot be looked up
 * by a fixed label.
 */
const CHROME = new Set([
  'Close',
  'Zoom',
  'Favourite',
  'Save',
  'Saved',
  'Share',
  'Repost',
  'Play',
  'Pause',
  'captured \u00b7 size \u00b7 type',
]);

const zones = (tree: Tree) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.onPress === 'function' &&
      !CHROME.has(n.props.accessibilityLabel),
  );

/** The 40dp check of the double-tap burst; nothing else in the viewer is 40. */
const bursts = (tree: Tree) =>
  tree.root.findAllByType(Icon).filter(n => n.props.size === 40);

const press = async (node: ReactTestRenderer.ReactTestInstance) => {
  await act(async () => {
    node.props.onPress();
  });
};

beforeEach(async () => {
  await clearThumbnailCache();
  jest.clearAllMocks();
  player.alive.length = 0;
  player.mounts.length = 0;
  player.silenced.length = 0;
  player.renders.length = 0;
});

// ── Gesture arbitration ─────────────────────────────────────────────────────

describe('swipe axis', () => {
  it('claims a downward drag once it is clearly vertical', () => {
    expect(swipeAxisOf(2, 30)).toBe('y');
  });

  it('claims a sideways drag once it is clearly horizontal', () => {
    expect(swipeAxisOf(-40, 5)).toBe('x');
  });

  it('claims nothing for a tap or a still-ambiguous diagonal', () => {
    // A tap wobbles a few dp: it must stay a tap so the double-tap save works.
    expect(swipeAxisOf(3, 4)).toBeNull();
    // 45°: neither axis wins by 1.6×, so the gesture is left undecided rather
    // than both dismissing and paging.
    expect(swipeAxisOf(40, 40)).toBeNull();
  });

  it('never reads an upward drag as a dismiss', () => {
    expect(swipeAxisOf(0, -60)).toBeNull();
  });
});

describe('swipe paging', () => {
  it('pages only once the swipe is past ~60dp', () => {
    expect(swipeStepOf(SWIPE_STEP_DP - 1, 0)).toBe(0);
    expect(swipeStepOf(-(SWIPE_STEP_DP + 1), 0)).toBe(1);
    expect(swipeStepOf(SWIPE_STEP_DP + 1, 0)).toBe(-1);
  });

  it('accepts a short fast flick, which never covers 60dp', () => {
    expect(swipeStepOf(-30, -1.2)).toBe(1);
    // Slow and short stays a no-op: that is a hesitant finger, not a page.
    expect(swipeStepOf(-30, -0.1)).toBe(0);
  });
});

describe('swipe down', () => {
  it('dismisses on distance or on speed, and springs back otherwise', () => {
    expect(closesFromSwipe(120, 0)).toBe(true);
    expect(closesFromSwipe(40, 1.4)).toBe(true);
    expect(closesFromSwipe(40, 0.2)).toBe(false);
  });
});

// ── Seeking ─────────────────────────────────────────────────────────────────

describe('seekTargetOf', () => {
  it('does nothing while the length is unknown', () => {
    expect(seekTargetOf(0.5, 0)).toBeNull();
    expect(seekTargetOf(0.5, Number.NaN)).toBeNull();
  });

  it('clamps a drag that runs off either end of the track', () => {
    expect(seekTargetOf(-0.4, 10)).toBe(0);
    expect(seekTargetOf(1.8, 10)).toBe(9.75);
  });

  it('keeps the last quarter-second unreachable so `repeat` cannot restart', () => {
    // Dragging to the very end used to land on the final frame, which makes
    // ExoPlayer loop: the bar snapped to 0 and started running again.
    expect(seekTargetOf(1, 10)).toBeLessThan(10);
    expect(seekTargetOf(0.5, 10)).toBe(5);
  });

  it('collapses to 0 for a clip shorter than the guard', () => {
    expect(seekTargetOf(1, 0.1)).toBe(0);
  });
});

// ── Following the status through a list change ───────────────────────────────

describe('followedIndex', () => {
  it('reports the new slot when the parent re-sorted the list', () => {
    expect(followedIndex(items, 'p3.jpg', 0)).toBe(2);
  });

  it('reports nothing when the status is still where it was', () => {
    expect(followedIndex(items, 'p3.jpg', 2)).toBeNull();
  });

  it('reports nothing when the status has left the list', () => {
    // Deleted from the library: the viewer adopts whatever fills the slot.
    expect(followedIndex(items, 'gone.jpg', 1)).toBeNull();
  });
});

// ── One player at a time ────────────────────────────────────────────────────

describe('the video player', () => {
  it('mounts exactly one player for a video and none for a photo', async () => {
    const { rerender } = await mount({ index: 0 });
    expect(player.alive).toEqual(['file:///v1.mp4']);

    await rerender({ index: 1 });
    expect(player.alive).toEqual([]);
  });

  it('releases the previous player before the next one plays', async () => {
    const { rerender } = await mount({ index: 0 });

    // Rapid prev/next: every hop must leave one live stream, never two.
    await rerender({ index: 3 });
    expect(player.alive).toEqual(['file:///v4.mp4']);
    await rerender({ index: 0 });
    expect(player.alive).toEqual(['file:///v1.mp4']);
    expect(player.mounts).toEqual([
      'file:///v1.mp4',
      'file:///v4.mp4',
      'file:///v1.mp4',
    ]);
  });

  it('warms the neighbours’ posters and none of their streams', async () => {
    const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
    await mount({ index: 0 });

    const asked = prefetch.mock.calls.map(call => call[0]);
    // Neighbours of 0 in a 5-item ring are 1 and 4.
    expect(asked).toContain('file:///p2.jpg');
    expect(asked).toContain('file:///p5.jpg');
    expect(asked).not.toContain('file:///p3.jpg');
    // Still one player: a poster is a still frame, not a stream.
    expect(player.alive).toEqual(['file:///v1.mp4']);
    prefetch.mockRestore();
  });

  it('drops the player when the stream fails and lets the user retry', async () => {
    const { tree } = await mount({ index: 0 });
    const video = tree.root.findByType(player.default);

    await act(async () => {
      video.props.onError();
    });

    // No player, so the poster underneath is what the user sees, and the
    // button offers play (retry) rather than pause on a dead stream.
    expect(player.alive).toEqual([]);
    expect(byLabel(tree, 'Play')).toBeTruthy();
    // Everything else still works: the user is not trapped.
    expect(byLabel(tree, 'Close')).toBeTruthy();
    expect(byLabel(tree, 'Save')).toBeTruthy();

    await press(byLabel(tree, 'Play'));
    expect(player.alive).toEqual(['file:///v1.mp4']);
  });

  it('keeps the listing’s length when the container reports none', async () => {
    const { tree } = await mount({ index: 0 });
    // 14s from the listing shows immediately instead of flashing 00:00.
    expect(texts(tree)).toContain('00:14');

    await act(async () => {
      tree.root.findByType(player.default).props.onLoad({ duration: 0 });
    });
    expect(texts(tree)).toContain('00:14');
  });

  /*
   * The listing stopped carrying durations when the gallery read dropped
   * playableDuration, so every video now arrives here with nothing. index 3 is
   * the fixture that has never had one, which is what every video looks like
   * in production; index 0 keeps its 14 only because the test hands it over.
   */
  it('fills the total from the native read when the listing has none', async () => {
    await clearThumbnailCache();
    native.getVideoMeta.mockResolvedValueOnce({
      thumbnail: null,
      durationMs: 14_000,
      width: 1080,
      height: 1920,
    });

    const { tree } = await mount({ index: 3 });
    // Elapsed, then total.
    expect(clocks(tree)).toEqual(['00:00', '00:14']);
  });

  it('reads the same total before and after the player loads a fractional clip', async () => {
    await clearThumbnailCache();
    native.getVideoMeta.mockResolvedValueOnce({
      thumbnail: null,
      durationMs: 14_600,
      width: null,
      height: null,
    });

    const { tree } = await mount({ index: 3 });
    // Not 00:15: the seed is the exact length, and the clock floors it.
    expect(clocks(tree)).toEqual(['00:00', '00:14']);

    await act(async () => {
      tree.root.findByType(player.default).props.onLoad({ duration: 14.6 });
    });
    expect(clocks(tree)).toEqual(['00:00', '00:14']);
  });

  it('lets the player overrule the native read', async () => {
    await clearThumbnailCache();
    native.getVideoMeta.mockResolvedValueOnce({
      thumbnail: null,
      durationMs: 14_000,
      width: null,
      height: null,
    });

    const { tree } = await mount({ index: 3 });
    await act(async () => {
      tree.root.findByType(player.default).props.onLoad({ duration: 20 });
    });
    expect(texts(tree)).toContain('00:20');
  });

  it('shows no total for a clip nothing can read, rather than hanging', async () => {
    await clearThumbnailCache();
    native.getVideoMeta.mockResolvedValueOnce(null);

    const { tree } = await mount({ index: 3 });
    // Both clocks, so this cannot pass on the elapsed clock alone.
    expect(clocks(tree)).toEqual(['00:00', '00:00']);
  });
});

// ── Keep awake ──────────────────────────────────────────────────────────────

describe('keeping the screen on', () => {
  it('holds the display while a video plays and lets it go on pause', async () => {
    const { tree } = await mount({ index: 0 });
    expect(native.setKeepAwake).toHaveBeenCalledWith(true);

    jest.clearAllMocks();
    await press(byLabel(tree, 'Pause'));
    expect(native.setKeepAwake).toHaveBeenCalledWith(false);
    expect(native.setKeepAwake).not.toHaveBeenCalledWith(true);
  });

  it('never holds the display for a photo', async () => {
    await mount({ index: 1 });
    expect(native.setKeepAwake).not.toHaveBeenCalledWith(true);
  });

  it('lets the display sleep again when the viewer closes', async () => {
    const { rerender } = await mount({ index: 0 });
    jest.clearAllMocks();

    await rerender({ visible: false });
    expect(native.setKeepAwake).toHaveBeenCalledWith(false);
  });
});

// ── Double-tap save ─────────────────────────────────────────────────────────

describe('double-tap save', () => {
  it('ticks once and saves the status on screen', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation();
    const { tree, props } = await mount({ index: 1 });
    const media = pressables(tree, 'image')[0];

    await act(async () => {
      media.props.onPress();
      media.props.onPress();
    });

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(10);
    expect(props.onSave).toHaveBeenCalledWith(items[1]);
    vibrate.mockRestore();
  });

  it('does not tick for a single tap', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation();
    const { tree } = await mount({ index: 1 });

    await press(pressables(tree, 'image')[0]);

    expect(vibrate).not.toHaveBeenCalled();
    vibrate.mockRestore();
  });
});

// ── The list moving underneath ──────────────────────────────────────────────

describe('when the parent list changes underneath', () => {
  it('follows the status the user is looking at to its new slot', async () => {
    const { props, rerender } = await mount({ index: 1 });
    jest.clearAllMocks();

    // A save from the viewer re-sorts the feed: p2 is now last.
    const resorted = [items[0], items[2], items[3], items[4], items[1]];
    await rerender({ items: resorted });

    expect(props.onIndexChange).toHaveBeenCalledWith(4);
  });

  it('leaves the counter alone when the list is only rebuilt', async () => {
    const { props, rerender } = await mount({ index: 1 });
    jest.clearAllMocks();

    // A folder rescan hands back equal items as fresh objects.
    await rerender({ items: items.map(item => ({ ...item })) });

    expect(props.onIndexChange).not.toHaveBeenCalled();
  });

  it('adopts the slot when the status has been deleted', async () => {
    const { props, rerender } = await mount({ index: 1 });
    jest.clearAllMocks();

    await rerender({ items: [items[0], items[2], items[3]] });

    expect(props.onIndexChange).not.toHaveBeenCalled();
    // The counter is the new slot's, and it is consistent with the list.
    expect(props.items).toHaveLength(3);
  });

  it('keeps following after the user pages by hand', async () => {
    const { tree, props, rerender } = await mount({ index: 0 });

    // The detail block, and with it the thumbnail strip, starts folded away so
    // the media gets the room; the grabber is what reveals it.
    await press(byLabel(tree, 'captured · size · type'));
    // Strip tiles page immediately (no double-tap window to wait out).
    await press(pressables(tree, 'imagebutton')[2]);
    expect(props.onIndexChange).toHaveBeenCalledWith(2);

    await rerender({ index: 2 });
    jest.clearAllMocks();

    const resorted = [items[2], items[0], items[1], items[3], items[4]];
    await rerender({ items: resorted });
    expect(props.onIndexChange).toHaveBeenCalledWith(0);
  });
});

// ── Sound and toasts ────────────────────────────────────────────────────────

describe('closing during playback', () => {
  it('silences the player at once, not when the dismissal lands', async () => {
    const { tree } = await mount({ index: 0 });

    await press(byLabel(tree, 'Close'));

    // The unmount releases ExoPlayer, but the parent's state change and the
    // dismissal both land after this frame; the audio must not outlive the tap.
    expect(player.silenced).toEqual(['file:///v1.mp4']);
  });
});

/** A screen behind the viewer, raising a toast the way FeedScreen's save does. */
const ScreenToast: React.FC = () => {
  const { showToast } = useFeedback();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="fire"
      onPress={() => showToast({ message: 'Saved to Gallery' })}
    />
  );
};

describe('a toast raised by the screen behind the viewer', () => {
  it('renders inside the viewer’s own window, where it is visible', async () => {
    const props: StatusViewerProps = {
      visible: true,
      items,
      index: 0,
      onClose: jest.fn(),
      onIndexChange: jest.fn(),
      isSaved: () => false,
      isFavourite: () => false,
      onSave: jest.fn().mockResolvedValue(true),
      onToggleFavourite: jest.fn(),
      onShare: jest.fn(),
      onRepost: jest.fn(),
    };
    let tree!: Tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <LanguageProvider>
            <FeedbackProvider>
              <ScreenToast />
              <StatusViewer {...props} />
            </FeedbackProvider>
          </LanguageProvider>
        </ThemeProvider>,
      );
    });
    trees.push(tree);

    await press(byLabel(tree, 'fire'));

    /*
     * An Android Modal is a window of its own: rendered by the root provider,
     * this toast would paint behind the viewer and never be seen. It has to
     * come out inside the Modal's subtree.
     */
    const inModal = tree.root
      .findByType(Modal)
      .findAllByType(Text)
      .map(n => n.props.children)
      .filter((c): c is string => typeof c === 'string');
    expect(inModal).toContain('Saved to Gallery');
  });
});

// ── Chrome ──────────────────────────────────────────────────────────────────

describe('viewer chrome', () => {
  it('counts from one and stays in step with the list', async () => {
    const { tree, rerender } = await mount({ index: 0 });
    expect(texts(tree)).toContain('1 / 5');

    await rerender({ index: 3 });
    expect(texts(tree)).toContain('4 / 5');
  });

  it('closes on the close button', async () => {
    const { tree, props } = await mount({ index: 0 });
    await press(byLabel(tree, 'Close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});


// ── Dismissal paths ─────────────────────────────────────────────────────────

describe('the Android back button', () => {
  it('silences the player, exactly as the Close button does', async () => {
    const { tree, props } = await mount({ index: 0 });

    await act(async () => {
      tree.root.findByType(Modal).props.onRequestClose();
    });

    /*
     * The Modal's own back handling used to call `onClose` straight through.
     * The parent's state change and the Modal's fade both land after this
     * frame, so the status kept playing — audibly — through the dismissal.
     */
    expect(player.silenced).toEqual(['file:///v1.mp4']);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

// ── The burst ───────────────────────────────────────────────────────────────

describe('the double-tap burst', () => {
  it('stays on screen when a second save restarts it', async () => {
    const { tree } = await mount({ index: 1 });
    const media = pressables(tree, 'image')[0];

    await act(async () => {
      media.props.onPress();
      media.props.onPress();
    });
    expect(bursts(tree)).toHaveLength(1);

    /*
     * Saving again inside the 700ms rewinds the animation, which ends the
     * first run with finished:false. Clearing the burst on that end unmounted
     * the disc that had just appeared, so the second save flashed nothing.
     */
    await act(async () => {
      media.props.onPress();
      media.props.onPress();
    });
    expect(bursts(tree)).toHaveLength(1);
  });
});

// ── The poster under a video ────────────────────────────────────────────────

describe('the poster frame', () => {
  it('never shows the previous clip while the next frame is decoding', async () => {
    const gate: { release?: () => void } = {};
    const meta = native.getVideoMeta as jest.Mock;
    const frame = (path: string) => ({
      thumbnail: path,
      durationMs: null,
      width: null,
      height: null,
    });
    meta.mockImplementation((uri: string) =>
      uri.includes('v4')
        ? new Promise(resolve => {
            gate.release = () => resolve(frame('file:///v4.jpg'));
          })
        : Promise.resolve(frame('file:///v1.jpg')),
    );

    try {
      const { tree, rerender } = await mount({ index: 0 });
      const posters = () =>
        tree.root.findAllByType(Image).map(n => n.props.source.uri);
      expect(posters()).toContain('file:///v1.jpg');

      await rerender({ index: 3 });
      // The hook lives in the same slot of the tree across the step, so a
      // bare path left v1 painted underneath v4 until native answered.
      expect(posters()).not.toContain('file:///v1.jpg');

      await act(async () => {
        gate.release?.();
      });
      expect(posters()).toContain('file:///v4.jpg');
    } finally {
      meta.mockResolvedValue(null);
    }
  });
});

// ── Gestures against a moving list ──────────────────────────────────────────

describe('a queued single tap', () => {
  it('pages from where the status is when it fires, not from where it was', async () => {
    jest.useFakeTimers();
    try {
      const { tree, props, rerender } = await mount({ index: 0 });
      // Fake timers own Date.now, so `mount`'s clock step does not apply here:
      // step past the open-tap grace the same way the platform would.
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // Right zone: "next". It is held back one double-tap window so a double
      // tap on a rail cannot page and then save the wrong file.
      await act(async () => {
        zones(tree)[1].props.onPress();
      });
      expect(props.onIndexChange).not.toHaveBeenCalled();

      // Inside that window the parent re-sorts (a save from here re-buckets
      // the status): v1 moves from slot 0 to slot 2 and the viewer follows.
      const resorted = [items[1], items[2], items[0], items[3], items[4]];
      await rerender({ items: resorted });
      expect(props.onIndexChange).toHaveBeenCalledWith(2);
      await rerender({ index: 2 });
      jest.clearAllMocks();

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // 3 is the status after the one on screen. A captured `step` would have
      // paged from slot 0 and landed on a stranger.
      expect(props.onIndexChange).toHaveBeenCalledWith(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the swipe responder', () => {
  it('survives a list rebuild without losing the gesture in progress', async () => {
    const { tree, rerender } = await mount({ index: 0 });
    const media = () =>
      tree.root.findAll(
        n => typeof n.props.onMoveShouldSetResponderCapture === 'function',
      )[0];
    const before = media().props.onResponderRelease;

    // A folder rescan hands back equal items as fresh objects mid-drag.
    await rerender({ items: items.map(item => ({ ...item })) });

    /*
     * A rebuilt PanResponder starts with a fresh gestureState whose x0/y0 are
     * still 0, so the next move of a drag already in flight reported dx as the
     * raw page coordinate and the release paged by a screen's width.
     */
    expect(media().props.onResponderRelease).toBe(before);
  });
});

// ── The seek bar ────────────────────────────────────────────────────────────

describe('the seek row', () => {
  it('keeps the track and its knob out of the hit test', async () => {
    const { tree } = await mount({ index: 0 });
    const row = tree.root.findAll(
      n => n.props.accessibilityRole === 'adjustable',
    )[0];
    const track = row.findAll(n => typeof n.props.onLayout === 'function')[0];

    /*
     * The grant handler measures locationX against whichever view the finger
     * hit. The 10dp knob is the track's topmost child, so grabbing it — the
     * one obvious way to scrub — reported 0-10dp and rewound the clip to the
     * start. Only the responder row itself may be a target.
     */
    expect(track.props.pointerEvents).toBe('none');
  });
});

// ── What a playing video costs per frame ────────────────────────────────────

/** The row TalkBack drives and the finger scrubs: both end up in `seekToRatio`. */
const seekRow = (tree: Tree) =>
  tree.root.findAll(n => n.props.accessibilityRole === 'adjustable')[0];

/** One `onProgress` callback, delivered on its own like the player delivers it. */
const tick = async (tree: Tree, seconds: number) => {
  await act(async () => {
    tree.root.findByType(player.default).props.onProgress({
      currentTime: seconds,
      playableDuration: 14,
      seekableDuration: 14,
    });
  });
};

describe('the progress tick', () => {
  it('moves the clock without re-rendering the media layer', async () => {
    const { tree } = await mount({ index: 0 });
    player.renders.length = 0;

    for (const seconds of [1, 2, 3, 4]) {
      await tick(tree, seconds);
    }

    // The seek row is up to date...
    expect(texts(tree)).toContain('00:04');
    /*
     * ...and the player was not re-rendered once for it. `onProgress` fires
     * four times a second for the whole length of a clip; held in state on the
     * body each one re-rendered the entire viewer — measured on this tree: the
     * `Video` element (a fresh `source` object rebuilds react-native-video's
     * internal `src` and re-sends it to ExoPlayer), seven icons across the
     * shade and both action rows, and two `interpolate()` calls whose new
     * nodes make React Native throw away and rebuild the media layer's and the
     * sheet's native animation nodes.
     */
    expect(player.renders).toEqual([]);
  });

  it('costs nothing at all while the user is scrubbing', async () => {
    const { tree } = await mount({ index: 0 });
    await tick(tree, 3);
    player.renders.length = 0;

    // Every touch move of a scrub takes this path, sixty to a hundred and
    // twenty times a second — the one place in the viewer where a re-render
    // lands inside a gesture rather than beside it.
    for (let move = 0; move < 6; move++) {
      await act(async () => {
        seekRow(tree).props.onAccessibilityAction({
          nativeEvent: { actionName: 'increment' },
        });
      });
    }

    // The knob moved (5% a step, from 3s of 14s = 21%) and nothing outside the
    // seek column was asked to render.
    expect(seekRow(tree).props.accessibilityValue.now).toBe(51);
    expect(player.renders).toEqual([]);
  });
});

describe('the viewer’s animated layers', () => {
  it('builds each interpolation once, not once per render', async () => {
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const { tree, rerender } = await mount({ index: 0 });
    interpolate.mockClear();

    await rerender({ index: 3 });
    await press(byLabel(tree, 'Pause'));

    /*
     * `interpolate()` returns a fresh node every call, and React Native keys an
     * `Animated.View`'s native props node on the identity of the nodes in its
     * style: an inline interpolation therefore detached the media layer's (and
     * the sheet's) native animation node and built a new one on every render,
     * including renders that landed mid-swipe and mid-burst.
     */
    expect(interpolate).not.toHaveBeenCalled();
    interpolate.mockRestore();
  });
});

describe('the thumbnail strip', () => {
  it('re-renders only the two tiles whose ring moves', async () => {
    const { tree, rerender } = await mount({ index: 0 });
    await press(byLabel(tree, 'captured · size · type'));
    const before = pressables(tree, 'imagebutton').map(n => n.props.onPress);

    await rerender({ index: 1 });
    const after = pressables(tree, 'imagebutton').map(n => n.props.onPress);

    /*
     * A tile that re-renders builds a new press handler, so identity is the
     * tell. Only the tile losing the ring and the tile gaining it have any
     * reason to: `onPress={() => goTo(i)}` built inside `renderItem` gave all
     * of them a new prop on every pass, defeating the memo and re-running
     * `usePoster` across the whole strip on every page.
     */
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(after.slice(2)).toEqual(before.slice(2));
  });
});

// ── Failing handlers ────────────────────────────────────────────────────────

describe('a save that rejects', () => {
  it('never escapes as an unhandled rejection', async () => {
    const seen: unknown[] = [];
    const watch = (reason: unknown) => seen.push(reason);
    process.on('unhandledRejection', watch);
    try {
      const { tree } = await mount({
        index: 1,
        onSave: jest.fn().mockRejectedValue(new Error('no space left')),
      });

      await press(byLabel(tree, 'Save'));
      await new Promise(resolve => setImmediate(resolve));

      // An unhandled rejection is a crash in a release build, and a save that
      // fails is the parent's to report, not the viewer's to die on.
      expect(seen).toEqual([]);
    } finally {
      process.off('unhandledRejection', watch);
    }
  });
});

// ── Jumping while a tap is queued ───────────────────────────────────────────

describe('a jump made while a side tap is still queued', () => {
  it('lands on the tile the user picked, not one past it', async () => {
    jest.useFakeTimers();
    try {
      const { tree, props, rerender } = await mount({ index: 0 });

      // The strip lives behind the grabber: the detail block starts folded.
      await press(byLabel(tree, 'captured · size · type'));

      // Right zone: "next", held back one double-tap window.
      await act(async () => {
        zones(tree)[1].props.onPress();
      });
      expect(props.onIndexChange).not.toHaveBeenCalled();

      // Inside that window the user picks slot 2 out of the strip.
      await press(pressables(tree, 'imagebutton')[2]);
      expect(props.onIndexChange).toHaveBeenCalledWith(2);
      await rerender({ index: 2 });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      /*
       * The queued tap is a *relative* step from the slot the finger landed
       * on, which an absolute jump has just made meaningless. Left armed it
       * stepped on from slot 2 and the user ended up on the status after the
       * tile they had chosen.
       */
      expect(props.onIndexChange).toHaveBeenCalledTimes(1);
      expect(props.onIndexChange).not.toHaveBeenCalledWith(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

// ── Sound when the status changes ───────────────────────────────────────────

describe('stepping away from a playing video', () => {
  it('silences it as the move is made, not when the player unmounts', async () => {
    const { tree } = await mount({ index: 0 });
    await press(byLabel(tree, 'captured · size · type'));

    // Strip slot 3 is the other video, so this is video → video.
    await press(pressables(tree, 'imagebutton')[3]);

    /*
     * Dropping the `Video` releases ExoPlayer, but the parent's index change
     * and the remount both land after this frame, and that tail of the clip
     * you have left plays over the one you have arrived at.
     */
    expect(player.silenced).toEqual(['file:///v1.mp4']);
  });

  it('leaves the player alone when the jump lands where we already are', async () => {
    const { tree, props } = await mount({ index: 0 });
    await press(byLabel(tree, 'captured · size · type'));

    await press(pressables(tree, 'imagebutton')[0]);

    /*
     * Nothing re-renders after a jump to the current status, so a pause here
     * would never be undone: silent video under a button still reading
     * "Pause". The same guard covers `step` on a one-item list.
     */
    expect(player.silenced).toEqual([]);
    expect(props.onIndexChange).toHaveBeenCalledWith(0);
  });
});

/**
 * Deleting the saved copy from the viewer.
 *
 * The button only exists over a file there is a copy of, and it never deletes
 * on the first tap: the sheet in between is the only thing standing between a
 * mis-tap and a file that cannot be brought back.
 */
describe('the delete button', () => {
  const del = en['viewer.delete'];

  it('stays off a status that has not been saved', async () => {
    const { tree } = await mount({ isSaved: () => false, onDelete: jest.fn() });

    expect(byLabel(tree, del)).toBeUndefined();
  });

  it('stays off a screen that gave it nothing to call', async () => {
    const { tree } = await mount({ isSaved: () => true });

    expect(byLabel(tree, del)).toBeUndefined();
  });

  it('asks before deleting, and deletes nothing until answered', async () => {
    const onDelete = jest.fn();
    const { tree } = await mount({ isSaved: () => true, onDelete });

    await act(async () => {
      byLabel(tree, del).props.onPress();
    });

    // The sheet is up and the file is still there.
    expect(texts(tree)).toContain(en['confirm.deleteTitle_one'].replace('{n}', '1'));
    expect(onDelete).not.toHaveBeenCalled();

    await act(async () => {
      byLabel(tree, en['confirm.delete']).props.onPress();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].id).toBe('v1.mp4');
  });

  it('deletes once when Delete is tapped twice before the sheet closes', async () => {
    const onDelete = jest.fn();
    const { tree } = await mount({ isSaved: () => true, onDelete });

    await act(async () => {
      byLabel(tree, del).props.onPress();
    });
    // Both taps land on the button as it is now, before React re-renders:
    // the same race as a second tap during the sheet's exit animation.
    const confirm = byLabel(tree, en['confirm.delete']);
    await act(async () => {
      confirm.props.onPress();
      confirm.props.onPress();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing when the sheet is dismissed', async () => {
    const onDelete = jest.fn();
    const { tree } = await mount({ isSaved: () => true, onDelete });

    await act(async () => {
      byLabel(tree, del).props.onPress();
    });
    await act(async () => {
      byLabel(tree, en['confirm.cancel']).props.onPress();
    });

    expect(onDelete).not.toHaveBeenCalled();
  });

  /*
   * The sheet names one file but is answered later. Paging while it is open
   * would have it delete whatever had slid under it instead.
   *
   * Asserted on the sheet's own `visible`, not on whether its buttons are in
   * the tree: the sheet shell keeps them mounted and live through its exit
   * animation, so finding a Remove button proves nothing either way.
   */
  it('closes when the status underneath it changes', async () => {
    const onDelete = jest.fn();
    const { tree, rerender } = await mount({
      isSaved: () => true,
      onDelete,
      index: 0,
    });

    await act(async () => {
      byLabel(tree, del).props.onPress();
    });
    expect(tree.root.findByType(ConfirmSheet).props.visible).toBe(true);

    await rerender({ index: 1 });

    expect(tree.root.findByType(ConfirmSheet).props.visible).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
  });
});

/*
 * The viewer opens under the finger that opened it: the Modal is on screen one
 * frame after the tile's onPress, and the rails cover most of the media.
 */
describe('the tap grace after opening', () => {
  it('ignores the second tap of a double tap on the tile that opened it', async () => {
    const onIndexChange = jest.fn();
    const { tree, props } = await mount({ index: 1, onIndexChange });
    // Back to the instant the viewer appeared.
    advanceClock(-400);

    await act(async () => {
      zones(tree)[1].props.onPress();
    });
    await act(async () => {
      jest.advanceTimersByTime?.(400);
    });

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('answers taps once the grace has passed', async () => {
    const { tree, props } = await mount({ index: 1 });

    await act(async () => {
      const media = pressables(tree, 'image')[0];
      media.props.onPress();
      media.props.onPress();
    });

    expect(props.onSave).toHaveBeenCalledWith(items[1]);
  });
});
