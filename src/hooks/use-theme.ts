import { theme, AppTheme, ColorPalette } from '@/theme';

/**
 * Access the centralized Raw Black theme.
 */
export function useAppTheme(): AppTheme {
  return theme;
}

/**
 * Convenience hook to access theme colors directly.
 */
export function useTheme(): ColorPalette {
  return theme.colors;
}
