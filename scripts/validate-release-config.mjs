import fs from 'node:fs';

const eas = JSON.parse(
  fs.readFileSync(new URL('../eas.json', import.meta.url)),
);
const appConfig = fs.readFileSync(
  new URL('../app.config.ts', import.meta.url),
  'utf8',
);
const environment = fs.readFileSync(
  new URL('../src/config/environment.ts', import.meta.url),
  'utf8',
);

const fail = (message) => {
  throw new Error(`Release configuration invalid: ${message}`);
};
const production = eas.build?.production;
if (production?.env?.EXPO_PUBLIC_APP_ENV !== 'production')
  fail('production environment is not explicit');
if (production?.env?.EXPO_PUBLIC_DEVELOPER_DIAGNOSTICS !== 'false')
  fail('production diagnostics are not disabled');
if (production?.android?.buildType !== 'app-bundle')
  fail('production Android output is not an app bundle');
if (!appConfig.includes("package: 'com.medicineapp.mobile'"))
  fail('Android package changed');
if (!appConfig.includes('versionCode: 1')) fail('versionCode is undocumented');
if (!environment.includes('Protected environments require an HTTPS backend'))
  fail('protected HTTPS guard is missing');
if (
  !environment.includes('Protected environments cannot use a loopback backend')
)
  fail('protected loopback guard is missing');
if (!environment.includes('Secrets must never use EXPO_PUBLIC'))
  fail('public-secret guard is missing');

for (const [profileName, profile] of Object.entries(eas.build ?? {})) {
  for (const [name, value] of Object.entries(profile.env ?? {})) {
    if (
      /(SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|API_KEY|BEARER|JWT|REFRESH_TOKEN)/i.test(
        name,
      )
    )
      fail(`${profileName} exposes secret-like public configuration`);
    if (
      typeof value === 'string' &&
      /(?:AKIA[0-9A-Z]{16}|-----BEGIN .*PRIVATE KEY-----)/.test(value)
    )
      fail(`${profileName} contains credential material`);
  }
}

console.log('Release configuration validation passed.');
