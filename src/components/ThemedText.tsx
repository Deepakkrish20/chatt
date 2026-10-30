import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'bodySemibold'
  | 'caption'
  | 'captionMedium'
  | 'label'
  | 'code';

export type TextColorTone = 'primary' | 'secondary' | 'muted' | 'inverse';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextColorTone;
  color?: string;
}

export function ThemedText({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  ...rest
}: ThemedTextProps) {
  const { colors, typography } = useAppTheme();

  const getTextColor = () => {
    if (color) return color;
    switch (tone) {
      case 'secondary':
        return colors.textSecondary;
      case 'muted':
        return colors.textMuted;
      case 'inverse':
        return colors.textInverse;
      case 'primary':
      default:
        // By default, caption and label lean towards secondary/muted tones
        if (variant === 'caption' || variant === 'captionMedium') return colors.textSecondary;
        if (variant === 'label') return colors.textMuted;
        return colors.text;
    }
  };

  const typographyStyle = typography[variant] || typography.body;

  return (
    <Text
      style={[
        typographyStyle,
        { color: getTextColor() },
        style,
      ]}
      {...rest}
    />
  );
}
