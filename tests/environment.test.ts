import { parsePublicEnvironment } from '@/config/environment';

const development = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_API_BASE_URL: 'http://10.0.2.2:8000',
  EXPO_PUBLIC_REQUEST_TIMEOUT_MS: '10000',
  EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS: 'false',
};

test('parses a bounded development environment', () => {
  expect(parsePublicEnvironment(development)).toMatchObject({
    appEnvironment: 'development',
    requestTimeoutMs: 10000,
  });
});

test('rejects unsupported environments', () => {
  expect(() =>
    parsePublicEnvironment({ ...development, EXPO_PUBLIC_APP_ENV: 'demo' }),
  ).toThrow('Unsupported');
});

test.each(['staging', 'production'])('rejects HTTP for %s', (environment) => {
  expect(() =>
    parsePublicEnvironment({
      ...development,
      EXPO_PUBLIC_APP_ENV: environment,
    }),
  ).toThrow('HTTPS');
});

test('rejects diagnostics outside development', () => {
  expect(() =>
    parsePublicEnvironment({
      ...development,
      EXPO_PUBLIC_APP_ENV: 'test',
      EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS: 'true',
    }),
  ).toThrow('diagnostics');
});
