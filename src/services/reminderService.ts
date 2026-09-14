import { ApiClient } from '@/api/client';
import { publicEnvironment } from '@/config/environment';
import { IntegrationPendingError } from '@/services/integration';
import type {
  ReminderAction,
  ReminderActionResult,
  ReminderContext,
} from '@/types/reminder';

export interface ReminderContextService {
  get(reminderId: string, medicationId: string): Promise<ReminderContext>;
}

export class PendingReminderContextService implements ReminderContextService {
  async get(): Promise<ReminderContext> {
    throw new IntegrationPendingError('Production reminder delivery context');
  }
}

export class DevelopmentReminderContextService implements ReminderContextService {
  async get(
    reminderId: string,
    medicationId: string,
  ): Promise<ReminderContext> {
    return {
      reminderId,
      medicationId,
      medicationName: 'Development reminder',
      scheduledFor: new Date().toISOString(),
      statusText: 'Development-only reminder context',
      instructions: null,
      scheduleRevision: null,
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

export const buildReminderContextService = (): ReminderContextService =>
  publicEnvironment.appEnvironment === 'development' &&
  publicEnvironment.developerDiagnostics
    ? new DevelopmentReminderContextService()
    : new PendingReminderContextService();
