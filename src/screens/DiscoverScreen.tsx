import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';

const TRENDING = [
  { emoji: '⚽', label: 'Football', color: gradients.avatar3 },
  { emoji: '🎬', label: 'Movies', color: gradients.avatar1 },
  { emoji: '🍜', label: 'Food', color: gradients.avatar5 },
  { emoji: '🎮', label: 'Gaming', color: gradients.avatar4 },
  { emoji: '✈️', label: 'Travel', color: gradients.avatar2 },
];

const UPCOMING = [
  { icon: 'people' as const, title: 'Channels', desc: 'Follow creators & communities', phase: 'Phase 3' },
  { icon: 'happy' as const, title: 'Sticker Studio', desc: 'Make & share sticker packs', phase: 'Phase 2' },
  { icon: 'color-wand' as const, title: 'AI Mood Engine', desc: 'Chats that feel your vibe', phase: 'Phase 2' },
  { icon: 'language' as const, title: 'Live Translate', desc: 'Chat across any language', phase: 'Phase 2' },
];

export default function DiscoverScreen() {
  return (
    <View style={styles.container}>
      <GlowBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Text style={styles.title}>Discover</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(60).duration(500)} style={styles.section}>
          TRENDING TOPICS
        </Animated.Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendRow}>
          {TRENDING.map((t, i) => (
            <Animated.View key={t.label} entering={FadeInRight.delay(100 + i * 70).springify()}>
              <PressableScale haptic={false} style={{ borderRadius: 20 }}>
                <LinearGradient
                  colors={t.color}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.trendCard}
                >
                  <Text style={{ fontSize: 30 }}>{t.emoji}</Text>
                  <Text style={styles.trendLabel}>{t.label}</Text>
                </LinearGradient>
              </PressableScale>
            </Animated.View>
          ))}
        </ScrollView>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
          COMING TO BAZINGGA
        </Animated.Text>
        {UPCOMING.map((u, i) => (
          <Animated.View key={u.title} entering={FadeInDown.delay(240 + i * 80).duration(450)}>
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name={u.icon} size={22} color={colors.yellow} />
              </View>
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={styles.cardTitle}>{u.title}</Text>
                <Text style={styles.cardDesc}>{u.desc}</Text>
              </View>
              <View style={styles.phasePill}>
                <Text style={styles.phaseText}>{u.phase}</Text>
              </View>
            </View>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.footerCard}>
          <Ionicons name="flash" size={20} color={colors.yellow} />
          <Text style={styles.footerText}>
            Bazingga is brand new. Invite your friends — the more, the merrier ⚡
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 58 },
  header: { paddingHorizontal: 20, marginBottom: 6 },
  title: { color: colors.white, fontSize: 32, fontFamily: fonts.display },
  section: {
    color: colors.textTertiary, fontSize: 11, fontFamily: fonts.semiBold,
    letterSpacing: 1.5, paddingHorizontal: 20, marginTop: 18, marginBottom: 10,
  },
  trendRow: { paddingHorizontal: 20, gap: 10 },
  trendCard: {
    width: 96, height: 96, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  trendLabel: { color: colors.white, fontSize: 12.5, fontFamily: fonts.semiBold },
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 20,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(246,184,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: colors.white, fontSize: 15, fontFamily: fonts.semiBold },
  cardDesc: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  phasePill: {
    backgroundColor: 'rgba(225,6,0,0.15)', borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  phaseText: { color: colors.redHot, fontSize: 10.5, fontFamily: fonts.semiBold },
  footerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 20,
    backgroundColor: 'rgba(246,184,0,0.07)', borderWidth: 1, borderColor: 'rgba(246,184,0,0.2)',
  },
  footerText: { flex: 1, color: colors.textSecondary, fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
});
