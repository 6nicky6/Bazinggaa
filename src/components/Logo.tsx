import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';

// Placeholder logo: yellow lightning bolt in a red gradient chat bubble
// with a soft glow. The real logo file replaces this — drop it at
// assets/logo.png and ask Claude Code to wire it in (do NOT regenerate).
type Props = { size?: number; style?: ViewStyle; glow?: boolean };

export default function Logo({ size = 96, style, glow = true }: Props) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {glow && (
        <View
          style={[
            styles.glow,
            {
              width: size * 1.55,
              height: size * 1.55,
              borderRadius: (size * 1.55) / 2,
            },
          ]}
        />
      )}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="flash" size={size * 0.52} color={colors.yellow} />
      </LinearGradient>
      <View
        style={[
          styles.tail,
          {
            bottom: -size * 0.07,
            left: size * 0.42,
            borderTopWidth: size * 0.13,
            borderRightWidth: size * 0.13,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: colors.red,
    opacity: 0.28,
    // big soft shadow ring on Android/iOS
    shadowColor: colors.red,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
    transform: [{ scale: 0.72 }],
  },
  tail: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: colors.redHot,
    borderRightColor: 'transparent',
  },
});
