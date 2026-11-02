import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
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
  AppAvatar,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import {
  fetchConversations,
  fetchRegisteredMembers,
  getOrCreateConversation,
  subscribeToConversationsList,
  searchAllMessages,
  MatchedMessageItem,
} from '@/lib/supabase';
import { ConversationParticipantProfile } from '@/lib/supabase/types';
import { DirectConversationPreview } from '@/types';

export default function ChatListScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { user, capacity, refreshCapacity } = useAuth();

  const currentUserId = user?.id || '';

  const [conversations, setConversations] = useState<DirectConversationPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Deep search states
  const [matchedDeepMessages, setMatchedDeepMessages] = useState<MatchedMessageItem[]>([]);
  const [matchedDeepConvs, setMatchedDeepConvs] = useState<DirectConversationPreview[]>([]);

  // New conversation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<ConversationParticipantProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [createChatError, setCreateChatError] = useState('');

  // Load conversations and registered members
  const loadConversations = useCallback(async () => {
    const [list, memberList] = await Promise.all([
      fetchConversations(currentUserId),
      fetchRegisteredMembers(currentUserId),
    ]);
    setConversations(list);
    setMembers(memberList);
    setIsLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchConversations(currentUserId),
      fetchRegisteredMembers(currentUserId),
    ]).then(([list, memberList]) => {
      if (isMounted) {
        setConversations(list);
        setMembers(memberList);
        setIsLoading(false);
      }
    });

    // Subscribe to live conversation updates
    const unsubscribe = subscribeToConversationsList(currentUserId, () => {
      fetchConversations(currentUserId).then((list) => {
        if (isMounted) {
          setConversations(list);
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(), refreshCapacity()]);
    setRefreshing(false);
  };

  // Deep search effect across stored message histories
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      const resetTimer = setTimeout(() => {
        setMatchedDeepMessages([]);
        setMatchedDeepConvs([]);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      searchAllMessages(currentUserId, q).then(({ matchingConversations, matchingMessages }) => {
        if (isMounted) {
          setMatchedDeepConvs(matchingConversations);
          setMatchedDeepMessages(matchingMessages);
        }
      });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, currentUserId]);

  const handleOpenConversation = (
    conv: DirectConversationPreview,
    queryParam?: string
  ) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conv.id,
        name: conv.participantName,
        online: conv.isOnline ? 'true' : 'false',
        participantId: conv.participantId,
        ...(queryParam ? { query: queryParam } : {}),
      },
    });
  };

  // Open member picker modal
  const handleOpenNewChatModal = async () => {
    setIsModalOpen(true);
    setIsLoadingMembers(true);
    setCreateChatError('');
    setMemberSearchQuery('');

    const registered = await fetchRegisteredMembers(currentUserId);
    setMembers(registered);
    setIsLoadingMembers(false);
  };

  // Start or open 1:1 conversation with target member
  const handleSelectMember = async (member: ConversationParticipantProfile) => {
    if (isCreatingChat) return;

    setIsCreatingChat(true);
    setCreateChatError('');

    const { conversationId, error } = await getOrCreateConversation(member.id, currentUserId);

    setIsCreatingChat(false);

    if (error || !conversationId) {
      setCreateChatError(error || 'Failed to start conversation.');
      return;
    }

    setIsModalOpen(false);
    await loadConversations();

    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conversationId,
        name: member.displayName,
        online: member.isOnline ? 'true' : 'false',
        participantId: member.id,
      },
    });
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participantName.toLowerCase().includes(query) ||
      conv.lastMessageSnippet.toLowerCase().includes(query)
    );
  });

  // Combine conversation name matches with deep historical message matches
  const activeConversations = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const ids = new Set<string>();
    const combined: DirectConversationPreview[] = [];

    matchedDeepConvs.forEach((c) => {
      ids.add(c.id);
      combined.push(c);
    });

    filteredConversations.forEach((c) => {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        combined.push(c);
      }
    });

    return combined;
  }, [searchQuery, conversations, matchedDeepConvs, filteredConversations]);

  // Filter members in modal
  const filteredMembers = members.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    return m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header with New Chat & Settings Action */}
        <ScreenHeader
          title="Chats"
          subtitle={`${capacity.activeMembers} of ${capacity.maxMembers} Members Active`}
          rightElement={
            <View style={styles.headerActionsGroup}>
              <Pressable
                hitSlop={10}
                onPress={handleOpenNewChatModal}
                style={({ pressed }) => [
                  styles.headerAction,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start new conversation"
              >
                <AppIcon name="plus" size={18} color={colors.text} />
              </Pressable>
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
                <AppIcon name="settings" size={18} color={colors.text} />
              </Pressable>
            </View>
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
            CLOSED-CIRCLE NETWORK: {capacity.slotsRemaining} SLOTS AVAILABLE
          </ThemedText>
          <View style={styles.slotIndicators}>
            {Array.from({ length: capacity.maxMembers }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.slotDot,
                  {
                    backgroundColor:
                      i < capacity.activeMembers ? colors.accent : 'transparent',
                    borderColor: i < capacity.activeMembers ? colors.accent : colors.textMuted,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Search Input Bar */}
        <View
          style={[
            styles.searchContainer,
            { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
          ]}
        >
          <AppTextInput
            placeholder="Search conversations…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Conversation List */}
        {Boolean(isLoading) ? (
          <View style={[styles.centeredLoading, { padding: spacing.xl }]}>
            <ActivityIndicator size="small" color={colors.text} />
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.sm, textAlign: 'center' }}
            >
              Loading private channels…
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={activeConversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                onPress={() => handleOpenConversation(item)}
              />
            )}
            ListFooterComponent={
              searchQuery.trim() && matchedDeepMessages.length > 0 ? (
                <View style={styles.matchedMessagesSection}>
                  <View style={styles.matchedMessagesHeader}>
                    <ThemedText variant="label" tone="muted">
                      MESSAGES FOUND IN CHATS ({matchedDeepMessages.length})
                    </ThemedText>
                  </View>
                  {matchedDeepMessages.map(({ message, conversation }) => (
                    <Pressable
                      key={message.id}
                      onPress={() => handleOpenConversation(conversation, searchQuery.trim())}
                      style={({ pressed }) => [
                        styles.matchedMessageCard,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <View style={styles.matchedMessageTopRow}>
                        <ThemedText variant="captionMedium" style={{ fontWeight: '600' }}>
                          {conversation.participantName}
                        </ThemedText>
                        <ThemedText variant="label" tone="muted">
                          {message.createdAt}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" tone="secondary" numberOfLines={2}>
                        {message.content}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : undefined
            }
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
                <ThemedText
                  variant="bodyMedium"
                  tone="primary"
                  style={{ textAlign: 'center', marginTop: spacing.md }}
                >
                  {Boolean(searchQuery)
                    ? 'No Matching Conversations'
                    : 'No Active Conversations'}
                </ThemedText>
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={{
                    textAlign: 'center',
                    marginTop: 4,
                    maxWidth: 260,
                  }}
                >
                  {Boolean(searchQuery)
                    ? `No peer conversations matching "${searchQuery}".`
                    : 'Start a private 1:1 conversation with any of the registered members.'}
                </ThemedText>
                <View style={{ marginTop: spacing.md, width: '100%', alignItems: 'center' }}>
                  {Boolean(searchQuery) ? (
                    <AppButton
                      title="Clear Search"
                      variant="outline"
                      size="sm"
                      onPress={() => setSearchQuery('')}
                    />
                  ) : (
                    <View style={{ width: '100%', gap: spacing.md }}>
                      {members.length > 0 ? (
                        <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.xs }}>
                          <ThemedText
                            variant="label"
                            tone="muted"
                            style={{ textAlign: 'center', marginBottom: 2 }}
                          >
                            REGISTERED MEMBERS (TAP TO MESSAGE)
                          </ThemedText>
                          {members.map((m) => (
                            <Pressable
                              key={m.id}
                              onPress={() => handleSelectMember(m)}
                              style={({ pressed }) => [
                                styles.emptyMemberCard,
                                {
                                  borderColor: colors.border,
                                  backgroundColor: colors.surfaceElevated,
                                  borderRadius: radius.md,
                                  padding: spacing.md,
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}
                            >
                              <View style={styles.emptyMemberRow}>
                                <AppAvatar name={m.displayName} size="md" isOnline={m.isOnline} />
                                <View style={{ flex: 1, marginLeft: spacing.md }}>
                                  <ThemedText variant="bodyMedium" tone="primary">
                                    {m.displayName}
                                  </ThemedText>
                                  <ThemedText variant="caption" tone="secondary">
                                    @{m.username}
                                  </ThemedText>
                                </View>
                                <AppButton
                                  title="Chat"
                                  variant="primary"
                                  size="sm"
                                  onPress={() => handleSelectMember(m)}
                                  loading={isCreatingChat}
                                />
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      ) : (
                        <AppButton
                          title="Start Conversation"
                          variant="primary"
                          size="sm"
                          onPress={handleOpenNewChatModal}
                        />
                      )}
                    </View>
                  )}
                </View>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Start New Conversation Modal */}
        <Modal
          visible={isModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <ThemedText variant="h3" tone="primary">
                    New Conversation
                  </ThemedText>
                  <ThemedText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    Private 1:1 with registered member
                  </ThemedText>
                </View>
                <Pressable
                  hitSlop={12}
                  onPress={() => setIsModalOpen(false)}
                  style={({ pressed }) => [
                    styles.modalCloseBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close member selector"
                >
                  <AppIcon name="close" size={16} color={colors.text} />
                </Pressable>
              </View>

              {/* Error Banner */}
              {Boolean(createChatError) ? (
                <View
                  style={[
                    styles.modalErrorBanner,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      padding: spacing.sm,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <ThemedText variant="caption" tone="primary" style={{ textAlign: 'center' }}>
                    {createChatError}
                  </ThemedText>
                </View>
              ) : null}

              {/* Member Search Bar */}
              <View style={{ marginTop: spacing.md }}>
                <AppTextInput
                  placeholder="Filter members…"
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                  onClear={() => setMemberSearchQuery('')}
                  containerStyle={{ marginBottom: spacing.sm }}
                />
              </View>

              {/* Members List */}
              {Boolean(isLoadingMembers) ? (
                <View style={[styles.centeredLoading, { padding: spacing.xl }]}>
                  <ActivityIndicator size="small" color={colors.text} />
                </View>
              ) : (
                <FlatList
                  data={filteredMembers}
                  keyExtractor={(item) => item.id}
                  style={styles.membersList}
                  renderItem={({ item }) => {
                    const existingConv = conversations.find(
                      (c) => c.participantId === item.id
                    );

                    return (
                      <Pressable
                        onPress={() => handleSelectMember(item)}
                        disabled={isCreatingChat}
                        style={({ pressed }) => [
                          styles.memberRow,
                          {
                            borderColor: colors.border,
                            backgroundColor: pressed
                              ? colors.surfaceSecondary
                              : 'transparent',
                            borderRadius: radius.md,
                            padding: spacing.sm,
                          },
                        ]}
                      >
                        <AppAvatar
                          name={item.displayName}
                          size="md"
                          isOnline={item.isOnline}
                        />
                        <View style={styles.memberInfo}>
                          <ThemedText variant="bodyMedium" tone="primary" numberOfLines={1}>
                            {item.displayName}
                          </ThemedText>
                          <ThemedText variant="caption" tone="muted" numberOfLines={1}>
                            @{item.username}
                          </ThemedText>
                        </View>
                        {Boolean(existingConv) ? (
                          <View
                            style={[
                              styles.activeBadge,
                              {
                                borderColor: colors.border,
                                backgroundColor: colors.surfaceSecondary,
                                borderRadius: radius.xs,
                              },
                            ]}
                          >
                            <ThemedText variant="label" tone="muted">
                              OPEN
                            </ThemedText>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                      <ThemedText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                        {Boolean(memberSearchQuery)
                          ? 'No matching members found.'
                          : 'No other registered members found.'}
                      </ThemedText>
                      <ThemedText
                        variant="caption"
                        tone="muted"
                        style={{ textAlign: 'center', marginTop: 4, maxWidth: 240 }}
                      >
                        Up to 10 registered members can participate in this closed circle.
                      </ThemedText>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
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
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerAction: {
    width: 36,
    height: 36,
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
  centeredLoading: {
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalErrorBanner: {
    marginTop: 12,
    borderWidth: 1,
  },
  membersList: {
    maxHeight: 280,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activeBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emptyMemberCard: {
    borderWidth: 1,
    width: '100%',
  },
  emptyMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  matchedMessagesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  matchedMessagesHeader: {
    marginBottom: 8,
  },
  matchedMessageCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  matchedMessageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});
