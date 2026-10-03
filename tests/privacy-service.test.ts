import type { ApiClient } from '@/api/client';
import { BackendPrivacyService } from '@/services/privacyService';

test('privacy service uses only authenticated self-service account routes', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({ display_name: 'Synthetic Patient' })
    .mockResolvedValueOnce({ display_name: 'Updated' })
    .mockResolvedValueOnce({ subject_role: 'patient', capabilities: [] })
    .mockResolvedValueOnce({ status: 'NOT_REQUESTED', message_code: 'none' })
    .mockResolvedValueOnce({ notice_version: 'v1' })
    .mockResolvedValueOnce({ schema_version: 'export-v1' })
    .mockResolvedValueOnce({ deletion_requested: true });
  const service = new BackendPrivacyService({
    request,
  } as unknown as ApiClient);

  await service.profile('patient');
  await service.updateDisplayName('patient', 'Updated');
  await service.capabilities();
  await service.erasureStatus();
  await service.notice('hi-IN');
  await service.exportData();
  await service.requestDeletion();

  expect(request.mock.calls).toEqual([
    ['/api/v1/patients/me', {}, true],
    [
      '/api/v1/patients/me',
      { method: 'PATCH', body: JSON.stringify({ display_name: 'Updated' }) },
      true,
    ],
    ['/api/v1/account/privacy-capabilities', {}, true],
    ['/api/v1/account/erasure-status', {}, true],
    ['/api/v1/account/privacy-notice?locale=hi-IN', {}, true],
    ['/api/v1/account/data-export', {}, true],
    ['/api/v1/account', { method: 'DELETE' }, true],
  ]);
});
