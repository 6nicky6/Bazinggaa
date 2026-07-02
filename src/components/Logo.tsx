import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Placeholder logo: yellow lightning bolt in a red chat bubble.
// The real logo file replaces this — drop it at assets/logo.png and ask
// Claude Code to wire it in (do NOT regenerate the logo).
type Props = { size?: number; style?: ViewStyle };

export default function Logo({ size = 96, style }: Props) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
        },
        style,
      ]}
    >
      <Ionicons name="flash" size={size * 0.5} color={colors.yellow} />
      <View
        style={[
          styles.tail,
          {
            bottom: -size * 0.08,
            left: size * 0.18,
            borderTopWidth: size * 0.14,
            borderRightWidth: size * 0.14,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tail: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: colors.red,
    borderRightColor: 'transparent',
  },
});
