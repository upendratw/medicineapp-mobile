import { ApiClient } from '@/api/client';

export type PrivacyCapabilityStatus =
  'available' | 'policy_pending' | 'unavailable';

export type PrivacyCapability = Readonly<{
  capability: string;
  status: PrivacyCapabilityStatus;
  reason: string;
}>;

export type PrivacyCapabilities = Readonly<{
  subject_role: 'patient' | 'caregiver';
  capabilities: readonly PrivacyCapability[];
  post_deactivation_status: Readonly<{ status: string; reason: string }>;
}>;

export type ErasureStatus = Readonly<{
  status: string;
  requested_at?: string;
  updated_at?: string;
  live_data_erasure_complete?: boolean;
  all_processing_complete?: boolean;
  message_code: string;
}>;

export type PrivacyNotice = Readonly<{
  notice_version: string;
  locale: 'en-IN' | 'hi-IN';
  approval_status: 'privacy_legal_review_pending';
  title: string;
  review_status: string;
  sections: readonly Readonly<{ heading: string; body: string }>[];
}>;

export interface PrivacyService {
  profile(
    role: 'patient' | 'caregiver',
  ): Promise<Readonly<{ display_name: string | null }>>;
  updateDisplayName(
    role: 'patient' | 'caregiver',
    displayName: string,
  ): Promise<void>;
  capabilities(): Promise<PrivacyCapabilities>;
  erasureStatus(): Promise<ErasureStatus>;
  notice(locale: 'en-IN' | 'hi-IN'): Promise<PrivacyNotice>;
  exportData(): Promise<Record<string, unknown>>;
  requestDeletion(): Promise<void>;
}

export class BackendPrivacyService implements PrivacyService {
  constructor(private readonly client: ApiClient) {}

  profile(
    role: 'patient' | 'caregiver',
  ): Promise<Readonly<{ display_name: string | null }>> {
    return this.client.request(`/api/v1/${role}s/me`, {}, true);
  }

  async updateDisplayName(
    role: 'patient' | 'caregiver',
    displayName: string,
  ): Promise<void> {
    await this.client.request(
      `/api/v1/${role}s/me`,
      { method: 'PATCH', body: JSON.stringify({ display_name: displayName }) },
      true,
    );
  }

  capabilities(): Promise<PrivacyCapabilities> {
    return this.client.request(
      '/api/v1/account/privacy-capabilities',
      {},
      true,
    );
  }

  erasureStatus(): Promise<ErasureStatus> {
    return this.client.request('/api/v1/account/erasure-status', {}, true);
  }

  notice(locale: 'en-IN' | 'hi-IN'): Promise<PrivacyNotice> {
    return this.client.request(
      `/api/v1/account/privacy-notice?locale=${encodeURIComponent(locale)}`,
      {},
      true,
    );
  }

  exportData(): Promise<Record<string, unknown>> {
    return this.client.request('/api/v1/account/data-export', {}, true);
  }

  async requestDeletion(): Promise<void> {
    await this.client.request('/api/v1/account', { method: 'DELETE' }, true);
  }
}
