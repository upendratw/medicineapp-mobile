import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockRegister = jest.fn();
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
  },
}));
jest.mock('@/services/notificationCapability', () => ({
  notificationCapability: {
    addResponseListener: jest.fn().mockResolvedValue(null),
    lastResponseData: jest.fn().mockResolvedValue(null),
    addPushTokenListener: jest.fn().mockResolvedValue(null),
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
