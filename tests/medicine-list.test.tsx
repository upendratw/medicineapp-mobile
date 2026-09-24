import { fireEvent, render } from '@testing-library/react-native';
import { MedicineList } from '@/components';
import type { MedicationSummary } from '@/types/medication';
import type { MedicationSchedule } from '@/types/schedule';

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
const linkedSchedule: MedicationSchedule = {
  id: 'schedule-id',
  medicationId: medicine.id,
  patientMedicationId: medicine.id,
  status: 'active',
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-24',
  endDate: null,
  times: ['08:00', '20:00'],
  doseQuantity: '1.0000',
  doseUnit: 'tablet',
  instructions: null,
  revision: 1,
};

test('medicine list renders review status and supports refresh, add, and schedule actions', async () => {
  const refresh = jest.fn();
  const add = jest.fn();
  const addSchedule = jest.fn();
  const editSchedule = jest.fn();
  const edit = jest.fn();
  const remove = jest.fn();
  const screen = await render(
    <MedicineList
      medicines={[medicine]}
      loading={false}
      error={false}
      onRefresh={refresh}
      onAdd={add}
      schedules={[]}
      onAddSchedule={addSchedule}
      onEditSchedule={editSchedule}
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
      name: 'Add Schedule for Synthetic Test Medicine',
    }),
  );
  expect(refresh).toHaveBeenCalled();
  expect(add).toHaveBeenCalled();
  expect(addSchedule).toHaveBeenCalledWith(medicine);
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
      onAddSchedule={jest.fn()}
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
      onAddSchedule={jest.fn()}
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
      onAddSchedule={jest.fn()}
    />,
  );
  expect(
    failed.getByText(/Medicines are temporarily unavailable/),
  ).toBeTruthy();
});

test('shows linked schedule evidence and edits the existing schedule', async () => {
  const editSchedule = jest.fn();
  const screen = await render(
    <MedicineList
      medicines={[medicine]}
      schedules={[linkedSchedule]}
      loading={false}
      error={false}
      onRefresh={jest.fn()}
      onAdd={jest.fn()}
      onAddSchedule={jest.fn()}
      onEditSchedule={editSchedule}
    />,
  );
  expect(screen.getByText('1 tablet')).toBeTruthy();
  expect(screen.getByText('08:00 • 20:00')).toBeTruthy();
  expect(screen.queryByText('No schedule')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Edit Schedule for Synthetic Test Medicine',
    }),
  );
  expect(editSchedule).toHaveBeenCalledWith(medicine, 'schedule-id');
});

test('keeps medicines visible when schedule loading fails', async () => {
  const screen = await render(
    <MedicineList
      medicines={[medicine]}
      schedules={[]}
      scheduleError
      loading={false}
      error={false}
      onRefresh={jest.fn()}
      onAdd={jest.fn()}
    />,
  );
  expect(screen.getByText('Synthetic Test Medicine')).toBeTruthy();
  expect(
    screen.getByText(/Schedule information is temporarily unavailable/),
  ).toBeTruthy();
});
