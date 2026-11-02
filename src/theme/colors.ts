/**
 * Aurora Eclipse Theme Color Tokens.
 *
 * Faithfully matches the "Aurora Eclipse - Dark with fluid aurora accents" specification:
 * - Canvas: Deep Obsidian Void (#07070A)
 * - Elevated Surfaces: Frosted Aurora Dark (#12111A)
 * - Outgoing Bubbles: Vibrant Aurora Violet (#7C3AED / #6D28D9)
 * - Incoming Bubbles: Charcoal Glass (#181822)
 * - Online Status: Soft Neon Lavender/Magenta (#C084FC)
 * - Fluid Aurora Highlights: Glowing Violet & Neon Magenta (#A855F7, #D946EF)
 * - Action Elements: Aurora Violet (#9333EA)
 */

export const RawBlackColors = {
  // Main background (Deep Obsidian Void)
  background: '#07070A',

  // Elevated surfaces (modals, cards, elevated panels)
  surfaceElevated: '#12111A',

  // Secondary surfaces (rows, secondary containers, search inputs)
  surfaceSecondary: '#1A1826',

  // Surface alias for components using 'surface'
  surface: '#12111A',

  // Input fields (recessed aurora input)
  inputBackground: '#14131D',

  // Borders and dividers (subtle violet-slate cyber border)
  border: '#28233C',
  borderSubtle: '#1B1728',

  // Typography hierarchy
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#07070A',

  // Interactive buttons (Aurora Violet)
  buttonPrimaryBg: '#9333EA',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryPressed: '#7E22CE',

  buttonSecondaryBg: '#1A1826',
  buttonSecondaryText: '#FFFFFF',
  buttonSecondaryBorder: '#28233C',
  buttonSecondaryPressed: '#262238',

  // Message bubbles (Aurora Eclipse Signature)
  bubbleIncomingBg: '#181822',
  bubbleIncomingText: '#FFFFFF',
  bubbleIncomingBorder: '#252534',
  bubbleIncomingTime: '#71717A',

  bubbleOutgoingBg: '#7C3AED',
  bubbleOutgoingText: '#FFFFFF',
  bubbleOutgoingTime: 'rgba(233, 213, 255, 0.75)',

  // Indicators & Badges
  badgeBg: '#9333EA',
  badgeText: '#FFFFFF',
  onlineIndicator: '#C084FC',

  // Accents & Receipts (Fluid Aurora Neon)
  accent: '#A855F7',
  accentLight: '#C084FC',
  accentNeon: '#D946EF',
  accentSubtle: 'rgba(168, 85, 247, 0.16)',
  readReceipt: '#D8B4FE',
} as const;

export type ColorPalette = typeof RawBlackColors;

export const Colors = {
  dark: RawBlackColors,
  light: RawBlackColors, // Strictly raw-black monochrome across all modes
} as const;

export type ColorScheme = 'dark';
