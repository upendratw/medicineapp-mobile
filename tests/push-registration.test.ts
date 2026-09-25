import {
  BackendPushRegistrationService,
  DEFAULT_NOTIFICATION_COPY,
  PushRegistrationCoordinator,
  SecurePushRegistrationStore,
  type PushPermission,
  type PushPermissionGateway,
  type PushRegistrationService,
  type PushRegistrationStore,
} from '@/services/pushRegistration';
import { ApiError } from '@/api/client';
import type { NotificationDevicePushToken } from '@/services/notificationCapability';
import * as SecureStore from 'expo-secure-store';

class Gateway implements PushPermissionGateway {
  constructor(
    public state: PushPermission = 'granted',
    public pushToken: string | null = 'ExponentPushToken[synthetic]',
    public identifier: string | null = 'synthetic-device',
  ) {}
  runtimeStatus = jest.fn(
    (): ReturnType<PushPermissionGateway['runtimeStatus']> => 'supported',
  );
  permission = jest.fn(async () => this.state);
  token = jest.fn(
    async (_devicePushToken?: NotificationDevicePushToken) => this.pushToken,
  );
  deviceIdentifier = jest.fn(async () => this.identifier);
  platform = jest.fn(
    (): ReturnType<PushPermissionGateway['platform']> => 'android',
  );
  configureChannel = jest.fn(async () => undefined);
}

test('unsupported notification runtime never attempts permission, token, or backend registration', async () => {
  const gateway = new Gateway();
  gateway.runtimeStatus.mockReturnValue('unsupported_runtime');
  const backend = new Backend();
  await expect(
    new PushRegistrationCoordinator(gateway, backend, new Store()).register(
      true,
      true,
    ),
  ).resolves.toEqual({ status: 'unsupported_runtime' });
  expect(gateway.permission).not.toHaveBeenCalled();
  expect(gateway.token).not.toHaveBeenCalled();
  expect(gateway.configureChannel).not.toHaveBeenCalled();
  expect(backend.tokens).toHaveLength(0);
});
test('Personal Team runtime never attempts permission, token, or backend registration', async () => {
  const gateway = new Gateway();
  gateway.runtimeStatus.mockReturnValue('unsupported_personal_team');
  const backend = new Backend();
  await expect(
    new PushRegistrationCoordinator(gateway, backend, new Store()).register(
      true,
      true,
    ),
  ).resolves.toEqual({ status: 'unsupported_personal_team' });
  expect(gateway.permission).not.toHaveBeenCalled();
  expect(gateway.token).not.toHaveBeenCalled();
  expect(gateway.configureChannel).not.toHaveBeenCalled();
  expect(backend.tokens).toHaveLength(0);
});
class Backend implements PushRegistrationService {
  tokens: string[] = [];
  platforms: string[] = [];
  unregister = jest.fn(async () => undefined);
  async register(input: { pushToken: string; platform: string }) {
    this.tokens.push(input.pushToken);
    this.platforms.push(input.platform);
    return { deviceId: 'device-record' };
  }
}
class Store implements PushRegistrationStore {
  value: string | null = null;
  tuple: string | null = null;
  async readRegistrationId() {
    return this.value;
  }
  async writeRegistrationId(value: string) {
    this.value = value;
  }
  async readTupleFingerprint() {
    return this.tuple;
  }
  async writeTupleFingerprint(value: string) {
    this.tuple = value;
  }
  async clear() {
    this.value = null;
    this.tuple = null;
  }
}

test.each<PushPermission>(['denied', 'undetermined'])(
  'permission %s leaves app usable without token acquisition',
  async (permission) => {
    const gateway = new Gateway(permission);
    const backend = new Backend();
    await expect(
      new PushRegistrationCoordinator(gateway, backend, new Store()).register(
        false,
        true,
      ),
    ).resolves.toMatchObject({
      status: permission === 'denied' ? 'denied' : 'unavailable',
    });
    expect(gateway.token).not.toHaveBeenCalled();
    expect(backend.tokens).toHaveLength(0);
    expect(gateway.configureChannel).toHaveBeenCalledTimes(1);
  },
);
test('Android channel is configured before permission and token handling', async () => {
  const callOrder: string[] = [];
  const gateway = new Gateway();
  gateway.configureChannel.mockImplementation(async () => {
    callOrder.push('channel');
  });
  gateway.permission.mockImplementation(async () => {
    callOrder.push('permission');
    return 'granted';
  });
  gateway.token.mockImplementation(async () => {
    callOrder.push('token');
    return 'ExponentPushToken[synthetic]';
  });
  await new PushRegistrationCoordinator(
    gateway,
    new Backend(),
    new Store(),
  ).register(true, true);
  expect(callOrder).toEqual(['channel', 'permission', 'token']);
});
test('granted permission registers through backend and token rotation updates registration', async () => {
  const gateway = new Gateway();
  const backend = new Backend();
  const store = new Store();
  const coordinator = new PushRegistrationCoordinator(gateway, backend, store);
  await expect(coordinator.register(true, true)).resolves.toEqual({
    status: 'registered',
    deviceId: 'device-record',
  });
  gateway.pushToken = 'ExponentPushToken[rotated]';
  await coordinator.register(false, true);
  expect(backend.tokens).toEqual([
    'ExponentPushToken[synthetic]',
    'ExponentPushToken[rotated]',
  ]);
  expect(store.value).toBe('device-record');
});
test('successful registration tuple is deduplicated without persisting a raw token', async () => {
  const gateway = new Gateway();
  const backend = new Backend();
  const store = new Store();
  const coordinator = new PushRegistrationCoordinator(gateway, backend, store);
  await coordinator.register(false, true);
  await expect(coordinator.register(false, true)).resolves.toEqual({
    status: 'registered',
    deviceId: 'device-record',
  });
  expect(backend.tokens).toHaveLength(1);
  expect(store.tuple).toMatch(/^[a-f0-9]{64}$/);
  expect(store.tuple).not.toContain('ExponentPushToken');
});
test('concurrent registration calls share one backend operation', async () => {
  const backend = new Backend();
  let release!: () => void;
  backend.register = jest.fn(
    () =>
      new Promise(
        (resolve) => (release = () => resolve({ deviceId: 'device-record' })),
      ),
  );
  const coordinator = new PushRegistrationCoordinator(
    new Gateway(),
    backend,
    new Store(),
  );
  const first = coordinator.register(false, true);
  const second = coordinator.register(true, true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(backend.register).toHaveBeenCalledTimes(1);
  release();
  await expect(Promise.all([first, second])).resolves.toEqual([
    { status: 'registered', deviceId: 'device-record' },
    { status: 'registered', deviceId: 'device-record' },
  ]);
});
test('native token rotation is converted without reacquiring a device token and deduplicates events', async () => {
  const gateway = new Gateway();
  const backend = new Backend();
  const coordinator = new PushRegistrationCoordinator(
    gateway,
    backend,
    new Store(),
  );
  const nativeToken = {
    type: 'android',
    data: 'synthetic-native-token',
  } as const;
  await coordinator.registerRotatedToken(nativeToken, true);
  await coordinator.registerRotatedToken(nativeToken, true);
  expect(gateway.token).toHaveBeenCalledWith(nativeToken);
  expect(backend.tokens).toHaveLength(1);
});
test('genuine token rotation permits one new backend registration', async () => {
  const gateway = new Gateway();
  const backend = new Backend();
  const coordinator = new PushRegistrationCoordinator(
    gateway,
    backend,
    new Store(),
  );
  await coordinator.register(false, true);
  gateway.pushToken = 'ExponentPushToken[rotated]';
  await coordinator.registerRotatedToken(
    { type: 'android', data: 'rotated-native-token' },
    true,
  );
  expect(backend.tokens).toHaveLength(2);
});
test('429 returns bounded retryable state without an automatic retry', async () => {
  const backend = new Backend();
  backend.register = jest
    .fn()
    .mockRejectedValueOnce(new ApiError('RATE_LIMITED', 429, 20))
    .mockResolvedValueOnce({ deviceId: 'device-record' });
  const coordinator = new PushRegistrationCoordinator(
    new Gateway(),
    backend,
    new Store(),
  );
  await expect(coordinator.register(false, true)).resolves.toEqual({
    status: 'rate_limited',
    retryAfterSeconds: 20,
  });
  expect(backend.register).toHaveBeenCalledTimes(1);
  await expect(coordinator.register(false, true)).resolves.toMatchObject({
    status: 'registered',
  });
  expect(backend.register).toHaveBeenCalledTimes(2);
  await coordinator.register(false, true);
  expect(backend.register).toHaveBeenCalledTimes(2);
});
test('logout invalidates in-flight registration and revokes its stale completion', async () => {
  const backend = new Backend();
  let complete!: (value: { deviceId: string }) => void;
  backend.register = jest.fn(
    () => new Promise((resolve) => (complete = resolve)),
  );
  const store = new Store();
  const coordinator = new PushRegistrationCoordinator(
    new Gateway(),
    backend,
    store,
  );
  const registration = coordinator.register(false, true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await coordinator.unregister();
  complete({ deviceId: 'stale-device-record' });
  await expect(registration).resolves.toEqual({ status: 'unavailable' });
  expect(backend.unregister).toHaveBeenCalledWith('stale-device-record');
  expect(store.value).toBeNull();
  expect(store.tuple).toBeNull();
  backend.register = jest
    .fn()
    .mockResolvedValue({ deviceId: 'fresh-device-record' });
  await expect(coordinator.register(false, true)).resolves.toEqual({
    status: 'registered',
    deviceId: 'fresh-device-record',
  });
  expect(backend.register).toHaveBeenCalledTimes(1);
});
test('token unavailable and offline registration never fake backend success', async () => {
  const unavailable = new Gateway('granted', null);
  const backend = new Backend();
  await expect(
    new PushRegistrationCoordinator(unavailable, backend, new Store()).register(
      true,
      true,
    ),
  ).resolves.toMatchObject({ status: 'unavailable' });
  await expect(
    new PushRegistrationCoordinator(
      new Gateway(),
      backend,
      new Store(),
    ).register(true, false),
  ).resolves.toMatchObject({ status: 'offline' });
  expect(backend.tokens).toHaveLength(0);
});
test('backend registration failure is explicit and does not persist association', async () => {
  const backend = new Backend();
  backend.register = jest.fn().mockRejectedValue(new Error('synthetic'));
  const store = new Store();
  await expect(
    new PushRegistrationCoordinator(new Gateway(), backend, store).register(
      true,
      true,
    ),
  ).rejects.toThrow('synthetic');
  expect(store.value).toBeNull();
  expect(store.tuple).toBeNull();
});
test('logout unregisters and clears local association even when backend fails', async () => {
  const backend = new Backend();
  backend.unregister.mockRejectedValue(new Error('synthetic'));
  const store = new Store();
  store.value = 'device-record';
  await new PushRegistrationCoordinator(
    new Gateway(),
    backend,
    store,
  ).unregister();
  expect(backend.unregister).toHaveBeenCalledWith('device-record');
  expect(store.value).toBeNull();
});
test('backend adapter uses only real authenticated device endpoints', async () => {
  const client = {
    request: jest.fn().mockResolvedValue({ device_id: 'id', active: true }),
  };
  const service = new BackendPushRegistrationService(client as never);
  await service.register({
    deviceIdentifier: 'device',
    pushToken: 'private-token',
    platform: 'android',
    appVersion: '1.0.0',
    appEnvironment: 'development',
  });
  expect(client.request).toHaveBeenCalledWith(
    '/api/v1/devices',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
  expect(
    JSON.parse(client.request.mock.calls[0][1].body as string),
  ).toMatchObject({
    device_identifier: 'device',
    platform: 'android',
    push_provider: 'expo',
    app_environment: 'development',
  });
  await service.unregister('id');
  expect(client.request).toHaveBeenLastCalledWith(
    '/api/v1/devices/id',
    { method: 'DELETE' },
    true,
  );
});
test('supported iOS runtime uses the backend-mediated iOS registration contract', async () => {
  const gateway = new Gateway();
  gateway.platform.mockReturnValue('ios');
  const backend = new Backend();
  await expect(
    new PushRegistrationCoordinator(gateway, backend, new Store()).register(
      true,
      true,
    ),
  ).resolves.toMatchObject({ status: 'registered' });
  expect(backend.platforms).toEqual(['ios']);
});
test('generic default notification content contains no sensitive health details', () => {
  expect(DEFAULT_NOTIFICATION_COPY).toEqual({
    title: 'MedicineApp reminder',
    body: 'You have a scheduled medication reminder.',
  });
  expect(JSON.stringify(DEFAULT_NOTIFICATION_COPY)).not.toMatch(
    /metformin|mg|dose|symptom|caregiver|prescription|diagnos|side effect/i,
  );
});
test('push token is neither logged, routed, nor stored in AsyncStorage', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      process.cwd(),
      'src/services/pushRegistration.ts',
    ),
    'utf8',
  );
  expect(source).not.toMatch(
    /console\.|AsyncStorage|route.*pushToken|pushToken.*route/,
  );
});

test('corrupted secure registration metadata is cleared safely', async () => {
  const secureStore = jest.mocked(SecureStore);
  secureStore.getItemAsync.mockResolvedValueOnce('../unsafe');
  secureStore.deleteItemAsync.mockResolvedValue();
  await expect(
    new SecurePushRegistrationStore().readRegistrationId(),
  ).resolves.toBeNull();
  expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
    'medicineapp.secure.v1.push.registration-id',
  );
});
