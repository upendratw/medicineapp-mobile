import {
  AppAlert,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import type { DrugInformationResult } from '@/types/drugInformation';

export function DrugInformationView({
  result,
  loading,
  error,
}: {
  result: DrugInformationResult | null;
  loading: boolean;
  error: boolean;
}) {
  if (loading)
    return (
      <LoadingIndicator label="Loading approved-source medicine information" />
    );
  if (error)
    return (
      <AppAlert
        tone="error"
        message="Approved-source medicine information is temporarily unavailable."
      />
    );
  if (!result)
    return (
      <EmptyState
        title="No information requested"
        message="Enter a medication name and choose an information section."
      />
    );
  if (result.status === 'human_translation_required')
    return (
      <AppAlert
        tone="warning"
        message="Validated human translation is required for the requested language. English evidence has not been substituted."
      />
    );
  if (!result.answerAvailable)
    return (
      <EmptyState
        title="No approved evidence available"
        message={result.statusText}
      />
    );
  if (result.safety.personalizedAdvice !== false)
    return (
      <AppAlert
        tone="error"
        message="This response could not be displayed within MedicineApp safety controls."
      />
    );
  return (
    <>
      <AppCard>
        <AppText variant="heading">{result.medication.displayName}</AppText>
        <AppText variant="label">
          {result.section === 'side_effects'
            ? 'Side effects and adverse reactions'
            : 'Warnings'}
        </AppText>
        <AppText>{result.answer}</AppText>
        <AppText variant="caption">
          Freshness: {result.freshness ?? 'not supplied'}
        </AppText>
      </AppCard>
      <AppText variant="heading">Sources</AppText>
      {result.citations.map((item) => (
        <AppCard key={item.evidenceId}>
          <AppText variant="label">{item.sourceAuthority}</AppText>
          <AppText>
            {item.source} · {item.section}
          </AppText>
          <AppText variant="caption">
            Record {item.sourceRecordId}, version {item.sourceVersion}
          </AppText>
          <AppText variant="caption">Reference: {item.sourceReference}</AppText>
          <AppText variant="caption">
            Retrieved: {new Date(item.retrievedAt).toLocaleString()}
          </AppText>
          {item.sourceUpdatedAt ? (
            <AppText variant="caption">
              Source updated: {new Date(item.sourceUpdatedAt).toLocaleString()}
            </AppText>
          ) : null}
        </AppCard>
      ))}
      <AppAlert message="Medicine information is provided from approved sources and does not replace advice from your doctor or pharmacist. Listed effects are informational, not a diagnosis." />
    </>
  );
}
