import {
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
