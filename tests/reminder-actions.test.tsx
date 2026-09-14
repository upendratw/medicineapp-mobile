import { fireEvent, render } from '@testing-library/react-native';
import { ReminderAlert } from '@/components';

const reminder = {
  reminderId: 'reminder-id',
  medicationId: 'medication-id',
  medicationName: 'Synthetic Medicine',
  scheduledFor: '2026-09-14T20:00:00+05:30',
  statusText: 'Scheduled',
  instructions: 'User-entered instructions',
  scheduleRevision: 2,
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
  expect(
    screen.getByRole('button', { name: 'Mark this dose as taken' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Remind me in 10 minutes' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Record as skipped' }),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Mark this dose as taken' }),
  );
  expect(acknowledge).toHaveBeenCalledWith(
    'TAKEN',
    expect.stringMatching(/^mobile-/),
  );
  expect(screen.getByText(/based on your report/)).toBeTruthy();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /double|catch-up|take it now/i,
  );
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
  await fireEvent.press(
    screen.getByRole('button', { name: 'Remind me in 10 minutes' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Record as skipped' }),
  );
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
  await fireEvent.press(
    failed.getByRole('button', { name: 'Mark this dose as taken' }),
  );
  expect(failed.getByText(/could not be recorded/)).toBeTruthy();
  expect(JSON.stringify(failed.toJSON())).not.toContain('private');
});
