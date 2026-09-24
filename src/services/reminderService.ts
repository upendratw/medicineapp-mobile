import { ApiClient } from '@/api/client';
import type {
  ReminderAction,
  ReminderActionResult,
  ReminderContext,
} from '@/types/reminder';

export interface ReminderContextService {
  get(reminderId: string): Promise<ReminderContext>;
}

type ReminderContextDto = {
  reminder_id: string;
  medication_name: string;
  scheduled_local_time: string;
  scheduled_utc_time: string;
  dose_quantity: string | null;
  dose_unit: string | null;
  status: string;
  status_text: string;
  schedule_revision: number;
  allowed_actions: ('TAKEN' | 'SNOOZE' | 'SKIPPED')[];
  instructions: string | null;
};

export class BackendReminderContextService implements ReminderContextService {
  constructor(private readonly client: ApiClient) {}
  async get(reminderId: string): Promise<ReminderContext> {
    const data = await this.client.request<ReminderContextDto>(
      `/api/v1/reminders/${encodeURIComponent(reminderId)}`,
      {},
      true,
    );
    return {
      reminderId: data.reminder_id,
      medicationName: data.medication_name,
      scheduledLocalTime: data.scheduled_local_time,
      scheduledUtcTime: data.scheduled_utc_time,
      doseQuantity: data.dose_quantity,
      doseUnit: data.dose_unit,
      status: data.status,
      statusText: data.status_text,
      scheduleRevision: data.schedule_revision,
      allowedActions: data.allowed_actions,
      instructions: data.instructions,
    };
  }
}

type AcknowledgementResponse = { result?: 'APPLIED' | 'ALREADY_APPLIED' };
type SnoozeResponse = { result?: string };

export class ReminderService {
  constructor(private readonly client: ApiClient) {}

  async acknowledge(
    reminderId: string,
    action: ReminderAction,
    clientEventId: string,
    timezone: string,
    scheduleRevision: number | null,
  ): Promise<ReminderActionResult> {
    const data = await this.client.request<AcknowledgementResponse>(
      `/api/v1/reminders/${encodeURIComponent(reminderId)}/acknowledge`,
      {
        method: 'POST',
        body: JSON.stringify({
          action,
          client_event_id: clientEventId,
          client_recorded_at: new Date().toISOString(),
          client_timezone: timezone,
          schedule_revision: scheduleRevision,
        }),
      },
      true,
    );
    return { result: data.result ?? 'APPLIED' };
  }

  async snooze(
    reminderId: string,
    minutes: 5 | 10 | 15 | 30,
    requestKey: string,
  ): Promise<ReminderActionResult> {
    await this.client.request<SnoozeResponse>(
      `/api/v1/reminders/${encodeURIComponent(reminderId)}/snooze`,
      {
        method: 'POST',
        body: JSON.stringify({ minutes, request_key: requestKey }),
      },
      true,
    );
    return { result: 'SNOOZED' };
  }
}

export const buildReminderContextService = (
  client: ApiClient,
): ReminderContextService => new BackendReminderContextService(client);
