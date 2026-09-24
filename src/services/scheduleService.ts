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
  dose_quantity: string | null;
  dose_unit: string | null;
  instructions_text: string | null;
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
  doseQuantity: row.dose_quantity,
  doseUnit: row.dose_unit,
  instructions: row.instructions_text,
  revision: row.revision,
});

export class ScheduleService {
  constructor(private readonly client: ApiClient) {}
  async list(
    patientUserId?: string,
    patientMedicationId?: string,
  ): Promise<readonly MedicationSchedule[]> {
    const params = new URLSearchParams();
    if (patientUserId) params.set('patient_user_id', patientUserId);
    if (patientMedicationId)
      params.set('patient_medication_id', patientMedicationId);
    const query = params.size ? `?${params.toString()}` : '';
    const rows = await this.client.request<BackendSchedule[]>(
      `/api/v1/medication-schedules${query}`,
      {},
      true,
    );
    return rows.map(mapSchedule);
  }
  async get(id: string): Promise<MedicationSchedule> {
    const row = await this.client.request<BackendSchedule>(
      `/api/v1/medication-schedules/${encodeURIComponent(id)}`,
      {},
      true,
    );
    return mapSchedule(row);
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
      | 'start_date'
      | 'end_date'
      | 'dose_quantity'
      | 'dose_unit'
      | 'instructions_text'
      | 'rules'
    >,
  ): Promise<MedicationSchedule> {
    const row = await this.client.request<BackendSchedule>(
      `/api/v1/medication-schedules/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          start_date: input.start_date,
          end_date: input.end_date,
          dose_quantity: input.dose_quantity,
          dose_unit: input.dose_unit,
          instructions_text: input.instructions_text,
          rules: input.rules,
        }),
      },
      true,
    );
    return mapSchedule(row);
  }
}
