/**
 * @format
 */

import { NativeModules } from 'react-native';
import {
  clearThumbnailCache,
  getVideoDurationSeconds,
  getVideoMeta,
  getVideoThumbnail,
  isNativeAvailable,
  openSaveFolder,
  SAVE_FOLDER_PATH,
  setKeepAwake,
  setSecureFlag,
  THUMBNAIL_CACHE_LIMIT,
  trimThumbnailCache,
} from '../src/utils/native';
import { GALLERY_ALBUM } from '../src/utils/statusManager';
import { asMock, setPlatform } from '../test-support/testUtils';

const native = NativeModules.FolderPicker;

/** Lets the module's job queue and promise chains settle. */
const flush = (): Promise<void> =>
  new Promise(resolve => setImmediate(resolve));

interface Deferred {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
}

const deferred = (): Deferred => {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise<unknown>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

beforeEach(async () => {
  jest.clearAllMocks();
  setPlatform('android', 33);
  // Drops the module-level memo between tests.
  await clearThumbnailCache();
  jest.clearAllMocks();
  asMock(native.openFolder).mockResolvedValue(true);
  asMock(native.getVideoMeta).mockResolvedValue(null);
});

describe('isNativeAvailable', () => {
  it('is true on Android with the module present', () => {
    expect(isNativeAvailable()).toBe(true);
  });
});

describe('setSecureFlag', () => {
  it('forwards to native and reports success', async () => {
    await expect(setSecureFlag(true)).resolves.toBe(true);
    expect(native.setSecureFlag).toHaveBeenCalledWith(true);
  });

  it('reports false when native refuses, so the switch can revert', async () => {
    asMock(native.setSecureFlag).mockRejectedValueOnce(new Error('no activity'));
    await expect(setSecureFlag(true)).resolves.toBe(false);
  });

  it('reports the native answer, not merely that the call went through', async () => {
    /*
     * The window can refuse the flag after the call has been accepted. Both
     * callers read this boolean as the truth and revert the preference on
     * false, so answering "true, it did not throw" left the switch promising a
     * blank recents preview over one still showing the user's statuses.
     */
    asMock(native.setSecureFlag).mockResolvedValueOnce(false);
    await expect(setSecureFlag(true)).resolves.toBe(false);
  });

  it('reports false on a build whose native module predates the method', async () => {
    const method = native.setSecureFlag;
    delete native.setSecureFlag;
    try {
      await expect(setSecureFlag(true)).resolves.toBe(false);
    } finally {
      native.setSecureFlag = method;
    }
  });
});

describe('setKeepAwake', () => {
  it('forwards the requested state', async () => {
    await expect(setKeepAwake(true)).resolves.toBe(true);
    expect(native.setKeepAwake).toHaveBeenCalledWith(true);
  });

  it('never throws at the caller: it runs on every play and pause', async () => {
    asMock(native.setKeepAwake).mockRejectedValueOnce(new Error('no window'));
    await expect(setKeepAwake(false)).resolves.toBe(false);

    const method = native.setKeepAwake;
    delete native.setKeepAwake;
    try {
      await expect(setKeepAwake(true)).resolves.toBe(false);
    } finally {
      native.setKeepAwake = method;
    }
  });
});

describe('openSaveFolder', () => {
  it('points the Files app at the album CameraRoll writes into', async () => {
    // The two constants live in different modules on purpose; they must agree
    // or "Change" would open a folder the saves never land in. CameraRoll puts
    // an album under DCIM, not Pictures — verified on device: a save landed in
    // /sdcard/DCIM/Status Saver while /sdcard/Pictures stayed empty.
    expect(SAVE_FOLDER_PATH).toBe(`DCIM/${GALLERY_ALBUM}`);
    expect(SAVE_FOLDER_PATH).toBe('DCIM/Status');

    await expect(openSaveFolder()).resolves.toBe(true);
    expect(native.openFolder).toHaveBeenCalledWith('DCIM/Status');
  });

  it('reports false when no app handled the intent', async () => {
    asMock(native.openFolder).mockResolvedValueOnce(false);
    await expect(openSaveFolder()).resolves.toBe(false);
  });

  it('reports false instead of throwing when native rejects', async () => {
    asMock(native.openFolder).mockRejectedValueOnce(new Error('bad uri'));
    await expect(openSaveFolder()).resolves.toBe(false);
  });

  it('reports false on a build whose native module predates the method', async () => {
    const method = native.openFolder;
    delete native.openFolder;
    try {
      await expect(openSaveFolder()).resolves.toBe(false);
    } finally {
      native.openFolder = method;
    }
  });
});

describe('getVideoMeta', () => {
  it('crosses the bridge once per key and serves repeats from memory', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({
      thumbnail: 'file:///thumbs/k.jpg',
      durationMs: 14400,
      width: 720,
      height: 1280,
    });

    await expect(getVideoMeta('content://v', 'k')).resolves.toEqual({
      thumbnail: 'file:///thumbs/k.jpg',
      durationMs: 14400,
      width: 720,
      height: 1280,
    });
    await expect(getVideoMeta('content://v', 'k')).resolves.toEqual(
      expect.objectContaining({ durationMs: 14400 }),
    );

    expect(native.getVideoMeta).toHaveBeenCalledTimes(1);
    expect(native.getVideoMeta).toHaveBeenCalledWith('content://v', 'k');
  });

  it('treats a missing or zero number as unknown, never as 0', async () => {
    // A pill reading "0:00" is worse than no pill, and a 0 duration is what a
    // container without a duration box reports.
    asMock(native.getVideoMeta).mockResolvedValue({
      thumbnail: null,
      durationMs: 0,
      width: null,
      height: undefined,
    });

    await expect(getVideoMeta('content://v', 'zero')).resolves.toEqual({
      thumbnail: null,
      durationMs: null,
      width: null,
      height: null,
    });
  });

  it('shares one in-flight request between concurrent callers', async () => {
    // A grid mounting ten tiles asks for the same poster at the same instant.
    const job = deferred();
    asMock(native.getVideoMeta).mockReturnValueOnce(job.promise);

    const a = getVideoMeta('content://v', 'shared');
    const b = getVideoMeta('content://v', 'shared');
    job.resolve({ thumbnail: 'file:///thumbs/shared.jpg' });

    const [first, second] = await Promise.all([a, b]);
    expect(first?.thumbnail).toBe('file:///thumbs/shared.jpg');
    expect(second).toEqual(first);
    expect(native.getVideoMeta).toHaveBeenCalledTimes(1);
  });

  it('remembers a failure as null rather than retrying every render', async () => {
    asMock(native.getVideoMeta).mockRejectedValueOnce(new Error('bad codec'));
    await expect(getVideoMeta('content://v', 'broken')).resolves.toBeNull();
    await expect(getVideoMeta('content://v', 'broken')).resolves.toBeNull();
    expect(native.getVideoMeta).toHaveBeenCalledTimes(1);
  });

  it('falls back to the poster-only method on an older native module', async () => {
    const method = native.getVideoMeta;
    delete native.getVideoMeta;
    asMock(native.getVideoThumbnail).mockResolvedValueOnce('file:///thumbs/old.jpg');
    try {
      await expect(getVideoMeta('content://v', 'old')).resolves.toEqual({
        thumbnail: 'file:///thumbs/old.jpg',
        durationMs: null,
        width: null,
        height: null,
      });
    } finally {
      native.getVideoMeta = method;
    }
  });

  it('runs at most three jobs at once, newest waiter first, and drains', async () => {
    /*
     * The whole point of the queue: a fast scroll used to open one
     * MediaMetadataRetriever per mounted tile, all at the same moment.
     *
     * Order matters as much as the cap. The queue is fed by mounting tiles, so
     * oldest-first spent the decoder on rows the user had already flung past
     * while the rows actually on screen waited behind the whole backlog —
     * blank tiles for as long as it took to drain, which on a large library is
     * minutes. The tile in front of the user is the one that asked last.
     */
    const started: string[] = [];
    const pending = new Map<string, Deferred>();
    asMock(native.getVideoMeta).mockImplementation(
      (_uri: string, key: string) => {
        started.push(key);
        const job = deferred();
        pending.set(key, job);
        return job.promise;
      },
    );

    const keys = ['q0', 'q1', 'q2', 'q3', 'q4'];
    const all = keys.map(key => getVideoMeta('content://v', key));

    await flush();
    expect(started).toEqual(['q0', 'q1', 'q2']);

    pending.get('q0')?.resolve({ thumbnail: 'file:///thumbs/q0.jpg' });
    await flush();
    expect(started).toEqual(['q0', 'q1', 'q2', 'q4']);

    pending.get('q1')?.resolve({ thumbnail: 'file:///thumbs/q1.jpg' });
    await flush();
    expect(started).toEqual(['q0', 'q1', 'q2', 'q4', 'q3']);

    // Everything still queued or running settles, and every caller gets its
    // own result: nothing is stranded when the queue reorders.
    ['q2', 'q3', 'q4'].forEach(key =>
      pending.get(key)?.resolve({ thumbnail: `file:///thumbs/${key}.jpg` }),
    );
    const results = await Promise.all(all);
    expect(results.map(r => r?.thumbnail)).toEqual(
      keys.map(key => `file:///thumbs/${key}.jpg`),
    );
  });

  it('does not memoise a poster that a cache sweep has already deleted', async () => {
    /*
     * A read already in native when Tools clears the cache comes back holding
     * a path to a JPEG that no longer exists. Remembering it left that tile
     * blank for the rest of the session, because the memo is never re-read.
     */
    const job = deferred();
    asMock(native.getVideoMeta).mockReturnValueOnce(job.promise);

    const inFlight = getVideoMeta('content://v', 'swept');
    await flush();

    asMock(native.clearThumbnailCache).mockResolvedValueOnce(2048);
    await clearThumbnailCache();
    job.resolve({ thumbnail: 'file:///thumbs/swept.jpg' });
    await inFlight;

    asMock(native.getVideoMeta).mockResolvedValueOnce({
      thumbnail: 'file:///thumbs/fresh.jpg',
    });
    await expect(getVideoMeta('content://v', 'swept')).resolves.toEqual(
      expect.objectContaining({ thumbnail: 'file:///thumbs/fresh.jpg' }),
    );
  });

  it('does not memoise a poster written while the sweep was still running', async () => {
    /*
     * The other half of the same defect. Bumping the generation *before* the
     * native delete only covers reads that were already in native; a tile that
     * mounts while native is still deleting regenerates its frame, native then
     * removes it a moment later, and the path was remembered as good. That tile
     * stayed blank for the rest of the session, because the memo is never
     * re-read.
     */
    const sweep = deferred();
    asMock(native.clearThumbnailCache).mockReturnValueOnce(sweep.promise);
    const clearing = clearThumbnailCache();

    const read = deferred();
    asMock(native.getVideoMeta).mockReturnValueOnce(read.promise);
    const during = getVideoMeta('content://v', 'racing');
    read.resolve({ thumbnail: 'file:///thumbs/racing.jpg' });
    await during;

    sweep.resolve(1024);
    await expect(clearing).resolves.toBe(1024);

    asMock(native.getVideoMeta).mockResolvedValueOnce({
      thumbnail: 'file:///thumbs/again.jpg',
    });
    await expect(getVideoMeta('content://v', 'racing')).resolves.toEqual(
      expect.objectContaining({ thumbnail: 'file:///thumbs/again.jpg' }),
    );
  });
});

describe('getVideoThumbnail', () => {
  it('hands back just the path, over the same single bridge call', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({
      thumbnail: 'file:///thumbs/k.jpg',
      durationMs: 1000,
    });

    await expect(getVideoThumbnail('content://v', 'k')).resolves.toBe(
      'file:///thumbs/k.jpg',
    );
    await expect(getVideoThumbnail('content://v', 'k')).resolves.toBe(
      'file:///thumbs/k.jpg',
    );
    expect(native.getVideoMeta).toHaveBeenCalledTimes(1);
  });

  it('is null, not undefined, when no frame could be read', async () => {
    asMock(native.getVideoMeta).mockResolvedValue(null);
    await expect(getVideoThumbnail('content://v', 'none')).resolves.toBeNull();
  });

  it('forgets everything when the cache is cleared', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({
      thumbnail: 'file:///thumbs/k.jpg',
    });
    await getVideoThumbnail('content://v', 'k');
    asMock(native.clearThumbnailCache).mockResolvedValueOnce(4096);

    await expect(clearThumbnailCache()).resolves.toBe(4096);
    await getVideoThumbnail('content://v', 'k');

    expect(native.getVideoMeta).toHaveBeenCalledTimes(2);
  });
});

describe('getVideoDurationSeconds', () => {
  it('converts to the seconds the tile pill formats', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({ durationMs: 14400 });
    await expect(getVideoDurationSeconds('content://v', 'd')).resolves.toBe(14);
  });

  it('never rounds a real clip down to zero', async () => {
    // The design always shows a pill on a video tile, and formatDuration(0)
    // would leave it blank.
    asMock(native.getVideoMeta).mockResolvedValue({ durationMs: 320 });
    await expect(getVideoDurationSeconds('content://v', 'tiny')).resolves.toBe(1);
  });

  it('is null when the file does not state a duration', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({ thumbnail: 'x' });
    await expect(getVideoDurationSeconds('content://v', 'no-dur')).resolves.toBeNull();

    asMock(native.getVideoMeta).mockResolvedValue(null);
    await expect(getVideoDurationSeconds('content://v', 'nothing')).resolves.toBeNull();
  });
});

describe('trimThumbnailCache', () => {
  it('caps the cache at 40 MB by default', async () => {
    asMock(native.trimThumbnailCache).mockResolvedValueOnce(0);
    await trimThumbnailCache();
    expect(native.trimThumbnailCache).toHaveBeenCalledWith(40 * 1024 * 1024);
    expect(THUMBNAIL_CACHE_LIMIT).toBe(40 * 1024 * 1024);
  });

  it('forgets memoised paths once files have been deleted', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({
      thumbnail: 'file:///thumbs/k.jpg',
    });
    await getVideoThumbnail('content://v', 'k');
    asMock(native.trimThumbnailCache).mockResolvedValueOnce(999);

    await expect(trimThumbnailCache(1024)).resolves.toBe(999);
    expect(native.trimThumbnailCache).toHaveBeenCalledWith(1024);

    // The remembered path may now be a deleted file, so it has to be re-read.
    await getVideoThumbnail('content://v', 'k');
    expect(native.getVideoMeta).toHaveBeenCalledTimes(2);
  });

  it('keeps the memo when nothing needed deleting', async () => {
    asMock(native.getVideoMeta).mockResolvedValue({
      thumbnail: 'file:///thumbs/k.jpg',
    });
    await getVideoThumbnail('content://v', 'k');
    asMock(native.trimThumbnailCache).mockResolvedValueOnce(0);

    await trimThumbnailCache();
    await getVideoThumbnail('content://v', 'k');
    expect(native.getVideoMeta).toHaveBeenCalledTimes(1);
  });

  it('reports 0 instead of throwing when native fails or predates it', async () => {
    asMock(native.trimThumbnailCache).mockRejectedValueOnce(new Error('io'));
    await expect(trimThumbnailCache()).resolves.toBe(0);

    const method = native.trimThumbnailCache;
    delete native.trimThumbnailCache;
    try {
      await expect(trimThumbnailCache()).resolves.toBe(0);
    } finally {
      native.trimThumbnailCache = method;
    }
  });
});
