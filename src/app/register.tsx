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

export default function RegisterScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = () => {
    setIsLoading(true);
    // Local mock registration
    setTimeout(() => {
      setIsLoading(false);
      router.push('/chats');
    }, 350);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Create Account"
          subtitle={`Slot Available (4 of ${MAX_REGISTERED_MEMBERS} claimed)`}
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
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <AppCard style={[styles.formCard, { gap: spacing.md }]}>
              <ThemedText variant="h3">
                Member Registration
              </ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: -spacing.xs }}>
                Membership is strictly restricted to 10 verified participants.
              </ThemedText>

              <AppTextInput
                label="Full Name"
                placeholder="e.g. Alex Vance"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <AppTextInput
                label="Email Address"
                placeholder="name@domain.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AppTextInput
                label="Master Password"
                placeholder="Choose strong password"
                value={password}
                onChangeText={setPassword}
                isPassword
              />

              <AppTextInput
                label="Confirm Password"
                placeholder="Repeat master password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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

            <View style={[styles.infoBox, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg }]}>
              <ThemedText variant="label" tone="muted" style={{ marginBottom: 4 }}>
                ZERO-METADATA POLICY
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                No phone number or contact synchronisation required. All exchanges are
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
  },
  formCard: {
    width: '100%',
  },
  infoBox: {
    borderWidth: 1,
  },
});
