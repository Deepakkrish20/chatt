/**
 * Color tokens for Chatt application.
 *
 * Designed with a dark-first aesthetic:
 * - Deep dark background for OLED screens and low eye-strain
 * - High readability foreground text
 * - Distinctive Indigo (#6366F1) accent color
 * - Functional status indicators
 */

export const Colors = {
  dark: {
    // Backgrounds
    background: '#0F1117',
    surface: '#181B24',
    surfaceElevated: '#222634',
    border: '#2A3042',
    borderSubtle: '#1E2333',

    // Text & Content
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    textInverse: '#0F1117',

    // Distinctive Accent Color (Electric Indigo)
    accent: '#6366F1',
    accentHover: '#4F46E5',
    accentLight: '#818CF8',
    accentMuted: 'rgba(99, 102, 241, 0.16)',
    accentForeground: '#FFFFFF',

    // Status Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  light: {
    // Backgrounds
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',

    // Text & Content
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    // Distinctive Accent Color (Electric Indigo)
    accent: '#6366F1',
    accentHover: '#4F46E5',
    accentLight: '#818CF8',
    accentMuted: 'rgba(99, 102, 241, 0.12)',
    accentForeground: '#FFFFFF',

    // Status Colors
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
} as const;

export type ColorScheme = keyof typeof Colors;

export interface ColorPalette {
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly border: string;
  readonly borderSubtle: string;

  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly textInverse: string;

  readonly accent: string;
  readonly accentHover: string;
  readonly accentLight: string;
  readonly accentMuted: string;
  readonly accentForeground: string;

  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
}
