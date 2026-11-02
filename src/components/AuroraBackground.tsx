import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AuroraBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Aurora Eclipse Fluid Ambient Ribbon Background.
 * Renders the signature glowing violet-magenta aurora ribbons and deep obsidian atmosphere.
 */
export function AuroraBackground({ children, style }: AuroraBackgroundProps) {
  const [pulseAnim] = useState(() => new Animated.Value(0.85));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 3600,
          useNativeDriver: useNative,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 4000,
          useNativeDriver: useNative,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 4500,
          useNativeDriver: useNative,
        }),
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 5000,
          useNativeDriver: useNative,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [pulseAnim, floatAnim, useNative]);

  return (
    <View style={[styles.container, style]}>
      {/* Base Cosmic Obsidian Gradient */}
      <LinearGradient
        colors={['#07070A', '#0C0A14', '#07070A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Atmospheric Aurora Glow Blobs (Upper Right & Bottom Left) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowBlobTop,
          {
            opacity: pulseAnim,
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(217, 70, 239, 0.22)', 'rgba(168, 85, 247, 0.16)', 'transparent']}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowBlobBottom,
          {
            opacity: pulseAnim,
            transform: [{ translateY: Animated.multiply(floatAnim, -0.8) }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(124, 58, 237, 0.18)', 'rgba(217, 70, 239, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Fluid Aurora Arc Ribbon Overlay */}
      <View pointerEvents="none" style={styles.fluidRibbonWrapper}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(217, 70, 239, 0.45)',
            'rgba(168, 85, 247, 0.55)',
            'rgba(124, 58, 237, 0.35)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.ribbonLine}
        />
      </View>

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07070A',
    position: 'relative',
  },
  glowBlobTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.45,
    borderRadius: SCREEN_WIDTH * 0.45,
    overflow: 'hidden',
  },
  glowBlobBottom: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.4,
    borderRadius: SCREEN_WIDTH * 0.45,
    overflow: 'hidden',
  },
  fluidRibbonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0.5,
  },
  ribbonLine: {
    position: 'absolute',
    top: '12%',
    right: -80,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_HEIGHT * 0.75,
    borderRadius: SCREEN_WIDTH * 0.75,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 70, 239, 0.3)',
    transform: [{ rotate: '-25deg' }],
  },
});
