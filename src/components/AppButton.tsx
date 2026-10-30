import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface AppButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: AppButtonProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return colors.surfaceElevated;
    if (variant === 'primary') {
      return pressed ? colors.accentHover : colors.accent;
    }
    if (variant === 'secondary') {
      return pressed ? colors.surfaceElevated : colors.surface;
    }
    return pressed ? colors.accentMuted : 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    if (variant === 'primary') return colors.accentForeground;
    if (variant === 'secondary') return colors.text;
    return colors.accent;
  };

  const getBorderColor = () => {
    if (variant === 'secondary') return colors.border;
    return 'transparent';
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderRadius: radius.md,
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.md,
        },
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.accentForeground : colors.accent}
        />
      ) : (
        <Text style={[typography.bodyMedium, { color: getTextColor(), textAlign: 'center' }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
