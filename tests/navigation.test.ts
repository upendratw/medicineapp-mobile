import { resolveRouteGroup } from '@/navigation/guard';

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
