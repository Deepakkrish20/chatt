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

export interface DatabaseDirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}
