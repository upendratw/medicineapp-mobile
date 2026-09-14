import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { AppHeader, AppScreen, ReminderAlert } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { reminderContextService, reminderService } from '@/services/registry';

export default function ReminderScreen() {
  const params = useLocalSearchParams<{
    reminderId?: string;
    medicationId?: string;
  }>();
  const reminderId =
    typeof params.reminderId === 'string' ? params.reminderId : '';
  const medicationId =
    typeof params.medicationId === 'string' ? params.medicationId : '';
  const load = useCallback(
    () => reminderContextService.get(reminderId, medicationId),
    [reminderId, medicationId],
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
        unavailable={state.error || !reminderId || !medicationId}
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
