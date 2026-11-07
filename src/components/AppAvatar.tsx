import React from 'react';
import { View, Text, StyleSheet, Image, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { getInitials } from '@/utils';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AppAvatarProps {
  name: string;
  size?: AvatarSize;
  isOnline?: boolean;
  imageUrl?: string | null;
  style?: StyleProp<ViewStyle>;
}

const AVATAR_PALETTES = [
  { bg: '#0F172A', border: '#CBD5E1', text: '#FFFFFF' }, // Midnight Slate
  { bg: '#1E293B', border: '#94A3B8', text: '#F8FAFC' }, // Deep Navy
  { bg: '#1E3A8A', border: '#BFDBFE', text: '#DBEAFE' }, // Royal Ice Blue
  { bg: '#0B101B', border: '#64748B', text: '#FFFFFF' }, // Pitch Midnight
  { bg: '#334155', border: '#E2E8F0', text: '#F1F5F9' }, // Steel Slate
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
  imageUrl,
  style,
}: AppAvatarProps) {
  const { colors, typography } = useAppTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { dimension: 36, fontStyle: typography.captionMedium, dotSize: 9 };
      case 'lg':
        return { dimension: 58, fontStyle: typography.h2, dotSize: 13 };
      case 'xl':
        return { dimension: 76, fontStyle: typography.display, dotSize: 16 };
      case 'md':
      default:
        return { dimension: 48, fontStyle: typography.bodySemibold, dotSize: 11 };
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
          position: 'relative',
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
            borderColor: isOnline ? '#38BDF8' : avatarTheme.border,
            borderWidth: isOnline ? 2 : 1.5,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%', borderRadius: radius }}
            resizeMode="cover"
          />
        ) : (
          <Text style={[fontStyle, { color: avatarTheme.text, fontWeight: '700' }]}>
            {initials}
          </Text>
        )}
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
              borderColor: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineBadge: {
    position: 'absolute',
  },
});
