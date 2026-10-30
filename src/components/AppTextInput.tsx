import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
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
}

export function AppTextInput({
  label,
  error,
  hint,
  containerStyle,
  isPassword = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: AppTextInputProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {label.toUpperCase()}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: isFocused ? colors.text : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TextInput
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

        {isPassword && (
          <Pressable
            hitSlop={8}
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.rightAccessory}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs }]}>
          {error}
        </Text>
      ) : hint ? (
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
  },
});
