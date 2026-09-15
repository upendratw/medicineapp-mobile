import { useRef, useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import type {
  ManualMedicationInput,
  MedicationSummary,
} from '@/types/medication';
import { validateManualMedication } from '@/utils/medicationValidation';

type Props = {
  initial?: Partial<ManualMedicationInput>;
  submit(input: ManualMedicationInput): Promise<MedicationSummary>;
  onCamera(): void;
  onSaved?(): void;
};
export function ManualMedicationForm({
  initial,
  submit,
  onCamera,
  onSaved,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [strength, setStrength] = useState(initial?.strength ?? '');
  const [dosageForm, setDosageForm] = useState(initial?.dosageForm ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [outcome, setOutcome] = useState<'success' | 'failure' | null>(null);
  const save = async () => {
    const result = validateManualMedication({
      name,
      strength,
      dosageForm,
      notes,
    });
    setErrors(result.errors);
    setOutcome(null);
    if (!result.value || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      await submit(result.value);
      setOutcome('success');
      onSaved?.();
    } catch {
      setOutcome('failure');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };
  return (
    <>
      <AppAlert message="This is a user-entered record. Saving it does not mean MedicineApp clinically reviewed or approved the medicine." />
      {outcome === 'success' ? (
        <AppAlert
          tone="success"
          message="User-entered medicine recorded for this development session."
        />
      ) : null}
      {outcome === 'failure' ? (
        <AppAlert
          tone="error"
          message="The medicine could not be recorded. Patient creation awaits backend support outside development."
        />
      ) : null}
      <AppTextInput
        label="Medication name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        maxLength={120}
        autoCapitalize="words"
      />
      <AppTextInput
        label="Strength (optional)"
        value={strength}
        onChangeText={setStrength}
        maxLength={40}
        placeholder="As written on the package"
      />
      <AppTextInput
        label="Dosage form (optional)"
        value={dosageForm}
        onChangeText={setDosageForm}
        maxLength={60}
        placeholder="For example, tablet"
      />
      <AppTextInput
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        maxLength={500}
        multiline
      />
      <AppButton
        label="Save user-entered medicine"
        loading={loading}
        onPress={save}
      />
      <AppButton
        variant="secondary"
        label="Scan medicine packaging"
        onPress={onCamera}
      />
      <AppText variant="caption">
        MedicineApp does not recommend a medicine, strength, dose, or treatment.
      </AppText>
    </>
  );
}
