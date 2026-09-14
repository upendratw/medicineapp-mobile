export type OperationalEventName =
  | 'app_start'
  | 'auth_login_attempt'
  | 'auth_login_success'
  | 'auth_login_failure'
  | 'session_restore_failure'
  | 'screen_opened'
  | 'api_request_failure'
  | 'deep_link_rejected'
  | 'push_permission_result'
  | 'push_registration_result'
  | 'offline_mode_entered'
  | 'offline_mode_exited'
  | 'secure_storage_failure'
  | 'cache_corruption_detected'
  | 'camera_permission_result'
  | 'confirmation_required_action_displayed'
  | 'dangerous_voice_command_blocked'
  | 'feature_unavailable'
  | 'logout_completed';

export type MetricName =
  | 'app_start'
  | 'auth_success'
  | 'auth_failure'
  | 'api_request_failure'
  | 'api_request_duration'
  | 'network_offline'
  | 'cache_hit'
  | 'cache_miss'
  | 'secure_storage_failure'
  | 'deep_link_rejected'
  | 'push_permission_denied'
  | 'push_registration_failure'
  | 'camera_permission_denied';

export type OperationalCategory =
  | 'application'
  | 'authentication'
  | 'api'
  | 'navigation'
  | 'notification'
  | 'network'
  | 'storage'
  | 'camera';
export type OperationalOutcome =
  'success' | 'failure' | 'rejected' | 'unavailable';
export type DurationBucket =
  'under_250ms' | '250ms_to_1s' | '1s_to_5s' | 'over_5s';

export type SafeOperationalRecord = Readonly<{
  event: OperationalEventName;
  category: OperationalCategory;
  outcome: OperationalOutcome;
  errorCode?: string;
}>;
export type SafeMetricLabels = Readonly<{
  category: OperationalCategory;
  outcome: OperationalOutcome;
}>;

export interface Logger {
  emit(record: SafeOperationalRecord): void;
}
export interface AuditSink {
  record(record: SafeOperationalRecord): void;
}
export interface MetricSink {
  increment(name: MetricName, labels: SafeMetricLabels): void;
  observe(
    name: 'api_request_duration',
    bucket: DurationBucket,
    labels: SafeMetricLabels,
  ): void;
}

export class NoopLogger implements Logger {
  emit(): void {}
}
export class NoopAuditSink implements AuditSink {
  record(): void {}
}
export class NoopMetricSink implements MetricSink {
  increment(): void {}
  observe(): void {}
}

const safeErrorCode = (value: string | undefined): string | undefined =>
  value && /^[A-Z][A-Z0-9_]{0,39}$/.test(value) ? value : undefined;

export const durationBucket = (durationMs: number): DurationBucket => {
  if (durationMs < 250) return 'under_250ms';
  if (durationMs < 1_000) return '250ms_to_1s';
  if (durationMs < 5_000) return '1s_to_5s';
  return 'over_5s';
};

export class MobileObservability {
  constructor(
    private readonly logger: Logger = new NoopLogger(),
    private readonly audit: AuditSink = new NoopAuditSink(),
    private readonly metrics: MetricSink = new NoopMetricSink(),
  ) {}

  event(
    event: OperationalEventName,
    category: OperationalCategory,
    outcome: OperationalOutcome,
    errorCode?: string,
  ): void {
    const record: SafeOperationalRecord = {
      event,
      category,
      outcome,
      ...(safeErrorCode(errorCode)
        ? { errorCode: safeErrorCode(errorCode) }
        : {}),
    };
    this.logger.emit(record);
    this.audit.record(record);
  }

  increment(
    name: MetricName,
    category: OperationalCategory,
    outcome: OperationalOutcome,
  ): void {
    this.metrics.increment(name, { category, outcome });
  }

  duration(
    durationMs: number,
    category: OperationalCategory,
    outcome: OperationalOutcome,
  ): void {
    this.metrics.observe('api_request_duration', durationBucket(durationMs), {
      category,
      outcome,
    });
  }
}

export const mobileObservability = new MobileObservability();
