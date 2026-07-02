import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';

// Sprint 1: simple state-based flow (no navigation library yet).
// Onboarding → Login → Chat list preview. Real auth routing lands in Sprint 2.
type Screen = 'onboarding' | 'login' | 'chats';

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding');

  return (
    <>
      <StatusBar style="light" />
      {screen === 'onboarding' && (
        <OnboardingScreen onDone={() => setScreen('login')} />
      )}
      {screen === 'login' && (
        <LoginScreen onContinue={() => setScreen('chats')} />
      )}
      {screen === 'chats' && <ChatListScreen />}
    </>
  );
}
