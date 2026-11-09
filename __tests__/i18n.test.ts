/**
 * @format
 *
 * Guards the translation layer. The type system already forces every locale to
 * carry every key; these tests catch the things types cannot see — placeholder
 * drift, empty strings, brand or proper nouns going missing, and the monospace
 * toast tags getting translated by accident.
 */

import {
  DICTIONARIES,
  LANGUAGE_OPTIONS,
  translate,
  translatePlural,
} from '../src/i18n';
import { en } from '../src/i18n/en';
import type { LanguageCode, TranslationKey } from '../src/i18n';

const CODES = Object.keys(DICTIONARIES) as LanguageCode[];
const KEYS = Object.keys(en) as TranslationKey[];

const placeholders = (s: string): string[] =>
  (s.match(/\{(\w+)\}/g) ?? []).sort();

describe('i18n', () => {
  it('ships the eight advertised languages', () => {
    expect(CODES).toHaveLength(8);
    expect(LANGUAGE_OPTIONS).toHaveLength(8);
    expect(LANGUAGE_OPTIONS.map(o => o.code).sort()).toEqual([...CODES].sort());
  });

  it('has exactly the same key set in every locale', () => {
    const expected = [...KEYS].sort();
    for (const code of CODES) {
      expect(Object.keys(DICTIONARIES[code]).sort()).toEqual(expected);
    }
  });

  it('has no blank values anywhere', () => {
    for (const code of CODES) {
      const dict = DICTIONARIES[code];
      for (const key of KEYS) {
        expect(typeof dict[key]).toBe('string');
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves every placeholder token in every locale', () => {
    const problems: string[] = [];
    for (const code of CODES) {
      for (const key of KEYS) {
        const expected = placeholders(en[key]);
        const actual = placeholders(DICTIONARIES[code][key]);
        if (expected.join(',') !== actual.join(',')) {
          problems.push(
            `${code}/${key}: expected ${expected.join(',') || '(none)'}, got ${
              actual.join(',') || '(none)'
            }`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('spells the brand the same way in every locale', () => {
    for (const code of CODES) {
      expect(DICTIONARIES[code]['brand.name']).toBe('Status Saver');
    }
  });

  it('no longer calls the app "Pro" anywhere', () => {
    for (const code of CODES) {
      for (const [key, value] of Object.entries(DICTIONARIES[code])) {
        expect([code, key, /Status Saver Pro|\bPro\b/.test(String(value))]).toEqual([code, key, false]);
      }
    }
  });

  it('keeps product names and system paths untranslated', () => {
    const mustContain: Array<[TranslationKey, string]> = [
      ['onboard.step2Accent', 'Android › media'],
      ['settings.folderGranted', 'Android/media'],
      // The gallery album is literally "Status" in every language: it is a
      // folder name the user will look for in their gallery app.
      ['tools.savePath', 'DCIM / Status'],
      ['toast.saved', 'Status'],
      ['guide.mockAllowBody', 'Status Saver'],
    ];
    for (const code of CODES) {
      for (const [key, needle] of mustContain) {
        expect(DICTIONARIES[code][key]).toContain(needle);
      }
    }
  });

  it('never mentions the old product name', () => {
    for (const code of CODES) {
      for (const key of KEYS) {
        expect(DICTIONARIES[code][key]).not.toContain('LibreStatus');
      }
    }
  });

  it('names no other product or company outside the legal disclaimer', () => {
    /*
     * The app reads another app's folder but never says whose: the copy talks
     * about "your messaging app". A brand in ordinary copy is a store-listing
     * risk. The one exception is the disclaimer below, where naming the
     * trademark holder is the whole point.
     */
    for (const code of CODES) {
      for (const key of KEYS) {
        if (key === 'about.disclaimer') {
          continue;
        }
        expect(DICTIONARIES[code][key]).not.toMatch(/whatsapp|\bmeta\b/i);
      }
    }
  });

  it('disclaims affiliation by name, in every language', () => {
    /*
     * Play's impersonation policy is what gets an app of this kind rejected,
     * and a disclaimer that does not name the holder is not a disclaimer. It
     * has to say it is not affiliated, and it has to say who with.
     */
    for (const code of CODES) {
      const text = DICTIONARIES[code]['about.disclaimer'];
      expect(text).toMatch(/WhatsApp/);
      expect(text).toMatch(/Meta/);
    }
  });

  it('leaves the monospace toast tags as lowercase English', () => {
    // These are set in JetBrains Mono as tags, not read as prose.
    const metaKeys = KEYS.filter(k => /^toast\.meta[A-Z]/.test(k));
    expect(metaKeys.length).toBeGreaterThan(10);
    for (const code of CODES) {
      for (const key of metaKeys) {
        expect(DICTIONARIES[code][key]).toBe(en[key]);
        expect(DICTIONARIES[code][key]).toMatch(/^[a-z]+$/);
      }
    }
  });

  it('pairs every plural key with both forms and nothing else', () => {
    const bases = new Set(
      KEYS.filter(k => /_(one|other)$/.test(k)).map(k =>
        k.replace(/_(one|other)$/, ''),
      ),
    );
    expect(bases.size).toBeGreaterThan(0);
    for (const base of bases) {
      expect(KEYS).toContain(`${base}_one`);
      expect(KEYS).toContain(`${base}_other`);
    }
    // The flat two-form convention: no _zero, _few or _many variants.
    expect(KEYS.filter(k => /_(zero|few|many)$/.test(k))).toEqual([]);
  });

  describe('translate', () => {
    it('substitutes placeholders', () => {
      expect(translate('en', 'settings.languagesAvailable', { n: 8 })).toBe(
        '8 available',
      );
      expect(translate('en', 'viewer.counter', { n: 2, total: 18 })).toBe(
        '2 / 18',
      );
    });

    it('leaves unknown placeholders visible rather than blanking them', () => {
      expect(translate('en', 'settings.languagesAvailable', {})).toBe(
        '{n} available',
      );
    });

    it('falls back to English for an unknown locale', () => {
      expect(translate('xx' as LanguageCode, 'nav.feed')).toBe(en['nav.feed']);
    });
  });

  describe('translatePlural', () => {
    it('picks the singular for exactly one', () => {
      expect(translatePlural('en', 'library.meta', 1, { size: '2.1 MB' })).toBe(
        '1 file · 2.1 MB',
      );
    });

    it('picks the plural otherwise and fills n', () => {
      expect(translatePlural('en', 'library.meta', 3, { size: '8.5 MB' })).toBe(
        '3 files · 8.5 MB',
      );
      expect(translatePlural('en', 'select.count', 0)).toBe('0 selected');
      expect(translatePlural('en', 'toast.movedToVault', 2)).toBe(
        '2 statuses moved to Vault',
      );
    });

    it('works for every locale without leaking a raw key', () => {
      for (const code of CODES) {
        for (const n of [0, 1, 2, 5, 21]) {
          const out = translatePlural(code, 'toast.removed', n);
          expect(out).not.toMatch(/^toast\./);
          expect(out.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });
});
