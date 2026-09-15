import eas from '../eas.json';
import { parsePublicEnvironment } from '@/config/environment';

const fs = require('node:fs');
const path = require('node:path');
const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('production profile is an explicit diagnostics-free Android app bundle', () => {
  expect(eas.build.production).toMatchObject({
    environment: 'production',
    env: {
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS: 'false',
    },
    android: { buildType: 'app-bundle' },
  });
});

test('production environment accepts only HTTPS non-loopback backend', () => {
  expect(
    parsePublicEnvironment({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_API_BASE_URL: 'https://api.example.invalid',
      EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS: 'false',
    }),
  ).toMatchObject({
    appEnvironment: 'production',
    developerDiagnostics: false,
  });
});

test('release identity and monotonic version strategy remain explicit', () => {
  const config = read('app.config.ts');
  expect(config).toContain("package: 'com.medicineapp.mobile'");
  expect(config).toContain("version: '1.0.0'");
  expect(config).toContain('versionCode: 1');
  expect(read('docs/e33/E33-android-release-build.md')).toContain(
    'incremented for every Play artifact',
  );
});

test('production profiles contain no secrets or backend placeholder', () => {
  const serialized = JSON.stringify(eas.build.production);
  expect(serialized).not.toMatch(
    /API_KEY|SECRET|PASSWORD|TOKEN|localhost|127\.0\.0\.1/i,
  );
  expect(eas.build.production.env).not.toHaveProperty(
    'EXPO_PUBLIC_API_BASE_URL',
  );
});

test('generic lock-screen notification text remains privacy safe', () => {
  const source =
    read('src/services/pushRegistration.ts') +
    read('src/services/notificationCapability.ts');
  expect(source).toContain("name: 'MedicineApp reminders'");
  expect(read('docs/e33/E33-notification-privacy.md')).toContain(
    'You have a scheduled medication reminder.',
  );
});
