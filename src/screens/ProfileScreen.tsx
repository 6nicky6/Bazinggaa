import React, { useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import { aiProviderName } from '../services/ai';
import { uploadAvatar } from '../services/live';
import { backendMode } from '../services/supabase';

export default function ProfileScreen({ navigation }: any) {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const blocked = useAppStore((s) => s.blocked);
  const contacts = useAppStore((s) => s.contacts);
  const unblock = useAppStore((s) => s.unblock);
  const signOut = useAppStore((s) => s.signOut);

  const [editOpen, setEditOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [starredOpen, setStarredOpen] = useState(false);
  const messages = useAppStore((s) => s.messages);
  const starredMsgs = messages.filter((m) => m.starred && !m.deleted);
  const [name, setName] = useState(profile.name);
  const [statusText, setStatusText] = useState(profile.statusText);

  return (
    <View style={styles.container}>
      <GlowBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* identity */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.identity}>
          <PressableScale
            haptic={false}
            onPress={async () => {
              try {
                const ImagePicker = require('expo-image-picker');
                const res = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1],
                });
                const uri = res?.assets?.[0]?.uri;
                if (uri) {
                  updateProfile({ avatarUri: uri });
                  uploadAvatar(uri); // live: syncs so others see it (no-op in demo)
                }
              } catch {}
            }}
          >
            <Avatar
              gradient={profile.avatarGradient}
              label={profile.avatarEmoji}
              size={96}
              imageUri={profile.avatarUri}
            />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color={colors.white} />
            </View>
          </PressableScale>
          <Text style={styles.name}>{profile.name || 'You'}</Text>
          <Text style={styles.username}>@{profile.username || 'you'} · {profile.phone}</Text>
          <Text style={styles.statusText}>{profile.statusText}</Text>
          <PressableScale
            haptic={false}
            style={styles.editBtn}
            onPress={() => {
              setName(profile.name);
              setStatusText(profile.statusText);
              setEditOpen(true);
            }}
          >
            <Ionicons name="pencil" size={14} color={colors.white} />
            <Text style={styles.editText}>Edit profile</Text>
          </PressableScale>
        </Animated.View>

        {/* AI */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)}>
          <Text style={styles.section}>BAZINGGA AI</Text>
          <View style={styles.card}>
            <Row icon="flash" label="Smart Replies" sub={aiProviderName}>
              <Switch
                value={settings.smartReplies}
                onValueChange={(v) => setSetting('smartReplies', v)}
                trackColor={{ false: colors.border, true: colors.red }}
                thumbColor={colors.white}
              />
            </Row>
          </View>
        </Animated.View>

        {/* starred messages */}
        <Animated.View entering={FadeInDown.delay(130).duration(450)}>
          <Text style={styles.section}>MESSAGES</Text>
          <View style={styles.card}>
            <PressableScale haptic={false} onPress={() => setStarredOpen(true)}>
              <Row icon="star" label="Starred messages" sub={`${starredMsgs.length} starred`}>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </Row>
            </PressableScale>
          </View>
        </Animated.View>

        {/* privacy */}
        <Animated.View entering={FadeInDown.delay(160).duration(450)}>
          <Text style={styles.section}>PRIVACY & SAFETY</Text>
          <View style={styles.card}>
            <PressableScale haptic={false} onPress={() => setBlockedOpen(true)}>
              <Row icon="hand-left" label="Blocked users" sub={`${blocked.length} blocked`}>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </Row>
            </PressableScale>
            <View style={styles.divider} />
            <Row icon="lock-closed" label="Private by design" sub="Server-enforced access rules; E2E encryption on the roadmap" />
          </View>
        </Animated.View>

        {/* notifications + app */}
        <Animated.View entering={FadeInDown.delay(220).duration(450)}>
          <Text style={styles.section}>APP</Text>
          <View style={styles.card}>
            <Row icon="notifications" label="Notifications" sub="Message alerts">
              <Switch
                value={settings.notifications}
                onValueChange={(v) => setSetting('notifications', v)}
                trackColor={{ false: colors.border, true: colors.red }}
                thumbColor={colors.white}
              />
            </Row>
            <View style={styles.divider} />
            <Row
              icon="server"
              label="Backend"
              sub={backendMode === 'live' ? 'Supabase (live)' : 'Demo mode — add keys in .env for live'}
            />
            <View style={styles.divider} />
            <PressableScale haptic={false} onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Row icon="document-text" label="Privacy Policy & Terms" sub="How your data is handled">
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </Row>
            </PressableScale>
            <View style={styles.divider} />
            <Row icon="moon" label="Theme" sub="Premium Dark (light mode coming with Bazingga+)" />
            <View style={styles.divider} />
            <Row icon="information-circle" label="About" sub="Bazingga v0.1.0 · Fast. Private. Expressive." />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(450)}>
          <PressableScale style={styles.logout} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
            <Text style={styles.logoutText}>Log out</Text>
          </PressableScale>
        </Animated.View>
      </ScrollView>

      {/* edit profile modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View entering={ZoomIn.duration(200)} style={styles.modal}>
            <Text style={styles.modalTitle}>Edit profile</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.textTertiary}
              maxLength={30}
            />
            <TextInput
              style={styles.input}
              value={statusText}
              onChangeText={setStatusText}
              placeholder="Status"
              placeholderTextColor={colors.textTertiary}
              maxLength={80}
            />
            <View style={styles.modalRow}>
              <PressableScale haptic={false} style={styles.modalBtn} onPress={() => setEditOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  updateProfile({ name: name.trim() || profile.name, statusText: statusText.trim() || profile.statusText });
                  setEditOpen(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>Save</Text>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* blocked users modal */}
      {/* starred messages modal */}
      <Modal visible={starredOpen} transparent animationType="fade" onRequestClose={() => setStarredOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View entering={ZoomIn.duration(200)} style={[styles.modal, { maxHeight: 480 }]}>
            <Text style={styles.modalTitle}>⭐ Starred messages</Text>
            {starredMsgs.length === 0 && (
              <Text style={styles.emptyText}>Long-press any message → Star to save it here.</Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              {starredMsgs.map((m) => {
                const from = m.senderId === 'me' ? 'You' : contacts.find((c) => c.id === m.senderId)?.name ?? 'Member';
                return (
                  <View key={m.id} style={styles.starredRow}>
                    <Text style={styles.starredFrom}>{from}</Text>
                    <Text style={styles.starredText} numberOfLines={3}>
                      {m.imageUri || m.imageUrl ? '📷 Photo' : m.audioUri || m.audioUrl ? '🎙️ Voice message' : m.text}
                    </Text>
                    <Text style={styles.starredDate}>
                      {new Date(m.sentAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <PressableScale haptic={false} style={[styles.modalBtn, { marginTop: 12 }]} onPress={() => setStarredOpen(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={blockedOpen} transparent animationType="fade" onRequestClose={() => setBlockedOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View entering={ZoomIn.duration(200)} style={styles.modal}>
            <Text style={styles.modalTitle}>Blocked users</Text>
            {blocked.length === 0 && (
              <Text style={styles.emptyText}>Nobody blocked. Peaceful. 🕊️</Text>
            )}
            {blocked.map((id) => {
              const c = contacts.find((x) => x.id === id);
              if (!c) return null;
              return (
                <View key={id} style={styles.blockedRow}>
                  <Avatar gradient={c.gradient} label={c.initials} size={40} />
                  <Text style={styles.blockedName}>{c.name}</Text>
                  <PressableScale haptic={false} style={styles.unblockBtn} onPress={() => unblock(id)}>
                    <Text style={styles.unblockText}>Unblock</Text>
                  </PressableScale>
                </View>
              );
            })}
            <PressableScale haptic={false} style={[styles.modalBtn, { marginTop: 12 }]} onPress={() => setBlockedOpen(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function Row({
  icon, label, sub, children,
}: { icon: any; label: string; sub?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.yellow} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 64 },
  identity: { alignItems: 'center', paddingHorizontal: 20 },
  name: { color: colors.white, fontSize: 24, fontFamily: fonts.display, marginTop: 14 },
  username: { color: colors.textSecondary, fontSize: 13.5, fontFamily: fonts.regular, marginTop: 4 },
  statusText: { color: colors.textSecondary, fontSize: 13.5, fontFamily: fonts.regular, marginTop: 8, fontStyle: 'italic' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14,
  },
  editText: { color: colors.white, fontSize: 13, fontFamily: fonts.medium },
  section: {
    color: colors.textTertiary, fontSize: 11, fontFamily: fonts.semiBold,
    letterSpacing: 1.5, paddingHorizontal: 20, marginTop: 24, marginBottom: 8,
  },
  card: {
    marginHorizontal: 20, borderRadius: 20,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(246,184,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { color: colors.white, fontSize: 14.5, fontFamily: fonts.medium },
  rowSub: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 24, paddingVertical: 15,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(225,6,0,0.3)',
    backgroundColor: 'rgba(225,6,0,0.07)',
  },
  logoutText: { color: colors.red, fontSize: 15, fontFamily: fonts.semiBold },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  modal: {
    width: '100%', backgroundColor: colors.surfaceRaised,
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  modalTitle: { color: colors.white, fontSize: 18, fontFamily: fonts.display, marginBottom: 14 },
  input: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 14, color: colors.white, fontSize: 15, fontFamily: fonts.medium,
    paddingHorizontal: 15, paddingVertical: 12, marginBottom: 10,
  },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderRadius: 16, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  modalBtnPrimary: { backgroundColor: colors.red, borderColor: colors.red },
  modalBtnText: { color: colors.textSecondary, fontSize: 14.5, fontFamily: fonts.semiBold },
  emptyText: { color: colors.textTertiary, fontSize: 13.5, fontFamily: fonts.regular, marginBottom: 6 },
  blockedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  blockedName: { flex: 1, color: colors.white, fontSize: 14.5, fontFamily: fonts.medium, marginLeft: 12 },
  unblockBtn: {
    backgroundColor: 'rgba(225,6,0,0.12)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  unblockText: { color: colors.redHot, fontSize: 12.5, fontFamily: fonts.semiBold },
  starredRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  starredFrom: { color: colors.yellow, fontSize: 12.5, fontFamily: fonts.semiBold },
  starredText: { color: colors.white, fontSize: 14, fontFamily: fonts.regular, marginTop: 3 },
  starredDate: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.regular, marginTop: 3 },
  cameraBadge: {
    position: 'absolute', right: 0, bottom: 2,
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.red,
    borderWidth: 2, borderColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
});
