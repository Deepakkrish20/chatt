import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  ScreenHeader,
  ConversationItem,
  AppIcon,
  AppTextInput,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { MOCK_CONVERSATIONS, MOCK_NETWORK_STATUS } from '@/data/mockData';
import { DirectConversationPreview } from '@/types';

export default function ChatListScreen() {
  const { colors, spacing } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = MOCK_CONVERSATIONS.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participantName.toLowerCase().includes(query) ||
      conv.lastMessageSnippet.toLowerCase().includes(query)
    );
  });

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
              hitSlop={10}
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

        {/* Minimal Search Input */}
        <View style={[styles.searchContainer, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
          <AppTextInput
            placeholder="Search conversations…"
            value={searchQuery}
            onChangeText={setSearchQuery}
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
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
              <ThemedText variant="bodyMedium" tone="secondary" style={{ textAlign: 'center' }}>
                {`No conversations matching "${searchQuery}"`}
              </ThemedText>
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
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
});
