import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';

type PublicConfig = {
  plugins?: (string | [string, object])[];
  android?: { package?: string };
  extra?: { iosPersonalTeamBuild?: boolean };
};

function resolveConfig(value?: string): PublicConfig {
  const env = { ...process.env };
  delete env.MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD;
  if (value !== undefined) env.MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD = value;
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.join(process.cwd(), 'node_modules/expo/bin/cli'),
        'config',
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8', env },
    ),
  );
}

const pluginNames = (config: PublicConfig) =>
  (config.plugins ?? []).map((plugin) =>
    typeof plugin === 'string' ? plugin : plugin[0],
  );

test('normal config retains notification/APNs plugin and Android identity', () => {
  const config = resolveConfig();
  expect(pluginNames(config)).toContain('expo-notifications');
  expect(config.extra?.iosPersonalTeamBuild).toBe(false);
  expect(config.android?.package).toBe('com.medicineapp.mobile');
});

test('Personal Team config adds the entitlement-removal plugin without changing Android identity', () => {
  const config = resolveConfig('true');
  expect(pluginNames(config)).toContain('expo-notifications');
  expect(pluginNames(config)).toContain(
    './plugins/withPersonalTeamNotificationsDisabled',
  );
  expect(config.extra?.iosPersonalTeamBuild).toBe(true);
  expect(config.android?.package).toBe('com.medicineapp.mobile');
});

test('malformed Personal Team configuration fails closed', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(process.cwd(), 'node_modules/expo/bin/cli'), 'config', '--json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD: 'yes' },
    },
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(
    'MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD must be true or false',
  );
});
