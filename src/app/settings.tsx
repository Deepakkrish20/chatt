import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  ScreenHeader,
  AppAvatar,
  AppCard,
  AppButton,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { CURRENT_USER, MOCK_NETWORK_STATUS } from '@/data/mockData';

export default function SettingsScreen() {
  const { colors, spacing, radius } = useAppTheme();

  // Appearance & Privacy settings UI state
  const [highContrastBorders, setHighContrastBorders] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [offlineNotifications, setOfflineNotifications] = useState(false);

  const handleSignOut = () => {
    // Navigate back to Welcome/Sign-in
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Profile & Settings"
          subtitle="Closed-Circle Configuration"
          showBack
          onBack={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <AppCard style={styles.profileCard}>
            <View style={styles.profileRow}>
              <AppAvatar
                name={CURRENT_USER.displayName}
                size="lg"
                isOnline={CURRENT_USER.isOnline}
                style={{ marginRight: spacing.md }}
              />

              <View style={styles.profileInfo}>
                <ThemedText variant="h2">{CURRENT_USER.displayName}</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  @{CURRENT_USER.username}
                </ThemedText>
                <ThemedText variant="label" tone="muted" style={{ marginTop: 6 }}>
                  MEMBER 1 OF {MOCK_NETWORK_STATUS.maxMembers} • ACTIVE
                </ThemedText>
              </View>
            </View>
          </AppCard>

          {/* Network Constraint Information Card */}
          <AppCard elevated>
            <ThemedText variant="label" tone="muted">
              MEMBER CAPACITY SPECIFICATION
            </ThemedText>
            <View style={[styles.networkStatusRow, { marginTop: spacing.sm }]}>
              <ThemedText variant="bodySemibold">
                {MOCK_NETWORK_STATUS.activeMembers} / {MOCK_NETWORK_STATUS.maxMembers} Accounts Claimed
              </ThemedText>
              <ThemedText variant="label" tone="muted">
                {MOCK_NETWORK_STATUS.slotsRemaining} SLOTS REMAINING
              </ThemedText>
            </View>
            <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
              This private instance enforces a maximum limit of 10 registered accounts.
              Only direct 1:1 messaging is permitted; group chats are disabled.
            </ThemedText>
          </AppCard>

          {/* Appearance Settings Section */}
          <View style={styles.section}>
            <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
              APPEARANCE (RAW BLACK)
            </ThemedText>

            <AppCard style={{ gap: spacing.md }}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">Theme System</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Monochrome OLED True Black (#000000)
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: spacing.xs,
                    },
                  ]}
                >
                  <ThemedText variant="label" tone="primary">
                    ACTIVE
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">High-Contrast Borders</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Defined #262626 geometric separation
                  </ThemedText>
                </View>
                <Switch
                  value={highContrastBorders}
                  onValueChange={setHighContrastBorders}
                  trackColor={{ false: colors.surfaceSecondary, true: colors.text }}
                  thumbColor={highContrastBorders ? colors.background : colors.textMuted}
                />
              </View>
            </AppCard>
          </View>

          {/* Privacy & Communication Settings */}
          <View style={styles.section}>
            <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
              PRIVACY & SECURITY
            </ThemedText>

            <AppCard style={{ gap: spacing.md }}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">Read Receipts</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Notify peer when messages are viewed
                  </ThemedText>
                </View>
                <Switch
                  value={readReceipts}
                  onValueChange={setReadReceipts}
                  trackColor={{ false: colors.surfaceSecondary, true: colors.text }}
                  thumbColor={readReceipts ? colors.background : colors.textMuted}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">Push Notifications</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Local device wake triggers only
                  </ThemedText>
                </View>
                <Switch
                  value={offlineNotifications}
                  onValueChange={setOfflineNotifications}
                  trackColor={{ false: colors.surfaceSecondary, true: colors.text }}
                  thumbColor={offlineNotifications ? colors.background : colors.textMuted}
                />
              </View>
            </AppCard>
          </View>

          {/* Sign Out Button */}
          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              title="Sign Out (Return to Welcome)"
              variant="secondary"
              onPress={handleSignOut}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    width: '100%',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  networkStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    width: '100%',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  badgePill: {
    borderWidth: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
