import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { CaregiverEmailSettings } from '@/components/CaregiverEmailSettings';
import type { CaregiverEmailService } from '@/services/caregiverEmailService';

const mockT = (key: string) => key;
jest.mock('@/localization', () => ({
  useTranslation: () => ({ t: mockT }),
}));

const service: jest.Mocked<CaregiverEmailService> = {
  status: jest.fn(),
  request: jest.fn(),
  resend: jest.fn(),
  confirm: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  service.status.mockResolvedValue({
    state: 'none',
    identityId: null,
    challengeId: null,
    maskedEmail: null,
    verifiedAt: null,
  });
});

test('requests a code then verifies it without showing a fake success', async () => {
  service.request.mockResolvedValue({
    identityId: 'identity-id',
    challengeId: 'challenge-id',
    maskedEmail: 'c***@example.com',
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
  });
  service.confirm.mockResolvedValue({
    state: 'verified',
    identityId: 'identity-id',
    challengeId: null,
    maskedEmail: 'c***@example.com',
    verifiedAt: '2026-10-02T00:00:00Z',
  });
  const screen = await render(<CaregiverEmailSettings service={service} />);
  await waitFor(() => expect(service.status).toHaveBeenCalledTimes(1));

  await fireEvent.changeText(
    screen.getByLabelText('caregiverEmailAddress'),
    'caregiver@example.com',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'caregiverEmailRequest' }),
  );
  await waitFor(() =>
    expect(service.request).toHaveBeenCalledWith('caregiver@example.com'),
  );
  expect(screen.queryByText(/caregiverEmailVerified:/)).toBeNull();

  await fireEvent.changeText(
    screen.getByLabelText('caregiverEmailCode'),
    '12a3456',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'caregiverEmailVerify' }),
  );
  await waitFor(() =>
    expect(service.confirm).toHaveBeenCalledWith('challenge-id', '123456'),
  );
  expect(screen.getByText(/caregiverEmailVerified:/)).toBeTruthy();
});

test('verified state supports deliberate replacement', async () => {
  service.status.mockResolvedValue({
    state: 'verified',
    identityId: 'identity-id',
    challengeId: null,
    maskedEmail: 'c***@example.com',
    verifiedAt: '2026-10-02T00:00:00Z',
  });
  const screen = await render(<CaregiverEmailSettings service={service} />);
  await waitFor(() =>
    expect(screen.getByText(/caregiverEmailVerified:/)).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'caregiverEmailReplace' }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText('caregiverEmailAddress')).toBeTruthy(),
  );
});

test('a failed request remains failure and exposes no submitted address', async () => {
  service.request.mockRejectedValue(new Error('provider secret'));
  const screen = await render(<CaregiverEmailSettings service={service} />);
  await waitFor(() => expect(service.status).toHaveBeenCalled());
  await fireEvent.changeText(
    screen.getByLabelText('caregiverEmailAddress'),
    'private@example.com',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'caregiverEmailRequest' }),
  );
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.queryByText(/private@example.com/)).toBeNull();
});
