import { Platform } from 'react-native';

export const CAREGIVER_NOTIFICATION_CHANNEL_ID =
  'medicineapp-caregiver-alerts-v1';

type NotificationsModule = typeof import('expo-notifications');
type NotificationsLoader = () => Promise<NotificationsModule>;

export async function configureCaregiverNotificationChannel(
  loader: NotificationsLoader = () => import('expo-notifications'),
  platform: string = Platform.OS,
): Promise<boolean> {
  if (platform !== 'android') return false;
  const notifications = await loader();
  await notifications.setNotificationChannelAsync(
    CAREGIVER_NOTIFICATION_CHANNEL_ID,
    {
      name: 'MedicineApp caregiver alerts',
      description: 'Family medication-attention alerts',
      importance: notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      sound: 'default',
    },
  );
  return true;
}
