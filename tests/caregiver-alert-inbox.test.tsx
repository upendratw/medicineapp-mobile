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

const view = (service: CaregiverAlertService, online = true) => (
  <PreferencesProvider>
    <CaregiverAlertInbox
      service={service}
      online={online}
      focusVersion={1}
      onBack={jest.fn()}
    />
  </PreferencesProvider>
);

test('auto-selects one relationship and renders accessible non-interactive alert rows', async () => {
  const service: CaregiverAlertService = {
    listEligibleRelationships: jest
      .fn()
      .mockResolvedValue([
        { relationshipId: 'relationship-one', label: 'Parent' },
      ]),
    listAlerts: jest.fn().mockResolvedValue({
      items: [alert('alert-one')],
      limit: 50,
      offset: 0,
    }),
  };
  const screen = await render(view(service));
  await waitFor(() =>
    expect(screen.getByText('Medication marked as missed')).toBeTruthy(),
  );
  expect(service.listAlerts).toHaveBeenCalledWith('relationship-one', {
    limit: 50,
    offset: 0,
  });
  expect(screen.getByText('Workflow priority: Attention')).toBeTruthy();
  expect(screen.queryByText('alert-one')).toBeNull();
  expect(
    screen.queryAllByRole('button', { name: /Medication marked as missed/ }),
  ).toHaveLength(0);
  expect(
    screen.getByLabelText(
      /Parent.*Medication marked as missed.*Workflow priority.*Open/,
    ),
  ).toBeTruthy();
});

test('renders bounded zero-relationship and offline states without fetching alerts', async () => {
  const service: CaregiverAlertService = {
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

  const offlineService: CaregiverAlertService = {
    listEligibleRelationships: jest.fn(),
    listAlerts: jest.fn(),
  };
  const offline = await render(view(offlineService, false));
  expect(offline.getByText('Caregiver alerts are offline')).toBeTruthy();
  expect(offlineService.listEligibleRelationships).not.toHaveBeenCalled();
});

test('supports multiple relationship selection and resets scoped results', async () => {
  const service: CaregiverAlertService = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      { relationshipId: 'relationship-one', label: 'Parent' },
      { relationshipId: 'relationship-two', label: 'Family member' },
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
  const service: CaregiverAlertService = {
    listEligibleRelationships: jest
      .fn()
      .mockResolvedValue([
        { relationshipId: 'relationship-one', label: 'Parent' },
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
  const temporary: CaregiverAlertService = {
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
  const service: CaregiverAlertService = {
    listEligibleRelationships: jest.fn().mockResolvedValue([
      { relationshipId: 'relationship-one', label: 'Parent' },
      { relationshipId: 'relationship-two', label: 'Family member' },
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
