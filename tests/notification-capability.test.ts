import { ExpoNotificationCapability } from '@/services/notificationCapability';

const read = (file: string) =>
  require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), file),
    'utf8',
  );

const module = () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: 'ExponentPushToken[synthetic]' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
});

test('Expo Go capability never loads unsupported notification module', async () => {
  const loader = jest.fn();
  const capability = new ExpoNotificationCapability({} as never, loader);
  expect(capability.status()).toBe('unsupported_runtime');
  await expect(capability.permission(true)).resolves.toBeNull();
  await expect(capability.expoPushToken('project')).resolves.toBeNull();
  await expect(capability.addResponseListener(jest.fn())).resolves.toBeNull();
  expect(loader).not.toHaveBeenCalled();
});

test('Personal Team capability never loads notification native module', async () => {
  const loader = jest.fn();
  const capability = new ExpoNotificationCapability(null, loader, true);
  expect(capability.status()).toBe('unsupported_personal_team');
  await expect(capability.permission(true)).resolves.toBeNull();
  await expect(capability.expoPushToken('project')).resolves.toBeNull();
  await expect(capability.addResponseListener(jest.fn())).resolves.toBeNull();
  expect(loader).not.toHaveBeenCalled();
});

test('application startup path has no static expo-notifications import', () => {
  for (const file of [
    'src/services/pushRegistration.ts',
    'src/state/PushRegistrationContext.tsx',
  ]) {
    expect(read(file)).not.toMatch(
      /^import\s+(?:\*\s+as\s+\w+|\{[^}]*\})\s+from\s+['"]expo-notifications['"]/m,
    );
  }
  expect(read('src/services/notificationCapability.ts')).toContain(
    "import('expo-notifications')",
  );
});

test('development and standalone builds retain lazy notification behavior', async () => {
  const notifications = module();
  const loader = jest.fn().mockResolvedValue(notifications);
  const capability = new ExpoNotificationCapability(null, loader);
  expect(capability.status()).toBe('supported');
  await expect(capability.permission(false)).resolves.toBe('granted');
  await expect(capability.expoPushToken('project')).resolves.toBe(
    'ExponentPushToken[synthetic]',
  );
  await expect(
    capability.configureAndroidChannel('medicineapp-reminders-v1'),
  ).resolves.toBe(true);
  const listener = jest.fn();
  await expect(capability.addResponseListener(listener)).resolves.toBeTruthy();
  expect(loader).toHaveBeenCalled();
  expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
    projectId: 'project',
  });
});

test('supported runtime module-load failure remains safely unavailable', async () => {
  const capability = new ExpoNotificationCapability(
    null,
    jest.fn().mockRejectedValue(new Error('synthetic native failure')),
  );
  await expect(capability.permission(true)).resolves.toBeNull();
  await expect(capability.addResponseListener(jest.fn())).resolves.toBeNull();
});
