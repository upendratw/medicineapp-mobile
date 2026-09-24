import { AppButton, AppCard, AppText } from '@/components/primitives';
import type { MedicationSummary } from '@/types/medication';
import type { MedicationSchedule } from '@/types/schedule';
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
  schedules = [],
  onAddSchedule,
  onEditSchedule,
  onEdit,
  onDelete,
}: {
  medication: MedicationSummary;
  schedules?: readonly MedicationSchedule[];
  onAddSchedule?: (medication: MedicationSummary) => void;
  onEditSchedule?: (medication: MedicationSummary, scheduleId: string) => void;
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
      {medication.remainingQuantity && medication.quantityUnit ? (
        <AppText>{`${formatDecimalQuantity(medication.remainingQuantity)} ${unitLabels[medication.quantityUnit]} remaining`}</AppText>
      ) : null}
      <AppText variant="caption">
        {status[medication.reviewStatus]} •{' '}
        {medication.isActive ? 'Active' : 'Inactive'}
      </AppText>
      <AppText variant="heading">Schedule</AppText>
      {!schedules.length ? <AppText>No schedule</AppText> : null}
      {schedules.map((schedule) => (
        <AppCard key={schedule.id}>
          <AppText>
            {schedule.doseQuantity && schedule.doseUnit
              ? `${formatDecimalQuantity(schedule.doseQuantity)} ${schedule.doseUnit}`
              : 'Dose not recorded'}
          </AppText>
          <AppText>{schedule.times.join(' • ')}</AppText>
          <AppText>Daily • {schedule.status}</AppText>
          {onEditSchedule ? (
            <AppButton
              variant="secondary"
              label={`Edit Schedule for ${medication.canonicalName}`}
              onPress={() => onEditSchedule(medication, schedule.id)}
            />
          ) : null}
        </AppCard>
      ))}
      {!schedules.length && onAddSchedule ? (
        <AppButton
          variant="secondary"
          label={`Add Schedule for ${medication.canonicalName}`}
          onPress={() => onAddSchedule(medication)}
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
