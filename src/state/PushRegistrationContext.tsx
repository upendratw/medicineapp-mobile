import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/state/AuthContext';
import { useOnline } from '@/state/NetworkContext';
import { useDeepLinkIntent } from '@/navigation/DeepLinkContext';
import {
  pushRegistrationCoordinator,
  type PushRegistrationResult,
} from '@/services/pushRegistration';
import { notificationCapability } from '@/services/notificationCapability';
type Value = {
  result: PushRegistrationResult | null;
  loading: boolean;
  register(): Promise<void>;
};
const Context = createContext<Value>({
  result: null,
  loading: false,
  async register() {},
});
export function PushRegistrationProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const online = useOnline();
  const { acceptNotification } = useDeepLinkIntent();
  const [result, setResult] = useState<PushRegistrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const run = useCallback(
    async (request: boolean) => {
      setLoading(true);
      try {
        setResult(await pushRegistrationCoordinator.register(request, online));
      } catch {
        setResult({ status: 'unavailable' });
      } finally {
        setLoading(false);
      }
    },
    [online],
  );
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    void pushRegistrationCoordinator
      .register(false, online)
      .then((next) => {
        if (active) setResult(next);
      })
      .catch(() => {
        if (active) setResult({ status: 'unavailable' });
      });
    return () => {
      active = false;
    };
  }, [online, status]);
  useEffect(() => {
    let active = true;
    let remove: (() => void) | undefined;
    void notificationCapability
      .addResponseListener(acceptNotification)
      .then((subscription) => {
        if (!active) subscription?.remove();
        else remove = () => subscription?.remove();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      remove?.();
    };
  }, [acceptNotification]);
  const register = useCallback(() => run(true), [run]);
  const value = useMemo(
    () => ({ result, loading, register }),
    [loading, register, result],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePushRegistration(): Value {
  return useContext(Context);
}
