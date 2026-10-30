import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView, ThemedText, AppCard, AppButton } from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { MAX_REGISTERED_MEMBERS } from '@/types';

export default function HomeScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [tapCount, setTapCount] = useState(0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { padding: spacing.lg, gap: spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.accentMuted,
                  borderColor: colors.accentLight,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.sm + 4,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <ThemedText variant="label" style={{ color: colors.accentLight }}>
                MODULE 1 — FOUNDATION READY
              </ThemedText>
            </View>

            <ThemedText variant="h1" style={styles.title}>
              Chatt
            </ThemedText>
            <ThemedText variant="caption" style={styles.subtitle}>
              Private, one-to-one mobile messaging for up to {MAX_REGISTERED_MEMBERS} members.
            </ThemedText>
          </View>

          {/* Core Constraint Card */}
          <AppCard>
            <ThemedText variant="label" style={{ color: colors.accent }}>
              PRODUCT SPECIFICATION
            </ThemedText>
            <ThemedText variant="h3" style={{ marginTop: spacing.xs }}>
              Private Member Limit
            </ThemedText>
            <ThemedText
              variant="body"
              style={{ color: colors.textSecondary, marginTop: spacing.xs }}
            >
              Strict hard cap of {MAX_REGISTERED_MEMBERS} registered members. Exclusively
              one-to-one private conversations, with no public groups or open channels.
            </ThemedText>
          </AppCard>

          {/* Architecture Overview Card */}
          <AppCard elevated>
            <ThemedText variant="label" style={{ color: colors.textMuted }}>
              TECHNOLOGY STACK
            </ThemedText>
            <View style={[styles.techList, { gap: spacing.sm, marginTop: spacing.sm }]}>
              <View style={styles.techRow}>
                <ThemedText variant="caption">• Expo + React Native</ThemedText>
                <ThemedText variant="code">SDK 58</ThemedText>
              </View>
              <View style={styles.techRow}>
                <ThemedText variant="caption">• Navigation & Routing</ThemedText>
                <ThemedText variant="code">Expo Router</ThemedText>
              </View>
              <View style={styles.techRow}>
                <ThemedText variant="caption">• Language & Type Safety</ThemedText>
                <ThemedText variant="code">TypeScript</ThemedText>
              </View>
              <View style={styles.techRow}>
                <ThemedText variant="caption">• Backend Target</ThemedText>
                <ThemedText variant="code">Supabase</ThemedText>
              </View>
            </View>
          </AppCard>

          {/* Design System Verification Card */}
          <AppCard>
            <ThemedText variant="label" style={{ color: colors.textMuted }}>
              DESIGN FOUNDATION
            </ThemedText>
            <ThemedText
              variant="body"
              style={{ color: colors.textSecondary, marginTop: spacing.xs }}
            >
              Dark-mode first color tokens, high-contrast readable typography, and
              consistent border radii.
            </ThemedText>
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <AppButton
                title={
                  tapCount === 0
                    ? 'Verify Accent Theme Token'
                    : `Accent Token Verified (${tapCount} taps)`
                }
                variant="primary"
                onPress={() => setTapCount((c) => c + 1)}
              />
              <AppButton
                title="Secondary Surface Variant"
                variant="secondary"
                onPress={() => {}}
              />
            </View>
          </AppCard>
        </ScrollView>
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
  scrollContent: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
  },
  techList: {
    width: '100%',
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
