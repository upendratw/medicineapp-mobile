import {
  AppAlert,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import type { InteractionWarning } from '@/types/clinicalFeatures';

export function InteractionWarnings({
  warnings,
  loading,
  pending,
  error,
  forbidden,
}: {
  warnings: readonly InteractionWarning[];
  loading: boolean;
  pending: boolean;
  error: boolean;
  forbidden: boolean;
}) {
  if (loading)
    return (
      <LoadingIndicator label="Loading validated interaction information" />
    );
  if (forbidden)
    return (
      <AppAlert
        tone="error"
        message="You are not authorized to view this interaction information."
      />
    );
  if (pending)
    return (
      <AppAlert
        tone="warning"
        message="Validated interaction checking is not yet available."
      />
    );
  if (error)
    return (
      <AppAlert
        tone="error"
        message="Validated interaction information is temporarily unavailable."
      />
    );
  if (!warnings.length)
    return (
      <EmptyState
        title="No validated interaction result"
        message="No backend-validated interaction result is available for this medication context."
      />
    );
  return (
    <>
      {warnings.map((warning) => (
        <AppCard
          key={warning.id}
          accessible
          accessibilityLabel={`${warning.medicationPair}. Severity: ${warning.severity}. ${warning.validatedStatus}`}
        >
          <AppText variant="heading">{warning.medicationPair}</AppText>
          <AppText variant="label">Severity: {warning.severity}</AppText>
          <AppText>{warning.summary}</AppText>
          <AppText>Validation: {warning.validatedStatus}</AppText>
          <AppText variant="caption">Source: {warning.source}</AppText>
          {warning.updatedAt ? (
            <AppText variant="caption">
              Updated: {new Date(warning.updatedAt).toLocaleString()}
            </AppText>
          ) : null}
        </AppCard>
      ))}
      <AppAlert message="Interaction information is informational and does not replace advice from your doctor or pharmacist." />
    </>
  );
}
