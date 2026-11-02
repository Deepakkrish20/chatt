/**
 * Flagship Dark Theme Color Tokens (WhatsApp Pro / Obsidian Hybrid).
 *
 * Designed for maximum visual comfort, zero eye glare, and premium depth:
 * - Main background: Deep midnight obsidian (#0B1014)
 * - Elevated surfaces: Soft slate elevation (#111A22)
 * - Secondary surfaces: (#16222E)
 * - Input backgrounds: (#131D27)
 * - Borders: (#1E2D3D)
 * - Outgoing bubbles: Rich soothing emerald-slate (#005C4B)
 * - Incoming bubbles: Modern dark slate (#18222D)
 * - Online indicator: Vibrant pulsing emerald (#22C55E)
 * - Read receipts: Electric cyan-blue (#38BDF8)
 * - Action buttons: Vibrant emerald (#00A884)
 */

export const RawBlackColors = {
  // Main background (Rich Deep Midnight Obsidian - maintains OLED battery savings with depth)
  background: '#0B1014',

  // Elevated surfaces (modals, cards, elevated panels)
  surfaceElevated: '#111A22',

  // Secondary surfaces (rows, secondary containers, search inputs)
  surfaceSecondary: '#16222E',

  // Surface alias for components using 'surface'
  surface: '#111A22',

  // Input fields
  inputBackground: '#131D27',

  // Borders and dividers (tactile midnight slate)
  border: '#1E2D3D',
  borderSubtle: '#152230',

  // Typography hierarchy
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B1014',

  // Interactive buttons (Vibrant emerald accent)
  buttonPrimaryBg: '#00A884',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryPressed: '#008F6F',

  buttonSecondaryBg: '#16222E',
  buttonSecondaryText: '#F1F5F9',
  buttonSecondaryBorder: '#1E2D3D',
  buttonSecondaryPressed: '#1D2C3B',

  // Message bubbles (Flagship Dark - Zero Glare, High Comfort)
  bubbleIncomingBg: '#18222D',
  bubbleIncomingText: '#F1F5F9',
  bubbleIncomingBorder: '#223141',
  bubbleIncomingTime: '#8696A0',

  bubbleOutgoingBg: '#005C4B',
  bubbleOutgoingText: '#FFFFFF',
  bubbleOutgoingTime: '#86E3C3',

  // Indicators & Badges (Clean high contrast)
  badgeBg: '#00A884',
  badgeText: '#FFFFFF',
  onlineIndicator: '#22C55E',

  // Accents & Receipts
  accent: '#00A884',
  accentSubtle: 'rgba(0, 168, 132, 0.15)',
  readReceipt: '#38BDF8',
} as const;

export type ColorPalette = typeof RawBlackColors;

export const Colors = {
  dark: RawBlackColors,
  light: RawBlackColors, // Strictly raw-black monochrome across all modes
} as const;

export type ColorScheme = 'dark';
