import { useRouter } from 'expo-router';
import { AppHeader, AppScreen, OcrConfirmationForm } from '@/components';
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
        onConfirm={(value) => {
          setCandidate(value);
          router.push('/add-medicine');
        }}
        onReject={() => {
          setCandidate(null);
        }}
        onRetry={() => {
          clear();
          router.replace('/medicine-camera');
        }}
        onManual={() => {
          clear();
          router.replace('/add-medicine');
        }}
      />
    </AppScreen>
  );
}
