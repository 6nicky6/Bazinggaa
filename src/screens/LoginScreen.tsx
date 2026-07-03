import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Logo from '../components/Logo';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';

// Entry point of the auth flow: phone (primary) or email (fallback) —
// both lead into the verification flow. Demo mode verifies instantly.
export default function LoginScreen({ navigation }: any) {
  const onContinue = () => navigation.navigate('Phone', { mode: 'phone' });
  const onEmail = () => navigation.navigate('Phone', { mode: 'email' });
  return (
    <View style={styles.container}>
      <GlowBackground />

      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(600).springify()}>
          <Logo size={116} />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(120).duration(600).springify()}
          style={styles.appName}
        >
          Bazingga
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(240).duration(600)}
          style={styles.tagline}
        >
          Fast. Private. Expressive.
        </Animated.Text>
      </View>

      <View style={styles.actions}>
        <Animated.View entering={FadeInUp.delay(350).duration(550).springify()}>
          <PressableScale onPress={onContinue} style={styles.buttonShadow}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Ionicons name="call" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Continue with Phone</Text>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(470).duration(550).springify()}>
          <PressableScale onPress={onEmail} style={styles.glassButton}>
            <Ionicons name="mail" size={18} color={colors.white} />
            <Text style={styles.glassButtonText}>Continue with Email</Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(500)}>
          <Text style={styles.terms}>
            By continuing you agree to our{'\n'}
            <Text
              style={styles.termsLink}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              suppressHighlighting
            >
              Terms of Service and Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 40,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: colors.white,
    fontSize: 40,
    fontFamily: fonts.display,
    marginTop: 28,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: fonts.medium,
    letterSpacing: 2.5,
    marginTop: 10,
  },
  actions: {
    gap: 14,
  },
  buttonShadow: {
    borderRadius: 30,
    shadowColor: colors.red,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 30,
    paddingVertical: 17,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 30,
    paddingVertical: 17,
  },
  glassButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  terms: {
    color: colors.textTertiary,
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  termsLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
