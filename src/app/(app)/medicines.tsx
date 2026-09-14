import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { AppHeader, AppScreen, MedicineList } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { patientMedicationService } from '@/services/registry';

export default function MedicinesScreen() {
  const router = useRouter();
  const load = useCallback(() => patientMedicationService.list(), []);
  const state = useAsyncResource(load);
  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={state.loading}
          onRefresh={state.refresh}
          accessibilityLabel="Refresh medicines"
        />
      }
    >
      <AppHeader
        title="My medicines"
        subtitle="User-entered records remain distinct from clinically reviewed catalog information."
      />
      <MedicineList
        medicines={state.data ?? []}
        loading={state.loading && state.data == null}
        error={state.error}
        onRefresh={state.refresh}
        onAdd={() => router.push('/add-medicine')}
        onSchedule={(medicationId) =>
          router.push({ pathname: '/schedule', params: { medicationId } })
        }
      />
    </AppScreen>
  );
}
