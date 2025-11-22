import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface Theme {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryDark: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  card: string;
  shadow: string;
  modalBackground: string;
  overlay: string;
}

const lightTheme: Theme = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F7F8FA',
  primary: '#25D366',
  primaryDark: '#1DA851',
  text: '#111B21',
  textSecondary: '#667781',
  border: '#E9EDEF',
  success: '#25D366',
  error: '#DC2626',
  warning: '#F59E0B',
  card: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.08)',
  modalBackground: 'rgba(17, 27, 33, 0.9)',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

const darkTheme: Theme = {
  background: '#0B141A',
  surface: '#1F2C34',
  surfaceVariant: '#111B21',
  primary: '#00A884',
  primaryDark: '#008069',
  text: '#E9EDEF',
  textSecondary: '#8696A0',
  border: '#2A3942',
  success: '#00A884',
  error: '#EF4444',
  warning: '#F59E0B',
  card: '#1F2C34',
  shadow: 'rgba(0, 0, 0, 0.3)',
  modalBackground: 'rgba(0, 0, 0, 0.95)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const systemTheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  const isDark =
    themeMode === 'system' ? systemTheme === 'dark' : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      // Re-render when system theme changes
    });
    return () => subscription.remove();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
