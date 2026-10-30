import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text, Pressable } from 'react-native';
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

export default function WelcomeSignInScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { user, signIn, capacity, isConfigured, isLoading: isAuthRestoring } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated via session restoration, offer quick resume
  useEffect(() => {
    if (user && !isLoading) {
      router.replace('/chats');
    }
  }, [user, isLoading]);

  const handleSignIn = async () => {
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setAuthError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Email address is required');
      hasError = true;
    } else if (!cleanEmail.includes('@')) {
      setEmailError('Enter a valid email format');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    const result = await signIn(cleanEmail, password);
    setIsLoading(false);

    if (result.error) {
      setAuthError(result.error);
    } else {
      router.push('/chats');
    }
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
                Strict maximum of {capacity.maxMembers} members. Completely private,
                direct one-to-one communications.
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
                  {isConfigured ? 'SUPABASE AUTH ACTIVE' : 'LOCAL DEMO MODE'}
                </ThemedText>
              </View>
            </View>

            {/* Sign-in Form */}
            <AppCard style={[styles.formCard, { marginTop: spacing.md, gap: spacing.md }]}>
              <ThemedText variant="h3">
                Sign In
              </ThemedText>

              {Boolean(authError) ? (
                <View
                  style={[
                    styles.errorBanner,
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
                label="Email"
                placeholder="name@domain.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError('');
                  if (authError) setAuthError('');
                }}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onClear={() => setEmail('')}
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

                {!isConfigured ? (
                  <AppButton
                    title="Explore Mock Chats (Direct Access)"
                    variant="secondary"
                    onPress={() => router.push('/chats')}
                  />
                ) : null}
              </View>
            </AppCard>

            {/* Registration Navigation Link */}
            <View style={[styles.footerNav, { marginTop: spacing.md }]}>
              <ThemedText variant="caption" tone="muted">
                {capacity.isFull ? 'Network full.' : 'New member with invite?'}{' '}
              </ThemedText>
              {capacity.isFull ? (
                <ThemedText variant="caption" tone="secondary" style={{ fontWeight: '600' }}>
                  Registration Closed
                </ThemedText>
              ) : (
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push('/register')}
                  accessibilityRole="link"
                  accessibilityLabel="Register Account"
                >
                  <Text style={{ color: colors.text, textDecorationLine: 'underline', fontSize: 13, fontWeight: '600' }}>
                    Register Account
                  </Text>
                </Pressable>
              )}
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
                  marginTop: spacing.lg,
                },
              ]}
            >
              <View style={styles.slotMeterRow}>
                <ThemedText variant="label" tone="muted">
                  SLOTS OCCUPIED: {capacity.activeMembers} / {capacity.maxMembers}
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
                {capacity.isFull
                  ? 'All 10 member slots are currently filled. New signups are locked.'
                  : `Registration will close automatically once capacity reaches ${capacity.maxMembers}. Zero ad tracking, zero telemetry.`}
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
  errorBanner: {
    borderWidth: 1,
  },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'center',
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
