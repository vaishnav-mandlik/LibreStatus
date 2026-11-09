/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import {
  addToVault,
  listVault,
  matchesVaultOrigin,
    removeFromVault,
  vaultBytes,
  vaultOriginNames,
  VAULT_PATH,
} from '../src/utils/vault';
import { asMock, dirEntry, status } from '../test-support/testUtils';

const native = NativeModules.FolderPicker;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  asMock(RNFS.exists).mockResolvedValue(false);
  asMock(RNFS.readDir).mockResolvedValue([]);
  asMock(RNFS.stat).mockResolvedValue({ size: 777 });
});

describe('addToVault', () => {
  it('lives in app-private storage, streams content:// natively, and renames atomically', async () => {
    const file = status({
      uri: 'content://tree/doc/IMG-1.jpg',
      filename: 'IMG-1.jpg',
      size: 10,
    });

    const result = await addToVault(file);

    expect(VAULT_PATH).toBe('/data/documents/vault');
    expect(RNFS.mkdir).toHaveBeenCalledWith(VAULT_PATH);
    expect(native.copyDocument).toHaveBeenCalledWith(
      'content://tree/doc/IMG-1.jpg',
      `${VAULT_PATH}/IMG-1.jpg.part`,
    );
    expect(RNFS.moveFile).toHaveBeenCalledWith(
      `${VAULT_PATH}/IMG-1.jpg.part`,
      `${VAULT_PATH}/IMG-1.jpg`,
    );
    expect(result).toMatchObject({
      id: 'IMG-1.jpg',
      uri: `file://${VAULT_PATH}/IMG-1.jpg`,
      inVault: true,
      isSaved: true,
      size: 777,
    });
  });

  it('cannot be steered outside the vault directory by a hostile filename', async () => {
    const file = status({
      uri: 'file:///src/x',
      filename: '../../shared_prefs/../evil name.jpg',
    });
    const result = await addToVault(file);
    const dest = asMock(RNFS.moveFile).mock.calls[0][1] as string;

    expect(dest.startsWith(`${VAULT_PATH}/`)).toBe(true);
    expect(dest.slice(VAULT_PATH.length + 1)).not.toMatch(/[/\\]/);
    expect(dest.slice(VAULT_PATH.length + 1)).not.toMatch(/^\./);
    expect(result?.filename).not.toContain('/');
  });

  it('reuses a file already in the vault instead of copying again', async () => {
    // Same name AND same size: this is the file, already vaulted.
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.stat).mockResolvedValue({ size: 2048 });
    const result = await addToVault(status({ filename: 'dup.jpg', size: 2048 }));
    expect(RNFS.copyFile).not.toHaveBeenCalled();
    expect(native.copyDocument).not.toHaveBeenCalled();
    expect(result?.inVault).toBe(true);
    expect(result?.id).toBe('dup.jpg');
  });

  it('keeps both files when two different names sanitise to the same one', async () => {
    /*
     * safeName is lossy: "IMG 1.jpg" and "IMG+1.jpg" both become "IMG_1.jpg".
     * The second file used to be reported as "already vaulted", so its bytes
     * were never written and the Vault showed the first one twice — with the
     * Feed ticking both sources as kept.
     */
    const taken = new Set([`${VAULT_PATH}/IMG_1.jpg`]);
    asMock(RNFS.exists).mockImplementation(async (path: string) =>
      taken.has(path) || path === VAULT_PATH,
    );
    asMock(RNFS.stat).mockResolvedValue({ size: 100 });
    asMock(RNFS.moveFile).mockImplementation(async (_from: string, to: string) => {
      taken.add(to);
    });

    const second = await addToVault(
      status({ uri: 'file:///src/b.jpg', filename: 'IMG+1.jpg', size: 250 }),
    );

    expect(second?.id).toBe('IMG_1_1.jpg');
    expect(asMock(RNFS.moveFile).mock.calls[0]).toEqual([
      `${VAULT_PATH}/IMG_1_1.jpg.part`,
      `${VAULT_PATH}/IMG_1_1.jpg`,
    ]);
  });

  it('serialises concurrent writes so a colliding name cannot be written twice', async () => {
    // The Feed vaults a selection with Promise.all. Two copies racing on the
    // same ".part" file interleaved their bytes into one corrupt file.
    const taken = new Set<string>([VAULT_PATH]);
    asMock(RNFS.exists).mockImplementation(async (path: string) =>
      taken.has(path),
    );
    asMock(RNFS.stat).mockResolvedValue({ size: 10 });
    asMock(RNFS.copyFile).mockImplementation(
      async () => new Promise(resolve => setTimeout(resolve, 5)),
    );
    asMock(RNFS.moveFile).mockImplementation(async (_from: string, to: string) => {
      taken.add(to);
    });

    const results = await Promise.all([
      addToVault(status({ uri: 'file:///src/a.jpg', filename: 'a b.jpg', size: 10 })),
      addToVault(status({ uri: 'file:///src/b.jpg', filename: 'a-b.jpg', size: 20 })),
      addToVault(status({ uri: 'file:///src/c.jpg', filename: 'a+b.jpg', size: 30 })),
    ]);

    const names = results.map(r => r?.id);
    expect(new Set(names).size).toBe(3);
    const partials = asMock(RNFS.copyFile).mock.calls.map(c => c[1]);
    expect(new Set(partials).size).toBe(partials.length);
  });

  it('returns null rather than throwing when the copy fails', async () => {
    asMock(RNFS.copyFile).mockRejectedValueOnce(new Error('EIO'));
    await expect(
      addToVault(status({ uri: 'file:///src/a.jpg', filename: 'a.jpg' })),
    ).resolves.toBeNull();
  });

  it('takes the half-written file away when the copy fails', async () => {
    /*
     * Nothing ever removed a failed copy's ".part". The vault sits in the
     * app's private data directory, `listVault` skips ".part" so it is
     * invisible, and the cache sweep only touches the share and temp
     * directories — so the bytes of every failed attempt stayed on the phone
     * for good, as app data the user can only clear by wiping the app.
     */
    asMock(RNFS.copyFile).mockRejectedValueOnce(new Error('EIO'));

    await expect(
      addToVault(status({ uri: 'file:///src/a.jpg', filename: 'a.jpg' })),
    ).resolves.toBeNull();

    expect(RNFS.unlink).toHaveBeenCalledWith(`${VAULT_PATH}/a.jpg.part`);
  });
});

describe('listVault', () => {
  it('is empty when the directory does not exist', async () => {
    await expect(listVault()).resolves.toEqual([]);
    expect(RNFS.readDir).not.toHaveBeenCalled();
  });

  it('hides the leftovers of an interrupted copy', async () => {
    /*
     * A ".part" file is a copy the app never finished. Listed, it became an
     * unopenable Vault item, was counted in the storage meter, and its base
     * name kept the source status ticked as saved.
     */
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockResolvedValue([
      dirEntry('real.jpg', 10, { dir: VAULT_PATH }),
      dirEntry('half.jpg.part', 3, { dir: VAULT_PATH }),
    ]);

    await expect(listVault()).resolves.toHaveLength(1);
    await expect(vaultBytes()).resolves.toBe(10);
  });

  it('infers type from the extension and sorts newest first', async () => {
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockResolvedValue([
      dirEntry('old.jpg', 10, { mtime: new Date(1000), dir: VAULT_PATH }),
      dirEntry('new.mp4', 20, { mtime: new Date(2000), dir: VAULT_PATH }),
      dirEntry('folder', 0, { isFile: false, dir: VAULT_PATH }),
    ]);

    const files = await listVault();

    expect(files.map(f => f.id)).toEqual(['new.mp4', 'old.jpg']);
    expect(files[0].type).toBe('video');
    expect(files[1].type).toBe('image');
    expect(files.every(f => f.inVault && f.isSaved)).toBe(true);
    expect(files[0].uri).toBe(`file://${VAULT_PATH}/new.mp4`);
  });

  it('never dates a vault file with no mtime to right now', async () => {
    /*
     * The Vault is sorted by this value, so a file without an mtime jumped to
     * the top of the collection on every listing, and its tile stamp read the
     * current clock rather than a capture time — a time that changed each time
     * the user opened the collection.
     */
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockResolvedValue([
      { ...dirEntry('a.jpg', 10, { dir: VAULT_PATH }), mtime: undefined },
      dirEntry('b.jpg', 10, { mtime: new Date(5000), dir: VAULT_PATH }),
    ]);

    const files = await listVault();

    expect(files.map(f => f.id)).toEqual(['b.jpg', 'a.jpg']);
    expect(files[1].timestamp).toBe(0);
  });

  it('sums bytes', async () => {
    asMock(RNFS.exists).mockResolvedValue(true);
    asMock(RNFS.readDir).mockResolvedValue([
      dirEntry('a.jpg', 10),
      dirEntry('b.jpg', 32),
    ]);
    await expect(vaultBytes()).resolves.toBe(42);
  });
});

describe('removeFromVault', () => {
  it('unlinks the sanitised path and is a no-op for a missing file', async () => {
    asMock(RNFS.exists).mockResolvedValueOnce(true);
    await expect(removeFromVault('a.jpg')).resolves.toBe(true);
    expect(RNFS.unlink).toHaveBeenCalledWith(`${VAULT_PATH}/a.jpg`);

    asMock(RNFS.exists).mockResolvedValueOnce(false);
    await expect(removeFromVault('missing.jpg')).resolves.toBe(true);
    expect(RNFS.unlink).toHaveBeenCalledTimes(1);
  });
});

describe('restoring out of the vault', () => {
  /*
   * The Vault collection's padlock button sends a file back to the gallery.
   * Undoing that has to re-vault the copy the restore left in the album,
   * because the vault original is unlinked by then — these are the names the
   * undo looks the copy up under.
   */
  it('matches a gallery copy by full name', () => {
    const names = vaultOriginNames([status({ filename: 'IMG-1.jpg' })]);
    expect(matchesVaultOrigin(names, status({ filename: 'IMG-1.jpg' }))).toBe(
      true,
    );
    expect(matchesVaultOrigin(names, status({ filename: 'IMG-2.jpg' }))).toBe(
      false,
    );
  });

  it('matches a copy MediaStore rewrote with another extension', () => {
    const names = vaultOriginNames([status({ filename: 'VID-9.mp4' })]);
    expect(matchesVaultOrigin(names, status({ filename: 'vid-9.MP4' }))).toBe(
      true,
    );
  });

  it('never matches an unrelated file that merely shares a prefix', () => {
    const names = vaultOriginNames([status({ filename: 'IMG-1.jpg' })]);
    expect(
      matchesVaultOrigin(names, status({ filename: 'IMG-10.jpg' })),
    ).toBe(false);
  });

  it('covers every restored file at once', () => {
    const names = vaultOriginNames([
      status({ filename: 'a.jpg' }),
      status({ filename: 'b.mp4' }),
    ]);
    expect(matchesVaultOrigin(names, status({ filename: 'a.jpg' }))).toBe(true);
    expect(matchesVaultOrigin(names, status({ filename: 'b.mp4' }))).toBe(true);
  });

  it('takes the file out of the vault directory', async () => {
    asMock(RNFS.exists).mockResolvedValueOnce(true);
    await expect(removeFromVault('restored.jpg')).resolves.toBe(true);
    expect(RNFS.unlink).toHaveBeenCalledWith(`${VAULT_PATH}/restored.jpg`);
  });
});
