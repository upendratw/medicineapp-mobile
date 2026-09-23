import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  AppAlert,
  AppHeader,
  AppScreen,
  EditMedicationForm,
  LoadingIndicator,
} from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useTranslation } from '@/localization';
import { patientMedicationService } from '@/services/registry';

export default function EditMedicineScreen() {
  const { medicationId } = useLocalSearchParams<{ medicationId?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const load = useCallback(() => {
    if (!medicationId) return Promise.reject(new Error('Missing medication'));
    return patientMedicationService.get(medicationId);
  }, [medicationId]);
  const state = useAsyncResource(load);
  return (
    <AppScreen>
      <AppHeader
        title={t('editMedicine')}
        subtitle="Update user-entered details and current medicine on hand."
      />
      {state.loading ? <LoadingIndicator label="Loading medicine" /> : null}
      {state.error ? (
        <AppAlert tone="error" message="The medicine could not be loaded." />
      ) : null}
      {state.data && medicationId ? (
        <EditMedicationForm
          medication={state.data}
          submit={(input) =>
            patientMedicationService.update(medicationId, input)
          }
          onSaved={() => router.replace('/medicines')}
        />
      ) : null}
    </AppScreen>
  );
}
