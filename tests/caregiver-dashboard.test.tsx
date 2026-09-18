import type { ComponentProps } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ApiError } from '@/api/client';
import { CaregiverDashboard } from '@/components';
import { classifyCaregiverFailure } from '@/services/caregiverService';
import { PreferencesProvider } from '@/state/PreferencesContext';

const patient = {
  patientUserId: 'stable-patient-id',
  displayName: 'Family member',
  relationshipId: 'relationship-id',
  statusText: 'Caregiver access active',
};

const view = (props: ComponentProps<typeof CaregiverDashboard>) => (
  <PreferencesProvider>
    <CaregiverDashboard {...props} />
  </PreferencesProvider>
);

test('caregiver dashboard renders only an authorized selected context', async () => {
  const select = jest.fn();
  const screen = await render(
    view({
      patients: [patient],
      selected: patient.patientUserId,
      data: {
        patientName: patient.displayName,
        timezone: 'Asia/Kolkata',
        scheduled: 3,
        taken: 2,
        missed: 1,
        adherencePercentage: 66.67,
        recentActivity: ['Missed scheduled occurrence'],
      },
      loading: false,
      error: null,
      onSelect: select,
      onRetry: jest.fn(),
      onBack: jest.fn(),
    }),
  );
  expect(screen.getByText('Missed-dose indicator')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Family member' }));
  expect(select).toHaveBeenCalledWith('stable-patient-id');
  expect(screen.toJSON()).not.toContain('change medication');
});

test('caregiver dashboard fails safely without context or backend', async () => {
  const empty = await render(
    view({
      patients: [],
      selected: null,
      data: null,
      loading: false,
      error: null,
      onSelect: jest.fn(),
      onRetry: jest.fn(),
      onBack: jest.fn(),
    }),
  );
  expect(empty.getByText('No authorized family members')).toBeTruthy();
  const failed = await render(
    view({
      patients: [patient],
      selected: null,
      data: null,
      loading: false,
      error: 'temporary',
      onSelect: jest.fn(),
      onRetry: jest.fn(),
      onBack: jest.fn(),
    }),
  );
  expect(failed.getByText(/temporarily unavailable/)).toBeTruthy();
});

test('403 renders neutral caregiver access copy and patient-home recovery', async () => {
  const onBack = jest.fn();
  const screen = await render(
    view({
      patients: [],
      selected: null,
      data: null,
      loading: false,
      error: 'forbidden',
      onSelect: jest.fn(),
      onRetry: jest.fn(),
      onBack,
    }),
  );
  expect(screen.getByText('Caregiver access is not available')).toBeTruthy();
  expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  expect(
    screen.queryByText(/FORBIDDEN|HTTP 403|permission for this operation/i),
  ).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Return to patient home' }),
  );
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('caregiver failures preserve authentication and availability boundaries', () => {
  expect(classifyCaregiverFailure(new ApiError('SESSION_EXPIRED', 401))).toBe(
    'authentication',
  );
  expect(classifyCaregiverFailure(new ApiError('FORBIDDEN', 403))).toBe(
    'forbidden',
  );
  expect(classifyCaregiverFailure(new ApiError('REQUEST_FAILED', 503))).toBe(
    'temporary',
  );
  expect(classifyCaregiverFailure(new Error('offline'))).toBe('temporary');
});
