import React, { useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ThemedView,
  ThemedText,
  ScreenHeader,
  AppAvatar,
  MessageBubble,
  MessageComposer,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { MOCK_MESSAGES, MOCK_CONVERSATIONS } from '@/data/mockData';
import { DirectMessage } from '@/types';

export default function PrivateChatScreen() {
  const { spacing } = useAppTheme();
  const params = useLocalSearchParams<{ id: string; name?: string; online?: string }>();
  const conversationId = params.id || 'conv_1';

  // Find conversation metadata
  const conversationMeta = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
  const participantName = params.name || conversationMeta?.participantName || 'Elena Rostova';
  const isOnline = params.online === 'true' || conversationMeta?.isOnline || false;

  // Initial messages for this conversation
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
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Contact Header */}
        <ScreenHeader
          title={participantName}
          subtitle={isOnline ? 'Online • Verified Peer' : 'Offline • Direct Channel'}
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
        <View style={[styles.securityNotice, { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md }]}>
          <ThemedText variant="label" tone="muted" style={{ textAlign: 'center' }}>
            PRIVATE 1:1 CHANNEL • MAXIMUM 10 REGISTERED MEMBERS
          </ThemedText>
        </View>

        {/* Message Thread */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={[
            styles.messageList,
            { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Composer */}
        <MessageComposer onSendMessage={handleSendMessage} />
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
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
