import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { PushRegistrationSettings } from '@/components/PushRegistrationSettings';
import type { PushRegistrationResult } from '@/services/pushRegistration';

const mockRegister = jest.fn();
const mockState: {
  result: PushRegistrationResult | null;
  loading: boolean;
} = { result: null, loading: false };

jest.mock('@/state/PushRegistrationContext', () => ({
  usePushRegistration: () => ({ ...mockState, register: mockRegister }),
}));
jest.mock('@/localization', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockState.result = null;
  mockState.loading = false;
});

test.each([
  null,
  { status: 'unavailable' } as const,
  { status: 'offline' } as const,
  { status: 'rate_limited', retryAfterSeconds: 20 } as const,
])(
  'retryable state %# keeps Enable notifications actionable',
  async (result) => {
    mockState.result = result;
    const screen = await render(<PushRegistrationSettings />);
    const action = screen.getByRole('button', {
      name: 'enableNotifications',
    });
    expect(action.props.accessibilityState.disabled).toBeFalsy();
    fireEvent.press(action);
    expect(mockRegister).toHaveBeenCalledTimes(1);
  },
);

test('rate limited state communicates bounded retry without displaying token data', async () => {
  mockState.result = { status: 'rate_limited', retryAfterSeconds: 20 };
  const screen = await render(<PushRegistrationSettings />);
  expect(JSON.stringify(screen.toJSON())).toContain('registrationRateLimited');
  expect(JSON.stringify(screen.toJSON())).not.toContain('ExponentPushToken');
});

test('registration in progress prevents duplicate taps', async () => {
  mockState.loading = true;
  const screen = await render(<PushRegistrationSettings />);
  const action = screen.getByRole('button', {
    name: 'enableNotifications',
  });
  expect(action.props.accessibilityState).toMatchObject({
    disabled: true,
    busy: true,
  });
  fireEvent.press(action);
  expect(mockRegister).not.toHaveBeenCalled();
});

test('denied permission exposes enabled Android settings recovery', async () => {
  mockState.result = { status: 'denied' };
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const screen = await render(<PushRegistrationSettings />);
  expect(
    screen.queryByRole('button', { name: 'enableNotifications' }),
  ).toBeNull();
  const recovery = screen.getByRole('button', {
    name: 'openNotificationSettings',
  });
  expect(recovery.props.accessibilityState.disabled).toBeFalsy();
  fireEvent.press(recovery);
  expect(openSettings).toHaveBeenCalledTimes(1);
});

test('registered state is clear and has no redundant registration action', async () => {
  mockState.result = { status: 'registered', deviceId: 'synthetic-device' };
  const screen = await render(<PushRegistrationSettings />);
  expect(JSON.stringify(screen.toJSON())).toContain('registrationComplete');
  expect(
    screen.queryByRole('button', { name: 'enableNotifications' }),
  ).toBeNull();
});

test.each(['unsupported_runtime', 'unsupported_personal_team'] as const)(
  '%s leaves registration action safely disabled',
  async (status) => {
    mockState.result = { status };
    const screen = await render(<PushRegistrationSettings />);
    expect(
      screen.getByRole('button', { name: 'enableNotifications' }).props
        .accessibilityState.disabled,
    ).toBe(true);
  },
);
