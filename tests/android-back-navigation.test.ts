import { decideAndroidBack } from '@/navigation/useAndroidHomeBack';

test.each([
  '/medicines',
  '/add-medicine',
  '/schedule',
  '/medication-information',
  '/accessibility-settings',
  '/language-settings',
  '/notification-settings',
  '/account-settings',
  '/symptoms',
  '/sos',
  '/voice',
  '/interactions',
  '/prescription-scan',
  '/inventory',
  '/medication-history',
  '/caregiver-dashboard',
])('%s falls back to Home when Android has no valid prior route', (path) => {
  expect(decideAndroidBack(path, false)).toBe('home');
  expect(decideAndroidBack(path, true)).toBe('back');
});

test('Home preserves normal Android exit and nested flows keep their own behavior', () => {
  expect(decideAndroidBack('/home', false)).toBe('system');
  expect(decideAndroidBack('/medicine-camera', false)).toBe('system');
  expect(decideAndroidBack('/edit-medicine', true)).toBe('system');
  expect(decideAndroidBack('/reminder', false)).toBe('system');
});
