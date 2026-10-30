import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { DirectMessage } from '@/types';
import { AppIcon } from './AppIcon';

export interface MessageBubbleProps {
  message: DirectMessage;
  animate?: boolean;
}

export function MessageBubble({ message, animate = false }: MessageBubbleProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const isOutgoing = message.isOutgoing;

  const [fadeAnim] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [slideAnim] = useState(() => new Animated.Value(animate ? 8 : 0));

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animate, fadeAnim, slideAnim]);

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
      <View
        style={[
          styles.bubble,
          {
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 3,
            maxWidth: '82%',
          },
          isOutgoing
            ? {
                backgroundColor: colors.bubbleOutgoingBg,
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

        <View style={styles.footer}>
          <Text
            style={[
              typography.label,
              {
                fontSize: 10,
                color: isOutgoing ? '#525252' : colors.bubbleIncomingTime,
                marginRight: isOutgoing ? 4 : 0,
              },
            ]}
          >
            {message.createdAt}
          </Text>

          {isOutgoing && (
            <AppIcon
              name={message.status === 'read' ? 'check-all' : 'check'}
              size={12}
              color="#525252"
            />
          )}
        </View>
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
    shadowColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
