import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  TOAST_BOTTOM,
  showToast as emitToast,
  useFeedback,
  useToastBottom,
} from '../context/FeedbackContext';
import { EmptyState, Pager, RoundButton, pressedStyle } from '../components/ui';
import { Icon } from '../components/icons';
import { FilterTabs } from '../components/FilterTabs';
import { StatusGrid } from '../components/StatusGrid';
import { GridSkeleton } from '../components/GridSkeleton';
import { needsFolderPicker } from '../utils/permissions';
import { SelectionHeader, SelectionTray } from '../components/SelectionBar';
import { OptionSheet } from '../components/Sheet';
import { PermissionGuide } from '../components/PermissionGuide';
import { BatchProgress } from '../components/BatchProgress';
import StatusViewer from '../components/StatusViewer';
import { radius, size, type } from '../theme/tokens';
import { formatBytesMB, sortStatuses } from '../utils/format';
import {
  addSavedStatusIds,
  deleteSavedCopiesOf,
  getStatusFiles,
  markSaved,
  removeSavedStatusIds,
  saveMany,
  saveStatusToGallery,
  syncSavedStatusIds,
} from '../utils/statusManager';
import { addToVault, removeFromVault, vaultHolds } from '../utils/vault';
import { hapticSave, hapticSelect } from '../utils/haptics';
import {
  isWhatsAppMissing,
  messagingPackage,
  shareStatuses,
  shareToWhatsApp,
} from '../utils/share';
import { openApp } from '../utils/native';
import type { MediaFilter, SortOrder, StatusFile } from '../types';
import type { Prefs } from '../utils/prefs';

/*
 * Two ways to toast, on purpose. Anything the Feed's own surface triggers goes
 * through the hook, which is this screen's provider. Anything the viewer can
 * trigger (save, favourite, share, repost) goes through `emitToast`, the
 * module-level bridge: it always resolves to the innermost mounted provider,
 * which is the one nested inside the viewer's Modal while it is open — a root
 * toast would otherwise paint behind that window on Android.
 */

/**
 * The filter tabs in the order the header draws them, so a sideways swipe over
 * the grid steps between them the way the tabs read: left pulls the next one
 * in. Clamped rather than wrapped — a swipe past Videos landing back on All
 * feels like the list jumped rather than moved.
 */
export const FILTER_ORDER: MediaFilter[] = ['all', 'photos', 'videos'];

export const filterAfterSwipe = (
  current: MediaFilter,
  direction: -1 | 1,
): MediaFilter => {
  const at = FILTER_ORDER.indexOf(current);
  const next = at + direction;
  if (at < 0 || next < 0 || next >= FILTER_ORDER.length) {
    return current;
  }
  return FILTER_ORDER[next];
};

export interface FeedScreenProps {
  prefs: Prefs;
  /**
   * When the app was opened BEFORE this session. Passed separately because
   * `prefs.lastOpened` is already the current session's stamp.
   */
  previousOpenedAt: number;
  onPrefsChange: (patch: Partial<Prefs>) => void;
  /** Bumped by the app shell on foreground and after a folder grant. */
  reloadSignal: number;
  hasFolder: boolean;
  onRequestFolder: () => void;
  /** Notifies the shell that the library changed, so its tab can refresh. */
  onLibraryChanged: () => void;
  /** Opens the Tools tab, where auto-save is configured. */
  onOpenTools: () => void;
  /** Opens the Settings overlay from the header's gear button. */
  onOpenSettings?: () => void;
  /** Lets the shell hide the tab bar while a multi-select is active. */
  onSelectingChange?: (selecting: boolean) => void;
  /** Bumped by the shell when hardware back should cancel a selection. */
  clearSelectionSignal?: number;
}

/**
 * The header's "Auto" chip: only drawn while auto-save is on, because there is
 * no off state to advertise — Tools is where that gets switched, and tapping
 * the chip is how you get there.
 */
const AutoChip: React.FC<{ onPress: () => void; onTint?: boolean }> = ({
  onPress,
  onTint,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const ink = onTint ? theme.onTopBar : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('feed.autoA11y')}
      style={({ pressed }) => [
        styles.autoChip,
        { backgroundColor: onTint ? theme.topBarWell : theme.accentChip },
        pressedStyle(pressed),
      ]}
    >
      <Icon name="bolt" size={11} color={ink} strokeWidth={2.3} />
      <Text
        style={[type.navLabelActive, { color: ink }]}
        numberOfLines={1}
      >
        {t('feed.auto')}
      </Text>
    </Pressable>
  );
};

const FeedScreen: React.FC<FeedScreenProps> = ({
  prefs,
  previousOpenedAt,
  onPrefsChange,
  reloadSignal,
  hasFolder,
  onRequestFolder,
  onLibraryChanged,
  onOpenTools,
  onOpenSettings,
  onSelectingChange,
  clearSelectionSignal = 0,
}) => {
  const { theme, isDark } = useTheme();
  /*
   * The light theme paints the header and the All / Photos / Videos row as one
   * solid green bar, the way the classic messenger layout does; the dark theme
   * keeps its untinted bar. App.tsx paints the status bar to match while the
   * Feed is on screen.
   */
  const tinted = !isDark;
  const { t, tp } = useLanguage();
  const { showToast } = useFeedback();

  const [items, setItems] = useState<StatusFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(
    null,
  );

  // The tray is shorter than the nav it replaces, so the toast rides 2px lower.
  useToastBottom(selecting ? TOAST_BOTTOM.selecting : TOAST_BOTTOM.nav);

  /** Read by the long-press handler, which must stay a stable identity. */
  const selectingRef = useRef(false);

  useEffect(() => {
    selectingRef.current = selecting;
    onSelectingChange?.(selecting);
  }, [selecting, onSelectingChange]);

  const mounted = useRef(true);
  /** Pending debounced gallery reconcile, cleared on unmount. */
  const reconcileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ids with a save in flight, so a repeat tap cannot duplicate the copy. */
  const savingIds = useRef<Set<string>>(new Set());
  const batchRunning = useRef(false);
  /** Ids auto-save has already attempted, so a rescan never retries a keeper. */
  const autoTried = useRef<Set<string>>(new Set());
  /** One auto-save run at a time: a refresh and a foreground can land together. */
  const autoRunning = useRef(false);
  /** A scan that landed mid-run, waiting for the current run to finish. */
  const autoQueued = useRef(false);
  /** The newest scan result, which is what the queued re-run works from. */
  const autoLatest = useRef<StatusFile[]>([]);
  /**
   * Ticket for the running scan. A foreground return and the refresh button
   * can be in flight at once, and the slower of the two used to repaint the
   * grid with its older listing after the newer one had already landed.
   */
  const loadSeq = useRef(0);
  /** Mirrors `refreshing` for the guard, which must not re-key `refresh`. */
  const refreshingRef = useRef(false);
  /**
   * The item the viewer is parked on. The index alone is not an identity: a
   * rescan that drops or prepends a status slides every later index by one,
   * and the open viewer would then be showing — and saving — a different file.
   */
  const viewerIdRef = useRef<string | null>(null);
  /** The current filtered list, so the tile handlers can keep one identity. */
  const visibleRef = useRef<StatusFile[]>([]);
  /**
   * Auto-save, reached through a ref so `load` can keep a single identity for
   * the whole session. The scan effect keys on `load`, and a callback that
   * changed with the toast or the prefs would rescan the device folder every
   * time anything at all changed.
   */
  const autoSaveRef = useRef<(files: StatusFile[]) => void>(() => {});
  /** Frozen once, so the "new" set does not shift mid-session. */
  const sessionCutoff = useRef(previousOpenedAt);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onSelectingChange?.(false);
      if (reconcileTimer.current) {
        clearTimeout(reconcileTimer.current);
        reconcileTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Scans the device folder. Resolves true when this run was still the newest
   * one and its results were applied, false when a later scan overtook it or
   * the scan itself failed — nothing was applied either way.
   */
  const load = useCallback(async (): Promise<boolean> => {
    const seq = ++loadSeq.current;
    /** Only the newest scan may paint, or clear the spinners it did not set. */
    const newest = () => mounted.current && loadSeq.current === seq;
    /** Whether this run actually put a listing on screen. */
    let applied = false;
    try {
      const [files, savedIds] = await Promise.all([
        getStatusFiles(),
        syncSavedStatusIds(),
      ]);
      if (newest()) {
        const marked = markSaved(files, savedIds);
        setItems(marked);
        applied = true;
        // Deliberately not awaited: auto-save copies files, and the grid must
        // paint the scan the moment it is known, not when the writes finish.
        autoSaveRef.current(marked);
      }
    } catch {
      // Nothing, on purpose: the listing already on screen stands.
      //
      // A scan that FAILED is not a folder that is empty. Emptying the grid
      // here told a user whose statuses are all still on the phone that there
      // are none — and took any selection in progress down with it — because
      // one rescan, of the kind every foreground fires by itself, happened to
      // throw. The next scan is a foreground or a tap away, and before the
      // first successful one there is nothing to keep, so a first-run failure
      // still lands on the empty state, which says what to do about it. The
      // spinner and the skeleton are cleared by the `finally` regardless, so
      // this never leaves the screen looking busy.
      //
      // Keeping the listing is also why `applied` stays false here: with the
      // grid left untouched, a Refresh whose scan threw would otherwise look
      // exactly like one that worked and answer "up to date, scanned just
      // now" over a listing nobody rescanned. There is no copy for a failed
      // scan, so the button simply says nothing.
    } finally {
      if (newest()) {
        setLoading(false);
      }
      // Never gated on being the newest run. A scan that hangs on the native
      // side would otherwise leave the header spinning for the rest of the
      // session, and stopping it a beat early is only ever cosmetic.
      //
      // The guard is released with the paint, never after it: it used to be
      // cleared only by the promise `refresh` itself was holding, so a scan
      // that never answered left a button that looked idle and ignored every
      // press for the rest of the session.
      refreshingRef.current = false;
      if (mounted.current) {
        setRefreshing(false);
      }
    }
    return applied && loadSeq.current === seq;
  }, []);

  /** Ids that arrived since the previous app open and are not kept yet. */
  const newIds = useMemo(() => {
    if (sessionCutoff.current <= 0) {
      return new Set<string>();
    }
    return new Set(
      items
        .filter(i => i.timestamp > sessionCutoff.current && !i.isSaved)
        .map(i => i.id),
    );
  }, [items]);

  const savedIdSet = useMemo(
    () => new Set(items.filter(i => i.isSaved).map(i => i.id)),
    [items],
  );
  const favouriteSet = useMemo(
    () => new Set(prefs.favourites),
    [prefs.favourites],
  );

  // Stable identities: the grid memoises its rows on these.
  const isSavedId = useCallback(
    (id: string) => savedIdSet.has(id),
    [savedIdSet],
  );
  const isNewItem = useCallback(
    (item: StatusFile) => newIds.has(item.id),
    [newIds],
  );
  const isFavouriteId = useCallback(
    (id: string) => favouriteSet.has(id),
    [favouriteSet],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      photos: items.filter(i => i.type === 'image').length,
      videos: items.filter(i => i.type === 'video').length,
    }),
    [items],
  );

  /**
   * The tab the user left on is persisted, so it is read straight out of
   * prefs rather than mirrored into state — two copies of one truth is how
   * the restored value used to be overwritten by the initial render.
   */
  const filter = prefs.feedFilter;

  /**
   * Every tab's list, not just the current one: the pager mounts all three so
   * the neighbouring grid is on screen while the row is dragged. They are
   * three filtered views of one already-loaded array, so the cost is three
   * virtualised lists rather than three copies of the media.
   */
  const pages = useMemo(() => {
    const sorted = sortStatuses(items, prefs.sort);
    return {
      all: sorted,
      photos: sorted.filter(item => item.type === 'image'),
      videos: sorted.filter(item => item.type === 'video'),
    } as Record<MediaFilter, StatusFile[]>;
  }, [items, prefs.sort]);

  const itemsFor = useCallback((page: MediaFilter) => pages[page], [pages]);

  const visible = pages[filter];

  const selectedFiles = useMemo(
    () => visible.filter(i => selected.has(i.id)),
    [visible, selected],
  );

  const applySaved = useCallback(async () => {
    try {
      const savedIds = await syncSavedStatusIds();
      if (mounted.current) {
        setItems(prev => markSaved(prev, savedIds));
      }
    } catch {
      // Reconciling the markers is the one part of a save that can be retried
      // for free — the next scan does it. Letting the failure out instead made
      // every caller's own reporting collateral damage: the debounced
      // reconcile below became an unhandled rejection, both Undo handlers went
      // silent, and auto-save wrote its files without ever saying so.
    }
    // Told unconditionally. The toast outlives this screen, so an Undo pressed
    // after the user has already switched to the Library used to delete the
    // gallery copies without the list that is on screen ever hearing about it.
    // The shell owns this callback and is always mounted.
    onLibraryChanged();
  }, [onLibraryChanged]);

  /**
   * Flips the tick on immediately, without waiting for MediaStore.
   *
   * Reconciling after every single save would sweep a thousand gallery rows
   * per tap; the tick is what the user is waiting to see, and the truth
   * arrives a beat later through `scheduleReconcile`.
   */
  const markSavedLocally = useCallback((ids: string[]) => {
    // Gated here rather than at each of the three call sites: every one of
    // them is the tail of an async write the user may have walked away from.
    if (!mounted.current || ids.length === 0) {
      return;
    }
    const wanted = new Set(ids);
    setItems(prev =>
      prev.map(item =>
        wanted.has(item.id) ? { ...item, isSaved: true } : item,
      ),
    );
  }, []);

  /** Collapses a burst of saves into one gallery reconcile. */
  const scheduleReconcile = useCallback(() => {
    if (reconcileTimer.current) {
      clearTimeout(reconcileTimer.current);
    }
    reconcileTimer.current = setTimeout(() => {
      reconcileTimer.current = null;
      applySaved();
    }, 900);
  }, [applySaved]);

  /**
   * The viewer's Save. Its toasts go through the provider bridge rather than
   * this screen's hook: on Android the viewer is its own Modal window, and a
   * toast painted by the root provider would sit behind it.
   */
  const saveOne = useCallback(
    async (status: StatusFile): Promise<boolean> => {
      if (savedIdSet.has(status.id)) {
        emitToast({
          message: t('toast.alreadySaved'),
          meta: t('toast.metaSkip'),
          type: 'info',
        });
        return false;
      }
      // Ignore a repeat tap while this file is still being written.
      if (savingIds.current.has(status.id)) {
        return false;
      }
      savingIds.current.add(status.id);
      // `saveStatusToGallery` reports a failure by resolving false today, but
      // this is the viewer's Save and its double-tap: a writer that ever
      // rejected instead left the tap with no toast at all and the button
      // still reading "Save", which is the one thing the user is watching.
      // The same defensive shape `saveBatch` takes around `saveMany`.
      const ok = await saveStatusToGallery(status)
        .catch(() => false)
        .finally(() => savingIds.current.delete(status.id));
      if (!ok) {
        emitToast({ message: t('toast.saveFailed'), type: 'error' });
        return false;
      }
      markSavedLocally([status.id]);
      scheduleReconcile();
      hapticSave();
      emitToast({
        message: t('toast.saved'),
        meta: formatBytesMB(status.size),
        type: 'success',
        action: {
          label: t('common.undo'),
          onPress: () => {
            void (async () => {
              // Android 11+ asks the user to confirm the delete and they can
              // refuse, in which case the copy stays and the undo did not
              // happen — saying so beats leaving the tap looking ignored.
              const { refused, unreadable } = await deleteSavedCopiesOf([
                status,
              ]);
              await applySaved();
              // Refused at Android's dialogue, or the album could not be read:
              // either way the copy was not taken back, and the tap must say so.
              if (refused || unreadable) {
                emitToast({ message: t('toast.deleteFailed'), type: 'error' });
              }
            })();
          },
        },
      });
      return true;
    },
    [applySaved, markSavedLocally, savedIdSet, scheduleReconcile, t],
  );

  /**
   * Removes the saved copy of a status from the gallery, from the viewer.
   *
   * Only ever the copy: the original is WhatsApp's own cached file, which this
   * app holds read-only and has no business deleting — so the status stays in
   * the Feed afterwards, simply no longer ticked as saved. The viewer confirms
   * before calling this.
   */
  const deleteFromViewer = useCallback(
    (status: StatusFile) => {
      void (async () => {
        // Android 11+ puts its own dialogue in front of the delete and the
        // user can refuse it; the copy then stays, and the toast has to say so
        // rather than report a removal that did not happen.
        const result = await deleteSavedCopiesOf([status]);
        let gone = result.removed.length > 0;
        if (!gone && !result.refused) {
          /*
           * No gallery copy: the saved copy is the private one in the Vault,
           * which a Delete on a ticked status means just as much.
           *
           * Asked first, because an album the app cannot read reports nothing
           * removed without refusing. A status whose gallery copy the user
           * deleted from Files still shows its tick, and deleting it removed
           * nothing anywhere while the toast said "Removed from library".
           */
          gone =
            (await vaultHolds(status.id)) && (await removeFromVault(status.id));
        }
        await applySaved();
        if (result.refused || !gone) {
          emitToast({ message: t('toast.deleteFailed'), type: 'error' });
          return;
        }
        emitToast({
          message: tp('toast.removed', 1),
          meta: t('toast.metaDeleted'),
        });
      })();
    },
    [applySaved, t, tp],
  );

  const saveBatch = useCallback(
    async (files: StatusFile[]) => {
      if (batchRunning.current) {
        return;
      }
      // Anything already being written — by a previous tap or by auto-save —
      // is left alone: two writers on one file is how a duplicate copy lands
      // in the album.
      const pending = files.filter(
        f => !f.isSaved && !savingIds.current.has(f.id),
      );
      if (pending.length === 0) {
        showToast({
          message: t('toast.alreadySaved'),
          meta: t('toast.metaSkip'),
          type: 'info',
        });
        return;
      }

      batchRunning.current = true;
      for (const file of pending) {
        savingIds.current.add(file.id);
      }
      // The prototype only raises the overlay once there is enough work to see.
      const showProgress = pending.length > 2;
      if (showProgress) {
        setBatch({ done: 0, total: pending.length });
      }

      let saved: StatusFile[] = [];
      try {
        saved = await saveMany(pending, (done, total) => {
          if (showProgress && mounted.current) {
            setBatch({ done, total });
          }
        });
      } catch {
        // The overlay is a full-screen scrim with no dismiss of its own, and
        // the ids stay claimed for the session: a write that rejects rather
        // than reporting a failure used to leave the screen dead for good.
      } finally {
        batchRunning.current = false;
        for (const file of pending) {
          savingIds.current.delete(file.id);
        }
        if (mounted.current) {
          setBatch(null);
        }
      }

      if (reconcileTimer.current) {
        clearTimeout(reconcileTimer.current);
        reconcileTimer.current = null;
      }
      // The ticks go on before the gallery is re-read, for the same reason a
      // single save flips its own: `applySaved` sweeps every album row, and on
      // a large library that took long enough that the toast said "4 statuses
      // saved" over four tiles still showing no tick at all. The reconcile
      // right after is what makes it true.
      markSavedLocally(saved.map(f => f.id));
      await applySaved();
      /*
       * Reported whether or not this screen is still mounted. `showToast` is
       * the shell's host, which never goes away, and switching to the Library
       * while four files are still being written is exactly when the answer
       * matters: gating it here meant a save the user walked away from lost
       * both its confirmation and the Undo that came with it, and a save that
       * failed outright never said a word.
       */
      if (saved.length === 0) {
        showToast({ message: t('toast.saveFailed'), type: 'error' });
        return;
      }

      hapticSave();
      const bytes = saved.reduce((total, f) => total + f.size, 0);
      showToast({
        message:
          saved.length > 1
            ? t('toast.savedMany', { n: saved.length })
            : t('toast.saved'),
        meta: formatBytesMB(bytes),
        type: 'success',
        action: {
          label: t('common.undo'),
          onPress: () => {
            void (async () => {
              // Saving copies files into the gallery, so undoing means deleting
              // exactly those copies back out again — which the user may refuse
              // at Android's own confirmation dialog.
              const { refused, unreadable } = await deleteSavedCopiesOf(saved);
              await applySaved();
              if (refused || unreadable) {
                emitToast({ message: t('toast.deleteFailed'), type: 'error' });
              }
            })();
          },
        },
      });
    },
    [applySaved, markSavedLocally, showToast, t],
  );

  /**
   * Auto-save. Runs after every scan — first open, foreground return and the
   * manual refresh alike — so a status that arrives while the app is open is
   * kept too, which is the whole promise of the switch.
   *
   * `autoTried` is what makes that safe to run repeatedly: an id is claimed
   * before the write starts and only released if the write failed, so nothing
   * is ever saved twice and a genuine failure is still retried on the next
   * scan.
   */
  const autoSave = useCallback(
    (files: StatusFile[]) => {
      autoLatest.current = files;
      if (!prefs.autoSave) {
        return;
      }
      if (autoRunning.current) {
        // A scan that lands while an earlier run is still writing used to be
        // dropped on the floor, so a status that arrived in between was only
        // ever kept if the user happened to foreground the app again. Queue
        // it instead and pick it up the moment the current run is done.
        autoQueued.current = true;
        return;
      }
      const cutoff = sessionCutoff.current;
      // A first-ever launch has no cutoff, so every cached status would look
      // new. The promise is "from now on", not "everything on the phone".
      if (cutoff <= 0) {
        return;
      }

      const candidates = files.filter(item => {
        if (
          item.isSaved ||
          item.timestamp <= cutoff ||
          autoTried.current.has(item.id) ||
          savingIds.current.has(item.id)
        ) {
          return false;
        }
        if (prefs.autoMode === 'photos') {
          return item.type === 'image';
        }
        if (prefs.autoMode === 'videos') {
          return item.type === 'video';
        }
        return true;
      });

      if (candidates.length === 0) {
        return;
      }

      autoRunning.current = true;
      for (const item of candidates) {
        autoTried.current.add(item.id);
        savingIds.current.add(item.id);
      }
      const toVault = prefs.autoVault;

      void (async () => {
        let kept = new Set<string>();
        try {
          // Both branches report which SOURCE files were kept: pairing by
          // index rather than by count is what keeps the saved markers on the
          // right ids when one write in the middle fails.
          const results = toVault
            ? await Promise.all(candidates.map(addToVault))
            : null;
          const saved = results
            ? candidates.filter((_, i) => results[i] !== null)
            : await saveMany(candidates);
          kept = new Set(saved.map(f => f.id));

          if (saved.length === 0) {
            return;
          }
          // A vaulted status is kept, so it counts as saved; otherwise the
          // Feed goes on offering it as unsaved forever.
          if (toVault) {
            await addSavedStatusIds(saved);
          }
          await applySaved();
          /*
           * Reported whether or not this screen is still mounted, exactly as
           * the batch save is and for the same reason: `showToast` is the
           * shell's host, which never goes away. Auto-save starts with the
           * app's first scan, so opening the app and going straight to the
           * Library — while five files are still being written — is the
           * likeliest moment of all, and it was the one moment the only proof
           * the switch had done anything got dropped on the floor.
           */
          hapticSave();
          showToast({
            message: tp('toast.autoSaved', saved.length),
            meta: formatBytesMB(saved.reduce((total, f) => total + f.size, 0)),
            type: 'success',
          });
        } catch {
          // Nothing above reports a failure by rejecting today, but this run
          // is fire-and-forget: a writer that ever did would become an
          // unhandled rejection, and the release below — which is what keeps
          // a failed status retryable — would never happen.
        } finally {
          autoRunning.current = false;
          // Released here rather than on the happy path: a throw anywhere
          // above must not leave a file marked "being written" for the rest
          // of the session, and a file that failed has to stay retryable.
          for (const item of candidates) {
            savingIds.current.delete(item.id);
            if (!kept.has(item.id)) {
              autoTried.current.delete(item.id);
            }
          }
          // Whatever the scans that landed mid-run found. The flag is cleared
          // first, and every id this run kept is already claimed, so the
          // re-run either has new work or stops immediately.
          if (autoQueued.current && mounted.current) {
            autoQueued.current = false;
            autoSaveRef.current(autoLatest.current);
          }
        }
      })();
    },
    [
      applySaved,
      prefs.autoMode,
      prefs.autoSave,
      prefs.autoVault,
      showToast,
      tp,
    ],
  );

  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  // Declared after the ref above so the first scan already has the real
  // implementation to call rather than the placeholder.
  useEffect(() => {
    setLoading(true);
    load();
  }, [load, reloadSignal]);

  const refresh = useCallback(() => {
    // Guarded on the ref, not on the state: keying this callback to
    // `refreshing` handed the grid a new `onRefresh` on every scan, and the
    // guard itself was one render behind the second tap.
    if (refreshingRef.current) {
      return;
    }
    refreshingRef.current = true;
    setRefreshing(true);
    // The guard is released by whichever scan clears the spinner, inside
    // `load` — not here. Two places holding one truth is what let the button
    // go dead while looking idle.
    load().then(
      applied => {
        // A foreground return can overtake this scan. Its results are the
        // ones on screen, so "scanned just now" would be about a listing
        // nobody sees.
        if (applied && mounted.current) {
          showToast({
            message: t('toast.upToDate'),
            meta: t('toast.metaScan'),
            type: 'info',
          });
        }
      },
      () => undefined,
    );
  }, [load, showToast, t]);

  const exitSelect = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (clearSelectionSignal > 0) {
      exitSelect();
    }
  }, [clearSelectionSignal, exitSelect]);

  const onPressItem = useCallback(
    (item: StatusFile) => {
      if (selecting) {
        setSelected(prev => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
        return;
      }
      // Read through the ref so this handler survives every rescan: the grid
      // memoises its tiles on it, and a list that changes identity on each
      // scan used to re-render every tile on screen.
      const at = visibleRef.current.findIndex(i => i.id === item.id);
      if (at < 0) {
        // The list dropped this status and the grid has not repainted the
        // cell yet (a batching period is enough). The tap can only be inert —
        // but parking the anchor on it anyway meant the re-anchor effect
        // opened the viewer by itself the moment a later scan brought the
        // same filename back.
        return;
      }
      viewerIdRef.current = item.id;
      setViewerIndex(at);
    },
    [selecting],
  );

  /** Keeps the viewer on the file the user opened as the list moves under it. */
  const onViewerIndexChange = useCallback((next: number) => {
    viewerIdRef.current = visibleRef.current[next]?.id ?? null;
    setViewerIndex(next);
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
    const id = viewerIdRef.current;
    if (id === null) {
      return;
    }
    const at = visible.findIndex(i => i.id === id);
    if (at === viewerIndex) {
      return;
    }
    if (at >= 0) {
      // A status was purged or a newer one arrived: every later index moved,
      // and the viewer would otherwise be showing — and saving — its neighbour.
      setViewerIndex(at);
      return;
    }
    // The file itself is gone. Fall back to whatever now stands in its place,
    // and close when nothing does.
    const fallback = Math.min(viewerIndex, visible.length - 1);
    viewerIdRef.current = fallback >= 0 ? visible[fallback].id : null;
    setViewerIndex(fallback);
  }, [visible, viewerIndex]);

  const onLongPressItem = useCallback((item: StatusFile) => {
    // A hold is only ever how selection is ENTERED, exactly as the prototype
    // has it (`if (!this.state.selecting)`, logic.js:233). Acting on one that
    // arrives while the mode is already open threw away everything the user
    // had ticked so far and left them with just the tile under their finger.
    if (selectingRef.current) {
      return;
    }
    // The tick is the only signal that the 420ms press registered, since the
    // finger is still covering the tile that just grew a checkbox.
    hapticSelect();
    setSelecting(true);
    setSelected(new Set([item.id]));
  }, []);

  const shareFiles = useCallback(
    async (files: StatusFile[]) => {
      if (files.length === 0) {
        return;
      }
      try {
        const opened = await shareStatuses(files);
        if (opened && mounted.current) {
          emitToast({
            message:
              files.length > 1
                ? t('toast.shareOpenedN', { n: files.length })
                : t('toast.shareOpened'),
            meta: t('toast.metaSystem'),
            type: 'info',
          });
        }
      } catch {
        // Staging or the sheet itself failed; there is nothing the user can
        // act on, and the system already dismissed whatever it showed.
      }
    },
    [t],
  );

  const repost = useCallback(
    async (item: StatusFile) => {
      try {
        const sent = await shareToWhatsApp([item]);
        if (sent && mounted.current) {
          emitToast({
            message: t('toast.reposted'),
            meta: t('toast.metaRepost'),
            type: 'success',
          });
        }
      } catch (error) {
        if (!mounted.current) {
          return;
        }
        // Nothing happened on screen, so silence would read as a dead button.
        emitToast({
          message: t(
            isWhatsAppMissing(error)
              ? 'toast.whatsappMissing'
              : 'toast.repostFailed',
          ),
          type: 'warning',
        });
      }
    },
    [t],
  );

  const moveToVault = useCallback(
    async (files: StatusFile[]) => {
      let moved: StatusFile[] = [];
      let sources: StatusFile[] = [];
      /** Sources a previous Save had already published to the album. */
      let published = new Set<string>();
      /** False once a public copy is proved to still be in the gallery. */
      let nowPrivate = true;
      /*
       * Claimed for the whole move, the way a batch save claims them. Copying
       * into the Vault is seconds of work, and auto-save and Save both treat
       * an unclaimed, still-unmarked status as a candidate: a refresh during
       * the copy published the very files being made private, and the toast
       * below still said "private" because it was reading a snapshot taken
       * before the tap.
       */
      for (const file of files) {
        savingIds.current.add(file.id);
      }
      try {
        const results = await Promise.all(files.map(addToVault));
        moved = results.filter((f): f is StatusFile => f !== null);
        // Marked by index, not by count: `slice(0, moved.length)` credited the
        // wrong ids as soon as one file in the middle failed to copy.
        sources = files.filter((_, i) => results[i] !== null);

        /*
         * Vaulting is a privacy action. A status that had been saved earlier
         * still has its copy sitting in the public gallery album, so leaving
         * it there made "moved to Vault · private" a false claim and listed
         * the same status twice in the Library.
         *
         * Asked about every source, not only the ones the pre-tap snapshot
         * called saved: the album is read fresh inside this call, so a copy
         * published while the Vault write was still running is found too. It
         * no-ops cleanly when there is nothing public to take back.
         *
         * Android asks the user to confirm deleting media it did not write,
         * and the answer can be Deny. Ignoring that reported "private" over a
         * copy anyone could scroll past — the one claim this feature must
         * never get wrong. An album it could not read at all is the same
         * kind of not-knowing, so it does not earn the claim either.
         *
         * Only the statuses whose gallery copy really went count as
         * "published": those are the ones an undo has to put back. A status
         * saved straight into the Vault has no gallery copy, and counting it
         * here made the undo copy the private file out into the gallery.
         */
        if (sources.length > 0) {
          const result = await deleteSavedCopiesOf(sources);
          nowPrivate = !result.refused && !result.unreadable;
          published = new Set(result.removed);
        }
        if (sources.length > 0) {
          // Re-stated after the album delete above, which drops the markers:
          // the status is still kept, it is just kept privately now.
          await addSavedStatusIds(sources);
        }
        await applySaved();
      } catch {
        // Fall through: the toast below reports whatever actually landed.
      } finally {
        for (const file of files) {
          savingIds.current.delete(file.id);
        }
      }
      // Reported even if the user has already left the Feed, for the same
      // reason as the batch save above: the Undo lives in the toast, and the
      // shell's toast host outlives this screen.
      if (moved.length === 0) {
        showToast({ message: t('toast.saveFailed'), type: 'error' });
        return;
      }
      showToast({
        message: nowPrivate
          ? tp('toast.movedToVault', moved.length)
          : t('toast.vaultedStillPublic'),
        meta: t('toast.metaPrivate'),
        type: nowPrivate ? 'success' : 'warning',
        action: {
          label: t('common.undo'),
          onPress: () => {
            void (async () => {
              try {
                for (let i = 0; i < moved.length; i++) {
                  // Undo has to put back exactly what the move took away, so
                  // a status that was in the album before goes back into it.
                  // The vault copy is only dropped once the album copy is
                  // actually back: otherwise a failed re-publish would leave
                  // the kept status in neither place.
                  if (
                    published.has(sources[i].id) &&
                    !(await saveStatusToGallery(moved[i]))
                  ) {
                    continue;
                  }
                  await removeFromVault(moved[i].id);
                }
                const dropped = sources.filter(f => !published.has(f.id));
                if (dropped.length > 0) {
                  await removeSavedStatusIds(dropped);
                }
                await applySaved();
              } catch {
                // The next scan reconciles whatever is actually on disk.
              }
            })();
          },
        },
      });
    },
    // `savedIdSet` is gone from the body: the album is read fresh inside
    // `deleteSavedCopiesOf` now, which is the point of the change. Keeping it
    // here would re-key this callback on every scan for nothing.
    [applySaved, showToast, t, tp],
  );

  const toggleFavourite = useCallback(
    (item: StatusFile) => {
      const on = favouriteSet.has(item.id);
      onPrefsChange({
        favourites: on
          ? prefs.favourites.filter(id => id !== item.id)
          : [...prefs.favourites, item.id],
      });
      // Favouriting keeps the file too, as the prototype does — a starred
      // status the Library cannot show would be a dead entry.
      if (!on && !savedIdSet.has(item.id) && !savingIds.current.has(item.id)) {
        savingIds.current.add(item.id);
        saveStatusToGallery(item)
          .then(ok => {
            if (ok && mounted.current) {
              markSavedLocally([item.id]);
              scheduleReconcile();
            }
          })
          .finally(() => savingIds.current.delete(item.id))
          // Nothing here is awaited, so a writer that reports a failure by
          // rejecting rather than by resolving false has nobody to hand it to:
          // it became a bare unhandled rejection. The star itself is already
          // recorded, and the next scan reconciles whether the copy landed.
          .catch(() => undefined);
      }
      emitToast({
        message: t(on ? 'toast.favRemoved' : 'toast.favAdded'),
        meta: t('toast.metaLibrary'),
        type: 'success',
      });
    },
    [
      favouriteSet,
      markSavedLocally,
      onPrefsChange,
      prefs.favourites,
      savedIdSet,
      scheduleReconcile,
      t,
    ],
  );

  /**
   * WhatsApp's launcher activity, by package. Not the `whatsapp://send` deep
   * link: with nothing to send, WhatsApp answers that with a contact picker
   * that finishes itself at once, so the button looked like it did nothing.
   */
  const openWhatsApp = useCallback(async () => {
    try {
      const target = await messagingPackage();
      if (target && (await openApp(target))) {
        showToast({
          message: t('toast.openingWhatsApp'),
          meta: t('toast.metaHandoff'),
          type: 'info',
        });
        return;
      }
      showToast({ message: t('toast.whatsappMissing'), type: 'warning' });
    } catch {
      showToast({ message: t('toast.whatsappMissing'), type: 'warning' });
    }
  }, [showToast, t]);

  /**
   * Counted from the intersection with the visible list, not from the raw set:
   * the header, the tray and Save must all agree on how many items an action
   * is about to touch.
   */
  const selectedCount = selectedFiles.length;
  const allSelected = visible.length > 0 && selectedCount === visible.length;
  const selectedBytes = useMemo(
    () => selectedFiles.reduce((total, f) => total + f.size, 0),
    [selectedFiles],
  );
  /*
   * Openness is the anchor's, not the raw index's.
   *
   * The re-anchor effect below cannot run until after the commit that shrank
   * the list, so for that one commit `viewerIndex` can still point past the
   * end — which any purge at or above the status being viewed produces, and a
   * foreground rescan produces one whenever WhatsApp expires a status. Gating
   * on `viewerIndex < visible.length` therefore tore the whole viewer down and
   * built it again a frame later: the Modal unmounts, so the video restarted
   * from zero, the zoom dropped and the detail block re-collapsed under the
   * user. Staying open on a clamped index shows the neighbour for that frame
   * instead, and the effect puts the anchor back the moment it runs.
   */
  const viewerOpen = viewerIndex >= 0 && visible.length > 0;
  const viewerAt = viewerOpen ? Math.min(viewerIndex, visible.length - 1) : 0;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(visible.map(i => i.id)));
  }, [allSelected, visible]);

  const enterSelect = useCallback(() => {
    setSelected(new Set());
    setSelecting(true);
  }, []);

  /**
   * Read through a ref so the grid's swipe handler keeps one identity: passing
   * `changeFilter` directly rebuilt the responder on every filter change.
   */
  const changeFilterRef = useRef<(next: MediaFilter) => void>(() => {});

  /** The pager works in indices; the screen stores the filter itself. */
  const pageToFilter = useCallback(
    (index: number) => changeFilterRef.current(FILTER_ORDER[index]),
    [],
  );

  const changeFilter = useCallback(
    (next: MediaFilter) => {
      onPrefsChange({ feedFilter: next });
      setSelected(new Set());
    },
    [onPrefsChange],
  );

  useEffect(() => {
    changeFilterRef.current = changeFilter;
  }, [changeFilter]);

  const pickSort = useCallback(
    (value: SortOrder) => onPrefsChange({ sort: value }),
    [onPrefsChange],
  );

  const openSort = useCallback(() => setSortOpen(true), []);
  const closeSort = useCallback(() => setSortOpen(false), []);
  const closeViewer = useCallback(() => {
    // Cleared first, or the re-anchor effect would find the id still parked
    // and pull the viewer straight back open on the next scan.
    viewerIdRef.current = null;
    setViewerIndex(-1);
  }, []);
  const openGuide = useCallback(() => setGuideOpen(true), []);

  const saveSelected = useCallback(() => {
    const files = selectedFiles;
    exitSelect();
    saveBatch(files);
  }, [exitSelect, saveBatch, selectedFiles]);

  const vaultSelected = useCallback(() => {
    const files = selectedFiles;
    exitSelect();
    moveToVault(files);
  }, [exitSelect, moveToVault, selectedFiles]);

  const shareSelected = useCallback(
    () => shareFiles(selectedFiles),
    [shareFiles, selectedFiles],
  );

  const shareOne = useCallback(
    (item: StatusFile) => shareFiles([item]),
    [shareFiles],
  );

  const emptyCta = useMemo(
    () =>
      hasFolder
        ? { label: t('empty.openWhatsApp'), onPress: openWhatsApp }
        : needsFolderPicker()
        ? // Without the SAF grant there is nothing to open yet, so the CTA
          // becomes the picker the prototype never had to model.
          { label: t('guide.open'), onPress: openGuide }
        : // Below Android 11 the missing piece is the storage permission.
          { label: t('empty.allowStorage'), onPress: onRequestFolder },
    [hasFolder, onRequestFolder, openGuide, openWhatsApp, t],
  );

  const sortOptions = useMemo(
    () =>
      [
        { value: 'new', label: t('sort.new') },
        { value: 'old', label: t('sort.old') },
        { value: 'big', label: t('sort.big') },
        { value: 'type', label: t('sort.type') },
      ] as Array<{ value: SortOrder; label: string }>,
    [t],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {selecting ? (
        <SelectionHeader
          count={selectedCount}
          sizeLabel={formatBytesMB(selectedBytes)}
          allSelected={allSelected}
          onExit={exitSelect}
          onToggleAll={toggleAll}
        />
      ) : (
        <View style={tinted ? { backgroundColor: theme.topBar } : null}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text
                style={[type.brand, { color: tinted ? theme.onTopBar : theme.textSoft }]}
                numberOfLines={1}
              >
                {t('brand.name')}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {prefs.autoSave ? <AutoChip onPress={onOpenTools} onTint={tinted} /> : null}
              <RoundButton
                icon="refresh"
                onPress={refresh}
                active={refreshing}
                spinning={refreshing}
                strokeWidth={1.9}
                label={t('a11y.refresh')}
                onTint={tinted}
              />
              <RoundButton
                icon="sort"
                onPress={openSort}
                strokeWidth={1.9}
                label={t('a11y.sort')}
                onTint={tinted}
              />
              <RoundButton
                icon="gear"
                onPress={onOpenSettings ?? onOpenTools}
                strokeWidth={1.8}
                label={t('a11y.settings')}
                onTint={tinted}
              />
            </View>
          </View>

          <FilterTabs
            value={filter}
            counts={counts}
            onChange={changeFilter}
            onSelect={enterSelect}
            selectLabel={t('common.select')}
            tinted={tinted}
          />
        </View>
      )}

      {loading && items.length === 0 ? (
        <GridSkeleton />
      ) : (
        // Every tab is mounted side by side, so the next list is already on
        // screen as the row is dragged rather than appearing once it lands.
        <Pager
          index={FILTER_ORDER.indexOf(filter)}
          count={FILTER_ORDER.length}
          onIndexChange={pageToFilter}
          enabled={!selecting}
          style={styles.screen}
        >
          {FILTER_ORDER.map(page => (
            <StatusGrid
              key={page}
              items={itemsFor(page)}
              context="feed"
              selecting={selecting}
              selectedIds={selected}
              isSaved={isSavedId}
              isNew={isNewItem}
              onPress={onPressItem}
              onLongPress={onLongPressItem}
              refreshing={refreshing}
              onRefresh={refresh}
              bottomInset={0}
              empty={
                <EmptyState
                  title={t(
                    hasFolder ? 'empty.feedTitle' : 'empty.noFolderTitle',
                  )}
                  // Without the grant the folder is not empty, it is unread:
                  // telling the user to go and view a status sent them to do
                  // something that could not help.
                  body={t(
                    hasFolder
                      ? 'empty.feedBody'
                      : needsFolderPicker()
                      ? 'empty.noFolderBody'
                      : // Below Android 11 there is no folder to point at: the
                        // button beside this asks for the storage permission,
                        // and the body has to describe that same thing.
                        'empty.noStorageBody',
                  )}
                  cta={emptyCta}
                />
              }
            />
          ))}
        </Pager>
      )}

      {selecting ? (
        <SelectionTray
          context="feed"
          count={selectedCount}
          onPrimary={saveSelected}
          onVault={vaultSelected}
          onShare={shareSelected}
        />
      ) : null}

      <OptionSheet
        visible={sortOpen}
        title={t('common.sortBy')}
        selected={prefs.sort}
        options={sortOptions}
        onSelect={pickSort}
        onClose={closeSort}
      />

      <BatchProgress
        visible={batch !== null}
        done={batch?.done ?? 0}
        total={batch?.total ?? 0}
      />

      <PermissionGuide
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenPicker={() => {
          setGuideOpen(false);
          onRequestFolder();
        }}
      />

      <StatusViewer
        visible={viewerOpen}
        items={visible}
        index={viewerAt}
        onClose={closeViewer}
        onIndexChange={onViewerIndexChange}
        isSaved={isSavedId}
        isFavourite={isFavouriteId}
        onSave={saveOne}
        onToggleFavourite={toggleFavourite}
        onShare={shareOne}
        onRepost={repost}
        onDelete={deleteFromViewer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // padding: 6px 20px 0
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 6,
    paddingHorizontal: 20,
  },
  // flex-direction: column; gap: 5px; min-width: 0 — the title column, which
  // on the Feed holds only the brand line (there is no large title here).
  headerText: { gap: 5, minWidth: 0, flexShrink: 1 },
  // flex: none — the cluster keeps its width and the brand line ellipsises.
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  autoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: size.headerBtn,
    paddingHorizontal: 11,
    borderRadius: radius.xl,
  },
});

export default FeedScreen;
