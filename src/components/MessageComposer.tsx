import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  placeholder = 'Message…',
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
          paddingTop: 8,
          paddingBottom: bottomInset > 0 ? bottomInset : 10,
          paddingHorizontal: 12,
        },
      ]}
    >
      <View style={styles.composerRow}>
        {/* Aurora Dark Message Input Capsule */}
        <View
          style={[
            styles.inputCapsule,
            {
              backgroundColor: '#181822',
              borderColor: '#2A273C',
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
            autoCorrect={true}
            spellCheck={true}
            autoCapitalize="sentences"
            keyboardType="default"
            returnKeyType="default"
            disableFullscreenUI={true}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            onKeyPress={handleKeyPress}
            style={[
              typography.body,
              styles.input,
              { color: disabled ? colors.textMuted : '#FFFFFF' },
            ]}
          />
        </View>

        {/* Aurora Glowing Circular Action FAB */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            disabled={!canSend}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendFab,
              canSend ? styles.sendFabActive : styles.sendFabInactive,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
          >
            {canSend ? (
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}

            <AppIcon
              name="send"
              size={18}
              color={canSend ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
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
    borderTopColor: 'rgba(168, 85, 247, 0.15)',
    width: '100%',
    backgroundColor: '#07070A',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendFabActive: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 8,
  },
  sendFabInactive: {
    backgroundColor: '#181822',
    borderWidth: 1,
    borderColor: '#2A273C',
  },
});
