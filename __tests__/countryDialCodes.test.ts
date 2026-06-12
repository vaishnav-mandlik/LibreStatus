/**
 * @format
 */

import {
  getDialCodeForCountry,
  formatDialCode,
  getDefaultDialCode,
  DEFAULT_DIAL_CODE,
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
      expect(formatDialCode('00 91')).toBe('+0091');
    });

    it('returns a bare + for empty input', () => {
      expect(formatDialCode('')).toBe('+');
      expect(formatDialCode('abc')).toBe('+');
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
  });
});
