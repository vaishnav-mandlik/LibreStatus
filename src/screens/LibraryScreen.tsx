import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  TOAST_BOTTOM,
  useFeedback,
  useToastBottom,
} from '../context/FeedbackContext';
import { Chip, EASE, EmptyState, Pager, RoundButton } from '../components/ui';
import { FilterTabs } from '../components/FilterTabs';
import { StatusGrid } from '../components/StatusGrid';
import { GridSkeleton } from '../components/GridSkeleton';
import { SelectionHeader, SelectionTray } from '../components/SelectionBar';
import { OptionSheet } from '../components/Sheet';
import { ConfirmSheet } from '../components/ConfirmSheet';
import StatusViewer from '../components/StatusViewer';
import { space, type } from '../theme/tokens';
import { formatBytesMB, sortStatuses } from '../utils/format';
import {
  deleteSavedStatuses,
  getSavedStatusFiles,
  saveStatusToGallery,
  peekGalleryAccess,
  requestGalleryAccess,
} from '../utils/statusManager';
import type { MediaAccess } from '../utils/permissions';
import {
  addToVault,
  listVault,
  matchesVaultOrigin,
  removeFromVault,
  vaultOriginNames,
} from '../utils/vault';
import { hapticSelect } from '../utils/haptics';
import {
  isWhatsAppMissing,
  shareStatuses,
  shareToWhatsApp,
} from '../utils/share';
import type { Collection, MediaFilter, SortOrder, StatusFile } from '../types';
import type { Prefs } from '../utils/prefs';

/**
 * How long the field waits before the list re-filters.
 *
 * The TextInput stays fully controlled, so typing is instant; only the search
 * that walks the whole library — matching stamps, media words and formatted
 * dates per file — is held back, which is what used to make every keystroke
 * feel like it landed a frame late on a big library.
 */

/**
 * The gallery album and the vault, with one entry per id.
 *
 * The two lists are meant to be disjoint — vaulting deletes the album copy —
 * but a delete that failed, or an undo that only got half way, leaves the same
 * file listed by both. Their ids are the file name in either case, so the
 * union would show one status as two identical tiles that select, count and
 * delete as one. The first entry wins, which keeps the album copy: it is the
 * one "All saved" also lists.
 *
 * Returns the input array untouched when there is nothing to drop, so the
 * memos built on it keep their identity.
 */
export const uniqueById = (files: StatusFile[]): StatusFile[] => {
  const byId = new Map<string, StatusFile>();
  for (const file of files) {
    if (!byId.has(file.id)) {
      byId.set(file.id, file);
    }
  }
  return byId.size === files.length ? files : Array.from(byId.values());
};

/** The prototype's `animation: fadeIn .2s both` on the collection chips block. */
const FadeIn: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(value, {
      toValue: 1,
      duration: 200,
      easing: EASE,
      useNativeDriver: true,
    });
    run.start();
    // Entering selection replaces this whole block, and a long-press lands
    // well inside the 200ms: an unstopped run keeps driving a view that has
    // already gone.
    return () => run.stop();
  }, [value]);
  return (
    <Animated.View style={[style, { opacity: value }]}>
      {children}
    </Animated.View>
  );
};

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

export interface LibraryScreenProps {
  prefs: Prefs;
  onPrefsChange: (patch: Partial<Prefs>) => void;
  /** Bumped when the app returns to the foreground. */
  reloadSignal: number;
  /** Bumped when our own data changed. */
  dataVersion: number;
  onLibraryChanged: () => void;
  /** Lets the shell hide the tab bar while a multi-select is active. */
  onSelectingChange?: (selecting: boolean) => void;
  /** Bumped by the shell when hardware back should cancel a selection. */
  clearSelectionSignal?: number;
  /** Opens Settings from the header; the button is hidden when absent. */
  onOpenSettings?: () => void;
  /** Sends the user to the Feed, which is where anything to save comes from. */
  onOpenFeed?: () => void;
}

/**
 * Saved statuses: the gallery album plus the vault, split into the All saved /
 * Favourites / Vault collections and searchable by stamp or media word.
 *
 * The header, search field and collection chips are the design's `flex:none`
 * block — they stay put while only the grid scrolls, and selection mode
 * replaces the whole block with the selection header.
 */
const LibraryScreen: React.FC<LibraryScreenProps> = ({
  prefs,
  onPrefsChange,
  reloadSignal,
  dataVersion,
  onLibraryChanged,
  onSelectingChange,
  clearSelectionSignal = 0,
  onOpenSettings,
  onOpenFeed,
}) => {
  const { theme, isDark } = useTheme();
  // The light theme's green top bar, matching the Feed; see FeedScreen.
  const tinted = !isDark;
  const { t, tp } = useLanguage();
  const { showToast } = useFeedback();

  const [saved, setSaved] = useState<StatusFile[]>([]);
  const [vault, setVault] = useState<StatusFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Same guard the Feed uses: state is a render behind two taps in one frame. */
  const refreshingRef = useRef(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState(-1);
  /**
   * What MediaStore lets the Library see. Starts optimistic so the empty
   * state does not flash its permission copy for the frame before the first
   * read answers; a real 'none' arrives with the first listing.
   */
  const [access, setAccess] = useState<MediaAccess>('full');
  /** Files staged for deletion, awaiting confirmation. */
  const [pendingDelete, setPendingDelete] = useState<StatusFile[] | null>(null);
  /**
   * How many the confirm sheet is asking about.
   *
   * Held apart from `pendingDelete` because the sheet stays mounted through
   * its exit animation: taking the count from a list that is already null
   * retitled the sheet "Remove 0 statuses?" as it slid away.
   */
  const [pendingCount, setPendingCount] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);

  // The toast clears the selection tray while one is up, and drops back to the
  // nav position when selection ends.
  useToastBottom(selecting ? TOAST_BOTTOM.selecting : undefined);

  /** Read by the long-press handler, which must stay a stable identity. */
  const selectingRef = useRef(false);

  useEffect(() => {
    selectingRef.current = selecting;
    onSelectingChange?.(selecting);
  }, [selecting, onSelectingChange]);

  /**
   * Collection and filter tab are persisted, so they are read straight out of
   * prefs rather than mirrored into state: two copies of one truth is how the
   * restored value used to be overwritten by the first render.
   */
  const collection = prefs.libraryCollection;
  const filter = prefs.libraryFilter;

  const mounted = useRef(true);
  /**
   * Sequence number of the newest `load`. Refresh, the foreground signal and
   * every action that ends in a reload can have reads in flight at once, and
   * they do not finish in the order they started: without this the slower,
   * older read wins the last `setSaved` and the file the user just deleted is
   * back on screen until something else triggers a reload.
   */
  const loadSeq = useRef(0);
  /**
   * What each source listed on the previous pass.
   *
   * A favourite is only unstarred when the source that used to hold the file
   * answers again, with files, and without it. `getSavedStatusFiles` and
   * `listVault` both report a failure as an empty list — a denied media
   * permission reads exactly like an empty album — so "nothing came back" must
   * never be taken as proof that every favourite is gone.
   */
  const seenRef = useRef<{ gallery: Set<string>; vault: Set<string> } | null>(
    null,
  );
  /**
   * `load` prunes favourites whose files are gone, but must not depend on the
   * favourites list: that made every toggle change load's identity and refetch
   * the whole gallery and vault.
   */
  const favouritesRef = useRef<string[]>(prefs.favourites);
  const onPrefsChangeRef = useRef(onPrefsChange);
  useEffect(() => {
    favouritesRef.current = prefs.favourites;
    onPrefsChangeRef.current = onPrefsChange;
  }, [prefs.favourites, onPrefsChange]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onSelectingChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [gallery, vaultFiles, heldAccess] = await Promise.all([
        getSavedStatusFiles(),
        listVault(),
        peekGalleryAccess(),
      ]);
      // A read that a newer one has already overtaken is dropped whole: its
      // lists are older than what is on screen.
      if (!mounted.current || seq !== loadSeq.current) {
        return;
      }
      setAccess(heldAccess);
      /*
       * Deduped per source, not only across the two.
       *
       * The album read names every file by its own filename and deliberately
       * keeps a same-named file from the current and the legacy album as two
       * entries, so one source alone can hand back two items sharing an id.
       * Everything downstream keys on that id — the grid's React key, the
       * selection Set, the favourites list, the index the viewer opens — so a
       * collision made one tap select two tiles, counted "2 selected", offered
       * to delete both and opened the wrong file from the second one.
       */
      const album = uniqueById(gallery);
      const vaulted = uniqueById(vaultFiles);
      setSaved(album);
      setVault(vaulted);

      const galleryIds = new Set(album.map(f => f.id));
      const vaultIds = new Set(vaulted.map(f => f.id));
      const seen = seenRef.current;
      seenRef.current = { gallery: galleryIds, vault: vaultIds };

      if (seen) {
        const gone = (id: string): boolean =>
          !galleryIds.has(id) &&
          !vaultIds.has(id) &&
          ((seen.gallery.has(id) && galleryIds.size > 0) ||
            (seen.vault.has(id) && vaultIds.size > 0));
        const current = favouritesRef.current;
        if (current.some(gone)) {
          onPrefsChangeRef.current({
            favourites: current.filter(id => !gone(id)),
          });
        }
      }
    } finally {
      if (mounted.current && seq === loadSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadSignal, dataVersion]);

  const favourites = useMemo(
    () => new Set(prefs.favourites),
    [prefs.favourites],
  );

  /** Everything the library holds, album and vault, counted once. */
  const library = useMemo(
    () => uniqueById(saved.concat(vault)),
    [saved, vault],
  );

  const favouriteFiles = useMemo(
    () => library.filter(f => favourites.has(f.id)),
    [library, favourites],
  );

  /** The collection on screen: the filter tabs count what it holds. */
  const pool = useMemo(
    () =>
      collection === 'vault'
        ? vault
        : collection === 'fav'
        ? favouriteFiles
        : saved,
    [collection, saved, vault, favouriteFiles],
  );

  const favouriteCount = favouriteFiles.length;

  const counts = useMemo(
    () => ({
      all: pool.length,
      photos: pool.filter(i => i.type === 'image').length,
      videos: pool.filter(i => i.type === 'video').length,
    }),
    [pool],
  );

  /**
   * Every tab's list, not just the current one: the pager mounts all three so
   * the neighbouring grid is already on screen while the row is dragged. They
   * are three filtered views of one array, so this costs three virtualised
   * lists rather than three copies of the media.
   */
  const pages = useMemo(() => {
    const sorted = sortStatuses(pool, prefs.sort);
    return {
      all: sorted,
      photos: sorted.filter(item => item.type === 'image'),
      videos: sorted.filter(item => item.type === 'video'),
    } as Record<MediaFilter, StatusFile[]>;
  }, [pool, prefs.sort]);

  const itemsFor = useCallback((page: MediaFilter) => pages[page], [pages]);

  const visible = pages[filter];

  /**
   * The current filtered list, so `onPressItem` can keep one identity.
   *
   * The grid memoises its tiles on the handlers it is given (Tile.tsx compares
   * `onPress` by identity), and this list gets a new array on every reload
   * and every sort change — none of which changes what a tap on a tile should
   * do. Reading it through a ref is what the Feed already
   * does for the same handler.
   */
  const visibleRef = useRef<StatusFile[]>(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const metaLabel = useMemo(() => {
    const bytes = library.reduce((total, f) => total + f.size, 0);
    return tp('library.meta', library.length, { size: formatBytesMB(bytes) });
  }, [library, tp]);

  const selectedFiles = useMemo(
    () => visible.filter(f => selected.has(f.id)),
    [visible, selected],
  );

  const selectedSize = useMemo(
    () => formatBytesMB(selectedFiles.reduce((total, f) => total + f.size, 0)),
    [selectedFiles],
  );

  /**
   * Counted from the intersection with the visible list, not from the raw set:
   * a reload or a collection change while a selection is up can leave ids
   * selected that the grid no longer shows, and the header used to claim more
   * items than Delete would actually touch.
   */
  const selectedCount = selectedFiles.length;
  const allSelected = visible.length > 0 && selectedCount === visible.length;

  /*
   * An open viewer whose list has emptied must forget where it was.
   *
   * The viewer unmounts itself once there is nothing to show — un-starring the
   * last favourite from inside it does exactly that — but the index it was
   * left on stayed behind. The moment the list filled again (tapping another
   * collection chip, a rescan finding a file) the Modal reappeared over the
   * grid on a status the user never opened.
   */
  useEffect(() => {
    if (viewerIndex >= 0 && visible.length === 0) {
      setViewerIndex(-1);
    }
  }, [viewerIndex, visible.length]);

  const exitSelect = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (clearSelectionSignal > 0) {
      exitSelect();
    }
  }, [clearSelectionSignal, exitSelect]);

  /**
   * The empty state's CTA. One of the two places the permission is ever asked
   * for, and the one with the clearest reason on screen: an empty Library that
   * may be hiding saves from before a reinstall.
   */
  const allowGallery = useCallback(() => {
    void (async () => {
      const next = await requestGalleryAccess();
      if (!mounted.current) {
        return;
      }
      setAccess(next);
      if (next !== 'none') {
        await load();
      }
    })();
  }, [load]);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) {
      return;
    }
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await load();
    } finally {
      refreshingRef.current = false;
      if (mounted.current) {
        setRefreshing(false);
      }
    }
    if (mounted.current) {
      showToast({ message: t('toast.upToDate'), meta: t('toast.metaScan') });
    }
  }, [load, showToast, t]);

  const removeFiles = useCallback(
    async (files: StatusFile[]) => {
      const inGallery = files.filter(f => !f.inVault);
      let ok = true;
      // Only the files that really went. A star belongs to a file, so a delete
      // that failed must leave the file starred: unstarring on intent alone
      // took the favourite away from a status that is still in the library,
      // and nothing puts it back.
      const removed: StatusFile[] = [];
      if (inGallery.length > 0) {
        ok = await deleteSavedStatuses(inGallery);
        if (ok) {
          removed.push(...inGallery);
        }
      }
      for (const file of files.filter(f => f.inVault)) {
        if (await removeFromVault(file.id)) {
          removed.push(file);
        } else {
          ok = false;
        }
      }

      // A deleted status must not stay starred. `load` prunes favourites whose
      // files have vanished, but only on its next pass: doing it here means
      // the Favourites count is right the moment the toast appears, and it
      // still holds if the reload fails.
      const gone = new Set(removed.map(f => f.id));
      const stars = favouritesRef.current;
      if (stars.some(id => gone.has(id))) {
        // The ref is written too, not just the pref: the reload below reads it
        // again before React has had a chance to hand the new prefs back.
        const kept = stars.filter(id => !gone.has(id));
        favouritesRef.current = kept;
        onPrefsChangeRef.current({ favourites: kept });
      }

      await load();
      if (!mounted.current) {
        return;
      }
      onLibraryChanged();

      if (!ok) {
        showToast({ message: t('toast.deleteFailed'), type: 'error' });
        return;
      }
      // No Undo pill here: the bytes are gone from disk, so there is nothing
      // the pill could put back.
      showToast({
        message: tp('toast.removed', files.length),
        meta: t('toast.metaDeleted'),
      });
    },
    [load, onLibraryChanged, showToast, t, tp],
  );

  /**
   * Copies vault files back out into the gallery album and drops the vault
   * original. Returns the ones that made it; the rest stay vaulted.
   *
   * Shared by the padlock's restore and by the undo of a move into the vault,
   * so the two cannot drift apart.
   */
  const liftFromVault = useCallback(
    async (files: StatusFile[]): Promise<StatusFile[]> => {
      const restored: StatusFile[] = [];
      for (const file of files) {
        try {
          // Copy first, unlink second: a failed write must never be the reason
          // the only copy of a file disappeared.
          if (await saveStatusToGallery(file)) {
            await removeFromVault(file.id);
            restored.push(file);
          }
        } catch {
          // A file that threw is a file that stayed vaulted, which is exactly
          // what a false return means. Letting the throw out of here abandoned
          // the rest of the selection mid-loop and left the caller — which has
          // already closed the selection — with an unhandled rejection and no
          // toast at all, so the padlock read as a button that does nothing.
        }
      }
      return restored;
    },
    [],
  );

  const moveToVault = useCallback(
    async (files: StatusFile[]) => {
      const movable = files.filter(f => !f.inVault);
      if (movable.length === 0) {
        return;
      }
      const moved: StatusFile[] = [];
      const sources: StatusFile[] = [];
      for (const file of movable) {
        const vaulted = await addToVault(file);
        if (vaulted) {
          moved.push(vaulted);
          sources.push(file);
        }
      }
      /*
       * Whether the public copies actually went. Android asks the user to
       * confirm deleting media, and Deny leaves the file in the gallery — so
       * this decides between "moved to Vault" and the honest warning. Claiming
       * privacy over a copy anyone can still scroll past is the one thing this
       * feature must never do.
       */
      let nowPrivate = true;
      if (sources.length > 0) {
        nowPrivate = await deleteSavedStatuses(sources);
      }
      await load();
      if (!mounted.current) {
        return;
      }
      if (moved.length === 0) {
        // Nothing was copied, so nothing was deleted either: every file is
        // exactly where it was. Saying so is the point — the padlock had
        // already closed the selection, so silence read as a dead button.
        showToast({ message: t('toast.saveFailed'), type: 'error' });
        return;
      }
      onLibraryChanged();

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
              await liftFromVault(moved);
              await load();
              if (mounted.current) {
                onLibraryChanged();
              }
            })();
          },
        },
      });
    },
    [liftFromVault, load, onLibraryChanged, showToast, t, tp],
  );

  /**
   * Puts files back into the vault after a restore was undone.
   *
   * The vault original is gone by then, so the copy the restore left in the
   * gallery album is the source. It is matched by name — the same assumption
   * `deleteSavedCopiesOf` makes about the album — and a miss simply leaves the
   * file in the gallery rather than losing it.
   */
  const revault = useCallback(
    async (restored: StatusFile[]) => {
      const names = vaultOriginNames(restored);
      const gallery = await getSavedStatusFiles();
      const copies = gallery.filter(g => matchesVaultOrigin(names, g));
      for (const copy of copies) {
        if (await addToVault(copy)) {
          await deleteSavedStatuses([copy]);
        }
      }
      await load();
      if (mounted.current) {
        onLibraryChanged();
      }
    },
    [load, onLibraryChanged],
  );

  /**
   * The Vault collection's padlock button.
   *
   * Moving a vault file "to the Vault" is a no-op, so in that collection the
   * button does the opposite: the file goes back out into the gallery album
   * where the rest of the library lives, and out of the private directory.
   */
  const restoreFromVault = useCallback(
    async (files: StatusFile[]) => {
      const vaulted = files.filter(f => f.inVault);
      if (vaulted.length === 0) {
        return;
      }
      const restored = await liftFromVault(vaulted);

      await load();
      if (!mounted.current) {
        return;
      }
      onLibraryChanged();

      if (restored.length === 0) {
        showToast({ message: t('toast.saveFailed'), type: 'error' });
        return;
      }
      showToast({
        message: tp('toast.restored', restored.length),
        meta: t('toast.metaLibrary'),
        action: {
          label: t('common.undo'),
          onPress: () => {
            void revault(restored);
          },
        },
      });
    },
    [liftFromVault, load, onLibraryChanged, revault, showToast, t, tp],
  );

  const shareFiles = useCallback(
    async (files: StatusFile[]) => {
      if (files.length === 0) {
        return;
      }
      try {
        const opened = await shareStatuses(files);
        if (opened && mounted.current) {
          showToast({
            message:
              files.length > 1
                ? t('toast.shareOpenedN', { n: files.length })
                : t('toast.shareOpened'),
            meta: t('toast.metaSystem'),
          });
        }
      } catch {
        // Cancellation already resolves false; a real failure leaves the sheet
        // unopened, which the user can see, and there is no copy for it.
      }
    },
    [showToast, t],
  );

  const repost = useCallback(
    async (item: StatusFile) => {
      try {
        const sent = await shareToWhatsApp([item]);
        if (sent && mounted.current) {
          showToast({
            message: t('toast.reposted'),
            meta: t('toast.metaRepost'),
          });
        }
      } catch (error) {
        if (!mounted.current) {
          return;
        }
        // Nothing happened on screen, so silence would read as a dead button.
        showToast({
          message: t(
            isWhatsAppMissing(error)
              ? 'toast.whatsappMissing'
              : 'toast.repostFailed',
          ),
          type: 'warning',
        });
      }
    },
    [showToast, t],
  );

  const toggleFavourite = useCallback(
    (status: StatusFile) => {
      const next = new Set(prefs.favourites);
      const on = next.has(status.id);
      if (on) {
        next.delete(status.id);
      } else {
        next.add(status.id);
      }
      // The ref is written too, not just the pref: `load` prunes from
      // `favouritesRef`, and a read already in flight lands before React has
      // handed the new prefs back — pruning the stale copy wrote this star
      // straight back out again, so the heart the user just filled emptied
      // itself a moment after the toast said it was added.
      const list = Array.from(next);
      favouritesRef.current = list;
      onPrefsChange({ favourites: list });
      showToast({
        message: t(on ? 'toast.favRemoved' : 'toast.favAdded'),
        meta: t('toast.metaLibrary'),
      });
    },
    [prefs.favourites, onPrefsChange, showToast, t],
  );

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
      // Read through the ref so this handler survives every reload, keystroke
      // and sort: the grid memoises its tiles on it, and a list that changed
      // identity re-rendered every tile on screen.
      const at = visibleRef.current.findIndex(i => i.id === item.id);
      if (at < 0) {
        // The list dropped this status and the grid has not repainted the cell
        // yet. Opening the viewer on -1 is the closed state anyway.
        return;
      }
      setViewerIndex(at);
    },
    [selecting],
  );

  const onLongPressItem = useCallback((item: StatusFile) => {
    // A hold is only ever how selection is ENTERED, exactly as the prototype
    // has it (`if (!this.state.selecting)`, logic.js:233) and exactly as the
    // Feed's identical handler does. Acting on one that arrives while the mode
    // is already open threw away everything the user had ticked so far and
    // left them with just the tile under their finger — the whole selection
    // lost to a press that was only meant to be a tap.
    if (selectingRef.current) {
      return;
    }
    // The tick is the only signal that the 420ms press registered, since the
    // finger is still covering the tile that just grew a checkbox.
    hapticSelect();
    setSelecting(true);
    setSelected(new Set([item.id]));
  }, []);

  const pickCollection = useCallback(
    (next: Collection) => {
      // One patch, not two: the collection and its filter are persisted
      // together, so a half-applied pair can never be written out.
      onPrefsChange({ libraryCollection: next, libraryFilter: 'all' });
      setSelected(new Set());
    },
    [onPrefsChange],
  );

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
      onPrefsChange({ libraryFilter: next });
      setSelected(new Set());
    },
    [onPrefsChange],
  );

  useEffect(() => {
    changeFilterRef.current = changeFilter;
  }, [changeFilter]);

  const enterSelect = useCallback(() => {
    setSelected(new Set());
    setSelecting(true);
  }, []);

  const pickSort = useCallback(
    (value: SortOrder) => onPrefsChange({ sort: value }),
    [onPrefsChange],
  );

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(visible.map(i => i.id)));
  }, [allSelected, visible]);

  const confirmDelete = useCallback(() => {
    setPendingCount(selectedFiles.length);
    setPendingDelete(selectedFiles);
  }, [selectedFiles]);

  /**
   * Delete straight from the viewer, which asks for its own confirmation — the
   * Library's sheet cannot serve it, because the viewer is an Android Modal in
   * a window of its own and a sheet from this tree would open behind it.
   *
   * The viewer closes first: the file it is showing is about to stop existing,
   * and a viewer left standing on it would page onto whatever slid into that
   * index, which is not what the user was looking at.
   */
  const deleteFromViewer = useCallback(
    (file: StatusFile) => {
      setViewerIndex(-1);
      void removeFiles([file]);
    },
    [removeFiles],
  );

  const runDelete = useCallback(() => {
    const files = pendingDelete;
    // The sheet keeps its buttons live through the exit animation, so Remove
    // takes a second tap. It used to run the delete again on an empty list,
    // which reloaded the library and toasted "0 statuses removed".
    if (!files) {
      return;
    }
    setPendingDelete(null);
    exitSelect();
    void removeFiles(files);
  }, [exitSelect, pendingDelete, removeFiles]);

  /**
   * Which way the padlock points.
   *
   * The Vault collection restores instead of vaulting again. Favourites is the
   * one place the two kinds of file are listed side by side, and a selection
   * made there of nothing but vault files used to run the move path, which
   * skips anything already vaulted: the button did nothing at all, silently.
   * A selection that is entirely vaulted can only mean the way out.
   */
  const restoreMode =
    collection === 'vault' ||
    (selectedFiles.length > 0 && selectedFiles.every(f => f.inVault));

  const vaultSelected = useCallback(() => {
    const files = selectedFiles;
    exitSelect();
    void (restoreMode ? restoreFromVault(files) : moveToVault(files));
  }, [exitSelect, restoreMode, moveToVault, restoreFromVault, selectedFiles]);

  const shareSelected = useCallback(() => {
    const files = selectedFiles;
    exitSelect();
    void shareFiles(files);
  }, [exitSelect, selectedFiles, shareFiles]);

  const openSort = useCallback(() => setSortOpen(true), []);
  const closeSort = useCallback(() => setSortOpen(false), []);
  const closeViewer = useCallback(() => setViewerIndex(-1), []);
  const closeConfirm = useCallback(() => setPendingDelete(null), []);

  /** Everything the Library lists is by definition already saved. */
  const alwaysSaved = useCallback(() => true, []);
  const isFavouriteId = useCallback(
    (id: string) => favourites.has(id),
    [favourites],
  );
  const onViewerSave = useCallback(async () => {
    // Everything here is already in the library; the design answers a
    // double-tap on a saved status with the "skip" toast.
    showToast({
      message: t('toast.alreadySaved'),
      meta: t('toast.metaSkip'),
    });
    return true;
  }, [showToast, t]);
  const shareOne = useCallback(
    (item: StatusFile) => {
      void shareFiles([item]);
    },
    [shareFiles],
  );
  const repostOne = useCallback(
    (item: StatusFile) => {
      void repost(item);
    },
    [repost],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'new' as SortOrder, label: t('sort.new') },
      { value: 'old' as SortOrder, label: t('sort.old') },
      { value: 'big' as SortOrder, label: t('sort.big') },
      { value: 'type' as SortOrder, label: t('sort.type') },
    ],
    [t],
  );

  const firstScan = loading && saved.length === 0 && vault.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {selecting ? (
        <SelectionHeader
          count={selectedCount}
          sizeLabel={selectedSize}
          allSelected={allSelected}
          onExit={exitSelect}
          onToggleAll={toggleAll}
        />
      ) : (
        <View style={tinted ? { backgroundColor: theme.topBar } : null}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text
                style={[type.screenTitle, { color: tinted ? theme.onTopBar : theme.text }]}
                numberOfLines={1}
              >
                {t('nav.library')}
              </Text>
              <Text
                style={[type.metaLine, { color: tinted ? theme.onTopBarMuted : theme.textFaint }]}
                numberOfLines={1}
              >
                {metaLabel}
              </Text>
            </View>
            <View style={styles.headerBtns}>
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
              {onOpenSettings ? (
                <RoundButton
                  icon="gear"
                  onPress={onOpenSettings}
                  strokeWidth={1.8}
                  label={t('a11y.settings')}
                  onTint={tinted}
                />
              ) : null}
            </View>
          </View>

          <FadeIn style={styles.chipsBlock}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chips}
              contentContainerStyle={styles.chipsRow}
            >
              <Chip
                label={t('library.all')}
                count={saved.length}
                active={collection === 'all'}
                onPress={() => pickCollection('all')}
                onTint={tinted}
              />
              <Chip
                label={t('library.fav')}
                count={favouriteCount}
                active={collection === 'fav'}
                onPress={() => pickCollection('fav')}
                onTint={tinted}
              />
              <Chip
                label={t('library.vault')}
                count={vault.length}
                active={collection === 'vault'}
                onPress={() => pickCollection('vault')}
                onTint={tinted}
              />
            </ScrollView>
          </FadeIn>

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

      <View style={styles.body}>
        {firstScan ? (
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
                context="library"
                selecting={selecting}
                selectedIds={selected}
                isSaved={alwaysSaved}
                onPress={onPressItem}
                onLongPress={onLongPressItem}
                refreshing={refreshing}
                onRefresh={refresh}
                bottomInset={0}
                empty={
                  <EmptyState
                    // An empty Favourites or Vault is not "nothing saved yet":
                    // the All chip beside it may say forty files, and the
                    // instruction to save another would not fill this one.
                    title={t(
                      collection === 'fav'
                        ? 'empty.favTitle'
                        : collection === 'vault'
                        ? 'empty.vaultTitle'
                        : 'empty.libraryTitle',
                    )}
                    body={t(
                      collection === 'fav'
                        ? 'empty.favBody'
                        : collection === 'vault'
                        ? 'empty.vaultBody'
                        : access === 'none'
                        ? 'empty.libraryAccessBody'
                        : 'empty.libraryBody',
                    )}
                    cta={
                      collection === 'all' && access === 'none'
                        ? {
                            label: t('empty.allowAccess'),
                            onPress: allowGallery,
                          }
                        : /*
                         * Nothing saved yet, so the next step is the Feed:
                         * this screen only ever shows what was kept from
                         * there, and an empty one with no way onward was a
                         * dead end.
                         */
                        onOpenFeed
                        ? { label: t('empty.openFeed'), onPress: onOpenFeed }
                        : undefined
                    }
                  />
                }
              />
            ))}
          </Pager>
        )}
      </View>

      {selecting ? (
        <SelectionTray
          context="library"
          count={selectedCount}
          // Deleting cannot be undone, so it is confirmed up front rather than
          // given the Undo pill the reversible actions get.
          onPrimary={confirmDelete}
          onVault={vaultSelected}
          onShare={shareSelected}
          vaultLabel={restoreMode ? t('select.restore') : t('select.vault')}
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

      <ConfirmSheet
        visible={pendingDelete !== null}
        destructive
        title={tp('confirm.deleteTitle', pendingCount)}
        body={t('confirm.deleteBody')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        onClose={closeConfirm}
        onConfirm={runDelete}
      />

      <StatusViewer
        visible={viewerIndex >= 0 && visible.length > 0}
        items={visible}
        index={Math.min(
          Math.max(viewerIndex, 0),
          Math.max(visible.length - 1, 0),
        )}
        onClose={closeViewer}
        onIndexChange={setViewerIndex}
        isSaved={alwaysSaved}
        isFavourite={isFavouriteId}
        onSave={onViewerSave}
        onToggleFavourite={toggleFavourite}
        onShare={shareOne}
        onRepost={repostOne}
        onDelete={deleteFromViewer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Template: padding 6px 20px 0, space-between, gap 12.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.xs,
    paddingHorizontal: space.screen,
  },
  headerText: { flex: 1, minWidth: 0, gap: 5 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: space.xs },

  chipsBlock: { paddingTop: space.row, paddingHorizontal: space.screen },
  chips: { marginTop: space.md, flexGrow: 0 },
  chipsRow: { flexDirection: 'row', gap: space.tight },

  body: { flex: 1, minHeight: 0 },
});

export default LibraryScreen;
