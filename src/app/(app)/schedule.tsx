import { useLocalSearchParams } from 'expo-router';
import { AppAlert, AppHeader, AppScreen, ScheduleForm } from '@/components';
import { scheduleService } from '@/services/registry';

export default function ScheduleScreen() {
  const { medicationId } = useLocalSearchParams<{ medicationId?: string }>();
  const id = typeof medicationId === 'string' ? medicationId : '';
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  return (
    <AppScreen>
      <AppHeader
        title="Medication schedule"
        subtitle="Record the timing you or an authorized caregiver intends to follow."
      />
      {id ? (
        <ScheduleForm
          medicationId={id}
          timezone={timezone}
          submit={(input) => scheduleService.create(input)}
        />
      ) : (
        <AppAlert message="Select a medication before creating a schedule. Only stable medication identifiers may be passed to this screen." />
      )}
    </AppScreen>
  );
}
