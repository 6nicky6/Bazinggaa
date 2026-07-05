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
import { smartReplies } from '../services/ai';
import { reportLive } from '../services/live';
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
  const [recording, setRecording] = useState(false);
  const [recLocked, setRecLocked] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recLockedRef = React.useRef(false);

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

  // WhatsApp-style mic: hold = record, slide up = lock (keep recording hands-free)
  const micPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !draft.trim(),
        onPanResponderGrant: () => {
          recLockedRef.current = false;
          setRecLocked(false);
          setRecSecs(0);
          setRecording(true);
          beginRecording();
        },
        onPanResponderMove: (_e, g) => {
          if (g.dy < -45 && !recLockedRef.current) {
            recLockedRef.current = true;
            setRecLocked(true);
          }
        },
        onPanResponderRelease: () => {
          if (!recLockedRef.current) {
            setRecording(false);
            finishRecording(true); // release = send (WhatsApp behavior)
          }
          // locked: keep recording until Cancel/Send tapped
        },
        onPanResponderTerminate: () => {
          if (!recLockedRef.current) {
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
      {chat?.wallpaper !== undefined && (
        <LinearGradient
          colors={avatarGradients[chat.wallpaper % avatarGradients.length]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill as any, { opacity: 0.09 }]}
          pointerEvents="none"
        />
      )}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} haptic={false} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Avatar gradient={display.gradient} label={display.initials} size={40} online={display.online} />
        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text style={styles.headerName}>{display.name}</Text>
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
            <PressableScale haptic={false} style={styles.headerBtn} onPress={() => startCall(contact.id, true)}>
              <Ionicons name="videocam-outline" size={22} color={colors.textSecondary} />
            </PressableScale>
            <PressableScale haptic={false} style={styles.headerBtn} onPress={() => startCall(contact.id, false)}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
            </PressableScale>
            <PressableScale haptic={false} style={styles.headerBtn} onPress={() => setMenuOpen(true)}>
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
          const mine = m.senderId === 'me';
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
              ) : (
                <Text style={styles.msgText}>{m.text}</Text>
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
          const reactionChips = m.reactions && Object.keys(m.reactions).length > 0 && (
            <View style={[styles.reactionRow, mine && { justifyContent: 'flex-end' }]}>
              {(Object.entries(m.reactions) as [string, string[]][]).map(([emoji, ids]) => (
                <PressableScale
                  key={emoji}
                  haptic={false}
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
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, m.deleted && styles.bubbleDeleted]}>
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
          <PressableScale haptic={false} onPress={() => setReplyTo(null)} style={styles.replyClose}>
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
          <View style={styles.inputBar}>
            <PressableScale haptic={false} style={styles.inputIcon} onPress={() => setAttachOpen(true)}>
              <Ionicons name="add" size={24} color={colors.textSecondary} />
            </PressableScale>
            {recording ? (
              <View style={[styles.input, styles.recordingBar]}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>
                  {recLocked ? '🔒 ' : ''}Recording… 0:{String(recSecs).padStart(2, '0')}
                </Text>
                {recLocked ? (
                  <View style={{ flexDirection: 'row', gap: 14, marginLeft: 'auto' }}>
                    <Text style={styles.recCancel} onPress={() => stopRecording(false)}>Cancel</Text>
                    <Text style={styles.recSend} onPress={() => stopRecording(true)}>Send</Text>
                  </View>
                ) : (
                  <Text style={styles.recHint}>⬆ slide up to lock</Text>
                )}
              </View>
            ) : (
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
            )}
            {draft.trim() ? (
              <PressableScale onPress={() => send()} scaleTo={0.85} style={styles.sendWrap}>
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
        )}
      </View>

      <AttachSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onImage={(uri) => sendImage(chatId, uri)}
        onComingSoon={(f) => showToast(`${f} arrive in the next update ⚡`)}
      />

      {/* Chat menu: block / report (1:1 chats) */}
      {contact && (
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <PressableScale haptic={false} style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Animated.View entering={ZoomIn.duration(180)} style={styles.menu}>
            <PressableScale
              haptic={false}
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
            <View style={styles.wallpaperRow}>
              <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>Wallpaper</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
                {avatarGradients.slice(0, 5).map((g, i) => (
                  <PressableScale
                    key={i}
                    haptic={false}
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
              haptic={false}
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
              haptic={false}
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
                    haptic={false}
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
    <PressableScale haptic={false} style={styles.sheetItem} onPress={onPress}>
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
  headerName: { color: colors.white, fontSize: 16.5, fontFamily: fonts.semiBold },
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
  recHint: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.regular, marginLeft: 'auto' },
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
});
