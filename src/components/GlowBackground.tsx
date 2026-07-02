import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

// Ambient brand glow: two huge soft gradient orbs drifting slowly behind
// every screen. Gives the "premium dark" depth without stealing focus.
function Orb({
  colorsPair,
  size,
  x,
  y,
  duration,
  maxOpacity,
}: {
  colorsPair: readonly [string, string];
  size: number;
  x: number;
  y: number;
  duration: number;
  maxOpacity: number;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: maxOpacity * (0.6 + 0.4 * drift.value),
    transform: [
      { translateX: x + drift.value * 30 },
      { translateY: y + drift.value * -40 },
      { scale: 1 + drift.value * 0.15 },
    ],
  }));

  return (
    <Animated.View style={[styles.orb, { width: size, height: size }, style]}>
      <LinearGradient
        colors={[colorsPair[0], 'transparent']}
        style={{ flex: 1, borderRadius: size / 2 }}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}

export default function GlowBackground() {
  return (
    <>
      <Orb
        colorsPair={['#E10600', 'transparent']}
        size={W * 1.1}
        x={-W * 0.35}
        y={-H * 0.18}
        duration={7000}
        maxOpacity={0.22}
      />
      <Orb
        colorsPair={['#F6B800', 'transparent']}
        size={W * 0.9}
        x={W * 0.45}
        y={H * 0.62}
        duration={9000}
        maxOpacity={0.13}
      />
    </>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
