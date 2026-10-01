import { ApiClient, ApiError } from '@/api/client';
import {
  BackendCaregiverAlertPreferenceService,
  classifyCaregiverAlertPreferenceFailure,
} from '@/services/caregiverAlertPreferenceService';

const response = {
  configured: false,
  relationship_id: 'relationship-id',
  alerts_enabled: true,
  enabled_alert_types: ['medication_missed'] as const,
  minimum_severity: 'attention' as const,
  quiet_hours_enabled: false,
  quiet_hours_start_local: null,
  quiet_hours_end_local: null,
  timezone: 'Asia/Kolkata',
  escalation_enabled: false,
  escalation_delay_minutes: 30,
  revision: null,
};

test('loads absent preference without issuing a write', async () => {
  const client = {
    request: jest.fn().mockResolvedValue(response),
  } as unknown as ApiClient;
  const service = new BackendCaregiverAlertPreferenceService(client);
  const value = await service.get('relationship-id');

  expect(value).toMatchObject({
    configured: false,
    relationshipId: 'relationship-id',
    timezone: 'Asia/Kolkata',
    revision: null,
  });
  expect(client.request).toHaveBeenCalledWith(
    '/api/v1/caregiver-relationships/relationship-id/alert-preferences',
    {},
    true,
  );
  expect(jest.mocked(client.request).mock.calls[0][1]).not.toHaveProperty(
    'method',
  );
});

test('saves canonical fields with revision and refreshes from response', async () => {
  const client = {
    request: jest.fn().mockResolvedValue({
      ...response,
      configured: true,
      escalation_enabled: true,
      revision: 2,
    }),
  } as unknown as ApiClient;
  const service = new BackendCaregiverAlertPreferenceService(client);
  const value = await service.save('relationship-id', {
    alertsEnabled: true,
    enabledAlertTypes: ['medication_missed'],
    minimumSeverity: 'attention',
    quietHoursEnabled: false,
    quietHoursStartLocal: '',
    quietHoursEndLocal: '',
    timezone: 'Asia/Kolkata',
    escalationEnabled: true,
    escalationDelayMinutes: 30,
    revision: 1,
  });

  const options = jest.mocked(client.request).mock.calls[0][1]!;
  expect(options.method).toBe('PUT');
  expect(JSON.parse(options.body as string)).toEqual(
    expect.objectContaining({
      enabled_alert_types: ['medication_missed'],
      minimum_severity: 'attention',
      revision: 1,
    }),
  );
  expect(value).toMatchObject({ configured: true, revision: 2 });
});

test('classifies access, conflict, and temporary failures', () => {
  expect(
    classifyCaregiverAlertPreferenceFailure(
      new ApiError('CAREGIVER_ACCESS_NOT_FOUND', 404),
    ),
  ).toBe('access');
  expect(
    classifyCaregiverAlertPreferenceFailure(
      new ApiError('CAREGIVER_ALERT_PREFERENCE_CONFLICT', 409),
    ),
  ).toBe('conflict');
  expect(classifyCaregiverAlertPreferenceFailure(new Error('offline'))).toBe(
    'temporary',
  );
});
