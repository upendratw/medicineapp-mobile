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
import { secureTokenStore } from '@/security/SecureTokenStore';
import { AuthService, type OtpChallenge } from '@/services/authService';

export type AuthStatus =
  'restoring' | 'unauthenticated' | 'authenticated' | 'error';
type PendingChallenge = OtpChallenge & { phone: string };
type AuthValue = {
  status: AuthStatus;
  pendingChallenge: PendingChallenge | null;
  requestOtp(phone: string): Promise<void>;
  verifyOtp(otp: string): Promise<void>;
  logout(): Promise<void>;
};

const service = new AuthService(
  new ApiClient(undefined, undefined, secureTokenStore),
  secureTokenStore,
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
  const requestOtp = useCallback(async (phone: string) => {
    const challenge = await service.requestOtp(phone);
    setPendingChallenge({ ...challenge, phone });
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
    await service.logout();
    setPendingChallenge(null);
    setStatus('unauthenticated');
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
