import React, { useState } from 'react';
import { Pressable, View, StyleSheet, Text, Animated, Platform } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { AppAvatar } from './AppAvatar';
import { ThemedText } from './ThemedText';
import { DirectConversationPreview } from '@/types';

export interface ConversationItemProps {
  conversation: DirectConversationPreview;
  onPress: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { colors, spacing, typography, isDark } = useAppTheme();
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const useNativeDriver = Platform.OS !== 'web';

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.985,
      duration: 100,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver,
    }).start();
  };

  const hasUnread = conversation.unreadCount > 0;
  const isTyping = conversation.lastMessageSnippet.toLowerCase().startsWith('typing');
  const isHighlighted = hasUnread || isTyping;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginHorizontal: spacing.md, marginVertical: 4 }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: isDark
              ? (pressed ? '#151922' : '#0B0F17')
              : (pressed ? '#F1F5F9' : '#FFFFFF'),
            borderColor: isHighlighted
              ? (isDark ? '#2563EB' : '#DBEAFE')
              : (isDark ? '#1E2533' : '#F1F5F9'),
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.3 : 0.04,
            shadowRadius: 4,
            elevation: 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${conversation.participantName}, last message: ${conversation.lastMessageSnippet}`}
      >
        <AppAvatar
          name={conversation.participantName}
          size="md"
          isOnline={conversation.isOnline}
          style={{ marginRight: spacing.md }}
        />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <ThemedText variant="bodySemibold" numberOfLines={1} style={[styles.name, { fontSize: 15, color: colors.text, fontWeight: '600' }]}>
              {conversation.participantName}
            </ThemedText>
            <ThemedText variant="label" tone="muted" style={{ fontSize: 12, color: colors.textMuted }}>
              {conversation.lastMessageTimestamp}
            </ThemedText>
          </View>

          <View style={styles.bottomRow}>
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={[
                styles.snippet,
                {
                  fontSize: 13,
                  color: isHighlighted ? (isDark ? '#60A5FA' : '#1E40AF') : colors.textMuted,
                  fontWeight: isHighlighted ? '600' : '400',
                  flex: 1,
                },
              ]}
            >
              {conversation.lastMessageSnippet}
            </ThemedText>

            {hasUnread ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.badgeBg,
                    borderRadius: 12,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: spacing.sm,
                  },
                ]}
              >
                <Text style={[typography.label, { color: '#FFFFFF', fontSize: 11, fontWeight: '700' }]}>
                  {conversation.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    marginRight: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snippet: {
    flex: 1,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
  },
});
