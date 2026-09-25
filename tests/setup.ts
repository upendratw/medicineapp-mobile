jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

jest.mock('expo-notifications', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  AndroidImportance: { DEFAULT: 3, MAX: 5 },
  AndroidNotificationVisibility: { PRIVATE: 0, PUBLIC: 1 },
  AndroidNotificationPriority: { MAX: 'max' },
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(null),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-application', () => ({
  getAndroidId: jest.fn(() => 'synthetic-device-id'),
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
  digestStringAsync: jest.fn(async (_algorithm: string, input: string) =>
    require('node:crypto').createHash('sha256').update(input).digest('hex'),
  ),
}));
