import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import { BOT_ID } from '../services/bot';

const ICONS = ['👥', '👨‍👩‍👧‍👦', '⚡', '🎉', '💼', '⚽', '🎮', '📢', '🍕', '❤️'];

// Create a Group (everyone chats) or Channel (only admins post).
export default function NewGroupScreen({ navigation, route }: any) {
  const kind: 'group' | 'channel' = route.params?.kind ?? 'group';
  const contacts = useAppStore((s) => s.contacts);
  const blocked = useAppStore((s) => s.blocked);
  const createGroup = useAppStore((s) => s.createGroup);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(kind === 'channel' ? '📢' : '👥');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const pickable = contacts.filter((c) => c.id !== BOT_ID && !blocked.includes(c.id));
  const valid = name.trim().length >= 2 && selected.length >= 1;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const chatId = await createGroup(kind, name.trim(), icon, selected);
    setBusy(false);
    if (chatId) navigation.replace('Chat', { chatId });
  };

  return (
    <View style={styles.container}>
      <GlowBackground />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} haptic={false} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.title}>{kind === 'channel' ? 'New Channel' : 'New Group'}</Text>
      </Animated.View>

      {kind === 'channel' && (
        <Text style={styles.hint}>Channels are one-way: only you (and admins you add) can post.</Text>
      )}

      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.nameRow}>
        <Text style={{ fontSize: 30 }}>{icon}</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder={kind === 'channel' ? 'Channel name' : 'Group name'}
          placeholderTextColor={colors.textTertiary}
          maxLength={40}
          autoFocus
        />
      </Animated.View>

      <View style={styles.iconRow}>
        {ICONS.map((e) => (
          <PressableScale key={e} onPress={() => setIcon(e)} scaleTo={0.85}
            style={[styles.iconCell, icon === e && styles.iconCellActive]}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </PressableScale>
        ))}
      </View>

      <Text style={styles.section}>
        {kind === 'channel' ? 'ADD SUBSCRIBERS' : 'ADD MEMBERS'} · {selected.length} selected
      </Text>
      <FlatList
        data={pickable}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No contacts yet — chat with someone first, then create your {kind}.
          </Text>
        }
        renderItem={({ item }) => {
          const on = selected.includes(item.id);
          return (
            <PressableScale haptic={false} style={styles.row} onPress={() => toggle(item.id)}>
              <Avatar gradient={item.gradient} label={item.initials} size={46} />
              <Text style={styles.name}>{item.name}</Text>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={on ? colors.yellow : colors.textTertiary}
              />
            </PressableScale>
          );
        }}
      />

      <View style={styles.footer}>
        <PressableScale onPress={create} style={[styles.cta, (!valid || busy) && { opacity: 0.4 }]} disabled={!valid || busy}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaInner}>
            <Text style={styles.ctaText}>
              {busy ? 'Creating…' : kind === 'channel' ? 'Create Channel' : 'Create Group'}
            </Text>
            <Ionicons name={kind === 'channel' ? 'megaphone' : 'people'} size={17} color={colors.white} />
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 52 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 22, fontFamily: fonts.display, marginLeft: 4 },
  hint: {
    color: colors.textTertiary, fontSize: 12.5, fontFamily: fonts.regular,
    paddingHorizontal: 20, marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 12,
  },
  nameInput: {
    flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 16, color: colors.white, fontSize: 16, fontFamily: fonts.medium,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  iconCell: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCellActive: { borderColor: colors.yellow, borderWidth: 1.5 },
  section: {
    color: colors.textTertiary, fontSize: 11, fontFamily: fonts.semiBold,
    letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 20, paddingVertical: 9 },
  name: { flex: 1, color: colors.white, fontSize: 15.5, fontFamily: fonts.medium },
  empty: { color: colors.textTertiary, fontSize: 13.5, fontFamily: fonts.regular, paddingHorizontal: 20 },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 30 },
  cta: {
    borderRadius: 28, shadowColor: colors.red, shadowOpacity: 0.5,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 10,
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 28, paddingVertical: 15,
  },
  ctaText: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
});
