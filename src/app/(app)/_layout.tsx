import { Stack } from 'expo-router';
import { useAndroidHomeBack } from '@/navigation/useAndroidHomeBack';

export const unstable_settings = {
  anchor: 'home',
};

export default function AppLayout() {
  useAndroidHomeBack();
  return <Stack screenOptions={{ headerShown: false }} />;
}
