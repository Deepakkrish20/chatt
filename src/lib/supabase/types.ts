/**
 * Supabase Database Schema types placeholder.
 *
 * This file will be populated in future modules with generated or custom
 * database definitions (profiles, direct_messages, conversations).
 *
 * Hardcoded limit: Maximum of 10 registered members.
 */

export interface DatabaseProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away';
  created_at: string;
  updated_at: string;
}

export interface DatabaseDirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}
