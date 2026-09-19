import { publicEnvironment } from '@/config/environment';
import { mobileObservability, type MobileObservability } from '@/observability';
import { sessionEvents, type SessionEvents } from '@/security/SessionEvents';
import type { SecureTokenStore, TokenPair } from '@/security/SecureTokenStore';

type ApiEnvelope<T> = { data: T };
type ApiErrorEnvelope = { error?: { code?: string; message?: string } };
type RefreshResponse = {
  access_token: string;
  refresh_token: string;
};

const refreshes = new WeakMap<SecureTokenStore, Promise<TokenPair>>();

function validToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 16_384 &&
    value.trim() === value
  );
}

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
    private readonly events: SessionEvents = sessionEvents,
  ) {}

  async request<T>(
    path: string,
    options: RequestInit = {},
    authenticated = false,
  ): Promise<T> {
    const startedAt = Date.now();
    let outcome: 'success' | 'failure' = 'failure';
    try {
      const tokens = authenticated ? await this.requireTokens() : null;
      let result = await this.execute<T>(path, options, tokens?.accessToken);
      if (authenticated && result.response.status === 401 && tokens) {
        const refreshed = await this.recover(tokens.accessToken);
        result = await this.execute<T>(path, options, refreshed.accessToken);
        if (result.response.status === 401) {
          await this.invalidate();
          throw new ApiError('SESSION_EXPIRED', 401);
        }
      }
      if (!result.response.ok) {
        throw new ApiError(
          result.body.error?.code ?? 'REQUEST_FAILED',
          result.response.status,
        );
      }
      if (!result.body || !('data' in result.body))
        throw new ApiError('INVALID_RESPONSE', 502);
      outcome = 'success';
      return result.body.data;
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
      this.observability.duration(Date.now() - startedAt, 'api', outcome);
    }
  }

  private async requireTokens(): Promise<TokenPair> {
    const tokens = await this.tokenStore?.read();
    if (tokens) return tokens;
    await this.invalidate();
    throw new ApiError('AUTH_REQUIRED', 401);
  }

  private async execute<T>(
    path: string,
    options: RequestInit,
    accessToken?: string,
  ): Promise<{
    response: Response;
    body: ApiEnvelope<T> & ApiErrorEnvelope;
  }> {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const abortFromCaller = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else
      externalSignal?.addEventListener('abort', abortFromCaller, {
        once: true,
      });
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers(options.headers);
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T> &
        ApiErrorEnvelope;
      return { response, body };
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    }
  }

  private async recover(failedAccessToken: string): Promise<TokenPair> {
    if (!this.tokenStore) {
      await this.invalidate();
      throw new ApiError('AUTH_REQUIRED', 401);
    }
    const current = await this.tokenStore.read();
    if (!current) {
      await this.invalidate();
      throw new ApiError('AUTH_REQUIRED', 401);
    }
    if (current.accessToken !== failedAccessToken) return current;

    const existing = refreshes.get(this.tokenStore);
    if (existing) return existing;
    const pending = this.refresh(current.refreshToken);
    refreshes.set(this.tokenStore, pending);
    try {
      return await pending;
    } finally {
      if (refreshes.get(this.tokenStore) === pending)
        refreshes.delete(this.tokenStore);
    }
  }

  private async refresh(refreshToken: string): Promise<TokenPair> {
    if (!this.tokenStore) throw new ApiError('AUTH_REQUIRED', 401);
    const result = await this.execute<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!result.response.ok) {
      if (result.response.status >= 500)
        throw new ApiError(
          'SESSION_REFRESH_UNAVAILABLE',
          result.response.status,
        );
      await this.invalidate();
      throw new ApiError('SESSION_EXPIRED', 401);
    }
    const data = result.body.data;
    if (
      !data ||
      !validToken(data.access_token) ||
      !validToken(data.refresh_token)
    ) {
      await this.invalidate();
      throw new ApiError('SESSION_EXPIRED', 401);
    }
    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
    try {
      await this.tokenStore.write(tokens);
    } catch {
      await this.invalidate();
      throw new ApiError('SESSION_STORAGE_FAILURE', 401);
    }
    return tokens;
  }

  private async invalidate(): Promise<void> {
    try {
      await this.tokenStore?.clear();
    } finally {
      this.events.notifyInvalidated();
    }
  }
}
