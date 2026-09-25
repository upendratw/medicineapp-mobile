import {
  REMINDER_ACTION_IDENTIFIERS,
  REMINDER_NOTIFICATION_CATEGORY,
  REMINDER_NOTIFICATION_SOUND,
} from '@/services/notificationActions';
import { NOTIFICATION_CHANNEL_ID } from '@/services/pushRegistration';

const read = (file: string) =>
  require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), file),
    'utf8',
  );

test('native notification contract and bundled original sound remain synchronized', () => {
  expect(NOTIFICATION_CHANNEL_ID).toBe('medicineapp-reminders-v4');
  expect(REMINDER_NOTIFICATION_CATEGORY).toBe('MEDICINE_REMINDER_ACTIONS');
  expect(REMINDER_ACTION_IDENTIFIERS).toEqual({
    taken: 'MEDICINE_TAKEN',
    snooze: 'MEDICINE_SNOOZE',
    skipped: 'MEDICINE_SKIP',
  });
  expect(REMINDER_NOTIFICATION_SOUND).toBe('medicine_reminder_alarm.wav');
  const config = read('app.config.ts');
  expect(config).toContain("defaultChannel: 'medicineapp-reminders-v4'");
  expect(config).toContain(
    "sounds: ['./assets/sounds/medicine_reminder_alarm.wav']",
  );
  expect(
    require('node:fs').statSync(
      require('node:path').join(
        process.cwd(),
        'assets/sounds/medicine_reminder_alarm.wav',
      ),
    ).size,
  ).toBeGreaterThan(1000);
});

test('notification routing data remains the bounded opaque schema', () => {
  const source = read('src/services/notificationActionService.ts');
  expect(source).not.toMatch(
    /medicineName|dose|patientId|token|otp|credential/,
  );
  expect(source).toContain('parseNotificationIntent(response.data)');
});
