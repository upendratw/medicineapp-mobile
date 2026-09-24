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
import {
  EmergencyAssistanceService,
  LinkingDeviceCommunicationService,
  PendingSymptomAssessmentService,
  PendingVoiceInputService,
  VoiceCommandResolver,
} from '@/services/highRiskServices';
import {
  PendingInteractionService,
  PendingInventoryService,
  PendingPrescriptionScanService,
} from '@/services/clinicalFeatureServices';
import { DrugInformationService } from '@/services/drugInformationService';
import { MedicationHistoryService } from '@/services/historyService';
import {
  buildReminderContextService,
  ReminderService,
} from '@/services/reminderService';

const api = new ApiClient(undefined, undefined, secureTokenStore);
export const patientMedicationService = buildPatientMedicationService(api);
export const scheduleService = new ScheduleService(api);
export const medicationCatalogService = new BackendMedicationCatalogService(
  api,
);
export const caregiverService = new BackendCaregiverService(api);
export const dashboardService = new DashboardService(
  patientMedicationService,
  scheduleService,
);
export const ocrService = buildOcrService(api);
export const reminderService = new ReminderService(api);
export const reminderContextService = buildReminderContextService(api);
export const medicationHistoryService = new MedicationHistoryService(api);
export const drugInformationService = new DrugInformationService(api);
export const interactionService = new PendingInteractionService();
export const prescriptionScanService = new PendingPrescriptionScanService();
export const inventoryService = new PendingInventoryService();
export const symptomAssessmentService = new PendingSymptomAssessmentService();
export const emergencyAssistanceService = new EmergencyAssistanceService(api);
export const deviceCommunicationService =
  new LinkingDeviceCommunicationService();
export const voiceInputService = new PendingVoiceInputService();
export const voiceCommandResolver = new VoiceCommandResolver();
