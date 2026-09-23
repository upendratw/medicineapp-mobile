import type {
  InventoryQuantityUnit,
  ManualMedicationInput,
} from '@/types/medication';

export type ValidationResult<T> = { value?: T; errors: Record<string, string> };
const bounded = (value: string, max: number) => value.trim().slice(0, max);
export const inventoryQuantityUnits: readonly InventoryQuantityUnit[] = [
  'tablet',
  'capsule',
  'ml',
  'drop',
  'puff',
  'sachet',
  'patch',
  'unit',
];
const QUANTITY = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,4})?$/;

export const defaultQuantityUnit = (
  dosageForm: string,
): InventoryQuantityUnit | null => {
  const value = dosageForm.trim().toLowerCase();
  if (value.includes('tablet')) return 'tablet';
  if (value.includes('capsule')) return 'capsule';
  if (
    ['syrup', 'solution', 'suspension', 'liquid'].some((item) =>
      value.includes(item),
    )
  )
    return 'ml';
  if (value.includes('drop')) return 'drop';
  if (value.includes('inhaler') || value.includes('puff')) return 'puff';
  if (value.includes('sachet')) return 'sachet';
  if (value.includes('patch')) return 'patch';
  return null;
};

export function validateManualMedication(
  input: ManualMedicationInput,
): ValidationResult<ManualMedicationInput> {
  const value = {
    name: bounded(input.name, 120),
    strength: bounded(input.strength ?? '', 40),
    dosageForm: bounded(input.dosageForm ?? '', 60),
    activeIngredient: bounded(input.activeIngredient ?? '', 160),
    manufacturer: bounded(input.manufacturer ?? '', 160),
    notes: bounded(input.notes ?? '', 500),
    initialQuantity: input.initialQuantity.trim(),
    quantityUnit: input.quantityUnit,
    source: input.source,
    medicineCaptureId: input.medicineCaptureId,
    idempotencyKey: input.idempotencyKey,
  };
  const errors: Record<string, string> = {};
  if (value.name.length < 2)
    errors.name = 'Enter a medication name of at least 2 characters.';
  if (!value.initialQuantity)
    errors.initialQuantity = 'Enter the current quantity.';
  else if (!QUANTITY.test(value.initialQuantity))
    errors.initialQuantity =
      'Enter a valid quantity with up to 4 decimal places.';
  else if (/^0(?:\.0{1,4})?$/.test(value.initialQuantity))
    errors.initialQuantity = 'Current quantity must be greater than zero.';
  if (!inventoryQuantityUnits.includes(value.quantityUnit))
    errors.quantityUnit = 'Select a quantity unit.';
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
