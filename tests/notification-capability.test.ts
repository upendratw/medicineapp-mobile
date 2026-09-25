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
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: 'ExponentPushToken[synthetic]' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
});

test('Expo Go capability never loads unsupported notification module', async () => {
  const loader = jest.fn();
  const capability = new ExpoNotificationCapability(true, loader);
  expect(capability.status()).toBe('unsupported_runtime');
  await expect(capability.permission(true)).resolves.toBeNull();
  await expect(capability.expoPushToken('project')).resolves.toBeNull();
  await expect(capability.addResponseListener(jest.fn())).resolves.toBeNull();
  expect(loader).not.toHaveBeenCalled();
});

test('Personal Team capability never loads notification native module', async () => {
  const loader = jest.fn();
  const capability = new ExpoNotificationCapability(false, loader, true, 'ios');
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

test('SDK 57 Android development client is push-capable despite populated manifest fields', async () => {
  const notifications = module();
  const loader = jest.fn().mockResolvedValue(notifications);
  const capability = new ExpoNotificationCapability(
    false,
    loader,
    false,
    'android',
  );
  expect(capability.status()).toBe('supported');
  await expect(capability.permission(false)).resolves.toBe('granted');
  await expect(capability.expoPushToken('project')).resolves.toBe(
    'ExponentPushToken[synthetic]',
  );
  await expect(
    capability.configureAndroidChannel('medicineapp-reminders-v2'),
  ).resolves.toBe(true);
  expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
    'medicineapp-reminders-v2',
    {
      name: 'MedicineApp reminders',
      description: 'Audible medication reminders',
      importance: 5,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: 1,
      bypassDnd: false,
    },
  );
  const listener = jest.fn();
  await expect(capability.addResponseListener(listener)).resolves.toBeTruthy();
  await expect(capability.lastResponseData()).resolves.toBeNull();
  await expect(capability.clearLastResponse()).resolves.toBeUndefined();
  expect(notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
  await expect(capability.addPushTokenListener(listener)).resolves.toBeTruthy();
  expect(loader).toHaveBeenCalled();
  expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
    projectId: 'project',
  });
});

test('native token listener conversion supplies the token and never reacquires it', async () => {
  const notifications = module();
  const capability = new ExpoNotificationCapability(
    false,
    jest.fn().mockResolvedValue(notifications),
    false,
    'android',
  );
  const nativeToken = {
    type: 'android',
    data: 'synthetic-native-token',
  } as const;
  await expect(capability.expoPushToken('project', nativeToken)).resolves.toBe(
    'ExponentPushToken[synthetic]',
  );
  expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
    projectId: 'project',
    devicePushToken: nativeToken,
  });
  const listener = jest.fn();
  await capability.addPushTokenListener(listener);
  const registeredListener = (
    notifications.addPushTokenListener as unknown as jest.Mock<
      { remove(): void },
      [(token: typeof nativeToken) => void]
    >
  ).mock.calls[0]?.[0];
  expect(registeredListener).toBeDefined();
  if (!registeredListener) throw new Error('Push token listener was not set');
  registeredListener(nativeToken);
  expect(listener).toHaveBeenCalledWith(nativeToken);
});

test('supported runtime module-load failure remains safely unavailable', async () => {
  const capability = new ExpoNotificationCapability(
    false,
    jest.fn().mockRejectedValue(new Error('synthetic native failure')),
    false,
    'android',
  );
  await expect(capability.permission(true)).resolves.toBeNull();
  await expect(capability.addResponseListener(jest.fn())).resolves.toBeNull();
});

test.each([
  ['Android EAS development client', false, false, 'android', 'supported'],
  ['Android preview or standalone build', false, false, 'android', 'supported'],
  ['Android Expo Go', true, false, 'android', 'unsupported_runtime'],
  ['iOS EAS development build', false, false, 'ios', 'supported'],
  ['iOS Expo Go', true, false, 'ios', 'unsupported_runtime'],
  ['iOS Personal Team build', false, true, 'ios', 'unsupported_personal_team'],
  ['web', false, false, 'web', 'unsupported_runtime'],
] as const)(
  '%s resolves to the expected native-push capability',
  (_name, expoGo, personalTeam, platform, expected) => {
    expect(
      new ExpoNotificationCapability(
        expoGo,
        jest.fn(),
        personalTeam,
        platform,
      ).status(),
    ).toBe(expected);
  },
);

test('classifier uses Expo native Expo Go detection, not ambiguous manifest fields', () => {
  const source = read('src/services/notificationCapability.ts');
  expect(source).toContain('isRunningInExpoGo()');
  expect(source).not.toMatch(/Constants\.(?:expoGoConfig|expoVersion)/);
});
