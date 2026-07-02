import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import { colors } from '../theme/colors';

// Login UI only this sprint — real phone OTP / email auth arrives in Sprint 2.
// For now both buttons preview the chat list so the whole flow is walkable.
type Props = { onContinue: () => void };

export default function LoginScreen({ onContinue }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Logo size={112} />
        <Text style={styles.appName}>Bazingga</Text>
        <Text style={styles.tagline}>Fast. Private. Expressive.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.phoneButton, pressed && styles.pressed]}
          onPress={onContinue}
        >
          <Ionicons name="call" size={18} color={colors.black} />
          <Text style={styles.phoneButtonText}>Continue with Phone</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.emailButton, pressed && styles.pressed]}
          onPress={onContinue}
        >
          <Ionicons name="mail" size={18} color={colors.white} />
          <Text style={styles.emailButtonText}>Continue with Email</Text>
        </Pressable>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service{'\n'}and Privacy
          Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 24,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    letterSpacing: 2,
    marginTop: 10,
  },
  actions: {
    gap: 14,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingVertical: 16,
  },
  phoneButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 28,
    paddingVertical: 16,
  },
  emailButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  terms: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
