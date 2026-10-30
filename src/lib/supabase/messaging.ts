/**
 * Private 1:1 Messaging Service Layer for Supabase.
 *
 * Implements:
 * - One-to-one conversation lookup and creation (with duplicate prevention)
 * - Chronological message history retrieval
 * - Server-validated message insertion
 * - Real-time incoming message subscriptions
 * - Fallback to mock data when running in offline/unconfigured demo mode
 */

import { supabase, isSupabaseConfigured } from './client';
import {
  DatabaseConversation,
  DatabaseMessage,
  ConversationParticipantProfile,
} from './types';
import { DirectConversationPreview, DirectMessage, UserSummary } from '@/types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_MEMBERS } from '@/data/mockData';
import { formatConversationTime, formatMessageTime } from '@/utils';

/**
 * Fetch all 1:1 conversations for the current user.
 */
export async function fetchConversations(
  currentUserId: string
): Promise<DirectConversationPreview[]> {
  if (!isSupabaseConfigured || !currentUserId) {
    return MOCK_CONVERSATIONS;
  }

  try {
    // 1. Fetch conversations where current user is user1 or user2
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (convError) {
      return MOCK_CONVERSATIONS;
    }

    if (!convData || convData.length === 0) {
      return [];
    }

    const conversations = convData as DatabaseConversation[];

    // 2. Identify the other participant IDs
    const otherParticipantIds = Array.from(
      new Set(
        conversations.map((c) =>
          c.user1_id === currentUserId ? c.user2_id : c.user1_id
        )
      )
    );

    // 3. Fetch profiles for the other participants
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .in('id', otherParticipantIds);

    const profileMap = new Map<string, ConversationParticipantProfile>();
    if (profilesData) {
      profilesData.forEach((p) => {
        profileMap.set(p.id, {
          id: p.id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          isOnline: p.status === 'online',
        });
      });
    }

    // 4. Fetch unread counts for each conversation
    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .neq('sender_id', currentUserId)
      .is('read_at', null);

    const unreadMap = new Map<string, number>();
    if (unreadData) {
      unreadData.forEach((m) => {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
      });
    }

    // 5. Assemble conversation previews
    return conversations.map((c) => {
      const otherId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;
      const profile = profileMap.get(otherId);

      return {
        id: c.id,
        participantId: otherId,
        participantName: profile?.displayName || 'Unknown Member',
        participantUsername: profile?.username || 'member',
        isOnline: profile?.isOnline ?? false,
        lastMessageSnippet: c.last_message_text || 'No messages yet.',
        lastMessageTimestamp: c.last_message_at
          ? formatConversationTime(c.last_message_at)
          : formatConversationTime(c.created_at),
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });
  } catch {
    return MOCK_CONVERSATIONS;
  }
}

/**
 * Fetch registered network members to start a new 1:1 conversation.
 */
export async function fetchRegisteredMembers(
  currentUserId: string
): Promise<ConversationParticipantProfile[]> {
  if (!isSupabaseConfigured || !currentUserId) {
    return MOCK_MEMBERS.filter((m: UserSummary) => m.id !== 'user_current').map((m: UserSummary) => ({
      id: m.id,
      username: m.username,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl || null,
      isOnline: m.isOnline ?? false,
    }));
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .neq('id', currentUserId)
      .order('display_name', { ascending: true })
      .limit(10);

    if (error || !data) {
      return [];
    }

    return data.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      isOnline: p.status === 'online',
    }));
  } catch {
    return [];
  }
}

/**
 * Get or atomically create a 1:1 conversation between the current user and a target member.
 * Guarantees no duplicate conversations between the same pair.
 */
export async function getOrCreateConversation(
  targetUserId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    // Demo mode: match existing mock conversation or generate consistent ID
    const found = MOCK_CONVERSATIONS.find((c) => c.participantId === targetUserId);
    return {
      conversationId: found ? found.id : `conv_demo_${targetUserId}`,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      target_user_id: targetUserId,
    });

    if (error) {
      return { conversationId: null, error: error.message };
    }

    return { conversationId: data as string, error: null };
  } catch (err: unknown) {
    return {
      conversationId: null,
      error: err instanceof Error ? err.message : 'Failed to initialize conversation.',
    };
  }
}

/**
 * Fetch chronological message history for a conversation.
 */
export async function fetchMessages(
  conversationId: string,
  currentUserId: string,
  participantName: string,
  limit = 50
): Promise<DirectMessage[]> {
  if (!isSupabaseConfigured || !currentUserId) {
    return MOCK_MESSAGES[conversationId] || [];
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !data) {
      return MOCK_MESSAGES[conversationId] || [];
    }

    const messages = data as DatabaseMessage[];

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.sender_id === currentUserId ? 'You' : participantName,
      content: m.content,
      createdAt: formatMessageTime(m.created_at),
      isOutgoing: m.sender_id === currentUserId,
      status: m.read_at ? 'read' : 'delivered',
    }));
  } catch {
    return MOCK_MESSAGES[conversationId] || [];
  }
}

/**
 * Send a direct text message inside a conversation.
 * Server RLS enforces sender_id = auth.uid() and membership.
 */
export async function sendDirectMessage(
  conversationId: string,
  content: string,
  currentUserId: string
): Promise<{ data: DirectMessage | null; error: string | null }> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { data: null, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > 5000) {
    return { data: null, error: 'Message exceeds 5,000 character limit.' };
  }

  if (!isSupabaseConfigured || !currentUserId) {
    // Demo mode: Return local optimistic message
    const mockMsg: DirectMessage = {
      id: `local_m_${Date.now()}`,
      conversationId,
      senderId: currentUserId || 'user_current',
      senderName: 'You',
      content: trimmed,
      createdAt: formatMessageTime(new Date().toISOString()),
      isOutgoing: true,
      status: 'delivered',
    };
    return { data: mockMsg, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: trimmed,
      })
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const inserted = data as DatabaseMessage;

    return {
      data: {
        id: inserted.id,
        conversationId: inserted.conversation_id,
        senderId: inserted.sender_id,
        senderName: 'You',
        content: inserted.content,
        createdAt: formatMessageTime(inserted.created_at),
        isOutgoing: true,
        status: inserted.read_at ? 'read' : 'sent',
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to send message.',
    };
  }
}

/**
 * Subscribe to incoming real-time messages for an open conversation.
 */
export function subscribeToConversationMessages(
  conversationId: string,
  currentUserId: string,
  participantName: string,
  onNewMessage: (msg: DirectMessage) => void
): () => void {
  if (!isSupabaseConfigured || !conversationId) {
    return () => {};
  }

  const channelName = `messages:${conversationId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const raw = payload.new as DatabaseMessage;
        // Don't duplicate self-sent messages if already handled optimistically
        const isOutgoing = raw.sender_id === currentUserId;
        const msg: DirectMessage = {
          id: raw.id,
          conversationId: raw.conversation_id,
          senderId: raw.sender_id,
          senderName: isOutgoing ? 'You' : participantName,
          content: raw.content,
          createdAt: formatMessageTime(raw.created_at),
          isOutgoing,
          status: raw.read_at ? 'read' : 'delivered',
        };
        onNewMessage(msg);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation changes (for live chat list updates).
 */
export function subscribeToConversationsList(
  currentUserId: string,
  onUpdate: () => void
): () => void {
  if (!isSupabaseConfigured || !currentUserId) {
    return () => {};
  }

  const channel = supabase
    .channel(`conversations_user:${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Mark all incoming messages in a conversation as read.
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured || !conversationId) {
    return;
  }

  try {
    await supabase.rpc('mark_conversation_read', {
      target_conversation_id: conversationId,
    });
  } catch {
    // Silently ignore non-critical receipt errors
  }
}
