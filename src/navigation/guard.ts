import type { AuthStatus } from '@/state/AuthContext';
import type { AuthRole } from '@/services/authService';

export type RouteGroup = 'auth' | 'onboarding' | 'app';
export function resolveRouteGroup(
  status: AuthStatus,
  onboardingComplete: boolean,
): RouteGroup | null {
  if (status === 'restoring') return null;
  if (status !== 'authenticated') return 'auth';
  return onboardingComplete ? 'app' : 'onboarding';
}

export function resolveAppLanding(
  role: AuthRole | null,
): '/home' | '/caregiver-dashboard' {
  return role === 'caregiver' ? '/caregiver-dashboard' : '/home';
}
