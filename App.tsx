import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { LockScreen } from './src/screens/LockScreen';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasInBackground =
        appStateRef.current === 'background' || appStateRef.current === 'inactive';

      if (wasInBackground && nextState === 'active') {
        setIsUnlocked(false);
      }

      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isUnlocked ? <AppNavigator /> : <LockScreen onUnlockSuccess={() => setIsUnlocked(true)} />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
