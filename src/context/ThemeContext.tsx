import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MidnightWaveLightColors,
  MidnightWaveDarkColors,
  ColorPalette,
} from '@/theme/colors';
import { Spacing, Radius } from '@/theme/spacing';
import { Typography } from '@/theme/typography';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ColorPalette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
}

const THEME_STORAGE_KEY = '@chatt_theme_mode';

const ThemeContext = createContext<AppTheme>({
  isDark: true,
  themeMode: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
  colors: MidnightWaveDarkColors,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to 'dark' to render the requested dark theme
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setThemeModeState(stored);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const colors = themeMode === 'dark' ? MidnightWaveDarkColors : MidnightWaveLightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDark: themeMode === 'dark',
        themeMode,
        setThemeMode,
        toggleTheme,
        colors,
        spacing: Spacing,
        radius: Radius,
        typography: Typography,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
