/**
 * @format
 */

jest.mock('../src/utils/statusManager', () => ({
  SHARE_CACHE_DIR: '/data/cache/status-share',
  materialise: jest.fn(
    async (s: { filename: string }, dir: string) => `${dir}/${s.filename}`,
  ),
  // The staged copies live in the cache directory the shell sweeps at launch,
  // so sharing pins them for the duration. Recorded here so the suite can
  // prove the pin covers the whole share and is always given back.
  holdCacheFile: jest.fn(),
  releaseCacheFile: jest.fn(),
}));

import { NativeModules } from 'react-native';
import Share from 'react-native-share';
import {
  holdCacheFile,
  materialise,
  releaseCacheFile,
} from '../src/utils/statusManager';
import {
  extensionOf,
  isShareCancellation,
  isWhatsAppInstalled,
  isWhatsAppMissing,
  resolveMime,
  shareStatuses,
  shareToWhatsApp,
  stageForShare,
  WHATSAPP_BUSINESS_PACKAGE,
  WHATSAPP_MISSING,
  WHATSAPP_PACKAGE,
} from '../src/utils/share';
import { asMock, setPlatform, status } from '../test-support/testUtils';

const { FolderPicker } = NativeModules;

/** The staging stub the suite starts every test with. */
const stageOk = async (s: { filename: string }, dir: string): Promise<string> =>
  `${dir}/${s.filename}`;

beforeEach(() => {
  jest.clearAllMocks();
  // Restored per test: several cases below replace it to make one file fail.
  asMock(materialise).mockImplementation(stageOk);
  setPlatform('android', 33);
  asMock(Share.open).mockResolvedValue({ success: true });
  asMock(FolderPicker.shareFileTo).mockResolvedValue(true);
  asMock(FolderPicker.isPackageInstalled).mockResolvedValue(true);
});

describe('resolveMime / extensionOf', () => {
  it('maps known extensions case-insensitively', () => {
    expect(resolveMime(status({ filename: 'a.JPG' }))).toBe('image/jpeg');
    expect(resolveMime(status({ filename: 'clip.3gp', type: 'video' }))).toBe('video/3gpp');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
    expect(extensionOf('noext')).toBe('');
  });

  it('falls back to a wildcard for unknown or missing extensions', () => {
    expect(resolveMime(status({ filename: 'weird.xyz' }))).toBe('image/*');
    expect(resolveMime(status({ filename: 'noext', type: 'video' }))).toBe('video/*');
  });
});

describe('stageForShare', () => {
  it('materialises into the share cache and reports the file URL and MIME', async () => {
    const staged = await stageForShare(
      status({ uri: 'content://tree/doc', filename: 'IMG-1.png' }),
    );
    expect(materialise).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'IMG-1.png' }),
      '/data/cache/status-share',
    );
    expect(staged).toEqual({
      url: 'file:///data/cache/status-share/IMG-1.png',
      type: 'image/png',
      filename: 'IMG-1.png',
    });
  });
});

describe('isShareCancellation', () => {
  it('treats a dismissed sheet and an empty message as cancellation', () => {
    expect(isShareCancellation(new Error('User did not share'))).toBe(true);
    expect(isShareCancellation(new Error('Share Cancelled'))).toBe(true);
    expect(isShareCancellation(new Error(''))).toBe(true);
    expect(isShareCancellation(undefined)).toBe(true);
  });

  it('treats anything else as a real failure', () => {
    expect(isShareCancellation(new Error('No activity found to handle intent'))).toBe(false);
  });
});

describe('shareStatuses', () => {
  it('sends a single file as url + filename with its own MIME', async () => {
    await expect(
      shareStatuses([status({ filename: 'a.jpg' })], { title: 'Share', message: 'hi' }),
    ).resolves.toBe(true);
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///data/cache/status-share/a.jpg',
        filename: 'a.jpg',
        type: 'image/jpeg',
        title: 'Share',
        message: 'hi',
        failOnCancel: false,
      }),
    );
    expect(asMock(Share.open).mock.calls[0][0]).not.toHaveProperty('urls');
  });

  it('sends many files as urls with a kind-wide MIME', async () => {
    await shareStatuses(
      [status({ filename: 'a.jpg' }), status({ filename: 'b.png' })],
      { title: 'Share' },
    );
    const opts = asMock(Share.open).mock.calls[0][0];
    expect(opts.urls).toEqual([
      'file:///data/cache/status-share/a.jpg',
      'file:///data/cache/status-share/b.png',
    ]);
    expect(opts.type).toBe('image/*');
    expect(opts).not.toHaveProperty('url');
  });

  it('uses a generic MIME for a mixed photo/video selection', async () => {
    await shareStatuses(
      [status({ filename: 'a.jpg' }), status({ filename: 'v.mp4', type: 'video' })],
      { title: 'Share' },
    );
    expect(asMock(Share.open).mock.calls[0][0].type).toBe('*/*');
  });

  it('omits the message off Android, where it would prepend to the file', async () => {
    setPlatform('ios', 17);
    await shareStatuses([status()], { title: 'Share', message: 'hi' });
    expect(asMock(Share.open).mock.calls[0][0].message).toBeUndefined();
  });

  it('works without any copy at all', async () => {
    await expect(shareStatuses([status()])).resolves.toBe(true);
    expect(asMock(Share.open).mock.calls[0][0].title).toBeUndefined();
  });

  it('does nothing for an empty selection', async () => {
    await expect(shareStatuses([], { title: 'Share' })).resolves.toBe(false);
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('shares the files that are still there when one has vanished', async () => {
    /*
     * A status can be deleted from WhatsApp's folder between the tap and the
     * sheet. Staging the selection with Promise.all made that one failure
     * reject the whole share, so the user got nothing and no explanation.
     */
    asMock(materialise).mockImplementation(
      async (s: { filename: string }, dir: string) => {
        if (s.filename === 'gone.jpg') {
          throw new Error('ENOENT');
        }
        return `${dir}/${s.filename}`;
      },
    );

    await expect(
      shareStatuses([status({ filename: 'gone.jpg' }), status({ filename: 'a.jpg' })]),
    ).resolves.toBe(true);

    const opts = asMock(Share.open).mock.calls[0][0];
    expect(opts.url).toBe('file:///data/cache/status-share/a.jpg');
    expect(opts).not.toHaveProperty('urls');
  });

  it('reports the failure when nothing at all can be staged', async () => {
    asMock(materialise).mockRejectedValue(new Error('ENOSPC'));
    await expect(shareStatuses([status()])).rejects.toThrow('ENOSPC');
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('stages one file at a time rather than all at once', async () => {
    // Twenty selected videos used to be copied concurrently.
    let live = 0;
    let peak = 0;
    asMock(materialise).mockImplementation(
      async (s: { filename: string }, dir: string) => {
        live += 1;
        peak = Math.max(peak, live);
        await new Promise(resolve => setTimeout(resolve, 1));
        live -= 1;
        return `${dir}/${s.filename}`;
      },
    );

    await shareStatuses(
      ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'].map(f => status({ filename: f })),
    );

    expect(peak).toBe(1);
    expect(asMock(Share.open).mock.calls[0][0].urls).toHaveLength(4);
  });

  it('narrows the MIME to what actually staged', async () => {
    // The video is gone, so the sheet must not still advertise a mixed share.
    asMock(materialise).mockImplementation(
      async (s: { filename: string; type: string }, dir: string) => {
        if (s.type === 'video') {
          throw new Error('ENOENT');
        }
        return `${dir}/${s.filename}`;
      },
    );
    await shareStatuses([
      status({ filename: 'a.jpg' }),
      status({ filename: 'b.png' }),
      status({ filename: 'v.mp4', type: 'video' }),
    ]);
    expect(asMock(Share.open).mock.calls[0][0].type).toBe('image/*');
  });

  it('resolves false on cancellation and rethrows real failures', async () => {
    asMock(Share.open).mockRejectedValueOnce(new Error('User did not share'));
    await expect(shareStatuses([status()], { title: 'Share' })).resolves.toBe(false);

    asMock(Share.open).mockRejectedValueOnce(new Error('No activity found'));
    await expect(shareStatuses([status()], { title: 'Share' })).rejects.toThrow('No activity found');
  });

  it('pins every staged file for the whole share and gives it back after', async () => {
    /*
     * The staged copies sit in the cache directory the shell sweeps shortly
     * after launch. Nothing held them once staging returned, so a share
     * started in that window could have its file unlinked between the copy and
     * the moment the chosen app read it — the sheet opened, the attachment was
     * empty, and no error said why.
     */
    const heldWhenOpened: string[] = [];
    asMock(Share.open).mockImplementation(async () => {
      heldWhenOpened.push(
        ...asMock(holdCacheFile).mock.calls.map(call => String(call[0])),
      );
      expect(releaseCacheFile).not.toHaveBeenCalled();
      return { success: true };
    });

    await shareStatuses([
      status({ filename: 'a.jpg' }),
      status({ filename: 'b.png' }),
    ]);

    // Paths, not file:// URLs: that is what the sweep compares against.
    expect(heldWhenOpened).toEqual([
      '/data/cache/status-share/a.jpg',
      '/data/cache/status-share/b.png',
    ]);
    expect(asMock(releaseCacheFile).mock.calls.map(c => String(c[0]))).toEqual(
      heldWhenOpened,
    );
  });

  it('gives the pin back even when the share throws', async () => {
    asMock(Share.open).mockRejectedValueOnce(new Error('No activity found'));
    await expect(shareStatuses([status({ filename: 'a.jpg' })])).rejects.toThrow(
      'No activity found',
    );
    expect(releaseCacheFile).toHaveBeenCalledWith(
      '/data/cache/status-share/a.jpg',
    );
  });
});

/** Only these packages answer yes to the installed check. */
const installed = (...packages: string[]): void => {
  asMock(FolderPicker.isPackageInstalled).mockImplementation(
    async (name: string) => packages.includes(name),
  );
};

describe('isWhatsAppInstalled', () => {
  it('asks the package manager about the standard package first', async () => {
    await expect(isWhatsAppInstalled()).resolves.toBe(true);
    expect(FolderPicker.isPackageInstalled).toHaveBeenCalledWith(WHATSAPP_PACKAGE);
    // Answered by the first one, so the second is never asked about.
    expect(FolderPicker.isPackageInstalled).toHaveBeenCalledTimes(1);
  });

  it('falls back to the business build', async () => {
    // Its statuses come through the same folder grant, so a phone with only
    // the business build has a full Feed and must not be told otherwise.
    installed(WHATSAPP_BUSINESS_PACKAGE);
    await expect(isWhatsAppInstalled()).resolves.toBe(true);
    expect(FolderPicker.isPackageInstalled).toHaveBeenCalledWith(
      WHATSAPP_BUSINESS_PACKAGE,
    );
  });

  it('treats a negative answer and a failure alike', async () => {
    installed();
    await expect(isWhatsAppInstalled()).resolves.toBe(false);

    asMock(FolderPicker.isPackageInstalled).mockRejectedValue(new Error('boom'));
    await expect(isWhatsAppInstalled()).resolves.toBe(false);
  });
});

describe('shareToWhatsApp', () => {
  it('hands a single file straight to WhatsApp, no chooser', async () => {
    await expect(
      shareToWhatsApp([status({ filename: 'v.mp4', type: 'video' })], {
        title: 'Repost',
        message: 'hi',
      }),
    ).resolves.toBe(true);

    expect(FolderPicker.shareFileTo).toHaveBeenCalledTimes(1);
    expect(FolderPicker.shareFileTo).toHaveBeenCalledWith(
      '/data/cache/status-share/v.mp4',
      'video/mp4',
      WHATSAPP_PACKAGE,
    );
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('pins the staged copy for the handoff and lets go afterwards', async () => {
    await shareToWhatsApp([status({ filename: 'p.jpg' })]);
    expect(holdCacheFile).toHaveBeenCalledWith('/data/cache/status-share/p.jpg');
    expect(releaseCacheFile).toHaveBeenCalledWith('/data/cache/status-share/p.jpg');
    // Held before the handoff, released after it.
    expect(asMock(holdCacheFile).mock.invocationCallOrder[0]).toBeLessThan(
      asMock(FolderPicker.shareFileTo).mock.invocationCallOrder[0],
    );
    expect(asMock(releaseCacheFile).mock.invocationCallOrder[0]).toBeGreaterThan(
      asMock(FolderPicker.shareFileTo).mock.invocationCallOrder[0],
    );
  });

  it('works with no copy at all', async () => {
    await expect(shareToWhatsApp([status()])).resolves.toBe(true);
  });

  it('falls back to the system sheet for more than one file', async () => {
    await expect(
      shareToWhatsApp([status({ filename: 'a.jpg' }), status({ filename: 'b.jpg' })]),
    ).resolves.toBe(true);

    expect(FolderPicker.shareFileTo).not.toHaveBeenCalled();
    expect(asMock(Share.open).mock.calls[0][0].urls).toEqual([
      'file:///data/cache/status-share/a.jpg',
      'file:///data/cache/status-share/b.jpg',
    ]);
  });

  it('hands the file to the business build when that is the one installed', async () => {
    installed(WHATSAPP_BUSINESS_PACKAGE);
    await expect(shareToWhatsApp([status({ filename: 'p.jpg' })])).resolves.toBe(true);

    expect(FolderPicker.shareFileTo).toHaveBeenCalledWith(
      '/data/cache/status-share/p.jpg',
      'image/jpeg',
      WHATSAPP_BUSINESS_PACKAGE,
    );
  });

  it('rejects with a recognisable error when neither build is installed', async () => {
    installed();
    const attempt = shareToWhatsApp([status()]);
    await expect(attempt).rejects.toThrow(WHATSAPP_MISSING);
    await attempt.catch(error => {
      expect(isWhatsAppMissing(error)).toBe(true);
    });
    expect(FolderPicker.shareFileTo).not.toHaveBeenCalled();
    expect(materialise).not.toHaveBeenCalled();
  });

  it('reports WhatsApp missing when nothing receives the intent', async () => {
    // Uninstalled between the check and the send, or a build that hides its
    // share activity: the handoff finds no receiver rather than throwing.
    asMock(FolderPicker.shareFileTo).mockResolvedValueOnce(false);
    const attempt = shareToWhatsApp([status({ filename: 'p.jpg' })]);
    await expect(attempt).rejects.toThrow(WHATSAPP_MISSING);
    expect(releaseCacheFile).toHaveBeenCalledWith('/data/cache/status-share/p.jpg');
  });

  it('does not mistake other failures for a missing app', () => {
    expect(isWhatsAppMissing(new Error('No activity found'))).toBe(false);
    expect(isWhatsAppMissing(undefined)).toBe(false);
  });

  it('does nothing for an empty selection', async () => {
    await expect(shareToWhatsApp([])).resolves.toBe(false);
    expect(FolderPicker.shareFileTo).not.toHaveBeenCalled();
    expect(FolderPicker.isPackageInstalled).not.toHaveBeenCalled();
  });

  it('rethrows a failed handoff and still releases the pin', async () => {
    asMock(FolderPicker.shareFileTo).mockRejectedValueOnce(new Error('Could not share: gone'));
    await expect(shareToWhatsApp([status({ filename: 'p.jpg' })])).rejects.toThrow(
      'Could not share: gone',
    );
    expect(releaseCacheFile).toHaveBeenCalledWith('/data/cache/status-share/p.jpg');
  });

  it('is unavailable without the native module rather than broken', async () => {
    const saved = FolderPicker.shareFileTo;
    delete FolderPicker.shareFileTo;
    try {
      await expect(shareToWhatsApp([status()])).rejects.toThrow(WHATSAPP_MISSING);
    } finally {
      FolderPicker.shareFileTo = saved;
    }
  });
});
