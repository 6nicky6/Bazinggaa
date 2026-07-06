import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, Image, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import VoiceBubble from '../components/VoiceBubble';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, ZoomIn,
} from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import AttachSheet from '../components/AttachSheet';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { avatarGradients, colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import { ChatMood, detectMood, smartReplies, summarizeChat, translateText } from '../services/ai';
import { contactCardContent, messageExtras, pollContent, reportLive, stickerContent } from '../services/live';
import { STICKER_PACKS } from '../data/discover';
import * as ImagePicker from 'expo-image-picker';
import { playRecord } from '../services/sounds';
import { backendMode } from '../services/supabase';
import { Message } from '../types';

function lastSeenStr(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function timeStr(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function dayStr(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function Ticks({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.55)" />;
  if (status === 'failed') return <Ionicons name="alert-circle" size={14} color={colors.yellow} />;
  if (status === 'sent') return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.55)" />;
  return (
    <View style={{ flexDirection: 'row', marginLeft: -4 }}>
      <Ionicons name="checkmark" size={14} color={status === 'read' ? colors.yellow : 'rgba(255,255,255,0.55)'} />
      <Ionicons name="checkmark" size={14} style={{ marginLeft: -8 }} color={status === 'read' ? colors.yellow : 'rgba(255,255,255,0.55)'} />
    </View>
  );
}

type Row =
  | { kind: 'msg'; msg: Message }
  | { kind: 'day'; label: string; id: string };

export default function ChatScreen({ navigation, route }: any) {
  const chatId: string = route.params.chatId;
  const contacts = useAppStore((s) => s.contacts);
  const chats = useAppStore((s) => s.chats);
  const allMessages = useAppStore((s) => s.messages);
  const typing = useAppStore((s) => s.typing[chatId]);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const markChatRead = useAppStore((s) => s.markChatRead);
  const notifyTyping = useAppStore((s) => s.notifyTyping);
  const retryMessage = useAppStore((s) => s.retryMessage);
  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const forwardMessage = useAppStore((s) => s.forwardMessage);
  const toggleStar = useAppStore((s) => s.toggleStar);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const setWallpaper = useAppStore((s) => s.setWallpaper);
  const circles = useAppStore((s) => s.circles);
  const toggleCircle = useAppStore((s) => s.toggleCircle);
  const allChats = useAppStore((s) => s.chats);
  const startCall = useAppStore((s) => s.startCall);
  const block = useAppStore((s) => s.block);
  const blocked = useAppStore((s) => s.blocked);
  const smartOn = useAppStore((s) => s.settings.smartReplies);

  const chat = chats.find((ch) => ch.id === chatId);
  const isGroup = chat?.kind === 'group' || chat?.kind === 'channel';
  const readOnlyChannel = chat?.kind === 'channel' && chat?.myRole === 'member';
  const contact = contacts.find((c) => c.id === chat?.contactId);
  // group/channel chats render with their own identity instead of a contact
  const display = contact ?? (isGroup
    ? {
        id: chat!.id, name: chat!.name ?? 'Group',
        initials: chat!.iconEmoji ?? '👥',
        gradient: gradients.avatar2, online: false,
      }
    : null);
  const messages = useMemo(
    () => allMessages.filter((m) => m.chatId === chatId).sort((a, b) => a.sentAt - b.sentAt),
    [allMessages, chatId]
  );
  const isBlocked = contact ? blocked.includes(contact.id) : false;

  const [draft, setDraft] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [mood, setMood] = useState<ChatMood>('neutral');
  const [recording, setRecording] = useState(false);
  const [recLocked, setRecLocked] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recLockedRef = React.useRef(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'stickers'>('emoji');
  const [contactPickOpen, setContactPickOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState<string[]>(['', '']);

  // REAL recording via expo-audio
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recStartAt = React.useRef(0);

  const beginRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showToast('Microphone permission needed for voice notes 🎙️');
        setRecording(false);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStartAt.current = Date.now();
    } catch (e) {
      console.warn('[voice] record start failed:', e);
      setRecording(false);
      showToast('Could not start recording');
    }
  };

  const finishRecording = async (send: boolean) => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      const secs = Math.round((Date.now() - recStartAt.current) / 1000);
      if (send && uri && secs >= 1) {
        sendVoice(chatId, uri, secs);
      } else if (send) {
        showToast('Too short — hold to record 🎙️');
      }
    } catch (e) {
      console.warn('[voice] record stop failed:', e);
      if (send) showToast('Recording failed — try again');
    }
  };

  // WhatsApp-style mic: hold = record, slide up = lock (hands-free),
  // slide left = cancel, release = send
  const recCancelledRef = React.useRef(false);
  const micPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !draft.trim(),
        onPanResponderGrant: () => {
          recLockedRef.current = false;
          recCancelledRef.current = false;
          setRecLocked(false);
          setRecSecs(0);
          setRecording(true);
          playRecord();
          beginRecording();
        },
        onPanResponderMove: (_e, g) => {
          if (recCancelledRef.current || recLockedRef.current) return;
          if (g.dy < -45) {
            recLockedRef.current = true;
            setRecLocked(true);
          } else if (g.dx < -70) {
            recCancelledRef.current = true;
            setRecording(false);
            finishRecording(false);
            showToast('Recording cancelled');
          }
        },
        onPanResponderRelease: () => {
          if (!recLockedRef.current && !recCancelledRef.current) {
            setRecording(false);
            finishRecording(true); // release = send (WhatsApp behavior)
          }
          // locked: keep recording until trash / send tapped
        },
        onPanResponderTerminate: () => {
          if (!recLockedRef.current && !recCancelledRef.current) {
            setRecording(false);
            finishRecording(false);
          }
        },
      }),
    [draft, chatId]
  );

  const stopRecording = (send: boolean) => {
    setRecording(false);
    setRecLocked(false);
    recLockedRef.current = false;
    finishRecording(send);
  };
  const sendImage = useAppStore((s) => s.sendImage);
  const sendVoice = useAppStore((s) => s.sendVoice);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  // WhatsApp-style in-field camera shortcut
  const quickCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.4, exif: false });
      if (!res.canceled && res.assets?.[0]?.uri) sendImage(chatId, res.assets[0].uri);
    } catch {}
  };

  const QUICK_EMOJIS = ['😂', '❤️', '😍', '👍', '🙏', '🔥', '😊', '🎉', '😭', '💯', '🤲', '⚡', '😅', '🥰', '👏', '🤝'];

  const sendPollMsg = () => {
    const opts = pollOpts.map((o) => o.trim()).filter(Boolean);
    if (!pollQ.trim() || opts.length < 2) {
      showToast('A poll needs a question and 2+ options');
      return;
    }
    sendMessage(chatId, pollContent(pollQ.trim(), opts.slice(0, 5)));
    setPollOpen(false);
    setPollQ('');
    setPollOpts(['', '']);
  };

  const POLL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

  // AI Mood Engine: subtle theme tint from conversation mood (only when the AI
  // toggle is on, enough messages exist, and no manual wallpaper is set)
  useEffect(() => {
    if (!smartOn || chat?.wallpaper !== undefined) return;
    const texts = messages.filter((m) => !m.deleted && m.text).map((m) => m.text);
    if (texts.length < 6) return;
    detectMood(chatId, texts).then(setMood);
  }, [chatId, smartOn, messages.length > 6]);

  const MOOD_TINTS: Record<ChatMood, readonly [string, string] | null> = {
    happy: ['#F6B800', '#FB923C'],
    calm: ['#0891B2', '#22D3EE'],
    romantic: ['#DB2777', '#F472B6'],
    serious: ['#334155', '#64748B'],
    neutral: null,
  };
  const moodTint = chat?.wallpaper === undefined ? MOOD_TINTS[mood] : null;

  // AI Mood Engine, made visible: emoji + label so the feature isn't invisible
  const MOOD_META: Record<ChatMood, { emoji: string; label: string } | null> = {
    happy: { emoji: '😄', label: 'Happy vibe' },
    calm: { emoji: '😌', label: 'Calm vibe' },
    romantic: { emoji: '💗', label: 'Romantic vibe' },
    serious: { emoji: '🧠', label: 'Serious tone' },
    neutral: null,
  };
  const moodMeta = smartOn ? MOOD_META[mood] : null;

  const runSummarize = async () => {
    setMenuOpen(false);
    setSummarizing(true);
    setAiSummary('');
    const lines = messages
      .filter((m) => m.chatId === chatId && !m.deleted && m.text)
      .map((m) => ({
        from: m.senderId === 'me' ? 'Me' : contacts.find((c) => c.id === m.senderId)?.name ?? 'Member',
        text: m.text,
      }));
    const out = await summarizeChat(lines);
    setSummarizing(false);
    setAiSummary(out ?? 'Summary unavailable right now — try again in a moment.');
  };

  const runTranslate = async (m: Message) => {
    setActionMsg(null);
    const lang = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().locale || 'English'; } catch { return 'English'; }
    })();
    const out = await translateText(m.text, lang);
    if (out) setTranslations((t) => ({ ...t, [m.id]: out }));
    else showToast('Translation unavailable right now');
  };

  // voice hold-to-record UI (audio capture ships next update)
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    markChatRead(chatId);
  }, [chatId, messages.length]);

  // Smart replies on the latest received message (1:1 chats only)
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    let alive = true;
    if (smartOn && contact && !isGroup && lastMsg && lastMsg.senderId !== 'me') {
      smartReplies.suggest(lastMsg.text, contact.name).then((r) => {
        if (alive) setChips(r);
      });
    } else {
      setChips([]);
    }
    return () => { alive = false; };
  }, [lastMsg?.id, smartOn]);

  // rows with date separators, inverted list
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (const m of messages) {
      const day = dayStr(m.sentAt);
      if (day !== lastDay) {
        out.push({ kind: 'day', label: day, id: `day-${day}-${m.id}` });
        lastDay = day;
      }
      out.push({ kind: 'msg', msg: m });
    }
    return out.reverse();
  }, [messages]);

  const send = (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t || readOnlyChannel) return;
    sendMessage(chatId, t, replyTo ? { replyToId: replyTo.id } : undefined);
    setDraft('');
    setChips([]);
    setReplyTo(null);
  };

  if (!display) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <GlowBackground />
      {chat?.wallpaper !== undefined ? (
        <LinearGradient
          colors={avatarGradients[chat.wallpaper % avatarGradients.length]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill as any, { opacity: 0.09 }]}
          pointerEvents="none"
        />
      ) : moodTint ? (
        // AI Mood Engine: barely-there tint matching the conversation's vibe
        <LinearGradient
          colors={moodTint}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill as any, { opacity: 0.06 }]}
          pointerEvents="none"
        />
      ) : null}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Avatar gradient={display.gradient} label={display.initials} size={40} online={display.online} imageUri={contact?.avatarUrl} />
        <View style={{ flex: 1, marginLeft: 11 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.headerName} numberOfLines={1}>{display.name}</Text>
            {moodMeta && (
              <Text style={styles.moodChip}>{moodMeta.emoji}</Text>
            )}
          </View>
          <Text style={[styles.headerStatus, typing && { color: colors.yellow }]}>
            {isGroup
              ? chat?.kind === 'channel'
                ? `channel · ${chat?.memberIds?.length ?? 1} subscribers`
                : `${chat?.memberIds?.length ?? 1} members`
              : isBlocked
              ? 'blocked'
              : typing
              ? 'typing…'
              : contact?.online
              ? 'online'
              : contact?.lastSeenAt
              ? `last seen ${lastSeenStr(contact.lastSeenAt)}`
              : backendMode === 'demo'
              ? 'last seen recently'
              : 'on Bazingga'}
          </Text>
        </View>
        {!isGroup && contact && (
          <>
            <PressableScale style={styles.headerBtn} onPress={() => startCall(contact.id, true)}>
              <Ionicons name="videocam-outline" size={22} color={colors.textSecondary} />
            </PressableScale>
            <PressableScale style={styles.headerBtn} onPress={() => startCall(contact.id, false)}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
            </PressableScale>
            <PressableScale style={styles.headerBtn} onPress={() => setMenuOpen(true)}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </PressableScale>
          </>
        )}
      </Animated.View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={rows}
        inverted
        keyExtractor={(r) => (r.kind === 'msg' ? r.msg.id : r.id)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            return (
              <View style={styles.dayPill}>
                <Text style={styles.dayText}>{item.label}</Text>
              </View>
            );
          }
          const m = item.msg;
          if (m.missedCall) {
            return (
              <View style={styles.missedCallPill}>
                <Ionicons name="call" size={13} color={colors.red} style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.missedCallText}>{m.text}</Text>
                <Text style={styles.missedCallTime}>{timeStr(m.sentAt)}</Text>
              </View>
            );
          }
          const mine = m.senderId === 'me';
          const extras = messageExtras(m);
          if (extras.sticker && !m.deleted) {
            // stickers float free — no bubble, WhatsApp-style
            return (
              <Animated.View entering={ZoomIn.springify().damping(14)}>
                <Pressable
                  onLongPress={() => setActionMsg(m)}
                  delayLongPress={300}
                  style={[styles.stickerMsg, mine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}
                >
                  <Text style={styles.stickerBig}>{extras.sticker}</Text>
                  <View style={[styles.metaRow, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
                    <Text style={styles.metaText}>{timeStr(m.sentAt)}</Text>
                    {mine && <Ticks status={m.status} />}
                  </View>
                </Pressable>
              </Animated.View>
            );
          }
          const quoted = m.replyToId ? messages.find((x) => x.id === m.replyToId) : undefined;
          const quotedName = quoted
            ? quoted.senderId === 'me'
              ? 'You'
              : contacts.find((c) => c.id === quoted.senderId)?.name ?? 'Member'
            : '';
          const inner = (
            <>
              {isGroup && !mine && (
                <Text style={styles.senderName}>
                  {contacts.find((c) => c.id === m.senderId)?.name ?? 'Member'}
                </Text>
              )}
              {m.forwarded && !m.deleted && (
                <Text style={styles.forwardTag}>↪ Forwarded</Text>
              )}
              {quoted && !m.deleted && (
                <View style={styles.quoteBlock}>
                  <Text style={styles.quoteName}>{quotedName}</Text>
                  <Text style={styles.quoteText} numberOfLines={2}>
                    {quoted.deleted ? 'Message deleted' : quoted.imageUri ? '📷 Photo' : quoted.text}
                  </Text>
                </View>
              )}
              {m.deleted ? (
                <Text style={styles.deletedText}>🚫 This message was deleted</Text>
              ) : m.audioUrl || m.audioUri ? (
                <VoiceBubble
                  uri={(m.audioUrl ?? m.audioUri) as string}
                  durationSec={m.audioDurationSec}
                  light={mine}
                />
              ) : m.imageUrl || m.imageUri ? (
                <>
                  <Image source={{ uri: m.imageUrl ?? m.imageUri }} style={styles.msgImage} resizeMode="cover" />
                  {backendMode === 'live' && !m.imageUrl && m.status !== 'sending' && (
                    <Text style={styles.imageNote}>Not synced · tap to retry</Text>
                  )}
                </>
              ) : extras.contactCard ? (
                <PressableScale
                  style={styles.contactCard}
                  scaleTo={0.97}
                  onPress={async () => {
                    const cid2 = await useAppStore.getState().ensureChat(extras.contactCard!.id);
                    if (cid2) navigation.push('Chat', { chatId: cid2 });
                  }}
                >
                  <View style={styles.contactCardAvatar}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactCardName}>{extras.contactCard.name}</Text>
                    <Text style={styles.contactCardUser}>@{extras.contactCard.username}</Text>
                  </View>
                  <View style={styles.contactCardCta}>
                    <Ionicons name="chatbubble" size={13} color={colors.yellow} />
                    <Text style={styles.contactCardCtaText}>Message</Text>
                  </View>
                </PressableScale>
              ) : extras.poll ? (
                <View style={styles.pollCard}>
                  <Text style={styles.pollQ}>📊 {extras.poll.q}</Text>
                  {extras.poll.options.slice(0, 5).map((opt, i) => {
                    const emoji = POLL_EMOJIS[i];
                    const voters = m.reactions?.[emoji] ?? [];
                    const total = POLL_EMOJIS.reduce((n, e) => n + (m.reactions?.[e]?.length ?? 0), 0);
                    const pct = total ? Math.round((voters.length / total) * 100) : 0;
                    const iVoted = voters.includes('me');
                    return (
                      <Pressable
                        key={i}
                        style={[styles.pollOpt, iVoted && styles.pollOptMine]}
                        onPress={() => reactToMessage(m.id, emoji)}
                      >
                        <View style={[styles.pollFill, { width: `${pct}%` }]} pointerEvents="none" />
                        <Text style={styles.pollOptText} numberOfLines={1}>{opt}</Text>
                        <Text style={styles.pollPct}>{voters.length > 0 ? `${pct}%` : ''}</Text>
                        {iVoted && <Ionicons name="checkmark-circle" size={14} color={colors.yellow} />}
                      </Pressable>
                    );
                  })}
                  <Text style={styles.pollHint}>tap an option to vote</Text>
                </View>
              ) : m.text ? (
                <>
                  <Text style={styles.msgText}>{m.text}</Text>
                  {translations[m.id] && (
                    <Text style={styles.translatedText}>🌐 {translations[m.id]}</Text>
                  )}
                </>
              ) : (
                // media that never made it to this device (old pre-fix sends)
                <Text style={styles.deletedText}>📎 Media unavailable</Text>
              )}
              <View style={styles.metaRow}>
                {m.starred && <Ionicons name="star" size={11} color={colors.yellow} />}
                {mine && m.status === 'failed' && (
                  <Text style={[styles.metaText, { color: colors.yellow }]}>Not sent · tap to retry</Text>
                )}
                <Text style={styles.metaText}>{timeStr(m.sentAt)}</Text>
                {mine && !m.deleted && <Ticks status={m.status} />}
              </View>
            </>
          );
          // polls consume their reactions as votes — no chip row for them
          const reactionChips = !extras.poll && m.reactions && Object.keys(m.reactions).length > 0 && (
            <View style={[styles.reactionRow, mine && { justifyContent: 'flex-end' }]}>
              {(Object.entries(m.reactions) as [string, string[]][]).map(([emoji, ids]) => (
                <PressableScale
                  key={emoji}

                  scaleTo={0.85}
                  onPress={() => reactToMessage(m.id, emoji)}
                  style={[styles.reactionChip, ids.includes('me') && styles.reactionChipMine]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {ids.length > 1 && <Text style={styles.reactionCount}>{ids.length}</Text>}
                </PressableScale>
              ))}
            </View>
          );
          return (
            <Animated.View
              entering={mine ? FadeInUp.duration(240).springify().damping(18) : FadeInDown.duration(240)}
            >
              <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
                <Pressable
                  onLongPress={() => !m.deleted && setActionMsg(m)}
                  delayLongPress={300}
                  onPress={() => mine && m.status === 'failed' && retryMessage(m.id)}
                  style={{ maxWidth: '78%' }}
                >
                  {mine && !m.deleted ? (
                    <LinearGradient
                      colors={gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.bubble, styles.bubbleMine, { maxWidth: '100%' }, m.status === 'failed' && { opacity: 0.7 }]}
                    >
                      {inner}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, { maxWidth: '100%' }, mine ? styles.bubbleMine : styles.bubbleTheirs, m.deleted && styles.bubbleDeleted]}>
                      {inner}
                    </View>
                  )}
                </Pressable>
              </View>
              {reactionChips}
            </Animated.View>
          );
        }}
        ListHeaderComponent={
          typing ? (
            <Animated.View entering={FadeInDown.duration(200)} style={[styles.bubbleRow]}>
              <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>• • •</Text>
              </View>
            </Animated.View>
          ) : null
        }
      />

      {/* Reply preview bar */}
      {replyTo && (
        <Animated.View entering={FadeInUp.duration(200)} style={styles.replyBar}>
          <View style={styles.replyBarLine} />
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteName}>
              {replyTo.senderId === 'me' ? 'You' : contacts.find((c) => c.id === replyTo.senderId)?.name ?? 'Member'}
            </Text>
            <Text style={styles.quoteText} numberOfLines={1}>
              {replyTo.imageUri ? '📷 Photo' : replyTo.text}
            </Text>
          </View>
          <PressableScale onPress={() => setReplyTo(null)} style={styles.replyClose}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </PressableScale>
        </Animated.View>
      )}

      {/* Smart reply chips */}
      {chips.length > 0 && !isBlocked && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.chipsRow}>
          <Ionicons name="flash" size={13} color={colors.yellow} style={{ marginRight: 2 }} />
          {chips.map((c) => (
            <PressableScale key={c} onPress={() => send(c)} style={styles.chip} scaleTo={0.93}>
              <Text style={styles.chipText}>{c}</Text>
            </PressableScale>
          ))}
        </Animated.View>
      )}

      {/* Input bar */}
      <View>
        {readOnlyChannel ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>Only admins can post in this channel.</Text>
          </View>
        ) : isBlocked ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>You blocked {display.name}.</Text>
          </View>
        ) : (
          <>
          {emojiOpen && !recording && (
            <Animated.View entering={FadeInUp.duration(220)}>
              {/* Emoji | Stickers switcher */}
              <View style={styles.panelTabs}>
                {(['emoji', 'stickers'] as const).map((t) => (
                  <Pressable key={t} onPress={() => setEmojiTab(t)} style={[styles.panelTab, emojiTab === t && styles.panelTabOn]}>
                    <Text style={[styles.panelTabText, emojiTab === t && { color: colors.white }]}>
                      {t === 'emoji' ? '😊 Emoji' : '⚡ Stickers'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {emojiTab === 'emoji' ? (
                <View style={styles.emojiStrip}>
                  {QUICK_EMOJIS.map((e) => (
                    <Pressable key={e} hitSlop={4} onPress={() => setDraft((d) => d + e)}>
                      <Text style={styles.emojiItem}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.stickerPanel}>
                  {STICKER_PACKS.map((pack) => (
                    <View key={pack.id}>
                      <Text style={styles.stickerPackName}>{pack.name}</Text>
                      <View style={styles.stickerRow}>
                        {pack.emojis.map((e) => (
                          <Pressable
                            key={e}
                            hitSlop={4}
                            onPress={() => {
                              sendMessage(chatId, stickerContent(e));
                              setEmojiOpen(false);
                            }}
                          >
                            <Text style={styles.stickerItem}>{e}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
          <View style={styles.inputBar}>
            {recording ? (
              <View style={[styles.inputShell, styles.recordingBar]}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>
                  {recLocked ? '🔒 ' : ''}{Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}
                </Text>
                {recLocked ? (
                  <Pressable onPress={() => stopRecording(false)} style={styles.recTrash} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                  </Pressable>
                ) : (
                  <Text style={styles.recHint} numberOfLines={1}>◀ cancel · ⬆ lock</Text>
                )}
              </View>
            ) : (
              // WhatsApp-style shell: emoji · text · paperclip · camera, all in one pill
              <View style={styles.inputShell}>
                <Pressable style={styles.fieldIcon} hitSlop={6} onPress={() => setEmojiOpen((v) => !v)}>
                  <Ionicons name={emojiOpen ? 'close-circle-outline' : 'happy-outline'} size={22} color={colors.textSecondary} />
                </Pressable>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={(t) => {
                    setDraft(t);
                    if (t.trim()) notifyTyping(chatId);
                  }}
                  placeholder="Message"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  onSubmitEditing={() => send()}
                />
                <Pressable style={styles.fieldIcon} hitSlop={6} onPress={() => setAttachOpen(true)}>
                  <Ionicons name="attach" size={22} color={colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
                {!draft.trim() && (
                  <Pressable style={styles.fieldIcon} hitSlop={6} onPress={quickCamera}>
                    <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            )}
            {draft.trim() || (recording && recLocked) ? (
              // locked recording: the mic morphs into the send button (always visible)
              <PressableScale
                onPress={() => (recording ? stopRecording(true) : send())}
                scaleTo={0.85}
                style={styles.sendWrap}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendBtn}
                >
                  <Ionicons name="send" size={18} color={colors.white} />
                </LinearGradient>
              </PressableScale>
            ) : (
              <View style={styles.sendWrap} {...micPan.panHandlers}>
                {recording && !recLocked && (
                  <View style={styles.lockHint} pointerEvents="none">
                    <Ionicons name="chevron-up" size={14} color={colors.yellow} />
                    <Ionicons name="lock-open-outline" size={16} color={colors.yellow} />
                  </View>
                )}
                <LinearGradient
                  colors={recording ? ([colors.red, colors.redHot] as const) : gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.sendBtn, recording && !recLocked && { transform: [{ scale: 1.25 }] }]}
                >
                  <Ionicons name="mic" size={18} color={colors.white} />
                </LinearGradient>
              </View>
            )}
          </View>
          </>
        )}
      </View>

      <AttachSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onImage={(uri) => sendImage(chatId, uri)}
        onContact={() => setContactPickOpen(true)}
        onPoll={() => setPollOpen(true)}
        onComingSoon={(f) => showToast(`${f} arrive in the next update ⚡`)}
      />

      {/* Share a contact */}
      <Modal visible={contactPickOpen} transparent animationType="fade" onRequestClose={() => setContactPickOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setContactPickOpen(false)}>
          <Animated.View entering={ZoomIn.duration(200)} style={styles.menu}>
            <Text style={styles.pickerTitle}>Share a contact</Text>
            {contacts
              .filter((c) => c.id !== 'bazingga-bot' && c.id !== 'saved-messages' && !c.id.startsWith('official-') && c.id !== chat?.contactId)
              .slice(0, 8)
              .map((c) => (
                <PressableScale
                  key={c.id}
                  style={styles.menuItem}
                  onPress={() => {
                    sendMessage(chatId, contactCardContent({ id: c.id, name: c.name, username: c.username }));
                    setContactPickOpen(false);
                    showToast(`Shared ${c.name} 👤`);
                  }}
                >
                  <Avatar gradient={c.gradient} label={c.initials} size={30} imageUri={c.avatarUrl} />
                  <Text style={styles.menuText}>{c.name}</Text>
                  <Text style={[styles.recHint, { marginLeft: 'auto' }]}>@{c.username}</Text>
                </PressableScale>
              ))}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Poll composer */}
      <Modal visible={pollOpen} transparent animationType="fade" onRequestClose={() => setPollOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setPollOpen(false)}>
          <Animated.View entering={ZoomIn.duration(200)} style={styles.menu}>
            <Text style={styles.pickerTitle}>Create a poll 📊</Text>
            <TextInput
              style={styles.pollInput}
              value={pollQ}
              onChangeText={setPollQ}
              placeholder="Ask a question…"
              placeholderTextColor={colors.textTertiary}
              maxLength={120}
            />
            {pollOpts.map((o, i) => (
              <TextInput
                key={i}
                style={styles.pollInput}
                value={o}
                onChangeText={(t) => setPollOpts((arr) => arr.map((x, j) => (j === i ? t : x)))}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={colors.textTertiary}
                maxLength={60}
              />
            ))}
            {pollOpts.length < 5 && (
              <PressableScale style={styles.menuItem} onPress={() => setPollOpts((a) => [...a, ''])}>
                <Ionicons name="add-circle-outline" size={18} color={colors.yellow} />
                <Text style={styles.menuText}>Add option</Text>
              </PressableScale>
            )}
            <PressableScale style={styles.pollSend} onPress={sendPollMsg} scaleTo={0.95}>
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pollSendInner}>
                <Text style={styles.pollSendText}>Send poll</Text>
              </LinearGradient>
            </PressableScale>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Chat menu: block / report (1:1 chats) */}
      {contact && (
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <PressableScale style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Animated.View entering={ZoomIn.duration(180)} style={styles.menu}>
            <PressableScale
              style={styles.menuItem}
              onPress={() => {
                toggleMute(chatId);
                setMenuOpen(false);
                showToast(chat?.muted ? 'Chat unmuted 🔔' : 'Chat muted 🔕');
              }}
            >
              <Ionicons
                name={chat?.muted ? 'notifications-outline' : 'notifications-off-outline'}
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.menuText}>{chat?.muted ? 'Unmute' : 'Mute'}</Text>
            </PressableScale>
            <PressableScale style={styles.menuItem} onPress={runSummarize}>
              <Ionicons name="sparkles-outline" size={18} color={colors.yellow} />
              <Text style={styles.menuText}>Summarize chat ✨</Text>
            </PressableScale>
            {moodMeta && (
              <View style={styles.menuItem}>
                <Text style={{ fontSize: 16 }}>{moodMeta.emoji}</Text>
                <Text style={[styles.menuText, { color: colors.textSecondary }]}>Mood: {moodMeta.label}</Text>
              </View>
            )}
            {(['close', 'family'] as const).map((circle) => {
              const inCircle = circles[circle].includes(contact.id);
              return (
                <PressableScale
                  key={circle}

                  style={styles.menuItem}
                  onPress={() => {
                    toggleCircle(contact.id, circle);
                    setMenuOpen(false);
                    showToast(
                      inCircle
                        ? `Removed from ${circle === 'close' ? 'Close Friends' : 'Family'}`
                        : `Added to ${circle === 'close' ? 'Close Friends ⭐' : 'Family 🏠'}`
                    );
                  }}
                >
                  <Ionicons
                    name={circle === 'close' ? (inCircle ? 'star' : 'star-outline') : (inCircle ? 'home' : 'home-outline')}
                    size={18}
                    color={inCircle ? colors.yellow : colors.textSecondary}
                  />
                  <Text style={styles.menuText}>
                    {circle === 'close' ? 'Close Friends' : 'Family Circle'}{inCircle ? ' ✓' : ''}
                  </Text>
                </PressableScale>
              );
            })}
            <View style={styles.wallpaperRow}>
              <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>Wallpaper</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
                {avatarGradients.slice(0, 5).map((g, i) => (
                  <PressableScale
                    key={i}

                    scaleTo={0.8}
                    onPress={() => { setWallpaper(chatId, chat?.wallpaper === i ? undefined : i); setMenuOpen(false); }}
                  >
                    <LinearGradient
                      colors={g}
                      style={[styles.wallSwatch, chat?.wallpaper === i && styles.wallSwatchActive]}
                    />
                  </PressableScale>
                ))}
              </View>
            </View>
            <PressableScale
              style={styles.menuItem}
              onPress={() => {
                block(contact.id);
                setMenuOpen(false);
              }}
            >
              <Ionicons name="hand-left-outline" size={18} color={colors.red} />
              <Text style={[styles.menuText, { color: colors.red }]}>Block {contact.name}</Text>
            </PressableScale>
            <PressableScale
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                const ok = await reportLive(contact.id, 'Reported from chat menu');
                setToast(ok ? `Report sent. Thank you for keeping Bazingga safe.` : 'Could not send report. Try again.');
                setTimeout(() => setToast(''), 2500);
              }}
            >
              <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>Report</Text>
            </PressableScale>
          </Animated.View>
        </PressableScale>
      </Modal>
      )}

      {/* Message action sheet: react / reply / forward / copy / delete */}
      <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionMsg(null)}>
          <Animated.View entering={FadeInUp.duration(200).springify()} style={styles.sheet}>
            <View style={styles.reactPickRow}>
              {['❤️', '😂', '👍', '😮', '😢', '🙏'].map((e) => (
                <PressableScale
                  key={e}
                  scaleTo={0.8}
                  style={styles.reactPick}
                  onPress={() => {
                    if (actionMsg) reactToMessage(actionMsg.id, e);
                    setActionMsg(null);
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </PressableScale>
              ))}
            </View>
            <SheetItem
              icon={actionMsg?.starred ? 'star' : 'star-outline'}
              label={actionMsg?.starred ? 'Unstar' : 'Star'}
              onPress={() => { if (actionMsg) toggleStar(actionMsg.id); setActionMsg(null); }}
            />
            <SheetItem icon="arrow-undo-outline" label="Reply" onPress={() => { setReplyTo(actionMsg); setActionMsg(null); }} />
            <SheetItem icon="arrow-redo-outline" label="Forward" onPress={() => { setForwardMsg(actionMsg); setActionMsg(null); }} />
            {!!actionMsg?.text && !actionMsg?.deleted && (
              <SheetItem
                icon="language-outline"
                label="Translate"
                onPress={() => actionMsg && runTranslate(actionMsg)}
              />
            )}
            {!actionMsg?.imageUri && (
              <SheetItem
                icon="copy-outline"
                label="Copy"
                onPress={async () => {
                  try { await Clipboard.setStringAsync(actionMsg?.text ?? ''); showToast('Copied'); } catch {}
                  setActionMsg(null);
                }}
              />
            )}
            {actionMsg?.senderId === 'me' && (
              <SheetItem
                icon="trash-outline"
                label="Delete for everyone"
                danger
                onPress={() => { if (actionMsg) deleteMessage(actionMsg.id, true); setActionMsg(null); }}
              />
            )}
            <SheetItem
              icon="trash-bin-outline"
              label="Delete for me"
              danger
              onPress={() => { if (actionMsg) deleteMessage(actionMsg.id, false); setActionMsg(null); }}
            />
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Forward picker */}
      <Modal visible={!!forwardMsg} transparent animationType="fade" onRequestClose={() => setForwardMsg(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setForwardMsg(null)}>
          <Animated.View entering={FadeInUp.duration(200).springify()} style={[styles.sheet, { maxHeight: 420 }]}>
            <Text style={styles.sheetTitle}>Forward to…</Text>
            <FlatList
              data={allChats.filter((c) => c.id !== chatId && !c.id.startsWith('official-'))}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => {
                const target = item.kind === 'group' || item.kind === 'channel'
                  ? { name: item.name ?? 'Group', initials: item.iconEmoji ?? '👥', gradient: gradients.avatar2 }
                  : (() => {
                      const c = contacts.find((x) => x.id === item.contactId);
                      return { name: c?.name ?? 'Chat', initials: c?.initials ?? '?', gradient: c?.gradient ?? gradients.avatar1 };
                    })();
                return (
                  <PressableScale
                    style={styles.forwardRow}
                    onPress={() => {
                      if (forwardMsg) forwardMessage(forwardMsg.id, item.id);
                      setForwardMsg(null);
                      showToast(`Forwarded to ${target.name} ✓`);
                    }}
                  >
                    <Avatar gradient={target.gradient} label={target.initials} size={42} />
                    <Text style={styles.forwardName}>{target.name}</Text>
                  </PressableScale>
                );
              }}
            />
          </Animated.View>
        </Pressable>
      </Modal>

      {/* AI chat summary */}
      <Modal visible={aiSummary !== null || summarizing} transparent animationType="fade" onRequestClose={() => setAiSummary(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => { if (!summarizing) setAiSummary(null); }}>
          <Animated.View entering={FadeInUp.duration(200).springify()} style={[styles.sheet, { maxHeight: 440 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 6 }}>
              <Ionicons name="sparkles" size={18} color={colors.yellow} />
              <Text style={styles.sheetTitle}>{summarizing ? 'Summarizing…' : 'Chat summary'}</Text>
            </View>
            {summarizing ? (
              <Text style={styles.summaryText}>BazinggaBot is reading the conversation… ⚡</Text>
            ) : (
              <FlatList
                data={[aiSummary ?? '']}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => <Text style={styles.summaryText}>{item}</Text>}
              />
            )}
            <PressableScale style={styles.summaryClose} onPress={() => setAiSummary(null)}>
              <Text style={{ color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 14 }}>Close</Text>
            </PressableScale>
          </Animated.View>
        </Pressable>
      </Modal>

      {toast ? (
        <Animated.View entering={FadeInUp.springify()} style={styles.toast}>
          <Ionicons name="shield-checkmark" size={16} color={colors.yellow} />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function SheetItem({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale style={styles.sheetItem} onPress={onPress}>
      <Ionicons name={icon} size={19} color={danger ? colors.red : colors.textSecondary} />
      <Text style={[styles.sheetItemText, danger && { color: colors.red }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: 'rgba(11,11,11,0.85)',
  },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerName: { color: colors.white, fontSize: 16.5, fontFamily: fonts.semiBold, flexShrink: 1 },
  moodChip: { fontSize: 13 },
  missedCallPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center',
    backgroundColor: 'rgba(225,6,0,0.1)', borderWidth: 1, borderColor: 'rgba(225,6,0,0.25)',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginVertical: 6,
  },
  missedCallText: { color: colors.white, fontSize: 12.5, fontFamily: fonts.medium },
  missedCallTime: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.regular },
  headerStatus: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  dayPill: {
    alignSelf: 'center', backgroundColor: colors.glass,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginVertical: 10,
  },
  dayText: { color: colors.textSecondary, fontSize: 11.5, fontFamily: fonts.medium },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 18 },
  msgText: { color: colors.white, fontSize: 15.5, fontFamily: fonts.regular, lineHeight: 21 },
  senderName: { color: colors.yellow, fontSize: 12, fontFamily: fonts.semiBold, marginBottom: 2 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginTop: 3,
  },
  metaText: { color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontFamily: fonts.regular },
  chipsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 8, flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: 'rgba(246,184,0,0.35)',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { color: colors.white, fontSize: 13.5, fontFamily: fonts.medium },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingBottom: 26, paddingTop: 8,
  },
  inputIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 22, color: colors.white, fontSize: 15.5, fontFamily: fonts.regular,
    paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, maxHeight: 110,
  },
  sendWrap: {
    borderRadius: 21, shadowColor: colors.red, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 8,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  blockedBar: { padding: 20, alignItems: 'center' },
  blockedText: { color: colors.textTertiary, fontSize: 13.5, fontFamily: fonts.regular },
  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end', paddingTop: 96, paddingRight: 16,
  },
  menu: {
    backgroundColor: colors.surfaceRaised, borderRadius: 16, padding: 6,
    borderWidth: 1, borderColor: colors.glassBorder, minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
  },
  menuText: { color: colors.white, fontSize: 14.5, fontFamily: fonts.medium },
  toast: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, maxWidth: '86%',
  },
  toastText: { color: colors.white, fontSize: 13, fontFamily: fonts.medium, flexShrink: 1 },
  msgImage: { width: 220, height: 220, borderRadius: 14, marginBottom: 4 },
  imageNote: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, fontFamily: fonts.regular, marginBottom: 2 },
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 13,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  recText: { color: colors.white, fontSize: 14.5, fontFamily: fonts.semiBold },
  recHint: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.regular, marginLeft: 'auto', flexShrink: 1 },
  // WhatsApp-style input shell: icons live INSIDE the pill
  inputShell: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 24, paddingHorizontal: 6, minHeight: 44,
  },
  fieldIcon: { paddingHorizontal: 7, paddingVertical: 11 },
  emojiStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    justifyContent: 'center',
  },
  emojiItem: { fontSize: 24 },
  panelTabs: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    paddingTop: 8,
  },
  panelTab: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  panelTabOn: { backgroundColor: 'rgba(225,6,0,0.25)', borderColor: 'rgba(225,6,0,0.45)' },
  panelTabText: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.semiBold },
  stickerPanel: { paddingHorizontal: 16, paddingVertical: 8, gap: 4, maxHeight: 260 },
  stickerPackName: {
    color: colors.textTertiary, fontSize: 10.5, fontFamily: fonts.semiBold,
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 6, marginBottom: 4,
  },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stickerItem: { fontSize: 34 },
  stickerMsg: { marginVertical: 2, maxWidth: '78%' },
  stickerBig: { fontSize: 72, lineHeight: 84 },
  pickerTitle: {
    color: colors.white, fontSize: 16, fontFamily: fonts.semiBold,
    marginBottom: 10, paddingHorizontal: 14, paddingTop: 4,
  },
  pollInput: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    color: colors.white, fontSize: 14, fontFamily: fonts.regular,
    marginHorizontal: 12, marginBottom: 8,
  },
  pollSend: { marginHorizontal: 12, marginTop: 6 },
  pollSendInner: { borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  pollSendText: { color: colors.white, fontSize: 14.5, fontFamily: fonts.semiBold },
  // contact card bubble
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minWidth: 220, paddingVertical: 4,
  },
  contactCardAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  contactCardName: { color: colors.white, fontSize: 14.5, fontFamily: fonts.semiBold },
  contactCardUser: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: fonts.regular },
  contactCardCta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  contactCardCtaText: { color: colors.yellow, fontSize: 12, fontFamily: fonts.semiBold },
  // poll bubble
  pollCard: { minWidth: 230, maxWidth: 270, paddingVertical: 2, gap: 7 },
  pollQ: { color: colors.white, fontSize: 14.5, fontFamily: fonts.semiBold, marginBottom: 3 },
  pollOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 11, paddingVertical: 9, overflow: 'hidden',
  },
  pollOptMine: { borderWidth: 1, borderColor: 'rgba(246,184,0,0.5)' },
  pollFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(246,184,0,0.16)',
  },
  pollOptText: { color: colors.white, fontSize: 13.5, fontFamily: fonts.medium, flex: 1 },
  pollPct: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: fonts.semiBold },
  pollHint: { color: 'rgba(255,255,255,0.45)', fontSize: 10.5, fontFamily: fonts.regular, alignSelf: 'center', marginTop: 2 },
  recTrash: { marginLeft: 'auto', padding: 4 },
  lockHint: {
    position: 'absolute', bottom: 54, alignSelf: 'center', alignItems: 'center',
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 18, paddingHorizontal: 8, paddingVertical: 8, gap: 2, zIndex: 5,
  },
  recCancel: { color: colors.textSecondary, fontSize: 13.5, fontFamily: fonts.semiBold },
  recSend: { color: colors.yellow, fontSize: 13.5, fontFamily: fonts.semiBold },
  // parity wave 1
  bubbleDeleted: { backgroundColor: 'rgba(255,255,255,0.03)' },
  deletedText: { color: colors.textTertiary, fontSize: 14, fontFamily: fonts.regular, fontStyle: 'italic' },
  forwardTag: { color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontFamily: fonts.medium, fontStyle: 'italic', marginBottom: 3 },
  quoteBlock: {
    borderLeftWidth: 3, borderLeftColor: colors.yellow,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 6, marginBottom: 6,
  },
  quoteName: { color: colors.yellow, fontSize: 12, fontFamily: fonts.semiBold },
  quoteText: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontFamily: fonts.regular, marginTop: 1 },
  reactionRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 6, marginTop: -4, marginBottom: 5 },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3,
  },
  reactionChipMine: { borderColor: 'rgba(246,184,0,0.5)' },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.semiBold },
  replyBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginBottom: 6, padding: 10,
    backgroundColor: colors.surfaceRaised, borderRadius: 14,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  replyBarLine: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.yellow },
  replyClose: { padding: 4 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 30,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  sheetTitle: { color: colors.white, fontSize: 16, fontFamily: fonts.display, marginBottom: 10, marginLeft: 6 },
  reactPickRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 8, marginBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  reactPick: { padding: 6, borderRadius: 20 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 10 },
  sheetItemText: { color: colors.white, fontSize: 15, fontFamily: fonts.medium },
  forwardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 6 },
  forwardName: { color: colors.white, fontSize: 15, fontFamily: fonts.medium },
  wallpaperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  wallSwatch: { width: 22, height: 22, borderRadius: 11 },
  wallSwatchActive: { borderWidth: 2, borderColor: colors.white },
  translatedText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13.5, fontFamily: fonts.regular,
    fontStyle: 'italic', marginTop: 5, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)', paddingTop: 5,
  },
  summaryText: { color: colors.white, fontSize: 14.5, fontFamily: fonts.regular, lineHeight: 22, paddingHorizontal: 8 },
  summaryClose: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 30, marginTop: 6 },
});
