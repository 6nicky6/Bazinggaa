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

  const [betaBlocked, setBetaBlocked] = useState(false);

  const submit = async () => {
    if (!valid || sending) return;
    const target = isEmail
      ? { email: email.trim().toLowerCase() }
      : { phone: `${code}${phone.replace(/\D/g, '')}` };
    if (backendMode === 'live') {
      setSending(true);
      setError('');
      setBetaBlocked(false);
      const res = await sendOtp(target);
      setSending(false);
      if (!res.ok) {
        // Twilio trial can only text invited (verified) numbers
        if (!isEmail && /21608|unverified|not.*verified|Invalid parameter/i.test(res.error ?? '')) {
          setBetaBlocked(true);
        } else {
          setError(res.error ?? 'Could not send code. Try again.');
        }
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
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
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
        {betaBlocked && (
          <View style={styles.betaCard}>
            <Ionicons name="sparkles" size={16} color={colors.yellow} />
            <Text style={styles.betaText}>
              SMS login is invite-only while Bazingga is in beta. Use email —
              it's instant and free — or ask your inviter to whitelist this number.
            </Text>
          </View>
        )}
        {betaBlocked && (
          <PressableScale
            onPress={() => navigation.replace('Phone', { mode: 'email' })}
            style={[styles.cta, { marginBottom: 10 }]}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              <Text style={styles.ctaText}>Continue with Email</Text>
              <Ionicons name="mail" size={17} color={colors.white} />
            </LinearGradient>
          </PressableScale>
        )}
        <PressableScale
          onPress={submit}
          style={[styles.cta, (!valid || sending) && { opacity: 0.4 }, betaBlocked && styles.ctaSecondary]}
          disabled={!valid || sending}
        >
          {betaBlocked ? (
            <View style={[styles.ctaInner, styles.ctaSecondaryInner]}>
              <Text style={styles.ctaText}>{sending ? 'Sending…' : 'Try SMS Again'}</Text>
            </View>
          ) : (
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              <Text style={styles.ctaText}>{sending ? 'Sending…' : 'Send Code'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </LinearGradient>
          )}
        </PressableScale>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  betaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(246,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(246,184,0,0.25)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  betaText: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, flexShrink: 1, lineHeight: 18 },
  ctaSecondary: { shadowOpacity: 0, elevation: 0 },
  ctaSecondaryInner: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 30,
  },
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
