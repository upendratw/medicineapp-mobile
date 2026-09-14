import { render } from '@testing-library/react-native';
import { InteractionWarnings } from '@/components';

const warning = {
  id: 'warning-id',
  medicationIds: ['a', 'b'],
  medicationPair: 'Synthetic A + Synthetic B',
  severity: 'serious',
  summary: 'Backend-provided validated summary.',
  source: 'Approved source',
  validatedStatus: 'reviewed',
  updatedAt: '2026-09-14T00:00:00Z',
};
const view = (overrides = {}) => (
  <InteractionWarnings
    warnings={[]}
    loading={false}
    pending={false}
    error={false}
    forbidden={false}
    {...overrides}
  />
);

test('renders backend-validated warning with textual severity and source', async () => {
  const screen = await render(view({ warnings: [warning] }));
  expect(screen.getByText('Severity: serious')).toBeTruthy();
  expect(screen.getByLabelText(/Severity: serious/)).toBeTruthy();
  expect(screen.getByText(/Backend-provided validated summary/)).toBeTruthy();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /stop taking|switch to|lower the dose/i,
  );
});
test('supports loading, no-result, pending, unavailable, and forbidden states', async () => {
  const loading = await render(view({ loading: true }));
  expect(loading.getByLabelText(/Loading validated/)).toBeTruthy();
  await loading.unmount();
  const none = await render(view());
  expect(none.getByText('No validated interaction result')).toBeTruthy();
  await none.unmount();
  const pending = await render(view({ pending: true }));
  expect(pending.getByText(/not yet available/)).toBeTruthy();
  await pending.unmount();
  const failed = await render(view({ error: true }));
  expect(failed.getByText(/temporarily unavailable/)).toBeTruthy();
  await failed.unmount();
  const forbidden = await render(view({ forbidden: true }));
  expect(forbidden.getByText(/not authorized/)).toBeTruthy();
});
