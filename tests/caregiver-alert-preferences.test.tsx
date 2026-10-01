import { fireEvent, render } from '@testing-library/react-native';
import {
  CaregiverAlertPreferences,
  validateCaregiverAlertPreference,
} from '@/components/CaregiverAlertPreferences';
import type { CaregiverAlertPreference } from '@/services/caregiverAlertPreferenceService';
import { PreferencesProvider } from '@/state/PreferencesContext';
import { translate } from '@/localization';

const value: CaregiverAlertPreference = {
  configured: false,
  relationshipId: 'relationship-id',
  alertsEnabled: true,
  enabledAlertTypes: ['medication_missed'],
  minimumSeverity: 'attention',
  quietHoursEnabled: false,
  quietHoursStartLocal: '',
  quietHoursEndLocal: '',
  timezone: 'Asia/Kolkata',
  escalationEnabled: false,
  escalationDelayMinutes: 30,
  revision: null,
};

const renderView = async (overrides = {}) => {
  const props = {
    value,
    saving: false,
    saved: false,
    failure: null,
    onSave: jest.fn(),
    onRefresh: jest.fn(),
    ...overrides,
  };
  return {
    props,
    screen: await render(
      <PreferencesProvider>
        <CaregiverAlertPreferences {...props} />
      </PreferencesProvider>,
    ),
  };
};

test('renders an accessible absent-preference draft and saves only after tap', async () => {
  const { screen, props } = await renderView();
  expect(screen.getByText(/No preferences have been saved/)).toBeTruthy();
  expect(props.onSave).not.toHaveBeenCalled();
  await fireEvent(
    screen.getByRole('switch', { name: 'Receive alerts' }),
    'valueChange',
    false,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Medication inventory is low' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Important only' }));
  await fireEvent(
    screen.getByRole('switch', { name: 'Escalation alerts' }),
    'valueChange',
    true,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Save alert preferences' }),
  );
  expect(props.onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      alertsEnabled: false,
      enabledAlertTypes: ['medication_missed', 'inventory_low'],
      minimumSeverity: 'important',
      escalationEnabled: true,
      revision: null,
    }),
  );
});

test('validates quiet hours locally and supports overnight ranges', () => {
  expect(
    validateCaregiverAlertPreference({
      ...value,
      quietHoursEnabled: true,
      quietHoursStartLocal: '22:00',
      quietHoursEndLocal: '07:00',
    }),
  ).toBeNull();
  expect(
    validateCaregiverAlertPreference({
      ...value,
      quietHoursEnabled: true,
      quietHoursStartLocal: '22:00',
      quietHoursEndLocal: '22:00',
    }),
  ).toBe('caregiverPreferencesQuietHoursSame');
});

test('prevents duplicate save while loading and exposes conflict recovery', async () => {
  const refresh = jest.fn();
  const { screen } = await renderView({
    saving: true,
    failure: 'conflict',
    onRefresh: refresh,
  });
  expect(
    screen.getByLabelText('Save alert preferences').props.accessibilityState,
  ).toMatchObject({ disabled: true, busy: true });
  await fireEvent.press(
    screen.getByRole('button', { name: 'Refresh alert preferences' }),
  );
  expect(refresh).toHaveBeenCalledTimes(1);
});

test('ships English and Hindi preference labels', () => {
  expect(translate('en-IN', 'caregiverPreferencesTitle')).toBe(
    'Caregiver alert preferences',
  );
  expect(translate('hi-IN', 'caregiverPreferencesTitle')).toBe(
    'देखभालकर्ता अलर्ट प्राथमिकताएँ',
  );
  expect(translate('hi-IN', 'caregiverAlertType_medication_missed')).toBe(
    'दवा छूटी हुई दर्ज की गई',
  );
});
