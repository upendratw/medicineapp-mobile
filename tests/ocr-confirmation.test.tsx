import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { OcrConfirmationForm } from '@/components';

const extracted = {
  medicineName: 'Dolo 650',
  strength: '650 mg',
  dosageForm: 'Tablet',
  activeIngredient: 'Paracetamol',
  manufacturer: 'Micro Labs Limited',
};
const saved = {
  id: 'patient-medication-1',
  name: 'Dolo 650',
  strength: '650 mg',
  dosageForm: 'Tablet',
  activeIngredient: 'Paracetamol',
  manufacturer: 'Micro Labs Limited',
  notes: null,
  source: 'ocr_assisted' as const,
  medicineCaptureId: 'capture-1',
  isActive: true,
  inventory: {
    id: 'inventory-1',
    initialQuantity: '7.0000',
    remainingQuantity: '7.0000',
    quantityUnit: 'tablet' as const,
    lowStockThreshold: null,
    revision: 1,
  },
};
const savedSchedule = {
  id: 'schedule-1',
  medicationId: saved.id,
  patientMedicationId: saved.id,
  status: 'active' as const,
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-24',
  endDate: null,
  times: ['08:00'],
  doseQuantity: '1',
  doseUnit: 'tablet',
  instructions: null,
  revision: 1,
};

const setup = (
  overrides: Partial<React.ComponentProps<typeof OcrConfirmationForm>> = {},
) => {
  const props = {
    extracted,
    captureId: 'capture-1',
    confirmCapture: jest.fn().mockResolvedValue(undefined),
    createMedication: jest.fn().mockResolvedValue(saved),
    onSaved: jest.fn(),
    onRetake: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { props, screen: render(<OcrConfirmationForm {...props} />) };
};

test('shows one editable review with empty user quantity and adds in sequence', async () => {
  const { props, screen: pending } = setup();
  const screen = await pending;
  expect(screen.getByDisplayValue('Dolo 650')).toBeTruthy();
  expect(screen.getByDisplayValue('650 mg')).toBeTruthy();
  expect(screen.getByDisplayValue('Tablet')).toBeTruthy();
  expect(screen.getByDisplayValue('Paracetamol')).toBeTruthy();
  expect(screen.getByDisplayValue('Micro Labs Limited')).toBeTruthy();
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('');
  expect(
    screen.getByRole('button', { name: 'Quantity Unit: Tablets' }),
  ).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Medicine Name'),
    'Corrected Dolo',
  );
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '7');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
  expect(props.confirmCapture).toHaveBeenCalledWith(
    expect.objectContaining({ medicineName: 'Corrected Dolo' }),
  );
  expect(props.createMedication).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Corrected Dolo',
      initialQuantity: '7',
      quantityUnit: 'tablet',
      source: 'ocr_assisted',
      medicineCaptureId: 'capture-1',
    }),
  );
  expect(
    (props.confirmCapture as jest.Mock).mock.invocationCallOrder[0],
  ).toBeLessThan(
    (props.createMedication as jest.Mock).mock.invocationCallOrder[0],
  );
});

test('requires quantity and keeps retake explicit before confirmation', async () => {
  const { props, screen: pending } = setup();
  const screen = await pending;
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  expect(screen.getByText(/Enter the current quantity/)).toBeTruthy();
  expect(props.confirmCapture).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retake' }));
  expect(props.onRetake).toHaveBeenCalledTimes(1);
});

test('confirmation failure never creates a patient medication', async () => {
  const confirmCapture = jest.fn().mockRejectedValue(new Error('private'));
  const { props, screen: pending } = setup({ confirmCapture });
  const screen = await pending;
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '7');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  await waitFor(() =>
    expect(screen.getByText(/could not be added/)).toBeTruthy(),
  );
  expect(props.createMedication).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('7');
});

test('creation failure preserves state and retry skips reconfirm with same key', async () => {
  const createMedication = jest
    .fn()
    .mockRejectedValueOnce(new Error('private'))
    .mockResolvedValueOnce(saved);
  const { props, screen: pending } = setup({ createMedication });
  const screen = await pending;
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '7');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  await waitFor(() =>
    expect(screen.getByText(/details are confirmed/)).toBeTruthy(),
  );
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('7');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
  expect(props.confirmCapture).toHaveBeenCalledTimes(1);
  expect(props.createMedication).toHaveBeenCalledTimes(2);
  expect(
    (props.createMedication as jest.Mock).mock.calls[0][0].idempotencyKey,
  ).toBe((props.createMedication as jest.Mock).mock.calls[1][0].idempotencyKey);
});

test('OCR review creates a linked schedule only after confirmation and medicine creation', async () => {
  const createSchedule = jest.fn().mockResolvedValue(savedSchedule);
  const { props, screen: pending } = setup({ createSchedule });
  const screen = await pending;
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '7');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Set medicine schedule' }),
  );
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '1');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
  expect(createSchedule).toHaveBeenCalledWith(
    expect.objectContaining({
      patient_medication_id: saved.id,
      dose_quantity: '1',
      dose_unit: 'tablet',
    }),
  );
  expect(
    (props.confirmCapture as jest.Mock).mock.invocationCallOrder[0],
  ).toBeLessThan(
    (props.createMedication as jest.Mock).mock.invocationCallOrder[0],
  );
  expect(
    (props.createMedication as jest.Mock).mock.invocationCallOrder[0],
  ).toBeLessThan(createSchedule.mock.invocationCallOrder[0]);
});

test('OCR schedule retry does not reconfirm capture or recreate medicine', async () => {
  const createSchedule = jest
    .fn()
    .mockRejectedValueOnce(new Error('private'))
    .mockResolvedValueOnce(savedSchedule);
  const { props, screen: pending } = setup({ createSchedule });
  const screen = await pending;
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '7');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Set medicine schedule' }),
  );
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '1');
  await fireEvent.press(screen.getByRole('button', { name: 'Add Medicine' }));
  await waitFor(() =>
    expect(screen.getByText(/Medicine added, but the schedule/)).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Retry Schedule' }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
  expect(props.confirmCapture).toHaveBeenCalledTimes(1);
  expect(props.createMedication).toHaveBeenCalledTimes(1);
  expect(createSchedule).toHaveBeenCalledTimes(2);
});
