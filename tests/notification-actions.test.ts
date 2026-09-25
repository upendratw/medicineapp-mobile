import { ApiError } from '@/api/client';
import { NotificationActionCoordinator } from '@/services/notificationActionService';
import { REMINDER_ACTION_IDENTIFIERS } from '@/services/notificationActions';

const reminderId = '00000000-0000-4000-8000-000000000001';
const data = {
  type: 'medicineapp.reminder.due',
  schema_version: 1,
  reminder_id: reminderId,
};

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
  const reminders = {
    acknowledge: jest.fn().mockResolvedValue({ result: 'APPLIED' }),
    snooze: jest.fn().mockResolvedValue({ result: 'SNOOZED' }),
  };
  const contexts = {
    get: jest.fn().mockResolvedValue({
      scheduleRevision: 4,
      allowedActions: ['TAKEN', 'SNOOZE', 'SKIPPED'],
    }),
  };
  const notifications = { dismiss: jest.fn().mockResolvedValue(true) };
  const coordinator = new NotificationActionCoordinator(
    reminders as never,
    contexts as never,
    notifications as never,
    storage,
  );
  return { coordinator, reminders, contexts, notifications, storage, values };
}

const response = (actionIdentifier: string) => ({
  actionIdentifier,
  notificationIdentifier: 'native-notification-id',
  data,
});

test('Taken uses the existing acknowledged-reminder path and dismisses only after success', async () => {
  const subject = fixture();
  await subject.coordinator.capture(
    response(REMINDER_ACTION_IDENTIFIERS.taken),
  );
  await expect(subject.coordinator.process()).resolves.toMatchObject({
    status: 'applied',
  });
  expect(subject.contexts.get).toHaveBeenCalledWith(reminderId);
  expect(subject.reminders.acknowledge).toHaveBeenCalledWith(
    reminderId,
    'TAKEN',
    '00000000-0000-4000-8000-000000000001',
    expect.any(String),
    4,
  );
  expect(subject.notifications.dismiss).toHaveBeenCalledWith(
    'native-notification-id',
  );
  expect(subject.storage.removeItem).toHaveBeenCalled();
});

test.each([
  [REMINDER_ACTION_IDENTIFIERS.snooze, 'snooze'],
  [REMINDER_ACTION_IDENTIFIERS.skipped, 'skipped'],
] as const)(
  '%s dispatches the existing %s semantics',
  async (identifier, action) => {
    const subject = fixture();
    await subject.coordinator.capture(response(identifier));
    await subject.coordinator.process();
    if (action === 'snooze') {
      expect(subject.reminders.snooze).toHaveBeenCalledWith(
        reminderId,
        10,
        '00000000-0000-4000-8000-000000000001',
      );
      expect(subject.reminders.acknowledge).not.toHaveBeenCalled();
    } else {
      expect(subject.reminders.acknowledge).toHaveBeenCalledWith(
        reminderId,
        'SKIPPED',
        expect.any(String),
        expect.any(String),
        4,
      );
    }
  },
);

test('duplicate response reuses idempotency and is not processed after success', async () => {
  const subject = fixture();
  const first = await subject.coordinator.capture(
    response(REMINDER_ACTION_IDENTIFIERS.snooze),
  );
  const second = await subject.coordinator.capture(
    response(REMINDER_ACTION_IDENTIFIERS.snooze),
  );
  expect(second?.requestKey).toBe(first?.requestKey);
  await Promise.all([
    subject.coordinator.process(),
    subject.coordinator.process(),
  ]);
  expect(subject.reminders.snooze).toHaveBeenCalledTimes(1);
  await expect(
    subject.coordinator.capture(response(REMINDER_ACTION_IDENTIFIERS.snooze)),
  ).resolves.toBeNull();
});

test('network/auth failure remains pending and never reports or dismisses success', async () => {
  const subject = fixture();
  subject.contexts.get.mockRejectedValue(new ApiError('AUTH_REQUIRED', 401));
  await subject.coordinator.capture(
    response(REMINDER_ACTION_IDENTIFIERS.taken),
  );
  await expect(subject.coordinator.process()).resolves.toMatchObject({
    status: 'retry',
  });
  expect(subject.notifications.dismiss).not.toHaveBeenCalled();
  expect(subject.storage.removeItem).not.toHaveBeenCalled();
});

test('invalid payload and action never trigger reminder APIs', async () => {
  const subject = fixture();
  await expect(
    subject.coordinator.capture({
      ...response('UNTRUSTED_ACTION'),
      data: { ...data, token: 'forbidden' },
    }),
  ).resolves.toBeNull();
  await expect(subject.coordinator.process()).resolves.toEqual({
    status: 'none',
  });
  expect(subject.reminders.acknowledge).not.toHaveBeenCalled();
  expect(subject.reminders.snooze).not.toHaveBeenCalled();
});

test('missing reminder identifier is ignored safely', async () => {
  const subject = fixture();
  await expect(
    subject.coordinator.capture({
      ...response(REMINDER_ACTION_IDENTIFIERS.taken),
      data: { type: 'medicineapp.reminder.due', schema_version: 1 },
    }),
  ).resolves.toBeNull();
  expect(subject.reminders.acknowledge).not.toHaveBeenCalled();
});

test('disallowed or stale action falls back safely without mutation or fake success', async () => {
  const subject = fixture();
  subject.contexts.get.mockResolvedValue({
    scheduleRevision: 7,
    allowedActions: [],
  });
  await subject.coordinator.capture(
    response(REMINDER_ACTION_IDENTIFIERS.taken),
  );
  await expect(subject.coordinator.process()).resolves.toMatchObject({
    status: 'rejected',
  });
  expect(subject.reminders.acknowledge).not.toHaveBeenCalled();
  expect(subject.notifications.dismiss).not.toHaveBeenCalled();
});
