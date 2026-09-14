import { ApiClient } from '@/api/client';
import type { SecureTokenStore, TokenPair } from '@/security/SecureTokenStore';

export type OtpChallenge = Readonly<{
  challengeId: string;
  expiresInSeconds: number;
}>;
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
  ) {}

  async requestOtp(phone: string): Promise<OtpChallenge> {
    const data = await this.client.request<OtpResponse>(
      '/api/v1/auth/request-otp',
      {
        method: 'POST',
        body: JSON.stringify({ phone, role: 'patient' }),
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
  ): Promise<void> {
    const data = await this.client.request<SessionResponse>(
      '/api/v1/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId, phone, otp }),
      },
    );
    const tokens: TokenPair = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
    await this.tokenStore.write(tokens);
  }

  async logout(): Promise<void> {
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
