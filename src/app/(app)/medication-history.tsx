import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { AppHeader, AppScreen, MedicationHistory } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { medicationHistoryService } from '@/services/registry';

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
export default function MedicationHistoryScreen() {
  const params = useLocalSearchParams<{
    medicationId?: string;
    patientUserId?: string;
  }>();
  const medicationId =
    typeof params.medicationId === 'string' ? params.medicationId : undefined;
  const patientUserId =
    typeof params.patientUserId === 'string' ? params.patientUserId : undefined;
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const load = useCallback(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return medicationHistoryService.list({
      startDate: dateOnly(start),
      endDate: dateOnly(end),
      timezone,
      medicationId,
      patientUserId,
      limit: 50,
    });
  }, [medicationId, patientUserId, timezone]);
  const state = useAsyncResource(load);
  return (
    <AppScreen>
      <AppHeader
        title="Medication history"
        subtitle="Your recorded intake events for the last 30 days."
      />
      <MedicationHistory
        items={state.data?.items ?? []}
        loading={state.loading}
        error={state.error}
        onRefresh={state.refresh}
      />
    </AppScreen>
  );
}
