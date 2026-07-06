import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import GlowBackground from '../../components/GlowBackground';
import PressableScale from '../../components/PressableScale';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useAppStore } from '../../store/appStore';
import { backendMode } from '../../services/supabase';
import { fetchMyProfile, OtpTarget, sendOtp, verifyOtp } from '../../services/live';

// 6-digit OTP everywhere: email (server set to 6 on 6 Jul 2026), Twilio SMS,
// and demo mode all send 6 digits now.
const lenFor = (_target: OtpTarget) => 6;

export default function OtpScreen({ navigation, route }: any) {
  const target: OtpTarget = route.params?.target ?? { phone: route.params?.phone ?? '' };
  const label: string = route.params?.label ?? target.email ?? target.phone ?? '';
  const LEN = lenFor(target);
  const [digits, setDigits] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(30);
  const inputRef = useRef<TextInput>(null);

  // Android: focus after the screen transition settles so the keyboard opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 450);
    return () => clearTimeout(t);
  }, []);

  // resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn > 0]);
  const signIn = useAppStore((s) => s.signIn);
  const completeProfile = useAppStore((s) => s.completeProfile);

  useEffect(() => {
    if (digits.length !== LEN) return;
    let cancelled = false;

    const finish = async () => {
      if (backendMode === 'live') {
        const res = await verifyOtp(target, digits);
        if (cancelled) return;
        if (!res.ok) {
          setError('Wrong code — try again.');
          setDigits('');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          return;
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setError('');
      setVerified(true);
      // returning live user? skip profile setup
      const existing = backendMode === 'live' ? await fetchMyProfile() : null;
      if (cancelled) return;
      setTimeout(() => {
        signIn(label);
        if (existing) {
          completeProfile(existing); // authed + named → navigator jumps to Main
        } else {
          navigation.navigate('ProfileSetup');
        }
      }, 650);
    };
    finish();
    return () => { cancelled = true; };
  }, [digits]);

  return (
    <View style={styles.container}>
      <GlowBackground />
      <View style={styles.body}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>

        <Animated.Text entering={FadeInDown.duration(500)} style={styles.title}>
          Enter the code
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(500)} style={styles.subtitle}>
          Sent to {label}
          {backendMode === 'demo' ? '\nDemo mode: type any 6 digits.' : ''}
        </Animated.Text>

        {/* The input OVERLAYS the boxes so a tap lands directly on it —
            programmatic .focus() alone doesn't open the Android keyboard. */}
        <View style={styles.boxes}>
          {Array.from({ length: LEN }).map((_, i) => {
            const filled = i < digits.length;
            const activeBox = i === digits.length;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  activeBox && { borderColor: colors.yellow },
                  verified && { borderColor: colors.online },
                ]}
              >
                {filled && (
                  <Animated.Text entering={ZoomIn.duration(150)} style={styles.digit}>
                    {digits[i]}
                  </Animated.Text>
                )}
              </View>
            );
          })}
          <TextInput
            ref={inputRef}
            style={styles.overlayInput}
            value={digits}
            onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, LEN))}
            keyboardType="number-pad"
            maxLength={LEN}
            autoFocus
            caretHidden
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
        </View>

        {verified && (
          <Animated.View entering={ZoomIn.springify()} style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.online} />
            <Text style={styles.verifiedText}>Verified</Text>
          </Animated.View>
        )}
        {!!error && (
          <Animated.Text entering={ZoomIn.duration(200)} style={styles.errorText}>
            {error}
          </Animated.Text>
        )}

        <PressableScale
          style={styles.resend}
          disabled={resendIn > 0}
          onPress={async () => {
            if (resendIn > 0) return;
            setError('');
            setResendIn(60);
            if (backendMode === 'live') {
              const res = await sendOtp(target);
              if (!res.ok) setError(res.error ?? 'Could not resend. Try again shortly.');
            }
          }}
        >
          <Text style={styles.resendText}>
            Didn't get it?{' '}
            <Text style={{ color: resendIn > 0 ? colors.textTertiary : colors.yellow }}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </Text>
          </Text>
        </PressableScale>
      </View>
    </View>
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
    lineHeight: 21, marginTop: 10, marginBottom: 34,
  },
  boxes: { flexDirection: 'row', gap: 9, justifyContent: 'center', position: 'relative' },
  overlayInput: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.02, // must stay touchable+focusable; 0 gets culled on some Androids
    color: 'transparent',
    fontSize: 1,
  },
  box: {
    flex: 1, maxWidth: 54, height: 60, borderRadius: 14,
    backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  digit: { color: colors.white, fontSize: 24, fontFamily: fonts.bold },
  verifiedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 22,
  },
  verifiedText: { color: colors.online, fontSize: 15, fontFamily: fonts.semiBold },
  errorText: {
    color: colors.redHot, fontSize: 14, fontFamily: fonts.medium,
    textAlign: 'center', marginTop: 22,
  },
  resend: { marginTop: 28, alignSelf: 'center' },
  resendText: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.regular },
});
