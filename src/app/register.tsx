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
import { MAX_REGISTERED_MEMBERS } from '@/types';
import { MOCK_NETWORK_STATUS } from '@/data/mockData';

export default function RegisterScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!email.includes('@')) {
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

    setTimeout(() => {
      setIsLoading(false);
      router.push('/chats');
    }, 400);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Create Account"
          subtitle={`Slot Available (${MOCK_NETWORK_STATUS.activeMembers} of ${MOCK_NETWORK_STATUS.maxMembers} claimed)`}
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
                Membership is strictly restricted to {MAX_REGISTERED_MEMBERS} verified participants.
              </ThemedText>

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
              />

              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <AppButton
                  title="Complete Registration"
                  variant="primary"
                  loading={isLoading}
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
                ZERO-METADATA POLICY
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                No phone number or contact synchronisation required. All communications are
                isolated directly between the sender and recipient.
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
  infoBox: {
    borderWidth: 1,
  },
});
