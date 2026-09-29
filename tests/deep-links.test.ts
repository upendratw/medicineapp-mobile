import {
  parseNotificationIntent,
  resolveDeepLink,
  resolveNotificationDestination,
} from '@/navigation/DeepLinkService';
import { resolveRouteGroup } from '@/navigation/guard';

test.each([
  ['medicineapp://home', '/home'],
  ['medicineapp://medicines', '/medicines'],
  ['medicineapp://schedule', '/schedule'],
  ['medicineapp://history', '/medication-history'],
  ['medicineapp://drug-information', '/medication-information'],
  ['medicineapp://accessibility', '/accessibility-settings'],
  ['medicineapp://language', '/language-settings'],
  ['medicineapp://inventory', '/inventory'],
  ['medicineapp://interactions', '/interactions'],
])('accepts whitelisted custom-scheme route %s', (url, destination) =>
  expect(resolveDeepLink(url)).toEqual({ destination, accepted: true }),
);

test.each([
  'https://example.com/home',
  'not a url',
  'medicineapp://unknown',
  `medicineapp://${'a'.repeat(65)}`,
  'medicineapp://home?token=secret',
  'medicineapp://home?otp=1234',
  'medicineapp://symptom/free-text',
  'medicineapp://caregiver/private',
  'medicineapp://reminder/taken',
  'medicineapp://sos',
  'medicineapp://medicines?action=skip',
  'medicineapp://home#prescription',
])('rejects unsafe or malformed link without crashing: %s', (url) =>
  expect(resolveDeepLink(url)).toMatchObject({
    destination: '/home',
    accepted: false,
  }),
);

test('deep links remain subordinate to authentication and onboarding guards', () => {
  expect(resolveRouteGroup('unauthenticated', true)).toBe('auth');
  expect(resolveRouteGroup('authenticated', false)).toBe('onboarding');
  expect(resolveRouteGroup('authenticated', true)).toBe('app');
});

test('notification destinations use the same action-free protected whitelist', () => {
  expect(resolveNotificationDestination('/schedule')).toMatchObject({
    destination: '/schedule',
    accepted: true,
  });
  expect(
    resolveNotificationDestination('/reminder?action=taken'),
  ).toMatchObject({ destination: '/home', accepted: false });
  expect(resolveNotificationDestination('/sos')).toMatchObject({
    destination: '/home',
    accepted: false,
  });
  expect(resolveNotificationDestination({ route: '/home' })).toMatchObject({
    destination: '/home',
    accepted: false,
  });
});

test('accepts only the bounded opaque reminder notification contract', () => {
  const reminderId = '00000000-0000-4000-8000-000000000001';
  expect(
    parseNotificationIntent({
      type: 'medicineapp.reminder.due',
      schema_version: 1,
      reminder_id: reminderId,
    }),
  ).toEqual({ type: 'reminder', reminderId });
});

test('accepts only the exact privacy-safe caregiver alert notification contract', () => {
  expect(
    parseNotificationIntent({
      type: 'caregiver_alert',
      schema_version: 1,
    }),
  ).toEqual({ type: 'caregiver_alerts' });
});

test.each([
  {},
  { schema_version: 1 },
  { type: 'wrong', schema_version: 1 },
  { type: 'caregiver_alert' },
  { type: 'caregiver_alert', schema_version: '1' },
  { type: 'caregiver_alert', schema_version: 0 },
  { type: 'caregiver_alert', schema_version: 2 },
  null,
  [],
  'caregiver_alert',
  1,
  { type: 'caregiver_alert', schema_version: 1, extra: true },
  { type: 'caregiver_alert', schema_version: 1, route: '/caregiver-alerts' },
  { type: 'caregiver_alert', schema_version: 1, alert_id: 'alert-one' },
  {
    type: 'caregiver_alert',
    schema_version: 1,
    relationship_id: 'relationship-one',
  },
  { type: 'caregiver_alert', schema_version: 1, patient_id: 'patient-one' },
  { type: 'caregiver_alert', schema_version: 1, data: { arbitrary: true } },
  {
    type: 'caregiver_alert',
    schema_version: 1,
    reminder_id: '00000000-0000-4000-8000-000000000001',
  },
])(
  'rejects malformed, identifying, mixed, or extra-key caregiver payload %#',
  (payload) => {
    expect(parseNotificationIntent(payload)).toBeNull();
  },
);

test.each([
  null,
  '/reminder',
  { type: 'medicineapp.reminder.due', schema_version: 1 },
  {
    type: 'medicineapp.reminder.due',
    schema_version: 1,
    reminder_id: 'not-a-uuid',
  },
  {
    type: 'medicineapp.reminder.due',
    schema_version: 2,
    reminder_id: '00000000-0000-4000-8000-000000000001',
  },
  {
    type: 'medicineapp.reminder.due',
    schema_version: 1,
    reminder_id: '00000000-0000-4000-8000-000000000001',
    route: '/reminder?action=taken',
  },
])('rejects malformed or action-bearing notification payloads', (payload) => {
  expect(parseNotificationIntent(payload)).toBeNull();
});

test('deep-link implementation does not persist payloads or accept arbitrary forwarding', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source =
    fs.readFileSync(
      path.join(process.cwd(), 'src/navigation/DeepLinkService.ts'),
      'utf8',
    ) +
    fs.readFileSync(
      path.join(process.cwd(), 'src/navigation/DeepLinkContext.tsx'),
      'utf8',
    );
  expect(source).not.toMatch(/AsyncStorage|SecureStore|openURL|fetch\(/);
  expect(source).not.toMatch(
    /taken.*destination|skip.*destination|sos.*destination/i,
  );
});
