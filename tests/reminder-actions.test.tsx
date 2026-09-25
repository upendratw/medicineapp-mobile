import { fireEvent, render } from '@testing-library/react-native';
import { ReminderAlert } from '@/components';

const reminder = {
  reminderId: 'reminder-id',
  medicationName: 'Synthetic Medicine',
  scheduledLocalTime: '2026-09-14T20:00:00+05:30',
  scheduledUtcTime: '2026-09-14T14:30:00Z',
  doseQuantity: '1',
  doseUnit: 'tablet',
  status: 'fired',
  statusText: 'Scheduled',
  instructions: 'User-entered instructions',
  scheduleRevision: 2,
  allowedActions: ['TAKEN', 'SNOOZE', 'SKIPPED'] as const,
};

test('renders neutral reminder context and real action controls', async () => {
  const acknowledge = jest.fn().mockResolvedValue(undefined);
  const snooze = jest.fn().mockResolvedValue(undefined);
  const screen = await render(
    <ReminderAlert
      reminder={reminder}
      loading={false}
      unavailable={false}
      onAcknowledge={acknowledge}
      onSnooze={snooze}
    />,
  );
  expect(screen.getByText('Synthetic Medicine')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Taken' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Snooze' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Taken' }));
  expect(acknowledge).toHaveBeenCalledWith(
    'TAKEN',
    expect.stringMatching(/^mobile-/),
  );
  expect(screen.getByText(/Marked as taken/)).toBeTruthy();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /double|catch-up|take it now/i,
  );
});

test.each(['Taken', 'Snooze', 'Skip'])(
  '%s success clears the reminder flow through the success callback',
  async (label) => {
    const onSuccess = jest.fn();
    const screen = await render(
      <ReminderAlert
        reminder={reminder}
        loading={false}
        unavailable={false}
        onAcknowledge={jest.fn().mockResolvedValue(undefined)}
        onSnooze={jest.fn().mockResolvedValue(undefined)}
        onSuccess={onSuccess}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  },
);

test('failed reminder action remains in place and does not report success', async () => {
  const onSuccess = jest.fn();
  const screen = await render(
    <ReminderAlert
      reminder={reminder}
      loading={false}
      unavailable={false}
      onAcknowledge={jest.fn().mockRejectedValue(new Error('private'))}
      onSnooze={jest.fn()}
      onSuccess={onSuccess}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Taken' }));
  expect(onSuccess).not.toHaveBeenCalled();
  expect(screen.getByText(/could not be recorded/)).toBeTruthy();
});

test('snooze and skip call bounded actions', async () => {
  const acknowledge = jest.fn().mockResolvedValue(undefined);
  const snooze = jest.fn().mockResolvedValue(undefined);
  const screen = await render(
    <ReminderAlert
      reminder={reminder}
      loading={false}
      unavailable={false}
      onAcknowledge={acknowledge}
      onSnooze={snooze}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Snooze' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
  expect(snooze).toHaveBeenCalledWith(10, expect.stringMatching(/^mobile-/));
  expect(acknowledge).toHaveBeenCalledWith('SKIPPED', expect.any(String));
});

test('has loading, unavailable, and sanitized failure states', async () => {
  const loading = await render(
    <ReminderAlert
      reminder={null}
      loading
      unavailable={false}
      onAcknowledge={jest.fn()}
      onSnooze={jest.fn()}
    />,
  );
  expect(loading.getByLabelText('Loading reminder')).toBeTruthy();
  await loading.unmount();
  const unavailable = await render(
    <ReminderAlert
      reminder={null}
      loading={false}
      unavailable
      onAcknowledge={jest.fn()}
      onSnooze={jest.fn()}
    />,
  );
  expect(
    unavailable.getByText(/No medication action was recorded/),
  ).toBeTruthy();
  await unavailable.unmount();
  const failed = await render(
    <ReminderAlert
      reminder={reminder}
      loading={false}
      unavailable={false}
      onAcknowledge={jest.fn().mockRejectedValue(new Error('private'))}
      onSnooze={jest.fn()}
    />,
  );
  await fireEvent.press(failed.getByRole('button', { name: 'Taken' }));
  expect(failed.getByText(/could not be recorded/)).toBeTruthy();
  expect(JSON.stringify(failed.toJSON())).not.toContain('private');
});
