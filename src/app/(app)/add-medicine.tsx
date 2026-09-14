import { useRouter } from 'expo-router';
import { AppHeader, AppScreen, ManualMedicationForm } from '@/components';
import { patientMedicationService } from '@/services/registry';
import { useCapture } from '@/state/CaptureContext';
export default function AddMedicineScreen() {
  const router = useRouter();
  const { candidate, clear } = useCapture();
  return (
    <AppScreen>
      <AppHeader
        title="Add medicine manually"
        subtitle="Copy details from the medicine label or packaging."
      />
      <ManualMedicationForm
        initial={
          candidate
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
