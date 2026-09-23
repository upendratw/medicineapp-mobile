import { useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import { useTranslation } from '@/localization';
import type {
  InventoryQuantityUnit,
  PatientMedication,
  PatientMedicationUpdate,
} from '@/types/medication';
import { formatDecimalQuantity } from '@/utils/quantityFormat';
import { inventoryQuantityUnits } from '@/utils/medicationValidation';

type Props = {
  medication: PatientMedication;
  submit(input: PatientMedicationUpdate): Promise<PatientMedication>;
  onSaved(): void;
};

export function EditMedicationForm({ medication, submit, onSaved }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(medication.name);
  const [strength, setStrength] = useState(medication.strength ?? '');
  const [dosageForm, setDosageForm] = useState(medication.dosageForm ?? '');
  const [activeIngredient, setActiveIngredient] = useState(
    medication.activeIngredient ?? '',
  );
  const [manufacturer, setManufacturer] = useState(
    medication.manufacturer ?? '',
  );
  const [notes, setNotes] = useState(medication.notes ?? '');
  const [remainingQuantity, setRemainingQuantity] = useState(
    formatDecimalQuantity(medication.inventory.remainingQuantity),
  );
  const [quantityUnit, setQuantityUnit] = useState<InventoryQuantityUnit>(
    medication.inventory.quantityUnit,
  );
  const [unitOpen, setUnitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const save = async () => {
    if (submitting.current) return;
    const cleanName = name.trim();
    if (cleanName.length < 2)
      return setError('Enter a medication name of at least 2 characters.');
    if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,4})?$/.test(remainingQuantity.trim()))
      return setError(t('quantityInvalid'));
    submitting.current = true;
    setLoading(true);
    setError(null);
    try {
      await submit({
        name: cleanName,
        strength: strength.trim(),
        dosageForm: dosageForm.trim(),
        activeIngredient: activeIngredient.trim(),
        manufacturer: manufacturer.trim(),
        notes: notes.trim(),
        remainingQuantity: remainingQuantity.trim(),
        quantityUnit,
        revision: medication.inventory.revision,
      });
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof ApiError &&
          caught.code === 'PATIENT_MEDICATION_REVISION_CONFLICT'
          ? t('staleMedication')
          : 'The medicine could not be updated. Please try again.',
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      {error ? <AppAlert tone="error" message={error} /> : null}
      <AppTextInput
        label="Medication name"
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      <AppTextInput
        label="Strength (optional)"
        value={strength}
        onChangeText={setStrength}
        maxLength={40}
      />
      <AppTextInput
        label="Dosage form (optional)"
        value={dosageForm}
        onChangeText={setDosageForm}
        maxLength={60}
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
        value={remainingQuantity}
        onChangeText={setRemainingQuantity}
        keyboardType="decimal-pad"
        maxLength={13}
      />
      <AppButton
        variant="secondary"
        label={`${t('quantityUnit')}: ${t(`quantityUnit_${quantityUnit}`)}`}
        onPress={() => setUnitOpen((value) => !value)}
      />
      {unitOpen
        ? inventoryQuantityUnits.map((unit) => (
            <AppButton
              key={unit}
              variant="secondary"
              label={t(`quantityUnit_${unit}`)}
              onPress={() => {
                setQuantityUnit(unit);
                setUnitOpen(false);
              }}
            />
          ))
        : null}
      <AppButton label={t('saveChanges')} loading={loading} onPress={save} />
      <AppText variant="caption">
        Initial quantity and source provenance are preserved and cannot be
        edited.
      </AppText>
    </>
  );
}
