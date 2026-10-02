import {
  BackendCaregiverEmailService,
  type CaregiverEmailState,
} from '@/services/caregiverEmailService';

const request = jest.fn();
const service = new BackendCaregiverEmailService({ request } as never);

beforeEach(() => request.mockReset());

test('maps status without exposing an unmasked email', async () => {
  request.mockResolvedValue({
    state: 'verified',
    identity_id: 'identity-id',
    challenge_id: null,
    masked_email: 'c***@example.com',
    verified_at: '2026-10-02T00:00:00Z',
  });
  await expect(service.status()).resolves.toEqual<CaregiverEmailState>({
    state: 'verified',
    identityId: 'identity-id',
    challengeId: null,
    maskedEmail: 'c***@example.com',
    verifiedAt: '2026-10-02T00:00:00Z',
  });
  expect(request).toHaveBeenCalledWith(
    '/api/v1/e21/caregivers/email',
    {},
    true,
  );
});

test('uses authenticated bounded request, resend, and confirmation contracts', async () => {
  request.mockResolvedValueOnce({
    identity_id: 'identity-id',
    challenge_id: 'challenge-id',
    masked_email: 'c***@example.com',
    expires_in_seconds: 600,
    resend_after_seconds: 60,
  });
  await service.request('caregiver@example.com');
  expect(request).toHaveBeenLastCalledWith(
    '/api/v1/e21/caregivers/email/verification-requests',
    {
      method: 'POST',
      body: JSON.stringify({ email: 'caregiver@example.com' }),
    },
    true,
  );

  request.mockResolvedValueOnce({
    identity_id: 'identity-id',
    challenge_id: 'new-challenge-id',
    masked_email: 'c***@example.com',
    expires_in_seconds: 600,
    resend_after_seconds: 60,
  });
  await service.resend('identity/id');
  expect(request).toHaveBeenLastCalledWith(
    '/api/v1/e21/caregivers/email/identity%2Fid/verification-resends',
    { method: 'POST' },
    true,
  );

  request.mockResolvedValueOnce({
    state: 'verified',
    identity_id: 'identity-id',
    challenge_id: null,
    masked_email: 'c***@example.com',
    verified_at: '2026-10-02T00:00:00Z',
  });
  await service.confirm('challenge-id', '123456');
  expect(request).toHaveBeenLastCalledWith(
    '/api/v1/e21/caregivers/email/verification-confirmations',
    {
      method: 'POST',
      body: JSON.stringify({ challenge_id: 'challenge-id', code: '123456' }),
    },
    true,
  );
});
