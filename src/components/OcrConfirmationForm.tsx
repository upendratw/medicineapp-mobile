import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppTextInput,
} from '@/components/primitives';
import type { ReviewedMedicine } from '@/types/medication';

type Props = {
  extracted: ReviewedMedicine;
  onConfirm(medicine: ReviewedMedicine): Promise<void> | void;
  onRetake(): Promise<void> | void;
};

export function OcrConfirmationForm({ extracted, onConfirm, onRetake }: Props) {
  const [medicine, setMedicine] = useState(extracted);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const update = (values: Partial<ReviewedMedicine>) =>
    setMedicine((current) => ({ ...current, ...values }));
  const run = async (operation: () => Promise<void> | void) => {
    if (working) return;
    setWorking(true);
    setError('');
    try {
      await operation();
    } catch {
      setError(
        'Your reviewed medicine details could not be saved. Please try again.',
      );
    } finally {
      setWorking(false);
    }
  };
  const reviewed = {
    medicineName: medicine.medicineName.trim(),
    strength: medicine.strength.trim(),
    dosageForm: medicine.dosageForm.trim(),
    activeIngredient: medicine.activeIngredient.trim(),
    manufacturer: medicine.manufacturer.trim(),
  };
  return (
    <>
      <AppAlert message="We read the following information from the package. Please check and correct it before continuing." />
      {error ? <AppAlert tone="error" message={error} /> : null}
      <AppCard>
        <AppTextInput
          label="Medicine Name"
          value={medicine.medicineName}
          onChangeText={(value) => update({ medicineName: value })}
          maxLength={120}
        />
        <AppTextInput
          label="Strength"
          value={medicine.strength}
          onChangeText={(value) => update({ strength: value })}
          maxLength={40}
        />
        <AppTextInput
          label="Dosage Form"
          value={medicine.dosageForm}
          onChangeText={(value) => update({ dosageForm: value })}
          maxLength={60}
        />
        <AppTextInput
          label="Active Ingredient"
          value={medicine.activeIngredient}
          onChangeText={(value) => update({ activeIngredient: value })}
          maxLength={160}
        />
        <AppTextInput
          label="Manufacturer"
          value={medicine.manufacturer}
          onChangeText={(value) => update({ manufacturer: value })}
          maxLength={160}
        />
      </AppCard>
      <AppButton
        label="Confirm Medicine"
        disabled={reviewed.medicineName.length < 2}
        loading={working}
        onPress={() => run(() => onConfirm(reviewed))}
      />
      <AppButton
        variant="secondary"
        label="Retake"
        disabled={working}
        onPress={() => run(onRetake)}
      />
    </>
  );
}
