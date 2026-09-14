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
  resolveNotificationDestination,
  type SafeDestination,
} from '@/navigation/DeepLinkService';
type Value = {
  pending: SafeDestination | null;
  acceptUrl(url: string): void;
  acceptNotification(value: unknown): void;
  clear(): void;
};
const Context = createContext<Value>({
  pending: null,
  acceptUrl() {},
  acceptNotification() {},
  clear() {},
});
export function DeepLinkProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<SafeDestination | null>(null);
  const acceptUrl = useCallback(
    (url: string) => setPending(resolveDeepLink(url).destination),
    [],
  );
  const acceptNotification = useCallback(
    (value: unknown) =>
      setPending(resolveNotificationDestination(value).destination),
    [],
  );
  const clear = useCallback(() => setPending(null), []);
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) acceptUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) =>
      acceptUrl(url),
    );
    return () => subscription.remove();
  }, [acceptUrl]);
  const value = useMemo(
    () => ({ pending, acceptUrl, acceptNotification, clear }),
    [acceptNotification, acceptUrl, clear, pending],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDeepLinkIntent(): Value {
  return useContext(Context);
}
