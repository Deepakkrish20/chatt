/**
 * Supabase Database Schema types.
 *
 * Hardcoded Limit: Maximum of 10 registered members.
 */

export interface DatabaseProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status?: 'online' | 'offline' | 'away';
  created_at: string;
  updated_at: string;
}

export interface MemberCapacityResult {
  active_members: number;
  max_members: number;
  slots_remaining: number;
  is_full: boolean;
}

export interface DatabaseConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface ConversationParticipantProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export interface ConversationWithDetails {
  id: string;
  participant: ConversationParticipantProfile;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export type ChatRequestStatus = 'pending' | 'accepted' | 'declined';

export type UserConnectionState = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined';

export interface DatabaseChatRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: ChatRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatRequestWithProfile extends DatabaseChatRequest {
  sender?: ConversationParticipantProfile;
  receiver?: ConversationParticipantProfile;
}

