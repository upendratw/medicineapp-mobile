import { useRouter } from 'expo-router';
import { AppHeader, AppScreen, OcrConfirmationForm } from '@/components';
import { ocrService } from '@/services/registry';
import { isUneditedPresentedCandidate } from '@/services/ocrService';
import { useCapture } from '@/state/CaptureContext';
export default function OcrConfirmationScreen() {
  const router = useRouter();
  const { candidate, clear, setCandidate } = useCapture();
  return (
    <AppScreen>
      <AppHeader
        title="Confirm recognition"
        subtitle="Nothing becomes medication truth until you review and confirm it."
      />
      <OcrConfirmationForm
        candidate={candidate}
        onConfirm={async (value) => {
          const edited =
            !candidate || !isUneditedPresentedCandidate(candidate, value);
          await ocrService.decide?.(
            value,
            edited ? 'none_of_these' : 'confirm',
          );
          setCandidate(value);
          router.push('/add-medicine');
        }}
        onReject={async () => {
          if (candidate) await ocrService.decide?.(candidate, 'reject');
          clear();
          router.replace('/medicine-camera');
        }}
        onNone={async () => {
          if (candidate) await ocrService.decide?.(candidate, 'none_of_these');
          clear();
          router.replace('/add-medicine');
        }}
        onRetry={async () => {
          if (candidate) await ocrService.decide?.(candidate, 'reject');
          clear();
          router.replace('/medicine-camera');
        }}
        onManual={async () => {
          if (candidate) await ocrService.decide?.(candidate, 'none_of_these');
          clear();
          router.replace('/add-medicine');
        }}
      />
    </AppScreen>
  );
}
