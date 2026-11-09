/**
 * Status Saver — view, save and share the statuses a messaging app has already cached
 * on this device. Fully offline: the release build has no INTERNET permission.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { FeedbackProvider, useFeedback } from './src/context/FeedbackContext';

import FeedScreen from './src/screens/FeedScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import IntroScreen from './src/screens/IntroScreen';
import HelpScreen from './src/screens/HelpScreen';
import AboutScreen from './src/screens/AboutScreen';

import { Icon, type IconName } from './src/components/icons';
import { EmptyState, pressedStyle } from './src/components/ui';
import { space, type } from './src/theme/tokens';
import {
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  type Prefs,
} from './src/utils/prefs';
import {
  hasFolderAccess,
  requestFolderAccess,
  subscribeFolderAccess,
} from './src/utils/folderPicker';
import { clearShareCache } from './src/utils/statusManager';
import {
  needsFolderPicker,
  peekMediaAccess,
  setPermissionCopy,
} from './src/utils/permissions';
import { requestGalleryAccess } from './src/utils/statusManager';
import { setSecureFlag, trimThumbnailCache } from './src/utils/native';
import type { TabKey } from './src/types';

/** Screens that sit above the tab bar rather than inside it. */
type Overlay = 'settings' | 'help' | 'about' | null;

/**
 * How long a boot may run before the spinner is worth showing.
 *
 * Everything the shell waits for is an AsyncStorage read, which normally
 * settles inside one frame. Painting a spinner unconditionally made every cold
 * start flash it for ~30ms, which reads as a stutter rather than as progress.
 */
const BOOT_SPINNER_DELAY = 120;

/** How long after boot the cache sweeps run. Long enough to be past the paint. */
const HOUSEKEEPING_DELAY = 600;

/**
 * The open this process began at, remembered outside the component tree.
 *
 * Boot stamps `lastOpened` with the current time and hands the screens the
 * value it replaced, which is what "new since last time" is measured from. The
 * error boundary's retry mounts a *fresh* shell in the same process, so the
 * second boot read back the stamp the first one had just written and handed the
 * Feed a cutoff of "now": every New badge vanished, and the crash screen had
 * just promised that nothing was lost. Held here, a second boot in one process
 * keeps the cutoff the session started with; a real relaunch is a new process,
 * where this is null again.
 */
let sessionPreviousOpen: number | null = null;

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            {/* Inside the providers, so the fallback can use the real palette
                and the user's language rather than a hardcoded English page. */}
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

interface BoundaryState {
  failed: boolean;
  /** Bumped on retry so the shell remounts instead of resuming its state. */
  attempt: number;
}

/**
 * Catches a render error anywhere in the shell.
 *
 * React unmounts the whole tree when a render throws, so in release one bad
 * file or one unexpected null used to leave a blank window with nothing left
 * to tap — the user's only route out was force-stopping the app. This turns
 * that into a screen that says what happened and offers a retry.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  state: BoundaryState = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    // There is no crash reporter and no INTERNET permission to feed one, so
    // the device log is the only place a report can go. Kept deliberately.
    console.error('Unhandled render error', error);
  }

  private readonly retry = (): void => {
    this.setState(prev => ({ failed: false, attempt: prev.attempt + 1 }));
  };

  render(): React.ReactNode {
    if (this.state.failed) {
      return <ErrorFallback onRetry={this.retry} />;
    }
    // Keyed: a retry mounts a fresh shell, so whatever state produced the
    // throw is gone rather than being restored straight back into it.
    return (
      <React.Fragment key={this.state.attempt}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

/**
 * The recoverable crash screen. Built from the same empty-state primitive the
 * Feed and Library use, so it inherits their metrics and colours exactly.
 */
const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.bg }]}
      // The sides matter in landscape, where the navigation bar moves to one
      // of them and the header's buttons used to sit under it. Both are 0 in
      // portrait, so nothing moves there.
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        backgroundColor={theme.bg}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <View style={styles.body}>
        <EmptyState
          title={t('error.title')}
          body={t('error.body')}
          cta={{ label: t('common.retry'), onPress: onRetry }}
        />
      </View>
    </SafeAreaView>
  );
};

/** The prototype's nav glyphs: Feed is a photo, Library a download tray, Tools a bolt. */
const TABS: Array<{
  key: TabKey;
  icon: IconName;
  labelKey: 'nav.feed' | 'nav.library' | 'nav.tools';
}> = [
  { key: 'feed', icon: 'feed', labelKey: 'nav.feed' },
  { key: 'library', icon: 'download', labelKey: 'nav.library' },
  { key: 'tools', icon: 'bolt', labelKey: 'nav.tools' },
];

/**
 * Where every launch opens, whatever tab the last one ended on.
 *
 * The Feed is what the app is for: the statuses still there to be kept, and
 * the ones that will be gone by morning. Resuming on Library or Tools put the
 * least time-critical screen in front of someone who had opened the app
 * precisely because something was about to expire — and straight after the
 * first-run intro it read as the intro having dropped them somewhere at
 * random. The media filters and the library collection reset for the same
 * reason: each launch starts where the design starts.
 */
const HOME_TAB: TabKey = 'feed';

function AppShell() {
  const { theme, isDark, ready: themeReady, setStatusTint } = useTheme();
  const { t, ready: langReady } = useLanguage();
  const { showToast } = useFeedback();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [tab, setTab] = useState<TabKey>(HOME_TAB);
  const [overlay, setOverlay] = useState<Overlay>(null);
  /**
   * Two separate signals, deliberately.
   *
   * `reloadSignal` means "what is on the device may have changed": the app
   * came back to the foreground, or a folder grant was stored or dropped.
   * Rescan. `dataVersion` means "our own data changed": the Library should
   * refetch, but the Feed must not kick off a fresh directory scan. Collapsing
   * these into one counter meant saving a single status triggered a full
   * rescan.
   */
  const [reloadSignal, setReloadSignal] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  /** Bumped whenever the storage layer stores or drops a folder grant. */
  const [grantVersion, setGrantVersion] = useState(0);
  const [hasFolder, setHasFolder] = useState(false);
  const [folderChecked, setFolderChecked] = useState(false);
  const [skippedOnboarding, setSkippedOnboarding] = useState(false);
  /** True while a screen is in multi-select; the tab bar yields to its tray. */
  const [selecting, setSelecting] = useState(false);

  const [clearSelection, setClearSelection] = useState(0);
  const [spinnerVisible, setSpinnerVisible] = useState(false);

  const mounted = useRef(true);
  /** The previous session's open time, frozen before we overwrite it. */
  const previousOpenRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * The record last handed to the store, so the effect below writes only real
   * changes and writes them once.
   */
  const writtenRef = useRef<string | null>(null);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs(prev => ({ ...prev, ...patch }));
  }, []);

  /*
   * Persist the record React actually committed.
   *
   * The write used to sit inside the `setPrefs` updater, which is a place
   * React is free to call more than once and to call from a render it then
   * discards. Two patches from one handler — a screen that sets a filter and a
   * sort together — therefore wrote the whole record twice, the first of them
   * a snapshot that was never on screen. Writing from an effect makes the
   * updater pure again and coalesces a commit's patches into one write.
   *
   * The `prefsReady` guard is what keeps this from clobbering the stored
   * record with `DEFAULT_PREFS` on the mount before `loadPrefs` has answered.
   */
  useEffect(() => {
    if (!prefsReady) {
      return;
    }
    const encoded = JSON.stringify(prefs);
    if (writtenRef.current === encoded) {
      return;
    }
    writtenRef.current = encoded;
    savePrefs(prefs);
  }, [prefs, prefsReady]);

  /*
   * Boot reads prefs and stamps this open.
   *
   * The other three things boot waits for — the theme, the language and the
   * folder grant — resolve in their own effects, which all mount on this same
   * commit. So the four reads overlap instead of queueing behind each other,
   * and nothing that is not needed for the first paint runs here: the cache
   * sweeps below are deliberately deferred past it.
   */
  useEffect(() => {
    (async () => {
      const stored = await loadPrefs();
      if (!mounted.current) {
        return;
      }
      // The screens need the PREVIOUS lastOpened to compute "new since last
      // time", so hand them `stored` as-is and keep the new stamp only in the
      // record we persist and hold in state. Writing it to disk but not to
      // state used to let the next pref change rewind the cutoff.
      // The media filters and the library collection are prefs-backed so the
      // screens have one owner for them, but they are view state, not a
      // setting: the prototype opens on All every time (its goFeed/goLibrary
      // reset the filter). Restoring "Videos" from last night would greet the
      // user with two tiles and read as lost statuses, so each launch starts
      // where the design starts.
      const stamped: Prefs = {
        ...stored,
        lastOpened: Date.now(),
        feedFilter: DEFAULT_PREFS.feedFilter,
        libraryFilter: DEFAULT_PREFS.libraryFilter,
        libraryCollection: DEFAULT_PREFS.libraryCollection,
      };
      if (sessionPreviousOpen === null) {
        sessionPreviousOpen = stored.lastOpened;
      }
      previousOpenRef.current = sessionPreviousOpen;
      setPrefs(stamped);
      setPrefsReady(true);
      // The new open stamp goes out now rather than waiting for the effect
      // above, so a shell torn down immediately after boot still leaves the
      // "new since last time" cutoff advanced. Recorded as written so the
      // effect does not repeat it.
      writtenRef.current = JSON.stringify(stamped);
      savePrefs(stamped);

      if (stored.hideFromRecents) {
        // The native flag is the truth, here as in Settings. A build whose
        // module cannot apply it must not carry the switch forward as on: the
        // user would be told the recents preview is blank when it is not.
        setSecureFlag(true).then(applied => {
          if (!applied && mounted.current) {
            updatePrefs({ hideFromRecents: false });
          }
        });
      }
    })();
  }, [updatePrefs]);

  /*
   * Re-check the grant on every foreground, on every data change, and whenever
   * the storage layer reports one stored or dropped. Checking only at boot
   * meant a grant revoked in Android settings — or dropped here when a listing
   * failed with a SecurityException — left the app showing an empty Feed with
   * no route back to the picker until the process was killed.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      /*
       * Android 11+ reads statuses through the SAF grant. Below that the Feed
       * reads WhatsApp's folder directly, which needs the storage permission.
       * It is only CHECKED here: raising the dialog from the boot gate put it
       * over a blank window before the intro or any copy that says why, so
       * the Feed's empty state does the asking, with the reason on screen,
       * the same way the SAF onboarding does on Android 11+.
       */
      const granted = needsFolderPicker()
        ? await hasFolderAccess('whatsapp')
        : (await peekMediaAccess()) !== 'none'
        ? 'legacy'
        : null;
      if (!cancelled && mounted.current) {
        setHasFolder(!!granted);
        setFolderChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadSignal, dataVersion, grantVersion]);

  // The listing that discovers a revoked grant is the one that clears it, so
  // this is what turns a mid-session revoke into the picker route again —
  // without waiting for the next foreground.
  useEffect(
    () =>
      subscribeFolderAccess(() => {
        setGrantVersion(n => n + 1);
        /*
         * A grant stored or dropped changes what there is to list, so it has
         * to start a scan as well.
         *
         * Settings' "Status folder" row opens the same picker the shell does,
         * but the shell is not its caller: all it heard was this signal, which
         * only re-checked whether the grant exists. So the Feed's empty state
         * swapped its CTA from the picker to "Open WhatsApp" — proof the shell
         * knew — while the grid stayed empty, because `reloadSignal` is the
         * Feed's only scan trigger. The user finished the picker and had to
         * background the app to see the statuses they had just granted.
         *
         * Both updates land in one commit, so a grant taken through the shell
         * (onboarding, the Feed's guide) still scans exactly once.
         */
        setReloadSignal(n => n + 1);
      }),
    [],
  );

  /*
   * "Not now" defers the first-run ask; it does not answer it forever.
   *
   * Once a grant exists the deferral has been met, so losing it later is the
   * ordinary revoke the shell already recovers from by offering the picker.
   * Latching the skip for the whole session meant one tap on "Not now" — at
   * first run, before the user had any grant at all — disabled that recovery
   * for good, leaving an empty grid that reads as a quiet day.
   */
  useEffect(() => {
    if (hasFolder) {
      setSkippedOnboarding(false);
    }
  }, [hasFolder]);

  // Hand the hook-less permission helper its translated copy.
  useEffect(() => {
    if (langReady) {
      setPermissionCopy({
        title: t('toast.permissionNeeded'),
        action: t('toast.openSettings'),
      });
    }
  }, [langReady, t]);

  // Rescan whenever the app returns to the foreground: WhatsApp will have
  // written new status files while we were away.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        setReloadSignal(n => n + 1);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const booting = !themeReady || !langReady || !prefsReady || !folderChecked;

  /*
   * First launch after install, ahead of everything else.
   *
   * `introSeen` is a pref rather than a mount-time flag, so it survives the
   * app being killed halfway through the slides — and it gates on `prefsReady`
   * through `booting`, so a slow disk read cannot flash the intro at someone
   * who finished it months ago.
   */
  const showIntro = !booting && !prefs.introSeen;

  const showOnboarding =
    !booting &&
    !showIntro &&
    needsFolderPicker() &&
    !hasFolder &&
    !skippedOnboarding;

  /*
   * The light theme's tabs wear a solid green header, and the strip behind
   * the status bar is part of it: green, with white icons. Only while a tab
   * is actually on screen: not while booting, not on the intro or the folder
   * setup, whose pages are plain, and not under an overlay or while selecting,
   * whose headers are not green. ThemeContext is the one place that talks to
   * the system bars, so this only tells it which colour to use.
   */
  const tabBarTinted =
    !isDark && !booting && !showIntro && !showOnboarding && !overlay && !selecting;
  useEffect(() => {
    setStatusTint(tabBarTinted ? theme.topBar : null);
  }, [tabBarTinted, theme.topBar, setStatusTint]);
  useEffect(() => () => setStatusTint(null), [setStatusTint]);

  // Only admit to being busy once the wait is long enough to notice.
  useEffect(() => {
    if (!booting) {
      return undefined;
    }
    const timer = setTimeout(() => setSpinnerVisible(true), BOOT_SPINNER_DELAY);
    return () => clearTimeout(timer);
  }, [booting]);

  /*
   * Housekeeping, once, well after the first real paint.
   *
   * All three are pure disk work with nothing on screen depending on them, and
   * running them during boot put a directory walk and two bridge calls in
   * front of the first frame. The delay also keeps them clear of the Feed's
   * own first scan and its mount animation. Nothing awaits them, none can
   * reject, and the timer is dropped if the shell goes away first.
   *
   * `InteractionManager` would read better here but is deprecated in 0.82 and
   * warns on every call.
   */
  const sweptRef = useRef(false);
  useEffect(() => {
    if (booting || sweptRef.current) {
      return undefined;
    }
    sweptRef.current = true;
    const timer = setTimeout(() => {
      // Sharing writes plaintext copies into the cache dir. Tools no longer
      // exposes a "clear cache" button, so the shell sweeps them here.
      clearShareCache();
      // Poster frames only ever accumulated; this caps them.
      trimThumbnailCache();
    }, HOUSEKEEPING_DELAY);
    return () => clearTimeout(timer);
  }, [booting]);

  /** Every tab change. Nothing is remembered: each launch opens on HOME_TAB. */
  const selectTab = useCallback((next: TabKey) => {
    setTab(next);
    // The flag belongs to the screen that raised it, and that screen is
    // about to unmount without getting the chance to lower it. Same
    // invariant the onboarding effect below keeps, from the other direction.
    setSelecting(false);
  }, []);

  /*
   * A screen that is no longer mounted cannot still be selecting.
   *
   * The tray replaces the nav while a screen is in multi-select and the shell
   * holds that flag on the screen's behalf, but the screen only ever reports
   * `false` while it is alive. Onboarding replaces the whole tab area, so a
   * grant revoked mid-selection took the screen away without it ever saying it
   * had stopped — and once the grant came back the shell rendered the Feed with
   * no nav at all. Library and Tools were then unreachable for the rest of the
   * session, with nothing on screen left to tap.
   */
  useEffect(() => {
    if (showOnboarding) {
      setSelecting(false);
    }
  }, [showOnboarding]);

  // Hardware back: cancel a selection, then close an overlay, then walk back
  // to the Feed, then let Android leave the app.
  useEffect(() => {
    const onBack = () => {
      /*
       * Nothing is navigable yet while the boot screen is up: a back press
       * during a slow cold start was answered by the branch below, which
       * consumed it and left the spinner exactly where it was — a back button
       * that does nothing.
       */
      if (booting) {
        return false;
      }
      // Backing out of a multi-select first; leaving the tab with items still
      // selected is never what the gesture means.
      if (selecting) {
        setClearSelection(n => n + 1);
        return true;
      }
      if (overlay === 'help' || overlay === 'about') {
        setOverlay('settings');
        return true;
      }
      if (overlay === 'settings') {
        setOverlay(null);
        return true;
      }
      // Setup — the intro slides and onboarding both — replaces the tabs
      // entirely, so there is no tab to walk back to: consuming the press
      // there swapped a hidden tab and left the screen exactly as it was,
      // which reads as a back button that does nothing. The intro registers
      // its own handler for stepping back a slide; it is mounted after this
      // one, so it is offered the press first and this branch only ever sees
      // the presses it declined.
      if (!showOnboarding && !showIntro && tab !== 'feed') {
        selectTab('feed');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [booting, overlay, tab, selecting, selectTab, showIntro, showOnboarding]);

  /**
   * The prototype's Settings X is wired to `goFeed` (template 370,
   * logic.js:409), not to "back where you came from": leaving Settings always
   * lands on the Feed. Hardware back keeps the spec's own order — it closes
   * the overlay onto the tab underneath, then walks that back to the Feed.
   */
  const closeSettings = useCallback(() => {
    setOverlay(null);
    selectTab('feed');
  }, [selectTab]);

  const refreshLibrary = useCallback(() => {
    setDataVersion(n => n + 1);
  }, []);

  const requestFolder = useCallback(async () => {
    // Below Android 11 there is no folder to pick: the route to the statuses
    // is the storage permission, asked for again from the empty state.
    if (!needsFolderPicker()) {
      const access = await requestGalleryAccess();
      if (mounted.current) {
        setHasFolder(access !== 'none');
        if (access !== 'none') {
          // The grant is what makes the folder readable, so it has to start a
          // scan the way a SAF grant does through subscribeFolderAccess. Without
          // this the Feed went from "Nothing to read yet" to "No statuses here"
          // and sat there until a pull to refresh.
          setReloadSignal(n => n + 1);
        }
      }
      return;
    }
    try {
      const uri = await requestFolderAccess('whatsapp');
      if (uri) {
        if (mounted.current) {
          // Routes off the guide without waiting for the grant re-check to come
          // back from storage. The rescan is the grant signal's job now: bumping
          // `reloadSignal` here as well could land in a second commit and start
          // the same scan twice.
          setHasFolder(true);
        }
        return;
      }
      /*
       * No URI and no rejection means the picker was never opened: the native
       * module answers null when it is not there to call. Backing out of the
       * picker rejects with CANCELLED instead, so this is not the silent case.
       *
       * Left unsaid it was the dead end the catch below exists to prevent, from
       * the other direction: on a build whose module failed to register, the
       * empty Feed's "Choose folder" button did nothing at all, forever, with
       * nothing on screen to say why.
       */
      if (mounted.current) {
        showToast({
          message: t('onboard.failed'),
          meta: t('toast.metaSetup'),
          type: 'error',
        });
      }
    } catch (error) {
      // Backing out of the system picker is a decision, not a failure.
      if ((error as { code?: string })?.code === 'CANCELLED') {
        return;
      }
      /*
       * Everything else has to be said out loud. This is the picker behind the
       * empty Feed's guide, and swallowing the rejection meant a folder the
       * native side would not take closed the picker and changed nothing at
       * all: no toast, no guide, no state — a dead end the user could only
       * repeat.
       */
      if (mounted.current) {
        showToast({
          message: t('onboard.failed'),
          meta: t('toast.metaSetup'),
          type: 'error',
        });
      }
    }
  }, [showToast, t]);

  const content = useMemo(() => {
    if (tab === 'feed') {
      return (
        <FeedScreen
          prefs={prefs}
          previousOpenedAt={previousOpenRef.current}
          onPrefsChange={updatePrefs}
          reloadSignal={reloadSignal}
          hasFolder={hasFolder}
          onRequestFolder={requestFolder}
          onLibraryChanged={refreshLibrary}
          onOpenTools={() => selectTab('tools')}
          onOpenSettings={() => setOverlay('settings')}
          onSelectingChange={setSelecting}
          clearSelectionSignal={clearSelection}
        />
      );
    }
    if (tab === 'library') {
      return (
        <LibraryScreen
          prefs={prefs}
          onPrefsChange={updatePrefs}
          reloadSignal={reloadSignal}
          dataVersion={dataVersion}
          onLibraryChanged={refreshLibrary}
          onOpenSettings={() => setOverlay('settings')}
          onOpenFeed={() => selectTab('feed')}
          onSelectingChange={setSelecting}
          clearSelectionSignal={clearSelection}
        />
      );
    }
    return <ToolsScreen prefs={prefs} onPrefsChange={updatePrefs} />;
  }, [
    tab,
    prefs,
    updatePrefs,
    reloadSignal,
    dataVersion,
    hasFolder,
    requestFolder,
    refreshLibrary,
    selectTab,
    clearSelection,
  ]);

  if (booting) {
    return (
      <View style={[styles.boot, { backgroundColor: theme.bg }]}>
        <StatusBar
          backgroundColor={theme.bg}
          barStyle={isDark ? 'light-content' : 'dark-content'}
          translucent={false}
        />
        {spinnerVisible ? (
          <ActivityIndicator size="large" color={theme.accent} />
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.bg }]}
      // The sides matter in landscape, where the navigation bar moves to one
      // of them and the header's buttons used to sit under it. Both are 0 in
      // portrait, so nothing moves there. The top edge is the strip below,
      // painted on its own so that the green never runs down a side inset.
      edges={['left', 'right']}
    >
      <StatusBar
        backgroundColor={tabBarTinted ? theme.topBar : theme.bg}
        barStyle={isDark || tabBarTinted ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <SafeAreaView
        edges={['top']}
        style={{ backgroundColor: tabBarTinted ? theme.topBar : theme.bg }}
      />

      {/* Overlays fill this box, not the SafeAreaView: anchored to the safe
          area's padding edge they used to ride up over the status bar. */}
      <View style={styles.body}>
        {showIntro ? (
          <IntroScreen onDone={() => updatePrefs({ introSeen: true })} />
        ) : showOnboarding ? (
          <OnboardingScreen
            // Same as `requestFolder`: leave the picker route at once and let
            // the grant signal own the scan, so it runs once.
            //
            // Setup always ends on the Feed, whatever tab the last session
            // left behind: someone who has just pointed the app at their
            // status folder is looking for the statuses, and landing them on
            // Tools reads as the grant not having worked.
            onGranted={() => {
              setHasFolder(true);
              selectTab('feed');
            }}
            onSkip={() => {
              setSkippedOnboarding(true);
              selectTab('feed');
            }}
          />
        ) : (
          <>
            {/* Settings, Help and About are laid over this, not opened as
                Modals, so a screen reader would otherwise keep walking — and
                activating — the tabs and tiles hidden underneath them. */}
            <View
              style={styles.content}
              importantForAccessibility={
                overlay ? 'no-hide-descendants' : 'auto'
              }
            >
              {content}
            </View>
            {/* The selection tray takes the tab bar's place, rather than
                stacking on top of it and doubling the safe-area padding. */}
            {selecting ? null : (
              <View
                importantForAccessibility={
                  overlay ? 'no-hide-descendants' : 'auto'
                }
              >
                <TabBar active={tab} onChange={selectTab} />
              </View>
            )}
          </>
        )}

        {overlay === 'settings' ? (
          <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
            <SettingsScreen
              prefs={prefs}
              onPrefsChange={updatePrefs}
              onClose={closeSettings}
              onOpenHelp={() => setOverlay('help')}
              onOpenAbout={() => setOverlay('about')}
            />
          </View>
        ) : null}

        {overlay === 'help' ? (
          <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
            <HelpScreen onClose={() => setOverlay('settings')} />
          </View>
        ) : null}

        {overlay === 'about' ? (
          <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
            <AboutScreen onClose={() => setOverlay('settings')} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const TabBar: React.FC<{
  active: TabKey;
  onChange: (tab: TabKey) => void;
}> = ({ active, onChange }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.navBg,
          borderTopColor: theme.hairline,
          // The prototype's 22px home-indicator strip is Android's own nav
          // area; the floor keeps the tabs off the edge on 3-button devices.
          paddingBottom: Math.max(insets.bottom, space.gap),
        },
      ]}
    >
      <View style={styles.tabRow}>
        {TABS.map(item => {
          const isActive = item.key === active;
          const color = isActive ? theme.accent : theme.textMuted;
          const label = t(item.labelKey);
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
              style={({ pressed }) => [styles.tab, pressedStyle(pressed)]}
            >
              <Icon
                name={item.icon}
                size={21}
                color={color}
                strokeWidth={1.8}
              />
              <Text
                style={[
                  isActive ? type.navLabelActive : type.navLabel,
                  { color },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  content: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  tabBar: {
    borderTopWidth: 1,
    paddingTop: space.gap,
    paddingHorizontal: space.bar,
  },
  tabRow: { flexDirection: 'row', alignItems: 'stretch', gap: space.xs },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 9,
  },
});

export default App;
