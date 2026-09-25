import { ApiClient, ApiError } from '@/api/client';
import type { SecureTokenStore, TokenPair } from '@/security/SecureTokenStore';
import { AuthService } from '@/services/authService';
import { isValidOtp, normalizeIndianPhone } from '@/utils/phone';

class FakeTokenStore implements SecureTokenStore {
  tokens: TokenPair | null = null;
  read = jest.fn(async () => this.tokens);
  write = jest.fn(async (tokens: TokenPair) => {
    this.tokens = tokens;
  });
  clear = jest.fn(async () => {
    this.tokens = null;
  });
}

const response = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response;

beforeEach(() => {
  jest.restoreAllMocks();
});

test('normalizes valid Indian phone input and rejects invalid input', () => {
  expect(normalizeIndianPhone('98765 43210')).toBe('+919876543210');
  expect(normalizeIndianPhone('123')).toBeNull();
});

test('bounds OTP format', () => {
  expect(isValidOtp('123456')).toBe(true);
  expect(isValidOtp('12A456')).toBe(false);
  expect(isValidOtp('123456789')).toBe(false);
});

test('requests OTP using the backend contract without embedding an OTP', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
    response({
      data: { challenge_id: 'challenge', expires_in_seconds: 300 },
    }),
  );
  const store = new FakeTokenStore();
  const result = await new AuthService(
    new ApiClient('https://api.example.test', 1000),
    store,
  ).requestOtp('+919876543210');
  expect(result).toEqual({ challengeId: 'challenge', expiresInSeconds: 300 });
  expect(fetchMock.mock.calls[0][1]?.body).toBe(
    JSON.stringify({ phone: '+919876543210', role: 'patient' }),
  );
});

test('verification sends the bounded contract and writes tokens only to secure storage', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    response({
      data: {
        user_id: 'synthetic-user',
        role: 'patient',
        access_token: 'access-value',
        refresh_token: 'refresh-value',
        expires_in: 900,
      },
    }),
  );
  const store = new FakeTokenStore();
  await new AuthService(
    new ApiClient('https://api.example.test', 1000),
    store,
  ).verifyOtp('challenge', '+919876543210', '123456');
  expect(store.write).toHaveBeenCalledWith({
    accessToken: 'access-value',
    refreshToken: 'refresh-value',
  });
});

test('failed OTP response is sanitized and does not persist tokens', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      response(
        { error: { code: 'OTP_INVALID', message: 'private upstream detail' } },
        false,
        401,
      ),
    );
  const store = new FakeTokenStore();
  await expect(
    new AuthService(
      new ApiClient('https://api.example.test', 1000),
      store,
    ).verifyOtp('challenge', '+919876543210', '123456'),
  ).rejects.toEqual(expect.objectContaining({ code: 'OTP_INVALID' }));
  expect(store.write).not.toHaveBeenCalled();
});

test('authenticated request uses secure storage and never exposes the token in errors', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(response({ error: { code: 'DENIED' } }, false, 403));
  const store = new FakeTokenStore();
  store.tokens = {
    accessToken: 'secret-access-value',
    refreshToken: 'secret-refresh-value',
  };
  const client = new ApiClient('https://api.example.test', 1000, store);
  let failure: unknown;
  try {
    await client.request('/protected', {}, true);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(ApiError);
  expect(JSON.stringify(failure)).not.toContain('secret-access-value');
});

test('API errors expose bounded Retry-After metadata without retrying', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status: 429,
    headers: new Headers({ 'Retry-After': '20' }),
    json: async () => ({ error: { code: 'RATE_LIMITED' } }),
  } as Response);
  await expect(
    new ApiClient('https://api.example.test', 1000).request('/limited'),
  ).rejects.toMatchObject({
    code: 'RATE_LIMITED',
    status: 429,
    retryAfterSeconds: 20,
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('logout clears secure tokens even when the backend is unavailable', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  const store = new FakeTokenStore();
  store.tokens = {
    accessToken: 'access-value',
    refreshToken: 'refresh-value',
  };
  await new AuthService(
    new ApiClient('https://api.example.test', 1000, store),
    store,
  ).logout();
  expect(store.clear).toHaveBeenCalled();
  expect(store.tokens).toBeNull();
});
