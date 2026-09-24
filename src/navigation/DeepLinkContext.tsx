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
  type ReminderNotificationIntent,
  type SafeDestination,
} from '@/navigation/DeepLinkService';
import { sessionEvents } from '@/security/SessionEvents';
type Value = {
  pending: SafeDestination | null;
  pendingReminder: ReminderNotificationIntent | null;
  acceptUrl(url: string): void;
  acceptNotification(value: unknown): void;
  clear(): void;
};
const Context = createContext<Value>({
  pending: null,
  pendingReminder: null,
  acceptUrl() {},
  acceptNotification() {},
  clear() {},
});
export function DeepLinkProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<SafeDestination | null>(null);
  const [pendingReminder, setPendingReminder] =
    useState<ReminderNotificationIntent | null>(null);
  const acceptUrl = useCallback(
    (url: string) => setPending(resolveDeepLink(url).destination),
    [],
  );
  const acceptNotification = useCallback(
    (value: unknown) => setPendingReminder(parseNotificationIntent(value)),
    [],
  );
  const clear = useCallback(() => {
    setPending(null);
    setPendingReminder(null);
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
    () => ({ pending, pendingReminder, acceptUrl, acceptNotification, clear }),
    [acceptNotification, acceptUrl, clear, pending, pendingReminder],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDeepLinkIntent(): Value {
  return useContext(Context);
}
