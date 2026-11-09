import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { setBaseSystemBars } from '../utils/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, type Palette } from '../theme/tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme_mode';

const isMode = (v: string): v is ThemeMode =>
  v === 'light' || v === 'dark' || v === 'system';

interface ThemeContextValue {
  theme: Palette;
  themeMode: ThemeMode;
  isDark: boolean;
  /** False until the stored preference has been read. */
  ready: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * A colour for the status bar alone, with white icons, or null for the
   * theme's own. The light theme's green Feed header asks for its green here
   * while it is on screen. It is ignored in the dark theme.
   */
  setStatusTint: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // useColorScheme already subscribes to Appearance changes and re-renders, so
  // no extra listener is needed here.
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (cancelled) {
          return;
        }
        if (stored && isMode(stored)) {
          setThemeModeState(stored);
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    // Update the UI first, then persist. The old version awaited the write
    // before re-rendering, which made the toggle feel laggy.
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => undefined);
  }, []);

  const [statusTint, setStatusTint] = useState<string | null>(null);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark =
      themeMode === 'system' ? systemScheme !== 'light' : themeMode === 'dark';
    return {
      theme: isDark ? palettes.dark : palettes.light,
      themeMode,
      isDark,
      ready,
      setThemeMode,
      setStatusTint,
    };
  }, [themeMode, systemScheme, ready, setThemeMode]);

  /*
   * The bars follow the theme the app settled on, not the system's night mode.
   * Keyed off a resource qualifier they inverted whenever the two disagreed:
   * Dark chosen on a phone in Light mode drew a black gesture handle on the
   * near-black tab bar, and it disappeared.
   */
  useEffect(() => {
    void setBaseSystemBars(
      !value.isDark,
      value.theme.bg,
      statusTint && !value.isDark ? { light: false, color: statusTint } : undefined,
    );
  }, [value.isDark, value.theme.bg, statusTint]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
