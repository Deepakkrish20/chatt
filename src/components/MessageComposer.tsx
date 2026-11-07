import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated, Platform, Modal } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import { AppIcon } from './AppIcon';
import { createWhisperRecorder, formatWhisperMessage, formatAudioDuration, WhisperRecorder } from '@/lib/audio';
import { formatCapsuleMessage } from '@/lib/capsule';

export interface MessageComposerProps {
  onSendMessage?: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  bottomInset?: number;
}

const CAPSULE_PRESETS = [
  { label: '5 Mins', durationMs: 5 * 60 * 1000, description: 'In 5 minutes' },
  { label: '1 Hour', durationMs: 60 * 60 * 1000, description: 'In 1 hour' },
  { label: 'Tomorrow', durationMs: 24 * 60 * 60 * 1000, description: 'In 24 hours (Tomorrow)' },
  { label: '7 Days', durationMs: 7 * 24 * 60 * 60 * 1000, description: 'In 7 days (Next week)' },
  { label: '30 Days', durationMs: 30 * 24 * 60 * 60 * 1000, description: 'In 30 days (Next month)' },
];

export function MessageComposer({
  onSendMessage,
  onTyping,
  placeholder = 'Message...',
  disabled = false,
  bottomInset = 0,
}: MessageComposerProps) {
  const { colors, isDark, typography } = useAppTheme();
  const [text, setText] = useState('');
  const [buttonScale] = useState(() => new Animated.Value(1));
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([0.3, 0.6, 0.4, 0.8, 0.5]);
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const recorderRef = useRef<WhisperRecorder | null>(null);
  const useNativeDriver = Platform.OS !== 'web';
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Time-Locked Capsule State
  const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);
  const [capsuleText, setCapsuleText] = useState('');
  const [capsuleTitle, setCapsuleTitle] = useState('');
  const [selectedDurationMs, setSelectedDurationMs] = useState(5 * 60 * 1000);
  const [capsuleError, setCapsuleError] = useState('');
  const [isSealingCapsule, setIsSealingCapsule] = useState(false);

  const handleSealAndSendCapsule = () => {
    const trimmed = capsuleText.trim();
    if (!trimmed) {
      setCapsuleError('Please enter a message for your capsule.');
      return;
    }
    setCapsuleError('');
    setIsSealingCapsule(true);
    const unlockAt = Date.now() + selectedDurationMs;
    const capsuleMsg = formatCapsuleMessage({
      id: `cap_${Date.now()}`,
      ciphertext: trimmed,
      unlockAt,
      createdAt: Date.now(),
      title: capsuleTitle.trim() || undefined,
    });
    onSendMessage?.(capsuleMsg);
    setCapsuleText('');
    setCapsuleTitle('');
    setSelectedDurationMs(5 * 60 * 1000);
    setIsSealingCapsule(false);
    setIsCapsuleModalOpen(false);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      anim?.stop();
    };
  }, [isRecording, pulseAnim, useNativeDriver]);

  const handleTextChange = (newText: string) => {
    setText(newText);

    if (onTyping) {
      if (newText.trim().length > 0) {
        onTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        onTyping(false);
      }
    }
  };

  const handleSend = () => {
    if (disabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);
    onSendMessage?.(trimmed);
    setText('');
  };

  const handleStartRecording = async () => {
    if (disabled) return;
    try {
      recorderRef.current = createWhisperRecorder((duration, waveform) => {
        setRecordDuration(duration);
        setLiveWaveform([...waveform]);
      });
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordDuration(0);
    } catch {
      // Ignore
    }
  };

  const handleCancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordDuration(0);
  };

  const handleSendWhisper = async () => {
    if (!recorderRef.current || disabled) return;
    try {
      const whisperData = await recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecording(false);
      setRecordDuration(0);
      if (whisperData && whisperData.duration >= 0.5) {
        onSendMessage?.(formatWhisperMessage(whisperData));
      }
    } catch {
      setIsRecording(false);
      setRecordDuration(0);
    }
  };

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(buttonScale, {
      toValue: 0.9,
      duration: 80,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver,
    }).start();
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web') {
      if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
        e.preventDefault?.();
        handleSend();
      }
    }
  };

  const hasText = Boolean(text.trim());

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: isDark ? '#000000' : '#F8FAFC',
          borderTopColor: isDark ? '#1E2533' : '#F1F5F9',
          paddingTop: 8,
          paddingBottom: bottomInset > 0 ? bottomInset : 10,
          paddingHorizontal: 12,
        },
      ]}
    >
      <View style={styles.composerRow}>
        {!isRecording ? (
          <Pressable
            disabled={disabled}
            hitSlop={8}
            onPress={() => {
              setCapsuleError('');
              setIsCapsuleModalOpen(true);
            }}
            style={({ pressed }) => [
              styles.plusSquareBtn,
              {
                backgroundColor: isDark ? '#151922' : '#DBEAFE',
                borderColor: isDark ? '#242B3A' : 'transparent',
                borderWidth: isDark ? 1 : 0,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create time capsule or attachment"
          >
            <AppIcon name="plus" size={19} color={isDark ? '#FFFFFF' : '#0B101B'} />
          </Pressable>
        ) : null}

        {isRecording ? (
          /* Whisper Recording Active Capsule */
          <View style={[styles.inputCapsule, styles.recordingCapsule]}>
            <Pressable
              onPress={handleCancelRecording}
              hitSlop={10}
              style={styles.cancelRecordButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel whisper recording"
            >
              <AppIcon name="trash" size={18} color="#EF4444" />
            </Pressable>

            <View style={styles.recordLiveIndicator}>
              <Animated.View
                style={[
                  styles.redDot,
                  { opacity: pulseAnim },
                ]}
              />
              <Text style={styles.recordTimerText}>
                {formatAudioDuration(recordDuration)}
              </Text>
            </View>

            {/* Live animated waveform visualizer bars */}
            <View style={styles.waveformContainer}>
              {liveWaveform.slice(-14).map((val, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.max(5, Math.min(26, Math.round(val * 28))),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          /* Midnight Wave Clean Message Input Capsule */
          <View
            style={[
              styles.inputCapsule,
              {
                backgroundColor: isDark ? '#151922' : '#FFFFFF',
                borderColor: isDark ? '#242B3A' : '#E2E8F0',
              },
            ]}
          >
            <TextInput
              value={text}
              onChangeText={handleTextChange}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              editable={!disabled}
              multiline
              textAlignVertical="center"
              autoCorrect={true}
              spellCheck={true}
              autoCapitalize="sentences"
              keyboardType="default"
              returnKeyType="default"
              disableFullscreenUI={true}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              onKeyPress={handleKeyPress}
              style={[
                typography.body,
                styles.input,
                { color: disabled ? colors.textMuted : colors.text },
              ]}
            />
          </View>
        )}

        {/* Right Action Button: Mic or Send (Screen 3) */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            disabled={disabled}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={
              isRecording
                ? handleSendWhisper
                : hasText
                ? handleSend
                : handleStartRecording
            }
            style={({ pressed }) => [
              styles.sendFab,
              hasText
                ? [styles.sendFabActive, { backgroundColor: isDark ? '#2563EB' : '#0F172A' }]
                : styles.sendFabNeutral,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isRecording
                ? 'Send whisper'
                : hasText
                ? 'Send message'
                : 'Record whisper voice note'
            }
          >
            <AppIcon
              name={isRecording ? 'send' : hasText ? 'send' : 'mic'}
              size={hasText ? 18 : 22}
              color={hasText ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#0F172A')}
            />
          </Pressable>
        </Animated.View>
      </View>

      {/* Create Time Capsule Modal */}
      <Modal
        visible={isCapsuleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSealingCapsule) setIsCapsuleModalOpen(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!isSealingCapsule) setIsCapsuleModalOpen(false);
          }}
        >
          <Pressable
            style={[
              styles.capsuleModalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                shadowColor: '#000000',
                shadowOpacity: isDark ? 0.4 : 0.15,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.capsuleModalHeader}>
              <View
                style={[
                  styles.capsuleModalIconBubble,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
                  },
                ]}
              >
                <AppIcon name="hourglass" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.capsuleModalTitle, { color: colors.text }]}>Time-Locked Capsule</Text>
                <Text style={[styles.capsuleModalSubtitle, { color: colors.textMuted }]}>
                  Sealed message that unlocks at a future time
                </Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setIsCapsuleModalOpen(false)}
                style={{ padding: 4 }}
              >
                <AppIcon name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Secret Message Input */}
            <View
              style={[
                styles.capsuleInputBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={capsuleText}
                onChangeText={setCapsuleText}
                placeholder="Write your secret message for the future…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[styles.capsuleTextInput, { color: colors.text }]}
              />
            </View>

            {/* Optional Title / Theme */}
            <View
              style={[
                styles.capsuleTitleInputBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={capsuleTitle}
                onChangeText={setCapsuleTitle}
                placeholder="Capsule label (e.g. Birthday Note) — optional"
                placeholderTextColor={colors.textMuted}
                style={[styles.capsuleTitleInput, { color: colors.text }]}
              />
            </View>

            {/* Unlock Preset Selectors */}
            <Text style={[styles.capsuleDurationLabel, { color: colors.textMuted }]}>SELECT UNLOCK TIME</Text>
            <View style={styles.capsulePresetRow}>
              {CAPSULE_PRESETS.map((preset) => {
                const isSelected = selectedDurationMs === preset.durationMs;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => setSelectedDurationMs(preset.durationMs)}
                    style={[
                      styles.capsulePresetChip,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                      isSelected && [
                        styles.capsulePresetChipActive,
                        {
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7',
                          borderColor: '#F59E0B',
                        },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.capsulePresetText,
                        { color: colors.textSecondary },
                        isSelected && [
                          styles.capsulePresetTextActive,
                          { color: isDark ? '#FBBF24' : '#B45309' },
                        ],
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Unlock Summary Preview */}
            <View
              style={[
                styles.capsuleUnlockPreviewBox,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                },
              ]}
            >
              <AppIcon name="clock" size={13} color="#FBBF24" />
              <Text
                style={[
                  styles.capsuleUnlockPreviewText,
                  { color: isDark ? '#FBBF24' : '#B45309' },
                ]}
              >
                Unlocks: {CAPSULE_PRESETS.find((p) => p.durationMs === selectedDurationMs)?.description || 'In 5 minutes'}
              </Text>
            </View>

            {capsuleError ? (
              <Text style={styles.capsuleErrorText}>{capsuleError}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.capsuleModalActionRow}>
              <Pressable
                onPress={() => setIsCapsuleModalOpen(false)}
                style={[
                  styles.capsuleCancelBtn,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.capsuleCancelText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSealAndSendCapsule}
                disabled={!capsuleText.trim()}
                style={[
                  styles.capsuleSendBtn,
                  { backgroundColor: isDark ? '#2563EB' : '#0F172A' },
                  !capsuleText.trim() && { opacity: 0.5 },
                ]}
              >
                <AppIcon name="lock" size={14} color="#FFFFFF" />
                <Text style={styles.capsuleSendBtnText}>Seal & Send Capsule</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    width: '100%',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusSquareBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  capsuleModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  capsuleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  capsuleModalIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleModalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  capsuleModalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  capsuleInputBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    minHeight: 88,
  },
  capsuleTextInput: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    textAlignVertical: 'top',
  },
  capsuleTitleInputBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  capsuleTitleInput: {
    color: '#0F172A',
    fontSize: 13,
    padding: 0,
  },
  capsuleDurationLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  capsulePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  capsulePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  capsulePresetChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  capsulePresetText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  capsulePresetTextActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  capsuleUnlockPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  capsuleUnlockPreviewText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  capsuleErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
  },
  capsuleModalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  capsuleCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleCancelText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  capsuleSendBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  capsuleSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  recordingCapsule: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    paddingVertical: 8,
    gap: 12,
  },
  cancelRecordButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordTimerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingRight: 4,
    height: 30,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendFab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendFabActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sendFabNeutral: {
    backgroundColor: 'transparent',
  },
  sendFabInactive: {
    backgroundColor: '#F1F5F9',
  },
});
