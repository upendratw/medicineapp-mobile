import { ApiClient } from '@/api/client';
import type { IntakeHistoryPage } from '@/types/history';

type BackendEvent = {
  id: string;
  medication_id: string;
  outcome: 'taken' | 'skipped';
  status_text: string;
  event_time: string;
  client_recorded_at: string | null;
};
type BackendPage = { items: BackendEvent[] };

export class MedicationHistoryService {
  constructor(private readonly client: ApiClient) {}
  async list(input: {
    startDate: string;
    endDate: string;
    timezone: string;
    patientUserId?: string;
    medicationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<IntakeHistoryPage> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.min(Math.max(input.offset ?? 0, 0), 10000);
    const query = new URLSearchParams({
      start_date: input.startDate,
      end_date: input.endDate,
      timezone: input.timezone,
      limit: String(limit),
      offset: String(offset),
    });
    if (input.patientUserId) query.set('patient_user_id', input.patientUserId);
    if (input.medicationId) query.set('medication_id', input.medicationId);
    const data = await this.client.request<BackendPage>(
      `/api/v1/intake/history?${query.toString()}`,
      {},
      true,
    );
    return {
      limit,
      offset,
      items: data.items
        .map((item) => ({
          id: item.id,
          medicationId: item.medication_id,
          medicationName: null,
          outcome: item.outcome,
          statusText: item.status_text,
          eventTime: item.event_time,
          recordedAt: item.client_recorded_at,
          scheduledTime: null,
        }))
        .sort((a, b) => b.eventTime.localeCompare(a.eventTime)),
    };
  }
}
