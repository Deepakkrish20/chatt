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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginHorizontal: spacing.md, marginVertical: 4 }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: pressed ? colors.surfaceSecondary : colors.surfaceElevated,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 4,
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
              tone={hasUnread ? 'primary' : 'secondary'}
              numberOfLines={1}
              style={[
                styles.snippet,
                hasUnread ? { fontWeight: '600' } : null,
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
                    borderRadius: 8,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    marginLeft: spacing.sm,
                  },
                ]}
              >
                <Text style={[typography.label, { color: colors.badgeText, fontSize: 10, fontWeight: '700' }]}>
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
