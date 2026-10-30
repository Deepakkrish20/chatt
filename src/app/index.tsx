import React, { useState } from 'react';
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
import { MAX_REGISTERED_MEMBERS } from '@/types';
import { MOCK_NETWORK_STATUS } from '@/data/mockData';

export default function WelcomeSignInScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [email, setEmail] = useState('alex@private.chat');
  const [password, setPassword] = useState('••••••••••••');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    let hasError = false;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email address is required');
      hasError = true;
    } else if (!email.includes('@')) {
      setEmailError('Enter a valid email format');
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/chats');
    }, 400);
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
                Strict maximum of {MAX_REGISTERED_MEMBERS} members. Completely private,
                direct one-to-one communications.
              </ThemedText>
            </View>

            {/* Sign-in Form */}
            <AppCard style={[styles.formCard, { marginTop: spacing.lg, gap: spacing.md }]}>
              <ThemedText variant="h3">
                Sign In
              </ThemedText>

              <AppTextInput
                label="Email"
                placeholder="name@domain.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError('');
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
                }}
                error={passwordError}
                isPassword
              />

              <View style={{ marginTop: spacing.xs, gap: spacing.sm }}>
                <AppButton
                  title="Sign In"
                  variant="primary"
                  loading={isLoading}
                  onPress={handleSignIn}
                />

                <AppButton
                  title="Explore Mock Chats (Direct Access)"
                  variant="secondary"
                  onPress={() => router.push('/chats')}
                />
              </View>
            </AppCard>

            {/* Registration Navigation Link */}
            <View style={[styles.footerNav, { marginTop: spacing.md }]}>
              <ThemedText variant="caption" tone="muted">
                New member with invite?{' '}
              </ThemedText>
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
                  SLOTS OCCUPIED: {MOCK_NETWORK_STATUS.activeMembers} / {MOCK_NETWORK_STATUS.maxMembers}
                </ThemedText>
                <View style={styles.slotDots}>
                  {Array.from({ length: MAX_REGISTERED_MEMBERS }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.slotDot,
                        {
                          backgroundColor:
                            i < MOCK_NETWORK_STATUS.activeMembers ? colors.text : 'transparent',
                          borderColor: colors.textMuted,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                Registration is closed once member capacity reaches {MAX_REGISTERED_MEMBERS}.
                Zero ad tracking, zero analytics telemetry.
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
  formCard: {
    width: '100%',
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
