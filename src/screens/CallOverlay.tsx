import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';

// Full-screen call UI (signaling mechanism live; voice/video streams arrive
// with the dev-client build — the banner below says so honestly).
export default function CallOverlay() {
  const call = useAppStore((s) => s.activeCall);
  const contacts = useAppStore((s) => s.contacts);
  const answerCall = useAppStore((s) => s.answerCall);
  const endCall = useAppStore((s) => s.endCall);
  const [elapsed, setElapsed] = useState(0);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1);
  }, []);
  useEffect(() => {
    if (call?.status !== 'accepted') return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value,
    transform: [{ scale: 1 + pulse.value * 0.6 }],
  }));

  if (!call) return null;
  const contact = contacts.find((c) => c.id === call.contactId);
  if (!contact) return null;
  const mins = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.overlay}>
      <GlowBackground />
      <View style={styles.center}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {call.status === 'ringing' && (
            <Animated.View style={[styles.ring, ringStyle]} />
          )}
          <Avatar gradient={contact.gradient} label={contact.initials} size={110} />
        </View>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.status}>
          {call.status === 'ringing'
            ? call.direction === 'incoming'
              ? `Incoming ${call.video ? 'video' : 'voice'} call…`
              : 'Ringing…'
            : `Connected · ${mins}`}
        </Text>
        {call.status === 'accepted' && (
          <View style={styles.banner}>
            <Ionicons name="construct-outline" size={14} color={colors.yellow} />
            <Text style={styles.bannerText}>
              Call connected! Voice & video streams arrive in the next app update.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {call.direction === 'incoming' && call.status === 'ringing' ? (
          <>
            <PressableScale onPress={() => answerCall(false)} style={[styles.btn, styles.decline]}>
              <Ionicons name="close" size={28} color={colors.white} />
            </PressableScale>
            <PressableScale onPress={() => answerCall(true)} style={styles.btnWrap}>
              <LinearGradient colors={gradients.bolt} style={styles.btn}>
                <Ionicons name={call.video ? 'videocam' : 'call'} size={26} color={colors.black} />
              </LinearGradient>
            </PressableScale>
          </>
        ) : (
          <PressableScale onPress={endCall} style={[styles.btn, styles.decline]}>
            <Ionicons name="call" size={26} color={colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.black,
    zIndex: 100,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  ring: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 2, borderColor: colors.yellow,
  },
  name: { color: colors.white, fontSize: 28, fontFamily: fonts.display, marginTop: 26 },
  status: { color: colors.textSecondary, fontSize: 15, fontFamily: fonts.medium, marginTop: 8 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22,
    backgroundColor: 'rgba(246,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(246,184,0,0.25)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '92%',
  },
  bannerText: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, flexShrink: 1 },
  controls: {
    flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 70,
  },
  btnWrap: { borderRadius: 34 },
  btn: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  decline: { backgroundColor: colors.red },
});
