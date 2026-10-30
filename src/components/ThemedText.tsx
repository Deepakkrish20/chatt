import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'label'
  | 'code'
  | 'accent';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

export function ThemedText({
  variant = 'body',
  color,
  style,
  ...rest
}: ThemedTextProps) {
  const { colors, typography } = useAppTheme();

  const getTextColor = () => {
    if (color) return color;
    switch (variant) {
      case 'caption':
        return colors.textSecondary;
      case 'label':
        return colors.textMuted;
      case 'accent':
        return colors.accent;
      default:
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
