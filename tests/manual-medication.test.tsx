import type { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ManualMedicationForm } from '@/components';
import { PreferencesProvider } from '@/state/PreferencesContext';
import type { MedicationSummary } from '@/types/medication';

const saved: MedicationSummary = {
  id: 'local-1',
  canonicalName: 'Synthetic Medicine',
  dosageForm: 'Tablet',
  strength: '5 mg',
  scheduleSummary: null,
  reviewStatus: 'user_entered_unreviewed',
  isActive: true,
  source: 'user_entered',
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
