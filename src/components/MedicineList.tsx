import { View } from 'react-native';
import {
  AppAlert,
  AppButton,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import { MedicationCard } from '@/components/MedicationCard';
import type { MedicationSummary } from '@/types/medication';
import type { MedicationSchedule } from '@/types/schedule';

type Props = {
  medicines: readonly MedicationSummary[];
  schedules?: readonly MedicationSchedule[];
  scheduleError?: boolean;
  loading: boolean;
  error: boolean;
  onRefresh(): void;
  onAdd(): void;
  onAddSchedule?(medication: MedicationSummary): void;
  onEditSchedule?(medication: MedicationSummary, scheduleId: string): void;
  onEdit?(id: string): void;
  onDelete?(id: string): void;
};
export function MedicineList({
  medicines,
  schedules = [],
  scheduleError = false,
  loading,
  error,
  onRefresh,
  onAdd,
  onAddSchedule,
  onEditSchedule,
  onEdit,
  onDelete,
}: Props) {
  if (loading) return <LoadingIndicator label="Loading medicines" />;
  if (error)
    return (
      <>
        <AppAlert
          tone="error"
          message="Medicines are temporarily unavailable."
        />
        <AppButton label="Try again" onPress={onRefresh} />
      </>
    );
  return (
    <View>
      {scheduleError ? (
        <AppAlert message="Schedule information is temporarily unavailable. Your medicines are still shown." />
      ) : null}
      {!medicines.length ? (
        <EmptyState
          title="No medicines recorded"
          message="Add a medicine manually or scan packaging for review."
        />
      ) : (
        medicines.map((item) => (
          <MedicationCard
            key={item.id}
            medication={item}
            schedules={schedules.filter(
              (schedule) =>
                schedule.patientMedicationId === item.id &&
                schedule.status !== 'cancelled',
            )}
            onAddSchedule={onAddSchedule}
            onEditSchedule={onEditSchedule}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
      <AppButton
        variant="secondary"
        label="Refresh medicines"
        onPress={onRefresh}
      />
      <AppButton label="Add medicine" onPress={onAdd} />
    </View>
  );
}
