import { ApiClient, ApiError } from '@/api/client';

export const caregiverAlertTypes = [
  'reminder_unacknowledged',
  'medication_missed',
  'repeated_non_adherence',
  'inventory_low',
  'inventory_exhausted',
] as const;

export const caregiverAlertSeverities = [
  'info',
  'attention',
  'important',
] as const;

export type CaregiverAlertType = (typeof caregiverAlertTypes)[number];
export type CaregiverAlertSeverity = (typeof caregiverAlertSeverities)[number];

export type CaregiverAlertPreference = Readonly<{
  configured: boolean;
  relationshipId: string;
  alertsEnabled: boolean;
  enabledAlertTypes: readonly CaregiverAlertType[];
  minimumSeverity: CaregiverAlertSeverity;
  quietHoursEnabled: boolean;
  quietHoursStartLocal: string;
  quietHoursEndLocal: string;
  timezone: string;
  escalationEnabled: boolean;
  escalationDelayMinutes: number;
  revision: number | null;
}>;

export type CaregiverAlertPreferenceInput = Omit<
  CaregiverAlertPreference,
  'configured' | 'relationshipId'
>;

type PreferenceResponse = {
  configured: boolean;
  relationship_id: string;
  alerts_enabled: boolean;
  enabled_alert_types: CaregiverAlertType[];
  minimum_severity: CaregiverAlertSeverity;
  quiet_hours_enabled: boolean;
  quiet_hours_start_local: string | null;
  quiet_hours_end_local: string | null;
  timezone: string;
  escalation_enabled: boolean;
  escalation_delay_minutes: number;
  revision: number | null;
};

export type CaregiverAlertPreferenceFailure =
  'access' | 'conflict' | 'temporary';

export interface CaregiverAlertPreferenceService {
  get(relationshipId: string): Promise<CaregiverAlertPreference>;
  save(
    relationshipId: string,
    input: CaregiverAlertPreferenceInput,
  ): Promise<CaregiverAlertPreference>;
}

export class BackendCaregiverAlertPreferenceService implements CaregiverAlertPreferenceService {
  constructor(private readonly client: ApiClient) {}

  async get(relationshipId: string): Promise<CaregiverAlertPreference> {
    return mapResponse(
      await this.client.request<PreferenceResponse>(
        path(relationshipId),
        {},
        true,
      ),
    );
  }

  async save(
    relationshipId: string,
    input: CaregiverAlertPreferenceInput,
  ): Promise<CaregiverAlertPreference> {
    return mapResponse(
      await this.client.request<PreferenceResponse>(
        path(relationshipId),
        {
          method: 'PUT',
          body: JSON.stringify({
            alerts_enabled: input.alertsEnabled,
            enabled_alert_types: input.enabledAlertTypes,
            minimum_severity: input.minimumSeverity,
            quiet_hours_enabled: input.quietHoursEnabled,
            quiet_hours_start_local: input.quietHoursStartLocal || null,
            quiet_hours_end_local: input.quietHoursEndLocal || null,
            timezone: input.timezone,
            escalation_enabled: input.escalationEnabled,
            escalation_delay_minutes: input.escalationDelayMinutes,
            revision: input.revision,
          }),
        },
        true,
      ),
    );
  }
}

export function classifyCaregiverAlertPreferenceFailure(
  failure: unknown,
): CaregiverAlertPreferenceFailure {
  if (failure instanceof ApiError && [401, 403, 404].includes(failure.status))
    return 'access';
  if (
    failure instanceof ApiError &&
    (failure.status === 409 ||
      failure.code === 'CAREGIVER_ALERT_PREFERENCE_CONFLICT')
  )
    return 'conflict';
  return 'temporary';
}

function path(relationshipId: string): string {
  return `/api/v1/caregiver-relationships/${encodeURIComponent(relationshipId)}/alert-preferences`;
}

function mapResponse(value: PreferenceResponse): CaregiverAlertPreference {
  return {
    configured: value.configured,
    relationshipId: value.relationship_id,
    alertsEnabled: value.alerts_enabled,
    enabledAlertTypes: value.enabled_alert_types,
    minimumSeverity: value.minimum_severity,
    quietHoursEnabled: value.quiet_hours_enabled,
    quietHoursStartLocal: value.quiet_hours_start_local ?? '',
    quietHoursEndLocal: value.quiet_hours_end_local ?? '',
    timezone: value.timezone,
    escalationEnabled: value.escalation_enabled,
    escalationDelayMinutes: value.escalation_delay_minutes,
    revision: value.revision,
  };
}
