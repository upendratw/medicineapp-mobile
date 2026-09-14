import { fireEvent, render } from '@testing-library/react-native';

import { AppButton, AppTextInput } from '@/components';

test('button exposes an accessible label and invokes its action', async () => {
  const action = jest.fn();
  const screen = await render(
    <AppButton label="Continue safely" onPress={action} />,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Continue safely' }));
  expect(action).toHaveBeenCalledTimes(1);
});

test('loading button is busy, disabled, and cannot submit repeatedly', async () => {
  const action = jest.fn();
  const screen = await render(
    <AppButton label="Verify" loading onPress={action} />,
  );
  const button = screen.getByRole('button', { name: 'Verify' });
  expect(button.props.accessibilityState).toEqual({
    disabled: true,
    busy: true,
  });
  fireEvent.press(button);
  expect(action).not.toHaveBeenCalled();
});

test('text input exposes its error as an alert and accessibility hint', async () => {
  const screen = await render(
    <AppTextInput label="Mobile number" error="Enter a valid number" />,
  );
  expect(screen.getByLabelText('Mobile number').props.accessibilityHint).toBe(
    'Enter a valid number',
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid number');
});
