import eas from '../eas.json';
import { parsePublicEnvironment } from '@/config/environment';

const fs = require('node:fs');
const path = require('node:path');
const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('iOS identity is explicit without changing Android identity', () => {
  const config = read('app.config.ts');
  expect(config).toContain("bundleIdentifier: 'com.medicineapp.mobile'");
  expect(config).toContain("package: 'com.medicineapp.mobile'");
  expect(config).toContain("owner: 'ankala.ai'");
  expect(config).toContain("buildNumber: '1'");
});

test('iOS uses least-privilege camera and notification configuration', () => {
  const config = read('app.config.ts');
  expect(config).toContain(
    'Allow MedicineApp to photograph medicine packaging for your review.',
  );
  expect(config).toContain("'expo-notifications'");
  expect(config).not.toMatch(
    /NSPhotoLibraryUsageDescription|enableBackgroundRemoteNotifications|UIBackgroundModes/,
  );
});

test('development and test profiles use the shared HTTPS backend', () => {
  for (const profile of [eas.build.development, eas.build.preview]) {
    expect(profile.env.EXPO_PUBLIC_API_BASE_URL).toBe(
      'https://api-medicine.ankala.ai',
    );
    expect(
      parsePublicEnvironment(profile.env as Record<string, string>),
    ).toMatchObject({ apiBaseUrl: 'https://api-medicine.ankala.ai' });
  }
  expect(eas.build.development.developmentClient).toBe(true);
});

test('iOS push registration is native-build-only and backend mediated', () => {
  const push = read('src/services/pushRegistration.ts');
  const capability = read('src/services/notificationCapability.ts');
  expect(push).toContain('Application.getIosIdForVendorAsync()');
  expect(push).toContain('platform: PushPlatform');
  expect(push).toContain("'/api/v1/devices'");
  expect(capability).toContain("'unsupported_runtime'");
  expect(push).not.toMatch(/console\.|AsyncStorage/);
});

test('shared iOS safety architecture excludes direct infrastructure and unsafe actions', () => {
  const sources = fs
    .readdirSync(path.join(process.cwd(), 'src/services'))
    .map((name: string) => read(`src/services/${name}`))
    .join('\n');
  expect(sources).not.toMatch(
    /@aws-sdk|S3Client|Gemini|OpenSearch|mysql|diagnosePatient|prescribeMedication|dispatchEmergency/,
  );
});
