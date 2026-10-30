import { DirectConversationPreview, DirectMessage, UserSummary, MAX_REGISTERED_MEMBERS } from '@/types';

/**
 * Pre-configured in-built primary user.
 */
export const IN_BUILT_USER = {
  email: 'krishdeepak748@gmail.com',
  password: 'DeepakKrish@12345',
  displayName: 'Deepak Krish',
  username: 'deepakkrish',
};

export const CURRENT_USER: UserSummary = {
  id: 'user_deepak',
  username: IN_BUILT_USER.username,
  displayName: IN_BUILT_USER.displayName,
  isOnline: true,
  statusText: 'Primary Member • Device Verified',
  createdAt: '2026-01-01T00:00:00Z',
};

/**
 * Empty collections - all mock users, conversations, and messages have been removed.
 * Data is exclusively loaded from Supabase.
 */
export const MOCK_MEMBERS: UserSummary[] = [];

export const MOCK_CONVERSATIONS: DirectConversationPreview[] = [];

export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {};

export const MOCK_NETWORK_STATUS = {
  activeMembers: 1, // Primary registered member
  maxMembers: MAX_REGISTERED_MEMBERS,
  slotsRemaining: MAX_REGISTERED_MEMBERS - 1,
};
