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
  const { colors, typography } = useAppTheme();
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
        styles.outerContainer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.borderSubtle,
          paddingTop: 6,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingHorizontal: 8,
        },
      ]}
    >
      <View style={styles.composerRow}>
        {/* Floating Capsule Input */}
        <View
          style={[
            styles.inputCapsule,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.lockIconBox}>
            <AppIcon name="lock" size={15} color={colors.textMuted} />
          </View>

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
        </View>

        {/* Standalone Circular Action / Send FAB */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            disabled={!canSend}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendFab,
              canSend
                ? [
                    styles.sendFabActive,
                    {
                      backgroundColor: colors.buttonPrimaryBg,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]
                : [
                    styles.sendFabInactive,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ],
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
          >
            <AppIcon
              name="send"
              size={16}
              color={canSend ? '#FFFFFF' : colors.textMuted}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  lockIconBox: {
    paddingRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendFabActive: {
    shadowColor: '#00A884',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sendFabInactive: {
    borderWidth: 1,
  },
});
