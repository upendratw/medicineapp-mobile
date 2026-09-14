import type { ApiClient } from '@/api/client';
import { BackendCaregiverService } from '@/services/caregiverService';
import {
  BackendMedicationCatalogService,
  PendingPatientMedicationService,
} from '@/services/medicationService';
import { PendingOcrService } from '@/services/ocrService';
import { ScheduleService } from '@/services/scheduleService';

const client = () => ({ request: jest.fn() }) as unknown as ApiClient;

test('medication catalog uses the real authenticated backend search route', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue([]);
  await new BackendMedicationCatalogService(api).search('synthetic');
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/medications/search?q=synthetic&limit=20',
    {},
    true,
  );
});

test('schedule DTO targets the real authenticated schedule endpoint', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({
    id: 'schedule-id',
    medication_id: 'medicine-id',
    status: 'draft',
    timezone: 'Asia/Kolkata',
    start_date: '2026-09-14',
    end_date: null,
    revision: 1,
    rules: [],
  });
  const input = {
    medication_id: 'medicine-id',
    timezone: 'Asia/Kolkata',
    start_date: '2026-09-14',
    food_instruction: 'none' as const,
    medication_choice_confirmed: true,
    activate: false,
    rules: [
      {
        rule_type: 'daily' as const,
        times_of_day: ['08:00'],
        days_of_week: [],
        interval_hours: null,
        interval_anchor: null,
        once_at: null,
      },
    ],
  };
  await new ScheduleService(api).create(input);
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/medication-schedules',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
});

test('caregiver service uses relationship-authorized E21 routes', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({ items: [] });
  await new BackendCaregiverService(api).listAuthorizedPatients();
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/e21/caregiver/patients',
    {},
    true,
  );
});

test('missing patient-create and OCR endpoints remain explicit pending adapters', async () => {
  await expect(
    new PendingPatientMedicationService().create(),
  ).rejects.toMatchObject({ feature: 'Patient medication creation' });
  await expect(new PendingOcrService().recognize()).rejects.toMatchObject({
    feature: 'Medicine OCR',
  });
});
