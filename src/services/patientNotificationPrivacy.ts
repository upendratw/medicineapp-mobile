import { Platform } from 'react-native';

export const PATIENT_REMINDER_CHANNEL_ID = 'medicineapp-reminders-v4';
export const PRIVATE_REMINDER_COPY = Object.freeze({
  title: 'Medicine reminder',
  body: "It's time for your scheduled medicine.",
});

type NotificationsModule = typeof import('expo-notifications');
type NotificationsLoader = () => Promise<NotificationsModule>;

export async function enforcePatientNotificationPrivacy(
  loader: NotificationsLoader = () => import('expo-notifications'),
  platform: string = Platform.OS,
): Promise<boolean> {
  if (platform !== 'android') return false;
  const notifications = await loader();
  const existing = await notifications.getNotificationChannelAsync(
    PATIENT_REMINDER_CHANNEL_ID,
  );
  await notifications.setNotificationChannelAsync(PATIENT_REMINDER_CHANNEL_ID, {
    name: existing?.name ?? 'MedicineApp reminders',
    description: existing?.description ?? 'Audible medication reminders',
    importance: notifications.AndroidImportance.MAX,
    enableVibrate: true,
    vibrationPattern: [0, 500, 250, 500],
    lockscreenVisibility: notifications.AndroidNotificationVisibility.PRIVATE,
    bypassDnd: false,
    sound: existing?.sound ?? 'medicine_reminder_alarm.wav',
  });
  return true;
}
