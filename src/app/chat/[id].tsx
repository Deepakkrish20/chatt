import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from '@/lib/supabase';
import { DirectMessage } from '@/types';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export default function PrivateChatScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { user, recordActivity } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    online?: string;
    participantId?: string;
  }>();

  const conversationId = params.id || 'conv_1';
  const currentUserId = user?.id || '';

  // Resolve metadata
  const participantName = params.name || 'Peer Member';
  const isOnline = params.online === 'true';

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
  const isPeerTyping = false;
  const flatListRef = useRef<FlatList<DirectMessage>>(null);

  useEffect(() => {
    let isMounted = true;

    fetchMessages(conversationId, currentUserId, participantName).then((history) => {
      if (isMounted) {
        setMessages(history);
        setIsLoading(false);
        markConversationAsRead(conversationId, currentUserId);
      }
    });

    // Subscribe to live incoming messages, auto-sync history, real-time message deletions & reactions
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
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [conversationId, currentUserId, participantName]);

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
            <AppAvatar
              name={participantName}
              size="sm"
              isOnline={isOnline}
            />
          }
        />

        {/* Security / Encryption Notice */}
        <View
          style={[
            styles.securityNotice,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <ThemedText variant="label" tone="muted" style={{ textAlign: 'center' }}>
            PRIVATE 1:1 CHANNEL • DEVICE-ISOLATED
          </ThemedText>
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
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
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  animate={item.id.startsWith('temp_') || item.id.startsWith('m_reply_')}
                  onLongPress={() => handleOpenMessageOptions(item)}
                  onDoubleTap={() => handleDoubleTapMessage(item)}
                />
              )}
              contentContainerStyle={[
                styles.messageList,
                { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
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
                    <AppIcon name="lock" size={24} color={colors.text} />
                  </View>
                  <ThemedText variant="bodyMedium" style={{ marginTop: spacing.md }}>
                    No messages yet
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                    Send a private message to open this direct channel.
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
          <MessageComposer onSendMessage={handleSendMessage} disabled={isSending} />
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
                borderRadius: radius.xl,
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
                    borderColor: colors.border,
                    borderRadius: radius.full,
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
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.reactionPopupHeader}>
              <ThemedText
                variant="label"
                tone="muted"
                style={{ textTransform: 'uppercase', letterSpacing: 1 }}
              >
                React to Message
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
                        borderColor: isSelectedByMe ? colors.border : 'transparent',
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
    justifyContent: 'flex-end',
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
    maxWidth: 420,
    borderWidth: 1,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
});
