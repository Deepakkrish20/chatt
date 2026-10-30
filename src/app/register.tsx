import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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

export default function RegisterScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { signUp, capacity } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setGeneralError('');
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
    } else if (!cleanEmail.includes('@')) {
      newErrors.email = 'Enter a valid email format';
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

    const result = await signUp(cleanEmail, password, name.trim());
    setIsLoading(false);

    if (result.error) {
      setGeneralError(result.error);
    } else {
      router.push('/chats');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Create Account"
          subtitle={
            capacity.isFull
              ? 'Registration Closed (All 10 slots filled)'
              : `Slot Available (${capacity.activeMembers} of ${capacity.maxMembers} claimed)`
          }
          showBack
          onBack={() => router.back()}
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
              <ThemedText variant="h3">
                Member Registration
              </ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: -spacing.xs }}>
                Membership is strictly restricted to {capacity.maxMembers} verified participants.
              </ThemedText>

              {capacity.isFull ? (
                <View
                  style={[
                    styles.fullCapacityBanner,
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

              {Boolean(generalError) ? (
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
                    {generalError}
                  </ThemedText>
                </View>
              ) : null}

              <AppTextInput
                label="Full Name"
                placeholder="e.g. Alex Vance"
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

              <AppTextInput
                label="Master Password"
                placeholder="Choose strong password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                error={errors.password}
                isPassword
                editable={!capacity.isFull}
              />

              <AppTextInput
                label="Confirm Password"
                placeholder="Repeat master password"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                error={errors.confirmPassword}
                isPassword
                editable={!capacity.isFull}
              />

              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <AppButton
                  title={capacity.isFull ? 'Registration Locked' : 'Complete Registration'}
                  variant="primary"
                  loading={isLoading}
                  disabled={capacity.isFull}
                  onPress={handleRegister}
                />

                <AppButton
                  title="Already registered? Sign in"
                  variant="outline"
                  onPress={() => router.back()}
                />
              </View>
            </AppCard>

            <View
              style={[
                styles.infoBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <ThemedText variant="label" tone="muted" style={{ marginBottom: 4 }}>
                ZERO-METADATA & HARD-LIMIT POLICY
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                No phone number or contact synchronisation required. The 10-member ceiling is
                atomically enforced at the database level with transaction isolation locks.
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
    paddingBottom: 24,
  },
  formCard: {
    width: '100%',
  },
  fullCapacityBanner: {
    borderWidth: 1,
  },
  errorBanner: {
    borderWidth: 1,
  },
  infoBox: {
    borderWidth: 1,
  },
});
