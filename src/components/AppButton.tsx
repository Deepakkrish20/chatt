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

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...rest
}: AppButtonProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return colors.surfaceElevated;
    switch (variant) {
      case 'primary':
        return pressed ? colors.buttonPrimaryPressed : colors.buttonPrimaryBg;
      case 'secondary':
        return pressed ? colors.buttonSecondaryPressed : colors.buttonSecondaryBg;
      case 'outline':
      case 'ghost':
        return pressed ? colors.surfaceSecondary : 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
        return colors.buttonPrimaryText;
      case 'secondary':
      case 'outline':
        return colors.buttonSecondaryText;
      case 'ghost':
        return colors.textSecondary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    if (variant === 'secondary' || variant === 'outline') return colors.border;
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 2, minHeight: 36 };
      case 'lg':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 };
      case 'md':
      default:
        return { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.md, minHeight: 46 };
    }
  };

  const textTypography = size === 'sm' ? typography.captionMedium : typography.bodyMedium;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderRadius: radius.md,
        },
        getPadding(),
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.buttonPrimaryText : colors.text}
        />
      ) : (
        <Text style={[textTypography, { color: getTextColor(), textAlign: 'center' }]}>
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
    flexDirection: 'row',
  },
});
