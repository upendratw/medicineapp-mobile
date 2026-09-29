import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { CaregiverAlertDetail } from '@/components/CaregiverAlertDetail';
import type { CaregiverAlertService } from '@/services/caregiverAlertService';
import { PreferencesProvider } from '@/state/PreferencesContext';
import type {
  CaregiverAlert,
  CaregiverAlertRelationship,
} from '@/types/caregiverAlert';

const relationship = (canAcknowledge = true): CaregiverAlertRelationship => ({
  relationshipId: 'relationship-one',
  label: 'Parent',
  canAcknowledge,
});

const alert = (
  state: CaregiverAlert['state'] = 'open',
  overrides: Partial<CaregiverAlert> = {},
): CaregiverAlert => ({
  alertId: 'alert-one',
  relationshipId: 'relationship-one',
  alertType: 'medication_missed',
  severity: 'attention',
  state,
  sourceType: 'intake',
  occurredAt: '2026-09-29T10:00:00Z',
  acknowledgedAt: state === 'acknowledged' ? '2026-09-29T10:05:00Z' : null,
  resolvedAt: state === 'resolved' ? '2026-09-29T10:06:00Z' : null,
  cancelledAt: state === 'cancelled' ? '2026-09-29T10:07:00Z' : null,
  ...overrides,
});

const service = (
  relationshipValue: CaregiverAlertRelationship = relationship(),
  alertValue: CaregiverAlert = alert(),
): jest.Mocked<CaregiverAlertService> => ({
  listEligibleRelationships: jest.fn().mockResolvedValue([relationshipValue]),
  listAlerts: jest.fn(),
  getAlert: jest.fn().mockResolvedValue(alertValue),
  acknowledgeAlert: jest.fn(),
});

const view = (
  api: CaregiverAlertService,
  options: {
    role?: 'patient' | 'caregiver' | null;
    online?: boolean;
    relationshipId?: string;
    alertId?: string;
    onBack?: jest.Mock;
  } = {},
) => (
  <PreferencesProvider>
    <CaregiverAlertDetail
      service={api}
      relationshipId={options.relationshipId ?? 'relationship-one'}
      alertId={options.alertId ?? 'alert-one'}
      role={options.role === undefined ? 'caregiver' : options.role}
      online={options.online ?? true}
      onBack={options.onBack ?? jest.fn()}
    />
  </PreferencesProvider>
);

test('shows accessible loading without rendering route data as detail', async () => {
  const api = service();
  api.getAlert.mockReturnValue(new Promise(() => undefined));
  const screen = await render(view(api));
  expect(screen.getByLabelText('Loading caregiver alert details')).toBeTruthy();
  expect(screen.queryByText('relationship-one')).toBeNull();
  expect(screen.queryByText('alert-one')).toBeNull();
  await screen.unmount();
});

test('renders authoritative privacy-bounded detail fields', async () => {
  const api = service();
  const screen = await render(view(api));
  await waitFor(() =>
    expect(
      screen.getByLabelText('Alert type: Medication marked as missed'),
    ).toBeTruthy(),
  );
  expect(api.listEligibleRelationships).toHaveBeenCalledTimes(1);
  expect(api.getAlert).toHaveBeenCalledWith('relationship-one', 'alert-one');
  expect(screen.getByText('Parent')).toBeTruthy();
  expect(screen.getByLabelText('Workflow priority: Attention')).toBeTruthy();
  expect(
    screen.getByLabelText('Source category: Medication activity'),
  ).toBeTruthy();
  expect(screen.getByLabelText('State: Open')).toBeTruthy();
  expect(screen.getByLabelText(/^Occurred at:/)).toBeTruthy();
  expect(screen.queryByText('relationship-one')).toBeNull();
  expect(screen.queryByText('alert-one')).toBeNull();
  expect(
    screen.queryByText(/source_reference|deduplication|revision/i),
  ).toBeNull();
  expect(screen.queryByText(/dose|diagnosis/i)).toBeNull();
});

test('uses the bounded Family member fallback and displays lifecycle timestamps only when present', async () => {
  const api = service(
    { ...relationship(), label: 'Family member' },
    alert('resolved', {
      acknowledgedAt: '2026-09-29T10:05:00Z',
      resolvedAt: '2026-09-29T10:06:00Z',
    }),
  );
  const screen = await render(view(api));
  await waitFor(() => expect(screen.getByText('Family member')).toBeTruthy());
  expect(screen.getByLabelText(/^Acknowledged at:/)).toBeTruthy();
  expect(screen.getByLabelText(/^Resolved at:/)).toBeTruthy();
  expect(screen.queryByLabelText(/^Cancelled at:/)).toBeNull();
});

test.each([
  ['patient', true, 'open'],
  ['caregiver', false, 'open'],
  ['caregiver', true, 'acknowledged'],
  ['caregiver', true, 'resolved'],
  ['caregiver', true, 'cancelled'],
] as const)(
  'hides acknowledgement for role=%s permission=%s state=%s',
  async (role, canAcknowledge, state) => {
    const api = service(relationship(canAcknowledge), alert(state));
    const screen = await render(view(api, { role }));
    await waitFor(() => expect(api.getAlert).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  },
);

test('guards duplicate taps and uses the authoritative acknowledged response and timestamp', async () => {
  jest.useFakeTimers();
  try {
    const api = service();
    api.acknowledgeAlert.mockImplementation(async () => {
      await delay(100);
      return alert('acknowledged');
    });
    const screen = await render(view(api));
    const button = await screen.findByRole('button', { name: 'Acknowledge' });
    let fiber = button.unstable_fiber;
    while (fiber && typeof fiber.memoizedProps?.onPress !== 'function')
      fiber = fiber.return;
    const press = fiber?.memoizedProps?.onPress as (() => void) | undefined;
    expect(press).toBeDefined();
    await act(async () => {
      press?.();
      press?.();
      await Promise.resolve();
    });
    expect(api.acknowledgeAlert).toHaveBeenCalledTimes(1);
    expect(api.acknowledgeAlert).toHaveBeenCalledWith(
      'relationship-one',
      'alert-one',
    );
    expect(
      screen.getByRole('button', { name: 'Acknowledge' }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true, busy: true });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByLabelText('State: Acknowledged')).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});

test('uses the authoritative acknowledged response and server timestamp', async () => {
  const api = service();
  api.acknowledgeAlert.mockResolvedValue(
    alert('acknowledged', {
      acknowledgedAt: '2026-09-29T11:11:00Z',
    }),
  );
  const screen = await render(view(api));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Acknowledge' }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText('State: Acknowledged')).toBeTruthy(),
  );
  expect(screen.getByLabelText(/^Acknowledged at:/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  expect(api.acknowledgeAlert).toHaveBeenCalledTimes(1);
});

test('accepts an idempotent acknowledged replay without a second client request', async () => {
  const api = service(relationship(), alert('acknowledged'));
  const screen = await render(view(api));
  await waitFor(() =>
    expect(screen.getByLabelText('State: Acknowledged')).toBeTruthy(),
  );
  expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  expect(api.acknowledgeAlert).not.toHaveBeenCalled();
});

test('does not invent an acknowledged state from an invalid success response', async () => {
  const api = service();
  api.acknowledgeAlert.mockResolvedValue(alert('open'));
  const screen = await render(view(api));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Acknowledge' }),
  );
  await waitFor(() =>
    expect(screen.getByText(/temporarily unavailable/)).toBeTruthy(),
  );
  expect(screen.getByLabelText('State: Open')).toBeTruthy();
});

test.each([
  new ApiError('NETWORK_UNAVAILABLE', 0),
  new ApiError('REQUEST_TIMEOUT', 0),
  new ApiError('SERVER_ERROR', 503),
  new ApiError('RATE_LIMITED', 429, 30),
])(
  'preserves OPEN state and permits explicit retry after %s',
  async (error) => {
    const api = service();
    api.acknowledgeAlert
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(alert('acknowledged'));
    const screen = await render(view(api));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Acknowledge' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('State: Open')).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeEnabled();
    expect(api.acknowledgeAlert).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Acknowledge' }));
    await waitFor(() =>
      expect(screen.getByLabelText('State: Acknowledged')).toBeTruthy(),
    );
    expect(api.acknowledgeAlert).toHaveBeenCalledTimes(2);
  },
);

test.each([403, 404])(
  'uses the same non-enumerating state for acknowledgement status %s',
  async (status) => {
    const api = service();
    api.acknowledgeAlert.mockRejectedValue(new ApiError('DENIED', status));
    const screen = await render(view(api));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Acknowledge' }),
    );
    await waitFor(() =>
      expect(
        screen.getByText('Caregiver alert access is unavailable'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/denied|not found/i)).toBeNull();
  },
);

test('bounds 409 handling to an explicit single refresh', async () => {
  const api = service();
  api.acknowledgeAlert.mockRejectedValue(new ApiError('CONFLICT', 409));
  api.getAlert
    .mockResolvedValueOnce(alert())
    .mockResolvedValueOnce(alert('acknowledged'));
  const screen = await render(view(api));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Acknowledge' }),
  );
  await waitFor(() =>
    expect(screen.getByText(/This alert changed/)).toBeTruthy(),
  );
  expect(api.getAlert).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Refresh alert' }));
  await waitFor(() =>
    expect(screen.getByLabelText('State: Acknowledged')).toBeTruthy(),
  );
  expect(api.getAlert).toHaveBeenCalledTimes(2);
  expect(api.acknowledgeAlert).toHaveBeenCalledTimes(1);
});

test('does not fetch or queue acknowledgement offline and disables action after a loaded detail goes offline', async () => {
  const offlineApi = service();
  const offline = await render(view(offlineApi, { online: false }));
  expect(offline.getByText('Caregiver alert details are offline')).toBeTruthy();
  expect(offlineApi.getAlert).not.toHaveBeenCalled();
  expect(offlineApi.acknowledgeAlert).not.toHaveBeenCalled();

  const api = service();
  const loaded = await render(view(api));
  await loaded.findByRole('button', { name: 'Acknowledge' });
  await loaded.rerender(view(api, { online: false }));
  await waitFor(() =>
    expect(loaded.getByRole('button', { name: 'Acknowledge' })).toBeDisabled(),
  );
  await fireEvent.press(loaded.getByRole('button', { name: 'Acknowledge' }));
  expect(api.acknowledgeAlert).not.toHaveBeenCalled();
  expect(loaded.getByLabelText('State: Open')).toBeTruthy();
});

test('rejects mismatched relationship detail and ignores stale prior-route responses', async () => {
  let resolveFirst!: (value: CaregiverAlert) => void;
  const api = service();
  api.listEligibleRelationships.mockResolvedValue([
    relationship(),
    {
      relationshipId: 'relationship-two',
      label: 'Sibling',
      canAcknowledge: true,
    },
  ]);
  api.getAlert
    .mockReturnValueOnce(
      new Promise((done) => {
        resolveFirst = done;
      }),
    )
    .mockResolvedValueOnce(
      alert('open', {
        alertId: 'alert-two',
        relationshipId: 'relationship-two',
      }),
    );
  const screen = await render(view(api));
  await screen.rerender(
    view(api, {
      relationshipId: 'relationship-two',
      alertId: 'alert-two',
    }),
  );
  await waitFor(() => expect(screen.getByText('Sibling')).toBeTruthy());
  resolveFirst(alert());
  await delay(0);
  expect(screen.queryByText('Parent')).toBeNull();
});

test('uses generic access state for initial 403, 404, or route/detail mismatch', async () => {
  for (const status of [403, 404]) {
    const api = service();
    api.getAlert.mockRejectedValue(new ApiError('DENIED', status));
    const screen = await render(view(api));
    await waitFor(() =>
      expect(
        screen.getByText('Caregiver alert access is unavailable'),
      ).toBeTruthy(),
    );
    await screen.unmount();
  }
  const mismatch = service();
  mismatch.getAlert.mockResolvedValue(
    alert('open', { relationshipId: 'relationship-other' }),
  );
  const screen = await render(view(mismatch));
  await waitFor(() =>
    expect(
      screen.getByText('Caregiver alert access is unavailable'),
    ).toBeTruthy(),
  );
});

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
