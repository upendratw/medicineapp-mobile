import { ApiClient, ApiError } from '@/api/client';
import {
  resolveDeepLink,
  resolveNotificationDestination,
} from '@/navigation/DeepLinkService';
import { requireOnline } from '@/storage/OfflineCache';

const response = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response;

beforeEach(() => jest.restoreAllMocks());

test.each([401, 403, 404, 429, 500, 503])(
  'API status %i remains a sanitized failure',
  async (status) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      response(
        {
          error: {
            code: `HTTP_${status}`,
            message: 'private synthetic medication and patient detail',
          },
        },
        false,
        status,
      ),
    );
    await expect(
      new ApiClient('https://api.example.test', 1_000).request('/synthetic'),
    ).rejects.toEqual(
      expect.objectContaining({ code: `HTTP_${status}`, status }),
    );
  },
);

test('malformed successful backend response fails closed', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response({ unexpected: true }));
  await expect(
    new ApiClient('https://api.example.test', 1_000).request('/synthetic'),
  ).rejects.toEqual(
    expect.objectContaining({ code: 'INVALID_RESPONSE', status: 502 }),
  );
});

test('network error is normalized without raw error content', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockRejectedValue(new Error('private synthetic upstream response body'));
  let failure: unknown;
  try {
    await new ApiClient('https://api.example.test', 1_000).request(
      '/synthetic',
    );
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(ApiError);
  expect(failure).toMatchObject({ code: 'NETWORK_UNAVAILABLE', status: 0 });
  expect(JSON.stringify(failure)).not.toContain('private synthetic');
});

test.each([
  'medicineapp://home?token=synthetic',
  `medicineapp://${'a'.repeat(600)}`,
  'medicineapp://taken',
  'medicineapp://unknown',
  'https://example.test/home',
])('unsafe deep link is rejected: %s', (value) => {
  expect(resolveDeepLink(value)).toMatchObject({
    accepted: false,
    destination: '/home',
  });
});

test('malicious notification route cannot execute an action', () => {
  expect(resolveNotificationDestination('/sos?dispatch=true')).toMatchObject({
    accepted: false,
    destination: '/home',
  });
});

test('offline clinical write fails explicitly and is not queued', () => {
  expect(() => requireOnline(false)).toThrow('was not queued');
});

test('source preserves high-risk clinical and privacy prohibitions', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const files = fs
    .readdirSync(path.join(process.cwd(), 'src/services'))
    .map((name: string) =>
      fs.readFileSync(path.join(process.cwd(), 'src/services', name), 'utf8'),
    )
    .join('\n');
  expect(files).not.toMatch(
    /@aws-sdk|Gemini|OpenSearch|mysql|S3Client|diagnosePatient|prescribeMedication|dispatchEmergency/,
  );
});
