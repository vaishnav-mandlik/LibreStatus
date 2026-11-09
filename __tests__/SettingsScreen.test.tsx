/**
 * @format
 *
 * Settings is mostly rows the shell owns, so what is worth pinning here is the
 * one row that reaches outside the app on its own — Share app — and the copy it
 * hands to whatever the user picks.
 */

import React, { useState } from 'react';
import { Share, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';

jest.mock('../src/utils/statusManager', () => {
  const actual = jest.requireActual('../src/utils/statusManager');
  return {
    ...actual,
    peekGalleryAccess: jest.fn().mockResolvedValue('none'),
    requestGalleryAccess: jest.fn().mockResolvedValue('full'),
  };
});

import SettingsScreen from '../src/screens/SettingsScreen';
import { peekGalleryAccess, requestGalleryAccess } from '../src/utils/statusManager';
import { FeedbackProvider } from '../src/context/FeedbackContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { DEFAULT_PREFS, type Prefs } from '../src/utils/prefs';
import { APP_ID, BRAND_FULL } from '../src/appInfo';
import { STORE_WEB_URL } from '../src/utils/outbound';
import { en } from '../src/i18n/en';
import { asMock, setPlatform } from '../test-support/testUtils';
import { clearFolderAccess } from '../src/utils/folderPicker';

const GRANT_KEY = 'whatsapp_status_folder_uri_whatsapp';

/** The shell owns prefs, so the harness plays that part. */
const Host: React.FC = () => {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS });
  return (
    <SettingsScreen
      prefs={prefs}
      onPrefsChange={patch => setPrefs(prev => ({ ...prev, ...patch }))}
      onClose={() => undefined}
      onOpenHelp={() => undefined}
      onOpenAbout={() => undefined}
    />
  );
};

const trees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (): Promise<ReactTestInstance> => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            <Host />
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  await act(async () => {});
  trees.push(tree);
  return tree.root;
};

/** The row device tests locate by its visible label. */
const press = async (root: ReactTestInstance, label: string): Promise<void> => {
  const row = root.find(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === label,
  );
  await act(async () => {
    row.props.onPress();
  });
  await act(async () => {});
};

/** Every string the screen currently paints. */
const painted = (root: ReactTestInstance): string[] =>
  root.findAllByType(Text).flatMap(node => {
    const out: string[] = [];
    const walk = (child: unknown): void => {
      if (typeof child === 'string' || typeof child === 'number') {
        out.push(String(child));
      } else if (Array.isArray(child)) {
        child.forEach(walk);
      }
    };
    walk(node.props.children);
    return out.join('');
  });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  // Android 13: the folder picker exists, which is what most of this file is
  // about. The rows that only appear above the SAF boundary say so themselves.
  setPlatform('android', 33);
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
});

afterEach(() => {
  for (const tree of trees.splice(0)) {
    act(() => {
      tree.unmount();
    });
  }
  jest.restoreAllMocks();
});

describe('Share app', () => {
  it('hands the system sheet the brand and the tagline', async () => {
    const root = await mount();
    await press(root, en['settings.shareApp']);

    expect(Share.share).toHaveBeenCalledTimes(1);
    const message = String(asMock(Share.share).mock.calls[0][0].message);
    expect(message).toContain(BRAND_FULL);
    expect(message).toContain(en['about.tagline']);
  });

  it('carries the Play Store link, on its own line, as the web address', async () => {
    const root = await mount();
    await press(root, en['settings.shareApp']);

    const message = String(asMock(Share.share).mock.calls[0][0].message);
    // The web address, which opens anywhere; market:// only opens on a phone.
    expect(message.split('\n')).toContain(STORE_WEB_URL);
    expect(STORE_WEB_URL).toBe(`https://play.google.com/store/apps/details?id=${APP_ID}`);
    expect(message).not.toContain('market://');
  });

  it('uses no em dash, the one punctuation mark this app never writes', async () => {
    /*
     * Every other string the user can read comes from the dictionary, which is
     * held to that rule. This one is assembled in the screen, so it slipped
     * past — and it is the single piece of the app's copy that travels to
     * other apps and other people.
     */
    const root = await mount();
    await press(root, en['settings.shareApp']);

    const message = String(asMock(Share.share).mock.calls[0][0].message);
    expect(message).not.toContain('—');
  });

  it('says nothing when the sheet is dismissed', async () => {
    // Some Android builds reject rather than resolve; a dismissal is a choice.
    asMock(Share.share).mockRejectedValueOnce(new Error('User did not share'));
    const root = await mount();
    await expect(press(root, en['settings.shareApp'])).resolves.toBeUndefined();
  });
});

describe('the Status folder row', () => {
  it('is not offered below Android 11, where nothing reads a folder grant', async () => {
    // Android 9 reads the folder straight off the card with the storage
    // permission. The row stood there permanently amber saying the folder was
    // not chosen, and tapping it took a tree grant the app never reads.
    setPlatform('android', 28);
    const root = await mount();

    const painting = painted(root);
    expect(painting).not.toContain(en['settings.statusFolder']);
    expect(painting).not.toContain(en['settings.folderMissing']);
    // The media access row is what matters there, and it stays.
    expect(painting).toContain(en['settings.mediaAccess']);
  });

  it('reads the stored grant on open', async () => {
    await AsyncStorage.setItem(GRANT_KEY, 'content://tree/media');
    const root = await mount();

    expect(painted(root)).toContain(en['settings.folderGranted']);
  });

  it('stops claiming a grant the moment one is dropped underneath it', async () => {
    /*
     * The grant can go away while this screen is open: a listing that comes
     * back with the tree revoked drops the stored URI and wakes the shell,
     * which re-routes the tab behind Settings to onboarding. The row read its
     * value once, at mount, so it went on showing "granted" over an app that
     * had already decided it had no folder — and closing Settings dropped the
     * user onto the picker the row had just told them was unnecessary.
     */
    await AsyncStorage.setItem(GRANT_KEY, 'content://tree/media');
    const root = await mount();
    expect(painted(root)).toContain(en['settings.folderGranted']);

    await act(async () => {
      await clearFolderAccess('whatsapp');
    });
    await act(async () => {});

    expect(painted(root)).toContain(en['settings.folderMissing']);
    expect(painted(root)).not.toContain(en['settings.folderGranted']);
  });
});

/*
 * The one place in Settings the photo and video permission is asked for. It is
 * shown as a row with its state, and it asks only when tapped: nothing on this
 * screen prompts on its own.
 */
describe('the photos and videos row', () => {
  it('is not offered from Android 11 up, where there is no such permission', async () => {
    // The app only ever reads the copies it wrote, which MediaStore hands over
    // regardless. A row offering to grant or revoke would do nothing.
    const root = await mount();

    const painting = painted(root);
    expect(painting).not.toContain(en['settings.mediaAccess']);
    expect(painting).not.toContain(en['settings.mediaMissing']);
  });

  it('shows the held state and asks only when tapped, below Android 11', async () => {
    setPlatform('android', 29);
    const root = await mount();

    expect(painted(root)).toContain(en['settings.mediaMissing']);
    expect(requestGalleryAccess).not.toHaveBeenCalled();

    await press(root, en['settings.mediaAccess']);

    expect(requestGalleryAccess).toHaveBeenCalledTimes(1);
    expect(painted(root)).toContain(en['settings.mediaGranted']);
    expect(peekGalleryAccess).toHaveBeenCalled();
  });
});
