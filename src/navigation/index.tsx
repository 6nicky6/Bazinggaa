import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAppStore } from '../store/appStore';

import LoginScreen from '../screens/LoginScreen';
import PhoneScreen from '../screens/auth/PhoneScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactsScreen from '../screens/ContactsScreen';
import NewGroupScreen from '../screens/NewGroupScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import MomentsScreen from '../screens/MomentsScreen';
import MomentComposerScreen from '../screens/MomentComposerScreen';
import MomentViewerScreen from '../screens/MomentViewerScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CallOverlay from '../screens/CallOverlay';
import BazinggaPlusScreen from '../screens/BazinggaPlusScreen';
import CallsScreen from '../screens/CallsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Chats: 'chatbubbles',
  Moments: 'aperture',
  Discover: 'compass',
  Calls: 'call',
  Profile: 'person-circle',
};

function FrostedTabBar({ state, navigation }: any) {
  return (
    <BlurView intensity={40} tint="dark" style={styles.tabBar}>
      {state.routes.map((route: any, i: number) => {
        const active = state.index === i;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.tabItem}
          >
            <Ionicons
              name={TAB_ICONS[route.name]}
              size={23}
              color={active ? colors.red : colors.textTertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                active && { color: colors.red, fontFamily: fonts.semiBold },
              ]}
            >
              {route.name}
            </Text>
            {active && <View style={styles.tabDot} />}
          </Pressable>
        );
      })}
    </BlurView>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FrostedTabBar {...props} />}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Moments" component={MomentsScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.black,
    card: colors.black,
    primary: colors.red,
  },
};

export default function RootNavigator() {
  const authed = useAppStore((s) => s.authed);
  const hasProfile = useAppStore((s) => !!s.profile.name);
  const bootLive = useAppStore((s) => s.bootLive);

  // live mode: load real data + subscribe to realtime once signed in
  React.useEffect(() => {
    if (authed && hasProfile) {
      bootLive();
      // interaction sounds follow the saved notifications toggle
      import('../services/sounds').then((s) =>
        s.setSoundsEnabled(useAppStore.getState().settings.notifications)
      );
      // notifications: ask permission + register this device for push
      import('../services/notifications').then(async (n) => {
        await n.initNotifications();
        n.registerPushToken();
      });
    }
  }, [authed, hasProfile]);

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.black },
        }}
      >
        {!(authed && hasProfile) ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Phone" component={PhoneScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Contacts" component={ContactsScreen} />
            <Stack.Screen name="NewGroup" component={NewGroupScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen
              name="MomentComposer"
              component={MomentComposerScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="MomentViewer"
              component={MomentViewerScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen
              name="BazinggaPlus"
              component={BazinggaPlusScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
      <CallOverlay />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder,
    paddingTop: 10, paddingBottom: 24,
    backgroundColor: 'rgba(11,11,11,0.72)', overflow: 'hidden',
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { color: colors.textTertiary, fontSize: 10.5, fontFamily: fonts.medium },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.red, marginTop: 1 },
});
