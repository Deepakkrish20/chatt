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

const AVATAR_PALETTES = [
  { bg: '#2E1065', border: '#C084FC', text: '#F3E8FF' }, // Deep Aurora Amethyst
  { bg: '#1E1B4B', border: '#A855F7', text: '#EDE9FE' }, // Midnight Violet
  { bg: '#3B0764', border: '#E879F9', text: '#FAE8FF' }, // Cosmic Magenta
  { bg: '#1F1D36', border: '#8B5CF6', text: '#E9D5FF' }, // Obsidian Purple
  { bg: '#181826', border: '#7C3AED', text: '#DDD6FE' }, // Stealth Aurora
];

const getAvatarTheme = (str: string) => {
  let hash = 0;
  const clean = (str || 'User').trim();
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
};

export function AppAvatar({
  name,
  size = 'md',
  isOnline,
  style,
}: AppAvatarProps) {
  const { colors, typography } = useAppTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { dimension: 36, fontStyle: typography.captionMedium, dotSize: 8 };
      case 'lg':
        return { dimension: 58, fontStyle: typography.h2, dotSize: 12 };
      case 'xl':
        return { dimension: 76, fontStyle: typography.display, dotSize: 16 };
      case 'md':
      default:
        return { dimension: 48, fontStyle: typography.bodySemibold, dotSize: 10 };
    }
  };

  const { dimension, fontStyle, dotSize } = getDimensions();
  const initials = getInitials(name);
  const avatarTheme = getAvatarTheme(name);
  const radius = dimension / 2;

  return (
    <View
      style={[
        {
          width: dimension,
          height: dimension,
          shadowColor: isOnline ? '#A855F7' : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isOnline ? 0.7 : 0,
          shadowRadius: 8,
          elevation: isOnline ? 4 : 0,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            borderRadius: radius,
            backgroundColor: avatarTheme.bg,
            borderColor: isOnline ? '#C084FC' : avatarTheme.border,
            borderWidth: isOnline ? 2 : 1.5,
          },
        ]}
      >
        <Text style={[fontStyle, { color: avatarTheme.text, fontWeight: '700' }]}>
          {initials}
        </Text>
      </View>

      {isOnline ? (
        <View
          style={[
            styles.onlineBadge,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.onlineIndicator,
              borderColor: '#07070A',
              borderWidth: 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      ) : null}
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
