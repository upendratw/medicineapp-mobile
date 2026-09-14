import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import {
  AppButton,
  AppHeader,
  AppScreen,
  PatientDashboard,
} from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { dashboardService } from '@/services/registry';
import { useTranslation } from '@/localization';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const load = useCallback(() => dashboardService.load(), []);
  const state = useAsyncResource(load);
  return (
    <AppScreen>
      <AppHeader
        title={t('dashboardTitle')}
        subtitle={t('dashboardSubtitle')}
      />
      <PatientDashboard
        data={state.data}
        loading={state.loading}
        error={state.error}
        onRetry={state.refresh}
        onNavigate={(route) => router.push(route)}
      />
      <AppButton
        variant="secondary"
        label={t('accessibility')}
        onPress={() => router.push('/accessibility-settings')}
      />
      <AppButton
        variant="secondary"
        label={t('language')}
        onPress={() => router.push('/language-settings')}
      />
      <AppButton
        variant="secondary"
        label={t('notificationSettings')}
        onPress={() => router.push('/notification-settings')}
      />
      <AppButton
        variant="secondary"
        label={t('symptomInformation')}
        onPress={() => router.push('/symptoms')}
      />
      <AppButton
        variant="secondary"
        label={t('emergencyHelp')}
        onPress={() => router.push('/sos')}
      />
      <AppButton
        variant="secondary"
        label={t('voiceControls')}
        onPress={() => router.push('/voice')}
      />
      <AppButton
        variant="secondary"
        label={t('interactions')}
        onPress={() => router.push('/interactions')}
      />
      <AppButton
        variant="secondary"
        label={t('scanPrescription')}
        onPress={() => router.push('/prescription-scan')}
      />
      <AppButton
        variant="secondary"
        label={t('inventoryRefill')}
        onPress={() => router.push('/inventory')}
      />
      <AppButton
        variant="secondary"
        label={t('medicationHistory')}
        onPress={() => router.push('/medication-history')}
      />
      <AppButton
        variant="secondary"
        label={t('caregiverDashboard')}
        onPress={() => router.push('/caregiver-dashboard')}
      />
    </AppScreen>
  );
}
