import Constants from 'expo-constants';

export type NotificationRuntimeStatus = 'supported' | 'unsupported_runtime';
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';
export type NotificationSubscription = Readonly<{ remove(): void }>;

type NotificationsModule = typeof import('expo-notifications');
type NotificationsLoader = () => Promise<NotificationsModule>;

export class ExpoNotificationCapability {
  constructor(
    private readonly expoGoConfig: object | null = Constants.expoGoConfig,
    private readonly loader: NotificationsLoader = () =>
      import('expo-notifications'),
  ) {}

  status(): NotificationRuntimeStatus {
    return this.expoGoConfig !== null ? 'unsupported_runtime' : 'supported';
  }

  private async load(): Promise<NotificationsModule | null> {
    if (this.status() === 'unsupported_runtime') return null;
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
    listener: (route: unknown) => void,
  ): Promise<NotificationSubscription | null> {
    const notifications = await this.load();
    if (!notifications) return null;
    return notifications.addNotificationResponseReceivedListener((response) =>
      listener(response.notification.request.content.data?.route),
    );
  }
}

export const notificationCapability = new ExpoNotificationCapability();
