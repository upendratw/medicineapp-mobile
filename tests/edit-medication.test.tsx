import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { EditMedicationForm } from '@/components/EditMedicationForm';
import { PreferencesProvider } from '@/state/PreferencesContext';
import type { PatientMedication } from '@/types/medication';

const medication: PatientMedication = {
  id: 'pm-1',
  name: 'Synthetic Medicine',
  strength: '5 mg',
  dosageForm: 'Tablet',
  activeIngredient: 'Synthetic ingredient',
  manufacturer: null,
  notes: null,
  source: 'ocr_assisted',
  medicineCaptureId: 'capture-1',
  isActive: true,
  inventory: {
    id: 'inv-1',
    initialQuantity: '10.0000',
    remainingQuantity: '10.0000',
    quantityUnit: 'tablet',
    lowStockThreshold: null,
    revision: 3,
  },
};

test('edit form normalizes current quantity, preserves provenance, and prevents duplicate submission', async () => {
  let release!: () => void;
  const submit = jest.fn(
    () =>
      new Promise<PatientMedication>((resolve) => {
        release = () => resolve(medication);
      }),
  );
  const saved = jest.fn();
  const screen = await render(
    <PreferencesProvider>
      <EditMedicationForm
        medication={medication}
        submit={submit}
        onSaved={saved}
      />
    </PreferencesProvider>,
  );
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('10');
  expect(screen.queryByText('capture-1')).toBeNull();
  expect(screen.queryByLabelText('Initial Quantity')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '8.5');
  fireEvent.press(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save Changes' }).props
        .accessibilityState.busy,
    ).toBe(true),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Save Changes' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ remainingQuantity: '8.5', revision: 3 }),
  );
  await act(async () => release());
  await waitFor(() => expect(saved).toHaveBeenCalled());
});

test('edit failure preserves entered values and permits zero remaining stock', async () => {
  const submit = jest.fn().mockRejectedValue(new Error('sensitive detail'));
  const screen = await render(
    <PreferencesProvider>
      <EditMedicationForm
        medication={medication}
        submit={submit}
        onSaved={jest.fn()}
      />
    </PreferencesProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText('Current Quantity'), '0');
  await fireEvent.press(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() =>
    expect(screen.getByText(/could not be updated/)).toBeTruthy(),
  );
  expect(screen.getByLabelText('Current Quantity').props.value).toBe('0');
  expect(screen.toJSON()).not.toContain('sensitive detail');
});
