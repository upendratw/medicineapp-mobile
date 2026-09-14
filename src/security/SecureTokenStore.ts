import * as SecureStore from 'expo-secure-store';

export type TokenPair = Readonly<{ accessToken: string; refreshToken: string }>;
export interface SecureTokenStore {
  read(): Promise<TokenPair | null>;
  write(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

export interface SecureSecretStore {
  get(key: 'access-token' | 'refresh-token'): Promise<string | null>;
  set(key: 'access-token' | 'refresh-token', value: string): Promise<void>;
  delete(key: 'access-token' | 'refresh-token'): Promise<void>;
  clearAllAppSecrets(): Promise<void>;
}
const ACCESS_KEY = 'medicineapp.secure.v1.auth.access';
const REFRESH_KEY = 'medicineapp.secure.v1.auth.refresh';
const LEGACY_KEYS = [
  'medicineapp.auth.access',
  'medicineapp.auth.refresh',
] as const;
const options = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

function validSecret(value: string | null): value is string {
  return Boolean(value && value.trim() === value && value.length <= 16_384);
}

export class ExpoSecureTokenStore
  implements SecureTokenStore, SecureSecretStore
{
  async read(): Promise<TokenPair | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    if (!validSecret(accessToken) || !validSecret(refreshToken)) {
      await this.clear();
      return null;
    }
    return { accessToken, refreshToken };
  }

  async write(tokens: TokenPair): Promise<void> {
    await this.clear();
    try {
      await Promise.all([
        this.set('access-token', tokens.accessToken),
        this.set('refresh-token', tokens.refreshToken),
      ]);
    } catch (error) {
      await this.clear();
      throw error;
    }
  }

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      ...LEGACY_KEYS.map((key) => SecureStore.deleteItemAsync(key)),
    ]);
  }
  async get(key: 'access-token' | 'refresh-token'): Promise<string | null> {
    const value = await SecureStore.getItemAsync(
      key === 'access-token' ? ACCESS_KEY : REFRESH_KEY,
    );
    if (!validSecret(value)) {
      await this.delete(key);
      return null;
    }
    return value;
  }
  async set(
    key: 'access-token' | 'refresh-token',
    value: string,
  ): Promise<void> {
    if (!validSecret(value)) throw new Error('Secure session value is invalid');
    if (!(await SecureStore.isAvailableAsync()))
      throw new Error('Secure session storage is unavailable');
    await SecureStore.setItemAsync(
      key === 'access-token' ? ACCESS_KEY : REFRESH_KEY,
      value,
      options,
    );
  }
  async delete(key: 'access-token' | 'refresh-token'): Promise<void> {
    await SecureStore.deleteItemAsync(
      key === 'access-token' ? ACCESS_KEY : REFRESH_KEY,
    );
  }
  async clearAllAppSecrets(): Promise<void> {
    await this.clear();
  }
}

export const secureTokenStore: SecureTokenStore = new ExpoSecureTokenStore();
