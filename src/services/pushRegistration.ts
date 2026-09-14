import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '@/api/client';
import { secureTokenStore } from '@/security/SecureTokenStore';

export const NOTIFICATION_CHANNEL_ID = 'medicineapp-reminders-v1';
export const DEFAULT_NOTIFICATION_COPY = Object.freeze({
  title: 'MedicineApp reminder',
  body: 'You have a scheduled medication reminder.',
});
const REGISTRATION_ID_KEY = 'medicineapp.secure.v1.push.registration-id';

export type PushPermission = 'granted' | 'denied' | 'undetermined';
export type PushRegistrationResult = Readonly<{
  status: 'registered' | 'denied' | 'unavailable' | 'offline';
  deviceId?: string;
}>;
export interface PushPermissionGateway {
  permission(request: boolean): Promise<PushPermission>;
  token(): Promise<string | null>;
  deviceIdentifier(): Promise<string | null>;
  configureChannel(): Promise<void>;
}
export interface PushRegistrationService {
  register(input: {
    deviceIdentifier: string;
    pushToken: string;
    platform: 'android';
    appVersion: string | null;
  }): Promise<{ deviceId: string }>;
  unregister(deviceId: string): Promise<void>;
}
export interface PushRegistrationStore {
  readRegistrationId(): Promise<string | null>;
  writeRegistrationId(value: string): Promise<void>;
  clear(): Promise<void>;
}

export class ExpoPushPermissionGateway implements PushPermissionGateway {
  async permission(request: boolean): Promise<PushPermission> {
    let result = await Notifications.getPermissionsAsync();
    if (
      result.status === Notifications.PermissionStatus.UNDETERMINED &&
      request
    )
      result = await Notifications.requestPermissionsAsync();
    return result.status === Notifications.PermissionStatus.GRANTED
      ? 'granted'
      : result.status === Notifications.PermissionStatus.DENIED
        ? 'denied'
        : 'undetermined';
  }
  async token(): Promise<string | null> {
    if (!Device.isDevice) return null;
    const projectId = Constants.easConfig?.projectId;
    if (!projectId) return null;
    try {
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch {
      return null;
    }
  }
  async deviceIdentifier(): Promise<string | null> {
    if (Platform.OS !== 'android') return null;
    return Application.getAndroidId();
  }
  async configureChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'MedicineApp reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
}

export class BackendPushRegistrationService implements PushRegistrationService {
  constructor(private readonly client: ApiClient) {}
  async register(input: {
    deviceIdentifier: string;
    pushToken: string;
    platform: 'android';
    appVersion: string | null;
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
  async clear() {
    await SecureStore.deleteItemAsync(REGISTRATION_ID_KEY);
  }
}

export class PushRegistrationCoordinator {
  constructor(
    private readonly gateway: PushPermissionGateway,
    private readonly backend: PushRegistrationService,
    private readonly store: PushRegistrationStore,
  ) {}
  async register(
    requestPermission: boolean,
    online: boolean,
  ): Promise<PushRegistrationResult> {
    const permission = await this.gateway.permission(requestPermission);
    if (permission === 'denied') return { status: 'denied' };
    if (permission !== 'granted') return { status: 'unavailable' };
    if (!online) return { status: 'offline' };
    await this.gateway.configureChannel();
    const [pushToken, deviceIdentifier] = await Promise.all([
      this.gateway.token(),
      this.gateway.deviceIdentifier(),
    ]);
    if (!pushToken || !deviceIdentifier) return { status: 'unavailable' };
    const result = await this.backend.register({
      deviceIdentifier,
      pushToken,
      platform: 'android',
      appVersion: Constants.expoConfig?.version ?? null,
    });
    await this.store.writeRegistrationId(result.deviceId);
    return { status: 'registered', deviceId: result.deviceId };
  }
  async unregister(): Promise<void> {
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
