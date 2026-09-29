import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { CaregiverAlertInbox } from '@/components/CaregiverAlertInbox';
import { caregiverAlertService } from '@/services/registry';
import { useOnline } from '@/state/NetworkContext';

export default function CaregiverAlertsScreen() {
  const router = useRouter();
  const online = useOnline();
  const [focusVersion, setFocusVersion] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusVersion((current) => current + 1);
    }, []),
  );
  return (
    <CaregiverAlertInbox
      service={caregiverAlertService}
      online={online}
      focusVersion={focusVersion}
      onBack={() => router.replace('/caregiver-dashboard')}
      onOpenAlert={(relationshipId, alertId) =>
        router.push({
          pathname: '/caregiver-alerts/[relationshipId]/[alertId]',
          params: { relationshipId, alertId },
        } as never)
      }
    />
  );
}
