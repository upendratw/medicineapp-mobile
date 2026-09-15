import { useRef, useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  LoadingIndicator,
} from '@/components/primitives';
import type { ReminderAction, ReminderContext } from '@/types/reminder';

type Props = {
  reminder: ReminderContext | null;
  loading: boolean;
  unavailable: boolean;
  onAcknowledge(action: ReminderAction, eventId: string): Promise<void>;
  onSnooze(minutes: 5 | 10 | 15 | 30, requestKey: string): Promise<void>;
};
const requestId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function ReminderAlert({
  reminder,
  loading,
  unavailable,
  onAcknowledge,
  onSnooze,
}: Props) {
  const busy = useRef(false);
  const actionKeys = useRef({
    TAKEN: requestId(),
    SKIPPED: requestId(),
    SNOOZE: requestId(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<
    'taken' | 'skipped' | 'snoozed' | 'failure' | null
  >(null);
  const act = async (
    operation: () => Promise<void>,
    success: typeof outcome,
  ) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setOutcome(null);
    try {
      await operation();
      setOutcome(success);
    } catch {
      setOutcome('failure');
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };
  if (loading) return <LoadingIndicator label="Loading reminder" />;
  if (unavailable || !reminder)
    return (
      <AppAlert
        tone="warning"
        message="Reminder details are unavailable. No medication action was recorded."
      />
    );
  const completed = outcome === 'taken' || outcome === 'skipped';
  return (
    <>
      <AppCard
        accessible
        accessibilityLabel={`${reminder.medicationName}. ${reminder.statusText}`}
      >
        <AppText variant="heading">{reminder.medicationName}</AppText>
        <AppText>
          Scheduled for{' '}
          {new Date(reminder.scheduledFor).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </AppText>
        <AppText>{reminder.statusText}</AppText>
        {reminder.instructions ? (
          <AppText>{reminder.instructions}</AppText>
        ) : null}
      </AppCard>
      {outcome === 'taken' ? (
        <AppAlert
          tone="success"
          message="Dose recorded as taken based on your report."
        />
      ) : null}
      {outcome === 'skipped' ? (
        <AppAlert
          tone="success"
          message="Dose recorded as skipped based on your report."
        />
      ) : null}
      {outcome === 'snoozed' ? (
        <AppAlert tone="success" message="Reminder notification postponed." />
      ) : null}
      {outcome === 'failure' ? (
        <AppAlert
          tone="error"
          message="The reminder action could not be recorded. Please try again."
        />
      ) : null}
      <AppButton
        label="Mark this dose as taken"
        loading={submitting}
        disabled={completed}
        onPress={() =>
          act(() => onAcknowledge('TAKEN', actionKeys.current.TAKEN), 'taken')
        }
      />
      <AppButton
        variant="secondary"
        label="Remind me in 10 minutes"
        disabled={submitting || completed}
        onPress={() =>
          act(() => onSnooze(10, actionKeys.current.SNOOZE), 'snoozed')
        }
      />
      <AppButton
        variant="secondary"
        label="Record as skipped"
        disabled={submitting || completed}
        onPress={() =>
          act(
            () => onAcknowledge('SKIPPED', actionKeys.current.SKIPPED),
            'skipped',
          )
        }
      />
      <AppAlert message="These actions record your report or postpone this reminder only. They do not change your medication schedule or provide missed-dose advice." />
    </>
  );
}
