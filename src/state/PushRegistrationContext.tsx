import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/state/AuthContext';
import { useOnline } from '@/state/NetworkContext';
import { useDeepLinkIntent } from '@/navigation/DeepLinkContext';
import {
  pushRegistrationCoordinator,
  type PushRegistrationResult,
} from '@/services/pushRegistration';
import { notificationCapability } from '@/services/notificationCapability';
import { resolveReminderNotificationAction } from '@/services/notificationActions';
import { notificationActionCoordinator } from '@/services/registry';
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
  const router = useRouter();
  const online = useOnline();
  const { acceptNotification } = useDeepLinkIntent();
  const [result, setResult] = useState<PushRegistrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const handleNotificationResponse = useCallback(
    async (
      response: Parameters<typeof notificationActionCoordinator.capture>[0],
    ) => {
      const directAction = resolveReminderNotificationAction(
        response.actionIdentifier,
      );
      if (!directAction) {
        acceptNotification(response.data);
        return;
      }
      let pending;
      try {
        pending = await notificationActionCoordinator.capture(response);
      } catch {
        acceptNotification(response.data);
        return;
      }
      if (!pending) return;
      if (status !== 'authenticated' || !online) {
        if (status !== 'restoring') acceptNotification(response.data);
        return;
      }
      try {
        const outcome = await notificationActionCoordinator.process();
        if (outcome.status === 'applied') router.replace('/home');
        else acceptNotification(response.data);
      } catch {
        acceptNotification(response.data);
      }
    },
    [acceptNotification, online, router, status],
  );
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
      .addResponseListener((response) => {
        void handleNotificationResponse(response);
      })
      .then((subscription) => {
        if (!active) subscription?.remove();
        else remove = () => subscription?.remove();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      remove?.();
    };
  }, [handleNotificationResponse]);
  useEffect(() => {
    let active = true;
    void notificationCapability.lastResponse().then((response) => {
      if (active && response) void handleNotificationResponse(response);
    });
    return () => {
      active = false;
    };
  }, [handleNotificationResponse]);
  useEffect(() => {
    if (status !== 'authenticated' || !online) return;
    let active = true;
    void notificationActionCoordinator
      .process()
      .then((outcome) => {
        if (!active || outcome.status === 'none') return;
        if (outcome.status === 'applied') router.replace('/home');
        else if (outcome.pending)
          acceptNotification({
            type: 'medicineapp.reminder.due',
            schema_version: 1,
            reminder_id: outcome.pending.reminderId,
          });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [acceptNotification, online, router, status]);
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    let remove: (() => void) | undefined;
    void notificationCapability
      .addPushTokenListener((token) => {
        // Expo emits a native FCM/APNs token here. Defer conversion to an Expo
        // token until after this callback returns, and pass the native token so
        // Expo never reacquires it and retriggers this listener.
        setTimeout(() => {
          if (!active) return;
          void pushRegistrationCoordinator
            .registerRotatedToken(token, online)
            .then((next) => {
              if (active) setResult(next);
            })
            .catch(() => {
              if (active) setResult({ status: 'unavailable' });
            });
        }, 0);
      })
      .then((subscription) => {
        if (!active) subscription?.remove();
        else remove = () => subscription?.remove();
      });
    return () => {
      active = false;
      remove?.();
    };
  }, [online, status]);
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
