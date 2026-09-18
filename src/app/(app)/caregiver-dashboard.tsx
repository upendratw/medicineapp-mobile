import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppHeader, AppScreen, CaregiverDashboard } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { caregiverService } from '@/services/registry';
import {
  classifyCaregiverFailure,
  type CaregiverFailureKind,
} from '@/services/caregiverService';
import type { CaregiverDashboardData } from '@/types/dashboard';

export default function CaregiverDashboardScreen() {
  const router = useRouter();
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
      />
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
