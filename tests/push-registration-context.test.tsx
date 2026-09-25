import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockRegister = jest.fn();
const mockRegisterRotatedToken = jest.fn();
const mockAddPushTokenListener = jest.fn().mockResolvedValue(null);
const mockAuthState = { status: 'unauthenticated' };

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));
jest.mock('@/state/NetworkContext', () => ({
  useOnline: () => true,
}));
jest.mock('@/navigation/DeepLinkContext', () => ({
  useDeepLinkIntent: () => ({ acceptNotification: jest.fn() }),
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
    addResponseListener: jest.fn().mockResolvedValue(null),
    lastResponseData: jest.fn().mockResolvedValue(null),
    addPushTokenListener: (...args: unknown[]) =>
      mockAddPushTokenListener(...args),
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
