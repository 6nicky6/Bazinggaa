import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  ChatFilter,
  DUMMY_CHATS,
  DummyChat,
  FILTERS,
} from '../data/dummyChats';

const NAV_TABS = [
  { key: 'Chats', icon: 'chatbubbles' },
  { key: 'Moments', icon: 'aperture' },
  { key: 'Discover', icon: 'compass' },
  { key: 'Calls', icon: 'call' },
  { key: 'Profile', icon: 'person-circle' },
] as const;

export default function ChatListScreen() {
  const [filter, setFilter] = useState<ChatFilter>('All');
  const [search, setSearch] = useState('');

  const chats = useMemo(() => {
    let list = DUMMY_CHATS;
    if (filter !== 'All') list = list.filter((c) => c.group === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [filter, search]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Ionicons name="flash" size={22} color={colors.yellow} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={17} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ChatRow chat={item} />}
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomNav}>
        {NAV_TABS.map((tab, i) => {
          const active = i === 0; // Chats active this sprint
          return (
            <View key={tab.key} style={styles.navItem}>
              <Ionicons
                name={tab.icon}
                size={23}
                color={active ? colors.red : colors.textTertiary}
              />
              <Text
                style={[
                  styles.navLabel,
                  active && { color: colors.red, fontWeight: '700' },
                ]}
              >
                {tab.key}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ChatRow({ chat }: { chat: DummyChat }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.avatar, { backgroundColor: chat.avatarColor }]}>
        <Text style={styles.avatarText}>{chat.initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.chatName}>{chat.name}</Text>
          <Text
            style={[
              styles.chatTime,
              chat.unread > 0 && { color: colors.yellow },
            ]}
          >
            {chat.time}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.preview} numberOfLines={1}>
            {chat.preview}
          </Text>
          {chat.unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    paddingVertical: 9,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  filterPillActive: {
    backgroundColor: colors.red,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
    marginLeft: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  chatTime: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    marginRight: 10,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.black,
    paddingTop: 8,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  navLabel: {
    color: colors.textTertiary,
    fontSize: 10.5,
  },
});
