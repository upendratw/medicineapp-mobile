import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { PrivacyCenter } from '@/components/PrivacyCenter';
import type { PrivacyService } from '@/services/privacyService';

const mockPush = jest.fn();
const mockLogout = jest.fn();
const mockT = (key: string) => key;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/localization', () => ({
  useTranslation: () => ({ language: 'en-IN', t: mockT }),
}));
jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ role: 'patient', logout: mockLogout }),
}));

const service: jest.Mocked<PrivacyService> = {
  profile: jest.fn(),
  updateDisplayName: jest.fn(),
  capabilities: jest.fn(),
  erasureStatus: jest.fn(),
  notice: jest.fn(),
  exportData: jest.fn(),
  requestDeletion: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  service.profile.mockResolvedValue({ display_name: 'Synthetic Patient' });
  service.updateDisplayName.mockResolvedValue();
  service.capabilities.mockResolvedValue({
    subject_role: 'patient',
    capabilities: [
      { capability: 'ACCESS_EXPORT', status: 'available', reason: 'available' },
      {
        capability: 'SYMPTOM_CORRECTION',
        status: 'policy_pending',
        reason: 'pending',
      },
    ],
    post_deactivation_status: { status: 'unavailable', reason: 'inactive' },
  });
  service.erasureStatus.mockResolvedValue({
    status: 'NOT_REQUESTED',
    message_code: 'no_erasure_request',
  });
  service.notice.mockResolvedValue({
    notice_version: 'r1-draft',
    locale: 'en-IN',
    approval_status: 'privacy_legal_review_pending',
    title: 'Privacy notice',
    review_status: 'Legal review pending',
    sections: [{ heading: 'Controls', body: 'Use available controls.' }],
  });
});

test('renders accessible controls, policy-pending correction, notice and bounded status', async () => {
  const screen = await render(<PrivacyCenter service={service} />);
  await waitFor(() => expect(screen.getByText('privacyYourData')).toBeTruthy());

  expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
    'Warning: privacySymptomPending',
  );
  expect(screen.getAllByRole('alert')[1]).toHaveTextContent(
    'Warning: Legal review pending',
  );
  expect(screen.getByText(/NOT_REQUESTED/)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('privacyDisplayName'),
    'Updated Patient',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'privacySaveProfile' }),
  );
  await waitFor(() =>
    expect(service.updateDisplayName).toHaveBeenCalledWith(
      'patient',
      'Updated Patient',
    ),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'privacyMedicationCorrection' }),
  );
  expect(mockPush).toHaveBeenCalledWith('/medicines');
});

test('shares only the server-returned self export and does not fake success', async () => {
  service.exportData.mockResolvedValue({ schema_version: 'self-export-v1' });
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  const screen = await render(<PrivacyCenter service={service} />);
  await waitFor(() => expect(screen.getByText('privacyYourData')).toBeTruthy());

  await fireEvent.press(screen.getByRole('button', { name: 'privacyExport' }));
  await waitFor(() => expect(service.exportData).toHaveBeenCalledTimes(1));
  expect(Share.share).toHaveBeenCalledWith({
    message: JSON.stringify({ schema_version: 'self-export-v1' }, null, 2),
  });
});

test('account deletion requires destructive confirmation', async () => {
  const alert = jest.spyOn(require('react-native').Alert, 'alert');
  const screen = await render(<PrivacyCenter service={service} />);
  await waitFor(() => expect(screen.getByText('privacyYourData')).toBeTruthy());

  await fireEvent.press(
    screen.getByRole('button', { name: 'privacyDeleteAction' }),
  );
  expect(alert).toHaveBeenCalledWith(
    'privacyDeleteConfirmTitle',
    'privacyDeleteConfirmBody',
    expect.arrayContaining([expect.objectContaining({ style: 'destructive' })]),
  );
  expect(service.requestDeletion).not.toHaveBeenCalled();
});
