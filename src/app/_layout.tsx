import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RouteGuard } from '@/navigation/RouteGuard';
import { AuthProvider } from '@/state/AuthContext';
import { CaptureProvider } from '@/state/CaptureContext';
import { OnboardingProvider } from '@/state/OnboardingContext';
import { PreferencesProvider } from '@/state/PreferencesContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <CaptureProvider>
            <OnboardingProvider>
              <RouteGuard />
              <Stack screenOptions={{ headerShown: false }} />
              <StatusBar style="dark" />
            </OnboardingProvider>
          </CaptureProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
