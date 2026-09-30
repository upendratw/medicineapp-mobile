import type { ComponentProps } from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { FamilyCaregivers } from '@/components/FamilyCaregivers';
import type { CaregiverRelationshipService } from '@/services/caregiverRelationshipService';
import { PreferencesProvider } from '@/state/PreferencesContext';

function service(overrides: Partial<CaregiverRelationshipService> = {}) {
  return {
    listInvitations: jest.fn().mockResolvedValue([]),
    listRelationships: jest.fn().mockResolvedValue([]),
    invite: jest.fn().mockResolvedValue(undefined),
    accept: jest.fn().mockResolvedValue(undefined),
    decline: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    revoke: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies CaregiverRelationshipService;
}

function view(props: ComponentProps<typeof FamilyCaregivers>) {
  return (
    <PreferencesProvider>
      <FamilyCaregivers {...props} />
    </PreferencesProvider>
  );
}

test('patient adds caregiver with bounded permission selection and pending state', async () => {
  const api = service({
    listInvitations: jest.fn().mockResolvedValue([
      {
        invitationId: 'invite-1',
        destination: '***0007',
        patientDisplayName: 'Patient',
        permissions: ['alerts.read'],
        status: 'pending',
        expiresAt: '2026-10-02T00:00:00Z',
      },
    ]),
  });
  const screen = await render(view({ role: 'patient', service: api }));
  await screen.findByText('Add caregiver');
  expect(screen.getByText('***0007')).toBeTruthy();

  await fireEvent.changeText(
    screen.getByLabelText('Caregiver mobile number'),
    '9000000007',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Send invitation' }),
  );
  expect(
    await screen.findByText(/Choose at least one permission\./),
  ).toBeTruthy();

  await fireEvent.press(
    screen.getByRole('checkbox', { name: 'Receive medication alerts: Off' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Send invitation' }),
  );
  await waitFor(() =>
    expect(api.invite).toHaveBeenCalledWith('+919000000007', ['alerts.read']),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Send invitation' }).props
        .accessibilityState.busy,
    ).toBe(false),
  );
});

test('patient edits sharing and permissions and explicitly confirms revoke', async () => {
  const api = service({
    listRelationships: jest.fn().mockResolvedValue([
      {
        relationshipId: 'relationship-1',
        caregiverDisplayName: 'Caregiver',
        permissions: ['alerts.read'],
        sharingEnabled: true,
        status: 'active',
      },
    ]),
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const screen = await render(view({ role: 'patient', service: api }));
  await screen.findByText('Caregiver');

  await fireEvent.press(screen.getByRole('button', { name: 'Sharing is on' }));
  await fireEvent.press(
    screen.getAllByRole('checkbox', { name: 'View medications: Off' })[0],
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save permissions' }),
  );
  await waitFor(() =>
    expect(api.update).toHaveBeenCalledWith(
      'relationship-1',
      ['alerts.read', 'medications.read'],
      false,
    ),
  );

  await fireEvent.press(
    screen.getByRole('button', { name: 'Revoke caregiver access' }),
  );
  const buttons = alert.mock.calls[0]?.[2];
  const destructive = buttons?.find((button) => button.style === 'destructive');
  await act(async () => {
    destructive?.onPress?.();
  });
  await waitFor(() =>
    expect(api.revoke).toHaveBeenCalledWith('relationship-1'),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save permissions' }).props
        .accessibilityState.busy,
    ).toBe(false),
  );
  alert.mockRestore();
});

test('caregiver sees only pending invitations and can accept', async () => {
  const api = service({
    listInvitations: jest.fn().mockResolvedValue([
      {
        invitationId: 'invite-2',
        destination: '***0007',
        patientDisplayName: 'Family member',
        permissions: ['alerts.read', 'adherence.read'],
        status: 'pending',
        expiresAt: '2026-10-02T00:00:00Z',
      },
    ]),
  });
  const accepted = jest.fn();
  const screen = await render(
    view({ role: 'caregiver', service: api, onAccepted: accepted }),
  );
  await screen.findByText('Family member');
  expect(screen.queryByText('Add caregiver')).toBeNull();

  await fireEvent.press(
    screen.getByRole('button', { name: 'Accept invitation' }),
  );
  await waitFor(() => expect(api.accept).toHaveBeenCalledWith('invite-2'));
  await waitFor(() => expect(accepted).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Accept invitation' }).props
        .accessibilityState.busy,
    ).toBe(false),
  );
});

test('caregiver can decline a pending invitation', async () => {
  const api = service({
    listInvitations: jest.fn().mockResolvedValue([
      {
        invitationId: 'invite-3',
        destination: '***0007',
        patientDisplayName: 'Family member',
        permissions: ['alerts.read'],
        status: 'pending',
        expiresAt: '2026-10-02T00:00:00Z',
      },
    ]),
  });
  const screen = await render(view({ role: 'caregiver', service: api }));
  await screen.findByText('Family member');

  await fireEvent.press(
    screen.getByRole('button', { name: 'Decline invitation' }),
  );
  await waitFor(() => expect(api.decline).toHaveBeenCalledWith('invite-3'));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Accept invitation' }).props
        .accessibilityState.busy,
    ).toBe(false),
  );
});

test('API failure uses an accessible neutral state', async () => {
  const api = service({
    listInvitations: jest.fn().mockRejectedValue(new Error('offline')),
  });
  const screen = await render(view({ role: 'caregiver', service: api }));
  expect(
    await screen.findByText(
      /Family and caregiver access could not be loaded\. Please try again\./,
    ),
  ).toBeTruthy();
});
