import { render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockClear = jest.fn();
let mockSegments: string[] = ['(auth)', 'login'];
const mockAuth: {
  status: 'restoring' | 'unauthenticated' | 'authenticated' | 'error';
  role: 'patient' | 'caregiver' | null;
} = { status: 'restoring', role: null };
const mockOnboarding = { restoring: false, complete: true };
const mockIntent: {
  pending: string | null;
  pendingReminder: { type: 'reminder'; reminderId: string } | null;
  pendingCaregiver: { type: 'caregiver_alerts' } | null;
} = {
  pending: null,
  pendingReminder: null,
  pendingCaregiver: { type: 'caregiver_alerts' },
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
}));
jest.mock('@/state/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/state/OnboardingContext', () => ({
  useOnboarding: () => mockOnboarding,
}));
jest.mock('@/navigation/DeepLinkContext', () => ({
  useDeepLinkIntent: () => ({ ...mockIntent, clear: mockClear }),
}));

import { RouteGuard } from '@/navigation/RouteGuard';

beforeEach(() => {
  jest.clearAllMocks();
  mockSegments = ['(auth)', 'login'];
  mockAuth.status = 'restoring';
  mockAuth.role = null;
  mockOnboarding.restoring = false;
  mockOnboarding.complete = true;
  mockIntent.pending = null;
  mockIntent.pendingReminder = null;
  mockIntent.pendingCaregiver = { type: 'caregiver_alerts' };
});

test('waits for authoritative restoration then routes a Caregiver exactly once', async () => {
  const screen = await render(<RouteGuard />);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled();

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  await screen.rerender(<RouteGuard />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('/caregiver-alerts'),
  );
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalledTimes(1);
});

test('keeps the bounded destination through auth and onboarding before Caregiver routing', async () => {
  mockAuth.status = 'unauthenticated';
  const screen = await render(<RouteGuard />);
  await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  expect(mockClear).not.toHaveBeenCalled();

  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockOnboarding.complete = false;
  await screen.rerender(<RouteGuard />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/welcome'));
  expect(mockClear).not.toHaveBeenCalled();

  mockSegments = ['(onboarding)', 'welcome'];
  mockOnboarding.complete = true;
  await screen.rerender(<RouteGuard />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenLastCalledWith('/caregiver-alerts'),
  );
  expect(mockClear).toHaveBeenCalledTimes(1);
});

test('rejects a pending caregiver destination after Patient authentication', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'patient';
  const screen = await render(<RouteGuard />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
  expect(mockClear).toHaveBeenCalledTimes(1);

  mockSegments = ['(app)', 'home'];
  await screen.rerender(<RouteGuard />);
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
});

test('keeps an authenticated Patient shell without logout, switch, or caregiver routing', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'patient';
  mockSegments = ['(app)', 'home'];
  await render(<RouteGuard />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockReplace).not.toHaveBeenCalled();
});

test('treats the current Caregiver account inbox as authoritative and idempotent', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockSegments = ['(app)', 'caregiver-alerts'];
  const screen = await render(<RouteGuard />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockReplace).not.toHaveBeenCalled();

  mockIntent.pendingCaregiver = null;
  await screen.rerender(<RouteGuard />);
  expect(mockClear).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

test('replaces caregiver alert detail with the bounded inbox destination', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockSegments = ['(app)', 'caregiver-alerts', '[relationshipId]', '[alertId]'];
  await render(<RouteGuard />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('/caregiver-alerts'),
  );
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalledTimes(1);
});

test('consumes a duplicate response without a second inbox navigation', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  const screen = await render(<RouteGuard />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith('/caregiver-alerts'),
  );
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalledTimes(1);

  mockSegments = ['(app)', 'caregiver-alerts'];
  mockIntent.pendingCaregiver = { type: 'caregiver_alerts' };
  await screen.rerender(<RouteGuard />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(2));
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

test('preserves E19 reminder precedence without a caregiver catch-all', async () => {
  mockAuth.status = 'authenticated';
  mockAuth.role = 'caregiver';
  mockIntent.pendingReminder = {
    type: 'reminder',
    reminderId: '00000000-0000-4000-8000-000000000001',
  };
  await render(<RouteGuard />);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/reminder',
      params: { reminderId: '00000000-0000-4000-8000-000000000001' },
    }),
  );
  expect(mockReplace).not.toHaveBeenCalledWith('/caregiver-alerts');
  expect(mockClear).toHaveBeenCalledTimes(1);
});
