import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Logo from '../components/Logo';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';

// Bazingga+ — design-complete subscription screen (payments land at launch).
// Per the master brief: optional, non-intrusive, premium not pushy.
const PERKS = [
  { icon: 'color-palette' as const, title: 'Premium themes', desc: 'Exclusive wallpapers, light mode & seasonal looks' },
  { icon: 'sparkles' as const, title: 'AI unlimited', desc: 'Unlimited summaries, translations & smart replies' },
  { icon: 'cloud-upload' as const, title: 'More storage', desc: 'Bigger media history, larger files' },
  { icon: 'happy' as const, title: 'Sticker studio', desc: 'Custom sticker packs & avatar items' },
  { icon: 'flash' as const, title: 'Early access', desc: 'New features before everyone else' },
];

export default function BazinggaPlusScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <GlowBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <PressableScale onPress={() => navigation.goBack()} haptic={false} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.hero}>
          <Logo size={84} />
          <Text style={styles.title}>
            Bazingga<Text style={{ color: colors.yellow }}>+</Text>
          </Text>
          <Text style={styles.subtitle}>Everything you love, turned up.</Text>
        </Animated.View>

        {PERKS.map((p, i) => (
          <Animated.View key={p.title} entering={FadeInDown.delay(160 + i * 70).duration(400)}>
            <View style={styles.perk}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={20} color={colors.yellow} />
              </View>
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkDesc}>{p.desc}</Text>
              </View>
            </View>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(560).duration(400)} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <PressableScale style={styles.ctaShadow}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>Coming at launch</Text>
              <Ionicons name="rocket" size={16} color={colors.yellow} />
            </LinearGradient>
          </PressableScale>
          <Text style={styles.note}>
            Bazingga stays free forever. Plus is optional — never ads, never selling your data.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { paddingTop: 52, paddingHorizontal: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 26 },
  title: { color: colors.white, fontSize: 36, fontFamily: fonts.display, marginTop: 16 },
  subtitle: { color: colors.textSecondary, fontSize: 14.5, fontFamily: fonts.medium, marginTop: 6 },
  perk: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 12, padding: 14, borderRadius: 18,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  perkIcon: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(246,184,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  perkTitle: { color: colors.white, fontSize: 15, fontFamily: fonts.semiBold },
  perkDesc: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  ctaShadow: {
    borderRadius: 28, shadowColor: colors.red, shadowOpacity: 0.5,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 10,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 28, paddingVertical: 16,
  },
  ctaText: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
  note: {
    color: colors.textTertiary, fontSize: 12, fontFamily: fonts.regular,
    textAlign: 'center', marginTop: 14, lineHeight: 18,
  },
});
