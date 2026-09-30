import { Linking } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
export function DeepLinkProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<SafeDestination | null>(null);
  const [pendingReminder, setPendingReminder] =
    useState<ReminderNotificationIntent | null>(null);
  const [pendingCaregiver, setPendingCaregiver] =
    useState<CaregiverAlertNotificationIntent | null>(null);
  const acceptUrl = useCallback((url: string) => {
    const resolution = resolveDeepLink(url);
    if (resolution.accepted) setPending(resolution.destination);
  }, []);
  const acceptNotification = useCallback((value: unknown) => {
    const intent = parseNotificationIntent(value);
    setPendingReminder(intent?.type === 'reminder' ? intent : null);
    setPendingCaregiver(intent?.type === 'caregiver_alerts' ? intent : null);
  }, []);
  const clear = useCallback(() => {
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
  useEffect(() => sessionEvents.subscribe(clear), [clear]);
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
