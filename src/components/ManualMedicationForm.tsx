import { useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import type {
  ManualMedicationInput,
  PatientMedication,
  InventoryQuantityUnit,
} from '@/types/medication';
import { useTranslation } from '@/localization';
import {
  defaultQuantityUnit,
  inventoryQuantityUnits,
  validateManualMedication,
} from '@/utils/medicationValidation';

type Props = {
  initial?: Partial<ManualMedicationInput>;
  source?: 'manual' | 'ocr_assisted';
  medicineCaptureId?: string;
  submit(input: ManualMedicationInput): Promise<PatientMedication>;
  onCamera(): void;
  onSaved?(): void;
};
export function ManualMedicationForm({
  initial,
  submit,
  onCamera,
  onSaved,
  source = 'manual',
  medicineCaptureId,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [strength, setStrength] = useState(initial?.strength ?? '');
  const [dosageForm, setDosageForm] = useState(initial?.dosageForm ?? '');
  const [activeIngredient, setActiveIngredient] = useState(
    initial?.activeIngredient ?? '',
  );
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<InventoryQuantityUnit | ''>(
    defaultQuantityUnit(initial?.dosageForm ?? '') ?? '',
  );
  const [unitChosen, setUnitChosen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const key = useRef(Crypto.randomUUID());
  const lastAttempt = useRef('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [outcome, setOutcome] = useState<'success' | 'failure' | null>(null);
  const save = async () => {
    const payload = {
      name,
      strength,
      dosageForm,
      activeIngredient,
      manufacturer,
      notes,
      initialQuantity,
      quantityUnit: quantityUnit as InventoryQuantityUnit,
      source,
      medicineCaptureId,
      idempotencyKey: key.current,
    };
    const attempt = JSON.stringify({ ...payload, idempotencyKey: undefined });
    if (lastAttempt.current && lastAttempt.current !== attempt)
      key.current = Crypto.randomUUID();
    lastAttempt.current = attempt;
    payload.idempotencyKey = key.current;
    const result = validateManualMedication(payload);
    setErrors(result.errors);
    setOutcome(null);
    if (!result.value || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      await submit(result.value);
      setName('');
      setStrength('');
      setDosageForm('');
      setActiveIngredient('');
      setManufacturer('');
      setNotes('');
      setInitialQuantity('');
      setQuantityUnit('');
      setUnitChosen(false);
      key.current = Crypto.randomUUID();
      lastAttempt.current = '';
      setErrors({});
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
        <AppAlert tone="success" announce message={t('medicineSaveSuccess')} />
      ) : null}
      {outcome === 'failure' ? (
        <AppAlert
          tone="error"
          message="The medicine could not be recorded. Please try again."
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
        onChangeText={(value) => {
          setDosageForm(value);
          if (!unitChosen) setQuantityUnit(defaultQuantityUnit(value) ?? '');
        }}
        maxLength={60}
        placeholder="For example, tablet"
      />
      <AppTextInput
        label="Active ingredient (optional)"
        value={activeIngredient}
        onChangeText={setActiveIngredient}
        maxLength={160}
      />
      <AppTextInput
        label="Manufacturer (optional)"
        value={manufacturer}
        onChangeText={setManufacturer}
        maxLength={160}
      />
      <AppTextInput
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        maxLength={500}
        multiline
      />
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
