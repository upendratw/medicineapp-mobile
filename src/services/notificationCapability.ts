import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

export type NotificationRuntimeStatus =
  'supported' | 'unsupported_runtime' | 'unsupported_personal_team';
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';
export type NotificationSubscription = Readonly<{ remove(): void }>;
export type NotificationData = Readonly<Record<string, unknown>>;

type NotificationsModule = typeof import('expo-notifications');
type NotificationsLoader = () => Promise<NotificationsModule>;

export class ExpoNotificationCapability {
  constructor(
    private readonly runningInExpoGo: boolean = isRunningInExpoGo(),
    private readonly loader: NotificationsLoader = () =>
      import('expo-notifications'),
    private readonly iosPersonalTeamBuild: boolean = Constants.expoConfig?.extra
      ?.iosPersonalTeamBuild === true,
    private readonly platform: string = Platform.OS,
  ) {}

  status(): NotificationRuntimeStatus {
    if (!['android', 'ios'].includes(this.platform))
      return 'unsupported_runtime';
    if (this.runningInExpoGo) return 'unsupported_runtime';
    if (this.platform === 'ios' && this.iosPersonalTeamBuild)
      return 'unsupported_personal_team';
    return 'supported';
  }

  private async load(): Promise<NotificationsModule | null> {
    if (this.status() !== 'supported') return null;
    try {
      return await this.loader();
    } catch {
      return null;
    }
  }

  async permission(request: boolean): Promise<NotificationPermission | null> {
    const notifications = await this.load();
    if (!notifications) return null;
    let result = await notifications.getPermissionsAsync();
    if (
      result.status === notifications.PermissionStatus.UNDETERMINED &&
      request
    ) {
      result = await notifications.requestPermissionsAsync();
    }
    if (result.status === notifications.PermissionStatus.GRANTED)
      return 'granted';
    if (result.status === notifications.PermissionStatus.DENIED)
      return 'denied';
    return 'undetermined';
  }

  async expoPushToken(projectId: string): Promise<string | null> {
    const notifications = await this.load();
    if (!notifications) return null;
    try {
      return (await notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch {
      return null;
    }
  }

  async configureAndroidChannel(channelId: string): Promise<boolean> {
    const notifications = await this.load();
    if (!notifications) return false;
    await notifications.setNotificationChannelAsync(channelId, {
      name: 'MedicineApp reminders',
      importance: notifications.AndroidImportance.DEFAULT,
      vibrationPattern: null,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PRIVATE,
    });
    return true;
  }

  async addResponseListener(
    listener: (data: NotificationData) => void,
  ): Promise<NotificationSubscription | null> {
    const notifications = await this.load();
    if (!notifications) return null;
    return notifications.addNotificationResponseReceivedListener((response) =>
      listener(response.notification.request.content.data ?? {}),
    );
  }

  async lastResponseData(): Promise<NotificationData | null> {
    const notifications = await this.load();
    if (!notifications) return null;
    const response = await notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    await notifications.clearLastNotificationResponseAsync();
    return response.notification.request.content.data ?? {};
  }

  async addPushTokenListener(
    listener: () => void,
  ): Promise<NotificationSubscription | null> {
    const notifications = await this.load();
    if (!notifications) return null;
    return notifications.addPushTokenListener(() => listener());
  }
}

export const notificationCapability = new ExpoNotificationCapability();
