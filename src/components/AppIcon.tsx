import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';

export type IconName =
  | 'back'
  | 'settings'
  | 'lock'
  | 'mail'
  | 'send'
  | 'search'
  | 'check'
  | 'check-all'
  | 'user'
  | 'plus'
  | 'close'
  | 'dot'
  | 'more'
  | 'trash'
  | 'ban'
  | 'chevron-up'
  | 'chevron-down'
  | 'eye'
  | 'eye-off';

export interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Pure React Native vector-like monochrome iconography.
 * Zero external font or native asset dependencies.
 */
export function AppIcon({ name, size = 20, color }: AppIconProps) {
  const { colors } = useAppTheme();
  const iconColor = color || colors.text;

  const renderIcon = () => {
    switch (name) {
      case 'back':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.44,
                height: size * 0.44,
                borderLeftWidth: 2,
                borderBottomWidth: 2,
                borderColor: iconColor,
                transform: [{ rotate: '45deg' }],
                marginLeft: size * 0.15,
              }}
            />
          </View>
        );

      case 'send':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.4,
                height: size * 0.4,
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderColor: iconColor,
                transform: [{ rotate: '-45deg' }],
                marginTop: size * 0.1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 2,
                height: size * 0.48,
                backgroundColor: iconColor,
                top: size * 0.24,
              }}
            />
          </View>
        );

      case 'settings':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.72,
                height: size * 0.72,
                borderRadius: size * 0.36,
                borderWidth: 2,
                borderColor: iconColor,
                borderStyle: 'dashed',
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.3,
                height: size * 0.3,
                borderRadius: size * 0.15,
                borderWidth: 2,
                borderColor: iconColor,
              }}
            />
          </View>
        );

      case 'lock':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            {/* Shackle */}
            <View
              style={{
                width: size * 0.46,
                height: size * 0.4,
                borderWidth: 2,
                borderBottomWidth: 0,
                borderTopLeftRadius: size * 0.23,
                borderTopRightRadius: size * 0.23,
                borderColor: iconColor,
                marginBottom: -1,
              }}
            />
            {/* Body */}
            <View
              style={{
                width: size * 0.64,
                height: size * 0.46,
                borderRadius: 3,
                borderWidth: 2,
                borderColor: iconColor,
                backgroundColor: 'transparent',
              }}
            />
          </View>
        );

      case 'mail':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.76,
                height: size * 0.54,
                borderWidth: 1.8,
                borderColor: iconColor,
                borderRadius: 3,
                overflow: 'hidden',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.48,
                  height: size * 0.48,
                  borderLeftWidth: 1.6,
                  borderBottomWidth: 1.6,
                  borderColor: iconColor,
                  transform: [{ rotate: '-45deg' }],
                  marginTop: -size * 0.24,
                }}
              />
            </View>
          </View>
        );

      case 'search':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.52,
                height: size * 0.52,
                borderRadius: size * 0.26,
                borderWidth: 2,
                borderColor: iconColor,
                marginBottom: size * 0.1,
                marginRight: size * 0.1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.3,
                height: 2,
                backgroundColor: iconColor,
                bottom: size * 0.18,
                right: size * 0.14,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'check':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.45,
                height: size * 0.26,
                borderLeftWidth: 2,
                borderBottomWidth: 2,
                borderColor: iconColor,
                transform: [{ rotate: '-45deg' }],
                marginBottom: size * 0.1,
              }}
            />
          </View>
        );

      case 'check-all':
        return (
          <View style={[styles.center, { width: size, height: size, flexDirection: 'row' }]}>
            <View
              style={{
                width: size * 0.36,
                height: size * 0.22,
                borderLeftWidth: 1.8,
                borderBottomWidth: 1.8,
                borderColor: iconColor,
                transform: [{ rotate: '-45deg' }],
                marginRight: -size * 0.15,
              }}
            />
            <View
              style={{
                width: size * 0.36,
                height: size * 0.22,
                borderLeftWidth: 1.8,
                borderBottomWidth: 1.8,
                borderColor: iconColor,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'user':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.38,
                height: size * 0.38,
                borderRadius: size * 0.19,
                borderWidth: 2,
                borderColor: iconColor,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: size * 0.66,
                height: size * 0.3,
                borderTopLeftRadius: size * 0.2,
                borderTopRightRadius: size * 0.2,
                borderWidth: 2,
                borderBottomWidth: 0,
                borderColor: iconColor,
              }}
            />
          </View>
        );

      case 'plus':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.6,
                height: 2,
                backgroundColor: iconColor,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 2,
                height: size * 0.6,
                backgroundColor: iconColor,
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'close':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.55,
                height: 2,
                backgroundColor: iconColor,
                borderRadius: 1,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.55,
                height: 2,
                backgroundColor: iconColor,
                borderRadius: 1,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'more':
        return (
          <View style={[styles.center, { width: size, height: size, flexDirection: 'row', gap: 2.5 }]}>
            <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: iconColor }} />
            <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: iconColor }} />
            <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: iconColor }} />
          </View>
        );

      case 'trash':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.6,
                height: 2,
                backgroundColor: iconColor,
                marginBottom: 2,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: size * 0.44,
                height: size * 0.48,
                borderWidth: 1.8,
                borderTopWidth: 0,
                borderColor: iconColor,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: 1.5, height: size * 0.28, backgroundColor: iconColor }} />
            </View>
          </View>
        );

      case 'ban':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.72,
                height: size * 0.72,
                borderRadius: size * 0.36,
                borderWidth: 1.6,
                borderColor: iconColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.54,
                  height: 1.6,
                  backgroundColor: iconColor,
                  transform: [{ rotate: '-45deg' }],
                }}
              />
            </View>
          </View>
        );

      case 'chevron-up':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.44,
                height: size * 0.44,
                borderTopWidth: 2,
                borderLeftWidth: 2,
                borderColor: iconColor,
                transform: [{ rotate: '45deg' }],
                marginTop: size * 0.12,
              }}
            />
          </View>
        );

      case 'chevron-down':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.44,
                height: size * 0.44,
                borderBottomWidth: 2,
                borderRightWidth: 2,
                borderColor: iconColor,
                transform: [{ rotate: '45deg' }],
                marginBottom: size * 0.12,
              }}
            />
          </View>
        );

      case 'eye':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.78,
                height: size * 0.46,
                borderRadius: size * 0.23,
                borderWidth: 1.8,
                borderColor: iconColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.24,
                  height: size * 0.24,
                  borderRadius: size * 0.12,
                  backgroundColor: iconColor,
                }}
              />
            </View>
          </View>
        );

      case 'eye-off':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.78,
                height: size * 0.46,
                borderRadius: size * 0.23,
                borderWidth: 1.8,
                borderColor: iconColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.22,
                  height: size * 0.22,
                  borderRadius: size * 0.11,
                  backgroundColor: iconColor,
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                width: size * 0.82,
                height: 1.8,
                backgroundColor: iconColor,
                transform: [{ rotate: '-45deg' }],
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'dot':
      default:
        return (
          <View
            style={{
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: size * 0.2,
              backgroundColor: iconColor,
            }}
          />
        );
    }
  };

  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{renderIcon()}</View>;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
