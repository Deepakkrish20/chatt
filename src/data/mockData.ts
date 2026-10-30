import { DirectConversationPreview, DirectMessage, UserSummary, MAX_REGISTERED_MEMBERS } from '@/types';

export const CURRENT_USER: UserSummary = {
  id: 'user_current',
  username: 'alex_v',
  displayName: 'Alex Vance',
  isOnline: true,
  statusText: 'Encrypted & Active',
  createdAt: '2026-01-15T00:00:00Z',
};

export const MOCK_CONVERSATIONS: DirectConversationPreview[] = [
  {
    id: 'conv_1',
    participantId: 'user_elena',
    participantName: 'Elena Rostova',
    participantUsername: 'elena_r',
    isOnline: true,
    lastMessageSnippet: 'The encrypted keys are synchronized. Meeting point confirmed.',
    lastMessageTimestamp: '10:42 AM',
    unreadCount: 2,
  },
  {
    id: 'conv_2',
    participantId: 'user_marcus',
    participantName: 'Marcus Thorne',
    participantUsername: 'marcus_t',
    isOnline: false,
    lastMessageSnippet: 'Confirmed. Talk to you tomorrow at 9.',
    lastMessageTimestamp: '08:15 AM',
    unreadCount: 0,
  },
  {
    id: 'conv_3',
    participantId: 'user_maya',
    participantName: 'Maya Lin',
    participantUsername: 'maya_l',
    isOnline: true,
    lastMessageSnippet: 'Let’s review the architectural specs for the new vault.',
    lastMessageTimestamp: 'Yesterday',
    unreadCount: 1,
  },
  {
    id: 'conv_4',
    participantId: 'user_julian',
    participantName: 'Julian Croft',
    participantUsername: 'julian_c',
    isOnline: false,
    lastMessageSnippet: 'Draft shared. Let me know what you think when you are free.',
    lastMessageTimestamp: 'Oct 28',
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {
  conv_1: [
    {
      id: 'm1',
      conversationId: 'conv_1',
      senderId: 'user_elena',
      senderName: 'Elena Rostova',
      content: 'Hello Alex, are you on a secure connection?',
      createdAt: '10:35 AM',
      isOutgoing: false,
      status: 'read',
    },
    {
      id: 'm2',
      conversationId: 'conv_1',
      senderId: 'user_current',
      senderName: 'Alex Vance',
      content: 'Always. Verified local device, zero third-party relays.',
      createdAt: '10:37 AM',
      isOutgoing: true,
      status: 'read',
    },
    {
      id: 'm3',
      conversationId: 'conv_1',
      senderId: 'user_elena',
      senderName: 'Elena Rostova',
      content: 'Good. The encrypted keys are synchronized. Meeting point confirmed.',
      createdAt: '10:42 AM',
      isOutgoing: false,
      status: 'read',
    },
  ],
  conv_2: [
    {
      id: 'm4',
      conversationId: 'conv_2',
      senderId: 'user_current',
      senderName: 'Alex Vance',
      content: 'Did the delivery arrive in Zurich?',
      createdAt: '08:10 AM',
      isOutgoing: true,
      status: 'read',
    },
    {
      id: 'm5',
      conversationId: 'conv_2',
      senderId: 'user_marcus',
      senderName: 'Marcus Thorne',
      content: 'Confirmed. Talk to you tomorrow at 9.',
      createdAt: '08:15 AM',
      isOutgoing: false,
      status: 'read',
    },
  ],
  conv_3: [
    {
      id: 'm6',
      conversationId: 'conv_3',
      senderId: 'user_maya',
      senderName: 'Maya Lin',
      content: 'Let’s review the architectural specs for the new vault.',
      createdAt: 'Yesterday',
      isOutgoing: false,
      status: 'read',
    },
  ],
  conv_4: [
    {
      id: 'm7',
      conversationId: 'conv_4',
      senderId: 'user_julian',
      senderName: 'Julian Croft',
      content: 'Draft shared. Let me know what you think when you are free.',
      createdAt: 'Oct 28',
      isOutgoing: false,
      status: 'read',
    },
  ],
};

export const MOCK_NETWORK_STATUS = {
  activeMembers: 4,
  maxMembers: MAX_REGISTERED_MEMBERS,
  slotsRemaining: MAX_REGISTERED_MEMBERS - 4,
};
