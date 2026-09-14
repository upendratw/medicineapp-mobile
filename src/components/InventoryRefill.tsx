import { useRef, useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
  EmptyState,
  LoadingIndicator,
} from '@/components';
import type { InventoryRecord } from '@/types/clinicalFeatures';

export function InventoryRefill({
  record,
  loading,
  pending,
  error,
  onUpdate,
  onReminder,
}: {
  record: InventoryRecord | null;
  loading: boolean;
  pending: boolean;
  error: boolean;
  onUpdate(quantity: number): Promise<void>;
  onReminder(enabled: boolean): Promise<void>;
}) {
  const [quantity, setQuantity] = useState(
    record?.quantity == null ? '' : String(record.quantity),
  );
  const [failure, setFailure] = useState(false);
  const busy = useRef(false);
  if (loading) return <LoadingIndicator label="Loading inventory" />;
  if (pending)
    return (
      <AppAlert
        tone="warning"
        message="Medication inventory and refill tracking are not yet available."
      />
    );
  if (error)
    return (
      <AppAlert
        tone="error"
        message="Inventory information is temporarily unavailable."
      />
    );
  if (!record)
    return (
      <EmptyState
        title="No inventory record"
        message="Select a medication with an inventory record."
      />
    );
  const update = async () => {
    const value = Number(quantity);
    if (busy.current || !Number.isInteger(value) || value < 0 || value > 100000)
      return;
    busy.current = true;
    setFailure(false);
    try {
      await onUpdate(value);
    } catch {
      setFailure(true);
    } finally {
      busy.current = false;
    }
  };
  return (
    <>
      <AppCard>
        <AppText variant="heading">{record.medicationName}</AppText>
        <AppText>
          Current quantity: {record.quantity ?? 'Unavailable'}{' '}
          {record.quantityUnit ?? ''}
        </AppText>
        <AppText>Refill status: {record.refillStatus}</AppText>
        <AppText>
          No supply estimate is shown because schedule and dose data are
          incomplete.
        </AppText>
      </AppCard>
      {failure ? (
        <AppAlert
          tone="error"
          message="The inventory update could not be saved."
        />
      ) : null}
      <AppTextInput
        label="New quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        maxLength={6}
      />
      <AppButton label="Update quantity" onPress={update} />
      {record.refillReminderEnabled == null ? (
        <AppAlert message="Refill reminder preferences are not supported by the current backend." />
      ) : (
        <AppButton
          variant="secondary"
          label={
            record.refillReminderEnabled
              ? 'Disable refill reminder'
              : 'Enable refill reminder'
          }
          onPress={() => onReminder(!record.refillReminderEnabled)}
        />
      )}
      <AppAlert message="Inventory tracking is operational only. It does not authorize a refill or recommend changing or skipping a dose." />
    </>
  );
}
