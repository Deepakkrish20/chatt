import { useAppTheme as useThemeFromContext, AppTheme } from '@/context/ThemeContext';
import { ColorPalette } from '@/theme/colors';

export { ThemeProvider, type AppTheme } from '@/context/ThemeContext';

/**
 * Access the centralized dynamic theme (Light or Dark OLED).
 */
export function useAppTheme(): AppTheme {
  return useThemeFromContext();
}

/**
 * Convenience hook to access theme colors directly.
 */
export function useTheme(): ColorPalette {
  return useThemeFromContext().colors;
}
