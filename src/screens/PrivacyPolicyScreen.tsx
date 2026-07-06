import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const SECTIONS: { h: string; b: string }[] = [
  {
    h: 'What we collect',
    b: 'Your phone number or email (to sign you in), your profile (name, username, status, avatar choice), your messages and Moments, and basic technical logs needed to keep the service running.',
  },
  {
    h: 'How your data is protected',
    b: 'All data travels over encrypted connections (TLS). On our servers, strict access rules mean only members of a chat can read its messages. Full end-to-end encryption is on our roadmap and will be clearly announced when it ships.',
  },
  {
    h: 'AI features',
    b: 'Smart Replies and BazinggaBot send the relevant message text to Google Gemini to generate suggestions. AI features can be turned off anytime in Profile → Bazingga AI. AI failures never block your chats.',
  },
  {
    h: 'What we never do',
    b: 'We do not sell your data. We do not show ads. We do not read your chats for marketing. Moments disappear after 24 hours and are deleted.',
  },
  {
    h: 'Your controls',
    b: 'Block and report anyone from any chat. Blocked users cannot message you or see your Moments. You can log out anytime; account deletion requests: bazingga.app@gmail.com.',
  },
  {
    h: 'Children',
    b: 'Bazingga is family-friendly and intended for users 13 and older.',
  },
];

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <GlowBackground />
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Bazingga v0.1 · Last updated July 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.b}</Text>
          </View>
        ))}
        <Text style={styles.footer}>
          Questions? Email bazingga.app@gmail.com — a human (the founder!) reads every message.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 52 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 22, fontFamily: fonts.display, marginLeft: 4 },
  body: { paddingHorizontal: 22, paddingBottom: 60 },
  updated: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.regular, marginBottom: 18 },
  section: { marginBottom: 18 },
  h: { color: colors.yellow, fontSize: 15, fontFamily: fonts.semiBold, marginBottom: 6 },
  p: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.regular, lineHeight: 21 },
  footer: {
    color: colors.textTertiary, fontSize: 12.5, fontFamily: fonts.regular,
    marginTop: 10, lineHeight: 19,
  },
});
