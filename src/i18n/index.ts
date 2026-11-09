import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import { ru } from './ru';
import { fr } from './fr';
import { de } from './de';
import { it } from './it';
import { nl } from './nl';
import type { Dictionary, TranslationKey } from './en';

export type { Dictionary, TranslationKey };

export type LanguageCode =
  | 'en'
  | 'es'
  | 'pt'
  | 'ru'
  | 'fr'
  | 'de'
  | 'it'
  | 'nl';

export interface LanguageOption {
  code: LanguageCode;
  /** Endonym, the language's own name for itself. */
  label: string;
  /** BCP-47 tag, used for Intl date formatting. */
  tag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', tag: 'en' },
  { code: 'es', label: 'Español', tag: 'es' },
  { code: 'pt', label: 'Português', tag: 'pt-BR' },
  { code: 'ru', label: 'Русский', tag: 'ru' },
  { code: 'fr', label: 'Français', tag: 'fr' },
  { code: 'de', label: 'Deutsch', tag: 'de' },
  { code: 'it', label: 'Italiano', tag: 'it' },
  { code: 'nl', label: 'Nederlands', tag: 'nl' },
];

export const DICTIONARIES: Record<LanguageCode, Dictionary> = {
  en,
  es,
  pt,
  ru,
  fr,
  de,
  it,
  nl,
};

export type TransParams = Record<string, string | number>;

/** Replaces {token} placeholders. Unknown tokens are left as-is, visibly. */
const interpolate = (template: string, params?: TransParams): string => {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
};

/**
 * Resolves a key for a locale, falling back locale → English → the key itself.
 * Returning the key rather than an empty string makes a missing translation
 * obvious in the UI instead of silently blank.
 */
export const translate = (
  locale: LanguageCode,
  key: TranslationKey,
  params?: TransParams,
): string => {
  const template = DICTIONARIES[locale]?.[key] ?? en[key] ?? key;
  return interpolate(template, params);
};

/**
 * Picks between `<key>_one` and `<key>_other` based on `n`, then interpolates
 * with `{n}` pre-filled.
 *
 * This is a deliberately simple two-form model. Languages with richer plural
 * rules (Russian, for instance) have their `_other` string written so it reads
 * correctly for any count above one.
 */
export const translatePlural = (
  locale: LanguageCode,
  baseKey: string,
  n: number,
  params?: TransParams,
): string => {
  const suffix = n === 1 ? '_one' : '_other';
  const key = `${baseKey}${suffix}` as TranslationKey;
  const zeroKey = `${baseKey}_zero` as TranslationKey;

  if (n === 0 && zeroKey in en) {
    return translate(locale, zeroKey, { n, ...params });
  }
  return translate(locale, key, { n, ...params });
};
