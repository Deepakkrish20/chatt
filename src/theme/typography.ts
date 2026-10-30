/**
 * Typography tokens for readable, accessible text hierarchy.
 */

import { Platform, TextStyle } from 'react-native';

export const FontFamily = Platform.select({
  ios: {
    regular: 'System',
    mono: 'Menlo',
  },
  android: {
    regular: 'Roboto',
    mono: 'monospace',
  },
  default: {
    regular: 'system-ui, -apple-system, sans-serif',
    mono: 'monospace',
  },
});

export const Typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  code: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.mono,
  },
};
