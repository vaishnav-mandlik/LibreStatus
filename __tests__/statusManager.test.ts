/**
 * @format
 *
 * The storage layer is where every serious bug in this app has lived, so these
 * tests exercise the real functions against the mocked native modules rather
 * than asserting on implementation details.
 */

// The gallery layer asks for MediaStore access before every album read, and
// react-native's PermissionsAndroid throws outside a real app. Mocked here so
// each test can say whether the read is permitted.
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  __esModule: true,
  default: {
    PERMISSIONS: {
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
      READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO',
    },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    check: jest.fn().mockResolvedValue(false),
    request: jest.fn().mockResolvedValue('denied'),
    requestMultiple: jest.fn().mockResolvedValue({}),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { NativeModules, PermissionsAndroid } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import {
  addSavedStatusIds,
  clearShareCache,
  deleteSavedCopiesOf,
  deleteSavedStatuses,
  findDuplicates,
  GALLERY_ALBUM,
  getSavedStatusFiles,
  getSavedStatusIds,
  getStatusFiles,
  getStorageStats,
  holdCacheFile,
  isSaved,
  LEGACY_GALLERY_ALBUM,
  markSaved,
  materialise,
  releaseCacheFile,
  removeSavedStatusIds,
  saveMany,
  saveStatusToGallery,
  syncSavedStatusIds,
} from '../src/utils/statusManager';
import { resetMediaAccessCache } from '../src/utils/permissions';
import { asMock, dirEntry, galleryEdge, setPlatform, status } from '../test-support/testUtils';

const SAVED_KEY = '@saved_status_ids';
const native = NativeModules.FolderPicker;

const storedIds = async (): Promise<string[]> =>
  JSON.parse((await AsyncStorage.getItem(SAVED_KEY)) ?? '[]');

/** Grants the media read permission for the rest of the current test. */
const grantMediaAccess = (): void => {
  asMock(PermissionsAndroid.check).mockResolvedValue(true);
  resetMediaAccessCache();
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  setPlatform('android', 33);
  // The permission decision is cached for the session, so it has to be reset
  // or the first test in this file would fix it for all the others.
  resetMediaAccessCache();
  asMock(PermissionsAndroid.check).mockResolvedValue(false);
  // Several tests deliberately make a native call fail; the layer logs those
  // by design, and that log is not what is under test.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  asMock(RNFS.exists).mockResolvedValue(false);
  asMock(RNFS.readDir).mockResolvedValue([]);
  asMock(RNFS.stat).mockResolvedValue({ size: 0 });
  asMock(CameraRoll.getPhotos).mockResolvedValue({ edges: [] });
  asMock(CameraRoll.save).mockResolvedValue('saved');
  asMock(CameraRoll.deletePhotos).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('saved-state matching', () => {
  it('matches on id, filename, or extension-less base name', () => {
    const file = status({ id: 'IMG-1.jpg', filename: 'IMG-1.jpg' });
    expect(isSaved(file, new Set(['IMG-1.jpg']))).toBe(true);
    expect(isSaved(file, new Set(['IMG-1']))).toBe(true);
    expect(isSaved(file, new Set(['IMG-2.jpg']))).toBe(false);
  });

  it('markSaved returns new objects and never mutates the input', () => {
    const input = [status({ filename: 'a.jpg' }), status({ filename: 'b.jpg' })];
    const out = markSaved(input, new Set(['b']));
    expect(out.map(f => f.isSaved)).toEqual([false, true]);
    expect(input[1].isSaved).toBeUndefined();
    expect(out[1]).not.toBe(input[1]);
  });
});

describe('saved id bookkeeping', () => {
  it('add stores every alias and remove drops every alias', async () => {
    const file = status({ id: 'IMG-1.jpg', filename: 'IMG-1.jpg' });
    await addSavedStatusIds([file]);
    expect((await storedIds()).sort()).toEqual(['IMG-1', 'IMG-1.jpg']);

    // The old removal only dropped the exact id, so the base-name alias kept
    // the status marked saved forever.
    await removeSavedStatusIds([file]);
    expect(await storedIds()).toEqual([]);
  });

  it('does not lose one writer\u2019s ids when two overlap', async () => {
    /*
     * The set is a read-modify-write over one key and the app has several
     * writers going at once (a quick save, a batch, auto-save, the reconcile
     * pass). Interleaved, the second write was computed from a set read before
     * the first landed and silently dropped it: the tick vanished from a
     * status that really was in the album, and saving it again duplicated it.
     */
    await Promise.all([
      addSavedStatusIds([status({ filename: 'a.jpg' })]),
      addSavedStatusIds([status({ filename: 'b.jpg' })]),
      addSavedStatusIds([status({ filename: 'c.jpg' })]),
    ]);

    expect((await storedIds()).sort()).toEqual([
      'a',
      'a.jpg',
      'b',
      'b.jpg',
      'c',
      'c.jpg',
    ]);
  });

  it('does not resurrect an id that a concurrent removal dropped', async () => {
    await addSavedStatusIds([status({ filename: 'x.jpg' })]);
    await Promise.all([
      removeSavedStatusIds([status({ filename: 'x.jpg' })]),
      addSavedStatusIds([status({ filename: 'y.jpg' })]),
    ]);
    expect((await storedIds()).sort()).toEqual(['y', 'y.jpg']);
  });

  it('tolerates a corrupt stored blob', async () => {
    await AsyncStorage.setItem(SAVED_KEY, '{not json');
    await expect(getSavedStatusIds()).resolves.toEqual([]);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(['ok', 7, null]));
    await expect(getSavedStatusIds()).resolves.toEqual(['ok']);
  });
});

describe('syncSavedStatusIds', () => {
  it('adds gallery aliases and prunes markers for files no longer anywhere', async () => {
    await AsyncStorage.setItem(
      SAVED_KEY,
      JSON.stringify(['gone.jpg', 'gone', 'present.jpg']),
    );
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [galleryEdge('present.jpg')],
    });

    const result = await syncSavedStatusIds();

    expect(result.has('present.jpg')).toBe(true);
    expect(result.has('present')).toBe(true);
    // Deleted outside the app: must stop being marked as saved.
    expect(result.has('gone.jpg')).toBe(false);
    expect((await storedIds()).sort()).toEqual(['present', 'present.jpg']);
  });

  it('counts vault files as live so they are not pruned', async () => {
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(['v.jpg']));
    asMock(RNFS.exists).mockImplementation(async (p: string) =>
      p.endsWith('/vault'),
    );
    asMock(RNFS.readDir).mockResolvedValue([dirEntry('v.jpg', 500)]);

    const result = await syncSavedStatusIds();
    expect(result.has('v.jpg')).toBe(true);
  });

  it('keeps the stored set intact when the gallery cannot be read', async () => {
    // A revoked permission must not look like an empty album. The old code
    // pruned everything here and un-ticked the entire Feed.
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(['kept.jpg']));
    asMock(CameraRoll.getPhotos).mockRejectedValue(new Error('denied'));

    const result = await syncSavedStatusIds();
    expect(result.has('kept.jpg')).toBe(true);
    expect(await storedIds()).toEqual(['kept.jpg']);
  });

  it('keeps the stored set when the album reads empty because access is denied', async () => {
    /*
     * The dangerous case the comment in the source claims to cover: MediaStore
     * does not throw for a missing read permission, it just returns nothing.
     * Without the access check that silence pruned every marker in the app.
     *
     * Android 10, because that is the only version left with a permission to
     * be missing: from 11 up the app holds none and reads its own files.
     */
    setPlatform('android', 29);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(['kept.jpg', 'kept']));

    const result = await syncSavedStatusIds();

    expect(result.has('kept.jpg')).toBe(true);
    expect((await storedIds()).sort()).toEqual(['kept', 'kept.jpg']);
  });

  it('keeps a marker written while the album read was still in flight', async () => {
    /*
     * The album read takes a moment. A save that finishes inside that window
     * writes a marker for a file MediaStore has not indexed yet; judged
     * against the snapshot taken before the read it looked deleted and was
     * wiped, un-ticking a status the user had just saved.
     */
    grantMediaAccess();
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(['old.jpg', 'old']));
    let open: () => void = () => undefined;
    const gate = new Promise<void>(resolve => {
      open = resolve;
    });
    asMock(CameraRoll.getPhotos).mockImplementation(async () => {
      await gate;
      return { edges: [] };
    });

    const syncing = syncSavedStatusIds();
    await addSavedStatusIds([status({ filename: 'fresh.jpg' })]);
    open();
    const result = await syncing;

    expect(result.has('fresh.jpg')).toBe(true);
    expect((await storedIds()).sort()).toEqual(['fresh', 'fresh.jpg']);
    // The marker that WAS in the snapshot and is in no album is still pruned.
    expect(result.has('old.jpg')).toBe(false);
  });

  it('does prune when the album is readable and genuinely empty', async () => {
    // The other half of the same rule: with access, empty means empty.
    grantMediaAccess();
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(['gone.jpg', 'gone']));

    const result = await syncSavedStatusIds();

    expect(result.size).toBe(0);
    expect(await storedIds()).toEqual([]);
  });
});

describe('materialise', () => {
  const dest = '/data/cache/out';

  it('streams content:// through the native module, via a temp file, then renames', async () => {
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
    });
    const path = await materialise(file, dest);

    expect(path).toBe(`${dest}/IMG-1.jpg`);
    expect(RNFS.mkdir).toHaveBeenCalledWith(dest);
    expect(native.copyDocument).toHaveBeenCalledWith(
      'content://tree/doc/IMG-1.jpg',
      `${dest}/IMG-1.jpg.part`,
    );
    expect(RNFS.moveFile).toHaveBeenCalledWith(
      `${dest}/IMG-1.jpg.part`,
      `${dest}/IMG-1.jpg`,
    );
    // The base64 fallback must not run when the native stream exists.
    expect(RNFS.readFile).not.toHaveBeenCalled();
  });

  it('copies plain files directly', async () => {
    const file = status({ uri: 'file:///src/IMG-2.jpg', filename: 'IMG-2.jpg' });
    await materialise(file, dest);
    expect(RNFS.copyFile).toHaveBeenCalledWith(
      '/src/IMG-2.jpg',
      `${dest}/IMG-2.jpg.part`,
    );
    expect(native.copyDocument).not.toHaveBeenCalled();
  });

  it('reuses an existing destination without copying', async () => {
    asMock(RNFS.exists).mockResolvedValue(true);
    const file = status({ filename: 'IMG-3.jpg' });
    await materialise(file, dest);
    expect(RNFS.copyFile).not.toHaveBeenCalled();
    expect(RNFS.moveFile).not.toHaveBeenCalled();
  });

  it('cannot be steered out of the destination directory by a hostile name', async () => {
    // Status names come from WhatsApp's folder, not from us.
    const file = status({
      uri: 'file:///src/x',
      filename: '../../databases/evil.jpg',
    });

    const path = await materialise(file, dest);

    expect(path.startsWith(`${dest}/`)).toBe(true);
    // No separator and no leading dot left, so nothing can resolve upwards.
    expect(path.slice(dest.length + 1)).not.toMatch(/[/\\]/);
    expect(path.slice(dest.length + 1)).not.toMatch(/^\./);
    expect(RNFS.moveFile).toHaveBeenCalledWith(`${path}.part`, path);
  });

  it('copies once when two callers want the same file at the same time', async () => {
    /*
     * Both copies streamed into the same ".part" file and both renamed it into
     * place, so the bytes interleaved and the corruption is what reached the
     * gallery.
     */
    asMock(native.copyDocument).mockImplementation(
      async () => new Promise(resolve => setTimeout(resolve, 5)),
    );
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
    });

    const paths = await Promise.all([
      materialise(file, dest),
      materialise(file, dest),
    ]);

    expect(paths[0]).toBe(paths[1]);
    expect(native.copyDocument).toHaveBeenCalledTimes(1);
    expect(RNFS.moveFile).toHaveBeenCalledTimes(1);
  });

  it('removes the partial file and rethrows when the copy fails', async () => {
    asMock(RNFS.copyFile).mockRejectedValueOnce(new Error('ENOSPC'));
    const file = status({ uri: 'file:///src/big.mp4', filename: 'big.mp4' });

    await expect(materialise(file, dest)).rejects.toThrow('ENOSPC');
    expect(RNFS.unlink).toHaveBeenCalledWith(`${dest}/big.mp4.part`);
    // No truncated file may be left under the real name for `exists` to reuse.
    expect(RNFS.moveFile).not.toHaveBeenCalled();
  });
});

describe('gallery albums', () => {
  /*
   * The album was renamed with the app. Saves go to the new name only; the
   * Library reads both so nobody's existing saves vanish after the update.
   */
  const albumOf = (call: unknown[]): string =>
    (call[0] as { groupName: string }).groupName;

  it('writes new saves into the current album, never the legacy one', async () => {
    expect(GALLERY_ALBUM).toBe('Status');
    expect(LEGACY_GALLERY_ALBUM).toBe('Status Saver');
    await saveStatusToGallery(status({ uri: 'file:///src/a.jpg', filename: 'a.jpg' }));
    expect(CameraRoll.save).toHaveBeenCalledWith(
      'file:///src/a.jpg',
      expect.objectContaining({ album: 'Status' }),
    );
  });

  it('reads both albums into one library, newest first', async () => {
    asMock(CameraRoll.getPhotos).mockImplementation(
      async ({ groupName }: { groupName: string }) => {
        if (groupName === 'Status') {
          return {
            edges: [
              galleryEdge('new.jpg', { uri: 'content://media/2', timestamp: 2000 }),
            ],
          };
        }
        if (groupName === 'Status Saver') {
          return {
            edges: [
              galleryEdge('old.jpg', { uri: 'content://media/1', timestamp: 1000 }),
              galleryEdge('older.mp4', {
                uri: 'content://media/0',
                timestamp: 500,
                type: 'video',
              }),
            ],
          };
        }
        return { edges: [] };
      },
    );

    const files = await getSavedStatusFiles();

    expect(asMock(CameraRoll.getPhotos).mock.calls.map(albumOf).sort()).toEqual([
      'Status',
      'Status Saver',
    ]);
    expect(files.map(f => f.filename)).toEqual(['new.jpg', 'old.jpg', 'older.mp4']);
    expect(files.every(f => f.isSaved)).toBe(true);
    expect(files[2].type).toBe('video');
  });

  it('keeps one entry per content URI when MediaStore lists an item under both', async () => {
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [galleryEdge('twice.jpg', { uri: 'content://media/7' })],
    });
    const files = await getSavedStatusFiles();
    expect(files).toHaveLength(1);
  });

  it('gives an album row with no display name an id of its own', async () => {
    /*
     * MediaStore can answer with a row whose display name is null: a file
     * another app wrote, or an OEM provider that simply does not fill the
     * column in. The fallback id used to be the row's position in the read in
     * progress, which is neither unique nor stable — the first unnamed row of
     * each album came back as `status_0`, so two different files reached the
     * Library sharing one id. That id is what the grid keys on and what a
     * selection identifies items by, so tapping one tile selected the other
     * and a delete took the wrong file with it.
     */
    asMock(CameraRoll.getPhotos).mockImplementation(
      async ({ groupName }: { groupName: string }) => ({
        edges: [
          galleryEdge('', {
            uri:
              groupName === 'Status'
                ? 'content://media/external/images/media/12'
                : 'content://media/external/video/media/34',
          }),
        ],
      }),
    );

    const files = await getSavedStatusFiles();

    expect(files).toHaveLength(2);
    expect(files.map(f => f.id).sort()).toEqual(['status_12', 'status_34']);
    expect(new Set(files.map(f => f.id)).size).toBe(2);
  });

  it('reads past the first page instead of truncating a large album', async () => {
    /*
     * One 1000-row query dropped everything after the first thousand: those
     * files disappeared from the Library and, because syncSavedStatusIds reads
     * "not in the album" as "deleted", lost their saved markers too.
     */
    grantMediaAccess();
    asMock(CameraRoll.getPhotos).mockImplementation(
      async ({ groupName, after }: { groupName: string; after?: string }) => {
        if (groupName !== GALLERY_ALBUM) {
          return { edges: [], page_info: { has_next_page: false } };
        }
        return after
          ? {
              edges: [galleryEdge('page2.jpg', { uri: 'u2', timestamp: 1 })],
              page_info: { has_next_page: false },
            }
          : {
              edges: [galleryEdge('page1.jpg', { uri: 'u1', timestamp: 2 })],
              page_info: { has_next_page: true, end_cursor: 'cursor-1' },
            };
      },
    );

    const files = await getSavedStatusFiles();
    expect(files.map(f => f.filename)).toEqual(['page1.jpg', 'page2.jpg']);

    // ...and the second page keeps its marker instead of being pruned.
    await addSavedStatusIds([status({ filename: 'page2.jpg' })]);
    const ids = await syncSavedStatusIds();
    expect(ids.has('page2.jpg')).toBe(true);
  });

  it('stops paging when the provider repeats a cursor', async () => {
    grantMediaAccess();
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [galleryEdge('loop.jpg', { uri: 'u' })],
      page_info: { has_next_page: true, end_cursor: undefined },
    });
    await expect(getSavedStatusFiles()).resolves.toHaveLength(1);
    expect(asMock(CameraRoll.getPhotos).mock.calls).toHaveLength(2);
  });

  it('still shows the current album when the legacy album read fails', async () => {
    // The legacy album is a courtesy read for pre-rename libraries. Letting it
    // fail the whole query emptied the Library and froze every saved marker.
    grantMediaAccess();
    asMock(CameraRoll.getPhotos).mockImplementation(
      async ({ groupName }: { groupName: string }) => {
        if (groupName === LEGACY_GALLERY_ALBUM) {
          throw new Error('cursor closed');
        }
        return { edges: [galleryEdge('a.jpg', { uri: 'u1' })] };
      },
    );

    await expect(getSavedStatusFiles()).resolves.toHaveLength(1);
  });

  it('returns an empty library, not a crash, when the gallery cannot be read', async () => {
    asMock(CameraRoll.getPhotos).mockRejectedValue(new Error('denied'));
    await expect(getSavedStatusFiles()).resolves.toEqual([]);
  });
});

describe('saveStatusToGallery', () => {
  it('writes one copy when two callers save the same status at once', async () => {
    /*
     * Auto-save's in-flight guard used to live in a ref on the Feed screen,
     * which the shell unmounts when the user changes tab. Leaving the Feed and
     * coming back mid-batch mounted a fresh screen with an empty guard, and the
     * files still being copied looked like candidates all over again: nothing
     * had marked them yet, so the album index could not catch it either, and
     * MediaStore wrote both "IMG-1.jpg" and "IMG-1(1).jpg".
     */
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
      type: 'image',
    });

    const [first, second] = await Promise.all([
      saveStatusToGallery(file),
      saveStatusToGallery(file),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(CameraRoll.save).toHaveBeenCalledTimes(1);
    expect((await storedIds()).sort()).toEqual(['IMG-1', 'IMG-1.jpg']);
  });

  it('lets a later save of the same status through once the first is done', async () => {
    // The claim is only for the write in flight; it must not become a cache
    // that stops a genuine re-save after the user deleted the copy.
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
      type: 'image',
    });

    await saveStatusToGallery(file);
    await saveStatusToGallery(file);

    expect(CameraRoll.save).toHaveBeenCalledTimes(2);
  });

  it('writes to the album, records the ids, and cleans its temp copy', async () => {
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
      type: 'image',
    });

    await expect(saveStatusToGallery(file)).resolves.toBe(true);

    expect(CameraRoll.save).toHaveBeenCalledWith(
      'file:///data/cache/statuses/IMG-1.jpg',
      { type: 'photo', album: 'Status' },
    );
    expect((await storedIds()).sort()).toEqual(['IMG-1', 'IMG-1.jpg']);
    expect(RNFS.unlink).toHaveBeenCalledWith('/data/cache/statuses/IMG-1.jpg');
  });

  it('skips the write when the album already holds that file', async () => {
    /*
     * CameraRoll.save never overwrites: a second save landed a second file
     * ("IMG-1(1).jpg") and the Library listed the same status twice.
     */
    grantMediaAccess();
    const file = status({ uri: 'file:///src/IMG-1.jpg', filename: 'IMG-1.jpg' });
    await addSavedStatusIds([file]);
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [galleryEdge('IMG-1.jpg', { uri: 'content://media/1' })],
    });

    // Still "saved" from the caller's point of view: the file is in the album.
    await expect(saveStatusToGallery(file)).resolves.toBe(true);
    expect(CameraRoll.save).not.toHaveBeenCalled();
  });

  it('recognises the copy MediaStore renamed, not just an exact name', async () => {
    grantMediaAccess();
    const file = status({ uri: 'file:///src/IMG-1.jpg', filename: 'IMG-1.jpg' });
    await addSavedStatusIds([file]);
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [galleryEdge('IMG-1(1).jpg', { uri: 'content://media/2' })],
    });

    await expect(saveStatusToGallery(file)).resolves.toBe(true);
    expect(CameraRoll.save).not.toHaveBeenCalled();
  });

  it('does not query MediaStore at all for a status nothing has marked saved', async () => {
    // The common case has to stay a single write, not a write behind a
    // 1000-row album query.
    const file = status({ uri: 'file:///src/new.jpg', filename: 'new.jpg' });
    await expect(saveStatusToGallery(file)).resolves.toBe(true);
    expect(CameraRoll.getPhotos).not.toHaveBeenCalled();
    expect(CameraRoll.save).toHaveBeenCalledTimes(1);
  });

  it('saves anyway when the album cannot be read', async () => {
    // An unreadable album is not evidence of a duplicate; refusing to save
    // would be the worse failure.
    const file = status({ uri: 'file:///src/IMG-1.jpg', filename: 'IMG-1.jpg' });
    await addSavedStatusIds([file]);
    asMock(CameraRoll.getPhotos).mockRejectedValue(new Error('denied'));

    await expect(saveStatusToGallery(file)).resolves.toBe(true);
    expect(CameraRoll.save).toHaveBeenCalledTimes(1);
  });

  it('two saves of one status share a temp copy and unlink it once', async () => {
    /*
     * Whoever finished first used to unlink the temp file out from under the
     * other save, which then failed to write a file that was right there.
     */
    asMock(native.copyDocument).mockImplementation(
      async () => new Promise(resolve => setTimeout(resolve, 2)),
    );
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
    });

    const results = await Promise.all([
      saveStatusToGallery(file),
      saveStatusToGallery(file),
    ]);

    expect(results).toEqual([true, true]);
    const unlinks = asMock(RNFS.unlink).mock.calls.filter(
      c => c[0] === '/data/cache/statuses/IMG-1.jpg',
    );
    expect(unlinks).toHaveLength(1);
  });

  it('passes videos as videos and does not record a failed save', async () => {
    asMock(CameraRoll.save).mockRejectedValueOnce(new Error('nope'));
    const file = status({ uri: 'file:///src/v.mp4', filename: 'v.mp4', type: 'video' });

    await expect(saveStatusToGallery(file)).resolves.toBe(false);
    expect(CameraRoll.save).toHaveBeenCalledWith(
      'file:///src/v.mp4',
      expect.objectContaining({ type: 'video' }),
    );
    expect(await storedIds()).toEqual([]);
  });
});

describe('saveMany', () => {
  it('reports progress per file and returns only the successes', async () => {
    asMock(CameraRoll.save)
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');
    const files = ['a.jpg', 'b.jpg', 'c.jpg'].map(f =>
      status({ uri: `file:///src/${f}`, filename: f }),
    );
    const progress: Array<[number, number]> = [];

    const saved = await saveMany(files, (done, total) =>
      progress.push([done, total]),
    );

    expect(saved.map(f => f.filename)).toEqual(['a.jpg', 'c.jpg']);
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('reads the album once for the whole batch and writes each file once', async () => {
    grantMediaAccess();
    const files = ['a.jpg', 'a.jpg', 'b.jpg'].map(f =>
      status({ uri: `file:///src/${f}`, filename: f }),
    );
    await addSavedStatusIds([files[0]]);
    asMock(CameraRoll.getPhotos).mockResolvedValue({ edges: [] });

    const saved = await saveMany(files);

    // Both albums, once each — not once per file.
    expect(asMock(CameraRoll.getPhotos).mock.calls).toHaveLength(2);
    // The same status selected twice must not become two album files.
    expect(asMock(CameraRoll.save).mock.calls.map(c => c[0])).toEqual([
      'file:///src/a.jpg',
      'file:///src/b.jpg',
    ]);
    expect(saved).toHaveLength(3);
  });
});

describe('deleteSavedCopiesOf', () => {
  it('finds the gallery copy by name and deletes that, not the source', async () => {
    // Undo is handed the WhatsApp source, which MediaStore cannot delete by.
    const source = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
    });
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [
        galleryEdge('IMG-1.jpg', { uri: 'content://media/123' }),
        galleryEdge('other.jpg', { uri: 'content://media/999' }),
      ],
    });
    await addSavedStatusIds([source]);

    await expect(deleteSavedCopiesOf([source])).resolves.toEqual({
      removed: [source.id],
      refused: false,
      unreadable: false,
    });

    expect(CameraRoll.deletePhotos).toHaveBeenCalledWith(['content://media/123']);
    expect(await storedIds()).toEqual([]);
  });

  it('still clears the markers when the album is readable and holds no copy', async () => {
    grantMediaAccess();
    const source = status({ filename: 'IMG-1.jpg' });
    await addSavedStatusIds([source]);

    await expect(deleteSavedCopiesOf([source])).resolves.toEqual({
      removed: [],
      refused: false,
      unreadable: false,
    });
    expect(CameraRoll.deletePhotos).not.toHaveBeenCalled();
    expect(await storedIds()).toEqual([]);
  });

  it('changes nothing when the album cannot be read', async () => {
    /*
     * An unreadable album is not evidence that no copy exists. Clearing the
     * markers here un-ticked a status whose gallery copy was still there, and
     * the next save wrote a second album file.
     */
    const source = status({ filename: 'IMG-1.jpg' });
    await addSavedStatusIds([source]);
    asMock(CameraRoll.getPhotos).mockRejectedValue(new Error('denied'));

    await expect(deleteSavedCopiesOf([source])).resolves.toEqual({ removed: [], refused: false, unreadable: true });
    expect(CameraRoll.deletePhotos).not.toHaveBeenCalled();
    expect((await storedIds()).sort()).toEqual(['IMG-1', 'IMG-1.jpg']);
  });

  it('keeps the markers when the user refuses the delete', async () => {
    /*
     * Android 11+ puts up its own "Allow … to delete this photo?" dialog and
     * the answer can be Deny — verified on device. Clearing the markers anyway
     * left the copy in the gallery with the app believing nothing was saved, so
     * the tile un-ticked and the next save wrote a second file beside it.
     */
    grantMediaAccess();
    const source = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
    });
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [galleryEdge('IMG-1.jpg', { uri: 'content://media/123' })],
    });
    await addSavedStatusIds([source]);
    asMock(CameraRoll.deletePhotos).mockRejectedValue(new Error('user denied'));

    await expect(deleteSavedCopiesOf([source])).resolves.toMatchObject({ refused: true });

    expect(CameraRoll.deletePhotos).toHaveBeenCalled();
    expect((await storedIds()).sort()).toEqual(['IMG-1', 'IMG-1.jpg']);
  });

  it('keeps the markers when the permission was silently reduced', async () => {
    // Access denied: MediaStore returns an empty album instead of failing, so
    // the read throws MEDIA_ACCESS_DENIED and undo must be a no-op. Android 10
    // is the last version with a storage permission that can be missing.
    setPlatform('android', 29);
    const source = status({ filename: 'IMG-1.jpg' });
    await addSavedStatusIds([source]);

    // Unreadable, not refused: nothing is known about gallery copies, and the
    // markers stay until a read that can see the album says otherwise.
    await expect(deleteSavedCopiesOf([source])).resolves.toEqual({
      removed: [],
      refused: false,
      unreadable: true,
    });
    expect((await storedIds()).length).toBeGreaterThan(0);
  });
});

describe('deleteSavedStatuses', () => {
  it('prunes the source markers even when the copy was renamed on save', async () => {
    // "IMG-1(1).jpg" is the album's copy of "IMG-1.jpg". Deleting it used to
    // leave the source marker behind, so the Feed kept a tick for a file that
    // no longer existed anywhere.
    const source = status({ filename: 'IMG-1.jpg' });
    await addSavedStatusIds([source]);
    const copy = status({
      id: 'IMG-1(1).jpg',
      filename: 'IMG-1(1).jpg',
      uri: 'content://media/9',
    });

    await expect(deleteSavedStatuses([copy])).resolves.toBe(true);

    expect(CameraRoll.deletePhotos).toHaveBeenCalledWith(['content://media/9']);
    expect(await storedIds()).toEqual([]);
    expect(isSaved(source, new Set(await storedIds()))).toBe(false);
  });

  it('deletes by uri and reports failure without throwing', async () => {
    asMock(CameraRoll.deletePhotos).mockRejectedValueOnce(new Error('user said no'));
    const file = status({ uri: 'content://media/1', filename: 'a.jpg' });
    await addSavedStatusIds([file]);

    await expect(deleteSavedStatuses([file])).resolves.toBe(false);
    // Markers stay when the delete was refused.
    expect((await storedIds()).length).toBeGreaterThan(0);
  });
});

describe('getStatusFiles', () => {
  it('returns nothing off Android', async () => {
    setPlatform('ios', 17);
    await expect(getStatusFiles()).resolves.toEqual([]);
  });

  it('reads the granted SAF tree and never turns a missing timestamp into "now"', async () => {
    await AsyncStorage.setItem('whatsapp_status_folder_uri_whatsapp', 'content://tree');
    asMock(native.listFiles).mockResolvedValueOnce([
      { uri: 'content://tree/a.jpg', name: 'a.jpg', type: 'image/jpeg', size: 10, lastModified: 5000 },
      { uri: 'content://tree/v.mp4', name: 'v.mp4', type: '', size: 20, lastModified: 0 },
    ]);

    const files = await getStatusFiles();

    expect(files.map(f => f.id)).toEqual(['a.jpg', 'v.mp4']);
    expect(files[1].type).toBe('video');
    // lastModified 0 must stay 0, or the item leaps to the top on every scan.
    expect(files[1].timestamp).toBe(0);
  });

  it('merges WhatsApp and WhatsApp Business and dedupes by filename', async () => {
    await AsyncStorage.setItem('whatsapp_status_folder_uri_whatsapp', 'content://wa');
    await AsyncStorage.setItem('whatsapp_status_folder_uri_business', 'content://w4b');
    asMock(native.listFiles)
      .mockResolvedValueOnce([
        { uri: 'content://wa/x.jpg', name: 'x.jpg', type: 'image/jpeg', size: 1, lastModified: 10 },
      ])
      .mockResolvedValueOnce([
        { uri: 'content://w4b/x.jpg', name: 'x.jpg', type: 'image/jpeg', size: 1, lastModified: 20 },
        { uri: 'content://w4b/y.jpg', name: 'y.jpg', type: 'image/jpeg', size: 1, lastModified: 15 },
      ]);

    const files = await getStatusFiles();

    expect(files.map(f => f.id)).toEqual(['x.jpg', 'y.jpg']);
    // The newer timestamp wins the duplicate.
    expect(files[0].uri).toBe('content://w4b/x.jpg');
  });

  it('resolves empty rather than throwing when the SAF grant is gone', async () => {
    // The grant can be revoked in Android settings between two listings. The
    // Feed has to render an empty state, not crash on a rejected promise.
    await AsyncStorage.setItem('whatsapp_status_folder_uri_whatsapp', 'content://tree');
    asMock(native.listFiles).mockRejectedValue(
      new Error('java.lang.SecurityException: Permission denial'),
    );

    await expect(getStatusFiles()).resolves.toEqual([]);
    // ...and the dead URI is dropped, so the shell can offer the picker again.
    await expect(
      AsyncStorage.getItem('whatsapp_status_folder_uri_whatsapp'),
    ).resolves.toBeNull();
  });

  it('keeps what one folder listed when the other folder fails', async () => {
    await AsyncStorage.setItem('whatsapp_status_folder_uri_whatsapp', 'content://wa');
    await AsyncStorage.setItem('whatsapp_status_folder_uri_business', 'content://w4b');
    asMock(native.listFiles)
      .mockResolvedValueOnce([
        { uri: 'content://wa/x.jpg', name: 'x.jpg', type: 'image/jpeg', size: 1, lastModified: 10 },
      ])
      .mockRejectedValueOnce(new Error('Status folder not found'));

    const files = await getStatusFiles();
    expect(files.map(f => f.id)).toEqual(['x.jpg']);
  });

  it('falls back to legacy paths below Android 11 and skips junk', async () => {
    setPlatform('android', 29);
    asMock(RNFS.exists).mockImplementation(async (p: string) =>
      p.endsWith('WhatsApp/Media/.Statuses'),
    );
    asMock(RNFS.readDir).mockResolvedValue([
      dirEntry('.nomedia', 5000),
      dirEntry('tiny.jpg', 100),
      dirEntry('IMG.jpg', 5000),
      dirEntry('notes.txt', 5000),
      dirEntry('clip.mp4', 9000),
    ]);

    const files = await getStatusFiles();
    expect(files.map(f => f.id).sort()).toEqual(['IMG.jpg', 'clip.mp4']);
  });

  it('reads every legacy candidate instead of stopping at the first that exists', async () => {
    /*
     * WhatsApp moved its media under Android/media and leaves the old
     * /WhatsApp/Media/.Statuses tree behind. The scan returned as soon as one
     * candidate existed — empty result included — so on a phone that has been
     * through that move the empty leftover answered for the whole device and
     * the Feed said "No statuses here" over a folder full of them.
     */
    setPlatform('android', 29);
    const legacy = '/storage/emulated/0/WhatsApp/Media/.Statuses';
    const scoped =
      '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses';
    asMock(RNFS.exists).mockImplementation(async (p: string) =>
      [legacy, scoped].includes(p),
    );
    asMock(RNFS.readDir).mockImplementation(async (dir: string) =>
      dir === scoped ? [dirEntry('LIVE.jpg', 5000, { dir: scoped })] : [],
    );

    const files = await getStatusFiles();
    expect(files.map(f => f.id)).toEqual(['LIVE.jpg']);
  });

  it('never dates a legacy file with no mtime to right now', async () => {
    /*
     * "Now" made the file jump to the top of the Feed on every single scan and
     * printed the current clock as its tile stamp, so the capture time it
     * claimed changed each time the user looked at it.
     */
    setPlatform('android', 29);
    asMock(RNFS.exists).mockImplementation(async (p: string) =>
      p.endsWith('WhatsApp/Media/.Statuses'),
    );
    asMock(RNFS.readDir).mockResolvedValue([
      { ...dirEntry('IMG.jpg', 5000), mtime: undefined },
    ]);

    const files = await getStatusFiles();
    expect(files.map(f => f.timestamp)).toEqual([0]);
  });
});

describe('pinned cache files', () => {
  it('shields a staged file from the sweep until it is released', async () => {
    /*
     * `materialise` only holds its destination while the copy runs, so a share
     * that had finished staging held nothing: the boot housekeeping sweep was
     * free to unlink the file in the seconds before the chosen app read it,
     * and the share delivered nothing with no error anywhere to explain it.
     */
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockImplementation(async (dir: string) =>
      dir.endsWith('/status-share')
        ? [dirEntry('IMG-1.jpg', 64, { dir: '/data/cache/status-share' })]
        : [],
    );
    const staged = '/data/cache/status-share/IMG-1.jpg';

    holdCacheFile(staged);
    await expect(clearShareCache()).resolves.toBe(0);
    expect(RNFS.unlink).not.toHaveBeenCalled();

    releaseCacheFile(staged);
    await expect(clearShareCache()).resolves.toBe(64);
    expect(RNFS.unlink).toHaveBeenCalledWith(staged);
  });

  it('keeps the file pinned while any holder is left', async () => {
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockImplementation(async (dir: string) =>
      dir.endsWith('/status-share')
        ? [dirEntry('IMG-1.jpg', 8, { dir: '/data/cache/status-share' })]
        : [],
    );
    const staged = '/data/cache/status-share/IMG-1.jpg';

    // The viewer's share and the selection tray's share stage the same file.
    holdCacheFile(staged);
    holdCacheFile(staged);
    releaseCacheFile(staged);
    await expect(clearShareCache()).resolves.toBe(0);

    releaseCacheFile(staged);
    await expect(clearShareCache()).resolves.toBe(8);
  });
});

describe('findDuplicates', () => {
  it('reports the later copies of same-name-same-size files, never the first', async () => {
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [
        galleryEdge('a.jpg', { size: 100, uri: 'u1' }),
        galleryEdge('a.jpg', { size: 100, uri: 'u2' }),
        galleryEdge('a.jpg', { size: 999, uri: 'u3' }),
        galleryEdge('b.jpg', { size: 100, uri: 'u4' }),
      ],
    });
    const dupes = await findDuplicates();
    expect(dupes.map(d => d.uri)).toEqual(['u2']);
  });
});

describe('storage stats and cache', () => {
  it('sums gallery and vault by type and counts cache bytes', async () => {
    asMock(CameraRoll.getPhotos).mockResolvedValue({
      edges: [
        galleryEdge('p.jpg', { size: 100 }),
        galleryEdge('v.mp4', { size: 1000, type: 'video' }),
      ],
    });
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockImplementation(async (dir: string) => {
      if (dir.endsWith('/vault')) {
        return [dirEntry('vp.jpg', 50)];
      }
      if (dir.endsWith('/status-share')) {
        return [dirEntry('s.jpg', 7)];
      }
      if (dir.endsWith('/statuses')) {
        return [dirEntry('t.mp4', 3)];
      }
      return [];
    });

    const stats = await getStorageStats();

    expect(stats.photoBytes).toBe(150);
    expect(stats.videoBytes).toBe(1000);
    expect(stats.totalBytes).toBe(1150);
    expect(stats.savedCount).toBe(3);
    expect(stats.vaultCount).toBe(1);
    expect(stats.cacheBytes).toBe(10);
  });

  it('never sweeps a cache file a save is still using', async () => {
    /*
     * The shell sweeps these directories on a timer shortly after launch,
     * which is exactly when auto-save is streaming statuses through them.
     * Deleting the temp copy mid-write failed the save with nothing on screen
     * to explain it.
     */
    let open: () => void = () => undefined;
    let entered: () => void = () => undefined;
    const gate = new Promise<void>(resolve => {
      open = resolve;
    });
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    asMock(CameraRoll.save).mockImplementation(async () => {
      entered();
      await gate;
      return 'ok';
    });
    asMock(RNFS.exists).mockImplementation(async (path: string) =>
      path.endsWith('/statuses'),
    );
    asMock(RNFS.readDir).mockImplementation(async (dir: string) =>
      dir.endsWith('/statuses')
        ? [
            dirEntry('IMG-1.jpg', 5, { dir: '/data/cache/statuses' }),
            dirEntry('IMG-1.jpg.part', 2, { dir: '/data/cache/statuses' }),
          ]
        : [],
    );

    const saving = saveStatusToGallery(
      status({ uri: 'content://tree/doc/IMG-1.jpg', filename: 'IMG-1.jpg' }),
    );
    await started;
    const freed = await clearShareCache();
    const sweptDuringSave = asMock(RNFS.unlink).mock.calls.length;
    open();

    await expect(saving).resolves.toBe(true);
    // Neither the file being saved nor a half-written ".part" may be swept.
    expect(freed).toBe(0);
    expect(sweptDuringSave).toBe(0);
  });

  it('clearShareCache deletes the files and reports what it freed', async () => {
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockImplementation(async (dir: string) =>
      dir.endsWith('/status-share')
        ? [dirEntry('a.jpg', 40), dirEntry('sub', 0, { isFile: false })]
        : [dirEntry('b.jpg', 2)],
    );
    await expect(clearShareCache()).resolves.toBe(42);
    expect(RNFS.unlink).toHaveBeenCalledTimes(2);
  });
});

/*
 * What each album read asks MediaStore for.
 *
 * `playableDuration` is not a column: CameraRoll opens every video in the album
 * and reads it with a MediaMetadataRetriever, tens of milliseconds a file. No
 * read is allowed to ask for it. A library of five thousand saves is a couple
 * of thousand videos, and that is most of a minute of file opens before
 * anything can draw; the tile that needs a duration gets one from the same
 * native call it already makes for the poster frame.
 */
describe('how much of the album each read asks for', () => {
  const includes = (): string[][] =>
    asMock(CameraRoll.getPhotos).mock.calls.map(
      call => (call[0] as { include: string[] }).include,
    );

  it('the marker sync asks for filenames only', async () => {
    asMock(CameraRoll.getPhotos).mockClear();
    await syncSavedStatusIds();

    expect(includes().length).toBeGreaterThan(0);
    for (const include of includes()) {
      expect(include).toEqual(['filename']);
    }
  });

  it('the Library asks for size, and not for duration or imageSize', async () => {
    asMock(CameraRoll.getPhotos).mockClear();
    await getSavedStatusFiles();

    expect(includes().length).toBeGreaterThan(0);
    for (const include of includes()) {
      expect(include).toEqual(['filename', 'fileSize']);
      expect(include).not.toContain('imageSize');
    }
  });

  it('no read anywhere asks for a duration', async () => {
    asMock(CameraRoll.getPhotos).mockClear();
    await syncSavedStatusIds();
    await getSavedStatusFiles();
    await getStorageStats();
    await deleteSavedCopiesOf([status({ id: 'x.jpg', filename: 'x.jpg' })]);

    expect(includes().length).toBeGreaterThan(0);
    for (const include of includes()) {
      expect(include).not.toContain('playableDuration');
    }
  });

  it('the undo path asks for filenames only', async () => {
    asMock(CameraRoll.getPhotos).mockClear();
    await deleteSavedCopiesOf([status({ id: 'x.jpg', filename: 'x.jpg' })]);

    expect(includes().length).toBeGreaterThan(0);
    for (const include of includes()) {
      expect(include).toEqual(['filename']);
    }
  });
});
