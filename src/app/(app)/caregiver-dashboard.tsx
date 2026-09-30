import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AppButton,
  AppHeader,
  AppScreen,
  CaregiverDashboard,
} from '@/components';
import { useTranslation } from '@/localization';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { caregiverService } from '@/services/registry';
import {
  classifyCaregiverFailure,
  type CaregiverFailureKind,
} from '@/services/caregiverService';
import type { CaregiverDashboardData } from '@/types/dashboard';
import { useAuth } from '@/state/AuthContext';

export default function CaregiverDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useAuth();
  const list = useCallback(() => caregiverService.listAuthorizedPatients(), []);
  const patients = useAsyncResource(list);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<CaregiverDashboardData | null>(null);
  const [detailFailure, setDetailFailure] = useState<unknown>(null);
  const select = async (id: string) => {
    setSelected(id);
    setData(null);
    setDetailFailure(null);
    try {
      setData(await caregiverService.dashboard(id));
    } catch (failure) {
      setDetailFailure(failure);
    }
  };
  return (
    <AppScreen>
      <AppHeader
        title="Caregiver dashboard"
        subtitle="Only information authorized by an active caregiver relationship is requested."
      />
      <CaregiverDashboard
        patients={patients.data ?? []}
        selected={selected}
        data={data}
        loading={patients.loading}
        error={resolveFailure(patients.failure, detailFailure)}
        onSelect={(id) => void select(id)}
        onRetry={patients.refresh}
        onBack={() => router.replace('/home')}
        onAlerts={
          role === 'caregiver'
            ? () => router.push('/caregiver-alerts')
            : undefined
        }
      />
      {role === 'caregiver' ? (
        <>
          <AppButton
            variant="secondary"
            label={t('familyPendingInvitations')}
            onPress={() => router.push('/family-caregivers' as never)}
          />
          <AppButton
            variant="secondary"
            label={t('accountSettings')}
            onPress={() => router.push('/account-settings')}
          />
        </>
      ) : null}
    </AppScreen>
  );
}

function resolveFailure(
  listFailure: unknown,
  detailFailure: unknown,
): CaregiverFailureKind | null {
  const failure = listFailure ?? detailFailure;
  return failure == null ? null : classifyCaregiverFailure(failure);
}
