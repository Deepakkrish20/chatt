import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { MOCK_MESSAGES, MOCK_CONVERSATIONS } from '@/data/mockData';
import { DirectMessage } from '@/types';

export default function PrivateChatScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const params = useLocalSearchParams<{ id: string; name?: string; online?: string }>();
  const conversationId = params.id || 'conv_1';

  // Find conversation metadata
  const conversationMeta = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
  const participantName = params.name || conversationMeta?.participantName || 'Elena Rostova';
  const isOnline = params.online === 'true' || conversationMeta?.isOnline || false;

  const initialMessages = MOCK_MESSAGES[conversationId] || [
    {
      id: 'default_1',
      conversationId,
      senderId: 'contact',
      senderName: participantName,
      content: 'Private channel opened. End-to-end device isolation active.',
      createdAt: '10:00 AM',
      isOutgoing: false,
      status: 'read',
    },
  ];

  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const flatListRef = useRef<FlatList<DirectMessage>>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isPeerTyping]);

  const handleSendMessage = (content: string) => {
    const newMessage: DirectMessage = {
      id: `m_local_${Date.now()}`,
      conversationId,
      senderId: 'user_current',
      senderName: 'Alex Vance',
      content,
      createdAt: 'Just now',
      isOutgoing: true,
      status: 'delivered',
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate gentle mock reply from peer after a brief pause
    setTimeout(() => {
      setIsPeerTyping(true);
      setTimeout(() => {
        setIsPeerTyping(false);
        const replyResponses = [
          'Acknowledged. Verified on isolated node.',
          'Understood. Standing by for updates.',
          'Encrypted payload received. Checking parameters now.',
          'Copy that. Channel remains clear.',
        ];
        const randomReply =
          replyResponses[Math.floor(Math.random() * replyResponses.length)];

        const replyMessage: DirectMessage = {
          id: `m_reply_${Date.now()}`,
          conversationId,
          senderId: 'peer',
          senderName: participantName,
          content: randomReply,
          createdAt: 'Just now',
          isOutgoing: false,
          status: 'read',
        };
        setMessages((prev) => [...prev, replyMessage]);
      }, 1200);
    }, 800);
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

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {/* Message Thread */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                animate={item.id.startsWith('m_local_') || item.id.startsWith('m_reply_')}
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
                  Send an encrypted message to open communication.
                </ThemedText>
              </View>
            }
          />

          {/* Peer Typing Indicator */}
          {isPeerTyping ? (
            <View style={[styles.typingRow, { paddingHorizontal: spacing.md, marginBottom: spacing.xs }]}>
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
          <MessageComposer onSendMessage={handleSendMessage} />
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
  keyboardContainer: {
    flex: 1,
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
