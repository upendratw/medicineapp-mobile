import { ApiClient, ApiError } from '@/api/client';
import type {
  CaregiverAlert,
  CaregiverAlertPage,
  CaregiverAlertRelationship,
  CaregiverAlertSeverity,
  CaregiverAlertSourceType,
  CaregiverAlertState,
  CaregiverAlertType,
} from '@/types/caregiverAlert';

type RelationshipResponse = {
  relationship_id: string;
  relationship_label: string | null;
  status: string;
  permissions: Record<string, boolean>;
  sharing_enabled?: boolean;
};
type RelationshipListResponse = { items: RelationshipResponse[] };
type AlertResponse = {
  alert_id: string;
  relationship_id: string;
  alert_type: CaregiverAlertType;
  severity: CaregiverAlertSeverity;
  state: CaregiverAlertState;
  source_type: CaregiverAlertSourceType;
  occurred_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
};
type AlertPageResponse = {
  items: AlertResponse[];
  limit: number;
  offset: number;
};

export interface CaregiverAlertService {
  listEligibleRelationships(): Promise<readonly CaregiverAlertRelationship[]>;
  listAlerts(
    relationshipId: string,
    options: Readonly<{ limit: number; offset: number }>,
  ): Promise<CaregiverAlertPage>;
}

export type CaregiverAlertFailure = 'access' | 'temporary';

export function classifyCaregiverAlertFailure(
  error: unknown,
): CaregiverAlertFailure {
  return error instanceof ApiError &&
    (error.status === 403 || error.status === 404)
    ? 'access'
    : 'temporary';
}

export class BackendCaregiverAlertService implements CaregiverAlertService {
  constructor(private readonly client: ApiClient) {}

  async listEligibleRelationships(): Promise<
    readonly CaregiverAlertRelationship[]
  > {
    const data = await this.client.request<RelationshipListResponse>(
      '/api/v1/caregiver-relationships',
      {},
      true,
    );
    return data.items
      .filter(
        (item) =>
          item.status === 'active' &&
          item.permissions['alerts.read'] === true &&
          item.sharing_enabled !== false,
      )
      .map((item) => ({
        relationshipId: item.relationship_id,
        label: item.relationship_label?.trim() || 'Family member',
      }));
  }

  async listAlerts(
    relationshipId: string,
    { limit, offset }: Readonly<{ limit: number; offset: number }>,
  ): Promise<CaregiverAlertPage> {
    const data = await this.client.request<AlertPageResponse>(
      `/api/v1/caregiver-relationships/${encodeURIComponent(relationshipId)}/alerts?limit=${limit}&offset=${offset}`,
      {},
      true,
    );
    return {
      limit: data.limit,
      offset: data.offset,
      items: data.items.map(mapAlert),
    };
  }
}

function mapAlert(item: AlertResponse): CaregiverAlert {
  return {
    alertId: item.alert_id,
    relationshipId: item.relationship_id,
    alertType: item.alert_type,
    severity: item.severity,
    state: item.state,
    sourceType: item.source_type,
    occurredAt: item.occurred_at,
    acknowledgedAt: item.acknowledged_at,
    resolvedAt: item.resolved_at,
    cancelledAt: item.cancelled_at,
  };
}
