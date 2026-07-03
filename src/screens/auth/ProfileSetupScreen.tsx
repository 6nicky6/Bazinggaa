import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import GlowBackground from '../../components/GlowBackground';
import PressableScale from '../../components/PressableScale';
import Avatar from '../../components/Avatar';
import { colors, gradients } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useAppStore } from '../../store/appStore';
import { backendMode } from '../../services/supabase';
import { upsertProfile } from '../../services/live';

const EMOJIS = ['⚡', '😎', '🦁', '🚀', '🔥', '🌙', '🎧', '🏀', '🌸', '👑', '🎮', '🍕'];
const GRADS = [
  gradients.primary, gradients.avatar1, gradients.avatar2,
  gradients.avatar3, gradients.avatar4, gradients.avatar5,
] as const;

export default function ProfileSetupScreen() {
  const completeProfile = useAppStore((s) => s.completeProfile);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [emoji, setEmoji] = useState('⚡');
  const [grad, setGrad] = useState<readonly [string, string]>(gradients.primary);
  const valid = name.trim().length >= 2;

  const finish = () => {
    if (!valid) return;
    completeProfile({
      name: name.trim(),
      username: username.trim() || name.trim().toLowerCase().replace(/\s+/g, '_'),
      avatarEmoji: emoji,
      avatarGradient: grad,
    });
    // completing the profile flips `authed`+profile → RootNavigator switches to the app
    if (backendMode === 'live') {
      // persist to Supabase (fire-and-forget; store already has it locally)
      upsertProfile(useAppStore.getState().profile);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GlowBackground />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.duration(500)} style={styles.title}>
          Set up your profile
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(500)} style={styles.subtitle}>
          This is how friends will see you.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.avatarWrap}>
          <Avatar gradient={grad} label={emoji} size={104} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(500)}>
          <Text style={styles.label}>PICK YOUR VIBE</Text>
          <View style={styles.emojiGrid}>
            {EMOJIS.map((e) => (
              <PressableScale
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiCell, emoji === e && styles.emojiCellActive]}
                scaleTo={0.85}
              >
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </PressableScale>
            ))}
          </View>
          <View style={styles.gradRow}>
            {GRADS.map((g, i) => (
              <PressableScale key={i} onPress={() => setGrad(g)} scaleTo={0.85}>
                <LinearGradient
                  colors={g}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gradSwatch, grad === g && styles.gradSwatchActive]}
                />
              </PressableScale>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={{ gap: 12 }}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            maxLength={30}
          />
          <View style={styles.usernameRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              style={[styles.input, { flex: 1, paddingLeft: 34, marginLeft: -30 }]}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase())}
              placeholder="username (optional)"
              placeholderTextColor={colors.textTertiary}
              maxLength={20}
              autoCapitalize="none"
            />
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(340).duration(500)} style={styles.footer}>
        <PressableScale onPress={finish} style={[styles.cta, !valid && { opacity: 0.4 }]} disabled={!valid}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>Enter Bazingga</Text>
            <Ionicons name="flash" size={17} color={colors.yellow} />
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  body: { paddingHorizontal: 26, paddingTop: 64, paddingBottom: 20 },
  title: { color: colors.white, fontSize: 30, fontFamily: fonts.display },
  subtitle: {
    color: colors.textSecondary, fontSize: 14.5, fontFamily: fonts.regular,
    marginTop: 8, marginBottom: 24,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  label: {
    color: colors.textTertiary, fontSize: 11, fontFamily: fonts.semiBold,
    letterSpacing: 1.5, marginBottom: 10,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  emojiCell: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiCellActive: { borderColor: colors.yellow, borderWidth: 1.5 },
  gradRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  gradSwatch: { width: 34, height: 34, borderRadius: 17 },
  gradSwatchActive: { borderWidth: 2.5, borderColor: colors.white },
  input: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 16, color: colors.white, fontSize: 16, fontFamily: fonts.medium,
    paddingHorizontal: 18, paddingVertical: 15,
  },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  at: {
    color: colors.textSecondary, fontSize: 16, fontFamily: fonts.semiBold,
    zIndex: 1, marginLeft: 16, width: 14,
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
