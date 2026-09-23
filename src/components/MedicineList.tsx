import { View } from 'react-native';
import {
  AppAlert,
  AppButton,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import { MedicationCard } from '@/components/MedicationCard';
import type { MedicationSummary } from '@/types/medication';

type Props = {
  medicines: readonly MedicationSummary[];
  loading: boolean;
  error: boolean;
  onRefresh(): void;
  onAdd(): void;
  onSchedule?(id: string): void;
  onEdit?(id: string): void;
  onDelete?(id: string): void;
};
export function MedicineList({
  medicines,
  loading,
  error,
  onRefresh,
  onAdd,
  onSchedule,
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
            onSchedule={onSchedule}
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
