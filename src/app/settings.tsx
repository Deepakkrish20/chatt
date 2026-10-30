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
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);

  const handleSignOut = () => {
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
            { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md },
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
                <View
                  style={[
                    styles.memberPill,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.full,
                      marginTop: 8,
                    },
                  ]}
                >
                  <ThemedText variant="label" tone="primary" style={{ fontSize: 10 }}>
                    MEMBER 1 OF {MOCK_NETWORK_STATUS.maxMembers} • VERIFIED
                  </ThemedText>
                </View>
              </View>
            </View>
          </AppCard>

          {/* Network Constraint Information Card */}
          <AppCard elevated>
            <View style={styles.networkHeaderRow}>
              <ThemedText variant="label" tone="muted">
                NETWORK CAPACITY
              </ThemedText>
              <ThemedText variant="label" tone="muted">
                {MOCK_NETWORK_STATUS.slotsRemaining} SLOTS FREE
              </ThemedText>
            </View>

            <View style={[styles.networkStatusRow, { marginTop: spacing.xs + 2 }]}>
              <ThemedText variant="bodySemibold">
                {MOCK_NETWORK_STATUS.activeMembers} of {MOCK_NETWORK_STATUS.maxMembers} Accounts Claimed
              </ThemedText>

              <View style={styles.slotDots}>
                {Array.from({ length: MOCK_NETWORK_STATUS.maxMembers }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.slotDot,
                      {
                        backgroundColor: i < MOCK_NETWORK_STATUS.activeMembers ? colors.text : 'transparent',
                        borderColor: colors.textMuted,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
              This private instance enforces a strict ceiling of {MOCK_NETWORK_STATUS.maxMembers} registered accounts.
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
                  <ThemedText variant="bodyMedium">Monochrome Theme</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    OLED True Black (#000000)
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

          {/* Sign Out Card / Action */}
          <View style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
            {showSignOutPrompt ? (
              <AppCard style={{ gap: spacing.md, borderColor: colors.textMuted }}>
                <ThemedText variant="bodyMedium" style={{ textAlign: 'center' }}>
                  Confirm Sign Out?
                </ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                  You will return to the Welcome screen. Local session data remains encrypted.
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Cancel"
                      variant="outline"
                      onPress={() => setShowSignOutPrompt(false)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Sign Out"
                      variant="primary"
                      onPress={handleSignOut}
                    />
                  </View>
                </View>
              </AppCard>
            ) : (
              <AppButton
                title="Sign Out (Return to Welcome)"
                variant="secondary"
                onPress={() => setShowSignOutPrompt(true)}
              />
            )}
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
  memberPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  networkHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotDots: {
    flexDirection: 'row',
    gap: 4,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
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
