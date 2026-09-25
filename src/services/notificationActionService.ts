import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { ApiError } from '@/api/client';
import { parseNotificationIntent } from '@/navigation/DeepLinkService';
import type { NotificationResponse } from '@/services/notificationCapability';
import { ExpoNotificationCapability } from '@/services/notificationCapability';
import {
  resolveReminderNotificationAction,
  type ReminderNotificationAction,
} from '@/services/notificationActions';
import type {
  ReminderContextService,
  ReminderService,
} from '@/services/reminderService';

const STORAGE_KEY = '@medicineapp/pending-notification-action/v1';
const HANDLED_KEY = '@medicineapp/handled-notification-action/v1';
const SNOOZE_MINUTES = 10;

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export type PendingNotificationAction = Readonly<{
  action: ReminderNotificationAction;
  reminderId: string;
  requestKey: string;
}>;

export type NotificationActionResult = Readonly<{
  status: 'none' | 'applied' | 'retry' | 'rejected';
  pending?: PendingNotificationAction;
}>;

function isPending(value: unknown): value is PendingNotificationAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    ['taken', 'snooze', 'skipped'].includes(String(entry.action)) &&
    typeof entry.reminderId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(entry.reminderId) &&
    typeof entry.requestKey === 'string' &&
    /^[0-9a-f-]{36}$/i.test(entry.requestKey)
  );
}

export class NotificationActionCoordinator {
  private processing: Promise<NotificationActionResult> | null = null;
  private notificationIdentifier: string | null = null;

  constructor(
    private readonly reminders: ReminderService,
    private readonly contexts: ReminderContextService,
    private readonly notifications: ExpoNotificationCapability,
    private readonly storage: Storage = AsyncStorage,
  ) {}

  async capture(
    response: NotificationResponse,
  ): Promise<PendingNotificationAction | null> {
    const action = resolveReminderNotificationAction(response.actionIdentifier);
    const intent = parseNotificationIntent(response.data);
    if (!action || !intent) return null;
    if (
      !response.notificationIdentifier ||
      response.notificationIdentifier.length > 256
    )
      return null;
    this.notificationIdentifier = response.notificationIdentifier;
    const existing = await this.read();
    const handled = await this.readHandled();
    if (handled?.action === action && handled.reminderId === intent.reminderId)
      return null;
    const pending =
      existing?.action === action && existing.reminderId === intent.reminderId
        ? existing
        : {
            action,
            reminderId: intent.reminderId,
            requestKey: Crypto.randomUUID(),
          };
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(pending));
    return pending;
  }

  async process(): Promise<NotificationActionResult> {
    if (this.processing) return this.processing;
    this.processing = this.processOnce().finally(() => {
      this.processing = null;
    });
    return this.processing;
  }

  private async processOnce(): Promise<NotificationActionResult> {
    const pending = await this.read();
    if (!pending) return { status: 'none' };
    try {
      if (pending.action === 'snooze') {
        await this.reminders.snooze(
          pending.reminderId,
          SNOOZE_MINUTES,
          pending.requestKey,
        );
      } else {
        const context = await this.contexts.get(pending.reminderId);
        const action = pending.action === 'taken' ? 'TAKEN' : 'SKIPPED';
        if (!context.allowedActions.includes(action)) {
          await this.markHandled(pending);
          await this.clear();
          return { status: 'rejected', pending };
        }
        await this.reminders.acknowledge(
          pending.reminderId,
          action,
          pending.requestKey,
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          context.scheduleRevision,
        );
      }
      if (this.notificationIdentifier)
        await this.notifications.dismiss(this.notificationIdentifier);
      await this.markHandled(pending);
      await this.clear();
      return { status: 'applied', pending };
    } catch (error) {
      const retry =
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status === 401 ||
        error.status === 429 ||
        error.status >= 500;
      if (!retry) {
        await this.markHandled(pending);
        await this.clear();
      }
      return { status: retry ? 'retry' : 'rejected', pending };
    }
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEY);
  }

  private async read(): Promise<PendingNotificationAction | null> {
    try {
      const raw = await this.storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (isPending(value)) return value;
    } catch {
      // Corrupt or unavailable local metadata must never trigger an action.
    }
    try {
      await this.storage.removeItem(STORAGE_KEY);
    } catch {
      // Storage failure leaves no trusted action that can be safely executed.
    }
    return null;
  }

  private async markHandled(pending: PendingNotificationAction): Promise<void> {
    await this.storage.setItem(HANDLED_KEY, JSON.stringify(pending));
  }

  private async readHandled(): Promise<PendingNotificationAction | null> {
    try {
      const raw = await this.storage.getItem(HANDLED_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return isPending(value) ? value : null;
    } catch {
      return null;
    }
  }
}

export { SNOOZE_MINUTES };
