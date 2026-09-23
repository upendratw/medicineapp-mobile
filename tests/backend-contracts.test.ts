import type { ApiClient } from '@/api/client';
import { BackendCaregiverService } from '@/services/caregiverService';
import {
  BackendMedicationCatalogService,
  PendingPatientMedicationService,
  BackendPatientMedicationService,
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

test('patient medication creation uses the authenticated durable endpoint', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({
    id: 'pm-1',
    name: 'Synthetic',
    strength: null,
    dosage_form: 'Tablet',
    active_ingredient: null,
    manufacturer: null,
    notes: null,
    source: 'manual',
    medicine_capture_id: null,
    is_active: true,
    inventory: {
      id: 'inv-1',
      initial_quantity: '2.5000',
      remaining_quantity: '2.5000',
      quantity_unit: 'tablet',
      low_stock_threshold: null,
      revision: 1,
    },
  });
  await new BackendPatientMedicationService(api).create({
    name: 'Synthetic',
    dosageForm: 'Tablet',
    initialQuantity: '2.5000',
    quantityUnit: 'tablet',
    source: 'manual',
    idempotencyKey: 'stable-key-123',
  });
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/patient-medications',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
  expect(
    JSON.parse(jest.mocked(api.request).mock.calls[0][1]!.body as string),
  ).toMatchObject({
    inventory: { initial_quantity: '2.5000', quantity_unit: 'tablet' },
    source: 'manual',
    idempotency_key: 'stable-key-123',
  });
});

test('patient medication list uses its own authenticated source of truth', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue([
    {
      id: 'pm-1',
      name: 'Synthetic',
      strength: null,
      dosage_form: 'Tablet',
      active_ingredient: null,
      manufacturer: null,
      notes: null,
      source: 'manual',
      medicine_capture_id: null,
      is_active: true,
      created_at: '2026-09-23T00:00:00Z',
      inventory: {
        id: 'inv-1',
        initial_quantity: '20.0000',
        remaining_quantity: '20.0000',
        quantity_unit: 'tablet',
        low_stock_threshold: null,
        revision: 1,
      },
    },
  ]);
  const result = await new BackendPatientMedicationService(api).list();
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/patient-medications',
    {},
    true,
  );
  expect(result[0]).toMatchObject({
    canonicalName: 'Synthetic',
    remainingQuantity: '20.0000',
    quantityUnit: 'tablet',
  });
  expect(JSON.stringify(jest.mocked(api.request).mock.calls)).not.toContain(
    '/medication-schedules',
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
