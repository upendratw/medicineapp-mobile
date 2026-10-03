import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import { StatusCard } from '@/components/StatusCard';
import { useTranslation } from '@/localization';
import type { PatientDashboardData } from '@/types/dashboard';

type Props = {
  data: PatientDashboardData | null;
  loading: boolean;
  error: boolean;
  onNavigate(
    route:
      '/medicines' | '/add-medicine' | '/schedule' | '/medication-information',
  ): void;
  onRetry(): void;
};
export function PatientDashboard({
  data,
  loading,
  error,
  onNavigate,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  if (loading) return <LoadingIndicator label="Loading your dashboard" />;
  if (error || !data)
    return (
      <>
        <AppAlert
          tone="error"
          message="Your dashboard is temporarily unavailable."
        />
        <AppButton label="Try again" onPress={onRetry} />
      </>
    );
  const upcoming = data.schedules.filter((item) => item.status === 'active')[0];
  return (
    <>
      <AppText variant="heading">Today</AppText>
      <StatusCard
        label="Medicines"
        value={String(data.medicines.length)}
        statusText="Recorded in your current view"
      />
      <StatusCard
        label="Today's schedule"
        value={String(data.todayScheduled)}
        statusText="Active schedule entries"
      />
      <StatusCard
        label="Recent adherence"
        value={
          data.recentlyTaken == null
            ? 'Unavailable'
            : String(data.recentlyTaken)
        }
        statusText="No treatment conclusions are inferred"
      />
      {upcoming ? (
        <AppCard>
          <AppText variant="label">Upcoming schedule</AppText>
          <AppText>{upcoming.times.join(', ') || 'Time unavailable'}</AppText>
        </AppCard>
      ) : (
        <EmptyState
          title="No upcoming schedule"
          message="Schedules you create will appear here."
        />
      )}
      {data.integrationPending ? (
        <AppAlert message="Patient medication-list synchronization awaits backend support." />
      ) : null}
      <AppText variant="heading">{t('patientDashboardQuickActions')}</AppText>
      <AppButton
        label={t('patientDashboardViewMedicines')}
        onPress={() => onNavigate('/medicines')}
      />
      <AppButton
        label={t('patientDashboardAddMedicine')}
        variant="secondary"
        onPress={() => onNavigate('/add-medicine')}
      />
      <AppButton
        label={t('patientDashboardViewSchedule')}
        variant="secondary"
        onPress={() => onNavigate('/schedule')}
      />
      <AppButton
        label={t('patientDashboardMedicationInformation')}
        variant="secondary"
        onPress={() => onNavigate('/medication-information')}
      />
    </>
  );
}
