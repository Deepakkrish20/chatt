import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
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
} from '@/lib/supabase';
import { DirectMessage } from '@/types';

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
  const isPeerTyping = false;
  const flatListRef = useRef<FlatList<DirectMessage>>(null);

  useEffect(() => {
    let isMounted = true;

    fetchMessages(conversationId, currentUserId, participantName).then((history) => {
      if (isMounted) {
        setMessages(history);
        setIsLoading(false);
        markConversationAsRead(conversationId);
      }
    });

    // Subscribe to live incoming messages & auto-sync history
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
        markConversationAsRead(conversationId);
      },
      (syncedHistory) => {
        if (!isMounted) return;
        setMessages(syncedHistory);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [conversationId, currentUserId, participantName]);

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
});
