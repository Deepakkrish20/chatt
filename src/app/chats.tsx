import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  ScreenHeader,
  ConversationItem,
  AppIcon,
  AppTextInput,
  AppButton,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { MOCK_CONVERSATIONS, MOCK_NETWORK_STATUS } from '@/data/mockData';
import { DirectConversationPreview } from '@/types';

export default function ChatListScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredConversations = MOCK_CONVERSATIONS.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participantName.toLowerCase().includes(query) ||
      conv.lastMessageSnippet.toLowerCase().includes(query)
    );
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const handleOpenConversation = (conv: DirectConversationPreview) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conv.id,
        name: conv.participantName,
        online: conv.isOnline ? 'true' : 'false',
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header with Settings Action */}
        <ScreenHeader
          title="Chats"
          subtitle={`${MOCK_NETWORK_STATUS.activeMembers} of ${MOCK_NETWORK_STATUS.maxMembers} Members Active`}
          rightElement={
            <Pressable
              hitSlop={12}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [
                styles.headerAction,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <AppIcon name="settings" size={20} color={colors.text} />
            </Pressable>
          }
        />

        {/* Network Slots Bar */}
        <View
          style={[
            styles.networkBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
            },
          ]}
        >
          <ThemedText variant="label" tone="muted">
            CLOSED-CIRCLE NETWORK: {MOCK_NETWORK_STATUS.slotsRemaining} SLOTS AVAILABLE
          </ThemedText>
          <View style={styles.slotIndicators}>
            {Array.from({ length: MOCK_NETWORK_STATUS.maxMembers }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.slotDot,
                  {
                    backgroundColor: i < MOCK_NETWORK_STATUS.activeMembers ? colors.text : 'transparent',
                    borderColor: colors.textMuted,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Search Input Bar */}
        <View style={[styles.searchContainer, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
          <AppTextInput
            placeholder="Search conversations…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Conversation List */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => handleOpenConversation(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text}
              colors={[colors.text]}
              progressBackgroundColor={colors.surfaceSecondary}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
              <View
                style={[
                  styles.emptyIconContainer,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <AppIcon name="search" size={24} color={colors.textMuted} />
              </View>
              <ThemedText variant="bodyMedium" tone="primary" style={{ textAlign: 'center', marginTop: spacing.md }}>
                No Conversations Found
              </ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: 4, maxWidth: 260 }}>
                {searchQuery
                  ? `No peer conversations matching "${searchQuery}".`
                  : 'No active direct messages.'}
              </ThemedText>
              {Boolean(searchQuery) ? (
                <View style={{ marginTop: spacing.md }}>
                  <AppButton
                    title="Clear Search"
                    variant="outline"
                    size="sm"
                    onPress={() => setSearchQuery('')}
                  />
                </View>
              ) : null}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
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
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  searchContainer: {
    width: '100%',
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
