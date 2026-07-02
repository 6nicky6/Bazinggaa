import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import GlowBackground from '../components/GlowBackground';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// Signature onboarding: "Hi." → "Hello." → "Let's talk." → "Welcome to Bazingga."
// Word-level spring reveal, progress dots, haptic tick per phrase.
const PHRASES = ['Hi.', 'Hello.', "Let's talk.", 'Welcome to Bazingga.'];
const HOLD_MS = 620;
const IN_MS = 700;

type Props = { onDone: () => void };

function Phrase({ text, onFinished }: { text: string; onFinished: () => void }) {
  const words = text.split(' ');
  useEffect(() => {
    const total = IN_MS + words.length * 90 + HOLD_MS;
    const t = setTimeout(onFinished, total);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={styles.phraseRow} exiting={FadeOut.duration(260)}>
      {words.map((w, i) => (
        <Word key={`${w}-${i}`} word={w} index={i} />
      ))}
    </Animated.View>
  );
}

function Word({ word, index }: { word: string; index: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(26);
  useEffect(() => {
    opacity.value = withDelay(index * 90, withTiming(1, { duration: IN_MS }));
    y.value = withDelay(
      index * 90,
      withSpring(0, { damping: 14, stiffness: 140 })
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  const isBrand = word.startsWith('Bazingga');
  return (
    <Animated.Text
      style={[styles.phrase, isBrand && styles.brandWord, style]}
    >
      {word}{' '}
    </Animated.Text>
  );
}

export default function OnboardingScreen({ onDone }: Props) {
  const [idx, setIdx] = useState(0);

  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    if (idx < PHRASES.length - 1) {
      setIdx((i) => i + 1);
    } else {
      setTimeout(onDone, 350);
    }
  };

  return (
    <View style={styles.container}>
      <GlowBackground />
      <View style={styles.center}>
        <Phrase key={idx} text={PHRASES[idx]} onFinished={next} />
      </View>
      <View style={styles.dots}>
        {PHRASES.map((_, i) => (
          <Dot key={i} active={i === idx} passed={i < idx} />
        ))}
      </View>
    </View>
  );
}

function Dot({ active, passed }: { active: boolean; passed: boolean }) {
  const w = useSharedValue(active ? 22 : 6);
  useEffect(() => {
    w.value = withTiming(active ? 22 : 6, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [active]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        styles.dot,
        style,
        {
          backgroundColor: active
            ? colors.red
            : passed
            ? colors.textSecondary
            : colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  phraseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  phrase: {
    color: colors.white,
    fontSize: 40,
    lineHeight: 52,
    fontFamily: fonts.display,
    textAlign: 'center',
  },
  brandWord: {
    color: colors.yellow,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    alignSelf: 'center',
    marginBottom: 64,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
