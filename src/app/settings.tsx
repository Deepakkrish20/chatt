import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Switch, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  ThemedText,
  AppAvatar,
  AppCard,
  AppButton,
  AppTextInput,
  AppIcon,
  CurvedWaveHeader,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useSecurity } from '@/context/SecurityContext';
import { DECOY_USER } from '@/data/decoyData';

export default function SettingsScreen() {
  const { colors, spacing, radius, isDark, setThemeMode } = useAppTheme();
  const { user, profile, signOut } = useAuth();
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

  // Chameleon Duress PIN state
  const [isChameleonModalOpen, setIsChameleonModalOpen] = useState(false);
  const [inputRealPin, setInputRealPin] = useState('');
  const [inputDecoyPin, setInputDecoyPin] = useState('');
  const [chameleonError, setChameleonError] = useState('');
  const [isSavingChameleon, setIsSavingChameleon] = useState(false);
  const [chameleonNotice, setChameleonNotice] = useState('');

  const displayName = isDecoy
    ? DECOY_USER.displayName
    : profile?.display_name || user?.user_metadata?.displayName || 'Chatt User';
  const username = isDecoy
    ? DECOY_USER.username
    : profile?.username || user?.user_metadata?.username || 'user';

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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Curved Midnight Wave Top Header with Scenic Split (Matching Screen 4) */}
      <CurvedWaveHeader variant="profile" waveHeight={48}>
        <View style={styles.profileHeaderInner}>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="back" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable
            hitSlop={12}
            onPress={() => setShowSignOutPrompt(true)}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <AppIcon name="more" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </CurvedWaveHeader>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.md, paddingBottom: 40, gap: spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Avatar Cutout & Hero Section (Screen 4) */}
        <View style={styles.heroProfileSection}>
          <View style={styles.largeAvatarWrapper}>
            <AppAvatar
              name={displayName}
              size="xl"
              isOnline={true}
              style={styles.avatarCutoutShadow}
            />
          </View>

          <ThemedText variant="h1" style={styles.profileNameText}>
            {displayName}
          </ThemedText>
          <ThemedText variant="body" style={styles.profileHandleText}>
            @{username}
          </ThemedText>

          {/* 4-Button Quick Action Row (Screen 4: Chat, Call, Video, Bell) */}
          <View style={styles.quickActionRow}>
            <Pressable
              onPress={() => router.push('/chats')}
              style={({ pressed }) => [
                styles.quickActionBtn,
                {
                  backgroundColor: isDark ? '#151922' : '#F1F5F9',
                  borderColor: isDark ? '#242B3A' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go to chats"
            >
              <AppIcon name="chat-bubble" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </Pressable>

            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.quickActionBtn,
                {
                  backgroundColor: isDark ? '#151922' : '#F1F5F9',
                  borderColor: isDark ? '#242B3A' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Audio Call"
            >
              <AppIcon name="phone" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </Pressable>

            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.quickActionBtn,
                {
                  backgroundColor: isDark ? '#151922' : '#F1F5F9',
                  borderColor: isDark ? '#242B3A' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Video Call"
            >
              <AppIcon name="video" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </Pressable>

            <Pressable
              onPress={() => setOfflineNotifications((prev) => !prev)}
              style={({ pressed }) => [
                styles.quickActionBtn,
                {
                  backgroundColor: offlineNotifications
                    ? (isDark ? '#2563EB' : '#DBEAFE')
                    : (isDark ? '#151922' : '#F1F5F9'),
                  borderColor: isDark ? '#242B3A' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle notifications"
            >
              <AppIcon
                name="bell"
                size={20}
                color={offlineNotifications ? (isDark ? '#FFFFFF' : '#1E40AF') : (isDark ? '#FFFFFF' : '#0F172A')}
              />
            </Pressable>
          </View>
        </View>

        {/* Profile Info Cards (Screen 4: About, Media, Shared Links, Notes) */}
        <View
          style={[
            styles.infoCardsSection,
            {
              backgroundColor: isDark ? '#151922' : '#FFFFFF',
              borderColor: isDark ? '#242B3A' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.infoCardRow}>
            <View style={styles.infoCardLeft}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC' },
                ]}
              >
                <ThemedText style={{ fontSize: 16 }}>ℹ️</ThemedText>
              </View>
              <View>
                <ThemedText variant="bodySemibold" style={[styles.infoCardTitle, { color: colors.text }]}>
                  About
                </ThemedText>
                <ThemedText variant="caption" style={[styles.infoCardSubtitle, { color: colors.textMuted }]}>
                  Mechanical Engineer • Builder • Learner
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.chevronArrow, { color: colors.textMuted }]}>›</ThemedText>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: isDark ? '#242B3A' : '#F1F5F9' }]} />

          <View style={styles.infoCardRow}>
            <View style={styles.infoCardLeft}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC' },
                ]}
              >
                <ThemedText style={{ fontSize: 16 }}>🖼️</ThemedText>
              </View>
              <ThemedText variant="bodySemibold" style={[styles.infoCardTitle, { color: colors.text }]}>
                Media
              </ThemedText>
            </View>
            <View style={styles.infoCardRightCount}>
              <ThemedText variant="caption" style={[styles.infoCountText, { color: colors.textMuted }]}>
                24 files
              </ThemedText>
              <ThemedText style={[styles.chevronArrow, { color: colors.textMuted }]}>›</ThemedText>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: isDark ? '#242B3A' : '#F1F5F9' }]} />

          <View style={styles.infoCardRow}>
            <View style={styles.infoCardLeft}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC' },
                ]}
              >
                <ThemedText style={{ fontSize: 16 }}>🔗</ThemedText>
              </View>
              <ThemedText variant="bodySemibold" style={[styles.infoCardTitle, { color: colors.text }]}>
                Shared Links
              </ThemedText>
            </View>
            <View style={styles.infoCardRightCount}>
              <ThemedText variant="caption" style={[styles.infoCountText, { color: colors.textMuted }]}>
                8 links
              </ThemedText>
              <ThemedText style={[styles.chevronArrow, { color: colors.textMuted }]}>›</ThemedText>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: isDark ? '#242B3A' : '#F1F5F9' }]} />

          <View style={styles.infoCardRow}>
            <View style={styles.infoCardLeft}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC' },
                ]}
              >
                <ThemedText style={{ fontSize: 16 }}>📝</ThemedText>
              </View>
              <ThemedText variant="bodySemibold" style={[styles.infoCardTitle, { color: colors.text }]}>
                Notes
              </ThemedText>
            </View>
            <View style={styles.infoCardRightCount}>
              <ThemedText variant="caption" style={[styles.infoCountText, { color: colors.textMuted }]}>
                3 notes
              </ThemedText>
              <ThemedText style={[styles.chevronArrow, { color: colors.textMuted }]}>›</ThemedText>
            </View>
          </View>
        </View>

        {/* Member Status Pill */}
        <View
          style={[
            styles.memberPill,
            {
              backgroundColor: isDark ? '#151922' : '#FFFFFF',
              borderColor: isDark ? '#242B3A' : '#E2E8F0',
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 5,
              alignSelf: 'center',
            },
          ]}
        >
          <ThemedText variant="label" tone="primary" style={{ fontSize: 10, color: colors.textMuted }}>
            {isDecoy
              ? 'PERSONAL PROFILE • ACTIVE'
              : 'VERIFIED ACCOUNT • END-TO-END ENCRYPTED'}
          </ThemedText>
        </View>

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
                      Set a Real PIN to open your private conversations, and a Decoy PIN to open a harmless decoy messenger if forced to unlock.
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

          {/* Appearance & Theme Settings Section */}
          <View style={styles.section}>
            <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.xs, marginLeft: 4 }}>
              APPEARANCE & THEME
            </ThemedText>

            <AppCard style={{ gap: spacing.md }}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">Theme Style</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    {isDark ? 'Midnight Wave Dark (Pitch Black OLED)' : 'Midnight Wave Light (Clean White & Slate)'}
                  </ThemedText>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => setThemeMode('light')}
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: !isDark ? '#0F172A' : colors.surfaceSecondary,
                        borderColor: !isDark ? '#0F172A' : colors.border,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.sm + 4,
                        paddingVertical: spacing.xs + 2,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to Light Theme"
                  >
                    <ThemedText
                      variant="label"
                      style={{
                        color: !isDark ? '#FFFFFF' : colors.textMuted,
                        fontWeight: '700',
                        fontSize: 11,
                      }}
                    >
                      ☀️ Light
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setThemeMode('dark')}
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: isDark ? '#2563EB' : colors.surfaceSecondary,
                        borderColor: isDark ? '#38BDF8' : colors.border,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.sm + 4,
                        paddingVertical: spacing.xs + 2,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to Dark Theme"
                  >
                    <ThemedText
                      variant="label"
                      style={{
                        color: isDark ? '#FFFFFF' : colors.textMuted,
                        fontWeight: '700',
                        fontSize: 11,
                      }}
                    >
                      🌙 Dark
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextGroup}>
                  <ThemedText variant="bodyMedium">High Contrast Borders</ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Enhanced perimeter definition for conversation cards
                  </ThemedText>
                </View>
                <Switch
                  value={highContrastBorders}
                  onValueChange={setHighContrastBorders}
                  trackColor={{ false: isDark ? '#1E2533' : '#E2E8F0', true: isDark ? '#2563EB' : '#0F172A' }}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText variant="bodyMedium">Time-Locked Memory Capsules</ThemedText>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          borderColor: 'rgba(245, 158, 11, 0.4)',
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: '#FBBF24', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>
                        TIMELOCK VAULT
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="caption" tone="secondary">
                    Cryptographically sealed future messages that unlock with live countdown timers.
                  </ThemedText>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="hourglass" size={18} color="#FBBF24" />
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
                  trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
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
                  trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
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
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: 24,
                  padding: spacing.lg,
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 10,
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
                • <ThemedText variant="captionMedium" style={{ color: '#A855F7' }}>Real PIN</ThemedText>: Opens your authentic confidential conversations.{'\n'}
                • <ThemedText variant="captionMedium" style={{ color: '#38BDF8' }}>Decoy PIN</ThemedText>: Opens harmless decoy chats if forced to unlock.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  profileHeaderInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProfileSection: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 8,
  },
  largeAvatarWrapper: {
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCutoutShadow: {},
  profileNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  profileHandleText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 18,
    width: '100%',
  },
  quickActionBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  infoCardsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 2,
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  infoCardRightCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCountText: {
    fontSize: 13,
    color: '#64748B',
  },
  chevronArrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '400',
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  memberPill: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
