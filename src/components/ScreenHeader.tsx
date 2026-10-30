import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
        },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack && (
          <Pressable
            hitSlop={12}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.6 : 1, marginRight: spacing.sm },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="back" size={20} color={colors.text} />
          </Pressable>
        )}

        <View style={styles.titles}>
          <ThemedText variant="h3" numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText variant="label" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>

      {rightElement && <View style={styles.rightContainer}>{rightElement}</View>}
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
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
