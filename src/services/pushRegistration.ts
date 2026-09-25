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

export const NOTIFICATION_CHANNEL_ID = 'medicineapp-reminders-v4';
export const DEFAULT_NOTIFICATION_COPY = Object.freeze({
  title: 'Medicine reminder',
  body: 'Time to take <medicine label>.',
});
const REGISTRATION_ID_KEY = 'medicineapp.secure.v1.push.registration-id';
const REGISTRATION_TUPLE_KEY = 'medicineapp.secure.v1.push.registration-tuple';

export type PushPermission = NotificationPermission;
export type PushPlatform = 'android' | 'ios';
export type PushRegistrationResult = Readonly<{
  status:
    | 'registered'
    | 'denied'
    | 'unavailable'
    | 'unsupported_runtime'
    | 'unsupported_personal_team'
    | 'offline'
    | 'rate_limited';
  deviceId?: string;
  retryAfterSeconds?: number;
}>;
export interface PushPermissionGateway {
  runtimeStatus(): NotificationRuntimeStatus;
  permission(request: boolean): Promise<PushPermission>;
  token(devicePushToken?: NotificationDevicePushToken): Promise<string | null>;
  deviceIdentifier(): Promise<string | null>;
  platform(): PushPlatform | null;
  configureChannel(): Promise<void>;
}
export interface PushRegistrationService {
  register(input: {
    deviceIdentifier: string;
    pushToken: string;
    platform: PushPlatform;
    appVersion: string | null;
    appEnvironment: 'development' | 'test' | 'staging' | 'production';
  }): Promise<{ deviceId: string }>;
  unregister(deviceId: string): Promise<void>;
}
export interface PushRegistrationStore {
  readRegistrationId(): Promise<string | null>;
  writeRegistrationId(value: string): Promise<void>;
  readTupleFingerprint(): Promise<string | null>;
  writeTupleFingerprint(value: string): Promise<void>;
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
    if (!Device.isDevice) return null;
    const projectId = Constants.easConfig?.projectId;
    if (!projectId) return null;
    return this.capability.expoPushToken(projectId, devicePushToken);
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
    if (Platform.OS === 'android')
      await this.capability.configureAndroidChannel(NOTIFICATION_CHANNEL_ID);
    await this.capability.configureReminderCategory();
    await this.capability.configureForegroundPresentation();
  }
}

export class BackendPushRegistrationService implements PushRegistrationService {
  constructor(private readonly client: ApiClient) {}
  async register(input: {
    deviceIdentifier: string;
    pushToken: string;
    platform: PushPlatform;
    appVersion: string | null;
    appEnvironment: 'development' | 'test' | 'staging' | 'production';
  }): Promise<{ deviceId: string }> {
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
          push_provider: 'expo',
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
}

export class SecurePushRegistrationStore implements PushRegistrationStore {
  async readRegistrationId() {
    const value = await SecureStore.getItemAsync(REGISTRATION_ID_KEY);
    if (value && !/^[A-Za-z0-9_-]{1,200}$/.test(value)) {
      await this.clear();
      return null;
    }
    return value;
  }
  async writeRegistrationId(value: string) {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(value))
      throw new Error('Invalid registration identifier');
    await SecureStore.setItemAsync(REGISTRATION_ID_KEY, value);
  }
  async readTupleFingerprint() {
    const value = await SecureStore.getItemAsync(REGISTRATION_TUPLE_KEY);
    if (value && !/^[a-f0-9]{64}$/.test(value)) {
      await SecureStore.deleteItemAsync(REGISTRATION_TUPLE_KEY);
      return null;
    }
    return value;
  }
  async writeTupleFingerprint(value: string) {
    if (!/^[a-f0-9]{64}$/.test(value))
      throw new Error('Invalid registration tuple fingerprint');
    await SecureStore.setItemAsync(REGISTRATION_TUPLE_KEY, value);
  }
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(REGISTRATION_ID_KEY),
      SecureStore.deleteItemAsync(REGISTRATION_TUPLE_KEY),
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
  private inFlight: Promise<PushRegistrationResult> | null = null;
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
  ): Promise<PushRegistrationResult> {
    return this.singleFlight(requestPermission, online);
  }

  async registerRotatedToken(
    devicePushToken: NotificationDevicePushToken,
    online: boolean,
  ): Promise<PushRegistrationResult> {
    return this.singleFlight(false, online, devicePushToken);
  }

  private singleFlight(
    requestPermission: boolean,
    online: boolean,
    devicePushToken?: NotificationDevicePushToken,
  ): Promise<PushRegistrationResult> {
    if (this.inFlight) return this.inFlight;
    const generation = this.generation;
    const pending = this.performRegistration(
      requestPermission,
      online,
      generation,
      devicePushToken,
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
  ): Promise<PushRegistrationResult> {
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
    const [pushToken, deviceIdentifier] = await Promise.all([
      this.gateway.token(devicePushToken),
      this.gateway.deviceIdentifier(),
    ]);
    const platform = this.gateway.platform();
    if (!pushToken || !deviceIdentifier || !platform)
      return { status: 'unavailable' };
    const tupleFingerprint = await this.tupleHasher([
      pushToken,
      deviceIdentifier,
      platform,
      'expo',
      publicEnvironment.appEnvironment,
    ]);
    const [currentFingerprint, currentDeviceId] = await Promise.all([
      this.store.readTupleFingerprint(),
      this.store.readRegistrationId(),
    ]);
    if (currentFingerprint === tupleFingerprint && currentDeviceId) {
      return { status: 'registered', deviceId: currentDeviceId };
    }
    let result: { deviceId: string };
    try {
      result = await this.backend.register({
        deviceIdentifier,
        pushToken,
        platform,
        appVersion: Constants.expoConfig?.version ?? null,
        appEnvironment: publicEnvironment.appEnvironment,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return {
          status: 'rate_limited',
          retryAfterSeconds: error.retryAfterSeconds,
        };
      }
      throw error;
    }
    if (generation !== this.generation) {
      await this.revokeStale(result.deviceId);
      return { status: 'unavailable' };
    }
    await Promise.all([
      this.store.writeRegistrationId(result.deviceId),
      this.store.writeTupleFingerprint(tupleFingerprint),
    ]);
    if (generation !== this.generation) {
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
    const deviceId = await this.store.readRegistrationId();
    try {
      if (deviceId) await this.backend.unregister(deviceId);
    } catch {
      /* Logout must still clear local association. */
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
