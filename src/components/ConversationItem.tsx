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
  const { colors, spacing, typography } = useAppTheme();
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
            backgroundColor: pressed
              ? '#1E1B2E'
              : isHighlighted
              ? 'rgba(26, 22, 42, 0.85)'
              : 'rgba(18, 16, 28, 0.65)',
            borderColor: isHighlighted
              ? 'rgba(168, 85, 247, 0.45)'
              : 'rgba(40, 35, 60, 0.5)',
            borderWidth: 1,
            borderRadius: 18,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
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
            <ThemedText variant="bodySemibold" numberOfLines={1} style={[styles.name, { fontSize: 16 }]}>
              {conversation.participantName}
            </ThemedText>
            <ThemedText variant="label" tone="muted" style={{ fontSize: 12 }}>
              {conversation.lastMessageTimestamp}
            </ThemedText>
          </View>

          <View style={styles.bottomRow}>
            <ThemedText
              variant="caption"
              tone={isHighlighted ? 'primary' : 'secondary'}
              numberOfLines={1}
              style={[
                styles.snippet,
                {
                  fontSize: 13,
                  color: isHighlighted ? '#C084FC' : '#A1A1AA',
                  fontWeight: isHighlighted ? '600' : '400',
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
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginLeft: spacing.sm,
                    shadowColor: '#A855F7',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                    elevation: 3,
                  },
                ]}
              >
                <Text style={[typography.label, { color: '#FFFFFF', fontSize: 10, fontWeight: '700' }]}>
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
    minHeight: 70,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
