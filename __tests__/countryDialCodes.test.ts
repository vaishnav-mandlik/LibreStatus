/**
 * @format
 */

import {
  getDialCodeForCountry,
  formatDialCode,
  getDefaultDialCode,
  DEFAULT_DIAL_CODE,
  longestDialCodePrefix,
} from '../src/utils/countryDialCodes';

describe('countryDialCodes', () => {
  describe('getDialCodeForCountry', () => {
    it('resolves known country codes', () => {
      expect(getDialCodeForCountry('US')).toBe('1');
      expect(getDialCodeForCountry('IN')).toBe('91');
      expect(getDialCodeForCountry('gb')).toBe('44');
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(getDialCodeForCountry('  in  ')).toBe('91');
    });

    it('returns null for unknown or empty input', () => {
      expect(getDialCodeForCountry('ZZ')).toBeNull();
      expect(getDialCodeForCountry('')).toBeNull();
      expect(getDialCodeForCountry(undefined)).toBeNull();
    });
  });

  describe('formatDialCode', () => {
    it('strips non-digits and prefixes +', () => {
      expect(formatDialCode('1')).toBe('+1');
      expect(formatDialCode('+44')).toBe('+44');
      expect(formatDialCode('  9 1 ')).toBe('+91');
    });

    it('returns a bare + for empty input', () => {
      expect(formatDialCode('')).toBe('+');
      expect(formatDialCode('abc')).toBe('+');
    });

    it('drops an international access prefix instead of building a dead link', () => {
      /*
       * "+91" and "0091" are the same instruction written two ways, and half
       * the world writes the second. Kept as typed it became wa.me/0091…,
       * which WhatsApp answers with "the phone number shared via url is
       * invalid" — the field looked filled in correctly and nothing on our
       * side said what was wrong. No country code begins with a zero, so a
       * leading run of them is never part of one.
       */
      expect(formatDialCode('0091')).toBe('+91');
      expect(formatDialCode('00 91')).toBe('+91');
      expect(formatDialCode('0')).toBe('+');
      expect(formatDialCode('000')).toBe('+');
    });

    it('will not write a code longer than a country code can be', () => {
      /*
       * The field feeds this straight into the stored record, whose validator
       * caps the value at eight characters. Without a ceiling here a long
       * string survived the session and was silently replaced by the default
       * on the next launch: the code the user had typed came back empty with
       * nothing to explain it. The longest real dial code is four digits.
       */
      expect(formatDialCode('123456789012')).toBe('+1234');
      expect(formatDialCode('+1684')).toBe('+1684');
    });
  });

  describe('getDefaultDialCode', () => {
    it('returns the dial code for a known country', () => {
      expect(getDefaultDialCode('IN')).toBe('+91');
    });

    it('falls back to the default dial code for unknown input', () => {
      expect(getDefaultDialCode('ZZ')).toBe(`+${DEFAULT_DIAL_CODE}`);
      expect(getDefaultDialCode(undefined)).toBe(`+${DEFAULT_DIAL_CODE}`);
    });

    it('never invents a country for a region it cannot resolve', () => {
      /*
       * The fallback used to be '7', so a phone whose region could not be
       * resolved had Russia's code quietly typed into the field for it. The
       * field looks filled in, so a number pasted in beside it opened a chat
       * with a stranger, and nothing on screen said where the prefix came
       * from. An unknown region must contribute no digits at all.
       */
      expect(DEFAULT_DIAL_CODE).not.toMatch(/\d/);
      expect(getDefaultDialCode('ZZ')).toBe('+');
      expect(getDefaultDialCode(undefined)).toBe('+');
    });
  });
});

describe('longestDialCodePrefix', () => {
  it('finds the country code a pasted number starts with', () => {
    expect(longestDialCodePrefix('447911123456')).toBe('44');
    expect(longestDialCodePrefix('919876543210')).toBe('91');
  });

  it('prefers the longer code where they nest', () => {
    // Bahamas is 1242 and North America is 1: the short match would leave
    // "242…" as the subscriber number.
    expect(longestDialCodePrefix('12425551234')).toBe('1242');
    expect(longestDialCodePrefix('12125551234')).toBe('1');
  });

  it('is null for digits no code starts', () => {
    expect(longestDialCodePrefix('')).toBeNull();
    expect(longestDialCodePrefix('0')).toBeNull();
  });
});
