import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedText,
  AppTextInput,
  AppButton,
  AppIcon,
  ScreenHeader,
  AppCard,
  AuroraBackground,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';

type RegistrationView = 'form' | 'awaiting_confirmation';

export default function RegisterScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { signUp, signIn, resendConfirmationEmail, verifyEmailOtp, user, isLoading: isAuthLoading } = useAuth();

  const [view, setView] = useState<RegistrationView>('form');

  // Form inputs
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fallback 6-digit code input
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Status & Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If already authenticated, redirect to chats
  useEffect(() => {
    if (user && !isAuthLoading) {
      router.replace('/chats');
    }
  }, [user, isAuthLoading]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // 1. Submit Registration Form
  const handleSignUp = async () => {
    setGeneralError('');
    setSuccessMessage('');
    const newErrors: Record<string, string> = {};

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanName) {
      newErrors.displayName = 'Display Name is required';
    }

    if (!cleanUser) {
      newErrors.username = 'Username is required';
    } else if (cleanUser.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
    } else if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 characters required';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    const result = await signUp(cleanEmail, password, cleanName, cleanUser);
    setIsLoading(false);

    if (result.error) {
      setGeneralError(result.error);
    } else if (result.requiresEmailConfirmation) {
      setView('awaiting_confirmation');
      setResendCooldown(60);
    } else {
      router.replace('/chats');
    }
  };

  // 2. "I've Confirmed" button — signs in to confirm account activation
  const handleCheckConfirmed = async () => {
    setGeneralError('');
    setSuccessMessage('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const result = await signIn(cleanEmail, password);
    setIsLoading(false);

    if (result.error) {
      if (result.error.toLowerCase().includes('not confirmed')) {
        setGeneralError(
          'Email not confirmed yet. Please open the confirmation email in your Inbox or Spam folder and tap the link.'
        );
      } else {
        setGeneralError(result.error);
      }
    } else {
      router.replace('/chats');
    }
  };

  // 3. Resend Confirmation Email
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setGeneralError('');
    setSuccessMessage('');
    setIsResending(true);

    const cleanEmail = email.trim().toLowerCase();
    const result = await resendConfirmationEmail(cleanEmail);
    setIsResending(false);

    if (result.error) {
      setGeneralError(result.error);
    } else {
      setSuccessMessage('Confirmation email resent! Please check your Inbox and Spam folder.');
      setResendCooldown(60);
    }
  };

  // 4. Verify 6-digit code fallback (if user has code)
  const handleVerifyOtp = async () => {
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setGeneralError('Please enter the 6-digit code');
      return;
    }

    setGeneralError('');
    setIsVerifyingCode(true);

    const cleanEmail = email.trim().toLowerCase();
    const result = await verifyEmailOtp(cleanEmail, cleanCode);
    setIsVerifyingCode(false);

    if (result.error) {
      setGeneralError(result.error);
    } else {
      router.replace('/chats');
    }
  };

  return (
    <AuroraBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title={view === 'form' ? 'Create Account' : 'Confirm Email'}
          subtitle={view === 'form' ? 'Register for Chatt' : 'Verification Sent'}
          showBack
          style={{ backgroundColor: 'transparent', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }}
          onBack={() => {
            if (view === 'awaiting_confirmation') {
              setView('form');
            } else {
              router.back();
            }
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* VIEW 1: REGISTRATION FORM */}
            {view === 'form' ? (
              <AppCard style={[styles.formCard, { gap: spacing.md }]}>
                <ThemedText variant="h3">Join Chatt</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: -spacing.xs }}>
                  Create your private profile to connect and chat in real-time.
                </ThemedText>

                {/* Error Banner */}
                {Boolean(generalError) ? (
                  <View
                    style={[
                      styles.bannerBox,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radius.md,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <ThemedText variant="body" tone="primary" style={{ textAlign: 'center', lineHeight: 20 }}>
                      {generalError}
                    </ThemedText>
                  </View>
                ) : null}

                <AppTextInput
                  label="Display Name"
                  placeholder="e.g. Alex Vance"
                  value={displayName}
                  onChangeText={(t) => {
                    setDisplayName(t);
                    if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: '' }));
                    if (!username) {
                      setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    }
                  }}
                  error={errors.displayName}
                  autoCapitalize="words"
                  onClear={() => setDisplayName('')}
                />

                <AppTextInput
                  label="Username"
                  placeholder="e.g. alex_vance"
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                  }}
                  error={errors.username}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onClear={() => setUsername('')}
                />

                <AppTextInput
                  label="Email Address"
                  placeholder="e.g. alex@gmail.com"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    if (generalError) setGeneralError('');
                  }}
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onClear={() => setEmail('')}
                />

                <AppTextInput
                  label="Password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  error={errors.password}
                  isPassword
                />

                <AppTextInput
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  error={errors.confirmPassword}
                  isPassword
                />

                <AppButton
                  title={isLoading ? 'Creating Account…' : 'Create Account'}
                  onPress={handleSignUp}
                  loading={isLoading}
                  disabled={isLoading}
                  style={{ marginTop: spacing.xs }}
                />

                {/* Back to Login */}
                <View style={[styles.loginFooter, { marginTop: spacing.xs }]}>
                  <ThemedText variant="caption" tone="muted">
                    Already registered?{' '}
                  </ThemedText>
                  <Pressable
                    onPress={() => router.back()}
                    hitSlop={8}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  >
                    <ThemedText variant="caption" tone="primary" style={styles.loginLink}>
                      Sign In
                    </ThemedText>
                  </Pressable>
                </View>
              </AppCard>
            ) : null}

            {/* VIEW 2: AWAITING EMAIL CONFIRMATION */}
            {view === 'awaiting_confirmation' ? (
              <AppCard style={[styles.formCard, { gap: spacing.md, alignItems: 'center' }]}>
                {/* Visual Icon */}
                <View
                  style={[
                    styles.mailBadge,
                    {
                      borderColor: 'rgba(168, 85, 247, 0.45)',
                      backgroundColor: '#181822',
                      borderRadius: 24,
                      padding: spacing.md,
                      shadowColor: '#A855F7',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 6,
                      marginTop: spacing.xs,
                    },
                  ]}
                >
                  <AppIcon name="mail" size={32} color="#C084FC" />
                </View>

                <ThemedText variant="h3" style={{ textAlign: 'center' }}>
                  Check Your Email
                </ThemedText>

                <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center', lineHeight: 20 }}>
                  We sent a confirmation email to:{'\n'}
                  <ThemedText variant="bodySemibold" tone="primary">
                    {email}
                  </ThemedText>
                </ThemedText>

                {/* Prominent Spam / Inbox Notice */}
                <View
                  style={[
                    styles.spamNoticeCard,
                    {
                      borderColor: 'rgba(192, 132, 252, 0.4)',
                      backgroundColor: 'rgba(168, 85, 247, 0.08)',
                      borderRadius: radius.md,
                      padding: spacing.md,
                      width: '100%',
                    },
                  ]}
                >
                  <ThemedText variant="label" tone="primary" style={{ marginBottom: 4, fontWeight: '700' }}>
                    📬 CHECK YOUR SPAM / JUNK FOLDER
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
                    Confirmation emails often land in your <ThemedText variant="caption" tone="primary" style={{ fontWeight: '600' }}>Spam</ThemedText> or <ThemedText variant="caption" tone="primary" style={{ fontWeight: '600' }}>Junk</ThemedText> section. Tap the <ThemedText variant="caption" tone="primary" style={{ fontWeight: '600' }}>Confirm email address</ThemedText> link in the message to activate your account.
                  </ThemedText>
                </View>

                {/* Error Banner */}
                {Boolean(generalError) ? (
                  <View
                    style={[
                      styles.bannerBox,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radius.md,
                        padding: spacing.sm + 4,
                        width: '100%',
                      },
                    ]}
                  >
                    <ThemedText variant="caption" tone="primary" style={{ textAlign: 'center' }}>
                      {generalError}
                    </ThemedText>
                  </View>
                ) : null}

                {/* Success Banner */}
                {Boolean(successMessage) ? (
                  <View
                    style={[
                      styles.bannerBox,
                      {
                        borderColor: '#22C55E',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: radius.md,
                        padding: spacing.sm + 4,
                        width: '100%',
                      },
                    ]}
                  >
                    <ThemedText variant="caption" style={{ color: '#22C55E', textAlign: 'center' }}>
                      {successMessage}
                    </ThemedText>
                  </View>
                ) : null}

                {/* Primary Action: I've Confirmed */}
                <View style={{ width: '100%', marginTop: spacing.xs, gap: spacing.sm }}>
                  <AppButton
                    title={isLoading ? 'Verifying…' : "I've Confirmed, Sign Me In"}
                    onPress={handleCheckConfirmed}
                    loading={isLoading}
                    disabled={isLoading}
                  />

                  <AppButton
                    title={
                      resendCooldown > 0
                        ? `Resend Email (${resendCooldown}s)`
                        : isResending
                        ? 'Resending…'
                        : 'Resend Confirmation Email'
                    }
                    variant="outline"
                    onPress={handleResendEmail}
                    disabled={resendCooldown > 0 || isResending}
                  />
                </View>

                {/* Fallback OTP code input if received 6-digit code */}
                <View style={[styles.codeFallbackSection, { width: '100%', marginTop: spacing.sm }]}>
                  <ThemedText variant="label" tone="muted" style={{ textAlign: 'center', marginBottom: spacing.xs }}>
                    OR ENTER 6-DIGIT CODE IF RECEIVED:
                  </ThemedText>

                  <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <AppTextInput
                        placeholder="6-digit code"
                        value={otpCode}
                        onChangeText={(t) => setOtpCode(t)}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <View style={{ width: 100 }}>
                      <AppButton
                        title={isVerifyingCode ? '…' : 'Verify'}
                        variant="secondary"
                        onPress={handleVerifyOtp}
                        loading={isVerifyingCode}
                        disabled={!otpCode.trim() || isVerifyingCode}
                      />
                    </View>
                  </View>
                </View>

                {/* Back / Change Email */}
                <Pressable
                  onPress={() => setView('form')}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginTop: spacing.xs }]}
                >
                  <ThemedText variant="caption" tone="secondary">
                    ← Change email address
                  </ThemedText>
                </Pressable>
              </AppCard>
            ) : null}
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
  formCard: {
    width: '100%',
  },
  mailBadge: {
    borderWidth: 1,
  },
  spamNoticeCard: {
    borderWidth: 1,
  },
  bannerBox: {
    borderWidth: 1,
  },
  codeFallbackSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
  },
  loginFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLink: {
    textDecorationLine: 'underline',
  },
});
