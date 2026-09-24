import type { ApiClient } from '@/api/client';
import { DrugInformationService } from '@/services/drugInformationService';
import { MedicationHistoryService } from '@/services/historyService';
import {
  BackendReminderContextService,
  ReminderService,
} from '@/services/reminderService';

const client = () => ({ request: jest.fn() }) as unknown as ApiClient;

test('taken, skip, and snooze use actual reminder endpoints and DTOs', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({ result: 'APPLIED' });
  const service = new ReminderService(api);
  await service.acknowledge(
    'reminder-id',
    'TAKEN',
    'client-event-id',
    'Asia/Kolkata',
    2,
  );
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/reminders/reminder-id/acknowledge',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
  await service.snooze('reminder-id', 10, 'request-key');
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/reminders/reminder-id/snooze',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
});

test('history uses real bounded paginated backend query', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({ items: [] });
  await new MedicationHistoryService(api).list({
    startDate: '2026-09-01',
    endDate: '2026-09-14',
    timezone: 'Asia/Kolkata',
  });
  expect(api.request).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/intake/history?'),
    {},
    true,
  );
});

test('E22 request and response preserve evidence safety and provenance', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({
    medication: { id: 'id', display_name: 'Synthetic' },
    answer_available: false,
    status: 'insufficient_evidence',
    status_text: 'None',
    section: 'side_effects',
    citations: [],
    safety: { evidence_bound: true, personalized_advice: false },
  });
  const result = await new DrugInformationService(api).query(
    'Synthetic',
    'side_effects',
  );
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/drug-information/query',
    expect.objectContaining({ method: 'POST' }),
    true,
  );
  expect(result.safety.personalizedAdvice).toBe(false);
});

test('production reminder context is fetched from the authenticated backend', async () => {
  const api = client();
  jest.mocked(api.request).mockResolvedValue({
    reminder_id: 'reminder-id',
    medication_name: 'Synthetic',
    scheduled_local_time: '2026-09-14T15:30:00+05:30',
    scheduled_utc_time: '2026-09-14T10:00:00Z',
    dose_quantity: '1',
    dose_unit: 'tablet',
    status: 'fired',
    status_text: 'fired',
    schedule_revision: 1,
    allowed_actions: ['TAKEN'],
    instructions: null,
  });
  await new BackendReminderContextService(api).get('reminder-id');
  expect(api.request).toHaveBeenCalledWith(
    '/api/v1/reminders/reminder-id',
    {},
    true,
  );
});
