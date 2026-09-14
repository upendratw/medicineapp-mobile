import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { AppHeader, AppScreen, InteractionWarnings } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { interactionService } from '@/services/registry';

export default function InteractionScreen() {
  const params = useLocalSearchParams<{ medicationId?: string }>();
  const medicationId =
    typeof params.medicationId === 'string' ? params.medicationId : undefined;
  const load = useCallback(
    () => interactionService.list(medicationId),
    [medicationId],
  );
  const state = useAsyncResource(load);
  return (
    <AppScreen>
      <AppHeader
        title="Interaction information"
        subtitle="Only backend-validated interaction results can appear here."
      />
      <InteractionWarnings
        warnings={state.data ?? []}
        loading={state.loading}
        pending={state.error}
        error={false}
        forbidden={false}
      />
    </AppScreen>
  );
}
