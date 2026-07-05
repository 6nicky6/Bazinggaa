// Notifications: local alerts for incoming messages + remote-push groundwork.
// Local notifications work TODAY (no server changes). Remote push activates
// automatically once profiles.push_token exists (schema v3 adds it).
import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  // not available on web — degrade silently
  if (Platform.OS !== 'web') Notifications = require('expo-notifications');
} catch {}

export async function initNotifications(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: '#E10600',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function notifyMessage(title: string, body: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // now
    });
  } catch {}
}

// ---- remote push groundwork ----
// Token is stored in the owner-only `devices` table (schema v3); the actual
// push SEND happens server-side (Supabase Edge Function on message insert) so
// tokens are never readable by other users. Requires FCM (google-services.json)
// for standalone Android builds — until that lands this logs and no-ops.
export async function registerPushToken() {
  if (!Notifications || !supabase) return;
  try {
    const Constants = require('expo-constants').default;
    if (Constants?.appOwnership === 'expo') {
      console.warn('[push] Expo Go cannot receive remote push — skipping registration');
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const Device = require('expo-device');
    if (!Device.isDevice) return;
    const projectId = '8d1d2119-2ff0-48fa-95cf-4b6fff7c578e';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase
      .from('devices')
      .upsert({ user_id: uid, push_token: token }, { onConflict: 'user_id' });
    if (error) console.warn('[push] token save failed:', error.message);
  } catch (e: any) {
    console.warn('[push] registration failed:', e?.message ?? e);
  }
}
