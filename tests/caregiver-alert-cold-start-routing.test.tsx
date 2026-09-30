import { Linking } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockRegister = jest.fn().mockResolvedValue({ status: 'registered' });
const mockLastResponse = jest.fn();
const mockAddResponseListener = jest.fn().mockResolvedValue(null);
const mockAddReceivedListener = jest.fn().mockResolvedValue(null);
const mockAddPushTokenListener = jest.fn().mockResolvedValue(null);
const mockProcess = jest.fn().mockResolvedValue({ status: 'none' });
const mockDiagnostic = jest.fn();
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
jest.mock('@/diagnostics/e21ColdStartDiagnostic', () => ({
  emitE21ColdStartDiagnostic: (marker: string) => mockDiagnostic(marker),
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

function diagnosticMarkers(): string[] {
  return mockDiagnostic.mock.calls.map(([marker]) => marker as string);
}

function expectMarkerOrder(expected: string[]): void {
  const markers = diagnosticMarkers();
  let previous = -1;
  for (const marker of expected) {
    const index = markers.indexOf(marker, previous + 1);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
}

function Harness({ providerKey = 'stable' }: { providerKey?: string }) {
  return (
    <DeepLinkProvider>
      <PushRegistrationProvider key={providerKey}>
        <RouteGuard />
      </PushRegistrationProvider>
    </DeepLinkProvider>
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.spyOn(Linking, 'addEventListener').mockReturnValue({
    remove: jest.fn(),
  } as never);
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
    return { remove: jest.fn() };
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
  expectMarkerOrder([
    'PROVIDER_MOUNT',
    'LIVE_LISTENER_INSTALL_BEGIN',
    'STARTUP_EFFECT_ACTIVE',
    'LAST_RESPONSE_REQUEST_BEGIN',
    'STARTUP_PROMISE_CREATED',
    'LIVE_LISTENER_INSTALLED',
    'LAST_RESPONSE_RESULT_PRESENT',
    'STARTUP_PROMISE_RESOLVED',
    'HANDLER_PRESENT',
    'RESPONSE_SOURCE_STARTUP',
    'RESPONSE_DISPATCHED',
    'PARSER_RESULT_CAREGIVER',
    'CAREGIVER_INTENT_INSTALLED',
    'ROUTEGUARD_CAREGIVER_INTENT_SEEN',
    'ROUTEGUARD_DECISION_CAREGIVER_ALERTS',
    'CAREGIVER_INTENT_CONSUMED',
  ]);
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
  expect(diagnosticMarkers()).toEqual(
    expect.arrayContaining([
      'LAST_RESPONSE_RESULT_NULL',
      'STARTUP_PROMISE_RESOLVED',
      'ROUTEGUARD_DECISION_CAREGIVER_DASHBOARD',
    ]),
  );
  expect(diagnosticMarkers()).not.toContain('RESPONSE_DISPATCHED');
  expect(diagnosticMarkers()).not.toContain('CAREGIVER_INTENT_INSTALLED');
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
  expectMarkerOrder([
    'LIVE_RESPONSE_RECEIVED',
    'HANDLER_PRESENT',
    'RESPONSE_SOURCE_LIVE',
    'RESPONSE_DISPATCHED',
    'PARSER_RESULT_CAREGIVER',
    'CAREGIVER_INTENT_INSTALLED',
    'ROUTEGUARD_CAREGIVER_INTENT_SEEN',
    'ROUTEGUARD_DECISION_CAREGIVER_ALERTS',
  ]);
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
  expect(
    diagnosticMarkers().filter(
      (marker) => marker === 'CAREGIVER_INTENT_INSTALLED',
    ),
  ).toHaveLength(1);
});

test('does not let a delayed rejected development-client URL overwrite the Caregiver response', async () => {
  const initialUrl = deferred<string | null>();
  jest.spyOn(Linking, 'getInitialURL').mockReturnValue(initialUrl.promise);
  mockLastResponse.mockResolvedValue(caregiverResponse);
  const screen = await render(<Harness />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await screen.rerender(<Harness />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-alerts'),
  );
  mockSegments = ['(app)', 'caregiver-alerts'];
  mockReplace.mockClear();

  await act(async () => {
    initialUrl.resolve(
      'exp+medicineapp-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
    );
    await initialUrl.promise;
  });

  expect(mockReplace).not.toHaveBeenCalledWith('/home');
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-dashboard');
  expect(diagnosticMarkers()).toContain('INITIAL_URL_REJECTED');
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
  expectMarkerOrder([
    'LAST_RESPONSE_REQUEST_BEGIN',
    'STARTUP_PROMISE_CREATED',
    'LAST_RESPONSE_RESULT_ERROR',
    'STARTUP_PROMISE_REJECTED',
  ]);
  expect(diagnosticMarkers()).toContain(
    'ROUTEGUARD_DECISION_CAREGIVER_DASHBOARD',
  );
});

test('records provider and startup-effect cleanup without changing lifecycle behavior', async () => {
  const startupResponse = deferred<typeof caregiverResponse | null>();
  mockLastResponse.mockReturnValue(startupResponse.promise);
  const screen = await render(<Harness />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));

  screen.unmount();
  await waitFor(() =>
    expect(diagnosticMarkers()).toContain('STARTUP_EFFECT_CANCELLED'),
  );
  startupResponse.resolve(caregiverResponse);
  await startupResponse.promise;
  await waitFor(() =>
    expect(diagnosticMarkers()).toContain(
      'STARTUP_RESULT_DISCARDED_EFFECT_INACTIVE',
    ),
  );

  expectMarkerOrder([
    'PROVIDER_MOUNT',
    'STARTUP_EFFECT_ACTIVE',
    'STARTUP_PROMISE_CREATED',
    'PROVIDER_UNMOUNT',
    'STARTUP_EFFECT_CANCELLED',
    'LAST_RESPONSE_RESULT_PRESENT',
    'STARTUP_PROMISE_RESOLVED',
    'STARTUP_RESULT_DISCARDED_EFFECT_INACTIVE',
  ]);
  expect(diagnosticMarkers()).not.toContain('RESPONSE_DISPATCHED');
});

test('records an actual provider remount as unmount followed by a second mount', async () => {
  const screen = await render(<Harness providerKey="first" />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(1));

  await screen.rerender(<Harness providerKey="second" />);
  await waitFor(() => expect(mockLastResponse).toHaveBeenCalledTimes(2));

  expectMarkerOrder(['PROVIDER_MOUNT', 'PROVIDER_UNMOUNT', 'PROVIDER_MOUNT']);
});
