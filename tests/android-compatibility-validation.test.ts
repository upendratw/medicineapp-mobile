import packageJson from '../package.json';

const fs = require('node:fs');
const path = require('node:path');
const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('managed Android configuration preserves supported Expo and React Native baseline', () => {
  const config = read('app.config.ts');
  expect(packageJson.dependencies.expo).toMatch(/^~57\./);
  expect(packageJson.dependencies['react-native']).toBe('0.86.3');
  expect(config).toContain("package: 'com.medicineapp.mobile'");
  expect(config).toContain("scheme: 'medicineapp'");
  expect(config).toContain("'expo-notifications'");
  expect(config).toContain("'expo-secure-store'");
});

test('Android 10 through 15 compatibility delegates notification differences to Expo', () => {
  const config = read('app.config.ts');
  const push = read('src/services/pushRegistration.ts');
  expect(config).not.toContain('POST_NOTIFICATIONS');
  expect(push).not.toMatch(
    /Platform\.Version|Build\.VERSION|request.*POST_NOTIFICATIONS/i,
  );
  expect(push).toContain('Notifications.getPermissionsAsync()');
  expect(push).toContain('Notifications.requestPermissionsAsync()');
});

test('no broad storage, location, microphone, or unsupported native API assumption exists', () => {
  const sources =
    fs
      .readdirSync(path.join(process.cwd(), 'src/services'))
      .map((name: string) => read(`src/services/${name}`))
      .join('\n') + read('app.config.ts');
  expect(sources).not.toMatch(
    /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/,
  );
  expect(sources).not.toMatch(
    /ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION|RECORD_AUDIO/,
  );
  expect(sources).not.toMatch(
    /requestBackgroundPermissions|startLocationUpdates|background microphone/i,
  );
});

test('critical text remains scalable and has no unsafe fixed text-line truncation', () => {
  const components = fs
    .readdirSync(path.join(process.cwd(), 'src/components'))
    .filter((name: string) => name.endsWith('.tsx'))
    .map((name: string) => read(`src/components/${name}`))
    .join('\n');
  expect(read('src/components/AppText.tsx')).toContain('allowFontScaling');
  expect(components).not.toMatch(/allowFontScaling={false}|numberOfLines=/);
});

test('security and clinical-safety boundaries remain free of direct clients and autonomous actions', () => {
  const source = fs
    .readdirSync(path.join(process.cwd(), 'src/services'))
    .map((name: string) => read(`src/services/${name}`))
    .join('\n');
  expect(source).not.toMatch(
    /@aws-sdk|Gemini|OpenSearch|mysql|diagnosePatient|prescribeMedication|dispatchEmergency/,
  );
  expect(read('src/components/DrugInformationView.tsx')).toContain(
    'human_translation_required',
  );
  expect(read('src/components/VoiceControls.tsx')).toContain(
    'CONFIRM_REQUIRED',
  );
});
