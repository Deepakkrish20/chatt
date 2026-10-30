import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { AppIcon } from './AppIcon';

export interface MessageComposerProps {
  onSendMessage?: (content: string) => void;
  placeholder?: string;
}

export function MessageComposer({
  onSendMessage,
  placeholder = 'Encrypted message…',
}: MessageComposerProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [text, setText] = useState('');
  const [buttonScale] = useState(() => new Animated.Value(1));
  const useNativeDriver = Platform.OS !== 'web';

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage?.(trimmed);
    setText('');
  };

  const handlePressIn = () => {
    Animated.timing(buttonScale, {
      toValue: 0.9,
      duration: 80,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver,
    }).start();
  };

  const canSend = Boolean(text.trim());

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
        },
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          style={[
            typography.body,
            styles.input,
            { color: colors.text },
          ]}
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            disabled={!canSend}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: canSend ? colors.buttonPrimaryBg : colors.surfaceSecondary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
          >
            <AppIcon
              name="send"
              size={14}
              color={canSend ? colors.buttonPrimaryText : colors.textMuted}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
