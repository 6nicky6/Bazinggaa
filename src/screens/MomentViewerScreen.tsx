import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { liveMoments, useAppStore } from '../store/appStore';

const DURATION_MS = 5000;

export default function MomentViewerScreen({ navigation, route }: any) {
  const authorId: string = route.params.authorId;
  const momentsAll = useAppStore((s) => s.moments);
  const contacts = useAppStore((s) => s.contacts);
  const profile = useAppStore((s) => s.profile);
  const viewMoment = useAppStore((s) => s.viewMoment);
  const deleteMoment = useAppStore((s) => s.deleteMoment);

  const moments = useMemo(
    () => liveMoments(momentsAll).filter((m) => m.authorId === authorId).sort((a, b) => a.createdAt - b.createdAt),
    [momentsAll, authorId]
  );
  const [idx, setIdx] = useState(0);
  const isMe = authorId === 'me';
  const author = isMe ? null : contacts.find((c) => c.id === authorId);
  const moment = moments[idx];

  const progress = useSharedValue(0);

  useEffect(() => {
    if (!moment) {
      navigation.goBack();
      return;
    }
    viewMoment(moment.id);
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.linear }, (done) => {
      if (done) runOnJS(next)();
    });
  }, [idx, moment?.id]);

  const next = () => {
    if (idx < moments.length - 1) setIdx(idx + 1);
    else navigation.goBack();
  };
  const prev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!moment) return null;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
      <LinearGradient
        colors={moment.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* progress bars */}
        <View style={styles.bars}>
          {moments.map((m, i) => (
            <View key={m.id} style={styles.barTrack}>
              {i < idx && <View style={[styles.barFill, { width: '100%' }]} />}
              {i === idx && <Animated.View style={[styles.barFill, barStyle]} />}
            </View>
          ))}
        </View>

        {/* header */}
        <View style={styles.header}>
          <Avatar
            gradient={isMe ? profile.avatarGradient : author!.gradient}
            label={isMe ? profile.avatarEmoji : author!.initials}
            size={38}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.name}>{isMe ? 'You' : author!.name}</Text>
            <Text style={styles.time}>
              {Math.max(1, Math.round((Date.now() - moment.createdAt) / 3_600_000))}h ago
            </Text>
          </View>
          {isMe && (
            <PressableScale
              haptic={false}
              style={styles.headerBtn}
              onPress={() => {
                deleteMoment(moment.id);
                if (moments.length <= 1) navigation.goBack();
                else setIdx(Math.max(0, idx - 1));
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.white} />
            </PressableScale>
          )}
          <PressableScale haptic={false} style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={colors.white} />
          </PressableScale>
        </View>

        {/* content + tap zones */}
        <View style={styles.content}>
          <Pressable style={styles.tapLeft} onPress={prev} />
          <Text style={styles.text}>{moment.text}</Text>
          <Pressable style={styles.tapRight} onPress={next} />
        </View>

        {/* footer */}
        <View style={styles.footer}>
          {isMe ? (
            <View style={styles.viewsPill}>
              <Ionicons name="eye-outline" size={15} color={colors.white} />
              <Text style={styles.viewsText}>{moment.views.filter((v) => v !== 'me').length} views</Text>
            </View>
          ) : (
            <Text style={styles.replyHint}>Tap sides to navigate</Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bars: { flexDirection: 'row', gap: 4, paddingTop: 50, paddingHorizontal: 12 },
  barTrack: {
    flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  barFill: { height: 3, borderRadius: 2, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12,
  },
  name: { color: colors.white, fontSize: 14.5, fontFamily: fonts.semiBold },
  time: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontFamily: fonts.regular },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  tapLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '32%' },
  tapRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%' },
  text: {
    color: colors.white, fontSize: 32, fontFamily: fonts.display,
    textAlign: 'center', lineHeight: 44,
  },
  footer: { alignItems: 'center', paddingBottom: 40 },
  viewsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  viewsText: { color: colors.white, fontSize: 13, fontFamily: fonts.medium },
  replyHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: fonts.regular },
});
