import { ApiClient } from '@/api/client';
import type { MedicationSchedule, ScheduleInput } from '@/types/schedule';

type BackendRule = {
  rule_type: string;
  local_time: string | null;
  enabled: boolean;
};
type BackendSchedule = {
  id: string;
  medication_id: string | null;
  patient_medication_id: string | null;
  status: MedicationSchedule['status'];
  timezone: string;
  start_date: string;
  end_date: string | null;
  revision: number;
  rules: BackendRule[];
};

const mapSchedule = (row: BackendSchedule): MedicationSchedule => ({
  id: row.id,
  medicationId: row.medication_id ?? row.patient_medication_id ?? '',
  patientMedicationId: row.patient_medication_id,
  status: row.status,
  timezone: row.timezone,
  startDate: row.start_date,
  endDate: row.end_date,
  times: row.rules
    .filter((rule) => rule.enabled && rule.local_time)
    .map((rule) => rule.local_time as string),
  revision: row.revision,
});

export class ScheduleService {
  constructor(private readonly client: ApiClient) {}
  async list(patientUserId?: string): Promise<readonly MedicationSchedule[]> {
    const query = patientUserId
      ? `?patient_user_id=${encodeURIComponent(patientUserId)}`
      : '';
    const rows = await this.client.request<BackendSchedule[]>(
      `/api/v1/medication-schedules${query}`,
      {},
      true,
    );
    return rows.map(mapSchedule);
  }
  async create(input: ScheduleInput): Promise<MedicationSchedule> {
    const row = await this.client.request<BackendSchedule>(
      '/api/v1/medication-schedules',
      { method: 'POST', body: JSON.stringify(input) },
      true,
    );
    return mapSchedule(row);
  }
  async update(
    id: string,
    input: Pick<
      ScheduleInput,
      'start_date' | 'end_date' | 'instructions_text' | 'rules'
    >,
  ): Promise<MedicationSchedule> {
    const row = await this.client.request<BackendSchedule>(
      `/api/v1/medication-schedules/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      true,
    );
    return mapSchedule(row);
  }
}
