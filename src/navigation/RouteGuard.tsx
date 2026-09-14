import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { resolveRouteGroup } from '@/navigation/guard';
import { useAuth } from '@/state/AuthContext';
import { useOnboarding } from '@/state/OnboardingContext';

export function RouteGuard() {
  const { status } = useAuth();
  const { complete, restoring } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (restoring) return;
    const target = resolveRouteGroup(status, complete);
    const current = segments[0];
    if (target === 'auth' && current !== '(auth)') router.replace('/login');
    if (target === 'onboarding' && current !== '(onboarding)')
      router.replace('/welcome');
    if (target === 'app' && current !== '(app)') router.replace('/home');
  }, [complete, restoring, router, segments, status]);
  return null;
}
