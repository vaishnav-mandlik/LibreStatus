import * as React from 'react';

declare module 'react-native-localize' {
  export type TemperatureUnit = 'celsius' | 'fahrenheit';

  export interface Locale {
    languageCode: string;
    scriptCode?: string;
    countryCode: string;
    languageTag: string;
    isRTL: boolean;
  }

  export interface NumberFormatSettings {
    decimalSeparator: string;
    groupingSeparator: string;
  }

  export interface BestLanguageTagResult {
    languageTag: string;
    isRTL: boolean;
  }

  export function getLocales(): Locale[];

  export function getCountry(): string;

  export function getCurrencies(): string[];

  export function getNumberFormatSettings(): NumberFormatSettings;

  export function getTemperatureUnit(): TemperatureUnit;

  export function getTimeZone(): string;

  export function uses24HourClock(): boolean;

  export function usesMetricSystem(): boolean;

  export function usesAutoDateAndTime(): boolean | undefined;

  export function usesAutoTimeZone(): boolean | undefined;

  export function getCalendar(): CalendarType;

  export function findBestLanguageTag(
    languageTags: string[],
  ): BestLanguageTagResult | undefined;

  export function openAppLanguageSettings(): Promise<void>;

  export interface LocalizeContextValue {
    getCalendar: typeof getCalendar;
    getCountry: typeof getCountry;
    getCurrencies: typeof getCurrencies;
    getLocales: typeof getLocales;
    getNumberFormatSettings: typeof getNumberFormatSettings;
    getTemperatureUnit: typeof getTemperatureUnit;
    getTimeZone: typeof getTimeZone;
    uses24HourClock: typeof uses24HourClock;
    usesMetricSystem: typeof usesMetricSystem;
    usesAutoDateAndTime: typeof usesAutoDateAndTime;
    usesAutoTimeZone: typeof usesAutoTimeZone;
    findBestLanguageTag: typeof findBestLanguageTag;
    openAppLanguageSettings: typeof openAppLanguageSettings;
  }

  export interface ServerLanguagesProviderProps {
    value: string[];
    children: React.ReactNode;
  }

  export const ServerLanguagesProvider: React.ComponentType<ServerLanguagesProviderProps>;

  export function useLocalize(): LocalizeContextValue;
}
