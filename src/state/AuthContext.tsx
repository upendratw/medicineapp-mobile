import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiClient } from '@/api/client';
import { sessionEvents } from '@/security/SessionEvents';
import { secureTokenStore } from '@/security/SecureTokenStore';
import {
  AuthService,
  type AuthRole,
  normalizeAuthRole,
  type OtpChallenge,
} from '@/services/authService';
import { AccountLogoutCoordinator } from '@/services/accountLogoutService';
import {
  pushRegistrationCoordinator,
  SecurePushRegistrationStore,
} from '@/services/pushRegistration';
import { notificationActionCoordinator } from '@/services/registry';

export type AuthStatus =
  'restoring' | 'unauthenticated' | 'authenticated' | 'error';
type PendingChallenge = OtpChallenge & { phone: string; role: AuthRole };
type AuthValue = {
  status: AuthStatus;
  role: AuthRole | null;
  pendingChallenge: PendingChallenge | null;
  requestOtp(phone: string, role?: AuthRole): Promise<void>;
  verifyOtp(otp: string): Promise<void>;
  logout(): Promise<void>;
};

const pushRegistrationStore = new SecurePushRegistrationStore();
const service = new AuthService(
  new ApiClient(undefined, undefined, secureTokenStore),
  secureTokenStore,
  // Defense in depth: authoritative logout clears local registration
  // bookkeeping even if the earlier best-effort device revocation fails.
  () => pushRegistrationStore.clear(),
);
const logoutCoordinator = new AccountLogoutCoordinator(
  pushRegistrationCoordinator,
  { clear: () => notificationActionCoordinator.clearForSessionExit() },
  service,
);
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [role, setRole] = useState<AuthRole | null>(null);
  const [pendingChallenge, setPendingChallenge] =
    useState<PendingChallenge | null>(null);
  useEffect(() => {
    secureTokenStore
      .read()
      .then((tokens) => {
        setRole(tokens?.role ?? null);
        setStatus(tokens ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        setRole(null);
        setStatus('error');
      });
  }, []);
  useEffect(
    () =>
      sessionEvents.subscribe(() => {
        setPendingChallenge(null);
        setRole(null);
        setStatus('unauthenticated');
      }),
    [],
  );
  const requestOtp = useCallback(async (phone: string, role?: AuthRole) => {
    const safeRole = normalizeAuthRole(role);
    const challenge = await service.requestOtp(phone, safeRole);
    setPendingChallenge({ ...challenge, phone, role: safeRole });
  }, []);
  const verifyOtp = useCallback(
    async (otp: string) => {
      if (!pendingChallenge) throw new Error('OTP challenge is unavailable');
      try {
        const authenticatedRole = await service.verifyOtp(
          pendingChallenge.challengeId,
          pendingChallenge.phone,
          otp,
        );
        setPendingChallenge(null);
        setRole(authenticatedRole);
        setStatus('authenticated');
      } catch (error) {
        setRole(null);
        setStatus('unauthenticated');
        throw error;
      }
    },
    [pendingChallenge],
  );
  const logout = useCallback(async () => {
    try {
      await logoutCoordinator.logout();
    } finally {
      sessionEvents.notifyInvalidated();
    }
  }, []);
  const value = useMemo(
    () => ({ status, role, pendingChallenge, requestOtp, verifyOtp, logout }),
    [status, role, pendingChallenge, requestOtp, verifyOtp, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
