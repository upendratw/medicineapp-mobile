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
  revision: 1,
};

test('creates a timezone-aware schedule with multiple daily times', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      timezone="Asia/Kolkata"
      submit={submit}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Start date'), '2026-09-14');
  await fireEvent.changeText(
    screen.getByLabelText('Daily times'),
    '20:00, 08:00',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save as draft' }));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Create schedule' }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      medication_id: 'medicine-id',
      timezone: 'Asia/Kolkata',
      activate: true,
      rules: [expect.objectContaining({ times_of_day: ['08:00', '20:00'] })],
    }),
  );
  expect(
    screen.getByText(/does not recommend medication timing or dosage/),
  ).toBeTruthy();
});

test('edit mode uses existing values and an explicit update action', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      initial={saved}
      timezone="Asia/Kolkata"
      submit={submit}
    />,
  );
  expect(screen.getByDisplayValue('08:00, 20:00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Update schedule' })).toBeTruthy();
});

test('does not submit an invalid date range or duplicate times', async () => {
  const submit = jest.fn().mockResolvedValue(saved);
  const screen = await render(
    <ScheduleForm
      medicationId="medicine-id"
      timezone="Asia/Kolkata"
      submit={submit}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Start date'), '2026-09-15');
  await fireEvent.changeText(
    screen.getByLabelText('End date (optional)'),
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
