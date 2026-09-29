import { renderHook } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(),
  replace: jest.fn(),
};
let mockPathname = '/home';

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}));

import {
  decideAndroidBack,
  executeAndroidBack,
  formatAndroidBackDiagnostic,
  sanitizeAndroidBackPath,
  useAndroidHomeBack,
} from '@/navigation/useAndroidHomeBack';

afterEach(() => {
  jest.restoreAllMocks();
  mockRouter.back.mockReset();
  mockRouter.canGoBack.mockReset();
  mockRouter.replace.mockReset();
  mockPathname = '/home';
});

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

test('development diagnostics expose only allowlisted pathnames', () => {
  expect(sanitizeAndroidBackPath('/medicines?patientId=private')).toBe(
    '/medicines',
  );
  expect(sanitizeAndroidBackPath('/edit-medicine/private-record')).toBe(
    '/other',
  );
  const line = formatAndroidBackDiagnostic(
    'press',
    '/medicines?patientId=private',
    { canGoBack: true, action: 'router.back' },
  );
  expect(line).toBe(
    '[AndroidBack] press path=/medicines canGoBack=true action=router.back',
  );
  expect(line).not.toMatch(/private|patientId|\?/);
});

test('Caregiver alert detail consumes Back and replaces with the alert inbox', () => {
  const back = jest.fn();
  const replace = jest.fn();

  expect(
    executeAndroidBack(
      '/caregiver-alerts/relationship-opaque/alert-opaque',
      false,
      { back, replace },
    ),
  ).toBe(true);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith('/caregiver-alerts');
  expect(back).not.toHaveBeenCalled();
  expect(
    sanitizeAndroidBackPath(
      '/caregiver-alerts/relationship-opaque/alert-opaque',
    ),
  ).toBe('/caregiver-alerts/detail');
});

test('Caregiver alert inbox consumes Back and replaces with the Caregiver dashboard', () => {
  const back = jest.fn();
  const replace = jest.fn();

  expect(executeAndroidBack('/caregiver-alerts', true, { back, replace })).toBe(
    true,
  );
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith('/caregiver-dashboard');
  expect(back).not.toHaveBeenCalled();
});

test('Caregiver alert matching is bounded to the inbox and two-segment detail route', () => {
  const back = jest.fn();
  const replace = jest.fn();

  expect(
    executeAndroidBack('/caregiver-alerts/relationship-only', true, {
      back,
      replace,
    }),
  ).toBe(false);
  expect(
    executeAndroidBack(
      '/caregiver-alerts/relationship/alert/unrelated-child',
      true,
      { back, replace },
    ),
  ).toBe(false);
  expect(back).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});

test('route changes remove the previous Back handler before registering the next one', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  const removals = [jest.fn(), jest.fn()];
  const handlers: Array<Parameters<typeof BackHandler.addEventListener>[1]> =
    [];
  let registration = 0;
  const addEventListener = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      handlers.push(handler);
      return { remove: removals[registration++] };
    });
  mockPathname = '/caregiver-alerts/relationship-opaque/alert-opaque';
  mockRouter.canGoBack.mockReturnValue(false);

  try {
    const hook = await renderHook(() => useAndroidHomeBack());
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(removals[0]).not.toHaveBeenCalled();

    expect(handlers[0]?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(
      true,
    );
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/caregiver-alerts');

    mockPathname = '/caregiver-alerts';
    await hook.rerender({});
    expect(removals[0]).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(removals[1]).not.toHaveBeenCalled();

    await hook.unmount();
    expect(removals[1]).toHaveBeenCalledTimes(1);
  } finally {
    platform.restore();
  }
});
