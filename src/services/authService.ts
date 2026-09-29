import { ApiClient } from '@/api/client';
import type {
  SecureTokenStore,
  SessionRole,
  TokenPair,
} from '@/security/SecureTokenStore';

export type OtpChallenge = Readonly<{
  challengeId: string;
  expiresInSeconds: number;
}>;
export type AuthRole = SessionRole;

export const normalizeAuthRole = (value: unknown): AuthRole =>
  value === 'caregiver' ? 'caregiver' : 'patient';

function authenticatedRole(value: unknown): AuthRole | null {
  return value === 'patient' || value === 'caregiver' ? value : null;
}

type OtpResponse = { challenge_id: string; expires_in_seconds: number };
type SessionResponse = {
  user_id: string;
  role: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export class AuthService {
  constructor(
    private readonly client: ApiClient,
    private readonly tokenStore: SecureTokenStore,
    private readonly sessionCleanup?: () => Promise<void>,
  ) {}

  async requestOtp(
    phone: string,
    role: AuthRole = 'patient',
  ): Promise<OtpChallenge> {
    const data = await this.client.request<OtpResponse>(
      '/api/v1/auth/request-otp',
      {
        method: 'POST',
        body: JSON.stringify({ phone, role: normalizeAuthRole(role) }),
      },
    );
    return {
      challengeId: data.challenge_id,
      expiresInSeconds: data.expires_in_seconds,
    };
  }

  async verifyOtp(
    challengeId: string,
    phone: string,
    otp: string,
  ): Promise<AuthRole> {
    let data: SessionResponse;
    try {
      data = await this.client.request<SessionResponse>(
        '/api/v1/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ challenge_id: challengeId, phone, otp }),
        },
      );
    } catch (error) {
      await this.sessionCleanup?.().catch(() => undefined);
      await this.tokenStore.clear();
      throw error;
    }
    const role = authenticatedRole(data.role);
    if (!role) {
      await this.sessionCleanup?.().catch(() => undefined);
      await this.tokenStore.clear();
      throw new Error('Authenticated session role is invalid');
    }
    const tokens: TokenPair = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      role,
    };
    await this.sessionCleanup?.().catch(() => undefined);
    await this.tokenStore.write(tokens);
    return role;
  }

  async logout(): Promise<void> {
    await this.sessionCleanup?.().catch(() => undefined);
    try {
      await this.client.request(
        '/api/v1/auth/logout',
        { method: 'POST' },
        true,
      );
    } catch {
      // A remote failure must not prevent local token revocation.
    } finally {
      await this.tokenStore.clear();
    }
  }
}
