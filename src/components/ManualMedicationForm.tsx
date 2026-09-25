import { useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import {
  buildLinkedScheduleInput,
  initialScheduleDraft,
  ScheduleFields,
  type ScheduleDraft,
} from '@/components/ScheduleFields';
import type {
  ManualMedicationInput,
  PatientMedication,
  InventoryQuantityUnit,
} from '@/types/medication';
import type { MedicationSchedule, ScheduleInput } from '@/types/schedule';
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
  createSchedule?(input: ScheduleInput): Promise<MedicationSchedule>;
  onCamera(): void;
  onSaved?(): void;
};
export function ManualMedicationForm({
  initial,
  submit,
  createSchedule,
  onCamera,
  onSaved,
  source = 'manual',
  medicineCaptureId,
}: Props) {
  const { t } = useTranslation();
  const isNewBlankMedicine = initial === undefined;
  const [name, setName] = useState(initial?.name ?? '');
  const [strength, setStrength] = useState(initial?.strength ?? '');
  const [dosageForm, setDosageForm] = useState(
    initial?.dosageForm ?? (isNewBlankMedicine ? 'Tablet' : ''),
  );
  const [activeIngredient, setActiveIngredient] = useState(
    initial?.activeIngredient ?? '',
  );
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<InventoryQuantityUnit | ''>(
    initial?.quantityUnit ??
      defaultQuantityUnit(initial?.dosageForm ?? '') ??
      (isNewBlankMedicine ? 'tablet' : ''),
  );
  const [unitChosen, setUnitChosen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(() =>
    initialScheduleDraft(),
  );
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>(
    {},
  );
  const [createdMedication, setCreatedMedication] =
    useState<PatientMedication | null>(null);
  const key = useRef(Crypto.randomUUID());
  const lastAttempt = useRef('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [outcome, setOutcome] = useState<
    'success' | 'failure' | 'partial' | null
  >(null);
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
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const scheduleResult = scheduleEnabled
      ? buildLinkedScheduleInput(
          'pending-patient-medication',
          timezone,
          scheduleDraft,
          quantityUnit,
        )
      : { errors: {}, input: undefined };
    setScheduleErrors(scheduleResult.errors);
    if (
      !result.value ||
      (scheduleEnabled && !scheduleResult.input) ||
      submitting.current
    )
      return;
    submitting.current = true;
    setLoading(true);
    try {
      const savedMedication = createdMedication ?? (await submit(result.value));
      setCreatedMedication(savedMedication);
      if (scheduleEnabled && createSchedule && scheduleResult.input) {
        try {
          await createSchedule({
            ...scheduleResult.input,
            patient_medication_id: savedMedication.id,
          });
        } catch {
          setOutcome('partial');
          return;
        }
      }
      setName('');
      setStrength('');
      setDosageForm('Tablet');
      setActiveIngredient('');
      setManufacturer('');
      setNotes('');
      setInitialQuantity('');
      setQuantityUnit('tablet');
      setUnitChosen(false);
      setScheduleEnabled(false);
      setScheduleDraft(initialScheduleDraft());
      setScheduleErrors({});
      setCreatedMedication(null);
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
      {outcome === 'partial' ? (
        <AppAlert
          tone="error"
          announce
          message="Medicine added, but the schedule could not be saved. Retry Schedule will only retry the schedule."
        />
      ) : null}
      <AppTextInput
        label="Medication name"
        value={name}
        editable={!createdMedication}
        onChangeText={setName}
        error={errors.name}
        maxLength={120}
        autoCapitalize="words"
      />
      <AppTextInput
        label="Strength (optional)"
        value={strength}
        editable={!createdMedication}
        onChangeText={setStrength}
        maxLength={40}
        placeholder="As written on the package"
      />
      <AppTextInput
        label="Dosage form (optional)"
        value={dosageForm}
        editable={!createdMedication}
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
        editable={!createdMedication}
        onChangeText={setActiveIngredient}
        maxLength={160}
      />
      <AppTextInput
        label="Manufacturer (optional)"
        value={manufacturer}
        editable={!createdMedication}
        onChangeText={setManufacturer}
        maxLength={160}
      />
      <AppTextInput
        label="Notes (optional)"
        value={notes}
        editable={!createdMedication}
        onChangeText={setNotes}
        maxLength={500}
        multiline
      />
      <AppText variant="heading">{t('medicineOnHand')}</AppText>
      <AppTextInput
        label={t('currentQuantity')}
        value={initialQuantity}
        editable={!createdMedication}
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
                setScheduleDraft((current) => ({
                  ...current,
                  doseUnit: current.doseUnit || unit,
                }));
                setUnitChosen(true);
                setUnitOpen(false);
              }}
            />
          ))
        : null}
      <AppText variant="heading">Schedule</AppText>
      <AppButton
        variant={scheduleEnabled ? 'primary' : 'secondary'}
        label={
          scheduleEnabled
            ? 'Set medicine schedule: On'
            : 'Set medicine schedule'
        }
        accessibilityHint="Optional. Shows fields for medicine reminders and inventory-linked doses."
        disabled={Boolean(createdMedication)}
        onPress={() => {
          setScheduleEnabled((value) => !value);
          setScheduleDraft((current) => ({
            ...current,
            doseUnit: current.doseUnit || quantityUnit,
          }));
        }}
      />
      {scheduleEnabled ? (
        <ScheduleFields
          value={scheduleDraft}
          onChange={setScheduleDraft}
          inventoryUnit={quantityUnit}
          errors={scheduleErrors}
        />
      ) : (
        <AppText variant="caption">
          You can add a schedule later from View Medicines.
        </AppText>
      )}
      <AppButton
        label={
          outcome === 'partial'
            ? 'Retry Schedule'
            : 'Save user-entered medicine'
        }
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
