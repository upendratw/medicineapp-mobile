import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockRegister = jest.fn();
const mockRegisterRotatedToken = jest.fn();
const mockAddPushTokenListener = jest.fn().mockResolvedValue(null);
const mockReplace = jest.fn();
const mockAcceptNotification = jest.fn();
const mockAddResponseListener = jest.fn().mockResolvedValue(null);
const mockLastResponse = jest.fn().mockResolvedValue(null);
const mockCapture = jest.fn().mockResolvedValue(null);
const mockProcess = jest.fn().mockResolvedValue({ status: 'none' });
const mockAuthState = { status: 'unauthenticated' };

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock('@/state/NetworkContext', () => ({
  useOnline: () => true,
}));
jest.mock('@/navigation/DeepLinkContext', () => ({
  useDeepLinkIntent: () => ({ acceptNotification: mockAcceptNotification }),
}));
jest.mock('@/services/pushRegistration', () => ({
  pushRegistrationCoordinator: {
    register: (...args: unknown[]) => mockRegister(...args),
    registerRotatedToken: (...args: unknown[]) =>
      mockRegisterRotatedToken(...args),
  },
}));
jest.mock('@/services/notificationCapability', () => ({
  notificationCapability: {
    addResponseListener: (...args: unknown[]) =>
      mockAddResponseListener(...args),
    lastResponse: (...args: unknown[]) => mockLastResponse(...args),
    addPushTokenListener: (...args: unknown[]) =>
      mockAddPushTokenListener(...args),
  },
}));
jest.mock('@/services/registry', () => ({
  notificationActionCoordinator: {
    capture: (...args: unknown[]) => mockCapture(...args),
    process: (...args: unknown[]) => mockProcess(...args),
  },
}));

import {
  PushRegistrationProvider,
  usePushRegistration,
} from '@/state/PushRegistrationContext';

function Probe() {
  const { register } = usePushRegistration();
  return (
    <Pressable accessibilityRole="button" onPress={register}>
      <Text>enable notifications</Text>
    </Pressable>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState.status = 'unauthenticated';
  mockRegister.mockResolvedValue({ status: 'registered' });
  mockRegisterRotatedToken.mockResolvedValue({ status: 'registered' });
  mockAddPushTokenListener.mockResolvedValue(null);
  mockAddResponseListener.mockResolvedValue(null);
  mockLastResponse.mockResolvedValue(null);
  mockCapture.mockResolvedValue(null);
  mockProcess.mockResolvedValue({ status: 'none' });
});

test('ordinary rerender does not repeat automatic registration', async () => {
  mockAuthState.status = 'authenticated';
  const screen = await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
  await screen.rerender(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  expect(mockRegister).toHaveBeenCalledTimes(1);
});

test('token listener defers rotation and uses the supplied native token', async () => {
  jest.useFakeTimers();
  mockAuthState.status = 'authenticated';
  let listener: ((token: unknown) => void) | undefined;
  mockAddPushTokenListener.mockImplementation(async (next) => {
    listener = next as (token: unknown) => void;
    return null;
  });
  await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(listener).toBeDefined());
  const nativeToken = { type: 'android', data: 'synthetic-native-token' };
  listener?.(nativeToken);
  expect(mockRegisterRotatedToken).not.toHaveBeenCalled();
  await act(async () => jest.runOnlyPendingTimers());
  expect(mockRegisterRotatedToken).toHaveBeenCalledWith(nativeToken, true);
  jest.useRealTimers();
});

test('logged-out state does not register and authentication triggers registration without prompting', async () => {
  const screen = await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  expect(mockRegister).not.toHaveBeenCalled();

  mockAuthState.status = 'authenticated';
  await screen.rerender(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(false, true));
});

test('explicit notification action requests permission after authentication', async () => {
  mockAuthState.status = 'authenticated';
  const screen = await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(false, true));
  mockRegister.mockClear();
  await act(async () => fireEvent.press(screen.getByRole('button')));
  expect(mockRegister).toHaveBeenCalledWith(true, true);
});

test('foreground notification action is processed once and returns Home on backend success', async () => {
  mockAuthState.status = 'authenticated';
  let listener: ((response: unknown) => void) | undefined;
  mockAddResponseListener.mockImplementation(async (next) => {
    listener = next as (response: unknown) => void;
    return null;
  });
  mockCapture.mockResolvedValue({
    action: 'taken',
    reminderId: '00000000-0000-4000-8000-000000000001',
  });
  mockProcess.mockResolvedValue({ status: 'none' });
  await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(listener).toBeDefined());
  await waitFor(() => expect(mockProcess).toHaveBeenCalled());
  mockProcess.mockClear();
  mockProcess.mockResolvedValue({ status: 'applied' });
  await act(async () => {
    listener?.({
      actionIdentifier: 'MEDICINE_TAKEN',
      notificationIdentifier: 'notification-id',
      data: {
        type: 'medicineapp.reminder.due',
        schema_version: 1,
        reminder_id: '00000000-0000-4000-8000-000000000001',
      },
    });
  });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  expect(mockAcceptNotification).not.toHaveBeenCalled();
});

test('cold-start action waits through auth restoration then safely processes', async () => {
  const response = {
    actionIdentifier: 'MEDICINE_SNOOZE',
    notificationIdentifier: 'notification-id',
    data: {
      type: 'medicineapp.reminder.due',
      schema_version: 1,
      reminder_id: '00000000-0000-4000-8000-000000000001',
    },
  };
  mockAuthState.status = 'restoring';
  mockLastResponse.mockResolvedValue(response);
  mockCapture.mockResolvedValue({
    action: 'snooze',
    reminderId: response.data.reminder_id,
  });
  const screen = await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(mockCapture).toHaveBeenCalledWith(response));
  expect(mockProcess).not.toHaveBeenCalled();
  expect(mockAcceptNotification).not.toHaveBeenCalled();

  mockLastResponse.mockResolvedValue(null);
  mockProcess.mockResolvedValue({ status: 'applied' });
  mockAuthState.status = 'authenticated';
  await screen.rerender(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
});

test('ordinary notification body tap still enters the authenticated reminder flow', async () => {
  let listener: ((response: unknown) => void) | undefined;
  mockAddResponseListener.mockImplementation(async (next) => {
    listener = next as (response: unknown) => void;
    return null;
  });
  await render(
    <PushRegistrationProvider>
      <Probe />
    </PushRegistrationProvider>,
  );
  await waitFor(() => expect(listener).toBeDefined());
  const data = {
    type: 'medicineapp.reminder.due',
    schema_version: 1,
    reminder_id: '00000000-0000-4000-8000-000000000001',
  };
  await act(async () => {
    listener?.({
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notificationIdentifier: 'notification-id',
      data,
    });
  });
  expect(mockAcceptNotification).toHaveBeenCalledWith(data);
  expect(mockCapture).not.toHaveBeenCalled();
});
