import { fireEvent, render } from '@testing-library/react-native';
import { EmergencyHelp, SymptomAssessment, VoiceControls } from '@/components';
import {
  PendingSymptomAssessmentService,
  VoiceCommandResolver,
} from '@/services/highRiskServices';
test('symptoms remain self-reported, local, and pending without diagnosis', async () => {
  const screen = await render(
    <SymptomAssessment
      submit={(x) => new PendingSymptomAssessmentService().assess(x)}
    />,
  );
  expect(screen.getByText('Severity — self-reported only')).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText('Symptom'),
    'Synthetic symptom',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Mild — user-selected' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Submit for validated assessment' }),
  );
  expect(screen.getByText(/No diagnosis or triage decision/)).toBeTruthy();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(
    /you are safe|not serious|do not need a doctor|wait and see/i,
  );
});

test('only a supplied reviewed backend result can render escalation', async () => {
  const screen = await render(
    <SymptomAssessment
      submit={jest.fn().mockResolvedValue({
        informationalGuidance: 'Reviewed informational guidance.',
        escalationRequired: true,
        emergency: true,
        reviewed: true,
      })}
    />,
  );
  await fireEvent.changeText(
    screen.getByLabelText('Symptom'),
    'Synthetic symptom',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Severe — user-selected' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Submit for validated assessment' }),
  );
  expect(
    screen.getByText(/validated service recommends seeking urgent human help/),
  ).toBeTruthy();
  expect(screen.getByText(/Reviewed informational guidance/)).toBeTruthy();
  expect(screen.getByText(/have not been contacted/)).toBeTruthy();
});

test('symptom submission requires an explicit self-reported severity', async () => {
  const submit = jest.fn();
  const screen = await render(<SymptomAssessment submit={submit} />);
  await fireEvent.changeText(
    screen.getByLabelText('Symptom'),
    'Synthetic symptom',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Submit for validated assessment' }),
  );
  expect(submit).not.toHaveBeenCalled();
});
test('SOS requires confirmation and cancel never calls device', async () => {
  const call = jest.fn();
  const contacts = [
    {
      id: 'id',
      name: 'Trusted contact',
      phone: '+910000000000',
      relationship: 'Family',
    },
  ];
  const screen = await render(
    <EmergencyHelp
      contacts={contacts}
      loading={false}
      error={false}
      onCall={call}
    />,
  );
  expect(call).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Call Trusted contact' }),
  );
  expect(screen.getByText(/call is not placed automatically/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel action' }));
  expect(call).not.toHaveBeenCalled();
});

test('SOS invokes the mock device abstraction only after confirmation', async () => {
  const call = jest.fn().mockResolvedValue(undefined);
  const contacts = [
    {
      id: 'id',
      name: 'Trusted contact',
      phone: '+910000000000',
      relationship: 'Family',
    },
  ];
  const screen = await render(
    <EmergencyHelp
      contacts={contacts}
      loading={false}
      error={false}
      onCall={call}
    />,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Call Trusted contact' }),
  );
  expect(call).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm action' }));
  expect(call).toHaveBeenCalledWith('+910000000000');
  expect(
    screen.getByText(/has not confirmed that a call was placed/),
  ).toBeTruthy();
});

test('SOS reports dialer failure without claiming contact', async () => {
  const call = jest.fn().mockRejectedValue(new Error('synthetic failure'));
  const contacts = [
    {
      id: 'id',
      name: 'Trusted contact',
      phone: '+910000000000',
      relationship: 'Family',
    },
  ];
  const screen = await render(
    <EmergencyHelp
      contacts={contacts}
      loading={false}
      error={false}
      onCall={call}
    />,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Call Trusted contact' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm action' }));
  expect(screen.getByText(/phone dialer could not be opened/i)).toBeTruthy();
  expect(screen.queryByText(/dialer was opened/i)).toBeNull();
});
test('voice navigation is deterministic and sensitive actions require confirmation or block', async () => {
  const resolver = new VoiceCommandResolver();
  expect(resolver.resolve('open medicine list')).toEqual({
    kind: 'NAVIGATE',
    route: '/medicines',
  });
  expect(resolver.resolve('stop my medicine').kind).toBe('BLOCKED_CLINICAL');
  expect(resolver.resolve('double my next dose').kind).toBe('BLOCKED_CLINICAL');
  expect(resolver.resolve('mark evening medicine taken').kind).toBe(
    'CONFIRM_REQUIRED',
  );
  expect(resolver.resolve('I feel dizzy').kind).toBe('UNKNOWN');
  const nav = jest.fn();
  const screen = await render(
    <VoiceControls
      resolve={(x) => resolver.resolve(x)}
      navigate={nav}
      simulationEnabled
    />,
  );
  await fireEvent.changeText(
    screen.getByLabelText('Development transcription preview'),
    'call emergency services',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Review voice command' }),
  );
  expect(nav).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Confirm action' })).toBeTruthy();
});

test('typed voice simulation is unavailable outside developer diagnostics', async () => {
  const screen = await render(
    <VoiceControls
      resolve={jest.fn()}
      navigate={jest.fn()}
      simulationEnabled={false}
    />,
  );
  expect(screen.getByText(/Voice recognition is not available/)).toBeTruthy();
  expect(
    screen.queryByLabelText('Development transcription preview'),
  ).toBeNull();
});

test('real SOS backend integration is read-only emergency contacts', async () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      process.cwd(),
      'src/services/highRiskServices.ts',
    ),
    'utf8',
  );
  expect(source).toContain('/api/v1/patients/me/emergency-contacts');
  expect(source).not.toMatch(
    /caregiver.*\/api|dispatch.*\/api|symptom.*\/api|voice.*\/api/i,
  );
});
test('high-risk source has no persistence, logging, location, SMS, Gemini, or fabricated clinical API', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/services/highRiskServices.ts'),
    'utf8',
  );
  expect(source).not.toMatch(
    /AsyncStorage|console\.|Location|sendSMS|Gemini|symptom.*\/api/i,
  );
});
