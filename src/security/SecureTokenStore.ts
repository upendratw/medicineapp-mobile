import * as SecureStore from 'expo-secure-store';

export type TokenPair = Readonly<{ accessToken: string; refreshToken: string }>;
export interface SecureTokenStore {
  read(): Promise<TokenPair | null>;
  write(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

const ACCESS_KEY = 'medicineapp.auth.access';
const REFRESH_KEY = 'medicineapp.auth.refresh';

export class ExpoSecureTokenStore implements SecureTokenStore {
  async read(): Promise<TokenPair | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  }

  async write(tokens: TokenPair): Promise<void> {
    await this.clear();
    try {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
        SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
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
    ]);
  }
}

export const secureTokenStore: SecureTokenStore = new ExpoSecureTokenStore();
