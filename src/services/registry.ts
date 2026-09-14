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
import { DrugInformationService } from '@/services/drugInformationService';
import { MedicationHistoryService } from '@/services/historyService';
import {
  buildReminderContextService,
  ReminderService,
} from '@/services/reminderService';

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
export const reminderService = new ReminderService(api);
export const reminderContextService = buildReminderContextService();
export const medicationHistoryService = new MedicationHistoryService(api);
export const drugInformationService = new DrugInformationService(api);
