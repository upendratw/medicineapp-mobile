import { fireEvent, render } from '@testing-library/react-native';
import { MedicineList } from '@/components';
import type { MedicationSummary } from '@/types/medication';

const medicine: MedicationSummary = {
  id: 'stable-med-id',
  canonicalName: 'Synthetic Test Medicine',
  dosageForm: 'Tablet',
  strength: '10 mg',
  scheduleSummary: '08:00',
  reviewStatus: 'user_entered_unreviewed',
  isActive: true,
  source: 'user_entered',
  remainingQuantity: '20.0000',
  quantityUnit: 'tablet',
};

test('medicine list renders review status and supports refresh, add, and schedule actions', async () => {
  const refresh = jest.fn();
  const add = jest.fn();
  const schedule = jest.fn();
  const edit = jest.fn();
  const remove = jest.fn();
  const screen = await render(
    <MedicineList
      medicines={[medicine]}
      loading={false}
      error={false}
      onRefresh={refresh}
      onAdd={add}
      onSchedule={schedule}
      onEdit={edit}
      onDelete={remove}
    />,
  );
  expect(
    screen.getByLabelText(/User-entered; not clinically reviewed/),
  ).toBeTruthy();
  expect(screen.getByText('20 Tablets remaining')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Refresh medicines' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Edit Synthetic Test Medicine' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Delete Synthetic Test Medicine' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Add medicine' }));
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Create schedule for Synthetic Test Medicine',
    }),
  );
  expect(refresh).toHaveBeenCalled();
  expect(add).toHaveBeenCalled();
  expect(schedule).toHaveBeenCalledWith('stable-med-id');
  expect(edit).toHaveBeenCalledWith('stable-med-id');
  expect(remove).toHaveBeenCalledWith('stable-med-id');
});

test('medicine list has loading, empty, and safe error states', async () => {
  const loading = await render(
    <MedicineList
      medicines={[]}
      loading
      error={false}
      onRefresh={jest.fn()}
      onAdd={jest.fn()}
      onSchedule={jest.fn()}
    />,
  );
  expect(loading.getByLabelText('Loading medicines')).toBeTruthy();
  await loading.unmount();
  const empty = await render(
    <MedicineList
      medicines={[]}
      loading={false}
      error={false}
      onRefresh={jest.fn()}
      onAdd={jest.fn()}
      onSchedule={jest.fn()}
    />,
  );
  expect(empty.getByText('No medicines recorded')).toBeTruthy();
  await empty.unmount();
  const failed = await render(
    <MedicineList
      medicines={[]}
      loading={false}
      error
      onRefresh={jest.fn()}
      onAdd={jest.fn()}
      onSchedule={jest.fn()}
    />,
  );
  expect(
    failed.getByText(/Medicines are temporarily unavailable/),
  ).toBeTruthy();
});
