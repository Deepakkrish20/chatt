/**
 * Core application types and domain models.
 *
 * Product Requirement:
 * The application strictly supports a maximum of 10 registered members,
 * with private one-to-one messaging only.
 */

export const MAX_REGISTERED_MEMBERS = 10;

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  statusText?: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isOutgoing: boolean;
  status: 'sent' | 'delivered' | 'read';
}

export interface DirectConversationPreview {
  id: string;
  participantId: string;
  participantName: string;
  participantUsername: string;
  isOnline: boolean;
  lastMessageSnippet: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}
