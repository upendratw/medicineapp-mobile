import { useRouter } from 'expo-router';
import { AppHeader, AppScreen, ManualMedicationForm } from '@/components';
import { patientMedicationService, scheduleService } from '@/services/registry';
import { useCapture } from '@/state/CaptureContext';
export default function AddMedicineScreen() {
  const router = useRouter();
  const { candidate, reviewedMedicine, recognitionResult, clear } =
    useCapture();
  return (
    <AppScreen>
      <AppHeader
        title="Add medicine manually"
        subtitle="Copy details from the medicine label or packaging."
      />
      <ManualMedicationForm
        initial={
          reviewedMedicine
            ? {
                name: reviewedMedicine.medicineName,
                strength: reviewedMedicine.strength,
                dosageForm: reviewedMedicine.dosageForm,
                activeIngredient: reviewedMedicine.activeIngredient,
                manufacturer: reviewedMedicine.manufacturer,
              }
            : candidate
              ? {
                  name: candidate.name,
                  strength: candidate.strength,
                  dosageForm: candidate.dosageForm,
                }
              : undefined
        }
        submit={(input) => patientMedicationService.create(input)}
        createSchedule={(input) => scheduleService.create(input)}
        source={reviewedMedicine ? 'ocr_assisted' : 'manual'}
        medicineCaptureId={
          reviewedMedicine && recognitionResult?.kind === 'review_ready'
            ? recognitionResult.captureId
            : undefined
        }
        onSaved={() => {
          clear();
          router.replace('/medicines');
        }}
        onCamera={() => router.push('/medicine-camera')}
      />
    </AppScreen>
  );
}
