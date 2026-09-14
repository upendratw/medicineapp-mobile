import type { AuthStatus } from '@/state/AuthContext';

export type RouteGroup = 'auth' | 'onboarding' | 'app';
export function resolveRouteGroup(
  status: AuthStatus,
  onboardingComplete: boolean,
): RouteGroup | null {
  if (status === 'restoring') return null;
  if (status !== 'authenticated') return 'auth';
  return onboardingComplete ? 'app' : 'onboarding';
}
