import { publicEnvironment } from '@/config/environment';
import { mobileObservability, type MobileObservability } from '@/observability';
import type { SecureTokenStore } from '@/security/SecureTokenStore';

type ApiEnvelope<T> = { data: T };
type ApiErrorEnvelope = { error?: { code?: string; message?: string } };

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super('The request could not be completed. Please try again.');
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl = publicEnvironment.apiBaseUrl,
    private readonly timeoutMs = publicEnvironment.requestTimeoutMs,
    private readonly tokenStore?: SecureTokenStore,
    private readonly observability: MobileObservability = mobileObservability,
  ) {}

  async request<T>(
    path: string,
    options: RequestInit = {},
    authenticated = false,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();
    let outcome: 'success' | 'failure' = 'failure';
    try {
      const headers = new Headers(options.headers);
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      if (authenticated) {
        const tokens = await this.tokenStore?.read();
        if (!tokens) throw new ApiError('AUTH_REQUIRED', 401);
        headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      }
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T> &
        ApiErrorEnvelope;
      if (!response.ok) {
        throw new ApiError(
          body.error?.code ?? 'REQUEST_FAILED',
          response.status,
        );
      }
      if (!body || typeof body !== 'object' || !('data' in body)) {
        throw new ApiError('INVALID_RESPONSE', 502);
      }
      outcome = 'success';
      return body.data;
    } catch (error) {
      const sanitized =
        error instanceof ApiError
          ? error
          : new ApiError(
              error instanceof Error && error.name === 'AbortError'
                ? 'REQUEST_TIMEOUT'
                : 'NETWORK_UNAVAILABLE',
              0,
            );
      this.observability.event(
        'api_request_failure',
        'api',
        'failure',
        sanitized.code,
      );
      this.observability.increment('api_request_failure', 'api', 'failure');
      throw sanitized;
    } finally {
      clearTimeout(timeout);
      this.observability.duration(Date.now() - startedAt, 'api', outcome);
    }
  }
}
