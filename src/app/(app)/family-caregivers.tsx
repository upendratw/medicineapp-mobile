import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { AppHeader, AppScreen, FamilyCaregivers } from '@/components';
import { useTranslation } from '@/localization';
import { caregiverRelationshipService } from '@/services/registry';
import { useAuth } from '@/state/AuthContext';

export default function FamilyCaregiversScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const initialFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (initialFocus.current) {
        initialFocus.current = false;
        return;
      }
      setRefreshKey((current) => current + 1);
    }, []),
  );
  if (role !== 'patient' && role !== 'caregiver') return null;
  return (
    <AppScreen>
      <AppHeader title={t('familyTitle')} subtitle={t('familySubtitle')} />
      <FamilyCaregivers
        role={role}
        service={caregiverRelationshipService}
        refreshKey={refreshKey}
        onAccepted={() => router.replace('/caregiver-dashboard')}
      />
    </AppScreen>
  );
}
