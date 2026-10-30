import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
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

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage?.(trimmed);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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

          <Pressable
            disabled={!text.trim()}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: text.trim() ? colors.buttonPrimaryBg : colors.surfaceSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <AppIcon
              name="send"
              size={14}
              color={text.trim() ? colors.buttonPrimaryText : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    minHeight: 44,
    maxHeight: 120,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
