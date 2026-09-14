import { fireEvent, render } from '@testing-library/react-native';
import { PatientDashboard } from '@/components';
import type { PatientDashboardData } from '@/types/dashboard';

const empty: PatientDashboardData = {
  medicines: [],
  schedules: [],
  todayScheduled: 0,
  recentlyTaken: null,
  integrationPending: true,
};

test('patient dashboard renders safe empty summaries and quick actions', async () => {
  const navigate = jest.fn();
  const screen = await render(
    <PatientDashboard
      data={empty}
      loading={false}
      error={false}
      onNavigate={navigate}
      onRetry={jest.fn()}
    />,
  );
  expect(screen.getByText('No upcoming schedule')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'View medicines' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add medicine' }));
  await fireEvent.press(screen.getByRole('button', { name: 'View schedule' }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Medication information' }),
  );
  expect(navigate.mock.calls.flat()).toEqual([
    '/medicines',
    '/add-medicine',
    '/schedule',
    '/medication-information',
  ]);
  expect(screen.toJSON()).not.toContain('adjust your dose');
});

test('patient dashboard exposes loading and sanitized error states', async () => {
  const loading = await render(
    <PatientDashboard
      data={null}
      loading
      error={false}
      onNavigate={jest.fn()}
      onRetry={jest.fn()}
    />,
  );
  expect(loading.getByLabelText('Loading your dashboard')).toBeTruthy();
  await loading.unmount();
  const retry = jest.fn();
  const failed = await render(
    <PatientDashboard
      data={null}
      loading={false}
      error
      onNavigate={jest.fn()}
      onRetry={retry}
    />,
  );
  await fireEvent.press(failed.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
