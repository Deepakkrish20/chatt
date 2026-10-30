import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'elevated';
}

export function ThemedView({ style, variant = 'background', ...rest }: ThemedViewProps) {
  const { colors } = useAppTheme();

  const variantStyle = {
    background: colors.background,
    surface: colors.surface,
    elevated: colors.surfaceElevated,
  }[variant];

  return <View style={[{ backgroundColor: variantStyle }, style]} {...rest} />;
}
