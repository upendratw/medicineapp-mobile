import { act, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockRegister = jest.fn().mockResolvedValue({ status: 'registered' });
const mockLastResponse = jest.fn();
const mockAddResponseListener = jest.fn().mockResolvedValue(null);
const mockAddReceivedListener = jest.fn().mockResolvedValue(null);
const mockAddPushTokenListener = jest.fn().mockResolvedValue(null);
const mockProcess = jest.fn().mockResolvedValue({ status: 'none' });
let responseListener: ((response: unknown) => void) | undefined;
const mockAuth: {
  status: 'restoring' | 'unauthenticated' | 'authenticated' | 'error';
  role: 'patient' | 'caregiver' | null;
} = { status: 'restoring', role: null };
let mockSegments: string[] = ['(auth)', 'login'];

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
}));
jest.mock('@/state/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/state/OnboardingContext', () => ({
  useOnboarding: () => ({ complete: true, restoring: false }),
}));
jest.mock('@/state/NetworkContext', () => ({ useOnline: () => true }));
jest.mock('@/services/pushRegistration', () => ({
  pushRegistrationCoordinator: {
    register: (...args: unknown[]) => mockRegister(...args),
    registerRotatedToken: jest.fn(),
  },
}));
jest.mock('@/services/notificationCapability', () => ({
  notificationCapability: {
    addReceivedListener: (...args: unknown[]) =>
      mockAddReceivedListener(...args),
    addResponseListener: (...args: unknown[]) =>
      mockAddResponseListener(...args),
    lastResponse: (...args: unknown[]) => mockLastResponse(...args),
    addPushTokenListener: (...args: unknown[]) =>
      mockAddPushTokenListener(...args),
  },
}));
jest.mock('@/services/registry', () => ({
  notificationActionCoordinator: {
    capture: jest.fn().mockResolvedValue(null),
    process: (...args: unknown[]) => mockProcess(...args),
  },
}));

import { DeepLinkProvider } from '@/navigation/DeepLinkContext';
import { RouteGuard } from '@/navigation/RouteGuard';
import { PushRegistrationProvider } from '@/state/PushRegistrationContext';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

const caregiverResponse = {
  actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  notificationIdentifier: 'bounded-cold-start-response',
  data: { type: 'caregiver_alert', schema_version: 1 },
};

function Harness() {
  return (
    <DeepLinkProvider>
      <PushRegistrationProvider>
        <RouteGuard />
      </PushRegistrationProvider>
    </DeepLinkProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReplace.mockImplementation((route: string | { pathname?: string }) => {
    const pathname = typeof route === 'string' ? route : route.pathname;
    if (!pathname) return;
    const segment = pathname.slice(1);
    mockSegments =
      pathname === '/login' ? ['(auth)', 'login'] : ['(app)', segment];
  });
  mockAuth.status = 'restoring';
  mockAuth.role = null;
  mockSegments = ['(auth)', 'login'];
  mockLastResponse.mockResolvedValue(null);
  responseListener = undefined;
  mockAddResponseListener.mockImplementation(async (listener) => {
    responseListener = listener as (response: unknown) => void;
    return null;
  });
  mockRegister.mockResolvedValue({ status: 'registered' });
  mockProcess.mockResolvedValue({ status: 'none' });
});

test('routes a late cold-start Caregiver response after auth restores first', async () => {
  const startupResponse = deferred<{
    actionIdentifier: string;
    notificationIdentifier: string;
    data: { type: string; schema_version: number };
  } | null>();
  mockLastResponse
    .mockReturnValueOnce(startupResponse.promise)
    .mockResolvedValue(null);

  const screen = await render(<Harness />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await screen.rerender(<Harness />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('/caregiver-dashboard'),
  );

  mockSegments = ['(app)', 'caregiver-dashboard'];
  await act(async () => {
    startupResponse.resolve({
      ...caregiverResponse,
    });
    await startupResponse.promise;
  });

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-alerts'),
  );
});

test('routes a response-first cold start after Caregiver auth resolves', async () => {
  mockLastResponse.mockResolvedValue(caregiverResponse);
  const screen = await render(<Harness />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await screen.rerender(<Harness />);

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-alerts'),
  );
});

test('uses the normal Caregiver landing when the startup response is null', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await render(<Harness />);

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-dashboard'),
  );
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
});

test('uses the normal Caregiver landing for an invalid startup response', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockLastResponse.mockResolvedValue({
    ...caregiverResponse,
    data: { type: 'caregiver_alert', schema_version: 2 },
  });
  await render(<Harness />);

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-dashboard'),
  );
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
});

test('preserves the Patient landing when a Caregiver response arrives late', async () => {
  const startupResponse = deferred<typeof caregiverResponse | null>();
  mockLastResponse.mockReturnValue(startupResponse.promise);
  const screen = await render(<Harness />);

  mockAuth.status = 'authenticated';
  mockAuth.role = 'patient';
  await screen.rerender(<Harness />);
  await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/home'));
  mockSegments = ['(app)', 'home'];

  await act(async () => {
    startupResponse.resolve(caregiverResponse);
    await startupResponse.promise;
  });

  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
});

test('keeps the auth gate before later Caregiver routing', async () => {
  mockAuth.status = 'unauthenticated';
  mockAuth.role = null;
  mockLastResponse.mockResolvedValue(caregiverResponse);
  const screen = await render(<Harness />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await screen.rerender(<Harness />);

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-alerts'),
  );
});

test('preserves live Caregiver response routing after startup hydration', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockSegments = ['(app)', 'caregiver-dashboard'];
  await render(<Harness />);
  await waitFor(() => expect(responseListener).toBeDefined());

  await act(async () => responseListener?.(caregiverResponse));

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-alerts'),
  );
});

test('runs one startup request and one alert route across auth rerenders', async () => {
  const startupResponse = deferred<typeof caregiverResponse | null>();
  mockLastResponse.mockReturnValue(startupResponse.promise);
  const screen = await render(<Harness />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await screen.rerender(<Harness />);
  mockSegments = ['(app)', 'caregiver-dashboard'];
  await screen.rerender(<Harness />);
  await act(async () => {
    startupResponse.resolve(caregiverResponse);
    await startupResponse.promise;
  });

  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('/caregiver-alerts'),
  );
  expect(mockLastResponse).toHaveBeenCalledTimes(1);
  expect(
    mockReplace.mock.calls.filter(([route]) => route === '/caregiver-alerts'),
  ).toHaveLength(1);
});

test('falls back safely when startup response retrieval fails', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockLastResponse.mockRejectedValue(new Error('synthetic retrieval failure'));
  await render(<Harness />);

  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-dashboard'),
  );
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
});
