import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';

import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import { useTranslation } from '@/localization';
import type {
  InventoryQuantityUnit,
  ManualMedicationInput,
  PatientMedication,
  ReviewedMedicine,
} from '@/types/medication';
import {
  defaultQuantityUnit,
  inventoryQuantityUnits,
  validateManualMedication,
} from '@/utils/medicationValidation';

type Props = {
  extracted: ReviewedMedicine;
  captureId: string;
  confirmCapture(medicine: ReviewedMedicine): Promise<void>;
  createMedication(input: ManualMedicationInput): Promise<PatientMedication>;
  onSaved(): void;
  onRetake(): Promise<void> | void;
};

export function OcrConfirmationForm({
  extracted,
  captureId,
  confirmCapture,
  createMedication,
  onSaved,
  onRetake,
}: Props) {
  const { t } = useTranslation();
  const [medicine, setMedicine] = useState(extracted);
  const [initialQuantity, setInitialQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<InventoryQuantityUnit | ''>(
    defaultQuantityUnit(extracted.dosageForm) ?? '',
  );
  const [unitChosen, setUnitChosen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [captureConfirmed, setCaptureConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = useRef(Crypto.randomUUID());
  const lastAttempt = useRef('');
  const submitting = useRef(false);

  const update = (values: Partial<ReviewedMedicine>) =>
    setMedicine((current) => ({ ...current, ...values }));
  const reviewed = {
    medicineName: medicine.medicineName.trim(),
    strength: medicine.strength.trim(),
    dosageForm: medicine.dosageForm.trim(),
    activeIngredient: medicine.activeIngredient.trim(),
    manufacturer: medicine.manufacturer.trim(),
  };

  const addMedicine = async () => {
    if (working || submitting.current) return;
    submitting.current = true;
    const payload = {
      name: reviewed.medicineName,
      strength: reviewed.strength,
      dosageForm: reviewed.dosageForm,
      activeIngredient: reviewed.activeIngredient,
      manufacturer: reviewed.manufacturer,
      notes: '',
      initialQuantity,
      quantityUnit: quantityUnit as InventoryQuantityUnit,
      source: 'ocr_assisted' as const,
      medicineCaptureId: captureId,
      idempotencyKey: key.current,
    };
    const attempt = JSON.stringify({ ...payload, idempotencyKey: undefined });
    if (lastAttempt.current && lastAttempt.current !== attempt)
      key.current = Crypto.randomUUID();
    lastAttempt.current = attempt;
    payload.idempotencyKey = key.current;
    const validation = validateManualMedication(payload);
    setErrors(validation.errors);
    setError('');
    if (!validation.value) {
      submitting.current = false;
      return;
    }
    setWorking(true);
    try {
      if (!captureConfirmed) {
        await confirmCapture(reviewed);
        setCaptureConfirmed(true);
      }
      await createMedication(validation.value);
      onSaved();
    } catch {
      setError(
        'The medicine could not be added. Your information remains available for retry.',
      );
    } finally {
      submitting.current = false;
      setWorking(false);
    }
  };

  const retake = async () => {
    if (working || captureConfirmed) return;
    setWorking(true);
    setError('');
    try {
      await onRetake();
    } catch {
      setError('The recognition choice could not be saved. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const field = (
    label: string,
    value: string,
    maxLength: number,
    change: (value: string) => void,
  ) => (
    <AppTextInput
      label={label}
      value={value}
      editable={!captureConfirmed}
      onChangeText={change}
      maxLength={maxLength}
    />
  );

  return (
    <>
      <AppAlert message="We read the following information from the package. Please check and correct it before adding the medicine." />
      {error ? <AppAlert tone="error" message={error} /> : null}
      <AppCard>
        {field('Medicine Name', medicine.medicineName, 120, (value) =>
          update({ medicineName: value }),
        )}
        {field('Strength', medicine.strength, 40, (value) =>
          update({ strength: value }),
        )}
        {field('Dosage Form', medicine.dosageForm, 60, (value) => {
          update({ dosageForm: value });
          if (!unitChosen) setQuantityUnit(defaultQuantityUnit(value) ?? '');
        })}
        {field('Active Ingredient', medicine.activeIngredient, 160, (value) =>
          update({ activeIngredient: value }),
        )}
        {field('Manufacturer', medicine.manufacturer, 160, (value) =>
          update({ manufacturer: value }),
        )}
      </AppCard>
      {captureConfirmed ? (
        <AppAlert message={t('captureConfirmedRetry')} />
      ) : null}
      <AppText variant="heading">{t('medicineOnHand')}</AppText>
      <AppTextInput
        label={t('currentQuantity')}
        value={initialQuantity}
        onChangeText={setInitialQuantity}
        error={errors.initialQuantity}
        keyboardType="decimal-pad"
        maxLength={13}
      />
      <AppButton
        variant="secondary"
        label={`${t('quantityUnit')}: ${quantityUnit ? t(`quantityUnit_${quantityUnit}`) : t('selectQuantityUnit')}`}
        accessibilityHint={errors.quantityUnit}
        onPress={() => setUnitOpen((value) => !value)}
      />
      {errors.quantityUnit ? (
        <AppAlert tone="error" message={errors.quantityUnit} />
      ) : null}
      {unitOpen
        ? inventoryQuantityUnits.map((unit) => (
            <AppButton
              key={unit}
              variant="secondary"
              label={t(`quantityUnit_${unit}`)}
              onPress={() => {
                setQuantityUnit(unit);
                setUnitChosen(true);
                setUnitOpen(false);
              }}
            />
          ))
        : null}
      <AppButton
        label={t('addMedicine')}
        disabled={reviewed.medicineName.length < 2}
        loading={working}
        onPress={addMedicine}
      />
      {!captureConfirmed ? (
        <AppButton
          variant="secondary"
          label="Retake"
          disabled={working}
          onPress={retake}
        />
      ) : null}
    </>
  );
}
