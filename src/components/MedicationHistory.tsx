import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
} from '@/components';
import type { IntakeHistoryItem } from '@/types/history';

export function MedicationHistory({
  items,
  loading,
  error,
  onRefresh,
}: {
  items: readonly IntakeHistoryItem[];
  loading: boolean;
  error: boolean;
  onRefresh(): void;
}) {
  if (loading) return <LoadingIndicator label="Loading medication history" />;
  if (error)
    return (
      <>
        <AppAlert
          tone="error"
          message="Medication history is temporarily unavailable."
        />
        <AppButton label="Try again" onPress={onRefresh} />
      </>
    );
  return (
    <>
      {!items.length ? (
        <EmptyState
          title="No medication history"
          message="Recorded intake events will appear here."
        />
      ) : (
        items.map((item) => (
          <AppCard
            key={item.id}
            accessible
            accessibilityLabel={`${item.medicationName ?? 'Medication name unavailable'}. ${item.statusText}`}
          >
            <AppText variant="label">
              {item.medicationName ?? 'Medication name unavailable'}
            </AppText>
            <AppText>{new Date(item.eventTime).toLocaleString()}</AppText>
            <AppText>{item.statusText}</AppText>
            {item.recordedAt ? (
              <AppText variant="caption">
                Reported {new Date(item.recordedAt).toLocaleString()}
              </AppText>
            ) : null}
          </AppCard>
        ))
      )}
      <AppButton
        variant="secondary"
        label="Refresh history"
        onPress={onRefresh}
      />
      <AppText variant="caption">
        History is a factual record and is not a clinical interpretation.
      </AppText>
    </>
  );
}
