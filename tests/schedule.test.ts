import {
  normalizeScheduleTimes,
  validateScheduleDates,
} from '@/utils/medicationValidation';

test('validates date ranges and multiple timezone-local daily times', () => {
  expect(validateScheduleDates('2026-09-14', '2026-10-14')).toBeNull();
  expect(normalizeScheduleTimes(['20:00', '08:00']).value).toEqual([
    '08:00',
    '20:00',
  ]);
});

test('rejects impossible ranges, invalid times, duplicates, and excessive daily entries', () => {
  expect(validateScheduleDates('2026-09-14', '2026-09-13')).toContain('before');
  expect(validateScheduleDates('not-a-date', '')).toContain('valid start');
  expect(normalizeScheduleTimes(['08:00', '08:00']).errors.times).toContain(
    'Duplicate',
  );
  expect(normalizeScheduleTimes(['25:00']).errors.times).toContain('24-hour');
  expect(
    normalizeScheduleTimes(
      Array.from({ length: 9 }, (_, index) => `0${index}:00`),
    ).errors.times,
  ).toContain('no more than');
});

test('schedule source contains no generated dosage recommendation', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), 'src/components/ScheduleForm.tsx'),
    'utf8',
  );
  expect(source).toContain('does not recommend medication timing or dosage');
  expect(source).not.toContain('recommended dose');
});
