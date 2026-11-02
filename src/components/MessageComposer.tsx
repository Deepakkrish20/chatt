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
          paddingTop: 8,
          paddingBottom: bottomInset > 0 ? bottomInset : 10,
          paddingHorizontal: 12,
        },
      ]}
    >
      {/* Monolithic Cyber Terminal Dock */}
      <View
        style={[
          styles.monolithicDock,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: canSend ? colors.buttonPrimaryBg : colors.border,
          },
        ]}
      >
        <View style={styles.dockIconBox}>
          <AppIcon
            name="lock"
            size={14}
            color={canSend ? colors.accent : colors.textMuted}
          />
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

        {/* Integrated Squircle Send Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            disabled={!canSend}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.dockSendBtn,
              canSend
                ? [
                    styles.dockSendBtnActive,
                    {
                      backgroundColor: colors.buttonPrimaryBg,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]
                : [
                    styles.dockSendBtnInactive,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderSubtle,
                    },
                  ],
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
          >
            <AppIcon
              name="send"
              size={14}
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
  monolithicDock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  dockIconBox: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  dockSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  dockSendBtnActive: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  dockSendBtnInactive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
