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
  CurvedWaveHeader,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';

export default function WelcomeSignInScreen() {
  const { colors, spacing, radius, isDark } = useAppTheme();
  const {
    user,
    signIn,
    resendConfirmationEmail,
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
  const [showSignInForm, setShowSignInForm] = useState(false);
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

  if (!showSignInForm) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
        {/* Top Midnight Navy Zone (~65% height, Screen 1) */}
        <View style={[styles.welcomeNavyZone, { backgroundColor: isDark ? '#000000' : '#0B101B' }]}>
          <SafeAreaView edges={['top', 'left', 'right']} style={styles.welcomeSafeArea}>
            {/* Chatt Stylized Minimalist Speech Bubble Logo */}
            <View style={styles.logoWrapper}>
              <View
                style={[
                  styles.speechBubbleIconOuter,
                  isDark && { borderColor: '#38BDF8', shadowColor: '#38BDF8', shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
                ]}
              >
                <View
                  style={[
                    styles.speechBubbleIconInner,
                    isDark && { borderColor: '#38BDF8' },
                  ]}
                />
              </View>
            </View>

            {/* Title & Subtitle (Screen 1) */}
            <ThemedText style={styles.welcomeTitle}>chatt</ThemedText>
            <ThemedText style={styles.welcomeSubtitle}>
              Private conversations{'\n'}that feel{' '}
              <ThemedText style={{ color: isDark ? '#38BDF8' : '#FFFFFF', fontWeight: '700' }}>
                closer.
              </ThemedText>
            </ThemedText>

            {/* Minimalist Separator Dash */}
            <View
              style={[
                styles.separatorDash,
                isDark && { backgroundColor: '#38BDF8', width: 32 },
              ]}
            />
          </SafeAreaView>
        </View>

        {/* Curved Organic Wave Transition */}
        <CurvedWaveHeader variant="welcome" waveHeight={52} curveColor={isDark ? '#000000' : '#FFFFFF'} />

        {/* Bottom Pure Area */}
        <View style={[styles.welcomeBottomArea, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
          <Pressable
            onPress={() => router.push('/register')}
            style={({ pressed }) => [
              styles.getStartedButton,
              isDark && {
                backgroundColor: '#2563EB',
                borderColor: '#2563EB',
                borderRadius: 28,
                paddingVertical: 14,
                paddingHorizontal: 20,
                justifyContent: 'center',
              },
              { opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            {isDark ? (
              <ThemedText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                Get Started →
              </ThemedText>
            ) : (
              <>
                <View style={styles.arrowCircle}>
                  <ThemedText style={styles.arrowCircleText}>→</ThemedText>
                </View>
                <ThemedText style={styles.getStartedButtonText}>Get Started</ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowSignInForm(true)}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginTop: 18 }]}
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Sign In"
          >
            <ThemedText style={[styles.alreadyAccountText, isDark && { color: '#94A3B8' }]}>
              Already have an account?{' '}
              <ThemedText style={{ color: isDark ? '#38BDF8' : '#0F172A', fontWeight: '700' }}>
                Sign In
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CurvedWaveHeader variant="chats" waveHeight={38}>
        <View style={styles.signInHeaderBar}>
          <Pressable
            onPress={() => setShowSignInForm(false)}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtnRow, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
          >
            <AppIcon name="back" size={18} color="#FFFFFF" />
            <ThemedText style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 6 }}>
              Welcome
            </ThemedText>
          </Pressable>
          <ThemedText style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}>
            Sign In
          </ThemedText>
        </View>
      </CurvedWaveHeader>

      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Sign-in Form */}
            <AppCard
              style={[
                styles.formCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 24,
                  padding: spacing.lg,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                },
              ]}
            >
              <ThemedText variant="h2" style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>
                Welcome Back
              </ThemedText>
              <ThemedText variant="caption" style={{ color: colors.textMuted, marginBottom: spacing.md }}>
                Sign in to your private conversations
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeNavyZone: {
    backgroundColor: '#0B101B',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
  },
  welcomeSafeArea: {
    width: '100%',
  },
  welcomeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 44,
  },
  topDashIndicator: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  pageNumberText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  speechBubbleIconOuter: {
    width: 52,
    height: 44,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechBubbleIconInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  welcomeTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 19,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 27,
    letterSpacing: -0.2,
    marginBottom: 26,
  },
  separatorDash: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 10,
  },
  welcomeBottomArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B101B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  arrowCircleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  getStartedButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  alreadyAccountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  signInHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
