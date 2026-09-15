import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import type { MedicationSchedule, ScheduleInput } from '@/types/schedule';
import {
  normalizeScheduleTimes,
  validateScheduleDates,
} from '@/utils/medicationValidation';

type Props = {
  medicationId: string;
  initial?: MedicationSchedule;
  timezone: string;
  submit(input: ScheduleInput): Promise<MedicationSchedule>;
};
export function ScheduleForm({
  medicationId,
  initial,
  timezone,
  submit,
}: Props) {
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [times, setTimes] = useState(initial?.times.join(', ') ?? '08:00');
  const [instructions, setInstructions] = useState('');
  const [active, setActive] = useState(initial?.status === 'active');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const dateError = validateScheduleDates(startDate, endDate);
    const timeResult = normalizeScheduleTimes(times.split(','));
    const validationError = dateError ?? timeResult.errors.times;
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      await submit({
        medication_id: medicationId,
        timezone,
        start_date: startDate,
        end_date: endDate || undefined,
        food_instruction: 'none',
        instructions_text: instructions.trim() || undefined,
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
        activate: active,
      });
      setSaved(true);
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
      <AppTextInput
        label="Start date"
        accessibilityHint="Use YYYY-MM-DD"
        value={startDate}
        onChangeText={setStartDate}
        maxLength={10}
      />
      <AppTextInput
        label="End date (optional)"
        accessibilityHint="Use YYYY-MM-DD"
        value={endDate}
        onChangeText={setEndDate}
        maxLength={10}
      />
      <AppTextInput
        label="Daily times"
        accessibilityHint="Use 24-hour times separated by commas"
        value={times}
        onChangeText={setTimes}
        maxLength={71}
        placeholder="08:00, 20:00"
      />
      <AppText>Timezone: {timezone}</AppText>
      <AppTextInput
        label="User instructions (optional)"
        value={instructions}
        onChangeText={setInstructions}
        maxLength={500}
        multiline
      />
      <AppButton
        variant={active ? 'primary' : 'secondary'}
        label={active ? 'Schedule active' : 'Save as draft'}
        onPress={() => setActive((value) => !value)}
      />
      <AppButton
        label={initial ? 'Update schedule' : 'Create schedule'}
        loading={loading}
        onPress={save}
      />
    </>
  );
}
