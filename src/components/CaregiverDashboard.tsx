import {
  AppAlert,
  AppButton,
  AppText,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import { StatusCard } from '@/components/StatusCard';
import type {
  CaregiverDashboardData,
  CaregiverPatient,
} from '@/types/dashboard';

type Props = {
  patients: readonly CaregiverPatient[];
  selected: string | null;
  data: CaregiverDashboardData | null;
  loading: boolean;
  error: boolean;
  onSelect(id: string): void;
  onRetry(): void;
};
export function CaregiverDashboard({
  patients,
  selected,
  data,
  loading,
  error,
  onSelect,
  onRetry,
}: Props) {
  if (loading)
    return <LoadingIndicator label="Loading authorized caregiver view" />;
  if (error)
    return (
      <>
        <AppAlert
          tone="error"
          message="Caregiver information is temporarily unavailable."
        />
        <AppButton label="Try again" onPress={onRetry} />
      </>
    );
  if (!patients.length)
    return (
      <EmptyState
        title="No authorized family members"
        message="An active, consent-based caregiver relationship is required."
      />
    );
  return (
    <>
      <AppText variant="heading">Family member</AppText>
      {patients.map((patient) => (
        <AppButton
          key={patient.patientUserId}
          variant={selected === patient.patientUserId ? 'primary' : 'secondary'}
          label={patient.displayName}
          onPress={() => onSelect(patient.patientUserId)}
        />
      ))}
      {!data ? (
        <EmptyState
          title="Choose a family member"
          message="Only authorized information will be requested from the backend."
        />
      ) : (
        <>
          <StatusCard
            label="Medication schedule"
            value={
              data.scheduled == null ? 'Unavailable' : String(data.scheduled)
            }
            statusText="Scheduled today"
          />
          <StatusCard
            label="Adherence"
            value={
              data.adherencePercentage == null
                ? 'Insufficient data'
                : `${data.adherencePercentage}%`
            }
            statusText="Engineering adherence summary"
          />
          <StatusCard
            label="Missed-dose indicator"
            value={data.missed == null ? 'Unavailable' : String(data.missed)}
            statusText="Scheduled occurrences marked missed"
          />
          <AppText variant="caption">
            Timezone: {data.timezone}. Recent activity:{' '}
            {data.recentActivity.length
              ? data.recentActivity.join(', ')
              : 'None available'}
            .
          </AppText>
        </>
      )}
    </>
  );
}
