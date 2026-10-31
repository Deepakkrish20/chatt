import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { DirectMessage } from '@/types';
import { AppIcon } from './AppIcon';

export interface MessageBubbleProps {
  message: DirectMessage;
  animate?: boolean;
  onLongPress?: () => void;
}

export function MessageBubble({ message, animate = false, onLongPress }: MessageBubbleProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const isOutgoing = message.isOutgoing;
  const isDeleted = Boolean(message.isDeletedForEveryone);
  const useNativeDriver = Platform.OS !== 'web';

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

  return (
    <Animated.View
      style={[
        styles.row,
        {
          justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
          marginBottom: spacing.sm + 2,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={280}
        accessibilityRole="button"
        accessibilityHint="Long press or right-click to delete or manage message"
        {...(Platform.OS === 'web'
          ? ({
              onContextMenu: (e: any) => {
                e?.preventDefault?.();
                onLongPress?.();
              },
            } as any)
          : {})}
        style={({ pressed }) => [
          styles.bubble,
          {
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 3,
            maxWidth: '82%',
            opacity: pressed && onLongPress ? 0.75 : 1,
          },
          isOutgoing
            ? {
                backgroundColor: isDeleted ? colors.surfaceSecondary : colors.bubbleOutgoingBg,
                borderBottomRightRadius: radius.xs,
              }
            : {
                backgroundColor: colors.bubbleIncomingBg,
                borderColor: colors.bubbleIncomingBorder,
                borderWidth: 1,
                borderBottomLeftRadius: radius.xs,
              },
        ]}
      >
        {isDeleted ? (
          <View style={styles.deletedContainer}>
            <AppIcon name="ban" size={13} color="#737373" />
            <Text
              style={[
                typography.caption,
                styles.deletedText,
                { color: '#737373' },
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
                lineHeight: 21,
              },
            ]}
          >
            {message.content}
          </Text>
        )}

        <View style={styles.footer}>
          <Text
            style={[
              typography.label,
              {
                fontSize: 10,
                color: isOutgoing ? '#525252' : colors.bubbleIncomingTime,
                marginRight: isOutgoing && !isDeleted ? 4 : 0,
              },
            ]}
          >
            {message.createdAt}
          </Text>

          {isOutgoing && !isDeleted ? (
            <AppIcon
              name={message.status === 'read' ? 'check-all' : 'check'}
              size={12}
              color="#525252"
            />
          ) : null}

          {onLongPress ? (
            <Pressable
              onPress={onLongPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.optionsTrigger,
                { opacity: pressed ? 0.4 : 0.65, marginLeft: 6 },
              ]}
              accessibilityLabel="Message options"
            >
              <AppIcon name="more" size={11} color={isOutgoing ? '#525252' : colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  bubble: {
    shadowColor: 'transparent',
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
    marginTop: 4,
  },
  optionsTrigger: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
});
