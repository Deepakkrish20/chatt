/**
 * Raw Black Monochrome Theme Color Tokens.
 *
 * Strictly adheres to the raw black palette:
 * - Main background: #000000
 * - Elevated surfaces: #0A0A0A
 * - Secondary surfaces: #111111
 * - Input backgrounds: #0D0D0D
 * - Borders: #262626
 * - Primary text: #FFFFFF
 * - Secondary text: #A3A3A3
 * - Muted text: #737373
 *
 * Strictly avoids colorful accents, gradients, colorful shadows, and excessive decoration.
 */

export const RawBlackColors = {
  // Main background (OLED true black)
  background: '#000000',

  // Elevated surfaces (modals, cards, elevated panels)
  surfaceElevated: '#0A0A0A',

  // Secondary surfaces (rows, secondary containers, incoming bubbles)
  surfaceSecondary: '#111111',

  // Surface alias for components using 'surface'
  surface: '#0A0A0A',

  // Input fields
  inputBackground: '#0D0D0D',

  // Borders and dividers
  border: '#262626',
  borderSubtle: '#1A1A1A',

  // Typography hierarchy
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#737373',
  textInverse: '#000000',

  // Interactive buttons (Monochrome contrast)
  buttonPrimaryBg: '#FFFFFF',
  buttonPrimaryText: '#000000',
  buttonPrimaryPressed: '#E5E5E5',

  buttonSecondaryBg: '#111111',
  buttonSecondaryText: '#FFFFFF',
  buttonSecondaryBorder: '#262626',
  buttonSecondaryPressed: '#1A1A1A',

  // Message bubbles (Monochrome contrast)
  bubbleIncomingBg: '#111111',
  bubbleIncomingText: '#FFFFFF',
  bubbleIncomingBorder: '#262626',
  bubbleIncomingTime: '#737373',

  bubbleOutgoingBg: '#FFFFFF',
  bubbleOutgoingText: '#000000',
  bubbleOutgoingTime: '#737373',

  // Indicators & Badges (Clean high contrast)
  badgeBg: '#FFFFFF',
  badgeText: '#000000',
  onlineIndicator: '#FFFFFF',
} as const;

export type ColorPalette = typeof RawBlackColors;

export const Colors = {
  dark: RawBlackColors,
  light: RawBlackColors, // Strictly raw-black monochrome across all modes
} as const;

export type ColorScheme = 'dark';
