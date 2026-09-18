import { ApiClient } from '@/api/client';
import { SessionEvents } from '@/security/SessionEvents';
import type { SecureTokenStore, TokenPair } from '@/security/SecureTokenStore';

class Store implements SecureTokenStore {
  constructor(public tokens: TokenPair | null = null) {}
  read = jest.fn(async () => this.tokens);
  write = jest.fn(async (tokens: TokenPair) => {
    this.tokens = tokens;
  });
  clear = jest.fn(async () => {
    this.tokens = null;
  });
}

const response = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }) as Response;
const session = (): TokenPair => ({
  accessToken: 'old-access',
  refreshToken: 'valid-refresh',
});

beforeEach(() => jest.restoreAllMocks());

test('valid restored session sends the access token and succeeds', async () => {
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(response({ data: { ok: true } }));
  await expect(
    new ApiClient(
      'https://api.example.test',
      1_000,
      new Store(session()),
    ).request('/protected', {}, true),
  ).resolves.toEqual({ ok: true });
  expect(
    new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization'),
  ).toBe('Bearer old-access');
});

test('expired access token refreshes once, rotates storage, and retries once', async () => {
  const store = new Store(session());
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(response({ error: { code: 'TOKEN_EXPIRED' } }, 401))
    .mockResolvedValueOnce(
      response({
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      }),
    )
    .mockResolvedValueOnce(response({ data: { ok: true } }));
  await expect(
    new ApiClient('https://api.example.test', 1_000, store).request(
      '/protected',
      {},
      true,
    ),
  ).resolves.toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls[1][0]).toBe(
    'https://api.example.test/api/v1/auth/refresh',
  );
  expect(fetchMock.mock.calls[1][1]?.body).toBe(
    JSON.stringify({ refresh_token: 'valid-refresh' }),
  );
  expect(store.write).toHaveBeenCalledWith({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  expect(
    new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization'),
  ).toBe('Bearer new-access');
});

test('rejected refresh clears secrets and announces session invalidation', async () => {
  const store = new Store(session());
  const events = new SessionEvents();
  const invalidated = jest.fn();
  events.subscribe(invalidated);
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(response({ error: { code: 'TOKEN_EXPIRED' } }, 401))
    .mockResolvedValueOnce(
      response({ error: { code: 'REFRESH_REJECTED' } }, 401),
    );
  await expect(
    new ApiClient(
      'https://api.example.test',
      1_000,
      store,
      undefined,
      events,
    ).request('/protected', {}, true),
  ).rejects.toMatchObject({ code: 'SESSION_EXPIRED', status: 401 });
  expect(store.clear).toHaveBeenCalledTimes(1);
  expect(invalidated).toHaveBeenCalledTimes(1);
});

test('missing refresh credentials fails closed and announces Login transition', async () => {
  const store = new Store(null);
  const events = new SessionEvents();
  const invalidated = jest.fn();
  events.subscribe(invalidated);
  const fetchMock = jest.spyOn(global, 'fetch');
  await expect(
    new ApiClient(
      'https://api.example.test',
      1_000,
      store,
      undefined,
      events,
    ).request('/protected', {}, true),
  ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(store.clear).toHaveBeenCalledTimes(1);
  expect(invalidated).toHaveBeenCalledTimes(1);
});

test('a repeated 401 stops after one refresh and one retry', async () => {
  const store = new Store(session());
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(response({}, 401))
    .mockResolvedValueOnce(
      response({
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      }),
    )
    .mockResolvedValueOnce(response({}, 401));
  await expect(
    new ApiClient('https://api.example.test', 1_000, store).request(
      '/protected',
      {},
      true,
    ),
  ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(store.clear).toHaveBeenCalledTimes(1);
});

test('concurrent 401 responses share one refresh operation', async () => {
  const store = new Store(session());
  let releaseRefresh!: () => void;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  let refreshCalls = 0;
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockImplementation(async (input, init) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await refreshGate;
        return response({
          data: { access_token: 'new-access', refresh_token: 'new-refresh' },
        });
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      return authorization === 'Bearer old-access'
        ? response({}, 401)
        : response({ data: { ok: true } });
    });
  const client = new ApiClient('https://api.example.test', 1_000, store);
  const requests = [
    client.request('/protected-a', {}, true),
    client.request('/protected-b', {}, true),
  ];
  await Promise.resolve();
  await Promise.resolve();
  releaseRefresh();
  await expect(Promise.all(requests)).resolves.toEqual([
    { ok: true },
    { ok: true },
  ]);
  expect(refreshCalls).toBe(1);
  expect(fetchMock).toHaveBeenCalledTimes(5);
});

test.each([403, 500, 503])(
  'HTTP %i does not refresh or clear the session',
  async (status) => {
    const store = new Store(session());
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        response({ error: { code: `HTTP_${status}` } }, status),
      );
    await expect(
      new ApiClient('https://api.example.test', 1_000, store).request(
        '/protected',
        {},
        true,
      ),
    ).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.clear).not.toHaveBeenCalled();
  },
);

test('ordinary network failure does not clear the session', async () => {
  const store = new Store(session());
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  await expect(
    new ApiClient('https://api.example.test', 1_000, store).request(
      '/protected',
      {},
      true,
    ),
  ).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' });
  expect(store.clear).not.toHaveBeenCalled();
});

test('refresh network and server failures preserve the session', async () => {
  for (const refreshFailure of [new Error('offline'), response({}, 503)]) {
    const store = new Store(session());
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({}, 401));
    if (refreshFailure instanceof Error)
      fetchMock.mockRejectedValueOnce(refreshFailure);
    else fetchMock.mockResolvedValueOnce(refreshFailure);
    await expect(
      new ApiClient('https://api.example.test', 1_000, store).request(
        '/protected',
        {},
        true,
      ),
    ).rejects.toBeDefined();
    expect(store.clear).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  }
});

test('auth credentials are never stored in AsyncStorage or logged', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const sources = [
    'api/client.ts',
    'security/SecureTokenStore.ts',
    'state/AuthContext.tsx',
  ]
    .map((file) =>
      fs.readFileSync(path.join(process.cwd(), 'src', file), 'utf8'),
    )
    .join('\n');
  expect(sources).not.toMatch(/AsyncStorage|console\./);
});
