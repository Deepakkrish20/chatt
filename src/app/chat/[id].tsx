import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  ScreenHeader,
  AppAvatar,
  MessageBubble,
  MessageComposer,
  AppIcon,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMessages,
  sendDirectMessage,
  subscribeToConversationMessages,
  markConversationAsRead,
  deleteMessageForEveryone,
  deleteMessageForMe,
  isMessageWithinOneHour,
  getRemainingDeleteTime,
  toggleMessageReaction,
  sendTypingStatus,
  supabase,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { DirectMessage } from '@/types';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export default function PrivateChatScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { user, profile, recordActivity } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    online?: string;
    participantId?: string;
    query?: string;
  }>();

  const conversationId = params.id || 'conv_1';
  const currentUserId = user?.id || '';

  // Peer resolution: Ensure user NEVER sees their own profile as the peer
  const myNames = [
    profile?.display_name?.toLowerCase(),
    profile?.username?.toLowerCase(),
    user?.user_metadata?.displayName?.toLowerCase(),
    user?.user_metadata?.username?.toLowerCase(),
    user?.email?.split('@')[0]?.toLowerCase(),
  ].filter(Boolean) as string[];

  const isParamMyOwnName = Boolean(params.name && myNames.includes(params.name.trim().toLowerCase()));

  const defaultPeerName = (profile?.username || user?.email || '').toLowerCase().includes('jana')
    ? 'krish'
    : 'Jana Thiru';

  const [participantName, setParticipantName] = useState(
    isParamMyOwnName || !params.name ? defaultPeerName : params.name
  );
  const [isOnline, setIsOnline] = useState(params.online === 'true');

  // Load actual peer profile if conversation is on Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !conversationId || conversationId.startsWith('conv_') || !currentUserId) {
      return;
    }
    let isMounted = true;
    supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .maybeSingle()
      .then(async ({ data: conv }) => {
        if (!isMounted || !conv) return;
        const otherId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
        if (!otherId) return;
        const { data: peerProf } = await supabase
          .from('profiles')
          .select('display_name, username, status')
          .eq('id', otherId)
          .maybeSingle();
        if (isMounted && peerProf?.display_name) {
          setParticipantName(peerProf.display_name);
          setIsOnline(peerProf.status === 'online');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId]);

  // Resolve real conversation UUID if opened with stale 'conv_*' parameter
  useEffect(() => {
    if (!isSupabaseConfigured || !conversationId || !conversationId.startsWith('conv_') || !currentUserId) {
      return;
    }
    supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .limit(1)
      .then(({ data: convs }) => {
        if (convs && convs.length > 0) {
          const realId = convs[0].id;
          router.replace({
            pathname: '/chat/[id]',
            params: {
              id: realId,
              name: participantName,
              online: isOnline ? 'true' : 'false',
            },
          });
        }
      });
  }, [conversationId, currentUserId, participantName, isOnline]);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<DirectMessage | null>(null);
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList<DirectMessage>>(null);

  // In-Chat Message Search States
  const [isSearchActive, setIsSearchActive] = useState(Boolean(params.query));
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Calculate indices of messages matching the search keyword
  const matchingIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const indices: number[] = [];
    messages.forEach((m, idx) => {
      if (!m.isDeletedForEveryone && m.content.toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [messages, searchQuery]);

  // Navigate to matching messages
  const handleNextMatch = () => {
    if (matchingIndices.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchingIndices.length;
    setCurrentMatchIdx(nextIdx);
    const targetIdx = matchingIndices[nextIdx];
    flatListRef.current?.scrollToIndex({
      index: targetIdx,
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handlePrevMatch = () => {
    if (matchingIndices.length === 0) return;
    const prevIdx =
      (currentMatchIdx - 1 + matchingIndices.length) % matchingIndices.length;
    setCurrentMatchIdx(prevIdx);
    const targetIdx = matchingIndices[prevIdx];
    flatListRef.current?.scrollToIndex({
      index: targetIdx,
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setCurrentMatchIdx(0);
  };

  // Scroll to latest match when search query changes
  useEffect(() => {
    if (matchingIndices.length > 0) {
      const timer = setTimeout(() => {
        setCurrentMatchIdx(matchingIndices.length - 1);
        flatListRef.current?.scrollToIndex({
          index: matchingIndices[matchingIndices.length - 1],
          animated: true,
          viewPosition: 0.5,
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [matchingIndices]);

  useEffect(() => {
    let isMounted = true;

    fetchMessages(conversationId, currentUserId, participantName).then((history) => {
      if (isMounted) {
        setMessages(history);
        setIsLoading(false);
        markConversationAsRead(conversationId, currentUserId);
      }
    });

    // Subscribe to live incoming messages, auto-sync history, real-time message deletions, reactions & typing status
    const unsubscribe = subscribeToConversationMessages(
      conversationId,
      currentUserId,
      participantName,
      (newMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
        markConversationAsRead(conversationId, currentUserId);
      },
      (syncedHistory) => {
        if (!isMounted) return;
        setMessages(syncedHistory);
      },
      (deletedMessageId) => {
        if (!isMounted) return;
        // Real-time update when peer or system deletes a message for everyone
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deletedMessageId
              ? { ...m, content: 'This message was deleted', isDeletedForEveryone: true }
              : m
          )
        );
      },
      (updatedMessageId, reactions) => {
        if (!isMounted) return;
        // Real-time update when peer or current user adds/toggles an emoji reaction
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMessageId ? { ...m, reactions } : m
          )
        );
      },
      (readerId) => {
        if (!isMounted) return;
        // Peer opened the chat! Instant real-time upgrade from single tick to double tick
        setMessages((prev) =>
          prev.map((m) =>
            m.isOutgoing || m.senderId === currentUserId
              ? { ...m, status: 'read' }
              : m
          )
        );
      },
      (isTyping) => {
        if (!isMounted) return;
        setIsPeerTyping(isTyping);
        if (peerTypingTimeoutRef.current) {
          clearTimeout(peerTypingTimeoutRef.current);
        }
        if (isTyping) {
          // Automatic failsafe: clear typing indicator if peer disconnects or stops without packet
          peerTypingTimeoutRef.current = setTimeout(() => {
            if (isMounted) setIsPeerTyping(false);
          }, 3500);
        }
      }
    );

    return () => {
      isMounted = false;
      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
      }
      sendTypingStatus(conversationId, currentUserId, false);
      unsubscribe();
    };
  }, [conversationId, currentUserId, participantName]);

  const handleUserTyping = (isTyping: boolean) => {
    sendTypingStatus(conversationId, currentUserId, isTyping);
  };

  const handleOpenMessageOptions = (msg: DirectMessage) => {
    if (msg.id.startsWith('temp_')) return;
    setSelectedMessage(msg);
    setDeleteError(null);
    setIsActionModalOpen(true);
  };

  const handleDoubleTapMessage = (msg: DirectMessage) => {
    if (msg.id.startsWith('temp_') || msg.isDeletedForEveryone) return;
    setReactionTargetMessage(msg);
    setIsReactionModalOpen(true);
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!reactionTargetMessage) return;
    const targetMsgId = reactionTargetMessage.id;
    setIsReactionModalOpen(false);
    setReactionTargetMessage(null);

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== targetMsgId) return m;
        const existing = m.reactions || [];
        const userIdx = existing.findIndex((r) => r.userId === currentUserId);
        let updated;
        if (userIdx >= 0 && existing[userIdx].emoji === emoji) {
          updated = existing.filter((_, idx) => idx !== userIdx);
        } else if (userIdx >= 0) {
          updated = [...existing];
          updated[userIdx] = { emoji, userId: currentUserId };
        } else {
          updated = [...existing, { emoji, userId: currentUserId }];
        }
        return { ...m, reactions: updated };
      })
    );

    // Persist & broadcast
    await toggleMessageReaction(conversationId, targetMsgId, emoji, currentUserId);
    recordActivity();
  };

  const handleDeleteForEveryone = async () => {
    if (!selectedMessage || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteMessageForEveryone(
      conversationId,
      selectedMessage.id,
      currentUserId
    );

    setIsDeleting(false);

    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete message for everyone.');
      return;
    }

    // Instantly reflect in local state
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessage.id
          ? { ...m, content: 'This message was deleted', isDeletedForEveryone: true }
          : m
      )
    );

    setIsActionModalOpen(false);
    setSelectedMessage(null);
  };

  const handleDeleteForMe = async () => {
    if (!selectedMessage || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteMessageForMe(
      conversationId,
      selectedMessage.id,
      currentUserId
    );

    setIsDeleting(false);

    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete message for this account.');
      return;
    }

    // Instantly remove from view for this account
    setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));

    setIsActionModalOpen(false);
    setSelectedMessage(null);
  };

  // Auto scroll to bottom on message update
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [messages.length, isPeerTyping]);

  // Auto scroll to bottom when keyboard appears (like WhatsApp / Instagram)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // When keyboard is visible, soft keyboard provides bottom spacing.
  // When keyboard is closed, pad for navigation bar / gesture home indicator.
  const composerBottomInset = isKeyboardVisible ? 0 : Math.max(insets.bottom, 0);

  const handleSendMessage = async (content: string) => {
    if (isSending || !content.trim()) return;

    setIsSending(true);
    setSendError(null);

    // Optimistic local representation
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      conversationId,
      senderId: currentUserId || 'user_current',
      senderName: 'You',
      content: content.trim(),
      createdAt: 'Just now',
      isOutgoing: true,
      status: 'sent',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await sendDirectMessage(
      conversationId,
      content,
      currentUserId
    );

    setIsSending(false);

    if (error) {
      setSendError(error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    if (data) {
      // Replace optimistic entry with server-confirmed message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      recordActivity();
    }
  };

  const isSelectedMsgOutgoing =
    selectedMessage?.isOutgoing ||
    selectedMessage?.senderId === currentUserId;
  const isAlreadyDeletedForEveryone = Boolean(
    selectedMessage?.isDeletedForEveryone
  );
  const canDeleteForEveryone = Boolean(
    isSelectedMsgOutgoing &&
    !isAlreadyDeletedForEveryone &&
    selectedMessage &&
    isMessageWithinOneHour(selectedMessage)
  );
  const remainingTimeStr =
    selectedMessage && isSelectedMsgOutgoing && !isAlreadyDeletedForEveryone
      ? getRemainingDeleteTime(selectedMessage)
      : '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Contact Header */}
        <ScreenHeader
          title={participantName}
          subtitle={
            isPeerTyping
              ? 'Typing…'
              : isOnline
              ? 'Online • Verified Peer'
              : 'Offline • Direct Channel'
          }
          showBack
          onBack={() => router.back()}
          rightElement={
            <View style={styles.headerRightGroup}>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  setIsSearchActive((prev) => !prev);
                  if (isSearchActive) {
                    setSearchQuery('');
                  }
                }}
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  {
                    backgroundColor: isSearchActive ? colors.surfaceSecondary : 'transparent',
                    borderColor: isSearchActive ? colors.border : 'transparent',
                    borderWidth: 1,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Search messages in chat"
              >
                <AppIcon
                  name="search"
                  size={18}
                  color={isSearchActive ? '#38BDF8' : colors.text}
                />
              </Pressable>
              <AppAvatar
                name={participantName}
                size="sm"
                isOnline={isOnline}
              />
            </View>
          }
        />

        {/* In-Chat Message Search Bar */}
        {Boolean(isSearchActive) ? (
          <View
            style={[
              styles.inChatSearchContainer,
              {
                backgroundColor: colors.surfaceElevated,
                borderBottomColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View
              style={[
                styles.inChatSearchInputWrapper,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppIcon name="search" size={15} color={colors.textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search in conversation…"
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={[
                  typography.body,
                  styles.inChatSearchTextInput,
                  { color: colors.text },
                ]}
              />
              {Boolean(searchQuery) ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
                  <AppIcon name="close" size={13} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {/* Match Counter & Next/Prev Controls */}
            <View style={styles.inChatSearchNavGroup}>
              {Boolean(searchQuery.trim()) ? (
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={styles.matchCountText}
                >
                  {matchingIndices.length > 0
                    ? `${currentMatchIdx + 1}/${matchingIndices.length}`
                    : '0 found'}
                </ThemedText>
              ) : null}

              <Pressable
                disabled={matchingIndices.length === 0}
                onPress={handlePrevMatch}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.navArrowBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    opacity: pressed || matchingIndices.length === 0 ? 0.35 : 1,
                  },
                ]}
                accessibilityLabel="Previous match"
              >
                <AppIcon name="chevron-up" size={14} color={colors.text} />
              </Pressable>

              <Pressable
                disabled={matchingIndices.length === 0}
                onPress={handleNextMatch}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.navArrowBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    opacity: pressed || matchingIndices.length === 0 ? 0.35 : 1,
                  },
                ]}
                accessibilityLabel="Next match"
              >
                <AppIcon name="chevron-down" size={14} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={handleCloseSearch}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeSearchBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <ThemedText variant="captionMedium" style={{ color: '#38BDF8', marginLeft: 4 }}>
                  Done
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Security / Encryption Notice */}
        <View
          style={[
            styles.securityNotice,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <ThemedText variant="label" tone="muted" style={{ textAlign: 'center', letterSpacing: 0.5 }}>
              ENCRYPTED 1:1 CHANNEL • HARDWARE-ISOLATED
            </ThemedText>
          </View>
        </View>

        {/* Send Error Banner */}
        {Boolean(sendError) ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 2,
              },
            ]}
          >
            <ThemedText variant="caption" tone="primary" style={{ flex: 1 }}>
              {sendError}
            </ThemedText>
            <Pressable onPress={() => setSendError(null)} hitSlop={8}>
              <AppIcon name="close" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Message Thread */}
          {Boolean(isLoading) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.text} />
              <ThemedText
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.sm }}
              >
                Retrieving isolated messages…
              </ThemedText>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              }}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  animate={item.id.startsWith('temp_') || item.id.startsWith('m_reply_')}
                  onLongPress={() => handleOpenMessageOptions(item)}
                  onDoubleTap={() => handleDoubleTapMessage(item)}
                  searchKeyword={isSearchActive ? searchQuery : undefined}
                />
              )}
              contentContainerStyle={[
                styles.messageList,
                {
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.md,
                  paddingBottom: spacing.sm,
                  justifyContent: messages.length === 0 ? 'center' : undefined,
                },
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
                  <View
                    style={[
                      styles.emptyIconBox,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <AppIcon
                      name={isSearchActive && searchQuery ? 'search' : 'lock'}
                      size={24}
                      color={colors.text}
                    />
                  </View>
                  <ThemedText variant="bodyMedium" style={{ marginTop: spacing.md }}>
                    {isSearchActive && searchQuery
                      ? 'No matching messages'
                      : 'No messages yet'}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                    {isSearchActive && searchQuery
                      ? `No messages in this chat matched "${searchQuery}".`
                      : 'Send a private message to open this direct channel.'}
                  </ThemedText>
                </View>
              }
            />
          )}

          {/* Peer Typing Indicator */}
          {Boolean(isPeerTyping) ? (
            <View
              style={[
                styles.typingRow,
                { paddingHorizontal: spacing.md, marginBottom: spacing.xs },
              ]}
            >
              <View
                style={[
                  styles.typingBubble,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <ThemedText variant="label" tone="muted">
                  {participantName.split(' ')[0]} is typing…
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            onTyping={handleUserTyping}
            disabled={isSending}
            bottomInset={composerBottomInset}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* WhatsApp-Style Message Delete / Action Modal */}
      <Modal
        visible={isActionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setIsActionModalOpen(false);
            setSelectedMessage(null);
          }
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!isDeleting) {
              setIsActionModalOpen(false);
              setSelectedMessage(null);
            }
          }}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: 16,
                padding: spacing.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View
                style={[
                  styles.modalIconBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderSubtle,
                    borderRadius: 10,
                  },
                ]}
              >
                <AppIcon name="trash" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
                <ThemedText variant="h3" style={{ fontSize: 16 }}>
                  Delete Message
                </ThemedText>
                <ThemedText variant="caption" tone="secondary">
                  Choose how to remove this message
                </ThemedText>
              </View>
            </View>

            {/* Message Excerpt Preview */}
            {selectedMessage ? (
              <View
                style={[
                  styles.messagePreviewBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm + 3,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  tone="muted"
                  numberOfLines={2}
                  style={{ fontStyle: 'italic' }}
                >
                  {`"${selectedMessage.content}"`}
                </ThemedText>
                <ThemedText
                  variant="label"
                  tone="muted"
                  style={{ fontSize: 10, marginTop: 4, textAlign: 'right' }}
                >
                  Sent {selectedMessage.createdAt}
                </ThemedText>
              </View>
            ) : null}

            {/* Error Notification */}
            {Boolean(deleteError) ? (
              <View
                style={[
                  styles.modalErrorBox,
                  {
                    backgroundColor: '#200D10',
                    borderColor: '#881337',
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <ThemedText variant="caption" style={{ color: '#F43F5E' }}>
                  {deleteError}
                </ThemedText>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={{ marginTop: spacing.md }}>
              {/* Option 0: React to message (Quick reaction) */}
              {!isAlreadyDeletedForEveryone ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionOptionBtn,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => {
                    const target = selectedMessage;
                    setIsActionModalOpen(false);
                    setSelectedMessage(null);
                    if (target) {
                      setReactionTargetMessage(target);
                      setIsReactionModalOpen(true);
                    }
                  }}
                >
                  <View style={styles.actionOptionHeader}>
                    <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                      React to message
                    </ThemedText>
                    <ThemedText style={{ fontSize: 16 }}>❤️ 👍 😂</ThemedText>
                  </View>
                  <ThemedText
                    variant="caption"
                    tone="secondary"
                    style={{ marginTop: 3, fontSize: 11 }}
                  >
                    Quickly add or toggle an emoji reaction (also on double-tap)
                  </ThemedText>
                </Pressable>
              ) : null}

              {/* Option 1: Delete for everyone (Sender only, strictly within 1 hour) */}
              {isSelectedMsgOutgoing && !isAlreadyDeletedForEveryone ? (
                canDeleteForEveryone ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionOptionBtn,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                        opacity: pressed || isDeleting ? 0.7 : 1,
                      },
                    ]}
                    onPress={handleDeleteForEveryone}
                    disabled={isDeleting}
                  >
                    <View style={styles.actionOptionHeader}>
                      <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                        Delete for everyone
                      </ThemedText>
                      <View
                        style={[
                          styles.timeBadge,
                          {
                            backgroundColor: '#111827',
                            borderColor: '#1F2937',
                            borderRadius: radius.sm,
                          },
                        ]}
                      >
                        <ThemedText
                          variant="label"
                          style={{ fontSize: 10, color: '#38BDF8', fontWeight: '600' }}
                        >
                          {remainingTimeStr}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      variant="caption"
                      tone="secondary"
                      style={{ marginTop: 3, fontSize: 11 }}
                    >
                      Replaces this message for all participants • 1-hour window
                    </ThemedText>
                  </Pressable>
                ) : (
                  <View
                    style={[
                      styles.expiredNoticeBox,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.sm + 2,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="ban" size={13} color="#737373" />
                      <ThemedText
                        variant="caption"
                        style={{ color: '#737373', fontWeight: '600' }}
                      >
                        Delete for everyone expired
                      </ThemedText>
                    </View>
                    <ThemedText
                      variant="label"
                      tone="muted"
                      style={{ marginTop: 2, fontSize: 11 }}
                    >
                      Messages can only be deleted for everyone within 1 hour from sending.
                    </ThemedText>
                  </View>
                )
              ) : null}

              {/* Option 2: Delete for me (Always available, no time limit) */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionOptionBtn,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    opacity: pressed || isDeleting ? 0.7 : 1,
                  },
                ]}
                onPress={handleDeleteForMe}
                disabled={isDeleting}
              >
                <View style={styles.actionOptionHeader}>
                  <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                    Delete for me
                  </ThemedText>
                  <View
                    style={[
                      styles.timeBadge,
                      {
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="label"
                      style={{ fontSize: 10, color: '#A3A3A3', fontWeight: '600' }}
                    >
                      No time limit
                    </ThemedText>
                  </View>
                </View>
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={{ marginTop: 3, fontSize: 11 }}
                >
                  Removes this message only from your account. Other members still see it.
                </ThemedText>
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 2,
                    marginTop: spacing.xs,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => {
                  setIsActionModalOpen(false);
                  setSelectedMessage(null);
                }}
                disabled={isDeleting}
              >
                <ThemedText
                  variant="bodyMedium"
                  tone="secondary"
                  style={{ textAlign: 'center', fontWeight: '500' }}
                >
                  Cancel
                </ThemedText>
              </Pressable>
            </View>

            {/* Spinner Overlay */}
            {Boolean(isDeleting) ? (
              <View style={styles.busyOverlay}>
                <ActivityIndicator size="small" color={colors.text} />
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{ marginTop: spacing.xs }}
                >
                  Updating chat…
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* WhatsApp-Style Floating Reaction Picker Pop-up */}
      <Modal
        visible={isReactionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsReactionModalOpen(false);
          setReactionTargetMessage(null);
        }}
      >
        <Pressable
          style={styles.reactionBackdrop}
          onPress={() => {
            setIsReactionModalOpen(false);
            setReactionTargetMessage(null);
          }}
        >
          <Pressable
            style={[
              styles.reactionPopupCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: 16,
                padding: spacing.md,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.reactionPopupHeader}>
              <ThemedText
                variant="label"
                tone="muted"
                style={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 11 }}
              >
                Telemetry Reaction
              </ThemedText>
            </View>

            {/* Horizontal Emoji Bar */}
            <View style={styles.emojiRow}>
              {QUICK_REACTION_EMOJIS.map((emoji) => {
                const isSelectedByMe = reactionTargetMessage?.reactions?.some(
                  (r) => r.userId === currentUserId && r.emoji === emoji
                );

                return (
                  <Pressable
                    key={emoji}
                    onPress={() => handleSelectReaction(emoji)}
                    style={({ pressed }) => [
                      styles.emojiButton,
                      {
                        backgroundColor: isSelectedByMe
                          ? colors.surfaceSecondary
                          : 'transparent',
                        borderColor: isSelectedByMe ? colors.accent : 'transparent',
                        transform: [{ scale: pressed ? 1.25 : 1 }],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${emoji}`}
                  >
                    <ThemedText style={styles.popupEmojiText}>{emoji}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Message Excerpt Preview */}
            {reactionTargetMessage ? (
              <View
                style={[
                  styles.reactionMessagePreview,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs + 2,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  tone="muted"
                  numberOfLines={1}
                  style={{ fontStyle: 'italic' }}
                >
                  {`"${reactionTargetMessage.content}"`}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  securityNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flexGrow: 1,
  },
  typingRow: {
    flexDirection: 'row',
  },
  typingBubble: {
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagePreviewBox: {
    borderWidth: 1,
  },
  modalErrorBox: {
    borderWidth: 1,
  },
  actionOptionBtn: {
    borderWidth: 1,
  },
  actionOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  expiredNoticeBox: {
    borderWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  reactionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reactionPopupCard: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionPopupHeader: {
    marginBottom: 8,
    alignItems: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 6,
  },
  emojiButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupEmojiText: {
    fontSize: 24,
  },
  reactionMessagePreview: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inChatSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: 8,
  },
  inChatSearchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  inChatSearchTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  inChatSearchNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchCountText: {
    fontSize: 11,
    marginRight: 4,
    fontWeight: '600',
  },
  navArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSearchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
