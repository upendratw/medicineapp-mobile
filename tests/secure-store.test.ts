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
  });
  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    'medicineapp.auth.access',
    'access-value',
  );
  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    'medicineapp.auth.refresh',
    'refresh-value',
  );
});

test('returns a session only when both secure tokens exist', async () => {
  secureStore.getItemAsync
    .mockResolvedValueOnce('access-value')
    .mockResolvedValueOnce(null);
  await expect(new ExpoSecureTokenStore().read()).resolves.toBeNull();
});
