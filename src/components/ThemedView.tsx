import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'surfaceElevated' | 'surfaceSecondary' | 'input';
  bordered?: boolean;
}

export function ThemedView({
  style,
  variant = 'background',
  bordered = false,
  ...rest
}: ThemedViewProps) {
  const { colors } = useAppTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'surfaceElevated':
      case 'surface':
        return colors.surfaceElevated;
      case 'surfaceSecondary':
        return colors.surfaceSecondary;
      case 'input':
        return colors.inputBackground;
      case 'background':
      default:
        return colors.background;
    }
  };

  return (
    <View
      style={[
        { backgroundColor: getBackgroundColor() },
        bordered && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
      {...rest}
    />
  );
}
