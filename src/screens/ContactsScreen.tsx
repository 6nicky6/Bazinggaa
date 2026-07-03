import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';

// New chat: pick a contact, jump into (or create) the 1:1 chat.
export default function ContactsScreen({ navigation }: any) {
  const contacts = useAppStore((s) => s.contacts);
  const blocked = useAppStore((s) => s.blocked);
  const ensureChat = useAppStore((s) => s.ensureChat);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const base = contacts.filter((c) => !blocked.includes(c.id));
    if (!q.trim()) return base;
    const t = q.trim().toLowerCase();
    return base.filter((c) => c.name.toLowerCase().includes(t) || c.username.includes(t));
  }, [contacts, blocked, q]);

  return (
    <View style={styles.container}>
      <GlowBackground />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} haptic={false} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.title}>New Chat</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or @username"
          placeholderTextColor={colors.textTertiary}
          value={q}
          onChangeText={setQ}
          autoFocus
        />
      </Animated.View>

      <View style={styles.quickRow}>
        <PressableScale haptic={false} style={styles.quickBtn} onPress={() => navigation.navigate('NewGroup', { kind: 'group' })}>
          <Ionicons name="people" size={18} color={colors.yellow} />
          <Text style={styles.quickText}>New Group</Text>
        </PressableScale>
        <PressableScale haptic={false} style={styles.quickBtn} onPress={() => navigation.navigate('NewGroup', { kind: 'channel' })}>
          <Ionicons name="megaphone" size={17} color={colors.yellow} />
          <Text style={styles.quickText}>New Channel</Text>
        </PressableScale>
      </View>

      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(120 + index * 50).duration(400)}>
            <PressableScale
              haptic={false}
              style={styles.row}
              onPress={async () => {
                const chatId = await ensureChat(item.id);
                if (chatId) navigation.replace('Chat', { chatId });
              }}
            >
              <Avatar gradient={item.gradient} label={item.initials} size={50} online={item.online} />
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.status} numberOfLines={1}>@{item.username} · {item.status}</Text>
              </View>
              <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
            </PressableScale>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 52 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 22, fontFamily: fonts.display, marginLeft: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 22, paddingHorizontal: 15, marginHorizontal: 20, marginBottom: 12,
  },
  searchInput: {
    flex: 1, color: colors.white, fontSize: 14.5, fontFamily: fonts.regular, paddingVertical: 10,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  name: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
  status: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 16, paddingVertical: 12, justifyContent: 'center',
  },
  quickText: { color: colors.white, fontSize: 13.5, fontFamily: fonts.semiBold },
});
