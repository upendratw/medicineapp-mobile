import { ApiClient } from '@/api/client';

export const caregiverPermissionOptions = [
  { key: 'alerts.read', labelKey: 'familyPermissionAlerts' },
  { key: 'medications.read', labelKey: 'familyPermissionMedications' },
  { key: 'adherence.read', labelKey: 'familyPermissionAdherence' },
] as const;

export type CaregiverPermission =
  (typeof caregiverPermissionOptions)[number]['key'];

export type CaregiverInvitation = Readonly<{
  invitationId: string;
  destination: string;
  patientDisplayName: string;
  permissions: readonly CaregiverPermission[];
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string;
}>;

export type CaregiverRelationship = Readonly<{
  relationshipId: string;
  caregiverDisplayName: string;
  permissions: readonly CaregiverPermission[];
  sharingEnabled: boolean;
  status: string;
}>;

type InvitationResponse = {
  invitation_id: string;
  destination: string;
  patient_display_name: string;
  permissions: string[];
  status: CaregiverInvitation['status'];
  expires_at: string;
};

type RelationshipResponse = {
  relationship_id: string;
  caregiver_display_name: string;
  permissions: string[];
  sharing_enabled: boolean;
  status: string;
};

export interface CaregiverRelationshipService {
  listInvitations(): Promise<readonly CaregiverInvitation[]>;
  listRelationships(): Promise<readonly CaregiverRelationship[]>;
  invite(
    phone: string,
    permissions: readonly CaregiverPermission[],
  ): Promise<void>;
  accept(invitationId: string): Promise<void>;
  decline(invitationId: string): Promise<void>;
  update(
    relationshipId: string,
    permissions: readonly CaregiverPermission[],
    sharingEnabled: boolean,
  ): Promise<void>;
  revoke(relationshipId: string): Promise<void>;
}

export class BackendCaregiverRelationshipService implements CaregiverRelationshipService {
  constructor(private readonly client: ApiClient) {}

  async listInvitations(): Promise<readonly CaregiverInvitation[]> {
    const data = await this.client.request<{ items: InvitationResponse[] }>(
      '/api/v1/e21/caregivers/invitations',
      {},
      true,
    );
    return data.items.map((item) => ({
      invitationId: item.invitation_id,
      destination: item.destination,
      patientDisplayName: item.patient_display_name,
      permissions: supportedPermissions(item.permissions),
      status: item.status,
      expiresAt: item.expires_at,
    }));
  }

  async listRelationships(): Promise<readonly CaregiverRelationship[]> {
    const data = await this.client.request<{ items: RelationshipResponse[] }>(
      '/api/v1/e21/caregivers/relationships',
      {},
      true,
    );
    return data.items.map((item) => ({
      relationshipId: item.relationship_id,
      caregiverDisplayName: item.caregiver_display_name,
      permissions: supportedPermissions(item.permissions),
      sharingEnabled: item.sharing_enabled,
      status: item.status,
    }));
  }

  async invite(
    phone: string,
    permissions: readonly CaregiverPermission[],
  ): Promise<void> {
    await this.client.request(
      '/api/v1/e21/caregivers/invitations',
      {
        method: 'POST',
        body: JSON.stringify({
          channel: 'PHONE',
          destination: phone,
          role_level: 'SUPPORTER',
          permissions,
        }),
      },
      true,
    );
  }

  async accept(invitationId: string): Promise<void> {
    await this.respond(invitationId, 'accept');
  }

  async decline(invitationId: string): Promise<void> {
    await this.respond(invitationId, 'decline');
  }

  async update(
    relationshipId: string,
    permissions: readonly CaregiverPermission[],
    sharingEnabled: boolean,
  ): Promise<void> {
    await this.client.request(
      `/api/v1/e21/caregivers/relationships/${encodeURIComponent(relationshipId)}/permissions`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          permissions,
          role_level: 'SUPPORTER',
          sharing_enabled: sharingEnabled,
        }),
      },
      true,
    );
  }

  async revoke(relationshipId: string): Promise<void> {
    await this.client.request(
      `/api/v1/e21/caregivers/relationships/${encodeURIComponent(relationshipId)}`,
      { method: 'DELETE' },
      true,
    );
  }

  private async respond(
    invitationId: string,
    action: 'accept' | 'decline',
  ): Promise<void> {
    await this.client.request(
      `/api/v1/e21/caregivers/invitations/${encodeURIComponent(invitationId)}/${action}`,
      { method: 'POST' },
      true,
    );
  }
}

function supportedPermissions(
  values: readonly string[],
): CaregiverPermission[] {
  const supported = new Set<CaregiverPermission>(
    caregiverPermissionOptions.map((item) => item.key),
  );
  return values.filter((value): value is CaregiverPermission =>
    supported.has(value as CaregiverPermission),
  );
}
