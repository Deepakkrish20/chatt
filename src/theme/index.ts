/**
 * Centralized Raw Black Theme Configuration Module.
 *
 * Theme tokens strictly follow the Raw Black specification:
 * - Main background: #000000
 * - Elevated surfaces: #0A0A0A
 * - Secondary surfaces: #111111
 * - Input backgrounds: #0D0D0D
 * - Borders: #262626
 * - Primary text: #FFFFFF
 * - Secondary text: #A3A3A3
 * - Muted text: #737373
 *
 * No colorful accents or gradients.
 */

import { Colors, ColorPalette, ColorScheme, RawBlackColors } from './colors';
import { Radius, Spacing } from './spacing';
import { Typography } from './typography';

export { Colors, Radius, Spacing, Typography, RawBlackColors };
export type { ColorPalette, ColorScheme };

export interface AppTheme {
  isDark: true;
  colors: ColorPalette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
}

export const theme: AppTheme = {
  isDark: true,
  colors: RawBlackColors,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
};

export const darkTheme = theme;
export const lightTheme = theme; // Strictly raw black across all modes
