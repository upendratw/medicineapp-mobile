import type { PatientMedicationService } from '@/services/medicationService';
import type { ScheduleService } from '@/services/scheduleService';
import type { PatientDashboardData } from '@/types/dashboard';

export class DashboardService {
  constructor(
    private readonly medications: PatientMedicationService,
    private readonly schedules: ScheduleService,
  ) {}
  async load(): Promise<PatientDashboardData> {
    const [medicines, schedules] = await Promise.all([
      this.medications.list(),
      this.schedules.list(),
    ]);
    return {
      medicines,
      schedules,
      todayScheduled: schedules.filter((item) => item.status === 'active')
        .length,
      recentlyTaken: null,
      integrationPending: this.medications.integrationPending,
    };
  }
}
