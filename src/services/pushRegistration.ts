import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiClient, ApiError } from '@/api/client';
import { secureTokenStore } from '@/security/SecureTokenStore';
import { publicEnvironment } from '@/config/environment';
import {
  notificationCapability,
  type ExpoNotificationCapability,
  type NotificationPermission,
  type NotificationRuntimeStatus,
  type NotificationDevicePushToken,
} from '@/services/notificationCapability';
import { configureCaregiverNotificationChannel } from '@/services/caregiverNotificationChannel';
import { enforcePatientNotificationPrivacy } from '@/services/patientNotificationPrivacy';

export const NOTIFICATION_CHANNEL_ID = 'medicineapp-reminders-v4';
export const DEFAULT_NOTIFICATION_COPY = Object.freeze({
  title: 'Medicine reminder',
  body: "It's time for your scheduled medicine.",
});
const REGISTRATION_ID_KEY = 'medicineapp.secure.v1.push.registration-id';
const REGISTRATION_TUPLE_KEY = 'medicineapp.secure.v1.push.registration-tuple';
const FCM_REGISTRATION_ID_KEY =
  'medicineapp.secure.v1.push.fcm-registration-id';
const FCM_REGISTRATION_TUPLE_KEY =
  'medicineapp.secure.v1.push.fcm-registration-tuple';

export type PushPermission = NotificationPermission;
export type PushPlatform = 'android' | 'ios';
export type PushProvider = 'expo' | 'fcm';
export type PushRegistrationResult = Readonly<{
  status:
    | 'registered'
    | 'denied'
    | 'unavailable'
    | 'unsupported_runtime'
    | 'unsupported_personal_team'
    | 'offline'
    | 'rate_limited'
    | 'ownership_transfer_required';
  deviceId?: string;
  retryAfterSeconds?: number;
}>;
type RegistrationInput = Readonly<{
  deviceIdentifier: string;
  pushToken: string;
  platform: PushPlatform;
  appVersion: string | null;
  appEnvironment: 'development' | 'test' | 'staging' | 'production';
  pushProvider: PushProvider;
}>;
export type OwnershipTransferEvidence = Readonly<
  RegistrationInput & {
    transferChallenge: string;
    tupleFingerprint: string;
    generation: number;
  }
>;
export type PushRegistrationAttemptResult = PushRegistrationResult &
  Readonly<{ transferEvidence?: OwnershipTransferEvidence }>;
export interface PushPermissionGateway {
  runtimeStatus(): NotificationRuntimeStatus;
  permission(request: boolean): Promise<PushPermission>;
  token(devicePushToken?: NotificationDevicePushToken): Promise<string | null>;
  nativeToken(
    devicePushToken?: NotificationDevicePushToken,
  ): Promise<NotificationDevicePushToken | null>;
  deviceIdentifier(): Promise<string | null>;
  platform(): PushPlatform | null;
  configureChannel(): Promise<void>;
}
export interface PushRegistrationService {
  register(input: RegistrationInput): Promise<{ deviceId: string }>;
  transferOwnership?(
    input: RegistrationInput & { transferChallenge: string },
  ): Promise<{ deviceId: string; transferred: boolean }>;
  unregister(deviceId: string): Promise<void>;
}
export interface PushRegistrationStore {
  readRegistrationId(provider?: PushProvider): Promise<string | null>;
  writeRegistrationId(value: string, provider?: PushProvider): Promise<void>;
  readTupleFingerprint(provider?: PushProvider): Promise<string | null>;
  writeTupleFingerprint(value: string, provider?: PushProvider): Promise<void>;
  clear(): Promise<void>;
}

export class ExpoPushPermissionGateway implements PushPermissionGateway {
  constructor(
    private readonly capability: ExpoNotificationCapability = notificationCapability,
  ) {}
  runtimeStatus(): NotificationRuntimeStatus {
    return this.capability.status();
  }
  async permission(request: boolean): Promise<PushPermission> {
    return (await this.capability.permission(request)) ?? 'undetermined';
  }
  async token(
    devicePushToken?: NotificationDevicePushToken,
  ): Promise<string | null> {
    await this.capability.verifyReminderCategoryBeforeDeviceRegistration();
    if (!Device.isDevice) return null;
    const projectId = Constants.easConfig?.projectId;
    if (!projectId) return null;
    return this.capability.expoPushToken(projectId, devicePushToken);
  }
  async nativeToken(
    devicePushToken?: NotificationDevicePushToken,
  ): Promise<NotificationDevicePushToken | null> {
    if (devicePushToken) return devicePushToken;
    if (!Device.isDevice) return null;
    try {
      return await (
        await import('expo-notifications')
      ).getDevicePushTokenAsync();
    } catch {
      return null;
    }
  }
  async deviceIdentifier(): Promise<string | null> {
    if (Platform.OS === 'android') return Application.getAndroidId();
    if (Platform.OS === 'ios') return Application.getIosIdForVendorAsync();
    return null;
  }
  platform(): PushPlatform | null {
    return Platform.OS === 'android' || Platform.OS === 'ios'
      ? Platform.OS
      : null;
  }
  async configureChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await this.capability.configureAndroidChannel(NOTIFICATION_CHANNEL_ID);
      await enforcePatientNotificationPrivacy();
      await configureCaregiverNotificationChannel();
    }
    await this.capability.configureReminderCategory();
    await this.capability.configureForegroundPresentation();
  }
}

export class BackendPushRegistrationService implements PushRegistrationService {
  constructor(private readonly client: ApiClient) {}
  async register(input: RegistrationInput): Promise<{ deviceId: string }> {
    const data = await this.client.request<{
      device_id: string;
      active: boolean;
    }>(
      '/api/v1/devices',
      {
        method: 'POST',
        body: JSON.stringify({
          device_identifier: input.deviceIdentifier,
          platform: input.platform,
          push_token: input.pushToken,
          app_version: input.appVersion,
          push_provider: input.pushProvider,
          app_environment: input.appEnvironment,
        }),
      },
      true,
    );
    if (!data.active || !data.device_id)
      throw new Error('Push registration was not confirmed');
    return { deviceId: data.device_id };
  }
  async unregister(deviceId: string): Promise<void> {
    await this.client.request(
      `/api/v1/devices/${encodeURIComponent(deviceId)}`,
      { method: 'DELETE' },
      true,
    );
  }
  async transferOwnership(
    input: RegistrationInput & { transferChallenge: string },
  ): Promise<{ deviceId: string; transferred: boolean }> {
    const data = await this.client.request<{
      device_id: string;
      active: boolean;
      transferred: boolean;
    }>(
      '/api/v1/devices/transfer',
      {
        method: 'POST',
        body: JSON.stringify({
          device_identifier: input.deviceIdentifier,
          platform: input.platform,
          push_provider: input.pushProvider,
          app_environment: input.appEnvironment,
          push_token: input.pushToken,
          transfer_challenge: input.transferChallenge,
          app_version: input.appVersion,
        }),
      },
      true,
    );
    if (!data.active || !data.device_id)
      throw new Error('Push ownership transfer was not confirmed');
    return { deviceId: data.device_id, transferred: data.transferred };
  }
}

export class SecurePushRegistrationStore implements PushRegistrationStore {
  async readRegistrationId(provider: PushProvider = 'expo') {
    const value = await SecureStore.getItemAsync(
      provider === 'fcm' ? FCM_REGISTRATION_ID_KEY : REGISTRATION_ID_KEY,
    );
    if (value && !/^[A-Za-z0-9_-]{1,200}$/.test(value)) {
      await this.clear();
      return null;
    }
    return value;
  }
  async writeRegistrationId(value: string, provider: PushProvider = 'expo') {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(value))
      throw new Error('Invalid registration identifier');
    await SecureStore.setItemAsync(
      provider === 'fcm' ? FCM_REGISTRATION_ID_KEY : REGISTRATION_ID_KEY,
      value,
    );
  }
  async readTupleFingerprint(provider: PushProvider = 'expo') {
    const key =
      provider === 'fcm' ? FCM_REGISTRATION_TUPLE_KEY : REGISTRATION_TUPLE_KEY;
    const value = await SecureStore.getItemAsync(key);
    if (value && !/^[a-f0-9]{64}$/.test(value)) {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
    return value;
  }
  async writeTupleFingerprint(value: string, provider: PushProvider = 'expo') {
    if (!/^[a-f0-9]{64}$/.test(value))
      throw new Error('Invalid registration tuple fingerprint');
    await SecureStore.setItemAsync(
      provider === 'fcm' ? FCM_REGISTRATION_TUPLE_KEY : REGISTRATION_TUPLE_KEY,
      value,
    );
  }
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(REGISTRATION_ID_KEY),
      SecureStore.deleteItemAsync(REGISTRATION_TUPLE_KEY),
      SecureStore.deleteItemAsync(FCM_REGISTRATION_ID_KEY),
      SecureStore.deleteItemAsync(FCM_REGISTRATION_TUPLE_KEY),
    ]);
  }
}

type TupleHasher = (parts: readonly string[]) => Promise<string>;
const hashTuple: TupleHasher = (parts) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(parts),
  );

export class PushRegistrationCoordinator {
  private inFlight: Promise<PushRegistrationAttemptResult> | null = null;
  private transferInFlight: Promise<PushRegistrationResult> | null = null;
  private generation = 0;

  constructor(
    private readonly gateway: PushPermissionGateway,
    private readonly backend: PushRegistrationService,
    private readonly store: PushRegistrationStore,
    private readonly tupleHasher: TupleHasher = hashTuple,
  ) {}
  async register(
    requestPermission: boolean,
    online: boolean,
  ): Promise<PushRegistrationAttemptResult> {
    return this.singleFlight(requestPermission, online);
  }

  async registerForAuthenticatedSession(
    requestPermission: boolean,
    online: boolean,
  ): Promise<PushRegistrationAttemptResult> {
    return this.singleFlight(requestPermission, online, undefined, true);
  }

  confirmOwnershipTransfer(
    evidence: OwnershipTransferEvidence,
  ): Promise<PushRegistrationResult> {
    if (this.transferInFlight) return this.transferInFlight;
    const pending = this.performOwnershipTransfer(evidence);
    this.transferInFlight = pending;
    const clear = () => {
      if (this.transferInFlight === pending) this.transferInFlight = null;
    };
    void pending.then(clear, clear);
    return pending;
  }

  async registerRotatedToken(
    devicePushToken: NotificationDevicePushToken,
    online: boolean,
  ): Promise<PushRegistrationAttemptResult> {
    return this.singleFlight(false, online, devicePushToken);
  }

  private singleFlight(
    requestPermission: boolean,
    online: boolean,
    devicePushToken?: NotificationDevicePushToken,
    revalidateExisting = false,
  ): Promise<PushRegistrationAttemptResult> {
    if (this.inFlight) return this.inFlight;
    const generation = this.generation;
    const pending = this.performRegistration(
      requestPermission,
      online,
      generation,
      devicePushToken,
      revalidateExisting,
    );
    this.inFlight = pending;
    const clear = () => {
      if (this.inFlight === pending) this.inFlight = null;
    };
    void pending.then(clear, clear);
    return pending;
  }

  private async performRegistration(
    requestPermission: boolean,
    online: boolean,
    generation: number,
    devicePushToken?: NotificationDevicePushToken,
    revalidateExisting = false,
  ): Promise<PushRegistrationAttemptResult> {
    const runtimeStatus = this.gateway.runtimeStatus();
    if (runtimeStatus !== 'supported') {
      return { status: runtimeStatus };
    }
    // Android 13 does not surface the notification permission prompt until a
    // channel exists. Expo also requires channel creation before push-token
    // acquisition, so establish the channel before inspecting/requesting
    // permission. This is a no-op on iOS.
    await this.gateway.configureChannel();
    const permission = await this.gateway.permission(requestPermission);
    if (permission === 'denied') return { status: 'denied' };
    if (permission !== 'granted') return { status: 'unavailable' };
    if (!online) return { status: 'offline' };
    const platform = this.gateway.platform();
    if (!platform) return { status: 'unavailable' };
    const [nativeToken, deviceIdentifier] = await Promise.all([
      this.gateway.nativeToken(devicePushToken),
      this.gateway.deviceIdentifier(),
    ]);
    const expoToken = await this.gateway.token(nativeToken ?? undefined);
    if (!expoToken || !deviceIdentifier) return { status: 'unavailable' };
    const candidates: Readonly<{
      provider: PushProvider;
      token: string;
    }>[] = [{ provider: 'expo', token: expoToken }];
    if (
      platform === 'android' &&
      nativeToken?.type === 'android' &&
      typeof nativeToken.data === 'string' &&
      nativeToken.data
    ) {
      candidates.push({ provider: 'fcm', token: nativeToken.data });
    } else if (platform === 'android') {
      return { status: 'unavailable' };
    }

    let primaryDeviceId: string | undefined;
    for (const candidate of candidates) {
      const outcome = await this.registerProvider({
        provider: candidate.provider,
        pushToken: candidate.token,
        deviceIdentifier,
        platform,
        generation,
        revalidateExisting,
      });
      if (outcome.status !== 'registered') return outcome;
      if (candidate.provider === 'expo') primaryDeviceId = outcome.deviceId;
    }
    return primaryDeviceId
      ? { status: 'registered', deviceId: primaryDeviceId }
      : { status: 'unavailable' };
  }

  private async registerProvider(input: {
    provider: PushProvider;
    pushToken: string;
    deviceIdentifier: string;
    platform: PushPlatform;
    generation: number;
    revalidateExisting: boolean;
  }): Promise<PushRegistrationAttemptResult> {
    const tupleFingerprint = await this.tupleHasher([
      input.pushToken,
      input.deviceIdentifier,
      input.platform,
      input.provider,
      publicEnvironment.appEnvironment,
    ]);
    const [currentFingerprint, currentDeviceId] = await Promise.all([
      this.store.readTupleFingerprint(input.provider),
      this.store.readRegistrationId(input.provider),
    ]);
    if (
      !input.revalidateExisting &&
      currentFingerprint === tupleFingerprint &&
      currentDeviceId
    ) {
      return { status: 'registered', deviceId: currentDeviceId };
    }
    let result: { deviceId: string };
    try {
      result = await this.backend.register({
        deviceIdentifier: input.deviceIdentifier,
        pushToken: input.pushToken,
        platform: input.platform,
        pushProvider: input.provider,
        appVersion: Constants.expoConfig?.version ?? null,
        appEnvironment: publicEnvironment.appEnvironment,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'PUSH_TOKEN_OWNERSHIP_CONFLICT' &&
        typeof error.transferChallenge === 'string' &&
        /^[0-9]{1,20}\.[a-f0-9]{64}$/.test(error.transferChallenge) &&
        error.transferChallenge.length >= 12 &&
        error.transferChallenge.length <= 96
      ) {
        return {
          status: 'ownership_transfer_required',
          transferEvidence: Object.freeze({
            deviceIdentifier: input.deviceIdentifier,
            pushToken: input.pushToken,
            platform: input.platform,
            pushProvider: input.provider,
            appVersion: Constants.expoConfig?.version ?? null,
            appEnvironment: publicEnvironment.appEnvironment,
            transferChallenge: error.transferChallenge,
            tupleFingerprint,
            generation: input.generation,
          }),
        };
      }
      if (error instanceof ApiError && error.status === 429) {
        return {
          status: 'rate_limited',
          retryAfterSeconds: error.retryAfterSeconds,
        };
      }
      throw error;
    }
    if (input.generation !== this.generation) {
      await this.revokeStale(result.deviceId);
      return { status: 'unavailable' };
    }
    await Promise.all([
      this.store.writeRegistrationId(result.deviceId, input.provider),
      this.store.writeTupleFingerprint(tupleFingerprint, input.provider),
    ]);
    if (input.generation !== this.generation) {
      await this.store.clear();
      await this.revokeStale(result.deviceId);
      return { status: 'unavailable' };
    }
    return { status: 'registered', deviceId: result.deviceId };
  }

  private async performOwnershipTransfer(
    evidence: OwnershipTransferEvidence,
  ): Promise<PushRegistrationResult> {
    if (
      evidence.generation !== this.generation ||
      !/^[0-9]{1,20}\.[a-f0-9]{64}$/.test(evidence.transferChallenge) ||
      !this.backend.transferOwnership
    ) {
      return { status: 'unavailable' };
    }
    const result = await this.backend.transferOwnership({
      deviceIdentifier: evidence.deviceIdentifier,
      pushToken: evidence.pushToken,
      platform: evidence.platform,
      pushProvider: evidence.pushProvider,
      appVersion: evidence.appVersion,
      appEnvironment: evidence.appEnvironment,
      transferChallenge: evidence.transferChallenge,
    });
    if (evidence.generation !== this.generation) {
      await this.revokeStale(result.deviceId);
      return { status: 'unavailable' };
    }
    await Promise.all([
      this.store.writeRegistrationId(result.deviceId, evidence.pushProvider),
      this.store.writeTupleFingerprint(
        evidence.tupleFingerprint,
        evidence.pushProvider,
      ),
    ]);
    if (evidence.generation !== this.generation) {
      await this.store.clear();
      await this.revokeStale(result.deviceId);
      return { status: 'unavailable' };
    }
    return { status: 'registered', deviceId: result.deviceId };
  }

  private async revokeStale(deviceId: string): Promise<void> {
    try {
      await this.backend.unregister(deviceId);
    } catch {
      /* Logout already cleared local state; stale registration stays untrusted. */
    }
  }

  async unregister(): Promise<void> {
    this.generation += 1;
    this.inFlight = null;
    this.transferInFlight = null;
    const deviceIds = await Promise.all([
      this.store.readRegistrationId('expo'),
      this.store.readRegistrationId('fcm'),
    ]);
    try {
      for (const deviceId of deviceIds) {
        if (!deviceId) continue;
        try {
          await this.backend.unregister(deviceId);
        } catch {
          /* Continue revoking other provider registrations before local clear. */
        }
      }
    } finally {
      await this.store.clear();
    }
  }
}

export const pushRegistrationCoordinator = new PushRegistrationCoordinator(
  new ExpoPushPermissionGateway(),
  new BackendPushRegistrationService(
    new ApiClient(undefined, undefined, secureTokenStore),
  ),
  new SecurePushRegistrationStore(),
);
