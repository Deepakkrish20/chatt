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
  { bg: '#172554', border: '#3B82F6', text: '#DBEAFE' }, // Deep Sapphire Cobalt
  { bg: '#1E1B4B', border: '#818CF8', text: '#EDE9FE' }, // Midnight Indigo
  { bg: '#2E1065', border: '#C084FC', text: '#F3E8FF' }, // Deep Amethyst
  { bg: '#0F2838', border: '#06B6D4', text: '#CFFAFE' }, // Cyber Cyan
  { bg: '#1E293B', border: '#64748B', text: '#F8FAFC' }, // Stealth Titanium
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
  const avatarTheme = getAvatarTheme(name);
  const squircleRadius = Math.round(dimension * 0.28);

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            borderRadius: squircleRadius,
            backgroundColor: avatarTheme.bg,
            borderColor: avatarTheme.border,
            borderWidth: 1,
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
              borderColor: colors.background,
              borderWidth: 2,
              bottom: -1,
              right: -1,
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
