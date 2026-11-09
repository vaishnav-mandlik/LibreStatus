/**
 * @format
 *
 * The Feed's invisible half: which scan wins when two land together, what the
 * viewer is looking at after the list moves under it, whether auto-save can
 * lose the statuses a second scan found, and whether a failing write can
 * strand the batch overlay or swallow a Vault move.
 */

import React from 'react';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';
import { NativeModules } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/*
 * The children are stubbed as host components. They own animations, a
 * FlatList and a video player, none of which this suite is about — and as
 * host strings their props are readable, which is how the viewer's anchor and
 * the batch overlay are inspected below.
 */
jest.mock('../src/components/StatusGrid', () => ({ StatusGrid: 'StatusGrid' }));
jest.mock('../src/components/GridSkeleton', () => ({
  GridSkeleton: 'GridSkeleton',
}));
jest.mock('../src/components/FilterTabs', () => ({ FilterTabs: 'FilterTabs' }));
jest.mock('../src/components/SelectionBar', () => ({
  SelectionHeader: 'SelectionHeader',
  SelectionTray: 'SelectionTray',
}));
jest.mock('../src/components/Sheet', () => ({ OptionSheet: 'OptionSheet' }));
jest.mock('../src/components/PermissionGuide', () => ({
  PermissionGuide: 'PermissionGuide',
}));
jest.mock('../src/components/BatchProgress', () => ({
  BatchProgress: 'BatchProgress',
}));
/*
 * The viewer is the one stub that records rather than only reporting. Whether
 * it was torn down and rebuilt mid-rescan is invisible in the committed props
 * — the re-anchor effect has already put them right by the time `act` returns
 * — so every `visible` it was ever rendered with is kept instead. It still
 * renders a host node called `StatusViewer`, so `findByType` works as before.
 */
const mockViewerVisible: boolean[] = [];
jest.mock('../src/components/StatusViewer', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: (props: { visible: boolean }) => {
      mockViewerVisible.push(props.visible);
      return react.createElement('StatusViewer', props);
    },
  };
});

/*
 * The toast is the only handle on Undo, and it lives inside the provider that
 * unmounts with the screen. Capturing the options instead keeps the action
 * pressable after the user has walked away, which is the point of two of the
 * tests below.
 */
const mockToasts: Array<{
  message: string;
  action?: { label: string; onPress: () => void };
}> = [];
/*
 * One frozen value, as the real provider hands out: it memoises its context
 * object (FeedbackContext.tsx). A hook that built a fresh object on every call
 * made `showToast` a new function per render, which is exactly the kind of
 * identity churn the handler-stability tests at the bottom of this file exist
 * to catch — a mock must not be the thing that breaks them.
 */
const mockFeedback = {
  showToast: (options: { message: string }) => {
    mockToasts.push(options);
    return 1;
  },
  dismissToast: jest.fn(),
  setToastBottom: jest.fn(),
  claimToastBottom: () => () => undefined,
};
/*
 * The viewer's own reporting (save, delete, repost) goes through the
 * module-level `showToast`, not the hook, so that a toast raised from inside
 * the viewer's Modal outlives it. Recorded separately from `mockToasts` so
 * neither list's "last toast" assertions can be disturbed by the other.
 */
const mockModuleToasts: Array<{ message: string }> = [];
jest.mock('../src/context/FeedbackContext', () => {
  const real = jest.requireActual('../src/context/FeedbackContext');
  return {
    ...real,
    useFeedback: () => mockFeedback,
    showToast: (options: { message: string }) => {
      mockModuleToasts.push(options);
      return 1;
    },
  };
});

jest.mock('../src/utils/haptics', () => ({
  hapticSave: jest.fn(),
  hapticSelect: jest.fn(),
}));

jest.mock('../src/utils/statusManager', () => {
  const real = jest.requireActual('../src/utils/statusManager');
  return {
    ...real,
    getStatusFiles: jest.fn().mockResolvedValue([]),
    syncSavedStatusIds: jest.fn().mockResolvedValue(new Set<string>()),
    saveMany: jest.fn(),
    saveStatusToGallery: jest.fn().mockResolvedValue(true),
    addSavedStatusIds: jest.fn().mockResolvedValue(undefined),
    removeSavedStatusIds: jest.fn().mockResolvedValue(undefined),
    deleteSavedCopiesOf: jest.fn(),
  };
});

jest.mock('../src/utils/vault', () => ({
  addToVault: jest.fn(),
  removeFromVault: jest.fn().mockResolvedValue(true),
  vaultHolds: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/utils/share', () => ({
  messagingPackage: jest.fn().mockResolvedValue('com.whatsapp'),
  shareStatuses: jest.fn().mockResolvedValue(true),
  shareToWhatsApp: jest.fn().mockResolvedValue(true),
  isWhatsAppMissing: jest.fn().mockReturnValue(false),
}));

import { filterAfterSwipe } from '../src/screens/FeedScreen';
import { pageAtOffset } from '../src/components/ui';
import FeedScreen, { type FeedScreenProps } from '../src/screens/FeedScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { FeedbackProvider } from '../src/context/FeedbackContext';
import { DEFAULT_PREFS, type Prefs } from '../src/utils/prefs';
import { messagingPackage } from '../src/utils/share';
import {
  deleteSavedCopiesOf,
  getStatusFiles,
  saveMany,
  saveStatusToGallery,
  syncSavedStatusIds,
} from '../src/utils/statusManager';
import { addToVault, removeFromVault, vaultHolds } from '../src/utils/vault';
import { asMock, status } from '../test-support/testUtils';
import type { StatusFile } from '../src/types';

jest.useFakeTimers();

const trees: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  for (const tree of trees.splice(0)) {
    await act(async () => {
      tree.unmount();
    });
  }
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  mockToasts.length = 0;
  mockViewerVisible.length = 0;
  jest.clearAllMocks();
});

/*
 * `clearAllMocks` forgets the calls but keeps the implementations, so a test
 * that made a write reject or a sync answer with a full album handed that to
 * every test after it — which is how a passing suite hid a real failure. Each
 * test starts from the module-level defaults again and states its own.
 */
beforeEach(() => {
  asMock(getStatusFiles).mockResolvedValue([]);
  asMock(syncSavedStatusIds).mockResolvedValue(new Set<string>());
  asMock(saveStatusToGallery).mockResolvedValue(true);
  asMock(deleteSavedCopiesOf).mockImplementation(
    async (sources: StatusFile[]) => ({
      removed: sources.map(s => s.id),
      refused: false,
      unreadable: false,
    }),
  );
  asMock(removeFromVault).mockResolvedValue(true);
  asMock(vaultHolds).mockResolvedValue(true);
  asMock(messagingPackage).mockResolvedValue('com.whatsapp');
  mockModuleToasts.length = 0;
});

const file = (name: string, ts: number): StatusFile =>
  status({ id: name, filename: name, uri: `file:///w/${name}`, timestamp: ts });

/** A promise plus the handle that settles it, so a scan can be held open. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

const render = async (over: Partial<FeedScreenProps> = {}) => {
  const props: FeedScreenProps = {
    prefs: { ...DEFAULT_PREFS, lastOpened: 1_000 },
    previousOpenedAt: 1_000,
    onPrefsChange: jest.fn(),
    reloadSignal: 0,
    hasFolder: true,
    onRequestFolder: jest.fn(),
    onLibraryChanged: jest.fn(),
    onOpenTools: jest.fn(),
    ...over,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 24, left: 0, right: 0, bottom: 0 },
        }}
      >
        <ThemeProvider>
          <LanguageProvider>
            <FeedbackProvider>
              <FeedScreen {...props} />
            </FeedbackProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  trees.push(tree);

  const rerender = async (patch: Partial<FeedScreenProps>) => {
    Object.assign(props, patch);
    await act(async () => {
      tree.update(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 24, left: 0, right: 0, bottom: 0 },
          }}
        >
          <ThemeProvider>
            <LanguageProvider>
              <FeedbackProvider>
                <FeedScreen {...props} />
              </FeedbackProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });
  };

  return { tree, props, rerender };
};

/**
 * The grid for the page on screen. All three filter tabs are mounted side by
 * side so the pager can show the neighbouring list while it is dragged, so
 * "the grid" is the one at the active index — All unless a test moved it.
 */
const grid = (
  tree: ReactTestRenderer.ReactTestRenderer,
  page = 0,
): ReactTestInstance =>
  tree.root.findAllByType('StatusGrid' as unknown as React.ComponentType)[page];

const viewer = (tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance =>
  tree.root.findByType('StatusViewer' as unknown as React.ComponentType);

const overlay = (
  tree: ReactTestRenderer.ReactTestRenderer,
): ReactTestInstance =>
  tree.root.findByType('BatchProgress' as unknown as React.ComponentType);

const header = (tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance =>
  tree.root.findByType('SelectionHeader' as unknown as React.ComponentType);

const tray = (tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance =>
  tree.root.findByType('SelectionTray' as unknown as React.ComponentType);

describe('FeedScreen scanning', () => {
  it('shows the scan the user asked for, not the one that finished last', async () => {
    const first = deferred<StatusFile[]>();
    const second = deferred<StatusFile[]>();
    asMock(getStatusFiles)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { tree, rerender } = await render();

    // A foreground return lands while the first scan is still in flight.
    await rerender({ reloadSignal: 1 });

    // The newer scan answers first, then the stale one comes back.
    await act(async () => {
      second.resolve([file('new.jpg', 5_000)]);
    });
    await act(async () => {
      first.resolve([file('stale.jpg', 2_000)]);
    });

    expect((grid(tree).props.items as StatusFile[]).map(i => i.id)).toEqual([
      'new.jpg',
    ]);
  });

  it('does not start a second scan while the refresh button is still spinning', async () => {
    const held = deferred<StatusFile[]>();
    asMock(getStatusFiles)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(held.promise);

    const { tree } = await render();
    expect(asMock(getStatusFiles)).toHaveBeenCalledTimes(1);

    await act(async () => {
      grid(tree).props.onRefresh();
    });
    await act(async () => {
      grid(tree).props.onRefresh();
    });

    expect(asMock(getStatusFiles)).toHaveBeenCalledTimes(2);
    await act(async () => {
      held.resolve([]);
    });
  });

  it('takes the refresh button back the moment its spinner stops', async () => {
    // The button's own scan hangs in native and never answers; a foreground
    // return overtakes it and stops the spinner. The button now looks idle,
    // so it has to accept the next press rather than stay latched for the
    // rest of the session.
    const stuck = deferred<StatusFile[]>();
    asMock(getStatusFiles)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(stuck.promise)
      .mockResolvedValue([]);

    const { tree, rerender } = await render();
    await act(async () => {
      grid(tree).props.onRefresh();
    });
    expect(asMock(getStatusFiles)).toHaveBeenCalledTimes(2);

    await rerender({ reloadSignal: 1 });
    expect(asMock(getStatusFiles)).toHaveBeenCalledTimes(3);
    expect(grid(tree).props.refreshing).toBe(false);

    await act(async () => {
      grid(tree).props.onRefresh();
    });
    expect(asMock(getStatusFiles)).toHaveBeenCalledTimes(4);

    await act(async () => {
      stuck.resolve([]);
    });
  });

  it('does not answer "up to date" for a Refresh whose scan failed', async () => {
    const three = [
      file('c.jpg', 3_000),
      file('b.jpg', 2_000),
      file('a.jpg', 1_000),
    ];
    asMock(getStatusFiles)
      .mockResolvedValueOnce(three)
      .mockRejectedValueOnce(new Error('SAF is gone'));

    const { tree } = await render();
    mockToasts.length = 0;
    await act(async () => {
      grid(tree).props.onRefresh();
    });

    // The listing is kept now, so a failed scan leaves the grid looking exactly
    // like one that worked. "Up to date · scanned just now" over a listing
    // nobody managed to rescan is then a plain falsehood, and there is no copy
    // for a scan that failed — so the button says nothing at all.
    expect(mockToasts.map(toast => toast.message)).toEqual([]);
  });

  it('answers "up to date" for a Refresh whose scan landed', async () => {
    asMock(getStatusFiles).mockResolvedValue([file('c.jpg', 3_000)]);
    const { tree } = await render();
    mockToasts.length = 0;
    await act(async () => {
      grid(tree).props.onRefresh();
    });

    expect(mockToasts.map(toast => toast.message)).toEqual([
      'Up to date · scanned just now',
    ]);
  });

  it('keeps the statuses on screen when a rescan fails', async () => {
    const three = [
      file('c.jpg', 3_000),
      file('b.jpg', 2_000),
      file('a.jpg', 1_000),
    ];
    asMock(getStatusFiles)
      .mockResolvedValueOnce(three)
      // The automatic foreground rescan throws. A scan that FAILED is not a
      // folder that is empty: clearing the grid told a user whose statuses are
      // all still on the phone that there are none, and the empty state's
      // "view a status in WhatsApp first" was then simply wrong.
      .mockRejectedValueOnce(new Error('SAF is gone'));

    const { tree, rerender } = await render();
    expect((grid(tree).props.items as StatusFile[]).map(i => i.id)).toEqual([
      'c.jpg',
      'b.jpg',
      'a.jpg',
    ]);

    await rerender({ reloadSignal: 1 });

    expect((grid(tree).props.items as StatusFile[]).map(i => i.id)).toEqual([
      'c.jpg',
      'b.jpg',
      'a.jpg',
    ]);
    // And it must not leave the screen looking busy either way.
    expect(grid(tree).props.refreshing).toBe(false);
  });

  it('shows the empty state when the very first scan fails', async () => {
    asMock(getStatusFiles).mockRejectedValueOnce(new Error('SAF is gone'));
    const { tree } = await render();
    expect(grid(tree).props.items).toEqual([]);
  });
});

describe('FeedScreen viewer anchoring', () => {
  const three = [
    file('c.jpg', 3_000),
    file('b.jpg', 2_000),
    file('a.jpg', 1_000),
  ];

  it('keeps the viewer on the status the user opened when the list shifts', async () => {
    asMock(getStatusFiles)
      .mockResolvedValueOnce(three)
      // WhatsApp purged the oldest and cached a newer one while the viewer
      // was open: every index in between moves.
      .mockResolvedValueOnce([
        file('d.jpg', 4_000),
        file('c.jpg', 3_000),
        file('b.jpg', 2_000),
      ]);

    const { tree, rerender } = await render();
    await act(async () => {
      grid(tree).props.onPress(three[1]);
    });
    expect(viewer(tree).props.visible).toBe(true);
    expect(viewer(tree).props.index).toBe(1);

    await rerender({ reloadSignal: 1 });

    const shown = viewer(tree).props.items as StatusFile[];
    expect(shown[viewer(tree).props.index as number].id).toBe('b.jpg');
  });

  it('leaves the viewer closed after a rescan', async () => {
    asMock(getStatusFiles)
      .mockResolvedValueOnce(three)
      .mockResolvedValueOnce(three);

    const { tree, rerender } = await render();
    await act(async () => {
      grid(tree).props.onPress(three[0]);
    });
    await act(async () => {
      viewer(tree).props.onClose();
    });
    expect(viewer(tree).props.visible).toBe(false);

    await rerender({ reloadSignal: 1 });
    expect(viewer(tree).props.visible).toBe(false);
  });

  it('never opens itself later on a tile whose file had already gone', async () => {
    const gone = file('gone.jpg', 5_000);
    asMock(getStatusFiles)
      // The tile for `gone.jpg` can still be on screen for a batching period
      // after the scan that dropped it, so the tap has to be inert — and must
      // not leave the viewer parked on a file that may come back.
      .mockResolvedValueOnce([file('c.jpg', 3_000)])
      .mockResolvedValueOnce([gone, file('c.jpg', 3_000)]);

    const { tree, rerender } = await render();
    await act(async () => {
      grid(tree).props.onPress(gone);
    });
    expect(viewer(tree).props.visible).toBe(false);

    await rerender({ reloadSignal: 1 });
    expect(viewer(tree).props.visible).toBe(false);
  });

  it('never closes and rebuilds itself when the list shrinks past the open index', async () => {
    const six = [6, 5, 4, 3, 2, 1].map(n =>
      file(`${String.fromCharCode(96 + n)}.jpg`, n * 1_000),
    );
    asMock(getStatusFiles)
      .mockResolvedValueOnce(six)
      // WhatsApp expired the three newest while the last status was open, so
      // the index the viewer is parked on is now past the end of the list.
      .mockResolvedValueOnce(six.slice(3));

    const { tree, rerender } = await render();
    await act(async () => {
      grid(tree).props.onPress(six[5]);
    });
    expect(viewer(tree).props.index).toBe(5);
    mockViewerVisible.length = 0;

    await rerender({ reloadSignal: 1 });

    // The Modal is unmounted the moment `visible` goes false, taking the video
    // position, the zoom and the open detail block with it. Re-anchoring a
    // frame later then builds a fresh one, so a single expired status used to
    // restart the status the user was watching.
    expect(mockViewerVisible).not.toContain(false);
    const shown = viewer(tree).props.items as StatusFile[];
    expect(shown[viewer(tree).props.index as number].id).toBe('a.jpg');
  });
});

describe('FeedScreen selection', () => {
  const three = [
    file('c.jpg', 3_000),
    file('b.jpg', 2_000),
    file('a.jpg', 1_000),
  ];

  it('keeps the selection when a tile is long-pressed inside selection mode', async () => {
    asMock(getStatusFiles).mockResolvedValue(three);
    const { tree } = await render();

    await act(async () => {
      grid(tree).props.onLongPress(three[0]);
    });
    await act(async () => {
      grid(tree).props.onPress(three[1]);
    });
    expect(header(tree).props.count).toBe(2);

    // The prototype's hold timer checks `!selecting` before it fires
    // (logic.js:233): a second hold once the mode is open is a non-event, not
    // a reset of everything the user has chosen so far.
    await act(async () => {
      grid(tree).props.onLongPress(three[2]);
    });
    expect(header(tree).props.count).toBe(2);
    expect(tray(tree).props.count).toBe(2);
  });
});

describe('FeedScreen auto-save', () => {
  const autoPrefs: Prefs = {
    ...DEFAULT_PREFS,
    autoSave: true,
    lastOpened: 1_000,
  };

  it('keeps the statuses a rescan finds while an earlier run is still writing', async () => {
    const held = deferred<StatusFile[]>();
    asMock(saveMany).mockReturnValueOnce(held.promise);
    asMock(saveMany).mockResolvedValue([]);

    const one = file('one.jpg', 9_000);
    const two = file('two.jpg', 9_500);
    asMock(getStatusFiles)
      .mockResolvedValueOnce([one])
      .mockResolvedValueOnce([one, two]);

    const { rerender } = await render({
      prefs: autoPrefs,
      previousOpenedAt: 1_000,
    });
    expect(asMock(saveMany)).toHaveBeenCalledTimes(1);

    // Second scan lands while the first batch is still being written.
    await rerender({ reloadSignal: 1 });
    await act(async () => {
      held.resolve([one]);
    });

    const written = asMock(saveMany).mock.calls.flatMap(
      (call: [StatusFile[]]) => call[0].map(f => f.id),
    );
    expect(written).toContain('two.jpg');
  });

  it('never hands the same status to two writes', async () => {
    asMock(saveMany).mockImplementation(async (files: StatusFile[]) => files);
    const one = file('one.jpg', 9_000);
    asMock(getStatusFiles).mockResolvedValue([one]);

    const { rerender } = await render({ prefs: autoPrefs });
    await rerender({ reloadSignal: 1 });
    await rerender({ reloadSignal: 2 });

    const written = asMock(saveMany).mock.calls.flatMap(
      (call: [StatusFile[]]) => call[0].map(f => f.id),
    );
    expect(written.filter(id => id === 'one.jpg')).toHaveLength(1);
  });

  it('still says what it kept when the marker sync fails afterwards', async () => {
    const one = file('one.jpg', 9_000);
    asMock(getStatusFiles).mockResolvedValue([one]);
    asMock(saveMany).mockResolvedValue([one]);
    // The scan's own read succeeds; the reconcile that follows the write does
    // not. The files are on disk either way, so the only thing at stake is
    // whether the user is ever told — and whether the Library hears about it.
    asMock(syncSavedStatusIds)
      .mockResolvedValueOnce(new Set<string>())
      .mockRejectedValueOnce(new Error('MediaStore is gone'))
      .mockResolvedValue(new Set<string>());

    const { props } = await render({ prefs: autoPrefs });

    expect(mockToasts.map(toast => toast.message)).toContain(
      '1 new status saved automatically',
    );
    expect(asMock(props.onLibraryChanged)).toHaveBeenCalled();
  });

  it('still says what it kept after the user has walked off the Feed', async () => {
    const one = file('one.jpg', 9_000);
    asMock(getStatusFiles).mockResolvedValue([one]);
    const held = deferred<StatusFile[]>();
    asMock(saveMany).mockReturnValueOnce(held.promise);

    const { tree } = await render({ prefs: autoPrefs });
    // Opening the app and going straight to the Library is the likeliest
    // moment of all: auto-save starts with the app's first scan, and this
    // toast is the only proof the switch did anything.
    await act(async () => {
      tree.unmount();
    });
    trees.splice(trees.indexOf(tree), 1);

    await act(async () => {
      held.resolve([one]);
    });

    expect(mockToasts.map(toast => toast.message)).toContain(
      '1 new status saved automatically',
    );
  });
});

describe('FeedScreen batch save', () => {
  it('takes the progress overlay down when the write throws', async () => {
    const files = [
      file('a.jpg', 3_000),
      file('b.jpg', 2_000),
      file('c.jpg', 1_000),
      file('d.jpg', 900),
    ];
    asMock(getStatusFiles).mockResolvedValue(files);
    asMock(saveMany).mockRejectedValue(new Error('MediaStore is gone'));

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(files[0]);
    });
    await act(async () => {
      tree.root
        .findByType('SelectionHeader' as unknown as React.ComponentType)
        .props.onToggleAll();
    });
    await act(async () => {
      tree.root
        .findByType('SelectionTray' as unknown as React.ComponentType)
        .props.onPrimary();
    });

    expect(overlay(tree).props.visible).toBe(false);
  });

  it('still reports the save after the user has walked off the Feed', async () => {
    const files = [
      file('a.jpg', 3_000),
      file('b.jpg', 2_000),
      file('c.jpg', 1_000),
      file('d.jpg', 900),
    ];
    asMock(getStatusFiles).mockResolvedValue(files);
    const held = deferred<StatusFile[]>();
    asMock(saveMany).mockReturnValueOnce(held.promise);

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(files[0]);
    });
    await act(async () => {
      header(tree).props.onToggleAll();
    });
    await act(async () => {
      tray(tree).props.onPrimary();
    });

    // Switching to the Library while four files are still being written is
    // exactly when the confirmation — and the Undo it carries — matters, and
    // the toast host that shows it belongs to the shell, not to this screen.
    await act(async () => {
      tree.unmount();
    });
    trees.splice(trees.indexOf(tree), 1);

    await act(async () => {
      held.resolve(files);
    });

    const last = mockToasts[mockToasts.length - 1];
    expect(last.message).toBe('4 statuses saved');
    expect(last.action?.label).toBe('Undo');
  });

  it('ticks the tiles it saved without waiting for the gallery sweep', async () => {
    const files = [
      file('a.jpg', 3_000),
      file('b.jpg', 2_000),
      file('c.jpg', 1_000),
      file('d.jpg', 900),
    ];
    asMock(getStatusFiles).mockResolvedValue(files);
    asMock(saveMany).mockResolvedValue(files);
    // The reconcile that follows the write is held open: on a large album that
    // MediaStore sweep is slow, and the toast used to say "4 statuses saved"
    // over four tiles that still showed no tick at all.
    const sweep = deferred<Set<string>>();
    asMock(syncSavedStatusIds)
      .mockResolvedValueOnce(new Set<string>())
      .mockReturnValueOnce(sweep.promise)
      .mockResolvedValue(new Set(files.map(f => f.id)));

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(files[0]);
    });
    await act(async () => {
      header(tree).props.onToggleAll();
    });
    await act(async () => {
      tray(tree).props.onPrimary();
    });

    const isSaved = grid(tree).props.isSaved as (id: string) => boolean;
    expect(files.map(f => isSaved(f.id))).toEqual([true, true, true, true]);

    await act(async () => {
      sweep.resolve(new Set(files.map(f => f.id)));
    });
  });
});

describe('FeedScreen quick save', () => {
  it('answers the viewer instead of rejecting when the write throws', async () => {
    const one = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([one]);
    asMock(saveStatusToGallery).mockRejectedValue(
      new Error('MediaStore is gone'),
    );

    const { tree } = await render();
    // The viewer's Save and its double-tap both go through here. A rejection
    // left the tap with no toast and the button still reading "Save", which is
    // the one thing the user is watching, and handed the caller a rejected
    // promise for a failure it cannot report.
    await act(async () => {
      await expect(viewer(tree).props.onSave(one)).resolves.toBe(false);
    });
  });

  it('lets the same status be saved again after a failed attempt', async () => {
    const one = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([one]);
    asMock(saveStatusToGallery)
      .mockRejectedValueOnce(new Error('MediaStore is gone'))
      .mockResolvedValue(true);

    const { tree } = await render();
    await act(async () => {
      await viewer(tree)
        .props.onSave(one)
        .catch(() => undefined);
    });
    // The in-flight claim has to be released by a throw as well, or the status
    // is stuck at "not saved" with a Save button that ignores every press.
    await act(async () => {
      await expect(viewer(tree).props.onSave(one)).resolves.toBe(true);
    });
    expect(asMock(saveStatusToGallery)).toHaveBeenCalledTimes(2);
  });
});

describe('FeedScreen favourites', () => {
  it('does not leave a rejected favourite write unhandled', async () => {
    const one = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([one]);
    asMock(saveStatusToGallery).mockRejectedValue(
      new Error('MediaStore is gone'),
    );

    const seen: unknown[] = [];
    const onUnhandled = (reason: unknown) => seen.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const { tree } = await render();
      // Starring a status keeps the file too, and nothing awaits that write:
      // a writer that reports a failure by rejecting had nobody to hand it to.
      await act(async () => {
        viewer(tree).props.onToggleFavourite(one);
      });
      // Node only reports an unhandled rejection once the microtask queue has
      // drained, which takes a real macrotask turn.
      jest.useRealTimers();
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally {
      jest.useFakeTimers();
      process.off('unhandledRejection', onUnhandled);
    }

    expect(seen).toEqual([]);
  });
});

describe('FeedScreen move to Vault', () => {
  it('takes the public gallery copy back out when a saved status is vaulted', async () => {
    const saved = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([saved]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set(['a.jpg']));
    asMock(addToVault).mockResolvedValue({
      ...saved,
      id: 'a.jpg',
      inVault: true,
    });

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(saved);
    });
    await act(async () => {
      tree.root
        .findByType('SelectionTray' as unknown as React.ComponentType)
        .props.onVault();
    });

    expect(asMock(deleteSavedCopiesOf)).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'a.jpg' }),
    ]);
  });

  it('asks the album about a status the snapshot called unsaved', async () => {
    /*
     * The gallery is read fresh inside deleteSavedCopiesOf, so a copy that
     * auto-save published while the Vault write was still running is found
     * and taken back. Filtering by the pre-tap snapshot instead left that
     * copy in the gallery under a toast that said "private".
     */
    const fresh = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([fresh]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set());
    asMock(addToVault).mockResolvedValue({ ...fresh, inVault: true });
    asMock(deleteSavedCopiesOf).mockResolvedValue({
      removed: ['a.jpg'],
      refused: false,
      unreadable: false,
    });

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(fresh);
    });
    mockToasts.length = 0;
    await act(async () => {
      tree.root
        .findByType('SelectionTray' as unknown as React.ComponentType)
        .props.onVault();
    });
    await act(async () => {});

    expect(asMock(deleteSavedCopiesOf)).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'a.jpg' }),
    ]);
    expect(mockToasts[mockToasts.length - 1].message).toBe(
      '1 status moved to Vault',
    );
  });

  it('does not promise privacy over an album it could not read', async () => {
    // Not knowing is not the same as knowing it is gone.
    const saved = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([saved]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set(['a.jpg']));
    asMock(addToVault).mockResolvedValue({ ...saved, inVault: true });
    asMock(deleteSavedCopiesOf).mockResolvedValue({
      removed: [],
      refused: false,
      unreadable: true,
    });

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(saved);
    });
    mockToasts.length = 0;
    await act(async () => {
      tree.root
        .findByType('SelectionTray' as unknown as React.ComponentType)
        .props.onVault();
    });
    await act(async () => {});

    expect(mockToasts[mockToasts.length - 1].message).not.toBe(
      '1 status moved to Vault',
    );
  });

  it('survives a vault write that throws', async () => {
    const one = file('a.jpg', 3_000);
    asMock(getStatusFiles).mockResolvedValue([one]);
    asMock(addToVault).mockRejectedValue(new Error('no space'));

    const { tree } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(one);
    });
    await expect(
      act(async () => {
        tree.root
          .findByType('SelectionTray' as unknown as React.ComponentType)
          .props.onVault();
      }),
    ).resolves.toBeUndefined();
  });
});

describe('FeedScreen undo', () => {
  const saved = file('a.jpg', 3_000);

  const vaultOne = async () => {
    asMock(getStatusFiles).mockResolvedValue([saved]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set(['a.jpg']));
    asMock(addToVault).mockResolvedValue({
      ...saved,
      uri: 'file:///vault/a.jpg',
      inVault: true,
    });
    const { tree, props } = await render();
    await act(async () => {
      grid(tree).props.onLongPress(saved);
    });
    await act(async () => {
      tree.root
        .findByType('SelectionTray' as unknown as React.ComponentType)
        .props.onVault();
    });
    const undo = mockToasts[mockToasts.length - 1].action;
    return { tree, props, undo };
  };

  it('puts the album copy back before it drops the vault copy', async () => {
    const { undo } = await vaultOne();
    await act(async () => {
      undo?.onPress();
    });

    expect(asMock(saveStatusToGallery)).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///vault/a.jpg' }),
    );
    expect(asMock(removeFromVault)).toHaveBeenCalled();
    expect(
      asMock(saveStatusToGallery).mock.invocationCallOrder[0],
    ).toBeLessThan(asMock(removeFromVault).mock.invocationCallOrder[0]);
  });

  it('keeps the vault copy when the album copy cannot be put back', async () => {
    asMock(saveStatusToGallery).mockResolvedValue(false);
    const { undo } = await vaultOne();
    await act(async () => {
      undo?.onPress();
    });

    expect(asMock(removeFromVault)).not.toHaveBeenCalled();
  });

  it('still refreshes the Library when undo is pressed after leaving the Feed', async () => {
    const { tree, props, undo } = await vaultOne();
    await act(async () => {
      tree.unmount();
    });
    trees.splice(trees.indexOf(tree), 1);
    asMock(props.onLibraryChanged).mockClear();

    await act(async () => {
      undo?.onPress();
    });

    expect(asMock(props.onLibraryChanged)).toHaveBeenCalled();
  });
});

describe('filterAfterSwipe', () => {
  it('steps through the tabs in the order the header draws them', () => {
    expect(filterAfterSwipe('all', 1)).toBe('photos');
    expect(filterAfterSwipe('photos', 1)).toBe('videos');
    expect(filterAfterSwipe('videos', -1)).toBe('photos');
    expect(filterAfterSwipe('photos', -1)).toBe('all');
  });

  it('clamps at the ends rather than wrapping', () => {
    // Wrapping from Videos back to All reads as the list jumping.
    expect(filterAfterSwipe('videos', 1)).toBe('videos');
    expect(filterAfterSwipe('all', -1)).toBe('all');
  });
});

describe('pager', () => {
  it('reads the resting offset as the page it belongs to', () => {
    // The platform scrolls and snaps; all this has to do is name the page a
    // settled offset lands on, including the half-way rounding either side.
    expect(pageAtOffset(0, 400)).toBe(0);
    expect(pageAtOffset(400, 400)).toBe(1);
    expect(pageAtOffset(830, 400)).toBe(2);
    expect(pageAtOffset(199, 400)).toBe(0);
    expect(pageAtOffset(201, 400)).toBe(1);
  });

  it('answers 0 before the width is known, rather than dividing by zero', () => {
    expect(pageAtOffset(0, 0)).toBe(0);
  });
});

describe('what a rescan costs the three mounted lists', () => {
  /*
   * The grid hands `onPress`/`onLongPress` straight to every tile it draws,
   * and Tile compares those props by identity to decide whether to re-render
   * (Tile.tsx). Keying them on the filtered list — which gets a fresh array
   * from every scan — is what used to re-render every tile on screen for a
   * listing whose contents had not moved; the screen reads the list through
   * `visibleRef` instead, and `refresh` guards on a ref rather than on the
   * `refreshing` state for the same reason. Both are invisible in the output,
   * so nothing but this test keeps them that way.
   */
  it('hands the grid the same handlers a scan later', async () => {
    asMock(getStatusFiles).mockImplementation(async () => [
      file('a.jpg', 9_000),
      file('b.jpg', 8_000),
    ]);

    const { tree, rerender } = await render();
    const handlers = () => {
      const props = grid(tree).props;
      return {
        onPress: props.onPress,
        onLongPress: props.onLongPress,
        onRefresh: props.onRefresh,
      };
    };
    const first = handlers();
    expect(grid(tree).props.items).toHaveLength(2);

    // A foreground return: the same two files, listed as fresh objects.
    await rerender({ reloadSignal: 1 });
    await act(async () => {});

    const second = handlers();
    expect(second.onPress).toBe(first.onPress);
    expect(second.onLongPress).toBe(first.onLongPress);
    expect(second.onRefresh).toBe(first.onRefresh);

    // And the handler is not stale: it opens the file the new listing holds.
    await act(async () => {
      first.onPress(file('b.jpg', 8_000));
    });
    expect(viewer(tree).props.index).toBe(1);
    expect(viewer(tree).props.visible).toBe(true);
  });

  it('keeps them while `refreshing` is up and after it drops', async () => {
    asMock(getStatusFiles).mockResolvedValueOnce([file('a.jpg', 9_000)]);
    const { tree } = await render();
    const before = grid(tree).props.onRefresh;

    // Held open, so the grid really does render with `refreshing` true rather
    // than the whole scan collapsing into one commit.
    const scan = deferred<StatusFile[]>();
    asMock(getStatusFiles).mockReturnValueOnce(scan.promise);
    await act(async () => {
      grid(tree).props.onRefresh();
    });
    expect(grid(tree).props.refreshing).toBe(true);
    expect(grid(tree).props.onRefresh).toBe(before);

    await act(async () => {
      scan.resolve([file('a.jpg', 9_000)]);
    });
    await act(async () => {});
    expect(grid(tree).props.refreshing).toBe(false);
    expect(grid(tree).props.onRefresh).toBe(before);
  });
});

/*
 * The viewer's trash button on the Feed.
 *
 * "Delete" here can only ever mean the copy this app wrote to the gallery: the
 * status itself is WhatsApp's own cached file, held read-only, and it stays in
 * the Feed afterwards — simply no longer ticked as saved.
 *
 * The toasts are not asserted here. They go through `emitToast`, the
 * module-level dispatcher, precisely so they land on the viewer's own provider
 * rather than the one behind it — and this file's mock only stands in for
 * `useFeedback`, so a toast sent that way is invisible to it by design.
 */
describe('FeedScreen delete from the viewer', () => {
  const saved = file('a.jpg', 3_000);

  const openOnSaved = async () => {
    asMock(getStatusFiles).mockResolvedValue([saved]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set(['a.jpg']));
    const { tree } = await render();
    expect(grid(tree).props.items[0].isSaved).toBe(true);
    return tree;
  };

  it('removes the gallery copy, and leaves the status in the Feed', async () => {
    const tree = await openOnSaved();
    // The gallery no longer holds a copy of it once the delete lands.
    asMock(syncSavedStatusIds).mockResolvedValue(new Set<string>());

    await act(async () => {
      viewer(tree).props.onDelete(saved);
    });
    await act(async () => {});
    await act(async () => {});

    expect(asMock(deleteSavedCopiesOf)).toHaveBeenCalledWith([saved]);
    // The original is not this app's to delete: it stays, unticked.
    expect(grid(tree).props.items.map((f: StatusFile) => f.id)).toEqual([
      'a.jpg',
    ]);
    expect(grid(tree).props.items[0].isSaved).toBe(false);
  });

  /*
   * Android 11+ puts its own dialogue in front of the delete and the user can
   * refuse it. The copy then stays, and so does the tick.
   */
  it('leaves the tick on when the delete is refused', async () => {
    asMock(deleteSavedCopiesOf).mockResolvedValue({
      removed: [],
      refused: true,
      unreadable: false,
    });
    const tree = await openOnSaved();

    await act(async () => {
      viewer(tree).props.onDelete(saved);
    });
    await act(async () => {});
    await act(async () => {});

    expect(asMock(deleteSavedCopiesOf)).toHaveBeenCalledWith([saved]);
    expect(grid(tree).props.items[0].isSaved).toBe(true);
  });
});

/*
 * A status kept only in the Vault is ticked "saved" but has no gallery copy.
 * Both places that used to treat "saved" as "has a public copy" now ask what
 * deleteSavedCopiesOf actually found.
 */
describe('deleting a status the app can no longer find a copy of', () => {
  it('says the delete failed instead of reporting a removal', async () => {
    /*
     * Android 13+, media access never granted, and the user deleted the album
     * from Files. The scan keeps the saved markers (an unreadable album is not
     * proof the copies are gone), so the tile still shows its tick. Delete
     * then removes nothing anywhere, and the toast used to say "Removed from
     * library" over a file that is still exactly where it was.
     */
    const orphan = file('a.jpg', 5_000);
    asMock(getStatusFiles).mockResolvedValue([orphan]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set(['a.jpg']));
    asMock(deleteSavedCopiesOf).mockResolvedValue({
      removed: [],
      refused: false,
      unreadable: true,
    });
    asMock(vaultHolds).mockResolvedValue(false);

    const { tree } = await render();
    mockToasts.length = 0;
    await act(async () => {
      viewer(tree).props.onDelete(orphan);
    });
    await act(async () => {});
    await act(async () => {});

    expect(removeFromVault).not.toHaveBeenCalled();
    expect(mockModuleToasts[mockModuleToasts.length - 1].message).toBe(
      'Could not remove that file',
    );
  });
});

describe('a status whose only copy is in the Vault', () => {
  const saved = file('a.jpg', 3_000);

  const openTicked = async () => {
    asMock(getStatusFiles).mockResolvedValue([saved]);
    asMock(syncSavedStatusIds).mockResolvedValue(new Set(['a.jpg']));
    asMock(deleteSavedCopiesOf).mockResolvedValue({
      removed: [],
      refused: false,
      unreadable: false,
    });
    return render();
  };

  it('is deleted from the viewer by removing the vault copy', async () => {
    asMock(removeFromVault).mockResolvedValue(true);
    const { tree } = await openTicked();

    await act(async () => {
      viewer(tree).props.onDelete(saved);
    });
    await act(async () => {});
    await act(async () => {});

    expect(asMock(removeFromVault)).toHaveBeenCalledWith('a.jpg');
  });

  it('is reported as private when vaulted again, and its undo publishes nothing', async () => {
    asMock(addToVault).mockResolvedValue({
      ...saved,
      uri: 'file:///vault/a.jpg',
      inVault: true,
    });
    const { tree } = await openTicked();
    mockToasts.length = 0;
    await act(async () => {
      grid(tree).props.onLongPress(saved);
    });
    await act(async () => {
      tree.root
        .findByType('SelectionTray' as unknown as React.ComponentType)
        .props.onVault();
    });
    await act(async () => {});

    const toast = mockToasts[mockToasts.length - 1];
    // There never was a gallery copy, so "still public" would be a lie.
    expect(toast.message).toBe('1 status moved to Vault');

    await act(async () => {
      toast.action?.onPress();
    });
    await act(async () => {});
    // Undo takes the file back out of the Vault without ever copying the
    // private file into the public gallery.
    expect(asMock(saveStatusToGallery)).not.toHaveBeenCalled();
    expect(asMock(removeFromVault)).toHaveBeenCalledWith('a.jpg');
  });
});

describe("the empty Feed's Open WhatsApp button", () => {
  // The grid is a stub here, so the empty state is read off its `empty` prop
  // rather than found in the rendered tree.
  const emptyCta = (
    tree: ReactTestRenderer.ReactTestRenderer,
  ): { label: string; onPress: () => void } => grid(tree).props.empty.props.cta;

  beforeEach(() => {
    asMock(getStatusFiles).mockResolvedValue([]);
    asMock(NativeModules.FolderPicker.openApp).mockResolvedValue(true);
  });

  it('launches WhatsApp itself rather than the send deep link', async () => {
    const { tree } = await render({ hasFolder: true });
    expect(emptyCta(tree).label).toBe('Open messaging app');
    mockToasts.length = 0;

    await act(async () => {
      emptyCta(tree).onPress();
    });

    // The bare `whatsapp://send` link resolves to a contact picker that
    // finishes itself at once, so the launcher intent is the only thing that
    // actually shows WhatsApp.
    expect(NativeModules.FolderPicker.openApp).toHaveBeenCalledWith(
      'com.whatsapp',
    );
    expect(mockToasts[mockToasts.length - 1].message).toBe(
      'Opening your messaging app',
    );
  });

  it('opens the business build when that is the one installed', async () => {
    // Its statuses reach the Feed through the same grant, so telling this
    // user the messaging app is missing would be a lie over their own content.
    asMock(messagingPackage).mockResolvedValue('com.whatsapp.w4b');
    const { tree } = await render({ hasFolder: true });

    await act(async () => {
      emptyCta(tree).onPress();
    });

    expect(NativeModules.FolderPicker.openApp).toHaveBeenCalledWith(
      'com.whatsapp.w4b',
    );
  });

  it('says so when neither build is installed', async () => {
    asMock(messagingPackage).mockResolvedValue(null);
    asMock(NativeModules.FolderPicker.openApp).mockResolvedValue(false);
    const { tree } = await render({ hasFolder: true });
    mockToasts.length = 0;

    await act(async () => {
      emptyCta(tree).onPress();
    });

    expect(mockToasts[mockToasts.length - 1].message).toBe(
      'The messaging app is not installed',
    );
  });

  it('is not offered before the folder is granted', async () => {
    const { tree } = await render({ hasFolder: false });
    expect(emptyCta(tree).label).not.toBe('Open messaging app');
  });
});
