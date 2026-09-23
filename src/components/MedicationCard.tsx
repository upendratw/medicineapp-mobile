import { AppButton, AppCard, AppText } from '@/components/primitives';
import type { MedicationSummary } from '@/types/medication';
import { formatDecimalQuantity } from '@/utils/quantityFormat';

const status: Record<MedicationSummary['reviewStatus'], string> = {
  approved: 'Reviewed medication catalog entry',
  pending_review: 'Clinical review pending',
  rejected: 'Not approved for application use',
  user_entered_unreviewed: 'User-entered; not clinically reviewed',
};
const unitLabels = {
  tablet: 'Tablets',
  capsule: 'Capsules',
  ml: 'mL',
  drop: 'Drops',
  puff: 'Puffs',
  sachet: 'Sachets',
  patch: 'Patches',
  unit: 'Units',
} as const;
export function MedicationCard({
  medication,
  onSchedule,
  onEdit,
  onDelete,
}: {
  medication: MedicationSummary;
  onSchedule?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
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
      {medication.remainingQuantity && medication.quantityUnit ? (
        <AppText>{`${formatDecimalQuantity(medication.remainingQuantity)} ${unitLabels[medication.quantityUnit]} remaining`}</AppText>
      ) : null}
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
      {onEdit ? (
        <AppButton
          variant="secondary"
          label={`Edit ${medication.canonicalName}`}
          onPress={() => onEdit(medication.id)}
        />
      ) : null}
      {onDelete ? (
        <AppButton
          variant="secondary"
          label={`Delete ${medication.canonicalName}`}
          onPress={() => onDelete(medication.id)}
        />
      ) : null}
    </AppCard>
  );
}
