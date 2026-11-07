/**
 * Dual-Tone Theme Color Tokens (Light & Dark OLED Wave).
 *
 * Implements the exact pixel-perfect design specifications:
 * 1. Light Theme ("Midnight Wave / Yin-Yang Contrast"):
 *    - Top Header: Deep Midnight Navy (#0B101B)
 *    - Canvas & Surfaces: Crisp Pure White (#FFFFFF) & Soft Slate (#F8FAFC)
 *    - Outgoing Bubbles: Midnight Navy (#0F172A) with white text & cyan checkmarks
 *    - Incoming Bubbles: Pure White (#FFFFFF) with slate border (#E2E8F0)
 *    - Accents: Ice-Blue (#DBEAFE) & Royal Blue (#2563EB)
 *
 * 2. Dark Theme ("Dark OLED Neon Wave"):
 *    - Main Canvas: Pure Pitch Black (#000000 / #050505)
 *    - Top Header: Deep Charcoal / Pitch Black (#000000 / #070A11)
 *    - Elevated Surfaces / Cards: Dark Charcoal Slate (#151922)
 *    - Borders: Subtle Charcoal Border (#242B3A)
 *    - Outgoing Bubbles: Vibrant Electric Royal Blue (#2563EB / #1D4ED8)
 *    - Incoming Bubbles: Dark Charcoal (#151922) with border (#242B3A)
 *    - Primary Button: Electric Royal Blue (#2563EB)
 *    - Accents: Neon Sky Blue (#38BDF8) & Royal Blue (#2563EB)
 */

export const MidnightWaveLightColors = {
  // Main canvas background (Crisp Light Surface)
  background: '#F8FAFC',

  // Dark header zone (Deep Midnight Navy)
  headerNavy: '#0B101B',
  headerNavySecondary: '#0E1626',
  headerText: '#FFFFFF',
  headerTextSecondary: 'rgba(255, 255, 255, 0.7)',

  // Elevated surfaces (modals, cards, sheets)
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceNavy: '#0B101B',

  // Input fields
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',

  // Borders and dividers
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',

  // Typography hierarchy
  text: '#0F172A', // Deep slate navy
  textSecondary: '#475569', // Medium slate
  textMuted: '#94A3B8', // Soft muted slate
  textInverse: '#FFFFFF',

  // Interactive buttons (Dark Navy primary pill)
  buttonPrimaryBg: '#0F172A',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryPressed: '#1E293B',

  buttonSecondaryBg: '#F1F5F9',
  buttonSecondaryText: '#0F172A',
  buttonSecondaryBorder: '#E2E8F0',
  buttonSecondaryPressed: '#E2E8F0',

  // Signature Ice-Blue Accents
  accentIceBlue: '#DBEAFE',
  accentIceBlueBorder: '#BFDBFE',
  accentIceBlueText: '#1E40AF',

  // Message bubbles
  bubbleIncomingBg: '#FFFFFF',
  bubbleIncomingText: '#0F172A',
  bubbleIncomingBorder: '#E2E8F0',
  bubbleIncomingTime: '#94A3B8',

  bubbleOutgoingBg: '#0F172A',
  bubbleOutgoingText: '#FFFFFF',
  bubbleOutgoingTime: 'rgba(255, 255, 255, 0.7)',

  // Indicators & Badges
  badgeBg: '#2563EB',
  badgeText: '#FFFFFF',
  onlineIndicator: '#22C55E',

  // Accents & Receipts
  accent: '#2563EB',
  accentLight: '#60A5FA',
  accentNeon: '#38BDF8',
  accentSubtle: 'rgba(37, 99, 235, 0.1)',
  readReceipt: '#38BDF8',

  // Floating Navigation Bar
  floatingNavBg: '#0B101B',
  floatingNavBorder: '#1E293B',
  floatingNavActivePill: '#DBEAFE',
  floatingNavActiveText: '#0B101B',
};

export const MidnightWaveDarkColors = {
  // Main canvas background (Pure Pitch Black OLED)
  background: '#000000',

  // Dark header zone (Charcoal pitch black)
  headerNavy: '#000000',
  headerNavySecondary: '#070A11',
  headerText: '#FFFFFF',
  headerTextSecondary: '#64748B',

  // Elevated surfaces (modals, cards, sheets)
  surfaceElevated: '#151922',
  surfaceSecondary: '#0B0F17',
  surface: '#151922',
  surfaceNavy: '#070A11',

  // Input fields
  inputBackground: '#151922',
  inputBorder: '#242B3A',

  // Borders and dividers
  border: '#242B3A',
  borderSubtle: '#1A202C',

  // Typography hierarchy
  text: '#FFFFFF', // Pure white
  textSecondary: '#94A3B8', // Medium light slate
  textMuted: '#64748B', // Soft muted slate
  textInverse: '#000000',

  // Interactive buttons (Electric Royal Blue)
  buttonPrimaryBg: '#2563EB',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryPressed: '#1D4ED8',

  buttonSecondaryBg: '#151922',
  buttonSecondaryText: '#FFFFFF',
  buttonSecondaryBorder: '#242B3A',
  buttonSecondaryPressed: '#1E2533',

  // Signature Accents
  accentIceBlue: '#38BDF8',
  accentIceBlueBorder: '#0284C7',
  accentIceBlueText: '#FFFFFF',

  // Message bubbles (Exact match with Screen 3 in Dark Theme)
  bubbleIncomingBg: '#151922',
  bubbleIncomingText: '#FFFFFF',
  bubbleIncomingBorder: '#242B3A',
  bubbleIncomingTime: '#64748B',

  bubbleOutgoingBg: '#2563EB', // Electric Royal Blue
  bubbleOutgoingText: '#FFFFFF',
  bubbleOutgoingTime: 'rgba(255, 255, 255, 0.75)',

  // Indicators & Badges
  badgeBg: '#2563EB',
  badgeText: '#FFFFFF',
  onlineIndicator: '#22C55E',

  // Accents & Receipts
  accent: '#2563EB',
  accentLight: '#60A5FA',
  accentNeon: '#38BDF8',
  accentSubtle: 'rgba(37, 99, 235, 0.2)',
  readReceipt: '#38BDF8',

  // Floating Navigation Bar
  floatingNavBg: '#0E131F',
  floatingNavBorder: '#1E2533',
  floatingNavActivePill: '#2563EB',
  floatingNavActiveText: '#FFFFFF',
};

export const MidnightWaveColors = MidnightWaveLightColors;
export const RawBlackColors = MidnightWaveDarkColors;
export type ColorPalette = typeof MidnightWaveLightColors;

export const Colors = {
  dark: MidnightWaveDarkColors,
  light: MidnightWaveLightColors,
} as const;

export type ColorScheme = 'light' | 'dark';
