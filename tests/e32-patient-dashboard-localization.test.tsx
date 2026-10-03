import { fireEvent, render } from '@testing-library/react-native';

import { PatientDashboard } from '@/components';
import type { AppLanguage } from '@/state/PreferencesContext';
import type { PatientDashboardData } from '@/types/dashboard';

let mockLanguage: AppLanguage = 'en-IN';

jest.mock('@/state/PreferencesContext', () => ({
  usePreferences: () => ({
    language: mockLanguage,
    accessibility: {
      textSize: 'default',
      highContrast: false,
      reducedMotion: false,
      largerControls: false,
      screenReaderHelp: false,
      reminderEmphasis: false,
      haptics: false,
    },
  }),
}));

const authoredMedicineName = 'Patient Entered MIXED Case दवा';
const dashboard: PatientDashboardData = Object.freeze({
  medicines: Object.freeze([
    Object.freeze({
      id: 'synthetic-medication-id',
      canonicalName: authoredMedicineName,
      dosageForm: null,
      strength: null,
      scheduleSummary: null,
      reviewStatus: 'user_entered_unreviewed' as const,
      isActive: true,
      source: 'user_entered' as const,
    }),
  ]),
  schedules: Object.freeze([]),
  todayScheduled: 0,
  recentlyTaken: null,
  integrationPending: false,
});

const englishLabels = [
  'View medicines',
  'Add medicine',
  'View schedule',
  'Medication information',
] as const;

const hindiLabels = [
  'दवाइयाँ देखें',
  'दवा जोड़ें',
  'समय-सारणी देखें',
  'दवा संबंधी जानकारी',
] as const;

beforeEach(() => {
  mockLanguage = 'en-IN';
});

test('localizes all Patient dashboard medication actions and accessibility labels', async () => {
  const navigate = jest.fn();
  const view = await render(
    <PatientDashboard
      data={dashboard}
      loading={false}
      error={false}
      onNavigate={navigate}
      onRetry={jest.fn()}
    />,
  );

  for (const label of englishLabels) {
    expect(view.getByRole('button', { name: label })).toBeTruthy();
  }

  mockLanguage = 'hi-IN';
  await view.rerender(
    <PatientDashboard
      data={dashboard}
      loading={false}
      error={false}
      onNavigate={navigate}
      onRetry={jest.fn()}
    />,
  );

  for (const label of hindiLabels) {
    expect(view.getByRole('button', { name: label })).toBeTruthy();
  }
  for (const label of englishLabels) {
    expect(view.queryByRole('button', { name: label })).toBeNull();
  }

  await fireEvent.press(view.getByRole('button', { name: 'दवाइयाँ देखें' }));
  await fireEvent.press(view.getByRole('button', { name: 'दवा जोड़ें' }));
  await fireEvent.press(view.getByRole('button', { name: 'समय-सारणी देखें' }));
  await fireEvent.press(
    view.getByRole('button', { name: 'दवा संबंधी जानकारी' }),
  );

  expect(navigate.mock.calls.flat()).toEqual([
    '/medicines',
    '/add-medicine',
    '/schedule',
    '/medication-information',
  ]);
  expect(dashboard.medicines[0]?.canonicalName).toBe(authoredMedicineName);
});

test('Patient dashboard no longer contains the four hard-coded English labels', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      process.cwd(),
      'src/components/PatientDashboard.tsx',
    ),
    'utf8',
  );

  for (const label of englishLabels) {
    expect(source).not.toContain(`label="${label}"`);
  }
});
