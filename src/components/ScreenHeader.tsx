import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Platform, type ViewStyle, type StyleProp } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/hooks/use-theme';
import { ThemedText } from './ThemedText';
import { AppIcon } from './AppIcon';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  style,
}: ScreenHeaderProps) {
  const { colors, spacing } = useAppTheme();
  const [backScale] = useState(() => new Animated.Value(1));
  const useNativeDriver = Platform.OS !== 'web';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const handlePressIn = () => {
    Animated.timing(backScale, {
      toValue: 0.88,
      duration: 80,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(backScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver,
    }).start();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
        },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack ? (
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <Pressable
              hitSlop={12}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AppIcon name="back" size={20} color={colors.text} />
            </Pressable>
          </Animated.View>
        ) : null}

        <View style={styles.titles}>
          <ThemedText variant="h3" numberOfLines={1}>
            {title}
          </ThemedText>
          {Boolean(subtitle) ? (
            <ThemedText variant="label" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {Boolean(rightElement) ? <View style={styles.rightContainer}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    minHeight: 56,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginLeft: -4,
  },
  titles: {
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
});
