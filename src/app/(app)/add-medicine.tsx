import { useRouter } from 'expo-router';
import { AppHeader, AppScreen, ManualMedicationForm } from '@/components';
import { patientMedicationService } from '@/services/registry';
import { useCapture } from '@/state/CaptureContext';
export default function AddMedicineScreen() {
  const router = useRouter();
  const { candidate, reviewedMedicine, clear } = useCapture();
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
        onSaved={clear}
        onCamera={() => router.push('/medicine-camera')}
      />
    </AppScreen>
  );
}
