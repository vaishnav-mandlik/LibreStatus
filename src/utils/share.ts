import { Platform } from 'react-native';
import Share from 'react-native-share';
import { isPackageInstalled, shareFileTo } from './native';
import {
  holdCacheFile,
  materialise,
  releaseCacheFile,
  SHARE_CACHE_DIR,
} from './statusManager';
import type { StatusFile } from '../types';

/**
 * Sharing, shared: the viewer's single-item share and the selection bar's
 * multi-share go through the same staging so a SAF content:// URI is always
 * streamed to a real file first (Android share targets cannot read a tree URI
 * handed to them by a third app).
 */

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  webm: 'video/webm',
  flv: 'video/x-flv',
  '3gp': 'video/3gpp',
};

export const WHATSAPP_PACKAGE = 'com.whatsapp';
/** The business build, which keeps its statuses in its own folder. */
export const WHATSAPP_BUSINESS_PACKAGE = 'com.whatsapp.w4b';

/** Message of the error `shareToWhatsApp` rejects with when neither is absent. */
export const WHATSAPP_MISSING = 'WHATSAPP_MISSING';

export const extensionOf = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const resolveMime = (status: StatusFile): string => {
  const ext = extensionOf(status.filename);
  if (ext && MIME_MAP[ext]) {
    return MIME_MAP[ext];
  }
  return status.type === 'image' ? 'image/*' : 'video/*';
};

export interface StagedFile {
  url: string;
  type: string;
  filename: string;
}

/** Copy shown on the share sheet; everything is optional. */
export interface ShareCopy {
  title?: string;
  message?: string;
}

/**
 * `materialise` streams SAF content:// URIs through the native module, so a
 * 60 MB video never lands in JS memory as base64 the way an RNFS read would.
 */
export const stageForShare = async (status: StatusFile): Promise<StagedFile> => {
  const path = await materialise(status, SHARE_CACHE_DIR);
  return {
    url: `file://${path}`,
    type: resolveMime(status),
    filename: status.filename,
  };
};

interface Ready {
  file: StatusFile;
  staged: StagedFile;
}

/** The on-disk path behind a staged `file://` URL. */
const pathOf = (url: string): string => url.replace(/^file:\/\//, '');

/**
 * Pins every staged file against the cache sweep, and unpins them.
 *
 * The staged copies live in the same cache directory the shell sweeps shortly
 * after launch. Nothing held them once staging returned, so a share started in
 * that window could have its file unlinked between the copy and the moment the
 * chosen app read it: the share sheet opened and delivered an empty attachment
 * with no error to explain it. The pin covers the whole staging run too, so a
 * twenty-file selection cannot lose the first file while the last is copying.
 */
const holdStaged = (staged: StagedFile[]): void => {
  for (const file of staged) {
    holdCacheFile(pathOf(file.url));
  }
};

const releaseStaged = (staged: StagedFile[]): void => {
  for (const file of staged) {
    releaseCacheFile(pathOf(file.url));
  }
};

/**
 * Stages a whole selection, one file at a time. Every file that lands is
 * pinned; the caller must `releaseStaged` them once the share is over.
 *
 * `Promise.all` copied every selected file at once — a 20-video selection ran
 * 20 concurrent streams — and rejected the entire share if a single one
 * failed, which is exactly what happens when a status is deleted from
 * WhatsApp's folder between the tap and the sheet. Sharing the files that ARE
 * still there beats sharing nothing; only a selection that stages nothing at
 * all is an error.
 */
const stageAll = async (files: StatusFile[]): Promise<Ready[]> => {
  const ready: Ready[] = [];
  let failure: unknown;
  for (const file of files) {
    try {
      const staged = await stageForShare(file);
      holdStaged([staged]);
      ready.push({ file, staged });
    } catch (error) {
      failure = error;
    }
  }
  if (ready.length === 0) {
    throw failure instanceof Error ? failure : new Error('SHARE_STAGING_FAILED');
  }
  return ready;
};

const errorMessage = (error: unknown): string =>
  error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';

/** A share sheet the user backs out of is not an error worth a toast. */
export const isShareCancellation = (error: unknown): boolean => {
  const message = errorMessage(error);
  return (
    !message ||
    message.includes('User did not share') ||
    message.toLowerCase().includes('cancel')
  );
};

/** True for the rejection `shareToWhatsApp` raises when WhatsApp is absent. */
export const isWhatsAppMissing = (error: unknown): boolean =>
  errorMessage(error) === WHATSAPP_MISSING;

/**
 * The messaging package on this phone, or null when neither is installed.
 *
 * The folder scan reads BOTH builds' `.Statuses` from one grant, so a phone
 * with only the business build has a full Feed. Asking about the standard
 * package alone told those users their messaging app was not installed, over
 * statuses it had plainly written, and left Repost dead for the life of the
 * install. The standard build wins when both are there, since that is where a
 * status posted from a personal account belongs.
 */
export const messagingPackage = async (): Promise<string | null> => {
  if (await isPackageInstalled(WHATSAPP_PACKAGE)) {
    return WHATSAPP_PACKAGE;
  }
  if (await isPackageInstalled(WHATSAPP_BUSINESS_PACKAGE)) {
    return WHATSAPP_BUSINESS_PACKAGE;
  }
  return null;
};

/**
 * Whether either build is installed. The manifest declares a `<queries>` entry
 * for both packages, so this is reliable on Android 11+ too.
 */
export const isWhatsAppInstalled = async (): Promise<boolean> =>
  (await messagingPackage()) !== null;

/**
 * Opens the system share sheet for one or many statuses.
 *
 * A mixed selection (photos and videos) is sent as a generic MIME type so the
 * receiving app is offered everything instead of only the first kind. Resolves
 * true when the sheet was shown; rejects only for real failures — cancellation
 * resolves false so callers can stay quiet.
 */
export const shareStatuses = async (
  files: StatusFile[],
  copy: ShareCopy = {},
): Promise<boolean> => {
  if (files.length === 0) {
    return false;
  }
  const ready = await stageAll(files);
  const staged = ready.map(r => r.staged);
  const kinds = new Set(ready.map(r => r.file.type));
  const type =
    staged.length === 1
      ? staged[0].type
      : kinds.size === 1
      ? ready[0].file.type === 'image'
        ? 'image/*'
        : 'video/*'
      : '*/*';

  try {
    await Share.open({
      title: copy.title,
      message: Platform.OS === 'android' ? copy.message : undefined,
      failOnCancel: false,
      type,
      ...(staged.length === 1
        ? { url: staged[0].url, filename: staged[0].filename }
        : { urls: staged.map(s => s.url) }),
    });
    return true;
  } catch (error) {
    if (isShareCancellation(error)) {
      return false;
    }
    throw error;
  } finally {
    releaseStaged(staged);
  }
};

/**
 * Hands statuses straight to WhatsApp — the viewer's Repost.
 *
 * One file goes as a plain ACTION_SEND aimed at WhatsApp, through the app's
 * own FileProvider (see FolderPickerModule.shareFileTo): react-native-share's
 * shareSingle wrapped that intent in a chooser that Android 16 refuses, so
 * WhatsApp opened with nothing attached. A multi-file selection goes through
 * the system sheet instead, where WhatsApp is one tap away. Without WhatsApp
 * this rejects with `WHATSAPP_MISSING` so the caller can toast. Resolves true
 * once WhatsApp has the file; what the user does inside WhatsApp is theirs.
 */
export const shareToWhatsApp = async (
  files: StatusFile[],
  copy: ShareCopy = {},
): Promise<boolean> => {
  if (files.length === 0) {
    return false;
  }
  if (files.length > 1) {
    return shareStatuses(files, copy);
  }
  const target = await messagingPackage();
  if (!target) {
    throw new Error(WHATSAPP_MISSING);
  }

  const staged = await stageForShare(files[0]);
  holdStaged([staged]);
  try {
    const handed = await shareFileTo(pathOf(staged.url), staged.type, target);
    if (!handed) {
      throw new Error(WHATSAPP_MISSING);
    }
    return true;
  } finally {
    // WhatsApp copies the stream as it receives it; the pin need not outlive
    // the handoff.
    releaseStaged([staged]);
  }
};
