import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));
jest.mock('@/localization', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AccountSettingsScreen from '@/app/(app)/account-settings';

beforeEach(() => {
  jest.clearAllMocks();
});

test('logout is reachable, accessible, and requires deliberate confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation();
  const screen = await render(<AccountSettingsScreen />);
  const button = screen.getByRole('button', { name: 'logout' });
  expect(button.props.accessibilityHint).toBe('logoutHint');
  fireEvent.press(button);
  expect(mockLogout).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith(
    'logoutConfirmTitle',
    'logoutConfirmMessage',
    expect.arrayContaining([
      expect.objectContaining({ style: 'cancel' }),
      expect.objectContaining({ style: 'destructive' }),
    ]),
  );
  const actions = alert.mock.calls[0][2];
  await actions?.find((action) => action.style === 'destructive')?.onPress?.();
  expect(mockLogout).toHaveBeenCalledTimes(1);
});

test('English and Hindi logout localization is complete', () => {
  const { translate } = jest.requireActual(
    '@/localization',
  ) as typeof import('@/localization');
  expect(translate('en-IN', 'logout')).toBe('Log out');
  expect(translate('en-IN', 'logoutConfirmTitle')).toBe('Log out?');
  expect(translate('en-IN', 'logoutConfirmMessage')).toBe(
    'Are you sure you want to log out of MedicineApp on this device?',
  );
  expect(translate('hi-IN', 'logout')).toBe('लॉग आउट करें');
  expect(translate('hi-IN', 'logoutConfirmTitle')).toBe('लॉग आउट करें?');
  expect(translate('hi-IN', 'logoutConfirmMessage')).toBe(
    'क्या आप वाकई इस डिवाइस पर MedicineApp से लॉग आउट करना चाहते हैं?',
  );
  expect(translate('hi-IN', 'logoutHint')).not.toBe(
    translate('en-IN', 'logoutHint'),
  );
});

test('Patient home and Caregiver dashboard expose the account settings route', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/(app)/home.tsx'),
    'utf8',
  );
  expect(source).toContain("router.push('/account-settings')");
  const caregiverSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/(app)/caregiver-dashboard.tsx'),
    'utf8',
  );
  expect(caregiverSource).toContain("router.push('/account-settings')");
});
