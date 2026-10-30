/**
 * Theme configuration module.
 *
 * Centralizes color palettes, spacing units, border radii, and typography.
 * The application defaults to dark mode for an eye-friendly, private messaging feel.
 */

import { Colors, ColorPalette, ColorScheme } from './colors';
import { Radius, Spacing } from './spacing';
import { Typography } from './typography';

export { Colors, Radius, Spacing, Typography };
export type { ColorPalette, ColorScheme };

export interface AppTheme {
  isDark: boolean;
  colors: ColorPalette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
}

export const darkTheme: AppTheme = {
  isDark: true,
  colors: Colors.dark,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
};

export const lightTheme: AppTheme = {
  isDark: false,
  colors: Colors.light,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
};

/**
 * Default application theme (Dark-first)
 */
export const theme = darkTheme;
