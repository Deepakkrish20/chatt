/**
 * Core application types and domain models.
 *
 * Product Requirement:
 * The application strictly supports a maximum of 10 registered members,
 * with private one-to-one messaging only.
 */

export const MAX_REGISTERED_MEMBERS = 10;

export type ThemeMode = 'dark' | 'light';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface DirectConversationPreview {
  id: string;
  participantId: string;
  participantName: string;
  lastMessageSnippet?: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
}
