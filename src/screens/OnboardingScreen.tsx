import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Logo from '../components/Logo';
import { colors } from '../theme/colors';

// Signature onboarding: "Hi." → "Hello." → "Let's talk." → "Welcome to Bazingga."
// Each phrase fades + slides up (~700ms), logo pulses at the end, then we
// hand off to the login screen.
const PHRASES = ['Hi.', 'Hello.', "Let's talk.", 'Welcome to Bazingga.'];
const PHRASE_IN_MS = 700;
const PHRASE_HOLD_MS = 550;

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isLast = phraseIndex === PHRASES.length - 1;

    opacity.setValue(0);
    translateY.setValue(24);

    const animIn = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: PHRASE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: PHRASE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    if (!isLast) {
      const seq = Animated.sequence([
        animIn,
        Animated.delay(PHRASE_HOLD_MS),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      seq.start(({ finished }) => {
        if (finished) setPhraseIndex((i) => i + 1);
      });
      return () => seq.stop();
    }

    // Final phrase: bring in the logo with a pulse, then finish.
    const seq = Animated.sequence([
      animIn,
      Animated.delay(250),
    ]);
    seq.start(({ finished }) => {
      if (!finished) return;
      setShowLogo(true);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
        ]),
        // pulse
        Animated.timing(logoScale, {
          toValue: 1.12,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]).start(({ finished: done }) => {
        if (done) onDone();
      });
    });
    return () => seq.stop();
  }, [phraseIndex]);

  return (
    <View style={styles.container}>
      {showLogo && (
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            marginBottom: 32,
          }}
        >
          <Logo size={104} />
        </Animated.View>
      )}
      <Animated.Text
        style={[styles.phrase, { opacity, transform: [{ translateY }] }]}
      >
        {PHRASES[phraseIndex]}
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
    paddingHorizontal: 32,
  },
  phrase: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
