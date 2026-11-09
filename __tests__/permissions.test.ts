/**
 * @format
 */

jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => {
  const PERMISSIONS = {
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
    READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO',
  };
  const RESULTS = {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  };
  return {
    __esModule: true,
    default: {
      PERMISSIONS,
      RESULTS,
      check: jest.fn(),
      request: jest.fn(),
      requestMultiple: jest.fn(),
    },
  };
});

jest.mock('../src/context/FeedbackContext', () => ({
  __esModule: true,
  showToast: jest.fn(),
}));

import { PermissionsAndroid } from 'react-native';
import { showToast } from '../src/context/FeedbackContext';
import {
  checkMediaAccess,
  ensureMediaAccess,
  needsFolderPicker,
  requestMediaAccess,
  resetMediaAccessCache,
} from '../src/utils/permissions';
import { asMock, setPlatform } from '../test-support/testUtils';

const LEGACY = 'android.permission.READ_EXTERNAL_STORAGE';
const WRITE = 'android.permission.WRITE_EXTERNAL_STORAGE';
const IMAGES = 'android.permission.READ_MEDIA_IMAGES';
const VIDEO = 'android.permission.READ_MEDIA_VIDEO';

const grantOnly = (granted: string[]) =>
  asMock(PermissionsAndroid.check).mockImplementation(async (p: string) =>
    granted.includes(p),
  );

/** Every Android version that has no photo or video permission to ask for. */
const MODERN = [30, 31, 33, 34, 36];

beforeEach(() => {
  jest.clearAllMocks();
  resetMediaAccessCache();
  setPlatform('android', 34);
  grantOnly([]);
});

describe('needsFolderPicker', () => {
  it('is true from Android 11 and false below or off Android', () => {
    setPlatform('android', 30);
    expect(needsFolderPicker()).toBe(true);
    setPlatform('android', 29);
    expect(needsFolderPicker()).toBe(false);
    setPlatform('ios', 17);
    expect(needsFolderPicker()).toBe(false);
  });
});

/*
 * The app reads and deletes exactly one thing in the gallery: the copies it
 * wrote itself. MediaStore hands an app its own files with no permission at
 * all, so from Android 11 there is nothing to hold, nothing to ask for and
 * nothing to refuse. These are the tests that keep it that way — a refactor
 * that reintroduces READ_MEDIA_IMAGES would fail here before it reached a
 * store listing that has to justify it.
 */
describe('from Android 11 up, no media permission is involved at all', () => {
  it.each(MODERN)('reports full on API %i without asking the system', async version => {
    setPlatform('android', version);
    await expect(checkMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
  });

  it.each(MODERN)('raises no dialog on API %i', async version => {
    setPlatform('android', version);
    await expect(requestMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
  });

  it('never asks about a photo or video permission, however it is reached', async () => {
    setPlatform('android', 34);
    await ensureMediaAccess();
    await requestMediaAccess();
    await checkMediaAccess();

    const asked = [
      ...asMock(PermissionsAndroid.check).mock.calls.flat(),
      ...asMock(PermissionsAndroid.request).mock.calls.flat(),
      ...asMock(PermissionsAndroid.requestMultiple).mock.calls.flat(2),
    ];
    expect(asked).not.toContain(IMAGES);
    expect(asked).not.toContain(VIDEO);
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('checkMediaAccess below Android 11', () => {
  it('reads the legacy permission on Android 10', async () => {
    setPlatform('android', 29);
    grantOnly([LEGACY]);
    await expect(checkMediaAccess()).resolves.toBe('full');
    grantOnly([]);
    await expect(checkMediaAccess()).resolves.toBe('none');
  });

  it('is always full off Android', async () => {
    setPlatform('ios', 17);
    await expect(checkMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
  });

  it('survives a throwing permission check', async () => {
    setPlatform('android', 29);
    asMock(PermissionsAndroid.check).mockRejectedValue(new Error('boom'));
    await expect(checkMediaAccess()).resolves.toBe('none');
  });
});

describe('requestMediaAccess below Android 11', () => {
  it('does not prompt when the permission is already held', async () => {
    setPlatform('android', 29);
    grantOnly([LEGACY]);
    await expect(requestMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  });

  it('requests the legacy permission on Android 10', async () => {
    setPlatform('android', 29);
    asMock(PermissionsAndroid.request).mockResolvedValue('granted');
    await expect(requestMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.request).toHaveBeenCalledWith(LEGACY);
  });

  it('returns none on refusal and points at the settings page', async () => {
    setPlatform('android', 29);
    asMock(PermissionsAndroid.request).mockResolvedValue('denied');

    await expect(requestMediaAccess()).resolves.toBe('none');

    // Any refusal gets the nudge, not just never_ask_again: this session will
    // not ask again either way, so a plain Deny would otherwise leave the Feed
    // empty with nothing on screen to explain it.
    expect(showToast).toHaveBeenCalledTimes(1);
    const toast = asMock(showToast).mock.calls[0][0];
    expect(toast.type).toBe('warning');
    expect(typeof toast.action.label).toBe('string');
    expect(typeof toast.message).toBe('string');
  });
});

/*
 * Android 8.0-9 grant only the permission actually asked for, and saving there
 * creates the album folder through java.io, which needs the write half.
 */
describe('Android 8 and 9', () => {
  it('counts read without write as no access', async () => {
    setPlatform('android', 28);
    grantOnly([LEGACY]);
    await expect(checkMediaAccess()).resolves.toBe('none');
    grantOnly([LEGACY, WRITE]);
    await expect(checkMediaAccess()).resolves.toBe('full');
  });

  it('asks for both halves at once', async () => {
    setPlatform('android', 28);
    asMock(PermissionsAndroid.requestMultiple).mockResolvedValue({
      [LEGACY]: 'granted',
      [WRITE]: 'granted',
    });
    await expect(requestMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([LEGACY, WRITE]);
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  });

  it('counts a half grant as a refusal', async () => {
    setPlatform('android', 28);
    asMock(PermissionsAndroid.requestMultiple).mockResolvedValue({
      [LEGACY]: 'granted',
      [WRITE]: 'denied',
    });
    await expect(requestMediaAccess()).resolves.toBe('none');
    expect(showToast).toHaveBeenCalledTimes(1);
  });
});

describe('ensureMediaAccess', () => {
  beforeEach(() => {
    // The only versions where a dialog exists at all.
    setPlatform('android', 29);
  });

  it('prompts once and caches the grant for the session', async () => {
    asMock(PermissionsAndroid.request).mockResolvedValue('granted');

    await expect(ensureMediaAccess()).resolves.toBe('full');
    await expect(ensureMediaAccess()).resolves.toBe('full');
    await expect(ensureMediaAccess()).resolves.toBe('full');

    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('caches a denial so the list does not re-prompt on every load', async () => {
    asMock(PermissionsAndroid.request).mockResolvedValue('denied');
    await expect(ensureMediaAccess()).resolves.toBe('none');
    await expect(ensureMediaAccess()).resolves.toBe('none');
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('re-prompts after the cache is reset', async () => {
    asMock(PermissionsAndroid.request).mockResolvedValue('denied');
    await ensureMediaAccess();
    resetMediaAccessCache();
    await ensureMediaAccess();
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(2);
  });

  it('does not cache a denial forever: a grant made in Settings takes effect', async () => {
    asMock(PermissionsAndroid.request).mockResolvedValue('denied');
    await expect(ensureMediaAccess()).resolves.toBe('none');

    // The user walks to the system settings page and grants it there. Nothing
    // in the app can know that happened, so the next call has to re-check
    // rather than answer from a cached refusal.
    grantOnly([LEGACY]);
    await expect(ensureMediaAccess()).resolves.toBe('full');
    // ...and still without a second dialog, which Android would swallow.
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('a reset mid-dialog does not open a second one Android would drop', async () => {
    /*
     * `resetMediaAccessCache` used to null the in-flight request as well as
     * the cached answer, so a reset while the system dialog was still up let
     * the next caller start a second request. That is exactly the pair Android
     * mishandles: one of the two results is dropped, so one caller's promise
     * never settles and whatever it was gating sits on its spinner for the
     * rest of the session. The cached decision is what a reset is for; the
     * request in flight is the dialog the user is answering right now.
     */
    let settle!: (result: string) => void;
    asMock(PermissionsAndroid.request).mockImplementation(
      () =>
        new Promise<string>(resolve => {
          settle = resolve;
        }),
    );

    const first = ensureMediaAccess();
    await new Promise(resolve => setImmediate(resolve));

    resetMediaAccessCache();
    const second = ensureMediaAccess();

    settle('granted');

    await expect(first).resolves.toBe('full');
    await expect(second).resolves.toBe('full');
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent callers onto one dialog', async () => {
    // The Feed's saved sync and the Library's album read both land on a cold
    // start; two simultaneous requests make Android drop one of the results.
    let settle!: (result: string) => void;
    asMock(PermissionsAndroid.request).mockImplementation(
      () =>
        new Promise<string>(resolve => {
          settle = resolve;
        }),
    );

    const all = Promise.all([
      ensureMediaAccess(),
      ensureMediaAccess(),
      ensureMediaAccess(),
    ]);
    // Let all three reach the dialog (each one checks first) before answering.
    await new Promise(resolve => setImmediate(resolve));
    settle('granted');

    await expect(all).resolves.toEqual(['full', 'full', 'full']);
    expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
  });

  it('answers without a dialog from Android 11 up', async () => {
    setPlatform('android', 34);
    await expect(ensureMediaAccess()).resolves.toBe('full');
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
  });
});
