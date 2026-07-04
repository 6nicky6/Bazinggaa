import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import PressableScale from './PressableScale';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// WhatsApp-style attach sheet. Photos & camera work TODAY (on-device);
// the rest shows the full capability with a graceful "next update" note.
type Props = {
  visible: boolean;
  onClose: () => void;
  onImage: (uri: string) => void;
  onComingSoon: (feature: string) => void;
};

const OPTIONS = [
  { key: 'gallery', label: 'Photos', icon: 'images' as const, colors: ['#7C3AED', '#C084FC'] as const },
  { key: 'camera', label: 'Camera', icon: 'camera' as const, colors: ['#DB2777', '#F472B6'] as const },
  { key: 'voice', label: 'Voice', icon: 'mic' as const, colors: ['#EA580C', '#FB923C'] as const },
  { key: 'document', label: 'Document', icon: 'document-text' as const, colors: ['#0891B2', '#22D3EE'] as const },
  { key: 'location', label: 'Location', icon: 'location' as const, colors: ['#16A34A', '#4ADE80'] as const },
  { key: 'sticker', label: 'Sticker', icon: 'happy' as const, colors: ['#F6B800', '#FFD34D'] as const },
];

export default function AttachSheet({ visible, onClose, onImage, onComingSoon }: Props) {
  const pick = async (key: string) => {
    if (key === 'gallery' || key === 'camera') {
      try {
        const fn = key === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
        if (key === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { onClose(); return; }
        }
        const res = await fn({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
        onClose();
        if (!res.canceled && res.assets?.[0]?.uri) onImage(res.assets[0].uri);
      } catch {
        onClose();
      }
      return;
    }
    onClose();
    const names: Record<string, string> = {
      voice: 'Voice messages', document: 'Documents', location: 'Location sharing', sticker: 'Stickers',
    };
    onComingSoon(names[key] ?? 'This feature');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.grid}>
            {OPTIONS.map((o, i) => (
              <Animated.View key={o.key} entering={FadeInDown.delay(60 + i * 40).springify()}>
                <PressableScale style={styles.cell} scaleTo={0.88} onPress={() => pick(o.key)}>
                  <LinearGradient colors={o.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconCircle}>
                    <Ionicons name={o.icon} size={24} color={colors.white} />
                  </LinearGradient>
                  <Text style={styles.label}>{o.label}</Text>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: colors.glassBorder,
    paddingBottom: 34, paddingTop: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly',
    rowGap: 20, paddingHorizontal: 12,
  },
  cell: { alignItems: 'center', width: 86, gap: 8 },
  iconCircle: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: colors.textSecondary, fontSize: 12.5, fontFamily: fonts.medium },
});
