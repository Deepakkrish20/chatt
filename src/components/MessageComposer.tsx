import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { AppIcon } from './AppIcon';

export interface MessageComposerProps {
  onSendMessage?: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  bottomInset?: number;
}

export function MessageComposer({
  onSendMessage,
  onTyping,
  placeholder = 'Encrypted message…',
  disabled = false,
  bottomInset = 0,
}: MessageComposerProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [text, setText] = useState('');
  const [buttonScale] = useState(() => new Animated.Value(1));
  const useNativeDriver = Platform.OS !== 'web';
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);

    if (onTyping) {
      if (newText.trim().length > 0) {
        onTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        onTyping(false);
      }
    }
  };

  const handleSend = () => {
    if (disabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);
    onSendMessage?.(trimmed);
    setText('');
  };

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(buttonScale, {
      toValue: 0.9,
      duration: 80,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver,
    }).start();
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web') {
      if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
        e.preventDefault?.();
        handleSend();
      }
    }
  };

  const canSend = Boolean(text.trim()) && !disabled;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm + 2,
          paddingBottom: bottomInset > 0 ? bottomInset : spacing.sm + 2,
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
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          multiline
          textAlignVertical="center"
          onKeyPress={handleKeyPress}
          style={[
            typography.body,
            styles.input,
            { color: disabled ? colors.textMuted : colors.text },
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
