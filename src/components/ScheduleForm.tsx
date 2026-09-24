import { useState } from 'react';
import { AppAlert, AppButton, AppText } from '@/components/primitives';
import {
  buildLinkedScheduleInput,
  initialScheduleDraft,
  ScheduleFields,
  type ScheduleDraft,
} from '@/components/ScheduleFields';
import type { InventoryQuantityUnit } from '@/types/medication';
import type { MedicationSchedule, ScheduleInput } from '@/types/schedule';

type Props = {
  medicationId: string;
  initial?: MedicationSchedule;
  timezone: string;
  inventoryUnit?: InventoryQuantityUnit;
  submit(input: ScheduleInput): Promise<MedicationSchedule>;
  onSaved?(schedule: MedicationSchedule): void;
};
export function ScheduleForm({
  medicationId,
  initial,
  timezone,
  inventoryUnit,
  submit,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<ScheduleDraft>(() => ({
    ...initialScheduleDraft(inventoryUnit),
    ...(initial
      ? {
          startDate: initial.startDate,
          endDate: initial.endDate ?? '',
          times: initial.times.join(', '),
          doseQuantity: initial.doseQuantity ?? '',
          doseUnit: initial.doseUnit ?? inventoryUnit ?? '',
          instructions: initial.instructions ?? '',
          active: initial.status === 'active',
        }
      : {}),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const result = buildLinkedScheduleInput(
      medicationId,
      timezone,
      draft,
      inventoryUnit,
    );
    setErrors(result.errors);
    if (!result.input) return;
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      const savedSchedule = await submit(result.input);
      setSaved(true);
      onSaved?.(savedSchedule);
    } catch {
      setError('The schedule could not be saved. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <AppAlert message="Enter the schedule you intend to follow. MedicineApp does not recommend medication timing or dosage." />
      {error ? <AppAlert tone="error" message={error} /> : null}
      {saved ? <AppAlert tone="success" message="Schedule saved." /> : null}
      <ScheduleFields
        value={draft}
        onChange={setDraft}
        inventoryUnit={inventoryUnit}
        errors={errors}
        activationEditable={!initial}
      />
      <AppText>Timezone: {timezone}</AppText>
      <AppButton
        label={initial ? 'Update schedule' : 'Create schedule'}
        loading={loading}
        onPress={save}
      />
    </>
  );
}
