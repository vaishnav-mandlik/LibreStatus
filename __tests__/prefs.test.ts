/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../src/utils/prefs';
import { formatDialCode } from '../src/utils/countryDialCodes';

const KEY = '@statussaverpro/prefs/v1';

describe('prefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns defaults when nothing is stored', async () => {
    await expect(loadPrefs()).resolves.toEqual(DEFAULT_PREFS);
  });

  it('round-trips a full record', async () => {
    const custom = {
      ...DEFAULT_PREFS,
      autoSave: true,
      autoMode: 'videos' as const,
      sort: 'big' as const,
      feedFilter: 'videos' as const,
      libraryCollection: 'vault' as const,
      libraryFilter: 'photos' as const,
      favourites: ['a.jpg', 'b.mp4'],
      dialCode: '+91',
      lastOpened: 1750000000000,
    };
    await savePrefs(custom);
    await expect(loadPrefs()).resolves.toEqual(custom);
  });

  describe('where the user was', () => {
    /*
     * None of this is restored on launch — the shell resets it and opens on the
     * Feed's All tab every time. It lives in prefs so the screens have a single
     * owner for it within a session. The search query is deliberately absent
     * even from that: a stale one reads as an empty library, not as a filter.
     */
    it('starts on All, All saved by default', () => {
      expect(DEFAULT_PREFS.feedFilter).toBe('all');
      expect(DEFAULT_PREFS.libraryCollection).toBe('all');
      expect(DEFAULT_PREFS.libraryFilter).toBe('all');
    });

    it('has no field for the search query', () => {
      expect(Object.keys(DEFAULT_PREFS)).not.toContain('query');
      expect(Object.keys(DEFAULT_PREFS)).not.toContain('search');
    });

    it('restores a stored position', async () => {
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify({
          feedFilter: 'photos',
          libraryCollection: 'fav',
          libraryFilter: 'videos',
        }),
      );
      await expect(loadPrefs()).resolves.toMatchObject({
        feedFilter: 'photos',
        libraryCollection: 'fav',
        libraryFilter: 'videos',
      });
    });

    it('falls back per field when a stored position is not a real one', async () => {
      // A renamed tab or collection from an older build must not leave the
      // shell pointing at a screen that no longer exists.
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify({
          lastTab: 'vault',
          feedFilter: 'gifs',
          libraryCollection: 'photos',
          libraryFilter: 7,
        }),
      );
      await expect(loadPrefs()).resolves.toMatchObject({
        feedFilter: DEFAULT_PREFS.feedFilter,
        libraryCollection: DEFAULT_PREFS.libraryCollection,
        libraryFilter: DEFAULT_PREFS.libraryFilter,
      });
    });

    it('does not confuse the two filter fields with the collection', async () => {
      // 'all' is legal for all three; 'fav' only for the collection.
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify({ feedFilter: 'fav', libraryCollection: 'all' }),
      );
      const prefs = await loadPrefs();
      expect(prefs.feedFilter).toBe('all');
      expect(prefs.libraryCollection).toBe('all');
    });
  });

  it('degrades field-by-field instead of discarding a partial record', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ autoSave: true, sort: 'big' }),
    );
    const prefs = await loadPrefs();
    expect(prefs.autoSave).toBe(true);
    expect(prefs.sort).toBe('big');
    // Everything absent falls back rather than becoming undefined.
    expect(prefs.autoMode).toBe(DEFAULT_PREFS.autoMode);
    expect(prefs.favourites).toEqual([]);
  });

  it('rejects values of the wrong type', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        autoSave: 'yes',
        autoMode: 'sideways',
        sort: 99,
        feedFilter: null,
        libraryCollection: [],
        libraryFilter: 'all photos',
        lastOpened: 'never',
        favourites: 'not-an-array',
        dialCode: 42,
      }),
    );
    await expect(loadPrefs()).resolves.toEqual(DEFAULT_PREFS);
  });

  it('drops non-string entries from favourites but keeps the good ones', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ favourites: ['ok.jpg', 7, null, 'fine.mp4'] }),
    );
    const prefs = await loadPrefs();
    expect(prefs.favourites).toEqual(['ok.jpg', 'fine.mp4']);
  });

  it('deduplicates favourites', async () => {
    /*
     * The list is appended to by a toggle whose writers can overlap, so a
     * double tap could store the same id twice. The Favourites chip counts
     * entries, so the collection claimed more items than it could show and
     * un-favouriting one left the duplicate behind.
     */
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ favourites: ['a.jpg', 'a.jpg', 'b.mp4', 'a.jpg'] }),
    );
    const prefs = await loadPrefs();
    expect(prefs.favourites).toEqual(['a.jpg', 'b.mp4']);
  });

  it('rejects a dial code that is not one', async () => {
    /*
     * The Tools field only ever writes "+" and digits, but a record from an
     * older build can hold anything. An unparseable value was painted into the
     * mono field verbatim while the digit count behind it stayed zero, so
     * "Open chat" answered every tap with "Enter a country code" and the text
     * on screen gave no hint that it was the problem.
     */
    for (const bad of ['+44 (0)', 'ninety-one', '+1-800', '+123456789']) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ dialCode: bad }));
      await expect(loadPrefs()).resolves.toMatchObject({
        dialCode: DEFAULT_PREFS.dialCode,
      });
    }

    // The shapes the field itself writes stay untouched.
    for (const good of ['+91', '+1', '+', '']) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ dialCode: good }));
      await expect(loadPrefs()).resolves.toMatchObject({ dialCode: good });
    }
  });

  it('keeps every dial code the Tools field is able to write', async () => {
    /*
     * The validator above is the only thing between the field and the store,
     * so the two have to agree on what a dial code is. `formatDialCode` had no
     * ceiling while the validator caps the value at eight characters, so a
     * long code typed into the field worked for the rest of the session and
     * was silently replaced by the default on the next launch — the field the
     * user had filled in came back empty with nothing to say why.
     */
    for (const typed of ['', '1', '+44', '00 91', '9999999999999', 'abc', '+1684']) {
      const written = formatDialCode(typed);
      await AsyncStorage.setItem(KEY, JSON.stringify({ dialCode: written }));
      await expect(loadPrefs()).resolves.toMatchObject({ dialCode: written });
    }
  });

  it('survives a corrupt blob', async () => {
    await AsyncStorage.setItem(KEY, '{not json');
    await expect(loadPrefs()).resolves.toEqual(DEFAULT_PREFS);

    await AsyncStorage.setItem(KEY, 'null');
    await expect(loadPrefs()).resolves.toEqual(DEFAULT_PREFS);

    await AsyncStorage.setItem(KEY, '[1,2,3]');
    const fromArray = await loadPrefs();
    expect(fromArray.autoMode).toBe(DEFAULT_PREFS.autoMode);
  });

  it('rejects a non-finite lastOpened', async () => {
    // JSON has no Infinity, but a hand-edited or migrated value could be null.
    await AsyncStorage.setItem(KEY, JSON.stringify({ lastOpened: null }));
    await expect(loadPrefs()).resolves.toMatchObject({
      lastOpened: DEFAULT_PREFS.lastOpened,
    });
  });
});
