import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedText,
  ScreenHeader,
  AppAvatar,
  AppCard,
  AppButton,
  AppTextInput,
  AuroraBackground,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_USER } from '@/data/mockData';

export default function SettingsScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { user, profile, isAdmin, adminCreateMember, signOut, isConfigured } = useAuth();

  // Appearance & Privacy settings UI state
  const [highContrastBorders, setHighContrastBorders] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [offlineNotifications, setOfflineNotifications] = useState(false);
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);

  // Admin member creation state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUser, setNewMemberUser] = useState('');
  const [newMemberPass, setNewMemberPass] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<{ text: string; error: boolean } | null>(null);

  const displayName = profile?.display_name || user?.user_metadata?.displayName || ADMIN_USER.displayName;
  const username = profile?.username || user?.user_metadata?.username || ADMIN_USER.username;
  const email = user?.email || ADMIN_USER.email;

  const handleCreateMember = async () => {
    setProvisionMsg(null);
    if (!newMemberName.trim() || !newMemberUser.trim() || !newMemberPass.trim()) {
      setProvisionMsg({ text: 'All fields are required to create a member.', error: true });
      return;
    }
    setIsProvisioning(true);
    const res = await adminCreateMember(newMemberUser, newMemberName, newMemberPass);
    setIsProvisioning(false);
    if (res.success) {
      setProvisionMsg({
        text: `Member @${newMemberUser.toLowerCase().trim()} created! They can now sign in with their Member ID and password.`,
        error: false,
      });
      setNewMemberName('');
      setNewMemberUser('');
      setNewMemberPass('');
    } else {
      setProvisionMsg({ text: res.error || 'Failed to create member.', error: true });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <AuroraBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Profile & Settings"
          subtitle="Closed-Circle Configuration"
          showBack
          style={{ backgroundColor: 'transparent', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }}
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
                name={displayName}
                size="lg"
                isOnline={true}
                style={{ marginRight: spacing.md }}
              />

              <View style={styles.profileInfo}>
                <ThemedText variant="h2">{displayName}</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  @{username}
                </ThemedText>
                <ThemedText variant="caption" tone="muted" style={{ marginTop: 1, fontSize: 11 }}>
                  {email}
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
                    {isConfigured ? 'AUTHENTICATED MEMBER • VERIFIED' : 'DEMO MEMBER • LOCAL ACTIVE'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </AppCard>

          {/* Network Information Card */}
          <AppCard elevated>
            <View style={styles.networkHeaderRow}>
              <ThemedText variant="label" tone="muted">
                NETWORK STATUS
              </ThemedText>
              <ThemedText variant="label" tone="muted">
                {isConfigured ? 'CONNECTED' : 'OFFLINE'}
              </ThemedText>
            </View>

            <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
              End-to-end private direct messaging. Communication is strictly restricted to participants of each 1:1 conversation.
            </ThemedText>
          </AppCard>

          {/* Admin Member Provisioning Section */}
          {Boolean(isAdmin) ? (
            <View style={styles.section}>
              <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
                ADMIN CONTROLS: PROVISION NEW MEMBER
              </ThemedText>

              <AppCard style={{ gap: spacing.sm + 2 }}>
                <ThemedText variant="bodySemibold">
                  Create Member Account
                </ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: -4 }}>
                  Provision credentials directly. Members log in instantly without email confirmation.
                </ThemedText>

                {Boolean(provisionMsg) ? (
                  <View
                    style={[
                      styles.msgBanner,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radius.sm,
                        padding: spacing.sm,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      tone={provisionMsg!.error ? 'primary' : 'secondary'}
                      style={{ textAlign: 'center' }}
                    >
                      {provisionMsg!.text}
                    </ThemedText>
                  </View>
                ) : null}

                <AppTextInput
                  label="Display Name"
                  placeholder="e.g. Jana Thiru"
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  containerStyle={{ marginBottom: 0 }}
                />

                <AppTextInput
                  label="Username / Member ID"
                  placeholder="e.g. jana"
                  value={newMemberUser}
                  onChangeText={setNewMemberUser}
                  autoCapitalize="none"
                  containerStyle={{ marginBottom: 0 }}
                />

                <AppTextInput
                  label="Temporary Password"
                  placeholder="e.g. Jana@12345"
                  value={newMemberPass}
                  onChangeText={setNewMemberPass}
                  isPassword
                  containerStyle={{ marginBottom: 0 }}
                />

                <AppButton
                  title={isProvisioning ? 'Creating Member…' : 'Create Member Account'}
                  variant="primary"
                  loading={isProvisioning}
                  disabled={isProvisioning}
                  onPress={handleCreateMember}
                  style={{ marginTop: spacing.xs }}
                />
              </AppCard>
            </View>
          ) : null}

          {/* Appearance Settings Section */}
          <View style={styles.section}>
            <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
              APPEARANCE (AURORA ECLIPSE)
            </ThemedText>

            <AppCard style={{ gap: spacing.md }}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">Aurora Eclipse Theme</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Obsidian dark with fluid purple aurora accents
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      borderColor: 'rgba(168, 85, 247, 0.5)',
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: spacing.xs,
                    },
                  ]}
                >
                  <ThemedText variant="label" style={{ color: '#C084FC', fontWeight: '600' }}>
                    ACTIVE
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">Fluid Aurora Ribbon</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Breathing animated ambient lighting
                  </ThemedText>
                </View>
                <Switch
                  value={highContrastBorders}
                  onValueChange={setHighContrastBorders}
                  trackColor={{ false: '#181822', true: '#9333EA' }}
                  thumbColor="#FFFFFF"
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
                  trackColor={{ false: '#181822', true: '#9333EA' }}
                  thumbColor="#FFFFFF"
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
                  trackColor={{ false: '#181822', true: '#9333EA' }}
                  thumbColor="#FFFFFF"
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
                  You will return to the Welcome screen.
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
    </AuroraBackground>
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
  msgBanner: {
    borderWidth: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
