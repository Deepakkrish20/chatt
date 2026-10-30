import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { getInitials } from '@/utils';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AppAvatarProps {
  name: string;
  size?: AvatarSize;
  isOnline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppAvatar({
  name,
  size = 'md',
  isOnline,
  style,
}: AppAvatarProps) {
  const { colors, radius, typography } = useAppTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { dimension: 34, fontStyle: typography.captionMedium, dotSize: 8 };
      case 'lg':
        return { dimension: 58, fontStyle: typography.h2, dotSize: 12 };
      case 'xl':
        return { dimension: 76, fontStyle: typography.display, dotSize: 16 };
      case 'md':
      default:
        return { dimension: 46, fontStyle: typography.bodySemibold, dotSize: 10 };
    }
  };

  const { dimension, fontStyle, dotSize } = getDimensions();
  const initials = getInitials(name);

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[fontStyle, { color: colors.text }]}>{initials}</Text>
      </View>

      {isOnline && (
        <View
          style={[
            styles.onlineBadge,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.onlineIndicator,
              borderColor: colors.background,
              borderWidth: 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineBadge: {
    position: 'absolute',
  },
});
