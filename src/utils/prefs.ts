import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AutoMode, Collection, MediaFilter, SortOrder } from '../types';

/**
 * Every persisted preference in one typed record, read once at boot and
 * written through a single setter. Keeping them together avoids the
 * scattered `AsyncStorage.getItem` calls the previous version had, and makes
 * the "what is actually stored on this device" question answerable by reading
 * one file.
 */
export interface Prefs {
  /** Auto-save new statuses when the app is opened. */
  autoSave: boolean;
  autoMode: AutoMode;
  /** Route auto-saved items straight into the vault. */
  autoVault: boolean;
  /** Save the original file rather than a re-encoded copy. */
  /** Apply FLAG_SECURE so the app preview is blank in the recents switcher. */
  hideFromRecents: boolean;
  sort: SortOrder;
  /** False until the first-run intro has been through once. */
  introSeen: boolean;
  /**
   * View state the screens keep here so there is one owner for it. None of it
   * is restored on launch — the app opens on the Feed's "All" tab every time,
   * as the design does. The search query is not among these either: a stale
   * query on launch looks like an empty library rather than a filter.
   */
  feedFilter: MediaFilter;
  libraryCollection: Collection;
  libraryFilter: MediaFilter;
  /** Epoch ms of the previous app open, used for the "new" badge. */
  lastOpened: number;
  /** Ids the user has starred. */
  favourites: string[];
  /** Default dial code for the "message a number" tool. */
  dialCode: string;
}

export const DEFAULT_PREFS: Prefs = {
  autoSave: false,
  autoMode: 'both',
  autoVault: false,
  hideFromRecents: false,
  sort: 'new',
  introSeen: false,
  feedFilter: 'all',
  libraryCollection: 'all',
  libraryFilter: 'all',
  lastOpened: 0,
  favourites: [],
  dialCode: '',
};

const KEY = '@statussaverpro/prefs/v1';

const isAutoMode = (v: unknown): v is AutoMode =>
  v === 'both' || v === 'photos' || v === 'videos';

const isSortOrder = (v: unknown): v is SortOrder =>
  v === 'new' || v === 'old' || v === 'big' || v === 'type';

const isMediaFilter = (v: unknown): v is MediaFilter =>
  v === 'all' || v === 'photos' || v === 'videos';

const isCollection = (v: unknown): v is Collection =>
  v === 'all' || v === 'fav' || v === 'vault';

/**
 * A dial code as the Tools field writes it: "+" and digits, or nothing.
 *
 * The field only ever writes `formatDialCode` output, but a record from an
 * older build (or one edited by hand) can hold anything, and an unparseable
 * value was rendered into the mono field verbatim while the digit count behind
 * it stayed zero — so "Open chat" answered every tap with "Enter a country
 * code" and the offending text could not be recognised as the reason. Falling
 * back to the default lets the screen re-seed it from the device country.
 */
const isDialCode = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 8 && /^\+?\d*$/.test(v);

/**
 * Reads stored prefs, validating every field. A corrupt or partially written
 * blob degrades to defaults per-field rather than throwing away the whole
 * record.
 */
export const loadPrefs = async (): Promise<Prefs> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULT_PREFS };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_PREFS };
    }
    const p = parsed as Record<string, unknown>;
    return {
      autoSave:
        typeof p.autoSave === 'boolean' ? p.autoSave : DEFAULT_PREFS.autoSave,
      autoMode: isAutoMode(p.autoMode) ? p.autoMode : DEFAULT_PREFS.autoMode,
      autoVault:
        typeof p.autoVault === 'boolean'
          ? p.autoVault
          : DEFAULT_PREFS.autoVault,
      hideFromRecents:
        typeof p.hideFromRecents === 'boolean'
          ? p.hideFromRecents
          : DEFAULT_PREFS.hideFromRecents,
      sort: isSortOrder(p.sort) ? p.sort : DEFAULT_PREFS.sort,
      introSeen:
        typeof p.introSeen === 'boolean'
          ? p.introSeen
          : DEFAULT_PREFS.introSeen,
      feedFilter: isMediaFilter(p.feedFilter)
        ? p.feedFilter
        : DEFAULT_PREFS.feedFilter,
      libraryCollection: isCollection(p.libraryCollection)
        ? p.libraryCollection
        : DEFAULT_PREFS.libraryCollection,
      libraryFilter: isMediaFilter(p.libraryFilter)
        ? p.libraryFilter
        : DEFAULT_PREFS.libraryFilter,
      lastOpened:
        typeof p.lastOpened === 'number' && Number.isFinite(p.lastOpened)
          ? p.lastOpened
          : DEFAULT_PREFS.lastOpened,
      /*
       * Deduplicated on the way in. The list is appended to by a toggle whose
       * writers can overlap, so a double tap could store the same id twice —
       * and the Favourites chip counts entries, so the collection claimed more
       * items than it could show and un-favouriting one left the other behind.
       */
      favourites: Array.isArray(p.favourites)
        ? Array.from(
            new Set(
              p.favourites.filter((x): x is string => typeof x === 'string'),
            ),
          )
        : [],
      dialCode: isDialCode(p.dialCode) ? p.dialCode : DEFAULT_PREFS.dialCode,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const savePrefs = async (prefs: Prefs): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // A failed write is not worth interrupting the user for; the value stays
    // correct for this session and will be retried on the next change.
  }
};
