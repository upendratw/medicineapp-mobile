import * as SecureStore from 'expo-secure-store';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { secureTokenStore } from '@/security/SecureTokenStore';
import { AuthProvider, useAuth } from '@/state/AuthContext';

const AUTH_ACCESS_KEY = 'medicineapp.secure.v1.auth.access';
const AUTH_REFRESH_KEY = 'medicineapp.secure.v1.auth.refresh';
const REGISTRATION_ID_KEY = 'medicineapp.secure.v1.push.registration-id';
const REGISTRATION_TUPLE_KEY = 'medicineapp.secure.v1.push.registration-tuple';

function LogoutProbe() {
  const { status, logout } = useAuth();
  return (
    <>
      <Text>{status}</Text>
      <Pressable accessibilityRole="button" onPress={logout}>
        <Text>log out</Text>
      </Pressable>
    </>
  );
}

const response = () =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ data: { logged_out: true } }),
  }) as Response;

describe('authentication logout and device-registration isolation', () => {
  const secureValues = new Map<string, string>();

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    secureValues.clear();
    secureValues.set(AUTH_ACCESS_KEY, 'synthetic-access');
    secureValues.set(AUTH_REFRESH_KEY, 'synthetic-refresh');
    secureValues.set(REGISTRATION_ID_KEY, 'synthetic-device-record');
    secureValues.set(REGISTRATION_TUPLE_KEY, 'a'.repeat(64));
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key) => secureValues.get(key) ?? null);
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      secureValues.delete(key);
    });
  });

  test('Patient and Caregiver normal logout revoke only authentication and never call device DELETE', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response());
    const screen = await render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());

    await act(async () => fireEvent.press(screen.getByRole('button')));

    await waitFor(() =>
      expect(screen.getByText('unauthenticated')).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/api\/v1\/auth\/logout$/,
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes('/api/v1/devices/'),
      ),
    ).toBe(false);
    expect(secureValues.has(AUTH_ACCESS_KEY)).toBe(false);
    expect(secureValues.has(AUTH_REFRESH_KEY)).toBe(false);
    expect(secureValues.has(REGISTRATION_ID_KEY)).toBe(false);
    expect(secureValues.has(REGISTRATION_TUPLE_KEY)).toBe(false);
    await expect(secureTokenStore.read()).resolves.toBeNull();

    screen.unmount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
