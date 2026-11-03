import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedText,
  AppTextInput,
  AppButton,
  AppIcon,
  AppCard,
  AuroraBackground,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';

export default function WelcomeSignInScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const {
    user,
    signIn,
    resendConfirmationEmail,
    isConfigured,
    wasSessionExpired,
    clearSessionExpiredFlag,
    isLoading: isAuthRestoring,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  // If already authenticated via restored session, skip sign-in screen
  useEffect(() => {
    if (user && !isLoading && !isAuthRestoring) {
      router.replace('/chats');
    }
  }, [user, isLoading, isAuthRestoring]);

  const handleSignIn = async () => {
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setAuthError('');
    setResendStatus('');
    setIsEmailUnconfirmed(false);
    clearSessionExpiredFlag();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Email address is required');
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
      if (result.error.toLowerCase().includes('not confirmed')) {
        setIsEmailUnconfirmed(true);
      }
    } else {
      router.replace('/chats');
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setIsResending(true);
    setResendStatus('');
    const result = await resendConfirmationEmail(cleanEmail);
    setIsResending(false);

    if (result.error) {
      setResendStatus(`Failed: ${result.error}`);
    } else {
      setResendStatus('Confirmation link sent! Check your Inbox and Spam folder.');
    }
  };

  return (
    <AuroraBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand Header */}
            <View style={styles.brandSection}>
              <View
                style={[
                  styles.logoBadge,
                  {
                    borderColor: 'rgba(168, 85, 247, 0.45)',
                    backgroundColor: '#181822',
                    borderRadius: 20,
                    padding: spacing.md,
                    shadowColor: '#A855F7',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 6,
                  },
                ]}
              >
                <AppIcon name="lock" size={26} color="#C084FC" />
              </View>

              <ThemedText variant="display" style={styles.title}>
                CHATT
              </ThemedText>

              <ThemedText variant="label" tone="muted" style={styles.brandTag}>
                DIRECT 1:1 MESSENGER
              </ThemedText>

              <ThemedText variant="caption" tone="secondary" style={styles.subtitle}>
                Fast, private, end-to-end real-time communication.
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
                  {isConfigured ? 'BACKEND CONNECTED' : 'OFFLINE MODE'}
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
                Sign In
              </ThemedText>

              {/* Error banner */}
              {Boolean(authError) ? (
                <View
                  style={[
                    styles.bannerBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: radius.md,
                      padding: spacing.sm + 4,
                      gap: 6,
                    },
                  ]}
                >
                  <ThemedText variant="caption" tone="primary" style={{ textAlign: 'center' }}>
                    {authError}
                  </ThemedText>

                  {/* If unconfirmed, offer 1-tap resend button */}
                  {isEmailUnconfirmed ? (
                    <View style={{ marginTop: 4, gap: 4 }}>
                      <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center', fontSize: 11 }}>
                        Did you check your Spam / Junk folder?
                      </ThemedText>
                      <AppButton
                        title={isResending ? 'Sending…' : 'Resend Confirmation Email'}
                        variant="secondary"
                        onPress={handleResend}
                        loading={isResending}
                        disabled={isResending}
                      />
                    </View>
                  ) : null}

                  {Boolean(resendStatus) ? (
                    <ThemedText variant="caption" style={{ color: '#22C55E', textAlign: 'center', marginTop: 4 }}>
                      {resendStatus}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}

              <AppTextInput
                label="Email Address"
                placeholder="e.g. yourname@gmail.com"
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
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 80, animated: true });
                  }, 120);
                }}
              />

              <AppTextInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                  if (authError) setAuthError('');
                }}
                error={passwordError}
                isPassword
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 240);
                }}
              />

              <View style={{ marginTop: spacing.xs, gap: spacing.sm }}>
                <AppButton
                  title="Sign In"
                  variant="primary"
                  loading={isLoading || isAuthRestoring}
                  onPress={handleSignIn}
                />
              </View>

              {/* Create Account Link */}
              <View style={[styles.createAccountRow, { marginTop: spacing.xs }]}>
                <ThemedText variant="caption" tone="muted">
                  Don&apos;t have an account?{' '}
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/register')}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <ThemedText variant="caption" tone="primary" style={styles.registerLink}>
                    Create Account
                  </ThemedText>
                </Pressable>
              </View>
            </AppCard>

            {/* Privacy note */}
            <View
              style={[
                styles.infoCard,
                {
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center', lineHeight: 18 }}>
                Chatt is a private real-time messenger. Each user verifies their account using their email address for direct one-to-one encrypted conversations.
              </ThemedText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  infoCard: {
    borderWidth: 1,
  },
  createAccountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  registerLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
