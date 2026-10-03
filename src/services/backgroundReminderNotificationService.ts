import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  REMINDER_NOTIFICATION_CATEGORY,
  REMINDER_NOTIFICATION_SOUND,
} from '@/services/notificationActions';
import {
  PATIENT_REMINDER_CHANNEL_ID,
  PRIVATE_REMINDER_COPY,
} from '@/services/patientNotificationPrivacy';
import type { ReminderContextService } from '@/services/reminderService';

const HANDLED_REMINDERS_KEY =
  '@medicineapp/background-reminder-notifications/v1';
const MAX_HANDLED_REMINDERS = 64;
const REMINDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPECTED_KEYS = ['reminder_id', 'schema_version', 'type'] as const;

export type BackgroundReminderSignal = Readonly<{
  type: 'medicineapp.reminder.due';
  schema_version: 1;
  reminder_id: string;
}>;

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
type SessionReader = () => Promise<Readonly<{ role: string }> | null>;
type NotificationPublisher = (
  signal: BackgroundReminderSignal,
) => Promise<void>;

export type BackgroundReminderResult = 'displayed' | 'duplicate' | 'rejected';

export function buildBackgroundReminderNotificationRequest(
  signal: BackgroundReminderSignal,
) {
  return {
    identifier: `medicineapp-reminder-${signal.reminder_id}`,
    content: {
      title: PRIVATE_REMINDER_COPY.title,
      body: PRIVATE_REMINDER_COPY.body,
      data: signal,
      sound: REMINDER_NOTIFICATION_SOUND,
      priority: 'max',
      categoryIdentifier: REMINDER_NOTIFICATION_CATEGORY,
      autoDismiss: true,
    },
    trigger: { channelId: PATIENT_REMINDER_CHANNEL_ID },
  } as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parseBackgroundReminderSignal(
  payload: unknown,
): BackgroundReminderSignal | null {
  if (!isRecord(payload) || 'actionIdentifier' in payload) return null;
  if (payload.notification !== null || !isRecord(payload.data)) return null;

  const candidate =
    parseJson(payload.data.dataString) ?? parseJson(payload.data.body);
  if (!isRecord(candidate)) return null;
  if (Object.keys(candidate).sort().join(',') !== EXPECTED_KEYS.join(','))
    return null;
  if (
    candidate.type !== 'medicineapp.reminder.due' ||
    candidate.schema_version !== 1 ||
    typeof candidate.reminder_id !== 'string' ||
    !REMINDER_ID_PATTERN.test(candidate.reminder_id)
  )
    return null;

  return {
    type: candidate.type,
    schema_version: candidate.schema_version,
    reminder_id: candidate.reminder_id,
  };
}

export class BackgroundReminderNotificationCoordinator {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly sessions: SessionReader,
    private readonly reminders: ReminderContextService,
    private readonly publish: NotificationPublisher,
    private readonly storage: Storage = AsyncStorage,
  ) {}

  async handle(payload: unknown): Promise<BackgroundReminderResult> {
    const signal = parseBackgroundReminderSignal(payload);
    if (!signal) return 'rejected';
    const reminderId = signal.reminder_id;
    if (this.inFlight.has(reminderId)) return 'duplicate';

    this.inFlight.add(reminderId);
    try {
      if ((await this.readHandled()).includes(reminderId)) return 'duplicate';
      const session = await this.sessions();
      if (session?.role !== 'patient') return 'rejected';
      try {
        const context = await this.reminders.get(reminderId);
        if (context.reminderId !== reminderId) return 'rejected';
      } catch {
        return 'rejected';
      }
      await this.publish(signal);
      await this.remember(reminderId);
      return 'displayed';
    } catch {
      return 'rejected';
    } finally {
      this.inFlight.delete(reminderId);
    }
  }

  private async readHandled(): Promise<string[]> {
    try {
      const raw = await this.storage.getItem(HANDLED_REMINDERS_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (value): value is string =>
            typeof value === 'string' && REMINDER_ID_PATTERN.test(value),
        )
        .slice(-MAX_HANDLED_REMINDERS);
    } catch {
      return [];
    }
  }

  private async remember(reminderId: string): Promise<void> {
    const handled = (await this.readHandled()).filter(
      (value) => value !== reminderId,
    );
    await this.storage.setItem(
      HANDLED_REMINDERS_KEY,
      JSON.stringify([...handled, reminderId].slice(-MAX_HANDLED_REMINDERS)),
    );
  }
}

export { HANDLED_REMINDERS_KEY, MAX_HANDLED_REMINDERS };
