import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';

function callTime(ts: number) {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { weekday: 'short' });
}

export default function CallsScreen() {
  const calls = useAppStore((s) => s.calls);
  const contacts = useAppStore((s) => s.contacts);
  const [toast, setToast] = useState(false);

  const comingSoon = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  return (
    <View style={styles.container}>
      <GlowBackground />
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={styles.title}>Calls</Text>
      </Animated.View>

      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => {
          const contact = contacts.find((c) => c.id === item.contactId);
          if (!contact) return null;
          return (
            <Animated.View entering={FadeInDown.delay(80 + index * 60).duration(450)}>
              <View style={styles.row}>
                <Avatar gradient={contact.gradient} label={contact.initials} size={50} />
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text style={[styles.name, item.missed && { color: colors.red }]}>
                    {contact.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name={item.direction === 'incoming' ? 'arrow-down' : 'arrow-up'}
                      size={13}
                      color={item.missed ? colors.red : colors.online}
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                    <Text style={styles.meta}>
                      {item.missed ? 'Missed' : item.direction === 'incoming' ? 'Incoming' : 'Outgoing'} · {callTime(item.at)}
                    </Text>
                  </View>
                </View>
                <PressableScale haptic={false} style={styles.callBtn} onPress={comingSoon}>
                  <Ionicons name={item.video ? 'videocam' : 'call'} size={20} color={colors.yellow} />
                </PressableScale>
              </View>
            </Animated.View>
          );
        }}
      />

      {toast && (
        <Animated.View entering={FadeInUp.springify()} style={styles.toast}>
          <Ionicons name="rocket-outline" size={16} color={colors.yellow} />
          <Text style={styles.toastText}>Voice & video calls arrive in Phase 2</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingTop: 58 },
  header: { paddingHorizontal: 20, marginBottom: 14 },
  title: { color: colors.white, fontSize: 32, fontFamily: fonts.display },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  name: { color: colors.white, fontSize: 15.5, fontFamily: fonts.semiBold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.regular },
  callBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  toast: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11,
  },
  toastText: { color: colors.white, fontSize: 13.5, fontFamily: fonts.medium },
});
