import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { AppHeader, AppScreen, InventoryRefill } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { inventoryService } from '@/services/registry';

export default function InventoryScreen() {
  const params = useLocalSearchParams<{ medicationId?: string }>();
  const medicationId =
    typeof params.medicationId === 'string' ? params.medicationId : undefined;
  const load = useCallback(
    () => inventoryService.get(medicationId),
    [medicationId],
  );
  const state = useAsyncResource(load);
  const record = state.data?.[0] ?? null;
  return (
    <AppScreen>
      <AppHeader
        title="Inventory and refill"
        subtitle="Track supply without changing medication instructions."
      />
      <InventoryRefill
        record={record}
        loading={state.loading}
        pending={state.error}
        error={false}
        onUpdate={(quantity) =>
          medicationId
            ? inventoryService
                .updateQuantity(medicationId, quantity)
                .then(() => state.refresh())
            : Promise.reject()
        }
        onReminder={(enabled) =>
          medicationId
            ? inventoryService
                .setRefillReminder(medicationId, enabled)
                .then(() => state.refresh())
            : Promise.reject()
        }
      />
    </AppScreen>
  );
}
