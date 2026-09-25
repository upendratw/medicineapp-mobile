import { useRef, useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  LoadingIndicator,
} from '@/components/primitives';
import type { ReminderAction, ReminderContext } from '@/types/reminder';
import { useTranslation } from '@/localization';

type Props = {
  reminder: ReminderContext | null;
  loading: boolean;
  unavailable: boolean;
  onAcknowledge(action: ReminderAction, eventId: string): Promise<void>;
  onSnooze(minutes: 5 | 10 | 15 | 30, requestKey: string): Promise<void>;
  onSuccess?(): void;
  onRetry?(): void;
};
const requestId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function ReminderAlert({
  reminder,
  loading,
  unavailable,
  onAcknowledge,
  onSnooze,
  onSuccess,
  onRetry,
}: Props) {
  const { t } = useTranslation();
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
      onSuccess?.();
    } catch {
      setOutcome('failure');
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };
  if (loading) return <LoadingIndicator label={t('loadingReminder')} />;
  if (unavailable || !reminder)
    return (
      <>
        <AppAlert tone="warning" message={t('unableToLoadReminder')} />
        {onRetry ? (
          <AppButton label={t('reminderRetry')} onPress={onRetry} />
        ) : null}
      </>
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
          {t('scheduledFor')}{' '}
          {new Date(reminder.scheduledLocalTime).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </AppText>
        <AppText>{reminder.statusText}</AppText>
        {reminder.doseQuantity && reminder.doseUnit ? (
          <AppText>{`${t('dose')}: ${reminder.doseQuantity} ${reminder.doseUnit}`}</AppText>
        ) : null}
        {reminder.instructions ? (
          <AppText>{reminder.instructions}</AppText>
        ) : null}
      </AppCard>
      {outcome === 'taken' ? (
        <AppAlert tone="success" message={t('markedAsTaken')} />
      ) : null}
      {outcome === 'skipped' ? (
        <AppAlert tone="success" message={t('doseSkipped')} />
      ) : null}
      {outcome === 'snoozed' ? (
        <AppAlert tone="success" message={t('reminderSnoozed')} />
      ) : null}
      {outcome === 'failure' ? (
        <AppAlert tone="error" message={t('reminderActionFailed')} />
      ) : null}
      {reminder.allowedActions.includes('TAKEN') ? (
        <AppButton
          label={t('taken')}
          loading={submitting}
          disabled={completed}
          onPress={() =>
            act(() => onAcknowledge('TAKEN', actionKeys.current.TAKEN), 'taken')
          }
        />
      ) : null}
      {reminder.allowedActions.includes('SNOOZE') ? (
        <AppButton
          variant="secondary"
          label={t('snooze')}
          disabled={submitting || completed}
          onPress={() =>
            act(() => onSnooze(10, actionKeys.current.SNOOZE), 'snoozed')
          }
        />
      ) : null}
      {reminder.allowedActions.includes('SKIPPED') ? (
        <AppButton
          variant="secondary"
          label={t('skip')}
          disabled={submitting || completed}
          onPress={() =>
            act(
              () => onAcknowledge('SKIPPED', actionKeys.current.SKIPPED),
              'skipped',
            )
          }
        />
      ) : null}
      {reminder.allowedActions.length === 0 ? (
        <AppAlert message={t('reminderNoLongerUpdatable')} />
      ) : null}
      <AppAlert message={t('reminderSafetyBoundary')} />
    </>
  );
}
