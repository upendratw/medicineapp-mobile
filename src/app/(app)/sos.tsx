import { useCallback } from 'react';
import { AppHeader, AppScreen, EmergencyHelp } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  deviceCommunicationService,
  emergencyAssistanceService,
} from '@/services/registry';
export default function Sos() {
  const load = useCallback(() => emergencyAssistanceService.listContacts(), []);
  const state = useAsyncResource(load);
  return (
    <AppScreen>
      <AppHeader
        title="Emergency help options"
        subtitle="Choose and confirm an external call."
      />
      <EmergencyHelp
        contacts={state.data ?? []}
        loading={state.loading}
        error={state.error}
        onCall={(phone) => deviceCommunicationService.openDialer(phone)}
      />
    </AppScreen>
  );
}
