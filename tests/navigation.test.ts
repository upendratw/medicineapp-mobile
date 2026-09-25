import { resolveRouteGroup } from '@/navigation/guard';

const read = (file: string) =>
  require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), file),
    'utf8',
  );

test('waits while session restoration is in progress', () =>
  expect(resolveRouteGroup('restoring', false)).toBeNull());
test('routes unauthenticated users to auth', () =>
  expect(resolveRouteGroup('unauthenticated', false)).toBe('auth'));
test('routes authenticated users with incomplete onboarding to onboarding', () =>
  expect(resolveRouteGroup('authenticated', false)).toBe('onboarding'));
test('routes fully initialized users to the protected app', () =>
  expect(resolveRouteGroup('authenticated', true)).toBe('app'));
test('routes logout state back to auth regardless of onboarding', () =>
  expect(resolveRouteGroup('unauthenticated', true)).toBe('auth'));
test('fails closed on session restoration errors', () =>
  expect(resolveRouteGroup('error', true)).toBe('auth'));

test('authenticated stack anchors ordinary and deep-linked children at Home', () => {
  const layout = read('src/app/(app)/_layout.tsx');
  const homeRoutes = `${read('src/app/(app)/home.tsx')}\n${read(
    'src/components/PatientDashboard.tsx',
  )}`;
  expect(layout).toContain("anchor: 'home'");
  for (const destination of [
    '/medicines',
    '/add-medicine',
    '/notification-settings',
  ]) {
    expect(homeRoutes).toContain(destination);
  }
});

test('completed reminder actions clear stale intent and replace with Home', () => {
  const reminder = read('src/app/(app)/reminder.tsx');
  expect(reminder).toContain('clear();');
  expect(reminder).toContain('clearLastResponse()');
  expect(reminder).toContain("router.replace('/home')");
});
