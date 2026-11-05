import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/use-theme';
import { DirectMessage } from '@/types';
import { AppIcon } from './AppIcon';
import { parseWhisperMessage, formatAudioDuration, WhisperAudioData } from '@/lib/audio';
import { parseCapsuleMessage, getRemainingCountdown, formatUnlockDate } from '@/lib/capsule';

export interface MessageBubbleProps {
  message: DirectMessage;
  animate?: boolean;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  searchKeyword?: string;
  isPrivacyLensActive?: boolean;
  onPlayWhisper?: (whisper: WhisperAudioData) => void;
  isPlayingWhisper?: boolean;
  whisperProgress?: number;
}

export function MessageBubble({
  message,
  animate = false,
  onLongPress,
  onDoubleTap,
  searchKeyword,
  isPrivacyLensActive = false,
  onPlayWhisper,
  isPlayingWhisper = false,
  whisperProgress = 0,
}: MessageBubbleProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const isOutgoing = message.isOutgoing;
  const isDeleted = Boolean(message.isDeletedForEveryone);
  const useNativeDriver = Platform.OS !== 'web';
  const lastTapRef = useRef<number>(0);

  const [fadeAnim] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [slideAnim] = useState(() => new Animated.Value(animate ? 8 : 0));
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealAnim] = useState(() => new Animated.Value(0));

  const whisperData = useMemo(() => {
    if (isDeleted) return null;
    return parseWhisperMessage(message.content);
  }, [message.content, isDeleted]);

  const capsuleData = useMemo(() => {
    if (isDeleted) return null;
    return parseCapsuleMessage(message.content);
  }, [message.content, isDeleted]);

  const [capsuleCountdown, setCapsuleCountdown] = useState(() =>
    capsuleData ? getRemainingCountdown(capsuleData.unlockAt) : null
  );

  useEffect(() => {
    if (!capsuleData || capsuleData.unlockAt <= Date.now()) return;

    const interval = setInterval(() => {
      const current = getRemainingCountdown(capsuleData.unlockAt);
      setCapsuleCountdown(current);
      if (current.isUnlocked) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [capsuleData]);

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver,
        }),
      ]).start();
    }
  }, [animate, fadeAnim, slideAnim, useNativeDriver]);

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_WINDOW = 320;
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW) {
      lastTapRef.current = 0;
      onDoubleTap?.();
    } else {
      lastTapRef.current = now;
    }
  };

  const reactionCounts = useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return [];
    const map = new Map<string, number>();
    message.reactions.forEach((r) => {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    });
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }, [message.reactions]);

  const hasReactions = reactionCounts.length > 0 && !isDeleted;

  const renderContent = () => {
    if (!searchKeyword || !searchKeyword.trim() || isDeleted) {
      return message.content;
    }
    const keyword = searchKeyword.trim();
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = message.content.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return (
          <Text
            key={index}
            style={{
              backgroundColor: '#38BDF8',
              color: '#091017',
              fontWeight: '700',
              borderRadius: 3,
              paddingHorizontal: 2,
            }}
          >
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <Animated.View
      style={[
        styles.row,
        {
          justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
          marginBottom: hasReactions ? 18 : 6,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={{ maxWidth: '82%', position: 'relative' }}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => {
            if (isPrivacyLensActive && !isDeleted) {
              setIsRevealed(true);
              Animated.timing(revealAnim, {
                toValue: 1,
                duration: 80,
                useNativeDriver,
              }).start();
            }
          }}
          onPressOut={() => {
            if (isPrivacyLensActive && !isDeleted) {
              Animated.timing(revealAnim, {
                toValue: 0,
                duration: 120,
                useNativeDriver,
              }).start(() => {
                setIsRevealed(false);
              });
            }
          }}
          onLongPress={isPrivacyLensActive ? undefined : onLongPress}
          delayLongPress={550}
          accessibilityRole="button"
          accessibilityHint={
            isPrivacyLensActive
              ? "Hold to reveal message text, double tap to react"
              : "Double tap to react, long press to manage"
          }
          {...(Platform.OS === 'web'
            ? ({
                onContextMenu: (e: any) => {
                  e?.preventDefault?.();
                  onLongPress?.();
                },
              } as any)
            : {})}
          style={({ pressed }) => [
            styles.bubble,
            {
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm + 2,
              paddingBottom: spacing.xs + 3,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: isOutgoing ? 4 : 18,
              opacity: pressed && !isPrivacyLensActive && (onLongPress || onDoubleTap) ? 0.8 : 1,
              overflow: 'hidden',
              minWidth: whisperData ? 225 : capsuleData ? 245 : undefined,
            },
            isOutgoing
              ? {
                  backgroundColor: isDeleted ? colors.surfaceSecondary : colors.bubbleOutgoingBg,
                  borderColor: isDeleted ? colors.border : 'rgba(192, 132, 252, 0.35)',
                  borderWidth: 1,
                }
              : {
                  backgroundColor: colors.bubbleIncomingBg,
                  borderColor: colors.bubbleIncomingBorder,
                  borderWidth: 1,
                },
          ]}
        >
          {isOutgoing && !isDeleted ? (
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {isDeleted ? (
            <View style={styles.deletedContainer}>
              <AppIcon name="ban" size={13} color={colors.textMuted} />
              <Text
                style={[
                  typography.caption,
                  styles.deletedText,
                  { color: colors.textMuted },
                ]}
              >
                This message was deleted
              </Text>
            </View>
          ) : (
            <View style={{ position: 'relative' }}>
              {whisperData ? (
                <Animated.View
                  style={[
                    styles.whisperCard,
                    {
                      opacity: isPrivacyLensActive
                        ? revealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.08, 1],
                          })
                        : 1,
                      ...(isPrivacyLensActive && Platform.OS === 'web'
                        ? ({
                            filter: isRevealed ? 'none' : 'blur(8px)',
                            userSelect: isRevealed ? 'text' : 'none',
                          } as any)
                        : {}),
                    },
                  ]}
                >
                  {/* Whisper Security Bar */}
                  <View style={styles.whisperBadgeRow}>
                    <View style={styles.whisperLockPill}>
                      <AppIcon name="lock" size={9} color="#E9D5FF" />
                      <Text style={styles.whisperLockText}>EARPIECE ONLY</Text>
                    </View>
                    <View style={styles.whisperAcousticPill}>
                      <AppIcon name="headphones" size={11} color="rgba(233, 213, 255, 0.75)" />
                    </View>
                  </View>

                  {/* Player Row */}
                  <View style={styles.whisperControlRow}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (onPlayWhisper && whisperData) {
                          onPlayWhisper(whisperData);
                        }
                      }}
                      hitSlop={6}
                      style={styles.whisperPlayBtn}
                      accessibilityRole="button"
                      accessibilityLabel={isPlayingWhisper ? 'Pause whisper' : 'Play earpiece whisper'}
                    >
                      <LinearGradient
                        colors={isPlayingWhisper ? ['#10B981', '#059669'] : ['#A855F7', '#6D28D9']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <AppIcon
                        name={isPlayingWhisper ? 'pause' : 'play'}
                        size={13}
                        color="#FFFFFF"
                      />
                    </Pressable>

                    {/* Waveform dynamic visualization */}
                    <View style={styles.whisperWaveformRow}>
                      {whisperData.waveform.map((barVal, idx) => {
                        const ratio = idx / whisperData.waveform.length;
                        const isPlayed = isPlayingWhisper && (whisperProgress || 0) >= ratio;
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.whisperWaveBar,
                              {
                                height: Math.max(5, Math.min(26, Math.round(barVal * 28))),
                                backgroundColor: isPlayed ? '#38BDF8' : 'rgba(233, 213, 255, 0.45)',
                              },
                            ]}
                          />
                        );
                      })}
                    </View>

                    <Text style={styles.whisperTimerText}>
                      {isPlayingWhisper && (whisperProgress || 0) > 0
                        ? formatAudioDuration((whisperProgress || 0) * whisperData.duration)
                        : formatAudioDuration(whisperData.duration)}
                    </Text>
                  </View>
                </Animated.View>
              ) : capsuleData ? (
                <Animated.View
                  style={[
                    styles.capsuleCard,
                    {
                      opacity: isPrivacyLensActive
                        ? revealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.08, 1],
                          })
                        : 1,
                      ...(isPrivacyLensActive && Platform.OS === 'web'
                        ? ({
                            filter: isRevealed ? 'none' : 'blur(8px)',
                            userSelect: isRevealed ? 'text' : 'none',
                          } as any)
                        : {}),
                    },
                  ]}
                >
                  {/* Capsule Header Badge */}
                  <View style={styles.capsuleBadgeRow}>
                    <View
                      style={[
                        styles.capsuleLockPill,
                        capsuleCountdown?.isUnlocked
                          ? styles.capsuleUnlockedPill
                          : styles.capsuleLockedPill,
                      ]}
                    >
                      <AppIcon
                        name={capsuleCountdown?.isUnlocked ? 'check' : 'lock'}
                        size={9}
                        color={capsuleCountdown?.isUnlocked ? '#34D399' : '#FBBF24'}
                      />
                      <Text
                        style={[
                          styles.capsuleLockText,
                          { color: capsuleCountdown?.isUnlocked ? '#34D399' : '#FBBF24' },
                        ]}
                      >
                        {capsuleCountdown?.isUnlocked ? 'CAPSULE UNLOCKED' : 'TIME-LOCKED CAPSULE'}
                      </Text>
                    </View>
                    <AppIcon
                      name={capsuleCountdown?.isUnlocked ? 'clock' : 'hourglass'}
                      size={12}
                      color={capsuleCountdown?.isUnlocked ? '#34D399' : '#FBBF24'}
                    />
                  </View>

                  {capsuleData.title ? (
                    <Text style={styles.capsuleTitleText}>{capsuleData.title}</Text>
                  ) : null}

                  {capsuleCountdown?.isUnlocked ? (
                    <View style={styles.capsuleRevealedBox}>
                      <Text style={styles.capsuleRevealedText}>
                        {capsuleData.ciphertext}
                      </Text>
                      <Text style={styles.capsuleUnlockedTimeLabel}>
                        Unlocked • {formatUnlockDate(capsuleData.unlockAt)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.capsuleLockedBox}>
                      <Text style={styles.capsuleTimerLabel}>UNLOCKS IN</Text>
                      <Text style={styles.capsuleTimerValue}>
                        {capsuleCountdown?.formatted || '...'}
                      </Text>
                      <View style={styles.capsuleVeilRow}>
                        <AppIcon name="lock" size={10} color="rgba(255, 255, 255, 0.45)" />
                        <Text style={styles.capsuleVeilText}>
                          Sealed until {formatUnlockDate(capsuleData.unlockAt)}
                        </Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              ) : (
                <Animated.Text
                  style={[
                    typography.body,
                    {
                      color: '#FFFFFF',
                      fontSize: 15,
                      lineHeight: 20,
                      opacity: isPrivacyLensActive
                        ? revealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.08, 1],
                          })
                        : 1,
                      ...(isPrivacyLensActive && Platform.OS === 'web'
                        ? ({
                            filter: isRevealed ? 'none' : 'blur(8px)',
                            userSelect: isRevealed ? 'text' : 'none',
                          } as any)
                        : {}),
                    },
                  ]}
                >
                  {renderContent()}
                </Animated.Text>
              )}

              {/* Frosted Privacy Lens Overlay */}
              {isPrivacyLensActive ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.privacyOverlay,
                    {
                      opacity: revealAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                      backgroundColor: isOutgoing ? 'rgba(76, 29, 149, 0.88)' : 'rgba(24, 24, 34, 0.94)',
                    },
                  ]}
                >
                  <LinearGradient
                    colors={
                      isOutgoing
                        ? ['rgba(139, 92, 246, 0.4)', 'rgba(109, 40, 217, 0.6)']
                        : ['rgba(255, 255, 255, 0.08)', 'rgba(168, 85, 247, 0.2)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.privacyEyeBadge}>
                    <AppIcon name="eye-off" size={15} color="#E9D5FF" />
                  </View>
                </Animated.View>
              ) : null}
            </View>
          )}

          <View style={styles.footer}>
            {isPrivacyLensActive && !isDeleted ? (
              <View style={{ marginRight: 4, opacity: 0.75 }}>
                <AppIcon
                  name={isRevealed ? 'eye' : 'eye-off'}
                  size={10}
                  color={isOutgoing ? '#E9D5FF' : colors.textMuted}
                />
              </View>
            ) : null}

            <Text
              style={[
                typography.label,
                {
                  fontSize: 10,
                  color: isOutgoing ? '#E9D5FF' : colors.bubbleIncomingTime,
                  marginRight: isOutgoing && !isDeleted ? 3 : 0,
                },
              ]}
            >
              {message.createdAt}
            </Text>

            {isOutgoing && !isDeleted ? (
              <AppIcon
                name={message.status === 'read' ? 'check-all' : 'check'}
                size={13}
                color={message.status === 'read' ? '#E9D5FF' : 'rgba(233, 213, 255, 0.7)'}
              />
            ) : null}

            {onLongPress ? (
              <Pressable
                onPress={onLongPress}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.optionsTrigger,
                  { opacity: pressed ? 0.4 : 0.75, marginLeft: 4 },
                ]}
                accessibilityLabel="Message options"
              >
                <AppIcon name="more" size={11} color={isOutgoing ? '#E9D5FF' : colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        {/* WhatsApp-Style Attached Emoji Reaction Badge */}
        {hasReactions ? (
          <Pressable
            onPress={onDoubleTap}
            style={[
              styles.reactionBadge,
              {
                backgroundColor: '#181822',
                borderColor: 'rgba(168, 85, 247, 0.45)',
                borderRadius: radius.full,
              },
              isOutgoing ? styles.reactionBadgeRight : styles.reactionBadgeLeft,
            ]}
          >
            {reactionCounts.map(({ emoji, count }) => (
              <View key={emoji} style={styles.reactionItem}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 ? (
                  <Text style={[styles.reactionCountText, { color: colors.textSecondary }]}>
                    {count}
                  </Text>
                ) : null}
              </View>
            ))}
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  bubble: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  whisperCard: {
    paddingVertical: 2,
    gap: 6,
  },
  capsuleCard: {
    paddingVertical: 2,
    gap: 6,
    minWidth: 230,
  },
  capsuleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  capsuleLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  capsuleLockedPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  capsuleUnlockedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  capsuleLockText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  capsuleTitleText: {
    color: '#E9D5FF',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  capsuleLockedBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  capsuleTimerLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  capsuleTimerValue: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    marginVertical: 2,
  },
  capsuleVeilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  capsuleVeilText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  capsuleRevealedBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  capsuleRevealedText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  capsuleUnlockedTimeLabel: {
    color: 'rgba(16, 185, 129, 0.85)',
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
  whisperBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  whisperLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(233, 213, 255, 0.3)',
  },
  whisperLockText: {
    color: '#E9D5FF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  whisperAcousticPill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  whisperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whisperPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  whisperWaveformRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
  },
  whisperWaveBar: {
    width: 3,
    borderRadius: 2,
  },
  whisperTimerText: {
    color: '#E9D5FF',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'right',
  },
  deletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  deletedText: {
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  optionsTrigger: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
  },
  reactionBadgeRight: {
    right: 8,
  },
  reactionBadgeLeft: {
    left: 8,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  privacyOverlay: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  privacyEyeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
