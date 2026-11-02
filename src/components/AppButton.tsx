import React, { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
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
  icon?: React.ReactNode;
}

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  icon,
  onPress,
  ...rest
}: AppButtonProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const useNativeDriver = Platform.OS !== 'web';

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver,
    }).start();
  };

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
        return { paddingVertical: spacing.xs + 3, paddingHorizontal: spacing.sm + 4, minHeight: 38 };
      case 'lg':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 };
      case 'md':
      default:
        return { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.md, minHeight: 46 };
    }
  };

  const textTypography = size === 'sm' ? typography.captionMedium : typography.bodyMedium;

  const glowStyle: ViewStyle | null =
    variant === 'primary' && !disabled
      ? {
          shadowColor: '#A855F7',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.38,
          shadowRadius: 10,
          elevation: 6,
        }
      : null;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, glowStyle]}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
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
        accessibilityState={{ disabled: Boolean(disabled || loading) }}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.buttonPrimaryText : colors.text}
          />
        ) : (
          <View style={styles.buttonContent}>
            {Boolean(icon) ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
            <Text style={[textTypography, { color: getTextColor(), textAlign: 'center' }]}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
