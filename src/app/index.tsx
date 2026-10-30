import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  AppTextInput,
  AppButton,
  AppIcon,
  AppCard,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { PROVISIONED_ACCOUNTS } from '@/data/mockData';

export default function WelcomeSignInScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const {
    user,
    signIn,
    capacity,
    isConfigured,
    wasSessionExpired,
    clearSessionExpiredFlag,
    isLoading: isAuthRestoring,
  } = useAuth();

  // Pre-fill with primary admin credentials
  const [identifier, setIdentifier] = useState(PROVISIONED_ACCOUNTS[0].username);
  const [password, setPassword] = useState(PROVISIONED_ACCOUNTS[0].password);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated via restored session, skip sign-in screen
  useEffect(() => {
    if (user && !isLoading && !isAuthRestoring) {
      router.replace('/chats');
    }
  }, [user, isLoading, isAuthRestoring]);

  const handleSignIn = async () => {
    let hasError = false;
    setIdentifierError('');
    setPasswordError('');
    setAuthError('');
    clearSessionExpiredFlag();

    const cleanId = identifier.trim();
    if (!cleanId) {
      setIdentifierError('Member ID or Email is required');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    const result = await signIn(cleanId, password);
    setIsLoading(false);

    if (result.error) {
      setAuthError(result.error);
    } else {
      router.replace('/chats');
    }
  };

  const selectAccount = (acc: typeof PROVISIONED_ACCOUNTS[0]) => {
    setIdentifier(acc.username);
    setPassword(acc.password);
    setIdentifierError('');
    setPasswordError('');
    setAuthError('');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Minimalist Monochrome Brand Header */}
            <View style={styles.brandSection}>
              <View
                style={[
                  styles.logoBadge,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: radius.md,
                    padding: spacing.sm + 2,
                  },
                ]}
              >
                <AppIcon name="lock" size={26} color={colors.text} />
              </View>

              <ThemedText variant="display" style={styles.title}>
                CHATT
              </ThemedText>

              <ThemedText variant="label" tone="muted" style={styles.brandTag}>
                CLOSED-CIRCLE 1:1 MESSENGER
              </ThemedText>

              <ThemedText variant="caption" tone="secondary" style={styles.subtitle}>
                Strict maximum of {capacity.maxMembers} members. Admin-provisioned,
                direct one-to-one encrypted messaging.
              </ThemedText>

              {/* Status indicator pill */}
              <View
                style={[
                  styles.statusPill,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: radius.full,
                    marginTop: 8,
                  },
                ]}
              >
                <ThemedText variant="label" tone="muted" style={{ fontSize: 9 }}>
                  {isConfigured ? 'SUPABASE BACKEND CONNECTED' : 'SECURE RUNTIME ACTIVE'}
                </ThemedText>
              </View>
            </View>

            {/* Inactivity Session Expiry Banner */}
            {Boolean(wasSessionExpired) ? (
              <View
                style={[
                  styles.bannerBox,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <ThemedText variant="label" tone="primary" style={{ textAlign: 'center', marginBottom: 2 }}>
                  SESSION EXPIRED (3 DAYS INACTIVITY)
                </ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                  For security, logins expire after 3 days of inactivity. Please sign in again.
                </ThemedText>
              </View>
            ) : null}

            {/* Sign-in Form */}
            <AppCard style={[styles.formCard, { marginTop: spacing.md, gap: spacing.md }]}>
              <ThemedText variant="h3">
                Member Sign In
              </ThemedText>

              {Boolean(authError) ? (
                <View
                  style={[
                    styles.bannerBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: radius.md,
                      padding: spacing.sm + 2,
                    },
                  ]}
                >
                  <ThemedText variant="caption" tone="primary" style={{ textAlign: 'center' }}>
                    {authError}
                  </ThemedText>
                </View>
              ) : null}

              <AppTextInput
                label="Member ID / Username / Email"
                placeholder="e.g. deepak or jana"
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  if (identifierError) setIdentifierError('');
                  if (authError) setAuthError('');
                }}
                error={identifierError}
                autoCapitalize="none"
                autoCorrect={false}
                onClear={() => setIdentifier('')}
              />

              <AppTextInput
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                  if (authError) setAuthError('');
                }}
                error={passwordError}
                isPassword
              />

              <View style={{ marginTop: spacing.xs, gap: spacing.sm }}>
                <AppButton
                  title="Sign In"
                  variant="primary"
                  loading={isLoading || isAuthRestoring}
                  onPress={handleSignIn}
                />
              </View>
            </AppCard>

            {/* Quick Test Accounts Switcher */}
            <View style={[styles.accountsSection, { marginTop: spacing.md }]}>
              <ThemedText variant="label" tone="muted" style={{ marginBottom: 8, textAlign: 'center' }}>
                PROVISIONED MEMBER ACCOUNTS (CLICK TO AUTO-FILL)
              </ThemedText>
              <View style={styles.accountsGrid}>
                {PROVISIONED_ACCOUNTS.map((acc) => {
                  const isSelected = identifier.toLowerCase() === acc.username.toLowerCase();
                  return (
                    <Pressable
                      key={acc.username}
                      onPress={() => selectAccount(acc)}
                      style={({ pressed }) => [
                        styles.accountChip,
                        {
                          borderColor: isSelected ? colors.text : colors.border,
                          backgroundColor: isSelected ? colors.surfaceSecondary : colors.surfaceElevated,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <ThemedText variant="caption" tone={isSelected ? 'primary' : 'secondary'} style={{ fontWeight: isSelected ? '600' : '400' }}>
                        @{acc.username}
                      </ThemedText>
                      <ThemedText variant="label" tone="muted" style={{ fontSize: 9 }}>
                        {acc.role}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Privacy & Member Constraint Banner */}
            <View
              style={[
                styles.constraintBanner,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={styles.slotMeterRow}>
                <ThemedText variant="label" tone="muted">
                  REGISTERED MEMBERS: {capacity.activeMembers} / {capacity.maxMembers}
                </ThemedText>
                <View style={styles.slotDots}>
                  {Array.from({ length: capacity.maxMembers }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.slotDot,
                        {
                          backgroundColor:
                            i < capacity.activeMembers ? colors.text : 'transparent',
                          borderColor: colors.textMuted,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                Each member logs in with their unique Member ID and password. Direct one-to-one messages are restricted solely to the two participants.
              </ThemedText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandSection: {
    alignItems: 'center',
  },
  logoBadge: {
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    letterSpacing: 3,
    textAlign: 'center',
  },
  brandTag: {
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 320,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  formCard: {
    width: '100%',
  },
  bannerBox: {
    borderWidth: 1,
  },
  accountsSection: {
    width: '100%',
  },
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  accountChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  constraintBanner: {
    borderWidth: 1,
  },
  slotMeterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
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
});
