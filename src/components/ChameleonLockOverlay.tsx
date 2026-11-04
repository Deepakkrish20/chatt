import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { AppIcon } from './AppIcon';
import { AuroraBackground } from './AuroraBackground';
import { useAppTheme } from '@/hooks/use-theme';
import { useSecurity } from '@/context/SecurityContext';

export function ChameleonLockOverlay() {
  const { colors } = useAppTheme();
  const { isLocked, unlockWithPin } = useSecurity();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shakeAnim] = useState(() => new Animated.Value(0));

  if (!isLocked) return null;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const handleDigitPress = async (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      const res = await unlockWithPin(nextPin);
      if (!res.success) {
        setErrorMsg('Invalid Access PIN');
        triggerShake();
        setTimeout(() => {
          setPin('');
        }, 350);
      }
    }
  };

  const handleDeletePress = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <AuroraBackground style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconBadge,
                {
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                },
              ]}
            >
              <AppIcon name="lock" size={28} color="#C084FC" />
            </View>
            <ThemedText variant="h2" style={styles.title}>
              CHATT VAULT
            </ThemedText>
            <ThemedText variant="caption" tone="muted" style={styles.subtitle}>
              Hardware-Isolated Security PIN
            </ThemedText>
          </View>

          {/* PIN Dots Indicator */}
          <Animated.View
            style={[
              styles.dotsContainer,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: isFilled ? '#A855F7' : 'rgba(255, 255, 255, 0.25)',
                      backgroundColor: isFilled ? '#A855F7' : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Error Message */}
          <View style={styles.errorBox}>
            <ThemedText
              variant="captionMedium"
              style={[styles.errorText, { opacity: errorMsg ? 1 : 0 }]}
            >
              {errorMsg || ' '}
            </ThemedText>
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'del'],
            ].map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keypadRow}>
                {row.map((key, colIdx) => {
                  if (key === '') {
                    return <View key={colIdx} style={styles.keypadEmpty} />;
                  }

                  if (key === 'del') {
                    return (
                      <Pressable
                        key={colIdx}
                        hitSlop={12}
                        onPress={handleDeletePress}
                        style={({ pressed }) => [
                          styles.keypadBtn,
                          styles.keypadActionBtn,
                          {
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        <AppIcon name="close" size={20} color={colors.text} />
                      </Pressable>
                    );
                  }

                  return (
                    <Pressable
                      key={colIdx}
                      onPress={() => handleDigitPress(key)}
                      style={({ pressed }) => [
                        styles.keypadBtn,
                        {
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          backgroundColor: pressed
                            ? 'rgba(168, 85, 247, 0.25)'
                            : 'rgba(255, 255, 255, 0.04)',
                        },
                      ]}
                    >
                      <ThemedText variant="h2" style={styles.keypadText}>
                        {key}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </AuroraBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D12',
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorBox: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
  },
  keypad: {
    width: '100%',
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  keypadBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadActionBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keypadEmpty: {
    width: 68,
    height: 68,
  },
  keypadText: {
    fontWeight: '600',
  },
});
