import { fireEvent, render } from '@testing-library/react-native';
import { MedicationHistory } from '@/components';

const items = [
  {
    id: '2',
    medicationId: 'med-2',
    medicationName: null,
    outcome: 'skipped' as const,
    statusText: 'Reported skipped',
    eventTime: '2026-09-14T10:00:00Z',
    recordedAt: null,
    scheduledTime: null,
  },
  {
    id: '1',
    medicationId: 'med-1',
    medicationName: 'Synthetic Medicine',
    outcome: 'taken' as const,
    statusText: 'Reported taken',
    eventTime: '2026-09-13T10:00:00Z',
    recordedAt: '2026-09-13T10:01:00Z',
    scheduledTime: null,
  },
];

test('renders factual chronological history and refresh', async () => {
  const refresh = jest.fn();
  const screen = await render(
    <MedicationHistory
      items={items}
      loading={false}
      error={false}
      onRefresh={refresh}
    />,
  );
  expect(screen.getByText('Medication name unavailable')).toBeTruthy();
  expect(screen.getByText('Reported taken')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Refresh history' }),
  );
  expect(refresh).toHaveBeenCalled();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /treatment is failing|increase dose|ineffective/i,
  );
});

test('history exposes empty, loading, and failure states', async () => {
  const empty = await render(
    <MedicationHistory
      items={[]}
      loading={false}
      error={false}
      onRefresh={jest.fn()}
    />,
  );
  expect(empty.getByText('No medication history')).toBeTruthy();
  await empty.unmount();
  const loading = await render(
    <MedicationHistory
      items={[]}
      loading
      error={false}
      onRefresh={jest.fn()}
    />,
  );
  expect(loading.getByLabelText('Loading medication history')).toBeTruthy();
  await loading.unmount();
  const failed = await render(
    <MedicationHistory
      items={[]}
      loading={false}
      error
      onRefresh={jest.fn()}
    />,
  );
  expect(failed.getByText(/temporarily unavailable/)).toBeTruthy();
});
