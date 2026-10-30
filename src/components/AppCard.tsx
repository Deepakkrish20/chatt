import React from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export interface AppCardProps extends ViewProps {
  elevated?: boolean;
}

export function AppCard({ elevated = false, style, children, ...rest }: AppCardProps) {
  const { colors, spacing, radius } = useAppTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
