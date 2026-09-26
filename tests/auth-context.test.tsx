import * as SecureStore from 'expo-secure-store';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { sessionEvents } from '@/security/SessionEvents';
import { AuthProvider, useAuth } from '@/state/AuthContext';
import { CaptureProvider, useCapture } from '@/state/CaptureContext';

function Probe() {
  const { status, logout } = useAuth();
  return (
    <>
      <Text>{status}</Text>
      <Pressable accessibilityRole="button" onPress={logout}>
        <Text>logout-probe</Text>
      </Pressable>
    </>
  );
}

function OtpRoleProbe() {
  const { pendingChallenge, requestOtp, verifyOtp } = useAuth();
  return (
    <>
      <Text>{pendingChallenge?.role ?? 'no-role'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="request-caregiver-otp"
        onPress={() => requestOtp('+919876543210', 'caregiver')}
      >
        <Text>request caregiver</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="request-patient-otp"
        onPress={() => requestOtp('+919876543210', 'patient')}
      >
        <Text>request patient</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="resend-current-otp"
        onPress={() =>
          pendingChallenge &&
          requestOtp(pendingChallenge.phone, pendingChallenge.role)
        }
      >
        <Text>resend current</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="verify-current-otp"
        onPress={() => verifyOtp('123456')}
      >
        <Text>verify current</Text>
      </Pressable>
    </>
  );
}

function CaptureProbe() {
  const capture = useCapture();
  return (
    <>
      <Text>{capture.imageUri ?? 'no transient image'}</Text>
      <Text>{capture.recognitionResult?.kind ?? 'no recognition result'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="set-capture"
        onPress={() => {
          capture.setImage('memory://synthetic-user-a');
          capture.setRecognitionResult({
            kind: 'no_match',
            captureId: '00000000-0000-4000-8000-000000000903',
            qualityReasons: [],
            failureCode: 'NO_SAFE_CANDIDATE',
          });
        }}
      >
        <Text>set-capture</Text>
      </Pressable>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => {
    if (key.endsWith('.access')) return 'stored-access';
    if (key.endsWith('.refresh')) return 'stored-refresh';
    return null;
  });
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
});

test('session invalidation updates AuthContext so the route guard can return to Login', async () => {
  const screen = await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
  await act(async () => sessionEvents.notifyInvalidated());
  await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
});

test('logout transitions authenticated state to Login-compatible unauthenticated state', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: { logged_out: true } }),
  } as Response);
  const screen = await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
  await act(async () => fireEvent.press(screen.getByRole('button')));
  await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});

test('logout clears transient OCR state before a subsequent user can authenticate', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: { logged_out: true } }),
  } as Response);
  const screen = await render(
    <AuthProvider>
      <CaptureProvider>
        <Probe />
        <CaptureProbe />
      </CaptureProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'set-capture' }));
  expect(screen.getByText('memory://synthetic-user-a')).toBeTruthy();
  expect(screen.getByText('no_match')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('logout-probe')));
  await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  expect(screen.getByText('no transient image')).toBeTruthy();
  expect(screen.getByText('no recognition result')).toBeTruthy();
});

test('caregiver role remains bound through request, resend, and server-bound verification', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
    async (input) =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          data: String(input).endsWith('/verify-otp')
            ? {
                user_id: 'synthetic-caregiver',
                role: 'caregiver',
                access_token: 'synthetic-access',
                refresh_token: 'synthetic-refresh',
                expires_in: 900,
              }
            : {
                challenge_id: 'synthetic-challenge',
                expires_in_seconds: 300,
              },
        }),
      }) as Response,
  );
  const screen = await render(
    <AuthProvider>
      <OtpRoleProbe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('no-role')).toBeTruthy());
  await act(async () =>
    fireEvent.press(
      screen.getByRole('button', { name: 'request-caregiver-otp' }),
    ),
  );
  await waitFor(() => expect(screen.getByText('caregiver')).toBeTruthy());
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: 'resend-current-otp' })),
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for (const call of fetchMock.mock.calls) {
    expect(call[1]?.body).toBe(
      JSON.stringify({ phone: '+919876543210', role: 'caregiver' }),
    );
  }
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: 'verify-current-otp' })),
  );
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls[2][1]?.body).toBe(
    JSON.stringify({
      challenge_id: 'synthetic-challenge',
      phone: '+919876543210',
      otp: '123456',
    }),
  );
});

test('patient role remains bound to the pending challenge and resend request', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      data: { challenge_id: 'patient-challenge', expires_in_seconds: 300 },
    }),
  } as Response);
  const screen = await render(
    <AuthProvider>
      <OtpRoleProbe />
    </AuthProvider>,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'request-patient-otp' }),
  );
  await waitFor(() => expect(screen.getByText('patient')).toBeTruthy());
  await fireEvent.press(
    screen.getByRole('button', { name: 'resend-current-otp' }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  for (const call of fetchMock.mock.calls) {
    expect(call[1]?.body).toBe(
      JSON.stringify({ phone: '+919876543210', role: 'patient' }),
    );
  }
});
