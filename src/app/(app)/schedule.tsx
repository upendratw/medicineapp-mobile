import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AppAlert,
  AppHeader,
  AppScreen,
  LoadingIndicator,
  ScheduleForm,
} from '@/components';
import { scheduleService } from '@/services/registry';
import type { InventoryQuantityUnit } from '@/types/medication';
import type { MedicationSchedule } from '@/types/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const { patientMedicationId, medicineName, inventoryUnit, scheduleId } =
    useLocalSearchParams<{
      patientMedicationId?: string;
      medicineName?: string;
      inventoryUnit?: InventoryQuantityUnit;
      scheduleId?: string;
    }>();
  const id = typeof patientMedicationId === 'string' ? patientMedicationId : '';
  const editingId = typeof scheduleId === 'string' ? scheduleId : '';
  const [initial, setInitial] = useState<MedicationSchedule | undefined>();
  const [loading, setLoading] = useState(Boolean(editingId));
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!editingId) return;
    let active = true;
    scheduleService
      .get(editingId)
      .then((value) => active && setInitial(value))
      .catch(() => active && setLoadError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [editingId]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return (
    <AppScreen>
      <AppHeader
        title={`${editingId ? 'Edit' : 'Schedule'} ${medicineName || 'medicine'}`}
        subtitle="Record the timing you or an authorized caregiver intends to follow."
      />
      {!id ? (
        <AppAlert message="Select a medication before creating a schedule. Only stable medication identifiers may be passed to this screen." />
      ) : loading ? (
        <LoadingIndicator label="Loading schedule" />
      ) : loadError ? (
        <AppAlert tone="error" message="The schedule could not be loaded." />
      ) : (
        <ScheduleForm
          medicationId={id}
          initial={initial}
          timezone={timezone}
          inventoryUnit={inventoryUnit}
          submit={(input) =>
            editingId
              ? scheduleService.update(editingId, input)
              : scheduleService.create(input)
          }
          onSaved={() => router.replace('/medicines')}
        />
      )}
    </AppScreen>
  );
}
