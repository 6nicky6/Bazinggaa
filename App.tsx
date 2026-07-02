import React, { useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import { colors } from './src/theme/colors';

// Flow: Splash → Onboarding → Login → Chat list preview.
// Simple state routing this sprint; real auth routing lands in Sprint 2.
type Screen = 'splash' | 'onboarding' | 'login' | 'chats';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    // brand-black frame while fonts load (a beat, then splash takes over)
    return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <StatusBar style="light" />
      <Animated.View
        key={screen}
        style={{ flex: 1 }}
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(250)}
      >
        {screen === 'splash' && (
          <SplashScreen onDone={() => setScreen('onboarding')} />
        )}
        {screen === 'onboarding' && (
          <OnboardingScreen onDone={() => setScreen('login')} />
        )}
        {screen === 'login' && (
          <LoginScreen onContinue={() => setScreen('chats')} />
        )}
        {screen === 'chats' && <ChatListScreen />}
      </Animated.View>
    </View>
  );
}
