import React, { useState } from 'react';
import { Pressable, View, StyleSheet, Text, Animated } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { AppAvatar } from './AppAvatar';
import { ThemedText } from './ThemedText';
import { DirectConversationPreview } from '@/types';

export interface ConversationItemProps {
  conversation: DirectConversationPreview;
  onPress: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.985,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: pressed ? colors.surfaceSecondary : colors.background,
            borderBottomColor: colors.border,
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
            <ThemedText variant="bodySemibold" numberOfLines={1} style={styles.name}>
              {conversation.participantName}
            </ThemedText>
            <ThemedText variant="label" tone="muted">
              {conversation.lastMessageTimestamp}
            </ThemedText>
          </View>

          <View style={styles.bottomRow}>
            <ThemedText
              variant="caption"
              tone={conversation.unreadCount > 0 ? 'primary' : 'secondary'}
              numberOfLines={1}
              style={[
                styles.snippet,
                conversation.unreadCount > 0 && { fontWeight: '500' },
              ]}
            >
              {conversation.lastMessageSnippet}
            </ThemedText>

            {conversation.unreadCount > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.badgeBg,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.xs + 3,
                    paddingVertical: 2,
                    marginLeft: spacing.sm,
                  },
                ]}
              >
                <Text style={[typography.label, { color: colors.badgeText, fontSize: 10 }]}>
                  {conversation.unreadCount}
                </Text>
              </View>
            )}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
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
