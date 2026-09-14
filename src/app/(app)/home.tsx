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

export default function HomeScreen() {
  const router = useRouter();
  const load = useCallback(() => dashboardService.load(), []);
  const state = useAsyncResource(load);
  return (
    <AppScreen>
      <AppHeader
        title="Your dashboard"
        subtitle="Medication routines at a glance."
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
        label="Interaction information"
        onPress={() => router.push('/interactions')}
      />
      <AppButton
        variant="secondary"
        label="Scan prescription"
        onPress={() => router.push('/prescription-scan')}
      />
      <AppButton
        variant="secondary"
        label="Inventory and refill"
        onPress={() => router.push('/inventory')}
      />
      <AppButton
        variant="secondary"
        label="View medication history"
        onPress={() => router.push('/medication-history')}
      />
      <AppButton
        variant="secondary"
        label="Open caregiver dashboard"
        onPress={() => router.push('/caregiver-dashboard')}
      />
    </AppScreen>
  );
}
