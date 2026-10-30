import React from 'react';
import { Pressable, View, StyleSheet, Text } from 'react-native';
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

  return (
    <Pressable
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
      accessibilityLabel={`Conversation with ${conversation.participantName}`}
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
            style={styles.snippet}
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
                  paddingHorizontal: spacing.xs + 2,
                  paddingVertical: 1,
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    minWidth: 18,
  },
});
