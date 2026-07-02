import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Logo from '../components/Logo';
import GlowBackground from '../components/GlowBackground';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// App loading screen: logo springs in with a glow flash, wordmark slides up,
// tagline shimmers in — ~2.2s total, then hands off to onboarding.
type Props = { onDone: () => void };

export default function SplashScreen({ onDone }: Props) {
  const logoScale = useSharedValue(0.2);
  const logoOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordY = useSharedValue(18);
  const tagOpacity = useSharedValue(0);
  const tagSpacing = useSharedValue(8);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 350 });
    logoScale.value = withSequence(
      withSpring(1.08, { damping: 9, stiffness: 120 }),
      withSpring(1, { damping: 12, stiffness: 180 })
    );
    wordOpacity.value = withDelay(550, withTiming(1, { duration: 450 }));
    wordY.value = withDelay(
      550,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
    tagOpacity.value = withDelay(950, withTiming(1, { duration: 500 }));
    tagSpacing.value = withDelay(
      950,
      withTiming(3, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
    // gentle haptic as the logo lands, then hand off
    const t1 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, 420);
    const t2 = setTimeout(onDone, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    letterSpacing: tagSpacing.value,
  }));

  return (
    <View style={styles.container}>
      <GlowBackground />
      <Animated.View style={logoStyle}>
        <Logo size={116} />
      </Animated.View>
      <Animated.Text style={[styles.wordmark, wordStyle]}>
        Bazingga
      </Animated.Text>
      <Animated.Text style={[styles.tagline, tagStyle]}>
        FAST · PRIVATE · EXPRESSIVE
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: colors.white,
    fontSize: 38,
    fontFamily: fonts.display,
    marginTop: 30,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 12,
  },
});
