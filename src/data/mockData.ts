import { DirectConversationPreview, DirectMessage, UserSummary, MAX_REGISTERED_MEMBERS } from '@/types';

/**
 * Primary user credentials reference.
 */
export const ADMIN_USER = {
  email: 'krishdeepak748@gmail.com',
  displayName: 'krish',
  username: 'krish',
};

export const MOCK_MEMBERS: UserSummary[] = [];

export const MOCK_CONVERSATIONS: DirectConversationPreview[] = [];

export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {};

export const MOCK_NETWORK_STATUS = {
  activeMembers: 2,
  maxMembers: MAX_REGISTERED_MEMBERS,
  slotsRemaining: MAX_REGISTERED_MEMBERS - 2,
};
