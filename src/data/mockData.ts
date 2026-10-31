import { DirectConversationPreview, DirectMessage, UserSummary, MAX_REGISTERED_MEMBERS } from '@/types';

export interface NetworkAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  password: string;
  role: string;
}

export const ADMIN_USER = {
  id: 'user_krish',
  email: 'krishdeepak748@gmail.com',
  displayName: 'krish',
  username: 'krish',
  password: 'DeepakKrish@12345',
  role: 'Network Admin',
};

export const NETWORK_ACCOUNTS: NetworkAccount[] = [
  {
    id: 'user_krish',
    email: 'krishdeepak748@gmail.com',
    username: 'krish',
    displayName: 'krish',
    password: 'DeepakKrish@12345',
    role: 'Network Admin',
  },
  {
    id: 'user_jana',
    email: 'janathiru0101@gmail.com',
    username: 'janathiru',
    displayName: 'Jana Thiru',
    password: 'janathiru@123',
    role: 'Verified Member',
  },
];

export const MOCK_MEMBERS: UserSummary[] = [];
export const MOCK_CONVERSATIONS: DirectConversationPreview[] = [];
export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {};

export const MOCK_NETWORK_STATUS = {
  activeMembers: 2,
  maxMembers: MAX_REGISTERED_MEMBERS,
  slotsRemaining: MAX_REGISTERED_MEMBERS - 2,
};
