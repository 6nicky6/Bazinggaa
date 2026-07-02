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

// Phone entry. Demo mode: any number works. Live mode: Supabase OTP (Sprint 2 wiring).
export default function PhoneScreen({ navigation }: any) {
  const [code, setCode] = useState('+971');
  const [phone, setPhone] = useState('');
  const valid = phone.replace(/\D/g, '').length >= 7;

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
          Your phone number
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160).duration(500)} style={styles.subtitle}>
          We'll send you a verification code.{'\n'}
          {backendMode === 'demo' ? 'Demo mode: any number works for now.' : 'Standard SMS rates may apply.'}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.inputRow}>
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
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.footer}>
        <PressableScale
          onPress={() => valid && navigation.navigate('Otp', { phone: `${code} ${phone}` })}
          style={[styles.cta, !valid && { opacity: 0.4 }]}
          disabled={!valid}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>Send Code</Text>
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
