import { ApiClient } from '@/api/client';
import {
  durationBucket,
  MobileObservability,
  type AuditSink,
  type Logger,
  type MetricSink,
  type SafeOperationalRecord,
} from '@/observability';
import { resolveDeepLink } from '@/navigation/DeepLinkService';
import { VoiceCommandResolver } from '@/services/highRiskServices';

const response = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response;

class CaptureLogger implements Logger {
  records: SafeOperationalRecord[] = [];
  emit(record: SafeOperationalRecord): void {
    this.records.push(record);
  }
}
class CaptureAudit implements AuditSink {
  records: SafeOperationalRecord[] = [];
  record(value: SafeOperationalRecord): void {
    this.records.push(value);
  }
}
class CaptureMetrics implements MetricSink {
  calls: unknown[][] = [];
  increment(...values: Parameters<MetricSink['increment']>): void {
    this.calls.push(values);
  }
  observe(...values: Parameters<MetricSink['observe']>): void {
    this.calls.push(values);
  }
}

beforeEach(() => jest.restoreAllMocks());

test('operational records expose only bounded content-free fields', () => {
  const logger = new CaptureLogger();
  const audit = new CaptureAudit();
  const telemetry = new MobileObservability(logger, audit);
  telemetry.event(
    'auth_login_failure',
    'authentication',
    'failure',
    'unsafe phone +919876543210 and token',
  );
  expect(logger.records).toEqual([
    {
      event: 'auth_login_failure',
      category: 'authentication',
      outcome: 'failure',
    },
  ]);
  expect(audit.records).toEqual(logger.records);
});

test('API telemetry never includes path, response body, or credential content', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(
    response(
      {
        error: {
          code: 'DENIED',
          message: 'synthetic-private-response access-token-value',
        },
      },
      false,
      403,
    ),
  );
  const logger = new CaptureLogger();
  const audit = new CaptureAudit();
  const metrics = new CaptureMetrics();
  const telemetry = new MobileObservability(logger, audit, metrics);
  await expect(
    new ApiClient(
      'https://api.example.test',
      1_000,
      undefined,
      telemetry,
    ).request('/private/synthetic-patient-id'),
  ).rejects.toMatchObject({ code: 'DENIED' });
  const emitted = JSON.stringify({ logger, audit, metrics });
  expect(emitted).not.toMatch(
    /synthetic-private-response|access-token-value|synthetic-patient-id/,
  );
  expect(logger.records[0]).toEqual({
    event: 'api_request_failure',
    category: 'api',
    outcome: 'failure',
    errorCode: 'DENIED',
  });
});

test.each([
  [0, 'under_250ms'],
  [250, '250ms_to_1s'],
  [1_000, '1s_to_5s'],
  [5_000, 'over_5s'],
])('duration %i maps to bounded bucket %s', (duration, expected) => {
  expect(durationBucket(duration)).toBe(expected);
});

test('default observability does not call the console or network', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  const fetchSpy = jest.spyOn(global, 'fetch');
  new MobileObservability().event('app_start', 'application', 'success');
  expect(consoleSpy).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('rejected links and blocked voice commands produce content-free audit evidence', () => {
  const logger = new CaptureLogger();
  const audit = new CaptureAudit();
  const telemetry = new MobileObservability(logger, audit);
  resolveDeepLink('medicineapp://home?token=private-value', telemetry);
  new VoiceCommandResolver(telemetry).resolve(
    'double my next dose private-value',
  );
  const emitted = JSON.stringify({ logger, audit });
  expect(emitted).not.toContain('private-value');
  expect(logger.records.map((record) => record.event)).toEqual([
    'deep_link_rejected',
    'dangerous_voice_command_blocked',
  ]);
});
