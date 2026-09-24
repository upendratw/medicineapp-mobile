import { fireEvent, render } from '@testing-library/react-native';
import { ScheduleForm } from '@/components';
import type { MedicationSchedule } from '@/types/schedule';

const saved: MedicationSchedule = {
  id: 'schedule-id',
  medicationId: 'medicine-id',
  status: 'active',
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-14',
  endDate: null,
  times: ['08:00', '20:00'],
  doseQuantity: '1',
  doseUnit: 'tablet',
  instructions: null,
  revision: 1,
};

test('creates a timezone-aware schedule with multiple daily times', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      inventoryUnit="tablet"
      timezone="Asia/Kolkata"
      submit={submit}
    />,
  );
  const reminderSwitch = screen.getByRole('switch', {
    name: 'Schedule reminders',
  });
  expect(reminderSwitch.props.accessibilityState).toMatchObject({
    checked: true,
    disabled: false,
  });
  await fireEvent.changeText(screen.getByLabelText('Start Date'), '2026-09-14');
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '1');
  await fireEvent.changeText(
    screen.getByLabelText('Daily times'),
    '20:00, 08:00',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Create schedule' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      patient_medication_id: 'medicine-id',
      timezone: 'Asia/Kolkata',
      activate: true,
      rules: [expect.objectContaining({ times_of_day: ['08:00', '20:00'] })],
    }),
  );
  expect(
    screen.getByText(/does not recommend medication timing or dosage/),
  ).toBeTruthy();
});

test('explicitly switching reminders off creates a draft schedule payload', async () => {
  const submit = jest.fn().mockResolvedValue({ ...saved, status: 'draft' });
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      inventoryUnit="tablet"
      timezone="Asia/Kolkata"
      submit={submit}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '1');
  await fireEvent(
    screen.getByRole('switch', { name: 'Schedule reminders' }),
    'valueChange',
    false,
  );
  expect(screen.getByText('Schedule reminders: Off')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Create schedule' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ activate: false }),
  );
});

test('submits explicit dose evidence for linked inventory consumption', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="patient-medication-id"
      timezone="Asia/Kolkata"
      inventoryUnit="tablet"
      submit={submit}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '0.5');
  await fireEvent.changeText(screen.getByLabelText('Dose Unit'), 'tablet');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Create schedule' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      patient_medication_id: 'patient-medication-id',
      dose_quantity: '0.5',
      dose_unit: 'tablet',
    }),
  );
});

test('edit mode uses existing values and an explicit update action', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      initial={saved}
      timezone="Asia/Kolkata"
      inventoryUnit="tablet"
      submit={submit}
    />,
  );
  expect(screen.getByDisplayValue('08:00, 20:00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Update schedule' })).toBeTruthy();
  expect(
    screen.getByRole('switch', { name: 'Schedule reminders' }).props
      .accessibilityState,
  ).toMatchObject({ checked: true, disabled: true });
});

test('editing a draft represents reminders as off without reactivating it', async () => {
  const draftSchedule = { ...saved, status: 'draft' as const };
  const submit = jest.fn().mockResolvedValue(draftSchedule);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      initial={draftSchedule}
      timezone="Asia/Kolkata"
      inventoryUnit="tablet"
      submit={submit}
    />,
  );
  expect(
    screen.getByRole('switch', { name: 'Schedule reminders' }).props
      .accessibilityState,
  ).toMatchObject({ checked: false, disabled: true });
  await fireEvent.press(
    screen.getByRole('button', { name: 'Update schedule' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ activate: false }),
  );
});

test('does not submit an invalid date range or duplicate times', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      timezone="Asia/Kolkata"
      inventoryUnit="tablet"
      submit={submit}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '1');
  await fireEvent.changeText(screen.getByLabelText('Start Date'), '2026-09-15');
  await fireEvent.changeText(
    screen.getByLabelText('End Date (optional — until stopped)'),
    '2026-09-14',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Daily times'),
    '08:00, 08:00',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Create schedule' }),
  );
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByText(/End date cannot be before start date/)).toBeTruthy();
});

test('blocks a dose unit that does not match known inventory units', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      timezone="Asia/Kolkata"
      inventoryUnit="tablet"
      submit={submit}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Dose Quantity'), '1');
  await fireEvent.changeText(screen.getByLabelText('Dose Unit'), 'ml');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Create schedule' }),
  );
  expect(submit).not.toHaveBeenCalled();
  expect(
    screen.getByText(/must match the inventory unit: tablet/),
  ).toBeTruthy();
});
