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
  | 'users'
  | 'chat-bubble'
  | 'phone'
  | 'video'
  | 'bell'
  | 'camera'
  | 'plus'
  | 'close'
  | 'dot'
  | 'more'
  | 'trash'
  | 'ban'
  | 'chevron-up'
  | 'chevron-down'
  | 'eye'
  | 'eye-off'
  | 'mic'
  | 'play'
  | 'pause'
  | 'headphones'
  | 'earpiece'
  | 'clock'
  | 'hourglass';

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

      case 'mic':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.32,
                height: size * 0.46,
                borderRadius: size * 0.16,
                borderWidth: 1.8,
                borderColor: iconColor,
                backgroundColor: iconColor,
                marginBottom: size * 0.08,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.16,
                width: size * 0.54,
                height: size * 0.38,
                borderBottomLeftRadius: size * 0.27,
                borderBottomRightRadius: size * 0.27,
                borderWidth: 1.8,
                borderTopWidth: 0,
                borderColor: iconColor,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                width: 1.8,
                height: size * 0.16,
                backgroundColor: iconColor,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.1,
                width: size * 0.34,
                height: 1.8,
                backgroundColor: iconColor,
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'play':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderTopWidth: size * 0.3,
                borderBottomWidth: size * 0.3,
                borderLeftWidth: size * 0.46,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: iconColor,
                marginLeft: size * 0.1,
              }}
            />
          </View>
        );

      case 'pause':
        return (
          <View style={[styles.center, { width: size, height: size, flexDirection: 'row', gap: size * 0.16 }]}>
            <View style={{ width: size * 0.18, height: size * 0.54, backgroundColor: iconColor, borderRadius: 1 }} />
            <View style={{ width: size * 0.18, height: size * 0.54, backgroundColor: iconColor, borderRadius: 1 }} />
          </View>
        );

      case 'headphones':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.72,
                height: size * 0.56,
                borderTopLeftRadius: size * 0.36,
                borderTopRightRadius: size * 0.36,
                borderWidth: 2,
                borderBottomWidth: 0,
                borderColor: iconColor,
                marginTop: -size * 0.08,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                left: size * 0.1,
                width: size * 0.16,
                height: size * 0.3,
                borderRadius: size * 0.08,
                backgroundColor: iconColor,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                right: size * 0.1,
                width: size * 0.16,
                height: size * 0.3,
                borderRadius: size * 0.08,
                backgroundColor: iconColor,
              }}
            />
          </View>
        );

      case 'earpiece':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.52,
                height: size * 0.72,
                borderTopLeftRadius: size * 0.26,
                borderTopRightRadius: size * 0.26,
                borderBottomLeftRadius: size * 0.2,
                borderBottomRightRadius: size * 0.32,
                borderWidth: 2,
                borderColor: iconColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.2,
                  height: size * 0.3,
                  borderTopRightRadius: size * 0.15,
                  borderBottomRightRadius: size * 0.15,
                  borderWidth: 1.6,
                  borderLeftWidth: 0,
                  borderColor: iconColor,
                }}
              />
            </View>
          </View>
        );

      case 'clock':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.78,
                height: size * 0.78,
                borderRadius: size * 0.39,
                borderWidth: 1.8,
                borderColor: iconColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 1.8,
                  height: size * 0.24,
                  backgroundColor: iconColor,
                  top: size * 0.14,
                  borderRadius: 1,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: size * 0.2,
                  height: 1.8,
                  backgroundColor: iconColor,
                  left: size * 0.36,
                  borderRadius: 1,
                }}
              />
            </View>
          </View>
        );

      case 'hourglass':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.64,
                height: 1.8,
                backgroundColor: iconColor,
                borderRadius: 1,
                marginBottom: 1,
              }}
            />
            <View
              style={{
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderLeftWidth: size * 0.24,
                borderRightWidth: size * 0.24,
                borderTopWidth: size * 0.24,
                borderBottomWidth: 0,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: iconColor,
              }}
            />
            <View
              style={{
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderLeftWidth: size * 0.24,
                borderRightWidth: size * 0.24,
                borderBottomWidth: size * 0.24,
                borderTopWidth: 0,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: iconColor,
              }}
            />
            <View
              style={{
                width: size * 0.64,
                height: 1.8,
                backgroundColor: iconColor,
                borderRadius: 1,
                marginTop: 1,
              }}
            />
          </View>
        );

      case 'chat-bubble':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.74,
                height: size * 0.58,
                borderRadius: size * 0.22,
                borderWidth: 2,
                borderColor: iconColor,
                backgroundColor: 'transparent',
              }}
            />
            {/* Speech pointer tail */}
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                left: size * 0.18,
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderLeftWidth: size * 0.14,
                borderTopWidth: size * 0.16,
                borderLeftColor: 'transparent',
                borderTopColor: iconColor,
              }}
            />
          </View>
        );

      case 'users':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            {/* Primary User Head */}
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                left: size * 0.22,
                width: size * 0.32,
                height: size * 0.32,
                borderRadius: size * 0.16,
                borderWidth: 1.8,
                borderColor: iconColor,
              }}
            />
            {/* Primary User Body */}
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                left: size * 0.12,
                width: size * 0.52,
                height: size * 0.28,
                borderTopLeftRadius: size * 0.18,
                borderTopRightRadius: size * 0.18,
                borderWidth: 1.8,
                borderBottomWidth: 0,
                borderColor: iconColor,
              }}
            />
            {/* Secondary Peer Head (behind) */}
            <View
              style={{
                position: 'absolute',
                top: size * 0.16,
                right: size * 0.12,
                width: size * 0.26,
                height: size * 0.26,
                borderRadius: size * 0.13,
                borderWidth: 1.6,
                borderColor: iconColor,
              }}
            />
            {/* Secondary Peer Body */}
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.14,
                right: size * 0.08,
                width: size * 0.38,
                height: size * 0.24,
                borderTopRightRadius: size * 0.14,
                borderWidth: 1.6,
                borderBottomWidth: 0,
                borderLeftWidth: 0,
                borderColor: iconColor,
              }}
            />
          </View>
        );

      case 'phone':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.5,
                height: size * 0.72,
                borderRadius: size * 0.14,
                borderWidth: 1.8,
                borderColor: iconColor,
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 3,
              }}
            >
              <View style={{ width: size * 0.16, height: 1.5, backgroundColor: iconColor, borderRadius: 1 }} />
              <View style={{ width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, borderWidth: 1, borderColor: iconColor }} />
            </View>
          </View>
        );

      case 'video':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.54,
                height: size * 0.44,
                borderRadius: 4,
                borderWidth: 1.8,
                borderColor: iconColor,
                marginRight: size * 0.12,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: size * 0.14,
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderTopWidth: size * 0.16,
                borderBottomWidth: size * 0.16,
                borderRightWidth: size * 0.22,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderRightColor: iconColor,
              }}
            />
          </View>
        );

      case 'bell':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.52,
                height: size * 0.52,
                borderTopLeftRadius: size * 0.26,
                borderTopRightRadius: size * 0.26,
                borderWidth: 1.8,
                borderColor: iconColor,
              }}
            />
            <View
              style={{
                width: size * 0.72,
                height: 2,
                backgroundColor: iconColor,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: size * 0.14,
                height: size * 0.1,
                borderBottomLeftRadius: size * 0.07,
                borderBottomRightRadius: size * 0.07,
                backgroundColor: iconColor,
                marginTop: 1,
              }}
            />
          </View>
        );

      case 'camera':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.72,
                height: size * 0.52,
                borderRadius: 4,
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
                  borderWidth: 1.6,
                  borderColor: iconColor,
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                top: size * 0.15,
                left: size * 0.26,
                width: size * 0.18,
                height: 2,
                backgroundColor: iconColor,
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
