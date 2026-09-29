import * as SecureStore from 'expo-secure-store';

import { ExpoSecureTokenStore } from '@/security/SecureTokenStore';

const secureStore = jest.mocked(SecureStore);

beforeEach(() => jest.clearAllMocks());

test('writes access and refresh tokens through Expo SecureStore only', async () => {
  secureStore.deleteItemAsync.mockResolvedValue();
  secureStore.setItemAsync.mockResolvedValue();
  await new ExpoSecureTokenStore().write({
    accessToken: 'access-value',
    refreshToken: 'refresh-value',
    role: 'caregiver',
  });
  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    'medicineapp.secure.v1.auth.access',
    'access-value',
    expect.any(Object),
  );
  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    'medicineapp.secure.v1.auth.role',
    'caregiver',
    expect.any(Object),
  );
  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    'medicineapp.secure.v1.auth.refresh',
    'refresh-value',
    expect.any(Object),
  );
});

test('fails closed and clears corrupted secure session values', async () => {
  secureStore.getItemAsync
    .mockResolvedValueOnce(' access-value')
    .mockResolvedValueOnce('refresh-value')
    .mockResolvedValueOnce('patient');
  secureStore.deleteItemAsync.mockResolvedValue();
  await expect(new ExpoSecureTokenStore().read()).resolves.toBeNull();
  expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
});

test('secure storage unavailability rejects generically without exposing secrets', async () => {
  secureStore.isAvailableAsync.mockResolvedValueOnce(false);
  await expect(
    new ExpoSecureTokenStore().write({
      accessToken: 'private-access',
      refreshToken: 'private-refresh',
      role: 'patient',
    }),
  ).rejects.toThrow('unavailable');
  expect(JSON.stringify(secureStore.setItemAsync.mock.calls)).not.toContain(
    'private-access',
  );
});

test('returns no session when secure tokens lack authoritative role metadata', async () => {
  secureStore.getItemAsync
    .mockResolvedValueOnce('access-value')
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce('patient');
  await expect(new ExpoSecureTokenStore().read()).resolves.toBeNull();
});

test('restores tokens and authenticated role as one secure session', async () => {
  secureStore.getItemAsync
    .mockResolvedValueOnce('access-value')
    .mockResolvedValueOnce('refresh-value')
    .mockResolvedValueOnce('caregiver');
  await expect(new ExpoSecureTokenStore().read()).resolves.toEqual({
    accessToken: 'access-value',
    refreshToken: 'refresh-value',
    role: 'caregiver',
  });
});
