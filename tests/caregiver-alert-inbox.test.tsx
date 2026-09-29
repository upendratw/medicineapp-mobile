import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { CaregiverAlertInbox } from '@/components/CaregiverAlertInbox';
import type { CaregiverAlertService } from '@/services/caregiverAlertService';
import { PreferencesProvider } from '@/state/PreferencesContext';
import type { CaregiverAlert } from '@/types/caregiverAlert';

const alert = (
  id: string,
  relationshipId = 'relationship-one',
): CaregiverAlert => ({
  alertId: id,
  relationshipId,
  alertType: 'medication_missed',
  severity: 'attention',
  state: 'open',
  sourceType: 'intake',
  occurredAt: '2026-09-29T10:00:00Z',
  acknowledgedAt: null,
  resolvedAt: null,
  cancelledAt: null,
});

const view = (
  service: Pick<
    CaregiverAlertService,
    'listEligibleRelationships' | 'listAlerts'
  >,
  online = true,
  onOpenAlert = jest.fn(),
  focusVersion = 1,
) => (
  <PreferencesProvider>
    <CaregiverAlertInbox
      service={service}
      online={online}
      focusVersion={focusVersion}
      onBack={jest.fn()}
      onOpenAlert={onOpenAlert}
    />
  </PreferencesProvider>
);

test('auto-selects one relationship and renders accessible actionable alert rows', async () => {
  const onOpenAlert = jest.fn();
  const service = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      {
        relationshipId: 'relationship-one',
        label: 'Parent',
        canAcknowledge: true,
      },
    ]),
    listAlerts: jest.fn().mockResolvedValue({
      items: [alert('alert-one')],
      limit: 50,
      offset: 0,
    }),
  };
  const screen = await render(view(service, true, onOpenAlert));
  await waitFor(() =>
    expect(screen.getByText('Medication marked as missed')).toBeTruthy(),
  );
  expect(service.listAlerts).toHaveBeenCalledWith('relationship-one', {
    limit: 50,
    offset: 0,
  });
  expect(screen.getByText('Workflow priority: Attention')).toBeTruthy();
  expect(screen.queryByText('alert-one')).toBeNull();
  const row = screen.getByRole('button', {
    name: /Parent.*Medication marked as missed.*Workflow priority.*Open/,
  });
  await fireEvent.press(row);
  expect(onOpenAlert).toHaveBeenCalledWith('relationship-one', 'alert-one');
  expect(JSON.stringify(onOpenAlert.mock.calls)).not.toContain('Parent');
  expect(JSON.stringify(onOpenAlert.mock.calls)).not.toContain(
    'Medication marked as missed',
  );
});

test('renders bounded zero-relationship and offline states without fetching alerts', async () => {
  const service = {
    listEligibleRelationships: jest.fn().mockResolvedValue([]),
    listAlerts: jest.fn(),
  };
  const empty = await render(view(service));
  await waitFor(() =>
    expect(
      empty.getByText('Caregiver alert access is unavailable'),
    ).toBeTruthy(),
  );
  expect(service.listAlerts).not.toHaveBeenCalled();

  const offlineService = {
    listEligibleRelationships: jest.fn(),
    listAlerts: jest.fn(),
  };
  const offline = await render(view(offlineService, false));
  expect(offline.getByText('Caregiver alerts are offline')).toBeTruthy();
  expect(offlineService.listEligibleRelationships).not.toHaveBeenCalled();
});

test('supports multiple relationship selection and resets scoped results', async () => {
  const service = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      {
        relationshipId: 'relationship-one',
        label: 'Parent',
        canAcknowledge: true,
      },
      {
        relationshipId: 'relationship-two',
        label: 'Family member',
        canAcknowledge: false,
      },
    ]),
    listAlerts: jest.fn(async (relationshipId) => ({
      items: [alert(`alert-${relationshipId}`, relationshipId)],
      limit: 50,
      offset: 0,
    })),
  };
  const screen = await render(view(service));
  await waitFor(() =>
    expect(screen.getByText('Choose a family member')).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Family member: Parent' }),
  );
  await waitFor(() =>
    expect(screen.getByText('Medication marked as missed')).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Family member: Family member' }),
  );
  await waitFor(() =>
    expect(service.listAlerts).toHaveBeenLastCalledWith('relationship-two', {
      limit: 50,
      offset: 0,
    }),
  );
  expect(screen.queryByText('relationship-one')).toBeNull();
});

test('load-more uses offset, deduplicates alert IDs, and stops on a partial page', async () => {
  const firstPage = Array.from({ length: 50 }, (_, index) =>
    alert(`alert-${index}`),
  );
  const service = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      {
        relationshipId: 'relationship-one',
        label: 'Parent',
        canAcknowledge: true,
      },
    ]),
    listAlerts: jest
      .fn()
      .mockResolvedValueOnce({ items: firstPage, limit: 50, offset: 0 })
      .mockResolvedValueOnce({
        items: [alert('alert-49'), alert('alert-50')],
        limit: 50,
        offset: 50,
      }),
  };
  const screen = await render(view(service));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Load more alerts' }),
    ).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Load more alerts' }),
  );
  await waitFor(() => expect(service.listAlerts).toHaveBeenCalledTimes(2));
  expect(service.listAlerts).toHaveBeenLastCalledWith('relationship-one', {
    limit: 50,
    offset: 50,
  });
  expect(screen.queryByRole('button', { name: 'Load more alerts' })).toBeNull();
  expect(screen.getAllByText('Medication marked as missed')).toHaveLength(51);
});

test('generic failures expose Retry while access failures remain non-enumerating', async () => {
  const temporary = {
    listEligibleRelationships: jest
      .fn()
      .mockRejectedValue(new Error('offline detail')),
    listAlerts: jest.fn(),
  };
  const failed = await render(view(temporary));
  await waitFor(() =>
    expect(failed.getByRole('button', { name: 'Retry' })).toBeTruthy(),
  );
  expect(failed.queryByText(/offline detail/)).toBeNull();
});

test('ignores a stale previous-relationship response after a relationship switch', async () => {
  let resolveFirst!: (value: {
    items: readonly CaregiverAlert[];
    limit: number;
    offset: number;
  }) => void;
  const first = new Promise<{
    items: readonly CaregiverAlert[];
    limit: number;
    offset: number;
  }>((resolve) => {
    resolveFirst = resolve;
  });
  const service = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      {
        relationshipId: 'relationship-one',
        label: 'Parent',
        canAcknowledge: true,
      },
      {
        relationshipId: 'relationship-two',
        label: 'Family member',
        canAcknowledge: false,
      },
    ]),
    listAlerts: jest.fn((relationshipId) =>
      relationshipId === 'relationship-one'
        ? first
        : Promise.resolve({
            items: [alert('alert-two', 'relationship-two')],
            limit: 50,
            offset: 0,
          }),
    ),
  };
  const screen = await render(view(service));
  await waitFor(() =>
    expect(screen.getByText('Choose a family member')).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Family member: Parent' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Family member: Family member' }),
  );
  await waitFor(() =>
    expect(
      screen.getByLabelText(/Family member\. Medication marked as missed/),
    ).toBeTruthy(),
  );
  resolveFirst({
    items: [alert('alert-one', 'relationship-one')],
    limit: 50,
    offset: 0,
  });
  await Promise.resolve();
  expect(
    screen.queryByLabelText(/Parent\. Medication marked as missed/),
  ).toBeNull();
});

test('performs one bounded authoritative refresh when inbox regains focus', async () => {
  const service = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      {
        relationshipId: 'relationship-one',
        label: 'Parent',
        canAcknowledge: true,
      },
    ]),
    listAlerts: jest
      .fn()
      .mockResolvedValueOnce({
        items: [alert('alert-one')],
        limit: 50,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [{ ...alert('alert-one'), state: 'acknowledged' as const }],
        limit: 50,
        offset: 0,
      }),
  };
  const screen = await render(view(service));
  await waitFor(() =>
    expect(screen.getByLabelText(/Parent.*Open/)).toBeTruthy(),
  );

  await screen.rerender(view(service, true, jest.fn(), 2));
  await waitFor(() =>
    expect(screen.getByLabelText(/Parent.*Acknowledged/)).toBeTruthy(),
  );
  expect(service.listAlerts).toHaveBeenCalledTimes(2);
  expect(service.listEligibleRelationships).toHaveBeenCalledTimes(2);
});
