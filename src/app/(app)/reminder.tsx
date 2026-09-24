import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { AppHeader, AppScreen, ReminderAlert } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { reminderContextService, reminderService } from '@/services/registry';

export default function ReminderScreen() {
  const params = useLocalSearchParams<{
    reminderId?: string;
  }>();
  const reminderId =
    typeof params.reminderId === 'string' ? params.reminderId : '';
  const validReminderId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      reminderId,
    );
  const load = useCallback(
    () =>
      validReminderId
        ? reminderContextService.get(reminderId)
        : Promise.reject(new Error('Invalid reminder identifier')),
    [reminderId, validReminderId],
  );
  const state = useAsyncResource(load);
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  return (
    <AppScreen>
      <AppHeader
        title="Medication reminder"
        subtitle="Record what happened without changing your schedule."
      />
      <ReminderAlert
        reminder={state.data}
        loading={state.loading}
        unavailable={state.error || !reminderId}
        onRetry={() => void state.refresh()}
        onAcknowledge={(action, eventId) =>
          reminderService
            .acknowledge(
              reminderId,
              action,
              eventId,
              timezone,
              state.data?.scheduleRevision ?? null,
            )
            .then(() => undefined)
        }
        onSnooze={(minutes, key) =>
          reminderService.snooze(reminderId, minutes, key).then(() => undefined)
        }
      />
    </AppScreen>
  );
}
