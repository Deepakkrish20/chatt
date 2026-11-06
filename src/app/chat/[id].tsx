import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ThemedText,
  ScreenHeader,
  AppAvatar,
  MessageBubble,
  MessageComposer,
  AppIcon,
  AppButton,
  AuroraBackground,
} from '@/components';
import { useAppTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useSecurity } from '@/context/SecurityContext';
import { DECOY_MESSAGES } from '@/data/decoyData';
import {
  fetchMessages,
  sendDirectMessage,
  subscribeToConversationMessages,
  markConversationAsRead,
  deleteMessageForEveryone,
  deleteMessageForMe,
  clearChatForMe,
  isMessageWithinOneHour,
  getRemainingDeleteTime,
  toggleMessageReaction,
  sendTypingStatus,
  respondChatRequest,
  sendChatRequest,
  fetchUserConnectionMap,
  disconnectOrCancelRequest,
  subscribeToChatRequests,
  supabase,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { UserConnectionState } from '@/lib/supabase/types';
import { DirectMessage } from '@/types';
import { playWhisperAudio, isWhisperMessage, WhisperAudioData, WhisperPlaybackSession, formatAudioDuration } from '@/lib/audio';
import { isCapsuleMessage, parseCapsuleMessage, isCapsuleUnlocked } from '@/lib/capsule';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export default function PrivateChatScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { user, profile, recordActivity } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    online?: string;
    participantId?: string;
    query?: string;
  }>();

  const conversationId = params.id || 'conv_1';
  const currentUserId = user?.id || '';
  const { chameleonMode, isPrivacyLensEnabled, togglePrivacyLens } = useSecurity();
  const isDecoy = chameleonMode === 'decoy' || conversationId.startsWith('decoy_');

  // Peer resolution: Ensure user NEVER sees their own profile as the peer
  const myNames = [
    profile?.display_name?.toLowerCase(),
    profile?.username?.toLowerCase(),
    user?.user_metadata?.displayName?.toLowerCase(),
    user?.user_metadata?.username?.toLowerCase(),
    user?.email?.split('@')[0]?.toLowerCase(),
  ].filter(Boolean) as string[];

  const isParamMyOwnName = Boolean(params.name && myNames.includes(params.name.trim().toLowerCase()));

  const defaultPeerName = (profile?.username || user?.email || '').toLowerCase().includes('jana')
    ? 'krish'
    : 'Jana Thiru';

  const [participantName, setParticipantName] = useState(
    isParamMyOwnName || !params.name ? defaultPeerName : params.name
  );
  const [isOnline, setIsOnline] = useState(params.online === 'true');

  // Inferred peer ID if opened via canonical ID
  const inferredPeerId = useMemo(() => {
    if (params.participantId) return params.participantId;
    if (conversationId.startsWith('conv_')) {
      const clean = conversationId.replace(/^conv_/, '');
      const parts = clean.split('_');
      const cleanCurrent = currentUserId.replace(/^user_/, '');
      const match = parts.find((p) => p !== currentUserId && p !== cleanCurrent && p !== 'user_me');
      if (match) return match.startsWith('user_') ? match : `user_${match}`;
    }
    return '';
  }, [params.participantId, conversationId, currentUserId]);

  const [peerUserId, setPeerUserId] = useState<string>(inferredPeerId);
  const [connectionStatus, setConnectionStatus] = useState<UserConnectionState>('none');
  const [connectionRequestId, setConnectionRequestId] = useState<string>('');
  const [isRespondingToRequest, setIsRespondingToRequest] = useState(false);
  const [isManageConnectionModalOpen, setIsManageConnectionModalOpen] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const handleClearChat = async () => {
    if (isDecoy) {
      setMessages([]);
      setShowClearChatConfirm(false);
      return;
    }

    setIsClearingChat(true);
    const res = await clearChatForMe(conversationId, currentUserId);
    setIsClearingChat(false);
    setShowClearChatConfirm(false);
    if (res.success) {
      setMessages([]);
    }
  };

  // Earpiece-Only Whispers (Zero Loudspeaker) State
  const [activeWhisperId, setActiveWhisperId] = useState<string | null>(null);
  const [activeWhisperData, setActiveWhisperData] = useState<WhisperAudioData | null>(null);
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [isLoudspeakerGuardVisible, setIsLoudspeakerGuardVisible] = useState(false);
  const [isInEarMode, setIsInEarMode] = useState(false);
  const whisperPlaybackSessionRef = useRef<WhisperPlaybackSession | null>(null);

  useEffect(() => {
    return () => {
      if (whisperPlaybackSessionRef.current) {
        whisperPlaybackSessionRef.current.stop();
      }
    };
  }, []);

  const handlePlayWhisper = (whisper: WhisperAudioData, messageId: string) => {
    if (activeWhisperId === messageId) {
      whisperPlaybackSessionRef.current?.stop();
      whisperPlaybackSessionRef.current = null;
      setActiveWhisperId(null);
      setActiveWhisperData(null);
      setWhisperProgress(0);
      setIsInEarMode(false);
      return;
    }

    if (whisperPlaybackSessionRef.current) {
      whisperPlaybackSessionRef.current.stop();
      whisperPlaybackSessionRef.current = null;
    }

    setActiveWhisperId(messageId);
    setActiveWhisperData(whisper);
    setWhisperProgress(0);

    // ZERO LOUDSPEAKER ENFORCED: Refuse to play over open loudspeaker
    setIsLoudspeakerGuardVisible(true);
  };

  const handleStartInEarPlayback = () => {
    if (!activeWhisperData) return;
    setIsLoudspeakerGuardVisible(false);
    setIsInEarMode(true);

    whisperPlaybackSessionRef.current = playWhisperAudio(
      activeWhisperData,
      (current, total) => {
        setWhisperProgress(total > 0 ? current / total : 0);
      },
      () => {
        setIsInEarMode(false);
        setActiveWhisperId(null);
        setActiveWhisperData(null);
        setWhisperProgress(0);
        whisperPlaybackSessionRef.current = null;
      },
      true
    );
  };

  const handleStartLowVolumePlayback = () => {
    if (!activeWhisperData) return;
    setIsLoudspeakerGuardVisible(false);
    setIsInEarMode(false);

    whisperPlaybackSessionRef.current = playWhisperAudio(
      activeWhisperData,
      (current, total) => {
        setWhisperProgress(total > 0 ? current / total : 0);
      },
      () => {
        setActiveWhisperId(null);
        setActiveWhisperData(null);
        setWhisperProgress(0);
        whisperPlaybackSessionRef.current = null;
      },
      false
    );
  };

  const handleStopInEarPlayback = () => {
    if (whisperPlaybackSessionRef.current) {
      whisperPlaybackSessionRef.current.stop();
      whisperPlaybackSessionRef.current = null;
    }
    setIsInEarMode(false);
    setActiveWhisperId(null);
    setActiveWhisperData(null);
    setWhisperProgress(0);
  };

  // Load actual peer profile if conversation is on Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !conversationId || conversationId.startsWith('conv_') || !currentUserId) {
      return;
    }
    let isMounted = true;
    supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .maybeSingle()
      .then(async ({ data: conv }) => {
        if (!isMounted || !conv) return;
        const otherId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
        if (!otherId) return;
        setPeerUserId(otherId);
        const { data: peerProf } = await supabase
          .from('profiles')
          .select('display_name, username, status')
          .eq('id', otherId)
          .maybeSingle();
        if (isMounted && peerProf?.display_name) {
          setParticipantName(peerProf.display_name);
          setIsOnline(peerProf.status === 'online');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId]);

  // Check connection status between current user and peer & subscribe in realtime
  useEffect(() => {
    let isMounted = true;
    const targetPeerId = peerUserId || inferredPeerId;
    if (!currentUserId || !targetPeerId) {
      return;
    }

    const checkStatus = () => {
      fetchUserConnectionMap(currentUserId).then((map) => {
        if (!isMounted) return;
        const conn = map[targetPeerId];
        if (conn) {
          setConnectionStatus(conn.status);
          setConnectionRequestId(conn.requestId);
        } else {
          setConnectionStatus('none');
          setConnectionRequestId('');
        }
      });
    };

    checkStatus();

    const unsub = subscribeToChatRequests(currentUserId, () => {
      checkStatus();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [currentUserId, peerUserId, inferredPeerId]);


  // Resolve real conversation UUID if opened with stale 'conv_*' parameter
  useEffect(() => {
    if (!isSupabaseConfigured || !conversationId || !conversationId.startsWith('conv_') || !currentUserId) {
      return;
    }
    supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .limit(1)
      .then(({ data: convs }) => {
        if (convs && convs.length > 0) {
          const realId = convs[0].id;
          router.replace({
            pathname: '/chat/[id]',
            params: {
              id: realId,
              name: participantName,
              online: isOnline ? 'true' : 'false',
            },
          });
        }
      });
  }, [conversationId, currentUserId, participantName, isOnline]);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<DirectMessage | null>(null);
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList<DirectMessage>>(null);

  // In-Chat Message Search States
  const [isSearchActive, setIsSearchActive] = useState(Boolean(params.query));
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Calculate indices of messages matching the search keyword
  const matchingIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const indices: number[] = [];
    messages.forEach((m, idx) => {
      if (m.isDeletedForEveryone) return;
      if (isCapsuleMessage(m.content)) {
        const cap = parseCapsuleMessage(m.content);
        if (cap) {
          if (!isCapsuleUnlocked(cap)) {
            if (cap.title && cap.title.toLowerCase().includes(q)) {
              indices.push(idx);
            }
            return;
          }
          if (cap.ciphertext.toLowerCase().includes(q) || (cap.title && cap.title.toLowerCase().includes(q))) {
            indices.push(idx);
          }
          return;
        }
      }
      if (isWhisperMessage(m.content)) {
        if ('whisper'.includes(q) || 'voice note'.includes(q)) {
          indices.push(idx);
        }
        return;
      }
      if (m.content.toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [messages, searchQuery]);

  // Navigate to matching messages
  const handleNextMatch = () => {
    if (matchingIndices.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchingIndices.length;
    setCurrentMatchIdx(nextIdx);
    const targetIdx = matchingIndices[nextIdx];
    flatListRef.current?.scrollToIndex({
      index: targetIdx,
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handlePrevMatch = () => {
    if (matchingIndices.length === 0) return;
    const prevIdx =
      (currentMatchIdx - 1 + matchingIndices.length) % matchingIndices.length;
    setCurrentMatchIdx(prevIdx);
    const targetIdx = matchingIndices[prevIdx];
    flatListRef.current?.scrollToIndex({
      index: targetIdx,
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setCurrentMatchIdx(0);
  };

  // Scroll to latest match when search query changes
  useEffect(() => {
    if (matchingIndices.length > 0) {
      const timer = setTimeout(() => {
        setCurrentMatchIdx(matchingIndices.length - 1);
        flatListRef.current?.scrollToIndex({
          index: matchingIndices[matchingIndices.length - 1],
          animated: true,
          viewPosition: 0.5,
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [matchingIndices]);

  useEffect(() => {
    let isMounted = true;

    if (isDecoy) {
      const decoyTimer = setTimeout(() => {
        if (isMounted) {
          setMessages(DECOY_MESSAGES[conversationId] || []);
          setIsLoading(false);
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(decoyTimer);
      };
    }

    fetchMessages(conversationId, currentUserId, participantName).then((history) => {
      if (isMounted) {
        setMessages(history);
        setIsLoading(false);
        markConversationAsRead(conversationId, currentUserId);
      }
    });

    // Subscribe to live incoming messages, auto-sync history, real-time message deletions, reactions & typing status
    const unsubscribe = subscribeToConversationMessages(
      conversationId,
      currentUserId,
      participantName,
      (newMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
        markConversationAsRead(conversationId, currentUserId);
      },
      (syncedHistory) => {
        if (!isMounted) return;
        setMessages(syncedHistory);
      },
      (deletedMessageId) => {
        if (!isMounted) return;
        // Real-time update when peer or system deletes a message for everyone
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deletedMessageId
              ? { ...m, content: 'This message was deleted', isDeletedForEveryone: true }
              : m
          )
        );
      },
      (updatedMessageId, reactions) => {
        if (!isMounted) return;
        // Real-time update when peer or current user adds/toggles an emoji reaction
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMessageId ? { ...m, reactions } : m
          )
        );
      },
      (readerId) => {
        if (!isMounted) return;
        // Peer opened the chat! Instant real-time upgrade from single tick to double tick
        setMessages((prev) =>
          prev.map((m) =>
            m.isOutgoing || m.senderId === currentUserId
              ? { ...m, status: 'read' }
              : m
          )
        );
      },
      (isTyping) => {
        if (!isMounted) return;
        setIsPeerTyping(isTyping);
        if (peerTypingTimeoutRef.current) {
          clearTimeout(peerTypingTimeoutRef.current);
        }
        if (isTyping) {
          // Automatic failsafe: clear typing indicator if peer disconnects or stops without packet
          peerTypingTimeoutRef.current = setTimeout(() => {
            if (isMounted) setIsPeerTyping(false);
          }, 3500);
        }
      }
    );

    return () => {
      isMounted = false;
      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
      }
      sendTypingStatus(conversationId, currentUserId, false);
      unsubscribe();
    };
  }, [conversationId, currentUserId, participantName, isDecoy]);

  const handleUserTyping = (isTyping: boolean) => {
    sendTypingStatus(conversationId, currentUserId, isTyping);
  };

  const handleOpenMessageOptions = (msg: DirectMessage) => {
    if (msg.id.startsWith('temp_')) return;
    setSelectedMessage(msg);
    setDeleteError(null);
    setIsActionModalOpen(true);
  };

  const handleDoubleTapMessage = (msg: DirectMessage) => {
    if (msg.id.startsWith('temp_') || msg.isDeletedForEveryone) return;
    setReactionTargetMessage(msg);
    setIsReactionModalOpen(true);
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!reactionTargetMessage) return;
    const targetMsgId = reactionTargetMessage.id;
    setIsReactionModalOpen(false);
    setReactionTargetMessage(null);

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== targetMsgId) return m;
        const existing = m.reactions || [];
        const userIdx = existing.findIndex((r) => r.userId === currentUserId);
        let updated;
        if (userIdx >= 0 && existing[userIdx].emoji === emoji) {
          updated = existing.filter((_, idx) => idx !== userIdx);
        } else if (userIdx >= 0) {
          updated = [...existing];
          updated[userIdx] = { emoji, userId: currentUserId };
        } else {
          updated = [...existing, { emoji, userId: currentUserId }];
        }
        return { ...m, reactions: updated };
      })
    );

    // Persist & broadcast
    await toggleMessageReaction(conversationId, targetMsgId, emoji, currentUserId);
    recordActivity();
  };

  const handleDeleteForEveryone = async () => {
    if (!selectedMessage || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteMessageForEveryone(
      conversationId,
      selectedMessage.id,
      currentUserId
    );

    setIsDeleting(false);

    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete message for everyone.');
      return;
    }

    // Instantly reflect in local state
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessage.id
          ? { ...m, content: 'This message was deleted', isDeletedForEveryone: true }
          : m
      )
    );

    setIsActionModalOpen(false);
    setSelectedMessage(null);
  };

  const handleDeleteForMe = async () => {
    if (!selectedMessage || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteMessageForMe(
      conversationId,
      selectedMessage.id,
      currentUserId
    );

    setIsDeleting(false);

    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete message for this account.');
      return;
    }

    // Instantly remove from view for this account
    setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));

    setIsActionModalOpen(false);
    setSelectedMessage(null);
  };

  // Auto scroll to bottom on message update
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [messages.length, isPeerTyping]);

  // Auto scroll to bottom when keyboard appears (like WhatsApp / Instagram)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 180);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // When keyboard is visible, soft keyboard provides bottom spacing.
  // When keyboard is closed, pad for navigation bar / gesture home indicator.
  const composerBottomInset = isKeyboardVisible ? 0 : Math.max(insets.bottom, 0);

  const handleSendMessage = async (content: string) => {
    if (isSending || !content.trim()) return;

    if (isDecoy) {
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: DirectMessage = {
        id: tempId,
        conversationId,
        senderId: currentUserId || 'decoy_user_01',
        senderName: 'You',
        content: content.trim(),
        createdAt: 'Just now',
        isOutgoing: true,
        status: 'read',
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      setTimeout(() => {
        const autoReply: DirectMessage = {
          id: `rep_${Date.now()}`,
          conversationId,
          senderId: 'decoy_peer',
          senderName: participantName,
          content: 'Got it, thanks!',
          createdAt: 'Just now',
          isOutgoing: false,
          status: 'read',
        };
        setMessages((prev) => [...prev, autoReply]);
      }, 1200);
      return;
    }

    if (connectionStatus !== 'accepted') {
      setSendError('You must be connected to send messages. Chat request pending.');
      return;
    }

    setIsSending(true);
    setSendError(null);

    // Optimistic local representation
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      conversationId,
      senderId: currentUserId || 'user_current',
      senderName: 'You',
      content: content.trim(),
      createdAt: 'Just now',
      isOutgoing: true,
      status: 'sent',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await sendDirectMessage(
      conversationId,
      content,
      currentUserId
    );

    setIsSending(false);

    if (error) {
      setSendError(error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    if (data) {
      // Replace optimistic entry with server-confirmed message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      recordActivity();
    }
  };

  const isSelectedMsgOutgoing =
    selectedMessage?.isOutgoing ||
    selectedMessage?.senderId === currentUserId;
  const isAlreadyDeletedForEveryone = Boolean(
    selectedMessage?.isDeletedForEveryone
  );
  const canDeleteForEveryone = Boolean(
    isSelectedMsgOutgoing &&
    !isAlreadyDeletedForEveryone &&
    selectedMessage &&
    isMessageWithinOneHour(selectedMessage)
  );
  const remainingTimeStr =
    selectedMessage && isSelectedMsgOutgoing && !isAlreadyDeletedForEveryone
      ? getRemainingDeleteTime(selectedMessage)
      : '';

  return (
    <AuroraBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Contact Header */}
        <ScreenHeader
          title={participantName}
          subtitle={
            isPeerTyping
              ? 'Typing…'
              : isOnline
              ? 'Online'
              : 'Direct Channel'
          }
          subtitleColor={isOnline ? '#C084FC' : undefined}
          showBack
          onBack={() => router.back()}
          style={{ backgroundColor: 'transparent', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }}
          rightElement={
            <View style={styles.headerRightGroup}>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  setIsSearchActive((prev) => !prev);
                  if (isSearchActive) {
                    setSearchQuery('');
                  }
                }}
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  {
                    backgroundColor: isSearchActive ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    borderColor: isSearchActive ? 'rgba(168, 85, 247, 0.4)' : 'transparent',
                    borderWidth: 1,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Search messages in chat"
              >
                <AppIcon
                  name="search"
                  size={18}
                  color={isSearchActive ? '#C084FC' : colors.text}
                />
              </Pressable>
              {!isDecoy ? (
                <Pressable
                  hitSlop={10}
                  onPress={async () => {
                    await togglePrivacyLens();
                  }}
                  style={({ pressed }) => [
                    styles.headerIconBtn,
                    {
                      backgroundColor: isPrivacyLensEnabled ? 'rgba(168, 85, 247, 0.22)' : 'transparent',
                      borderColor: isPrivacyLensEnabled ? 'rgba(168, 85, 247, 0.45)' : 'transparent',
                      borderWidth: 1,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Privacy Lens"
                >
                  <AppIcon
                    name={isPrivacyLensEnabled ? 'eye' : 'eye-off'}
                    size={18}
                    color={isPrivacyLensEnabled ? '#C084FC' : colors.textMuted}
                  />
                </Pressable>
              ) : null}
              {!isDecoy ? (
                <Pressable
                  hitSlop={10}
                  onPress={() => setIsManageConnectionModalOpen(true)}
                  style={({ pressed }) => [
                    styles.headerIconBtn,
                    {
                      backgroundColor: isManageConnectionModalOpen ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                      borderColor: isManageConnectionModalOpen ? 'rgba(168, 85, 247, 0.4)' : 'transparent',
                      borderWidth: 1,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Manage connection"
                >
                  <AppIcon name="more" size={18} color={colors.text} />
                </Pressable>
              ) : null}
              <AppAvatar
                name={participantName}
                size="sm"
                isOnline={isOnline}
              />
            </View>
          }
        />

        {/* In-Chat Message Search Bar */}
        {Boolean(isSearchActive) ? (
          <View
            style={[
              styles.inChatSearchContainer,
              {
                backgroundColor: colors.surfaceElevated,
                borderBottomColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View
              style={[
                styles.inChatSearchInputWrapper,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppIcon name="search" size={15} color={colors.textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search in conversation…"
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={[
                  typography.body,
                  styles.inChatSearchTextInput,
                  { color: colors.text },
                ]}
              />
              {Boolean(searchQuery) ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
                  <AppIcon name="close" size={13} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {/* Match Counter & Next/Prev Controls */}
            <View style={styles.inChatSearchNavGroup}>
              {Boolean(searchQuery.trim()) ? (
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={styles.matchCountText}
                >
                  {matchingIndices.length > 0
                    ? `${currentMatchIdx + 1}/${matchingIndices.length}`
                    : '0 found'}
                </ThemedText>
              ) : null}

              <Pressable
                disabled={matchingIndices.length === 0}
                onPress={handlePrevMatch}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.navArrowBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    opacity: pressed || matchingIndices.length === 0 ? 0.35 : 1,
                  },
                ]}
                accessibilityLabel="Previous match"
              >
                <AppIcon name="chevron-up" size={14} color={colors.text} />
              </Pressable>

              <Pressable
                disabled={matchingIndices.length === 0}
                onPress={handleNextMatch}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.navArrowBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    opacity: pressed || matchingIndices.length === 0 ? 0.35 : 1,
                  },
                ]}
                accessibilityLabel="Next match"
              >
                <AppIcon name="chevron-down" size={14} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={handleCloseSearch}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeSearchBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <ThemedText variant="captionMedium" style={{ color: '#38BDF8', marginLeft: 4 }}>
                  Done
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Security / Encryption Notice */}
        <View
          style={[
            styles.securityNotice,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <ThemedText variant="label" tone="muted" style={{ textAlign: 'center', letterSpacing: 0.5 }}>
              ENCRYPTED 1:1 CHANNEL • HARDWARE-ISOLATED
            </ThemedText>
          </View>
        </View>

        {/* Send Error Banner */}
        {Boolean(sendError) ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 2,
              },
            ]}
          >
            <ThemedText variant="caption" tone="primary" style={{ flex: 1 }}>
              {sendError}
            </ThemedText>
            <Pressable onPress={() => setSendError(null)} hitSlop={8}>
              <AppIcon name="close" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Message Thread */}
          {Boolean(isLoading) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.text} />
              <ThemedText
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.sm }}
              >
                Retrieving isolated messages…
              </ThemedText>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              }}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  animate={item.id.startsWith('temp_') || item.id.startsWith('m_reply_')}
                  onLongPress={() => handleOpenMessageOptions(item)}
                  onDoubleTap={() => handleDoubleTapMessage(item)}
                  searchKeyword={isSearchActive ? searchQuery : undefined}
                  isPrivacyLensActive={isPrivacyLensEnabled && !isDecoy}
                  onPlayWhisper={(whisper) => handlePlayWhisper(whisper, item.id)}
                  isPlayingWhisper={activeWhisperId === item.id}
                  whisperProgress={activeWhisperId === item.id ? whisperProgress : 0}
                />
              )}
              contentContainerStyle={[
                styles.messageList,
                {
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.md,
                  paddingBottom: spacing.sm,
                  justifyContent: messages.length === 0 ? 'center' : undefined,
                },
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
                  <View
                    style={[
                      styles.emptyIconBox,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <AppIcon
                      name={isSearchActive && searchQuery ? 'search' : 'lock'}
                      size={24}
                      color={colors.text}
                    />
                  </View>
                  <ThemedText variant="bodyMedium" style={{ marginTop: spacing.md }}>
                    {isSearchActive && searchQuery
                      ? 'No matching messages'
                      : 'No messages yet'}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                    {isSearchActive && searchQuery
                      ? `No messages in this chat matched "${searchQuery}".`
                      : 'Send a private message to open this direct channel.'}
                  </ThemedText>
                </View>
              }
            />
          )}

          {/* Peer Typing Indicator */}
          {Boolean(isPeerTyping) ? (
            <View
              style={[
                styles.typingRow,
                { paddingHorizontal: spacing.md, marginBottom: spacing.xs },
              ]}
            >
              <View
                style={[
                  styles.typingBubble,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <ThemedText variant="label" tone="muted">
                  {participantName.split(' ')[0]} is typing…
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* Permission Guard Banner */}
          {connectionStatus === 'pending_sent' ? (
            <View
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: 'rgba(168, 85, 247, 0.12)',
                  borderColor: 'rgba(168, 85, 247, 0.35)',
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.xs,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                },
              ]}
            >
              <AppIcon name="lock" size={16} color="#C084FC" />
              <ThemedText variant="captionMedium" style={{ color: '#E9D5FF', flex: 1, marginLeft: 8 }}>
                Request Pending: Waiting for {participantName} to accept.
              </ThemedText>
              <AppButton
                title="Cancel"
                variant="outline"
                size="sm"
                loading={isRespondingToRequest}
                onPress={async () => {
                  setIsRespondingToRequest(true);
                  const target = peerUserId || inferredPeerId;
                  await disconnectOrCancelRequest(target, currentUserId);
                  setConnectionStatus('none');
                  setIsRespondingToRequest(false);
                }}
              />
            </View>
          ) : connectionStatus === 'pending_received' ? (
            <View
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: 'rgba(168, 85, 247, 0.18)',
                  borderColor: '#A855F7',
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.xs,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                },
              ]}
            >
              <ThemedText variant="captionMedium" style={{ color: '#FFFFFF', flex: 1 }}>
                {participantName} wants to chat.
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <AppButton
                  title="Accept"
                  variant="primary"
                  size="sm"
                  loading={isRespondingToRequest}
                  onPress={async () => {
                    setIsRespondingToRequest(true);
                    const target = peerUserId || inferredPeerId;
                    await respondChatRequest(connectionRequestId, 'accepted', currentUserId, target);
                    setConnectionStatus('accepted');
                    setIsRespondingToRequest(false);
                  }}
                />
                <AppButton
                  title="Decline"
                  variant="outline"
                  size="sm"
                  disabled={isRespondingToRequest}
                  onPress={async () => {
                    setIsRespondingToRequest(true);
                    const target = peerUserId || inferredPeerId;
                    await respondChatRequest(connectionRequestId, 'declined', currentUserId, target);
                    setConnectionStatus('declined');
                    setIsRespondingToRequest(false);
                    router.back();
                  }}
                />
              </View>
            </View>
          ) : connectionStatus === 'declined' || connectionStatus === 'none' ? (
            <View
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.xs,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                },
              ]}
            >
              <ThemedText variant="captionMedium" style={{ color: '#FCA5A5', flex: 1 }}>
                Permission required to chat.
              </ThemedText>
              <AppButton
                title="+ Send Request"
                variant="primary"
                size="sm"
                loading={isRespondingToRequest}
                onPress={async () => {
                  setIsRespondingToRequest(true);
                  const target = peerUserId || inferredPeerId;
                  const res = await sendChatRequest(target, currentUserId);
                  if (res.success) {
                    setConnectionStatus('pending_sent');
                  }
                  setIsRespondingToRequest(false);
                }}
              />
            </View>
          ) : null}

          {/* Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            onTyping={handleUserTyping}
            disabled={isSending || connectionStatus !== 'accepted'}
            placeholder={
              connectionStatus !== 'accepted'
                ? 'Chat request pending…'
                : 'Message…'
            }
            bottomInset={composerBottomInset}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* WhatsApp-Style Message Delete / Action Modal */}
      <Modal
        visible={isActionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setIsActionModalOpen(false);
            setSelectedMessage(null);
          }
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!isDeleting) {
              setIsActionModalOpen(false);
              setSelectedMessage(null);
            }
          }}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: 16,
                padding: spacing.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View
                style={[
                  styles.modalIconBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderSubtle,
                    borderRadius: 10,
                  },
                ]}
              >
                <AppIcon name="trash" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
                <ThemedText variant="h3" style={{ fontSize: 16 }}>
                  Delete Message
                </ThemedText>
                <ThemedText variant="caption" tone="secondary">
                  Choose how to remove this message
                </ThemedText>
              </View>
            </View>

            {/* Message Excerpt Preview */}
            {selectedMessage ? (
              <View
                style={[
                  styles.messagePreviewBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm + 3,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  tone="muted"
                  numberOfLines={2}
                  style={{ fontStyle: 'italic' }}
                >
                  {`"${
                    isWhisperMessage(selectedMessage.content)
                      ? '🔒 Whisper Voice Note'
                      : isCapsuleMessage(selectedMessage.content)
                      ? `⏳ Memory Capsule${parseCapsuleMessage(selectedMessage.content)?.title ? `: ${parseCapsuleMessage(selectedMessage.content)?.title}` : ''}`
                      : selectedMessage.content
                  }"`}
                </ThemedText>
                <ThemedText
                  variant="label"
                  tone="muted"
                  style={{ fontSize: 10, marginTop: 4, textAlign: 'right' }}
                >
                  Sent {selectedMessage.createdAt}
                </ThemedText>
              </View>
            ) : null}

            {/* Error Notification */}
            {Boolean(deleteError) ? (
              <View
                style={[
                  styles.modalErrorBox,
                  {
                    backgroundColor: '#200D10',
                    borderColor: '#881337',
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <ThemedText variant="caption" style={{ color: '#F43F5E' }}>
                  {deleteError}
                </ThemedText>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={{ marginTop: spacing.md }}>
              {/* Option 0: React to message (Quick reaction) */}
              {!isAlreadyDeletedForEveryone ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionOptionBtn,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => {
                    const target = selectedMessage;
                    setIsActionModalOpen(false);
                    setSelectedMessage(null);
                    if (target) {
                      setReactionTargetMessage(target);
                      setIsReactionModalOpen(true);
                    }
                  }}
                >
                  <View style={styles.actionOptionHeader}>
                    <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                      React to message
                    </ThemedText>
                    <ThemedText style={{ fontSize: 16 }}>❤️ 👍 😂</ThemedText>
                  </View>
                  <ThemedText
                    variant="caption"
                    tone="secondary"
                    style={{ marginTop: 3, fontSize: 11 }}
                  >
                    Quickly add or toggle an emoji reaction (also on double-tap)
                  </ThemedText>
                </Pressable>
              ) : null}

              {/* Option 1: Delete for everyone (Sender only, strictly within 1 hour) */}
              {isSelectedMsgOutgoing && !isAlreadyDeletedForEveryone ? (
                canDeleteForEveryone ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionOptionBtn,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                        opacity: pressed || isDeleting ? 0.7 : 1,
                      },
                    ]}
                    onPress={handleDeleteForEveryone}
                    disabled={isDeleting}
                  >
                    <View style={styles.actionOptionHeader}>
                      <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                        Delete for everyone
                      </ThemedText>
                      <View
                        style={[
                          styles.timeBadge,
                          {
                            backgroundColor: '#111827',
                            borderColor: '#1F2937',
                            borderRadius: radius.sm,
                          },
                        ]}
                      >
                        <ThemedText
                          variant="label"
                          style={{ fontSize: 10, color: '#38BDF8', fontWeight: '600' }}
                        >
                          {remainingTimeStr}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      variant="caption"
                      tone="secondary"
                      style={{ marginTop: 3, fontSize: 11 }}
                    >
                      Replaces this message for all participants • 1-hour window
                    </ThemedText>
                  </Pressable>
                ) : (
                  <View
                    style={[
                      styles.expiredNoticeBox,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.sm + 2,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="ban" size={13} color="#737373" />
                      <ThemedText
                        variant="caption"
                        style={{ color: '#737373', fontWeight: '600' }}
                      >
                        Delete for everyone expired
                      </ThemedText>
                    </View>
                    <ThemedText
                      variant="label"
                      tone="muted"
                      style={{ marginTop: 2, fontSize: 11 }}
                    >
                      Messages can only be deleted for everyone within 1 hour from sending.
                    </ThemedText>
                  </View>
                )
              ) : null}

              {/* Option 2: Delete for me (Always available, no time limit) */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionOptionBtn,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    opacity: pressed || isDeleting ? 0.7 : 1,
                  },
                ]}
                onPress={handleDeleteForMe}
                disabled={isDeleting}
              >
                <View style={styles.actionOptionHeader}>
                  <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                    Delete for me
                  </ThemedText>
                  <View
                    style={[
                      styles.timeBadge,
                      {
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="label"
                      style={{ fontSize: 10, color: '#A3A3A3', fontWeight: '600' }}
                    >
                      No time limit
                    </ThemedText>
                  </View>
                </View>
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={{ marginTop: 3, fontSize: 11 }}
                >
                  Removes this message only from your account. Other members still see it.
                </ThemedText>
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 2,
                    marginTop: spacing.xs,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => {
                  setIsActionModalOpen(false);
                  setSelectedMessage(null);
                }}
                disabled={isDeleting}
              >
                <ThemedText
                  variant="bodyMedium"
                  tone="secondary"
                  style={{ textAlign: 'center', fontWeight: '500' }}
                >
                  Cancel
                </ThemedText>
              </Pressable>
            </View>

            {/* Spinner Overlay */}
            {Boolean(isDeleting) ? (
              <View style={styles.busyOverlay}>
                <ActivityIndicator size="small" color={colors.text} />
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{ marginTop: spacing.xs }}
                >
                  Updating chat…
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* WhatsApp-Style Floating Reaction Picker Pop-up */}
      <Modal
        visible={isReactionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsReactionModalOpen(false);
          setReactionTargetMessage(null);
        }}
      >
        <Pressable
          style={styles.reactionBackdrop}
          onPress={() => {
            setIsReactionModalOpen(false);
            setReactionTargetMessage(null);
          }}
        >
          <Pressable
            style={[
              styles.reactionPopupCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: 16,
                padding: spacing.md,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.reactionPopupHeader}>
              <ThemedText
                variant="label"
                tone="muted"
                style={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 11 }}
              >
                Telemetry Reaction
              </ThemedText>
            </View>

            {/* Horizontal Emoji Bar */}
            <View style={styles.emojiRow}>
              {QUICK_REACTION_EMOJIS.map((emoji) => {
                const isSelectedByMe = reactionTargetMessage?.reactions?.some(
                  (r) => r.userId === currentUserId && r.emoji === emoji
                );

                return (
                  <Pressable
                    key={emoji}
                    onPress={() => handleSelectReaction(emoji)}
                    style={({ pressed }) => [
                      styles.emojiButton,
                      {
                        backgroundColor: isSelectedByMe
                          ? colors.surfaceSecondary
                          : 'transparent',
                        borderColor: isSelectedByMe ? colors.accent : 'transparent',
                        transform: [{ scale: pressed ? 1.25 : 1 }],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${emoji}`}
                  >
                    <ThemedText style={styles.popupEmojiText}>{emoji}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Message Excerpt Preview */}
            {reactionTargetMessage ? (
              <View
                style={[
                  styles.reactionMessagePreview,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs + 2,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  tone="muted"
                  numberOfLines={1}
                  style={{ fontStyle: 'italic' }}
                >
                  {`"${reactionTargetMessage.content}"`}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Manage Connection & Relationship Modal */}
      <Modal
        visible={isManageConnectionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsManageConnectionModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsManageConnectionModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: '#181822',
                borderColor: 'rgba(168, 85, 247, 0.4)',
                padding: spacing.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppAvatar name={participantName} size="md" isOnline={isOnline} />
                <View>
                  <ThemedText variant="bodyMedium" style={{ fontWeight: '700' }}>
                    {participantName}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    Direct Encrypted Channel
                  </ThemedText>
                </View>
              </View>
              <Pressable
                hitSlop={12}
                onPress={() => setIsManageConnectionModalOpen(false)}
                style={{ padding: 4 }}
              >
                <AppIcon name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Status Pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: radius.md,
                marginBottom: spacing.lg,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <ThemedText variant="caption" tone="secondary">
                Connection Status:
              </ThemedText>
              <View
                style={[
                  styles.timeBadge,
                  {
                    backgroundColor:
                      connectionStatus === 'accepted'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : connectionStatus === 'pending_sent'
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    borderColor:
                      connectionStatus === 'accepted'
                        ? '#22C55E'
                        : connectionStatus === 'pending_sent'
                        ? '#A855F7'
                        : '#EF4444',
                    borderRadius: radius.full,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  },
                ]}
              >
                <ThemedText
                  variant="label"
                  style={{
                    color:
                      connectionStatus === 'accepted'
                        ? '#4ADE80'
                        : connectionStatus === 'pending_sent'
                        ? '#C084FC'
                        : '#FCA5A5',
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {connectionStatus === 'accepted'
                    ? 'Connected 🤝'
                    : connectionStatus === 'pending_sent'
                    ? 'Request Sent ⏳'
                    : connectionStatus === 'pending_received'
                    ? 'Incoming Request 📩'
                    : 'Not Connected 🔒'}
                </ThemedText>
              </View>
            </View>

            {/* Action options */}
            {connectionStatus === 'accepted' ? (
              <View style={{ gap: spacing.sm }}>
                <AppButton
                  title="Clear Chat (My Side Only)"
                  variant="outline"
                  onPress={() => {
                    setIsManageConnectionModalOpen(false);
                    setShowClearChatConfirm(true);
                  }}
                />
                <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center', lineHeight: 16 }}>
                  Permanently deletes all messages on your device. {participantName} keeps their copy intact.
                </ThemedText>

                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.12)', marginVertical: 4 }} />

                <AppButton
                  title="Disconnect Connection"
                  variant="outline"
                  loading={isDisconnecting}
                  onPress={() => {
                    setIsManageConnectionModalOpen(false);
                    setShowDisconnectConfirm(true);
                  }}
                />
                <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center', lineHeight: 16 }}>
                  Disconnecting revokes chat permission and clears this conversation. Both members can re-connect anytime.
                </ThemedText>
              </View>
            ) : connectionStatus === 'pending_sent' ? (
              <View style={{ gap: spacing.sm }}>
                <AppButton
                  title="Cancel Sent Request"
                  variant="outline"
                  loading={isDisconnecting}
                  onPress={async () => {
                    setIsDisconnecting(true);
                    const target = peerUserId || inferredPeerId;
                    await disconnectOrCancelRequest(target, currentUserId);
                    setConnectionStatus('none');
                    setIsDisconnecting(false);
                    setIsManageConnectionModalOpen(false);
                  }}
                />
                <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                  Withdraw your connection request to {participantName}.
                </ThemedText>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <AppButton
                  title="+ Send Chat Request"
                  variant="primary"
                  loading={isDisconnecting}
                  onPress={async () => {
                    setIsDisconnecting(true);
                    const target = peerUserId || inferredPeerId;
                    const res = await sendChatRequest(target, currentUserId);
                    if (res.success) {
                      setConnectionStatus('pending_sent');
                    }
                    setIsDisconnecting(false);
                    setIsManageConnectionModalOpen(false);
                  }}
                />
                <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                  Send a permission request to connect and chat.
                </ThemedText>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Disconnect Confirmation Alert Modal */}
      <Modal
        visible={showDisconnectConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisconnectConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDisconnectConfirm(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: '#181822',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                padding: spacing.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <View
                style={[
                  styles.emptyIconBox,
                  {
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: radius.full,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                <AppIcon name="lock" size={24} color="#EF4444" />
              </View>
              <ThemedText variant="h3" style={{ textAlign: 'center' }}>
                Disconnect Connection?
              </ThemedText>
              <ThemedText
                variant="caption"
                tone="secondary"
                style={{ textAlign: 'center', marginTop: 6, lineHeight: 18 }}
              >
                Are you sure you want to disconnect from {participantName}? You will not be able to send or receive messages until a new request is sent and accepted.
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  disabled={isDisconnecting}
                  onPress={() => setShowDisconnectConfirm(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  variant="primary"
                  loading={isDisconnecting}
                  onPress={async () => {
                    setIsDisconnecting(true);
                    const target = peerUserId || inferredPeerId;
                    await disconnectOrCancelRequest(target, currentUserId);
                    setConnectionStatus('none');
                    setIsDisconnecting(false);
                    setShowDisconnectConfirm(false);
                  }}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Clear Chat Confirmation Modal (Option B: One-Sided Shred) */}
      <Modal
        visible={showClearChatConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isClearingChat) setShowClearChatConfirm(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!isClearingChat) setShowClearChatConfirm(false);
          }}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: '#181822',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                padding: spacing.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name="trash" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="h3" style={{ fontSize: 17, color: '#FFFFFF' }}>
                  Clear Chat?
                </ThemedText>
                <ThemedText variant="caption" tone="secondary">
                  One-Sided Shred (Your Side Only)
                </ThemedText>
              </View>
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: spacing.lg,
              }}
            >
              <ThemedText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 18 }}>
                This will permanently delete all messages, whispers, and media from this conversation on your phone.
              </ThemedText>
              <ThemedText variant="caption" style={{ color: '#C084FC', marginTop: 8, fontWeight: '600' }}>
                ✓ {participantName} will keep their copy of the conversation intact.
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  disabled={isClearingChat}
                  onPress={() => setShowClearChatConfirm(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={isClearingChat ? 'Clearing…' : 'Clear Chat'}
                  variant="primary"
                  loading={isClearingChat}
                  onPress={handleClearChat}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Zero Loudspeaker Guard Modal */}
      <Modal
        visible={isLoudspeakerGuardVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsLoudspeakerGuardVisible(false);
          setActiveWhisperId(null);
          setActiveWhisperData(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setIsLoudspeakerGuardVisible(false);
            setActiveWhisperId(null);
            setActiveWhisperData(null);
          }}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: '#12101B',
                borderColor: 'rgba(168, 85, 247, 0.45)',
                borderRadius: 20,
                padding: spacing.lg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Security Header */}
            <View style={styles.whisperGuardHeader}>
              <View style={styles.whisperGuardIconBubble}>
                <AppIcon name="lock" size={20} color="#E9D5FF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.whisperGuardTag}>
                  <ThemedText style={styles.whisperGuardTagText}>ZERO LOUDSPEAKER ENFORCED</ThemedText>
                </View>
                <ThemedText variant="h3" style={{ fontSize: 17, color: '#FFFFFF', marginTop: 3 }}>
                  Earpiece-Only Whisper
                </ThemedText>
              </View>
            </View>

            {/* Safety Explanation */}
            <View style={styles.whisperGuardExplainBox}>
              <ThemedText variant="caption" style={styles.whisperGuardExplainText}>
                This voice note physically refuses to play over the open loudspeaker to ensure zero eavesdropping in public places.
              </ThemedText>
            </View>

            {/* Primary Action: In-Ear Private Mode */}
            <Pressable
              onPress={handleStartInEarPlayback}
              style={styles.whisperGuardPrimaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Listen in private in-ear mode"
            >
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.whisperGuardBtnContent}>
                <AppIcon name="headphones" size={20} color="#FFFFFF" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText style={styles.whisperGuardBtnTitle}>
                    Listen in Private In-Ear Mode
                  </ThemedText>
                  <ThemedText style={styles.whisperGuardBtnSubtitle}>
                    Screen dims black • Hold phone to ear • Telephony filter
                  </ThemedText>
                </View>
              </View>
            </Pressable>

            {/* Secondary Action: Low Volume (I'm Alone) */}
            <Pressable
              onPress={handleStartLowVolumePlayback}
              style={styles.whisperGuardSecondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Play at low volume"
            >
              <AppIcon name="play" size={14} color="#C084FC" />
              <ThemedText style={styles.whisperGuardSecondaryText}>
                {"Play at Low Volume (I'm in Private)"}
              </ThemedText>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              onPress={() => {
                setIsLoudspeakerGuardVisible(false);
                setActiveWhisperId(null);
                setActiveWhisperData(null);
              }}
              style={styles.whisperGuardCancelBtn}
            >
              <ThemedText style={styles.whisperGuardCancelText}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* In-Ear Proximity Blackout Screen */}
      {isInEarMode ? (
        <Pressable
          onPress={handleStopInEarPlayback}
          style={styles.inEarProximityOverlay}
          accessibilityRole="button"
          accessibilityLabel="Stop in-ear whisper playback"
        >
          <View style={styles.inEarContentCenter}>
            <View style={styles.inEarIconPulseContainer}>
              <View style={styles.inEarIconGlowRing} />
              <View style={styles.inEarIconCircle}>
                <AppIcon name="earpiece" size={38} color="#C084FC" />
              </View>
            </View>

            <ThemedText variant="h3" style={styles.inEarTitle}>
              Private Earpiece Active
            </ThemedText>

            <ThemedText variant="caption" tone="secondary" style={styles.inEarSubtitle}>
              Audio routed through private earpiece filter.
            </ThemedText>

            {/* Progress track */}
            <View style={styles.inEarProgressTrack}>
              <View
                style={[
                  styles.inEarProgressBar,
                  { width: `${Math.round(whisperProgress * 100)}%` },
                ]}
              />
            </View>

            <ThemedText variant="label" style={styles.inEarTimerText}>
              {activeWhisperData
                ? `${formatAudioDuration(whisperProgress * activeWhisperData.duration)} / ${formatAudioDuration(activeWhisperData.duration)}`
                : ''}
            </ThemedText>

            <View style={styles.inEarDismissHintBox}>
              <ThemedText variant="caption" style={styles.inEarDismissHint}>
                Tap anywhere on screen to stop & restore chat
              </ThemedText>
            </View>
          </View>
        </Pressable>
      ) : null}
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  securityNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flexGrow: 1,
  },
  typingRow: {
    flexDirection: 'row',
  },
  typingBubble: {
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagePreviewBox: {
    borderWidth: 1,
  },
  modalErrorBox: {
    borderWidth: 1,
  },
  actionOptionBtn: {
    borderWidth: 1,
  },
  actionOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  expiredNoticeBox: {
    borderWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  reactionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reactionPopupCard: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionPopupHeader: {
    marginBottom: 8,
    alignItems: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 6,
  },
  emojiButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupEmojiText: {
    fontSize: 24,
  },
  reactionMessagePreview: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inChatSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: 8,
  },
  inChatSearchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  inChatSearchTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  inChatSearchNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchCountText: {
    fontSize: 11,
    marginRight: 4,
    fontWeight: '600',
  },
  navArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSearchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  whisperGuardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  whisperGuardIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whisperGuardTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  whisperGuardTagText: {
    color: '#F87171',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  whisperGuardExplainBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  whisperGuardExplainText: {
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
    fontSize: 13,
  },
  whisperGuardPrimaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  whisperGuardBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whisperGuardBtnTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  whisperGuardBtnSubtitle: {
    color: 'rgba(233, 213, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  whisperGuardSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  whisperGuardSecondaryText: {
    color: '#C084FC',
    fontWeight: '600',
    fontSize: 13,
  },
  whisperGuardCancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  whisperGuardCancelText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  inEarProximityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#040307',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inEarContentCenter: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 380,
  },
  inEarIconPulseContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  inEarIconGlowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  inEarIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1C152E',
    borderWidth: 1.5,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inEarTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  inEarSubtitle: {
    color: 'rgba(233, 213, 255, 0.65)',
    textAlign: 'center',
    marginBottom: 24,
  },
  inEarProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  inEarProgressBar: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 2,
  },
  inEarTimerText: {
    color: '#E9D5FF',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 36,
  },
  inEarDismissHintBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  inEarDismissHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
});

