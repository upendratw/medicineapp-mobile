import type { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ManualMedicationForm } from '@/components';
import { PreferencesProvider } from '@/state/PreferencesContext';
import type { PatientMedication } from '@/types/medication';

const saved: PatientMedication = {
  id: 'local-1',
  name: 'Synthetic Medicine',
  dosageForm: 'Tablet',
  strength: '5 mg',
  activeIngredient: null,
  manufacturer: null,
  notes: null,
  source: 'manual',
  medicineCaptureId: null,
  isActive: true,
  inventory: {
    id: 'inventory-1',
    initialQuantity: '20.0000',
    remainingQuantity: '20.0000',
    quantityUnit: 'tablet',
    lowStockThreshold: null,
    revision: 1,
  },
};

const enterInventory = async (screen: Awaited<ReturnType<typeof render>>) => {
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '20');
  await fireEvent.press(screen.getByRole('button', { name: /Quantity Unit:/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Tablets' }));
};

const form = (props: ComponentProps<typeof ManualMedicationForm>) => (
  <PreferencesProvider>
    <ManualMedicationForm {...props} />
  </PreferencesProvider>
);

test('manual form validates required bounded input and never implies approval', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(form({ submit, onCamera: jest.fn() }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(
    screen.getByText(/does not mean MedicineApp clinically reviewed/),
  ).toBeTruthy();
  expect(submit).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText('Medication name'),
    '  Synthetic Medicine  ',
  );
  await enterInventory(screen);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Synthetic Medicine' }),
    ),
  );
  expect(screen.getByText(/form is ready for another medicine/)).toBeTruthy();
  expect(screen.getByLabelText('Medication name').props.value).toBe('');
  expect(screen.getByLabelText('Strength (optional)').props.value).toBe('');
  expect(screen.getByLabelText('Dosage form (optional)').props.value).toBe('');
  expect(screen.getByLabelText('Notes (optional)').props.value).toBe('');
  expect(screen.getByRole('alert')).toBeTruthy();
});

test('manual form sanitizes submission failures', async () => {
  const submit = jest
    .fn()
    .mockRejectedValue(new Error('private failure detail'));
  const screen = await render(
    form({
      initial: {
        name: 'Synthetic Medicine',
        strength: '5 mg',
        dosageForm: 'Tablet',
        notes: 'Synthetic note',
      },
      submit,
      onCamera: jest.fn(),
    }),
  );
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '20');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(submit).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByText(/The medicine could not be recorded/)).toBeTruthy(),
  );
  expect(screen.toJSON()).not.toContain('private failure detail');
  expect(screen.getByLabelText('Medication name').props.value).toBe(
    'Synthetic Medicine',
  );
  expect(screen.getByLabelText('Strength (optional)').props.value).toBe('5 mg');
  expect(screen.getByLabelText('Notes (optional)').props.value).toBe(
    'Synthetic note',
  );
});

test('manual form prevents accidental duplicate resubmission after success', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    form({
      initial: { name: 'Synthetic Medicine' },
      submit,
      onCamera: jest.fn(),
    }),
  );
  await enterInventory(screen);
  const save = screen.getByRole('button', {
    name: 'Save user-entered medicine',
  });
  await fireEvent.press(save);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(submit).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByLabelText('Medication name').props.value).toBe(''),
  );
});

test('requires user-entered decimal quantity and a bounded editable unit', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    form({
      initial: { name: 'Synthetic', dosageForm: 'Tablet' },
      submit,
      onCamera: jest.fn(),
    }),
  );
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('');
  expect(
    screen.getByRole('button', { name: 'Quantity Unit: Tablets' }),
  ).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '0');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(screen.getByText(/greater than zero/)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Current Quantity'),
    '10.5000',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Quantity Unit: Tablets' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Capsules' }));
  await fireEvent.changeText(
    screen.getByLabelText('Dosage form (optional)'),
    'Patch',
  );
  expect(
    screen.getByRole('button', { name: 'Quantity Unit: Capsules' }),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      initialQuantity: '10.5000',
      quantityUnit: 'capsule',
      source: 'manual',
    }),
  );
});

test('OCR-assisted details require user quantity and preserve capture provenance', async () => {
  const submit = jest.fn().mockResolvedValue({
    ...saved,
    source: 'ocr_assisted',
    medicineCaptureId: 'capture-1',
  });
  const cleared = jest.fn();
  const screen = await render(
    form({
      initial: {
        name: 'Reviewed Medicine',
        strength: '650 mg',
        dosageForm: 'Tablet',
        activeIngredient: 'Reviewed ingredient',
        manufacturer: 'Reviewed manufacturer',
      },
      source: 'ocr_assisted',
      medicineCaptureId: 'capture-1',
      submit,
      onSaved: cleared,
      onCamera: jest.fn(),
    }),
  );
  expect(screen.getByDisplayValue('Reviewed Medicine')).toBeTruthy();
  expect(screen.getByDisplayValue('650 mg')).toBeTruthy();
  expect(screen.getByDisplayValue('Tablet')).toBeTruthy();
  expect(screen.getByDisplayValue('Reviewed ingredient')).toBeTruthy();
  expect(screen.getByDisplayValue('Reviewed manufacturer')).toBeTruthy();
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('');
  expect(
    screen.getByRole('button', { name: 'Quantity Unit: Tablets' }),
  ).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '7');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      source: 'ocr_assisted',
      medicineCaptureId: 'capture-1',
      initialQuantity: '7',
    }),
  );
  await waitFor(() => expect(cleared).toHaveBeenCalledTimes(1));
});

test('failed OCR-assisted persistence retains fields, quantity, and context', async () => {
  const submit = jest.fn().mockRejectedValue(new Error('private'));
  const cleared = jest.fn();
  const screen = await render(
    form({
      initial: { name: 'Reviewed Medicine', dosageForm: 'Capsule' },
      source: 'ocr_assisted',
      medicineCaptureId: 'capture-2',
      submit,
      onSaved: cleared,
      onCamera: jest.fn(),
    }),
  );
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '12.5');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  await waitFor(() =>
    expect(screen.getByText(/could not be recorded/)).toBeTruthy(),
  );
  expect(cleared).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('Reviewed Medicine')).toBeTruthy();
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('12.5');
});
