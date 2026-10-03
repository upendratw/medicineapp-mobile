import {
  BackgroundReminderNotificationCoordinator,
  buildBackgroundReminderNotificationRequest,
  HANDLED_REMINDERS_KEY,
  parseBackgroundReminderSignal,
} from '@/services/backgroundReminderNotificationService';
import type { ReminderContextService } from '@/services/reminderService';
import type { ReminderContext } from '@/types/reminder';

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

const taskPayloadFor = (id: string) => {
  const occurrence = {
    type: 'medicineapp.reminder.due',
    schema_version: 1,
    reminder_id: id,
  } as const;
  return {
    occurrence,
    payload: {
      notification: null,
      data: {
        dataString: JSON.stringify(occurrence),
        body: JSON.stringify(occurrence),
      },
    },
  };
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

function reminderContext(id: string): ReminderContext {
  return {
    reminderId: id,
    medicationName: 'Synthetic medicine',
    scheduledLocalTime: '09:00',
    scheduledUtcTime: '03:30',
    doseQuantity: '1',
    doseUnit: 'tablet',
    status: 'scheduled',
    statusText: 'Scheduled',
    instructions: null,
    scheduleRevision: 1,
    allowedActions: ['TAKEN', 'SNOOZE', 'SKIPPED'],
  };
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

test('three sequential occurrences survive a cold coordinator restart while a retry stays idempotent', async () => {
  const ids = [
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000022',
  ];
  const storage = memoryStorage();
  const publish = jest.fn().mockResolvedValue(undefined);
  const reminders = contextService(
    jest.fn(async (id: string) => reminderContext(id)),
  );
  const createCoordinator = () =>
    new BackgroundReminderNotificationCoordinator(
      jest.fn().mockResolvedValue({ role: 'patient' }),
      reminders,
      publish,
      storage,
    );

  const first = taskPayloadFor(ids[0]);
  await expect(createCoordinator().handle(first.payload)).resolves.toBe(
    'displayed',
  );

  // A fresh coordinator models a cold/headless JavaScript bootstrap. Durable
  // replay state must suppress only the same occurrence, not later reminders.
  const coldCoordinator = createCoordinator();
  const second = taskPayloadFor(ids[1]);
  const third = taskPayloadFor(ids[2]);
  await expect(coldCoordinator.handle(second.payload)).resolves.toBe(
    'displayed',
  );
  await expect(coldCoordinator.handle(third.payload)).resolves.toBe(
    'displayed',
  );
  await expect(coldCoordinator.handle(second.payload)).resolves.toBe(
    'duplicate',
  );

  expect(publish.mock.calls.map(([value]) => value)).toEqual([
    first.occurrence,
    second.occurrence,
    third.occurrence,
  ]);
  expect(reminders.get).toHaveBeenCalledTimes(3);
});

test('a failed publish clears transient in-flight state for a legitimate retry', async () => {
  const publish = jest
    .fn()
    .mockRejectedValueOnce(new Error('bounded test failure'))
    .mockResolvedValueOnce(undefined);
  const coordinator = new BackgroundReminderNotificationCoordinator(
    jest.fn().mockResolvedValue({ role: 'patient' }),
    contextService(),
    publish,
    memoryStorage(),
  );

  await expect(coordinator.handle(taskPayload)).resolves.toBe('rejected');
  await expect(coordinator.handle(taskPayload)).resolves.toBe('displayed');
  expect(publish).toHaveBeenCalledTimes(2);
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

test('Android background acceptance pins Metro and ADB reverse to the native cold-start default', () => {
  const packageJson = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
  };
  expect(packageJson.scripts['start:android-background-acceptance']).toBe(
    'expo start --dev-client --port 8081',
  );

  const runbook = read('docs/e33/E19-android-background-acceptance.md');
  expect(runbook).toContain('adb reverse tcp:8081 tcp:8081');
  expect(runbook).toContain('npm run start:android-background-acceptance');
  expect(runbook).not.toContain('8082');
});
