import { useRouter } from 'expo-router';

import { AppHeader, AppScreen, FamilyCaregivers } from '@/components';
import { useTranslation } from '@/localization';
import { caregiverRelationshipService } from '@/services/registry';
import { useAuth } from '@/state/AuthContext';

export default function FamilyCaregiversScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useAuth();
  if (role !== 'patient' && role !== 'caregiver') return null;
  return (
    <AppScreen>
      <AppHeader title={t('familyTitle')} subtitle={t('familySubtitle')} />
      <FamilyCaregivers
        role={role}
        service={caregiverRelationshipService}
        onAccepted={() => router.replace('/caregiver-dashboard')}
      />
    </AppScreen>
  );
}
