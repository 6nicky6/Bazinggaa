import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import GlowBackground from '../../components/GlowBackground';
import PressableScale from '../../components/PressableScale';
import { colors, gradients } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { backendMode } from '../../services/supabase';
import { sendOtp } from '../../services/live';

// Phone or email entry (route.params.mode). Demo mode: anything works.
// Live mode: real Supabase OTP — email is free, SMS needs Twilio configured.
export default function PhoneScreen({ navigation, route }: any) {
  const isEmail = route.params?.mode === 'email';
  const [code, setCode] = useState('+971');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const valid = isEmail
    ? /^\S+@\S+\.\S+$/.test(email.trim())
    : phone.replace(/\D/g, '').length >= 7;

  // SMS needs Twilio (not configured yet) — in live mode steer phone users to email
  const phoneUnavailable = !isEmail && backendMode === 'live';

  const submit = async () => {
    if (phoneUnavailable) {
      navigation.replace('Phone', { mode: 'email' });
      return;
    }
    if (!valid || sending) return;
    const target = isEmail
      ? { email: email.trim().toLowerCase() }
      : { phone: `${code}${phone.replace(/\D/g, '')}` };
    if (backendMode === 'live') {
      setSending(true);
      setError('');
      const res = await sendOtp(target);
      setSending(false);
      if (!res.ok) {
        setError(res.error ?? 'Could not send code. Try again.');
        return;
      }
    }
    navigation.navigate('Otp', { target, label: isEmail ? target.email : target.phone });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GlowBackground />
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.back} haptic={false}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </PressableScale>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(80).duration(500)} style={styles.title}>
          {isEmail ? 'Your email' : 'Your phone number'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160).duration(500)} style={styles.subtitle}>
          We'll send you a verification code.{'\n'}
          {backendMode === 'demo'
            ? `Demo mode: any ${isEmail ? 'email' : 'number'} works for now.`
            : isEmail
            ? 'Check your inbox (and spam) for the code.'
            : 'SMS login is coming soon — use Email for now.'}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.inputRow}>
          {isEmail ? (
            <TextInput
              style={styles.phoneInput}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
          ) : (
            <>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={setCode}
                keyboardType="phone-pad"
                maxLength={5}
              />
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="50 123 4567"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                autoFocus
              />
            </>
          )}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.footer}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <PressableScale
          onPress={submit}
          style={[styles.cta, !phoneUnavailable && (!valid || sending) && { opacity: 0.4 }]}
          disabled={!phoneUnavailable && (!valid || sending)}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>
              {phoneUnavailable ? 'Use Email Instead' : sending ? 'Sending…' : 'Send Code'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  body: { flex: 1, paddingHorizontal: 26, paddingTop: 56 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  title: { color: colors.white, fontSize: 30, fontFamily: fonts.display },
  subtitle: {
    color: colors.textSecondary, fontSize: 14.5, fontFamily: fonts.regular,
    lineHeight: 21, marginTop: 10, marginBottom: 30,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    width: 84, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 16, color: colors.white, fontSize: 17, fontFamily: fonts.semiBold,
    textAlign: 'center', paddingVertical: 15,
  },
  phoneInput: {
    flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 16, color: colors.white, fontSize: 17, fontFamily: fonts.semiBold,
    paddingHorizontal: 18, paddingVertical: 15,
  },
  footer: { paddingHorizontal: 26, paddingBottom: 36 },
  error: {
    color: colors.redHot, fontSize: 13, fontFamily: fonts.medium,
    textAlign: 'center', marginBottom: 10,
  },
  cta: {
    borderRadius: 30, shadowColor: colors.red, shadowOpacity: 0.5,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 30, paddingVertical: 17,
  },
  ctaText: { color: colors.white, fontSize: 16, fontFamily: fonts.semiBold },
});
