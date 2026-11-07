/**
 * CurvedWaveHeader Component.
 *
 * Implements the signature Yin-Yang Organic Curved Transition between the
 * deep midnight navy header (#0B101B) and the crisp light body (#F8FAFC).
 *
 * Fully cross-platform compatible (Web, iOS, Android).
 */

import React from 'react';
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/use-theme';

export interface CurvedWaveHeaderProps {
  children?: React.ReactNode;
  variant?: 'chats' | 'chatRoom' | 'profile' | 'welcome';
  style?: StyleProp<ViewStyle>;
  waveHeight?: number;
  curveColor?: string; // Color of the body underneath
}

export function CurvedWaveHeader({
  children,
  variant = 'chats',
  style,
  waveHeight = 42,
  curveColor,
}: CurvedWaveHeaderProps) {
  const { colors, isDark } = useAppTheme();
  const headerBg = isDark ? (variant === 'profile' ? '#000000' : '#0B0F19') : '#0B101B';
  const resolvedCurveColor = curveColor || colors.background;

  const getSvgPath = () => {
    switch (variant) {
      case 'chatRoom':
        // Screen 3: Smooth organic curve high on left, sweeping down to right
        return 'M 0,0 C 140,2 260,42 400,44 L 400,48 L 0,48 Z';
      case 'welcome':
        // Screen 1: Deep organic S-sweep
        return 'M 0,28 C 120,0 240,14 400,48 L 400,48 L 0,48 Z';
      case 'profile':
        // Screen 4: Dynamic organic wave framing avatar
        return 'M 0,0 C 150,0 260,44 400,48 L 400,48 L 0,48 Z';
      case 'chats':
      default:
        // Screen 2: Iconic S-Curve wave higher on left, descending smoothly on right
        return 'M 0,0 C 160,0 250,46 400,48 L 400,48 L 0,48 Z';
    }
  };

  return (
    <View style={[styles.outerNavyWrapper, { backgroundColor: headerBg }, style]}>
      {/* Top Header Safe Zone */}
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.navyContent, { backgroundColor: headerBg }]}>
        {children}
      </SafeAreaView>

      {/* Organic Asymmetric Wave Curve */}
      <View style={[styles.waveContainer, { height: waveHeight, backgroundColor: headerBg }]}>
        {Platform.OS === 'web' ? (
          // Web: Precision SVG Cubic Bézier Organic Curve
          <svg
            viewBox="0 0 400 48"
            preserveAspectRatio="none"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              transform: 'translateZ(0)',
            }}
          >
            <path d={getSvgPath()} fill={resolvedCurveColor} />
          </svg>
        ) : (
          // Mobile Native (iOS / Android): Layered High-Performance Curvature Mask
          <View style={[styles.nativeWaveWrapper, { backgroundColor: headerBg }]}>
            <View
              style={[
                styles.nativeCurvedBody,
                {
                  backgroundColor: resolvedCurveColor,
                  borderTopLeftRadius: variant === 'chatRoom' ? 40 : 48,
                  borderTopRightRadius: variant === 'chatRoom' ? 4 : 0,
                },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerNavyWrapper: {
    backgroundColor: '#0B101B',
    width: '100%',
    zIndex: 10,
  },
  navyContent: {
    backgroundColor: '#0B101B',
  },
  waveContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0B101B',
  },
  nativeWaveWrapper: {
    flex: 1,
    width: '100%',
  },
  nativeCurvedBody: {
    flex: 1,
    width: '100%',
  },
});
