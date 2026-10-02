import { ApiClient } from '@/api/client';
import { secureTokenStore } from '@/security/SecureTokenStore';

export type CaregiverEmailState = Readonly<{
  state: 'none' | 'pending' | 'verified';
  identityId: string | null;
  challengeId: string | null;
  maskedEmail: string | null;
  verifiedAt: string | null;
}>;

export type VerificationRequestResult = Readonly<{
  identityId: string;
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}>;

type EmailStateResponse = {
  state: CaregiverEmailState['state'];
  identity_id: string | null;
  challenge_id: string | null;
  masked_email: string | null;
  verified_at: string | null;
};

type VerificationRequestResponse = {
  identity_id: string;
  challenge_id: string;
  masked_email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
};

export interface CaregiverEmailService {
  status(): Promise<CaregiverEmailState>;
  request(email: string): Promise<VerificationRequestResult>;
  resend(identityId: string): Promise<VerificationRequestResult>;
  confirm(challengeId: string, code: string): Promise<CaregiverEmailState>;
}

export class BackendCaregiverEmailService implements CaregiverEmailService {
  constructor(private readonly client: ApiClient) {}

  async status(): Promise<CaregiverEmailState> {
    return mapState(
      await this.client.request<EmailStateResponse>(
        '/api/v1/e21/caregivers/email',
        {},
        true,
      ),
    );
  }

  async request(email: string): Promise<VerificationRequestResult> {
    return mapRequest(
      await this.client.request<VerificationRequestResponse>(
        '/api/v1/e21/caregivers/email/verification-requests',
        { method: 'POST', body: JSON.stringify({ email }) },
        true,
      ),
    );
  }

  async resend(identityId: string): Promise<VerificationRequestResult> {
    return mapRequest(
      await this.client.request<VerificationRequestResponse>(
        `/api/v1/e21/caregivers/email/${encodeURIComponent(identityId)}/verification-resends`,
        { method: 'POST' },
        true,
      ),
    );
  }

  async confirm(
    challengeId: string,
    code: string,
  ): Promise<CaregiverEmailState> {
    return mapState(
      await this.client.request<EmailStateResponse>(
        '/api/v1/e21/caregivers/email/verification-confirmations',
        {
          method: 'POST',
          body: JSON.stringify({ challenge_id: challengeId, code }),
        },
        true,
      ),
    );
  }
}

function mapState(value: EmailStateResponse): CaregiverEmailState {
  return {
    state: value.state,
    identityId: value.identity_id,
    challengeId: value.challenge_id,
    maskedEmail: value.masked_email,
    verifiedAt: value.verified_at,
  };
}

function mapRequest(
  value: VerificationRequestResponse,
): VerificationRequestResult {
  return {
    identityId: value.identity_id,
    challengeId: value.challenge_id,
    maskedEmail: value.masked_email,
    expiresInSeconds: value.expires_in_seconds,
    resendAfterSeconds: value.resend_after_seconds,
  };
}

export const caregiverEmailService = new BackendCaregiverEmailService(
  new ApiClient(undefined, undefined, secureTokenStore),
);
