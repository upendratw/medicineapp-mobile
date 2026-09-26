import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockRequestOtp = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ requestOtp: mockRequestOtp }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import LoginScreen from '@/app/(auth)/login';

beforeEach(() => {
  jest.clearAllMocks();
});

test('patient is selected by default and remains the ordinary login path', async () => {
  const screen = await render(<LoginScreen />);
  expect(
    screen.getByRole('radio', { name: 'Sign in as Patient' }).props
      .accessibilityState,
  ).toMatchObject({ selected: true });
  await fireEvent.changeText(
    screen.getByLabelText('Indian mobile number'),
    '98765 43210',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Send verification code' }),
  );
  await waitFor(() =>
    expect(mockRequestOtp).toHaveBeenCalledWith('+919876543210', 'patient'),
  );
});

test('caregiver must be explicitly selected and role changes do not leak stale state', async () => {
  const screen = await render(<LoginScreen />);
  await fireEvent.press(
    screen.getByRole('radio', { name: 'Sign in as Caregiver' }),
  );
  expect(
    screen.getByRole('radio', { name: 'Sign in as Caregiver' }).props
      .accessibilityState,
  ).toMatchObject({ selected: true });
  await fireEvent.press(
    screen.getByRole('radio', { name: 'Sign in as Patient' }),
  );
  await fireEvent.press(
    screen.getByRole('radio', { name: 'Sign in as Caregiver' }),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Indian mobile number'),
    '98765 43210',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Send verification code' }),
  );
  await waitFor(() =>
    expect(mockRequestOtp).toHaveBeenCalledWith('+919876543210', 'caregiver'),
  );
});
