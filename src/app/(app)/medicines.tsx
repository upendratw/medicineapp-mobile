import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { useTranslation } from '@/localization';
import { AppHeader, AppScreen, MedicineList } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { patientMedicationService, scheduleService } from '@/services/registry';

export default function MedicinesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const load = useCallback(async () => {
    const medicines = await patientMedicationService.list();
    try {
      return {
        medicines,
        schedules: await scheduleService.list(),
        scheduleError: false,
      };
    } catch {
      return { medicines, schedules: [], scheduleError: true };
    }
  }, []);
  const state = useAsyncResource(load);
  const refresh = state.refresh;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const confirmDelete = (id: string) =>
    Alert.alert(t('deleteMedicineTitle'), t('deleteMedicineMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteMedicine'),
        style: 'destructive',
        onPress: () =>
          void patientMedicationService
            .remove(id)
            .then(() => state.refresh())
            .catch(() => Alert.alert(t('error'), t('deleteMedicineError'))),
      },
    ]);
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
        medicines={state.data?.medicines ?? []}
        schedules={state.data?.schedules ?? []}
        scheduleError={state.data?.scheduleError}
        loading={state.loading && state.data == null}
        error={state.error}
        onRefresh={state.refresh}
        onAdd={() => router.push('/add-medicine')}
        onAddSchedule={(medication) =>
          router.push({
            pathname: '/schedule',
            params: {
              patientMedicationId: medication.id,
              medicineName: medication.canonicalName,
              inventoryUnit: medication.quantityUnit ?? undefined,
            },
          })
        }
        onEditSchedule={(medication, scheduleId) =>
          router.push({
            pathname: '/schedule',
            params: {
              patientMedicationId: medication.id,
              medicineName: medication.canonicalName,
              inventoryUnit: medication.quantityUnit ?? undefined,
              scheduleId,
            },
          })
        }
        onEdit={(id) =>
          router.push({
            pathname: '/edit-medicine',
            params: { medicationId: id },
          })
        }
        onDelete={confirmDelete}
      />
    </AppScreen>
  );
}
