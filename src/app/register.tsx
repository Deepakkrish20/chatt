import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  AppTextInput,
  AppButton,
  ScreenHeader,
  AppCard,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';

type RegistrationStep = 'email_input' | 'verify_otp' | 'set_password';

export default function RegisterScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { requestEmailOtp, verifyEmailOtp, setPasswordAndProfile, capacity } = useAuth();

  const [step, setStep] = useState<RegistrationStep>('email_input');

  // Step 1: User Details & Email
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: Verification Code
  const [otpCode, setOtpCode] = useState('');

  // Step 3: Password Setup
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. Submit Email & Request OTP
  const handleRequestOtp = async () => {
    setGeneralError('');
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      newErrors.username = 'Username is required';
    } else if (cleanUsername.length < 3) {
      newErrors.username = 'Minimum 3 characters';
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
    } else if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      newErrors.email = 'Enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    const result = await requestEmailOtp(cleanEmail);
    setIsLoading(false);

    if (result.error) {
      setGeneralError(result.error);
    } else {
      setStep('verify_otp');
    }
  };

  // 2. Verify Email OTP Code
  const handleVerifyOtp = async () => {
    setGeneralError('');
    if (!otpCode.trim()) {
      setErrors({ otp: 'Please enter the 6-digit code' });
      return;
    }

    if (otpCode.trim().length < 6) {
      setErrors({ otp: 'Code must be 6 digits' });
      return;
    }

    setErrors({});
    setIsLoading(true);

    const result = await verifyEmailOtp(email.trim(), otpCode.trim());
    setIsLoading(false);

    if (result.error) {
      setGeneralError(result.error);
    } else {
      setStep('set_password');
    }
  };

  // 3. Set Password & Finalize Account
  const handleSetPassword = async () => {
    setGeneralError('');
    const newErrors: Record<string, string> = {};

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

    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const result = await setPasswordAndProfile(password, name.trim(), cleanUser);
    setIsLoading(false);

    if (result.error) {
      setGeneralError(result.error);
    } else {
      router.replace('/chats');
    }
  };

  const getSubtitle = () => {
    if (capacity.isFull) {
      return 'Registration Closed (All 10 slots filled)';
    }
    if (step === 'email_input') {
      return `Step 1 of 3: Enter Details (${capacity.activeMembers} of ${capacity.maxMembers} slots claimed)`;
    }
    if (step === 'verify_otp') {
      return 'Step 2 of 3: Email Verification';
    }
    return 'Step 3 of 3: Set Master Password';
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Create Account"
          subtitle={getSubtitle()}
          showBack
          onBack={() => {
            if (step === 'set_password') {
              setStep('verify_otp');
            } else if (step === 'verify_otp') {
              setStep('email_input');
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
            <AppCard style={[styles.formCard, { gap: spacing.md }]}>
              {/* Header based on current step */}
              {step === 'email_input' ? (
                <>
                  <ThemedText variant="h3">Member Registration</ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ marginTop: -spacing.xs }}>
                    Membership is strictly restricted to {capacity.maxMembers} verified participants.
                  </ThemedText>
                </>
              ) : null}

              {step === 'verify_otp' ? (
                <>
                  <ThemedText variant="h3">Verify Your Email</ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ marginTop: -spacing.xs }}>
                    We sent a 6-digit confirmation code to {email}.
                  </ThemedText>
                </>
              ) : null}

              {step === 'set_password' ? (
                <>
                  <ThemedText variant="h3">Set Master Password</ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ marginTop: -spacing.xs }}>
                    Email verified. Create your private master password for future logins.
                  </ThemedText>
                </>
              ) : null}

              {/* Full Capacity Alert */}
              {capacity.isFull ? (
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
                  <ThemedText variant="label" tone="primary" style={{ textAlign: 'center', marginBottom: 4 }}>
                    NETWORK AT MAXIMUM CAPACITY (10/10)
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                    All 10 private member slots have been registered. New account creation is
                    atomically blocked by the database.
                  </ThemedText>
                </View>
              ) : null}

              {/* General Error Banner */}
              {Boolean(generalError) ? (
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
                    {generalError}
                  </ThemedText>
                </View>
              ) : null}

              {/* STEP 1: Email & Details */}
              {step === 'email_input' ? (
                <>
                  <AppTextInput
                    label="Full Name"
                    placeholder="e.g. Deepak Krish"
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    error={errors.name}
                    autoCapitalize="words"
                    onClear={() => setName('')}
                    editable={!capacity.isFull}
                  />

                  <AppTextInput
                    label="Username"
                    placeholder="e.g. deepakkrish"
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                    }}
                    error={errors.username}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onClear={() => setUsername('')}
                    editable={!capacity.isFull}
                  />

                  <AppTextInput
                    label="Email Address"
                    placeholder="name@domain.com"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onClear={() => setEmail('')}
                    editable={!capacity.isFull}
                  />

                  <AppButton
                    title={isLoading ? 'Sending Code…' : 'Send Verification Code'}
                    onPress={handleRequestOtp}
                    loading={isLoading}
                    disabled={capacity.isFull || isLoading}
                    style={{ marginTop: spacing.xs }}
                  />
                </>
              ) : null}

              {/* STEP 2: Enter Verification OTP */}
              {step === 'verify_otp' ? (
                <>
                  <AppTextInput
                    label="Verification Code (6 Digits)"
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChangeText={(t) => {
                      setOtpCode(t);
                      if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                    }}
                    error={errors.otp}
                    keyboardType="number-pad"
                    maxLength={6}
                    onClear={() => setOtpCode('')}
                  />

                  <AppButton
                    title={isLoading ? 'Verifying…' : 'Verify Code'}
                    onPress={handleVerifyOtp}
                    loading={isLoading}
                    disabled={isLoading}
                    style={{ marginTop: spacing.xs }}
                  />

                  <View style={styles.resendRow}>
                    <Pressable
                      onPress={handleRequestOtp}
                      disabled={isLoading}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    >
                      <ThemedText variant="caption" tone="secondary">
                        Didn’t receive code? Resend
                      </ThemedText>
                    </Pressable>
                    <ThemedText variant="caption" tone="muted"> • </ThemedText>
                    <Pressable
                      onPress={() => setStep('email_input')}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    >
                      <ThemedText variant="caption" tone="secondary">
                        Change Email
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {/* STEP 3: Set Password */}
              {step === 'set_password' ? (
                <>
                  <AppTextInput
                    label="Create Master Password"
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
                    label="Confirm Master Password"
                    placeholder="Repeat master password"
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                    error={errors.confirmPassword}
                    isPassword
                  />

                  <AppButton
                    title={isLoading ? 'Saving Password…' : 'Set Password & Complete'}
                    onPress={handleSetPassword}
                    loading={isLoading}
                    disabled={isLoading}
                    style={{ marginTop: spacing.xs }}
                  />
                </>
              ) : null}
            </AppCard>

            {/* Back to Login link */}
            <View style={[styles.loginFooter, { marginTop: spacing.lg }]}>
              <ThemedText variant="caption" tone="muted">
                Already registered?{' '}
              </ThemedText>
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <ThemedText variant="caption" tone="primary" style={styles.loginLink}>
                  Sign in to private network
                </ThemedText>
              </Pressable>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
  },
  bannerBox: {
    borderWidth: 1,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
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
