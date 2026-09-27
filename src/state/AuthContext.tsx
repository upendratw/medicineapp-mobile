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
import { SecurePushRegistrationStore } from '@/services/pushRegistration';

export type AuthStatus =
  'restoring' | 'unauthenticated' | 'authenticated' | 'error';
type PendingChallenge = OtpChallenge & { phone: string; role: AuthRole };
type AuthValue = {
  status: AuthStatus;
  pendingChallenge: PendingChallenge | null;
  requestOtp(phone: string, role?: AuthRole): Promise<void>;
  verifyOtp(otp: string): Promise<void>;
  logout(): Promise<void>;
};

const pushRegistrationStore = new SecurePushRegistrationStore();
const service = new AuthService(
  new ApiClient(undefined, undefined, secureTokenStore),
  secureTokenStore,
  // Logout clears only local registration bookkeeping. The authoritative
  // backend registration remains active until an explicit device-revocation
  // flow unregisters it. A later authenticated user must resolve ownership
  // again through the normal backend registration path.
  () => pushRegistrationStore.clear(),
);
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [pendingChallenge, setPendingChallenge] =
    useState<PendingChallenge | null>(null);
  useEffect(() => {
    secureTokenStore
      .read()
      .then((tokens) => setStatus(tokens ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('error'));
  }, []);
  useEffect(
    () =>
      sessionEvents.subscribe(() => {
        setPendingChallenge(null);
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
      await service.verifyOtp(
        pendingChallenge.challengeId,
        pendingChallenge.phone,
        otp,
      );
      setPendingChallenge(null);
      setStatus('authenticated');
    },
    [pendingChallenge],
  );
  const logout = useCallback(async () => {
    try {
      await service.logout();
    } finally {
      await sessionEvents.notifyInvalidated();
    }
  }, []);
  const value = useMemo(
    () => ({ status, pendingChallenge, requestOtp, verifyOtp, logout }),
    [status, pendingChallenge, requestOtp, verifyOtp, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
