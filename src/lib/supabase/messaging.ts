/**
 * Private 1:1 Messaging Service Layer for Supabase.
 *
 * Implements WhatsApp-grade message persistence & synchronization:
 * - Local Persistent Storage (AsyncStorage): Messages never get lost across restarts or reloads
 * - App-Wide Global Realtime Listener: Messages arriving while on home screen are captured & saved
 * - P2P Auto-Sync Handshake: Synchronizes missed historical messages when peers reconnect
 * - Cloud Database Integration: Automatically syncs with PostgreSQL tables when configured
 * - Canonical Conversation IDs: Guarantees 100% room & channel matching across devices
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './client';
import {
  DatabaseConversation,
  DatabaseMessage,
  ConversationParticipantProfile,
} from './types';
import { DirectConversationPreview, DirectMessage, MessageReaction } from '@/types';
import { formatConversationTime, formatMessageTime } from '@/utils';
import { NETWORK_ACCOUNTS } from '@/data/mockData';
import { isWhisperMessage, parseWhisperMessage, formatAudioDuration } from '@/lib/audio';

const STORAGE_MESSAGES_KEY_PREFIX = '@chatt_msg_history_';
const STORAGE_CONVERSATIONS_KEY = '@chatt_conversations_index';

/**
 * Generate a canonical, deterministic conversation ID for any 2 users.
 * Example: ('user_krish', 'user_jana') -> 'conv_user_jana_user_krish'
 */
export function getCanonicalConversationId(userId1: string, userId2: string): string {
  const clean1 = (userId1 || '').replace(/^conv_/, '').trim();
  const clean2 = (userId2 || '').replace(/^conv_/, '').trim();
  const sorted = [clean1, clean2].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

export function getConversationsStorageKey(userId?: string): string {
  const clean = (userId || '').trim();
  return clean ? `${STORAGE_CONVERSATIONS_KEY}_${clean}` : STORAGE_CONVERSATIONS_KEY;
}

/**
 * Save a single message into local persistent storage and update conversation preview.
 */
export async function saveMessageToLocalHistory(
  conversationId: string,
  message: DirectMessage,
  currentUserId?: string,
  peerName?: string
): Promise<DirectMessage[]> {
  try {
    const key = STORAGE_MESSAGES_KEY_PREFIX + conversationId;
    const existingRaw = await AsyncStorage.getItem(key);
    const existingList: DirectMessage[] = existingRaw ? JSON.parse(existingRaw) : [];

    const existingIndex = existingList.findIndex((m) => m.id === message.id);
    if (existingIndex >= 0) {
      existingList[existingIndex] = { ...existingList[existingIndex], ...message };
    } else {
      existingList.push(message);
    }

    // Chronological order
    existingList.sort((a, b) => a.id.localeCompare(b.id));

    await AsyncStorage.setItem(key, JSON.stringify(existingList));
    await updateConversationSummaryLocally(conversationId, message, currentUserId, peerName);

    return existingList;
  } catch {
    return [];
  }
}

/**
 * Merge an array of messages into local persistent storage (deduplicating by ID).
 */
export async function mergeMessagesToLocalHistory(
  conversationId: string,
  newMessages: DirectMessage[],
  currentUserId?: string,
  peerName?: string
): Promise<DirectMessage[]> {
  if (!newMessages || newMessages.length === 0) return [];
  try {
    const key = STORAGE_MESSAGES_KEY_PREFIX + conversationId;
    const existingRaw = await AsyncStorage.getItem(key);
    const existingList: DirectMessage[] = existingRaw ? JSON.parse(existingRaw) : [];

    const map = new Map<string, DirectMessage>();
    existingList.forEach((m) => map.set(m.id, m));
    newMessages.forEach((m) => {
      if (!map.has(m.id)) {
        map.set(m.id, m);
      } else {
        const prev = map.get(m.id)!;
        map.set(m.id, { ...prev, ...m });
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
    await AsyncStorage.setItem(key, JSON.stringify(merged));

    if (merged.length > 0) {
      await updateConversationSummaryLocally(conversationId, merged[merged.length - 1], currentUserId, peerName);
    }

    return merged;
  } catch {
    return [];
  }
}

/**
 * Update the conversation preview summary in the user-scoped conversation index.
 */
async function updateConversationSummaryLocally(
  conversationId: string,
  lastMessage: DirectMessage,
  currentUserId?: string,
  peerName?: string
): Promise<void> {
  try {
    const storageKey = getConversationsStorageKey(currentUserId);
    const raw = await AsyncStorage.getItem(storageKey);
    const list: DirectConversationPreview[] = raw ? JSON.parse(raw) : [];

    const snippet = isWhisperMessage(lastMessage.content)
      ? `🔒 Whisper (${formatAudioDuration(parseWhisperMessage(lastMessage.content)?.duration || 0)})`
      : lastMessage.content;

    const existingIndex = list.findIndex((c) => c.id === conversationId);
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        lastMessageSnippet: snippet,
        lastMessageTimestamp: lastMessage.createdAt,
      };
    } else {
      const isSenderMe = currentUserId ? lastMessage.senderId === currentUserId : lastMessage.isOutgoing;
      const isJana = (currentUserId || '').toLowerCase().includes('jana');
      const fallbackPeer = isJana
        ? { id: 'user_krish', name: 'krish', username: 'krish' }
        : { id: 'user_jana', name: 'Jana Thiru', username: 'janathiru' };

      const resolvedName = peerName || (isSenderMe ? fallbackPeer.name : lastMessage.senderName) || fallbackPeer.name;
      const resolvedId = isSenderMe ? fallbackPeer.id : lastMessage.senderId;

      list.push({
        id: conversationId,
        participantId: resolvedId,
        participantName: resolvedName,
        participantUsername: resolvedName.toLowerCase().replace(/\s+/g, ''),
        isOnline: true,
        lastMessageSnippet: snippet,
        lastMessageTimestamp: lastMessage.createdAt,
        unreadCount: 0,
      });
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

/**
 * Fetch all 1:1 conversations for the current user.
 * Strictly guarantees that conversations are only returned if an accepted chat_request exists.
 */
export async function fetchConversations(
  currentUserId: string
): Promise<DirectConversationPreview[]> {
  if (!currentUserId) {
    return [];
  }

  // 1. Fetch all accepted peer IDs from cloud database and local requests vault
  const acceptedPeers = new Set<string>();

  if (isSupabaseConfigured) {
    try {
      const { data: acceptedReqs, error: reqsErr } = await supabase
        .from('chat_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (!reqsErr && acceptedReqs) {
        acceptedReqs.forEach((r) => {
          acceptedPeers.add(r.sender_id === currentUserId ? r.receiver_id : r.sender_id);
        });

        // Authoritative cloud check: if 0 accepted requests in cloud, purge local conversations & requests
        if (acceptedReqs.length === 0) {
          await AsyncStorage.removeItem(getConversationsStorageKey(currentUserId));
          await AsyncStorage.removeItem(`@chatt_requests_${currentUserId}`);
          return [];
        }
      } else {
        // Fallback to local storage only if query failed
        const rawLocal = await AsyncStorage.getItem(`@chatt_requests_${currentUserId}`);
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          if (Array.isArray(list)) {
            list.forEach((r: any) => {
              if (r.status === 'accepted') {
                acceptedPeers.add(r.sender_id === currentUserId ? r.receiver_id : r.sender_id);
              }
            });
          }
        }
      }
    } catch {
      const rawLocal = await AsyncStorage.getItem(`@chatt_requests_${currentUserId}`);
      if (rawLocal) {
        const list = JSON.parse(rawLocal);
        if (Array.isArray(list)) {
          list.forEach((r: any) => {
            if (r.status === 'accepted') {
              acceptedPeers.add(r.sender_id === currentUserId ? r.receiver_id : r.sender_id);
            }
          });
        }
      }
    }
  } else {
    // Offline mode
    const rawLocal = await AsyncStorage.getItem(`@chatt_requests_${currentUserId}`);
    if (rawLocal) {
      const list = JSON.parse(rawLocal);
      if (Array.isArray(list)) {
        list.forEach((r: any) => {
          if (r.status === 'accepted') {
            acceptedPeers.add(r.sender_id === currentUserId ? r.receiver_id : r.sender_id);
          }
        });
      }
    }
  }

  // If user has zero accepted requests, clear any stale cached conversations and return empty
  if (acceptedPeers.size === 0) {
    await AsyncStorage.removeItem(getConversationsStorageKey(currentUserId));
    return [];
  }

  // 2. Try Supabase cloud database if available
  if (isSupabaseConfigured) {
    try {
      let { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!convError && convData && convData.length > 0) {
        const conversations = (convData as DatabaseConversation[]).filter((c) => {
          const otherId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;
          return acceptedPeers.has(otherId);
        });

        if (conversations.length > 0) {
          const otherParticipantIds = Array.from(
            new Set(
              conversations.map((c) =>
                c.user1_id === currentUserId ? c.user2_id : c.user1_id
              )
            )
          );

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

          const result: DirectConversationPreview[] = conversations.map((c) => {
            const otherId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;
            const profile = profileMap.get(otherId);

            const rawSnippet = c.last_message_text || 'No messages yet.';
            const displaySnippet = isWhisperMessage(rawSnippet)
              ? `🔒 Whisper (${formatAudioDuration(parseWhisperMessage(rawSnippet)?.duration || 0)})`
              : rawSnippet;

            return {
              id: c.id,
              participantId: otherId,
              participantName: profile?.displayName || 'Chat Partner',
              participantUsername: profile?.username || 'member',
              isOnline: profile?.isOnline ?? true,
              lastMessageSnippet: displaySnippet,
              lastMessageTimestamp: c.last_message_at
                ? formatConversationTime(c.last_message_at)
                : formatConversationTime(c.created_at),
              unreadCount: 0,
            };
          });

          // Cache verified conversations to user-scoped storage
          await AsyncStorage.setItem(
            getConversationsStorageKey(currentUserId),
            JSON.stringify(result)
          );

          return result;
        } else {
          // If no conversations match accepted peers, clear cached
          await AsyncStorage.removeItem(getConversationsStorageKey(currentUserId));
          return [];
        }
      }
    } catch {
      // Fall through to local storage
    }
  }

  // 3. Fetch from user-scoped local conversations index (strictly verified against accepted peers)
  try {
    const raw = await AsyncStorage.getItem(getConversationsStorageKey(currentUserId));
    if (raw) {
      const list = JSON.parse(raw) as DirectConversationPreview[];
      if (list && list.length > 0) {
        const verified = list.filter((c) => acceptedPeers.has(c.participantId));
        return verified;
      }
    }
  } catch {
    // Ignore
  }

  return [];
}



/**
 * Fetch registered network members to start a new 1:1 conversation.
 */
export async function fetchRegisteredMembers(
  currentUserId: string
): Promise<ConversationParticipantProfile[]> {
  const fallbackMembers = NETWORK_ACCOUNTS.filter(
    (a) =>
      a.id !== currentUserId &&
      a.email.toLowerCase() !== currentUserId.toLowerCase() &&
      a.username.toLowerCase() !== currentUserId.replace('user_', '').toLowerCase()
  ).map((a) => ({
    id: a.id,
    username: a.username,
    displayName: a.displayName,
    avatarUrl: null,
    isOnline: true,
  }));

  if (!isSupabaseConfigured || !currentUserId) {
    return fallbackMembers;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .neq('id', currentUserId)
      .order('display_name', { ascending: true })
      .limit(100);

    if (error || !data || data.length === 0) {
      return fallbackMembers;
    }

    return data.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      isOnline: p.status === 'online',
    }));
  } catch {
    return fallbackMembers;
  }
}

/**
 * Get or atomically create a 1:1 conversation between the current user and a target member.
 * Returns a canonical deterministic conversation ID shared by both peers.
 */
export async function getOrCreateConversation(
  targetUserId: string,
  currentUserId?: string
): Promise<{ conversationId: string | null; error: string | null }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        target_user_id: targetUserId,
      });

      if (!error && data) {
        return { conversationId: data as string, error: null };
      }
    } catch {
      // Fallback
    }
  }

  const canonicalConvId = getCanonicalConversationId(currentUserId || 'user_me', targetUserId);
  return { conversationId: canonicalConvId, error: null };
}

/**
 * Fetch chronological message history for a conversation.
 * Reads persistent local storage & merges with cloud server messages.
 */
export async function fetchMessages(
  conversationId: string,
  currentUserId: string,
  participantName: string,
  limit = 100
): Promise<DirectMessage[]> {
  const canonicalId = conversationId;

  let localMessages: DirectMessage[] = [];

  // 1. Retrieve persistent local messages from storage
  try {
    const rawStored = await AsyncStorage.getItem(STORAGE_MESSAGES_KEY_PREFIX + canonicalId);
    if (rawStored) {
      localMessages = JSON.parse(rawStored);
    }
  } catch {
    // Ignore storage read error
  }

  // 2. Try fetching from Supabase DB tables if available
  if (isSupabaseConfigured && currentUserId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at, read_at')
        .eq('conversation_id', canonicalId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (!error && data && data.length > 0) {
        const dbMessages = (data as DatabaseMessage[]).map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.sender_id === currentUserId ? 'You' : participantName,
          content: m.content,
          createdAt: formatMessageTime(m.created_at),
          isOutgoing: m.sender_id === currentUserId,
          status: (m.read_at ? 'read' : 'delivered') as 'read' | 'delivered',
        }));

        // Merge DB messages into local storage
        await mergeMessagesToLocalHistory(canonicalId, dbMessages);
        return dbMessages;
      }
    } catch {
      // Safe fallback to local storage
    }
  }

  // Map isOutgoing dynamically based on current user & filter deleted for me
  const visibleMessages = localMessages.filter(
    (m) => !m.deletedForUsers || !m.deletedForUsers.includes(currentUserId)
  );

  return visibleMessages.map((m) => ({
    ...m,
    isOutgoing: m.senderId === currentUserId,
    senderName: m.senderId === currentUserId ? 'You' : participantName,
  }));
}

export const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Check if a message was sent within the past 1 hour (for Delete for Everyone).
 */
export function isMessageWithinOneHour(message: DirectMessage): boolean {
  const sentTime =
    message.timestamp ||
    (message.id.startsWith('msg_') ? parseInt(message.id.split('_')[1], 10) : 0);
  if (!sentTime || isNaN(sentTime)) return false;
  return Date.now() - sentTime <= ONE_HOUR_MS;
}

/**
 * Return human-readable remaining time string for Delete for Everyone window.
 */
export function getRemainingDeleteTime(message: DirectMessage): string {
  const sentTime =
    message.timestamp ||
    (message.id.startsWith('msg_') ? parseInt(message.id.split('_')[1], 10) : 0);
  if (!sentTime || isNaN(sentTime)) return 'Expired';
  const remainingMs = ONE_HOUR_MS - (Date.now() - sentTime);
  if (remainingMs <= 0) return 'Expired';
  const minutes = Math.floor(remainingMs / (60 * 1000));
  return `${minutes}m remaining`;
}

/**
 * Delete a message for everyone (both participants).
 * Strictly enforced: Only sender can delete, and only within 1 hour from sending!
 */
export async function deleteMessageForEveryone(
  conversationId: string,
  messageId: string,
  currentUserId: string
): Promise<{ success: boolean; error: string | null }> {
  const canonicalId = conversationId;

  try {
    const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
    const raw = await AsyncStorage.getItem(key);
    const list: DirectMessage[] = raw ? JSON.parse(raw) : [];

    const targetIndex = list.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) {
      return { success: false, error: 'Message not found.' };
    }

    const target = list[targetIndex];

    // Security Check 1: Must be original sender
    if (target.senderId !== currentUserId) {
      return { success: false, error: 'You can only delete your own sent messages for everyone.' };
    }

    // Security Check 2: Must be within 1 hour
    if (!isMessageWithinOneHour(target)) {
      return {
        success: false,
        error: 'Delete for everyone has expired. Messages can only be deleted for everyone within 1 hour.',
      };
    }

    // Update message locally
    const updatedMsg: DirectMessage = {
      ...target,
      content: 'This message was deleted',
      isDeletedForEveryone: true,
    };
    list[targetIndex] = updatedMsg;

    await AsyncStorage.setItem(key, JSON.stringify(list));
    await updateConversationSummaryLocally(canonicalId, updatedMsg, currentUserId);

    // Broadcast delete event over Supabase Realtime
    if (isSupabaseConfigured) {
      try {
        const roomChannel = supabase.channel(`room_${canonicalId}`);
        roomChannel.send({
          type: 'broadcast',
          event: 'delete_message',
          payload: {
            conversationId: canonicalId,
            messageId,
            deleteType: 'for_everyone',
          },
        });

        const globalChannel = supabase.channel('conversations_global');
        globalChannel.send({
          type: 'broadcast',
          event: 'delete_message',
          payload: {
            conversationId: canonicalId,
            messageId,
            deleteType: 'for_everyone',
          },
        });
      } catch {
        // Ignore broadcast failure
      }

      // Background DB sync if available
      try {
        await supabase
          .from('messages')
          .update({ content: 'This message was deleted' })
          .eq('id', messageId);
      } catch {
        // Ignore
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete message.',
    };
  }
}

/**
 * Delete a message for that particular account alone ("Delete for me").
 * No time limit — can be deleted anytime.
 */
export async function deleteMessageForMe(
  conversationId: string,
  messageId: string,
  currentUserId: string
): Promise<{ success: boolean; error: string | null }> {
  const canonicalId = conversationId;

  try {
    const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
    const raw = await AsyncStorage.getItem(key);
    const list: DirectMessage[] = raw ? JSON.parse(raw) : [];

    const targetIndex = list.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) {
      return { success: false, error: 'Message not found.' };
    }

    const target = list[targetIndex];
    const existingDeletedFor = target.deletedForUsers || [];
    if (!existingDeletedFor.includes(currentUserId)) {
      list[targetIndex] = {
        ...target,
        deletedForUsers: [...existingDeletedFor, currentUserId],
      };
      await AsyncStorage.setItem(key, JSON.stringify(list));
    }

    // Update conversation summary to last visible message
    const visibleList = list.filter((m) => !m.deletedForUsers?.includes(currentUserId));
    if (visibleList.length > 0) {
      await updateConversationSummaryLocally(canonicalId, visibleList[visibleList.length - 1], currentUserId);
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete message for me.',
    };
  }
}

/**
 * Add or toggle an emoji reaction on a message.
 * Updates local persistent storage and broadcasts the reaction update event in real time.
 */
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  currentUserId: string
): Promise<{ success: boolean; reactions?: MessageReaction[]; error: string | null }> {
  const canonicalId = conversationId;

  try {
    const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
    const raw = await AsyncStorage.getItem(key);
    const list: DirectMessage[] = raw ? JSON.parse(raw) : [];

    const targetIndex = list.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) {
      return { success: false, error: 'Message not found.' };
    }

    const target = list[targetIndex];
    if (target.isDeletedForEveryone) {
      return { success: false, error: 'Cannot react to a deleted message.' };
    }

    const existingReactions = target.reactions || [];
    const userReactionIdx = existingReactions.findIndex((r) => r.userId === currentUserId);

    let updatedReactions: MessageReaction[];
    if (userReactionIdx >= 0 && existingReactions[userReactionIdx].emoji === emoji) {
      // User tapped the same emoji -> remove reaction (toggle off)
      updatedReactions = existingReactions.filter((_, idx) => idx !== userReactionIdx);
    } else if (userReactionIdx >= 0) {
      // User tapped a different emoji -> switch reaction
      updatedReactions = [...existingReactions];
      updatedReactions[userReactionIdx] = { emoji, userId: currentUserId };
    } else {
      // User reacted for the first time
      updatedReactions = [...existingReactions, { emoji, userId: currentUserId }];
    }

    list[targetIndex] = {
      ...target,
      reactions: updatedReactions,
    };

    await AsyncStorage.setItem(key, JSON.stringify(list));

    // Broadcast reaction update over Supabase Realtime
    if (isSupabaseConfigured) {
      try {
        const roomChannel = supabase.channel(`room_${canonicalId}`);
        roomChannel.send({
          type: 'broadcast',
          event: 'reaction_update',
          payload: {
            conversationId: canonicalId,
            messageId,
            reactions: updatedReactions,
          },
        });
      } catch {
        // Ignore broadcast failure
      }
    }

    return { success: true, reactions: updatedReactions, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update reaction.',
    };
  }
}

/**
 * Send a direct text message inside a conversation.
 * Saves locally immediately, broadcasts over WebSockets to room & global channel,
 * and pushes to cloud database.
 */
export async function sendDirectMessage(
  conversationId: string,
  content: string,
  currentUserId: string,
  participantName?: string
): Promise<{ data: DirectMessage | null; error: string | null }> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { data: null, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > 5000) {
    return { data: null, error: 'Message exceeds 5,000 character limit.' };
  }

  const canonicalId = conversationId;

  // 1. Strict Permission Guard: Verify mutual chat request is accepted
  let isAccepted = false;
  let targetPeerId: string | undefined;

  if (currentUserId) {
    if (canonicalId.startsWith('conv_')) {
      const clean = canonicalId.replace(/^conv_/, '');
      const parts = clean.split('_');
      const cleanCurrent = currentUserId.replace(/^user_/, '');
      const match = parts.find((p) => p !== currentUserId && p !== cleanCurrent && p !== 'user_me');
      if (match) targetPeerId = match.startsWith('user_') ? match : `user_${match}`;
    }

    if (isSupabaseConfigured) {
      try {
        if (!targetPeerId) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('user1_id, user2_id')
            .eq('id', canonicalId)
            .maybeSingle();

          if (conv) {
            targetPeerId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
          }
        }

        if (targetPeerId) {
          const { data: req } = await supabase
            .from('chat_requests')
            .select('id')
            .eq('status', 'accepted')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetPeerId}),and(sender_id.eq.${targetPeerId},receiver_id.eq.${currentUserId})`)
            .maybeSingle();

          if (req) {
            isAccepted = true;
          }
        }
      } catch {
        // Cloud check fallback
      }
    }

    // Check local store ONLY if offline / Supabase is unavailable
    if (!isAccepted && !isSupabaseConfigured && targetPeerId) {
      try {
        const rawLocal = await AsyncStorage.getItem(`@chatt_requests_${currentUserId}`);
        if (rawLocal) {
          const localList = JSON.parse(rawLocal);
          if (Array.isArray(localList)) {
            isAccepted = localList.some(
              (r: any) =>
                r.status === 'accepted' &&
                ((r.sender_id === currentUserId && r.receiver_id === targetPeerId) ||
                  (r.sender_id === targetPeerId && r.receiver_id === currentUserId))
            );
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  if (!isAccepted) {
    return {
      data: null,
      error: 'Cannot send message: Mutual chat request must be accepted first.',
    };
  }

  const now = Date.now();
  let messageId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;

  // 2. Push to cloud database if Supabase is configured
  if (isSupabaseConfigured && currentUserId) {
    try {
      const { data: dbMsg, error: dbError } = await supabase
        .from('messages')
        .insert({
          conversation_id: canonicalId,
          sender_id: currentUserId,
          content: trimmed,
        })
        .select('id, created_at')
        .single();

      if (!dbError && dbMsg) {
        messageId = dbMsg.id;
      }
    } catch {
      // Fallback to local message ID
    }
  }

  const newMsg: DirectMessage = {
    id: messageId,
    conversationId: canonicalId,
    senderId: currentUserId,
    senderName: 'You',
    content: trimmed,
    createdAt: formatMessageTime(new Date().toISOString()),
    timestamp: now,
    isOutgoing: true,
    status: 'sent',
  };

  // 2. Immediately save to local persistent storage (NEVER LOST)
  await saveMessageToLocalHistory(canonicalId, newMsg, currentUserId, participantName);

  // 3. Broadcast immediately over Supabase Realtime to room channel AND global channel
  if (isSupabaseConfigured) {
    try {
      const roomChannel = supabase.channel(`room_${canonicalId}`);
      roomChannel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          ...newMsg,
          senderName: participantName || 'Member',
        },
      });

      const globalChannel = supabase.channel('conversations_global');
      globalChannel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          ...newMsg,
          senderName: participantName || 'Member',
        },
      });
    } catch {
      // Ignore broadcast errors
    }
  }

  return { data: newMsg, error: null };
}

/**
 * Safely creates or recreates a Supabase Realtime channel.
 * If a channel with the given topic already exists in the client (e.g. from a prior
 * subscription, send operation, or Fast Refresh), it unsubscribes and purges it so new
 * callbacks (.on) can be registered cleanly without triggering:
 * "cannot add postgres_changes callbacks for realtime:... after subscribe()."
 */
function getFreshChannel(channelName: string) {
  const topic = `realtime:${channelName}`;
  const existing = supabase.getChannels().find((c) => c.topic === topic);
  if (existing) {
    try {
      existing.unsubscribe();
      existing.teardown();
      supabase.removeChannel(existing);
    } catch {
      // Ignore cleanup error
    }
    try {
      (supabase as any).realtime.channels = (
        (supabase as any).realtime?.channels || []
      ).filter((c: any) => c.topic !== topic);
    } catch {
      // Ignore cleanup error
    }
  }
  return supabase.channel(channelName);
}

/**
 * Subscribe to incoming real-time messages & handle auto-sync handshakes.
 */
export function subscribeToConversationMessages(
  conversationId: string,
  currentUserId: string,
  participantName: string,
  onNewMessage: (msg: DirectMessage) => void,
  onSyncHistory?: (messages: DirectMessage[]) => void,
  onMessageDeleted?: (messageId: string) => void,
  onReactionUpdate?: (messageId: string, reactions: MessageReaction[]) => void,
  onMessagesRead?: (readerId: string) => void,
  onTypingStatus?: (isTyping: boolean) => void
): () => void {
  if (!isSupabaseConfigured || !conversationId) {
    return () => {};
  }

  const canonicalId = conversationId;
  const channelName = `room_${canonicalId}`;
  const channel = getFreshChannel(channelName)
    // 1. Live Incoming Message
    .on('broadcast', { event: 'new_message' }, async ({ payload }) => {
      const raw = payload as DirectMessage;
      if (raw && raw.senderId !== currentUserId) {
        const incoming: DirectMessage = {
          ...raw,
          senderName: participantName,
          isOutgoing: false,
          status: 'delivered',
        };

        // Save incoming message to local storage immediately
        await saveMessageToLocalHistory(canonicalId, incoming, currentUserId, participantName);
        onNewMessage(incoming);
      }
    })
    // 2. Real-time Delete Event (Delete for Everyone)
    .on('broadcast', { event: 'delete_message' }, async ({ payload }) => {
      if (payload && payload.messageId && payload.deleteType === 'for_everyone') {
        const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const list: DirectMessage[] = JSON.parse(raw);
          const idx = list.findIndex((m) => m.id === payload.messageId);
          if (idx !== -1) {
            list[idx] = {
              ...list[idx],
              content: 'This message was deleted',
              isDeletedForEveryone: true,
            };
            await AsyncStorage.setItem(key, JSON.stringify(list));
            await updateConversationSummaryLocally(canonicalId, list[idx], currentUserId, participantName);
          }
        }
        onMessageDeleted?.(payload.messageId);
      }
    })
    // 3. Real-time Emoji Reaction Update
    .on('broadcast', { event: 'reaction_update' }, async ({ payload }) => {
      if (payload && payload.messageId && Array.isArray(payload.reactions)) {
        const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const list: DirectMessage[] = JSON.parse(raw);
          const idx = list.findIndex((m) => m.id === payload.messageId);
          if (idx !== -1) {
            list[idx] = {
              ...list[idx],
              reactions: payload.reactions,
            };
            await AsyncStorage.setItem(key, JSON.stringify(list));
          }
        }
        onReactionUpdate?.(payload.messageId, payload.reactions);
      }
    })
    // 4. Real-time Read Receipt: Peer opened the chat room!
    .on('broadcast', { event: 'messages_read' }, async ({ payload }) => {
      if (payload && payload.readerId && payload.readerId !== currentUserId) {
        const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const list: DirectMessage[] = JSON.parse(raw);
          let hasChanges = false;
          const updated = list.map((m) => {
            if (m.senderId === currentUserId && m.status !== 'read') {
              hasChanges = true;
              return { ...m, status: 'read' as const };
            }
            return m;
          });
          if (hasChanges) {
            await AsyncStorage.setItem(key, JSON.stringify(updated));
          }
        }
        onMessagesRead?.(payload.readerId);
      }
    })
    // 5. Real-time Typing Status: Peer is typing / stopped typing
    .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
      if (payload && payload.senderId !== currentUserId) {
        onTypingStatus?.(Boolean(payload.isTyping));
      }
    })
    // 6. P2P History Sync Request: Peer asking for chat history
    .on('broadcast', { event: 'sync_request' }, async ({ payload }) => {
      if (payload && payload.requesterId !== currentUserId) {
        try {
          const rawStored = await AsyncStorage.getItem(STORAGE_MESSAGES_KEY_PREFIX + canonicalId);
          if (rawStored) {
            const allLocal = JSON.parse(rawStored) as DirectMessage[];
            channel.send({
              type: 'broadcast',
              event: 'sync_response',
              payload: {
                conversationId: canonicalId,
                messages: allLocal,
              },
            });
          }
        } catch {
          // Ignore
        }
      }
    })
    // 7. P2P History Sync Response: Peer sent historical messages
    .on('broadcast', { event: 'sync_response' }, async ({ payload }) => {
      if (payload && payload.messages && Array.isArray(payload.messages)) {
        const merged = await mergeMessagesToLocalHistory(canonicalId, payload.messages, currentUserId, participantName);
        if (merged.length > 0 && onSyncHistory) {
          const mapped = merged.map((m) => ({
            ...m,
            isOutgoing: m.senderId === currentUserId,
            senderName: m.senderId === currentUserId ? 'You' : participantName,
          }));
          onSyncHistory(mapped);
        }
      }
    })
    // 8. PostgreSQL Database Replication
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${canonicalId}`,
      },
      async (payload) => {
        const raw = payload.new as DatabaseMessage;
        if (raw.sender_id !== currentUserId) {
          const incoming: DirectMessage = {
            id: raw.id,
            conversationId: raw.conversation_id,
            senderId: raw.sender_id,
            senderName: participantName,
            content: raw.content,
            createdAt: formatMessageTime(raw.created_at),
            isOutgoing: false,
            status: raw.read_at ? 'read' : 'delivered',
          };
          await saveMessageToLocalHistory(canonicalId, incoming, currentUserId, participantName);
          onNewMessage(incoming);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Request history sync from peer upon connection
        channel.send({
          type: 'broadcast',
          event: 'sync_request',
          payload: {
            conversationId: canonicalId,
            requesterId: currentUserId,
          },
        });
      }
    });

  return () => {
    try {
      channel.unsubscribe();
      channel.teardown();
      supabase.removeChannel(channel);
    } catch {
      // Ignore
    }
    try {
      (supabase as any).realtime.channels = (
        (supabase as any).realtime?.channels || []
      ).filter((c: any) => c.topic !== `realtime:${channelName}`);
    } catch {
      // Ignore
    }
  };
}

/**
 * App-wide global subscriber: Catches incoming messages on the chat list or background.
 */
export function subscribeToConversationsList(
  currentUserId: string,
  onUpdate: () => void
): () => void {
  if (!isSupabaseConfigured || !currentUserId) {
    return () => {};
  }

  const channel = getFreshChannel('conversations_global')
    .on('broadcast', { event: 'new_message' }, async ({ payload }) => {
      const msg = payload as DirectMessage;
      if (msg && msg.conversationId && msg.senderId !== currentUserId) {
        await saveMessageToLocalHistory(msg.conversationId, {
          ...msg,
          isOutgoing: false,
        }, currentUserId);
      }
      onUpdate();
    })
    .on('broadcast', { event: 'delete_message' }, () => {
      onUpdate();
    })
    .on('broadcast', { event: 'messages_read' }, () => {
      onUpdate();
    })
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
    try {
      channel.unsubscribe();
      channel.teardown();
      supabase.removeChannel(channel);
    } catch {
      // Ignore
    }
    try {
      (supabase as any).realtime.channels = (
        (supabase as any).realtime?.channels || []
      ).filter((c: any) => c.topic !== 'realtime:conversations_global');
    } catch {
      // Ignore
    }
  };
}

/**
 * Mark all incoming messages in a conversation as read.
 * 1. Updates all messages from peer in local storage to status: 'read'
 * 2. Broadcasts 'messages_read' event so sender's tick turns from single tick into double tick in real time!
 * 3. Resets unread counter in conversations index
 */
export async function markConversationAsRead(
  conversationId: string,
  currentUserId?: string
): Promise<void> {
  if (!conversationId) {
    return;
  }

  const canonicalId = conversationId;

  try {
    const key = STORAGE_MESSAGES_KEY_PREFIX + canonicalId;
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const list: DirectMessage[] = JSON.parse(raw);
      let hasChanges = false;
      const updatedList = list.map((m) => {
        // If current user is known, mark messages sent by the peer as read
        if (currentUserId && m.senderId !== currentUserId && m.status !== 'read') {
          hasChanges = true;
          return { ...m, status: 'read' as const };
        }
        return m;
      });

      if (hasChanges) {
        await AsyncStorage.setItem(key, JSON.stringify(updatedList));
      }
    }

    // Reset unread count in user's conversations index
    const storageKey = getConversationsStorageKey(currentUserId);
    const rawConvs = await AsyncStorage.getItem(storageKey);
    if (rawConvs) {
      const convList: DirectConversationPreview[] = JSON.parse(rawConvs);
      const targetIdx = convList.findIndex((c) => c.id === canonicalId);
      if (targetIdx !== -1 && convList[targetIdx].unreadCount > 0) {
        convList[targetIdx] = { ...convList[targetIdx], unreadCount: 0 };
        await AsyncStorage.setItem(storageKey, JSON.stringify(convList));
      }
    }

    // Broadcast messages_read event over Supabase Realtime so sender sees double tick!
    if (isSupabaseConfigured && currentUserId) {
      try {
        const roomChannel = supabase.channel(`room_${canonicalId}`);
        roomChannel.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: {
            conversationId: canonicalId,
            readerId: currentUserId,
            readAt: Date.now(),
          },
        });

        const globalChannel = supabase.channel('conversations_global');
        globalChannel.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: {
            conversationId: canonicalId,
            readerId: currentUserId,
            readAt: Date.now(),
          },
        });
      } catch {
        // Ignore broadcast failure
      }

      try {
        await supabase.rpc('mark_conversation_read', {
          target_conversation_id: canonicalId,
        });
      } catch {
        // Ignore
      }
    }
  } catch {
    // Ignore error
  }
}

/**
 * Send real-time typing status over the conversation room channel.
 */
export function sendTypingStatus(
  conversationId: string,
  currentUserId: string,
  isTyping: boolean
): void {
  if (!isSupabaseConfigured || !conversationId || !currentUserId) {
    return;
  }

  const canonicalId = conversationId;

  try {
    const roomChannel = supabase.channel(`room_${canonicalId}`);
    roomChannel.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        conversationId: canonicalId,
        senderId: currentUserId,
        isTyping,
      },
    });
  } catch {
    // Ignore broadcast errors
  }
}

export interface MatchedMessageItem {
  message: DirectMessage;
  conversation: DirectConversationPreview;
}

/**
 * Search across all conversations and message histories for a keyword.
 * Returns matching conversations as well as individual matching messages.
 */
export async function searchAllMessages(
  currentUserId: string,
  query: string
): Promise<{
  matchingConversations: DirectConversationPreview[];
  matchingMessages: MatchedMessageItem[];
}> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || !currentUserId) {
    return { matchingConversations: [], matchingMessages: [] };
  }

  const convs = await fetchConversations(currentUserId);
  const matchedConvs: DirectConversationPreview[] = [];
  const matchingMessages: MatchedMessageItem[] = [];

  for (const conv of convs) {
    let matchedInThisConv = false;

    // Check contact name & last snippet
    if (
      conv.participantName.toLowerCase().includes(cleanQuery) ||
      conv.participantUsername.toLowerCase().includes(cleanQuery) ||
      conv.lastMessageSnippet.toLowerCase().includes(cleanQuery)
    ) {
      matchedConvs.push(conv);
      matchedInThisConv = true;
    }

    // Deep search in message history
    try {
      const key = STORAGE_MESSAGES_KEY_PREFIX + conv.id;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const msgs: DirectMessage[] = JSON.parse(raw);
        for (const msg of msgs) {
          if (
            !msg.isDeletedForEveryone &&
            (!msg.deletedForUsers || !msg.deletedForUsers.includes(currentUserId)) &&
            msg.content.toLowerCase().includes(cleanQuery)
          ) {
            matchingMessages.push({ message: msg, conversation: conv });
            if (!matchedInThisConv) {
              matchedConvs.push(conv);
              matchedInThisConv = true;
            }
          }
        }
      }
    } catch {
      // Ignore storage read error
    }
  }

  return { matchingConversations: matchedConvs, matchingMessages };
}
