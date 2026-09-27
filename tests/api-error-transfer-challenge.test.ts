import { ApiClient, ApiError } from '@/api/client';

const VALID_CHALLENGE = `1700000000.${'a'.repeat(64)}`;

function response(body: unknown, status = 409, headers = new Headers()) {
  return {
    ok: false,
    status,
    headers,
    json: async () => body,
  } as Response;
}

async function failureFor(
  body: unknown,
  status = 409,
  headers = new Headers(),
): Promise<ApiError> {
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(response(body, status, headers));
  try {
    await new ApiClient('https://api.example.test', 1_000).request('/bounded');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('Expected a bounded API failure');
}

beforeEach(() => jest.restoreAllMocks());

test('propagates only a valid ownership-conflict transfer challenge', async () => {
  const error = await failureFor({
    error: {
      code: 'PUSH_TOKEN_OWNERSHIP_CONFLICT',
      message: 'private backend message',
      details: {
        transfer_challenge: VALID_CHALLENGE,
        unexpected_field: 'discarded',
        nested_field: { ignored_field: true },
      },
    },
  });

  expect(error).toMatchObject({
    code: 'PUSH_TOKEN_OWNERSHIP_CONFLICT',
    status: 409,
    transferChallenge: VALID_CHALLENGE,
  });
  expect(error.message).not.toContain(VALID_CHALLENGE);
  expect('details' in error).toBe(false);
  expect('unexpected_field' in error).toBe(false);
  expect(Object.keys(error)).not.toContain('transferChallenge');
  expect(JSON.stringify(error)).not.toContain(VALID_CHALLENGE);
});

test.each([
  ['missing details', undefined],
  ['null details', null],
  ['string details', 'invalid'],
  ['missing challenge', {}],
  ['null challenge', { transfer_challenge: null }],
  ['number challenge', { transfer_challenge: 123 }],
  ['array challenge', { transfer_challenge: [VALID_CHALLENGE] }],
  ['object challenge', { transfer_challenge: { value: VALID_CHALLENGE } }],
  ['empty challenge', { transfer_challenge: '' }],
  ['oversized challenge', { transfer_challenge: 'a'.repeat(97) }],
  [
    'malformed challenge',
    { transfer_challenge: `1700000000.${'A'.repeat(64)}` },
  ],
])(
  'discards %s without changing the bounded ownership error',
  async (_name, details) => {
    const error = await failureFor({
      error: { code: 'PUSH_TOKEN_OWNERSHIP_CONFLICT', details },
    });

    expect(error).toMatchObject({
      code: 'PUSH_TOKEN_OWNERSHIP_CONFLICT',
      status: 409,
    });
    expect(error.transferChallenge).toBeUndefined();
    expect('details' in error).toBe(false);
  },
);

test('ignores a valid-looking challenge on every other error code', async () => {
  const error = await failureFor({
    error: {
      code: 'DEVICE_REGISTRATION_CONFLICT',
      details: { transfer_challenge: VALID_CHALLENGE },
    },
  });

  expect(error.code).toBe('DEVICE_REGISTRATION_CONFLICT');
  expect(error.transferChallenge).toBeUndefined();
  expect(JSON.stringify(error)).not.toContain(VALID_CHALLENGE);
});

test.each([
  [401, 'AUTH_REQUIRED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [409, 'UNRELATED_CONFLICT'],
  [422, 'VALIDATION_ERROR'],
  [500, 'INTERNAL_SERVER_ERROR'],
])('preserves existing HTTP %i error semantics', async (status, code) => {
  const error = await failureFor({ error: { code } }, status);
  expect(error).toMatchObject({ code, status });
  expect(error.transferChallenge).toBeUndefined();
});

test('preserves bounded Retry-After metadata without exposing arbitrary details', async () => {
  const error = await failureFor(
    {
      error: {
        code: 'RATE_LIMITED',
        details: {
          transfer_challenge: VALID_CHALLENGE,
          ignored_field: 'discarded',
        },
      },
    },
    429,
    new Headers({ 'Retry-After': '20' }),
  );

  expect(error).toMatchObject({
    code: 'RATE_LIMITED',
    status: 429,
    retryAfterSeconds: 20,
  });
  expect(error.transferChallenge).toBeUndefined();
  expect('details' in error).toBe(false);
});

test('preserves network normalization without carrying a challenge', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('synthetic offline'));
  await expect(
    new ApiClient('https://api.example.test', 1_000).request('/bounded'),
  ).rejects.toMatchObject({
    code: 'NETWORK_UNAVAILABLE',
    status: 0,
    transferChallenge: undefined,
  });
});

test('preserves timeout normalization without carrying a challenge', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('synthetic timeout', 'AbortError'));
        });
      }),
  );

  await expect(
    new ApiClient('https://api.example.test', 1).request('/bounded'),
  ).rejects.toMatchObject({
    code: 'REQUEST_TIMEOUT',
    status: 0,
    transferChallenge: undefined,
  });
});
