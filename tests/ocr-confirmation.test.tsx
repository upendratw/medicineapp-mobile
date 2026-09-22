import { fireEvent, render } from '@testing-library/react-native';
import { OcrConfirmationForm } from '@/components';

const extracted = {
  medicineName: 'Dolo 650',
  strength: '650 mg',
  dosageForm: 'Tablet',
  activeIngredient: 'Paracetamol',
  manufacturer: 'Micro Labs Limited',
};

test('structured OCR fields remain editable and require explicit confirmation', async () => {
  const confirm = jest.fn();
  const retake = jest.fn();
  const screen = await render(
    <OcrConfirmationForm
      extracted={extracted}
      onConfirm={confirm}
      onRetake={retake}
    />,
  );
  expect(screen.getByText(/Please check and correct it/)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Medicine Name'),
    'Corrected Dolo',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Active Ingredient'),
    'Corrected Ingredient',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Confirm Medicine' }),
  );
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      medicineName: 'Corrected Dolo',
      activeIngredient: 'Corrected Ingredient',
    }),
  );
});

test('medicine name is required and retake remains explicit', async () => {
  const confirm = jest.fn();
  const retake = jest.fn();
  const screen = await render(
    <OcrConfirmationForm
      extracted={extracted}
      onConfirm={confirm}
      onRetake={retake}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Medicine Name'), ' ');
  expect(
    screen.getByRole('button', { name: 'Confirm Medicine' }).props
      .accessibilityState.disabled,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Retake' }));
  expect(retake).toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});
