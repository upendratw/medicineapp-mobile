import { ApiClient } from '@/api/client';
import type {
  CaregiverDashboardData,
  CaregiverPatient,
} from '@/types/dashboard';

type PatientList = {
  items: {
    patient_user_id: string;
    display_name: string;
    relationship_id: string;
    status_text: string;
  }[];
};
type DashboardResponse = {
  patient: { display_name: string; timezone: string };
  today?: { scheduled: number; taken: number; missed: number };
  adherence?: { percentage: number | null };
  missed?: { status_text: string }[];
};

export interface CaregiverService {
  listAuthorizedPatients(): Promise<readonly CaregiverPatient[]>;
  dashboard(patientUserId: string): Promise<CaregiverDashboardData>;
}

export class BackendCaregiverService implements CaregiverService {
  constructor(private readonly client: ApiClient) {}
  async listAuthorizedPatients(): Promise<readonly CaregiverPatient[]> {
    const data = await this.client.request<PatientList>(
      '/api/v1/e21/caregiver/patients',
      {},
      true,
    );
    return data.items.map((item) => ({
      patientUserId: item.patient_user_id,
      displayName: item.display_name,
      relationshipId: item.relationship_id,
      statusText: item.status_text,
    }));
  }
  async dashboard(patientUserId: string): Promise<CaregiverDashboardData> {
    const data = await this.client.request<DashboardResponse>(
      `/api/v1/e21/caregiver/patients/${encodeURIComponent(patientUserId)}/dashboard`,
      {},
      true,
    );
    return {
      patientName: data.patient.display_name,
      timezone: data.patient.timezone,
      scheduled: data.today?.scheduled ?? null,
      taken: data.today?.taken ?? null,
      missed: data.today?.missed ?? null,
      adherencePercentage: data.adherence?.percentage ?? null,
      recentActivity: data.missed?.map((item) => item.status_text) ?? [],
    };
  }
}
