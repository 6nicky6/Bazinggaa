import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import PressableScale from './PressableScale';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// Playable voice-note bubble content: play/pause, progress, duration.
export default function VoiceBubble({
  uri,
  durationSec,
  light,
}: {
  uri: string;
  durationSec?: number;
  light?: boolean; // on red gradient (own messages)
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const dur = status.duration || durationSec || 0;
  const pos = status.currentTime || 0;
  const progress = dur > 0 ? Math.min(1, pos / dur) : 0;
  const fg = light ? colors.white : colors.yellow;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <View style={styles.row}>
      <PressableScale
        scaleTo={0.85}
        style={[styles.playBtn, { borderColor: fg }]}
        onPress={() => {
          try {
            if (playing) {
              player.pause();
            } else {
              if (status.didJustFinish || (dur > 0 && pos >= dur - 0.2)) player.seekTo(0);
              player.play();
            }
          } catch {}
        }}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={fg} />
      </PressableScale>
      <View style={styles.trackWrap}>
        <View style={[styles.track, { backgroundColor: light ? 'rgba(255,255,255,0.35)' : colors.border }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: fg }]} />
        </View>
        <Text style={[styles.time, { color: light ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
          {playing || pos > 0 ? fmt(pos) : fmt(dur)}
        </Text>
      </View>
      <Ionicons name="mic" size={15} color={fg} style={{ marginLeft: 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 180, paddingVertical: 3 },
  playBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  trackWrap: { flex: 1 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  time: { fontSize: 11, fontFamily: fonts.medium, marginTop: 4 },
});
