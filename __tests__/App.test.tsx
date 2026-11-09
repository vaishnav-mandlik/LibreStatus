/**
 * @format
 *
 * The shell: what the bottom nav says, where a tap on it goes, what hardware
 * back does, and what is left on screen when a render throws.
 *
 * The screens are stubbed as host components. They own their own animation
 * loops and data fetches, and rendering them here made this file fail for
 * reasons that had nothing to do with the tab bar. Stubbing them as strings
 * also makes their props readable, which is how the overlay and selection
 * routes are driven below.
 */

import React from 'react';
import { BackHandler, NativeModules, PermissionsAndroid, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../src/screens/FeedScreen', () => ({
  __esModule: true,
  default: 'FeedScreen',
}));
jest.mock('../src/screens/LibraryScreen', () => ({
  __esModule: true,
  default: 'LibraryScreen',
}));
jest.mock('../src/screens/ToolsScreen', () => ({
  __esModule: true,
  default: 'ToolsScreen',
}));
jest.mock('../src/screens/SettingsScreen', () => ({
  __esModule: true,
  default: 'SettingsScreen',
}));
jest.mock('../src/screens/HelpScreen', () => ({
  __esModule: true,
  default: 'HelpScreen',
}));
jest.mock('../src/screens/AboutScreen', () => ({
  __esModule: true,
  default: 'AboutScreen',
}));
jest.mock('../src/screens/OnboardingScreen', () => ({
  __esModule: true,
  default: 'OnboardingScreen',
}));
jest.mock('../src/screens/IntroScreen', () => ({
  __esModule: true,
  default: 'IntroScreen',
}));

import App, { ErrorBoundary } from '../App';
import {
  clearFolderAccess,
  requestFolderAccess,
} from '../src/utils/folderPicker';
import { asMock, setPlatform } from '../test-support/testUtils';
import { resetMediaAccessCache } from '../src/utils/permissions';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { en } from '../src/i18n/en';

/** The app's native module, stubbed in jest.setup. */
const native = NativeModules.FolderPicker;

/** Every string the tree paints, in render order. */
const texts = (root: ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map(node => {
      const parts: string[] = [];
      const walk = (child: unknown): void => {
        if (typeof child === 'string' || typeof child === 'number') {
          parts.push(String(child));
        } else if (Array.isArray(child)) {
          child.forEach(walk);
        }
      };
      walk(node.props.children);
      return parts.join('');
    })
    .filter(Boolean);

/** The tab bar's pressables, addressed the way a screen reader does. */
const tab = (root: ReactTestInstance, label: string): ReactTestInstance =>
  root.find(
    node =>
      node.props.accessibilityRole === 'tab' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );

/** A stubbed screen's props, which is how its callbacks are invoked here. */
const screen = (root: ReactTestInstance, name: string): ReactTestInstance =>
  root.findByType(name as never);

/**
 * Every tab in the bottom nav, or none at all when the tray has replaced it.
 * Keyed on `onPress` for the same reason `tab` above is: a Pressable hands its
 * accessibility props down to the views it renders, so the role alone matches
 * each tab several times over.
 */
const tabs = (root: ReactTestInstance): ReactTestInstance[] =>
  root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );

/**
 * Every tree this file mounts, torn down after the test that made it.
 *
 * A FeedbackProvider registers itself in a module-level list of toast hosts and
 * only leaves it on unmount, so a tree left standing keeps answering for the
 * next test's toasts — which land in a window that is no longer on screen.
 */
const trees: Renderer[] = [];

const mount = async (): Promise<Renderer> => {
  let tree!: Renderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  // Boot waits on four parallel reads (theme, language, prefs, folder grant);
  // one more flush lets the last of them land before anything is asserted.
  await ReactTestRenderer.act(async () => {});
  trees.push(tree);
  return tree;
};

/**
 * The shell's hardware-back listeners, captured as they register. Jest resolves
 * BackHandler.ios, whose addEventListener is a no-op, so there is nothing to
 * emit through — the handler has to be taken as it is handed over.
 */
const backListeners: Array<() => boolean | null | undefined> = [];

/** Presses Android back the way the platform does: newest listener first. */
const back = async (): Promise<boolean> => {
  let handled = false;
  await ReactTestRenderer.act(async () => {
    for (let i = backListeners.length - 1; i >= 0; i -= 1) {
      if (backListeners[i]()) {
        handled = true;
        break;
      }
    }
  });
  return handled;
};

/**
 * Seeds stored prefs with the first-run intro already behind them.
 *
 * Every test below is about the app after setup, and the intro replaces the
 * whole shell while it is up — so a test that seeded prefs of its own used to
 * put the intro back and find no tab bar at all. Its own gate is covered by
 * the `first-run intro` block at the end of this file, which seeds nothing.
 */
const seedPrefs = async (patch: Record<string, unknown> = {}): Promise<void> => {
  await AsyncStorage.setItem(
    '@statussaverpro/prefs/v1',
    JSON.stringify({ introSeen: true, ...patch }),
  );
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await seedPrefs();
  backListeners.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      backListeners.push(handler);
      return {
        remove: () => {
          const at = backListeners.indexOf(handler);
          if (at >= 0) {
            backListeners.splice(at, 1);
          }
        },
      };
    });
});

afterEach(() => {
  for (const tree of trees.splice(0)) {
    ReactTestRenderer.act(() => {
      tree.unmount();
    });
  }
  jest.restoreAllMocks();
});

test('the nav names the three tabs and starts on the Feed', async () => {
  const tree = await mount();
  const root = tree.root;

  expect(texts(root)).toEqual(['Feed', 'Saved', 'Tools']);
  expect(root.findAllByType('FeedScreen' as never)).toHaveLength(1);
  expect(tab(root, 'Feed').props.accessibilityState).toEqual({
    selected: true,
  });
});

test('the Library tab carries no saved count', async () => {
  const tree = await mount();

  for (const label of texts(tree.root)) {
    expect(label).not.toMatch(/\d/);
  }
});

test('tapping a tab swaps the screen and moves the selection', async () => {
  const tree = await mount();
  const root = tree.root;

  await ReactTestRenderer.act(async () => {
    tab(root, 'Saved').props.onPress();
  });

  expect(root.findAllByType('LibraryScreen' as never)).toHaveLength(1);
  expect(root.findAllByType('FeedScreen' as never)).toHaveLength(0);
  expect(tab(root, 'Saved').props.accessibilityState).toEqual({
    selected: true,
  });

  await ReactTestRenderer.act(async () => {
    tab(root, 'Tools').props.onPress();
  });

  expect(root.findAllByType('ToolsScreen' as never)).toHaveLength(1);
});

/*
 * The app used to resume the tab the last session ended on. It no longer does:
 * the Feed is the time-critical screen — the statuses still there to be kept —
 * and reopening on Library or Tools put the least urgent one in front of
 * someone who had opened the app precisely because something was expiring.
 */
test('a relaunch opens on the Feed, wherever the last one ended', async () => {
  const first = await mount();
  await ReactTestRenderer.act(async () => {
    tab(first.root, 'Saved').props.onPress();
  });
  expect(first.root.findAllByType('LibraryScreen' as never)).toHaveLength(1);
  await ReactTestRenderer.act(async () => {
    first.unmount();
  });

  const second = await mount();
  expect(second.root.findAllByType('FeedScreen' as never)).toHaveLength(1);
  expect(second.root.findAllByType('LibraryScreen' as never)).toHaveLength(0);
  expect(tab(second.root, 'Feed').props.accessibilityState).toEqual({
    selected: true,
  });
});

describe('hardware back', () => {
  it('cancels a selection before it touches navigation', async () => {
    const tree = await mount();
    const root = tree.root;

    await ReactTestRenderer.act(async () => {
      tab(root, 'Saved').props.onPress();
    });
    const before = screen(root, 'LibraryScreen').props.clearSelectionSignal;
    await ReactTestRenderer.act(async () => {
      screen(root, 'LibraryScreen').props.onSelectingChange(true);
    });

    await expect(back()).resolves.toBe(true);

    // The selection is cancelled and the tab is untouched: one press does one
    // thing.
    expect(screen(root, 'LibraryScreen').props.clearSelectionSignal).toBe(
      before + 1,
    );
    expect(root.findAllByType('LibraryScreen' as never)).toHaveLength(1);
  });

  it('closes an overlay, then walks back to the Feed, then gives up', async () => {
    const tree = await mount();
    const root = tree.root;

    await ReactTestRenderer.act(async () => {
      tab(root, 'Saved').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      screen(root, 'LibraryScreen').props.onOpenSettings();
    });
    expect(root.findAllByType('SettingsScreen' as never)).toHaveLength(1);

    // 1. the overlay closes onto the tab underneath, which is still Library.
    await expect(back()).resolves.toBe(true);
    expect(root.findAllByType('SettingsScreen' as never)).toHaveLength(0);
    expect(root.findAllByType('LibraryScreen' as never)).toHaveLength(1);

    // 2. that tab walks back to the Feed.
    await expect(back()).resolves.toBe(true);
    expect(root.findAllByType('FeedScreen' as never)).toHaveLength(1);

    // 3. on the Feed there is nowhere left to go, so Android leaves the app.
    await expect(back()).resolves.toBe(false);
  });

  it('reaches Settings from Help before it closes the overlay', async () => {
    const tree = await mount();
    const root = tree.root;

    await ReactTestRenderer.act(async () => {
      screen(root, 'FeedScreen').props.onOpenSettings();
    });
    await ReactTestRenderer.act(async () => {
      screen(root, 'SettingsScreen').props.onOpenHelp();
    });
    expect(root.findAllByType('HelpScreen' as never)).toHaveLength(1);

    await expect(back()).resolves.toBe(true);
    expect(root.findAllByType('HelpScreen' as never)).toHaveLength(0);
    expect(root.findAllByType('SettingsScreen' as never)).toHaveLength(1);

    await expect(back()).resolves.toBe(true);
    expect(root.findAllByType('SettingsScreen' as never)).toHaveLength(0);
  });
});

describe('the error boundary', () => {
  /** Throws on its first mount only, so a retry can be seen to recover. */
  let explode = true;
  const Flaky: React.FC = () => {
    if (explode) {
      throw new Error('render blew up');
    }
    return <Text>{'recovered'}</Text>;
  };

  const mountBoundary = async (): Promise<Renderer> => {
    let tree!: Renderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ErrorBoundary>
                <Flaky />
              </ErrorBoundary>
            </LanguageProvider>
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });
    await ReactTestRenderer.act(async () => {});
    return tree;
  };

  beforeEach(() => {
    explode = true;
    // React re-throws into console.error on its way to the boundary; that is
    // the log the release build relies on, not a test failure.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows the recoverable screen instead of a blank window', async () => {
    const tree = await mountBoundary();
    const painted = texts(tree.root);

    expect(painted).toContain(en['error.title']);
    expect(painted).toContain(en['error.body']);
    expect(painted).toContain(en['common.retry']);
  });

  it('re-mounts the tree when the retry is tapped', async () => {
    const tree = await mountBoundary();
    const retry = tree.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === en['common.retry'],
    );

    explode = false;
    await ReactTestRenderer.act(async () => {
      retry.props.onPress();
    });

    expect(texts(tree.root)).toEqual(['recovered']);
  });
});

describe('a SAF grant that disappears while the app runs', () => {
  const SAF_KEY = 'whatsapp_status_folder_uri_whatsapp';

  beforeEach(() => {
    // The picker route only exists from Android 11; Jest resolves iOS by
    // default, where the shell takes the legacy path and never asks.
    setPlatform('android', 33);
  });

  afterEach(() => {
    setPlatform('ios', 17);
  });

  it('routes back to the picker, and re-granting recovers without a restart', async () => {
    await AsyncStorage.setItem(SAF_KEY, 'content://tree/media');
    const tree = await mount();
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(1);

    /*
     * Android revokes the grant. The app finds out when a listing fails, which
     * is where the stored URI is dropped — and that is what wakes the shell.
     * Before the signal existed this left an empty grid that looked exactly
     * like a quiet day, with no route back to the picker until the process was
     * killed.
     */
    await ReactTestRenderer.act(async () => {
      await clearFolderAccess('whatsapp');
    });
    expect(tree.root.findAllByType('OnboardingScreen' as never)).toHaveLength(1);
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(0);

    // Re-granting from the picker puts the Feed back in place.
    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);
    await ReactTestRenderer.act(async () => {
      await requestFolderAccess('whatsapp');
    });
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(1);
  });
});

describe('a grant that arrives from somewhere other than onboarding', () => {
  const SAF_KEY = 'whatsapp_status_folder_uri_whatsapp';

  beforeEach(() => {
    setPlatform('android', 33);
  });

  afterEach(() => {
    setPlatform('ios', 17);
  });

  it('starts a scan, rather than leaving the Feed on its empty state', async () => {
    /*
     * Settings' "Status folder" row opens the same picker the shell does, but
     * the shell is not the caller: all it hears is the storage layer's grant
     * signal. That flipped `hasFolder`, so the empty state swapped its CTA
     * from the picker to "Open WhatsApp" — and then nothing scanned, because
     * the Feed's only scan trigger is `reloadSignal`. The user finished the
     * picker and was left looking at "No statuses here" until they
     * backgrounded the app.
     */
    const tree = await mount();
    const root = tree.root;
    await ReactTestRenderer.act(async () => {
      screen(root, 'OnboardingScreen').props.onSkip();
    });
    const before = screen(root, 'FeedScreen').props.reloadSignal;

    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);
    await ReactTestRenderer.act(async () => {
      await requestFolderAccess('whatsapp');
    });

    expect(await AsyncStorage.getItem(SAF_KEY)).toBe('content://tree/media');
    expect(screen(root, 'FeedScreen').props.reloadSignal).toBeGreaterThan(
      before,
    );
  });

  it('lets a later revoke route back to the picker even after "Not now"', async () => {
    /*
     * "Not now" defers the first-run ask. Once a grant exists the deferral has
     * been answered, so losing it later is the ordinary revoke the shell
     * already knows how to recover from. Latching the skip for the session
     * meant one tap on "Not now" disabled that route for good: the Feed sat on
     * an empty grid, indistinguishable from a quiet day.
     */
    const tree = await mount();
    await ReactTestRenderer.act(async () => {
      screen(tree.root, 'OnboardingScreen').props.onSkip();
    });
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(1);

    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);
    await ReactTestRenderer.act(async () => {
      await requestFolderAccess('whatsapp');
    });
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(1);

    await ReactTestRenderer.act(async () => {
      await clearFolderAccess('whatsapp');
    });
    expect(tree.root.findAllByType('OnboardingScreen' as never)).toHaveLength(
      1,
    );
  });

  it('gives the tab bar back after onboarding interrupts a selection', async () => {
    /*
     * The tray replaces the nav while a screen is selecting, and the shell
     * holds that flag on the screen's behalf. Onboarding replaces the whole
     * tab area, so a revoke mid-selection unmounted the screen without it ever
     * saying it had stopped — and once the grant came back the shell rendered
     * the Feed with no nav at all: Library and Tools were unreachable for the
     * rest of the session, with nothing on screen to tap.
     */
    await AsyncStorage.setItem(SAF_KEY, 'content://tree/media');
    const tree = await mount();
    const root = tree.root;
    await ReactTestRenderer.act(async () => {
      screen(root, 'FeedScreen').props.onSelectingChange(true);
    });
    expect(tabs(root)).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      await clearFolderAccess('whatsapp');
    });
    expect(root.findAllByType('OnboardingScreen' as never)).toHaveLength(1);

    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);
    await ReactTestRenderer.act(async () => {
      await requestFolderAccess('whatsapp');
    });

    expect(root.findAllByType('FeedScreen' as never)).toHaveLength(1);
    expect(tabs(root)).toHaveLength(3);
  });
});

describe('persisting a preference', () => {
  it('writes the record once per commit, not once per patch', async () => {
    /*
     * The write used to run inside the `setPrefs` updater, which is a place
     * React is allowed to call more than once and to call from a render it
     * then throws away. Two patches from one handler meant two full-record
     * writes, the first of them a snapshot that never existed on screen.
     */
    const tree = await mount();
    const patch = screen(tree.root, 'FeedScreen').props.onPrefsChange;
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    // The store's own jest mock keeps its call log across tests; only the
    // calls this test provokes are the subject.
    setItem.mockClear();

    await ReactTestRenderer.act(async () => {
      patch({ sort: 'old' });
      patch({ feedFilter: 'photos' });
    });

    const writes = setItem.mock.calls.filter(
      call => call[0] === '@statussaverpro/prefs/v1',
    );
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1]))).toMatchObject({
      sort: 'old',
      feedFilter: 'photos',
    });
  });

  it('writes nothing when the patch changes nothing', async () => {
    // Tapping the filter tab that is already active is a no-op the user makes
    // constantly; it has no business rewriting the whole record.
    const tree = await mount();
    const patch = screen(tree.root, 'FeedScreen').props.onPrefsChange;
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    // The store's own jest mock keeps its call log across tests; only the
    // calls this test provokes are the subject.
    setItem.mockClear();

    await ReactTestRenderer.act(async () => {
      patch({ feedFilter: 'all' });
    });

    expect(
      setItem.mock.calls.filter(call => call[0] === '@statussaverpro/prefs/v1'),
    ).toHaveLength(0);
  });
});

describe('a folder pick that fails', () => {
  const SAF_KEY = 'whatsapp_status_folder_uri_whatsapp';

  beforeEach(() => {
    setPlatform('android', 33);
  });

  afterEach(() => {
    setPlatform('ios', 17);
  });

  it('says so instead of closing the picker onto nothing', async () => {
    /*
     * This is the picker behind the empty Feed's guide. Swallowing the
     * rejection meant a folder the native side would not take closed the
     * picker and changed nothing at all — no toast, no guide, no state — so
     * the only thing left to do was try the same folder again.
     */
    await AsyncStorage.setItem(SAF_KEY, 'content://tree/media');
    const tree = await mount();
    const root = tree.root;

    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/downloads');
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error('Status folder not found. Please select the Android/media folder.'),
    );

    await ReactTestRenderer.act(async () => {
      await screen(root, 'FeedScreen').props.onRequestFolder();
    });

    expect(texts(root)).toContain(en['onboard.failed']);
  });

  it('says so when the picker could not be opened at all', async () => {
    /*
     * The other half of the dead end above. Backing out of the picker rejects
     * with CANCELLED, but a native module that is not there to call answers
     * null and rejects nothing — so the empty Feed's "Choose folder" button
     * opened no picker, said nothing, and changed no state, every time it was
     * pressed.
     */
    await AsyncStorage.setItem(SAF_KEY, 'content://tree/media');
    const tree = await mount();
    const root = tree.root;

    const pick = native.pickFolder;
    native.pickFolder = undefined;
    try {
      await ReactTestRenderer.act(async () => {
        await screen(root, 'FeedScreen').props.onRequestFolder();
      });
    } finally {
      native.pickFolder = pick;
    }

    expect(texts(root)).toContain(en['onboard.failed']);
  });

  it('stays silent when the picker was simply backed out of', async () => {
    await AsyncStorage.setItem(SAF_KEY, 'content://tree/media');
    const tree = await mount();
    const root = tree.root;

    asMock(native.pickFolder).mockRejectedValueOnce(
      Object.assign(new Error('User cancelled'), { code: 'CANCELLED' }),
    );

    await ReactTestRenderer.act(async () => {
      await screen(root, 'FeedScreen').props.onRequestFolder();
    });

    expect(texts(root)).not.toContain(en['onboard.failed']);
  });
});

describe('hardware back while onboarding is up', () => {
  beforeEach(() => {
    setPlatform('android', 33);
  });

  afterEach(() => {
    setPlatform('ios', 17);
  });

  it('leaves the app rather than swapping a tab nobody can see', async () => {
    // Last session ended on Library, and there is no folder grant, so this
    // launch opens on onboarding with the tab bar hidden. Walking that hidden
    // tab back consumed the press and changed nothing on screen.
    await seedPrefs({ lastTab: 'library' });
    const tree = await mount();
    expect(tree.root.findAllByType('OnboardingScreen' as never)).toHaveLength(1);

    await expect(back()).resolves.toBe(false);
  });
});

describe('hardware back before the shell has finished booting', () => {
  beforeEach(() => {
    setPlatform('android', 33);
  });

  afterEach(() => {
    setPlatform('ios', 17);
  });

  it('lets Android leave, instead of eating the press', async () => {
    /*
     * The "walk back to the Feed" branch used to fire while the boot screen
     * was still up — on a screen with no tabs on it. The press was consumed,
     * which is a back button that visibly does nothing.
     */
    await seedPrefs();

    // Hold the folder-grant read open so boot cannot finish. Taken from the
    // store's own mock rather than by binding the method, which the spy below
    // replaces: delegating to it would recurse.
    const read = (
      AsyncStorage.getItem as unknown as jest.Mock
    ).getMockImplementation() as (key: string) => Promise<string | null>;
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementation((key: string) =>
        key === 'whatsapp_status_folder_uri_whatsapp'
          ? new Promise<string | null>(() => undefined)
          : read(key),
      );

    const tree = await mount();
    // Still on the boot screen: no nav, no tab, nothing to walk back to.
    expect(tabs(tree.root)).toHaveLength(0);
    expect(tree.root.findAllByType('ToolsScreen' as never)).toHaveLength(0);

    await expect(back()).resolves.toBe(false);

    // And it is still the boot screen afterwards: nothing was navigated.
    expect(tabs(tree.root)).toHaveLength(0);
  });
});

describe('the "new since last time" cutoff', () => {
  it('survives a remount of the shell', async () => {
    /*
     * The error boundary's retry mounts a fresh shell inside the same process,
     * and boot stamps `lastOpened` with the current time. The second boot then
     * read its own stamp back as "the previous open" and handed the Feed a
     * cutoff of now, so every New badge disappeared for the rest of the
     * session — immediately after the crash screen had said nothing was lost.
     */
    const first = await mount();
    const cutoff = screen(first.root, 'FeedScreen').props.previousOpenedAt;
    await ReactTestRenderer.act(async () => {
      first.unmount();
    });
    trees.splice(trees.indexOf(first), 1);

    const second = await mount();
    expect(screen(second.root, 'FeedScreen').props.previousOpenedAt).toBe(
      cutoff,
    );

    // And the naive answer really would have been a different one: the record
    // on disk now carries this session's own, much later, stamp.
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@statussaverpro/prefs/v1')) ?? '{}',
    );
    expect(stored.lastOpened).toBeGreaterThan(cutoff);
  });
});

describe('hide from recents at boot', () => {
  it('turns the stored switch off when the platform will not apply it', async () => {
    /*
     * The native flag is the truth. Carrying the preference forward on a build
     * that cannot apply it told the user in Settings that the recents preview
     * was blank while it was showing their statuses.
     */
    await seedPrefs({ hideFromRecents: true });
    asMock(native.setSecureFlag).mockRejectedValueOnce(new Error('no activity'));

    const tree = await mount();
    await ReactTestRenderer.act(async () => {});

    expect(screen(tree.root, 'FeedScreen').props.prefs.hideFromRecents).toBe(
      false,
    );
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@statussaverpro/prefs/v1')) ?? '{}',
    );
    expect(stored.hideFromRecents).toBe(false);
  });

  it('keeps it on when the flag applies', async () => {
    await seedPrefs({ hideFromRecents: true });
    const tree = await mount();
    await ReactTestRenderer.act(async () => {});

    expect(screen(tree.root, 'FeedScreen').props.prefs.hideFromRecents).toBe(
      true,
    );
  });
});

/**
 * The first-run intro. Not part of `mount`'s usual world: these clear the
 * seeded `introSeen` so the shell boots the way a fresh install does.
 */
describe('the first-run intro', () => {
  const fresh = async (): Promise<Renderer> => {
    await AsyncStorage.clear();
    return mount();
  };

  it('takes the whole screen on a fresh install, tab bar and all', async () => {
    const tree = await fresh();

    expect(tree.root.findAllByType('IntroScreen' as never)).toHaveLength(1);
    expect(tabs(tree.root)).toHaveLength(0);
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(0);
  });

  it('hands over to the app and writes the pref once finished', async () => {
    const tree = await fresh();

    await ReactTestRenderer.act(async () => {
      screen(tree.root, 'IntroScreen').props.onDone();
    });
    await ReactTestRenderer.act(async () => {});

    expect(tree.root.findAllByType('IntroScreen' as never)).toHaveLength(0);
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(1);
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@statussaverpro/prefs/v1')) ?? '{}',
    );
    expect(stored.introSeen).toBe(true);
  });

  it('does not come back once the pref is stored', async () => {
    const tree = await mount();

    expect(tree.root.findAllByType('IntroScreen' as never)).toHaveLength(0);
    expect(tree.root.findAllByType('FeedScreen' as never)).toHaveLength(1);
  });

  /*
   * The shell's back handler walks a non-Feed tab back to the Feed. While the
   * intro is up there is no tab bar to walk, so that branch would consume the
   * press and change nothing — a back button that does nothing.
   */
  it('leaves hardware back to the intro and to Android', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      '@statussaverpro/prefs/v1',
      JSON.stringify({ lastTab: 'tools' }),
    );
    await mount();

    expect(await back()).toBe(false);
  });
});

/*
 * Below Android 11 there is no folder picker: the Feed reads WhatsApp's folder
 * directly, which needs the storage permission. Nothing else asks for it any
 * more, so the shell has to — a fresh install on Android 7–10 otherwise sat on
 * an empty Feed with no way to the permission.
 */
describe('the storage permission below Android 11', () => {
  // The permission module remembers a grant for the session, which is right in
  // the app and wrong between two tests sharing one module registry.
  beforeEach(() => {
    resetMediaAccessCache();
  });
  afterEach(() => {
    resetMediaAccessCache();
    setPlatform('ios', 17);
  });

  it('is only checked at boot, never prompted from a blank window', async () => {
    setPlatform('android', 29);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted' as never);

    const tree = await mount();
    await ReactTestRenderer.act(async () => {});

    // No dialog before the user has seen why; the Feed's empty state asks.
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    expect(screen(tree.root, 'FeedScreen').props.hasFolder).toBe(false);
  });

  it('opens the Feed once the permission is held', async () => {
    setPlatform('android', 29);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

    const tree = await mount();
    await ReactTestRenderer.act(async () => {});

    expect(screen(tree.root, 'FeedScreen').props.hasFolder).toBe(true);
  });

  it('asks from the Feed when its empty state is used', async () => {
    setPlatform('android', 29);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted' as never);

    const tree = await mount();
    await ReactTestRenderer.act(async () => {});
    await ReactTestRenderer.act(async () => {
      screen(tree.root, 'FeedScreen').props.onRequestFolder();
    });
    await ReactTestRenderer.act(async () => {});

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      'android.permission.READ_EXTERNAL_STORAGE',
    );
    expect(screen(tree.root, 'FeedScreen').props.hasFolder).toBe(true);
  });

  it('leaves the Feed without a folder when it is refused, so the empty state can ask again', async () => {
    setPlatform('android', 29);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('denied' as never);

    const tree = await mount();
    await ReactTestRenderer.act(async () => {});

    expect(screen(tree.root, 'FeedScreen').props.hasFolder).toBe(false);
  });
});
