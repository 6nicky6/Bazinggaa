import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

// The real Bazingga logo (assets/logo.png — from Nikhil's brand PDF, never
// regenerate). Red/yellow chat bubble with white bolt, soft brand glow behind.
type Props = { size?: number; style?: ViewStyle; glow?: boolean };

export default function Logo({ size = 96, style, glow = true }: Props) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {glow && (
        <View
          style={[
            styles.glow,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
            },
          ]}
        />
      )}
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: size, height: size * 0.94 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: colors.red,
    opacity: 0.22,
    shadowColor: colors.red,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
    transform: [{ scale: 0.75 }],
  },
});
