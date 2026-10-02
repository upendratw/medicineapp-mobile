import type { ApiClient } from '@/api/client';
import { BackendCaregiverService } from '@/services/caregiverService';

test('maps exact authorized symptom text and deny-by-default unavailability', async () => {
  const exact = '  Patient wording\nunchanged 🙂  ';
  const request = jest
    .fn()
    .mockResolvedValueOnce({
      patient: { display_name: 'Family member', timezone: 'Asia/Kolkata' },
      reported_symptoms: {
        available: true,
        items: [
          {
            id: 'opaque-id',
            symptom_text: exact,
            source_type: 'PATIENT_REPORTED',
            reported_at: '2026-10-02T10:30:00Z',
          },
        ],
      },
    })
    .mockResolvedValueOnce({
      patient: { display_name: 'Family member', timezone: 'Asia/Kolkata' },
      reported_symptoms: {
        available: false,
        reason: 'permission_not_granted',
      },
    });
  const service = new BackendCaregiverService({
    request,
  } as unknown as ApiClient);

  const allowed = await service.dashboard('patient-id');
  expect(allowed.reportedSymptoms?.[0]?.symptomText).toBe(exact);
  const denied = await service.dashboard('patient-id');
  expect(denied.reportedSymptoms).toBeNull();
});
