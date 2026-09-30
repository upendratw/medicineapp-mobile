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
import { useRouter } from 'expo-router';
import { useAuth } from '@/state/AuthContext';
import { useOnline } from '@/state/NetworkContext';
import { useDeepLinkIntent } from '@/navigation/DeepLinkContext';
import {
  pushRegistrationCoordinator,
  type OwnershipTransferEvidence,
  type PushRegistrationAttemptResult,
  type PushRegistrationResult,
} from '@/services/pushRegistration';
import { DeviceOwnershipTransferDialog } from '@/components/DeviceOwnershipTransferDialog';
import { notificationCapability } from '@/services/notificationCapability';
import { resolveReminderNotificationAction } from '@/services/notificationActions';
import { notificationActionCoordinator } from '@/services/registry';
type Value = {
  result: PushRegistrationResult | null;
  loading: boolean;
  ownershipTransferRequired: boolean;
  transferLoading: boolean;
  register(): Promise<void>;
  confirmOwnershipTransfer(): Promise<void>;
  cancelOwnershipTransfer(): void;
};
const Context = createContext<Value>({
  result: null,
  loading: false,
  ownershipTransferRequired: false,
  transferLoading: false,
  async register() {},
  async confirmOwnershipTransfer() {},
  cancelOwnershipTransfer() {},
});
export function PushRegistrationProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const router = useRouter();
  const online = useOnline();
  const { acceptNotification } = useDeepLinkIntent();
  const [result, setResult] = useState<PushRegistrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ownershipTransferRequired, setOwnershipTransferRequired] =
    useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const transferEvidence = useRef<OwnershipTransferEvidence | null>(null);
  const transferRequest = useRef<Promise<void> | null>(null);
  const applyRegistrationAttempt = useCallback(
    (next: PushRegistrationAttemptResult) => {
      if (
        next.status === 'ownership_transfer_required' &&
        next.transferEvidence
      ) {
        transferEvidence.current = next.transferEvidence;
        setOwnershipTransferRequired(true);
        setResult({ status: 'ownership_transfer_required' });
        return;
      }
      transferEvidence.current = null;
      setOwnershipTransferRequired(false);
      setResult(next);
    },
    [],
  );
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
  const notificationResponseHandler = useRef(handleNotificationResponse);
  const startupResponseRequest = useRef<ReturnType<
    typeof notificationCapability.lastResponse
  > | null>(null);
  useEffect(() => {
    notificationResponseHandler.current = handleNotificationResponse;
  }, [handleNotificationResponse]);
  const run = useCallback(
    async (request: boolean) => {
      setLoading(true);
      try {
        applyRegistrationAttempt(
          await pushRegistrationCoordinator.register(request, online),
        );
      } catch {
        setResult({ status: 'unavailable' });
      } finally {
        setLoading(false);
      }
    },
    [applyRegistrationAttempt, online],
  );
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    void pushRegistrationCoordinator
      .register(false, online)
      .then((next) => {
        if (active) applyRegistrationAttempt(next);
      })
      .catch(() => {
        if (active) setResult({ status: 'unavailable' });
      });
    return () => {
      active = false;
    };
  }, [applyRegistrationAttempt, online, status]);
  useEffect(() => {
    if (status === 'authenticated') return;
    transferEvidence.current = null;
    transferRequest.current = null;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setOwnershipTransferRequired(false);
      setTransferLoading(false);
    });
    return () => {
      active = false;
    };
  }, [status]);
  useEffect(() => {
    if (!__DEV__) return;
    let active = true;
    let remove: (() => void) | undefined;
    void notificationCapability
      .addReceivedListener()
      .then((subscription) => {
        if (!active) subscription?.remove();
        else remove = () => subscription?.remove();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      remove?.();
    };
  }, []);
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
    const request =
      startupResponseRequest.current ?? notificationCapability.lastResponse();
    startupResponseRequest.current = request;
    void request
      .then((response) => {
        if (active && response)
          void notificationResponseHandler.current(response);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
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
          if (!active || transferEvidence.current) return;
          void pushRegistrationCoordinator
            .registerRotatedToken(token, online)
            .then((next) => {
              if (active) applyRegistrationAttempt(next);
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
  }, [applyRegistrationAttempt, online, status]);
  const cancelOwnershipTransfer = useCallback(() => {
    if (transferRequest.current) return;
    transferEvidence.current = null;
    setOwnershipTransferRequired(false);
    setResult({ status: 'unavailable' });
  }, []);
  const confirmOwnershipTransfer = useCallback((): Promise<void> => {
    if (transferRequest.current) return transferRequest.current;
    const evidence = transferEvidence.current;
    if (!evidence) return Promise.resolve();
    setTransferLoading(true);
    const pending = pushRegistrationCoordinator
      .confirmOwnershipTransfer(evidence)
      .then((next) => {
        if (transferEvidence.current !== evidence) return;
        transferEvidence.current = null;
        setOwnershipTransferRequired(false);
        setResult(next);
      })
      .catch(() => {
        if (transferEvidence.current !== evidence) return;
        transferEvidence.current = null;
        setOwnershipTransferRequired(false);
        setResult({ status: 'unavailable' });
      })
      .finally(() => {
        if (transferRequest.current === pending) transferRequest.current = null;
        setTransferLoading(false);
      });
    transferRequest.current = pending;
    return pending;
  }, []);
  const register = useCallback(() => run(true), [run]);
  const value = useMemo(
    () => ({
      result,
      loading,
      ownershipTransferRequired,
      transferLoading,
      register,
      confirmOwnershipTransfer,
      cancelOwnershipTransfer,
    }),
    [
      cancelOwnershipTransfer,
      confirmOwnershipTransfer,
      loading,
      ownershipTransferRequired,
      register,
      result,
      transferLoading,
    ],
  );
  return (
    <Context.Provider value={value}>
      {children}
      <DeviceOwnershipTransferDialog
        visible={status === 'authenticated' && ownershipTransferRequired}
        loading={transferLoading}
        onConfirm={() => void confirmOwnershipTransfer()}
        onCancel={cancelOwnershipTransfer}
      />
    </Context.Provider>
  );
}
export function usePushRegistration(): Value {
  return useContext(Context);
}
