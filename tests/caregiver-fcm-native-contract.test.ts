import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CAREGIVER_NOTIFICATION_CHANNEL_ID,
  configureCaregiverNotificationChannel,
} from '@/services/caregiverNotificationChannel';

test('Caregiver channel is high-importance, default-sound, vibrating, public, and action-free', async () => {
  const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
  const module = {
    setNotificationChannelAsync,
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationVisibility: { PUBLIC: 1 },
  };
  await expect(
    configureCaregiverNotificationChannel(
      async () => module as never,
      'android',
    ),
  ).resolves.toBe(true);
  expect(CAREGIVER_NOTIFICATION_CHANNEL_ID).toBe(
    'medicineapp-caregiver-alerts-v1',
  );
  expect(setNotificationChannelAsync).toHaveBeenCalledWith(
    CAREGIVER_NOTIFICATION_CHANNEL_ID,
    {
      name: 'MedicineApp caregiver alerts',
      description: 'Family medication-attention alerts',
      importance: 4,
      enableVibrate: true,
      lockscreenVisibility: 1,
      bypassDnd: false,
    },
  );
  expect(JSON.stringify(setNotificationChannelAsync.mock.calls)).not.toMatch(
    /medicine_reminder_alarm|category|Taken|Snooze|Skip/,
  );
});

test('Caregiver channel is never configured on iOS', async () => {
  const loader = jest.fn();
  await expect(
    configureCaregiverNotificationChannel(loader, 'ios'),
  ).resolves.toBe(false);
  expect(loader).not.toHaveBeenCalled();
});

test('installed Expo native layer maps direct FCM data into a process-dead-safe notification response', () => {
  const nativeRoot = join(
    process.cwd(),
    'node_modules/expo-notifications/android/src/main/java/expo/modules/notifications',
  );
  const delegate = readFileSync(
    join(nativeRoot, 'service/delegates/FirebaseMessagingDelegate.kt'),
    'utf8',
  );
  const data = readFileSync(
    join(nativeRoot, 'notifications/model/NotificationData.kt'),
    'utf8',
  );
  const trigger = readFileSync(
    join(
      nativeRoot,
      'notifications/model/triggers/FirebaseNotificationTrigger.kt',
    ),
    'utf8',
  );
  const serializer = readFileSync(
    join(nativeRoot, 'notifications/NotificationSerializer.java'),
    'utf8',
  );
  const builder = readFileSync(
    join(
      nativeRoot,
      'notifications/presentation/builders/ExpoNotificationBuilder.kt',
    ),
    'utf8',
  );

  expect(delegate).toContain(
    'override fun onMessageReceived(remoteMessage: RemoteMessage)',
  );
  expect(delegate).toContain(
    'NotificationsService.receive(context, notification)',
  );
  expect(data).toContain('get() = data["title"]');
  expect(data).toContain('get() = data["message"]');
  expect(data).toContain('data["body"]?.let { JSONObject(it) }');
  expect(trigger).toContain('remoteMessage.data["channelId"]');
  expect(serializer).toContain('content.putString("dataString", dataBody)');
  expect(serializer).toContain('toResponseBundleFromExtras');
  expect(builder).toContain('createNotificationResponseIntent');
});

test('E19 reminder channel and caregiver channel remain distinct', () => {
  const registrationSource = readFileSync(
    join(process.cwd(), 'src/services/pushRegistration.ts'),
    'utf8',
  );
  expect(registrationSource).toContain("'medicineapp-reminders-v4'");
  expect(CAREGIVER_NOTIFICATION_CHANNEL_ID).not.toBe(
    'medicineapp-reminders-v4',
  );
});
