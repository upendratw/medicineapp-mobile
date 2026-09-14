export const APP_ENVIRONMENTS = [
  'development',
  'test',
  'staging',
  'production',
] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type PublicEnvironment = Readonly<{
  appEnvironment: AppEnvironment;
  apiBaseUrl: string;
  requestTimeoutMs: number;
  developerDiagnostics: boolean;
}>;

type EnvironmentInput = Readonly<Record<string, string | undefined>>;

const parseBoolean = (value: string | undefined): boolean => {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS must be true or false');
};

export function parsePublicEnvironment(
  input: EnvironmentInput,
): PublicEnvironment {
  const candidate = input.EXPO_PUBLIC_APP_ENV ?? 'development';
  if (!APP_ENVIRONMENTS.includes(candidate as AppEnvironment)) {
    throw new Error('Unsupported application environment');
  }
  const appEnvironment = candidate as AppEnvironment;
  const apiBaseUrl = input.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('Backend API URL is invalid');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Backend API URL must use HTTP or HTTPS');
  }
  if (
    ['staging', 'production'].includes(appEnvironment) &&
    parsedUrl.protocol !== 'https:'
  ) {
    throw new Error('Protected environments require an HTTPS backend');
  }
  const requestTimeoutMs = Number(
    input.EXPO_PUBLIC_REQUEST_TIMEOUT_MS ?? '10000',
  );
  if (
    !Number.isInteger(requestTimeoutMs) ||
    requestTimeoutMs < 1000 ||
    requestTimeoutMs > 30000
  ) {
    throw new Error(
      'Request timeout must be between 1000 and 30000 milliseconds',
    );
  }
  const developerDiagnostics = parseBoolean(
    input.EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS,
  );
  if (developerDiagnostics && appEnvironment !== 'development') {
    throw new Error('Developer diagnostics are allowed only in development');
  }
  return Object.freeze({
    appEnvironment,
    apiBaseUrl: parsedUrl.toString().replace(/\/$/, ''),
    requestTimeoutMs,
    developerDiagnostics,
  });
}

export const publicEnvironment = parsePublicEnvironment({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_REQUEST_TIMEOUT_MS: process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS,
  EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS:
    process.env.EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS,
});
