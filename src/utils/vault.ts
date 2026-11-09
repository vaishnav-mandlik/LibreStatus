import RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import type { StatusFile } from '../types';

const { FolderPicker } = NativeModules as {
  FolderPicker?: {
    copyDocument?: (srcUri: string, destPath: string) => Promise<number>;
  };
};

const VAULT_DIR = `${RNFS.DocumentDirectoryPath}/vault`;

/**
 * The vault keeps statuses out of the device gallery.
 *
 * Files are written to `DocumentDirectoryPath/vault`, which on Android is
 * inside the app's private data directory: MediaStore does not index it, so
 * vault items do not appear in the gallery, in any other app's picker, or in
 * a cloud photo backup, and other apps cannot read them without root.
 *
 * This hides files; it does not encrypt them, and the UI copy says so.
 */

const ensureDir = async (): Promise<void> => {
  const exists = await RNFS.exists(VAULT_DIR);
  if (!exists) {
    await RNFS.mkdir(VAULT_DIR);
  }
};

/** Strips anything that could escape the vault directory. */
const safeName = (filename: string): string => {
  const base = filename.replace(/[/\\]/g, '_').replace(/^\.+/, '_');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : `status_${Date.now()}`;
};

/**
 * Vault writes run one at a time.
 *
 * The Feed vaults a selection with `Promise.all`, so several copies used to be
 * in flight together. Two statuses whose names sanitise to the same safe name
 * then wrote the same ".part" file at once and renamed it into the same
 * destination: one file survived with interleaved bytes, both calls reported
 * success, and the second status was gone. Serialising also makes the name
 * check below an actual claim rather than a guess.
 */
let chain: Promise<unknown> = Promise.resolve();

const serialise = <T>(work: () => Promise<T>): Promise<T> => {
  const next = chain.then(work, work);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

/** "a.jpg" + 1 -> "a_1.jpg"; a name with no extension just gets the suffix. */
const suffixed = (name: string, n: number): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0
    ? `${name.slice(0, dot)}_${n}${name.slice(dot)}`
    : `${name}_${n}`;
};

interface Claim {
  name: string;
  /** True when the vault already holds these exact bytes under that name. */
  existing: boolean;
}

/**
 * The name this status may occupy.
 *
 * `safeName` is lossy — "IMG 1.jpg" and "IMG+1.jpg" both become "IMG_1.jpg" —
 * so a taken name is only the same file when the size matches. It used to be
 * reported as already vaulted, which quietly threw the second status away and
 * showed the first one twice. An unknown source size keeps the old,
 * conservative behaviour of reusing what is there.
 */
const claimName = async (wanted: string, size: number): Promise<Claim> => {
  for (let n = 0; n <= 50; n++) {
    const name = n === 0 ? wanted : suffixed(wanted, n);
    const path = `${VAULT_DIR}/${name}`;
    if (!(await RNFS.exists(path))) {
      return { name, existing: false };
    }
    const bytes = Number((await RNFS.stat(path)).size) || 0;
    if (size <= 0 || bytes === size) {
      return { name, existing: true };
    }
  }
  // Fifty same-named files of different sizes: take a name nothing can hold.
  return { name: `${Date.now()}_${wanted}`, existing: false };
};

const inferType = (filename: string): 'image' | 'video' => {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return ['mp4', '3gp', 'mkv', 'mov', 'webm', 'avi', 'flv'].includes(ext)
    ? 'video'
    : 'image';
};

/**
 * Copies a status into the vault. Returns the vault-local StatusFile, or null
 * if the source could not be read.
 */
export const addToVault = (status: StatusFile): Promise<StatusFile | null> =>
  serialise(() => vaultOne(status));

const vaultOne = async (status: StatusFile): Promise<StatusFile | null> => {
  try {
    await ensureDir();
    const claim = await claimName(safeName(status.filename), status.size);
    const name = claim.name;
    const dest = `${VAULT_DIR}/${name}`;

    if (claim.existing) {
      // Already vaulted under this name; treat as success and reuse it.
      const stat = await RNFS.stat(dest);
      return {
        ...status,
        id: name,
        uri: `file://${dest}`,
        filename: name,
        size: Number(stat.size) || status.size,
        inVault: true,
        isSaved: true,
      };
    }

    // Written to a temp name and renamed, so an interrupted copy cannot leave
    // a truncated file that the `exists` check above would reuse forever.
    const partial = `${dest}.part`;
    if (await RNFS.exists(partial)) {
      await RNFS.unlink(partial);
    }

    try {
      if (!status.uri.startsWith('content://')) {
        await RNFS.copyFile(status.uri.replace(/^file:\/\//, ''), partial);
      } else if (FolderPicker?.copyDocument) {
        await FolderPicker.copyDocument(status.uri, partial);
      } else {
        // Fallback for a build predating the native method: costs roughly 1.4x
        // the file size in memory, so it is deliberately last.
        const data = await RNFS.readFile(status.uri, 'base64');
        await RNFS.writeFile(partial, data, 'base64');
      }

      await RNFS.moveFile(partial, dest);
    } catch (error) {
      /*
       * A failed copy left its ".part" behind. Nothing ever removed it: the
       * vault lives in the app's private data directory, `listVault` skips
       * ".part" so it is invisible, and the cache sweep only touches the share
       * and temp directories. Every retry claimed the next free name, so the
       * bytes of every failed attempt stayed on the phone for good — counted
       * by Android as app data the user cannot see or clear except by wiping
       * the app.
       */
      try {
        await RNFS.unlink(partial);
      } catch {
        // Best effort: the next attempt on this name unlinks it up front.
      }
      throw error;
    }

    const stat = await RNFS.stat(dest);
    return {
      ...status,
      id: name,
      uri: `file://${dest}`,
      filename: name,
      size: Number(stat.size) || status.size,
      inVault: true,
      isSaved: true,
    };
  } catch {
    return null;
  }
};

/** Lists everything currently in the vault, newest first. */
export const listVault = async (): Promise<StatusFile[]> => {
  try {
    if (!(await RNFS.exists(VAULT_DIR))) {
      return [];
    }
    const entries = await RNFS.readDir(VAULT_DIR);
    const files: StatusFile[] = [];
    for (const entry of entries) {
      /*
       * ".part" is a copy that never finished — the app was killed or the
       * source went away mid-write. Listing one put an unopenable item in the
       * Vault, counted its bytes in the storage meter, and (because its base
       * name matches the source) kept the source ticked as saved.
       */
      if (!entry.isFile() || entry.name.endsWith('.part')) {
        continue;
      }
      /*
       * A missing mtime must not become "now". The Vault is sorted by this
       * value, so such a file jumped to the top of the collection on every
       * single listing, and its tile stamp read the current clock rather than
       * when the status was captured — a time that changed each time the user
       * looked at it.
       */
      const timestamp = entry.mtime ? new Date(entry.mtime).getTime() : 0;
      files.push({
        id: entry.name,
        uri: `file://${entry.path}`,
        filename: entry.name,
        type: inferType(entry.name),
        timestamp,
        size: Number(entry.size) || 0,
        isSaved: true,
        inVault: true,
      });
    }
    return files.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

/** File name without its extension, lower-cased. */
const stem = (filename: string): string =>
  filename.replace(/\.[^.]+$/, '').toLowerCase();

/**
 * The names the gallery copy of a vault file can be found under.
 *
 * Restoring a file out of the vault copies it into the gallery album and then
 * unlinks the original, so undoing that restore has to work from the copy —
 * the vault version is gone by then. MediaStore is free to write the copy with
 * a different extension, so the extensionless stem is offered alongside the
 * full name, which is the same assumption `deleteSavedCopiesOf` makes.
 */
export const vaultOriginNames = (files: StatusFile[]): Set<string> => {
  const names = new Set<string>();
  for (const file of files) {
    names.add(file.filename);
    names.add(stem(file.filename));
  }
  return names;
};

/** True if `file` is the gallery copy of one of those names. */
export const matchesVaultOrigin = (
  names: Set<string>,
  file: StatusFile,
): boolean => names.has(file.filename) || names.has(stem(file.filename));

/** Permanently deletes a vault file. */
/** Whether the vault currently holds a copy of `id`. */
export const vaultHolds = async (id: string): Promise<boolean> => {
  try {
    return await RNFS.exists(`${VAULT_DIR}/${safeName(id)}`);
  } catch {
    return false;
  }
};

/**
 * Removes the vault's copy of `id`. True when the vault no longer holds it,
 * including when it never did — the Library's batch delete counts that as
 * done. A caller that has to report a deletion asks `vaultHolds` first.
 */
export const removeFromVault = async (id: string): Promise<boolean> => {
  try {
    const path = `${VAULT_DIR}/${safeName(id)}`;
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
    return true;
  } catch {
    return false;
  }
};

/** Total bytes held in the vault. */
export const vaultBytes = async (): Promise<number> => {
  const files = await listVault();
  return files.reduce((total, f) => total + f.size, 0);
};

export const VAULT_PATH = VAULT_DIR;
