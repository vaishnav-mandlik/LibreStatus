import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAF_URI_KEY = 'whatsapp_status_folder_uri';

/**
 * The SAF half of the app's native module, typed locally.
 *
 * It is absent on iOS and in Jest's default platform, so every call goes
 * through the `Platform`/presence guard below rather than assuming it exists.
 */
const { FolderPicker } = NativeModules as {
  FolderPicker?: {
    pickFolder(packageName: string): Promise<string | null>;
    listFiles(uri: string, kind: FolderKind): Promise<FolderFile[]>;
  };
};

const nativeReady = (): boolean =>
  Platform.OS === 'android' && typeof FolderPicker?.pickFolder === 'function';

export type FolderKind = 'whatsapp' | 'business';

export interface FolderFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

/**
 * Listeners woken whenever a grant is stored or dropped.
 *
 * The shell has to re-route on this, not only on the next foreground: a grant
 * revoked in Android settings while the app runs surfaces here, in the failed
 * listing that clears the stored URI. Without a signal the Feed sat on an
 * empty grid — indistinguishable from a quiet day — with no way back to the
 * picker until the process was killed.
 */
type AccessListener = () => void;
const listeners = new Set<AccessListener>();

export const subscribeFolderAccess = (listener: AccessListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Copied before iterating so a listener that unsubscribes cannot skip another,
 * and each call isolated so one throwing listener cannot swallow the rest.
 *
 * The isolation matters more than it looks: this runs inside `pickAndStore`
 * after the grant is already stored, and inside `clearFolderAccess`, which is
 * awaited from `listFolderFiles`' catch block. A listener that threw therefore
 * turned a successful pick into a rejection — the picker closed, the grant was
 * on disk, and the user got "setup failed" over an onboarding screen that
 * never re-routed because the remaining listeners were never called.
 */
const notifyAccessChanged = (): void => {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // A subscriber's own failure is not this module's to report, and must
      // not decide whether a grant counts as stored.
    }
  }
};

const messageOf = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : typeof (error as { message?: unknown })?.message === 'string'
    ? String((error as { message?: unknown }).message)
    : '';

const codeOf = (error: unknown): string =>
  typeof (error as { code?: unknown })?.code === 'string'
    ? String((error as { code?: unknown }).code)
    : '';

/**
 * Whether a failed listing means the grant itself is gone, rather than there
 * being nothing to list.
 *
 * The two halves of this module have to agree on the answer: `listFolderFiles`
 * deletes the stored URI on a true positive, and `pickAndStore` refuses to
 * store one, so a false positive here is the reported bug (the user is sent
 * back to pick the folder they just picked) and a false negative is its mirror
 * (an empty Feed for a folder that can never be read again).
 *
 * `NO_ACCESS` is the native side's explicit verdict: androidx swallows the
 * SecurityException a revoked grant throws and answers "does not exist", so
 * the module checks the picked tree itself and reports a dead tree under its
 * own code. The message tests stay for builds that predate it. Note what is
 * deliberately absent: "Status folder not found", which is the everyday state
 * of a healthy grant because WhatsApp deletes `.Statuses` once the last status
 * expires.
 */
const isAccessLost = (error: unknown): boolean => {
  if (codeOf(error) === 'NO_ACCESS') {
    return true;
  }
  const message = messageOf(error);
  return (
    message.includes('no longer accessible') ||
    message.includes('SecurityException') ||
    message.includes('Permission Denial') ||
    message.includes('EPERM') ||
    message.includes('EACCES')
  );
};

const storageKey = (type: FolderKind): string => `${SAF_URI_KEY}_${type}`;

/**
 * Whether a granted tree URI looks like WhatsApp's own media location.
 *
 * The native side reports "Status folder not found" for two states it cannot
 * tell apart: the wrong folder was picked, and the right folder was picked but
 * `.Statuses` is not there yet. WhatsApp only creates `.Statuses` once a status
 * has been viewed, and prunes it again, so the second state is the everyday one
 * on a fresh install — and refusing the grant there sent the user back to the
 * picker to choose the folder they had just chosen, with no way to finish
 * setup at all.
 *
 * The picked tree's own document id is the one piece of evidence we have, so a
 * folder inside `Android/media` (or a WhatsApp directory) is trusted and the
 * next listing picks `.Statuses` up as soon as WhatsApp writes it. Anything
 * else still fails, which is what the onboarding guide is for.
 */
export const looksLikeWhatsAppTree = (uri: string): boolean => {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    // A malformed escape sequence: judge the raw string instead.
  }
  const path = decoded.toLowerCase();
  return path.includes('android/media') || path.includes('whatsapp');
};

/**
 * One picker at a time, remembered with the folder kind it is picking for.
 *
 * The native module settles an outstanding request with `SUPERSEDED` when a
 * second `pickFolder` starts, so a double tap on Settings' folder row used to
 * paint "Could not open that folder" over a picker that was opening perfectly
 * well — and stacked a second picker activity behind it. A second caller now
 * waits on the first request instead of starting one.
 *
 * The kind is part of it because sharing the request across kinds is worse than
 * superseding: a Business request that adopted an in-flight WhatsApp pick
 * resolved with the WhatsApp tree URI, so the caller reported success and
 * stored nothing at all under the Business key — a row that said "connected"
 * over a grant that did not exist.
 */
let pickInFlight: { type: FolderKind; job: Promise<string | null> } | null =
  null;

/**
 * Bumped every time a grant is stored.
 *
 * Comparing the failed URI against the stored one is not enough on its own:
 * re-picking the *same* folder after the grant was revoked in Android settings
 * produces a byte-identical tree URI, which is the ordinary way a user recovers.
 * A stale listing that finished afterwards therefore still matched, and deleted
 * the grant the user had just re-made. The epoch says "a pick landed after this
 * listing started" regardless of what it picked.
 */
let grantEpoch = 0;

const pickAndStore = async (
  type: FolderKind,
  picker: NonNullable<typeof FolderPicker>,
): Promise<string | null> => {
  const packageName = type === 'business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
  const uri = await picker.pickFolder(packageName);
  if (!uri) {
    return null;
  }

  try {
    // A tree URI only proves a grant, not that WhatsApp's .Statuses folder is
    // inside it, so the grant is validated by listing before it is stored.
    await picker.listFiles(uri, type);
  } catch (error) {
    if (
      messageOf(error).includes('Status folder not found') &&
      !looksLikeWhatsAppTree(uri)
    ) {
      throw new Error(
        'Invalid folder selected. Please select the Android/media folder, the one that holds the .Statuses folder.',
      );
    }
    if (isAccessLost(error)) {
      /*
       * The grant did not survive the pick — the tree no longer resolves at
       * all. Storing it anyway meant the picker closed, the app routed to the
       * Feed, and the very next listing dropped the grant and put onboarding
       * back on screen with nothing said: the same dead end from the other
       * direction. Say so instead, so the caller can offer a retry.
       */
      throw new Error('Folder access was not granted. Please pick again.');
    }
    // Any other failure (a transient I/O error, a slow provider, a folder whose
    // .Statuses does not exist yet) is not proof the folder is wrong: keep the
    // grant and let the next listing retry.
  }

  await AsyncStorage.setItem(storageKey(type), uri);
  grantEpoch += 1;
  notifyAccessChanged();
  return uri;
};

/**
 * Sends the user to the SAF picker and persists what they grant.
 *
 * Rejects with the native `CANCELLED` code when the picker is backed out of,
 * so callers can stay silent rather than reporting a decision as a failure.
 */
export const requestFolderAccess = async (
  type: FolderKind,
): Promise<string | null> => {
  if (!nativeReady() || !FolderPicker) {
    return null;
  }
  while (pickInFlight) {
    if (pickInFlight.type === type) {
      return pickInFlight.job;
    }
    // A different folder kind. The picker is a modal activity and starting a
    // second one supersedes the first, so queue behind it rather than either
    // killing it or answering with its result.
    await pickInFlight.job.catch(() => undefined);
  }

  const entry = { type, job: pickAndStore(type, FolderPicker) };
  pickInFlight = entry;
  try {
    return await entry.job;
  } finally {
    // Only clear our own slot: a queued caller of another kind may already
    // have claimed it.
    if (pickInFlight === entry) {
      pickInFlight = null;
    }
  }
};

/** The stored tree URI for this app, or null when there is no grant. */
export const hasFolderAccess = async (
  type: FolderKind,
): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(storageKey(type));
  } catch {
    // An unreadable store is indistinguishable from no grant, and the caller's
    // answer is the same either way: offer the picker.
    return null;
  }
};

/**
 * Drops the stored grant, but only if it is still the one that just failed.
 *
 * A listing is an activity-length round trip on a dead tree, and the SAF picker
 * is another one on top of it, so the two overlap: a scan started against a
 * stale URI is routinely still in native while the user gives up on the empty
 * grid and re-picks the folder. The new grant lands under the same key, and the
 * old listing then failed with NO_ACCESS and deleted it — the picker closed,
 * the app routed to the Feed, and the permission screen came straight back over
 * a grant the user had just finished making. That is the reported bug's exact
 * shape (a failure throwing away state the user just created), so the failed
 * URI has to be compared against what is on disk before anything is removed.
 */
const dropGrantIfCurrent = async (
  type: FolderKind,
  uri: string,
  epoch: number,
): Promise<void> => {
  if (epoch !== grantEpoch) {
    // A pick landed while this listing was out. Whatever it granted is newer
    // than this failure, even when it is the same folder under the same URI.
    return;
  }
  try {
    const current = await AsyncStorage.getItem(storageKey(type));
    if (current !== null && current !== uri) {
      // Superseded by a newer grant. Nothing to drop, and waking the shell
      // would only make it re-check a grant that is perfectly good.
      return;
    }
    await AsyncStorage.removeItem(storageKey(type));
  } catch {
    // Nothing to do: the in-memory route already treats the grant as gone.
  }
  notifyAccessChanged();
};

/**
 * Every media file in the granted folder. Empty on any failure, never throws.
 *
 * `type` is required, not optional: it is the only thing that lets a lost grant
 * be dropped and the picker offered again, so a caller must not be able to
 * forget it and leave the app on an empty Feed with no route out.
 */
export const listFolderFiles = async (
  uri: string,
  type: FolderKind,
): Promise<FolderFile[]> => {
  const epoch = grantEpoch;
  try {
    if (!FolderPicker) {
      return [];
    }
    return await FolderPicker.listFiles(uri, type);
  } catch (error) {
    /*
     * Distinguish "the grant is gone" from "there is nothing to list".
     *
     * A revoked or moved grant used to surface as an empty array, identical to
     * a quiet day with no statuses, and the stored URI was kept, so the app
     * showed an empty Feed forever with no way back to the picker. Dropping the
     * URI and waking the shell puts the guide back in front of the user.
     *
     * "Status folder not found" is NOT that case, and treating it as one was a
     * real regression: WhatsApp creates `.Statuses` when a status is viewed and
     * removes it again when the last one expires, so a valid grant reports a
     * missing folder on any quiet day. The app answered by deleting the grant
     * and sending the user back through onboarding to pick the same folder
     * again (seen on device). `pickAndStore` refuses to store on exactly the
     * verdicts that clear one here — the two paths share `isAccessLost` so
     * they cannot drift apart again.
     *
     * And the drop is conditional on no pick having landed since this listing
     * started, so a listing that outlived a re-pick cannot delete the grant
     * that replaced it — including a re-pick of the very same folder, which
     * hands back a byte-identical URI.
     */
    if (isAccessLost(error)) {
      await dropGrantIfCurrent(type, uri, epoch);
    }

    return [];
  }
};

/** Drops the stored grant and wakes the shell so it can offer the picker again. */
export const clearFolderAccess = async (type: FolderKind): Promise<void> => {
  try {
    await AsyncStorage.removeItem(storageKey(type));
  } catch {
    // Nothing to do: the in-memory route already treats the grant as gone.
  }
  notifyAccessChanged();
};
