export type CaregiverAlertType =
  | 'reminder_unacknowledged'
  | 'medication_missed'
  | 'repeated_non_adherence'
  | 'inventory_low'
  | 'inventory_exhausted';
export type CaregiverAlertSeverity = 'info' | 'attention' | 'important';
export type CaregiverAlertState =
  'open' | 'acknowledged' | 'resolved' | 'cancelled';
export type CaregiverAlertSourceType =
  'reminder' | 'intake' | 'inventory' | 'system';

export type CaregiverAlert = Readonly<{
  alertId: string;
  relationshipId: string;
  alertType: CaregiverAlertType;
  severity: CaregiverAlertSeverity;
  state: CaregiverAlertState;
  sourceType: CaregiverAlertSourceType;
  occurredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
}>;

export type CaregiverAlertPage = Readonly<{
  items: readonly CaregiverAlert[];
  limit: number;
  offset: number;
}>;

export type CaregiverAlertRelationship = Readonly<{
  relationshipId: string;
  label: string;
  canAcknowledge: boolean;
}>;
