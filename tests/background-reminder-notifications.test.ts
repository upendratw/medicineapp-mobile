import {
  BackgroundReminderNotificationCoordinator,
  buildBackgroundReminderNotificationRequest,
  HANDLED_REMINDERS_KEY,
  parseBackgroundReminderSignal,
} from '@/services/backgroundReminderNotificationService';
import type { ReminderContextService } from '@/services/reminderService';

const reminderId = '00000000-0000-4000-8000-000000000019';
const signal = {
  type: 'medicineapp.reminder.due',
  schema_version: 1,
  reminder_id: reminderId,
} as const;
const taskPayload = {
  notification: null,
  data: { dataString: JSON.stringify(signal), body: JSON.stringify(signal) },
};

const read = (file: string) =>
  require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), file),
    'utf8',
  );

function contextService(
  get: ReminderContextService['get'] = jest.fn().mockResolvedValue({
    reminderId,
  }),
): ReminderContextService {
  return { get };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

test('accepts only the exact Expo Android headless reminder envelope', () => {
  expect(parseBackgroundReminderSignal(taskPayload)).toEqual(signal);
  expect(
    parseBackgroundReminderSignal({ ...taskPayload, notification: {} }),
  ).toBeNull();
  expect(
    parseBackgroundReminderSignal({
      ...taskPayload,
      actionIdentifier: 'MEDICINE_TAKEN',
    }),
  ).toBeNull();
  expect(
    parseBackgroundReminderSignal({
      notification: null,
      data: {
        dataString: JSON.stringify({ ...signal, medicine_name: 'blocked' }),
      },
    }),
  ).toBeNull();
});

test('current Patient ownership produces one display and suppresses replay', async () => {
  const storage = memoryStorage();
  const reminders = contextService();
  const publish = jest.fn().mockResolvedValue(undefined);
  const coordinator = new BackgroundReminderNotificationCoordinator(
    jest.fn().mockResolvedValue({ role: 'patient' }),
    reminders,
    publish,
    storage,
  );

  await expect(coordinator.handle(taskPayload)).resolves.toBe('displayed');
  await expect(coordinator.handle(taskPayload)).resolves.toBe('duplicate');

  expect(reminders.get).toHaveBeenCalledTimes(1);
  expect(publish).toHaveBeenCalledTimes(1);
  expect(storage.setItem).toHaveBeenCalledWith(
    HANDLED_REMINDERS_KEY,
    JSON.stringify([reminderId]),
  );
});

test('concurrent duplicate wake signals produce one local notification', async () => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const publish = jest.fn(async () => waiting);
  const coordinator = new BackgroundReminderNotificationCoordinator(
    jest.fn().mockResolvedValue({ role: 'patient' }),
    contextService(),
    publish,
    memoryStorage(),
  );

  const first = coordinator.handle(taskPayload);
  await Promise.resolve();
  const second = coordinator.handle(taskPayload);
  release();

  await expect(first).resolves.toBe('displayed');
  await expect(second).resolves.toBe('duplicate');
  expect(publish).toHaveBeenCalledTimes(1);
});

test('stale account or failed owner authorization fails closed', async () => {
  const publish = jest.fn();
  const caregiver = new BackgroundReminderNotificationCoordinator(
    jest.fn().mockResolvedValue({ role: 'caregiver' }),
    contextService(),
    publish,
    memoryStorage(),
  );
  await expect(caregiver.handle(taskPayload)).resolves.toBe('rejected');

  const unauthorized = new BackgroundReminderNotificationCoordinator(
    jest.fn().mockResolvedValue({ role: 'patient' }),
    contextService(jest.fn().mockRejectedValue(new Error('not found'))),
    publish,
    memoryStorage(),
  );
  await expect(unauthorized.handle(taskPayload)).resolves.toBe('rejected');
  expect(publish).not.toHaveBeenCalled();
});

test('native task owns one private actionable local notification', () => {
  expect(buildBackgroundReminderNotificationRequest(signal)).toEqual({
    identifier: `medicineapp-reminder-${reminderId}`,
    content: {
      title: 'Medicine reminder',
      body: "It's time for your scheduled medicine.",
      data: signal,
      sound: 'medicine_reminder_alarm.wav',
      priority: 'max',
      categoryIdentifier: 'MEDICINE_REMINDER_ACTIONS',
      autoDismiss: true,
    },
    trigger: { channelId: 'medicineapp-reminders-v4' },
  });
  const source = read('src/services/backgroundReminderNotifications.ts');
  expect(source).toContain('TaskManager.defineTask');
  expect(source).toContain('Notifications.registerTaskAsync');
  expect(source).toContain('Notifications.scheduleNotificationAsync');
  expect(source).toContain('buildBackgroundReminderNotificationRequest');
  expect(source).not.toMatch(
    /console\.|MEDICINE_TAKEN|MEDICINE_SNOOZE|MEDICINE_SKIP/,
  );
});

test('native task is loaded before Router and remains disabled in Expo Go', () => {
  const entry = read('index.js');
  expect(entry.indexOf('backgroundReminderNotifications')).toBeLessThan(
    entry.indexOf("require('expo-router/entry')"),
  );
  expect(entry).toContain('isRunningInExpoGo');
  expect(entry).toContain("Platform.OS === 'android'");
  expect(JSON.parse(read('package.json')).main).toBe('index.js');
});
