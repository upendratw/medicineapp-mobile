import { AppHeader, AppScreen, PatientSymptomReport } from '@/components';
import { useTranslation } from '@/localization';
import { patientSymptomService } from '@/services/registry';
export default function Symptoms() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppHeader
        title={t('symptomReportTitle')}
        subtitle={t('symptomReportSubtitle')}
      />
      <PatientSymptomReport service={patientSymptomService} />
    </AppScreen>
  );
}
