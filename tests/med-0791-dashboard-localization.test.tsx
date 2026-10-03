import type { ComponentProps } from 'react';
import { render } from '@testing-library/react-native';

import { CaregiverDashboard, PatientDashboard } from '@/components';
import { translate } from '@/localization';
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

const patientDashboard: PatientDashboardData = {
  medicines: [],
  schedules: [],
  todayScheduled: 0,
  recentlyTaken: null,
  integrationPending: false,
};

const caregiverPatient = {
  patientUserId: 'synthetic-patient-id',
  displayName: 'Family member',
  relationshipId: 'synthetic-relationship-id',
  statusText: 'Caregiver access active',
  alertPreferencesAvailable: false,
};

const authoredText = '  Exact CASE! परीक्षण  ';

const caregiverProps: ComponentProps<typeof CaregiverDashboard> = {
  patients: [caregiverPatient],
  selected: caregiverPatient.patientUserId,
  data: {
    patientName: caregiverPatient.displayName,
    timezone: 'Asia/Kolkata',
    scheduled: null,
    taken: null,
    missed: null,
    adherencePercentage: null,
    recentActivity: [],
    reportedSymptoms: [
      {
        id: 'synthetic-symptom-id',
        symptomText: authoredText,
        sourceType: 'PATIENT_REPORTED',
        reportedAt: '2026-10-03T11:56:20Z',
      },
    ],
  },
  loading: false,
  error: null,
  onSelect: jest.fn(),
  onRetry: jest.fn(),
  onBack: jest.fn(),
};

beforeEach(() => {
  mockLanguage = 'en-IN';
});

test('Patient dashboard symptom navigation context uses English and Hindi i18n', async () => {
  mockLanguage = 'en-IN';
  const english = await render(
    <PatientDashboard
      data={patientDashboard}
      loading={false}
      error={false}
      onNavigate={jest.fn()}
      onRetry={jest.fn()}
    />,
  );
  expect(english.getByText('Quick actions')).toBeTruthy();
  expect(translate('en-IN', 'symptomInformation')).toBe('Symptom information');
  await english.unmount();

  mockLanguage = 'hi-IN';
  const hindi = await render(
    <PatientDashboard
      data={patientDashboard}
      loading={false}
      error={false}
      onNavigate={jest.fn()}
      onRetry={jest.fn()}
    />,
  );
  expect(hindi.getByText('त्वरित कार्य')).toBeTruthy();
  expect(translate('hi-IN', 'symptomInformation')).toBe('लक्षण संबंधी जानकारी');
});

test('Caregiver symptom context localizes without translating authored text', async () => {
  mockLanguage = 'en-IN';
  const english = await render(<CaregiverDashboard {...caregiverProps} />);
  expect(english.getAllByText('Family member')).toHaveLength(2);
  expect(english.getByText('Recent reported symptoms')).toBeTruthy();
  expect(english.getByText(`Patient reported: ${authoredText}`)).toBeTruthy();
  await english.unmount();

  mockLanguage = 'hi-IN';
  const hindi = await render(<CaregiverDashboard {...caregiverProps} />);
  expect(hindi.getByText('परिवार सदस्य')).toBeTruthy();
  expect(hindi.getByText('हाल में बताए गए लक्षण')).toBeTruthy();
  expect(hindi.getByText(`मरीज़ ने बताया: ${authoredText}`)).toBeTruthy();
  expect(hindi.getByText(/Exact CASE! परीक्षण/).props.children).toContain(
    authoredText,
  );
});

test('Caregiver selection and empty states use bounded dashboard translations', async () => {
  mockLanguage = 'hi-IN';
  const selection = await render(
    <CaregiverDashboard {...caregiverProps} selected={null} data={null} />,
  );
  expect(selection.getByText('परिवार सदस्य चुनें')).toBeTruthy();
  expect(
    selection.getByText('बैकएंड से केवल अधिकृत जानकारी का अनुरोध किया जाएगा।'),
  ).toBeTruthy();
  await selection.unmount();

  const empty = await render(
    <CaregiverDashboard
      {...caregiverProps}
      patients={[]}
      selected={null}
      data={null}
    />,
  );
  expect(empty.getByText('कोई अधिकृत परिवार सदस्य नहीं')).toBeTruthy();
});

test('Caregiver dashboard route header uses the localization contract', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      process.cwd(),
      'src/app/(app)/caregiver-dashboard.tsx',
    ),
    'utf8',
  );
  expect(source).toContain("title={t('caregiverDashboardTitle')}");
  expect(source).toContain("subtitle={t('caregiverDashboardSubtitle')}");
});
