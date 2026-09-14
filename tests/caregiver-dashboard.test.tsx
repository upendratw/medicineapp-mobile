import { fireEvent, render } from '@testing-library/react-native';
import { CaregiverDashboard } from '@/components';

const patient = {
  patientUserId: 'stable-patient-id',
  displayName: 'Family member',
  relationshipId: 'relationship-id',
  statusText: 'Caregiver access active',
};

test('caregiver dashboard renders only an authorized selected context', async () => {
  const select = jest.fn();
  const screen = await render(
    <CaregiverDashboard
      patients={[patient]}
      selected={patient.patientUserId}
      data={{
        patientName: patient.displayName,
        timezone: 'Asia/Kolkata',
        scheduled: 3,
        taken: 2,
        missed: 1,
        adherencePercentage: 66.67,
        recentActivity: ['Missed scheduled occurrence'],
      }}
      loading={false}
      error={false}
      onSelect={select}
      onRetry={jest.fn()}
    />,
  );
  expect(screen.getByText('Missed-dose indicator')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Family member' }));
  expect(select).toHaveBeenCalledWith('stable-patient-id');
  expect(screen.toJSON()).not.toContain('change medication');
});

test('caregiver dashboard fails safely without context or backend', async () => {
  const empty = await render(
    <CaregiverDashboard
      patients={[]}
      selected={null}
      data={null}
      loading={false}
      error={false}
      onSelect={jest.fn()}
      onRetry={jest.fn()}
    />,
  );
  expect(empty.getByText('No authorized family members')).toBeTruthy();
  const failed = await render(
    <CaregiverDashboard
      patients={[patient]}
      selected={null}
      data={null}
      loading={false}
      error
      onSelect={jest.fn()}
      onRetry={jest.fn()}
    />,
  );
  expect(failed.getByText(/temporarily unavailable/)).toBeTruthy();
});
