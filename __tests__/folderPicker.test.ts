/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import {
  clearFolderAccess,
  hasFolderAccess,
  listFolderFiles,
  requestFolderAccess,
  subscribeFolderAccess,
} from '../src/utils/folderPicker';
import { asMock, setPlatform } from '../test-support/testUtils';

const native = NativeModules.FolderPicker;
const KEY = 'whatsapp_status_folder_uri_whatsapp';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  setPlatform('android', 33);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requestFolderAccess', () => {
  it('persists the granted tree URI once it proves listable', async () => {
    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);

    await expect(requestFolderAccess('whatsapp')).resolves.toBe('content://tree/media');
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe('content://tree/media');
  });

  it('rejects a folder with no .Statuses inside and stores nothing', async () => {
    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/wrong');
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error('Status folder not found. Please select the Android/media folder.'),
    );

    await expect(requestFolderAccess('whatsapp')).rejects.toThrow(/Invalid folder/);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('keeps a WhatsApp folder whose .Statuses does not exist yet', async () => {
    /*
     * WhatsApp only creates .Statuses once a status has been viewed, and prunes
     * it again afterwards. Refusing the grant in that state sent the user back
     * to the picker to choose the very folder they had just chosen — a loop
     * with no way to finish setup at all.
     */
    const tree =
      'content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fmedia';
    asMock(native.pickFolder).mockResolvedValueOnce(tree);
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error('Status folder not found. Please select the Android/media folder.'),
    );

    await expect(requestFolderAccess('whatsapp')).resolves.toBe(tree);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe(tree);
  });

  it('opens one picker for two taps instead of superseding the first', async () => {
    /*
     * The native module settles an outstanding request with SUPERSEDED as soon
     * as a second pickFolder starts, so a double tap used to paint a failure
     * over a picker that was opening perfectly well.
     */
    let settle: (uri: string) => void = () => {};
    asMock(native.pickFolder).mockImplementationOnce(
      () => new Promise<string>(resolve => {
        settle = resolve;
      }),
    );
    asMock(native.listFiles).mockResolvedValue([]);

    const first = requestFolderAccess('whatsapp');
    const second = requestFolderAccess('whatsapp');
    settle('content://tree/media');

    await expect(first).resolves.toBe('content://tree/media');
    await expect(second).resolves.toBe('content://tree/media');
    expect(native.pickFolder).toHaveBeenCalledTimes(1);
  });

  it('does not answer a Business request with the WhatsApp pick', async () => {
    /*
     * The two requests share one picker slot, and sharing the *result* meant
     * the Business caller resolved with the WhatsApp tree URI: Settings
     * reported success and nothing was ever stored under the Business key.
     */
    let settle: (uri: string) => void = () => {};
    asMock(native.pickFolder).mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          settle = resolve;
        }),
    );
    asMock(native.listFiles).mockResolvedValue([]);

    const first = requestFolderAccess('whatsapp');
    const second = requestFolderAccess('business');
    settle('content://tree/whatsapp');

    await expect(first).resolves.toBe('content://tree/whatsapp');
    // The queued request runs its own pick rather than adopting that one.
    expect(await second).not.toBe('content://tree/whatsapp');
    expect(native.pickFolder).toHaveBeenCalledTimes(2);
    expect(native.pickFolder).toHaveBeenLastCalledWith('com.whatsapp.w4b');
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe(
      'content://tree/whatsapp',
    );
  });

  it('refuses to store a grant the native side already cannot read', async () => {
    /*
     * The mirror of the reported bug. Storing a tree that reports NO_ACCESS the
     * moment it is granted meant the picker closed, the app routed to the Feed,
     * and the next listing dropped the grant and put onboarding back up with
     * nothing said at all.
     */
    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockRejectedValueOnce(
      Object.assign(new Error('Folder no longer accessible.'), {
        code: 'NO_ACCESS',
      }),
    );

    await expect(requestFolderAccess('whatsapp')).rejects.toThrow(/pick again/);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('still reports a stored grant when a subscriber throws', async () => {
    /*
     * notifyAccessChanged runs after the URI is on disk, so a listener that
     * threw turned a finished pick into "setup failed" — over an onboarding
     * screen that never re-routed, because the listeners after it were never
     * called either.
     */
    const second = jest.fn();
    const stopA = subscribeFolderAccess(() => {
      throw new Error('listener blew up');
    });
    const stopB = subscribeFolderAccess(second);
    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);

    await expect(requestFolderAccess('whatsapp')).resolves.toBe(
      'content://tree/media',
    );
    expect(second).toHaveBeenCalledTimes(1);
    stopA();
    stopB();
  });

  it('propagates a cancellation untouched so callers can stay silent', async () => {
    const cancelled = Object.assign(new Error('User cancelled'), { code: 'CANCELLED' });
    asMock(native.pickFolder).mockRejectedValueOnce(cancelled);
    await expect(requestFolderAccess('whatsapp')).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('is null off Android', async () => {
    setPlatform('ios', 17);
    await expect(requestFolderAccess('whatsapp')).resolves.toBeNull();
    expect(native.pickFolder).not.toHaveBeenCalled();
  });
});

describe('hasFolderAccess / clearFolderAccess', () => {
  it('round-trips the stored URI per app', async () => {
    await AsyncStorage.setItem(KEY, 'content://tree/x');
    await expect(hasFolderAccess('whatsapp')).resolves.toBe('content://tree/x');
    await expect(hasFolderAccess('business')).resolves.toBeNull();
    await clearFolderAccess('whatsapp');
    await expect(hasFolderAccess('whatsapp')).resolves.toBeNull();
  });
});

describe('listFolderFiles', () => {
  it('returns the native listing', async () => {
    const files = [{ uri: 'u', name: 'a.jpg', type: 'image/jpeg', size: 1, lastModified: 2 }];
    asMock(native.listFiles).mockResolvedValueOnce(files);
    await expect(listFolderFiles('content://tree', 'whatsapp')).resolves.toEqual(files);
  });

  it.each([
    'Folder not found or no longer accessible',
    'java.lang.SecurityException: Permission Denial',
    'EACCES: permission denied',
  ])('drops the stored grant when access is gone: "%s"', async message => {
    await AsyncStorage.setItem(KEY, 'content://tree/stale');
    asMock(native.listFiles).mockRejectedValueOnce(new Error(message));

    await expect(listFolderFiles('content://tree/stale', 'whatsapp')).resolves.toEqual([]);
    // The shell re-checks this on the next foreground and offers the picker
    // again, instead of showing an empty Feed forever.
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('does not wake the shell when .Statuses is simply not there', async () => {
    /*
     * This is the whole reported bug: the grant was dropped and every listener
     * woken, so the shell re-checked, found no grant and put the permission
     * screen back in front of a user who had just finished the picker.
     */
    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    await AsyncStorage.setItem(KEY, 'content://tree/media');
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error(
        'Status folder not found. Please select the Android/media folder.',
      ),
    );

    await expect(listFolderFiles('content://tree/media', 'whatsapp')).resolves.toEqual([]);

    expect(woken).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe('content://tree/media');
    stop();
  });

  it('keeps the grant when .Statuses is simply not there right now', async () => {
    /*
     * WhatsApp creates `.Statuses` when a status is viewed and deletes it again
     * once the last one expires, so a perfectly valid grant reports this on any
     * quiet day. Dropping the grant here sent the user back through onboarding
     * to pick the folder they had already picked.
     */
    await AsyncStorage.setItem(KEY, 'content://tree/media');
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error('Status folder not found. Please select the Android/media folder.'),
    );

    await expect(listFolderFiles('content://tree/media', 'whatsapp')).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe('content://tree/media');
  });

  it.each([
    Object.assign(
      new Error('Folder no longer accessible. Please select the folder again.'),
      { code: 'NO_ACCESS' },
    ),
    // The code alone is enough: it is the verdict, and the message is free to
    // be reworded without silently turning this back into a stuck Feed.
    Object.assign(new Error('Failed to list files'), { code: 'NO_ACCESS' }),
  ])('drops the grant on the native NO_ACCESS verdict', async rejection => {
    /*
     * The mirror of the reported bug, and the reason the native side reports
     * this separately at all: androidx swallows the SecurityException a
     * revoked grant throws and answers "does not exist", so a folder that was
     * deleted, unmounted or un-granted looked exactly like ".Statuses is not
     * there today" — and the app kept the dead grant and showed an empty Feed
     * for the rest of the install, with no route back to the picker.
     */
    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    await AsyncStorage.setItem(KEY, 'content://tree/dead');
    asMock(native.listFiles).mockRejectedValueOnce(rejection);

    await expect(listFolderFiles('content://tree/dead', 'whatsapp')).resolves.toEqual([]);

    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
    expect(woken).toHaveBeenCalledTimes(1);
    stop();
  });

  it('never rejects at the caller, even when a subscriber throws', async () => {
    // The Feed calls this on every scan and has no catch of its own: a
    // rejection here would take the whole scan down and leave the grid on its
    // spinner.
    await AsyncStorage.setItem(KEY, 'content://tree/stale');
    const stop = subscribeFolderAccess(() => {
      throw new Error('listener blew up');
    });
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error('java.lang.SecurityException: Permission Denial'),
    );

    await expect(listFolderFiles('content://tree/stale', 'whatsapp')).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
    stop();
  });

  it('does not drop a grant the user re-picked while the listing was in flight', async () => {
    /*
     * The reported bug's shape from a second direction. A scan against a stale
     * tree can still be in native while the user gives up on the empty grid and
     * picks the folder again: the new grant lands under the same key, and the
     * old listing then failed with NO_ACCESS and deleted it. The picker closed,
     * the app routed to the Feed, and the permission screen came straight back
     * over a grant the user had just finished making.
     */
    const stale = 'content://tree/stale';
    const fresh = 'content://tree/fresh';
    await AsyncStorage.setItem(KEY, stale);

    let failStale: (error: Error) => void = () => {};
    asMock(native.listFiles).mockImplementation((uri: string) =>
      uri === stale
        ? new Promise((_resolve, reject) => {
            failStale = reject;
          })
        : Promise.resolve([]),
    );

    const scan = listFolderFiles(stale, 'whatsapp');

    asMock(native.pickFolder).mockResolvedValueOnce(fresh);
    await expect(requestFolderAccess('whatsapp')).resolves.toBe(fresh);

    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    failStale(
      Object.assign(new Error('Folder no longer accessible.'), {
        code: 'NO_ACCESS',
      }),
    );
    await expect(scan).resolves.toEqual([]);

    // The grant on disk is the one the user just made, not the one that failed.
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe(fresh);
    expect(woken).not.toHaveBeenCalled();
    stop();
  });

  it('does not drop a grant the user re-picked as the same folder', async () => {
    /*
     * The same race, down the path users actually take. A grant revoked in
     * Android settings is re-made by picking the *same* folder again, and SAF
     * hands back a byte-identical tree URI, so comparing the failed URI with
     * the stored one still matched and deleted the grant the user had just
     * re-made. Only "a pick landed after this listing started" tells them apart.
     */
    const same = 'content://tree/primary%3AAndroid%2Fmedia%2Fcom.whatsapp';
    await AsyncStorage.setItem(KEY, same);

    let failStale: (error: Error) => void = () => {};
    let firstCall = true;
    asMock(native.listFiles).mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return new Promise((_resolve, reject) => {
          failStale = reject;
        });
      }
      return Promise.resolve([]);
    });

    const scan = listFolderFiles(same, 'whatsapp');

    asMock(native.pickFolder).mockResolvedValueOnce(same);
    await expect(requestFolderAccess('whatsapp')).resolves.toBe(same);

    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    failStale(
      Object.assign(new Error('Folder no longer accessible.'), {
        code: 'NO_ACCESS',
      }),
    );
    await expect(scan).resolves.toEqual([]);

    await expect(AsyncStorage.getItem(KEY)).resolves.toBe(same);
    expect(woken).not.toHaveBeenCalled();
    stop();
  });

  it('keeps the grant for an unrelated failure', async () => {
    await AsyncStorage.setItem(KEY, 'content://tree/fine');
    asMock(native.listFiles).mockRejectedValueOnce(new Error('Failed to list files: I/O timeout'));

    await expect(listFolderFiles('content://tree/fine', 'whatsapp')).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe('content://tree/fine');
  });
});

describe('subscribeFolderAccess', () => {
  it('wakes the shell when a grant is stored', async () => {
    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    asMock(native.pickFolder).mockResolvedValueOnce('content://tree/media');
    asMock(native.listFiles).mockResolvedValueOnce([]);

    await requestFolderAccess('whatsapp');

    expect(woken).toHaveBeenCalledTimes(1);
    stop();
  });

  it('wakes the shell when a listing discovers the grant is gone', async () => {
    /*
     * The whole point of the signal: a grant revoked in Android settings
     * surfaces here, in a failed listing, long before the next foreground. The
     * shell re-checks on this and puts the picker back in front of the user
     * instead of leaving an empty grid that looks like a quiet day.
     */
    await AsyncStorage.setItem(KEY, 'content://tree/stale');
    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    asMock(native.listFiles).mockRejectedValueOnce(
      new Error('java.lang.SecurityException: Permission Denial'),
    );

    await listFolderFiles('content://tree/stale', 'whatsapp');

    expect(woken).toHaveBeenCalledTimes(1);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
    stop();
  });

  it('stays quiet for a failure that is not a lost grant', async () => {
    await AsyncStorage.setItem(KEY, 'content://tree/fine');
    const woken = jest.fn();
    const stop = subscribeFolderAccess(woken);
    asMock(native.listFiles).mockRejectedValueOnce(new Error('I/O timeout'));

    await listFolderFiles('content://tree/fine', 'whatsapp');

    expect(woken).not.toHaveBeenCalled();
    stop();
  });

  it('stops notifying once unsubscribed', async () => {
    const woken = jest.fn();
    subscribeFolderAccess(woken)();

    await clearFolderAccess('whatsapp');

    expect(woken).not.toHaveBeenCalled();
  });
});

/*
 * WhatsApp and WhatsApp Business are both granted through Android/media, so
 * the tree URI is byte-identical for the two. Native keys its resolved
 * .Statuses cache on the kind as well, which only works if the kind is sent.
 */
test('every listing says which app it is for', async () => {
  asMock(native.listFiles).mockResolvedValue([]);

  await listFolderFiles('content://tree/primary%3AAndroid%2Fmedia', 'business');

  expect(native.listFiles).toHaveBeenCalledWith(
    'content://tree/primary%3AAndroid%2Fmedia',
    'business',
  );
});
