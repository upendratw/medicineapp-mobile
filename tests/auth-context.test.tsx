import * as SecureStore from 'expo-secure-store';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { sessionEvents } from '@/security/SessionEvents';
import { AuthProvider, useAuth } from '@/state/AuthContext';

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
