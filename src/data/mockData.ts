import { DirectConversationPreview, DirectMessage, UserSummary, MAX_REGISTERED_MEMBERS } from '@/types';

/**
 * Pre-configured in-built primary admin user.
 */
export const IN_BUILT_USER = {
  email: 'krishdeepak748@gmail.com',
  password: 'DeepakKrish@12345',
  displayName: 'Deepak Krish',
  username: 'deepak',
};

/**
 * Admin-provisioned accounts for instant one-click login and testing.
 */
export const PROVISIONED_ACCOUNTS = [
  {
    displayName: 'Deepak Krish (Admin)',
    username: 'deepak',
    email: 'krishdeepak748@gmail.com',
    password: 'DeepakKrish@12345',
    role: 'Admin',
  },
  {
    displayName: 'Jana Thiru',
    username: 'jana',
    email: 'jana@chatt.internal',
    password: 'Jana@12345',
    role: 'Member',
  },
  {
    displayName: 'Alex Rivera',
    username: 'alex',
    email: 'alex@chatt.internal',
    password: 'Alex@12345',
    role: 'Member',
  },
  {
    displayName: 'Sarah Chen',
    username: 'sarah',
    email: 'sarah@chatt.internal',
    password: 'Sarah@12345',
    role: 'Member',
  },
];

export const CURRENT_USER: UserSummary = {
  id: 'user_deepak',
  username: IN_BUILT_USER.username,
  displayName: IN_BUILT_USER.displayName,
  isOnline: true,
  statusText: 'Primary Admin • Device Verified',
  createdAt: '2026-01-01T00:00:00Z',
};

export const MOCK_MEMBERS: UserSummary[] = [];

export const MOCK_CONVERSATIONS: DirectConversationPreview[] = [];

export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {};

export const MOCK_NETWORK_STATUS = {
  activeMembers: PROVISIONED_ACCOUNTS.length,
  maxMembers: MAX_REGISTERED_MEMBERS,
  slotsRemaining: MAX_REGISTERED_MEMBERS - PROVISIONED_ACCOUNTS.length,
};
