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
  const activeRelationship = {
    relationshipId: 'relationship-1',
    caregiverDisplayName: 'Caregiver',
    permissions: ['alerts.read'] as const,
    sharingEnabled: true,
    status: 'active',
  };
  const api = service({
    listRelationships: jest
      .fn()
      .mockResolvedValueOnce([activeRelationship])
      .mockResolvedValueOnce([activeRelationship])
      .mockResolvedValueOnce([
        { ...activeRelationship, sharingEnabled: false, status: 'revoked' },
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
  await waitFor(() => expect(screen.queryByText('Caregiver')).toBeNull());
  expect(screen.queryByRole('button', { name: 'Sharing is on' })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Revoke caregiver access' }),
  ).toBeNull();
  alert.mockRestore();
});

test('patient focus refresh removes a relationship revoked on the server', async () => {
  const activeRelationship = {
    relationshipId: 'relationship-1',
    caregiverDisplayName: 'Caregiver',
    permissions: ['alerts.read'] as const,
    sharingEnabled: true,
    status: 'active',
  };
  const api = service({
    listInvitations: jest.fn().mockResolvedValue([
      {
        invitationId: 'invite-1',
        destination: '***0008',
        patientDisplayName: 'Patient',
        permissions: ['alerts.read'],
        status: 'pending',
        expiresAt: '2026-10-02T00:00:00Z',
      },
    ]),
    listRelationships: jest
      .fn()
      .mockResolvedValueOnce([activeRelationship])
      .mockResolvedValueOnce([
        { ...activeRelationship, sharingEnabled: false, status: 'revoked' },
      ]),
  });
  const initialProps = { role: 'patient' as const, service: api };
  const screen = await render(view({ ...initialProps, refreshKey: 0 }));
  await screen.findByText('Caregiver');
  expect(screen.getByText('***0008')).toBeTruthy();

  await act(async () => {
    screen.rerender(view({ ...initialProps, refreshKey: 1 }));
  });

  await waitFor(() => expect(api.listRelationships).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Caregiver')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sharing is on' })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Revoke caregiver access' }),
  ).toBeNull();
  expect(screen.getByText('***0008')).toBeTruthy();
});

test('successful revoke remains removed when reconciliation refresh fails', async () => {
  const api = service({
    listRelationships: jest
      .fn()
      .mockResolvedValueOnce([
        {
          relationshipId: 'relationship-1',
          caregiverDisplayName: 'Caregiver',
          permissions: ['alerts.read'],
          sharingEnabled: true,
          status: 'active',
        },
      ])
      .mockRejectedValueOnce(new Error('offline')),
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const screen = await render(view({ role: 'patient', service: api }));
  await screen.findByText('Caregiver');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Revoke caregiver access' }),
  );
  const destructive = alert.mock.calls[0]?.[2]?.find(
    (button) => button.style === 'destructive',
  );

  await act(async () => {
    destructive?.onPress?.();
  });

  await waitFor(() => expect(screen.queryByText('Caregiver')).toBeNull());
  expect(
    await screen.findByText(
      /Family and caregiver access could not be loaded\. Please try again\./,
    ),
  ).toBeTruthy();
  alert.mockRestore();
});

test('failed revoke preserves the authorized relationship', async () => {
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
    revoke: jest.fn().mockRejectedValue(new Error('offline')),
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const screen = await render(view({ role: 'patient', service: api }));
  await screen.findByText('Caregiver');

  await fireEvent.press(
    screen.getByRole('button', { name: 'Revoke caregiver access' }),
  );
  const destructive = alert.mock.calls[0]?.[2]?.find(
    (button) => button.style === 'destructive',
  );
  await act(async () => {
    destructive?.onPress?.();
  });

  expect(await screen.findByText('Caregiver')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Revoke caregiver access' }),
  ).toBeTruthy();
  alert.mockRestore();
});

test('double confirmation cannot submit duplicate revoke mutations', async () => {
  let finishRevoke: (() => void) | undefined;
  const revoke = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finishRevoke = resolve;
      }),
  );
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
    revoke,
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const screen = await render(view({ role: 'patient', service: api }));
  await screen.findByText('Caregiver');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Revoke caregiver access' }),
  );
  const destructive = alert.mock.calls[0]?.[2]?.find(
    (button) => button.style === 'destructive',
  );

  await act(async () => {
    destructive?.onPress?.();
    destructive?.onPress?.();
  });
  expect(revoke).toHaveBeenCalledTimes(1);
  await act(async () => finishRevoke?.());
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
