import { fireEvent, render } from '@testing-library/react-native';
import { InventoryRefill } from '@/components';

const record = {
  medicationId: 'med-id',
  medicationName: 'Synthetic Medicine',
  quantity: 20,
  quantityUnit: 'tablets',
  refillStatus: 'user recorded',
  refillReminderEnabled: null,
};
test('renders quantity and updates bounded manual quantity without guessing supply', async () => {
  const update = jest.fn().mockResolvedValue(undefined);
  const screen = await render(
    <InventoryRefill
      record={record}
      loading={false}
      pending={false}
      error={false}
      onUpdate={update}
      onReminder={jest.fn()}
    />,
  );
  expect(screen.getByText(/Current quantity: 20 tablets/)).toBeTruthy();
  expect(screen.getByText(/No supply estimate is shown/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('New quantity'), '15');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Update quantity' }),
  );
  expect(update).toHaveBeenCalledWith(15);
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /you should reduce your dose|skip doses to extend|refill is approved/i,
  );
});
test('supports loading, empty, pending, failure, and unsupported reminder states', async () => {
  const base = {
    record: null,
    loading: false,
    pending: false,
    error: false,
    onUpdate: jest.fn(),
    onReminder: jest.fn(),
  };
  const loading = await render(<InventoryRefill {...base} loading />);
  expect(loading.getByLabelText('Loading inventory')).toBeTruthy();
  await loading.unmount();
  const empty = await render(<InventoryRefill {...base} />);
  expect(empty.getByText('No inventory record')).toBeTruthy();
  await empty.unmount();
  const pending = await render(<InventoryRefill {...base} pending />);
  expect(pending.getByText(/not yet available/)).toBeTruthy();
  await pending.unmount();
  const failed = await render(<InventoryRefill {...base} error />);
  expect(failed.getByText(/temporarily unavailable/)).toBeTruthy();
  await failed.unmount();
  const rendered = await render(<InventoryRefill {...base} record={record} />);
  expect(rendered.getByText(/preferences are not supported/)).toBeTruthy();
});
