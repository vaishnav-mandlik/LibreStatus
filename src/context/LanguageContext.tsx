import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import {
  DICTIONARIES,
  LANGUAGE_OPTIONS,
  translate,
  translatePlural,
} from '../i18n';
import type {
  LanguageCode,
  LanguageOption,
  TransParams,
  TranslationKey,
} from '../i18n';

export type { LanguageCode, LanguageOption };

const STORAGE_KEY = 'app_language';

const SUPPORTED = LANGUAGE_OPTIONS.map(o => o.code);

const isSupported = (code: string): code is LanguageCode =>
  (SUPPORTED as string[]).includes(code);

/**
 * Asks react-native-localize which of our languages best matches the device.
 *
 * The previous implementation read `NativeModules.I18nManager.localeIdentifier`
 * directly, which is a legacy-bridge constant that can be undefined under the
 * New Architecture — and it fell back to English silently, so a German phone
 * would just get English with no clue why. `findBestLanguageTag` is the
 * library's supported API and handles region subtags (pt-BR → pt) for us.
 */
const detectDeviceLanguage = (): LanguageCode => {
  try {
    const best = RNLocalize.findBestLanguageTag(SUPPORTED as string[]);
    if (best?.languageTag) {
      const base = best.languageTag.split('-')[0].toLowerCase();
      if (isSupported(base)) {
        return base;
      }
    }
    const locales = RNLocalize.getLocales();
    for (const locale of locales) {
      const code = locale.languageCode?.toLowerCase();
      if (code && isSupported(code)) {
        return code;
      }
    }
  } catch {
    // Fall through to English.
  }
  return 'en';
};

interface LanguageContextValue {
  language: LanguageCode;
  /** BCP-47 tag for the active language, for Intl formatting. */
  tag: string;
  /** True until the stored preference has been read. */
  ready: boolean;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey, params?: TransParams) => string;
  /** Chooses `<base>_one` / `<base>_other` and fills {n}. */
  tp: (baseKey: string, n: number, params?: TransParams) => string;
  options: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      let resolved: LanguageCode = 'en';
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        // An unreadable store is not an answer: fall through and detect.
      }
      if (stored && isSupported(stored)) {
        resolved = stored;
      } else {
        resolved = detectDeviceLanguage();
        // Remembering the choice is a convenience. A store that refuses the
        // write must not demote a German phone to English for this run.
        AsyncStorage.setItem(STORAGE_KEY, resolved).catch(() => undefined);
      }
      if (!cancelled) {
        setLanguageState(resolved);
        setReady(true);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => undefined);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const option =
      LANGUAGE_OPTIONS.find(o => o.code === language) ?? LANGUAGE_OPTIONS[0];
    return {
      language,
      tag: option.tag,
      ready,
      setLanguage,
      t: (key, params) => translate(language, key, params),
      tp: (baseKey, n, params) => translatePlural(language, baseKey, n, params),
      options: LANGUAGE_OPTIONS,
    };
  }, [language, ready, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

/** Exposed for tests: the raw dictionaries. */
export { DICTIONARIES };
