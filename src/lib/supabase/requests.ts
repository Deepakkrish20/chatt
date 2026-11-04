/**
 * Private 1:1 Chat Request & Connection Management Layer.
 *
 * Implements permission-based chat requests:
 * - High-speed atomic Supabase RPC operations
 * - Instant optimistic updates & local AsyncStorage caching
 * - Cross-device Realtime synchronization & live event broadcasting
 * - Deterministic connection state resolution (O(1) dictionary lookup)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './client';
import {
  ChatRequestStatus,
  UserConnectionState,
  DatabaseChatRequest,
  ChatRequestWithProfile,
  ConversationParticipantProfile,
} from './types';
import { getOrCreateConversation } from './messaging';
import { NETWORK_ACCOUNTS } from '@/data/mockData';

const STORAGE_REQUESTS_KEY_PREFIX = '@chatt_requests_';

function getRequestsStorageKey(userId: string): string {
  return `${STORAGE_REQUESTS_KEY_PREFIX}${userId || 'guest'}`;
}

/**
 * Fetch cached requests from local AsyncStorage.
 */
async function getStoredRequests(userId: string): Promise<DatabaseChatRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(getRequestsStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save requests to local AsyncStorage.
 */
async function saveStoredRequests(userId: string, list: DatabaseChatRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(getRequestsStorageKey(userId), JSON.stringify(list));
  } catch {
    // Ignore storage write error
  }
}

/**
 * Broadcast request events across connected devices.
 */
function broadcastRequestChange(payload: Record<string, any>) {
  if (!isSupabaseConfigured) return;
  try {
    const channel = supabase.channel('requests_global');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'request_change',
          payload,
        });
      }
    });
  } catch {
    // Broadcast fallback
  }
}

/**
 * Resolve participant profile from user ID (cloud profiles or mock network directory).
 */
async function resolveProfile(userId: string): Promise<ConversationParticipantProfile> {
  const fallback = NETWORK_ACCOUNTS.find(
    (a) => a.id === userId || a.username.toLowerCase() === userId.replace('user_', '').toLowerCase()
  );

  const defaultProfile: ConversationParticipantProfile = {
    id: userId,
    username: fallback?.username || userId.substring(0, 8),
    displayName: fallback?.displayName || fallback?.username || 'Member',
    avatarUrl: null,
    isOnline: true,
  };

  if (!isSupabaseConfigured || !userId) return defaultProfile;

  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name || data.username,
        avatarUrl: data.avatar_url,
        isOnline: data.status === 'online',
      };
    }
  } catch {
    // Ignore cloud profile resolution error
  }

  return defaultProfile;
}

/**
 * Send a chat request to another member.
 */
export async function sendChatRequest(
  targetUserId: string,
  currentUserId: string
): Promise<{
  success: boolean;
  requestId?: string;
  status?: ChatRequestStatus;
  message?: string;
  error?: string;
}> {
  if (!currentUserId || !targetUserId) {
    return { success: false, error: 'User IDs are required.' };
  }

  if (currentUserId === targetUserId) {
    return { success: false, error: 'Cannot send request to yourself.' };
  }

  // 1. Optimistic Local Store Update
  const localList = await getStoredRequests(currentUserId);
  const existingLocalIdx = localList.findIndex(
    (r) =>
      (r.sender_id === currentUserId && r.receiver_id === targetUserId) ||
      (r.sender_id === targetUserId && r.receiver_id === currentUserId)
  );

  const localReqId = existingLocalIdx >= 0 ? localList[existingLocalIdx].id : `req_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const optimisticReq: DatabaseChatRequest = {
    id: localReqId,
    sender_id: currentUserId,
    receiver_id: targetUserId,
    status: 'pending',
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (existingLocalIdx >= 0) {
    localList[existingLocalIdx] = optimisticReq;
  } else {
    localList.unshift(optimisticReq);
  }
  await saveStoredRequests(currentUserId, localList);

  // Also update target's local store if in simulated single-device environment
  const targetLocalList = await getStoredRequests(targetUserId);
  const targetIdx = targetLocalList.findIndex(
    (r) =>
      (r.sender_id === currentUserId && r.receiver_id === targetUserId) ||
      (r.sender_id === targetUserId && r.receiver_id === currentUserId)
  );
  if (targetIdx >= 0) {
    targetLocalList[targetIdx] = optimisticReq;
  } else {
    targetLocalList.unshift(optimisticReq);
  }
  await saveStoredRequests(targetUserId, targetLocalList);

  // 2. Cloud Server Sync via RPC
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('send_chat_request', {
        target_user_id: targetUserId,
      });

      if (!error && data && data.success) {
        broadcastRequestChange({
          senderId: currentUserId,
          receiverId: targetUserId,
          status: data.status,
          requestId: data.request_id,
        });

        return {
          success: true,
          requestId: data.request_id,
          status: data.status,
          message: data.message,
        };
      }

      // If RPC fails (e.g. not migrated yet), fallback to direct table upsert
      const { data: upsertData, error: upsertErr } = await supabase
        .from('chat_requests')
        .upsert(
          {
            sender_id: currentUserId,
            receiver_id: targetUserId,
            status: 'pending',
            updated_at: nowIso,
          },
          { onConflict: 'sender_id,receiver_id' }
        )
        .select('id, status')
        .single();

      if (!upsertErr && upsertData) {
        broadcastRequestChange({
          senderId: currentUserId,
          receiverId: targetUserId,
          status: upsertData.status,
          requestId: upsertData.id,
        });
        return {
          success: true,
          requestId: upsertData.id,
          status: upsertData.status as ChatRequestStatus,
          message: 'Chat request sent.',
        };
      }
    } catch {
      // Offline fallback already written to AsyncStorage
    }
  }

  broadcastRequestChange({
    senderId: currentUserId,
    receiverId: targetUserId,
    status: 'pending',
    requestId: localReqId,
  });

  return {
    success: true,
    requestId: localReqId,
    status: 'pending',
    message: 'Chat request sent successfully.',
  };
}

/**
 * Respond to a chat request ('accepted' or 'declined').
 */
export async function respondChatRequest(
  requestId: string,
  newStatus: 'accepted' | 'declined',
  currentUserId: string,
  peerId?: string
): Promise<{
  success: boolean;
  status?: ChatRequestStatus;
  conversationId?: string | null;
  error?: string;
}> {
  if (!requestId || !newStatus) {
    return { success: false, error: 'Request ID and new status are required.' };
  }

  let conversationId: string | null = null;
  const nowIso = new Date().toISOString();

  // 1. Optimistic Local Update
  const localList = await getStoredRequests(currentUserId);
  const reqIdx = localList.findIndex((r) => r.id === requestId);
  const foundPeerId =
    peerId ||
    (reqIdx >= 0
      ? localList[reqIdx].sender_id === currentUserId
        ? localList[reqIdx].receiver_id
        : localList[reqIdx].sender_id
      : undefined);

  if (reqIdx >= 0) {
    localList[reqIdx].status = newStatus;
    localList[reqIdx].updated_at = nowIso;
    await saveStoredRequests(currentUserId, localList);
  }

  // Also sync to peer's local store
  if (foundPeerId) {
    const peerLocalList = await getStoredRequests(foundPeerId);
    const peerIdx = peerLocalList.findIndex((r) => r.id === requestId);
    if (peerIdx >= 0) {
      peerLocalList[peerIdx].status = newStatus;
      peerLocalList[peerIdx].updated_at = nowIso;
      await saveStoredRequests(foundPeerId, peerLocalList);
    }
  }

  if (newStatus === 'accepted' && foundPeerId) {
    const convResult = await getOrCreateConversation(foundPeerId, currentUserId);
    conversationId = convResult.conversationId;
  }

  // 2. Cloud Server Sync
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('respond_chat_request', {
        request_id: requestId,
        new_status: newStatus,
      });

      if (!error && data && data.success) {
        if (data.conversation_id) {
          conversationId = data.conversation_id;
        }

        broadcastRequestChange({
          requestId,
          status: newStatus,
          receiverId: currentUserId,
          senderId: foundPeerId,
          conversationId,
        });

        return {
          success: true,
          status: newStatus,
          conversationId,
        };
      }

      // Direct table fallback
      await supabase
        .from('chat_requests')
        .update({ status: newStatus, updated_at: nowIso })
        .eq('id', requestId);

      if (newStatus === 'accepted' && foundPeerId) {
        const fallbackConv = await getOrCreateConversation(foundPeerId, currentUserId);
        conversationId = fallbackConv.conversationId;
      }
    } catch {
      // Offline fallback
    }
  }

  broadcastRequestChange({
    requestId,
    status: newStatus,
    receiverId: currentUserId,
    senderId: foundPeerId,
    conversationId,
  });

  return {
    success: true,
    status: newStatus,
    conversationId,
  };
}

/**
 * Fetch all incoming pending requests for the current user.
 */
export async function fetchIncomingChatRequests(
  currentUserId: string
): Promise<ChatRequestWithProfile[]> {
  if (!currentUserId) return [];

  let cloudRequests: DatabaseChatRequest[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('chat_requests')
        .select('*')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        cloudRequests = data as DatabaseChatRequest[];
      } else {
        const localList = await getStoredRequests(currentUserId);
        cloudRequests = localList.filter(
          (r) => r.receiver_id === currentUserId && r.status === 'pending'
        );
      }
    } catch {
      const localList = await getStoredRequests(currentUserId);
      cloudRequests = localList.filter(
        (r) => r.receiver_id === currentUserId && r.status === 'pending'
      );
    }
  } else {
    const localList = await getStoredRequests(currentUserId);
    cloudRequests = localList.filter(
      (r) => r.receiver_id === currentUserId && r.status === 'pending'
    );
  }

  // Attach sender profiles
  const results: ChatRequestWithProfile[] = await Promise.all(
    cloudRequests.map(async (req) => {
      const senderProfile = await resolveProfile(req.sender_id);
      return {
        ...req,
        sender: senderProfile,
      };
    })
  );

  return results;
}

/**
 * Fetch all outgoing pending requests sent by current user.
 */
export async function fetchOutgoingChatRequests(
  currentUserId: string
): Promise<ChatRequestWithProfile[]> {
  if (!currentUserId) return [];

  let cloudRequests: DatabaseChatRequest[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('chat_requests')
        .select('*')
        .eq('sender_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        cloudRequests = data as DatabaseChatRequest[];
      } else {
        const localList = await getStoredRequests(currentUserId);
        cloudRequests = localList.filter(
          (r) => r.sender_id === currentUserId && r.status === 'pending'
        );
      }
    } catch {
      const localList = await getStoredRequests(currentUserId);
      cloudRequests = localList.filter(
        (r) => r.sender_id === currentUserId && r.status === 'pending'
      );
    }
  } else {
    const localList = await getStoredRequests(currentUserId);
    cloudRequests = localList.filter(
      (r) => r.sender_id === currentUserId && r.status === 'pending'
    );
  }

  const results: ChatRequestWithProfile[] = await Promise.all(
    cloudRequests.map(async (req) => {
      const receiverProfile = await resolveProfile(req.receiver_id);
      return {
        ...req,
        receiver: receiverProfile,
      };
    })
  );

  return results;
}

/**
 * Clear stored chat requests for a user or all users locally.
 */
export async function clearAllStoredRequests(userId?: string): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.removeItem(getRequestsStorageKey(userId));
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const requestKeys = keys.filter((k) => k.startsWith(STORAGE_REQUESTS_KEY_PREFIX));
      if (requestKeys.length > 0) {
        await AsyncStorage.multiRemove(requestKeys);
      }
    }
  } catch {
    // Ignore storage clear error
  }
}

/**
 * Delete a specific chat request from cloud and local storage.
 */
export async function deleteChatRequest(
  requestId: string,
  currentUserId: string,
  peerUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isSupabaseConfigured) {
      await supabase.from('chat_requests').delete().eq('id', requestId);
    }

    // Clean current user local store
    const local = await getStoredRequests(currentUserId);
    const filtered = local.filter((r) => r.id !== requestId);
    await saveStoredRequests(currentUserId, filtered);

    // Clean peer user local store if known
    if (peerUserId) {
      const peerLocal = await getStoredRequests(peerUserId);
      const peerFiltered = peerLocal.filter((r) => r.id !== requestId);
      await saveStoredRequests(peerUserId, peerFiltered);
    }

    broadcastRequestChange({
      type: 'deleted',
      requestId,
      senderId: currentUserId,
      receiverId: peerUserId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete request' };
  }
}

/**
 * Remove any requests and reset connection between two users back to 'none'.
 */
export async function resetConnectionBetweenUsers(
  user1Id: string,
  user2Id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isSupabaseConfigured) {
      await supabase
        .from('chat_requests')
        .delete()
        .or(
          `and(sender_id.eq.${user1Id},receiver_id.eq.${user2Id}),and(sender_id.eq.${user2Id},receiver_id.eq.${user1Id})`
        );
    }

    const cleanUser = async (uId: string, otherId: string) => {
      const local = await getStoredRequests(uId);
      const updated = local.filter(
        (r) =>
          !(
            (r.sender_id === uId && r.receiver_id === otherId) ||
            (r.sender_id === otherId && r.receiver_id === uId)
          )
      );
      await saveStoredRequests(uId, updated);
    };

    await Promise.all([cleanUser(user1Id, user2Id), cleanUser(user2Id, user1Id)]);

    broadcastRequestChange({
      type: 'reset',
      senderId: user1Id,
      receiverId: user2Id,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset connection' };
  }
}

/**
 * Fetch connection states for all members relative to current user.
 * Returns a dictionary mapping peer_user_id -> { status, requestId }.
 */
export async function fetchUserConnectionMap(
  currentUserId: string
): Promise<Record<string, { status: UserConnectionState; requestId: string }>> {
  const result: Record<string, { status: UserConnectionState; requestId: string }> = {};
  if (!currentUserId) return result;

  let allRequests: DatabaseChatRequest[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('chat_requests')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (!error && data) {
        allRequests = data as DatabaseChatRequest[];
        // Cloud is authoritative: sync local store with current cloud state
        await saveStoredRequests(currentUserId, allRequests);
      } else {
        allRequests = await getStoredRequests(currentUserId);
      }
    } catch {
      allRequests = await getStoredRequests(currentUserId);
    }
  } else {
    allRequests = await getStoredRequests(currentUserId);
  }

  allRequests.forEach((req) => {
    const isSender = req.sender_id === currentUserId;
    const peerId = isSender ? req.receiver_id : req.sender_id;

    if (req.status === 'accepted') {
      result[peerId] = { status: 'accepted', requestId: req.id };
    } else if (req.status === 'pending') {
      result[peerId] = {
        status: isSender ? 'pending_sent' : 'pending_received',
        requestId: req.id,
      };
    } else if (req.status === 'declined') {
      result[peerId] = { status: 'declined', requestId: req.id };
    }
  });

  return result;
}

/**
 * Real-time subscription for chat requests.
 * Listens to Postgres changes on 'chat_requests' and global broadcast events.
 */
export function subscribeToChatRequests(
  currentUserId: string,
  onUpdate: () => void
): () => void {
  if (!isSupabaseConfigured || !currentUserId) {
    return () => {};
  }

  const channelName = `requests_sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'request_change' }, (payload) => {
      onUpdate();
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_requests',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    try {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch {
      // Ignore cleanup error
    }
  };
}
