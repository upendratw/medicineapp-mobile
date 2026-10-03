import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { ApiClient } from '@/api/client';
import { secureTokenStore } from '@/security/SecureTokenStore';
import {
  BackgroundReminderNotificationCoordinator,
  buildBackgroundReminderNotificationRequest,
  type BackgroundReminderSignal,
} from '@/services/backgroundReminderNotificationService';
import { BackendReminderContextService } from '@/services/reminderService';

export const BACKGROUND_REMINDER_TASK = 'MEDICINEAPP_BACKGROUND_REMINDER_V1';

const reminderContexts = new BackendReminderContextService(
  new ApiClient(undefined, undefined, secureTokenStore),
);

async function publishReminder(
  signal: BackgroundReminderSignal,
): Promise<void> {
  await Notifications.scheduleNotificationAsync(
    buildBackgroundReminderNotificationRequest(signal),
  );
}

const coordinator = new BackgroundReminderNotificationCoordinator(
  () => secureTokenStore.read(),
  reminderContexts,
  publishReminder,
);

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_REMINDER_TASK,
  async ({ data, error }) => {
    if (error) return;
    await coordinator.handle(data);
  },
);

void TaskManager.isTaskRegisteredAsync(BACKGROUND_REMINDER_TASK)
  .then((registered) =>
    registered
      ? null
      : Notifications.registerTaskAsync(BACKGROUND_REMINDER_TASK),
  )
  .catch(() => undefined);
