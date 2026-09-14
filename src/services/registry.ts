import { ApiClient } from '@/api/client';
import { secureTokenStore } from '@/security/SecureTokenStore';
import { BackendCaregiverService } from '@/services/caregiverService';
import { DashboardService } from '@/services/dashboardService';
import {
  BackendMedicationCatalogService,
  buildPatientMedicationService,
} from '@/services/medicationService';
import { buildOcrService } from '@/services/ocrService';
import { ScheduleService } from '@/services/scheduleService';

const api = new ApiClient(undefined, undefined, secureTokenStore);
export const patientMedicationService = buildPatientMedicationService();
export const scheduleService = new ScheduleService(api);
export const medicationCatalogService = new BackendMedicationCatalogService(
  api,
);
export const caregiverService = new BackendCaregiverService(api);
export const dashboardService = new DashboardService(
  patientMedicationService,
  scheduleService,
);
export const ocrService = buildOcrService();
