import { useColorScheme } from '@/hooks/use-color-scheme';
import { darkTheme, lightTheme, AppTheme } from '@/theme';

/**
 * Access the active theme, respecting the system color scheme while defaulting to dark.
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'light' ? lightTheme : darkTheme;
}

/**
 * Backwards compatibility alias for existing code
 */
export function useTheme() {
  const appTheme = useAppTheme();
  return appTheme.colors;
}
