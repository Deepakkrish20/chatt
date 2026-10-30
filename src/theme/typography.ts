/**
 * Typography tokens for readable, accessible text hierarchy.
 * Raw Black monochrome typography.
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
    regular: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

export const Typography: Record<string, TextStyle> = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    lineHeight: 23,
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
  bodySemibold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  captionMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  code: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.mono,
  },
};
