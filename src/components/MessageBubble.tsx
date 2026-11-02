import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { DirectMessage } from '@/types';
import { AppIcon } from './AppIcon';

export interface MessageBubbleProps {
  message: DirectMessage;
  animate?: boolean;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  searchKeyword?: string;
}

export function MessageBubble({
  message,
  animate = false,
  onLongPress,
  onDoubleTap,
  searchKeyword,
}: MessageBubbleProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const isOutgoing = message.isOutgoing;
  const isDeleted = Boolean(message.isDeletedForEveryone);
  const useNativeDriver = Platform.OS !== 'web';
  const lastTapRef = useRef<number>(0);

  const [fadeAnim] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [slideAnim] = useState(() => new Animated.Value(animate ? 8 : 0));

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver,
        }),
      ]).start();
    }
  }, [animate, fadeAnim, slideAnim, useNativeDriver]);

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_WINDOW = 320;
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW) {
      lastTapRef.current = 0;
      onDoubleTap?.();
    } else {
      lastTapRef.current = now;
    }
  };

  const reactionCounts = useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return [];
    const map = new Map<string, number>();
    message.reactions.forEach((r) => {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    });
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }, [message.reactions]);

  const hasReactions = reactionCounts.length > 0 && !isDeleted;

  const renderContent = () => {
    if (!searchKeyword || !searchKeyword.trim() || isDeleted) {
      return message.content;
    }
    const keyword = searchKeyword.trim();
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = message.content.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return (
          <Text
            key={index}
            style={{
              backgroundColor: '#38BDF8',
              color: '#091017',
              fontWeight: '700',
              borderRadius: 3,
              paddingHorizontal: 2,
            }}
          >
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <Animated.View
      style={[
        styles.row,
        {
          justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
          marginBottom: hasReactions ? 18 : 6,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={{ maxWidth: '82%', position: 'relative' }}>
        <Pressable
          onPress={handlePress}
          onLongPress={onLongPress}
          delayLongPress={280}
          accessibilityRole="button"
          accessibilityHint="Double tap to react, long press or right-click to manage"
          {...(Platform.OS === 'web'
            ? ({
                onContextMenu: (e: any) => {
                  e?.preventDefault?.();
                  onLongPress?.();
                },
                onDoubleClick: () => {
                  onDoubleTap?.();
                },
              } as any)
            : {})}
          style={({ pressed }) => [
            styles.bubble,
            {
              paddingHorizontal: spacing.sm + 4,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xs + 3,
              opacity: pressed && (onLongPress || onDoubleTap) ? 0.8 : 1,
            },
            isOutgoing
              ? {
                  backgroundColor: isDeleted ? colors.surfaceSecondary : colors.bubbleOutgoingBg,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 3,
                }
              : {
                  backgroundColor: colors.bubbleIncomingBg,
                  borderColor: colors.bubbleIncomingBorder,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderBottomRightRadius: 16,
                  borderBottomLeftRadius: 3,
                },
          ]}
        >
          {isDeleted ? (
            <View style={styles.deletedContainer}>
              <AppIcon name="ban" size={13} color={colors.textMuted} />
              <Text
                style={[
                  typography.caption,
                  styles.deletedText,
                  { color: colors.textMuted },
                ]}
              >
                This message was deleted
              </Text>
            </View>
          ) : (
            <Text
              style={[
                typography.body,
                {
                  color: isOutgoing ? colors.bubbleOutgoingText : colors.bubbleIncomingText,
                  fontSize: 15,
                  lineHeight: 20,
                },
              ]}
            >
              {renderContent()}
            </Text>
          )}

          <View style={styles.footer}>
            <Text
              style={[
                typography.label,
                {
                  fontSize: 10,
                  color: isOutgoing ? colors.bubbleOutgoingTime : colors.bubbleIncomingTime,
                  marginRight: isOutgoing && !isDeleted ? 3 : 0,
                },
              ]}
            >
              {message.createdAt}
            </Text>

            {isOutgoing && !isDeleted ? (
              <AppIcon
                name={message.status === 'read' ? 'check-all' : 'check'}
                size={13}
                color={message.status === 'read' ? (colors.readReceipt || '#38BDF8') : colors.bubbleOutgoingTime}
              />
            ) : null}

            {onLongPress ? (
              <Pressable
                onPress={onLongPress}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.optionsTrigger,
                  { opacity: pressed ? 0.4 : 0.75, marginLeft: 4 },
                ]}
                accessibilityLabel="Message options"
              >
                <AppIcon name="more" size={11} color={isOutgoing ? colors.bubbleOutgoingTime : colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        {/* WhatsApp-Style Attached Emoji Reaction Badge */}
        {hasReactions ? (
          <Pressable
            onPress={onDoubleTap}
            style={[
              styles.reactionBadge,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.full,
              },
              isOutgoing ? styles.reactionBadgeRight : styles.reactionBadgeLeft,
            ]}
          >
            {reactionCounts.map(({ emoji, count }) => (
              <View key={emoji} style={styles.reactionItem}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 ? (
                  <Text style={[styles.reactionCountText, { color: colors.textSecondary }]}>
                    {count}
                  </Text>
                ) : null}
              </View>
            ))}
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  bubble: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  deletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  deletedText: {
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  optionsTrigger: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
  },
  reactionBadgeRight: {
    right: 8,
  },
  reactionBadgeLeft: {
    left: 8,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
