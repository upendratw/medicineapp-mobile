import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ManualMedicationForm } from '@/components';
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

test('manual form validates required bounded input and never implies approval', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ManualMedicationForm submit={submit} onCamera={jest.fn()} />,
  );
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
  expect(
    screen.getByText(
      'Success: User-entered medicine recorded for this development session.',
    ),
  ).toBeTruthy();
});

test('manual form sanitizes submission failures', async () => {
  const submit = jest
    .fn()
    .mockRejectedValue(new Error('private failure detail'));
  const screen = await render(
    <ManualMedicationForm
      initial={{ name: 'Synthetic Medicine' }}
      submit={submit}
      onCamera={jest.fn()}
    />,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save user-entered medicine' }),
  );
  expect(submit).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.getByText(/The medicine could not be recorded/)).toBeTruthy(),
  );
  expect(screen.toJSON()).not.toContain('private failure detail');
});
