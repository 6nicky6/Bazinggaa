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

// 6-digit OTP. Demo mode: any 6 digits verify instantly.
const LEN = 6;

export default function OtpScreen({ navigation, route }: any) {
  const phone: string = route.params?.phone ?? '';
  const [digits, setDigits] = useState('');
  const [verified, setVerified] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const signIn = useAppStore((s) => s.signIn);

  useEffect(() => {
    if (digits.length === LEN) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setVerified(true);
      const t = setTimeout(() => {
        signIn(phone);
        navigation.navigate('ProfileSetup');
      }, 650);
      return () => clearTimeout(t);
    }
  }, [digits]);

  return (
    <View style={styles.container}>
      <GlowBackground />
      <View style={styles.body}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.back} haptic={false}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>

        <Animated.Text entering={FadeInDown.duration(500)} style={styles.title}>
          Enter the code
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(500)} style={styles.subtitle}>
          Sent to {phone}
          {backendMode === 'demo' ? '\nDemo mode: type any 6 digits.' : ''}
        </Animated.Text>

        <PressableScale
          onPress={() => inputRef.current?.focus()}
          haptic={false}
          style={styles.boxes}
        >
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
        </PressableScale>

        {verified && (
          <Animated.View entering={ZoomIn.springify()} style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.online} />
            <Text style={styles.verifiedText}>Verified</Text>
          </Animated.View>
        )}

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={digits}
          onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, LEN))}
          keyboardType="number-pad"
          maxLength={LEN}
          autoFocus
        />

        <PressableScale haptic={false} style={styles.resend}>
          <Text style={styles.resendText}>
            Didn't get it? <Text style={{ color: colors.yellow }}>Resend code</Text>
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
  boxes: { flexDirection: 'row', gap: 9, justifyContent: 'center' },
  box: {
    flex: 1, maxWidth: 54, height: 60, borderRadius: 14,
    backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  digit: { color: colors.white, fontSize: 24, fontFamily: fonts.bold },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  verifiedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 22,
  },
  verifiedText: { color: colors.online, fontSize: 15, fontFamily: fonts.semiBold },
  resend: { marginTop: 28, alignSelf: 'center' },
  resendText: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.regular },
});
