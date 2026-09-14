import type { ManualMedicationInput } from '@/types/medication';

export type ValidationResult<T> = { value?: T; errors: Record<string, string> };
const bounded = (value: string, max: number) => value.trim().slice(0, max);

export function validateManualMedication(
  input: ManualMedicationInput,
): ValidationResult<ManualMedicationInput> {
  const value = {
    name: bounded(input.name, 120),
    strength: bounded(input.strength ?? '', 40),
    dosageForm: bounded(input.dosageForm ?? '', 60),
    notes: bounded(input.notes ?? '', 500),
  };
  const errors: Record<string, string> = {};
  if (value.name.length < 2)
    errors.name = 'Enter a medication name of at least 2 characters.';
  return { value: Object.keys(errors).length ? undefined : value, errors };
}

export function validateScheduleDates(
  startDate: string,
  endDate: string,
): string | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))
  )
    return 'Enter a valid start date.';
  if (
    endDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      Number.isNaN(Date.parse(`${endDate}T00:00:00Z`)))
  )
    return 'Enter a valid end date.';
  if (endDate && endDate < startDate)
    return 'End date cannot be before start date.';
  return null;
}

export function normalizeScheduleTimes(
  values: readonly string[],
  max = 8,
): ValidationResult<readonly string[]> {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  const errors: Record<string, string> = {};
  if (!normalized.length) errors.times = 'Add at least one time.';
  if (normalized.length > max)
    errors.times = `Use no more than ${max} daily times.`;
  if (normalized.some((value) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)))
    errors.times = 'Use 24-hour times such as 08:30.';
  if (new Set(normalized).size !== normalized.length)
    errors.times = 'Duplicate times are not allowed.';
  return {
    value: Object.keys(errors).length ? undefined : [...normalized].sort(),
    errors,
  };
}
