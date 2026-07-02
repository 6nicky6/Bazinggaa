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
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RootNavigator from './src/navigation';
import { useAppStore } from './src/store/appStore';
import { colors } from './src/theme/colors';

// Flow: Splash → (first launch only) Onboarding → Auth or Main app.
export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => s.onboarded);
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  }

  if (!splashDone || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <StatusBar style="light" />
        <SplashScreen onDone={() => setSplashDone(true)} />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <StatusBar style="light" />
        <OnboardingScreen onDone={setOnboarded} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <StatusBar style="light" />
      <RootNavigator />
    </View>
  );
}
