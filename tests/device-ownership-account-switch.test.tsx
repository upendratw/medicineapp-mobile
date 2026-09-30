import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import {
  BackendPushRegistrationService,
  PushRegistrationCoordinator,
  pushRegistrationCoordinator,
  type OwnershipTransferEvidence,
  type PushPermissionGateway,
  type PushRegistrationService,
  type PushRegistrationStore,
} from '@/services/pushRegistration';
import type { NotificationDevicePushToken } from '@/services/notificationCapability';

const mockAuthState = { status: 'authenticated' };
const mockAddReceivedListener = jest.fn().mockResolvedValue(null);
const mockAddResponseListener = jest.fn().mockResolvedValue(null);
const mockAddPushTokenListener = jest.fn().mockResolvedValue(null);
const mockLastResponse = jest.fn().mockResolvedValue(null);

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('@/state/NetworkContext', () => ({
  useOnline: () => true,
}));
jest.mock('@/navigation/DeepLinkContext', () => ({
  useDeepLinkIntent: () => ({ acceptNotification: jest.fn() }),
}));
jest.mock('@/services/notificationCapability', () => ({
  notificationCapability: {
    addReceivedListener: (...args: unknown[]) =>
      mockAddReceivedListener(...args),
    addResponseListener: (...args: unknown[]) =>
      mockAddResponseListener(...args),
    addPushTokenListener: (...args: unknown[]) =>
      mockAddPushTokenListener(...args),
    lastResponse: (...args: unknown[]) => mockLastResponse(...args),
  },
}));
jest.mock('@/services/registry', () => ({
  notificationActionCoordinator: {
    capture: jest.fn().mockResolvedValue(null),
    process: jest.fn().mockResolvedValue({ status: 'none' }),
  },
}));

import {
  PushRegistrationProvider,
  usePushRegistration,
} from '@/state/PushRegistrationContext';

const CHALLENGE = `1700000000.${'a'.repeat(64)}`;
const HASH = 'b'.repeat(64);

class Gateway implements PushPermissionGateway {
  runtimeStatus = jest.fn(() => 'supported' as const);
  permission = jest.fn(async () => 'granted' as const);
  token = jest.fn(async () => 'ExponentPushToken[synthetic-account-switch]');
  nativeToken = jest.fn(
    async (
      supplied?: NotificationDevicePushToken,
    ): Promise<NotificationDevicePushToken> =>
      supplied ?? { type: 'android', data: 'synthetic-native-token' },
  );
  deviceIdentifier = jest.fn(async () => 'synthetic-installation');
  platform = jest.fn(() => 'android' as const);
  configureChannel = jest.fn(async () => undefined);
}

class Backend implements PushRegistrationService {
  register = jest.fn(async () => ({ deviceId: 'normal-device' }));
  transferOwnership = jest.fn(
    async (_input: {
      deviceIdentifier: string;
      pushToken: string;
      platform: 'android' | 'ios';
      appVersion: string | null;
      appEnvironment: 'development' | 'test' | 'staging' | 'production';
      pushProvider: 'expo' | 'fcm';
      transferChallenge: string;
    }) => ({
      deviceId: 'transferred-device',
      transferred: true,
    }),
  );
  unregister = jest.fn(async () => undefined);
}

class Store implements PushRegistrationStore {
  registrationId: string | null = null;
  fingerprint: string | null = null;
  readRegistrationId = jest.fn(async () => this.registrationId);
  writeRegistrationId = jest.fn(async (value: string) => {
    this.registrationId = value;
  });
  readTupleFingerprint = jest.fn(async () => this.fingerprint);
  writeTupleFingerprint = jest.fn(async (value: string) => {
    this.fingerprint = value;
  });
  clear = jest.fn(async () => {
    this.registrationId = null;
    this.fingerprint = null;
  });
}

const evidence = (): OwnershipTransferEvidence => ({
  deviceIdentifier: 'synthetic-installation',
  pushToken: 'ExponentPushToken[synthetic-account-switch]',
  platform: 'android',
  appVersion: '1.0.0',
  appEnvironment: 'development',
  pushProvider: 'expo',
  transferChallenge: CHALLENGE,
  tupleFingerprint: HASH,
  generation: 0,
});

describe('account-switch registration service', () => {
  test('normal registration stays first and a valid typed conflict returns ephemeral transfer evidence', async () => {
    const backend = new Backend();
    backend.register.mockRejectedValueOnce(
      new ApiError('PUSH_TOKEN_OWNERSHIP_CONFLICT', 409, undefined, CHALLENGE),
    );
    const coordinator = new PushRegistrationCoordinator(
      new Gateway(),
      backend,
      new Store(),
      async () => HASH,
    );

    const result = await coordinator.register(false, true);

    expect(backend.register).toHaveBeenCalledTimes(1);
    expect(backend.transferOwnership).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'ownership_transfer_required',
      transferEvidence: {
        transferChallenge: CHALLENGE,
        pushToken: 'ExponentPushToken[synthetic-account-switch]',
      },
    });
  });

  test.each([
    new ApiError('PUSH_TOKEN_OWNERSHIP_CONFLICT', 409),
    new ApiError('OTHER_CONFLICT', 409, undefined, CHALLENGE),
    new ApiError('AUTH_REQUIRED', 401),
    new ApiError('FORBIDDEN', 403),
    new Error('network'),
  ])('does not enable transfer for unqualified failure %#', async (failure) => {
    const backend = new Backend();
    backend.register.mockRejectedValueOnce(failure);
    const coordinator = new PushRegistrationCoordinator(
      new Gateway(),
      backend,
      new Store(),
      async () => HASH,
    );
    await expect(coordinator.register(false, true)).rejects.toBe(failure);
    expect(backend.transferOwnership).not.toHaveBeenCalled();
  });

  test('explicit transfer sends the exact bounded contract and stores authoritative metadata', async () => {
    const backend = new Backend();
    const store = new Store();
    const coordinator = new PushRegistrationCoordinator(
      new Gateway(),
      backend,
      store,
      async () => HASH,
    );

    await expect(
      coordinator.confirmOwnershipTransfer(evidence()),
    ).resolves.toEqual({
      status: 'registered',
      deviceId: 'transferred-device',
    });
    expect(backend.transferOwnership).toHaveBeenCalledWith({
      deviceIdentifier: 'synthetic-installation',
      pushToken: 'ExponentPushToken[synthetic-account-switch]',
      platform: 'android',
      appVersion: '1.0.0',
      appEnvironment: 'development',
      pushProvider: 'expo',
      transferChallenge: CHALLENGE,
    });
    expect(store.registrationId).toBe('transferred-device');
    expect(store.fingerprint).toBe(HASH);
    const sent = backend.transferOwnership.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(sent).not.toHaveProperty('ownerId');
    expect(sent).not.toHaveProperty('patientId');
    expect(sent).not.toHaveProperty('caregiverId');
    expect(sent).not.toHaveProperty('relationshipId');
  });

  test('double confirmation shares one transfer request', async () => {
    const backend = new Backend();
    let release!: () => void;
    backend.transferOwnership.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ deviceId: 'transferred-device', transferred: true });
        }),
    );
    const coordinator = new PushRegistrationCoordinator(
      new Gateway(),
      backend,
      new Store(),
      async () => HASH,
    );
    const pendingEvidence = evidence();
    const first = coordinator.confirmOwnershipTransfer(pendingEvidence);
    const second = coordinator.confirmOwnershipTransfer(pendingEvidence);
    expect(backend.transferOwnership).toHaveBeenCalledTimes(1);
    release();
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(backend.transferOwnership).toHaveBeenCalledTimes(1);
  });

  test('backend transfer adapter uses the reviewed endpoint and field names', async () => {
    const request = jest.fn().mockResolvedValue({
      device_id: 'authoritative-device',
      active: true,
      transferred: true,
    });
    const service = new BackendPushRegistrationService({ request } as never);
    await expect(
      service.transferOwnership({
        ...evidence(),
        transferChallenge: CHALLENGE,
      }),
    ).resolves.toEqual({
      deviceId: 'authoritative-device',
      transferred: true,
    });
    expect(request).toHaveBeenCalledWith(
      '/api/v1/devices/transfer',
      {
        method: 'POST',
        body: JSON.stringify({
          device_identifier: 'synthetic-installation',
          platform: 'android',
          push_provider: 'expo',
          app_environment: 'development',
          push_token: 'ExponentPushToken[synthetic-account-switch]',
          transfer_challenge: CHALLENGE,
          app_version: '1.0.0',
        }),
      },
      true,
    );
  });
});

function ContextProbe() {
  const state = usePushRegistration();
  return (
    <>
      <Text>{state.result?.status ?? 'none'}</Text>
      <Text>
        {state.ownershipTransferRequired ? 'decision-open' : 'decision-closed'}
      </Text>
      <Pressable accessibilityRole="button" onPress={state.register}>
        <Text>register manually</Text>
      </Pressable>
    </>
  );
}

describe('account-switch context and privacy-safe confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.status = 'authenticated';
    jest
      .spyOn(pushRegistrationCoordinator, 'register')
      .mockResolvedValue({ status: 'registered', deviceId: 'normal-device' });
    jest
      .spyOn(pushRegistrationCoordinator, 'registerRotatedToken')
      .mockResolvedValue({ status: 'registered', deviceId: 'normal-device' });
    jest
      .spyOn(pushRegistrationCoordinator, 'confirmOwnershipTransfer')
      .mockResolvedValue({
        status: 'registered',
        deviceId: 'transferred-device',
      });
  });

  afterEach(() => jest.restoreAllMocks());

  test('conflict waits for explicit confirmation and cancel performs no transfer or unregister', async () => {
    const pendingEvidence = evidence();
    jest.spyOn(pushRegistrationCoordinator, 'register').mockResolvedValue({
      status: 'ownership_transfer_required',
      transferEvidence: pendingEvidence,
    });
    const transfer = jest.spyOn(
      pushRegistrationCoordinator,
      'confirmOwnershipTransfer',
    );
    const unregister = jest.spyOn(pushRegistrationCoordinator, 'unregister');
    const screen = await render(
      <PushRegistrationProvider>
        <ContextProbe />
      </PushRegistrationProvider>,
    );
    await waitFor(() => expect(screen.getByText('decision-open')).toBeTruthy());
    expect(transfer).not.toHaveBeenCalled();
    expect(
      screen.getByText(/currently registered to another MedicineApp account/),
    ).toBeTruthy();
    expect(
      screen.queryByText(/Patient|Caregiver|ExponentPushToken|1700000000/),
    ).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.getByText('decision-closed')).toBeTruthy(),
    );
    expect(transfer).not.toHaveBeenCalled();
    expect(unregister).not.toHaveBeenCalled();
    expect(mockAuthState.status).toBe('authenticated');
  });

  test('confirm invokes one transfer, guards a double tap, and clears the decision on success', async () => {
    const pendingEvidence = evidence();
    jest.spyOn(pushRegistrationCoordinator, 'register').mockResolvedValue({
      status: 'ownership_transfer_required',
      transferEvidence: pendingEvidence,
    });
    let release!: () => void;
    const transfer = jest
      .spyOn(pushRegistrationCoordinator, 'confirmOwnershipTransfer')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve({ status: 'registered', deviceId: 'transferred-device' });
          }),
      );
    const screen = await render(
      <PushRegistrationProvider>
        <ContextProbe />
      </PushRegistrationProvider>,
    );
    await waitFor(() => expect(screen.getByText('decision-open')).toBeTruthy());
    const confirm = screen.getByRole('button', { name: 'Use This Device' });
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(transfer).toHaveBeenCalledWith(pendingEvidence);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Cancel' }).props.accessibilityState
          .disabled,
      ).toBe(true),
    );
    release();
    await waitFor(() =>
      expect(screen.getByText('decision-closed')).toBeTruthy(),
    );
    expect(screen.getByText('registered')).toBeTruthy();
    expect(pushRegistrationCoordinator.register).toHaveBeenCalledTimes(1);
  });

  test('transfer failure closes ephemeral decision without unregister, retry, or logout', async () => {
    jest.spyOn(pushRegistrationCoordinator, 'register').mockResolvedValue({
      status: 'ownership_transfer_required',
      transferEvidence: evidence(),
    });
    const transfer = jest
      .spyOn(pushRegistrationCoordinator, 'confirmOwnershipTransfer')
      .mockRejectedValue(
        new ApiError('DEVICE_OWNERSHIP_TRANSFER_CONFLICT', 409),
      );
    const unregister = jest.spyOn(pushRegistrationCoordinator, 'unregister');
    const screen = await render(
      <PushRegistrationProvider>
        <ContextProbe />
      </PushRegistrationProvider>,
    );
    await waitFor(() => expect(screen.getByText('decision-open')).toBeTruthy());
    await fireEvent.press(
      screen.getByRole('button', { name: 'Use This Device' }),
    );
    await waitFor(() => expect(screen.getByText('unavailable')).toBeTruthy());
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(unregister).not.toHaveBeenCalled();
    expect(pushRegistrationCoordinator.register).toHaveBeenCalledTimes(1);
    expect(mockAuthState.status).toBe('authenticated');
  });
});
