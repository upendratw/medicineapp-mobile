import type { MedicationSummary } from '@/types/medication';
import type { MedicationSchedule } from '@/types/schedule';

export type PatientDashboardData = Readonly<{
  medicines: readonly MedicationSummary[];
  schedules: readonly MedicationSchedule[];
  todayScheduled: number;
  recentlyTaken: number | null;
  integrationPending: boolean;
}>;

export type CaregiverPatient = Readonly<{
  patientUserId: string;
  displayName: string;
  relationshipId: string;
  statusText: string;
}>;

export type CaregiverDashboardData = Readonly<{
  patientName: string;
  timezone: string;
  scheduled: number | null;
  taken: number | null;
  missed: number | null;
  adherencePercentage: number | null;
  recentActivity: readonly string[];
}>;
