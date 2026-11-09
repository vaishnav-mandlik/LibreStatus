import RNFS from 'react-native-fs';
import { NativeModules, Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasFolderAccess, listFolderFiles } from './folderPicker';
import {
  ensureMediaAccess,
  peekMediaAccess,
  resetMediaAccessCache,
  type MediaAccess,
} from './permissions';
import { listVault } from './vault';
import type { StatusFile, StorageStats } from '../types';

const { FolderPicker } = NativeModules as {
  FolderPicker?: {
    copyDocument?: (srcUri: string, destPath: string) => Promise<number>;
  };
};

/**
 * Album new saves are written to. It was renamed with the app, so the old
 * album is still read (never written) and libraries built before the rename
 * keep showing everything they had.
 */
export const GALLERY_ALBUM = 'Status';
export const LEGACY_GALLERY_ALBUM = 'Status Saver';

const SAVED_IDS_KEY = '@saved_status_ids';
export const SHARE_CACHE_DIR = `${RNFS.CachesDirectoryPath}/status-share`;
const TEMP_DIR = `${RNFS.CachesDirectoryPath}/statuses`;

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic'];
const VIDEO_EXT = ['mp4', '3gp', 'avi', 'mkv', 'mov', 'webm', 'flv'];

const WHATSAPP_STATUS_PATHS = [
  `${RNFS.ExternalStorageDirectoryPath}/WhatsApp/Media/.Statuses`,
  '/storage/emulated/0/WhatsApp/Media/.Statuses',
  '/sdcard/WhatsApp/Media/.Statuses',
  `${RNFS.ExternalStorageDirectoryPath}/Android/media/com.whatsapp/WhatsApp/Media/.Statuses`,
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
];

const BUSINESS_STATUS_PATHS = [
  `${RNFS.ExternalStorageDirectoryPath}/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses`,
  `${RNFS.ExternalStorageDirectoryPath}/WhatsApp Business/Media/.Statuses`,
  '/storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses',
];

const extensionOf = (filename: string): string => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const classify = (filename: string, size: number): 'image' | 'video' | null => {
  const ext = extensionOf(filename);
  if (IMAGE_EXT.includes(ext)) {
    return 'image';
  }
  if (VIDEO_EXT.includes(ext)) {
    return 'video';
  }
  // WhatsApp occasionally writes extension-less status files.
  if (ext === '' && size > 10000) {
    return 'image';
  }
  return null;
};

/**
 * Reads every candidate legacy path and merges what they hold.
 *
 * This used to return as soon as one candidate existed, empty result included.
 * WhatsApp moved its media into `Android/media/com.whatsapp/...` and leaves the
 * old `/WhatsApp/Media/.Statuses` tree behind, so on a phone that has been
 * through that move the first candidate exists and is empty while the real
 * statuses sit in the fourth: the Feed showed "No statuses here" for a folder
 * full of them, with nothing the user could do about it. An existing-but-empty
 * directory is a normal state, not the answer.
 *
 * Candidates are deduplicated first because `ExternalStorageDirectoryPath` is
 * usually `/storage/emulated/0`, which makes several of them the same folder.
 */
const readLegacyDir = async (paths: string[]): Promise<StatusFile[]> => {
  const out: StatusFile[] = [];
  for (const path of Array.from(new Set(paths))) {
    try {
      if (!(await RNFS.exists(path))) {
        continue;
      }
      const entries = await RNFS.readDir(path);
      for (const entry of entries) {
        if (
          !entry.isFile() ||
          entry.name.startsWith('.') ||
          entry.size < 1024
        ) {
          continue;
        }
        const type = classify(entry.name, entry.size);
        if (!type) {
          continue;
        }
        out.push({
          id: entry.name,
          uri: `file://${entry.path}`,
          filename: entry.name,
          type,
          // A missing mtime must not become "now", or the item would jump to
          // the top of the list on every scan and its tile stamp would read
          // the current clock instead of when the status was captured. Same
          // decision as the SAF branch below.
          timestamp: entry.mtime ? new Date(entry.mtime).getTime() : 0,
          size: entry.size,
        });
      }
    } catch {
      // Unreadable path: the remaining candidates may still be readable.
    }
  }
  return out;
};

/**
 * Reads every status currently on the device, from both WhatsApp and WhatsApp
 * Business, deduplicated by filename.
 *
 * On Android 11+ this goes through the SAF tree the user granted. Below that it
 * reads the legacy paths directly.
 */
export const getStatusFiles = async (): Promise<StatusFile[]> => {
  if (Platform.OS !== 'android') {
    return [];
  }

  const byId = new Map<string, StatusFile>();

  const absorb = (files: StatusFile[]) => {
    for (const file of files) {
      const existing = byId.get(file.id);
      // Prefer the entry with a real timestamp if we see the same name twice.
      if (!existing || file.timestamp > existing.timestamp) {
        byId.set(file.id, file);
      }
    }
  };

  try {
    if (Platform.Version >= 30) {
      for (const kind of ['whatsapp', 'business'] as const) {
        const uri = await hasFolderAccess(kind);
        if (!uri) {
          continue;
        }
        const safFiles = await listFolderFiles(uri, kind);
        absorb(
          safFiles.map(file => {
            const type: 'image' | 'video' =
              file.type?.startsWith('video/') ||
              VIDEO_EXT.includes(extensionOf(file.name))
                ? 'video'
                : 'image';
            return {
              id: file.name,
              uri: file.uri,
              filename: file.name,
              type,
              // A missing lastModified must not become "now", or the item
              // would jump to the top of the list on every single scan.
              timestamp: file.lastModified || 0,
              size: file.size || 0,
            };
          }),
        );
      }
    } else {
      absorb(await readLegacyDir(WHATSAPP_STATUS_PATHS));
      absorb(await readLegacyDir(BUSINESS_STATUS_PATHS));
    }
  } catch (error) {
    console.warn('Failed to read statuses', error);
  }

  return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
};

/** Ids the user has explicitly saved, as recorded by this app. */
export const getSavedStatusIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_IDS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeSavedIds = async (ids: Iterable<string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAVED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Non-fatal: the gallery is still the source of truth on next sync.
  }
};

/**
 * Every change to the saved-id set runs one at a time.
 *
 * The set is a read-modify-write over a single AsyncStorage key, and the app
 * has several writers going at once: a quick save, a batch, an auto-save and
 * the reconcile pass all touch it. Interleaved, the later write was computed
 * from a set read before the earlier one landed, so the earlier marker was
 * silently dropped — the tick vanished from a status that really was in the
 * album, and saving it again made a second album file.
 */
let savedIdsChain: Promise<unknown> = Promise.resolve();

const withSavedIds = (
  mutate: (ids: Set<string>) => void,
): Promise<Set<string>> => {
  const run = async (): Promise<Set<string>> => {
    const ids = new Set(await getSavedStatusIds());
    mutate(ids);
    await writeSavedIds(ids);
    return ids;
  };
  const next = savedIdsChain.then(run, run);
  // The chain itself must never carry a rejection, or the next writer would
  // inherit it; the caller still gets the real result.
  savedIdsChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

/** Base name without extension, used for matching across re-encodes. */
const baseName = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : filename;
};

/**
 * Every id one file may be known by.
 *
 * Besides the name and its extension-less base, MediaStore appends a counter
 * when it cannot use the name it was given, so the album copy of "IMG-1.jpg"
 * can land as "IMG-1(1).jpg". Without that third alias the source stayed
 * marked unsaved next to a copy that was already in the album — so its tick
 * never appeared and saving again made a third file.
 */
const identityOf = (filename: string): string =>
  baseName(filename).replace(/[\s_-]*\(\d+\)$/, '');

const aliasesOf = (filename: string): string[] =>
  Array.from(
    new Set([filename, baseName(filename), identityOf(filename)]),
  ).filter(Boolean);

export const addSavedStatusIds = async (files: StatusFile[]): Promise<void> => {
  await withSavedIds(ids => {
    for (const file of files) {
      ids.add(file.id);
      for (const alias of aliasesOf(file.filename)) {
        ids.add(alias);
      }
    }
  });
};

/**
 * Drops every alias of the given files, so un-saving actually un-saves.
 *
 * Removal goes by identity rather than by exact alias: deleting the album copy
 * "IMG-1(1).jpg" has to clear the marker stored under the source name
 * "IMG-1.jpg" as well, or the Feed would keep its tick for a file that is no
 * longer anywhere. That is the same equivalence `isSaved` matches on, so this
 * cannot leave a half-pruned entry behind.
 */
export const removeSavedStatusIds = async (
  files: StatusFile[],
): Promise<void> => {
  const doomed = new Set<string>();
  for (const file of files) {
    for (const name of [file.filename, file.id]) {
      const identity = identityOf(name);
      if (identity) {
        doomed.add(identity);
      }
    }
  }
  await withSavedIds(ids => {
    for (const id of Array.from(ids)) {
      if (doomed.has(identityOf(id))) {
        ids.delete(id);
      }
    }
  });
};

/**
 * Reconciles the stored id set with what is actually in the gallery.
 *
 * The previous implementation replaced the stored set with the gallery's
 * contents, so a save whose file had not been indexed by MediaStore yet was
 * silently erased a second later. This merges instead: gallery ids are added,
 * and stored ids are only dropped when we can positively see the gallery.
 */
export const syncSavedStatusIds = async (): Promise<Set<string>> => {
  const before = new Set(await getSavedStatusIds());
  try {
    // readGalleryAlbum THROWS on failure, unlike the UI-facing
    // getSavedStatusFiles. That distinction is what keeps a revoked permission
    // from looking like an empty album and pruning every saved marker below.
    const [gallery, vault] = await Promise.all([
      // Filenames are all the sync matches on; see AlbumDetail.
      readGalleryAlbum('ids'),
      listVault(),
    ]);

    /*
     * Prune before adding. The set used to be append-only, so a status the user
     * deleted from the gallery in another app stayed marked "saved" here
     * forever. Anything present in neither the album nor the vault is gone.
     */
    const live = new Set<string>();
    for (const file of gallery.concat(vault)) {
      live.add(file.id);
      for (const alias of aliasesOf(file.filename)) {
        live.add(alias);
      }
    }

    /*
     * Only ids that were already stored when this pass STARTED may be pruned.
     * The album read above takes a moment, and a save that finishes inside that
     * window writes a marker for a file MediaStore has not indexed yet: judged
     * against this snapshot it looks like a deleted file and used to be wiped,
     * un-ticking a status that had just been saved.
     */
    return await withSavedIds(ids => {
      for (const id of Array.from(ids)) {
        if (before.has(id) && !live.has(id)) {
          ids.delete(id);
        }
      }
      for (const id of Array.from(live)) {
        ids.add(id);
      }
    });
  } catch {
    // Gallery unreadable (permission revoked, for instance). Keep what we have
    // rather than declaring everything unsaved.
    return before;
  }
};

/** True if any alias of this file appears in the saved set. */
export const isSaved = (file: StatusFile, savedIds: Set<string>): boolean =>
  savedIds.has(file.id) ||
  aliasesOf(file.filename).some(alias => savedIds.has(alias));

export const markSaved = (
  files: StatusFile[],
  savedIds: Set<string>,
): StatusFile[] => files.map(f => ({ ...f, isSaved: isSaved(f, savedIds) }));

const ensureDir = async (dir: string): Promise<void> => {
  if (!(await RNFS.exists(dir))) {
    await RNFS.mkdir(dir);
  }
};

/**
 * The name a status is allowed to take inside one of our cache directories.
 *
 * A status file name comes from WhatsApp's folder, not from us. A name
 * carrying a separator ("../evil.jpg") resolved outside the cache directory,
 * which at best made the copy fail and at worst wrote where nothing of ours
 * belongs. Only the leaf survives; the display name the share sheet shows is
 * taken from `status.filename` separately, so nothing visible changes.
 */
const leafName = (filename: string): string => {
  const flat = filename.replace(/[/\\]/g, '_').replace(/^\.+/, '_');
  return flat.length > 0 ? flat : 'status';
};

/**
 * Cache paths a save or a share is using right now, ref-counted.
 *
 * Two things read these files after they are written: `CameraRoll.save` and
 * the share sheet. Housekeeping sweeps the same directories on a timer, and a
 * second save of the same status reuses the very same temp copy — so a path
 * may only be unlinked once nothing else is holding it.
 */
const inFlight = new Map<string, number>();

const hold = (path: string): void => {
  inFlight.set(path, (inFlight.get(path) ?? 0) + 1);
};

const release = (path: string): boolean => {
  const left = (inFlight.get(path) ?? 0) - 1;
  if (left > 0) {
    inFlight.set(path, left);
    return false;
  }
  inFlight.delete(path);
  return true;
};

/**
 * Pins a staged cache file for as long as something outside this module is
 * reading it, and unpins it again.
 *
 * `materialise` only holds its destination while the copy runs, which covers
 * `saveOne` (it re-holds the temp file across the album write) but left the
 * share sheet exposed: staging returns a path, the hold is gone, and the boot
 * housekeeping sweep is free to unlink the file in the seconds before the user
 * picks a target — the share then delivered nothing, with no error anywhere.
 * A held path is skipped by `clearShareCache`.
 */
export const holdCacheFile = (path: string): void => hold(path);

export const releaseCacheFile = (path: string): void => {
  release(path);
};

/**
 * Materialises a status as a real file on disk.
 *
 * SAF content:// URIs are streamed by the native module. The base64 path is
 * only a fallback for older builds of the native module and costs roughly
 * 1.4x the file size in memory, so it is deliberately last.
 */
export const materialise = async (
  status: StatusFile,
  destDir: string,
): Promise<string> => {
  await ensureDir(destDir);
  const dest = `${destDir}/${leafName(status.filename)}`;

  hold(dest);
  try {
    /*
     * One copy per destination, ever. Two saves of the same status (a tap
     * while auto-save is running, a restore alongside a save) both streamed
     * into the same ".part" file and both renamed it into place: the bytes
     * interleaved and the corrupt result was what went to the gallery.
     */
    const running = copies.get(dest);
    if (running) {
      return await running;
    }
    const job = copyInto(status, dest);
    copies.set(dest, job);
    try {
      return await job;
    } finally {
      copies.delete(dest);
    }
  } finally {
    release(dest);
  }
};

/** Copies in progress, keyed by destination path. */
const copies = new Map<string, Promise<string>>();

/** The copy itself, with `dest` already claimed. */
const copyInto = async (status: StatusFile, dest: string): Promise<string> => {
  if (await RNFS.exists(dest)) {
    return dest;
  }

  /*
   * Write to a temporary name and rename into place. A copy interrupted
   * halfway used to leave a truncated file under the real name, and the
   * `exists` check above would then happily reuse it forever.
   */
  const partial = `${dest}.part`;
  try {
    if (await RNFS.exists(partial)) {
      await RNFS.unlink(partial);
    }

    if (!status.uri.startsWith('content://')) {
      await RNFS.copyFile(status.uri.replace(/^file:\/\//, ''), partial);
    } else if (FolderPicker?.copyDocument) {
      await FolderPicker.copyDocument(status.uri, partial);
    } else {
      const data = await RNFS.readFile(status.uri, 'base64');
      await RNFS.writeFile(partial, data, 'base64');
    }

    await RNFS.moveFile(partial, dest);
    return dest;
  } catch (error) {
    try {
      await RNFS.unlink(partial);
    } catch {
      // Best effort; the next call will overwrite it anyway.
    }
    throw error;
  }
};

/**
 * Names already in the gallery album, or null when the check is unnecessary or
 * impossible.
 *
 * `CameraRoll.save` never overwrites: saving the same status twice produced a
 * second album file ("IMG-1(1).jpg") and the Library listed the status twice.
 * Reading the album is a MediaStore query, so it only runs when a stored
 * marker says one of these files may already be there — which is exactly the
 * case that can duplicate. A failed read yields null, so an unreadable album
 * can never block a save.
 */
const loadAlbumIndex = async (
  files: StatusFile[],
): Promise<Set<string> | null> => {
  const stored = new Set(await getSavedStatusIds());
  if (!files.some(file => isSaved(file, stored))) {
    return null;
  }
  try {
    const index = new Set<string>();
    for (const file of await readGalleryAlbum('ids')) {
      for (const alias of aliasesOf(file.filename)) {
        index.add(alias);
      }
    }
    return index;
  } catch {
    return null;
  }
};

/**
 * One save. `index`, when given, is both the duplicate guard and a running
 * record of what this run has written, so two selected copies of the same
 * status cannot race each other into the album.
 */
/**
 * Saves in flight, keyed by status id.
 *
 * The Feed used to hold this guard in a ref, which is per mounted instance:
 * leaving the Feed tab and coming back while auto-save was still working
 * through a batch mounted a fresh screen with an empty guard, and the files
 * still being copied looked like candidates all over again. Nothing had marked
 * them yet, so the album index could not catch it either, and MediaStore
 * happily wrote "IMG-1.jpg" and "IMG-1(1).jpg". Living here, one writer per
 * status holds for every caller and outlives any screen.
 */
const saves = new Map<string, Promise<boolean>>();

const saveOne = async (
  status: StatusFile,
  index: Set<string> | null,
): Promise<boolean> => {
  const running = saves.get(status.id);
  if (running) {
    return running;
  }
  const job = writeOne(status, index);
  saves.set(status.id, job);
  try {
    return await job;
  } finally {
    saves.delete(status.id);
  }
};

/** The save itself, with `status.id` already claimed above. */
const writeOne = async (
  status: StatusFile,
  index: Set<string> | null,
): Promise<boolean> => {
  const aliases = aliasesOf(status.filename);
  if (index && aliases.some(alias => index.has(alias))) {
    // The album already holds this file. Record the markers (the stored set
    // may be missing an alias) and report success: it is saved.
    await addSavedStatusIds([status]);
    return true;
  }

  let tempPath: string | null = null;
  try {
    let uriToSave = status.uri;

    if (status.uri.startsWith('content://')) {
      // Claimed BEFORE the copy starts, and held across the album write: a
      // concurrent save of the same status reuses this very file, and whoever
      // finished first used to unlink it out from under the other one. The
      // housekeeping sweep skips held paths for the same reason.
      tempPath = `${TEMP_DIR}/${leafName(status.filename)}`;
      hold(tempPath);
      const written = await materialise(status, TEMP_DIR);
      if (written !== tempPath) {
        release(tempPath);
        tempPath = written;
        hold(tempPath);
      }
      uriToSave = `file://${tempPath}`;
    }

    await CameraRoll.save(uriToSave, {
      type: status.type === 'video' ? 'video' : 'photo',
      album: GALLERY_ALBUM,
    });

    await addSavedStatusIds([status]);
    if (index) {
      for (const alias of aliases) {
        index.add(alias);
      }
    }
    return true;
  } catch (error) {
    console.warn('Save to gallery failed', error);
    return false;
  } finally {
    if (tempPath && release(tempPath)) {
      try {
        await RNFS.unlink(tempPath);
      } catch {
        // Cache file; the shell's housekeeping sweep gets it if it lingers.
      }
    }
  }
};

/** Copies one status into the device gallery, unless it is already there. */
export const saveStatusToGallery = async (
  status: StatusFile,
): Promise<boolean> => saveOne(status, await loadAlbumIndex([status]));

/** Saves many statuses, reporting progress. Returns how many succeeded. */
export const saveMany = async (
  files: StatusFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<StatusFile[]> => {
  // Loaded once for the whole batch: the album does not need re-reading per
  // file, and saveOne keeps it current as it writes.
  const index = await loadAlbumIndex(files);
  const saved: StatusFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const ok = await saveOne(files[i], index);
    if (ok) {
      saved.push(files[i]);
    }
    onProgress?.(i + 1, files.length);
  }
  return saved;
};

/**
 * Everything in the gallery album, newest first.
 *
 * This is the only place the app reads MediaStore, so the read permission is
 * secured here rather than at each of the four call sites. On Android 13+ a
 * missing grant does not throw — the query just returns media this app owns —
 * so asking first is the difference between a full Library and a mysteriously
 * empty one after a reinstall.
 */
export const getSavedStatusFiles = async (): Promise<StatusFile[]> => {
  try {
    return await readGalleryAlbum();
  } catch (error) {
    console.warn('Failed to read gallery album', error);
    return [];
  }
};

/** The album at the cheapest detail the storage figures can be built from. */
const savedStatusFilesForStats = async (): Promise<StatusFile[]> => {
  try {
    return await readGalleryAlbum('sizes');
  } catch {
    return [];
  }
};

/**
 * The raw album read, current album plus legacy, newest first. Propagates
 * failures so callers can tell them apart from an empty library.
 */
const readGalleryAlbum = async (
  detail: AlbumDetail = 'sizes',
): Promise<StatusFile[]> => {
  // Never prompts; see peekMediaAccess. Files this app saved are readable
  // regardless, so an unasked permission only ever hides older saves.
  const access = await peekMediaAccess();
  const albums = await Promise.all([
    readAlbum(GALLERY_ALBUM, detail),
    /*
     * The legacy album is a courtesy read for libraries built before the
     * rename. If MediaStore refuses that one query the current album is still
     * perfectly readable, and failing the whole read would empty the Library
     * and (through syncSavedStatusIds) freeze every saved marker.
     */
    readAlbum(LEGACY_GALLERY_ALBUM, detail).catch(() => [] as StatusFile[]),
  ]);

  // MediaStore gives every item its own content URI, so that is the identity
  // here: a same-named file in both albums is two real files and stays two.
  const byUri = new Map<string, StatusFile>();
  for (const file of albums[0].concat(albums[1])) {
    if (!byUri.has(file.uri)) {
      byUri.set(file.uri, file);
    }
  }
  const files = Array.from(byUri.values()).sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  if (files.length === 0 && access === 'none') {
    /*
     * Without the read permission MediaStore does not error — it silently
     * hides everything this app does not own, so a denial is byte-identical to
     * an empty album. Throwing is what lets syncSavedStatusIds tell the two
     * apart instead of reading the silence as "the user deleted every save"
     * and un-ticking the whole Feed. getSavedStatusFiles still turns this into
     * an empty list for the Library.
     */
    throw new Error('MEDIA_ACCESS_DENIED');
  }
  return files;
};

/** Rows per MediaStore query, and the ceiling on how many queries one read makes. */
const ALBUM_PAGE = 1000;
const ALBUM_MAX_PAGES = 20;

/**
 * The name to use for an album row MediaStore returns without a display name.
 *
 * It happens: a file another app wrote, or a provider that simply leaves the
 * column empty. The fallback used to be the row's position in the read in
 * progress, which is neither unique nor stable — the first unnamed row of each
 * album came back as "status_0", so two different files reached the Library
 * sharing one id. That id is what the grid keys on and what a selection
 * identifies items by, so tapping one tile selected the other and a delete
 * took the wrong file with it; the position also moved between reads, so one
 * file did not even keep the same id twice. The row's own content URI ends in
 * the MediaStore row id, which is unique per file and does not move.
 */
const albumRowName = (uri: string, position: number): string => {
  const tail = uri.split(/[/?#]/).filter(Boolean).pop() ?? '';
  return `status_${tail || position}`;
};

/**
 * One album, paged.
 *
 * A single 1000-row query silently truncated a large library: everything past
 * the first thousand vanished from the Library AND, because syncSavedStatusIds
 * treats "not in the album" as "deleted", had its saved marker pruned — so old
 * statuses un-ticked themselves and saving one again wrote a duplicate. The
 * page cap keeps a pathological album from looping forever.
 */
/**
 * How much of each album row to ask MediaStore for.
 *
 * `'ids'` is the filename and the content URI, which is one cursor over the
 * album. `'sizes'` adds the file size, which is a real column and so still one
 * cursor.
 *
 * There is deliberately no duration level. Duration is not a column: asking
 * CameraRoll for `playableDuration` makes it open every video with a
 * MediaMetadataRetriever and initialise a codec, tens of milliseconds a file.
 * A library of five thousand saves is a couple of thousand videos, so that is
 * most of a minute of file opens before the Library can draw anything.
 *
 * Nothing needs it. A video tile has no poster frame until native decodes the
 * file, so it calls getVideoMeta for the poster regardless, and that same call
 * returns the duration; Tile prefers it over the album's copy anyway. The only
 * thing the album read bought was the pill appearing a moment before the
 * poster it sits on, over an empty well. The Feed has always drawn videos this
 * way, because a SAF row carries no duration either.
 */
export type AlbumDetail = 'ids' | 'sizes';

const ALBUM_INCLUDE: Record<
  AlbumDetail,
  Array<'filename' | 'fileSize' | 'playableDuration'>
> = {
  ids: ['filename'],
  /*
   * Everything the storage figures need, and nothing that costs a file open.
   * `getStorageStats` sums sizes and counts rows; asking for durations as
   * well made opening the Tools tab run a MediaMetadataRetriever over every
   * saved video, twice (both albums), for a number it never reads.
   */
  // imageSize used to be asked for too, and nothing read it.
  sizes: ['filename', 'fileSize'],
};

const readAlbum = async (
  album: string,
  detail: AlbumDetail,
): Promise<StatusFile[]> => {
  const out: StatusFile[] = [];
  let after: string | undefined;

  for (let page = 0; page < ALBUM_MAX_PAGES; page++) {
    const photos = await CameraRoll.getPhotos({
      first: ALBUM_PAGE,
      assetType: 'All',
      groupName: album,
      include: ALBUM_INCLUDE[detail],
      ...(after ? { after } : {}),
    });

    for (const edge of photos.edges) {
      const node = edge.node;
      const filename =
        node.image.filename || albumRowName(node.image.uri, out.length);
      const isVideo =
        node.type === 'video' || VIDEO_EXT.includes(extensionOf(filename));
      out.push({
        id: filename,
        uri: node.image.uri,
        filename,
        type: isVideo ? ('video' as const) : ('image' as const),
        timestamp: node.timestamp ? node.timestamp * 1000 : 0,
        size: node.image.fileSize || 0,
        isSaved: true,
      });
    }

    // Typed as always present, but a page without it must end the loop rather
    // than re-request the same rows forever.
    const info: { has_next_page?: boolean; end_cursor?: string } | undefined =
      photos.page_info;
    if (
      photos.edges.length === 0 ||
      !info?.has_next_page ||
      !info.end_cursor ||
      info.end_cursor === after
    ) {
      break;
    }
    after = info.end_cursor;
  }

  return out;
};

/**
 * One gallery delete at a time.
 *
 * `CameraRollModule` keeps the pending promise in a single field and
 * overwrites it on every call, so a second delete starting before the first
 * settles orphans the first one: it never resolves and never rejects. On
 * Android 11 and up the call raises a system confirmation dialog, and the
 * promise is assigned before that dialog appears, so two deletes fired close
 * together both get as far as assigning. Whatever was awaiting the first hangs
 * for the life of the process, taking any `finally` with it, which is how a
 * move to the vault could leave its guard entry behind and refuse to retry.
 *
 * Serialising here rather than guarding each caller keeps the fix at the one
 * place that can actually reach the native field. Same chain idiom as
 * `withSavedIds`: the chain never carries a rejection, and the caller still
 * gets the real result.
 */
let deleteChain: Promise<unknown> = Promise.resolve();

const deletePhotosSerially = (uris: string[]): Promise<void> => {
  const run = (): Promise<void> => CameraRoll.deletePhotos(uris);
  const next = deleteChain.then(run, run);
  deleteChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

/**
 * Deletes saved statuses from the gallery.
 *
 * `CameraRoll.deletePhotos` can only remove media this app wrote, which is
 * exactly the album we manage. On Android 11+ the system may show a
 * confirmation dialog; a rejection surfaces here as a thrown error.
 */
export const deleteSavedStatuses = async (
  files: StatusFile[],
): Promise<boolean> => {
  try {
    const uris = files.map(f => f.uri).filter(Boolean);
    if (uris.length > 0) {
      await deletePhotosSerially(uris);
    }
    await removeSavedStatusIds(files);
    return true;
  } catch (error) {
    console.warn('Delete failed', error);
    return false;
  }
};

/**
 * Deletes the gallery copies made from the given source statuses.
 *
 * Undo cannot simply pass the sources to `deleteSavedStatuses`: those are the
 * files in WhatsApp's own folder (a content:// tree URI or a path we do not
 * own), and MediaStore will not delete by them. The copies have to be located
 * in the album by name first.
 */
/** What deleteSavedCopiesOf did: which sources lost a gallery copy, and whether the user refused. */
export interface RemovedCopies {
  /** Ids of the sources whose gallery copy was deleted. */
  removed: string[];
  /** Android's delete dialogue was refused: the copies are still public. */
  refused: boolean;
  /**
   * The album could not be read, so nothing is known about gallery copies.
   * Told apart from a refusal because it is now an ordinary state — media
   * access is never asked for at boot — and a caller that read it as "the
   * user said no" could never delete a status whose only copy is in the
   * Vault, and warned about a gallery copy that had never existed.
   */
  unreadable: boolean;
}

export const deleteSavedCopiesOf = async (
  sources: StatusFile[],
): Promise<RemovedCopies> => {
  /*
   * The THROWING read, deliberately. `getSavedStatusFiles` turns an unreadable
   * album into an empty list, which here looked like "no copy was ever made"
   * and dropped the saved markers while the copies were still sitting in the
   * gallery: the status went back to unticked and the next save made a second
   * album file. An undo we cannot carry out has to change nothing.
   */
  let gallery: StatusFile[];
  try {
    gallery = await readGalleryAlbum('ids');
  } catch {
    return { removed: [], refused: false, unreadable: true };
  }

  try {
    // alias -> the source it belongs to, so a copy MediaStore renamed to
    // "IMG-1(1).jpg" is taken back by an undo of "IMG-1.jpg" too.
    const owner = new Map<string, string>();
    for (const source of sources) {
      for (const alias of aliasesOf(source.filename)) {
        owner.set(alias, source.id);
      }
    }
    const targets: StatusFile[] = [];
    const hit = new Set<string>();
    for (const copy of gallery) {
      const id = aliasesOf(copy.filename)
        .map(alias => owner.get(alias))
        .find((v): v is string => v !== undefined);
      if (id !== undefined) {
        targets.push(copy);
        hit.add(id);
      }
    }
    if (targets.length === 0) {
      /*
       * Nothing public to take back — still drop the markers so the UI agrees.
       * Not a refusal: a status whose only copy is the private one in the
       * Vault lands here, and telling its caller "the gallery copy is still
       * there" (and offering to undo by publishing it) was exactly wrong.
       */
      await removeSavedStatusIds(sources);
      return { removed: [], refused: false, unreadable: false };
    }
    const ok = await deleteSavedStatuses(targets);
    if (!ok) {
      /*
       * Android 11+ asks the user to confirm deleting media through MediaStore,
       * and Deny leaves every copy in place. The markers stay too: the ticks
       * must keep describing what is really in the gallery.
       */
      return { removed: [], refused: true, unreadable: false };
    }
    await removeSavedStatusIds(sources);
    return { removed: Array.from(hit), refused: false, unreadable: false };
  } catch {
    return { removed: [], refused: true, unreadable: false };
  }
};

const dirBytes = async (dir: string): Promise<number> => {
  try {
    if (!(await RNFS.exists(dir))) {
      return 0;
    }
    const entries = await RNFS.readDir(dir);
    return entries.reduce(
      (total, entry) => total + (entry.isFile() ? Number(entry.size) || 0 : 0),
      0,
    );
  } catch {
    return 0;
  }
};

/** Figures shown on the Tools screen. */
export const getStorageStats = async (): Promise<StorageStats> => {
  const [saved, vault, shareBytes, tempBytes] = await Promise.all([
    // Sizes only: durations would open every saved video to answer.
    savedStatusFilesForStats(),
    listVault(),
    dirBytes(SHARE_CACHE_DIR),
    dirBytes(TEMP_DIR),
  ]);

  const all = saved.concat(vault);
  const photoBytes = all
    .filter(f => f.type === 'image')
    .reduce((t, f) => t + f.size, 0);
  const videoBytes = all
    .filter(f => f.type === 'video')
    .reduce((t, f) => t + f.size, 0);

  return {
    photoBytes,
    videoBytes,
    totalBytes: photoBytes + videoBytes,
    savedCount: all.length,
    vaultCount: vault.length,
    cacheBytes: shareBytes + tempBytes,
  };
};

/** Empties the share/temp scratch directories. Returns bytes reclaimed. */
export const clearShareCache = async (): Promise<number> => {
  let freed = 0;
  for (const dir of [SHARE_CACHE_DIR, TEMP_DIR]) {
    try {
      if (!(await RNFS.exists(dir))) {
        continue;
      }
      const entries = await RNFS.readDir(dir);
      for (const entry of entries) {
        /*
         * Skip anything a save or a share is using. The shell sweeps these
         * directories on a timer shortly after launch, which is exactly when
         * auto-save is streaming statuses through them: deleting a temp copy
         * mid-write made the save fail for no reason the user could see. A
         * ".part" file is a copy still being written, for the same reason.
         */
        if (
          !entry.isFile() ||
          inFlight.has(entry.path) ||
          entry.name.endsWith('.part')
        ) {
          continue;
        }
        freed += Number(entry.size) || 0;
        await RNFS.unlink(entry.path);
      }
    } catch {
      // Partial cleanup is fine; report what we managed to free.
    }
  }
  return freed;
};

/**
 * Groups saved files that share a size and base name, which is how the same
 * status saved twice shows up. Returns the redundant copies, not the originals.
 */
export const findDuplicates = async (): Promise<StatusFile[]> => {
  const saved = await getSavedStatusFiles();
  const seen = new Map<string, StatusFile>();
  const dupes: StatusFile[] = [];
  for (const file of saved) {
    const key = `${baseName(file.filename)}:${file.size}`;
    if (seen.has(key)) {
      dupes.push(file);
    } else {
      seen.set(key, file);
    }
  }
  return dupes;
};

/** What the Library can see right now. Never asks. */
export const peekGalleryAccess = (): Promise<MediaAccess> => peekMediaAccess();

/**
 * Asks for the storage permission, from a place the user chose to ask from:
 * the Feed's empty state on Android 10 and below, or the Settings row there.
 * The session cache is cleared first so a refusal earlier in the session does
 * not swallow the request. Above Android 10 there is nothing to ask for and
 * this resolves `full` without a dialog.
 */
export const requestGalleryAccess = async (): Promise<MediaAccess> => {
  resetMediaAccessCache();
  return ensureMediaAccess();
};
