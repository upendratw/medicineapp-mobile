import { useCallback, useState } from 'react';
import { AppHeader, AppScreen, CaregiverDashboard } from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { caregiverService } from '@/services/registry';
import type { CaregiverDashboardData } from '@/types/dashboard';

export default function CaregiverDashboardScreen() {
  const list = useCallback(() => caregiverService.listAuthorizedPatients(), []);
  const patients = useAsyncResource(list);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<CaregiverDashboardData | null>(null);
  const [detailError, setDetailError] = useState(false);
  const select = async (id: string) => {
    setSelected(id);
    setData(null);
    setDetailError(false);
    try {
      setData(await caregiverService.dashboard(id));
    } catch {
      setDetailError(true);
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
        error={patients.error || detailError}
        onSelect={(id) => void select(id)}
        onRetry={patients.refresh}
      />
    </AppScreen>
  );
}
