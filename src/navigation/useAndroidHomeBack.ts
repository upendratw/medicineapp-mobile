import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';

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

const SAFE_DIAGNOSTIC_PATHS = new Set(['/home', ...HOME_CHILDREN]);

const CAREGIVER_ALERTS_INBOX = '/caregiver-alerts';
const CAREGIVER_DASHBOARD = '/caregiver-dashboard';
const CAREGIVER_ALERT_DETAIL_PATTERN = /^\/caregiver-alerts\/[^/?#]+\/[^/?#]+$/;

export type AndroidBackDecision =
  'system' | 'back' | 'home' | 'caregiver-alerts' | 'caregiver-dashboard';

type AndroidBackTarget = '/home' | '/caregiver-alerts' | '/caregiver-dashboard';

type AndroidBackActions = Readonly<{
  back: () => void;
  replace: (target: AndroidBackTarget) => void;
}>;

type AndroidBackDiagnosticEvent = 'mounted' | 'unmounted' | 'press' | 'settled';

export function sanitizeAndroidBackPath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] ?? '';
  if (CAREGIVER_ALERT_DETAIL_PATTERN.test(path)) {
    return '/caregiver-alerts/detail';
  }
  if (path === CAREGIVER_ALERTS_INBOX) return path;
  return SAFE_DIAGNOSTIC_PATHS.has(path) ? path : '/other';
}

export function formatAndroidBackDiagnostic(
  event: AndroidBackDiagnosticEvent,
  pathname: string,
  details?: Readonly<{
    canGoBack?: boolean;
    action?:
      | 'system'
      | 'router.back'
      | 'replace-home'
      | 'replace-caregiver-alerts'
      | 'replace-caregiver-dashboard';
  }>,
): string {
  const canGoBack =
    details?.canGoBack === undefined
      ? ''
      : ` canGoBack=${String(details.canGoBack)}`;
  const action = details?.action ? ` action=${details.action}` : '';
  return `[AndroidBack] ${event} path=${sanitizeAndroidBackPath(pathname)}${canGoBack}${action}`;
}

function reportAndroidBackDiagnostic(
  event: AndroidBackDiagnosticEvent,
  pathname: string,
  details?: Readonly<{
    canGoBack?: boolean;
    action?:
      | 'system'
      | 'router.back'
      | 'replace-home'
      | 'replace-caregiver-alerts'
      | 'replace-caregiver-dashboard';
  }>,
): void {
  if (!__DEV__) return;
  // The formatter allowlists paths and accepts no route parameters or payloads.
  // eslint-disable-next-line no-console
  console.info(formatAndroidBackDiagnostic(event, pathname, details));
}

export function decideAndroidBack(
  pathname: string,
  canGoBack: boolean,
): AndroidBackDecision {
  const path = pathname.split(/[?#]/, 1)[0] ?? '';
  if (CAREGIVER_ALERT_DETAIL_PATTERN.test(path)) return 'caregiver-alerts';
  if (path === CAREGIVER_ALERTS_INBOX) return 'caregiver-dashboard';
  if (path === '/home' || !HOME_CHILDREN.has(path)) return 'system';
  return canGoBack ? 'back' : 'home';
}

export function executeAndroidBack(
  pathname: string,
  canGoBack: boolean,
  actions: AndroidBackActions,
): boolean {
  const decision = decideAndroidBack(pathname, canGoBack);
  if (decision === 'system') return false;
  if (decision === 'back') actions.back();
  else if (decision === 'home') actions.replace('/home');
  else if (decision === 'caregiver-alerts') {
    actions.replace(CAREGIVER_ALERTS_INBOX);
  } else {
    actions.replace(CAREGIVER_DASHBOARD);
  }
  return true;
}

export function useAndroidHomeBack(): void {
  const pathname = usePathname();
  const router = useRouter();
  const navigationPending = useRef(false);
  const hardwareBackPressReceived = useRef(false);
  const previousAppState = useRef(AppState.currentState);

  useEffect(() => {
    if (Platform.OS !== 'android' || !navigationPending.current) return;
    navigationPending.current = false;
    reportAndroidBackDiagnostic('settled', pathname);
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    reportAndroidBackDiagnostic('mounted', pathname);
    if (__DEV__) {
      // Paths are allowlisted and AppState values contain no route parameters.
      // eslint-disable-next-line no-console
      console.info(
        `[AndroidBack] handler-mounted path=${sanitizeAndroidBackPath(pathname)}`,
      );
    }
    const appStateSubscription = __DEV__
      ? AppState.addEventListener('change', (nextState) => {
          const previousState = previousAppState.current;
          previousAppState.current = nextState;
          // eslint-disable-next-line no-console
          console.info(
            `[AndroidBack] app-state ${previousState}->${nextState} path=${sanitizeAndroidBackPath(pathname)}`,
          );
          if (nextState === 'background') {
            // eslint-disable-next-line no-console
            console.info(
              `[AndroidBack] hardwareBackPressReceived=${String(hardwareBackPressReceived.current)}`,
            );
            hardwareBackPressReceived.current = false;
          }
          if (nextState === 'active') hardwareBackPressReceived.current = false;
        })
      : null;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        hardwareBackPressReceived.current = true;
        const canGoBack = router.canGoBack();
        const decision = decideAndroidBack(pathname, canGoBack);
        const action =
          decision === 'back'
            ? 'router.back'
            : decision === 'home'
              ? 'replace-home'
              : decision === 'caregiver-alerts'
                ? 'replace-caregiver-alerts'
                : decision === 'caregiver-dashboard'
                  ? 'replace-caregiver-dashboard'
                  : 'system';
        reportAndroidBackDiagnostic('press', pathname, {
          canGoBack,
          action,
        });
        const consumed = executeAndroidBack(pathname, canGoBack, {
          back: () => router.back(),
          replace: (target) => router.replace(target),
        });
        navigationPending.current = consumed;
        return consumed;
      },
    );
    return () => {
      reportAndroidBackDiagnostic('unmounted', pathname);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.info(
          `[AndroidBack] handler-unmounted path=${sanitizeAndroidBackPath(pathname)}`,
        );
      }
      appStateSubscription?.remove();
      subscription.remove();
    };
  }, [pathname, router]);
}
