import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import PressableScale from '../components/PressableScale';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';

const GRADS = [
  gradients.primary, gradients.avatar1, gradients.avatar2,
  gradients.avatar3, gradients.avatar4, gradients.avatar5, gradients.bolt,
] as const;

export default function MomentComposerScreen({ navigation }: any) {
  const postMoment = useAppStore((s) => s.postMoment);
  const [text, setText] = useState('');
  const [grad, setGrad] = useState<readonly [string, string]>(gradients.avatar1);

  const post = () => {
    if (!text.trim()) return;
    postMoment(text.trim(), grad);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.topBar}>
          <PressableScale onPress={() => navigation.goBack()} haptic={false} style={styles.topBtn}>
            <Ionicons name="close" size={24} color={colors.white} />
          </PressableScale>
          <Text style={styles.topTitle}>New Moment</Text>
          <View style={{ width: 42 }} />
        </Animated.View>

        <View style={styles.center}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type something…"
            placeholderTextColor="rgba(255,255,255,0.6)"
            multiline
            maxLength={220}
            autoFocus
          />
        </View>

        <Animated.View entering={FadeInUp.duration(400)} style={styles.bottom}>
          <View style={styles.gradRow}>
            {GRADS.map((g, i) => (
              <PressableScale key={i} onPress={() => setGrad(g)} scaleTo={0.85}>
                <LinearGradient
                  colors={g}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.swatch, grad === g && styles.swatchActive]}
                />
              </PressableScale>
            ))}
          </View>
          <PressableScale onPress={post} style={[styles.postBtn, !text.trim() && { opacity: 0.4 }]} disabled={!text.trim()}>
            <View style={styles.postBtnInner}>
              <Text style={styles.postText}>Share Moment</Text>
              <Ionicons name="flash" size={16} color={colors.yellow} />
            </View>
          </PressableScale>
          <Text style={styles.expiry}>Visible to friends · disappears in 24h</Text>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 54, paddingHorizontal: 16,
  },
  topBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: colors.white, fontSize: 16, fontFamily: fonts.semiBold },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  input: {
    color: colors.white, fontSize: 30, fontFamily: fonts.display,
    textAlign: 'center', lineHeight: 40,
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 38 },
  gradRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 18 },
  swatch: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  swatchActive: { borderColor: colors.white, borderWidth: 3 },
  postBtn: { borderRadius: 28, overflow: 'hidden' },
  postBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 16, borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  postText: { color: colors.white, fontSize: 16, fontFamily: fonts.semiBold },
  expiry: {
    color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: fonts.regular,
    textAlign: 'center', marginTop: 12,
  },
});
