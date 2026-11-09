import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { showToast } from '../context/FeedbackContext';

/**
 * Storage access strategy. minSdkVersion is 24, so there is no
 * pre-Marshmallow path to handle.
 *
 *  - API 24-29: legacy READ_EXTERNAL_STORAGE, used to read the status folder
 *    directly and to reach the save album. WRITE too on 26-28, where the album
 *    folder is created by hand.
 *  - API 30+:   the SAF folder picker grants read access to one folder, and
 *    nothing else is asked for. The gallery album needs no permission because
 *    the app only ever touches the copies it wrote itself.
 *
 * No READ_MEDIA_IMAGES / READ_MEDIA_VIDEO, and no MANAGE_EXTERNAL_STORAGE.
 */
const androidVersion = (): number =>
  typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

export type MediaAccess = 'full' | 'none';

/**
 * Whether the gallery album is readable.
 *
 * From Android 11 up this is always `full`, and no permission is involved.
 * The app reads and deletes exactly one thing in the gallery — the copies it
 * wrote itself — and MediaStore hands an app its own files unconditionally.
 * Below 11 there is no scoped MediaStore, so the same legacy storage
 * permission that lets the Feed read the status folder governs the album too.
 */
export const checkMediaAccess = async (): Promise<MediaAccess> => {
  if (Platform.OS !== 'android' || androidVersion() >= 30) {
    return 'full';
  }
  const version = androidVersion();
  try {
    const legacy = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    if (!legacy) {
      return 'none';
    }
    // Android 8.0-9 grant only the permission actually requested, and
    // camera-roll's pre-Q save creates the album folder itself, which needs
    // the write half. Android 10 saves through MediaStore and needs no write
    // permission; 7.x grants the storage group as a whole.
    if (version >= 26 && version <= 28) {
      const write = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      return write ? 'full' : 'none';
    }
    return 'full';
  } catch {
    return 'none';
  }
};

/**
 * Requests the storage permission, where there is one to request.
 *
 * A no-op above Android 10: nothing the app does with the gallery needs a
 * permission there, so there is no dialog to raise and nothing to refuse.
 */
export const requestMediaAccess = async (): Promise<MediaAccess> => {
  if (Platform.OS !== 'android' || androidVersion() >= 30) {
    return 'full';
  }

  if ((await checkMediaAccess()) === 'full') {
    return 'full';
  }

  const version = androidVersion();
  try {
    if (version >= 26 && version <= 28) {
      const legacyResult = (await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ])) as unknown as Record<string, string>;
      const both =
        legacyResult[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        legacyResult[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;
      if (both) {
        return 'full';
      }
      promptForSettings();
      return 'none';
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'full';
    }
    promptForSettings();
    return 'none';
  } catch {
    return 'none';
  }
};

/** True when statuses can be read without going through the SAF picker. */
export const needsFolderPicker = (): boolean =>
  Platform.OS === 'android' && androidVersion() >= 30;

/**
 * Session state for `ensureMediaAccess`.
 *
 * `cachedAccess` short-circuits only a *positive* answer: once Android has
 * granted media access nothing can take it back without restarting the
 * process, so re-checking is waste. A denial is deliberately NOT final — the
 * user can walk to the system settings page and come back having granted it,
 * and caching 'none' for the session used to leave the Library empty until the
 * app was force-stopped.
 *
 * `prompted` is what stops the loop instead: the dialog is asked for at most
 * once per session, because Android silently swallows repeat requests after
 * the second refusal, so a re-ask would spin on a dialog the user never sees.
 *
 * `inFlight` collapses concurrent callers onto one request. The Feed's saved
 * sync and the Library's album read fire together on a cold start, and two
 * simultaneous `requestMultiple` calls make Android drop one of the results.
 */
let cachedAccess: MediaAccess | null = null;
let prompted = false;
let inFlight: Promise<MediaAccess> | null = null;

/**
 * Makes sure MediaStore is readable before anything touches CameraRoll.
 *
 * This has to be called by whoever reads the gallery — the saved Library, and
 * the saved-state sync the Feed depends on. Without it, on Android 13+ the
 * queries silently return only media this app itself wrote, so a reinstall or
 * a restored backup shows an empty Library with no error to explain it.
 *
 * Always resolves — never rejects and never hangs — so a caller can drop its
 * spinner in a `finally` and show its empty state instead.
 */
export const ensureMediaAccess = async (): Promise<MediaAccess> => {
  if (Platform.OS !== 'android') {
    return 'full';
  }
  if (cachedAccess !== null && cachedAccess !== 'none') {
    return cachedAccess;
  }
  if (inFlight) {
    return inFlight;
  }

  const job = (async (): Promise<MediaAccess> => {
    const current = await checkMediaAccess();
    if (current !== 'none') {
      cachedAccess = current;
      return current;
    }
    if (prompted) {
      cachedAccess = 'none';
      return 'none';
    }
    prompted = true;
    cachedAccess = await requestMediaAccess();
    return cachedAccess;
  })();

  inFlight = job;
  try {
    return await job;
  } finally {
    inFlight = null;
  }
};

/**
 * What access is held right now, without ever asking.
 *
 * Every read of the album the user did not ask for goes through this: the
 * saved-marker sync on boot, the duplicate guard behind a save, the undo path
 * and the Library's own listing. None of them needs the permission to do its
 * job, because MediaStore always shows an app the files it wrote itself. The
 * dialog used to be raised by the boot sync, seconds into the first launch
 * and before anything had been saved, which read as the app demanding every
 * photo and video on the phone for no reason it had shown. It is asked for
 * only where the user can see why: the Library's empty state and the
 * Settings row.
 */
export const peekMediaAccess = async (): Promise<MediaAccess> => {
  if (Platform.OS !== 'android') {
    return 'full';
  }
  if (cachedAccess !== null && cachedAccess !== 'none') {
    return cachedAccess;
  }
  const current = await checkMediaAccess();
  if (current !== 'none') {
    cachedAccess = current;
  }
  return current;
};

/**
 * Forgets the cached decision, so Settings can re-prompt after a change.
 *
 * The request currently in flight is deliberately left alone. It is the system
 * dialog the user is answering right now, so its answer is the freshest there
 * is — and dropping the reference let the next caller start a second
 * `requestMultiple`, the pair Android mishandles by dropping one of the two
 * results. The caller whose result was dropped never settles, so whatever it
 * gated (the Library's album read, the Feed's saved sync) sat on its spinner
 * for the rest of the session.
 */
export const resetMediaAccessCache = (): void => {
  cachedAccess = null;
  prompted = false;
};

/**
 * Nudges the user to the system settings page.
 *
 * These strings go through the imperative bridge because this module cannot use
 * hooks; the caller-facing copy is translated at the call site where a `t` is
 * available, so we keep this deliberately minimal and rely on the caller for
 * anything user-visible where possible.
 */
let settingsPrompt: { title: string; action: string } | null = null;

/** Lets the app hand this module translated copy once, at startup. */
export const setPermissionCopy = (copy: {
  title: string;
  action: string;
}): void => {
  settingsPrompt = copy;
};

const promptForSettings = (): void => {
  showToast({
    message: settingsPrompt?.title ?? 'Storage access is needed to read statuses.',
    type: 'warning',
    duration: 6000,
    action: {
      label: settingsPrompt?.action ?? 'Open settings',
      onPress: () => {
        Linking.openSettings().catch(() => undefined);
      },
    },
  });
};
