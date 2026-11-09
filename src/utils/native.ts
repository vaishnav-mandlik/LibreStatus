import { NativeModules, Platform } from 'react-native';

/** Raw shape of one entry of the native metadata map. */
interface NativeVideoMeta {
  thumbnail?: string | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}

/**
 * Typed surface over the app's single native module.
 *
 * Every method is optional at the type level because the module does not exist
 * on iOS or in Jest, and because an older installed build may predate a newly
 * added method. Callers must handle `null`/no-op rather than assuming presence.
 */
interface FolderPickerNative {
  pickFolder(packageName: string): Promise<string | null>;
  listFiles(uri: string, kind: 'whatsapp' | 'business'): Promise<
    Array<{
      uri: string;
      name: string;
      type: string;
      size: number;
      lastModified: number;
    }>
  >;
  copyDocument?(srcUri: string, destPath: string): Promise<number>;
  setSecureFlag?(enabled: boolean): Promise<boolean>;
  setKeepAwake?(enabled: boolean): Promise<boolean>;
  getVideoThumbnail?(srcUri: string, cacheKey: string): Promise<string | null>;
  getVideoMeta?(
    srcUri: string,
    cacheKey: string,
  ): Promise<NativeVideoMeta | null>;
  clearThumbnailCache?(): Promise<number>;
  trimThumbnailCache?(maxBytes: number): Promise<number>;
  openFolder?(relativePath: string): Promise<boolean>;
  shareFileTo?(path: string, mime: string, packageName: string): Promise<boolean>;
  isPackageInstalled?(packageName: string): Promise<boolean>;
  openApp?(packageName: string): Promise<boolean>;
  setSystemBars?(
    light: boolean,
    color: string,
    statusLight: boolean,
    statusColor: string,
  ): Promise<boolean>;
}

const native: Partial<FolderPickerNative> =
  (NativeModules as { FolderPicker?: FolderPickerNative }).FolderPicker ?? {};

export const isNativeAvailable = (): boolean =>
  Platform.OS === 'android' && typeof native.pickFolder === 'function';

/**
 * Blanks the app preview in the recents switcher (and blocks screenshots).
 * Resolves false when unsupported, so the caller can reflect reality in the UI.
 *
 * The native answer is what is returned, not merely "the call did not throw":
 * both callers treat this as the truth behind the Hide-from-recents switch and
 * revert the preference when it comes back false. Reporting success for a call
 * that reached the window and failed there left the switch claiming a blank
 * recents preview over one that still showed the user's statuses.
 */
export const setSecureFlag = async (enabled: boolean): Promise<boolean> => {
  if (!native.setSecureFlag) {
    return false;
  }
  try {
    return (await native.setSecureFlag(enabled)) === true;
  } catch {
    return false;
  }
};

/**
 * Keeps the screen on while a video is playing in the viewer.
 *
 * Called on every play, pause and unmount, so it resolves false instead of
 * throwing when there is no activity or the installed module predates it: the
 * caller has nothing useful to do with a failure.
 */
export const setKeepAwake = async (enabled: boolean): Promise<boolean> => {
  if (!native.setKeepAwake) {
    return false;
  }
  try {
    return (await native.setKeepAwake(enabled)) === true;
  } catch {
    return false;
  }
};

/**
 * Where `saveStatusToGallery` lands files, relative to the primary volume.
 * `CameraRoll.save` puts an album under Pictures/, so this is
 * `DCIM/<GALLERY_ALBUM>`; spelled out here so this module stays free of
 * the storage layer's imports (a test pins the two together).
 */
export const SAVE_FOLDER_PATH = 'DCIM/Status';
/** Where camera-roll puts an album on Android 9 and below (photos; videos go to Movies/). */
export const LEGACY_SAVE_FOLDER_PATH = 'Pictures/Status';
/** True where saves land under DCIM: Android 10 and up. */
export const savesUnderDcim = (): boolean =>
  Platform.OS !== 'android' || Number(Platform.Version) >= 29;
export const saveFolderPath = (): string =>
  savesUnderDcim() ? SAVE_FOLDER_PATH : LEGACY_SAVE_FOLDER_PATH;

/**
 * Shows the save folder in the system Files app.
 *
 * Resolves false — never throws — when no app can display a document folder or
 * the installed module predates the method, so the Tools screen can fall back
 * to a hint instead of a failure toast.
 */
export const openSaveFolder = async (): Promise<boolean> => {
  if (!native.openFolder) {
    return false;
  }
  try {
    return (await native.openFolder(saveFolderPath())) === true;
  } catch {
    return false;
  }
};

/** Poster frame plus the numbers the grid and the viewer need. */
export interface VideoMeta {
  /** `file://` path of the cached JPEG, or null when no frame could be read. */
  thumbnail: string | null;
  /** Track duration in milliseconds, or null when the file does not state it. */
  durationMs: number | null;
  /** Frame size in display orientation, or null when unknown. */
  width: number | null;
  height: number | null;
}

/**
 * How many poster-frame jobs may be in native at once.
 *
 * Every mounted tile asks for its own frame, so a fast scroll used to open
 * dozens of MediaMetadataRetrievers simultaneously — each one a codec instance
 * and a full-size bitmap. Three keeps the decoder busy without the memory
 * spike, and matches the thread pool on the native side.
 */
const MAX_CONCURRENT_META = 3;

/**
 * Entries kept in the in-memory result map. Bounded because a long library
 * scroll would otherwise retain one string per video for the whole session;
 * the on-disk cache makes a re-lookup cheap anyway.
 */
const MEMO_LIMIT = 400;

let activeJobs = 0;
const waiting: Array<() => void> = [];

const acquireSlot = (): Promise<void> => {
  if (activeJobs < MAX_CONCURRENT_META) {
    activeJobs += 1;
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    waiting.push(resolve);
  });
};

/**
 * Newest waiter first.
 *
 * The queue is fed by mounting tiles, so oldest-first meant the frames of
 * everything the user had already scrolled past were decoded before the rows
 * actually on screen. Flinging through a few hundred videos and stopping left
 * the visible tiles blank for as long as it took to work through the backlog
 * of tiles that no longer existed — minutes on a large library. The tiles the
 * user is looking at are the ones that asked last.
 */
const releaseSlot = (): void => {
  const next = waiting.pop();
  if (next) {
    // Hand the slot straight over rather than counting it down and up again,
    // which would let a burst of new callers jump the queue.
    next();
    return;
  }
  activeJobs = Math.max(0, activeJobs - 1);
};

const metaMemo = new Map<string, VideoMeta | null>();
const metaInflight = new Map<string, Promise<VideoMeta | null>>();

/**
 * Bumped whenever the on-disk cache is emptied or trimmed.
 *
 * A read that was already in native when the cache was cleared comes back
 * holding a `file://` path to a JPEG that has just been deleted. Memoising it
 * left that tile permanently blank — the memo is never re-read, so the broken
 * path outlived the whole session. A result from before the sweep is now
 * dropped instead of remembered, and the next lookup regenerates the frame.
 */
let cacheGeneration = 0;

const remember = (
  cacheKey: string,
  meta: VideoMeta | null,
  generation: number,
): void => {
  if (generation !== cacheGeneration) {
    return;
  }
  metaMemo.set(cacheKey, meta);
  if (metaMemo.size > MEMO_LIMIT) {
    const oldest = metaMemo.keys().next();
    if (!oldest.done) {
      metaMemo.delete(oldest.value);
    }
  }
};

const positive = (value: number | null | undefined): number | null =>
  typeof value === 'number' && isFinite(value) && value > 0 ? value : null;

const normalise = (raw: NativeVideoMeta): VideoMeta => ({
  thumbnail: typeof raw.thumbnail === 'string' ? raw.thumbnail : null,
  durationMs: positive(raw.durationMs),
  width: positive(raw.width),
  height: positive(raw.height),
});

/**
 * One trip across the bridge, holding a concurrency slot for its duration.
 *
 * Never rejects: a missing poster is cosmetic, and a caller that has already
 * unmounted must not turn into an unhandled rejection or leak the slot.
 */
const runMetaJob = async (
  uri: string,
  cacheKey: string,
): Promise<VideoMeta | null> => {
  await acquireSlot();
  try {
    if (native.getVideoMeta) {
      const raw = await native.getVideoMeta(uri, cacheKey);
      return raw ? normalise(raw) : null;
    }
    if (native.getVideoThumbnail) {
      // Installed native module predates getVideoMeta: a poster with no
      // duration is still better than an empty tile.
      const path = await native.getVideoThumbnail(uri, cacheKey);
      return {
        thumbnail: path ?? null,
        durationMs: null,
        width: null,
        height: null,
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    releaseSlot();
  }
};

/**
 * Poster frame and metadata for a video, cached on disk (native), in memory
 * here, and de-duplicated while in flight so a scrolling grid crosses the
 * bridge at most once per file.
 *
 * A failure is remembered as null rather than retried on every render.
 */
export const getVideoMeta = async (
  uri: string,
  cacheKey: string,
): Promise<VideoMeta | null> => {
  if (metaMemo.has(cacheKey)) {
    return metaMemo.get(cacheKey) ?? null;
  }
  const existing = metaInflight.get(cacheKey);
  if (existing) {
    return existing;
  }

  const generation = cacheGeneration;
  const job: Promise<VideoMeta | null> = runMetaJob(uri, cacheKey)
    .then(meta => {
      remember(cacheKey, meta, generation);
      return meta;
    })
    .finally(() => {
      // Only retract our own entry: a cache sweep may have dropped it and a
      // later caller may already have registered a fresh read under this key.
      if (metaInflight.get(cacheKey) === job) {
        metaInflight.delete(cacheKey);
      }
    });

  metaInflight.set(cacheKey, job);
  return job;
};

/**
 * Poster frame only. Kept as its own export because most callers just need a
 * uri for `<Image>`, and because it predates `getVideoMeta`.
 */
export const getVideoThumbnail = async (
  uri: string,
  cacheKey: string,
): Promise<string | null> =>
  (await getVideoMeta(uri, cacheKey))?.thumbnail ?? null;

/**
 * Duration in whole seconds, the unit `StatusFile.duration` and
 * `formatDuration` use.
 *
 * Rounds up to 1 rather than to 0 so a very short clip still shows a pill:
 * the design always has one on a video tile.
 */
export const getVideoDurationSeconds = async (
  uri: string,
  cacheKey: string,
): Promise<number | null> => {
  const meta = await getVideoMeta(uri, cacheKey);
  if (!meta || meta.durationMs === null) {
    return null;
  }
  return Math.max(1, Math.round(meta.durationMs / 1000));
};

/** Drops cached poster frames from disk and memory. Returns bytes reclaimed. */
export const clearThumbnailCache = async (): Promise<number> => {
  cacheGeneration += 1;
  metaMemo.clear();
  metaInflight.clear();
  if (!native.clearThumbnailCache) {
    return 0;
  }
  try {
    return await native.clearThumbnailCache();
  } catch {
    return 0;
  } finally {
    /*
     * Retired again on the way out, because the bump above only covers reads
     * that were *already* in native. A tile that mounts while the sweep is
     * still deleting regenerates its frame, native then removes it a moment
     * later, and the path was remembered as good — leaving that tile blank for
     * the rest of the session, since the memo is never re-read. One extra
     * regeneration is the whole cost of dropping those.
     */
    cacheGeneration += 1;
    metaMemo.clear();
  }
};

/** Default ceiling for the poster-frame cache: ~40 MB of JPEGs. */
export const THUMBNAIL_CACHE_LIMIT = 40 * 1024 * 1024;

/**
 * Evicts the oldest poster frames until the cache is under `maxBytes`.
 *
 * The cache only ever grew: a heavy user's status folder churns daily, so the
 * app's cache directory crept up with frames for videos that no longer exist.
 * Meant to be called once at boot. Returns bytes reclaimed.
 */
export const trimThumbnailCache = async (
  maxBytes: number = THUMBNAIL_CACHE_LIMIT,
): Promise<number> => {
  if (!native.trimThumbnailCache) {
    return 0;
  }
  try {
    const freed = await native.trimThumbnailCache(maxBytes);
    if (freed > 0) {
      // Some memoised paths now point at deleted files. Forgetting them costs
      // one regeneration; keeping them would show a broken tile. The bump
      // covers the reads that were in native while the sweep ran, whose paths
      // would otherwise land in the memo just after it was emptied.
      cacheGeneration += 1;
      metaMemo.clear();
    }
    return freed;
  } catch {
    return 0;
  }
};

/**
 * Hands one file on disk straight to an app, by package, with no chooser in
 * between. Resolves false when the app is not installed or the module is
 * absent; rejects only when the file itself cannot be shared.
 */
export const shareFileTo = async (
  path: string,
  mime: string,
  packageName: string,
): Promise<boolean> => {
  if (!native.shareFileTo) {
    return false;
  }
  return (await native.shareFileTo(path, mime, packageName)) === true;
};

/** Whether `packageName` is installed. False when unknown. */
export const isPackageInstalled = async (packageName: string): Promise<boolean> => {
  if (!native.isPackageInstalled) {
    return false;
  }
  try {
    return (await native.isPackageInstalled(packageName)) === true;
  } catch {
    return false;
  }
};

/**
 * Brings an app to the front on its launcher activity. Resolves false when it
 * is not installed (or the module is absent), so the caller can say so.
 */
export const openApp = async (packageName: string): Promise<boolean> => {
  if (!native.openApp) {
    return false;
  }
  try {
    return (await native.openApp(packageName)) === true;
  } catch {
    return false;
  }
};

/** A status bar painted differently from the navigation bar. */
export interface StatusTint {
  /** Dark status-bar icons when true, white when false. */
  light: boolean;
  color: string;
}

interface Bars {
  light: boolean;
  color: string;
  status?: StatusTint;
}

/** The bars as last requested, so a new Modal window can be told the same. */
let lastBars: Bars | null = null;

/** The bars the app wants when nothing full-screen is on top, e.g. the viewer. */
let baseBars: Bars | null = null;

/**
 * Dark icons in the status and navigation bars when `light` is true (a light
 * surface beneath them), white icons when false; `color` is painted behind
 * them on Android versions that still paint a bar.
 *
 * `status` gives the status bar its own appearance and colour, for a screen
 * whose top is a coloured bar while its bottom is not: the light theme's
 * green Feed header wants white status icons over dark navigation icons.
 *
 * Applied to the activity window and to every open Modal window: React Native
 * gives a Modal the system night mode's navigation-bar appearance, which is
 * not what the app is painting once the user picks a theme, and the viewer
 * is dark in both themes.
 */
export const setSystemBars = async (
  light: boolean,
  color: string,
  status?: StatusTint,
): Promise<void> => {
  lastBars = { light, color, status };
  if (!native.setSystemBars) {
    return;
  }
  try {
    await native.setSystemBars(light, color, status?.light ?? light, status?.color ?? color);
  } catch {
    // Cosmetic, and the activity may be gone; nothing to recover.
  }
};

/** Sets the bars and remembers them as the ones to come back to. */
export const setBaseSystemBars = (
  light: boolean,
  color: string,
  status?: StatusTint,
): Promise<void> => {
  baseBars = { light, color, status };
  return setSystemBars(light, color, status);
};

/** Puts back the base bars after something full-screen painted its own. */
export const restoreBaseSystemBars = async (): Promise<void> => {
  if (baseBars) {
    await setSystemBars(baseBars.light, baseBars.color, baseBars.status);
  }
};

export const reapplySystemBars = async (): Promise<void> => {
  if (lastBars) {
    await setSystemBars(lastBars.light, lastBars.color, lastBars.status);
  }
};
