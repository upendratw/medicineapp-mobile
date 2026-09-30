import { readFileSync } from 'node:fs';

import {
  E21_COLD_START_DIAGNOSTIC_PREFIX,
  emitE21ColdStartDiagnostic,
} from '@/diagnostics/e21ColdStartDiagnostic';

test('emits only the fixed prefix and closed marker without runtime metadata', () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);

  emitE21ColdStartDiagnostic('PROVIDER_MOUNT');

  expect(info).toHaveBeenCalledWith(
    `${E21_COLD_START_DIAGNOSTIC_PREFIX} PROVIDER_MOUNT`,
  );
  expect(info.mock.calls[0]).toHaveLength(1);
});

test('diagnostic output failure cannot interrupt application behavior', () => {
  jest.spyOn(console, 'info').mockImplementation(() => {
    throw new Error('synthetic console failure');
  });

  expect(() =>
    emitE21ColdStartDiagnostic('LAST_RESPONSE_RESULT_NULL'),
  ).not.toThrow();
});

test('instrumentation source has no persistence, network, payload serialization, or async mechanism', () => {
  const paths = [
    'src/diagnostics/e21ColdStartDiagnostic.ts',
    'src/state/PushRegistrationContext.tsx',
    'src/navigation/DeepLinkContext.tsx',
    'src/navigation/RouteGuard.tsx',
  ];
  const source = paths.map((path) => readFileSync(path, 'utf8')).join('\n');
  const helper = readFileSync(
    'src/diagnostics/e21ColdStartDiagnostic.ts',
    'utf8',
  );

  expect(helper).not.toMatch(
    /AsyncStorage|SecureStore|fetch\(|XMLHttpRequest|axios|setTimeout|queueMicrotask|requestAnimationFrame/,
  );
  expect(helper).not.toMatch(
    /JSON\.stringify|Record<string|unknown\[\]|\.\.\.args/,
  );
  expect(source).not.toMatch(
    /emitE21ColdStartDiagnostic\([^'\n]*\b(response|notification|data|token|identity|relationship|alertId)\b/,
  );
});
