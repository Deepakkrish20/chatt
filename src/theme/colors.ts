/**
 * Bespoke Cyber Obsidian & Electric Sapphire Palette (Unique Private Terminal Style).
 *
 * Designed to be completely distinct from mass-market messengers (no WhatsApp green):
 * - Canvas: Cosmic Obsidian (#06070B)
 * - Surfaces: Frosted Titanium Dark (#0E121B)
 * - Outgoing Bubbles: Electric Sapphire (#1D4ED8)
 * - Incoming Bubbles: Obsidian Glass (#0E131E)
 * - Online Beacon: Neon Cyan (#00F0FF)
 * - Read Receipts: Neon Cyan (#00F0FF)
 * - Action Elements: Electric Cobalt (#2563EB)
 */

export const RawBlackColors = {
  // Main background (Cosmic Obsidian - pure deep void)
  background: '#06070B',

  // Elevated surfaces (modals, cards, elevated terminal panels)
  surfaceElevated: '#0E121B',

  // Secondary surfaces (rows, secondary containers, search inputs)
  surfaceSecondary: '#131926',

  // Surface alias for components using 'surface'
  surface: '#0E121B',

  // Input fields (recessed terminal input)
  inputBackground: '#0A0D14',

  // Borders and dividers (sharp titanium cyber-edge)
  border: '#1B2436',
  borderSubtle: '#111622',

  // Typography hierarchy
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#06070B',

  // Interactive buttons (Electric Cobalt Sapphire)
  buttonPrimaryBg: '#2563EB',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryPressed: '#1D4ED8',

  buttonSecondaryBg: '#131926',
  buttonSecondaryText: '#F8FAFC',
  buttonSecondaryBorder: '#1B2436',
  buttonSecondaryPressed: '#1E283C',

  // Message bubbles (Bespoke Luxury - Distinct from any common app)
  bubbleIncomingBg: '#0E131E',
  bubbleIncomingText: '#F8FAFC',
  bubbleIncomingBorder: '#1C2638',
  bubbleIncomingTime: '#64748B',

  bubbleOutgoingBg: '#1D4ED8',
  bubbleOutgoingText: '#FFFFFF',
  bubbleOutgoingTime: 'rgba(255, 255, 255, 0.72)',

  // Indicators & Badges
  badgeBg: '#2563EB',
  badgeText: '#FFFFFF',
  onlineIndicator: '#00F0FF',

  // Accents & Receipts (Cyber Cyan Neon)
  accent: '#00F0FF',
  accentSubtle: 'rgba(0, 240, 255, 0.12)',
  readReceipt: '#00F0FF',
} as const;

export type ColorPalette = typeof RawBlackColors;

export const Colors = {
  dark: RawBlackColors,
  light: RawBlackColors, // Strictly raw-black monochrome across all modes
} as const;

export type ColorScheme = 'dark';
