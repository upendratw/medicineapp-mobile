import { AppButton, AppCard, AppText } from '@/components';
import type { MedicationSummary } from '@/types/medication';

const status: Record<MedicationSummary['reviewStatus'], string> = {
  approved: 'Reviewed medication catalog entry',
  pending_review: 'Clinical review pending',
  rejected: 'Not approved for application use',
  user_entered_unreviewed: 'User-entered; not clinically reviewed',
};
export function MedicationCard({
  medication,
  onSchedule,
}: {
  medication: MedicationSummary;
  onSchedule?: (id: string) => void;
}) {
  return (
    <AppCard
      accessible
      accessibilityLabel={`${medication.canonicalName}. ${status[medication.reviewStatus]}`}
    >
      <AppText variant="heading">{medication.canonicalName}</AppText>
      <AppText>
        {[medication.strength, medication.dosageForm]
          .filter(Boolean)
          .join(' • ') || 'Form and strength not provided'}
      </AppText>
      <AppText>
        {medication.scheduleSummary ?? 'No schedule summary available'}
      </AppText>
      <AppText variant="caption">
        {status[medication.reviewStatus]} •{' '}
        {medication.isActive ? 'Active' : 'Inactive'}
      </AppText>
      {onSchedule ? (
        <AppButton
          variant="secondary"
          label={`Create schedule for ${medication.canonicalName}`}
          onPress={() => onSchedule(medication.id)}
        />
      ) : null}
    </AppCard>
  );
}
