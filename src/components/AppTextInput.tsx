import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
  onClear?: () => void;
}

export function AppTextInput({
  label,
  error,
  hint,
  containerStyle,
  isPassword = false,
  value,
  onChangeText,
  onClear,
  style,
  onFocus,
  onBlur,
  ...rest
}: AppTextInputProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);
  const [focusAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#EF4444' : colors.border, colors.accent],
  });

  const showClear = Boolean(value && !isPassword && onClear);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {Boolean(label) ? (
        <View style={styles.labelRow}>
          <Text style={[typography.label, { color: isFocused ? colors.text : colors.textSecondary }]}>
            {label!.toUpperCase()}
          </Text>
          {Boolean(error) ? (
            <Text style={[typography.label, { color: colors.textSecondary, textTransform: 'none' }]}>
              • {error}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            styles.input,
            { color: colors.text },
            style,
          ]}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {showClear ? (
          <Pressable
            hitSlop={12}
            onPress={onClear}
            style={styles.rightAccessory}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
          >
            <View style={[styles.clearBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>✕</Text>
            </View>
          </Pressable>
        ) : null}

        {isPassword ? (
          <Pressable
            hitSlop={12}
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.rightAccessory}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {!label && Boolean(error) ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {error}
        </Text>
      ) : Boolean(hint) ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  rightAccessory: {
    paddingLeft: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  clearBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
