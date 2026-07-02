import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, ZoomIn,
} from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import { smartReplies } from '../services/ai';
import { Message } from '../types';

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
  const block = useAppStore((s) => s.block);
  const blocked = useAppStore((s) => s.blocked);
  const smartOn = useAppStore((s) => s.settings.smartReplies);

  const contact = contacts.find((c) => c.id === chats.find((ch) => ch.id === chatId)?.contactId);
  const messages = useMemo(
    () => allMessages.filter((m) => m.chatId === chatId).sort((a, b) => a.sentAt - b.sentAt),
    [allMessages, chatId]
  );
  const isBlocked = contact ? blocked.includes(contact.id) : false;

  const [draft, setDraft] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    markChatRead(chatId);
  }, [chatId, messages.length]);

  // Smart replies on the latest received message
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    let alive = true;
    if (smartOn && contact && lastMsg && lastMsg.senderId !== 'me') {
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
    if (!t || !contact) return;
    sendMessage(chatId, t);
    setDraft('');
    setChips([]);
  };

  if (!contact) return null;

  return (
    <View style={styles.container}>
      <GlowBackground />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} haptic={false} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Avatar gradient={contact.gradient} label={contact.initials} size={40} online={contact.online} />
        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text style={styles.headerName}>{contact.name}</Text>
          <Text style={[styles.headerStatus, typing && { color: colors.yellow }]}>
            {isBlocked ? 'blocked' : typing ? 'typing…' : contact.online ? 'online' : 'last seen recently'}
          </Text>
        </View>
        <PressableScale haptic={false} style={styles.headerBtn} onPress={() => {}}>
          <Ionicons name="videocam-outline" size={22} color={colors.textSecondary} />
        </PressableScale>
        <PressableScale haptic={false} style={styles.headerBtn} onPress={() => {}}>
          <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
        </PressableScale>
        <PressableScale haptic={false} style={styles.headerBtn} onPress={() => setMenuOpen(true)}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
        </PressableScale>
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
          return (
            <Animated.View
              entering={mine ? FadeInUp.duration(240).springify().damping(18) : FadeInDown.duration(240)}
              style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}
            >
              {mine ? (
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.bubbleMine]}
                >
                  <Text style={styles.msgText}>{m.text}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{timeStr(m.sentAt)}</Text>
                    <Ticks status={m.status} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.bubbleTheirs]}>
                  <Text style={styles.msgText}>{m.text}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{timeStr(m.sentAt)}</Text>
                  </View>
                </View>
              )}
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isBlocked ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>You blocked {contact.name}.</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <PressableScale haptic={false} style={styles.inputIcon}>
              <Ionicons name="add" size={24} color={colors.textSecondary} />
            </PressableScale>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.textTertiary}
              multiline
              onSubmitEditing={() => send()}
            />
            <PressableScale onPress={() => send()} scaleTo={0.85} style={styles.sendWrap}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtn}
              >
                <Ionicons name={draft.trim() ? 'send' : 'mic'} size={18} color={colors.white} />
              </LinearGradient>
            </PressableScale>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Chat menu: block / report */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <PressableScale haptic={false} style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Animated.View entering={ZoomIn.duration(180)} style={styles.menu}>
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
              onPress={() => setMenuOpen(false)}
            >
              <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>Report</Text>
            </PressableScale>
          </Animated.View>
        </PressableScale>
      </Modal>
    </View>
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
});
