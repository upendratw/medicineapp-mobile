import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { resolveAppLanding, resolveRouteGroup } from '@/navigation/guard';
import { useDeepLinkIntent } from '@/navigation/DeepLinkContext';
import { useAuth } from '@/state/AuthContext';
import { useOnboarding } from '@/state/OnboardingContext';
import {
  emitE21ColdStartDiagnostic,
  type E21ColdStartDiagnosticMarker,
} from '@/diagnostics/e21ColdStartDiagnostic';

export function RouteGuard() {
  const { status, role } = useAuth();
  const { complete, restoring } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const { pending, pendingReminder, pendingCaregiver, clear } =
    useDeepLinkIntent();
  const lastDiagnostic = useRef<E21ColdStartDiagnosticMarker | null>(null);
  useEffect(() => {
    const emitOnce = (marker: E21ColdStartDiagnosticMarker) => {
      if (lastDiagnostic.current === marker) return;
      lastDiagnostic.current = marker;
      emitE21ColdStartDiagnostic(marker);
    };
    if (restoring) return;
    const target = resolveRouteGroup(status, complete);
    const current = segments[0];
    if (target === 'auth') {
      if (current !== '(auth)') router.replace('/login');
      return;
    }
    if (target === 'onboarding') {
      if (current !== '(onboarding)') router.replace('/welcome');
      return;
    }
    if (target !== 'app') return;
    if (pendingReminder) {
      router.replace({
        pathname: '/reminder',
        params: { reminderId: pendingReminder.reminderId },
      } as never);
      clear();
      return;
    }
    if (pendingCaregiver) {
      emitOnce('ROUTEGUARD_CAREGIVER_INTENT_SEEN');
      if (role === 'caregiver') {
        const alreadyOnInbox =
          current === '(app)' &&
          segments[1] === 'caregiver-alerts' &&
          segments.length === 2;
        emitOnce('ROUTEGUARD_DECISION_CAREGIVER_ALERTS');
        if (!alreadyOnInbox) router.replace('/caregiver-alerts');
        emitOnce('CAREGIVER_INTENT_CONSUMED');
        clear();
      } else if (role === 'patient') {
        clear();
        if (
          current !== '(app)' ||
          segments[1] === 'caregiver-dashboard' ||
          segments[1] === 'caregiver-alerts'
        )
          router.replace('/home');
      }
      return;
    }
    if (pending) {
      router.replace(pending as never);
      clear();
    } else if (current !== '(app)') {
      if (role === 'caregiver')
        emitOnce('ROUTEGUARD_DECISION_CAREGIVER_DASHBOARD');
      router.replace(resolveAppLanding(role));
    } else if (
      current === '(app)' &&
      role === 'caregiver' &&
      segments[1] === 'home'
    ) {
      emitOnce('ROUTEGUARD_DECISION_CAREGIVER_DASHBOARD');
      router.replace('/caregiver-dashboard');
    } else if (
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
    pendingCaregiver,
    pendingReminder,
    restoring,
    router,
    role,
    segments,
    status,
  ]);
  return null;
}
