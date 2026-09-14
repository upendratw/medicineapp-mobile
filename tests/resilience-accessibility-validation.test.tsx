import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  AppButton,
  AppText,
  MedicationCard,
  ReminderAlert,
  SafetyConfirmation,
  SymptomAssessment,
} from '@/components';
import { CaptureProvider, useCapture } from '@/state/CaptureContext';
import { PreferencesProvider } from '@/state/PreferencesContext';

function CaptureProbe() {
  const capture = useCapture();
  return (
    <>
      <AppText>{capture.imageUri ?? 'no transient image'}</AppText>
      <AppButton
        label="Set transient image"
        onPress={() => capture.setImage('memory://synthetic')}
      />
    </>
  );
}

test('process-style provider recreation drops transient OCR image state', async () => {
  const first = await render(
    <CaptureProvider>
      <CaptureProbe />
    </CaptureProvider>,
  );
  await fireEvent.press(
    first.getByRole('button', { name: 'Set transient image' }),
  );
  expect(first.getByText('memory://synthetic')).toBeTruthy();
  await first.unmount();
  const restored = await render(
    <CaptureProvider>
      <CaptureProbe />
    </CaptureProvider>,
  );
  expect(restored.getByText('no transient image')).toBeTruthy();
});

test('symptom state safely resets after component recreation', async () => {
  const first = await render(<SymptomAssessment submit={jest.fn()} />);
  await fireEvent.changeText(first.getByLabelText('Symptom'), 'Synthetic text');
  await first.unmount();
  const restored = await render(<SymptomAssessment submit={jest.fn()} />);
  expect(restored.getByLabelText('Symptom').props.value).toBe('');
});

test('extra-large mode preserves critical labels, wrapping, and enlarged controls', async () => {
  jest.mocked(AsyncStorage).getItem.mockResolvedValueOnce(
    JSON.stringify({
      language: 'en-IN',
      accessibility: { textSize: 'extra-large', largerControls: true },
    }),
  );
  const screen = await render(
    <PreferencesProvider>
      <MedicationCard
        medication={{
          id: 'synthetic-id',
          canonicalName:
            'Synthetic medicine with a deliberately long accessible display name',
          strength: null,
          dosageForm: null,
          scheduleSummary: null,
          reviewStatus: 'approved',
          isActive: true,
          source: 'backend_catalog',
        }}
      />
      <SafetyConfirmation
        action="Confirm safety-sensitive action"
        target="Synthetic target"
        consequence="Nothing happens until confirmation."
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    </PreferencesProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText(/deliberately long/).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 30 })]),
    ),
  );
  expect(
    screen.getByRole('button', { name: 'Confirm action' }).props.style,
  ).toEqual(
    expect.arrayContaining([expect.objectContaining({ minHeight: 60 })]),
  );
});

test('reminder actions and grouped medication state expose explicit TalkBack semantics', async () => {
  const screen = await render(
    <ReminderAlert
      reminder={{
        reminderId: 'reminder',
        medicationId: 'synthetic-medication',
        medicationName: 'Synthetic Medicine',
        scheduledFor: '2026-09-14T10:00:00Z',
        statusText: 'Due',
        instructions: null,
        scheduleRevision: 1,
      }}
      loading={false}
      unavailable={false}
      onAcknowledge={jest.fn()}
      onSnooze={jest.fn()}
    />,
  );
  expect(
    screen.getByRole('button', { name: 'Mark this dose as taken' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Remind me in 10 minutes' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Record as skipped' }),
  ).toBeTruthy();
  expect(screen.getByLabelText('Synthetic Medicine. Due')).toBeTruthy();
});

test('warning state is announced and never relies on color alone', async () => {
  const screen = await render(
    <ReminderAlert
      reminder={null}
      loading={false}
      unavailable
      onAcknowledge={jest.fn()}
      onSnooze={jest.fn()}
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    /No medication action was recorded/,
  );
});
