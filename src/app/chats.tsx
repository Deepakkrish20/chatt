import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ThemedText,
  ConversationItem,
  AppIcon,
  AppTextInput,
  AppButton,
  AppAvatar,
  CurvedWaveHeader,
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
  sendChatRequest,
  respondChatRequest,
  fetchIncomingChatRequests,
  fetchOutgoingChatRequests,
  fetchUserConnectionMap,
  subscribeToChatRequests,
  disconnectOrCancelRequest,
} from '@/lib/supabase';
import {
  ConversationParticipantProfile,
  ChatRequestWithProfile,
  UserConnectionState,
} from '@/lib/supabase/types';
import { DirectConversationPreview } from '@/types';
import { useSecurity } from '@/context/SecurityContext';
import { DECOY_CONVERSATIONS } from '@/data/decoyData';

export default function ChatListScreen() {
  const { colors, spacing, radius, isDark } = useAppTheme();
  const { user, refreshCapacity } = useAuth();
  const { chameleonMode } = useSecurity();

  const isDecoy = chameleonMode === 'decoy';
  const currentUserId = user?.id || '';

  // Tab state: 'chats' | 'requests'
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  // Filter pills state matching Screen 2: 'all' | 'unread' | 'requests'
  const [filterPill, setFilterPill] = useState<'all' | 'unread' | 'requests'>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Conversations states
  const [conversations, setConversations] = useState<DirectConversationPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Deep search states
  const [matchedDeepMessages, setMatchedDeepMessages] = useState<MatchedMessageItem[]>([]);
  const [matchedDeepConvs, setMatchedDeepConvs] = useState<DirectConversationPreview[]>([]);

  // Requests and connections states
  const [connectionMap, setConnectionMap] = useState<
    Record<string, { status: UserConnectionState; requestId: string }>
  >({});
  const [incomingRequests, setIncomingRequests] = useState<ChatRequestWithProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ChatRequestWithProfile[]>([]);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  // Discover & connect modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<ConversationParticipantProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [modalFeedback, setModalFeedback] = useState<string>('');

  // Disconnect & cancel modal states
  const [disconnectModalPeer, setDisconnectModalPeer] = useState<ConversationParticipantProfile | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    if (isDecoy) {
      setConversations(DECOY_CONVERSATIONS);
      setMembers([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setIsLoading(false);
      return;
    }

    if (!currentUserId) return;
    try {
      const [convList, memberList, connMap, incoming, outgoing] = await Promise.all([
        fetchConversations(currentUserId),
        fetchRegisteredMembers(currentUserId),
        fetchUserConnectionMap(currentUserId),
        fetchIncomingChatRequests(currentUserId),
        fetchOutgoingChatRequests(currentUserId),
      ]);
      setConversations(convList);
      setMembers(memberList);
      setConnectionMap(connMap);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch {
      // Data fetch fallback
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, isDecoy]);

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      if ((currentUserId || isDecoy) && isMounted) {
        loadData();
      } else if (isMounted) {
        setIsLoading(false);
      }
    }, 0);

    if (currentUserId && !isDecoy) {
      // Realtime listener for conversations
      const unsubConvs = subscribeToConversationsList(currentUserId, () => {
        fetchConversations(currentUserId).then((list) => {
          if (isMounted) setConversations(list);
        });
      });

      // Realtime listener for chat requests
      const unsubRequests = subscribeToChatRequests(currentUserId, () => {
        Promise.all([
          fetchConversations(currentUserId),
          fetchUserConnectionMap(currentUserId),
          fetchIncomingChatRequests(currentUserId),
          fetchOutgoingChatRequests(currentUserId),
        ]).then(([convList, connMap, incoming, outgoing]) => {
          if (isMounted) {
            setConversations(convList);
            setConnectionMap(connMap);
            setIncomingRequests(incoming);
            setOutgoingRequests(outgoing);
          }
        });
      });

      return () => {
        isMounted = false;
        clearTimeout(timer);
        unsubConvs();
        unsubRequests();
      };
    } else {
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [currentUserId, loadData, isDecoy]);



  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshCapacity()]);
    setRefreshing(false);
  };

  // Deep search effect
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

  // Open modal
  const handleOpenNewChatModal = async () => {
    setIsModalOpen(true);
    setIsLoadingMembers(true);
    setMemberSearchQuery('');
    setModalFeedback('');

    const [registered, connMap] = await Promise.all([
      fetchRegisteredMembers(currentUserId),
      fetchUserConnectionMap(currentUserId),
    ]);
    setMembers(registered);
    setConnectionMap(connMap);
    setIsLoadingMembers(false);
  };

  // Send request action
  const handleSendRequestToMember = async (member: ConversationParticipantProfile) => {
    setActionLoadingMap((prev) => ({ ...prev, [member.id]: true }));
    setModalFeedback('');

    // Optimistic UI state
    setConnectionMap((prev) => ({
      ...prev,
      [member.id]: { status: 'pending_sent', requestId: `temp_${Date.now()}` },
    }));

    const result = await sendChatRequest(member.id, currentUserId);
    setActionLoadingMap((prev) => ({ ...prev, [member.id]: false }));

    if (result.success) {
      setModalFeedback(`Request sent to ${member.displayName}!`);
      // Background sync
      Promise.all([
        fetchUserConnectionMap(currentUserId),
        fetchOutgoingChatRequests(currentUserId),
        fetchConversations(currentUserId),
      ]).then(([connMap, outgoing, convList]) => {
        setConnectionMap(connMap);
        setOutgoingRequests(outgoing);
        setConversations(convList);
      });
    } else {
      setModalFeedback(result.error || 'Failed to send request.');
      // Revert on failure
      const freshMap = await fetchUserConnectionMap(currentUserId);
      setConnectionMap(freshMap);
    }
  };

  // Accept request action
  const handleAcceptRequest = async (
    requestId: string,
    peer: ConversationParticipantProfile
  ) => {
    setActionLoadingMap((prev) => ({ ...prev, [peer.id]: true }));

    // Optimistic UI update
    setConnectionMap((prev) => ({
      ...prev,
      [peer.id]: { status: 'accepted', requestId },
    }));
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));

    const result = await respondChatRequest(requestId, 'accepted', currentUserId, peer.id);
    setActionLoadingMap((prev) => ({ ...prev, [peer.id]: false }));

    if (result.success) {
      await Promise.all([loadData(), refreshCapacity()]);
      if (result.conversationId) {
        setIsModalOpen(false);
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: result.conversationId,
            name: peer.displayName,
            online: peer.isOnline ? 'true' : 'false',
            participantId: peer.id,
          },
        });
      }
    } else {
      // Revert
      await loadData();
    }
  };

  // Decline request action
  const handleDeclineRequest = async (
    requestId: string,
    peer: ConversationParticipantProfile
  ) => {
    setActionLoadingMap((prev) => ({ ...prev, [peer.id]: true }));

    // Optimistic removal
    setConnectionMap((prev) => ({
      ...prev,
      [peer.id]: { status: 'declined', requestId },
    }));
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));

    await respondChatRequest(requestId, 'declined', currentUserId, peer.id);
    setActionLoadingMap((prev) => ({ ...prev, [peer.id]: false }));

    await loadData();
  };

  // Cancel sent request action
  const handleCancelRequest = async (member: ConversationParticipantProfile) => {
    if (!currentUserId || !member.id) return;
    setActionLoadingMap((prev) => ({ ...prev, [member.id]: true }));
    const res = await disconnectOrCancelRequest(member.id, currentUserId);
    setActionLoadingMap((prev) => ({ ...prev, [member.id]: false }));
    if (res.success) {
      setModalFeedback(`Request to ${member.displayName} cancelled.`);
      await loadData();
    }
  };

  // Confirm disconnect action
  const handleConfirmDisconnect = async () => {
    if (!disconnectModalPeer || !currentUserId) return;
    const peer = disconnectModalPeer;
    setIsDisconnecting(true);
    setActionLoadingMap((prev) => ({ ...prev, [peer.id]: true }));
    const res = await disconnectOrCancelRequest(peer.id, currentUserId);
    setIsDisconnecting(false);
    setActionLoadingMap((prev) => ({ ...prev, [peer.id]: false }));
    setDisconnectModalPeer(null);
    if (res.success) {
      setModalFeedback(`Disconnected from ${peer.displayName}.`);
      await loadData();
    }
  };

  // Directly open chat with an accepted member
  const handleOpenChatWithMember = async (member: ConversationParticipantProfile) => {
    setIsModalOpen(false);
    const existing = conversations.find((c) => c.participantId === member.id);
    if (existing) {
      handleOpenConversation(existing);
      return;
    }

    const { conversationId } = await getOrCreateConversation(member.id, currentUserId);
    if (conversationId) {
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: conversationId,
          name: member.displayName,
          online: member.isOnline ? 'true' : 'false',
          participantId: member.id,
        },
      });
    }
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

  const activeConversations = useMemo(() => {
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

  const totalUnread = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [conversations]
  );

  const displayedConversations = useMemo(() => {
    if (filterPill === 'unread') {
      return activeConversations.filter((c) => c.unreadCount > 0);
    }
    return activeConversations;
  }, [filterPill, activeConversations]);

  // Filter members in modal
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (!memberSearchQuery.trim()) return true;
      const q = memberSearchQuery.toLowerCase();
      return m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
    });
  }, [members, memberSearchQuery]);

  // Render smart relationship action button
  const renderMemberAction = (member: ConversationParticipantProfile) => {
    const connInfo = connectionMap[member.id];
    const status = connInfo?.status || 'none';
    const requestId = connInfo?.requestId || '';
    const isLoadingAction = Boolean(actionLoadingMap[member.id]);

    if (status === 'accepted') {
      return (
        <View style={styles.actionButtonGroup}>
          <AppButton
            title="Chat 💬"
            variant="primary"
            size="sm"
            onPress={() => handleOpenChatWithMember(member)}
          />
          <AppButton
            title="Disconnect"
            variant="outline"
            size="sm"
            disabled={isLoadingAction}
            onPress={() => setDisconnectModalPeer(member)}
          />
        </View>
      );
    }

    if (status === 'pending_sent') {
      return (
        <View style={styles.actionButtonGroup}>
          <View
            style={[
              styles.pendingBadge,
              { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <ThemedText variant="captionMedium" style={{ color: '#C084FC', fontWeight: '600' }}>
              Requested ⏳
            </ThemedText>
          </View>
          <AppButton
            title="Cancel"
            variant="ghost"
            size="sm"
            loading={isLoadingAction}
            onPress={() => handleCancelRequest(member)}
          />
        </View>
      );
    }

    if (status === 'pending_received') {
      return (
        <View style={styles.actionButtonGroup}>
          <AppButton
            title="Accept"
            variant="primary"
            size="sm"
            loading={isLoadingAction}
            onPress={() => handleAcceptRequest(requestId, member)}
          />
          <AppButton
            title="Decline"
            variant="outline"
            size="sm"
            disabled={isLoadingAction}
            onPress={() => handleDeclineRequest(requestId, member)}
          />
        </View>
      );
    }

    return (
      <AppButton
        title={status === 'declined' ? 'Connect' : '+ Connect'}
        variant="outline"
        size="sm"
        loading={isLoadingAction}
        onPress={() => handleSendRequestToMember(member)}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Curved Midnight Wave Top Header (Matching Screen 2) */}
      <CurvedWaveHeader variant="chats">
        <View style={styles.headerInnerContainer}>
          {/* Top indicator dash */}
          <View style={styles.indicatorDash} />

          {/* Title and Top Actions Row */}
          <View style={styles.titleActionRow}>
            <ThemedText variant="display" style={styles.screenTitle}>
              {isDecoy ? 'Messages' : 'Chats'}
            </ThemedText>

            <View style={styles.headerRightActions}>
              {/* Search Toggle Icon */}
              <Pressable
                hitSlop={10}
                onPress={() => setIsSearchOpen((prev) => !prev)}
                style={({ pressed }) => [styles.headerIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Toggle Search"
              >
                <AppIcon name="search" size={20} color="#FFFFFF" />
              </Pressable>

              {/* Discover & Connect Ice-Blue Squircle "+" Button */}
              {!isDecoy ? (
                <Pressable
                  hitSlop={10}
                  onPress={handleOpenNewChatModal}
                  style={({ pressed }) => [
                    styles.plusSquareBtn,
                    { backgroundColor: isDark ? '#38BDF8' : '#DBEAFE' },
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Discover & Connect"
                >
                  <AppIcon name="plus" size={18} color={isDark ? '#000000' : '#0B101B'} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Filter Pills Row (Exact layout matching Screen 2, preserving Requests feature) */}
          <View style={styles.filterPillsRow}>
            <Pressable
              onPress={() => {
                setFilterPill('all');
                setActiveTab('chats');
              }}
              style={[
                styles.filterPill,
                activeTab === 'chats' && filterPill === 'all' && [
                  styles.filterPillActive,
                  { backgroundColor: isDark ? '#38BDF8' : '#DBEAFE' },
                ],
              ]}
            >
              <ThemedText
                variant="bodyMedium"
                style={[
                  styles.filterPillText,
                  { color: colors.textMuted },
                  activeTab === 'chats' && filterPill === 'all' && {
                    color: isDark ? '#000000' : '#0F172A',
                    fontWeight: '700',
                  },
                ]}
              >
                All
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => {
                setFilterPill('unread');
                setActiveTab('chats');
              }}
              style={[
                styles.filterPill,
                activeTab === 'chats' && filterPill === 'unread' && [
                  styles.filterPillActive,
                  { backgroundColor: isDark ? '#38BDF8' : '#DBEAFE' },
                ],
              ]}
            >
              <ThemedText
                variant="bodyMedium"
                style={[
                  styles.filterPillText,
                  { color: colors.textMuted },
                  activeTab === 'chats' && filterPill === 'unread' && {
                    color: isDark ? '#000000' : '#0F172A',
                    fontWeight: '700',
                  },
                ]}
              >
                Unread {totalUnread > 0 ? `(${totalUnread})` : ''}
              </ThemedText>
            </Pressable>

            {!isDecoy ? (
              <Pressable
                onPress={() => {
                  setFilterPill('requests');
                  setActiveTab('requests');
                }}
                style={[
                  styles.filterPill,
                  activeTab === 'requests' && [
                    styles.filterPillActive,
                    { backgroundColor: isDark ? '#38BDF8' : '#DBEAFE' },
                  ],
                ]}
              >
                <View style={styles.requestsPillContent}>
                  <ThemedText
                    variant="bodyMedium"
                    style={[
                      styles.filterPillText,
                      { color: colors.textMuted },
                      activeTab === 'requests' && {
                        color: isDark ? '#000000' : '#0F172A',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    Requests
                  </ThemedText>
                  {incomingRequests.length > 0 ? (
                    <View style={styles.requestsBadge}>
                      <ThemedText style={styles.requestsBadgeText}>
                        {incomingRequests.length}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>
      </CurvedWaveHeader>

      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        {/* Search Input Bar (smooth toggle or active search) */}
        {(isSearchOpen || Boolean(searchQuery)) && (
          <View
            style={[
              styles.searchContainer,
              { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
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
        )}

        {activeTab === 'chats' ? (
          <>
            {/* Conversation List */}
            {Boolean(isLoading) ? (
              <View style={[styles.centeredLoading, { padding: spacing.xl }]}>
                <ActivityIndicator size="small" color={colors.text} />
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{ marginTop: spacing.sm, textAlign: 'center' }}
                >
                  Loading conversations…
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={displayedConversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ConversationItem
                    conversation={item}
                    onPress={() => handleOpenConversation(item)}
                  />
                )}
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { paddingHorizontal: spacing.xl }]}>
                    <View
                      style={[
                        styles.emptyIconContainer,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: radius.full,
                        },
                      ]}
                    >
                      <AppIcon name="user" size={24} color={colors.textMuted} />
                    </View>
                    <ThemedText
                      variant="h3"
                      tone="primary"
                      style={{ marginTop: spacing.md, textAlign: 'center' }}
                    >
                      {Boolean(searchQuery) ? 'No Results Found' : 'No Connected Chats Yet'}
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      tone="muted"
                      style={{
                        textAlign: 'center',
                        marginTop: 4,
                        maxWidth: 280,
                        lineHeight: 18,
                      }}
                    >
                      {Boolean(searchQuery)
                        ? `No conversations matching "${searchQuery}".`
                        : 'Chatt operates on mutual consent. Connect with registered members below to begin speaking.'}
                    </ThemedText>

                    <View style={{ marginTop: spacing.lg, width: '100%', alignItems: 'center' }}>
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
                            <View style={{ width: '100%', gap: spacing.sm }}>
                              <ThemedText
                                variant="label"
                                tone="muted"
                                style={{ textAlign: 'center', marginBottom: 4 }}
                              >
                                REGISTERED MEMBERS
                              </ThemedText>
                              {members.map((m) => (
                                <View
                                  key={m.id}
                                  style={[
                                    styles.emptyMemberCard,
                                    {
                                      borderColor: 'rgba(168, 85, 247, 0.25)',
                                      backgroundColor: colors.surfaceElevated,
                                      borderRadius: radius.md,
                                      padding: spacing.md,
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
                                    {renderMemberAction(m)}
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <AppButton
                              title="Discover Members"
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
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        ) : (
          /* Requests View (Incoming & Outgoing) */
          <FlatList
            data={incomingRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { padding: spacing.md }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.text}
                colors={[colors.text]}
                progressBackgroundColor={colors.surfaceSecondary}
              />
            }
            ListHeaderComponent={
              incomingRequests.length > 0 ? (
                <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
                  INCOMING CHAT REQUESTS ({incomingRequests.length})
                </ThemedText>
              ) : undefined
            }
            renderItem={({ item }) => {
              const peer = item.sender || {
                id: item.sender_id,
                username: 'member',
                displayName: 'Member',
                avatarUrl: null,
                isOnline: false,
              };
              const isLoadingAction = Boolean(actionLoadingMap[peer.id]);

              return (
                <View
                  style={[
                    styles.requestCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: 20,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.3 : 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    },
                  ]}
                >
                  <View style={styles.emptyMemberRow}>
                    <AppAvatar name={peer.displayName} size="md" isOnline={peer.isOnline} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <ThemedText variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                        {peer.displayName}
                      </ThemedText>
                      <ThemedText variant="caption" style={{ color: colors.textMuted }}>
                        @{peer.username}
                      </ThemedText>
                      <ThemedText variant="label" style={{ color: colors.textMuted, marginTop: 2 }}>
                        Wants to connect with you
                      </ThemedText>
                    </View>
                    <View style={styles.actionButtonGroup}>
                      <AppButton
                        title="Accept"
                        variant="primary"
                        size="sm"
                        loading={isLoadingAction}
                        onPress={() => handleAcceptRequest(item.id, peer)}
                      />
                      <AppButton
                        title="Decline"
                        variant="outline"
                        size="sm"
                        disabled={isLoadingAction}
                        onPress={() => handleDeclineRequest(item.id, peer)}
                      />
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { paddingHorizontal: spacing.xl }]}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <AppIcon name="mail" size={24} color={colors.textMuted} />
                </View>
                <ThemedText
                  variant="h3"
                  tone="primary"
                  style={{ marginTop: spacing.md, textAlign: 'center' }}
                >
                  No Pending Requests
                </ThemedText>
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{
                    textAlign: 'center',
                    marginTop: 4,
                    maxWidth: 280,
                    lineHeight: 18,
                  }}
                >
                  When someone requests permission to chat with you, you will see it here.
                </ThemedText>
                <View style={{ marginTop: spacing.lg }}>
                  <AppButton
                    title="Discover Members"
                    variant="primary"
                    size="sm"
                    onPress={handleOpenNewChatModal}
                  />
                </View>
              </View>
            }
            ListFooterComponent={
              outgoingRequests.length > 0 ? (
                <View style={{ marginTop: spacing.xl }}>
                  <ThemedText variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
                    SENT REQUESTS ({outgoingRequests.length})
                  </ThemedText>
                  {outgoingRequests.map((req) => {
                    const peer = req.receiver || {
                      id: req.receiver_id,
                      username: 'member',
                      displayName: 'Member',
                      avatarUrl: null,
                      isOnline: false,
                    };
                    return (
                      <View
                        key={req.id}
                        style={[
                          styles.requestCard,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceElevated,
                            borderRadius: 20,
                            padding: spacing.md,
                            marginBottom: spacing.sm,
                            shadowColor: '#000000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: isDark ? 0.3 : 0.04,
                            shadowRadius: 4,
                            elevation: 1,
                          },
                        ]}
                      >
                        <View style={styles.emptyMemberRow}>
                          <AppAvatar name={peer.displayName} size="md" isOnline={peer.isOnline} />
                          <View style={{ flex: 1, marginLeft: spacing.md }}>
                            <ThemedText variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                              {peer.displayName}
                            </ThemedText>
                            <ThemedText variant="caption" style={{ color: colors.textMuted }}>
                              @{peer.username}
                            </ThemedText>
                          </View>
                          <View style={styles.actionButtonGroup}>
                            <View
                              style={[
                                styles.pendingBadge,
                                {
                                  borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#BFDBFE',
                                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#DBEAFE',
                                },
                              ]}
                            >
                              <ThemedText variant="captionMedium" style={{ color: isDark ? '#38BDF8' : '#1E40AF', fontWeight: '600' }}>
                                Pending ⏳
                              </ThemedText>
                            </View>
                            <AppButton
                              title="Cancel"
                              variant="outline"
                              size="sm"
                              loading={Boolean(actionLoadingMap[peer.id])}
                              onPress={() => handleCancelRequest(peer)}
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : undefined
            }
          />
        )}

        {/* Floating Midnight Navigation Bar (Exact match with Screen 2) */}
        <View style={styles.floatingNavWrapper} pointerEvents="box-none">
          <View
            style={[
              styles.floatingNavBar,
              {
                backgroundColor: colors.floatingNavBg,
                borderColor: isDark ? '#1E2533' : 'transparent',
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            {/* 1. Chats Tab */}
            <Pressable
              onPress={() => {
                setFilterPill('all');
                setActiveTab('chats');
              }}
              style={({ pressed }) => [
                activeTab === 'chats' ? [styles.navTabPillActive, { backgroundColor: isDark ? '#2563EB' : '#DBEAFE' }] : styles.navTabItem,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Chats tab"
            >
              <AppIcon
                name="chat-bubble"
                size={20}
                color={activeTab === 'chats' ? (isDark ? '#FFFFFF' : '#0B101B') : colors.textMuted}
              />
            </Pressable>

            {/* 2. Connections / Requests Tab */}
            <Pressable
              onPress={() => {
                if (!isDecoy) {
                  setFilterPill('requests');
                  setActiveTab('requests');
                }
              }}
              style={({ pressed }) => [
                activeTab === 'requests' ? [styles.navTabPillActive, { backgroundColor: isDark ? '#2563EB' : '#DBEAFE' }] : styles.navTabItem,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Connections tab"
            >
              <AppIcon
                name="users"
                size={20}
                color={activeTab === 'requests' ? (isDark ? '#FFFFFF' : '#0B101B') : colors.textMuted}
              />
              {incomingRequests.length > 0 ? <View style={styles.navDotIndicator} /> : null}
            </Pressable>

            {/* 3. Security / Chameleon Lock Tab */}
            <Pressable
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.navTabItem, { opacity: pressed ? 0.8 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Security settings"
            >
              <AppIcon name="lock" size={19} color={colors.textMuted} />
            </Pressable>

            {/* 4. Profile / Settings Tab */}
            <Pressable
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.navTabItem, { opacity: pressed ? 0.8 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Profile settings"
            >
              <AppIcon name="user" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Discover & Connect Modal */}
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
                  borderRadius: 24,
                  padding: spacing.lg,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isDark ? 0.4 : 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <ThemedText variant="h3" tone="primary" style={{ color: colors.text, fontWeight: '700' }}>
                    Discover Members
                  </ThemedText>
                  <ThemedText variant="caption" tone="muted" style={{ marginTop: 2, color: colors.textMuted }}>
                    Request permission to speak
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

              {/* Feedback Banner */}
              {Boolean(modalFeedback) ? (
                <View
                  style={[
                    styles.modalFeedbackBanner,
                    {
                      borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#BFDBFE',
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                      padding: spacing.sm,
                      borderRadius: radius.sm,
                      marginTop: spacing.sm,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    style={{ textAlign: 'center', color: isDark ? '#38BDF8' : '#1E40AF' }}
                  >
                    {modalFeedback}
                  </ThemedText>
                </View>
              ) : null}

              {/* Member Search Bar */}
              <View style={{ marginTop: spacing.md }}>
                <AppTextInput
                  placeholder="Search by name or @username…"
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
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.memberRow,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: radius.md,
                          padding: spacing.sm,
                        },
                      ]}
                    >
                      <AppAvatar name={item.displayName} size="md" isOnline={item.isOnline} />
                      <View style={styles.memberInfo}>
                        <ThemedText variant="bodyMedium" tone="primary" numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>
                          {item.displayName}
                        </ThemedText>
                        <ThemedText variant="caption" tone="muted" numberOfLines={1} style={{ color: colors.textMuted }}>
                          @{item.username}
                        </ThemedText>
                      </View>
                      {renderMemberAction(item)}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                      <ThemedText
                        variant="caption"
                        tone="secondary"
                        style={{ textAlign: 'center', color: colors.textMuted }}
                      >
                        {Boolean(memberSearchQuery)
                          ? 'No matching members found.'
                          : 'No other registered members found.'}
                      </ThemedText>
                      <ThemedText
                        variant="caption"
                        tone="muted"
                        style={{ textAlign: 'center', marginTop: 4, maxWidth: 240, color: colors.textMuted }}
                      >
                        Connect with people to begin private, encrypted conversations.
                      </ThemedText>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Disconnect Member Confirmation Modal */}
        <Modal
          visible={Boolean(disconnectModalPeer)}
          transparent
          animationType="fade"
          onRequestClose={() => setDisconnectModalPeer(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2',
                  borderRadius: 24,
                  padding: spacing.lg,
                  maxWidth: 380,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isDark ? 0.4 : 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}
            >
              <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    {
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                      marginBottom: spacing.sm,
                      borderRadius: 24,
                    },
                  ]}
                >
                  <AppIcon name="lock" size={24} color="#EF4444" />
                </View>
                <ThemedText variant="h3" style={{ textAlign: 'center', color: colors.text, fontWeight: '700' }}>
                  Disconnect Connection?
                </ThemedText>
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={{ textAlign: 'center', marginTop: 6, lineHeight: 18, color: colors.textMuted }}
                >
                  Are you sure you want to disconnect from {disconnectModalPeer?.displayName}? You will revoke messaging permissions. You can connect again whenever needed.
                </ThemedText>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Cancel"
                    variant="outline"
                    disabled={isDisconnecting}
                    onPress={() => setDisconnectModalPeer(null)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title={isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                    variant="primary"
                    loading={isDisconnecting}
                    onPress={handleConfirmDisconnect}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerInnerContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  indicatorDash: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  titleActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusSquareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: '#DBEAFE',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  requestsPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestsBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  floatingNavWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  floatingNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0B101B',
    width: '90%',
    maxWidth: 360,
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  navTabItem: {
    width: 52,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navTabPillActive: {
    width: 52,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDotIndicator: {
    position: 'absolute',
    top: 6,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusFab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    gap: 20,
  },
  tabItem: {
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontWeight: '600',
  },
  notificationBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    width: '100%',
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 110,
    paddingTop: 8,
  },
  centeredLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFeedbackBanner: {
    borderWidth: 1,
  },
  membersList: {
    maxHeight: 290,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
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
  requestCard: {
    borderWidth: 1,
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
