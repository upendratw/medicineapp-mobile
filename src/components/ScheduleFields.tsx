import { Switch, View } from 'react-native';
import { AppText, AppTextInput } from '@/components/primitives';
import { useTranslation } from '@/localization';
import type { InventoryQuantityUnit } from '@/types/medication';
import type { ScheduleInput } from '@/types/schedule';
import {
  normalizeScheduleTimes,
  validateScheduleDates,
} from '@/utils/medicationValidation';

export type ScheduleDraft = Readonly<{
  startDate: string;
  endDate: string;
  times: string;
  doseQuantity: string;
  doseUnit: string;
  instructions: string;
  active: boolean;
}>;

export const initialScheduleDraft = (
  doseUnit = '',
  date = new Date().toISOString().slice(0, 10),
): ScheduleDraft => ({
  startDate: date,
  endDate: '',
  times: '08:00',
  doseQuantity: '',
  doseUnit,
  instructions: '',
  active: true,
});

const DOSE_QUANTITY = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,4})?$/;

export function buildLinkedScheduleInput(
  patientMedicationId: string,
  timezone: string,
  draft: ScheduleDraft,
  inventoryUnit?: InventoryQuantityUnit | '',
): { input?: ScheduleInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const dateError = validateScheduleDates(draft.startDate, draft.endDate);
  const timeResult = normalizeScheduleTimes(draft.times.split(','));
  if (dateError) errors.dates = dateError;
  if (timeResult.errors.times) errors.times = timeResult.errors.times;
  const doseQuantity = draft.doseQuantity.trim();
  const doseUnit = draft.doseUnit.trim().toLowerCase();
  if (!doseQuantity) errors.doseQuantity = 'Enter the dose quantity.';
  else if (
    !DOSE_QUANTITY.test(doseQuantity) ||
    /^0(?:\.0{1,4})?$/.test(doseQuantity)
  )
    errors.doseQuantity =
      'Enter a positive dose quantity with up to 4 decimal places.';
  if (!doseUnit) errors.doseUnit = 'Enter the dose unit.';
  else if (inventoryUnit && doseUnit !== inventoryUnit)
    errors.doseUnit = `Dose unit must match the inventory unit: ${inventoryUnit}.`;
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: {
      patient_medication_id: patientMedicationId,
      timezone,
      start_date: draft.startDate,
      end_date: draft.endDate || undefined,
      food_instruction: 'none',
      dose_quantity: doseQuantity,
      dose_unit: doseUnit,
      instructions_text: draft.instructions.trim() || undefined,
      medication_choice_confirmed: true,
      rules: [
        {
          rule_type: 'daily',
          times_of_day: timeResult.value!,
          days_of_week: [],
          interval_hours: null,
          interval_anchor: null,
          once_at: null,
        },
      ],
      activate: draft.active,
    },
  };
}

type Props = {
  value: ScheduleDraft;
  onChange(value: ScheduleDraft): void;
  inventoryUnit?: InventoryQuantityUnit | '';
  errors?: Readonly<Record<string, string>>;
  showActivation?: boolean;
  activationEditable?: boolean;
};

export function ScheduleFields({
  value,
  onChange,
  inventoryUnit,
  errors,
  showActivation = true,
  activationEditable = true,
}: Props) {
  const { t } = useTranslation();
  const set = (change: Partial<ScheduleDraft>) =>
    onChange({ ...value, ...change });
  return (
    <>
      <AppTextInput
        label="Dose Quantity"
        accessibilityHint="Required for inventory consumption"
        value={value.doseQuantity}
        onChangeText={(doseQuantity) => set({ doseQuantity })}
        error={errors?.doseQuantity}
        keyboardType="decimal-pad"
        maxLength={13}
      />
      <AppTextInput
        label="Dose Unit"
        accessibilityHint={
          inventoryUnit
            ? `Must match the medicine inventory unit: ${inventoryUnit}`
            : 'Enter the unit written on the medicine directions'
        }
        value={value.doseUnit}
        onChangeText={(doseUnit) => set({ doseUnit })}
        error={errors?.doseUnit}
        maxLength={32}
      />
      <AppTextInput
        label="Daily times"
        accessibilityHint="Use 24-hour times separated by commas"
        value={value.times}
        onChangeText={(times) => set({ times })}
        error={errors?.times}
        maxLength={71}
        placeholder="08:00, 20:00"
      />
      <AppText variant="caption">
        Add another time by separating times with a comma.
      </AppText>
      <AppTextInput
        label="Start Date"
        accessibilityHint="Use YYYY-MM-DD"
        value={value.startDate}
        onChangeText={(startDate) => set({ startDate })}
        error={errors?.dates}
        maxLength={10}
      />
      <AppTextInput
        label="End Date (optional — until stopped)"
        accessibilityHint="Leave blank to continue until stopped"
        value={value.endDate}
        onChangeText={(endDate) => set({ endDate })}
        maxLength={10}
      />
      <AppTextInput
        label="User instructions (optional)"
        value={value.instructions}
        onChangeText={(instructions) => set({ instructions })}
        maxLength={500}
        multiline
      />
      {showActivation ? (
        <View style={{ minHeight: 56, justifyContent: 'center' }}>
          <AppText>{`${t('scheduleReminders')}: ${value.active ? t('on') : t('off')}`}</AppText>
          <Switch
            accessibilityLabel={t('scheduleReminders')}
            accessibilityHint={
              activationEditable
                ? t('scheduleRemindersHint')
                : t('scheduleRemindersEditHint')
            }
            accessibilityRole="switch"
            accessibilityState={{
              checked: value.active,
              disabled: !activationEditable,
            }}
            disabled={!activationEditable}
            value={value.active}
            onValueChange={(active) => set({ active })}
          />
        </View>
      ) : null}
    </>
  );
}
