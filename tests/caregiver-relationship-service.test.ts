import { ApiClient } from '@/api/client';
import { BackendCaregiverRelationshipService } from '@/services/caregiverRelationshipService';

test('relationship service uses only the authoritative E21 endpoint family', async () => {
  const client = {
    request: jest
      .fn()
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValue({}),
  } as unknown as ApiClient;
  const service = new BackendCaregiverRelationshipService(client);

  await service.listInvitations();
  await service.listRelationships();
  await service.invite('PHONE', '+919000000007', ['alerts.read']);
  await service.accept('invitation-id');
  await service.decline('invitation-id');
  await service.update('relationship-id', ['adherence.read'], false);
  await service.revoke('relationship-id');

  const paths = (client.request as jest.Mock).mock.calls.map(([path]) => path);
  expect(paths).toEqual([
    '/api/v1/e21/caregivers/invitations',
    '/api/v1/e21/caregivers/relationships',
    '/api/v1/e21/caregivers/invitations',
    '/api/v1/e21/caregivers/invitations/invitation-id/accept',
    '/api/v1/e21/caregivers/invitations/invitation-id/decline',
    '/api/v1/e21/caregivers/relationships/relationship-id/permissions',
    '/api/v1/e21/caregivers/relationships/relationship-id',
  ]);
  expect(paths.every((path: string) => path.startsWith('/api/v1/e21/'))).toBe(
    true,
  );
  expect((client.request as jest.Mock).mock.calls[2]?.[1]).toEqual({
    method: 'POST',
    body: JSON.stringify({
      channel: 'PHONE',
      destination: '+919000000007',
      role_level: 'SUPPORTER',
      permissions: ['alerts.read'],
    }),
  });
});

test('relationship service submits an email invitation through the same API', async () => {
  const client = {
    request: jest.fn().mockResolvedValue({}),
  } as unknown as ApiClient;
  const service = new BackendCaregiverRelationshipService(client);

  await service.invite('EMAIL', 'caregiver@example.com', [
    'alerts.read',
    'medications.read',
  ]);

  expect(client.request).toHaveBeenCalledWith(
    '/api/v1/e21/caregivers/invitations',
    {
      method: 'POST',
      body: JSON.stringify({
        channel: 'EMAIL',
        destination: 'caregiver@example.com',
        role_level: 'SUPPORTER',
        permissions: ['alerts.read', 'medications.read'],
      }),
    },
    true,
  );
});
