import React, { useMemo, useState } from 'react';
import {
  FlatList, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { liveMoments, useAppStore } from '../store/appStore';
import { ChatFilter } from '../types';

const FILTERS: ChatFilter[] = ['All', 'Friends', 'Family', 'Work'];

function timeLabel(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  if (today) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yest = new Date(Date.now() - 86_400_000).toDateString() === d.toDateString();
  return yest ? 'Yesterday' : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ChatListScreen({ navigation }: any) {
  const chats = useAppStore((s) => s.chats);
  const contacts = useAppStore((s) => s.contacts);
  const messages = useAppStore((s) => s.messages);
  const moments = useAppStore((s) => s.moments);
  const typing = useAppStore((s) => s.typing);
  const lastReadAt = useAppStore((s) => s.lastReadAt);
  const blocked = useAppStore((s) => s.blocked);
  const profile = useAppStore((s) => s.profile);

  const [filter, setFilter] = useState<ChatFilter>('All');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return chats
      .map((chat) => {
        let contact = contacts.find((c) => c.id === chat.contactId);
        if (chat.kind === 'group' || chat.kind === 'channel') {
          // groups/channels render with their own identity
          contact = {
            id: chat.id, name: chat.name ?? 'Group', username: '',
            status: '', gradient: gradients.avatar2,
            initials: chat.iconEmoji ?? '👥', group: 'Friends', online: false,
          };
        }
        if (!contact || blocked.includes(chat.contactId)) return null;
        const msgs = messages.filter((m) => m.chatId === chat.id);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m) => m.senderId !== 'me' && m.sentAt > (lastReadAt[chat.id] ?? 0)
        ).length;
        return { chat, contact, last, unread };
      })
      .filter((r): r is NonNullable<typeof r> => !!r)
      .filter((r) => (filter === 'All' ? true : r.contact.group === filter))
      .filter((r) =>
        search.trim()
          ? r.contact.name.toLowerCase().includes(search.trim().toLowerCase())
          : true
      )
      .sort((a, b) => {
        if (!!a.chat.pinned !== !!b.chat.pinned) return a.chat.pinned ? -1 : 1;
        return (b.last?.sentAt ?? 0) - (a.last?.sentAt ?? 0);
      });
  }, [chats, contacts, messages, blocked, filter, search, lastReadAt]);

  const momentAuthors = useMemo(() => {
    const live = liveMoments(moments);
    const ids = [...new Set(live.filter((m) => m.authorId !== 'me').map((m) => m.authorId))]
      .filter((id) => !blocked.includes(id));
    return ids
      .map((id) => ({
        contact: contacts.find((c) => c.id === id)!,
        seen: live.filter((m) => m.authorId === id).every((m) => m.views.includes('me')),
      }))
      .filter((x) => x.contact);
  }, [moments, contacts, blocked]);
  const myLive = liveMoments(moments).some((m) => m.authorId === 'me');

  return (
    <View style={styles.container}>
      <GlowBackground />

      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerIcons}>
          <PressableScale
            style={styles.iconButton}
            haptic={false}
            onPress={() => navigation.navigate('Contacts')}
          >
            <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
          </PressableScale>
        </View>
      </Animated.View>

      {/* Moments rings */}
      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentsRow}>
          <Animated.View entering={FadeInRight.delay(100).springify()}>
            <PressableScale
              style={styles.momentItem}
              haptic={false}
              onPress={() =>
                myLive
                  ? navigation.navigate('MomentViewer', { authorId: 'me' })
                  : navigation.navigate('MomentComposer')
              }
            >
              <LinearGradient
                colors={myLive ? gradients.momentRing : ([colors.border, colors.border] as const)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.momentRing}
              >
                <View style={styles.momentInner}>
                  <Avatar gradient={profile.avatarGradient} label={profile.avatarEmoji} size={56} />
                </View>
              </LinearGradient>
              {!myLive && (
                <View style={styles.plusBadge}>
                  <Ionicons name="add" size={13} color={colors.white} />
                </View>
              )}
              <Text style={styles.momentName}>You</Text>
            </PressableScale>
          </Animated.View>
          {momentAuthors.map((m, i) => (
            <Animated.View key={m.contact.id} entering={FadeInRight.delay(150 + i * 70).springify()}>
              <PressableScale
                style={styles.momentItem}
                haptic={false}
                onPress={() => navigation.navigate('MomentViewer', { authorId: m.contact.id })}
              >
                <LinearGradient
                  colors={m.seen ? ([colors.border, colors.border] as const) : gradients.momentRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.momentRing}
                >
                  <View style={styles.momentInner}>
                    <Avatar gradient={m.contact.gradient} label={m.contact.initials} size={56} />
                  </View>
                </LinearGradient>
                <Text style={styles.momentName}>{m.contact.name.split(' ')[0]}</Text>
              </PressableScale>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </Animated.View>

      {/* Filter pills */}
      <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <PressableScale key={f} onPress={() => setFilter(f)} style={{ borderRadius: 20 }} scaleTo={0.92}>
              {active ? (
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterPill}
                >
                  <Text style={styles.filterTextActive}>{f}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.filterPill, styles.filterPillIdle]}>
                  <Text style={styles.filterText}>{f}</Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </Animated.View>

      {/* Chats */}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.chat.id}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(220 + Math.min(index, 8) * 60).duration(450).springify().damping(16)}>
            <PressableScale
              style={styles.row}
              scaleTo={0.98}
              haptic={false}
              onPress={() => navigation.navigate('Chat', { chatId: item.chat.id })}
            >
              <Avatar
                gradient={item.contact.gradient}
                label={item.contact.initials}
                size={54}
                online={item.contact.online}
              />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.chatName}>{item.contact.name}</Text>
                    {item.chat.pinned && (
                      <Ionicons name="pin" size={12} color={colors.textTertiary} />
                    )}
                  </View>
                  <Text style={[styles.chatTime, item.unread > 0 && { color: colors.yellow }]}>
                    {timeLabel(item.last?.sentAt)}
                  </Text>
                </View>
                <View style={styles.rowBottom}>
                  {typing[item.chat.id] ? (
                    <Text style={styles.typingText}>typing…</Text>
                  ) : (
                    <Text style={styles.preview} numberOfLines={1}>
                      {item.last
                        ? (item.last.senderId === 'me' ? 'You: ' : '') +
                          (item.last.imageUri ? '📷 Photo' : item.last.text)
                        : 'Say hi 👋'}
                    </Text>
                  )}
                  {item.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </PressableScale>
          </Animated.View>
        )}
      />

      {/* FAB → new chat */}
      <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.fabWrap}>
        <PressableScale scaleTo={0.9} onPress={() => navigation.navigate('Contacts')}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={colors.white} />
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 58 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 14,
  },
  title: { color: colors.white, fontSize: 32, fontFamily: fonts.display },
  headerIcons: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  momentsRow: { paddingHorizontal: 20, gap: 14, paddingBottom: 16 },
  momentItem: { alignItems: 'center', gap: 6 },
  momentRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  momentInner: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute', right: 0, bottom: 22,
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.red,
    borderWidth: 2, borderColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  momentName: { color: colors.textSecondary, fontSize: 11.5, fontFamily: fonts.medium },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 24, paddingHorizontal: 15, marginHorizontal: 20, marginBottom: 14,
  },
  searchInput: {
    flex: 1, color: colors.white, fontSize: 14.5, fontFamily: fonts.regular, paddingVertical: 11,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  filterPill: { paddingHorizontal: 17, paddingVertical: 8, borderRadius: 20 },
  filterPillIdle: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  filterText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.semiBold },
  filterTextActive: { color: colors.white, fontSize: 13, fontFamily: fonts.semiBold },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 11 },
  rowBody: {
    flex: 1, marginLeft: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    paddingBottom: 11,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { color: colors.white, fontSize: 16, fontFamily: fonts.semiBold },
  chatTime: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.regular },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: {
    flex: 1, color: colors.textSecondary, fontSize: 14, fontFamily: fonts.regular, marginRight: 10,
  },
  typingText: { color: colors.yellow, fontSize: 14, fontFamily: fonts.medium },
  badge: {
    minWidth: 21, height: 21, borderRadius: 11, backgroundColor: colors.red,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontFamily: fonts.bold },
  fabWrap: {
    position: 'absolute', right: 20, bottom: 104,
    borderRadius: 30, shadowColor: colors.red, shadowOpacity: 0.5,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 14,
  },
  fab: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
});
