import { AppHeader, AppScreen, SymptomAssessment } from '@/components';
import { symptomAssessmentService } from '@/services/registry';
export default function Symptoms() {
  return (
    <AppScreen>
      <AppHeader
        title="Symptom information"
        subtitle="Describe symptoms without local diagnosis or triage."
      />
      <SymptomAssessment
        submit={(input) => symptomAssessmentService.assess(input)}
      />
    </AppScreen>
  );
}
