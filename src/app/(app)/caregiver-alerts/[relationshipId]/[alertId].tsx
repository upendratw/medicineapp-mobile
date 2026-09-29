import { useLocalSearchParams, useRouter } from 'expo-router';

import { CaregiverAlertDetail } from '@/components/CaregiverAlertDetail';
import { caregiverAlertService } from '@/services/registry';
import { useAuth } from '@/state/AuthContext';
import { useOnline } from '@/state/NetworkContext';

export default function CaregiverAlertDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    relationshipId?: string;
    alertId?: string;
  }>();
  const { role } = useAuth();
  const online = useOnline();
  const relationshipId =
    typeof params.relationshipId === 'string' ? params.relationshipId : '';
  const alertId = typeof params.alertId === 'string' ? params.alertId : '';
  if (role !== 'caregiver') return null;
  return (
    <CaregiverAlertDetail
      service={caregiverAlertService}
      relationshipId={relationshipId}
      alertId={alertId}
      role={role}
      online={online}
      onBack={() => router.back()}
    />
  );
}
