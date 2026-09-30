import { Linking } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  resolveDeepLink,
  parseNotificationIntent,
  type CaregiverAlertNotificationIntent,
  type ReminderNotificationIntent,
  type SafeDestination,
} from '@/navigation/DeepLinkService';
import { sessionEvents } from '@/security/SessionEvents';
import {
  emitE21ColdStartDiagnostic,
  type E21ColdStartDiagnosticMarker,
} from '@/diagnostics/e21ColdStartDiagnostic';
type Value = {
  pending: SafeDestination | null;
  pendingReminder: ReminderNotificationIntent | null;
  pendingCaregiver: CaregiverAlertNotificationIntent | null;
  acceptUrl(url: string): void;
  acceptNotification(value: unknown): void;
  clear(): void;
};
const Context = createContext<Value>({
  pending: null,
  pendingReminder: null,
  pendingCaregiver: null,
  acceptUrl() {},
  acceptNotification() {},
  clear() {},
});

function parserDiagnosticMarker(
  value: unknown,
  intent: ReminderNotificationIntent | CaregiverAlertNotificationIntent | null,
): E21ColdStartDiagnosticMarker {
  if (intent?.type === 'caregiver_alerts') return 'PARSER_RESULT_CAREGIVER';
  if (intent?.type === 'reminder') return 'PARSER_RESULT_REMINDER';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const type = (value as Record<string, unknown>).type;
    if (
      typeof type === 'string' &&
      !['caregiver_alert', 'medicineapp.reminder.due'].includes(type)
    )
      return 'PARSER_RESULT_UNSUPPORTED';
  }
  return 'PARSER_RESULT_INVALID';
}

export function DeepLinkProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<SafeDestination | null>(null);
  const [pendingReminder, setPendingReminder] =
    useState<ReminderNotificationIntent | null>(null);
  const [pendingCaregiver, setPendingCaregiver] =
    useState<CaregiverAlertNotificationIntent | null>(null);
  const pendingCaregiverRef = useRef<CaregiverAlertNotificationIntent | null>(
    null,
  );
  const acceptUrl = useCallback((url: string) => {
    const resolution = resolveDeepLink(url);
    emitE21ColdStartDiagnostic(
      resolution.accepted ? 'INITIAL_URL_ACCEPTED' : 'INITIAL_URL_REJECTED',
    );
    if (resolution.accepted) setPending(resolution.destination);
  }, []);
  const acceptNotification = useCallback((value: unknown) => {
    const intent = parseNotificationIntent(value);
    emitE21ColdStartDiagnostic(parserDiagnosticMarker(value, intent));
    setPendingReminder(intent?.type === 'reminder' ? intent : null);
    const caregiverIntent = intent?.type === 'caregiver_alerts' ? intent : null;
    if (caregiverIntent) {
      emitE21ColdStartDiagnostic('CAREGIVER_INTENT_INSTALLED');
    } else if (pendingCaregiverRef.current) {
      emitE21ColdStartDiagnostic('CAREGIVER_INTENT_REPLACED');
    }
    pendingCaregiverRef.current = caregiverIntent;
    setPendingCaregiver(caregiverIntent);
  }, []);
  const clear = useCallback(() => {
    pendingCaregiverRef.current = null;
    setPending(null);
    setPendingReminder(null);
    setPendingCaregiver(null);
  }, []);
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) acceptUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) =>
      acceptUrl(url),
    );
    return () => subscription.remove();
  }, [acceptUrl]);
  useEffect(
    () =>
      sessionEvents.subscribe(() => {
        if (pendingCaregiverRef.current)
          emitE21ColdStartDiagnostic(
            'CAREGIVER_INTENT_CLEARED_SESSION_INVALID',
          );
        clear();
      }),
    [clear],
  );
  const value = useMemo(
    () => ({
      pending,
      pendingReminder,
      pendingCaregiver,
      acceptUrl,
      acceptNotification,
      clear,
    }),
    [
      acceptNotification,
      acceptUrl,
      clear,
      pending,
      pendingCaregiver,
      pendingReminder,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDeepLinkIntent(): Value {
  return useContext(Context);
}
