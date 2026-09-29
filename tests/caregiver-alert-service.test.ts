import { ApiClient, ApiError } from '@/api/client';
import {
  BackendCaregiverAlertService,
  classifyCaregiverAlertFailure,
} from '@/services/caregiverAlertService';

test('filters eligible alert relationships without exposing identifiers as labels', async () => {
  const request = jest.fn().mockResolvedValue({
    items: [
      {
        relationship_id: 'relationship-active',
        relationship_label: '  Parent  ',
        status: 'active',
        permissions: {
          'alerts.read': true,
          'alerts.acknowledge': true,
        },
      },
      {
        relationship_id: 'relationship-fallback',
        relationship_label: null,
        status: 'active',
        permissions: { 'alerts.read': true },
      },
      {
        relationship_id: 'relationship-inactive',
        relationship_label: 'Inactive',
        status: 'revoked',
        permissions: { 'alerts.read': true },
      },
      {
        relationship_id: 'relationship-denied',
        relationship_label: 'Denied',
        status: 'active',
        permissions: { 'alerts.read': false },
      },
    ],
  });
  const service = new BackendCaregiverAlertService({
    request,
  } as unknown as ApiClient);
  await expect(service.listEligibleRelationships()).resolves.toEqual([
    {
      relationshipId: 'relationship-active',
      label: 'Parent',
      canAcknowledge: true,
    },
    {
      relationshipId: 'relationship-fallback',
      label: 'Family member',
      canAcknowledge: false,
    },
  ]);
});

test('constructs bounded relationship-scoped limit/offset request and maps visible fields', async () => {
  const request = jest.fn().mockResolvedValue({
    items: [
      {
        alert_id: 'alert-one',
        relationship_id: 'relationship/one',
        alert_type: 'medication_missed',
        severity: 'attention',
        state: 'open',
        source_type: 'intake',
        occurred_at: '2026-09-29T10:00:00Z',
        acknowledged_at: null,
        resolved_at: null,
        cancelled_at: null,
      },
    ],
    limit: 50,
    offset: 50,
  });
  const service = new BackendCaregiverAlertService({
    request,
  } as unknown as ApiClient);
  const page = await service.listAlerts('relationship/one', {
    limit: 50,
    offset: 50,
  });
  expect(request).toHaveBeenCalledWith(
    '/api/v1/caregiver-relationships/relationship%2Fone/alerts?limit=50&offset=50',
    {},
    true,
  );
  expect(page.items[0]).toMatchObject({
    alertId: 'alert-one',
    relationshipId: 'relationship/one',
    alertType: 'medication_missed',
  });
  expect(page.items[0]).not.toHaveProperty('source_reference');
});

test('classifies 403/404 without enumeration and preserves ordinary failures', () => {
  expect(classifyCaregiverAlertFailure(new ApiError('DENIED', 403))).toBe(
    'access',
  );
  expect(classifyCaregiverAlertFailure(new ApiError('NOT_FOUND', 404))).toBe(
    'access',
  );
  expect(classifyCaregiverAlertFailure(new ApiError('FAILED', 503))).toBe(
    'temporary',
  );
  expect(classifyCaregiverAlertFailure(new ApiError('CONFLICT', 409))).toBe(
    'conflict',
  );
  expect(
    classifyCaregiverAlertFailure(new ApiError('RATE_LIMITED', 429, 30)),
  ).toBe('rate-limited');
});

test('gets authoritative relationship-scoped alert detail', async () => {
  const request = jest.fn().mockResolvedValue({
    alert_id: 'alert/one',
    relationship_id: 'relationship/one',
    alert_type: 'medication_missed',
    severity: 'attention',
    state: 'open',
    source_type: 'intake',
    occurred_at: '2026-09-29T10:00:00Z',
    acknowledged_at: null,
    resolved_at: null,
    cancelled_at: null,
  });
  const service = new BackendCaregiverAlertService({
    request,
  } as unknown as ApiClient);

  await expect(
    service.getAlert('relationship/one', 'alert/one'),
  ).resolves.toMatchObject({
    relationshipId: 'relationship/one',
    alertId: 'alert/one',
    state: 'open',
  });
  expect(request).toHaveBeenCalledWith(
    '/api/v1/caregiver-relationships/relationship%2Fone/alerts/alert%2Fone',
    {},
    true,
  );
});

test('posts one relationship-scoped acknowledgement and maps server state', async () => {
  const request = jest.fn().mockResolvedValue({
    alert_id: 'alert-one',
    relationship_id: 'relationship-one',
    alert_type: 'medication_missed',
    severity: 'attention',
    state: 'acknowledged',
    source_type: 'intake',
    occurred_at: '2026-09-29T10:00:00Z',
    acknowledged_at: '2026-09-29T10:05:00Z',
    resolved_at: null,
    cancelled_at: null,
  });
  const service = new BackendCaregiverAlertService({
    request,
  } as unknown as ApiClient);

  await expect(
    service.acknowledgeAlert('relationship-one', 'alert-one'),
  ).resolves.toMatchObject({
    state: 'acknowledged',
    acknowledgedAt: '2026-09-29T10:05:00Z',
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(
    '/api/v1/caregiver-relationships/relationship-one/alerts/alert-one/acknowledge',
    { method: 'POST' },
    true,
  );
});

test.each([403, 404, 409, 429, 500, 503])(
  'preserves API error status %s for bounded detail handling',
  async (status) => {
    const error = new ApiError(
      'SYNTHETIC',
      status,
      status === 429 ? 60 : undefined,
    );
    const service = new BackendCaregiverAlertService({
      request: jest.fn().mockRejectedValue(error),
    } as unknown as ApiClient);
    await expect(service.getAlert('relationship', 'alert')).rejects.toBe(error);
    await expect(
      service.acknowledgeAlert('relationship', 'alert'),
    ).rejects.toBe(error);
  },
);
