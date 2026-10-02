import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { PatientSymptomReport } from '@/components/PatientSymptomReport';
import { translate } from '@/localization';
import { BackendPatientSymptomService } from '@/services/patientSymptomService';
import { PreferencesProvider } from '@/state/PreferencesContext';
import type { ApiClient } from '@/api/client';

function view(report = jest.fn().mockResolvedValue({})) {
  return {
    report,
    element: (
      <PreferencesProvider>
        <PatientSymptomReport service={{ report }} />
      </PreferencesProvider>
    ),
  };
}

test('submits the exact multiline Patient text without trimming or rewriting', async () => {
  const submitted = '  MiXeD misspeling 🙂\nदूसरी पंक्ति  ';
  const subject = view();
  const screen = await render(subject.element);
  const input = screen.getByLabelText('Symptom report');

  await fireEvent.changeText(input, submitted);
  expect(input.props.multiline).toBe(true);
  expect(input.props.maxLength).toBe(500);
  expect(input.props.autoCorrect).toBe(false);
  expect(input.props.autoCapitalize).toBe('none');
  await fireEvent.press(screen.getByRole('button', { name: 'Report symptom' }));

  await waitFor(() => expect(subject.report).toHaveBeenCalledWith(submitted));
  await waitFor(() =>
    expect(JSON.stringify(screen.toJSON())).toContain(
      'Your symptom report was saved.',
    ),
  );
});

test('whitespace-only text remains local and is not submitted', async () => {
  const subject = view();
  const screen = await render(subject.element);
  await fireEvent.changeText(screen.getByLabelText('Symptom report'), ' \n ');
  await fireEvent.press(screen.getByRole('button', { name: 'Report symptom' }));
  expect(subject.report).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Error: Enter a symptom report before continuing.',
  );
});

test('backend service sends only the exact Patient text', async () => {
  const request = jest.fn().mockResolvedValue({
    id: 'opaque-event',
    source_type: 'PATIENT_REPORTED',
    reported_at: '2026-10-02T00:00:00Z',
  });
  const service = new BackendPatientSymptomService({
    request,
  } as unknown as ApiClient);
  const exact = '  exact\ntext  ';
  await service.report(exact);
  expect(request).toHaveBeenCalledWith(
    '/api/v1/patients/me/symptom-events',
    { method: 'POST', body: JSON.stringify({ symptom_text: exact }) },
    true,
  );
});

test('Patient reporting and caregiver permission copy are localized in Hindi', () => {
  expect(translate('hi-IN', 'symptomReportAction')).toBe('लक्षण बताएं');
  expect(translate('hi-IN', 'familyPermissionSymptoms')).toBe(
    'मेरे बताए लक्षण देखें',
  );
  expect(translate('hi-IN', 'caregiverReportedSymptomsTitle')).toBe(
    'हाल में बताए गए लक्षण',
  );
});
