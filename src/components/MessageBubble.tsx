import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { DirectMessage } from '@/types';
import { AppIcon } from './AppIcon';

export interface MessageBubbleProps {
  message: DirectMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const isOutgoing = message.isOutgoing;

  return (
    <View
      style={[
        styles.row,
        {
          justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
          marginBottom: spacing.sm + 2,
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
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
    </View>
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
