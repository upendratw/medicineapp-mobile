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

const SECRET_LIKE_PUBLIC_NAME =
  /(?:^|_)(?:SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|API_KEY|BEARER|JWT|REFRESH_TOKEN)(?:_|$)/i;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function rejectPublicSecrets(input: EnvironmentInput): void {
  const unsafeName = Object.keys(input).find(
    (name) =>
      name.startsWith('EXPO_PUBLIC_') && SECRET_LIKE_PUBLIC_NAME.test(name),
  );
  if (unsafeName) {
    throw new Error('Secrets must never use EXPO_PUBLIC environment variables');
  }
}

const parseBoolean = (value: string | undefined): boolean => {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS must be true or false');
};

export function parsePublicEnvironment(
  input: EnvironmentInput,
): PublicEnvironment {
  rejectPublicSecrets(input);
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
  if (
    ['staging', 'production'].includes(appEnvironment) &&
    LOOPBACK_HOSTS.has(parsedUrl.hostname)
  ) {
    throw new Error('Protected environments cannot use a loopback backend');
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

export const publicEnvironment = parsePublicEnvironment(process.env);
