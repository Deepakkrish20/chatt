import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Text } from 'react-native';
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

export default function WelcomeSignInScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [email, setEmail] = useState('alex@private.chat');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    // Local mock navigation
    setTimeout(() => {
      setIsLoading(false);
      router.push('/chats');
    }, 350);
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
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
            ]}
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
                    padding: spacing.sm,
                  },
                ]}
              >
                <AppIcon name="lock" size={24} color={colors.text} />
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
            <AppCard style={[styles.formCard, { marginTop: spacing.xl, gap: spacing.md }]}>
              <ThemedText variant="h3" style={{ marginBottom: spacing.xs }}>
                Sign In
              </ThemedText>

              <AppTextInput
                label="Email"
                placeholder="name@domain.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AppTextInput
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
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
            <View style={[styles.footerNav, { marginTop: spacing.lg }]}>
              <ThemedText variant="caption" tone="muted">
                New member with invite?{' '}
              </ThemedText>
              <Text
                onPress={() => router.push('/register')}
                style={{ color: colors.text, textDecorationLine: 'underline', fontSize: 13, fontWeight: '500' }}
              >
                Register Account
              </Text>
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
                  marginTop: spacing.xl,
                },
              ]}
            >
              <ThemedText variant="label" tone="muted" style={{ marginBottom: 4 }}>
                NETWORK STATUS: 4 / {MAX_REGISTERED_MEMBERS} SLOTS OCCUPIED
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                Registration is closed once member capacity reaches {MAX_REGISTERED_MEMBERS}.
                Zero ad tracking, zero telemetry.
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
    marginBottom: 16,
  },
  title: {
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandTag: {
    marginTop: 6,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
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
    alignItems: 'center',
  },
});
