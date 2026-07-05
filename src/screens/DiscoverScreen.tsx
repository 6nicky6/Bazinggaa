import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import { backendMode } from '../services/supabase';
import { searchProfiles } from '../services/live';
import {
  DISCOVER_TABS, DiscoverTab, OFFICIAL_CHANNELS, STICKER_PACKS,
} from '../data/discover';
import { Contact } from '../types';

export default function DiscoverScreen({ navigation }: any) {
  const [tab, setTab] = useState<DiscoverTab>('Channels');

  return (
    <View style={styles.container}>
      <GlowBackground />
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.tabs}>
        {DISCOVER_TABS.map((t) => {
          const active = t === tab;
          return (
            <PressableScale key={t} onPress={() => setTab(t)} style={{ borderRadius: 18 }} scaleTo={0.94}>
              {active ? (
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tab}>
                  <Text style={styles.tabTextActive}>{t}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.tab, styles.tabIdle]}>
                  <Text style={styles.tabText}>{t}</Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </Animated.View>

      {tab === 'Channels' && <ChannelsTab navigation={navigation} />}
      {tab === 'People' && <PeopleTab navigation={navigation} />}
      {tab === 'Stickers' && <StickersTab />}
    </View>
  );
}

// ---------------- Channels ----------------
function ChannelsTab({ navigation }: any) {
  const chats = useAppStore((s) => s.chats);
  const joinChannel = useAppStore((s) => s.joinChannel);
  const joinedIds = useMemo(() => new Set(chats.map((c) => c.id)), [chats]);
  const cats = ['All', ...new Set(OFFICIAL_CHANNELS.map((c) => c.category))];
  const [cat, setCat] = useState('All');
  const list = OFFICIAL_CHANNELS.filter((c) => cat === 'All' || c.category === cat);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {cats.map((c) => (
          <PressableScale key={c} onPress={() => setCat(c)} style={{ borderRadius: 16 }} scaleTo={0.92}>
            <View style={[styles.catPill, cat === c && styles.catPillActive]}>
              <Text style={[styles.catText, cat === c && { color: colors.yellow }]}>{c}</Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const joined = joinedIds.has(`official-${item.id}`);
          return (
            <Animated.View entering={FadeInDown.delay(60 + index * 60).duration(400)}>
              <PressableScale
                haptic={false}
                style={styles.channelRow}
                onPress={() => {
                  const id = joinChannel(item);
                  navigation.navigate('Chat', { chatId: id });
                }}
              >
                <Avatar gradient={item.gradient} label={item.emoji} size={54} />
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.channelName}>{item.name}</Text>
                    <Ionicons name="checkmark-circle" size={14} color={colors.yellow} />
                  </View>
                  <Text style={styles.channelDesc} numberOfLines={1}>{item.description}</Text>
                  <Text style={styles.channelMeta}>{item.subscribers} subscribers</Text>
                </View>
                <PressableScale
                  haptic={false}
                  onPress={() => {
                    const id = joinChannel(item);
                    navigation.navigate('Chat', { chatId: id });
                  }}
                  style={[styles.joinBtn, joined && styles.joinedBtn]}
                >
                  <Text style={[styles.joinText, joined && { color: colors.textSecondary }]}>
                    {joined ? 'Open' : 'Join'}
                  </Text>
                </PressableScale>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </Animated.View>
  );
}

// ---------------- People ----------------
function PeopleTab({ navigation }: any) {
  const contacts = useAppStore((s) => s.contacts);
  const chats = useAppStore((s) => s.chats);
  const blocked = useAppStore((s) => s.blocked);
  const ensureChat = useAppStore((s) => s.ensureChat);
  const isLive = backendMode === 'live';
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isLive || q.trim().length < 2) { setFound([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      searchProfiles(q).then((r) => {
        setFound(r.filter((c) => !blocked.includes(c.id)));
        setSearching(false);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const list = useMemo(() => {
    if (isLive) {
      if (q.trim().length >= 2) return found;
      const known = new Set(chats.map((c) => c.contactId));
      return contacts.filter((c) => known.has(c.id) && !blocked.includes(c.id) && !c.id.startsWith('official-'));
    }
    const base = contacts.filter((c) => !blocked.includes(c.id) && !c.id.startsWith('official-'));
    if (!q.trim()) return base;
    const t = q.trim().toLowerCase();
    return base.filter((c) => c.name.toLowerCase().includes(t) || c.username.includes(t));
  }, [contacts, chats, blocked, q, found]);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find people by @username or name"
          placeholderTextColor={colors.textTertiary}
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />
        {searching && <Ionicons name="ellipsis-horizontal" size={16} color={colors.yellow} />}
      </View>

      {isLive && q.trim().length >= 2 && !searching && list.length === 0 && (
        <Text style={styles.emptyText}>
          Nobody found for “{q.trim()}”. Invite them to Bazingga! ⚡
        </Text>
      )}
      {!q && (
        <Text style={styles.hintText}>
          {isLive ? 'Search anyone by their @username to start a chat.' : 'Your people are below.'}
        </Text>
      )}

      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(60 + index * 50).duration(400)}>
            <PressableScale
              haptic={false}
              style={styles.channelRow}
              onPress={async () => {
                const chatId = await ensureChat(item.id);
                if (chatId) navigation.navigate('Chat', { chatId });
              }}
            >
              <Avatar gradient={item.gradient} label={item.initials} size={50} online={item.online} />
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={styles.channelName}>{item.name}</Text>
                <Text style={styles.channelDesc} numberOfLines={1}>@{item.username} · {item.status}</Text>
              </View>
              <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
            </PressableScale>
          </Animated.View>
        )}
      />
    </Animated.View>
  );
}

// ---------------- Stickers ----------------
function StickersTab() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.hintText2}>
          Tap a pack to preview. Send stickers from any chat with the + button. More packs coming ⚡
        </Text>
        {STICKER_PACKS.map((pack, i) => (
          <Animated.View key={pack.id} entering={FadeInDown.delay(60 + i * 70).duration(400)} style={styles.packCard}>
            <View style={styles.packHeader}>
              <Text style={styles.packName}>{pack.name}</Text>
              <View style={styles.freePill}><Text style={styles.freeText}>FREE</Text></View>
            </View>
            <View style={styles.stickerGrid}>
              {pack.emojis.map((e, j) => (
                <Animated.View key={j} entering={FadeInRight.delay(80 + j * 30)}>
                  <View style={styles.stickerCell}><Text style={{ fontSize: 30 }}>{e}</Text></View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 58 },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  title: { color: colors.white, fontSize: 32, fontFamily: fonts.display },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  tab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18 },
  tabIdle: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  tabText: { color: colors.textSecondary, fontSize: 13.5, fontFamily: fonts.semiBold },
  tabTextActive: { color: colors.white, fontSize: 13.5, fontFamily: fonts.semiBold },
  catRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  catPillActive: { borderColor: 'rgba(246,184,0,0.4)', backgroundColor: 'rgba(246,184,0,0.08)' },
  catText: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.medium },
  channelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  channelName: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
  channelDesc: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  channelMeta: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.regular, marginTop: 2 },
  joinBtn: {
    backgroundColor: colors.red, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8,
  },
  joinedBtn: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  joinText: { color: colors.white, fontSize: 13, fontFamily: fonts.semiBold },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 22, paddingHorizontal: 15, marginHorizontal: 20, marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14.5, fontFamily: fonts.regular, paddingVertical: 11 },
  emptyText: { color: colors.textTertiary, fontSize: 13.5, fontFamily: fonts.regular, paddingHorizontal: 24, lineHeight: 20 },
  hintText: { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.regular, paddingHorizontal: 24, marginBottom: 6 },
  hintText2: { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.regular, marginBottom: 14, lineHeight: 19 },
  packCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 20, padding: 14, marginBottom: 12,
  },
  packHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  packName: { color: colors.white, fontSize: 15, fontFamily: fonts.semiBold },
  freePill: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  freeText: { color: colors.online, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.5 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stickerCell: {
    width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
});
