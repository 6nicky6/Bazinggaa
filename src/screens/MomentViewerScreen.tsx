import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const ensureChat = useAppStore((s) => s.ensureChat);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const [reply, setReply] = useState('');
  const [sentNote, setSentNote] = useState('');

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
              {(() => {
                const mins = Math.max(1, Math.round((Date.now() - moment.createdAt) / 60_000));
                return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
              })()}
            </Text>
          </View>
          {isMe && (
            <PressableScale
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
          <PressableScale style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={colors.white} />
          </PressableScale>
        </View>

        {/* content + tap zones */}
        <View style={styles.content}>
          <Pressable style={styles.tapLeft} onPress={prev} />
          <Text style={styles.text}>{moment.text}</Text>
          <Pressable style={styles.tapRight} onPress={next} />
        </View>

        {/* footer: views (mine) or react + reply (theirs) */}
        <View style={styles.footer}>
          {isMe ? (
            <View style={styles.viewsPill}>
              <Ionicons name="eye-outline" size={15} color={colors.white} />
              <Text style={styles.viewsText}>{moment.views.filter((v) => v !== 'me').length} views</Text>
            </View>
          ) : (
            <>
              <View style={styles.reactRow}>
                {['❤️', '🔥', '😂', '👏'].map((e) => (
                  <PressableScale
                    key={e}
                    scaleTo={0.75}
                    style={styles.reactBtn}
                    onPress={async () => {
                      const cid = await ensureChat(authorId);
                      if (cid) {
                        sendMessage(cid, `${e} Reacted to your Moment: “${moment.text.slice(0, 40)}${moment.text.length > 40 ? '…' : ''}”`);
                        setSentNote(`${e} sent to ${author?.name ?? 'them'}`);
                        setTimeout(() => setSentNote(''), 1800);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </PressableScale>
                ))}
              </View>
              <View style={styles.replyRow}>
                <TextInput
                  style={styles.replyInput}
                  value={reply}
                  onChangeText={setReply}
                  placeholder={`Reply to ${author?.name ?? 'Moment'}…`}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <PressableScale
                  scaleTo={0.85}
                  style={styles.replySend}
                  onPress={async () => {
                    const t = reply.trim();
                    if (!t) return;
                    const cid = await ensureChat(authorId);
                    if (cid) {
                      sendMessage(cid, `💬 Re your Moment “${moment.text.slice(0, 30)}${moment.text.length > 30 ? '…' : ''}”: ${t}`);
                      setReply('');
                      setSentNote('Reply sent — check your chat 💬');
                      setTimeout(() => setSentNote(''), 1800);
                    }
                  }}
                >
                  <Ionicons name="send" size={16} color={colors.black} />
                </PressableScale>
              </View>
              {!!sentNote && <Text style={styles.sentNote}>{sentNote}</Text>}
            </>
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
  reactRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginBottom: 12 },
  reactBtn: { padding: 6 },
  replyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 18, marginBottom: 4,
  },
  replyInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 22,
    color: colors.white, fontSize: 14.5, fontFamily: fonts.regular,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  replySend: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.yellow,
    alignItems: 'center', justifyContent: 'center',
  },
  sentNote: {
    color: colors.white, fontSize: 12.5, fontFamily: fonts.medium,
    textAlign: 'center', marginTop: 8,
  },
});
