import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Switch, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedText,
  ScreenHeader,
  AppAvatar,
  AppCard,
  AppButton,
  AppTextInput,
  AppIcon,
  AuroraBackground,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useSecurity } from '@/context/SecurityContext';
import { clearAllStoredRequests } from '@/lib/supabase/requests';
import { ADMIN_USER } from '@/data/mockData';
import { DECOY_USER } from '@/data/decoyData';

export default function SettingsScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { user, profile, isAdmin, adminCreateMember, signOut, isConfigured } = useAuth();
  const {
    isChameleonConfigured,
    chameleonMode,
    configureChameleon,
    disableChameleonProtection,
    lockApp,
    isPrivacyLensEnabled,
    setPrivacyLens,
  } = useSecurity();

  const isDecoy = chameleonMode === 'decoy';

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

  // Chameleon Duress PIN state
  const [isChameleonModalOpen, setIsChameleonModalOpen] = useState(false);
  const [inputRealPin, setInputRealPin] = useState('');
  const [inputDecoyPin, setInputDecoyPin] = useState('');
  const [chameleonError, setChameleonError] = useState('');
  const [isSavingChameleon, setIsSavingChameleon] = useState(false);
  const [chameleonNotice, setChameleonNotice] = useState('');

  // Reset connections state
  const [isResettingConn, setIsResettingConn] = useState(false);
  const [resetConnMsg, setResetConnMsg] = useState('');

  const displayName = isDecoy
    ? DECOY_USER.displayName
    : profile?.display_name || user?.user_metadata?.displayName || ADMIN_USER.displayName;
  const username = isDecoy
    ? DECOY_USER.username
    : profile?.username || user?.user_metadata?.username || ADMIN_USER.username;
  const email = isDecoy ? DECOY_USER.email : user?.email || ADMIN_USER.email;

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

  const handleSaveChameleon = async () => {
    setChameleonError('');
    if (!inputRealPin || !inputDecoyPin) {
      setChameleonError('Both Real PIN and Decoy PIN are required.');
      return;
    }
    setIsSavingChameleon(true);
    const res = await configureChameleon(inputRealPin, inputDecoyPin);
    setIsSavingChameleon(false);
    if (!res.success) {
      setChameleonError(res.error || 'Failed to save Chameleon PINs.');
    } else {
      setIsChameleonModalOpen(false);
      setInputRealPin('');
      setInputDecoyPin('');
      setChameleonNotice('Chameleon Duress Vault successfully configured & armed!');
      setTimeout(() => setChameleonNotice(''), 4000);
    }
  };

  const handleDisableChameleon = async () => {
    await disableChameleonProtection();
    setChameleonNotice('Chameleon Vault disabled.');
    setTimeout(() => setChameleonNotice(''), 3000);
  };

  const handleResetConnections = async () => {
    setIsResettingConn(true);
    setResetConnMsg('');
    try {
      await clearAllStoredRequests(user?.id);
      setResetConnMsg('Chat requests cache cleared! Members can now connect from scratch.');
      setTimeout(() => setResetConnMsg(''), 4000);
    } catch {
      setResetConnMsg('Failed to reset requests cache.');
    } finally {
      setIsResettingConn(false);
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
          title={isDecoy ? 'Account Settings' : 'Profile & Settings'}
          subtitle={isDecoy ? 'Preferences' : 'Closed-Circle Configuration'}
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
                    {isDecoy
                      ? 'PERSONAL PROFILE • ACTIVE'
                      : isConfigured
                      ? 'AUTHENTICATED MEMBER • VERIFIED'
                      : 'DEMO MEMBER • LOCAL ACTIVE'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </AppCard>

          {/* Chameleon Duress Section (Hidden in Decoy Mode) */}
          {!isDecoy ? (
            <View style={styles.section}>
              <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
                CHAMELEON DURESS PIN (DECOY VAULT)
              </ThemedText>

              <AppCard style={{ gap: spacing.sm + 2 }}>
                <View style={styles.settingRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText variant="bodySemibold">Chameleon Duress Vault</ThemedText>
                    <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                      Set a Real PIN to open your 10-member circle, and a Decoy PIN to open a harmless fake messenger if forced to unlock.
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: isChameleonConfigured
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isChameleonConfigured
                          ? 'rgba(34, 197, 94, 0.4)'
                          : colors.border,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 3,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="label"
                      style={{
                        color: isChameleonConfigured ? '#4ADE80' : colors.textMuted,
                        fontSize: 10,
                      }}
                    >
                      {isChameleonConfigured ? 'ARMED' : 'DISABLED'}
                    </ThemedText>
                  </View>
                </View>

                {Boolean(chameleonNotice) ? (
                  <View
                    style={[
                      styles.msgBanner,
                      {
                        backgroundColor: 'rgba(168, 85, 247, 0.15)',
                        borderColor: 'rgba(168, 85, 247, 0.4)',
                        borderRadius: radius.sm,
                        padding: spacing.sm,
                      },
                    ]}
                  >
                    <ThemedText variant="caption" style={{ color: '#E9D5FF', textAlign: 'center' }}>
                      {chameleonNotice}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {isChameleonConfigured ? (
                    <>
                      <AppButton
                        title="Lock Vault Now"
                        variant="primary"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => lockApp()}
                      />
                      <AppButton
                        title="Change"
                        variant="outline"
                        size="sm"
                        onPress={() => setIsChameleonModalOpen(true)}
                      />
                      <AppButton
                        title="Disable"
                        variant="ghost"
                        size="sm"
                        onPress={handleDisableChameleon}
                      />
                    </>
                  ) : (
                    <AppButton
                      title="Setup Chameleon PINs"
                      variant="primary"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => setIsChameleonModalOpen(true)}
                    />
                  )}
                </View>
              </AppCard>
            </View>
          ) : null}

          {/* Admin Member Provisioning Section (Hidden in Decoy Mode) */}
          {!isDecoy && Boolean(isAdmin) ? (
            <View style={styles.section}>
              <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
                ADMIN CONTROLS: PROVISION NEW MEMBER
              </ThemedText>

              <AppCard style={{ gap: spacing.sm + 2 }}>
                <ThemedText variant="bodySemibold">Create Member Account</ThemedText>
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
                  <ThemedText variant="bodyMedium">Privacy Lens (Anti-Shoulder Surfing)</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Frosted veil over messages. Hold finger on bubble to reveal text.
                  </ThemedText>
                </View>
                <Switch
                  value={isPrivacyLensEnabled}
                  onValueChange={setPrivacyLens}
                  trackColor={{ false: '#181822', true: '#9333EA' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText variant="bodyMedium">Earpiece-Only Whispers</ThemedText>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: 'rgba(168, 85, 247, 0.15)',
                          borderColor: 'rgba(168, 85, 247, 0.4)',
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: '#C084FC', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>
                        ZERO LOUDSPEAKER
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="caption" tone="secondary">
                    Voice notes physically refuse open loudspeaker. Audio routes exclusively to in-ear proximity or private headphones.
                  </ThemedText>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(168, 85, 247, 0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="headphones" size={18} color="#C084FC" />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

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

              {!isDecoy ? (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <ThemedText variant="bodyMedium">Reset Chat Requests</ThemedText>
                      <ThemedText variant="caption" tone="secondary">
                        Clear local request cache to re-connect members from first
                      </ThemedText>
                    </View>
                    <AppButton
                      title="Reset"
                      variant="outline"
                      size="sm"
                      loading={isResettingConn}
                      onPress={handleResetConnections}
                    />
                  </View>

                  {Boolean(resetConnMsg) ? (
                    <ThemedText
                      variant="caption"
                      style={{ color: '#4ADE80', textAlign: 'center', marginTop: 4 }}
                    >
                      {resetConnMsg}
                    </ThemedText>
                  ) : null}
                </>
              ) : null}
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
                title={isDecoy ? 'Lock App' : 'Sign Out'}
                variant="outline"
                onPress={() => {
                  if (isDecoy) {
                    lockApp();
                  } else {
                    setShowSignOutPrompt(true);
                  }
                }}
              />
            )}
          </View>
        </ScrollView>

        {/* Chameleon PIN Setup Modal */}
        <Modal
          visible={isChameleonModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsChameleonModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: '#181822',
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <ThemedText variant="h3">Chameleon Duress Vault</ThemedText>
                  <ThemedText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    Setup Real PIN & Decoy PIN
                  </ThemedText>
                </View>
                <Pressable
                  hitSlop={12}
                  onPress={() => setIsChameleonModalOpen(false)}
                  style={({ pressed }) => [
                    styles.modalCloseBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <AppIcon name="close" size={16} color={colors.text} />
                </Pressable>
              </View>

              {Boolean(chameleonError) ? (
                <View
                  style={[
                    styles.msgBanner,
                    {
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      borderRadius: radius.sm,
                      padding: spacing.sm,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <ThemedText variant="caption" style={{ color: '#FCA5A5', textAlign: 'center' }}>
                    {chameleonError}
                  </ThemedText>
                </View>
              ) : null}

              <ThemedText variant="caption" tone="secondary" style={{ marginBottom: spacing.md }}>
                • <ThemedText variant="captionMedium" style={{ color: '#A855F7' }}>Real PIN</ThemedText>: Opens your authentic 10-member confidential circle.{'\n'}
                • <ThemedText variant="captionMedium" style={{ color: '#38BDF8' }}>Decoy PIN</ThemedText>: Opens harmless fake chats if forced to unlock.
              </ThemedText>

              <AppTextInput
                label="Real Access PIN (4 digits)"
                placeholder="e.g. 1234"
                value={inputRealPin}
                onChangeText={(t) => setInputRealPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="numeric"
                isPassword
                containerStyle={{ marginBottom: spacing.sm }}
              />

              <AppTextInput
                label="Decoy PIN (4 digits - MUST be different)"
                placeholder="e.g. 9999"
                value={inputDecoyPin}
                onChangeText={(t) => setInputDecoyPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="numeric"
                isPassword
                containerStyle={{ marginBottom: spacing.lg }}
              />

              <AppButton
                title={isSavingChameleon ? 'Arming Vault…' : 'Arm Chameleon Vault'}
                variant="primary"
                loading={isSavingChameleon}
                onPress={handleSaveChameleon}
              />
            </View>
          </View>
        </Modal>
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
    flexGrow: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
