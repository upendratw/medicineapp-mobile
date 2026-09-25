import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

const HOME_CHILDREN = new Set([
  '/accessibility-settings',
  '/account-settings',
  '/add-medicine',
  '/caregiver-dashboard',
  '/interactions',
  '/inventory',
  '/language-settings',
  '/medication-history',
  '/medication-information',
  '/medicines',
  '/notification-settings',
  '/prescription-scan',
  '/schedule',
  '/sos',
  '/symptoms',
  '/voice',
]);

export type AndroidBackDecision = 'system' | 'back' | 'home';

export function decideAndroidBack(
  pathname: string,
  canGoBack: boolean,
): AndroidBackDecision {
  if (pathname === '/home' || !HOME_CHILDREN.has(pathname)) return 'system';
  return canGoBack ? 'back' : 'home';
}

export function useAndroidHomeBack(): void {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const decision = decideAndroidBack(pathname, router.canGoBack());
        if (decision === 'system') return false;
        if (decision === 'back') router.back();
        else router.replace('/home');
        return true;
      },
    );
    return () => subscription.remove();
  }, [pathname, router]);
}
