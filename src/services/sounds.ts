// Subtle interaction sounds (WhatsApp-style): message send/receive + record start.
// Players are created lazily and reused; failures stay silent — sounds are
// garnish, never a crash source.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  send: require('../../assets/sounds/send.wav'),
  receive: require('../../assets/sounds/receive.wav'),
  record: require('../../assets/sounds/record.wav'),
} as const;

type Key = keyof typeof SOURCES;
const players: Partial<Record<Key, AudioPlayer>> = {};

let enabled = true;
export function setSoundsEnabled(v: boolean) {
  enabled = v;
}

function play(key: Key) {
  if (!enabled) return;
  try {
    let p = players[key];
    if (!p) {
      p = createAudioPlayer(SOURCES[key]);
      p.volume = 0.6;
      players[key] = p;
    }
    p.seekTo(0);
    p.play();
  } catch {}
}

export const playSend = () => play('send');
export const playReceive = () => play('receive');
export const playRecord = () => play('record');

// Ringtone: loops while an incoming call is ringing. Separate from the toggle —
// a call should ring even if message sounds are off.
let ringtone: AudioPlayer | null = null;
export function startRingtone() {
  try {
    if (!ringtone) {
      ringtone = createAudioPlayer(require('../../assets/sounds/ringtone.wav'));
      ringtone.volume = 0.8;
      ringtone.loop = true;
    }
    ringtone.seekTo(0);
    ringtone.play();
  } catch {}
}
export function stopRingtone() {
  try {
    ringtone?.pause();
    ringtone?.seekTo(0);
  } catch {}
}
