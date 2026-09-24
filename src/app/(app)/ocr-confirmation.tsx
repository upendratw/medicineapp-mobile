import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  AppAlert,
  AppHeader,
  AppScreen,
  OcrConfirmationForm,
  OcrOutcomePanel,
} from '@/components';
import {
  ocrService,
  patientMedicationService,
  scheduleService,
} from '@/services/registry';
import { useCapture } from '@/state/CaptureContext';

export default function OcrConfirmationScreen() {
  const router = useRouter();
  const { recognitionResult, clear } = useCapture();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  if (recognitionResult?.kind === 'review_ready') {
    return (
      <AppScreen>
        <AppHeader
          title="Review medicine"
          subtitle="Please check what we read before continuing."
        />
        <OcrConfirmationForm
          extracted={recognitionResult.extractedMedicine}
          captureId={recognitionResult.captureId}
          confirmCapture={(medicine) =>
            ocrService.confirmReview!(recognitionResult.captureId, medicine)
          }
          createMedication={(input) => patientMedicationService.create(input)}
          createSchedule={(input) => scheduleService.create(input)}
          onSaved={() => {
            clear();
            router.replace('/medicines');
          }}
          onRetake={async () => {
            await ocrService.cancel?.(recognitionResult.captureId);
            clear();
            router.replace('/medicine-camera');
          }}
        />
      </AppScreen>
    );
  }
  if (recognitionResult) {
    const run = async (
      operation: () => Promise<void>,
      destination:
        | '/medicine-camera'
        | '/add-medicine'
        | '/medicine-camera?choose=gallery',
    ) => {
      if (working) return;
      setWorking(true);
      setError('');
      try {
        await operation();
        clear();
        router.replace(destination);
      } catch {
        setError(
          'The recognition choice could not be saved. Please try again.',
        );
      } finally {
        setWorking(false);
      }
    };
    const explicitlyCancel = () =>
      run(
        async () => ocrService.cancel?.(recognitionResult.captureId),
        '/medicine-camera',
      );
    return (
      <AppScreen>
        <AppHeader
          title="Recognition result"
          subtitle="Nothing becomes medication information without your review."
        />
        {error ? <AppAlert tone="error" message={error} /> : null}
        <OcrOutcomePanel
          result={recognitionResult}
          working={working}
          onRetake={explicitlyCancel}
          onChooseAnother={() =>
            run(async () => {
              await ocrService.cancel?.(recognitionResult.captureId);
            }, '/medicine-camera?choose=gallery')
          }
          onManual={() =>
            run(async () => {
              if (
                recognitionResult.kind !== 'failed_safe' &&
                recognitionResult.kind !== 'expired'
              )
                await ocrService.decideOutcome?.(
                  recognitionResult.captureId,
                  'none_of_these',
                );
            }, '/add-medicine')
          }
          onCancel={explicitlyCancel}
        />
      </AppScreen>
    );
  }
  return (
    <AppScreen>
      <AppAlert tone="error" message="Recognition result is unavailable." />
    </AppScreen>
  );
}
