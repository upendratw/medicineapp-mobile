import { Linking, Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import {
  DeepLinkProvider,
  useDeepLinkIntent,
} from '@/navigation/DeepLinkContext';
import { sessionEvents } from '@/security/SessionEvents';

const reminderPayload = {
  type: 'medicineapp.reminder.due',
  schema_version: 1,
  reminder_id: '00000000-0000-4000-8000-000000000001',
};

function Probe() {
  const { pendingReminder, pendingCaregiver, acceptNotification, clear } =
    useDeepLinkIntent();
  return (
    <>
      <Text testID="reminder">{JSON.stringify(pendingReminder)}</Text>
      <Text testID="caregiver">{JSON.stringify(pendingCaregiver)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="accept-caregiver"
        onPress={() =>
          acceptNotification({ type: 'caregiver_alert', schema_version: 1 })
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="accept-reminder"
        onPress={() => acceptNotification(reminderPayload)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="accept-invalid"
        onPress={() =>
          acceptNotification({
            type: 'caregiver_alert',
            schema_version: 1,
            patient_id: 'must-not-be-retained',
          })
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="clear"
        onPress={clear}
      />
    </>
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.spyOn(Linking, 'addEventListener').mockReturnValue({
    remove: jest.fn(),
  } as never);
});

test('stores only one bounded non-sensitive caregiver destination in memory', async () => {
  const screen = await render(
    <DeepLinkProvider>
      <Probe />
    </DeepLinkProvider>,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'accept-caregiver' }),
  );
  expect(screen.getByTestId('caregiver').props.children).toBe(
    JSON.stringify({ type: 'caregiver_alerts' }),
  );
  expect(screen.getByTestId('reminder').props.children).toBe('null');
  expect(screen.toJSON()).not.toEqual(
    expect.stringContaining('must-not-be-retained'),
  );
});

test('keeps E19 and caregiver intents mutually exclusive and rejects invalid payloads', async () => {
  const screen = await render(
    <DeepLinkProvider>
      <Probe />
    </DeepLinkProvider>,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'accept-caregiver' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'accept-reminder' }),
  );
  expect(screen.getByTestId('caregiver').props.children).toBe('null');
  expect(screen.getByTestId('reminder').props.children).toContain('reminderId');

  await fireEvent.press(screen.getByRole('button', { name: 'accept-invalid' }));
  expect(screen.getByTestId('caregiver').props.children).toBe('null');
  expect(screen.getByTestId('reminder').props.children).toBe('null');
});

test('clear and session invalidation remove a pending caregiver destination', async () => {
  const screen = await render(
    <DeepLinkProvider>
      <Probe />
    </DeepLinkProvider>,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'accept-caregiver' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'clear' }));
  expect(screen.getByTestId('caregiver').props.children).toBe('null');

  await fireEvent.press(
    screen.getByRole('button', { name: 'accept-caregiver' }),
  );
  await act(async () => sessionEvents.notifyInvalidated());
  await waitFor(() =>
    expect(screen.getByTestId('caregiver').props.children).toBe('null'),
  );
});
