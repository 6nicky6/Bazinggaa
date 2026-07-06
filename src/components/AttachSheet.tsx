import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInUp, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import PressableScale from './PressableScale';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// The redesigned attach sheet: double-bezel glass tray, soft-tinted icon wells,
// staggered rise-in. Camera/Photos/Contact/Poll work TODAY; Document & Location
// arrive with the next native build (they need new device modules).
type Props = {
  visible: boolean;
  onClose: () => void;
  onImage: (uri: string) => void;
  onContact: () => void;
  onPoll: () => void;
  onComingSoon: (feature: string) => void;
};

const EASE = Easing.bezier(0.32, 0.72, 0, 1);

const OPTIONS = [
  { key: 'camera', label: 'Camera', icon: 'camera' as const, tint: '#DB2777' },
  { key: 'gallery', label: 'Photos', icon: 'images' as const, tint: '#7C3AED' },
  { key: 'contact', label: 'Contact', icon: 'person' as const, tint: '#0891B2' },
  { key: 'poll', label: 'Poll', icon: 'stats-chart' as const, tint: '#16A34A' },
  { key: 'document', label: 'Document', icon: 'document-text' as const, tint: '#EA580C' },
  { key: 'location', label: 'Location', icon: 'location' as const, tint: '#F6B800' },
];

export default function AttachSheet({ visible, onClose, onImage, onContact, onPoll, onComingSoon }: Props) {
  const pick = async (key: string) => {
    if (key === 'gallery' || key === 'camera') {
      try {
        const fn = key === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
        if (key === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { onClose(); return; }
        }
        // quality 0.4 keeps photos small enough to travel inline until the
        // storage path is universal (then we can raise it again)
        const res = await fn({ mediaTypes: ['images'], quality: 0.4, allowsEditing: false, exif: false });
        onClose();
        if (!res.canceled && res.assets?.[0]?.uri) onImage(res.assets[0].uri);
      } catch {
        onClose();
      }
      return;
    }
    onClose();
    if (key === 'contact') { onContact(); return; }
    if (key === 'poll') { onPoll(); return; }
    const names: Record<string, string> = { document: 'Documents', location: 'Location sharing' };
    onComingSoon(names[key] ?? 'This feature');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(320).easing(EASE)}>
          {/* outer shell — the "tray" the glass sheet sits in */}
          <Pressable style={styles.shell} onPress={() => {}}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.grid}>
                {OPTIONS.map((o, i) => (
                  <Animated.View
                    key={o.key}
                    entering={FadeInUp.delay(50 + i * 35).duration(280).easing(EASE)}
                  >
                    <PressableScale style={styles.cell} scaleTo={0.9} onPress={() => pick(o.key)}>
                      {/* icon well: soft tint + concentric highlight ring */}
                      <View style={[styles.iconWell, { backgroundColor: `${o.tint}1A`, borderColor: `${o.tint}33` }]}>
                        <View style={[styles.iconCore, { backgroundColor: `${o.tint}26` }]}>
                          <Ionicons name={o.icon} size={22} color={o.tint} />
                        </View>
                      </View>
                      <Text style={styles.label}>{o.label}</Text>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  // double-bezel: shell (tray) + sheet (glass core) with concentric radii
  shell: {
    margin: 10, borderRadius: 32, padding: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sheet: {
    borderRadius: 26,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1, borderColor: colors.glassBorder,
    paddingBottom: 26, paddingTop: 10,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 18,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly',
    rowGap: 18, paddingHorizontal: 8,
  },
  cell: { alignItems: 'center', width: 92, gap: 8 },
  iconWell: {
    width: 60, height: 60, borderRadius: 21, padding: 4,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  iconCore: {
    width: '100%', height: '100%', borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.medium },
});
