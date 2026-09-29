import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { resolveAppLanding, resolveRouteGroup } from '@/navigation/guard';
import { useDeepLinkIntent } from '@/navigation/DeepLinkContext';
import { useAuth } from '@/state/AuthContext';
import { useOnboarding } from '@/state/OnboardingContext';

export function RouteGuard() {
  const { status, role } = useAuth();
  const { complete, restoring } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const { pending, pendingReminder, clear } = useDeepLinkIntent();
  useEffect(() => {
    if (restoring) return;
    const target = resolveRouteGroup(status, complete);
    const current = segments[0];
    if (target === 'auth' && current !== '(auth)') router.replace('/login');
    if (target === 'onboarding' && current !== '(onboarding)')
      router.replace('/welcome');
    if (target === 'app' && pendingReminder) {
      router.replace({
        pathname: '/reminder',
        params: { reminderId: pendingReminder.reminderId },
      } as never);
      clear();
    } else if (target === 'app' && pending) {
      router.replace(pending as never);
      clear();
    } else if (target === 'app' && current !== '(app)') {
      router.replace(resolveAppLanding(role));
    } else if (
      target === 'app' &&
      current === '(app)' &&
      role === 'caregiver' &&
      segments[1] === 'home'
    ) {
      router.replace('/caregiver-dashboard');
    } else if (
      target === 'app' &&
      current === '(app)' &&
      role === 'patient' &&
      (segments[1] === 'caregiver-dashboard' ||
        segments[1] === 'caregiver-alerts')
    ) {
      router.replace('/home');
    }
  }, [
    clear,
    complete,
    pending,
    pendingReminder,
    restoring,
    router,
    role,
    segments,
    status,
  ]);
  return null;
}
