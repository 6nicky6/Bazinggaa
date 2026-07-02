import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { liveMoments, useAppStore } from '../store/appStore';

function ago(ts: number) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function MomentsScreen({ navigation }: any) {
  const moments = useAppStore((s) => s.moments);
  const contacts = useAppStore((s) => s.contacts);
  const profile = useAppStore((s) => s.profile);
  const blocked = useAppStore((s) => s.blocked);

  const live = useMemo(() => liveMoments(moments), [moments]);
  const mine = live.filter((m) => m.authorId === 'me');
  const friends = live.filter((m) => m.authorId !== 'me' && !blocked.includes(m.authorId));

  return (
    <View style={styles.container}>
      <GlowBackground />
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={styles.title}>Moments</Text>
        <PressableScale onPress={() => navigation.navigate('MomentComposer')} style={styles.addBtn} scaleTo={0.88}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtnInner}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </LinearGradient>
        </PressableScale>
      </Animated.View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* My moment */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <Text style={styles.section}>MY MOMENT</Text>
          {mine.length === 0 ? (
            <PressableScale
              onPress={() => navigation.navigate('MomentComposer')}
              style={styles.myEmpty}
              haptic={false}
            >
              <Avatar gradient={profile.avatarGradient} label={profile.avatarEmoji} size={52} />
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={styles.myEmptyTitle}>Share a Moment</Text>
                <Text style={styles.myEmptySub}>Disappears in 24 hours</Text>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.yellow} />
            </PressableScale>
          ) : (
            mine.map((m) => (
              <PressableScale
                key={m.id}
                onPress={() => navigation.navigate('MomentViewer', { authorId: 'me' })}
                style={styles.momentCard}
                haptic={false}
              >
                <LinearGradient
                  colors={m.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.momentThumb}
                >
                  <Text numberOfLines={3} style={styles.momentThumbText}>{m.text}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text style={styles.momentName}>You</Text>
                  <Text style={styles.momentMeta}>
                    {ago(m.createdAt)} · <Ionicons name="eye-outline" size={12} color={colors.textSecondary} /> {m.views.length}
                  </Text>
                </View>
              </PressableScale>
            ))
          )}
        </Animated.View>

        {/* Friends' moments */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
          <Text style={styles.section}>RECENT</Text>
          {friends.length === 0 && (
            <Text style={styles.emptyText}>No Moments yet. Nudge your friends ⚡</Text>
          )}
          {friends.map((m, i) => {
            const author = contacts.find((c) => c.id === m.authorId);
            if (!author) return null;
            const seen = m.views.includes('me');
            return (
              <Animated.View key={m.id} entering={FadeInDown.delay(200 + i * 70).springify()}>
                <PressableScale
                  onPress={() => navigation.navigate('MomentViewer', { authorId: m.authorId })}
                  style={styles.momentCard}
                  haptic={false}
                >
                  <LinearGradient
                    colors={seen ? ([colors.border, colors.border] as const) : gradients.momentRing}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ring}
                  >
                    <View style={styles.ringInner}>
                      <Avatar gradient={author.gradient} label={author.initials} size={50} />
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 13 }}>
                    <Text style={styles.momentName}>{author.name}</Text>
                    <Text style={styles.momentMeta}>{ago(m.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </PressableScale>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 58 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  title: { color: colors.white, fontSize: 32, fontFamily: fonts.display },
  addBtn: {
    borderRadius: 20, shadowColor: colors.red, shadowOpacity: 0.45,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  addBtnInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: {
    color: colors.textTertiary, fontSize: 11, fontFamily: fonts.semiBold,
    letterSpacing: 1.5, paddingHorizontal: 20, marginTop: 18, marginBottom: 10,
  },
  myEmpty: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, padding: 14, borderRadius: 20,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  myEmptyTitle: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
  myEmptySub: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  momentCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 9,
  },
  momentThumb: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  momentThumbText: { color: colors.white, fontSize: 7.5, fontFamily: fonts.semiBold, textAlign: 'center' },
  ring: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  ringInner: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  momentName: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
  momentMeta: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  emptyText: {
    color: colors.textTertiary, fontSize: 13.5, fontFamily: fonts.regular,
    paddingHorizontal: 20,
  },
});
