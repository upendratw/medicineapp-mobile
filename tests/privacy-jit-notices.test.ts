import { translate } from '@/localization';

test.each([
  'privacyOcrDisclosure',
  'privacySymptomDisclosure',
  'privacyEmailDisclosure',
  'privacyCaregiverDisclosure',
  'privacyNotificationDisclosure',
] as const)('%s is available in English and Hindi', (key) => {
  expect(translate('en-IN', key)).not.toBe(key);
  expect(translate('hi-IN', key)).not.toBe(key);
  expect(translate('hi-IN', key)).not.toBe(translate('en-IN', key));
});

test('JIT notices state the key safety boundaries', () => {
  expect(translate('en-IN', 'privacyOcrDisclosure')).toMatch(
    /review and confirm/i,
  );
  expect(translate('en-IN', 'privacySymptomDisclosure')).toMatch(
    /exact words/i,
  );
  expect(translate('en-IN', 'privacyEmailDisclosure')).toMatch(
    /does not replace phone sign-in/i,
  );
  expect(translate('en-IN', 'privacyCaregiverDisclosure')).toMatch(
    /revoke access/i,
  );
  expect(translate('en-IN', 'privacyNotificationDisclosure')).toMatch(
    /lock screen/i,
  );
});
